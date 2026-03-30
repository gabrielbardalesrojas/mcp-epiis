import { Ollama } from 'ollama';
import axios from 'axios';
import { Logger } from '../../utils/logger.js';
import { academicPrompts, PROMPT_NAMES, renderPrompt } from '../../mcp/prompts/academic.prompts.js';

/**
 * Servicio para interactuar con Ollama (Llama local)
 */
export class OllamaService {
  constructor(config = {}) {
    this.host = config.host || process.env.OLLAMA_HOST || 'http://localhost:11434';
    this.model = config.model || process.env.OLLAMA_MODEL || 'llama3.2:3b';
    this.embedModel = config.embedModel || process.env.EMBED_MODEL || 'nomic-embed-text';
    // Configuración de la nube
    this.cloudHost = config.cloudHost || process.env.OLLAMA_CLOUD_HOST || 'https://api.openai.com/v1';
    this.cloudModel = config.cloudModel || process.env.OLLAMA_CLOUD_MODEL || 'gpt-4o-mini';
    this.cloudApiKey = config.cloudApiKey || process.env.OLLAMA_CLOUD_API_KEY || process.env.OLLAMA_API_KEY;

    // Determinar modo inicial basado en si hay API Key
    this.mode = (config.mode || process.env.IA_MODE || (this.cloudApiKey ? 'cloud' : 'local')).toLowerCase();

    if (this.mode === 'cloud') {
      this._initOllama(this.cloudHost, this.cloudApiKey);
      this.activeModel = this.cloudModel;
    } else {
      this._initOllama(this.host, null);
      this.activeModel = this.model;
    }
    this.lastFailureTime = 0;
    this.failureCount = 0;
    this.circuitBreakerTime = 5000; // 5 segundos de espera tras fallo
    this.defaultOptions = {
      temperature: 0.7,
      num_ctx: 8192,
      num_predict: 2048,
    };
    this.logger = new Logger('OllamaService');

    this._verifyHost().catch(e => this.logger.error('Error inicial verificando host', e));
  }

  /**
   * Verificar y corregir host si es necesario (localhost vs 127.0.0.1)
   */
  async _verifyHost() {
    if (this.mode === 'cloud') return;

    const hosts = [this.host, 'http://127.0.0.1:11434'];
    if (!this.host.includes('localhost') && !this.host.includes('127.0.0.1')) return;

    for (const h of hosts) {
      try {
        const response = await axios.get(`${h}/api/tags`, { timeout: 2000 });
        if (response.status === 200) {
          if (this.host !== h) {
            this.logger.info(`Host de Ollama corregido: ${this.host} → ${h}`);
            this.host = h;
            this._initOllama(h, null);
          }
          return;
        }
      } catch (e) {
        // Ignorar y probar el siguiente
      }
    }
  }

  /**
   * Inicializar cliente Ollama con host y api key opcionales
   */
  _initOllama(host, apiKey) {
    const ollamaConfig = { host };

    if (apiKey) {
      ollamaConfig.headers = {
        'Authorization': `Bearer ${apiKey}`,
        'X-API-Key': apiKey
      };
    }

    this.ollama = new Ollama(ollamaConfig);
  }

  /**
   * Cambiar entre modo local y nube
   */
  switchMode(mode, cloudConfig = {}) {
    this.logger.info(`Cambiando modo de IA: ${this.mode} → ${mode}`);

    if (mode === 'cloud') {
      const cloudHost = cloudConfig.host || process.env.OLLAMA_CLOUD_HOST || 'https://api.ollama.com';
      const cloudApiKey = cloudConfig.apiKey || this.cloudApiKey;
      const cloudModel = cloudConfig.model || process.env.OLLAMA_CLOUD_MODEL || 'llama3.1:8b';

      if (!cloudApiKey) {
        throw new Error('Se requiere una API Key para el modo cloud. Configura OLLAMA_API_KEY en tu .env');
      }

      this._initOllama(cloudHost, cloudApiKey);
      this.mode = 'cloud';
      this.activeModel = cloudModel;
      this.logger.info(`Modo cloud activado: ${cloudHost} con modelo ${cloudModel}`);
    } else {
      this._initOllama(this.host, null);
      this.mode = 'local';
      this.activeModel = this.model;
      this.logger.info(`Modo local activado: ${this.host} con modelo ${this.model}`);
    }

    return this.getStatus();
  }

  /**
   * Obtener el modelo activo según el modo
   */
  getActiveModel() {
    return this.activeModel || this.model;
  }

