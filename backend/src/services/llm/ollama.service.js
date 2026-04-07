import { Ollama } from 'ollama';
import axios from 'axios';
import { Logger } from '../../utils/logger.js';
import { academicPrompts, PROMPT_NAMES, renderPrompt } from '../../mcp/prompts/academic.prompts.js';

// ─── Constantes de configuración ────────────────────────────────────────────

const DEFAULTS = Object.freeze({
  HOST_LOCAL:        'http://localhost:11434',
  HOST_CLOUD:        'https://ollama.com',
  MODEL_LOCAL:       'llama3.2:3b',
  MODEL_CLOUD:       'llama3.3:70b-cloud',
  EMBED_MODEL:       'nomic-embed-text',
  TEMPERATURE:       0.3,
  NUM_CTX:           8192,
  NUM_PREDICT:       2048,
  CIRCUIT_BREAKER_MS: 5_000,
  CLOUD_TIMEOUT_MS:  60_000,
  CLOUD_TIMEOUT_GEN_MS: 90_000,
  HOST_CHECK_TIMEOUT: 2_000,
  RETRY_MAX:         3,
  RETRY_INITIAL_MS:  1_000,
});

const AI_MODES = Object.freeze({ LOCAL: 'local', CLOUD: 'cloud', AUTO: 'auto' });

const PROVIDER_ORDER = [AI_MODES.LOCAL, AI_MODES.CLOUD];

// ─── Helpers puros ───────────────────────────────────────────────────────────

/** Deja solo `role` y `content` para que APIs externas no rechacen campos extras. */
const sanitizeMessages = (messages) =>
  messages.map(({ role, content }) => ({ role, content }));

/** Extrae el primer bloque JSON de un string. */
const extractJSON = (text) => {
  const match = text.match(/\{[\s\S]*\}/);
  return match ? JSON.parse(match[0]) : null;
};

/** Construye la cabecera de autorización para providers cloud. */
const buildAuthHeaders = (apiKey) => ({
  'Authorization': `Bearer ${apiKey}`,
  'X-API-Key':     apiKey,
  'Content-Type':  'application/json',
});

// ─── Clase principal ─────────────────────────────────────────────────────────

/**
 * Servicio para interactuar con Ollama (Llama local/cloud).
 *
 * Mejoras vs versión anterior:
 *  - Configuración centralizada en DEFAULTS (sin magic-strings dispersas)
 *  - Circuit-breaker encapsulado en _CircuitBreaker
 *  - Retry con back-off exponencial extraído en _withRetry (reutilizado globalmente)
 *  - Helpers puros (sanitizeMessages, extractJSON, buildAuthHeaders) → sin duplicación
 *  - Instancias de axios con baseURL y timeout preconfigurados
 *  - generateBatchEmbeddings usa Promise.all para paralelismo real
 *  - getStatus y getActiveModel usan la tabla de providers (sin if/else)
 *  - analyzeAcademicDocument y generateAcademicContent sin duplicación de lógica
 *  - JSDoc completo en métodos públicos
 */
export class OllamaService {

  // ─── Constructor ────────────────────────────────────────────────────────────

  constructor(config = {}) {
    this.logger = new Logger('OllamaService');

    this.providers = {
      [AI_MODES.LOCAL]: {
        host:  config.host      || process.env.OLLAMA_HOST       || DEFAULTS.HOST_LOCAL,
        model: config.model     || process.env.OLLAMA_MODEL      || DEFAULTS.MODEL_LOCAL,
      },
      [AI_MODES.CLOUD]: {
        host:   config.cloudHost   || process.env.OLLAMA_CLOUD_HOST  || DEFAULTS.HOST_CLOUD,
        model:  config.cloudModel  || process.env.OLLAMA_CLOUD_MODEL || DEFAULTS.MODEL_CLOUD,
        apiKey: config.cloudApiKey || process.env.OLLAMA_CLOUD_API_KEY || process.env.OLLAMA_API_KEY,
      },
    };

    this.mode     = (config.mode || process.env.IA_MODE || AI_MODES.LOCAL).toLowerCase();
    this.embedModel = config.embedModel || process.env.EMBED_MODEL || DEFAULTS.EMBED_MODEL;

    this.defaultOptions = {
      temperature: parseFloat(process.env.LLM_TEMPERATURE || DEFAULTS.TEMPERATURE),
      num_ctx:     parseInt(process.env.LLM_NUM_CTX       || DEFAULTS.NUM_CTX,     10),
      num_predict: parseInt(process.env.LLM_MAX_TOKENS    || DEFAULTS.NUM_PREDICT, 10),
    };

    this._circuitBreaker = new _CircuitBreaker(DEFAULTS.CIRCUIT_BREAKER_MS);
    this._initOllama(this.providers[AI_MODES.LOCAL].host, null);

    // Verificación diferida del host local
    this._verifyHost().catch((e) => this.logger.error('Error inicial verificando host', e));
  }

