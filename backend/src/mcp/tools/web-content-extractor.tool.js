/**
 * Herramienta MCP: Extractor de Contenido Web
 * Extrae contenido de páginas web institucionales
 */

export const webContentExtractorTool = {
    name: 'extract_web_content',
    description: 'Extraer contenido de páginas web institucionales',

    inputSchema: {
        type: 'object',
        properties: {
            url: {
                type: 'string',
                description: 'URL a extraer',
            },
            summarize: {
                type: 'boolean',
                description: 'Resumir contenido extraído',
                default: false,
            },
            extract_type: {
                type: 'string',
                enum: ['text', 'links', 'structured', 'all'],
                description: 'Tipo de extracción',
                default: 'text',
            },
        },
        required: ['url'],
    },

    /**
     * Extraer contenido web
     * @param {object} args - Argumentos
     * @param {object} services - Servicios inyectados
     * @returns {Promise<object>}
     */
    async execute(args, services) {
        const { url, summarize = false, extract_type = 'text' } = args;
        const { webScraper, ollamaService } = services;

        let content;

        switch (extract_type) {
            case 'links':
                content = await webScraper.extractLinks(url);
                break;
            case 'structured':
                content = await webScraper.extractStructuredData(url);
                break;
            case 'all':
                content = await webScraper.extractAll(url);
                break;
            default:
                content = await webScraper.extractText(url);
        }

        let summary = null;
        if (summarize && typeof content === 'string') {
            summary = await ollamaService.generate(
                `Resume el siguiente contenido web de manera concisa:\n\n${content.substring(0, 3000)}`
            );
        }

        return {
            url,
            extract_type,
            content: typeof content === 'string'
                ? content.substring(0, 5000)
                : content,
            summary,
        };
    },
};

export default webContentExtractorTool;
