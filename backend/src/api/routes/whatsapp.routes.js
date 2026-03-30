import express from 'express';
import { authMiddleware } from './auth.routes.js';
import whatsappService from '../../services/whatsapp/whatsapp.service.js';
import { Logger } from '../../utils/logger.js';

const router = express.Router();
const logger = new Logger('WhatsAppRoutes');

/**
 * POST /api/whatsapp/init
 * Inicia sesión WhatsApp y genera QR para el usuario
 */
router.post('/init', authMiddleware, async (req, res) => {
    try {
        const userId = req.user.id;
        logger.info(`Iniciando sesión WhatsApp para usuario ${userId}`);

        // Iniciar en background (no bloquear la respuesta)
        whatsappService.initSession(userId).catch(err => {
            logger.error(`Error en initSession background para usuario ${userId}:`, err.message);
        });

        // Responder inmediatamente
        res.json({
            success: true,
            message: 'Inicializando WhatsApp. El QR estará disponible en unos segundos.',
            status: 'initializing',
        });
    } catch (error) {
        logger.error('Error iniciando WhatsApp:', error);
        res.status(500).json({ error: 'Error al iniciar WhatsApp' });
    }
});

/**
 * GET /api/whatsapp/qr
 * Obtiene el QR code actual como data URL (base64 PNG)
 */
router.get('/qr', authMiddleware, (req, res) => {
    try {
        const userId = req.user.id;
        const result = whatsappService.getQR(userId);

        res.json(result);
    } catch (error) {
        logger.error('Error obteniendo QR:', error);
        res.status(500).json({ error: 'Error al obtener QR' });
    }
});

/**
 * GET /api/whatsapp/status
 * Obtiene el estado de conexión WhatsApp del usuario
 */
router.get('/status', authMiddleware, (req, res) => {
    try {
        const userId = req.user.id;
        const result = whatsappService.getStatus(userId);

        res.json(result);
    } catch (error) {
        logger.error('Error obteniendo estado WhatsApp:', error);
        res.status(500).json({ error: 'Error al obtener estado' });
    }
});

/**
 * POST /api/whatsapp/disconnect
 * Desconecta WhatsApp del usuario
 */
router.post('/disconnect', authMiddleware, async (req, res) => {
    try {
        const userId = req.user.id;
        logger.info(`Desconectando WhatsApp para usuario ${userId}`);

        const result = await whatsappService.destroySession(userId);

        res.json({
            success: true,
            ...result,
        });
    } catch (error) {
        logger.error('Error desconectando WhatsApp:', error);
        res.status(500).json({ error: 'Error al desconectar WhatsApp' });
    }
});

export default router;
