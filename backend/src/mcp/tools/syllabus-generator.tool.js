/**
 * Herramienta MCP: Generador de Sílabos
 * Genera sílabos académicos completos
 */

export const syllabusGeneratorTool = {
    name: 'generate_syllabus',
    description: 'Generar un sílabo académico completo',

    inputSchema: {
        type: 'object',
        properties: {
            course_code: {
                type: 'string',
                description: 'Código del curso',
            },
            course_name: {
                type: 'string',
                description: 'Nombre del curso',
            },
            professor: {
                type: 'string',
                description: 'Nombre del docente',
            },
            semester: {
                type: 'string',
                description: 'Semestre académico',
            },
            credits: {
                type: 'number',
                description: 'Número de créditos',
                default: 4,
            },
            hours: {
                type: 'object',
                properties: {
                    theory: { type: 'number' },
                    practice: { type: 'number' },
                    lab: { type: 'number' },
                },
                description: 'Horas por tipo',
            },
        },
        required: ['course_code', 'course_name', 'professor', 'semester'],
    },

    /**
     * Generar sílabo
     * @param {object} args - Argumentos
     * @param {object} services - Servicios inyectados
     * @returns {Promise<object>}
     */
    async execute(args, services) {
        const {
            course_code,
            course_name,
            professor,
            semester,
            credits = 4,
            hours = { theory: 2, practice: 2, lab: 0 }
        } = args;

        const { ollamaService, documentService } = services;

        const prompt = `Genera un sílabo académico completo para:
Código: ${course_code}
Curso: ${course_name}
Docente: ${professor}
Semestre: ${semester}
Créditos: ${credits}
Horas: Teoría ${hours.theory}h, Práctica ${hours.practice}h, Lab ${hours.lab}h

El sílabo debe incluir:
1. Datos generales
2. Sumilla
3. Competencias del perfil de egreso
4. Capacidades
5. Contenido temático (16 semanas)
6. Metodología
7. Evaluación
8. Bibliografía`;

        const content = await ollamaService.generate(prompt);
        const result = await documentService.generateSyllabus({
            course_code,
            course_name,
            professor,
            semester,
            content,
        });

        return {
            course_code,
            course_name,
            content,
            document_path: result.path,
        };
    },
};

export default syllabusGeneratorTool;