  /**
   * Obtener estado actual del servicio
   */
  getStatus() {
    return {
      mode: this.mode,
      model: this.getActiveModel(),
      host: this.mode === 'cloud' ? this.cloudHost : this.host,
      hasApiKey: !!this.cloudApiKey,
    };
  }

  /**
   * Verificar si el circuito está abierto (esperando tras fallo)
   */
  _checkCircuitBreaker() {
    if (this.lastFailureTime > 0) {
      const now = Date.now();
      const timeSinceFailure = now - this.lastFailureTime;
      if (timeSinceFailure < this.circuitBreakerTime) {
        const remaining = Math.round((this.circuitBreakerTime - timeSinceFailure) / 1000);
        this.logger.warn(`Circuito abierto (Ollama inaccesible). Reintentando en ${remaining}s...`);
        return false;
      }
    }
    return true;
  }

  /**
   * Generar texto con Llama
   */
  async generate(prompt, options = {}) {
    if (!this._checkCircuitBreaker()) {
      throw new Error(`Ollama no responde. Reintenta en unos segundos.`);
    }

    try {
      this.logger.info('Generando con Llama...', { model: this.getActiveModel() });

      const response = await this.ollama.generate({
        model: this.getActiveModel(),
        prompt,
        ...this.defaultOptions,
        ...options,
        stream: false,
      });

      // Reset on success
      this.lastFailureTime = 0;
      this.failureCount = 0;

      return response.response;
    } catch (error) {
      this.lastFailureTime = Date.now();
      this.failureCount++;
      this.logger.error('Error al generar con Llama', error);
      throw new Error(`Error en Ollama: ${error.message}`);
    }
  }

  /**
   * Generar con streaming (para interfaz en tiempo real)
   * Acepta `options.messages` para contexto completo, o `prompt` como texto simple.
   */
  async *generateStream(prompt, options = {}) {
    if (!this._checkCircuitBreaker()) {
      yield "⚠️ El servicio de IA (Ollama) no está respondiendo. Por favor, verifica que Ollama esté abierto y con el modelo cargado.";
      return;
    }

    try {
      const { messages: msgArray, ...restOptions } = options;

      let streamResponse;
      if (msgArray && msgArray.length > 0) {
        // Usar chat con historial completo
        streamResponse = await this.ollama.chat({
          model: this.getActiveModel(),
          messages: msgArray,
          ...this.defaultOptions,
          ...restOptions,
          stream: true,
        });
        for await (const chunk of streamResponse) {
          yield chunk.message?.content || '';
        }
      } else {
        // Usar generate con prompt simple
        streamResponse = await this.ollama.generate({
          model: this.getActiveModel(),
          prompt,
          ...this.defaultOptions,
          ...restOptions,
          stream: true,
        });
        for await (const chunk of streamResponse) {
          yield chunk.response;
        }
      }

      // Reset on success
      this.lastFailureTime = 0;
      this.failureCount = 0;
    } catch (error) {
      this.lastFailureTime = Date.now();
      this.failureCount++;
      this.logger.error('Error en streaming', error);
      throw error;
    }
  }

  /**
   * Chat conversacional
   */
  async chat(messages, options = {}) {
    if (!this._checkCircuitBreaker()) {
      throw new Error(`IA ocupada o inaccesible (circuito abierto).`);
    }

    try {
      return await this._withRetry(async () => {
        const response = await this.ollama.chat({
          model: this.getActiveModel(),
          messages,
          ...this.defaultOptions,
          ...options,
          stream: false,
        });

        // Reset on success
        this.lastFailureTime = 0;
        this.failureCount = 0;

        return response.message.content;
      });
    } catch (error) {
      this.lastFailureTime = Date.now();
      this.failureCount++;
      this.logger.error('Error en chat', error);
      throw error;
    }
  }

  /**
   * Generar embeddings (para búsqueda semántica)
   */
  async generateEmbeddings(text) {
    if (!this._checkCircuitBreaker()) {
      throw new Error(`IA ocupada o inaccesible (circuito abierto).`);
    }

    try {
      return await this._withRetry(async () => {
        this.logger.info('Generando embeddings...', {
          model: this.embedModel,
          textLength: text.length
        });

        const response = await this.ollama.embeddings({
          model: this.embedModel,
          prompt: text,
        });

        return response.embedding;
      });
    } catch (error) {
      // Si el endpoint no existe o falla específicamente por eso, manejamos el error
      if (error.message?.includes('not found') || error.message?.includes('404')) {
        this.logger.error(`Endpoint de embeddings no disponible en este host (${this.mode})`);
        // Lanzamos un error específico que VectorStore pueda identificar
        const customError = new Error('EMBEDDINGS_NOT_SUPPORTED');
        customError.originalError = error.message;
        throw customError;
      }

      this.logger.error('Error al generar embeddings', error);
      throw error;
    }
  }

