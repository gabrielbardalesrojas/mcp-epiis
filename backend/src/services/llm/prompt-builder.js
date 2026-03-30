/**
 * @module prompt-builder
 * @description Constructor de prompts optimizados para modelos de lenguaje.
 *              Diseñado para la gestión académica de la EPIIS-UNAS.
 * @version 2.0.0
 */

// ─── Constantes ────────────────────────────────────────────────────────────────

/** @enum {string} Claves de prompts de sistema disponibles */
export const SYSTEM_PROMPT_KEY = Object.freeze({
  DEFAULT:            'default',
  DOCUMENT_ANALYSIS:  'documentAnalysis',
  CONTENT_GENERATION: 'contentGeneration',
  ASSISTANT:          'assistant',
});

/** @enum {string} Tipos de análisis rápido */
export const QUICK_ANALYSIS_TYPE = Object.freeze({
  SUMMARY:    'summary',
  KEY_POINTS: 'keyPoints',
  QUESTIONS:  'questions',
});

/** Longitud máxima de texto por defecto antes de truncar */
const DEFAULT_MAX_LENGTH = 3_000;

// ─── Prompts de sistema ────────────────────────────────────────────────────────

/**
 * Plantillas base de prompts de sistema.
 * @type {Record<string, string>}
 */
export const systemPrompts = Object.freeze({

  [SYSTEM_PROMPT_KEY.DEFAULT]: `\
Eres un asistente académico para la EPIIS (Escuela Profesional de Ingeniería \
en Informática y Sistemas) de la UNAS (Universidad Nacional Agraria de la Selva).
Ayudas con la gestión académica: búsqueda de información, análisis de documentos, \
generación de sílabos, resoluciones e informes.
Responde en español de manera profesional, precisa y concisa.`,

  [SYSTEM_PROMPT_KEY.DOCUMENT_ANALYSIS]: `\
Eres un experto en análisis de documentos académicos universitarios.
Tu tarea es analizar documentos de manera objetiva, identificar puntos clave \
y proporcionar retroalimentación constructiva.
Responde en español con un tono profesional y estructurado.`,

  [SYSTEM_PROMPT_KEY.CONTENT_GENERATION]: `\
Eres un experto en redacción académica y administrativa universitaria.
Generas contenido siguiendo los estándares institucionales de la UNAS \
y las normativas SUNEDU vigentes.
Tu redacción es formal, precisa y bien estructurada.`,

  [SYSTEM_PROMPT_KEY.ASSISTANT]: `\
Eres el asistente virtual de la EPIIS-UNAS.
Respondes consultas sobre información institucional, trámites académicos, \
normativas y reglamentos, y planes de estudio.
Responde de manera amable, servicial y en español.`,

});

// ─── Tipos (JSDoc) ─────────────────────────────────────────────────────────────

/**
 * @typedef {Object} FewShotExample
 * @property {string} input  - Entrada de ejemplo.
 * @property {string} output - Salida esperada de ejemplo.
 */

/**
 * @typedef {{ role: 'system' | 'user' | 'assistant'; content: string }} ChatMessage
 */

// ─── PromptBuilder ─────────────────────────────────────────────────────────────

/**
 * Constructor de prompts con API fluida (builder pattern).
 *
 * @example
 * const messages = new PromptBuilder()
 *   .setSystem(SYSTEM_PROMPT_KEY.DOCUMENT_ANALYSIS)
 *   .addContext('Reglamento académico 2024...')
 *   .addInstruction('Cita el artículo relevante si es posible.')
 *   .addExample('¿Qué dice el art. 5?', 'El artículo 5 establece...')
 *   .buildMessages('¿Cuáles son los requisitos de titulación?');
 */
export class PromptBuilder {

  constructor() {
    /** @type {string} */
    this.systemPrompt = systemPrompts[SYSTEM_PROMPT_KEY.DEFAULT];
    /** @type {string[]} */
    this.context = [];
    /** @type {string[]} */
    this.instructions = [];
    /** @type {FewShotExample[]} */
    this.examples = [];
  }

