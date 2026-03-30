import DocumentGenerator from './src/services/document/document-generator.js';
import OllamaService from './src/services/llm/ollama.service.js';
import { DocumentService } from './src/services/document/document-service.js';
import path from 'path';
import fs from 'fs/promises';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

async function testExamFromDocDirect() {
    const ollama = new OllamaService();
    const documentService = new DocumentService();
    const generator = new DocumentGenerator({
        outputPath: path.join(__dirname, 'storage', 'generated')
    });

    const storageDir = path.join(__dirname, 'storage', 'temp');
    const testDocPath = path.join(storageDir, 'test-exam-source.txt');

    console.log("--- TEST DE GENERACIÓN DE EXAMEN DESDE DOCUMENTO (DIRECTO) ---");

    try {
        // 1. Crear documento de prueba
        await fs.mkdir(storageDir, { recursive: true });
        const sourceContent = `
        REGLAMENTO DE EVALUACIÓN DEL APRENDIZAJE - FIIS UNAS
        
        Artículo 1: La evaluación es un proceso continuo e integral.
        Artículo 2: Los tipos de evaluación son: diagnóstica, formativa y sumativa.
        Artículo 3: La nota mínima aprobatoria es 11 (once).
        Artículo 4: El examen sustitutorio reemplaza la nota más baja de los exámenes parciales.
        `;
        await fs.writeFile(testDocPath, sourceContent);
        console.log(`Documento de prueba creado en: ${testDocPath}`);

        // 2. Extraer contenido (Simulando lo que hace la ruta)
        console.log("Extrayendo contenido del documento...");
        const context = await documentService.extractContent(testDocPath);
        console.log("Contenido extraído correctamente.");

        // 3. Generar JSON del examen con IA
        console.log("Generando JSON del examen con IA...");
        const examData = await ollama.generateExam({
            topic: "Reglamento de Evaluación",
            course: "Administración Académica",
            context,
            questionCount: 3,
            difficulty: "fácil",
            questionTypes: "opción múltiple, abierta",
            instructions: "Responda según el reglamento."
        });
        console.log("JSON generado correctamente.");

        // 4. Renderizar el documento
        console.log("Renderizando documento PDF...");
        const resultPdf = await generator.generateExamDocument(examData, 'pdf');
        console.log("PDF generado en:", resultPdf.path);

        console.log("\n--- TEST FINALIZADO CON ÉXITO ---");
    } catch (error) {
        console.error("Error durante la prueba:", error);
    }
}

testExamFromDocDirect();