  /**
   * Generar embeddings en batch
   */
  async generateBatchEmbeddings(texts) {
    const embeddings = [];

    for (const text of texts) {
      const embedding = await this.generateEmbeddings(text);
      embeddings.push(embedding);
    }

    return embeddings;
  }

  /**
   * Verificar si el modelo está disponible
   */
  async checkModel() {
    try {
      const models = await this.ollama.list();
      const availableModels = models.models.map(m => m.name);

      // Verificar modelo principal
      const modelExists = availableModels.some(name =>
        name === this.model || name === `${this.model}:latest`
      );

      if (!modelExists) {
        this.logger.warn(`Modelo principal ${this.model} no encontrado. Descargando...`);
        await this.pullModel(this.model);
      }

      // Verificar modelo de embeddings
      const embedModelExists = availableModels.some(name =>
        name === this.embedModel || name === `${this.embedModel}:latest`
      );

      if (!embedModelExists) {
        this.logger.warn(`Modelo de embeddings ${this.embedModel} no encontrado. Descargando...`);
        await this.pullModel(this.embedModel);
      }

      return true;
    } catch (error) {
      this.logger.error('Error al verificar modelos en Ollama', error);
      return false;
    }
  }

  /**
   * Descargar modelo
   */
  async pullModel(modelName = null) {
    const model = modelName || this.model;

    this.logger.info(`Descargando modelo ${model}...`);

    try {
      await this.ollama.pull({ model, stream: false });
      this.logger.info(`Modelo ${model} descargado exitosamente`);
    } catch (error) {
      this.logger.error('Error al descargar modelo', error);
      throw error;
    }
  }

  /**
   * Listar modelos disponibles
   */
  async listModels() {
    try {
      return await this._withRetry(async () => {
        const response = await this.ollama.list();
        return response.models || [];
      });
    } catch (error) {
      this.logger.error('Error al listar modelos', error);
      return [];
    }
  }

