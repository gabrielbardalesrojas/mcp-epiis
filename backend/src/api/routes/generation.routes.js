import express from 'express';
import fs from 'fs/promises';
import path from 'path';
import { Logger } from '../../utils/logger.js';

const router = express.Router();
const logger = new Logger('GenerationRoutes');

/**
 * POST /api/generate/syllabus
 * Generar sílabo académico
 */
router.post('/syllabus', async (req, res) => {
    try {
        const {
            course_code,
            course_name,
            professor,
            semester,
            credits,
            prerequisites,
            description,
        } = req.body;

        const { ollama, documents } = req.services;

        if (!course_code || !course_name || !professor || !semester) {
            return res.status(400).json({
                error: 'Campos requeridos: course_code, course_name, professor, semester',
            });
        }

        // Generar contenido con Llama
        const content = await ollama.generateAcademicContent('syllabus', {
            course_code,
            course_name,
            professor,
            semester,
            credits,
            prerequisites,
            description,
        });

        // Generar documento
        const result = await documents.generateSyllabus({
            course_code,
            course_name,
            professor,
            semester,
            content,
        });

        res.json({
            success: true,
            content,
            documentPath: result.path,
        });
    } catch (error) {
        logger.error('Error al generar sílabo', error);
        res.status(500).json({ error: error.message });
    }
});

/**
 * POST /api/generate/resolution
 * Generar resolución administrativa
 */
router.post('/resolution', async (req, res) => {
    try {
        const {
            type = 'directoral',
            subject,
            considerations,
            article1,
            additionalArticles,
            date,
        } = req.body;

        const { ollama, documents } = req.services;

        if (!subject) {
            return res.status(400).json({ error: 'subject es requerido' });
        }

        // Generar contenido
        const content = await ollama.generateAcademicContent('resolution', {
            type,
            subject,
            considerations,
            article1,
            additionalArticles,
            date,
        });

        // Generar documento
        const result = await documents.generateResolution({
            type,
            subject,
            content,
            date,
        });

        res.json({
            success: true,
            content,
            documentPath: result.path,
        });
    } catch (error) {
        logger.error('Error al generar resolución', error);
        res.status(500).json({ error: error.message });
    }
});

/**
 * GET /api/generate/download/:fileName
 * Descargar un documento generado
 */
router.get('/download/:fileName', async (req, res) => {
    try {
        const { fileName } = req.params;
        const filePath = path.join(process.cwd(), 'storage', 'generated', fileName);

        await fs.access(filePath);
        res.download(filePath);
    } catch (error) {
        logger.error('Error al descargar documento', error);
        res.status(404).json({ error: 'Archivo no encontrado' });
    }
});

/**
 * POST /api/generate
 * Endpoint unificado para generación de documentos con contexto opcional
 */