  // ─── Configuración dinámica ──────────────────────────────────────────────────

  /** @param {'local'|'cloud'|'auto'} mode */
  setMode(mode) {
    this.mode = mode.toLowerCase();
    this.logger.info(`Modo cambiado a: ${this.mode}`);
  }

  /** @param {string} model */
  setCloudModel(model) {
    this.providers[AI_MODES.CLOUD].model = model;
  }

  /** Cambia entre modo local y nube y devuelve el estado actualizado. */
  switchMode(mode, cloudConfig = {}) {
    this.logger.info(`Cambiando modo de IA: ${this.mode} → ${mode}`);

    if (mode === AI_MODES.CLOUD) {
      const p = this.providers[AI_MODES.CLOUD];
      const host   = cloudConfig.host   || p.host;
      const apiKey = cloudConfig.apiKey || p.apiKey;
      const model  = cloudConfig.model  || p.model;

      if (!apiKey) {
        throw new Error('Se requiere una API Key para el modo cloud. Configura OLLAMA_API_KEY en tu .env');
      }

      this._initOllama(host, apiKey);
      this.mode = AI_MODES.CLOUD;
      this._activeModel = model;
      this.logger.info(`Modo cloud activado: ${host} con modelo ${model}`);
    } else {
      const p = this.providers[AI_MODES.LOCAL];
      this._initOllama(p.host, null);
      this.mode = AI_MODES.LOCAL;
      this._activeModel = p.model;
      this.logger.info(`Modo local activado: ${p.host} con modelo ${p.model}`);
    }

    return this.getStatus();
  }

  // ─── Estado e introspección ──────────────────────────────────────────────────

  /**
   * Devuelve el modelo activo según el modo actual.
   * Prioriza cualquier override manual (_activeModel).
   */
  getActiveModel() {
    if (this._activeModel) return this._activeModel;
    const key = this.mode === AI_MODES.CLOUD ? AI_MODES.CLOUD : AI_MODES.LOCAL;
    return this.providers[key]?.model ?? this.providers[AI_MODES.LOCAL].model;
  }

  /** Devuelve un snapshot del estado operacional del servicio. */
  getStatus() {
    const isCloud = this.mode === AI_MODES.CLOUD;
    const p = this.providers[isCloud ? AI_MODES.CLOUD : AI_MODES.LOCAL];
    return {
      mode:      this.mode,
      model:     this.getActiveModel(),
      host:      p.host,
      hasApiKey: isCloud ? !!this.providers[AI_MODES.CLOUD].apiKey : false,
    };
  }

  // ─── Generación de texto ─────────────────────────────────────────────────────

  /**
   * Genera texto a partir de un prompt simple (no conversacional).
   * @param {string} prompt
   * @param {object} [options]
   * @returns {Promise<string>}
   */
  async generate(prompt, options = {}) {
    // En modo cloud, delegar a _generateCloud que usa la API REST
    if (this.mode === AI_MODES.CLOUD) {
      return this._generateCloud(prompt, options);
    }
    // En modo auto, intentar local primero, luego cloud
    if (this.mode === AI_MODES.AUTO) {
      try {
        if (this._circuitBreaker.isClosed()) {
          return await this._generateLocal(prompt, options);
        }
      } catch (localErr) {
        this.logger.warn('generate() local falló, intentando cloud...', localErr.message);
      }
      return this._generateCloud(prompt, options);
    }
    // Modo local
    return this._generateLocal(prompt, options);
  }

