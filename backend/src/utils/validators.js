import { z } from 'zod';

/**
 * Esquemas de validación con Zod
 */

// Validación de documento para subir
export const uploadDocumentSchema = z.object({
    type: z.enum(['silabo', 'resolucion', 'informe', 'reglamento', 'general']).optional().default('general'),
});

// Validación para búsqueda
export const searchSchema = z.object({
    query: z.string().min(1, 'Query es requerido'),
    type: z.enum(['silabo', 'resolucion', 'informe', 'reglamento', 'all']).optional().default('all'),
    limit: z.number().min(1).max(50).optional().default(5),
});

// Validación para generar sílabo
export const syllabusSchema = z.object({
    course_code: z.string().min(1, 'Código de curso requerido'),
    course_name: z.string().min(1, 'Nombre de curso requerido'),
    professor: z.string().min(1, 'Profesor requerido'),
    semester: z.string().min(1, 'Semestre requerido'),
    credits: z.number().optional(),
    prerequisites: z.array(z.string()).optional(),
    description: z.string().optional(),
});

// Validación para generar resolución
export const resolutionSchema = z.object({
    type: z.enum(['directoral', 'decanal', 'rectoral']).default('directoral'),
    subject: z.string().min(1, 'Asunto requerido'),
    considerations: z.string().optional(),
    article1: z.string().optional(),
    additionalArticles: z.array(z.string()).optional(),
    date: z.string().optional(),
});

// Validación para análisis de documento
export const analysisSchema = z.object({
    documentPath: z.string().min(1, 'Ruta de documento requerida'),
    analysisType: z.enum(['summary', 'key_points', 'compliance', 'full']).optional().default('summary'),
});

// Validación para chat
export const chatSchema = z.object({
    message: z.string().min(1, 'Mensaje requerido'),
    context: z.array(z.object({
        role: z.enum(['user', 'assistant', 'system']),
        content: z.string(),
    })).optional().default([]),
    useDocuments: z.boolean().optional().default(true),
});

// Validación para generación personalizada
export const generateSchema = z.object({
    prompt: z.string().min(1, 'Prompt requerido'),
    options: z.object({
        temperature: z.number().min(0).max(2).optional(),
        maxTokens: z.number().min(1).max(8192).optional(),
    }).optional(),
});

/**
 * Validar datos contra esquema
 * @param {z.ZodSchema} schema - Esquema de validación
 * @param {any} data - Datos a validar
 * @returns {{ success: boolean, data?: any, error?: string }}
 */
export const validate = (schema, data) => {
    try {
        const result = schema.parse(data);
        return { success: true, data: result };
    } catch (error) {
        if (error instanceof z.ZodError) {
            const messages = error.errors.map(e => `${e.path.join('.')}: ${e.message}`);
            return { success: false, error: messages.join('; ') };
        }
        return { success: false, error: 'Error de validación' };
    }
};

/**
 * Middleware de validación Express
 * @param {z.ZodSchema} schema - Esquema de validación
 * @param {string} source - Fuente de datos ('body', 'query', 'params')
 */
export const validateMiddleware = (schema, source = 'body') => {
    return (req, res, next) => {
        const data = req[source];
        const result = validate(schema, data);

        if (!result.success) {
            return res.status(400).json({ error: result.error });
        }

        req[source] = result.data;
        next();
    };
};

/**
 * Validaciones simples
 */
export const isValidEmail = (email) => {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
};

export const isValidUrl = (url) => {
    try {
        new URL(url);
        return true;
    } catch {
        return false;
    }
};

export const isValidFilePath = (filePath) => {
    return typeof filePath === 'string' && filePath.length > 0 && !filePath.includes('\0');
};

export const sanitizeFilename = (filename) => {
    return filename.replace(/[<>:"/\\|?*\x00-\x1f]/g, '_');
};

export default {
    uploadDocumentSchema,
    searchSchema,
    syllabusSchema,
    resolutionSchema,
    analysisSchema,
    chatSchema,
    generateSchema,
    validate,
    validateMiddleware,
    isValidEmail,
    isValidUrl,
    isValidFilePath,
    sanitizeFilename,
};
