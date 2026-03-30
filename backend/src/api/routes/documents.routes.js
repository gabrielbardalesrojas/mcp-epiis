import express from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs/promises';
import { getDatabase } from '../../config/database.js';
import { Logger } from '../../utils/logger.js';

const router = express.Router();
const logger = new Logger('DocumentsRoutes');

// Configurar multer para subida de archivos (van a pending/)
const storage = multer.diskStorage({
    destination: async (req, file, cb) => {
        const uploadDir = path.join(process.cwd(), 'storage', 'pending');
        await fs.mkdir(uploadDir, { recursive: true });
        cb(null, uploadDir);
    },
    filename: (req, file, cb) => {
        const uniqueName = `${Date.now()}_${file.originalname}`;
        cb(null, uniqueName);
    },
});

const upload = multer({
    storage,
    limits: { fileSize: 50 * 1024 * 1024 }, // 50MB max
    fileFilter: (req, file, cb) => {
        const allowedTypes = ['.pdf', '.docx', '.doc', '.xlsx', '.xls', '.pptx', '.ppt', '.txt', '.md'];
        const ext = path.extname(file.originalname).toLowerCase();

        if (allowedTypes.includes(ext)) {
            cb(null, true);
        } else {
            cb(new Error(`Tipo de archivo no permitido: ${ext}`));
        }
    },
});

/**
 * POST /api/documents/upload
 * Subir un documento (queda PENDIENTE de aprobación por el admin)
 */
router.post('/upload', upload.single('file'), async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ error: 'No se proporcionó archivo' });
        }

        const { type = 'general' } = req.body;
        const db = getDatabase();

        // Registrar en BD como pendiente
        const result = db.prepare(
            'INSERT INTO pending_documents (original_name, stored_name, type, size) VALUES (?, ?, ?, ?)'
        ).run(req.file.originalname, req.file.filename, type, req.file.size);

        logger.info(`Documento pendiente registrado: ${req.file.originalname} (ID: ${result.lastInsertRowid})`);

        res.json({
            success: true,
            pending: true,
            document: {
                id: result.lastInsertRowid,
                name: req.file.originalname,
                type,
                status: 'pending',
                message: 'Documento subido correctamente. Está pendiente de aprobación por el administrador.',
            },
        });
    } catch (error) {
        logger.error('Error al subir documento', error);
        // Limpiar archivo si falla
        if (req.file) await fs.unlink(req.file.path).catch(() => { });
        res.status(500).json({ error: error.message });
    }
});

/**
 * GET /api/documents
 * Listar todos los documentos
 */
router.get('/', async (req, res) => {
    try {
        const { type } = req.query;
        const { documents } = req.services;

        let docs;
        if (type) {
            docs = await documents.listByType(type);
        } else {
            docs = await documents.scanAllDocuments();
        }

        res.json({
            documents: docs,
            count: docs.length,
        });
    } catch (error) {
        logger.error('Error al listar documentos', error);
        res.status(500).json({ error: error.message });
    }
});

/**
 * GET /api/documents/stats
 * Obtener estadísticas de almacenamiento
 */
router.get('/stats', async (req, res) => {
    try {
        const { documents } = req.services;
        const stats = await documents.getStorageStats();

        res.json(stats);
    } catch (error) {
        logger.error('Error al obtener estadísticas', error);
        res.status(500).json({ error: error.message });
    }
});

/**
 * GET /api/documents/:id/content
 * Obtener contenido de un documento
 */
router.get('/:id/content', async (req, res) => {
    try {
        const { documents } = req.services;
        const filePath = decodeURIComponent(req.params.id);

        // Verificar que el archivo existe
        try {
            await fs.access(filePath);
        } catch {
            return res.status(404).json({ error: 'Documento no encontrado' });
        }

        const content = await documents.extractContent(filePath);

        res.json({
            path: filePath,
            content,
        });
    } catch (error) {
        logger.error('Error al obtener contenido', error);
        res.status(500).json({ error: error.message });
    }
});

/**
 * DELETE /api/documents/:id
 * Eliminar un documento
 */
