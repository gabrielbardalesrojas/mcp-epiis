import { OllamaService } from '../src/services/llm/ollama.service.js';
import axios from 'axios';

jest.mock('axios');
jest.mock('../../src/utils/logger.js');

describe('OllamaService - Web Tools', () => {
    let ollamaService;

    beforeEach(() => {
        process.env.OLLAMA_API_KEY = 'test-api-key';
        ollamaService = new OllamaService();
        jest.clearAllMocks();
    });

    test('webSearch should call the correct endpoint with query and maxResults', async () => {
        const mockData = { results: [{ title: 'Test', url: 'http://test.com' }] };
        axios.post.mockResolvedValue({ data: mockData });

        const result = await ollamaService.webSearch('test query', 3);

        expect(axios.post).toHaveBeenCalledWith(
            'https://ollama.com/api/web_search',
            { query: 'test query', max_results: 3 },
            expect.objectContaining({
                headers: expect.objectContaining({
                    'Authorization': 'Bearer test-api-key'
                })
            })
        );
        expect(result).toEqual(mockData);
    });

    test('webFetch should call the correct endpoint with url', async () => {
        const mockData = { title: 'Test Page', content: 'Fetched content' };
        axios.post.mockResolvedValue({ data: mockData });

        const result = await ollamaService.webFetch('http://example.com');

        expect(axios.post).toHaveBeenCalledWith(
            'https://ollama.com/api/web_fetch',
            { url: 'http://example.com' },
            expect.objectContaining({
                headers: expect.objectContaining({
                    'Authorization': 'Bearer test-api-key'
                })
            })
        );
        expect(result).toEqual(mockData);
    });

    test('webSearch should throw error if API key is missing', async () => {
        ollamaService.cloudApiKey = null;
        await expect(ollamaService.webSearch('test')).rejects.toThrow('Se requiere OLLAMA_API_KEY');
    });
});
