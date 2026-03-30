import { OllamaService } from '../../services/llm/ollama.service.js';
import { Logger } from '../../utils/logger.js';

const ollamaService = new OllamaService();
const logger = new Logger('LLMController');

/**
 * Chat con el modelo
 */
export const chat = async (req, res) => {
    try {
        const { message, context = [], stream = false } = req.body;

        if (!message) {
            return res.status(400).json({ error: 'Mensaje requerido' });
        }

        const messages = [
            {
                role: 'system',
                content: 'Eres un asistente académico para la EPIIS-UNAS (Escuela Profesional de Ingeniería en Informática y Sistemas, Universidad Nacional Agraria de la Selva). Responde en español de manera profesional y concisa.',
            },
            ...context,
            { role: 'user', content: message },
        ];

        if (stream) {
            res.setHeader('Content-Type', 'text/event-stream');
            res.setHeader('Cache-Control', 'no-cache');
            res.setHeader('Connection', 'keep-alive');

            for await (const chunk of ollamaService.generateStream(message)) {
                res.write(`data: ${JSON.stringify({ content: chunk })}\n\n`);
            }

            res.write('data: [DONE]\n\n');
            res.end();
        } else {
            const response = await ollamaService.chat(messages);
            res.json({ response });
        }
    } catch (error) {
        logger.error('Error en chat', error);
        res.status(500).json({ error: error.message });
    }
};

/**
 * Generar texto
 */
export const generate = async (req, res) => {
    try {
        const { prompt, options = {} } = req.body;

        if (!prompt) {
            return res.status(400).json({ error: 'Prompt requerido' });
        }

        const response = await ollamaService.generate(prompt, options);
        res.json({ response });
    } catch (error) {
        logger.error('Error al generar', error);
        res.status(500).json({ error: error.message });
    }
};

/**
 * Generar embeddings
 */
export const generateEmbeddings = async (req, res) => {
    try {
        const { text } = req.body;

        if (!text) {
            return res.status(400).json({ error: 'Texto requerido' });
        }

        const embeddings = await ollamaService.generateEmbeddings(text);
        res.json({ embeddings });
    } catch (error) {
        logger.error('Error al generar embeddings', error);
        res.status(500).json({ error: error.message });
    }
};

/**
 * Listar modelos disponibles
 */
export const listModels = async (req, res) => {
    try {
        const models = await ollamaService.listModels();
        res.json({ models });
    } catch (error) {
        logger.error('Error al listar modelos', error);
        res.status(500).json({ error: error.message });
    }
};

/**
 * Verificar estado del modelo
 */
export const checkModel = async (req, res) => {
    try {
        const isReady = await ollamaService.checkModel();
        res.json({
            ready: isReady,
            model: ollamaService.model,
        });
    } catch (error) {
        logger.error('Error al verificar modelo', error);
        res.status(500).json({ error: error.message });
    }
};

export default {
    chat,
    generate,
    generateEmbeddings,
    listModels,
    checkModel,
};
