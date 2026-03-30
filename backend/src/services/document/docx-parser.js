import mammoth from 'mammoth';
import fs from 'fs/promises';
import path from 'path';
import { Logger } from '../../utils/logger.js';

/**
 * Parser de archivos DOCX (Microsoft Word)
 * Extrae texto y estructura de documentos Word
 */
export class DocxParser {
    constructor() {
        this.logger = new Logger('DocxParser');
    }

    /**
     * Extraer texto de un archivo DOCX
     * @param {string} filePath - Ruta del archivo DOCX
     * @returns {Promise<{text: string, html: string, messages: array}>}
     */
    async parse(filePath) {
        try {
            this.logger.info(`Parseando DOCX: ${filePath}`);

            const buffer = await fs.readFile(filePath);

            // Extraer texto plano
            const textResult = await mammoth.extractRawText({ buffer });

            // Extraer HTML para estructura
            const htmlResult = await mammoth.convertToHtml({ buffer });

            const result = {
                text: textResult.value,
                html: htmlResult.value,
                messages: [...textResult.messages, ...htmlResult.messages],
                fileName: path.basename(filePath),
                filePath,
            };

            this.logger.info(`DOCX parseado: ${textResult.value.length} caracteres`);
            return result;
        } catch (error) {
            this.logger.error(`Error al parsear DOCX: ${filePath}`, error);
            throw new Error(`Error al parsear DOCX: ${error.message}`);
        }
    }

    /**
     * Extraer texto de buffer
     * @param {Buffer} buffer - Buffer del archivo DOCX
     * @returns {Promise<{text: string, html: string}>}
     */
    async parseBuffer(buffer) {
        try {
            const textResult = await mammoth.extractRawText({ buffer });
            const htmlResult = await mammoth.convertToHtml({ buffer });

            return {
                text: textResult.value,
                html: htmlResult.value,
                messages: [...textResult.messages, ...htmlResult.messages],
            };
        } catch (error) {
            this.logger.error('Error al parsear buffer DOCX', error);
            throw error;
        }
    }

    /**
     * Extraer solo texto limpio (sin HTML)
     * @param {string} filePath - Ruta del archivo
     * @returns {Promise<string>}
     */
    async extractText(filePath) {
        const result = await this.parse(filePath);
        return result.text;
    }

    /**
     * Extraer estructura del documento
     * @param {string} filePath - Ruta del archivo
     * @returns {Promise<{headings: array, paragraphs: array}>}
     */
    async extractStructure(filePath) {
        try {
            const buffer = await fs.readFile(filePath);

            const htmlResult = await mammoth.convertToHtml({ buffer });
            const html = htmlResult.value;

            // Extraer encabezados
            const headingRegex = /<h([1-6])[^>]*>(.*?)<\/h\1>/gi;
            const headings = [];
            let match;
            while ((match = headingRegex.exec(html)) !== null) {
                headings.push({
                    level: parseInt(match[1]),
                    text: match[2].replace(/<[^>]*>/g, '').trim(),
                });
            }

            // Extraer párrafos
            const paragraphRegex = /<p[^>]*>(.*?)<\/p>/gi;
            const paragraphs = [];
            while ((match = paragraphRegex.exec(html)) !== null) {
                const text = match[1].replace(/<[^>]*>/g, '').trim();
                if (text.length > 0) {
                    paragraphs.push(text);
                }
            }

            return {
                headings,
                paragraphs,
                html,
            };
        } catch (error) {
            this.logger.error('Error al extraer estructura DOCX', error);
            throw error;
        }
    }

    /**
     * Extraer imágenes del documento
     * @param {string} filePath - Ruta del archivo
     * @param {string} outputDir - Directorio para guardar imágenes
     * @returns {Promise<string[]>} - Rutas de imágenes extraídas
     */
    async extractImages(filePath, outputDir) {
        try {
            const buffer = await fs.readFile(filePath);
            const images = [];
            let imageIndex = 0;

            const options = {
                convertImage: mammoth.images.imgElement(async (image) => {
                    const imageBuffer = await image.read('base64');
                    const extension = image.contentType.split('/')[1] || 'png';
                    const imageName = `image_${imageIndex++}.${extension}`;
                    const imagePath = path.join(outputDir, imageName);

                    await fs.writeFile(imagePath, Buffer.from(imageBuffer, 'base64'));
                    images.push(imagePath);

                    return { src: imagePath };
                }),
            };

            await mammoth.convertToHtml({ buffer }, options);

            return images;
        } catch (error) {
            this.logger.error('Error al extraer imágenes DOCX', error);
            throw error;
        }
    }

    /**
     * Verificar si es un archivo DOCX válido
     * @param {string} filePath - Ruta del archivo
     * @returns {Promise<boolean>}
     */
    async isValidDocx(filePath) {
        try {
            const buffer = await fs.readFile(filePath);
            // Magic bytes de archivo ZIP (DOCX es un ZIP)
            return buffer[0] === 0x50 && buffer[1] === 0x4B;
        } catch (error) {
            return false;
        }
    }
}

export default DocxParser;
