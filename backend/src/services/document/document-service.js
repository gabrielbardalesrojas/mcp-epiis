import fs from 'fs/promises';
import path from 'path';
import { PDFParser } from './pdf-parser.js';
import { DocxParser } from './docx-parser.js';
import { XlsxParser } from './xlsx-parser.js';
import { PptxParser } from './pptx-parser.js';
import { TextExtractor } from './text-extractor.js';
import { ChunkingService } from './chunking.service.js';
import { DocumentGenerator } from './document-generator.js';
import { Logger } from '../../utils/logger.js';

/**
 * Servicio principal de documentos
 * Orquesta el procesamiento, extracción y generación de documentos
 */
export class DocumentService {
    constructor(config = {}) {
        this.storagePath = config.storagePath || path.join(process.cwd(), 'storage', 'documents');
        this.dataPath = config.dataPath || path.join(process.cwd(), 'data');

        // Inicializar parsers
        this.pdfParser = new PDFParser();
        this.docxParser = new DocxParser();
        this.xlsxParser = new XlsxParser();
        this.pptxParser = new PptxParser();
        this.textExtractor = new TextExtractor();
        this.chunkingService = new ChunkingService();
        this.documentGenerator = new DocumentGenerator();

        this.logger = new Logger('DocumentService');

        // Tipos de documentos soportados
        this.documentTypes = {
            silabos: 'silabo',
            resoluciones: 'resolucion',
            informes: 'informe',
            reglamentos: 'reglamento',
            'planes-estudio': 'plan-estudio',
            general: 'general',
        };
    }

    /**
     * Inicializar estructura de directorios
     */
    async initialize() {
        try {
            // Crear directorios de storage
            const dirs = [
                this.storagePath,
                path.join(this.storagePath, 'silabos'),
                path.join(this.storagePath, 'resoluciones'),
                path.join(this.storagePath, 'informes'),
                path.join(this.storagePath, 'reglamentos'),
                path.join(this.storagePath, 'planes-estudio'),
                path.join(process.cwd(), 'storage', 'generated'),
                path.join(process.cwd(), 'storage', 'temp'),
                path.join(process.cwd(), 'storage', 'pending'),
                path.join(process.cwd(), 'storage', 'templates'),
            ];

            for (const dir of dirs) {
                await fs.mkdir(dir, { recursive: true });
            }

            // También crear directorio data si existe
            try {
                await fs.mkdir(this.dataPath, { recursive: true });
            } catch (e) {
                // Ignorar si ya existe
            }

            this.logger.info('Directorios inicializados');
        } catch (error) {
            this.logger.error('Error al inicializar directorios', error);
        }
    }

    /**
     * Extraer contenido de un documento
     * @param {string} documentPath - Ruta del documento
     * @returns {Promise<string>}
     */
    async extractContent(documentPath) {
        try {
            const ext = path.extname(documentPath).toLowerCase();
            this.logger.info(`Extrayendo contenido de: ${documentPath}`);

            let result;

            switch (ext) {
                case '.pdf':
                    result = await this.pdfParser.parse(documentPath);
                    return result.text;

                case '.docx':
                case '.doc':
                    result = await this.docxParser.parse(documentPath);
                    return result.text;

                case '.xlsx':
                case '.xls':
                    result = await this.xlsxParser.parse(documentPath);
                    return result.text;

                case '.pptx':
                case '.ppt':
                    result = await this.pptxParser.parse(documentPath);
                    return result.text;

                case '.txt':
                case '.md':
                    return await fs.readFile(documentPath, 'utf-8');

                default:
                    throw new Error(`Formato no soportado: ${ext}`);
            }
        } catch (error) {
            this.logger.error(`Error al extraer contenido: ${documentPath}`, error);
            throw error;
        }
    }

    /**
     * Procesar documento para indexación
     * @param {string} documentPath - Ruta del documento
     * @returns {Promise<{id: string, content: string, chunks: string[], metadata: object}>}
     */
    async processDocument(documentPath) {
        try {
            const content = await this.extractContent(documentPath);
            const chunks = this.chunkingService.chunk(content);

            const fileName = path.basename(documentPath);
            const ext = path.extname(documentPath);
            const stats = await fs.stat(documentPath);

            // Determinar tipo de documento
            const relativePath = path.relative(this.storagePath, documentPath);
            const folder = relativePath.split(path.sep)[0];
            const type = this.documentTypes[folder] || 'unknown';

            return {
                id: `doc_${Date.now()}_${fileName.replace(/[^a-zA-Z0-9]/g, '_')}`,
                content,
                chunks,
                metadata: {
                    title: fileName.replace(ext, ''),
                    fileName,
                    path: documentPath,
                    type,
                    size: stats.size,
                    created: stats.birthtime,
                    modified: stats.mtime,
                    format: ext.replace('.', ''),
                },
            };
        } catch (error) {
            this.logger.error(`Error al procesar documento: ${documentPath}`, error);
            throw error;
        }
    }

