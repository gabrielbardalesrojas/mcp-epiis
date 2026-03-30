import express from 'express';
import path from 'path';
import fs from 'fs/promises';
import crypto from 'crypto';
import jwt from 'jsonwebtoken';
import { getDatabase } from '../../config/database.js';
import { Logger } from '../../utils/logger.js';

const router = express.Router();
const logger = new Logger('AdminRoutes');

const getJwtSecret = () => process.env.JWT_SECRET || 'epiis-admin-jwt-secret';

// ── Middleware de autenticación admin ──────────────────────────────────
export const adminAuthMiddleware = (req, res, next) => {
    let token = req.headers.authorization?.replace('Bearer ', '');
    
    // Si no hay token en el header, intentar obtenerlo del query string (útil para previsualizaciones en pestañas nuevas)
    if (!token && req.query.token) {
        token = req.query.token;
    }

    if (!token) {
        return res.status(401).json({ error: 'Token de autenticación requerido' });
    }
    try {
        const decoded = jwt.verify(token, getJwtSecret());
        if (!decoded.isAdmin) {
            return res.status(403).json({ error: 'Acceso restringido a administradores' });
        }
        req.admin = decoded;
        next();
    } catch (error) {
        return res.status(401).json({ error: 'Token inválido o expirado' });
    }
};

// ── POST /api/admin/login ─────────────────────────────────────────────
router.post('/login', (req, res) => {
    try {
        const { username, password } = req.body;
        if (!username || !password) {
            return res.status(400).json({ error: 'Usuario y contraseña requeridos' });
        }

        const db = getDatabase();
        const admin = db.prepare('SELECT * FROM admin_users WHERE username = ?').get(username);
        if (!admin) {
            return res.status(401).json({ error: 'Credenciales inválidas' });
        }

        const hashedInput = crypto.createHash('sha256').update(password).digest('hex');
        if (hashedInput !== admin.password) {
            return res.status(401).json({ error: 'Credenciales inválidas' });
        }

        const token = jwt.sign(
            { id: admin.id, username: admin.username, name: admin.name, isAdmin: true },
            getJwtSecret(),
            { expiresIn: '24h' }
        );

        logger.info(`Admin login: ${username}`);

        res.json({
            success: true,
            token,
            admin: {
                id: admin.id,
                username: admin.username,
                name: admin.name,
                email: admin.email,
            },
        });
    } catch (error) {
        logger.error('Error en login admin:', error);
        res.status(500).json({ error: 'Error interno' });
    }
});

// ── GET /api/admin/pending ────────────────────────────────────────────
router.get('/pending', adminAuthMiddleware, (req, res) => {
    try {
        const db = getDatabase();
        const docs = db.prepare(
            'SELECT * FROM pending_documents WHERE status = ? ORDER BY uploaded_at DESC'
        ).all('pending');

        res.json({ documents: docs, count: docs.length });
    } catch (error) {
        logger.error('Error al listar pendientes:', error);
        res.status(500).json({ error: error.message });
    }
});

// ── GET /api/admin/pending/:id/preview ─────────────────────────────────
router.get('/pending/:id/preview', adminAuthMiddleware, async (req, res) => {
    try {
        const db = getDatabase();
        const doc = db.prepare('SELECT * FROM pending_documents WHERE id = ?').get(req.params.id);
        if (!doc) return res.status(404).json({ error: 'Documento no encontrado' });

        const filePath = path.join(process.cwd(), 'storage', 'pending', doc.stored_name);
        try {
            await fs.access(filePath);
        } catch {
            return res.status(404).json({ error: 'Archivo no encontrado en disco' });
        }

        const ext = path.extname(doc.original_name).toLowerCase();
        const contentTypes = {
            '.pdf': 'application/pdf',
            '.docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
            '.doc': 'application/msword',
            '.xlsx': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
            '.pptx': 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
            '.txt': 'text/plain',
            '.md': 'text/markdown',
        };

        res.setHeader('Content-Type', contentTypes[ext] || 'application/octet-stream');
        res.setHeader('Content-Disposition', `inline; filename="${doc.original_name}"`);
        const fileBuffer = await fs.readFile(filePath);
        res.send(fileBuffer);
    } catch (error) {
        logger.error('Error al previsualizar:', error);
        res.status(500).json({ error: error.message });
    }
});

