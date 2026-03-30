/**
 * @module academicPrompts
 * @description Plantillas de prompts para tareas académicas — EPIIS-UNAS
 * @version 2.0.0
 */

// ─── Constantes ────────────────────────────────────────────────────────────────

/** @enum {string} Nombres de prompts disponibles */
export const PROMPT_NAMES = Object.freeze({
  DOCUMENT_ANALYSIS: 'documentAnalysis',
  SYLLABUS_GENERATION: 'syllabusGeneration',
  DOCUMENT_COMPARISON: 'documentComparison',
  DOCUMENT_QA: 'documentQA',
  INFO_EXTRACTION: 'infoExtraction',
  ACADEMIC_SUMMARY: 'academicSummary',
  THESIS_GENERATION: 'thesisGeneration',
  RESEARCH_PROJECT_GENERATION: 'researchProjectGeneration',
  ARTICLE_GENERATION: 'articleGeneration',
  EXAM_GENERATION: 'examGeneration',
});

// ─── Definición de prompts ─────────────────────────────────────────────────────

/**
 * @typedef {Object} PromptDefinition
 * @property {string}   name        - Nombre legible del prompt.
 * @property {string}   description - Descripción breve de su propósito.
 * @property {string}   template    - Plantilla con variables en formato {{variable}}.
 * @property {string[]} variables   - Lista de variables requeridas en la plantilla.
 */