    /**
     * Listar documentos de forma recursiva en un directorio
     * @param {string} dirPath - Ruta del directorio a escanear
     * @param {string} baseType - Tipo base para los documentos encontrados
     * @returns {Promise<object[]>}
     */
    async scanDirectoryRecursive(dirPath, baseType = 'unknown') {
        let results = [];
        try {
            const list = await fs.readdir(dirPath);
            for (const file of list) {
                const filePath = path.join(dirPath, file);
                const stats = await fs.stat(filePath);
                if (stats.isDirectory()) {
                    // Determinar tipo si es una de las carpetas principales
                    const type = this.documentTypes[file] || baseType;
                    const res = await this.scanDirectoryRecursive(filePath, type);
                    results = results.concat(res);
                } else {
                    const ext = path.extname(file).toLowerCase();
                    const allowedExts = ['.pdf', '.docx', '.doc', '.xlsx', '.xls', '.pptx', '.ppt', '.txt', '.md'];

                    if (allowedExts.includes(ext)) {
                        results.push({
                            name: file,
                            path: filePath,
                            size: stats.size,
                            type: baseType,
                            created: stats.birthtime,
                            modified: stats.mtime,
                        });
                    }
                }
            }
        } catch (error) {
            this.logger.error(`Error escaneando directorio ${dirPath}:`, error);
        }
        return results;
    }

    /**
     * Listar documentos por tipo
     * @param {string} type - Tipo de documento
     * @returns {Promise<object[]>}
     */
    async listByType(type) {
        try {
            const folderMap = {
                syllabi: 'silabos',
                silabos: 'silabos',
                resolutions: 'resoluciones',
                resoluciones: 'resoluciones',
                reports: 'informes',
                informes: 'informes',
                regulations: 'reglamentos',
                reglamentos: 'reglamentos',
                general: 'general'
            };

            const folder = folderMap[type] || type;
            const folderPath = path.join(this.storagePath, folder);

            try {
                await fs.access(folderPath);
            } catch {
                return [];
            }

            return await this.scanDirectoryRecursive(folderPath, folder);
        } catch (error) {
            this.logger.error(`Error al listar documentos tipo ${type}`, error);
            return [];
        }
    }

    /**
     * Escanear todos los documentos disponibles
     * @returns {Promise<object[]>}
     */
    async scanAllDocuments() {
        try {
            await this.initialize();

            // Escanear almacenamiento principal
            const storageDocs = await this.scanDirectoryRecursive(this.storagePath, 'general');

            // Escanear carpeta data externa
            let dataDocs = [];
            try {
                await fs.access(this.dataPath);
                dataDocs = await this.scanDirectoryRecursive(this.dataPath, 'institutional');
            } catch (e) {
                // Folder data no existe, ignorar
            }

            const allDocuments = [...storageDocs, ...dataDocs];
            this.logger.info(`Encontrados ${allDocuments.length} documentos de forma recursiva`);
            return allDocuments;
        } catch (error) {
            this.logger.error('Error al escanear documentos', error);
            return [];
        }
    }

    /**
     * Generar sílabo
     */
    async generateSyllabus(data) {
        return await this.documentGenerator.generateSyllabus(data);
    }

    /**
     * Generar resolución
     */
    async generateResolution(data) {
        return await this.documentGenerator.generateResolution(data);
    }

    /**
     * Generar Excel
     */
    async generateExcel(data) {
        return await this.documentGenerator.generateExcel(data);
    }

    /**
     * Generar PowerPoint
     */
    async generatePPT(data) {
        return await this.documentGenerator.generatePPT(data);
    }

    /**
     * Generar PDF
     */
    async generatePDF(title, content) {
        return await this.documentGenerator.generatePDF(title, content);
    }

    /**
     * Guardar documento subido
     * @param {Buffer} buffer - Buffer del archivo
     * @param {string} fileName - Nombre del archivo
     * @param {string} type - Tipo de documento
     * @returns {Promise<{path: string, id: string}>}
     */
    async saveUploadedDocument(buffer, fileName, type = 'general') {
        try {
            await this.initialize();

            const folderMap = {
                silabo: 'silabos',
                resolucion: 'resoluciones',
                informe: 'informes',
                reglamento: 'reglamentos',
            };

            const folder = folderMap[type] || 'general';
            const folderPath = path.join(this.storagePath, folder);
            await fs.mkdir(folderPath, { recursive: true });

            const filePath = path.join(folderPath, fileName);
            await fs.writeFile(filePath, buffer);

            const id = `doc_${Date.now()}_${fileName.replace(/[^a-zA-Z0-9]/g, '_')}`;

            this.logger.info(`Documento guardado: ${filePath}`);
            return { path: filePath, id };
        } catch (error) {
            this.logger.error('Error al guardar documento', error);
            throw error;
        }
    }

    /**
     * Eliminar documento
     * @param {string} documentPath - Ruta del documento
     * @returns {Promise<boolean>}
     */
    async deleteDocument(documentPath) {
        try {
            await fs.unlink(documentPath);
            this.logger.info(`Documento eliminado: ${documentPath}`);
            return true;
        } catch (error) {
            this.logger.error('Error al eliminar documento', error);
            return false;
        }
    }

    /**
     * Obtener estadísticas de almacenamiento
     * @returns {Promise<object>}
     */
    async getStorageStats() {
        try {
            const documents = await this.scanAllDocuments();

            const stats = {
                total: documents.length,
                byType: {},
                byFormat: {},
                totalSize: 0,
            };

            for (const doc of documents) {
                // Por tipo
                stats.byType[doc.type] = (stats.byType[doc.type] || 0) + 1;

                // Por formato
                const ext = path.extname(doc.name).toLowerCase().replace('.', '');
                stats.byFormat[ext] = (stats.byFormat[ext] || 0) + 1;

                // Tamaño total
                stats.totalSize += doc.size;
            }

            stats.totalSizeMB = (stats.totalSize / (1024 * 1024)).toFixed(2);

            return stats;
        } catch (error) {
            this.logger.error('Error al obtener estadísticas', error);
            return { total: 0, byType: {}, byFormat: {}, totalSize: 0 };
        }
    }
}

export default DocumentService;
