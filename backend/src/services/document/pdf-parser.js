import pdf from 'pdf-parse';
import fs from 'fs/promises';
import path from 'path';
import { Logger } from '../../utils/logger.js';

/**
 * Parser de archivos PDF
 * Extrae texto y metadatos de documentos PDF
 */
export class PDFParser {
  constructor() {
    this.logger = new Logger('PDFParser');
  }

  /**
   * Extraer texto de un archivo PDF
   * @param {string} filePath - Ruta del archivo PDF
   * @returns {Promise<{text: string, metadata: object}>}
   */
  async parse(filePath) {
    try {
      this.logger.info(`Parseando PDF: ${filePath}`);

      // Leer archivo
      const dataBuffer = await fs.readFile(filePath);
      
      // Parsear PDF
      const data = await pdf(dataBuffer);

      const result = {
        text: data.text,
        metadata: {
          numPages: data.numpages,
          info: data.info,
          version: data.version,
        },
        fileName: path.basename(filePath),
        filePath,
      };

      this.logger.info(`PDF parseado: ${data.numpages} páginas, ${data.text.length} caracteres`);
      return result;
    } catch (error) {
      this.logger.error(`Error al parsear PDF: ${filePath}`, error);
      throw new Error(`Error al parsear PDF: ${error.message}`);
    }
  }

  /**
   * Extraer texto de buffer de PDF
   * @param {Buffer} buffer - Buffer del archivo PDF
   * @returns {Promise<{text: string, metadata: object}>}
   */
  async parseBuffer(buffer) {
    try {
      const data = await pdf(buffer);

      return {
        text: data.text,
        metadata: {
          numPages: data.numpages,
          info: data.info,
          version: data.version,
        },
      };
    } catch (error) {
      this.logger.error('Error al parsear buffer PDF', error);
      throw error;
    }
  }

  /**
   * Extraer texto por páginas
   * @param {string} filePath - Ruta del archivo PDF
   * @returns {Promise<string[]>} - Array con texto de cada página
   */
  async parseByPages(filePath) {
    try {
      const dataBuffer = await fs.readFile(filePath);
      const pages = [];

      // Función de render personalizada para obtener texto por página
      const renderPage = (pageData) => {
        const textItems = pageData.getTextContent();
        return textItems.then((textContent) => {
          let pageText = '';
          for (const item of textContent.items) {
            pageText += item.str + ' ';
          }
          return pageText;
        });
      };

      const data = await pdf(dataBuffer, { pagerender: renderPage });
      
      // Si no se puede separar por páginas, devolver todo
      if (pages.length === 0) {
        return [data.text];
      }

      return pages;
    } catch (error) {
      this.logger.error('Error al parsear páginas PDF', error);
      throw error;
    }
  }

  /**
   * Verificar si es un archivo PDF válido
   * @param {string} filePath - Ruta del archivo
   * @returns {Promise<boolean>}
   */
  async isValidPDF(filePath) {
    try {
      const buffer = await fs.readFile(filePath);
      // Verificar magic bytes del PDF (%PDF)
      const header = buffer.slice(0, 5).toString();
      return header.startsWith('%PDF');
    } catch (error) {
      return false;
    }
  }
}

export default PDFParser;
