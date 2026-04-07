import pkg from 'whatsapp-web.js';
const { Client, LocalAuth, MessageMedia } = pkg;
import QRCode from 'qrcode';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { Logger } from '../../utils/logger.js';
import { getDatabase } from '../../config/database.js';
import { aiQueue } from '../../utils/request-queue.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Servicio de WhatsApp - Gestiona sesiones por usuario
 * Cada usuario autenticado puede tener su propia sesión de WhatsApp
 */
class WhatsAppService {
    constructor() {
        this.sessions = new Map(); // userId -> { client, qr, status }
        this.logger = new Logger('WhatsAppService');
        this.ollamaService = null;
        this.documentContext = null;
        this.institutionalContext = null;
        this.vectorStore = null;
        this.documentService = null;
        this.conversationHistory = new Map(); // contactId -> [{role, content, timestamp}]
        this.MAX_HISTORY = 10; // Máximo de mensajes recordados por contacto
    }

    /**
     * Inyectar el servicio de Ollama para responder mensajes
     */
    setOllamaService(ollamaService) {
        this.ollamaService = ollamaService;
    }

    /**
     * Inyectar el servicio de contexto de documentos
     */
    setDocumentContext(documentContextService) {
        this.documentContext = documentContextService;
    }

    /**
     * Inyectar el contexto institucional (scraping)
     */
    setInstitutionalContext(institutionalContext) {
        this.institutionalContext = institutionalContext;
    }

    /**
     * Inyectar el vector store para búsqueda semántica
     */
    setVectorStore(vectorStore) {
        this.vectorStore = vectorStore;
    }

    /**
     * Inyectar el servicio de documentos para generar archivos
     */
    setDocumentService(documentService) {
        this.documentService = documentService;
    }

    /**
     * Limpiar archivos de lock de Puppeteer que quedan de sesiones anteriores/crashes
     */
    _cleanBrowserLocks(authPath, clientId) {
        try {
            const sessionDir = path.join(authPath, `session-${clientId}`);
            this.logger.info(`Limpiando locks en: ${sessionDir}`);

            // Asegurar que el directorio base de la sesión existe
            if (!fs.existsSync(authPath)) {
                fs.mkdirSync(authPath, { recursive: true });
            }

            if (fs.existsSync(sessionDir)) {
                const lockFiles = ['SingletonLock', 'SingletonSocket', 'SingletonCookie', 'lockfile'];
                for (const lockFile of lockFiles) {
                    const lockPath = path.join(sessionDir, lockFile);
                    if (fs.existsSync(lockPath)) {
                        try {
                            fs.unlinkSync(lockPath);
                            this.logger.info(`Lock file eliminado: ${lockFile}`);
                        } catch (e) {
                            this.logger.warn(`No se pudo eliminar lock ${lockFile}: ${e.message}`);
                        }
                    }
                }
            }
        } catch (err) {
            this.logger.warn('Error limpiando lock files:', err.message);
        }
    }

