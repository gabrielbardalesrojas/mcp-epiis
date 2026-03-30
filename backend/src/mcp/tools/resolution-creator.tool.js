/**
 * Herramienta MCP: Creador de Resoluciones
 * Genera resoluciones administrativas
 */

export const resolutionCreatorTool = {
    name: 'generate_resolution',
    description: 'Generar una resolución administrativa',

    inputSchema: {
        type: 'object',
        properties: {
            type: {
                type: 'string',
                enum: ['directoral', 'decanal', 'rectoral'],
                description: 'Tipo de resolución',
                default: 'directoral',
            },
            subject: {
                type: 'string',
                description: 'Asunto de la resolución',
            },
            considerations: {
                type: 'string',
                description: 'Considerandos o antecedentes',
            },
            articles: {
                type: 'array',
                items: { type: 'string' },
                description: 'Artículos de la resolución',
            },
        },
        required: ['subject'],
    },

    /**
     * Generar resolución
     * @param {object} args - Argumentos
     * @param {object} services - Servicios inyectados
     * @returns {Promise<object>}
     */
    async execute(args, services) {
        const { type = 'directoral', subject, considerations = '', articles = [] } = args;
        const { ollamaService, documentService } = services;

        const prompt = `Genera una resolución ${type} para la FIIS-UNSM con:
Asunto: ${subject}
${considerations ? `Considerandos: ${considerations}` : ''}
${articles.length > 0 ? `Artículos sugeridos: ${articles.join(', ')}` : ''}

La resolución debe seguir el formato oficial:
1. Encabezado institucional
2. VISTO/CONSIDERANDO
3. SE RESUELVE con artículos numerados
4. Firma y fecha`;

        const content = await ollamaService.generate(prompt);
        const result = await documentService.generateResolution({
            type,
            subject,
            content,
        });

        return {
            type,
            subject,
            content,
            document_path: result.path,
        };
    },
};

export default resolutionCreatorTool;