  // ── Configuración ───────────────────────────────────────────────────────

  /**
   * Establece el prompt de sistema por clave predefinida.
   *
   * @param {string} [type='default']
   * @returns {this}
   */
  setSystem(type = SYSTEM_PROMPT_KEY.DEFAULT) {
    this.systemPrompt = systemPrompts[type] ?? systemPrompts[SYSTEM_PROMPT_KEY.DEFAULT];
    return this;
  }

  /**
   * Establece un prompt de sistema completamente personalizado.
   *
   * @param {string} prompt
   * @returns {this}
   */
  setCustomSystem(prompt) {
    if (!prompt?.trim()) throw new Error('El prompt de sistema no puede estar vacío.');
    this.systemPrompt = prompt.trim();
    return this;
  }

  // ── Contexto ────────────────────────────────────────────────────────────

  /**
   * Agrega uno o varios fragmentos de contexto.
   *
   * @param {string | string[]} context
   * @returns {this}
   */
  addContext(context) {
    const items = Array.isArray(context) ? context : [context];
    this.context.push(...items.map((c) => c.trim()).filter(Boolean));
    return this;
  }

  // ── Instrucciones ───────────────────────────────────────────────────────

  /**
   * Agrega una instrucción individual.
   *
   * @param {string} instruction
   * @returns {this}
   */
  addInstruction(instruction) {
    const trimmed = instruction?.trim();
    if (trimmed) this.instructions.push(trimmed);
    return this;
  }

  /**
   * Agrega múltiples instrucciones de una vez.
   *
   * @param {string[]} instructions
   * @returns {this}
   */
  addInstructions(instructions) {
    instructions.forEach((inst) => this.addInstruction(inst));
    return this;
  }

  // ── Ejemplos few-shot ───────────────────────────────────────────────────

  /**
   * Agrega un ejemplo few-shot (entrada / salida esperada).
   *
   * @param {string} input
   * @param {string} output
   * @returns {this}
   */
  addExample(input, output) {
    if (!input?.trim() || !output?.trim()) {
      throw new Error('El ejemplo debe tener input y output no vacíos.');
    }
    this.examples.push({ input: input.trim(), output: output.trim() });
    return this;
  }

  // ── Construcción ────────────────────────────────────────────────────────

  /**
   * Construye un prompt de texto plano (para modelos completion).
   *
   * @param {string} userMessage
   * @returns {string}
   */
  build(userMessage) {
    if (!userMessage?.trim()) throw new Error('El mensaje del usuario no puede estar vacío.');

    const parts = [this.systemPrompt];

    if (this.context.length > 0) {
      parts.push('\n\nCONTEXTO:');
      parts.push(this.context.join('\n\n'));
    }

    if (this.instructions.length > 0) {
      parts.push('\n\nINSTRUCCIONES:');
      parts.push(this.instructions.map((inst, i) => `${i + 1}. ${inst}`).join('\n'));
    }

    if (this.examples.length > 0) {
      parts.push('\n\nEJEMPLOS:');
      this.examples.forEach((ex, i) => {
        parts.push(`\nEjemplo ${i + 1}:`);
        parts.push(`Entrada: ${ex.input}`);
        parts.push(`Salida:  ${ex.output}`);
      });
    }

    parts.push('\n\nSOLICITUD:');
    parts.push(userMessage.trim());

    return parts.join('\n');
  }