router.post('/', async (req, res) => {
    try {
        const {
            type, // syllabus, resolution, report, letter, custom, excel, ppt
            data,
            outputFormat = 'pdf', // pdf, docx, xlsx, pptx
            useReferenceDocs = false,
            referenceQuery = ''
        } = req.body;

        const { ollama, documents, vectorStore } = req.services;

        if (!type || !data) {
            return res.status(400).json({ error: 'type y data son requeridos' });
        }

        let enrichedContext = '';
        if (useReferenceDocs) {
            try {
                const query = referenceQuery || (typeof data === 'string' ? data : JSON.stringify(data));
                const searchResults = await vectorStore.searchSimilar(query, { limit: 3 });
                if (searchResults.length > 0) {
                    enrichedContext = '\n\nINFORMACIÓN DE REFERENCIA ENCONTRADA:\n' +
                        searchResults.map(r => `Documento: ${r.metadata?.title || 'Sin título'}\nContenido: ${r.content}`).join('\n---\n');
                }
            } catch (e) {
                logger.warn('Error al buscar documentos de referencia', e);
            }
        }

        // 1. Generar contenido con IA
        let content;
        if (type === 'custom') {
            content = await ollama.generate(`${data.prompt}${enrichedContext}`);
        } else if (type === 'excel') {
            const prompt = `Genera datos tabulares para un reporte de: ${data.subject || 'Datos generales'}. 
            ${enrichedContext ? `Usa este contexto: ${enrichedContext}` : ''}
            Responde ÚNICAMENTE con un JSON válido que tenga: { "title": "Título", "headers": ["H1", "H2"], "rows": [["V1", "V2"]] }`;
            const aiRes = await ollama.generate(prompt);
            try {
                // Extraer JSON de la respuesta
                const jsonStr = aiRes.match(/\{[\s\S]*\}/)?.[0] || aiRes;
                const excelData = JSON.parse(jsonStr);
                const result = await documents.generateExcel(excelData);
                return res.json({ success: true, fileName: result.fileName, documentPath: result.path });
            } catch (e) {
                logger.error('Error parseando datos para Excel', e);
                throw new Error('No se pudo generar el formato de datos para Excel');
            }
        } else if (type === 'ppt') {
            const prompt = `Crea una estructura de diapositivas para: ${data.topic}. 
            ${enrichedContext ? `Usa este contexto: ${enrichedContext}` : ''}
            Responde ÚNICAMENTE con un JSON válido: { "title": "Título Principal", "slides": [ { "title": "Slide 1", "bulletPoints": ["punto 1", "punto 2"] } ] }`;
            const aiRes = await ollama.generate(prompt);
            try {
                const jsonStr = aiRes.match(/\{[\s\S]*\}/)?.[0] || aiRes;
                const pptData = JSON.parse(jsonStr);
                const result = await documents.generatePPT(pptData);
                return res.json({ success: true, fileName: result.fileName, documentPath: result.path });
            } catch (e) {
                logger.error('Error parseando datos para PPT', e);
                throw new Error('No se pudo generar la estructura para la presentación');
            }
        } else {
            // Formatos estándar
            content = await ollama.generateAcademicContent(type, { ...data, extraContext: enrichedContext });
        }

        // 2. Crear archivo físico
        let result;
        if (outputFormat === 'pdf') {
            result = await documents.generatePDF(data.title || data.subject || 'Documento', content);
        } else if (outputFormat === 'docx') {
            if (type === 'syllabus') {
                result = await documents.generateSyllabus({ ...data, content });
            } else if (type === 'resolution') {
                result = await documents.generateResolution({ ...data, content });
            } else if (['thesis', 'research_project', 'article'].includes(type)) {
                result = await documents.generateAcademicDocument({
                    type,
                    title: data.title || data.subject || 'Documento Académico',
                    context: content,
                    student: data.student || data.practicante || '',
                    professor: data.professor || data.asesor || '',
                    date: data.date,
                });
            } else {
                result = await documents.documentGenerator.createProfessionalDocx(
                    path.join(process.cwd(), 'storage', 'generated', `doc_${Date.now()}.docx`),
                    { title: data.title || 'Documento', content }
                );
                // Ajustar para que devuelva el mismo formato
                if (typeof result === 'string') result = { path: result, fileName: path.basename(result) };
            }
        }

        res.json({
            success: true,
            content,
            fileName: result?.fileName,
            documentPath: result?.path,
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

/**
 * POST /api/generate/exam
 * Generar examen académico profesional
 */
router.post('/exam', async (req, res) => {
    try {
        const {
            topic,
            course,
            questionCount = 5,
            difficulty = 'intermedio',
            questionTypes = ['multiple_choice', 'true_false'],
            instructions,
            outputFormat = 'pdf',
            useReferenceDocs = true,
            documentPath,
            // Nuevos campos para formato universitario
            examType = 'EXAMEN PARCIAL',
            semester = `${new Date().getFullYear()}-I`,
            duration = '60',
            pointsPerQuestion = 2,
        } = req.body;

        const { ollama, documents, vectorStore } = req.services;

        if (!topic) {
            return res.status(400).json({ error: 'El tema es requerido' });
        }

        // 1. Obtener contexto
        let context = 'Conocimiento académico general.';

        // Prioridad 1: Documento específico proporcionado
        if (documentPath) {
            try {
                logger.info(`Extrayendo contenido de documento específico para examen: ${documentPath}`);
                const extractedText = await documents.extractContent(documentPath);
                if (extractedText) {
                    context = extractedText;
                }
            } catch (e) {
                logger.warn(`Error al extraer contenido de ${documentPath}`, e);
            }
        }
        // Prioridad 2: Búsqueda semántica si no hay documento específico y está habilitado
        else if (useReferenceDocs) {
            try {
                const searchResults = await vectorStore.searchSimilar(topic, { limit: 5 });
                if (searchResults.length > 0) {
                    context = searchResults.map(r => r.content).join('\n---\n');
                }
            } catch (e) {
                logger.warn('Error al obtener contexto para el examen vía búsqueda semántica', e);
            }
        }

        // 2. Generar JSON del examen con IA
        const examData = await ollama.generateExam({
            topic,
            course,
            context,
            questionCount,
            difficulty,
            questionTypes: Array.isArray(questionTypes) ? questionTypes.join(', ') : questionTypes,
            instructions,
            date: new Date().toLocaleDateString('es-PE'),
            examType,
            semester,
            duration: String(duration),
            pointsPerQuestion: Number(pointsPerQuestion) || 2,
        });

        // 3. Renderizar el documento
        const result = await documents.documentGenerator.generateExamDocument(examData, outputFormat);

        res.json({
            success: true,
            examData,
            fileName: result.fileName,
            documentPath: result.path
        });
    } catch (error) {
        logger.error('Error al generar examen', error);
        res.status(500).json({ error: error.message });
    }
});

export default router;
