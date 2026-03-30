import express from 'express';
import { OAuth2Client } from 'google-auth-library';
import jwt from 'jsonwebtoken';
import { getDatabase } from '../../config/database.js';
import { Logger } from '../../utils/logger.js';

const router = express.Router();
const logger = new Logger('AuthRoutes');

// Lazy getters — env vars aren't available at import time in ESM
const getClientId = () => process.env.GOOGLE_CLIENT_ID || '';
const getJwtSecret = () => process.env.JWT_SECRET || 'epiis-jwt-secret-change-me';

let _googleClient = null;
const getGoogleClient = () => {
    if (!_googleClient) {
        const clientId = getClientId();
        logger.info(`GOOGLE_CLIENT_ID cargado: ${clientId ? clientId.substring(0, 20) + '...' : '⚠️ VACÍO'}`);
        _googleClient = new OAuth2Client(clientId);
    }
    return _googleClient;
};

/**
 * Middleware de autenticación
 */
export const authMiddleware = (req, res, next) => {
    const token = req.headers.authorization?.replace('Bearer ', '');

    if (!token) {
        return res.status(401).json({ error: 'Token de autenticación requerido' });
    }

    try {
        const decoded = jwt.verify(token, getJwtSecret());
        req.user = decoded;
        next();
    } catch (error) {
        return res.status(401).json({ error: 'Token inválido o expirado' });
    }
};

/**
 * POST /api/auth/google
 * Verifica token de Google y crea/busca usuario
 */
router.post('/google', async (req, res) => {
    try {
        const { credential } = req.body;

        if (!credential) {
            return res.status(400).json({ error: 'Credencial de Google requerida' });
        }

        // Verificar token con Google
        let payload;
        try {
            const ticket = await getGoogleClient().verifyIdToken({
                idToken: credential,
                audience: getClientId(),
            });
            payload = ticket.getPayload();
        } catch (err) {
            const errMsg = typeof err === 'string' ? err : (err.message || String(err));
            logger.error(`Error verificando token de Google: ${errMsg}`);
            return res.status(401).json({
                error: 'Token de Google inválido',
                detail: errMsg,
                hint: 'Verifica que GOOGLE_CLIENT_ID en .env coincida con el de Google Cloud Console, y que http://localhost:3000 esté en Authorized JavaScript Origins'
            });
        }

        const { sub: googleId, email, name, picture } = payload;

        const db = getDatabase();

        // Buscar o crear usuario
        let user = db.prepare('SELECT * FROM users WHERE google_id = ?').get(googleId);

        if (!user) {
            const result = db.prepare(
                'INSERT INTO users (google_id, email, name, avatar_url) VALUES (?, ?, ?, ?)'
            ).run(googleId, email, name, picture);

            user = {
                id: result.lastInsertRowid,
                google_id: googleId,
                email,
                name,
                avatar_url: picture,
            };
            logger.info(`Nuevo usuario creado: ${email}`);
        } else {
            // Actualizar datos por si cambiaron
            db.prepare(
                'UPDATE users SET email = ?, name = ?, avatar_url = ? WHERE google_id = ?'
            ).run(email, name, picture, googleId);
            user.email = email;
            user.name = name;
            user.avatar_url = picture;
        }

        // Generar JWT
        const token = jwt.sign(
            { id: user.id, email: user.email, name: user.name, avatar_url: user.avatar_url },
            getJwtSecret(),
            { expiresIn: '7d' }
        );

        res.json({
            success: true,
            token,
            user: {
                id: user.id,
                email: user.email,
                name: user.name,
                avatar_url: user.avatar_url,
            },
        });
    } catch (error) {
        logger.error('Error en autenticación Google:', error);
        res.status(500).json({ error: 'Error interno de autenticación' });
    }
});

/**
 * GET /api/auth/me
 * Retorna datos del usuario actual
 */
router.get('/me', authMiddleware, (req, res) => {
    res.json({
        user: {
            id: req.user.id,
            email: req.user.email,
            name: req.user.name,
            avatar_url: req.user.avatar_url,
        },
    });
});

/**
 * POST /api/auth/logout
 * Logout (client-side solo borra el token, pero registramos el evento)
 */
router.post('/logout', authMiddleware, (req, res) => {
    logger.info(`Usuario ${req.user.email} cerró sesión`);
    res.json({ success: true });
});

export default router;