    /**
     * Iniciar sesión WhatsApp para un usuario
     */
    async initSession(userId) {
        // SIEMPRE destruir sesión anterior si existe
        if (this.sessions.has(userId)) {
            this.logger.info(`Sesión existente para usuario ${userId}, destruyendo...`);
            await this.destroySession(userId);
            // Esperar un poco para que Puppeteer libere recursos
            await new Promise(resolve => setTimeout(resolve, 1000));
        }

        const authPath = path.join(__dirname, '../../../storage/whatsapp-sessions', `user_${userId}`);
        const clientId = `user_${userId}`;

        // Limpiar lock files de sesiones anteriores/crashes
        this._cleanBrowserLocks(authPath, clientId);

        const sessionData = {
            client: null,
            qr: null,
            qrDataUrl: null,
            status: 'initializing',
            phoneNumber: null,
            errorMessage: null,
        };

        this.sessions.set(userId, sessionData);

        try {
            const client = new Client({
                authStrategy: new LocalAuth({
                    clientId: `user_${userId}`,
                    dataPath: authPath,
                }),
                puppeteer: {
                    headless: true,
                    executablePath: process.env.PUPPETEER_EXECUTABLE_PATH || null, // Permitir usar cromo del sistema si es necesario
                    args: [
                        '--no-sandbox',
                        '--disable-setuid-sandbox',
                        '--disable-dev-shm-usage',
                        '--disable-accelerated-2d-canvas',
                        '--no-first-run',
                        '--disable-gpu',
                        '--disable-extensions',
                        '--disable-software-rasterizer',
                        '--single-process',
                        '--no-zygote',
                        '--disable-web-security',
                    ],
                },
                webVersionCache: {
                    type: 'remote',
                    remotePath: 'https://raw.githubusercontent.com/wppconnect-team/wa-version/main/html/2.2412.54.html',
                }
            });

            sessionData.client = client;

            // Evento QR
            client.on('qr', async (qr) => {
                this.logger.info(`QR generado para usuario ${userId}`);
                sessionData.qr = qr;
                sessionData.status = 'qr_pending';

                // Generar QR como data URL (imagen base64)
                try {
                    sessionData.qrDataUrl = await QRCode.toDataURL(qr, {
                        width: 300,
                        margin: 2,
                        color: {
                            dark: '#1e3a5f',
                            light: '#ffffff',
                        },
                    });
                } catch (err) {
                    this.logger.error('Error generando QR data URL:', err.message);
                }

                this._updateSessionDB(userId, 'qr_pending', null);
            });

            // Evento autenticado
            client.on('authenticated', () => {
                this.logger.info(`WhatsApp autenticado para usuario ${userId}`);
                sessionData.status = 'authenticated';
            });

            // Evento listo
            client.on('ready', () => {
                this.logger.info(`✅ [WHATSAPP] TOTALMENTE CONECTADO para usuario ${userId}`);
                sessionData.status = 'connected';
                sessionData.qr = null;
                sessionData.qrDataUrl = null;

                // Obtener número de teléfono
                const info = client.info;
                if (info && info.wid) {
                    sessionData.phoneNumber = info.wid.user;
                    this._updateSessionDB(userId, 'connected', info.wid.user);
                } else {
                    this._updateSessionDB(userId, 'connected', null);
                }
            });

            // Evento de mensaje entrante
            client.on('message', async (msg) => {
                this.logger.info(`[WHATSAPP] Mensaje recibido de ${msg.from}: ${msg.body.substring(0, 20)}...`);
                await this._handleIncomingMessage(userId, msg);
            });

            // También registrar mensajes enviados por uno mismo (útil para pruebas)
            client.on('message_create', async (msg) => {
                if (msg.fromMe && (msg.body === 'test' || msg.body === 'ping')) {
                    this.logger.info(`[WHATSAPP] Auto-mensaje de prueba detectado: ${msg.body}`);
                    await msg.reply('pong 🏓 (Conexión activa)');
                }
            });

            // Evento desconexión
            client.on('disconnected', (reason) => {
                this.logger.warn(`WhatsApp desconectado para usuario ${userId}: ${reason}`);
                sessionData.status = 'disconnected';
                sessionData.qr = null;
                sessionData.qrDataUrl = null;
                this._updateSessionDB(userId, 'disconnected', null);
            });

            // Error de autenticación
            client.on('auth_failure', (msg) => {
                this.logger.error(`Error de autenticación WhatsApp para usuario ${userId}:`, msg);
                sessionData.status = 'auth_failed';
                this._updateSessionDB(userId, 'auth_failed', null);
            });

            // Evento de pantalla de carga (debug)
            client.on('loading_screen', (percent, message) => {
                this.logger.info(`WhatsApp cargando para usuario ${userId}: ${percent}% - ${message}`);
            });

            // Inicializar cliente con timeout de 90 segundos
            this.logger.info(`Lanzando Chromium para usuario ${userId}...`);

            const initPromise = client.initialize();
            const timeoutPromise = new Promise((_, reject) =>
                setTimeout(() => reject(new Error('Timeout: WhatsApp tardó más de 90 segundos en inicializar')), 90000)
            );

            await Promise.race([initPromise, timeoutPromise]);

            this.logger.info(`WhatsApp inicializado para usuario ${userId}, status: ${sessionData.status}`);
            return { status: sessionData.status };
        } catch (error) {
            let userFriendlyMessage = error.message;

            // Detectar errores de dependencias de Linux (Puppeteer/Chromium)
            if (error.message.includes('shared libraries') || error.message.includes('libatk') || error.message.includes('libnss3')) {
                userFriendlyMessage = 'Error: Faltan dependencias del sistema para WhatsApp. Por favor, ejecuta en el servidor: sudo bash backend/scripts/install-puppeteer-deps.sh';
                this.logger.error('❌ ERROR CRÍTICO: Faltan dependencias de Puppeteer en el sistema.');
            } else if (error.message.includes('Timeout')) {
                userFriendlyMessage = 'Error: La conexión de WhatsApp tardó demasiado en iniciar. Inténtalo de nuevo.';
            }

            this.logger.error(`Error inicializando WhatsApp para usuario ${userId}:`, error);
            sessionData.status = 'error';
            sessionData.errorMessage = userFriendlyMessage;
            throw new Error(userFriendlyMessage);
        }
    }