// ── POST /api/admin/approve/:id ───────────────────────────────────────
router.post('/approve/:id', adminAuthMiddleware, async (req, res) => {
    try {
        const db = getDatabase();
        const doc = db.prepare('SELECT * FROM pending_documents WHERE id = ? AND status = ?').get(req.params.id, 'pending');

        if (!doc) {
            return res.status(404).json({ error: 'Documento pendiente no encontrado' });
        }

        const pendingPath = path.join(process.cwd(), 'storage', 'pending', doc.stored_name);
        
        // Verificar que el archivo existe
        try {
            await fs.access(pendingPath);
        } catch {
            return res.status(404).json({ error: 'Archivo no encontrado en disco' });
        }

        // Determinar carpeta destino
        const folderMap = {
            silabo: 'silabos', resolucion: 'resoluciones',
            informe: 'informes', reglamento: 'reglamentos',
        };
        const folder = folderMap[doc.type] || 'general';
        const destDir = path.join(process.cwd(), 'storage', 'documents', folder);
        await fs.mkdir(destDir, { recursive: true });

        const destPath = path.join(destDir, doc.original_name);

        // Mover archivo
        const buffer = await fs.readFile(pendingPath);
        await fs.writeFile(destPath, buffer);
        await fs.unlink(pendingPath);

        // Actualizar BD
        db.prepare(
            'UPDATE pending_documents SET status = ?, reviewed_at = CURRENT_TIMESTAMP, reviewed_by = ? WHERE id = ?'
        ).run('approved', req.admin.username, doc.id);

        // Indexar en VectorStore si está disponible
        try {
            const { documents, vectorStore, documentContext } = req.services || {};
            if (documents && vectorStore) {
                const processed = await documents.processDocument(destPath);
                for (let i = 0; i < processed.chunks.length; i++) {
                    await vectorStore.addDocument({
                        id: `${processed.id}_chunk_${i}`,
                        content: processed.chunks[i],
                        metadata: processed.metadata,
                    });
                }
                if (documentContext) documentContext.invalidateCache();
            }
        } catch (indexError) {
            logger.warn('Error al indexar documento aprobado:', indexError.message);
        }

        logger.info(`Documento aprobado: ${doc.original_name} por ${req.admin.username}`);

        res.json({
            success: true,
            message: `Documento "${doc.original_name}" aprobado y guardado en ${folder}/`,
            document: { id: doc.id, name: doc.original_name, path: destPath, type: doc.type },
        });
    } catch (error) {
        logger.error('Error al aprobar documento:', error);
        res.status(500).json({ error: error.message });
    }
});

// ── POST /api/admin/reject/:id ────────────────────────────────────────
router.post('/reject/:id', adminAuthMiddleware, async (req, res) => {
    try {
        const db = getDatabase();
        const doc = db.prepare('SELECT * FROM pending_documents WHERE id = ? AND status = ?').get(req.params.id, 'pending');

        if (!doc) {
            return res.status(404).json({ error: 'Documento pendiente no encontrado' });
        }

        // Eliminar archivo de pending/
        const pendingPath = path.join(process.cwd(), 'storage', 'pending', doc.stored_name);
        try {
            await fs.unlink(pendingPath);
        } catch (e) {
            logger.warn('Archivo ya eliminado del disco:', e.message);
        }

        // Actualizar BD
        db.prepare(
            'UPDATE pending_documents SET status = ?, reviewed_at = CURRENT_TIMESTAMP, reviewed_by = ? WHERE id = ?'
        ).run('rejected', req.admin.username, doc.id);

        logger.info(`Documento rechazado: ${doc.original_name} por ${req.admin.username}`);

        res.json({
            success: true,
            message: `Documento "${doc.original_name}" rechazado y eliminado`,
        });
    } catch (error) {
        logger.error('Error al rechazar documento:', error);
        res.status(500).json({ error: error.message });
    }
});

// ── GET /api/admin/history ──────────────────────────────────────────
router.get('/history', adminAuthMiddleware, (req, res) => {
    try {
        const db = getDatabase();
        const docs = db.prepare(
            'SELECT * FROM pending_documents WHERE status != ? ORDER BY reviewed_at DESC LIMIT 50'
        ).all('pending');

        res.json({ documents: docs, count: docs.length });
    } catch (error) {
        logger.error('Error al obtener historial:', error);
        res.status(500).json({ error: error.message });
    }
});

// ── GET /api/admin/profile ────────────────────────────────────────────
router.get('/profile', adminAuthMiddleware, (req, res) => {
    try {
        const db = getDatabase();
        const admin = db.prepare('SELECT id, username, name, email, created_at FROM admin_users WHERE id = ?').get(req.admin.id);

        if (!admin) return res.status(404).json({ error: 'Admin no encontrado' });

        // Contar estadísticas
        const totalPending = db.prepare('SELECT COUNT(*) as count FROM pending_documents WHERE status = ?').get('pending').count;
        const totalApproved = db.prepare('SELECT COUNT(*) as count FROM pending_documents WHERE status = ?').get('approved').count;
        const totalRejected = db.prepare('SELECT COUNT(*) as count FROM pending_documents WHERE status = ?').get('rejected').count;

        res.json({
            admin,
            stats: { totalPending, totalApproved, totalRejected },
        });
    } catch (error) {
        logger.error('Error al obtener perfil:', error);
        res.status(500).json({ error: error.message });
    }
});

