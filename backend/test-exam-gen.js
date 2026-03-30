import DocumentGenerator from './src/services/document/document-generator.js';
import OllamaService from './src/services/llm/ollama.service.js';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

async function testExam() {
    const ollama = new OllamaService();
    const generator = new DocumentGenerator({
        outputPath: path.join(__dirname, 'storage', 'generated')
    });

    console.log("--- TEST DE GENERACIÓN DE EXAMEN ---");

    const examSpecs = {
        topic: "Fundamentos de Base de Datos",
        course: "Base de Datos I",
        questionCount: 4,
        difficulty: "medio",
        questionTypes: "opción múltiple, abierta",
        context: "El modelo entidad-relación es una herramienta para el modelado de datos que permite representar las entidades y sus relaciones. SQL es el lenguaje estándar para interactuar con bases de datos relacionales.",
        instructions: "Lea atentamente cada pregunta antes de responder."
    };

    try {
        console.log("1. Generando JSON del examen con IA...");
        const examData = await ollama.generateExam(examSpecs);
        console.log("JSON generado correctamente.");
        console.log("Estructura de cabecera:", JSON.stringify(examData.header, null, 2));

        console.log("2. Renderizando documento PDF...");
        const resultPdf = await generator.generateExamDocument(examData, 'pdf');
        console.log("PDF generado en:", resultPdf.path);

        console.log("3. Renderizando documento DOCX...");
        const resultDocx = await generator.generateExamDocument(examData, 'docx');
        console.log("DOCX generado en:", resultDocx.path);

        console.log("\n--- TEST FINALIZADO CON ÉXITO ---");
    } catch (error) {
        console.error("Error durante la prueba de examen:", error);
    }
}

testExam();