    /**
     * Obtener QR code actual
     */
    getQR(userId) {
        const session = this.sessions.get(userId);
        if (!session) {
            return { status: 'no_session', qr: null };
        }

        return {
            status: session.status,
            qr: session.qrDataUrl,
        };
    }

    /**
     * Obtener estado de la sesión
     */
    getStatus(userId) {
        const session = this.sessions.get(userId);
        if (!session) {
            // Verificar en DB si hay sesión previa
            const db = getDatabase();
            const dbSession = db.prepare(
                'SELECT status, phone_number FROM whatsapp_sessions WHERE user_id = ?'
            ).get(userId);

            return {
                status: dbSession?.status || 'disconnected',
                phoneNumber: dbSession?.phone_number || null,
                hasQR: false,
            };
        }

        return {
            status: session.status,
            phoneNumber: session.phoneNumber,
            hasQR: !!session.qrDataUrl,
            errorMessage: session.errorMessage,
        };
    }

    /**
     * Destruir sesión WhatsApp
     */
    async destroySession(userId) {
        const session = this.sessions.get(userId);
        if (session && session.client) {
            try {
                await session.client.destroy();
            } catch (err) {
                this.logger.warn(`Error destruyendo cliente WhatsApp para usuario ${userId}:`, err.message);
            }
        }

        this.sessions.delete(userId);
        this._updateSessionDB(userId, 'disconnected', null);

        return { status: 'disconnected' };
    }