// ── PUT /api/admin/profile ────────────────────────────────────────────
router.put('/profile', adminAuthMiddleware, (req, res) => {
    try {
        const { name, email } = req.body;
        const db = getDatabase();

        db.prepare(
            'UPDATE admin_users SET name = ?, email = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?'
        ).run(name || '', email || '', req.admin.id);

        logger.info(`Perfil admin actualizado: ${req.admin.username}`);

        res.json({ success: true, message: 'Perfil actualizado correctamente' });
    } catch (error) {
        logger.error('Error al actualizar perfil:', error);
        res.status(500).json({ error: error.message });
    }
});

// ── PUT /api/admin/password ───────────────────────────────────────────
router.put('/password', adminAuthMiddleware, (req, res) => {
    try {
        const { currentPassword, newPassword } = req.body;

        if (!currentPassword || !newPassword) {
            return res.status(400).json({ error: 'Contraseña actual y nueva son requeridas' });
        }

        if (newPassword.length < 4) {
            return res.status(400).json({ error: 'La nueva contraseña debe tener al menos 4 caracteres' });
        }

        const db = getDatabase();
        const admin = db.prepare('SELECT password FROM admin_users WHERE id = ?').get(req.admin.id);

        const hashedCurrent = crypto.createHash('sha256').update(currentPassword).digest('hex');
        if (hashedCurrent !== admin.password) {
            return res.status(401).json({ error: 'Contraseña actual incorrecta' });
        }

        const hashedNew = crypto.createHash('sha256').update(newPassword).digest('hex');
        db.prepare(
            'UPDATE admin_users SET password = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?'
        ).run(hashedNew, req.admin.id);

        logger.info(`Contraseña admin cambiada: ${req.admin.username}`);

        res.json({ success: true, message: 'Contraseña actualizada correctamente' });
    } catch (error) {
        logger.error('Error al cambiar contraseña:', error);
        res.status(500).json({ error: error.message });
    }
});

// ── GET /api/admin/library ───────────────────────────────────────────
router.get('/library', adminAuthMiddleware, async (req, res) => {
    try {
        const { category = 'all' } = req.query;
        const baseDir = path.join(process.cwd(), 'storage', 'documents');
        const categories = {
            silabo: 'silabos',
            resolucion: 'resoluciones',
            informe: 'informes',
            reglamento: 'reglamentos',
            general: 'general'
        };

        let result = [];
        const foldersToScan = category === 'all' 
            ? Object.keys(categories) 
            : [category];

        for (const cat of foldersToScan) {
            const folderName = categories[cat] || cat;
            const folderPath = path.join(baseDir, folderName);
            
            try {
                await fs.access(folderPath);
                const files = await fs.readdir(folderPath);
                
                for (const file of files) {
                    const filePath = path.join(folderPath, file);
                    const stats = await fs.stat(filePath);
                    if (stats.isFile()) {
                        result.push({
                            name: file,
                            category: cat,
                            size: stats.size,
                            path: filePath,
                            modifiedAt: stats.mtime
                        });
                    }
                }
            } catch (err) {
                // Si la carpeta no existe, simplemente la ignoramos
                logger.warn(`Carpeta no encontrada: ${folderPath}`);
            }
        }

        res.json({ documents: result, count: result.length });
    } catch (error) {
        logger.error('Error al listar biblioteca:', error);
        res.status(500).json({ error: error.message });
    }
});

// ── DELETE /api/admin/library/:category/:filename ────────────────────
router.delete('/library/:category/:filename', adminAuthMiddleware, async (req, res) => {
    try {
        const { category, filename } = req.params;
        const { vectorStore, documentContext } = req.services || {};
        
        const categories = {
            silabo: 'silabos',
            resolucion: 'resoluciones',
            informe: 'informes',
            reglamento: 'reglamentos',
            general: 'general'
        };

        const folderName = categories[category] || category;
        const filePath = path.join(process.cwd(), 'storage', 'documents', folderName, decodeURIComponent(filename));

        try {
            await fs.access(filePath);
        } catch {
            return res.status(404).json({ error: 'Archivo no encontrado' });
        }

        // Eliminar del disco
        await fs.unlink(filePath);

        // Eliminar del vectorStore
        if (vectorStore) {
            try {
                // Intentamos por el path y el nombre
                await vectorStore.deleteDocument(filePath);
            } catch (vErr) {
                logger.warn('Error al eliminar de vectorStore:', vErr.message);
            }
        }

        // Invalidar cache
        if (documentContext) documentContext.invalidateCache();

        logger.info(`Documento eliminado permanentemente por ${req.admin.username}: ${filename} (${category})`);

        res.json({ success: true, message: 'Documento eliminado correctamente' });
    } catch (error) {
        logger.error('Error al eliminar de biblioteca:', error);
        res.status(500).json({ error: error.message });
    }
});

export default router;
