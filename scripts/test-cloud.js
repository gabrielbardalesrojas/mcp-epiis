import dotenv from 'dotenv';
import { OllamaService } from '../backend/src/services/llm/ollama.service.js';

dotenv.config();

async function testCloud() {
    console.log('--- Probando Conexión Cloud ---');
    console.log('Modo:', process.env.IA_MODE);

    const ollama = new OllamaService();

    try {
        const messages = [{ role: 'user', content: 'Hola, ¿quién eres?' }];
        console.log('Enviando mensaje...');
        const response = await ollama.chat(messages);
        console.log('Respuesta recibida:', response);
        console.log('TEST EXITOSO');
    } catch (error) {
        console.error('ERROR EN TEST:', error.message);
        if (error.cause) console.error('Causa:', error.cause.message);
    }
}

testCloud();