router.delete('/:id', async (req, res) => {
    try {
        const { documents, vectorStore, documentContext } = req.services;
        const filePath = decodeURIComponent(req.params.id);

        // Eliminar archivo
        const deleted = await documents.deleteDocument(filePath);

        if (!deleted) {
            return res.status(404).json({ error: 'Documento no encontrado' });
        }

        // Intentar eliminar del vectorStore
        try {
            await vectorStore.deleteDocument(req.params.id);
        } catch (e) {
            // Ignorar si no está indexado
        }

        // Invalidar cache de contexto
        if (documentContext) documentContext.invalidateCache();

        res.json({ success: true });
    } catch (error) {
        logger.error('Error al eliminar documento', error);
        res.status(500).json({ error: error.message });
    }
});

/**
 * POST /api/documents/search
 * Búsqueda semántica de documentos
 */
router.post('/search', async (req, res) => {
    try {
        const { query, type, limit = 5 } = req.body;
        const { vectorStore } = req.services;

        if (!query) {
            return res.status(400).json({ error: 'Query requerido' });
        }

        const results = await vectorStore.searchSimilar(query, {
            type: type !== 'all' ? type : null,
            limit,
        });

        res.json({
            query,
            results,
            count: results.length,
        });
    } catch (error) {
        logger.error('Error en búsqueda', error);
        res.status(500).json({ error: error.message });
    }
});

/**
 * POST /api/documents/index
 * Indexar todos los documentos
 */
router.post('/index', async (req, res) => {
    try {
        const { documents, vectorStore } = req.services;

        // Escanear documentos
        const allDocs = await documents.scanAllDocuments();
        let indexed = 0;
        let errors = 0;

        for (const doc of allDocs) {
            try {
                const processed = await documents.processDocument(doc.path);

                for (let i = 0; i < processed.chunks.length; i++) {
                    await vectorStore.addDocument({
                        id: `${processed.id}_chunk_${i}`,
                        content: processed.chunks[i],
                        metadata: processed.metadata,
                    });
                }

                indexed++;
            } catch (e) {
                errors++;
                logger.warn(`Error al indexar ${doc.name}:`, e.message);
            }
        }

        res.json({
            success: true,
            indexed,
            errors,
            total: allDocs.length,
        });
    } catch (error) {
        logger.error('Error al indexar', error);
        res.status(500).json({ error: error.message });
    }
});

/**
 * GET /api/documents/view/:path
 * Ver/Descargar un documento
 */
router.get('/view/:path', async (req, res) => {
    try {
        const filePath = decodeURIComponent(req.params.path);

        // Verificar existencia
        try {
            await fs.access(filePath);
        } catch {
            return res.status(404).json({ error: 'Documento no encontrado' });
        }

        // Determinar Content-Type
        const ext = path.extname(filePath).toLowerCase();
        const contentTypes = {
            '.pdf': 'application/pdf',
            '.docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
            '.doc': 'application/msword',
            '.xlsx': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
            '.pptx': 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
            '.txt': 'text/plain',
            '.md': 'text/markdown',
            '.png': 'image/png',
            '.jpg': 'image/jpeg',
            '.jpeg': 'image/jpeg'
        };

        res.setHeader('Content-Type', contentTypes[ext] || 'application/octet-stream');
        res.setHeader('Content-Disposition', `inline; filename="${path.basename(filePath)}"`);

        // Enviar archivo
        const fileBuffer = await fs.readFile(filePath);
        res.send(fileBuffer);
    } catch (error) {
        logger.error('Error al visualizar documento', error);
        res.status(500).json({ error: error.message });
    }
});

/**
 * POST /api/documents/upload-transient
 * Subida transitoria (solo para el chat actual, no se guarda en base de datos)
 */
router.post('/upload-transient', upload.single('file'), async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ error: 'No se proporcionó archivo' });
        }

        const { documents } = req.services;

        // Extraer contenido directamente del archivo temporal
        const content = await documents.extractContent(req.file.path);

        // Eliminar archivo temporal inmediatamente
        await fs.unlink(req.file.path);

        res.json({
            success: true,
            fileName: req.file.originalname,
            content: content
        });
    } catch (error) {
        logger.error('Error en subida transitoria', error);
        // Asegurar limpieza si falla
        if (req.file) await fs.unlink(req.file.path).catch(() => { });
        res.status(500).json({ error: error.message });
    }
});

export default router;