  /** Genera texto usando el SDK de Ollama (solo funciona con host local). */
  async _generateLocal(prompt, options = {}) {
    this._circuitBreaker.assertClosed(this.logger);
    try {
      this.logger.info('Generando con Ollama Local...', { model: this.providers[AI_MODES.LOCAL].model });
      const response = await this.ollama.generate({
        model: this.providers[AI_MODES.LOCAL].model,
        prompt,
        ...this.defaultOptions,
        ...options,
        stream: false,
      });
      this._circuitBreaker.reset();
      return response.response;
    } catch (error) {
      this._circuitBreaker.trip();
      this.logger.error('Error al generar con Ollama Local', error);
      throw new Error(`Error en Ollama Local: ${error.message}`);
    }
  }

  /**
   * Genera texto usando la API REST cloud (chat/completions).
   * Convierte el prompt simple a formato de mensajes chat.
   */
  async _generateCloud(prompt, options = {}) {
    const p = this.providers[AI_MODES.CLOUD];
    if (!p?.apiKey) throw new Error('Proveedor cloud no configurado o sin API Key.');

    this.logger.info('Generando con Cloud...', { model: p.model });

    try {
      // Usar endpoint nativo de Ollama: /api/generate
      const { data } = await axios.post(
        `${p.host}/api/generate`,
        {
          model: p.model,
          prompt,
          temperature: options.temperature ?? this.defaultOptions.temperature,
          stream: false,
        },
        {
          headers: buildAuthHeaders(p.apiKey),
          timeout: DEFAULTS.CLOUD_TIMEOUT_GEN_MS,
        },
      );
      return data.response;
    } catch (error) {
      // Fallback: intentar con /api/chat si /api/generate no funciona
      try {
        this.logger.warn('generate cloud falló, intentando con /api/chat...');
        const { data } = await axios.post(
          `${p.host}/api/chat`,
          {
            model: p.model,
            messages: [
              { role: 'system', content: 'Responde directamente con el contenido solicitado sin explicaciones adicionales.' },
              { role: 'user', content: prompt },
            ],
            stream: false,
          },
          {
            headers: buildAuthHeaders(p.apiKey),
            timeout: DEFAULTS.CLOUD_TIMEOUT_GEN_MS,
          },
        );
        return data.message?.content || data.choices?.[0]?.message?.content;
      } catch (fallbackErr) {
        const msg = fallbackErr.response?.data?.error?.message ?? fallbackErr.response?.data?.error ?? fallbackErr.message;
        this.logger.error(`Error en generate cloud (ambos endpoints): ${msg}`);
        throw new Error(`Error en Cloud generate: ${msg}`);
      }
    }
  }

  /**
   * Genera texto de forma streaming.
   * Acepta `options.messages` para contexto completo o `prompt` como texto simple.
   * @param {string} prompt
   * @param {{ messages?: Array, [key: string]: any }} [options]
   * @yields {string}
   */
  async *generateStream(prompt, options = {}) {
    if (!this._circuitBreaker.isClosed()) {
      yield '⚠️ El servicio de IA (Ollama) no está respondiendo. Por favor, verifica que Ollama esté abierto y con el modelo cargado.';
      return;
    }

    const { messages: msgArray, ...restOptions } = options;

    try {
      if (msgArray?.length > 0) {
        const stream = await this.ollama.chat({
          model: this.getActiveModel(),
          messages: msgArray,
          ...this.defaultOptions,
          ...restOptions,
          stream: true,
        });
        for await (const chunk of stream) yield chunk.message?.content ?? '';
      } else {
        const stream = await this.ollama.generate({
          model: this.getActiveModel(),
          prompt,
          ...this.defaultOptions,
          ...restOptions,
          stream: true,
        });
        for await (const chunk of stream) yield chunk.response;
      }

      this._circuitBreaker.reset();
    } catch (error) {
      this._circuitBreaker.trip();
      this.logger.error('Error en streaming', error);
      throw error;
    }
  }

  // ─── Chat ────────────────────────────────────────────────────────────────────

