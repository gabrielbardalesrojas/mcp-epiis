import express from 'express';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

// Importar rutas
import documentsRouter from './api/routes/documents.routes.js';
import analysisRouter from './api/routes/analysis.routes.js';
import generationRouter from './api/routes/generation.routes.js';
import authRouter from './api/routes/auth.routes.js';
import whatsappRouter from './api/routes/whatsapp.routes.js';
import adminRouter from './api/routes/admin.routes.js';
import whatsappService from './services/whatsapp/whatsapp.service.js';

// Importar servicios
import { OllamaService } from './services/llm/ollama.service.js';
import { DocumentService } from './services/document/document-service.js';
import { VectorStoreService } from './services/vector/vector-store.js';
import { InstitutionalContextService } from './services/scraping/institutional-context.js';
import { DocumentContextService } from './services/document/document-context.js';
import { initializeDatabase } from './config/database.js';
import { Logger } from './utils/logger.js';

// Configuración
const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, '../../.env') });

const app = express();
const logger = new Logger('API');
const PORT = process.env.PORT || 3001;

// Inicializar esquema de base de datos (crea tablas si no existen)
initializeDatabase();

// Middleware (CORS permisivo para acceso en red local)
app.use(cors({
    origin: process.env.NODE_ENV === 'production'
        ? ['http://localhost:3000'] // En producción ser más estricto
        : '*',                    // En dev/red local permitir todo
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    credentials: true,
}));

app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Servir archivos estáticos
app.use('/storage', express.static(path.join(__dirname, '../../storage')));
app.use('/data', express.static(path.join(__dirname, '../../data')));

// Inicializar servicios globales
const ollamaService = new OllamaService({
    host: process.env.OLLAMA_HOST || 'http://localhost:11434',
    model: process.env.OLLAMA_MODEL || 'llama3.2:3b',
});

// Inyectar Ollama en WhatsApp para respuestas automáticas
whatsappService.setOllamaService(ollamaService);

const documentService = new DocumentService();
const vectorStore = new VectorStoreService();
const institutionalContext = new InstitutionalContextService();
const documentContext = new DocumentContextService(documentService);

// Inyectar contexto de documentos en WhatsApp para respuestas basadas en datos del servidor
whatsappService.setDocumentContext(documentContext);
whatsappService.setInstitutionalContext(institutionalContext);
whatsappService.setVectorStore(vectorStore);
whatsappService.setDocumentService(documentService);

// Hacer servicios disponibles en req
app.use((req, res, next) => {
    req.services = {
        ollama: ollamaService,
        documents: documentService,
        vectorStore: vectorStore,
        documentContext: documentContext,
    };
    next();
});

// Logging middleware
app.use((req, res, next) => {
    logger.info(`${req.method} ${req.path}`);
    next();
});

// Health check
app.get('/api/health', async (req, res) => {
    try {
        // Verificar Ollama
        const models = await ollamaService.listModels();

        res.json({
            status: 'ok',
            timestamp: new Date().toISOString(),
            services: {
                ollama: {
                    status: 'connected',
                    models: models.map(m => m.name),
                },
                documents: 'ready',
                vectorStore: 'ready',
            },
        });
    } catch (error) {
        res.json({
            status: 'partial',
            timestamp: new Date().toISOString(),
            services: {
                ollama: {
                    status: 'disconnected',
                    error: error.message,
                },
                documents: 'ready',
                vectorStore: 'ready',
            },
        });
    }
});

