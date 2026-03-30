import * as XLSX from 'xlsx';
import fs from 'fs/promises';
import path from 'path';
import { Logger } from '../../utils/logger.js';

/**
 * Parser de archivos Excel (XLSX, XLS)
 * Extrae datos y estructura de hojas de cálculo
 */
export class XlsxParser {
    constructor() {
        this.logger = new Logger('XlsxParser');
    }

    /**
     * Parsear archivo Excel completo
     * @param {string} filePath - Ruta del archivo Excel
     * @returns {Promise<{sheets: object, text: string, metadata: object}>}
     */
    async parse(filePath) {
        try {
            this.logger.info(`Parseando Excel: ${filePath}`);

            const buffer = await fs.readFile(filePath);
            const workbook = XLSX.read(buffer, { type: 'buffer' });

            const sheets = {};
            let fullText = '';

            for (const sheetName of workbook.SheetNames) {
                const worksheet = workbook.Sheets[sheetName];

                // Convertir a JSON
                const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 });

                // Convertir a texto
                const textData = XLSX.utils.sheet_to_txt(worksheet);

                sheets[sheetName] = {
                    data: jsonData,
                    text: textData,
                    range: worksheet['!ref'] || '',
                };

                fullText += `\n### ${sheetName} ###\n${textData}\n`;
            }

            const result = {
                sheets,
                text: fullText.trim(),
                metadata: {
                    sheetNames: workbook.SheetNames,
                    sheetCount: workbook.SheetNames.length,
                },
                fileName: path.basename(filePath),
                filePath,
            };

            this.logger.info(`Excel parseado: ${workbook.SheetNames.length} hojas`);
            return result;
        } catch (error) {
            this.logger.error(`Error al parsear Excel: ${filePath}`, error);
            throw new Error(`Error al parsear Excel: ${error.message}`);
        }
    }

    /**
     * Parsear una hoja específica
     * @param {string} filePath - Ruta del archivo
     * @param {string} sheetName - Nombre de la hoja
     * @returns {Promise<{data: array, text: string}>}
     */
    async parseSheet(filePath, sheetName) {
        try {
            const buffer = await fs.readFile(filePath);
            const workbook = XLSX.read(buffer, { type: 'buffer' });

            if (!workbook.SheetNames.includes(sheetName)) {
                throw new Error(`Hoja "${sheetName}" no encontrada`);
            }

            const worksheet = workbook.Sheets[sheetName];

            return {
                data: XLSX.utils.sheet_to_json(worksheet, { header: 1 }),
                text: XLSX.utils.sheet_to_txt(worksheet),
                json: XLSX.utils.sheet_to_json(worksheet),
            };
        } catch (error) {
            this.logger.error('Error al parsear hoja Excel', error);
            throw error;
        }
    }

    /**
     * Extraer texto de todas las hojas
     * @param {string} filePath - Ruta del archivo
     * @returns {Promise<string>}
     */
    async extractText(filePath) {
        const result = await this.parse(filePath);
        return result.text;
    }

    /**
     * Convertir Excel a JSON estructurado
     * @param {string} filePath - Ruta del archivo
     * @returns {Promise<object>}
     */
    async toJSON(filePath) {
        try {
            const buffer = await fs.readFile(filePath);
            const workbook = XLSX.read(buffer, { type: 'buffer' });

            const result = {};

            for (const sheetName of workbook.SheetNames) {
                const worksheet = workbook.Sheets[sheetName];
                result[sheetName] = XLSX.utils.sheet_to_json(worksheet);
            }

            return result;
        } catch (error) {
            this.logger.error('Error al convertir Excel a JSON', error);
            throw error;
        }
    }

    /**
     * Obtener lista de hojas
     * @param {string} filePath - Ruta del archivo
     * @returns {Promise<string[]>}
     */
    async getSheetNames(filePath) {
        try {
            const buffer = await fs.readFile(filePath);
            const workbook = XLSX.read(buffer, { type: 'buffer' });
            return workbook.SheetNames;
        } catch (error) {
            this.logger.error('Error al obtener hojas Excel', error);
            throw error;
        }
    }

    /**
     * Parsear desde buffer
     * @param {Buffer} buffer - Buffer del archivo
     * @returns {Promise<object>}
     */
    async parseBuffer(buffer) {
        try {
            const workbook = XLSX.read(buffer, { type: 'buffer' });

            const sheets = {};
            let fullText = '';

            for (const sheetName of workbook.SheetNames) {
                const worksheet = workbook.Sheets[sheetName];
                sheets[sheetName] = {
                    data: XLSX.utils.sheet_to_json(worksheet, { header: 1 }),
                    text: XLSX.utils.sheet_to_txt(worksheet),
                };
                fullText += `\n${sheetName}:\n${sheets[sheetName].text}\n`;
            }

            return {
                sheets,
                text: fullText.trim(),
                metadata: {
                    sheetNames: workbook.SheetNames,
                    sheetCount: workbook.SheetNames.length,
                },
            };
        } catch (error) {
            this.logger.error('Error al parsear buffer Excel', error);
            throw error;
        }
    }

    /**
     * Verificar si es un archivo Excel válido
     * @param {string} filePath - Ruta del archivo
     * @returns {Promise<boolean>}
     */
    async isValidExcel(filePath) {
        try {
            const buffer = await fs.readFile(filePath);
            const workbook = XLSX.read(buffer, { type: 'buffer' });
            return workbook.SheetNames.length > 0;
        } catch (error) {
            return false;
        }
    }
}

export default XlsxParser;
