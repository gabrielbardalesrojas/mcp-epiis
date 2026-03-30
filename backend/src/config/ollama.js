import dotenv from 'dotenv';
import path from 'path';

dotenv.config();

/**
 * Configuración de Ollama
 */
export const ollamaConfig = {
    // Host de Ollama
    host: process.env.OLLAMA_HOST || 'http://localhost:11434',

    // Modelo principal para generación
    model: process.env.OLLAMA_MODEL || 'llama3.2:3b',

    // Modelo para embeddings
    embedModel: process.env.EMBED_MODEL || 'nomic-embed-text',

    // Opciones de generación
    options: {
        temperature: parseFloat(process.env.LLM_TEMPERATURE) || 0.7,
        num_ctx: parseInt(process.env.LLM_NUM_CTX) || 8192,
        num_predict: parseInt(process.env.LLM_MAX_TOKENS) || 2048,
        top_k: 40,
        top_p: 0.9,
        repeat_penalty: 1.1,
    },

    // Timeouts
    timeouts: {
        generate: 300000, // 5 minutos
        chat: 300000,
        embeddings: 30000,
    },

    // Reintentos
    retries: {
        maxAttempts: 3,
        delay: 1000,
    },
};

/**
 * Modelos recomendados según recursos
 */
export const recommendedModels = {
    // Para PCs con RAM limitada (8-16GB)
    light: {
        model: 'llama3.2:1b',
        embedModel: 'nomic-embed-text',
        description: 'Modelo ligero para recursos limitados',
    },

    // Para PCs con RAM media (16-32GB)
    medium: {
        model: 'llama3.2:3b',
        embedModel: 'nomic-embed-text',
        description: 'Balance entre rendimiento y calidad',
    },

    // Para PCs con buena RAM (32GB+)
    heavy: {
        model: 'llama3.1:8b',
        embedModel: 'nomic-embed-text',
        description: 'Máxima calidad de generación',
    },
};

export default ollamaConfig;
