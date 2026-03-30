/**
 * Herramienta MCP: Analizador de Documentos
 * Analiza documentos académicos con Llama
 */

export const documentAnalyzerTool = {
    name: 'analyze_document',
    description: 'Analizar contenido de un documento académico con IA',

    inputSchema: {
        type: 'object',
        properties: {
            document_path: {
                type: 'string',
                description: 'Ruta del documento a analizar',
            },
            analysis_type: {
                type: 'string',
                enum: ['summary', 'key_points', 'compliance', 'full'],
                description: 'Tipo de análisis',
                default: 'summary',
            },
        },
        required: ['document_path'],
    },

    /**
     * Ejecutar análisis
     * @param {object} args - Argumentos
     * @param {object} services - Servicios inyectados
     * @returns {Promise<object>}
     */
    async execute(args, services) {
        const { document_path, analysis_type = 'summary' } = args;
        const { documentService, ollamaService } = services;

        // Extraer contenido
        const content = await documentService.extractContent(document_path);

        // Generar análisis según tipo
        const prompts = {
            summary: `Resume de forma concisa el siguiente documento académico:\n\n${content}`,
            key_points: `Extrae los puntos clave más importantes del siguiente documento:\n\n${content}`,
            compliance: `Analiza el cumplimiento normativo del siguiente documento académico:\n\n${content}`,
            full: `Realiza un análisis completo del siguiente documento académico, incluyendo:
1. Resumen ejecutivo
2. Puntos clave
3. Estructura y organización
4. Fortalezas
5. Áreas de mejora
6. Recomendaciones

Documento:
${content}`,
        };

        const prompt = prompts[analysis_type] || prompts.summary;
        const analysis = await ollamaService.generate(prompt);

        return {
            document_path,
            analysis_type,
            analysis,
            content_length: content.length,
        };
    },
};

export default documentAnalyzerTool;
