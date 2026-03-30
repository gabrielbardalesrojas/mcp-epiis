/**
 * Configuración del servidor MCP
 */
export const mcpConfig = {
    // Información del servidor
    server: {
        name: 'epiis-mcp-server',
        version: '1.0.0',
        description: 'Servidor MCP para gestión académica EPIIS-UNAS',
    },

    // Capacidades
    capabilities: {
        tools: true,
        resources: true,
        prompts: true,
        experimental: {},
    },

    // Herramientas disponibles
    tools: [
        {
            name: 'search_documents',
            description: 'Buscar documentos académicos por consulta semántica',
            parameters: {
                query: 'string - Consulta de búsqueda',
                type: 'string? - Tipo de documento (silabo, resolucion, informe)',
                limit: 'number? - Número máximo de resultados (default: 5)',
            },
        },
        {
            name: 'analyze_document',
            description: 'Analizar contenido de un documento académico',
            parameters: {
                document_path: 'string - Ruta del documento',
                analysis_type: 'string? - Tipo de análisis (summary, key_points, compliance)',
            },
        },
        {
            name: 'generate_syllabus',
            description: 'Generar un sílabo académico',
            parameters: {
                course_code: 'string - Código del curso',
                course_name: 'string - Nombre del curso',
                professor: 'string - Nombre del docente',
                semester: 'string - Semestre académico',
            },
        },
        {
            name: 'generate_resolution',
            description: 'Generar una resolución administrativa',
            parameters: {
                type: 'string - Tipo de resolución (directoral, decanal)',
                subject: 'string - Asunto de la resolución',
                content: 'string - Contenido/considerandos',
            },
        },
        {
            name: 'extract_web_content',
            description: 'Extraer contenido de páginas web institucionales',
            parameters: {
                url: 'string - URL a extraer',
                summarize: 'boolean? - Resumir contenido',
            },
        },
        {
            name: 'compare_documents',
            description: 'Comparar dos documentos académicos',
            parameters: {
                document1_path: 'string - Ruta del primer documento',
                document2_path: 'string - Ruta del segundo documento',
            },
        },
    ],

    // Recursos disponibles
    resources: [
        {
            name: 'silabos',
            uri: 'epiis://documents/silabos',
            description: 'Colección de sílabos académicos',
        },
        {
            name: 'resoluciones',
            uri: 'epiis://documents/resoluciones',
            description: 'Resoluciones administrativas',
        },
        {
            name: 'reglamentos',
            uri: 'epiis://documents/reglamentos',
            description: 'Reglamentos institucionales',
        },
    ],

    // Prompts predefinidos
    prompts: [
        {
            name: 'analyze_academic',
            description: 'Prompt para análisis académico',
            template: 'Analiza el siguiente documento académico y proporciona un resumen ejecutivo:\n\n{content}',
        },
        {
            name: 'generate_syllabus',
            description: 'Prompt para generación de sílabos',
            template: 'Genera un sílabo completo para el curso {course_name} ({course_code})...',
        },
    ],
};

export default mcpConfig;
