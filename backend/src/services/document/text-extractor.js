import fs from 'fs/promises';
import path from 'path';
import { PDFParser } from './pdf-parser.js';
import { DocxParser } from './docx-parser.js';
import { Logger } from '../../utils/logger.js';

/**
 * Extractor de texto unificado
 * Soporta múltiples formatos de archivos
 */
export class TextExtractor {
    constructor() {
        this.pdfParser = new PDFParser();
        this.docxParser = new DocxParser();
        this.logger = new Logger('TextExtractor');

        // Extensiones soportadas
        this.supportedExtensions = ['.pdf', '.docx', '.doc', '.txt', '.md'];
    }

    /**
     * Extraer texto de cualquier archivo soportado
     * @param {string} filePath - Ruta del archivo
     * @returns {Promise<{text: string, format: string, metadata: object}>}
     */
    async extract(filePath) {
        try {
            const ext = path.extname(filePath).toLowerCase();
            this.logger.info(`Extrayendo texto de: ${filePath} (${ext})`);

            if (!this.supportedExtensions.includes(ext)) {
                throw new Error(`Formato no soportado: ${ext}`);
            }

            let result;

            switch (ext) {
                case '.pdf':
                    result = await this.extractFromPDF(filePath);
                    break;

                case '.docx':
                case '.doc':
                    result = await this.extractFromDocx(filePath);
                    break;

                case '.txt':
                case '.md':
                    result = await this.extractFromText(filePath);
                    break;

                default:
                    throw new Error(`Formato no soportado: ${ext}`);
            }

            return {
                ...result,
                format: ext.replace('.', ''),
                fileName: path.basename(filePath),
                filePath,
            };
        } catch (error) {
            this.logger.error(`Error al extraer texto de ${filePath}`, error);
            throw error;
        }
    }

    /**
     * Extraer texto de PDF
     */
    async extractFromPDF(filePath) {
        const result = await this.pdfParser.parse(filePath);
        return {
            text: result.text,
            metadata: result.metadata,
        };
    }

    /**
     * Extraer texto de DOCX
     */
    async extractFromDocx(filePath) {
        const result = await this.docxParser.parse(filePath);
        return {
            text: result.text,
            metadata: {
                html: result.html,
            },
        };
    }

    /**
     * Extraer texto de archivo de texto plano
     */
    async extractFromText(filePath) {
        const text = await fs.readFile(filePath, 'utf-8');
        return {
            text,
            metadata: {},
        };
    }

    /**
     * Extraer texto de buffer con tipo especificado
     * @param {Buffer} buffer - Buffer del archivo
     * @param {string} mimeType - Tipo MIME del archivo
     * @returns {Promise<{text: string, metadata: object}>}
     */
    async extractFromBuffer(buffer, mimeType) {
        try {
            switch (mimeType) {
                case 'application/pdf':
                    return await this.pdfParser.parseBuffer(buffer);

                case 'application/vnd.openxmlformats-officedocument.wordprocessingml.document':
                    return await this.docxParser.parseBuffer(buffer);

                case 'text/plain':
                    return {
                        text: buffer.toString('utf-8'),
                        metadata: {},
                    };

                default:
                    throw new Error(`Tipo MIME no soportado: ${mimeType}`);
            }
        } catch (error) {
            this.logger.error('Error al extraer de buffer', error);
            throw error;
        }
    }

    /**
     * Verificar si un archivo es soportado
     * @param {string} filePath - Ruta del archivo
     * @returns {boolean}
     */
    isSupported(filePath) {
        const ext = path.extname(filePath).toLowerCase();
        return this.supportedExtensions.includes(ext);
    }

    /**
     * Obtener extensiones soportadas
     * @returns {string[]}
     */
    getSupportedExtensions() {
        return this.supportedExtensions;
    }
}

export default TextExtractor;