/** @type {Record<string, PromptDefinition>} */
export const academicPrompts = Object.freeze({

  // ── Generación de Examen ───────────────────────────────────────────────────
  [PROMPT_NAMES.EXAM_GENERATION]: {
    name: 'Generación de Examen',
    description: 'Genera un examen universitario profesional con formato oficial.',
    template: `Genera un examen académico profesional y riguroso sobre el tema: {{topic}}.
Basado en el siguiente contenido/contexto: {{context}}

**Especificaciones del examen:**
- Curso: {{course}}
- Tipo de examen: {{examType}}
- Semestre académico: {{semester}}
- Número de preguntas: {{questionCount}}
- Nivel de dificultad: {{difficulty}}
- Tipos de pregunta permitidos: {{questionTypes}}
- Puntos por pregunta: {{pointsPerQuestion}}
- Tiempo de duración: {{duration}} minutos
- Instrucciones adicionales: {{instructions}}

**REGLAS CRÍTICAS DE FORMATO:**
1. Responde ÚNICAMENTE con un objeto JSON válido.
2. NO incluyas bloques de código Markdown ni texto adicional.
3. Las opciones de cada pregunta deben ser strings SIN prefijo de letra (sin "A)", "B)", etc.).
4. El campo "correct" debe ser la LETRA de la opción correcta ("A", "B", "C", "D" o "E").
5. Para preguntas multi_select, "correct" es un array de letras: ["B", "C"].
6. Genera preguntas variadas, técnicas y bien redactadas.

**ESTRUCTURA JSON EXACTA:**
{
  "header": {
    "institution": "UNIVERSIDAD NACIONAL AGRARIA DE LA SELVA",
    "faculty": "FACULTAD DE INGENIERÍA EN INFORMÁTICA Y SISTEMAS",
    "examType": "{{examType}}",
    "course": "{{course}}",
    "topic": "{{topic}}",
    "semester": "{{semester}}",
    "date": "{{date}}",
    "duration": "{{duration}}",
    "pointsPerQuestion": {{pointsPerQuestion}}
  },
  "instructions": "Presentar el examen con las respuestas con lapicero (no lápiz). No se permiten calculadoras, ni celulares, ni cualquier otro dispositivo electrónico. De ser detectado usándolos, se anula su examen. No se admiten borrones ni enmendaduras.",
  "questions": [
    {
      "id": 1,
      "type": "multiple_choice",
      "question": "Texto completo de la pregunta",
      "points": {{pointsPerQuestion}},
      "options": ["Opción 1", "Opción 2", "Opción 3", "Opción 4", "Opción 5"],
      "correct": "A"
    },
    {
      "id": 2,
      "type": "true_false",
      "question": "Afirmación a evaluar como verdadera o falsa. ¿Verdadero o Falso?",
      "points": {{pointsPerQuestion}},
      "correct": "Verdadero"
    },
    {
      "id": 3,
      "type": "multi_select",
      "question": "Pregunta donde hay que seleccionar varias respuestas correctas; seleccione las que corresponda",
      "points": {{pointsPerQuestion}},
      "options": ["Opción 1", "Opción 2", "Opción 3", "Opción 4", "Opción 5"],
      "correct": ["B", "C"]
    },
    {
      "id": 4,
      "type": "fill_blank",
      "question": "Texto con espacio para completar: _______________",
      "points": {{pointsPerQuestion}},
      "correct": "Respuesta esperada"
    },
    {
      "id": 5,
      "type": "open_ended",
      "question": "Pregunta abierta que requiere desarrollo",
      "points": {{pointsPerQuestion}},
      "guidelines": "Criterios de evaluación"
    }
  ]
}

Responde SOLO el JSON.`,
    variables: ['topic', 'context', 'questionCount', 'difficulty', 'questionTypes', 'instructions', 'course', 'date', 'examType', 'semester', 'duration', 'pointsPerQuestion'],
  },

  // ── Análisis de documento ──────────────────────────────────────────────────
  [PROMPT_NAMES.DOCUMENT_ANALYSIS]: {
    name: 'Análisis de Documento',
    description: 'Analiza un documento académico de forma estructurada.',
    template: `Analiza el siguiente documento académico y proporciona:

1. **Resumen Ejecutivo**: Síntesis de 2-3 párrafos del contenido principal.
2. **Estructura del Documento**: Organización y secciones identificadas.
3. **Puntos Clave**: Los 5-7 puntos más importantes.
4. **Fortalezas**: Aspectos positivos destacables.
5. **Oportunidades de Mejora**: Sugerencias concretas para mejorar.
6. **Cumplimiento Normativo**: Verificación de estándares académicos.

---
**DOCUMENTO:**
{{content}}`,
    variables: ['content'],
  },

  // ── Generación de sílabo ───────────────────────────────────────────────────
  [PROMPT_NAMES.SYLLABUS_GENERATION]: {
    name: 'Generación de Sílabo',
    description: 'Genera un sílabo académico completo siguiendo estándares SUNEDU.',
    template: `Genera un sílabo académico completo para el curso {{course_name}} ({{course_code}}) de la EPIIS-UNAS.

**Datos del curso:**
- Docente: {{professor}}
- Semestre: {{semester}}
- Créditos: {{credits}}
- Horas semanales: Teoría {{theory_hours}}h · Práctica {{practice_hours}}h

**El sílabo debe incluir:**
1. DATOS GENERALES (código, nombre, créditos, requisitos)
2. SUMILLA (descripción breve del curso)
3. COMPETENCIAS DEL PERFIL DE EGRESO
4. CAPACIDADES A DESARROLLAR
5. CONTENIDO TEMÁTICO (programación por 16 semanas)
6. ESTRATEGIAS METODOLÓGICAS
7. SISTEMA DE EVALUACIÓN (criterios y ponderaciones)
8. BIBLIOGRAFÍA (mínimo 5 referencias actuales en formato APA 7.ª ed.)

Formato: Profesional, coherente y alineado con los estándares SUNEDU vigentes.`,
    variables: ['course_code', 'course_name', 'professor', 'semester', 'credits', 'theory_hours', 'practice_hours'],
  },

  // ── Comparación de documentos ──────────────────────────────────────────────
  [PROMPT_NAMES.DOCUMENT_COMPARISON]: {
    name: 'Comparación de Documentos',
    description: 'Compara dos documentos académicos de forma detallada.',
    template: `Compara los siguientes dos documentos académicos:

**DOCUMENTO 1:**
{{document1}}

---

**DOCUMENTO 2:**
{{document2}}

---

**Proporciona:**
1. **Similitudes**: Aspectos comunes entre ambos documentos.
2. **Diferencias**: Principales diferencias encontradas.
3. **Análisis Comparativo**: Tabla comparativa de aspectos clave.
4. **Recomendaciones**: Sugerencias concretas derivadas de la comparación.`,
    variables: ['document1', 'document2'],
  },

  // ── Preguntas sobre documento ──────────────────────────────────────────────
  [PROMPT_NAMES.DOCUMENT_QA]: {
    name: 'Pregunta sobre Documento',
    description: 'Responde preguntas estrictamente basadas en el contenido del documento.',
    template: `Basándote **únicamente** en el siguiente documento, responde la pregunta de forma precisa y concisa.

**DOCUMENTO:**
{{content}}

---

**PREGUNTA:**
{{question}}

---

**INSTRUCCIONES:**
- Responde solo con información presente en el documento.
- Si la información no está disponible, indícalo explícitamente.
- Cita las partes relevantes cuando sea posible.`,
    variables: ['content', 'question'],
  },

  // ── Extracción de información ──────────────────────────────────────────────
  [PROMPT_NAMES.INFO_EXTRACTION]: {
    name: 'Extracción de Información',
    description: 'Extrae información estructurada del documento y la devuelve en JSON.',
    template: `Extrae la siguiente información del documento según el esquema indicado.

**ESQUEMA JSON ESPERADO:**
{{schema}}

---

**DOCUMENTO:**
{{content}}

---

Responde **EXCLUSIVAMENTE** con el JSON válido resultante, sin texto adicional ni bloques de código Markdown.`,
    variables: ['schema', 'content'],
  },

  // ── Resumen académico ──────────────────────────────────────────────────────
  [PROMPT_NAMES.ACADEMIC_SUMMARY]: {
    name: 'Resumen Académico',
    description: 'Genera un resumen académico conciso y bien estructurado.',
    template: `Genera un resumen académico del siguiente texto. El resumen debe:
- Ser conciso pero completo (máximo 500 palabras).
- Mantener el tono académico formal.
- Incluir los conceptos principales.
- Estar organizado en párrafos coherentes.

---

**TEXTO:**
{{content}}`,
    variables: ['content'],
  },

  // ── Generación de Tesis ───────────────────────────────────────────────────
  [PROMPT_NAMES.THESIS_GENERATION]: {
    name: 'Generación de Tesis',
    description: 'Genera el contenido de una tesis siguiendo la estructura oficial de la UNAS.',
    template: `Genera el contenido detallado para una tesis titulada "{{title}}" de la UNAS.
Utiliza la estructura oficial:

**Pre-cuerpo:** Resumen (máx. 250 palabras, 5 palabras clave), Abstract.
**Cuerpo:**
I. Introducción (Realidad problemática, objetivos, hipótesis sin citas bibliográficas).
II. Revisión de Literatura (Conceptos, definiciones, antecedentes con APA 7).
III. Materiales y Métodos (Lugar de ejecución, metodología, análisis estadístico).
IV. Resultados y Discusión.
V. Conclusiones.
VI. Recomendaciones.
VII. Referencias (APA 7).
**Pos-cuerpo:** Anexos y Glosario.

---
**DATOS Y CONTEXTO:**
{{context}}

Instrucciones: Usa títulos claros (#, ##). No inventes datos institucionales.`,
    variables: ['title', 'context'],
  },

  // ── Generación de Proyecto de Investigación ───────────────────────────────
  [PROMPT_NAMES.RESEARCH_PROJECT_GENERATION]: {
    name: 'Generación de Proyecto de Investigación',
    description: 'Genera un proyecto de investigación siguiendo el Artículo 19 de la UNAS.',
    template: `Genera un proyecto de investigación titulado "{{title}}" según el Art. 19 de la UNAS.
Estructura:
I. INTRODUCCIÓN (Realidad problemática, problema, justificación, hipótesis, objetivos).
II. REVISIÓN DE LITERATURA (Investigaciones previas, conceptos con APA 7).
III. MATERIALES Y MÉTODOS (Lugar de ejecución, Materiales y equipos, Metodología secuencial).
IV. PLAN DE EJECUCIÓN (Cronograma lógico).
V. PRESUPUESTO (Clasificador de gastos).
VI. REFERENCIAS (APA 7).

---
**CONTEXTO:**
{{context}}

Instrucciones: Sin citas en la introducción. Usa APA 7 para referencias.`,
    variables: ['title', 'context'],
  },

  // ── Generación de Artículo Científico ──────────────────────────────────────
  [PROMPT_NAMES.ARTICLE_GENERATION]: {
    name: 'Generación de Artículo Científico',
    description: 'Genera un artículo para la revista REVIA (UNAS).',
    template: `Genera un artículo científico titulado "{{title}}" para la revista REVIA UNAS.
Estructura:
- Título (Español/Inglés, máx 15 palabras).
- Resumen (máx 250 palabras) y Abstract.
I. Introducción.
II. Materiales y Métodos.
III. Resultados y Discusión.
IV. Conclusiones.
V. Agradecimientos.
VI. Referencias (APA 7).

---
**DATOS:**
{{context}}

Instrucciones: Máximo 15 páginas. Tono académico riguroso.`,
    variables: ['title', 'context'],
  },
});