    /**
     * Manejar mensaje entrante de WhatsApp
     * Usa Ollama Cloud API para respuestas rápidas
     */
    async _handleIncomingMessage(userId, msg) {
        // Ignorar mensajes de grupo y mensajes de estado
        if (msg.isGroupMsg || msg.isStatus) return;

        // Logging detallado para debug
        this.logger.info(`[DEBUG] Mensaje recibido - from: ${msg.from}, fromMe: ${msg.fromMe}, type: ${msg.type}, body: "${(msg.body || '').substring(0, 50)}"`);

        const userMessage = msg.body;
        if (!userMessage || userMessage.trim().length === 0) return;

        this.logger.info(`Mensaje WhatsApp entrante para usuario ${userId}: "${userMessage.substring(0, 50)}..."`);

        try {
            this.logger.info(`[WHATSAPP] Procesando mensaje de usuario ${userId}...`);

            // Verificar que Ollama esté disponible
            if (!this.ollamaService) {
                this.logger.error('[WHATSAPP] ERROR: OllamaService no inyectado');
                await msg.reply('⚠️ El servicio de IA no está disponible en este momento.');
                return;
            }

            this.logger.info(`[WHATSAPP] Usando IA en modo: ${this.ollamaService.mode}`);

            // === CAPA 1: Contexto institucional (scraping) ===
            let enrichedContext = '';
            if (this.institutionalContext) {
                try {
                    enrichedContext = await this.institutionalContext.getContextForPromptAsync(userMessage);
                    this.logger.info(`Contexto institucional: ${enrichedContext.length} chars`);
                } catch (ctxErr) {
                    this.logger.warn('Error obteniendo contexto institucional:', ctxErr.message);
                    if (this.institutionalContext.hasContent && this.institutionalContext.hasContent()) {
                        enrichedContext = this.institutionalContext.getContextForPrompt(userMessage);
                    }
                }
            }

            // === CAPA 2: Búsqueda semántica en vectorStore ===
            if (this.vectorStore) {
                try {
                    const searchResults = await this.vectorStore.searchSimilar(userMessage, { limit: 3 });
                    if (searchResults.length > 0) {
                        enrichedContext += '\nCONTEXTO DE DOCUMENTOS (búsqueda semántica):\n' +
                            searchResults.map(r => `[${r.title}]: ${r.content}`).join('\n\n');
                    }
                } catch (vecErr) {
                    this.logger.warn('Error en búsqueda semántica:', vecErr.message);
                }
            }

            // === CAPA 3: Contexto de documentos ===
            if (this.documentContext) {
                try {
                    const docCtx = await this.documentContext.buildDocumentContext(userMessage);
                    if (docCtx) enrichedContext += docCtx;

                    const relevantContent = await this.documentContext.getRelevantDocumentContent(userMessage);
                    if (relevantContent) {
                        enrichedContext += '\nCONTENIDO RELEVANTE DE DOCUMENTOS:\n' + relevantContent;
                    }
                } catch (docErr) {
                    this.logger.warn('Error obteniendo contexto de documentos:', docErr.message);
                }
            }

            this.logger.info(`Contexto total enriquecido: ${enrichedContext.length} chars`);

            // === HISTORIAL DE CONVERSACIÓN ===
            const contactId = msg.from;
            if (!this.conversationHistory.has(contactId)) {
                this.conversationHistory.set(contactId, []);
            }
            const history = this.conversationHistory.get(contactId);

            // Agregar mensaje del usuario al historial
            history.push({ role: 'user', content: userMessage, timestamp: Date.now() });

            // Limpiar mensajes antiguos (más de 1 hora) y mantener máximo
            const oneHourAgo = Date.now() - (60 * 60 * 1000);
            const recentHistory = history.filter(h => h.timestamp > oneHourAgo).slice(-this.MAX_HISTORY);
            this.conversationHistory.set(contactId, recentHistory);

            // === DETECCIÓN DE SOLICITUD DE DOCUMENTO ===
            const lowerMsg = userMessage.toLowerCase();
            const triggerWords = ['crea', 'genera', 'haz', 'escribe', 'create', 'generate', 'descargar', 'bajame', 'pasame', 'producir', 'elaborar', 'redacta', 'enviame', 'basado en', 'refierete', 'hazme', 'generame', 'ponme'];
            const formatWords = ['pdf', 'excel', 'xlsx', 'word', 'doc', 'docx', 'presentacion', 'diapositiva', 'ppt', 'pptx', 'archivo', 'silabo', 'reporte', 'hoja de calculo', 'resumen', 'carta', 'oficio', 'resolucion', 'informe', 'documento'];
            const genPhrases = ['generame un', 'crear un', 'haz un', 'genera un', 'crea un', 'puedes generar', 'podrias crear', 'necesito un', 'redacta un', 'elabora un', 'hazme un', 'escribe un', 'ponme un', 'generame una', 'crea una', 'haz una', 'enviame un', 'pasame un'];

            const hasTrigger = triggerWords.some(w => lowerMsg.includes(w));
            const hasFormat = formatWords.some(w => lowerMsg.includes(w));
            const hasGenPhrase = genPhrases.some(p => lowerMsg.includes(p));
            const isGenRequest = (hasTrigger && hasFormat) || hasGenPhrase ||
                (lowerMsg.includes('basado en') && hasTrigger) ||
                (lowerMsg.includes('pdf') && (lowerMsg.includes('silabo') || lowerMsg.includes('reporte')));

            const wantsPPT = lowerMsg.includes('present') || lowerMsg.includes('ppt') || lowerMsg.includes('diap');
            const wantsXLSX = lowerMsg.includes('excel') || lowerMsg.includes('xlsx') || lowerMsg.includes('hoja de calculo');
            const wantsDOCX = (lowerMsg.includes('word') || lowerMsg.includes('docx')) && !wantsPPT;
            const wantsPDF = !wantsPPT && !wantsXLSX && !wantsDOCX;

            // Instrucciones de formato según tipo de documento solicitado
            let formatInstructions = '';
            if (isGenRequest && wantsPPT) {
                formatInstructions = `\nEl usuario quiere una PRESENTACIÓN. Genera contenido con formato:\nSLIDE: [Título]\n- punto 1\n- punto 2\nGenera entre 8 y 12 slides. NO uses ** ni ##.`;
            } else if (isGenRequest) {
                formatInstructions = `\nEl usuario quiere un DOCUMENTO. Genera contenido completo usando:\n# Título principal\n## Secciones\n### Subsecciones\n- Listas\n| Col1 | Col2 | para tablas\nSé detallado y completo.`;
            }

            // System prompt con personalidad empática y natural
            const systemPrompt = `Eres el asistente virtual de la FIIS (Facultad de Ingeniería en Informática y Sistemas) de la UNAS (Universidad Nacional Agraria de la Selva), en Tingo María, Huánuco, Perú.

            TU PERSONALIDAD:
            - Eres amigable, empático y natural. Hablas como un compañero de universidad que sabe mucho.
            - Usas un tono cercano pero respetuoso. Puedes tutear al usuario.
            - Usas emojis con naturalidad (sin exagerar).

            TU CONOCIMIENTO Y REGLAS DE PRECISIÓN:
            - TU RESPUESTA DEBE BASARSE PRIORITARIAMENTE EN EL CONTEXTO INSTITUCIONAL ABAJO.
            - Si el contexto tiene la información (horarios, requisitos, nombres), ÚSALO.
            - Si el contexto NO tiene la información, NO INVENTES DATOS. Di: "Lo siento, no tengo ese dato específico en mi base de datos actual. Te sugiero consultar en la oficina de la FIIS."
            - Sé natural: No digas "Según el contexto..." o "El documento indica...". Habla como si tú supieras la información.
            
            ESTILO DE RESPUESTA (WhatsApp):
            - Respuestas cortas y directas. Formato WhatsApp: *negrita*, _cursiva_, ~tachado~.
            - Usa listas con viñetas. 
            
            CAPACIDADES DE DOCUMENTOS:
            - Puedes generar PDF, Word, Excel o PPT si el usuario lo pide.
            - Si vas a generar un documento, COMIENZA DIRECTAMENTE con el contenido formateado.
            ${formatInstructions}
            
            CONTEXTO INSTITUCIONAL Y DE DOCUMENTOS:
            ${enrichedContext}`;

            const messages = [{ role: 'system', content: systemPrompt }];

            // Agregar historial previo
            const previousMessages = recentHistory.slice(0, -1);
            for (const h of previousMessages) {
                messages.push({ role: h.role, content: h.content });
            }

            // Agregar mensaje actual
            messages.push({ role: 'user', content: userMessage });

            this.logger.info(`Generando respuesta con Ollama (Modo: ${this.ollamaService.mode})...`);
            const response = await aiQueue.enqueue(async () => {
                return await this.ollamaService.chat(messages);
            });

            if (response) {
                // Limpiar etiquetas de razonamiento
                let cleanResponse = response
                    .replace(/<think>[\s\S]*?<\/think>/g, '')
                    .replace(/<think>[\s\S]*/g, '')
                    .replace(/[\s\S]*?<\/think>/g, '')
                    .trim();

                // Guardar respuesta en historial
                recentHistory.push({ role: 'assistant', content: cleanResponse, timestamp: Date.now() });

                // === GENERACIÓN Y ENVÍO DE DOCUMENTO ===
                if (isGenRequest && this.documentService) {
                    try {
                        await msg.reply('📄 Generando tu documento... un momento por favor ⏳');

                        const META = {
                            institution: 'FIIS · UNAS',
                            department: 'Facultad de Ingeniería en Informática y Sistemas',
                            date: new Date().toLocaleDateString('es-PE'),
                        };

                        // Asegurar que el directorio de salida existe
                        const generatedDir = path.join(__dirname, '../../../storage/generated');
                        if (!fs.existsSync(generatedDir)) fs.mkdirSync(generatedDir, { recursive: true });

                        let generatedFile = null;

                        if (wantsXLSX) {
                            // --- EXCEL ---
                            try {
                                const excelMessages = [
                                    { role: 'system', content: 'Eres un extractor de datos. Convierte texto en JSON para Excel. Responde SOLO con el JSON, sin texto adicional, sin backticks.' },
                                    { role: 'user', content: `Convierte el siguiente texto en JSON para Excel.
Estructura: {"title":"Título","sheetName":"Hoja","headers":["Col1","Col2"],"rows":[["v1","v2"]]}

Texto:\n${cleanResponse}` }
                                ];
                                let jsonRaw = await this.ollamaService.chat(excelMessages, { temperature: 0.05 });
                                let jsonStr = jsonRaw
                                    .replace(/<think>[\s\S]*?<\/think>/gi, '')
                                    .replace(/```[\w]*\n?/g, '').replace(/```/g, '')
                                    .match(/\{[\s\S]*\}/)?.[0];
                                const excelData = JSON.parse(jsonStr);
                                const r = await this.documentService.generateExcel(excelData);
                                generatedFile = { fileName: r.fileName, path: r.path, format: 'xlsx' };
                            } catch (excelErr) {
                                this.logger.warn('Excel falló, generando PDF:', excelErr.message);
                                const r = await this.documentService.documentGenerator.generatePDF('Reporte Académico', cleanResponse, null, META);
                                generatedFile = { fileName: r.fileName, path: r.path, format: 'pdf' };
                            }

                        } else if (wantsPPT) {
                            // --- POWERPOINT ---
                            let pptData = null;
                            try {
                                const pptMessages = [
                                    { role: 'system', content: 'Convierte contenido en JSON para PowerPoint. Responde SOLO con el JSON, sin texto adicional, sin backticks.' },
                                    { role: 'user', content: `Convierte este contenido en JSON para PowerPoint.
Estructura: {"title":"Título","subtitle":"Sub","slides":[{"title":"Slide","bullets":["p1","p2"]}]}
Crea 8-10 slides.

Contenido:\n${cleanResponse}` }
                                ];
                                let jsonRaw = await this.ollamaService.chat(pptMessages, { temperature: 0.05 });
                                let jsonStr = jsonRaw
                                    .replace(/<think>[\s\S]*?<\/think>/gi, '')
                                    .replace(/```[\w]*\n?/g, '').replace(/```/g, '')
                                    .match(/\{[\s\S]*\}/)?.[0];
                                pptData = JSON.parse(jsonStr);
                                if (pptData.slides) {
                                    pptData.slides = pptData.slides.map(s => ({
                                        ...s, bullets: s.bullets || s.bulletPoints || s.points || [],
                                    }));
                                }
                                if (!pptData.meta) pptData.meta = META;
                                const r = await this.documentService.generatePPT(pptData);
                                generatedFile = { fileName: r.fileName, path: r.path, format: 'pptx' };
                            } catch (pptErr) {
                                this.logger.warn('PPT falló, generando PDF:', pptErr.message);
                                const r = await this.documentService.documentGenerator.generatePDF('Presentación Académica', cleanResponse, null, META);
                                generatedFile = { fileName: r.fileName, path: r.path, format: 'pdf' };
                            }

                        } else if (wantsDOCX) {
                            // --- WORD ---
                            const docxItems = cleanResponse.split('\n').filter(Boolean).map(line => {
                                if (line.startsWith('# ')) return { type: 'h1', text: line.slice(2).replace(/\*\*/g, '') };
                                if (line.startsWith('## ')) return { type: 'h2', text: line.slice(3).replace(/\*\*/g, '') };
                                if (line.startsWith('### ')) return { type: 'h3', text: line.slice(4).replace(/\*\*/g, '') };
                                if (/^[-*•]\s/.test(line)) return { type: 'bullet', text: line.replace(/^[-*•]\s+/, '').replace(/\*\*/g, '') };
                                if (/^\d+\.\s/.test(line)) return { type: 'number', text: line.replace(/^\d+\.\s/, '').replace(/\*\*/g, '') };
                                return { type: 'p', text: line.replace(/\*\*/g, '') };
                            });
                            const titleItem = docxItems.find(i => i.type === 'h1');
                            const outPath = path.join(generatedDir, `wa_doc_${Date.now()}.docx`);
                            await this.documentService.documentGenerator.createProfessionalDocx(outPath, {
                                title: titleItem?.text || 'Documento Académico',
                                content: docxItems.filter(i => i.type !== 'h1'),
                                meta: META,
                            });
                            generatedFile = { fileName: path.basename(outPath), path: outPath, format: 'docx' };

                        } else {
                            // --- PDF (default) ---
                            let firstTitle = cleanResponse.match(/^#\s+(.+)$/m)?.[1];
                            if (!firstTitle) {
                                if (lowerMsg.includes('silabo')) firstTitle = 'Silabo Academico';
                                else if (lowerMsg.includes('reporte') || lowerMsg.includes('informe')) firstTitle = 'Informe Institucional';
                                else if (lowerMsg.includes('noticia') || lowerMsg.includes('comunicado')) firstTitle = 'Comunicados UNAS';
                                else firstTitle = cleanResponse.split('\n').find(l => l.trim().length > 5)?.trim().substring(0, 70) || 'Documento Academico';
                            }
                            // Sanitizar título: solo caracteres seguros para PDF
                            firstTitle = firstTitle.replace(/[^\w\s.,\-()áéíóúñÁÉÍÓÚÑ]/g, '').trim() || 'Documento Academico';

                            this.logger.info(`Generando PDF con título: "${firstTitle}", contenido: ${cleanResponse.length} chars`);
                            const r = await this.documentService.documentGenerator.generatePDF(firstTitle, cleanResponse, null, META);
                            generatedFile = { fileName: r.fileName, path: r.path, format: 'pdf' };
                        }

                        // === ENVIAR ARCHIVO POR WHATSAPP ===
                        if (generatedFile && fs.existsSync(generatedFile.path)) {
                            this.logger.info(`Archivo generado exitosamente: ${generatedFile.path}`);
                            const media = MessageMedia.fromFilePath(generatedFile.path);
                            const session = this.sessions.get(userId);
                            if (session && session.client) {
                                const chat = await msg.getChat();
                                await chat.sendMessage(media, {
                                    sendMediaAsDocument: true,
                                    caption: `📎 *${generatedFile.fileName}*\n\nTu documento ha sido generado exitosamente ✅`,
                                });
                                this.logger.info(`Documento enviado por WhatsApp: ${generatedFile.fileName}`);
                            }

                            // Limpiar archivo temporal después de 5 minutos
                            setTimeout(() => {
                                try {
                                    if (fs.existsSync(generatedFile.path)) {
                                        fs.unlinkSync(generatedFile.path);
                                        this.logger.info(`Archivo temporal eliminado: ${generatedFile.fileName}`);
                                    }
                                } catch (e) {
                                    this.logger.warn(`No se pudo eliminar archivo temporal: ${e.message}`);
                                }
                            }, 5 * 60 * 1000);
                        } else {
                            this.logger.error('Archivo generado no encontrado en disco');
                            await msg.reply(cleanResponse);
                        }
                    } catch (genError) {
                        this.logger.error('Error generando documento para WhatsApp:', genError.message);
                        this.logger.error('Stack:', genError.stack);
                        await msg.reply('⚠️ No pude generar el documento, pero aquí tienes la información en texto:');
                        await msg.reply(cleanResponse);
                    }
                } else {
                    // === RESPUESTA DE TEXTO NORMAL ===
                    await msg.reply(cleanResponse);
                }

                this.logger.info(`Respuesta enviada por WhatsApp para usuario ${userId}`);
            }
        } catch (error) {
            this.logger.error(`Error procesando mensaje WhatsApp para usuario ${userId}:`, error);
            try {
                await msg.reply('❌ Lo siento, hubo un error al procesar tu mensaje. Intenta de nuevo.');
            } catch (replyErr) {
                this.logger.error('Error enviando mensaje de error:', replyErr.message);
            }
        }
    }

    /**
     * Actualizar estado en base de datos
     */
    _updateSessionDB(userId, status, phoneNumber) {
        try {
            const db = getDatabase();
            const existing = db.prepare(
                'SELECT id FROM whatsapp_sessions WHERE user_id = ?'
            ).get(userId);

            if (existing) {
                db.prepare(
                    'UPDATE whatsapp_sessions SET status = ?, phone_number = ?, updated_at = CURRENT_TIMESTAMP WHERE user_id = ?'
                ).run(status, phoneNumber, userId);
            } else {
                db.prepare(
                    'INSERT INTO whatsapp_sessions (user_id, status, phone_number) VALUES (?, ?, ?)'
                ).run(userId, status, phoneNumber);
            }
        } catch (err) {
            this.logger.error('Error actualizando sesión WhatsApp en DB:', err.message);
        }
    }
}

// Singleton
const whatsappService = new WhatsAppService();
export default whatsappService;
