/**
 * Tests de Herramientas MCP (MCP Tool Handlers)
 * EPIIS MCP Server - Universidad Nacional Agraria de la Selva
 *
 * Ejecutar: cd backend && npm test
 *
 * Estos tests validan los handlers de las 6 herramientas MCP:
 * search_documents, analyze_document, generate_syllabus,
 * generate_resolution, extract_web_content, compare_documents
 *
 * Todos los servicios externos están mockeados.
 */

// ─────────────────────────────────────────────
// Mock de dependencias externas
// ─────────────────────────────────────────────

// Mock completo del SDK MCP
jest.unstable_mockModule('@modelcontextprotocol/sdk/server/index.js', () => ({
    Server: jest.fn().mockImplementation(() => ({
        setRequestHandler: jest.fn(),
        connect: jest.fn(),
    })),
}));

jest.unstable_mockModule('@modelcontextprotocol/sdk/server/stdio.js', () => ({
    StdioServerTransport: jest.fn(),
}));

jest.unstable_mockModule('@modelcontextprotocol/sdk/types.js', () => ({
    ListToolsRequestSchema: 'ListToolsRequestSchema',
    CallToolRequestSchema: 'CallToolRequestSchema',
    ListResourcesRequestSchema: 'ListResourcesRequestSchema',
    ReadResourceRequestSchema: 'ReadResourceRequestSchema',
    ListPromptsRequestSchema: 'ListPromptsRequestSchema',
    GetPromptRequestSchema: 'GetPromptRequestSchema',
}));

jest.unstable_mockModule('zod', () => ({
    z: { object: jest.fn(), string: jest.fn(), number: jest.fn() },
}));

// Mock de servicios
const mockSearchSimilar = jest.fn();
const mockGetStats = jest.fn();
const mockGenerateEmbeddings = jest.fn();

jest.unstable_mockModule('../src/services/llm/ollama.service.js', () => ({
    OllamaService: jest.fn().mockImplementation(() => ({
        generate: jest.fn(),
        chat: jest.fn(),
        generateEmbeddings: mockGenerateEmbeddings,
        checkModel: jest.fn().mockResolvedValue(true),
    })),
}));

const mockExtractContent = jest.fn();
const mockGenerateSyllabus = jest.fn();
const mockGenerateResolution = jest.fn();
const mockListByType = jest.fn();

jest.unstable_mockModule('../src/services/document/document-service.js', () => ({
    DocumentService: jest.fn().mockImplementation(() => ({
        extractContent: mockExtractContent,
        generateSyllabus: mockGenerateSyllabus,
        generateResolution: mockGenerateResolution,
        listByType: mockListByType,
    })),
}));

jest.unstable_mockModule('../src/services/vector/vector-store.js', () => ({
    VectorStoreService: jest.fn().mockImplementation(() => ({
        searchSimilar: mockSearchSimilar,
        getStats: mockGetStats,
        initialize: jest.fn().mockResolvedValue(true),
    })),
}));

const mockScraperExtract = jest.fn();

jest.unstable_mockModule('../src/services/scraping/web-scraper.js', () => ({
    WebScraperService: jest.fn().mockImplementation(() => ({
        extractContent: mockScraperExtract,
    })),
}));

jest.unstable_mockModule('../src/utils/logger.js', () => ({
    Logger: jest.fn().mockImplementation(() => ({
        info: jest.fn(),
        warn: jest.fn(),
        error: jest.fn(),
        debug: jest.fn(),
    })),
}));

jest.unstable_mockModule('../src/mcp/prompts/academic.prompts.js', () => ({
    academicPrompts: {},
    PROMPT_NAMES: {},
    renderPrompt: jest.fn(),
}));

// ─────────────────────────────────────────────
// Importaciones dinámicas
// ─────────────────────────────────────────────

let EPIISMCPServer;

beforeAll(async () => {
    const mod = await import('../src/mcp/server.js');
    EPIISMCPServer = mod.default;
});