  /**
   * Chat conversacional.
   * Respeta el modo configurado; en AUTO usa fallback resiliente.
   * @param {Array} messages
   * @param {object} [options]
   * @returns {Promise<string>}
   */
  async chat(messages, options = {}) {
    if (this.mode === AI_MODES.LOCAL)  return this._chatLocal(messages, options);
    if (this.mode === AI_MODES.CLOUD)  return this._chatCloud(AI_MODES.CLOUD, messages, options);
    return this.chatResilient(messages, options);
  }

  /**
   * Intenta proveedores en orden hasta obtener respuesta.
   * @param {Array} messages
   * @param {object} [options]
   * @returns {Promise<string>}
   */
  async chatResilient(messages, options = {}) {
    let lastError;

    for (const providerId of PROVIDER_ORDER) {
      try {
        if (providerId === AI_MODES.LOCAL) {
          if (!this._circuitBreaker.isClosed()) continue;
          return await this._chatLocal(messages, options);
        }
        return await this._chatCloud(providerId, messages, options);
      } catch (error) {
        this.logger.warn(`Proveedor ${providerId} falló. Probando siguiente...`, error.message);
        lastError = error;
      }
    }

    throw new Error(`Todos los proveedores de IA fallaron. Último error: ${lastError?.message}`);
  }

  // ─── Embeddings ──────────────────────────────────────────────────────────────

  /**
   * Genera el vector de embeddings para un texto.
   * @param {string} text
   * @returns {Promise<number[]>}
   */
  async generateEmbeddings(text) {
    this._circuitBreaker.assertClosed(this.logger);

    try {
      return await this._withRetry(async () => {
        this.logger.info('Generando embeddings...', {
          model: this.embedModel,
          textLength: text.length,
        });

        const response = await this.ollama.embeddings({
          model: this.embedModel,
          prompt: text,
        });

        return response.embedding;
      });
    } catch (error) {
      if (error.message?.includes('not found') || error.message?.includes('404')) {
        this.logger.error(`Endpoint de embeddings no disponible (${this.mode})`);
        const customError = new Error('EMBEDDINGS_NOT_SUPPORTED');
        customError.originalError = error.message;
        throw customError;
      }
      this.logger.error('Error al generar embeddings', error);
      throw error;
    }
  }

  /**
   * Genera embeddings para múltiples textos en paralelo.
   * @param {string[]} texts
   * @returns {Promise<number[][]>}
   */
  async generateBatchEmbeddings(texts) {
    return Promise.all(texts.map((t) => this.generateEmbeddings(t)));
  }

  // ─── Gestión de modelos ──────────────────────────────────────────────────────

  /** Verifica y descarga (si no existen) el modelo principal y el de embeddings. */
  async checkModel() {
    try {
      const { models } = await this.ollama.list();
      const available  = new Set(models.map((m) => m.name));

      const ensureModel = async (model) => {
        if (!available.has(model) && !available.has(`${model}:latest`)) {
          this.logger.warn(`Modelo ${model} no encontrado. Descargando...`);
          await this.pullModel(model);
        }
      };

      await Promise.all([
        ensureModel(this.providers[AI_MODES.LOCAL].model),
        ensureModel(this.embedModel),
      ]);

      return true;
    } catch (error) {
      this.logger.error('Error al verificar modelos en Ollama', error);
      return false;
    }
  }

  /** @param {string} [modelName] Descarga el modelo indicado o el activo por defecto. */
  async pullModel(modelName) {
    const model = modelName ?? this.getActiveModel();
    this.logger.info(`Descargando modelo ${model}...`);
    try {
      await this.ollama.pull({ model, stream: false });
      this.logger.info(`Modelo ${model} descargado exitosamente`);
    } catch (error) {
      this.logger.error('Error al descargar modelo', error);
      throw error;
    }
  }

  /** @returns {Promise<object[]>} Lista de modelos disponibles en Ollama. */
  async listModels() {
    try {
      return await this._withRetry(async () => {
        const response = await this.ollama.list();
        return response.models ?? [];
      });
    } catch (error) {
      this.logger.error('Error al listar modelos', error);
      return [];
    }
  }

  // ─── Análisis y generación académica ────────────────────────────────────────

