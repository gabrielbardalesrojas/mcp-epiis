/**
 * @module administrativePrompts
 * @description Plantillas de prompts para tareas administrativas — FIIS-UNAS
 * @version 2.0.0
 */

// ─── Constantes ────────────────────────────────────────────────────────────────

/** @enum {string} Nombres de prompts disponibles */
export const PROMPT_NAMES = Object.freeze({
  RESOLUTION_GENERATION: 'resolutionGeneration',
  REPORT_GENERATION: 'reportGeneration',
  LETTER_GENERATION: 'letterGeneration',
  MINUTES_GENERATION: 'minutesGeneration',
  MEMO_GENERATION: 'memoGeneration',
  REQUEST_GENERATION: 'requestGeneration',
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
export const administrativePrompts = Object.freeze({

  // ── Resolución ─────────────────────────────────────────────────────────────
  [PROMPT_NAMES.RESOLUTION_GENERATION]: {
    name: 'Generación de Resolución',
    description: 'Genera una resolución administrativa oficial para la FIIS-UNAS.',
    template: `Genera una Resolución {{type}} para la FIIS-UNAS con el siguiente contenido:

**Asunto:** {{subject}}

**Considerandos / Antecedentes:**
{{considerations}}

**Artículos sugeridos:**
{{articles}}

---

La resolución debe seguir el formato oficial:

1. **Encabezado:** "RESOLUCIÓN {{type_upper}} Nº XXX-2026-UNAS/FIIS"
2. **VISTO:** Documentos de referencia que dan origen al acto administrativo.
3. **CONSIDERANDO:** Fundamentación legal y técnica, con citas normativas vigentes.
4. **SE RESUELVE:** Artículos numerados con disposiciones claras y precisas.
5. **REGÍSTRESE, COMUNÍQUESE Y ARCHÍVESE.**
6. Espacio para firma, cargo y fecha.`,
    variables: ['type', 'type_upper', 'subject', 'considerations', 'articles'],
  },

  // ── Informe ────────────────────────────────────────────────────────────────
  [PROMPT_NAMES.REPORT_GENERATION]: {
    name: 'Generación de Informe',
    description: 'Genera un informe administrativo institucional.',
    template: `Genera un Informe administrativo con los siguientes datos:

**Número:** INFORME Nº {{number}}-2026-FIIS/UNAS
**Destinatario:** {{recipient}}
**Asunto:** {{subject}}
**Referencia:** {{reference}}

**Contenido a desarrollar:**
{{content}}

---

El informe debe estructurarse en:
1. **Antecedentes:** Contexto y hechos que motivan el informe.
2. **Análisis:** Evaluación detallada de la situación.
3. **Conclusiones:** Síntesis objetiva de los hallazgos.
4. **Recomendaciones:** Acciones sugeridas con fundamento.

Formato: Profesional e institucional, lenguaje formal y preciso.`,
    variables: ['number', 'recipient', 'subject', 'reference', 'content'],
  },

  // ── Carta ──────────────────────────────────────────────────────────────────
  [PROMPT_NAMES.LETTER_GENERATION]: {
    name: 'Generación de Carta',
    description: 'Genera una carta oficial siguiendo el protocolo institucional.',
    template: `Genera una carta oficial con los siguientes datos:

**Destinatario:** {{recipient}}
**Cargo:** {{recipient_position}}
**Institución:** {{recipient_institution}}
**Asunto:** {{subject}}

---

**Cuerpo de la carta:**
{{body}}

---

**Remitente:** {{sender}}
**Cargo:** {{sender_position}}

La carta debe ser formal, profesional y seguir el protocolo institucional vigente.
Incluye lugar, fecha, saludo protocolario, desarrollo del asunto y despedida formal.`,
    variables: ['recipient', 'recipient_position', 'recipient_institution', 'subject', 'body', 'sender', 'sender_position'],
  },

  // ── Acta ───────────────────────────────────────────────────────────────────
  [PROMPT_NAMES.MINUTES_GENERATION]: {
    name: 'Generación de Acta',
    description: 'Genera un acta de reunión formal con todos los acuerdos.',
    template: `Genera un Acta de Reunión con los siguientes datos:

**Fecha:** {{date}}
**Hora:** {{time}}
**Lugar:** {{location}}
**Tipo de reunión:** {{meeting_type}}

**Asistentes:**
{{attendees}}

**Agenda:**
{{agenda}}

**Puntos tratados:**
{{discussion}}

**Acuerdos adoptados:**
{{agreements}}

---

El acta debe:
- Reflejar fielmente los acuerdos tomados con numeración clara.
- Indicar responsables y plazos para cada acuerdo cuando corresponda.
- Incluir cierre formal con hora de término y firma de los participantes.`,
    variables: ['date', 'time', 'location', 'meeting_type', 'attendees', 'agenda', 'discussion', 'agreements'],
  },

  // ── Memorando ──────────────────────────────────────────────────────────────
  [PROMPT_NAMES.MEMO_GENERATION]: {
    name: 'Generación de Memorando',
    description: 'Genera un memorando interno claro y directo.',
    template: `Genera un Memorando interno con los siguientes datos:

**DE:** {{sender}} — {{sender_position}}
**PARA:** {{recipient}} — {{recipient_position}}
**ASUNTO:** {{subject}}
**FECHA:** {{date}}

---

**Contenido:**
{{content}}

---

El memorando debe ser breve, claro y directo.
Usa lenguaje formal pero conciso; evita redundancias.
Incluye número de memorando si corresponde.`,
    variables: ['sender', 'sender_position', 'recipient', 'recipient_position', 'subject', 'date', 'content'],
  },

  // ── Solicitud ──────────────────────────────────────────────────────────────
  [PROMPT_NAMES.REQUEST_GENERATION]: {
    name: 'Generación de Solicitud',
    description: 'Genera una solicitud formal con argumentos sólidos.',
    template: `Genera una solicitud formal con los siguientes datos:

**Solicitante:** {{requester}}
**DNI / Código:** {{id}}
**Dirigido a:** {{recipient}}
**Asunto:** {{subject}}

---

**Fundamentación:**
{{justification}}

**Documentos adjuntos:**
{{attachments}}

---

La solicitud debe:
- Exponer con claridad el pedido y su justificación.
- Incluir base legal o reglamentaria si aplica.
- Cerrar con fórmula de cortesía formal y espacio para firma.`,
    variables: ['requester', 'id', 'recipient', 'subject', 'justification', 'attachments'],
  },

});

// ─── Utilidades ────────────────────────────────────────────────────────────────

/**
 * Devuelve la definición de un prompt por su clave.
 *
 * @param {string} name - Clave del prompt (usar constantes de {@link PROMPT_NAMES}).
 * @returns {PromptDefinition | null}
 *
 * @example
 * const prompt = getPrompt(PROMPT_NAMES.MEMO_GENERATION);
 */
export const getPrompt = (name) => administrativePrompts[name] ?? null;

/**
 * Renderiza la plantilla de un prompt reemplazando todas sus variables.
 *
 * @param {string} name - Clave del prompt.
 * @param {Record<string, string>} variables - Mapa de variable a valor.
 * @returns {{ rendered: string; missing: string[] } | null}
 *
 * @example
 * const result = renderPrompt(PROMPT_NAMES.MEMO_GENERATION, {
 *   sender: 'Dr. García', sender_position: 'Decano',
 * });
 * if (result?.missing.length) console.warn('Faltan variables:', result.missing);
 */
export const renderPrompt = (name, variables = {}) => {
  const prompt = getPrompt(name);
  if (!prompt) return null;

  let rendered = prompt.template;

  for (const [key, value] of Object.entries(variables)) {
    rendered = rendered.replace(new RegExp(`\\{\\{${key}\\}\\}`, 'g'), value);
  }

  const remainingMatches = rendered.match(/\{\{(\w+)\}\}/g) ?? [];
  const missing = remainingMatches.map((m) => m.slice(2, -2));

  return { rendered, missing };
};

/**
 * Valida que todas las variables requeridas por un prompt estén presentes.
 *
 * @param {string} name - Clave del prompt.
 * @param {Record<string, string>} variables - Variables proporcionadas.
 * @returns {{ valid: boolean; missing: string[] }}
 *
 * @example
 * const { valid, missing } = validatePromptVariables(PROMPT_NAMES.RESOLUTION_GENERATION, data);
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
 * Lista todos los prompts disponibles con sus metadatos.
 *
 * @returns {{ id: string; name: string; description: string; variables: string[] }[]}
 *
 * @example
 * listPrompts().forEach(p => console.log(p.id, p.name));
 */
export const listPrompts = () =>
  Object.entries(administrativePrompts).map(([id, { name, description, variables }]) => ({
    id,
    name,
    description,
    variables,
  }));

export default administrativePrompts;