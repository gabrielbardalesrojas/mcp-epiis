#!/usr/bin/env node

/**
 * Script de Indexación de Documentos Académicos
 * EPIIS MCP Server - Universidad Nacional Agraria de la Selva
 *
 * Escanea storage/documents/, extrae texto de cada archivo,
 * genera embeddings y los indexa en VectorStore (ChromaDB o memoria).
 *
 * Uso:
 *   cd backend
 *   npm run index-docs
 *
 * También acepta argumentos opcionales:
 *   npm run index-docs -- --type silabos        (solo indexar sílabos)
 *   npm run index-docs -- --clear               (limpiar índice antes de indexar)
 */

import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

// Configurar directorio de trabajo
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const backendDir = path.join(__dirname, '..', 'backend');

// Cargar variables de entorno (busca en backend/ y en la raíz del proyecto)
dotenv.config({ path: path.join(backendDir, '.env') });
dotenv.config({ path: path.join(__dirname, '..', '.env') });

// Cambiar cwd al backend para que los servicios resuelvan rutas correctamente
process.chdir(backendDir);

import { DocumentService } from '../backend/src/services/document/document-service.js';
import { VectorStoreService } from '../backend/src/services/vector/vector-store.js';
import { Logger } from '../backend/src/utils/logger.js';

const logger = new Logger('IndexDocuments');

// ─────────────────────────────────────────────
// Colores para la consola
// ─────────────────────────────────────────────
const c = {
    reset: '\x1b[0m',
    green: '\x1b[32m',
    red: '\x1b[31m',
    yellow: '\x1b[33m',
    cyan: '\x1b[36m',
    bold: '\x1b[1m',
    dim: '\x1b[2m',
};

// ─────────────────────────────────────────────
// Parsear argumentos CLI
// ─────────────────────────────────────────────
function parseArgs() {
    const args = process.argv.slice(2);
    const options = {
        type: null,     // filtrar por tipo de documento
        clear: false,   // limpiar índice antes de indexar
    };

    for (let i = 0; i < args.length; i++) {
        if (args[i] === '--type' && args[i + 1]) {
            options.type = args[i + 1];
            i++;
        }
        if (args[i] === '--clear') {
            options.clear = true;
        }
    }

    return options;
}