// ═════════════════════════════════════════════
// TESTS: Herramientas MCP
// ═════════════════════════════════════════════

describe('EPIIS MCP Server - Herramientas', () => {
    let server;

    beforeEach(() => {
        jest.clearAllMocks();
        server = new EPIISMCPServer();
    });

    // ─── Instanciación ───

    describe('Instanciación del Servidor', () => {
        test('debe crear una instancia del servidor MCP', () => {
            expect(server).toBeDefined();
            expect(server.server).toBeDefined();
        });

        test('debe inicializar todos los servicios', () => {
            expect(server.ollamaService).toBeDefined();
            expect(server.documentService).toBeDefined();
            expect(server.vectorStore).toBeDefined();
            expect(server.webScraper).toBeDefined();
        });

        test('debe configurar los handlers', () => {
            // setRequestHandler se llama para tools, resources, y prompts
            expect(server.server.setRequestHandler).toHaveBeenCalled();
        });
    });

    // ─── search_documents ───

    describe('search_documents (handleSearchDocuments)', () => {
        test('debe buscar documentos y retornar resultados formateados', async () => {
            mockSearchSimilar.mockResolvedValue([
                {
                    id: 'doc1',
                    title: 'Reglamento de Grados y Títulos',
                    type: 'reglamento',
                    path: 'storage/documents/reglamentos/grados.pdf',
                    score: 0.92,
                    content: 'Para obtener el grado de Bachiller en Ingeniería de Sistemas e Informática, el estudiante deberá haber aprobado todos los cursos del plan de estudios y completar 200 créditos mínimos requeridos por la universidad...',
                },
                {
                    id: 'doc2',
                    title: 'Resolución Directoral N° 045',
                    type: 'resolucion',
                    path: 'storage/documents/resoluciones/RD-045.pdf',
                    score: 0.78,
                    content: 'SE RESUELVE: Aprobar los nuevos procedimientos para la obtención del grado de Bachiller, vigentes a partir del semestre 2025-II según las normativas establecidas por la SUNEDU y el estatuto universitario...',
                },
            ]);

            const result = await server.handleSearchDocuments({
                query: 'requisitos bachiller',
                document_type: 'all',
                limit: 5,
            });

            expect(result).toHaveProperty('content');
            expect(result.content).toHaveLength(1);
            expect(result.content[0].type).toBe('text');

            const parsed = JSON.parse(result.content[0].text);
            expect(parsed.query).toBe('requisitos bachiller');
            expect(parsed.results).toHaveLength(2);
            expect(parsed.results[0].title).toBe('Reglamento de Grados y Títulos');
            expect(parsed.results[0].similarity).toBe(0.92);
        });

        test('debe pasar filtro de tipo al vectorStore', async () => {
            mockSearchSimilar.mockResolvedValue([]);

            await server.handleSearchDocuments({
                query: 'contenido IA',
                document_type: 'silabo',
                limit: 3,
            });

            expect(mockSearchSimilar).toHaveBeenCalledWith('contenido IA', {
                type: 'silabo',
                limit: 3,
            });
        });

        test('debe usar valores por defecto si no se proporcionan', async () => {
            mockSearchSimilar.mockResolvedValue([]);

            await server.handleSearchDocuments({ query: 'test' });

            expect(mockSearchSimilar).toHaveBeenCalledWith('test', {
                type: 'all',
                limit: 5,
            });
        });

        test('debe retornar array vacío si no hay resultados', async () => {
            mockSearchSimilar.mockResolvedValue([]);

            const result = await server.handleSearchDocuments({ query: 'xyz no existe' });
            const parsed = JSON.parse(result.content[0].text);

            expect(parsed.results).toHaveLength(0);
        });

        test('debe truncar snippets a 200 caracteres', async () => {
            const longContent = 'A'.repeat(500);
            mockSearchSimilar.mockResolvedValue([{
                id: 'doc1',
                title: 'Test',
                type: 'general',
                path: '/test.pdf',
                score: 0.9,
                content: longContent,
            }]);

            const result = await server.handleSearchDocuments({ query: 'test' });
            const parsed = JSON.parse(result.content[0].text);

            expect(parsed.results[0].snippet.length).toBeLessThanOrEqual(204); // 200 + '...'
        });
    });

    // ─── analyze_document ───

    describe('analyze_document (handleAnalyzeDocument)', () => {
        test('debe extraer contenido y analizarlo', async () => {
            mockExtractContent.mockResolvedValue('Contenido del documento académico...');
            server.ollamaService.generate = jest.fn().mockResolvedValue('Resumen del documento');

            const result = await server.handleAnalyzeDocument({
                document_path: 'storage/documents/reglamentos/tesis.pdf',
                analysis_type: 'summary',
            });

            expect(mockExtractContent).toHaveBeenCalledWith('storage/documents/reglamentos/tesis.pdf');
            expect(server.ollamaService.generate).toHaveBeenCalledWith(
                expect.stringContaining('Resume')
            );
            expect(result.content[0].text).toBe('Resumen del documento');
        });

        test('debe soportar todos los tipos de análisis', async () => {
            mockExtractContent.mockResolvedValue('contenido');
            server.ollamaService.generate = jest.fn().mockResolvedValue('resultado');

            const types = ['summary', 'key_points', 'compliance', 'full'];

            for (const type of types) {
                await server.handleAnalyzeDocument({
                    document_path: 'test.pdf',
                    analysis_type: type,
                });
            }

            expect(server.ollamaService.generate).toHaveBeenCalledTimes(4);
        });

        test('debe incluir contenido del documento en el prompt', async () => {
            const documentContent = 'Este reglamento establece los requisitos...';
            mockExtractContent.mockResolvedValue(documentContent);
            server.ollamaService.generate = jest.fn().mockResolvedValue('análisis');

            await server.handleAnalyzeDocument({
                document_path: 'test.pdf',
                analysis_type: 'full',
            });

            expect(server.ollamaService.generate).toHaveBeenCalledWith(
                expect.stringContaining(documentContent)
            );
        });
    });

    // ─── generate_syllabus ───

    describe('generate_syllabus (handleGenerateSyllabus)', () => {
        test('debe generar sílabo con LLM y guardarlo como .docx', async () => {
            server.ollamaService.generate = jest.fn().mockResolvedValue(
                'SÍLABO\n\nI. DATOS GENERALES\nCódigo: IS-401\nCurso: Inteligencia Artificial...'
            );
            mockGenerateSyllabus.mockResolvedValue('storage/generated/silabo-IS-401-2026-I.docx');

            const result = await server.handleGenerateSyllabus({
                course_code: 'IS-401',
                course_name: 'Inteligencia Artificial',
                professor: 'Dr. Carlos Mendoza',
                semester: '2026-I',
            });

            expect(server.ollamaService.generate).toHaveBeenCalledWith(
                expect.stringContaining('IS-401')
            );
            expect(server.ollamaService.generate).toHaveBeenCalledWith(
                expect.stringContaining('Inteligencia Artificial')
            );
            expect(mockGenerateSyllabus).toHaveBeenCalledWith(
                expect.objectContaining({
                    course_code: 'IS-401',
                    course_name: 'Inteligencia Artificial',
                })
            );

            expect(result.content[0].text).toContain('silabo-IS-401');
        });

        test('debe incluir lineamientos opcionales en el prompt', async () => {
            server.ollamaService.generate = jest.fn().mockResolvedValue('sílabo');
            mockGenerateSyllabus.mockResolvedValue('path.docx');

            await server.handleGenerateSyllabus({
                course_code: 'IS-E01',
                course_name: 'Blockchain',
                professor: 'Prof. Test',
                semester: '2026-I',
                content_guidelines: 'Enfoque práctico en agronegocios',
            });

            expect(server.ollamaService.generate).toHaveBeenCalledWith(
                expect.stringContaining('Enfoque práctico en agronegocios')
            );
        });

        test('debe funcionar sin lineamientos opcionales', async () => {
            server.ollamaService.generate = jest.fn().mockResolvedValue('sílabo');
            mockGenerateSyllabus.mockResolvedValue('path.docx');

            const result = await server.handleGenerateSyllabus({
                course_code: 'IS-101',
                course_name: 'Programación I',
                professor: 'Prof. X',
                semester: '2026-I',
            });

            expect(result.content[0].text).toContain('generado');
        });
    });

    // ─── generate_resolution ───

    describe('generate_resolution (handleGenerateResolution)', () => {
        test('debe generar resolución con formato oficial', async () => {
            server.ollamaService.generate = jest.fn().mockResolvedValue(
                'RESOLUCIÓN DIRECTORAL N° XXX-2026\n\nVISTO:\n...\nSE RESUELVE:\n...'
            );
            mockGenerateResolution.mockResolvedValue('storage/generated/RD-2026.docx');

            const result = await server.handleGenerateResolution({
                resolution_type: 'directoral',
                subject: 'Aprobación de horarios 2026-I',
                content: 'Vista la propuesta de horarios presentada por el coordinador...',
            });

            expect(server.ollamaService.generate).toHaveBeenCalledWith(
                expect.stringContaining('directoral')
            );
            expect(server.ollamaService.generate).toHaveBeenCalledWith(
                expect.stringContaining('Aprobación de horarios')
            );
            expect(result.content[0].text).toContain('RESOLUCIÓN');
        });

        test('debe soportar los tres tipos de resolución', async () => {
            const types = ['directoral', 'decanal', 'academica'];

            for (const type of types) {
                server.ollamaService.generate = jest.fn().mockResolvedValue('resolución');
                mockGenerateResolution.mockResolvedValue('path.docx');

                await server.handleGenerateResolution({
                    resolution_type: type,
                    subject: 'Test',
                    content: 'Contenido de prueba',
                });

                expect(server.ollamaService.generate).toHaveBeenCalledWith(
                    expect.stringContaining(type)
                );
            }
        });

        test('debe usar fecha actual si no se proporciona', async () => {
            server.ollamaService.generate = jest.fn().mockResolvedValue('resolución');
            mockGenerateResolution.mockResolvedValue('path.docx');

            await server.handleGenerateResolution({
                resolution_type: 'directoral',
                subject: 'Test',
                content: 'Contenido',
            });

            // No se pasa la fecha al prompt → el handler usa new Date().toLocaleDateString
            expect(server.ollamaService.generate).toHaveBeenCalled();
        });
    });

    // ─── extract_web_content ───

    describe('extract_web_content (handleExtractWebContent)', () => {
        test('debe extraer contenido de URL en modo text', async () => {
            mockScraperExtract.mockResolvedValue({
                title: 'Noticias UNAS',
                content: 'Contenido extraído de la web...',
            });

            const result = await server.handleExtractWebContent({
                url: 'https://www.unas.edu.pe/noticias',
                extract_type: 'text',
            });

            expect(mockScraperExtract).toHaveBeenCalledWith(
                'https://www.unas.edu.pe/noticias',
                'text'
            );
            expect(result.content[0].type).toBe('text');
        });

        test('debe extraer en modo structured', async () => {
            mockScraperExtract.mockResolvedValue({
                title: 'Convocatorias',
                items: [{ titulo: 'Convocatoria 1' }],
            });

            const result = await server.handleExtractWebContent({
                url: 'https://fis.unas.edu.pe/convocatorias',
                extract_type: 'structured',
            });

            const parsed = JSON.parse(result.content[0].text);
            expect(parsed).toHaveProperty('items');
        });

        test('debe generar resumen con LLM en modo summary', async () => {
            mockScraperExtract.mockResolvedValue('Contenido largo de la página web...');
            server.ollamaService.generate = jest.fn().mockResolvedValue('Resumen del contenido web...');

            const result = await server.handleExtractWebContent({
                url: 'https://www.unas.edu.pe/transparencia',
                extract_type: 'summary',
            });

            expect(server.ollamaService.generate).toHaveBeenCalledWith(
                expect.stringContaining('Resume')
            );
            expect(result.content[0].text).toBe('Resumen del contenido web...');
        });

        test('debe usar text como tipo por defecto', async () => {
            mockScraperExtract.mockResolvedValue('contenido');

            await server.handleExtractWebContent({
                url: 'https://example.com',
            });

            expect(mockScraperExtract).toHaveBeenCalledWith('https://example.com', 'text');
        });
    });

    // ─── compare_documents ───

    describe('compare_documents (handleCompareDocuments)', () => {
        test('debe comparar dos documentos', async () => {
            mockExtractContent
                .mockResolvedValueOnce('Contenido del documento 1: Plan de estudios 2020...')
                .mockResolvedValueOnce('Contenido del documento 2: Plan de estudios 2025...');

            server.ollamaService.generate = jest.fn().mockResolvedValue(
                'DIFERENCIAS:\n1. El plan 2025 incluye nuevos cursos de IA...'
            );

            const result = await server.handleCompareDocuments({
                document1_path: 'storage/documents/planes-estudio/plan-2020.pdf',
                document2_path: 'storage/documents/planes-estudio/plan-2025.pdf',
                comparison_type: 'differences',
            });

            expect(mockExtractContent).toHaveBeenCalledTimes(2);
            expect(server.ollamaService.generate).toHaveBeenCalledWith(
                expect.stringContaining('DOCUMENTO 1')
            );
            expect(server.ollamaService.generate).toHaveBeenCalledWith(
                expect.stringContaining('DOCUMENTO 2')
            );
            expect(result.content[0].text).toContain('DIFERENCIAS');
        });

        test('debe usar "both" como tipo de comparación por defecto', async () => {
            mockExtractContent
                .mockResolvedValueOnce('Doc A')
                .mockResolvedValueOnce('Doc B');
            server.ollamaService.generate = jest.fn().mockResolvedValue('comparación');

            await server.handleCompareDocuments({
                document1_path: 'a.pdf',
                document2_path: 'b.pdf',
            });

            expect(server.ollamaService.generate).toHaveBeenCalledWith(
                expect.stringContaining('both')
            );
        });

        test('debe soportar los tres tipos de comparación', async () => {
            const types = ['differences', 'similarities', 'both'];

            for (const type of types) {
                mockExtractContent
                    .mockResolvedValueOnce('Doc A')
                    .mockResolvedValueOnce('Doc B');
                server.ollamaService.generate = jest.fn().mockResolvedValue('resultado');

                await server.handleCompareDocuments({
                    document1_path: 'a.pdf',
                    document2_path: 'b.pdf',
                    comparison_type: type,
                });

                expect(server.ollamaService.generate).toHaveBeenCalledWith(
                    expect.stringContaining(type)
                );
            }
        });
    });

    // ─── Manejo de errores ───

    describe('Manejo de Errores', () => {
        test('handleSearchDocuments debe manejar errores del vectorStore', async () => {
            mockSearchSimilar.mockRejectedValue(new Error('ChromaDB no disponible'));

            await expect(server.handleSearchDocuments({ query: 'test' }))
                .rejects.toThrow('ChromaDB no disponible');
        });

        test('handleAnalyzeDocument debe manejar archivo no encontrado', async () => {
            mockExtractContent.mockRejectedValue(new Error('Archivo no encontrado'));

            await expect(server.handleAnalyzeDocument({
                document_path: 'inexistente.pdf',
                analysis_type: 'summary',
            })).rejects.toThrow('Archivo no encontrado');
        });

        test('handleExtractWebContent debe manejar URLs inválidas', async () => {
            mockScraperExtract.mockRejectedValue(new Error('URL inválida'));

            await expect(server.handleExtractWebContent({
                url: 'no-es-una-url',
                extract_type: 'text',
            })).rejects.toThrow('URL inválida');
        });
    });
});