  /**
   * Ejecutor con reintentos para errores de concurrencia (Ollama Cloud)
   * @private
   */
  async _withRetry(fn, maxRetries = 3, initialDelay = 1000) {
    let lastError;
    let delay = initialDelay;

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        return await fn();
      } catch (error) {
        lastError = error;

        // Detectar error de concurrencia (429 Too Many Requests)
        const isConcurrencyError =
          error.message?.toLowerCase().includes('too many concurrent requests') ||
          error.status === 429 ||
          error.response?.status === 429;

        if (isConcurrencyError && attempt < maxRetries) {
          this.logger.warn(`Límite de concurrencia alcanzado (intento ${attempt}/${maxRetries}). Reintentando en ${delay}ms...`);
          await new Promise(resolve => setTimeout(resolve, delay));
          delay *= 2; // Exponencial
          continue;
        }

        // Si no es un error de concurrencia o ya agotamos reintentos, lanzar
        throw error;
      }
    }
    throw lastError;
  }

  /**
   * Analizar documento académico — devuelve texto limpio sin Markdown
   */
  async analyzeAcademicDocument(content, analysisType = 'full') {
    const styleNote = `
Responde en texto limpio y natural. Sin asteriscos (**), sin almohadillas (#).
Usa párrafos separados por línea en blanco. Para listas usa números (1. 2. 3.).`;

    const prompts = {
      summary: `Resume de forma académica y concisa el siguiente documento. ${styleNote}\n\n${content}`,

      key_points: `Extrae los 5-8 puntos clave más importantes del siguiente documento académico. Preséntalo como una lista numerada con explicación breve de cada punto. ${styleNote}\n\n${content}`,

      structure: `Analiza la estructura del siguiente documento y describe su organización en párrafos. ${styleNote}\n\n${content}`,

      full: `Realiza un análisis académico completo del siguiente documento. ${styleNote}

Organiza tu respuesta en estas secciones (escribe el nombre de cada sección en mayúsculas seguido de dos puntos):

RESUMEN EJECUTIVO:
[2-3 párrafos con la idea principal]

PUNTOS CLAVE:
[Lista numerada con los puntos más importantes]

ESTRUCTURA Y ORGANIZACIÓN:
[Descripción de cómo está organizado el documento]

FORTALEZAS:
[Lista numerada]

ÁREAS DE MEJORA:
[Lista numerada]

RECOMENDACIONES:
[Lista numerada con acciones concretas]

Documento:
${content}`,
    };

    return await this.generate(prompts[analysisType] || prompts.full);
  }

  /**
   * Generar contenido académico
   */
  async generateAcademicContent(type, data) {
    const templates = {
      syllabus: this.getSyllabusPrompt(data),
      resolution: this.getResolutionPrompt(data),
      report: this.getReportPrompt(data),
      letter: this.getLetterPrompt(data),
    };

    // Specialized academic documents from prompts module
    if (['thesis', 'research_project', 'article'].includes(type)) {
      const promptNameMap = {
        thesis: PROMPT_NAMES.THESIS_GENERATION,
        research_project: PROMPT_NAMES.RESEARCH_PROJECT_GENERATION,
        article: PROMPT_NAMES.ARTICLE_GENERATION,
      };

      const result = renderPrompt(promptNameMap[type], {
        title: data.title || 'Documento Académico',
        context: data.context || data.extraContext || '',
      });

      if (result) return await this.generate(result.rendered);
    }

    return await this.generate(templates[type] || this.getReportPrompt(data));
  }

  getSyllabusPrompt(data) {
    return `Genera un sílabo académico profesional y completo para el siguiente curso.
Usa esta estructura con marcadores de sección (serán renderizados como títulos en el documento):

# SÍLABO — ${data.course_name || 'Curso'}

## I. DATOS GENERALES
**Código del curso:** ${data.course_code || ''}
**Nombre del curso:** ${data.course_name || ''}
**Docente responsable:** ${data.professor || ''}
**Semestre académico:** ${data.semester || ''}
**Créditos:** ${data.credits || 'Por definir'}
**Horas semanales:** Teoría: 2h | Práctica: 2h
${data.prerequisites ? `**Prerrequisitos:** ${data.prerequisites}` : ''}

---

## II. SUMILLA
${data.description || `Curso de formación profesional en ${data.course_name}. Desarrolla competencias teóricas y prácticas en el área de especialidad.`}

---

## III. COMPETENCIAS Y CAPACIDADES

### Competencia General
- Desarrollar habilidades técnicas y profesionales en ${data.course_name}

### Capacidades Específicas
- Comprender y aplicar los fundamentos teóricos del curso
- Resolver problemas prácticos relacionados con la especialidad
- Desarrollar proyectos integradores con criterio profesional
- Demostrar ética y responsabilidad en el ejercicio de la profesión

---

## IV. PROGRAMACIÓN DE CONTENIDOS

### Unidad I — Fundamentos (Semanas 1-4)
- Introducción y conceptos básicos
- Marco teórico y antecedentes
- Principios y metodologías fundamentales
- Taller: Diagnóstico de conocimientos previos

### Unidad II — Desarrollo Teórico (Semanas 5-8)
- Modelos y paradigmas principales
- Técnicas avanzadas de la disciplina
- Análisis de casos de estudio reales
- Taller: Aplicación de modelos teóricos

### Unidad III — Aplicación Práctica (Semanas 9-12)
- Metodologías de implementación
- Herramientas y tecnologías del área
- Desarrollo de proyectos parciales
- Laboratorio: Proyecto integrador I

### Unidad IV — Integración y Evaluación (Semanas 13-16)
- Integración de conocimientos
- Proyecto final de aplicación
- Evaluación de competencias
- Exposición de resultados

---

## V. ESTRATEGIAS METODOLÓGICAS
- Clases magistrales con participación activa
- Aprendizaje basado en proyectos (ABP)
- Trabajo colaborativo en equipos
- Uso de plataforma virtual (Aula Virtual UNAS)
- Laboratorios y talleres prácticos
- Revisión de literatura científica actualizada

---

## VI. MATERIALES Y RECURSOS
- Bibliografía especializada (física y digital)
- Plataforma Moodle — Aula Virtual UNAS
- Laboratorio de cómputo — FIIS
- Recursos multimedia y presentaciones
- Acceso a bases de datos académicas

---

## VII. EVALUACIÓN

| Criterio | Instrumento | Peso |
|---|---|---|
| Examen Parcial | Prueba escrita | 25% |
| Examen Final | Prueba escrita | 25% |
| Prácticas y Tareas | Rúbricas de evaluación | 25% |
| Proyecto Final | Exposición y entrega | 25% |

**Nota mínima aprobatoria:** 11 (escala vigesimal)

---

## VIII. BIBLIOGRAFÍA

### Bibliografía Básica
- Autor, A. (2023). Título del libro principal. Editorial Universitaria.
- Autor, B. (2022). Fundamentos de ${data.course_name}. McGraw-Hill.

### Bibliografía Complementaria
- Artículos de revistas indexadas (Scopus, Web of Science)
- Recursos en línea especializados del área
- Documentación técnica oficial

---
Tingo María, ${new Date().toLocaleDateString('es-PE')}`;
  }

  getResolutionPrompt(data) {
    return `Genera una ${data.type || 'resolución'} oficial con formato legal peruano.
Usa este formato exacto (sin asteriscos ni Markdown en el texto final):

# RESOLUCIÓN ${(data.type || 'DECANAL').toUpperCase()} Nº XXX-${new Date().getFullYear()}-UNAS/FIIS

## VISTO
El expediente sobre ${data.subject || 'el asunto correspondiente'}.

## CONSIDERANDO
${data.considerations || 'Que es necesario emitir la presente resolución conforme a las disposiciones vigentes de la Universidad Nacional Agraria de la Selva.'}

Que, la Facultad de Ingeniería en Informática y Sistemas tiene la facultad de emitir resoluciones en el ámbito de su competencia, conforme al Estatuto Universitario vigente.

## SE RESUELVE

**Artículo 1°.-** ${data.article1 || '[Contenido principal de la resolución]'}

${data.additionalArticles || '**Artículo 2°.-** Encargar a la Dirección Académica el cumplimiento de la presente resolución.'}

**Artículo 3°.-** Regístrese, comuníquese y archívese.

---
Dado en Tingo María, a los ${data.date || new Date().toLocaleDateString('es-PE')}.

El Decano de la Facultad de Ingeniería en Informática y Sistemas`;
  }

  getReportPrompt(data) {
    return `Genera un informe académico formal y detallado sobre: ${data.topic}
Usa esta estructura con marcadores de sección:

# INFORME ACADÉMICO
## ${data.topic || 'Tema del Informe'}

---

## I. INTRODUCCIÓN
${data.context || `Descripción del contexto y justificación del informe sobre ${data.topic}.`}

---

## II. OBJETIVOS
- Objetivo general del informe
- Objetivos específicos relacionados con el tema

---

## III. DESARROLLO Y ANÁLISIS
### Antecedentes
Descripción de los antecedentes relevantes.

### Análisis Principal
Desarrollo detallado del tema con argumentos y evidencias.

### Resultados Obtenidos
Descripción de los hallazgos principales.

---

## IV. CONCLUSIONES
- Conclusión principal derivada del análisis
- Hallazgos secundarios relevantes
- Implicaciones para la práctica profesional

---

## V. RECOMENDACIONES
- Recomendación 1: Acción concreta sugerida
- Recomendación 2: Medidas de implementación
- Recomendación 3: Seguimiento y evaluación

---

## VI. REFERENCIAS
- Fuentes bibliográficas consultadas
- Normativa aplicable
- Documentos institucionales de referencia`;
  }

  getLetterPrompt(data) {
    return `Genera una carta oficial académica con formato institucional peruano.
El texto debe ser formal, directo y sin Markdown ni asteriscos.

Fecha: ${new Date().toLocaleDateString('es-PE')}

Señor(a):
${data.recipient || '[Nombre del destinatario]'}
Cargo / Institución

Asunto: ${data.subject || '[Asunto de la carta]'}

De mi especial consideración:

${data.body || 'Por medio de la presente, me dirijo a usted para comunicarle el asunto indicado en el encabezado, esperando contar con su gentil atención y respuesta oportuna.'}

Sin otro particular, quedo de usted.

Atentamente,

${data.sender || '[Nombre del remitente]'}
${data.position || 'Cargo Institucional'}
FIIS — Universidad Nacional Agraria de la Selva`;
  }

  /**
   * Extraer información estructurada
   */
  async extractStructuredData(text, schema) {
    const prompt = `Extrae la siguiente información del texto en formato JSON:

Esquema esperado:
${JSON.stringify(schema, null, 2)}

Texto:
${text}

Responde ÚNICAMENTE con un objeto JSON válido.`;

    const response = await this.generate(prompt, { temperature: 0.1 });

    try {
      // Intentar parsear JSON
      const jsonMatch = response.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        return JSON.parse(jsonMatch[0]);
      }
      return null;
    } catch (error) {
      this.logger.error('Error al parsear JSON estructurado', error);
      return null;
    }
  }

  /**
   * Responder preguntas sobre un documento
   */
  async answerQuestion(documentContent, question) {
    const prompt = `Basándote en el siguiente documento, responde la pregunta de forma precisa:

DOCUMENTO:
${documentContent}

PREGUNTA: ${question}

RESPUESTA:`;

    return await this.generate(prompt);
  }

  /**
   * Comparar dos documentos
   */
  async compareDocuments(doc1, doc2, focus = 'differences') {
    const prompts = {
      differences: `Identifica las diferencias principales entre estos dos documentos:\n\nDOCUMENTO 1:\n${doc1}\n\nDOCUMENTO 2:\n${doc2}`,
      similarities: `Identifica las similitudes entre estos dos documentos:\n\nDOCUMENTO 1:\n${doc1}\n\nDOCUMENTO 2:\n${doc2}`,
      both: `Compara estos dos documentos, identificando similitudes y diferencias:\n\nDOCUMENTO 1:\n${doc1}\n\nDOCUMENTO 2:\n${doc2}`,
    };

    return await this.generate(prompts[focus] || prompts.both);
  }

  /**
   * Realizar búsqueda web con Ollama Cloud
   */
  async webSearch(query, maxResults = 5) {
    if (!this.cloudApiKey) {
      throw new Error('Se requiere OLLAMA_API_KEY para realizar búsquedas web.');
    }

    try {
      this.logger.info(`Realizando búsqueda web: "${query}" (max: ${maxResults})`);

      const response = await axios.post('https://ollama.com/api/web_search', {
        query,
        max_results: maxResults
      }, {
        headers: {
          'Authorization': `Bearer ${this.cloudApiKey}`,
          'Content-Type': 'application/json'
        }
      });

      return response.data;
    } catch (error) {
      this.logger.error('Error en búsqueda web de Ollama', error);
      throw new Error(`Error en búsqueda Ollama: ${error.message}`);
    }
  }

  /**
   * Extraer contenido de una URL con Ollama Cloud
   */
  async webFetch(url) {
    if (!this.cloudApiKey) {
      throw new Error('Se requiere OLLAMA_API_KEY para extraer contenido web.');
    }

    try {
      this.logger.info(`Extrayendo contenido web con Ollama: ${url}`);

      const response = await axios.post('https://ollama.com/api/web_fetch', {
        url
      }, {
        headers: {
          'Authorization': `Bearer ${this.cloudApiKey}`,
          'Content-Type': 'application/json'
        }
      });

      return response.data;
    } catch (error) {
      this.logger.error('Error en extracción web de Ollama', error);
      throw new Error(`Error en extracción Ollama: ${error.message}`);
    }
  }

  /**
   * Generar un examen estructurado basado en contexto y especificaciones
   */
  async generateExam(data) {
    try {
      this.logger.info('Generando examen estructurado...', { topic: data.topic });

      const promptData = {
        topic: data.topic || 'Temas Generales',
        context: data.context || 'Conocimiento general',
        questionCount: data.questionCount || 5,
        difficulty: data.difficulty || 'intermedio',
        questionTypes: data.questionTypes || 'variados',
        instructions: data.instructions || 'Sin instrucciones adicionales',
        course: data.course || 'Gestión Académica',
        date: data.date || new Date().toLocaleDateString('es-PE'),
        examType: data.examType || 'EXAMEN PARCIAL',
        semester: data.semester || `${new Date().getFullYear()}-I`,
        duration: data.duration || '60',
        pointsPerQuestion: data.pointsPerQuestion || 2,
      };

      const result = renderPrompt(PROMPT_NAMES.EXAM_GENERATION, promptData);
      if (!result) throw new Error('No se pudo renderizar el prompt para el examen');

      const response = await this.generate(result.rendered, { temperature: 0.3 });

      // Extraer y parsear JSON
      const jsonMatch = response.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        this.logger.error('Respuesta de IA no contiene un JSON válido para el examen', { response });
        throw new Error('La IA no generó una respuesta estructurada válida para el examen');
      }

      try {
        return JSON.parse(jsonMatch[0]);
      } catch (parseError) {
        this.logger.error('Error al parsear el JSON del examen', { error: parseError.message, json: jsonMatch[0] });
        throw new Error('Error de formato en el examen generado');
      }
    } catch (error) {
      this.logger.error('Error en generateExam', error);
      throw error;
    }
  }
}

export default OllamaService;