// ─────────────────────────────────────────────
// Función principal de indexación
// ─────────────────────────────────────────────
async function indexDocuments() {
    const startTime = Date.now();
    const options = parseArgs();

    console.log(`\n${c.bold}${c.cyan}╔══════════════════════════════════════════════════╗${c.reset}`);
    console.log(`${c.bold}${c.cyan}║   📚 EPIIS MCP - Indexación de Documentos        ║${c.reset}`);
    console.log(`${c.bold}${c.cyan}║   Universidad Nacional Agraria de la Selva        ║${c.reset}`);
    console.log(`${c.bold}${c.cyan}╚══════════════════════════════════════════════════╝${c.reset}\n`);

    // 1. Inicializar servicios
    console.log(`${c.cyan}[1/5]${c.reset} Inicializando servicios...`);

    const documentService = new DocumentService();
    const vectorStore = new VectorStoreService();

    try {
        await documentService.initialize();
        console.log(`  ${c.green}✓${c.reset} DocumentService inicializado`);
    } catch (error) {
        console.error(`  ${c.red}✗${c.reset} Error al inicializar DocumentService:`, error.message);
        process.exit(1);
    }

    try {
        const vsReady = await vectorStore.initialize();
        if (!vsReady) {
            console.error(`  ${c.red}✗${c.reset} VectorStore no disponible. ¿Está Ollama corriendo?`);
            console.log(`\n  ${c.yellow}Tip:${c.reset} Asegúrate de que Ollama esté corriendo:`);
            console.log(`       ollama serve`);
            console.log(`       ollama pull nomic-embed-text\n`);
            process.exit(1);
        }
        console.log(`  ${c.green}✓${c.reset} VectorStore inicializado (modo: ${c.bold}${vectorStore.getMode()}${c.reset})`);
    } catch (error) {
        console.error(`  ${c.red}✗${c.reset} Error al inicializar VectorStore:`, error.message);
        process.exit(1);
    }

    // 2. Limpiar índice si se solicitó
    if (options.clear) {
        console.log(`\n${c.cyan}[2/5]${c.reset} Limpiando índice existente...`);
        try {
            await vectorStore.clearAll();
            console.log(`  ${c.green}✓${c.reset} Índice limpiado`);
        } catch (error) {
            console.error(`  ${c.yellow}⚠${c.reset} Error al limpiar índice:`, error.message);
        }
    } else {
        console.log(`\n${c.cyan}[2/5]${c.reset} Usando índice existente (usa --clear para reiniciar)`);
    }

    // 3. Escanear documentos
    console.log(`\n${c.cyan}[3/5]${c.reset} Escaneando documentos...`);

    let documents;
    if (options.type) {
        console.log(`  ${c.dim}Filtrado por tipo: ${options.type}${c.reset}`);
        documents = await documentService.listByType(options.type);
    } else {
        documents = await documentService.scanAllDocuments();
    }

    if (documents.length === 0) {
        console.log(`\n  ${c.yellow}⚠${c.reset} No se encontraron documentos para indexar.`);
        console.log(`\n  ${c.dim}Coloca archivos en las siguientes carpetas:${c.reset}`);
        console.log(`    storage/documents/silabos/`);
        console.log(`    storage/documents/resoluciones/`);
        console.log(`    storage/documents/informes/`);
        console.log(`    storage/documents/reglamentos/`);
        console.log(`    storage/documents/planes-estudio/`);
        console.log(`    storage/documents/general/`);
        console.log(`\n  ${c.dim}Formatos soportados: PDF, DOCX, XLSX, PPTX, TXT, MD${c.reset}\n`);
        process.exit(0);
    }

    // Resumen por tipo
    const countByType = {};
    for (const doc of documents) {
        const type = doc.type || 'unknown';
        countByType[type] = (countByType[type] || 0) + 1;
    }

    console.log(`  ${c.green}✓${c.reset} Encontrados ${c.bold}${documents.length}${c.reset} documentos:`);
    for (const [type, count] of Object.entries(countByType)) {
        console.log(`    📄 ${type}: ${count}`);
    }

    // 4. Procesar e indexar
    console.log(`\n${c.cyan}[4/5]${c.reset} Procesando e indexando documentos...\n`);

    let indexed = 0;
    let errors = 0;
    const errorList = [];

    for (let i = 0; i < documents.length; i++) {
        const doc = documents[i];
        const progress = `[${i + 1}/${documents.length}]`;

        try {
            // Extraer y procesar contenido
            const processed = await documentService.processDocument(doc.path);

            // Indexar en VectorStore
            await vectorStore.addDocument({
                id: processed.id,
                content: processed.content,
                metadata: processed.metadata,
            });

            indexed++;
            console.log(`  ${c.green}✓${c.reset} ${progress} ${doc.name} ${c.dim}(${doc.type})${c.reset}`);
        } catch (error) {
            errors++;
            errorList.push({ file: doc.name, error: error.message });
            console.log(`  ${c.red}✗${c.reset} ${progress} ${doc.name}: ${error.message}`);
            logger.error(`Error indexando ${doc.name}`, error);
        }
    }

    // 5. Resumen final
    const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);

    console.log(`\n${c.cyan}[5/5]${c.reset} Resumen de indexación\n`);
    console.log(`${c.bold}${c.cyan}╔══════════════════════════════════════════════════╗${c.reset}`);
    console.log(`${c.bold}${c.cyan}║   📊 RESULTADOS                                  ║${c.reset}`);
    console.log(`${c.bold}${c.cyan}╠══════════════════════════════════════════════════╣${c.reset}`);
    console.log(`${c.cyan}║${c.reset}   Documentos encontrados: ${c.bold}${documents.length}${c.reset}`);
    console.log(`${c.cyan}║${c.reset}   Indexados exitosamente: ${c.green}${c.bold}${indexed}${c.reset}`);

    if (errors > 0) {
        console.log(`${c.cyan}║${c.reset}   Errores:                ${c.red}${c.bold}${errors}${c.reset}`);
    }

    console.log(`${c.cyan}║${c.reset}   Modo VectorStore:       ${c.bold}${vectorStore.getMode()}${c.reset}`);
    console.log(`${c.cyan}║${c.reset}   Tiempo total:           ${c.bold}${elapsed}s${c.reset}`);
    console.log(`${c.bold}${c.cyan}╚══════════════════════════════════════════════════╝${c.reset}`);

    // Mostrar errores detallados si los hay
    if (errorList.length > 0) {
        console.log(`\n${c.yellow}⚠ Archivos con errores:${c.reset}`);
        for (const err of errorList) {
            console.log(`  - ${err.file}: ${err.error}`);
        }
    }

    // Estadísticas del VectorStore
    try {
        const stats = await vectorStore.getStats();
        console.log(`\n${c.dim}Estado del índice: ${stats.total} documentos totales en VectorStore${c.reset}`);
        if (stats.byType) {
            for (const [type, count] of Object.entries(stats.byType)) {
                if (count > 0) {
                    console.log(`${c.dim}  ${type}: ${count}${c.reset}`);
                }
            }
        }
    } catch (e) {
        // Ignorar errores de estadísticas
    }

    console.log(`\n${c.green}${c.bold}✅ Indexed ${indexed} documents successfully${c.reset}\n`);

    if (indexed > 0) {
        console.log(`${c.dim}Los documentos ahora están disponibles para búsqueda semántica.`);
        console.log(`Usa la herramienta MCP 'search_documents' para buscarlos.${c.reset}\n`);
    }

    process.exit(errors > 0 ? 1 : 0);
}

// ─────────────────────────────────────────────
// Ejecutar
// ─────────────────────────────────────────────
indexDocuments().catch((error) => {
    console.error(`\n${c.red}Error fatal durante la indexación:${c.reset}`, error.message);
    logger.error('Error fatal en indexación', error);
    process.exit(1);
});
