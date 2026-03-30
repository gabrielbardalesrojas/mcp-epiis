import JSZip from 'jszip';
import fs from 'fs/promises';
import path from 'path';
import { Logger } from '../../utils/logger.js';

/**
 * Parser de archivos PowerPoint (PPTX)
 * Extrae texto y estructura de presentaciones
 */
export class PptxParser {
    constructor() {
        this.logger = new Logger('PptxParser');
    }

    /**
     * Parsear archivo PowerPoint
     * @param {string} filePath - Ruta del archivo PPTX
     * @returns {Promise<{slides: array, text: string, metadata: object}>}
     */
    async parse(filePath) {
        try {
            this.logger.info(`Parseando PPTX: ${filePath}`);

            const buffer = await fs.readFile(filePath);
            const zip = await JSZip.loadAsync(buffer);

            const slides = [];
            let slideIndex = 1;

            // Buscar archivos de diapositivas
            const slideFiles = Object.keys(zip.files)
                .filter(name => name.match(/ppt\/slides\/slide\d+\.xml$/))
                .sort((a, b) => {
                    const numA = parseInt(a.match(/slide(\d+)/)[1]);
                    const numB = parseInt(b.match(/slide(\d+)/)[1]);
                    return numA - numB;
                });

            for (const slideFile of slideFiles) {
                const content = await zip.file(slideFile).async('text');
                const text = this.extractTextFromXML(content);

                slides.push({
                    number: slideIndex++,
                    text: text.trim(),
                    file: slideFile,
                });
            }

            // Obtener texto completo
            const fullText = slides
                .map(s => `--- Diapositiva ${s.number} ---\n${s.text}`)
                .join('\n\n');

            // Extraer metadatos
            let metadata = {};
            try {
                const coreFile = zip.file('docProps/core.xml');
                if (coreFile) {
                    const coreContent = await coreFile.async('text');
                    metadata = this.extractMetadataFromXML(coreContent);
                }
            } catch (e) {
                // Metadatos opcionales
            }

            const result = {
                slides,
                text: fullText,
                metadata: {
                    ...metadata,
                    slideCount: slides.length,
                },
                fileName: path.basename(filePath),
                filePath,
            };

            this.logger.info(`PPTX parseado: ${slides.length} diapositivas`);
            return result;
        } catch (error) {
            this.logger.error(`Error al parsear PPTX: ${filePath}`, error);
            throw new Error(`Error al parsear PPTX: ${error.message}`);
        }
    }

    /**
     * Extraer texto de XML de PowerPoint
     * @param {string} xml - Contenido XML
     * @returns {string}
     */
    extractTextFromXML(xml) {
        // Buscar todo el texto dentro de tags <a:t>
        const textMatches = xml.match(/<a:t[^>]*>([^<]*)<\/a:t>/g) || [];

        const texts = textMatches.map(match => {
            const textContent = match.replace(/<[^>]+>/g, '');
            return textContent;
        });

        return texts.join(' ');
    }

    /**
     * Extraer metadatos de core.xml
     * @param {string} xml - Contenido XML
     * @returns {object}
     */
    extractMetadataFromXML(xml) {
        const metadata = {};

        const titleMatch = xml.match(/<dc:title>([^<]*)<\/dc:title>/);
        if (titleMatch) metadata.title = titleMatch[1];

        const creatorMatch = xml.match(/<dc:creator>([^<]*)<\/dc:creator>/);
        if (creatorMatch) metadata.creator = creatorMatch[1];

        const createdMatch = xml.match(/<dcterms:created[^>]*>([^<]*)<\/dcterms:created>/);
        if (createdMatch) metadata.created = createdMatch[1];

        const modifiedMatch = xml.match(/<dcterms:modified[^>]*>([^<]*)<\/dcterms:modified>/);
        if (modifiedMatch) metadata.modified = modifiedMatch[1];

        return metadata;
    }

    /**
     * Extraer texto de todas las diapositivas
     * @param {string} filePath - Ruta del archivo
     * @returns {Promise<string>}
     */
    async extractText(filePath) {
        const result = await this.parse(filePath);
        return result.text;
    }

    /**
     * Parsear desde buffer
     * @param {Buffer} buffer - Buffer del archivo
     * @returns {Promise<object>}
     */
    async parseBuffer(buffer) {
        try {
            const zip = await JSZip.loadAsync(buffer);

            const slides = [];
            let slideIndex = 1;

            const slideFiles = Object.keys(zip.files)
                .filter(name => name.match(/ppt\/slides\/slide\d+\.xml$/))
                .sort((a, b) => {
                    const numA = parseInt(a.match(/slide(\d+)/)[1]);
                    const numB = parseInt(b.match(/slide(\d+)/)[1]);
                    return numA - numB;
                });

            for (const slideFile of slideFiles) {
                const content = await zip.file(slideFile).async('text');
                const text = this.extractTextFromXML(content);

                slides.push({
                    number: slideIndex++,
                    text: text.trim(),
                });
            }

            const fullText = slides
                .map(s => `Diapositiva ${s.number}: ${s.text}`)
                .join('\n\n');

            return {
                slides,
                text: fullText,
                metadata: {
                    slideCount: slides.length,
                },
            };
        } catch (error) {
            this.logger.error('Error al parsear buffer PPTX', error);
            throw error;
        }
    }

    /**
     * Obtener texto de una diapositiva específica
     * @param {string} filePath - Ruta del archivo
     * @param {number} slideNumber - Número de diapositiva (1-indexed)
     * @returns {Promise<string>}
     */
    async getSlideText(filePath, slideNumber) {
        const result = await this.parse(filePath);
        const slide = result.slides.find(s => s.number === slideNumber);
        return slide ? slide.text : null;
    }

    /**
     * Verificar si es un archivo PPTX válido
     * @param {string} filePath - Ruta del archivo
     * @returns {Promise<boolean>}
     */
    async isValidPptx(filePath) {
        try {
            const buffer = await fs.readFile(filePath);
            const zip = await JSZip.loadAsync(buffer);

            // Verificar que tenga estructura de PPTX
            return zip.file('[Content_Types].xml') !== null;
        } catch (error) {
            return false;
        }
    }
}

export default PptxParser;
