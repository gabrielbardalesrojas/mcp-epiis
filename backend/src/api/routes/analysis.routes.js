import express from 'express';
import { Logger } from '../../utils/logger.js';

const router = express.Router();
const logger = new Logger('AnalysisRoutes');

/**
 * POST /api/analysis/document
 * Analizar un documento
 */
router.post('/document', async (req, res) => {
    try {
        const { documentPath, analysisType = 'full' } = req.body;
        const { ollama, documents } = req.services;

        if (!documentPath) {
            return res.status(400).json({ error: 'documentPath requerido' });
        }

        // Extraer contenido
        const content = await documents.extractContent(documentPath);

        // Construir prompt según tipo de análisis
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

        const prompt = prompts[analysisType] || prompts.full;
        const analysis = await ollama.generate(prompt);

        res.json({
            documentPath,
            analysisType,
            analysis,
        });
    } catch (error) {
        logger.error('Error al analizar documento', error);
        res.status(500).json({ error: error.message });
    }
});

/**
 * POST /api/analysis/compare
 * Comparar dos documentos
 */
router.post('/compare', async (req, res) => {
    try {
        const { document1Path, document2Path, comparisonType = 'both' } = req.body;
        const { ollama, documents } = req.services;

        if (!document1Path || !document2Path) {
            return res.status(400).json({ error: 'Se requieren ambos documentos' });
        }

        const content1 = await documents.extractContent(document1Path);
        const content2 = await documents.extractContent(document2Path);

        const comparison = await ollama.compareDocuments(content1, content2, comparisonType);

        res.json({
            document1: document1Path,
            document2: document2Path,
            comparisonType,
            comparison,
        });
    } catch (error) {
        logger.error('Error al comparar documentos', error);
        res.status(500).json({ error: error.message });
    }
});

/**
 * POST /api/analysis/question
 * Responder pregunta sobre un documento
 */
router.post('/question', async (req, res) => {
    try {
        const { documentPath, question } = req.body;
        const { ollama, documents } = req.services;

        if (!documentPath || !question) {
            return res.status(400).json({ error: 'documentPath y question requeridos' });
        }

        const content = await documents.extractContent(documentPath);
        const answer = await ollama.answerQuestion(content, question);

        res.json({
            documentPath,
            question,
            answer,
        });
    } catch (error) {
        logger.error('Error al responder pregunta', error);
        res.status(500).json({ error: error.message });
    }
});

/**
 * POST /api/analysis/extract
 * Extraer información estructurada
 */
router.post('/extract', async (req, res) => {
    try {
        const { documentPath, schema } = req.body;
        const { ollama, documents } = req.services;

        if (!documentPath || !schema) {
            return res.status(400).json({ error: 'documentPath y schema requeridos' });
        }

        const content = await documents.extractContent(documentPath);
        const extracted = await ollama.extractStructuredData(content, schema);

        res.json({
            documentPath,
            data: extracted,
        });
    } catch (error) {
        logger.error('Error al extraer datos', error);
        res.status(500).json({ error: error.message });
    }
});

/**
 * POST /api/analysis/text
 * Analizar texto directo (sin documento)
 */
router.post('/text', async (req, res) => {
    try {
        const { text, analysisType = 'summary' } = req.body;
        const { ollama } = req.services;

        if (!text) {
            return res.status(400).json({ error: 'Texto requerido' });
        }

        const analysis = await ollama.analyzeAcademicDocument(text, analysisType);

        res.json({
            analysisType,
            analysis,
        });
    } catch (error) {
        logger.error('Error al analizar texto', error);
        res.status(500).json({ error: error.message });
    }
});

export default router;
