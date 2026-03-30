import { DocumentService } from '../../services/document/document-service.js';
import { Logger } from '../../utils/logger.js';

const documentService = new DocumentService();
const logger = new Logger('DocumentController');

/**
 * Subir documento
 */
export const uploadDocument = async (req, res) => {
    try {
        const { type = 'general' } = req.body;
        const file = req.file;

        if (!file) {
            return res.status(400).json({ error: 'No se proporcionó archivo' });
        }

        const result = await documentService.saveUploadedDocument(
            file.buffer,
            file.originalname,
            type
        );

        const processed = await documentService.processDocument(result.path);

        res.json({
            success: true,
            document: {
                id: result.id,
                path: result.path,
                name: file.originalname,
                type,
                chunks: processed.chunks.length,
            },
        });
    } catch (error) {
        logger.error('Error al subir documento', error);
        res.status(500).json({ error: error.message });
    }
};

/**
 * Listar documentos
 */
export const listDocuments = async (req, res) => {
    try {
        const { type } = req.query;

        let documents;
        if (type) {
            documents = await documentService.listByType(type);
        } else {
            documents = await documentService.scanAllDocuments();
        }

        res.json({
            documents,
            count: documents.length,
        });
    } catch (error) {
        logger.error('Error al listar documentos', error);
        res.status(500).json({ error: error.message });
    }
};

/**
 * Obtener contenido de documento
 */
export const getDocumentContent = async (req, res) => {
    try {
        const { path: docPath } = req.query;

        if (!docPath) {
            return res.status(400).json({ error: 'Ruta de documento requerida' });
        }

        const content = await documentService.extractContent(docPath);

        res.json({
            path: docPath,
            content,
        });
    } catch (error) {
        logger.error('Error al obtener contenido', error);
        res.status(500).json({ error: error.message });
    }
};

/**
 * Eliminar documento
 */
export const deleteDocument = async (req, res) => {
    try {
        const { path: docPath } = req.body;

        if (!docPath) {
            return res.status(400).json({ error: 'Ruta de documento requerida' });
        }

        const deleted = await documentService.deleteDocument(docPath);

        res.json({ success: deleted });
    } catch (error) {
        logger.error('Error al eliminar documento', error);
        res.status(500).json({ error: error.message });
    }
};

/**
 * Obtener estadísticas
 */
export const getStats = async (req, res) => {
    try {
        const stats = await documentService.getStorageStats();
        res.json(stats);
    } catch (error) {
        logger.error('Error al obtener estadísticas', error);
        res.status(500).json({ error: error.message });
    }
};

export default {
    uploadDocument,
    listDocuments,
    getDocumentContent,
    deleteDocument,
    getStats,
};
