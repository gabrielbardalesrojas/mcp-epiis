import DocumentGenerator from './src/services/document/document-generator.js';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

async function test() {
    const generator = new DocumentGenerator({
        outputPath: path.join(__dirname, 'storage', 'generated')
    });

    const title = "TEST DE INFORME TÉCNICO";
    const content = `# SECCIÓN 1
Esta es una prueba de contenido con saltos de línea.
Debería aparecer en múltiples párrafos.

## SUBSECCIÓN 1.1
- Punto 1
- Punto 2

| Columna 1 | Columna 2 |
|-----------|-----------|
| Valor 1   | Valor 2   |
`;

    try {
        console.log("Generando PDF de prueba...");
        const result = await generator.generatePDF(title, content, null, {
            institution: "UNAS - FIIS",
            department: "EPIIS",
            date: "10/03/2026",
            version: "1.0.0"
        });
        console.log("PDF generado exitosamente en:", result.path);
    } catch (error) {
        console.error("Error durante la prueba:", error);
    }
}

test();
