/**
 * Tests del servicio LLM (OllamaService + EmbeddingService)
 * EPIIS MCP Server - Universidad Nacional Agraria de la Selva
 *
 * Ejecutar: cd backend && npm test
 *
 * Estos tests usan mocks para NO depender de una instancia real de Ollama.
 * Validan la lógica interna: circuit breaker, manejo de errores,
 * similitud coseno, modos local/nube, etc.
 */

// ─────────────────────────────────────────────
// Mock de dependencias externas
// ─────────────────────────────────────────────

// Mock de Ollama SDK
const mockGenerate = jest.fn();
const mockChat = jest.fn();
const mockEmbeddings = jest.fn();
const mockList = jest.fn();
const mockPull = jest.fn();

jest.unstable_mockModule('ollama', () => ({
    Ollama: jest.fn().mockImplementation(() => ({
        generate: mockGenerate,
        chat: mockChat,
        embeddings: mockEmbeddings,
        list: mockList,
        pull: mockPull,
    })),
}));

// Mock de Logger
jest.unstable_mockModule('../../src/utils/logger.js', () => ({
    Logger: jest.fn().mockImplementation(() => ({
        info: jest.fn(),
        warn: jest.fn(),
        error: jest.fn(),
        debug: jest.fn(),
    })),
}));

// Mock de prompts académicos
jest.unstable_mockModule('../../src/mcp/prompts/academic.prompts.js', () => ({
    academicPrompts: {},
    PROMPT_NAMES: {},
    renderPrompt: jest.fn(),
}));

// ─────────────────────────────────────────────
// Importaciones dinámicas (después de mocks)
// ─────────────────────────────────────────────

let OllamaService;
let EmbeddingService;

beforeAll(async () => {
    const ollamaModule = await import('../../src/services/llm/ollama.service.js');
    OllamaService = ollamaModule.OllamaService;

    const embeddingModule = await import('../../src/services/llm/embedding.service.js');
    EmbeddingService = embeddingModule.EmbeddingService;
});

// ═════════════════════════════════════════════
// TESTS: OllamaService
// ═════════════════════════════════════════════

