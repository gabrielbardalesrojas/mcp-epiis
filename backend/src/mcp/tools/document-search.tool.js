/**
 * Herramienta MCP: Búsqueda de Documentos
 * Búsqueda semántica en documentos académicos
 */

export const documentSearchTool = {
    name: 'search_documents',
    description: 'Buscar documentos académicos por consulta semántica',

    inputSchema: {
        type: 'object',
        properties: {
            query: {
                type: 'string',
                description: 'Consulta de búsqueda',
            },
            type: {
                type: 'string',
                enum: ['all', 'silabo', 'resolucion', 'informe', 'reglamento'],
                description: 'Tipo de documento',
                default: 'all',
            },
            limit: {
                type: 'number',
                description: 'Número máximo de resultados',
                default: 5,
            },
        },
        required: ['query'],
    },

    /**
     * Ejecutar búsqueda
     * @param {object} args - Argumentos
     * @param {object} services - Servicios inyectados
     * @returns {Promise<object>}
     */
    async execute(args, services) {
        const { query, type = 'all', limit = 5 } = args;
        const { vectorStore } = services;

        const results = await vectorStore.searchSimilar(query, {
            type: type !== 'all' ? type : null,
            limit,
        });

        return {
            query,
            type,
            results: results.map(r => ({
                id: r.id,
                content: r.content.substring(0, 500) + '...',
                score: r.score,
                metadata: r.metadata,
            })),
            count: results.length,
        };
    },
};

export default documentSearchTool;
