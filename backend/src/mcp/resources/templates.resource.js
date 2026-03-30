/**
 * Recurso MCP: Plantillas
 * Proporciona acceso a plantillas de documentos
 */

export const templatesResource = {
    uri: 'epiis://templates',
    name: 'Plantillas de Documentos',
    description: 'Plantillas para generación de documentos académicos',
    mimeType: 'application/json',

    // Plantillas disponibles
    templates: [
        {
            id: 'tpl-silabo',
            name: 'Plantilla de Sílabo',
            type: 'syllabus',
            description: 'Formato estándar de sílabo FIIS',
            variables: ['course_code', 'course_name', 'professor', 'semester', 'credits'],
        },
        {
            id: 'tpl-resolucion-directoral',
            name: 'Resolución Directoral',
            type: 'resolution',
            description: 'Formato de resolución directoral',
            variables: ['number', 'subject', 'considerations', 'articles', 'date'],
        },
        {
            id: 'tpl-resolucion-decanal',
            name: 'Resolución Decanal',
            type: 'resolution',
            description: 'Formato de resolución decanal',
            variables: ['number', 'subject', 'considerations', 'articles', 'date'],
        },
        {
            id: 'tpl-informe',
            name: 'Informe Académico',
            type: 'report',
            description: 'Formato de informe académico',
            variables: ['number', 'recipient', 'subject', 'content', 'date'],
        },
        {
            id: 'tpl-carta',
            name: 'Carta Oficial',
            type: 'letter',
            description: 'Formato de carta oficial',
            variables: ['recipient', 'subject', 'body', 'sender', 'position'],
        },
        {
            id: 'tpl-acta',
            name: 'Acta de Reunión',
            type: 'minutes',
            description: 'Formato de acta de reunión',
            variables: ['date', 'attendees', 'agenda', 'agreements'],
        },
    ],

    /**
     * Listar plantillas
     */
    async list() {
        return {
            uri: this.uri,
            name: this.name,
            templates: this.templates,
            count: this.templates.length,
        };
    },

    /**
     * Obtener plantilla por ID
     * @param {string} id - ID de la plantilla
     */
    get(id) {
        const template = this.templates.find(t => t.id === id);
        if (!template) {
            throw new Error(`Plantilla no encontrada: ${id}`);
        }
        return template;
    },

    /**
     * Obtener plantillas por tipo
     * @param {string} type - Tipo de plantilla
     */
    getByType(type) {
        return this.templates.filter(t => t.type === type);
    },

    /**
     * Generar documento desde plantilla
     * @param {string} templateId - ID de plantilla
     * @param {object} data - Datos para reemplazar
     * @param {object} services - Servicios inyectados
     */
    async generate(templateId, data, services) {
        const template = this.get(templateId);
        const { ollamaService, documentService } = services;

        // Generar contenido con IA
        const prompt = `Genera un documento de tipo "${template.name}" con los siguientes datos:
${Object.entries(data).map(([k, v]) => `- ${k}: ${v}`).join('\n')}

Sigue el formato institucional de la FIIS-UNSM.`;

        const content = await ollamaService.generate(prompt);

        // Guardar según tipo
        if (template.type === 'syllabus') {
            return await documentService.generateSyllabus({ ...data, content });
        } else if (template.type === 'resolution') {
            return await documentService.generateResolution({ ...data, content });
        }

        return { content };
    },
};

export default templatesResource;