// ─── Utilidades ────────────────────────────────────────────────────────────────

/**
 * Devuelve la definición de un prompt por su clave.
 *
 * @param {string} name - Clave del prompt (usar constantes de {@link PROMPT_NAMES}).
 * @returns {PromptDefinition | null} Definición del prompt o `null` si no existe.
 *
 * @example
 * const prompt = getPrompt(PROMPT_NAMES.ACADEMIC_SUMMARY);
 */
export const getPrompt = (name) => academicPrompts[name] ?? null;

/**
 * Renderiza la plantilla de un prompt reemplazando todas sus variables.
 *
 * @param {string} name      - Clave del prompt.
 * @param {Record<string, string>} variables - Mapa de variable → valor.
 * @returns {{ rendered: string; missing: string[] } | null}
 *   Objeto con la cadena renderizada y la lista de variables sin reemplazar,
 *   o `null` si el prompt no existe.
 *
 * @example
 * const result = renderPrompt(PROMPT_NAMES.ACADEMIC_SUMMARY, { content: '...' });
 * if (result) {
 *   console.log(result.rendered);
 *   if (result.missing.length) console.warn('Variables faltantes:', result.missing);
 * }
 */
export const renderPrompt = (name, variables = {}) => {
  const prompt = getPrompt(name);
  if (!prompt) return null;

  let rendered = prompt.template;

  for (const [key, value] of Object.entries(variables)) {
    rendered = rendered.replace(new RegExp(`\\{\\{${key}\\}\\}`, 'g'), value);
  }

  // Detecta variables que quedaron sin reemplazar
  const remainingMatches = rendered.match(/\{\{(\w+)\}\}/g) ?? [];
  const missing = remainingMatches.map((m) => m.slice(2, -2));

  return { rendered, missing };
};

/**
 * Valida que todas las variables requeridas por un prompt estén presentes.
 *
 * @param {string} name      - Clave del prompt.
 * @param {Record<string, string>} variables - Variables proporcionadas.
 * @returns {{ valid: boolean; missing: string[] }}
 *
 * @example
 * const { valid, missing } = validatePromptVariables(PROMPT_NAMES.SYLLABUS_GENERATION, data);
 * if (!valid) throw new Error(`Variables faltantes: ${missing.join(', ')}`);
 */
export const validatePromptVariables = (name, variables = {}) => {
  const prompt = getPrompt(name);
  if (!prompt) return { valid: false, missing: [] };

  const provided = new Set(Object.keys(variables));
  const missing = prompt.variables.filter((v) => !provided.has(v));

  return { valid: missing.length === 0, missing };
};

/**
 * Devuelve la lista de todos los prompts disponibles con sus metadatos.
 *
 * @returns {{ id: string; name: string; description: string; variables: string[] }[]}
 *
 * @example
 * listPrompts().forEach(p => console.log(p.id, p.name));
 */
export const listPrompts = () =>
  Object.entries(academicPrompts).map(([id, { name, description, variables }]) => ({
    id,
    name,
    description,
    variables,
  }));

export default academicPrompts;