describe('OllamaService', () => {
    let service;

    beforeEach(() => {
        // Limpiar mocks antes de cada test
        jest.clearAllMocks();

        service = new OllamaService({
            host: 'http://localhost:11434',
            model: 'llama3.2:3b',
            mode: 'local',
        });
    });

    // ─── Constructor y Configuración ───

    describe('Constructor y Configuración', () => {
        test('debe inicializar con valores por defecto', () => {
            const s = new OllamaService();
            expect(s.host).toBe('http://localhost:11434');
            expect(s.model).toBe('llama3.2:3b');
            expect(s.embedModel).toBe('nomic-embed-text');
            expect(s.failureCount).toBe(0);
            expect(s.lastFailureTime).toBe(0);
        });

        test('debe aceptar configuración personalizada', () => {
            const s = new OllamaService({
                host: 'http://custom:5000',
                model: 'mistral:7b',
                embedModel: 'custom-embed',
            });
            expect(s.host).toBe('http://custom:5000');
            expect(s.model).toBe('mistral:7b');
            expect(s.embedModel).toBe('custom-embed');
        });

        test('debe inicializar en modo local por defecto', () => {
            const s = new OllamaService({ mode: 'local' });
            expect(s.mode).toBe('local');
        });

        test('debe inicializar en modo cloud si se configura', () => {
            const s = new OllamaService({
                mode: 'cloud',
                cloudHost: 'https://api.cloud.com',
                cloudModel: 'llama3.1:8b',
                cloudApiKey: 'test-key-123',
            });
            expect(s.mode).toBe('cloud');
            expect(s.cloudHost).toBe('https://api.cloud.com');
            expect(s.cloudModel).toBe('llama3.1:8b');
        });
    });

    // ─── getActiveModel ───

    describe('getActiveModel', () => {
        test('debe retornar modelo local en modo local', () => {
            service.mode = 'local';
            service.activeModel = 'llama3.2:3b';
            expect(service.getActiveModel()).toBe('llama3.2:3b');
        });

        test('debe retornar modelo cloud en modo cloud', () => {
            const s = new OllamaService({
                mode: 'cloud',
                cloudModel: 'llama3.1:8b',
                cloudApiKey: 'key',
            });
            expect(s.getActiveModel()).toBe('llama3.1:8b');
        });
    });

    // ─── getStatus ───

    describe('getStatus', () => {
        test('debe retornar estado del servicio', () => {
            const status = service.getStatus();
            expect(status).toHaveProperty('mode');
            expect(status).toHaveProperty('model');
            expect(status).toHaveProperty('host');
        });
    });

    // ─── Circuit Breaker ───

    describe('Circuit Breaker', () => {
        test('debe permitir llamadas cuando no hay fallos', () => {
            service.lastFailureTime = 0;
            expect(service._checkCircuitBreaker()).toBe(true);
        });

        test('debe bloquear llamadas inmediatamente después de un fallo', () => {
            service.lastFailureTime = Date.now(); // fallo justo ahora
            service.circuitBreakerTime = 5000;
            expect(service._checkCircuitBreaker()).toBe(false);
        });

        test('debe permitir llamadas después del tiempo de espera', () => {
            service.lastFailureTime = Date.now() - 10000; // fallo hace 10s
            service.circuitBreakerTime = 5000; // espera de 5s
            expect(service._checkCircuitBreaker()).toBe(true);
        });
    });

    // ─── generate ───

    describe('generate', () => {
        test('debe generar texto exitosamente', async () => {
            mockGenerate.mockResolvedValue({ response: 'Respuesta generada por Llama' });

            const result = await service.generate('¿Qué es inteligencia artificial?');

            expect(result).toBe('Respuesta generada por Llama');
            expect(mockGenerate).toHaveBeenCalledWith(
                expect.objectContaining({
                    prompt: '¿Qué es inteligencia artificial?',
                    stream: false,
                })
            );
        });

        test('debe resetear el circuit breaker tras éxito', async () => {
            service.failureCount = 3;
            service.lastFailureTime = Date.now() - 10000;

            mockGenerate.mockResolvedValue({ response: 'OK' });
            await service.generate('test');

            expect(service.failureCount).toBe(0);
            expect(service.lastFailureTime).toBe(0);
        });

        test('debe incrementar contador de fallos al fallar', async () => {
            mockGenerate.mockRejectedValue(new Error('Connection refused'));

            await expect(service.generate('test')).rejects.toThrow('Error en Ollama');
            expect(service.failureCount).toBe(1);
            expect(service.lastFailureTime).toBeGreaterThan(0);
        });

        test('debe rechazar si el circuit breaker está abierto', async () => {
            service.lastFailureTime = Date.now();
            service.circuitBreakerTime = 5000;

            await expect(service.generate('test')).rejects.toThrow('Ollama no responde');
            expect(mockGenerate).not.toHaveBeenCalled();
        });

        test('debe pasar opciones personalizadas', async () => {
            mockGenerate.mockResolvedValue({ response: 'custom' });

            await service.generate('test', { temperature: 0.1, num_predict: 500 });

            expect(mockGenerate).toHaveBeenCalledWith(
                expect.objectContaining({
                    temperature: 0.1,
                    num_predict: 500,
                })
            );
        });
    });

    // ─── chat ───

    describe('chat', () => {
        test('debe realizar chat conversacional', async () => {
            mockChat.mockResolvedValue({
                message: { content: 'Respuesta del chat' },
            });

            const messages = [
                { role: 'user', content: 'Hola' },
            ];

            const result = await service.chat(messages);
            expect(result).toBe('Respuesta del chat');
            expect(mockChat).toHaveBeenCalledWith(
                expect.objectContaining({
                    messages,
                    stream: false,
                })
            );
        });

        test('debe manejar conversaciones con múltiples mensajes', async () => {
            mockChat.mockResolvedValue({
                message: { content: 'Respuesta contextual' },
            });

            const messages = [
                { role: 'system', content: 'Eres un asistente académico' },
                { role: 'user', content: 'Explica redes neuronales' },
                { role: 'assistant', content: 'Las redes neuronales son...' },
                { role: 'user', content: 'Dame un ejemplo práctico' },
            ];

            const result = await service.chat(messages);
            expect(result).toBe('Respuesta contextual');
        });

        test('debe rechazar si circuit breaker está abierto', async () => {
            service.lastFailureTime = Date.now();
            service.circuitBreakerTime = 5000;

            await expect(service.chat([{ role: 'user', content: 'test' }]))
                .rejects.toThrow('circuito abierto');
        });

        test('debe manejar errores e incrementar fallos', async () => {
            mockChat.mockRejectedValue(new Error('timeout'));

            await expect(service.chat([{ role: 'user', content: 'test' }]))
                .rejects.toThrow();
            expect(service.failureCount).toBe(1);
        });
    });

    // ─── generateEmbeddings ───

    describe('generateEmbeddings', () => {
        test('debe generar embeddings para texto', async () => {
            const mockEmbedding = [0.1, 0.2, 0.3, -0.5, 0.8];
            mockEmbeddings.mockResolvedValue({ embedding: mockEmbedding });

            const result = await service.generateEmbeddings('Inteligencia Artificial');

            expect(result).toEqual(mockEmbedding);
            expect(result).toHaveLength(5);
            expect(mockEmbeddings).toHaveBeenCalledWith(
                expect.objectContaining({
                    model: 'nomic-embed-text',
                    prompt: 'Inteligencia Artificial',
                })
            );
        });

        test('debe propagar errores de embeddings', async () => {
            mockEmbeddings.mockRejectedValue(new Error('Modelo no disponible'));

            await expect(service.generateEmbeddings('test')).rejects.toThrow('Modelo no disponible');
        });
    });

    // ─── checkModel ───

    describe('checkModel', () => {
        test('debe retornar true si ambos modelos existen', async () => {
            mockList.mockResolvedValue({
                models: [
                    { name: 'llama3.2:3b' },
                    { name: 'nomic-embed-text:latest' },
                ],
            });

            const result = await service.checkModel();
            expect(result).toBe(true);
        });

        test('debe intentar descargar modelo principal faltante', async () => {
            mockList.mockResolvedValue({
                models: [{ name: 'nomic-embed-text:latest' }],
            });
            mockPull.mockResolvedValue({});

            await service.checkModel();
            expect(mockPull).toHaveBeenCalledWith({ model: 'llama3.2:3b' });
        });

        test('debe retornar false si Ollama no está disponible', async () => {
            mockList.mockRejectedValue(new Error('Connection refused'));

            const result = await service.checkModel();
            expect(result).toBe(false);
        });
    });

    // ─── analyzeAcademicDocument ───

    describe('analyzeAcademicDocument', () => {
        test('debe generar análisis tipo summary', async () => {
            mockGenerate.mockResolvedValue({ response: 'Resumen del documento...' });

            const result = await service.analyzeAcademicDocument('Contenido del documento', 'summary');

            expect(result).toBe('Resumen del documento...');
            expect(mockGenerate).toHaveBeenCalledWith(
                expect.objectContaining({
                    prompt: expect.stringContaining('Resume'),
                })
            );
        });

        test('debe generar análisis tipo key_points', async () => {
            mockGenerate.mockResolvedValue({ response: '1. Punto clave...' });

            const result = await service.analyzeAcademicDocument('Contenido', 'key_points');

            expect(result).toBe('1. Punto clave...');
            expect(mockGenerate).toHaveBeenCalledWith(
                expect.objectContaining({
                    prompt: expect.stringContaining('puntos clave'),
                })
            );
        });

        test('debe usar análisis full por defecto', async () => {
            mockGenerate.mockResolvedValue({ response: 'Análisis completo...' });

            await service.analyzeAcademicDocument('Contenido');

            expect(mockGenerate).toHaveBeenCalledWith(
                expect.objectContaining({
                    prompt: expect.stringContaining('análisis académico completo'),
                })
            );
        });
    });

    // ─── switchMode ───

    describe('switchMode', () => {
        test('debe cambiar de local a cloud', () => {
            service.switchMode('cloud', {
                host: 'https://api.cloud.com',
                model: 'llama3.1:70b',
                apiKey: 'test-key',
            });

            expect(service.mode).toBe('cloud');
        });

        test('debe cambiar de cloud a local', () => {
            service.mode = 'cloud';
            service.switchMode('local');
            expect(service.mode).toBe('local');
        });
    });
});