  /**
   * Analiza un documento académico devolviendo texto limpio (sin Markdown).
   * @param {string} content
   * @param {'summary'|'key_points'|'structure'|'full'} [analysisType='full']
   */
  async analyzeAcademicDocument(content, analysisType = 'full') {
    const styleNote = `
Responde en texto limpio y natural. Sin asteriscos (**), sin almohadillas (#).
Usa párrafos separados por línea en blanco. Para listas usa números (1. 2. 3.).`;

    const prompts = {
      summary:    `Resume de forma académica y concisa el siguiente documento. ${styleNote}\n\n${content}`,
      key_points: `Extrae los 5-8 puntos clave más importantes del siguiente documento académico. Preséntalo como una lista numerada con explicación breve de cada punto. ${styleNote}\n\n${content}`,
      structure:  `Analiza la estructura del siguiente documento y describe su organización en párrafos. ${styleNote}\n\n${content}`,
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

    return this.generate(prompts[analysisType] ?? prompts.full);
  }

  /**
   * Genera contenido académico (sílabo, resolución, informe, carta, tesis, etc.).
   * @param {'syllabus'|'resolution'|'report'|'letter'|'thesis'|'research_project'|'article'} type
   * @param {object} data
   */
  async generateAcademicContent(type, data) {
    // Documentos especializados delegados al módulo de prompts
    const SPECIALIZED_MAP = {
      thesis:           PROMPT_NAMES.THESIS_GENERATION,
      research_project: PROMPT_NAMES.RESEARCH_PROJECT_GENERATION,
      article:          PROMPT_NAMES.ARTICLE_GENERATION,
    };

    if (SPECIALIZED_MAP[type]) {
      const result = renderPrompt(SPECIALIZED_MAP[type], {
        title:   data.title   || 'Documento Académico',
        context: data.context || data.extraContext || '',
      });
      if (result) return this.generate(result.rendered);
    }

    // Documentos plantilla internos
    const TEMPLATE_MAP = {
      syllabus:   () => this.getSyllabusPrompt(data),
      resolution: () => this.getResolutionPrompt(data),
      report:     () => this.getReportPrompt(data),
      letter:     () => this.getLetterPrompt(data),
    };

    const promptFn = TEMPLATE_MAP[type] ?? TEMPLATE_MAP.report;
    return this.generate(promptFn());
  }

  /**
   * Extrae información estructurada de un texto según un esquema JSON.
   * @param {string} text
   * @param {object} schema
   * @returns {Promise<object|null>}
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
      return extractJSON(response);
    } catch (error) {
      this.logger.error('Error al parsear JSON estructurado', error);
      return null;
    }
  }

  /**
   * Responde una pregunta sobre el contenido de un documento.
   * @param {string} documentContent
   * @param {string} question
   * @returns {Promise<string>}
   */
  async answerQuestion(documentContent, question) {
    const prompt = `Basándote en el siguiente documento, responde la pregunta de forma precisa:

DOCUMENTO:
${documentContent}

PREGUNTA: ${question}

RESPUESTA:`;

    return this.generate(prompt);
  }

  /**
   * Compara dos documentos según el enfoque indicado.
   * @param {string} doc1
   * @param {string} doc2
   * @param {'differences'|'similarities'|'both'} [focus='differences']
   * @returns {Promise<string>}
   */
  async compareDocuments(doc1, doc2, focus = 'differences') {
    const BASE = `DOCUMENTO 1:\n${doc1}\n\nDOCUMENTO 2:\n${doc2}`;
    const prompts = {
      differences: `Identifica las diferencias principales entre estos dos documentos:\n\n${BASE}`,
      similarities:`Identifica las similitudes entre estos dos documentos:\n\n${BASE}`,
      both:        `Compara estos dos documentos, identificando similitudes y diferencias:\n\n${BASE}`,
    };
    return this.generate(prompts[focus] ?? prompts.both);
  }

  // ─── Búsqueda y extracción web ───────────────────────────────────────────────

  /**
   * Realiza una búsqueda web mediante Ollama Cloud.
   * @param {string} query
   * @param {number} [maxResults=5]
   */
  async webSearch(query, maxResults = 5) {
    this._requireCloudKey();
    try {
      this.logger.info(`Realizando búsqueda web: "${query}" (max: ${maxResults})`);
      const { data } = await this._cloudAxios().post('/api/web_search', { query, max_results: maxResults });
      return data;
    } catch (error) {
      this.logger.error('Error en búsqueda web de Ollama', error);
      throw new Error(`Error en búsqueda Ollama: ${error.message}`);
    }
  }

  /**
   * Extrae el contenido de una URL mediante Ollama Cloud.
   * @param {string} url
   */
  async webFetch(url) {
    this._requireCloudKey();
    try {
      this.logger.info(`Extrayendo contenido web con Ollama: ${url}`);
      const { data } = await this._cloudAxios().post('/api/web_fetch', { url });
      return data;
    } catch (error) {
      this.logger.error('Error en extracción web de Ollama', error);
      throw new Error(`Error en extracción Ollama: ${error.message}`);
    }
  }

  // ─── Generación de exámenes ──────────────────────────────────────────────────

  /**
   * Genera un examen estructurado (JSON) a partir de datos y contexto.
   * @param {object} data
   * @returns {Promise<object>}
   */
  async generateExam(data) {
    this.logger.info('Generando examen estructurado...', { topic: data.topic });

    const promptData = {
      topic:            data.topic            || 'Temas Generales',
      context:          data.context          || 'Conocimiento general',
      questionCount:    data.questionCount    || 5,
      difficulty:       data.difficulty       || 'intermedio',
      questionTypes:    data.questionTypes    || 'variados',
      instructions:     data.instructions    || 'Sin instrucciones adicionales',
      course:           data.course           || 'Gestión Académica',
      date:             data.date             || new Date().toLocaleDateString('es-PE'),
      examType:         data.examType         || 'EXAMEN PARCIAL',
      semester:         data.semester         || `${new Date().getFullYear()}-I`,
      duration:         data.duration         || '60',
      pointsPerQuestion:data.pointsPerQuestion|| 2,
    };

    const result = renderPrompt(PROMPT_NAMES.EXAM_GENERATION, promptData);
    if (!result) throw new Error('No se pudo renderizar el prompt para el examen');

    try {
      const response = await this.generate(result.rendered, { temperature: 0.3 });
      const parsed   = extractJSON(response);
      if (!parsed) throw new Error('La IA no generó una respuesta estructurada válida para el examen');
      return parsed;
    } catch (error) {
      this.logger.error('Error en generateExam', error);
      throw error instanceof SyntaxError
        ? new Error('Error de formato en el examen generado')
        : error;
    }
  }

  // ─── Plantillas de prompts académicos ───────────────────────────────────────

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

  // ─── Métodos privados ────────────────────────────────────────────────────────

  /** Inicializa (o reinicia) el cliente Ollama. */
  _initOllama(host, apiKey) {
    const cfg = { host };
    if (apiKey) cfg.headers = buildAuthHeaders(apiKey);
    this.ollama = new Ollama(cfg);
  }

  /**
   * Verifica que el host local responda; corrige localhost ↔ 127.0.0.1 si es necesario.
   * Solo actúa en modo local.
   */
  async _verifyHost() {
    if (this.mode === AI_MODES.CLOUD) return;

    const p = this.providers[AI_MODES.LOCAL];
    if (!p.host.includes('localhost') && !p.host.includes('127.0.0.1')) return;

    const candidates = [p.host, 'http://127.0.0.1:11434'];

    for (const h of candidates) {
      try {
        const { status } = await axios.get(`${h}/api/tags`, { timeout: DEFAULTS.HOST_CHECK_TIMEOUT });
        if (status === 200) {
          if (p.host !== h) {
            this.logger.info(`Host de Ollama corregido: ${p.host} → ${h}`);
            p.host = h;
            this._initOllama(h, null);
          }
          return;
        }
      } catch {
        // Ignorar y probar el siguiente candidato
      }
    }
  }

  /** Chat hacia el proveedor local. */
  async _chatLocal(messages, options = {}) {
    try {
      this.logger.info('Solicitud chat LOCAL (Ollama)...');
      const response = await this.ollama.chat({
        model: this.providers[AI_MODES.LOCAL].model,
        messages: sanitizeMessages(messages),
        ...this.defaultOptions,
        ...options,
        stream: false,
      });
      this._circuitBreaker.reset();
      return response.message.content;
    } catch (error) {
      this._circuitBreaker.trip();
      throw error;
    }
  }

  /** Chat hacia un proveedor cloud mediante axios (API nativa Ollama). */
  async _chatCloud(providerId, messages, options = {}) {
    const p = this.providers[providerId];
    if (!p?.apiKey) throw new Error(`Proveedor ${providerId} no configurado o sin API Key.`);

    this.logger.info(`Solicitud chat CLOUD (${providerId.toUpperCase()})...`);

    try {
      // Usar endpoint nativo de Ollama: /api/chat
      const { data } = await axios.post(
        `${p.host}/api/chat`,
        {
          model:       p.model,
          messages:    sanitizeMessages(messages),
          stream:      false,
        },
        {
          headers: buildAuthHeaders(p.apiKey),
          timeout: DEFAULTS.CLOUD_TIMEOUT_MS,
        },
      );
      // Ollama nativo devuelve data.message.content
      return data.message?.content || data.choices?.[0]?.message?.content;
    } catch (error) {
      const msg = error.response?.data?.error?.message ?? error.response?.data?.error ?? error.message;
      this.logger.error(`Error en nube ${providerId}: ${msg}`);
      throw new Error(`Error en ${providerId}: ${msg}`);
    }
  }

  /**
   * Ejecuta `fn` con reintentos y back-off exponencial.
   * Solo reintenta en errores 429 / concurrencia.
   * @private
   */
  async _withRetry(fn, maxRetries = DEFAULTS.RETRY_MAX, initialDelay = DEFAULTS.RETRY_INITIAL_MS) {
    let delay = initialDelay;

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        return await fn();
      } catch (error) {
        const is429 =
          error.message?.toLowerCase().includes('too many concurrent requests') ||
          error.status === 429 ||
          error.response?.status === 429;

        if (is429 && attempt < maxRetries) {
          this.logger.warn(`Límite de concurrencia (intento ${attempt}/${maxRetries}). Reintentando en ${delay}ms...`);
          await _sleep(delay);
          delay *= 2;
          continue;
        }
        throw error;
      }
    }
  }

  /** Devuelve una instancia de axios pre-configurada para el host cloud base. */
  _cloudAxios() {
    const p = this.providers[AI_MODES.CLOUD];
    return axios.create({
      baseURL: 'https://ollama.com',
      headers: buildAuthHeaders(p.apiKey),
    });
  }

  /** Lanza si no hay API key cloud configurada. */
  _requireCloudKey() {
    if (!this.providers[AI_MODES.CLOUD].apiKey) {
      throw new Error('Se requiere OLLAMA_API_KEY para esta operación.');
    }
  }
}

