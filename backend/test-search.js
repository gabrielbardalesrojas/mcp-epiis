import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { OllamaService } from './src/services/llm/ollama.service.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(__dirname, '../.env') });

async function test() {
    const service = new OllamaService();
    console.log('--- Probando Búsqueda Web Real ---');
    try {
        const query = 'últimas noticias de la Universidad Nacional Agraria de la Selva';
        const results = await service.webSearch(query, 3);
        console.log('Resultados obtenidos:', JSON.stringify(results, null, 2));
    } catch (error) {
        console.error('Error en la prueba:', error.message);
    }
}

test();