// Estado del servidor
app.get('/api/status', async (req, res) => {
    try {
        const stats = await documentService.getStorageStats();
        const vectorStats = await vectorStore.getStats();

        res.json({
            status: 'running',
            uptime: process.uptime(),
            memory: process.memoryUsage(),
            storage: stats,
            vectorStore: vectorStats,
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Rutas API
app.use('/api/documents', documentsRouter);
app.use('/api/analysis', analysisRouter);
app.use('/api/generate', generationRouter);
app.use('/api/auth', authRouter);
app.use('/api/whatsapp', whatsappRouter);
app.use('/api/admin', adminRouter);

// Chat endpoint principal
app.post('/api/chat', async (req, res) => {
    try {
        const { message, context = [], useDocuments = true, transientContext = '' } = req.body;

        if (!message) {
            return res.status(400).json({ error: 'Mensaje requerido' });
        }

        let enrichedContext = '';

        // === CAPA 1: Contexto institucional (scraping) ===
        try {
            enrichedContext = await institutionalContext.getContextForPromptAsync(message);
        } catch (contextError) {
            logger.warn('Error obteniendo contexto institucional, usando cache básico', contextError.message);
            if (institutionalContext.hasContent()) {
                enrichedContext = institutionalContext.getContextForPrompt(message);
            }
        }

        // === CAPA 2: Búsqueda semántica en vectorStore ===
        // === GESTIÓN DE DOCUMENTOS (Layer 2 & 3) ===
        if (useDocuments) {
            try {
                const searchResults = await vectorStore.searchSimilar(message, { limit: 3 });
                if (searchResults.length > 0) {
                    enrichedContext += '\n\nCONTEXTO DE DOCUMENTOS (búsqueda semántica):\n' +
                        searchResults.map(r => `[${r.title}]: ${r.content}`).join('\n\n');
                }
            } catch (e) {
                logger.warn('Error en búsqueda semántica:', e.message);
            }
        }

        try {
            const docCtx = await documentContext.buildDocumentContext(message);
            if (docCtx) {
                enrichedContext += docCtx;
            }

            const relevantContent = await documentContext.getRelevantDocumentContent(message);
            if (relevantContent) {
                enrichedContext += '\n\nCONTENIDO RELEVANTE DE DOCUMENTOS:\n' + relevantContent;
            }
            if (transientContext) {
                enrichedContext += '\n\nCONTEXTO DE DOCUMENTOS ADJUNTOS (TRANSITORIOS):\n' + transientContext;
            }
        } catch (docError) {
            logger.warn('Error obteniendo contexto de documentos:', docError.message);
        }

        // ── Detección temprana de formato para personalizar el prompt ──────
        const lowerMsg = message.toLowerCase();
        const wantsPPT = lowerMsg.includes('present') || lowerMsg.includes('ppt') || lowerMsg.includes('diap');
        const wantsXLSX = lowerMsg.includes('excel') || lowerMsg.includes('xlsx') || lowerMsg.includes('hoja de calculo');
        const wantsDOCX = (lowerMsg.includes('word') || lowerMsg.includes('docx')) && !wantsPPT;
        const wantsPDF = !wantsPPT && !wantsXLSX && !wantsDOCX;

        const triggerWords = ['crea', 'genera', 'haz', 'escribe', 'create', 'generate', 'descargar', 'bajame', 'pasame', 'producir', 'elaborar', 'redacta', 'enviame', 'basado en', 'refierete', 'hazme', 'generame', 'ponme'];
        const formatWords = ['pdf', 'excel', 'xlsx', 'word', 'doc', 'docx', 'presentacion', 'diapositiva', 'ppt', 'pptx', 'archivo', 'silabo', 'reporte', 'hoja de calculo', 'resumen', 'carta', 'oficio', 'resolucion', 'informe'];
        const genPhrases = ['generame un', 'crear un', 'haz un', 'genera un', 'crea un', 'puedes generar', 'podrias crear', 'necesito un', 'redacta un', 'elabora un', 'hazme un', 'escribe un', 'ponme un', 'generame una', 'crea una', 'haz una'];

        const hasTrigger = triggerWords.some(w => lowerMsg.includes(w));
        const hasFormat = formatWords.some(w => lowerMsg.includes(w));
        const hasGenPhrase = genPhrases.some(p => lowerMsg.includes(p));
        const isGenRequest = (hasTrigger && hasFormat) || hasGenPhrase ||
            (lowerMsg.includes('basado en') && hasTrigger) ||
            (lowerMsg.includes('pdf') && (lowerMsg.includes('silabo') || lowerMsg.includes('reporte')));

        // ── Sistema prompt adaptado según tipo de documento solicitado ────
        let formatInstructions = '';
        if (isGenRequest && wantsPPT) {
            formatInstructions = `
El usuario quiere una PRESENTACIÓN. Genera el contenido completo y detallado con esta estructura:

Para cada diapositiva usa este formato exacto:
SLIDE: [Título de la diapositiva]
- [punto 1 claro y conciso]
- [punto 2 claro y conciso]
- [punto 3 claro y conciso]

Genera entre 8 y 12 slides. Incluye: portada, introducción, secciones principales, conclusiones.
NO uses asteriscos (**) ni almohadillas (##). Solo el formato SLIDE: y guiones (-).`;
        } else if (isGenRequest) {
            formatInstructions = `
El usuario quiere un DOCUMENTO. Genera el contenido completo usando esta estructura:
- Usa # para el título principal
- Usa ## para secciones
- Usa ### para subsecciones  
- Usa - para listas de items
- Usa | Col1 | Col2 | para tablas
- Usa --- para separadores entre secciones
Sé muy detallado y completo. NO uses **asteriscos** en el texto normal.`;
        } else {
            formatInstructions = `
Responde en texto natural y limpio:
- Sin asteriscos (**) ni almohadillas (#)
- Párrafos cortos separados por línea en blanco
- Si listas cosas, usa números (1. 2. 3.) o guiones simples
- Tono profesional y conversacional`;
        }

        // === PROMPT DEL SISTEMA ===
        const messages = [
            {
                role: 'system',
                content: `Eres el asistente virtual oficial de la FIIS (Facultad de Ingeniería en Informática y Sistemas) de la UNAS. Ayudas a académicos, docentes y alumnos de forma profesional.

${formatInstructions}

REGLA CRÍTICA DE ACCESO A INFORMACIÓN:
- Tienes acceso TOTAL a la información institucional proporcionada abajo, la cual es VERÍDICA y ACTUALIZADA.
- NUNCA digas "no tengo acceso", "no puedo ver comunicados" o frases similares. Usa siempre la información del contexto.
- BÚSQUEDA DE NOMBRES: Si el usuario pregunta por autoridades (Decano, Director, etc.), busca meticulosamente en el CONTEXTO INSTITUCIONAL. Los nombres suelen aparecer junto a sus cargos.
- Si generas un documento (PDF/Word/PPT), el contenido debe ser ÚTIL y RELEVANTE basándote en la información disponible.
- COMIENZO DIRECTO: Cuando el usuario pide un archivo, COMIENZA DIRECTAMENTE con el contenido formateado.

OTRAS REGLAS:
- NUNCA uses etiquetas como <invoke>, <create_file> o <call_function>. El sistema genera el archivo automáticamente a partir de tu texto.

CONTEXTO INSTITUCIONAL:
${enrichedContext}`,
            },
            ...context,
            { role: 'user', content: message },
        ];

        // ── 1. Obtener respuesta de la IA ────────────────────────────────
        let assistantResponse = await ollamaService.chat(messages);

        // ── 2. Limpiar etiquetas de razonamiento y agent ─────────────────
        let cleanContent = assistantResponse
            .replace(/<think>[\s\S]*?<\/think>/gi, '')
            .replace(/<think>[\s\S]*/gi, '')
            .replace(/[\s\S]*?<\/think>/gi, '')
            .replace(/<invoke[\s\S]*?>/gi, '')
            .replace(/<\/invoke>/gi, '')
            .replace(/<parameter[\s\S]*?>/gi, '')
            .replace(/<\/parameter>/gi, '')
            .trim();

        // ── 3. Convertir Markdown → texto limpio para el CHAT ────────────
        //    (cleanContent con formato se preserva para generar archivos)
        const markdownToChat = (text) => text
            // Bloques de código: conservar contenido sin backticks
            .replace(/```[\w]*\n?([\s\S]*?)```/g, '$1')
            // Encabezados → texto en mayúsculas con separación
            .replace(/^#{1,6}\s+(.+)$/gm, (_, t) => `\n${t.toUpperCase()}\n`)
            // Negrita e itálica → sin marcas
            .replace(/\*\*\*(.+?)\*\*\*/g, '$1')
            .replace(/\*\*(.+?)\*\*/g, '$1')
            .replace(/__(.+?)__/g, '$1')
            .replace(/\*([^*\n]+)\*/g, '$1')
            .replace(/_([^_\n]+)_/g, '$1')
            .replace(/~~(.+?)~~/g, '$1')
            // Listas: bullet limpio con espacio correcto
            .replace(/^[ \t]*[-*+]\s+/gm, '• ')
            // Listas numeradas: conservar número
            .replace(/^[ \t]*(\d+)\.\s+/gm, '$1. ')
            // Tablas: fila separadora eliminada, celdas unidas con ·
            .replace(/^\|[-:| ]+\|$/gm, '')
            .replace(/^\|(.+)\|$/gm, (_, cells) =>
                cells.split('|').map(c => c.trim()).filter(Boolean).join('  ·  ')
            )
            // Links → solo texto
            .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
            // Separadores --- → salto limpio
            .replace(/^[-_*]{3,}$/gm, '')
            // Backtick inline
            .replace(/`([^`]+)`/g, '$1')
            // Blockquotes
            .replace(/^>\s*/gm, '')
            // Limpiar formato SLIDE: del texto del chat (viene de PPT)
            .replace(/^SLIDE:\s*/gm, '')
            // Máximo 2 líneas en blanco consecutivas
            .replace(/\n{3,}/g, '\n\n')
            .trim();

        const chatResponse = markdownToChat(cleanContent);

        // ── 4. Generación de archivos ────────────────────────────────────
        logger.info('Detección de intención', { isGenRequest, wantsPPT, wantsXLSX, wantsDOCX });

        let generatedFile = null;

        if (isGenRequest) {
            try {
                const META = {
                    institution: 'FIIS · UNAS',
                    department: 'Facultad de Ingeniería en Informática y Sistemas',
                    date: new Date().toLocaleDateString('es-PE'),
                };

                // ── EXCEL ────────────────────────────────────────────────
                if (wantsXLSX) {
                    const excelPrompt = `Eres un extractor de datos. Convierte el siguiente texto en JSON para Excel.
Responde SOLO con el JSON, sin texto adicional, sin backticks, sin explicaciones.
Estructura exacta: {"title":"Título","sheetName":"Hoja","headers":["Col1","Col2"],"rows":[["v1","v2"]]}
Extrae TODOS los datos tabulables (listas, comparaciones, estadísticas).

Texto:
${cleanContent}`;
                    let jsonRaw = await ollamaService.generate(excelPrompt, { temperature: 0.05 });
                    let jsonStr = jsonRaw
                        .replace(/<think>[\s\S]*?<\/think>/gi, '')
                        .replace(/```[\w]*\n?/g, '').replace(/```/g, '')
                        .match(/\{[\s\S]*\}/)?.[0];
                    try {
                        const excelData = JSON.parse(jsonStr);
                        const r = await documentService.generateExcel(excelData);
                        generatedFile = { fileName: r.fileName, path: r.path, format: 'xlsx' };
                    } catch {
                        const r = await documentService.generatePDF('Reporte Académico', cleanContent, null, META);
                        generatedFile = { fileName: r.fileName, path: r.path, format: 'pdf', note: 'Excel simplificado a PDF' };
                    }

                    // ── POWERPOINT ───────────────────────────────────────────
                } else if (wantsPPT) {
                    // Parsear el formato SLIDE: que el LLM genera
                    const parseSlidesFromText = (text) => {
                        const slideBlocks = text.split(/^SLIDE:\s*/m).filter(Boolean);
                        return slideBlocks.map(block => {
                            const lines = block.trim().split('\n').filter(Boolean);
                            const title = lines[0].trim();
                            const bullets = lines.slice(1)
                                .map(l => l.replace(/^[-•*]\s*/, '').trim())
                                .filter(Boolean);
                            return { title, bullets };
                        });
                    };

                    // Intentar con JSON primero, luego con parseo de texto
                    const pptPrompt = `Eres un diseñador de presentaciones. Convierte este contenido en JSON para PowerPoint.
Responde SOLO con el JSON, sin texto adicional, sin backticks.
Estructura exacta:
{
  "title": "Título principal",
  "subtitle": "Subtítulo o descripción",
  "meta": {"institution": "FIIS · UNAS", "department": "Facultad de Ingeniería en Informática y Sistemas", "date": "${META.date}"},
  "slides": [
    {"title": "Título slide", "bullets": ["punto 1", "punto 2", "punto 3"]},
    {"title": "Slide con tabla", "layout": "table", "table": {"headers": ["Col1","Col2"], "rows": [["v1","v2"]]}}
  ]
}
Crea 8-10 slides con contenido real y detallado. Empieza con introducción, termina con conclusiones.

Contenido:
${cleanContent}`;

                    let jsonRaw = await ollamaService.generate(pptPrompt, { temperature: 0.05 });
                    let jsonStr = jsonRaw
                        .replace(/<think>[\s\S]*?<\/think>/gi, '')
                        .replace(/```[\w]*\n?/g, '').replace(/```/g, '')
                        .match(/\{[\s\S]*\}/)?.[0];

                    let pptData = null;
                    try {
                        pptData = JSON.parse(jsonStr);
                        // Normalizar: algunos modelos usan bulletPoints en lugar de bullets
                        if (pptData.slides) {
                            pptData.slides = pptData.slides.map(s => ({
                                ...s,
                                bullets: s.bullets || s.bulletPoints || s.points || [],
                            }));
                        }
                    } catch {
                        // Fallback: parsear el texto con formato SLIDE:
                        logger.warn('JSON PPT inválido, usando parseo de texto SLIDE:');
                        const parsedSlides = parseSlidesFromText(cleanContent);
                        if (parsedSlides.length > 0) {
                            pptData = {
                                title: parsedSlides[0]?.title || 'Presentación Académica',
                                subtitle: 'FIIS · UNAS',
                                meta: META,
                                slides: parsedSlides.slice(1), // primera es portada
                            };
                        }
                    }

                    if (pptData) {
                        if (!pptData.meta) pptData.meta = META;
                        pptData.meta.institution = pptData.meta.institution || META.institution;
                        pptData.meta.date = pptData.meta.date || META.date;
                        const r = await documentService.generatePPT(pptData);
                        generatedFile = { fileName: r.fileName, path: r.path, format: 'pptx' };
                    } else {
                        const r = await documentService.generatePDF('Presentación Académica', cleanContent, null, META);
                        generatedFile = { fileName: r.fileName, path: r.path, format: 'pdf', note: 'PPT simplificado a PDF' };
                    }

                    // ── PDF ──────────────────────────────────────────────────
                } else if (wantsPDF) {
                    // Extraer título inteligente: 1. Header #, 2. Intención del usuario, 3. Primera línea larga, 4. Fallback
                    let firstTitle = cleanContent.match(/^#\s+(.+)$/m)?.[1];

                    if (!firstTitle || firstTitle.toLowerCase().includes('basado') || firstTitle.toLowerCase().includes('asistente')) {
                        // Si el título parece basura o no existe, intentar deducir de la consulta
                        if (lowerMsg.includes('noticia') || lowerMsg.includes('comunicado')) {
                            firstTitle = 'Últimas Noticias y Comunicados - UNAS';
                        } else if (lowerMsg.includes('silabo') || lowerMsg.includes('syllabus')) {
                            firstTitle = 'Sílabo Académico';
                        } else if (lowerMsg.includes('reporte') || lowerMsg.includes('informe')) {
                            firstTitle = 'Informe Administrativo Institucional';
                        }
                    }

                    if (!firstTitle) {
                        firstTitle = cleanContent.split('\n').find(l => l.trim().length > 5)?.trim().substring(0, 70) || 'Documento Académico';
                    }

                    const r = await documentService.generatePDF(firstTitle, cleanContent, null, META);
                    generatedFile = { fileName: r.fileName, path: r.path, format: 'pdf' };

                    // ── DOCX ─────────────────────────────────────────────────
                } else if (wantsDOCX) {
                    const docxItems = cleanContent.split('\n').filter(Boolean).map(line => {
                        if (line.startsWith('# ')) return { type: 'h1', text: line.slice(2).replace(/\*\*/g, '') };
                        if (line.startsWith('## ')) return { type: 'h2', text: line.slice(3).replace(/\*\*/g, '') };
                        if (line.startsWith('### ')) return { type: 'h3', text: line.slice(4).replace(/\*\*/g, '') };
                        if (/^[-*•]\s/.test(line)) return { type: 'bullet', text: line.replace(/^[-*•]\s+/, '').replace(/\*\*/g, '') };
                        if (/^\d+\.\s/.test(line)) return { type: 'number', text: line.replace(/^\d+\.\s/, '').replace(/\*\*/g, '') };
                        return { type: 'p', text: line.replace(/\*\*/g, '') };
                    });
                    const titleItem = docxItems.find(i => i.type === 'h1');
                    const outPath = path.join(process.cwd(), 'storage', 'generated', `doc_${Date.now()}.docx`);
                    await documentService.documentGenerator.createProfessionalDocx(outPath, {
                        title: titleItem?.text || 'Documento Académico',
                        content: docxItems.filter(i => i.type !== 'h1'),
                        meta: META,
                    });
                    generatedFile = { fileName: path.basename(outPath), path: outPath, format: 'docx' };
                }

                if (generatedFile) logger.info('Archivo generado:', generatedFile.fileName);
            } catch (genError) {
                logger.error('ERROR en generación de archivo:', genError);
            }
        }

        res.json({
            response: chatResponse,       // ← texto limpio para mostrar en el chat
            rawResponse: cleanContent,    // ← Markdown/estructurado por si el frontend lo necesita
            hasContext: enrichedContext.length > 0,
            generatedFile,
        });
    } catch (error) {
        logger.error('Error en chat', error);
        res.status(500).json({ error: error.message });
    }
});

// Chat streaming
app.post('/api/chat/stream', async (req, res) => {
    try {
        const { message, context = [] } = req.body;

        if (!message) {
            return res.status(400).json({ error: 'Mensaje requerido' });
        }

        res.setHeader('Content-Type', 'text/event-stream');
        res.setHeader('Cache-Control', 'no-cache');
        res.setHeader('Connection', 'keep-alive');

        const messages = [
            {
                role: 'system',
                content: `Eres el asistente virtual oficial de la FIIS (Facultad de Ingeniería en Informática y Sistemas) de la UNAS. Responde siempre en español de forma profesional y clara.

REGLAS DE FORMATO OBLIGATORIAS:
- Escribe en texto limpio y natural, como si hablaras con una persona.
- NUNCA uses asteriscos (**texto**) ni almohadillas (# ## ###).
- NUNCA uses guiones para listas si puedes expresarlo en prosa.
- Si listas cosas, usa: "1. primero, 2. segundo" o bullets con "• ".
- Párrafos cortos separados por línea en blanco.
- Tono profesional pero conversacional.`,
            },
            ...context,
            { role: 'user', content: message },
        ];

        // Buffer acumulador para limpiar Markdown en streaming
        let buffer = '';
        const mdCleanRegex = [
            [/\*\*\*(.+?)\*\*\*/g, '$1'],
            [/\*\*(.+?)\*\*/g, '$1'],
            [/__(.+?)__/g, '$1'],
            [/\*([^*\n]+)\*/g, '$1'],
            [/^#{1,6}\s+/gm, ''],
            [/^[-*+]\s+/gm, '• '],
            [/`([^`]+)`/g, '$1'],
        ];

        const cleanChunk = (chunk) => {
            let c = chunk;
            for (const [re, rep] of mdCleanRegex) c = c.replace(re, rep);
            return c;
        };

        for await (const chunk of ollamaService.generateStream(message, { messages })) {
            // Filtrar chunks de razonamiento
            buffer += chunk;
            if (buffer.includes('<think>')) {
                // Si hay un bloque think sin cerrar, no enviar aún
                if (!buffer.includes('</think>')) continue;
                buffer = buffer.replace(/<think>[\s\S]*?<\/think>/g, '');
            }
            const cleanedChunk = cleanChunk(chunk);
            if (cleanedChunk) {
                res.write(`data: ${JSON.stringify({ content: cleanedChunk })}\n\n`);
            }
        }

        res.write('data: [DONE]\n\n');
        res.end();
    } catch (error) {
        logger.error('Error en streaming', error);
        res.write(`data: ${JSON.stringify({ error: error.message })}\n\n`);
        res.end();
    }
});

// Búsqueda semántica
app.post('/api/search', async (req, res) => {
    try {
        const { query, type = 'all', limit = 5 } = req.body;

        if (!query) {
            return res.status(400).json({ error: 'Query requerido' });
        }

        const results = await vectorStore.searchSimilar(query, { type, limit });

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

// Endpoint para cambiar configuración de IA (Local vs Cloud)
app.post('/api/settings/ai', async (req, res) => {
    try {
        const { mode, cloudConfig } = req.body;

        if (!mode || !['local', 'cloud'].includes(mode)) {
            return res.status(400).json({ error: 'Modo inválido. Debe ser "local" o "cloud".' });
        }

        const status = ollamaService.switchMode(mode, cloudConfig);
        logger.info(`Modo de IA cambiado a: ${mode}`);

        res.json({
            success: true,
            status
        });
    } catch (error) {
        logger.error('Error al cambiar modo de IA', error);
        res.status(500).json({ error: error.message });
    }
});

// Endpoint para hacer scraping de URLs institucionales
app.post('/api/scrape', async (req, res) => {
    try {
        logger.info('Iniciando scraping de URLs institucionales...');
        res.json({ status: 'started', message: 'Scraping iniciado. Puede tomar varios minutos.' });

        // Ejecutar en background
        institutionalContext.scrapeAllUrls()
            .then(() => logger.info('Scraping completado'))
            .catch(e => logger.error('Error en scraping', e));
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Obtener estado del contexto institucional
app.get('/api/context/status', (req, res) => {
    res.json({
        hasContent: institutionalContext.hasContent(),
        pageCount: institutionalContext.cache.size,
    });
});

// Error handler
app.use((err, req, res, next) => {
    logger.error('Error no manejado', err);
    res.status(500).json({
        error: 'Error interno del servidor',
        message: err.message,
    });
});

// 404 handler
app.use((req, res) => {
    res.status(404).json({ error: 'Endpoint no encontrado' });
});

// Función para auto-indexar documentos en el vectorStore
const autoIndexDocuments = async () => {
    try {
        // Verificar si Ollama está disponible para embeddings
        const ollamaReady = await ollamaService.checkModel().catch(() => false);
        if (!ollamaReady) {
            logger.info('⚠️ Ollama no disponible - omitiendo auto-indexación de documentos.');
            logger.info('📝 Los documentos seguirán disponibles vía consulta directa al sistema de archivos.');
            return;
        }

        if (!vectorStore.available) {
            logger.info('⚠️ VectorStore no disponible - omitiendo auto-indexación.');
            return;
        }

        const allDocs = await documentService.scanAllDocuments();
        if (allDocs.length === 0) {
            logger.info('No hay documentos para indexar');
            return;
        }

        logger.info(`📄 Auto-indexando ${allDocs.length} documento(s) en VectorStore (${vectorStore.getMode()})...`);
        let indexed = 0;
        let errors = 0;

        for (const doc of allDocs) {
            try {
                const processed = await documentService.processDocument(doc.path);
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
                logger.warn(`Error al indexar ${doc.name}: ${e.message}`);
            }
        }

        logger.info(`✅ Indexación completa: ${indexed} documentos indexados, ${errors} errores`);
    } catch (error) {
        logger.warn('Error durante auto-indexación:', error.message);
    }
};

// Iniciar servidor
const startServer = async () => {
    try {
        // Inicializar servicios
        await documentService.initialize();
        logger.info('DocumentService inicializado');

        // VectorStore (híbrido: ChromaDB o memoria)
        try {
            await vectorStore.initialize();
            logger.info(`VectorStore inicializado (modo: ${vectorStore.getMode()})`);
        } catch (vectorError) {
            logger.warn('VectorStore no disponible - continuando sin búsqueda semántica');
        }

        // Inicializar contexto institucional
        await institutionalContext.initialize();
        logger.info('InstitutionalContext inicializado');

        if (!institutionalContext.hasContent()) {
            logger.info('No hay cache de información institucional. Se realizará scraping automáticamente.');
        } else {
            logger.info(`Cache institucional: ${institutionalContext.cache.size} páginas`);
        }

        // Verificar Ollama
        try {
            await ollamaService.checkModel();
            logger.info('Ollama conectado');
        } catch (error) {
            logger.warn('Ollama no disponible:', error.message);
        }

        // Inyectar Ollama service en WhatsApp service
        whatsappService.setOllamaService(ollamaService);
        logger.info('WhatsApp service configurado con Ollama');

        app.listen(PORT, '0.0.0.0', () => {
            logger.info(`🚀 API Server corriendo en http://localhost:${PORT}`);
            logger.info(`📚 Documentación: http://localhost:${PORT}/api/health`);
        });

        // Auto-indexar documentos en background (no bloquea el inicio)
        autoIndexDocuments().catch(e => logger.warn('Auto-indexación falló:', e.message));
    } catch (error) {
        logger.error('Error al iniciar servidor', error);
        process.exit(1);
    }
};

startServer();

export default app;