  /**
   * Construye un arreglo de mensajes en formato chat (OpenAI / Ollama compatible).
   *
   * @param {string} userMessage
   * @returns {ChatMessage[]}
   */
  buildMessages(userMessage) {
    if (!userMessage?.trim()) throw new Error('El mensaje del usuario no puede estar vacío.');

    /** @type {ChatMessage[]} */
    const messages = [{ role: 'system', content: this.systemPrompt }];

    if (this.context.length > 0) {
      messages.push({
        role:    'system',
        content: `Contexto relevante:\n${this.context.join('\n\n')}`,
      });
    }

    if (this.instructions.length > 0) {
      messages.push({
        role:    'system',
        content: `Instrucciones:\n${this.instructions.map((inst, i) => `${i + 1}. ${inst}`).join('\n')}`,
      });
    }

    for (const ex of this.examples) {
      messages.push({ role: 'user',      content: ex.input  });
      messages.push({ role: 'assistant', content: ex.output });
    }

    messages.push({ role: 'user', content: userMessage.trim() });

    return messages;
  }

  // ── Utilidades del builder ──────────────────────────────────────────────

  /**
   * Resetea el builder a su estado inicial.
   *
   * @returns {this}
   */
  reset() {
    this.systemPrompt = systemPrompts[SYSTEM_PROMPT_KEY.DEFAULT];
    this.context      = [];
    this.instructions = [];
    this.examples     = [];
    return this;
  }

  /**
   * Devuelve una copia inmutable del estado actual (útil para debug o persistencia).
   *
   * @returns {{ systemPrompt: string; context: string[]; instructions: string[]; examples: FewShotExample[] }}
   */
  snapshot() {
    return {
      systemPrompt: this.systemPrompt,
      context:      [...this.context],
      instructions: [...this.instructions],
      examples:     this.examples.map((ex) => ({ ...ex })),
    };
  }
}

// ─── Utilidades independientes ─────────────────────────────────────────────────

/**
 * Trunca texto preservando coherencia semántica.
 * Corta en el último punto si está dentro del 80 % final del límite.
 *
 * @param {string} text
 * @param {number} [maxLength=3000]
 * @returns {string}
 */
export const truncateText = (text, maxLength = DEFAULT_MAX_LENGTH) => {
  if (!text || text.length <= maxLength) return text ?? '';

  const truncated  = text.slice(0, maxLength);
  const lastPeriod = truncated.lastIndexOf('.');

  if (lastPeriod > maxLength * 0.8) {
    return truncated.slice(0, lastPeriod + 1);
  }

  return `${truncated}...`;
};

/**
 * Normaliza espacios y saltos de línea excesivos.
 *
 * @param {string} text
 * @returns {string}
 */
export const cleanText = (text) =>
  (text ?? '')
    .replace(/\s+/g, ' ')
    .replace(/\n{3,}/g, '\n\n')
    .trim();

/**
 * Genera un prompt de análisis rápido.
 *
 * @param {string} content
 * @param {string} [type='summary']   - Valor de {@link QUICK_ANALYSIS_TYPE}.
 * @param {number} [maxLength=3000]
 * @returns {string}
 *
 * @example
 * const prompt = quickAnalysisPrompt(rawText, QUICK_ANALYSIS_TYPE.KEY_POINTS);
 */
export const quickAnalysisPrompt = (
  content,
  type      = QUICK_ANALYSIS_TYPE.SUMMARY,
  maxLength = DEFAULT_MAX_LENGTH,
) => {
  const prefixes = {
    [QUICK_ANALYSIS_TYPE.SUMMARY]:    'Resume el siguiente texto en 2-3 párrafos:',
    [QUICK_ANALYSIS_TYPE.KEY_POINTS]: 'Extrae los 5 puntos clave del siguiente texto:',
    [QUICK_ANALYSIS_TYPE.QUESTIONS]:  'Genera 5 preguntas de comprensión sobre el siguiente texto:',
  };

  const prefix = prefixes[type] ?? prefixes[QUICK_ANALYSIS_TYPE.SUMMARY];

  return new PromptBuilder()
    .setSystem(SYSTEM_PROMPT_KEY.DOCUMENT_ANALYSIS)
    .build(`${prefix}\n\n${truncateText(cleanText(content), maxLength)}`);
};

export default PromptBuilder;