// ─── Utilidades auxiliares ───────────────────────────────────────────────────

/** Promesa de espera no-bloqueante. */
const _sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * Circuit-breaker de estado mínimo.
 * Encapsula la lógica de apertura/cierre del circuito que antes estaba
 * dispersa como propiedades sueltas en OllamaService.
 * @private
 */
class _CircuitBreaker {
  #lastFailure = 0;
  #cooldown;

  constructor(cooldownMs = DEFAULTS.CIRCUIT_BREAKER_MS) {
    this.#cooldown = cooldownMs;
  }

  /** @returns {boolean} true si el circuito está cerrado (puede enviar peticiones). */
  isClosed() {
    return Date.now() - this.#lastFailure >= this.#cooldown;
  }

  /** Lanza si el circuito está abierto. */
  assertClosed(logger) {
    if (!this.isClosed()) {
      const remaining = Math.round((this.#cooldown - (Date.now() - this.#lastFailure)) / 1000);
      logger?.warn(`Circuito abierto (Ollama inaccesible). Reintentando en ${remaining}s...`);
      throw new Error(`Ollama no responde. Reintenta en unos segundos.`);
    }
  }

  trip()  { this.#lastFailure = Date.now(); }
  reset() { this.#lastFailure = 0; }
}

export default OllamaService;