// ═════════════════════════════════════════════
// TESTS: EmbeddingService
// ═════════════════════════════════════════════

describe('EmbeddingService', () => {
    let embeddingService;

    beforeEach(() => {
        jest.clearAllMocks();
        embeddingService = new EmbeddingService();
    });

    // ─── Constructor ───

    describe('Constructor', () => {
        test('debe inicializar con valores por defecto', () => {
            expect(embeddingService.model).toBe('nomic-embed-text');
            expect(embeddingService.batchSize).toBe(10);
        });

        test('debe aceptar configuración personalizada', () => {
            const custom = new EmbeddingService({
                model: 'custom-model',
                batchSize: 5,
            });
            expect(custom.model).toBe('custom-model');
            expect(custom.batchSize).toBe(5);
        });
    });

    // ─── cosineSimilarity ───

    describe('cosineSimilarity', () => {
        test('debe retornar 1 para vectores idénticos', () => {
            const vec = [1, 2, 3, 4, 5];
            const similarity = embeddingService.cosineSimilarity(vec, vec);
            expect(similarity).toBeCloseTo(1.0, 5);
        });

        test('debe retornar 0 para vectores ortogonales', () => {
            const vec1 = [1, 0, 0];
            const vec2 = [0, 1, 0];
            const similarity = embeddingService.cosineSimilarity(vec1, vec2);
            expect(similarity).toBeCloseTo(0.0, 5);
        });

        test('debe retornar -1 para vectores opuestos', () => {
            const vec1 = [1, 0, 0];
            const vec2 = [-1, 0, 0];
            const similarity = embeddingService.cosineSimilarity(vec1, vec2);
            expect(similarity).toBeCloseTo(-1.0, 5);
        });

        test('debe calcular similitud parcial correctamente', () => {
            const vec1 = [1, 1, 0];
            const vec2 = [1, 0, 0];
            const similarity = embeddingService.cosineSimilarity(vec1, vec2);
            // cos(45°) ≈ 0.7071
            expect(similarity).toBeCloseTo(0.7071, 3);
        });

        test('debe lanzar error para vectores de diferente dimensión', () => {
            expect(() => {
                embeddingService.cosineSimilarity([1, 2], [1, 2, 3]);
            }).toThrow('misma dimensión');
        });
    });

    // ─── findMostSimilar ───

    describe('findMostSimilar', () => {
        test('debe encontrar los documentos más similares', () => {
            const queryEmbedding = [1, 0, 0];
            const documents = [
                { id: 'doc1', embedding: [1, 0, 0] },       // similitud = 1.0
                { id: 'doc2', embedding: [0, 1, 0] },       // similitud = 0.0
                { id: 'doc3', embedding: [0.9, 0.1, 0] },   // similitud ≈ 0.994
                { id: 'doc4', embedding: [-1, 0, 0] },      // similitud = -1.0
            ];

            const results = embeddingService.findMostSimilar(queryEmbedding, documents, 2);

            expect(results).toHaveLength(2);
            expect(results[0].id).toBe('doc1');
            expect(results[0].score).toBeCloseTo(1.0, 3);
            expect(results[1].id).toBe('doc3');
        });

        test('debe respetar el parámetro topK', () => {
            const queryEmbedding = [1, 0, 0];
            const documents = [
                { id: 'doc1', embedding: [1, 0, 0] },
                { id: 'doc2', embedding: [0.8, 0.2, 0] },
                { id: 'doc3', embedding: [0.5, 0.5, 0] },
            ];

            const results = embeddingService.findMostSimilar(queryEmbedding, documents, 1);
            expect(results).toHaveLength(1);
            expect(results[0].id).toBe('doc1');
        });

        test('debe retornar array vacío si no hay documentos', () => {
            const results = embeddingService.findMostSimilar([1, 0], [], 5);
            expect(results).toEqual([]);
        });

        test('debe ordenar resultados por score descendente', () => {
            const queryEmbedding = [1, 1, 0];
            const documents = [
                { id: 'low', embedding: [0, 0, 1] },
                { id: 'high', embedding: [1, 1, 0] },
                { id: 'mid', embedding: [1, 0, 0] },
            ];

            const results = embeddingService.findMostSimilar(queryEmbedding, documents, 3);

            expect(results[0].id).toBe('high');
            expect(results[0].score).toBeGreaterThan(results[1].score);
            expect(results[1].score).toBeGreaterThan(results[2].score);
        });
    });

    // ─── generate (con mock de Ollama) ───

    describe('generate', () => {
        test('debe generar embedding invocando OllamaService', async () => {
            const mockEmbedding = [0.1, 0.2, 0.3];
            mockEmbeddings.mockResolvedValue({ embedding: mockEmbedding });

            const result = await embeddingService.generate('texto de prueba');
            expect(result).toEqual(mockEmbedding);
        });

        test('debe propagar errores', async () => {
            mockEmbeddings.mockRejectedValue(new Error('Ollama offline'));

            await expect(embeddingService.generate('test')).rejects.toThrow();
        });
    });

    // ─── generateBatch ───

    describe('generateBatch', () => {
        test('debe generar embeddings para múltiples textos', async () => {
            mockEmbeddings
                .mockResolvedValueOnce({ embedding: [0.1, 0.2] })
                .mockResolvedValueOnce({ embedding: [0.3, 0.4] })
                .mockResolvedValueOnce({ embedding: [0.5, 0.6] });

            const results = await embeddingService.generateBatch(['text1', 'text2', 'text3']);

            expect(results).toHaveLength(3);
            expect(results[0]).toEqual([0.1, 0.2]);
            expect(results[2]).toEqual([0.5, 0.6]);
        });

        test('debe procesar en batches según batchSize', async () => {
            embeddingService.batchSize = 2;

            // 3 textos con batchSize=2 → 2 batches
            mockEmbeddings
                .mockResolvedValueOnce({ embedding: [0.1] })
                .mockResolvedValueOnce({ embedding: [0.2] })
                .mockResolvedValueOnce({ embedding: [0.3] });

            const results = await embeddingService.generateBatch(['a', 'b', 'c']);
            expect(results).toHaveLength(3);
        });
    });
});
