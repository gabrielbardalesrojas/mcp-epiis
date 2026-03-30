/**
 * Recurso MCP: Documentos
 * Proporciona acceso a documentos académicos
 */
import fs from 'fs/promises';
import path from 'path';

export const documentsResource = {
    uri: 'epiis://documents',
    name: 'Documentos Académicos',
    description: 'Colección de documentos académicos de la FIIS-UNSM',
    mimeType: 'application/json',

    /**
     * Obtener lista de documentos
     * @param {object} services - Servicios inyectados
     * @returns {Promise<object>}
     */
    async list(services) {
        const { documentService } = services;
        const documents = await documentService.scanAllDocuments();

        return {
            uri: this.uri,
            name: this.name,
            documents: documents.map(doc => ({
                name: doc.name,
                path: doc.path,
                type: doc.type,
                size: doc.size,
                modified: doc.modified,
            })),
            count: documents.length,
        };
    },

    /**
     * Obtener documento por tipo
     * @param {string} type - Tipo de documento
     * @param {object} services - Servicios inyectados
     * @returns {Promise<object[]>}
     */
    async getByType(type, services) {
        const { documentService } = services;
        return await documentService.listByType(type);
    },

    /**
     * Obtener contenido de documento
     * @param {string} docPath - Ruta del documento
     * @param {object} services - Servicios inyectados
     * @returns {Promise<string>}
     */
    async getContent(docPath, services) {
        const { documentService } = services;
        return await documentService.extractContent(docPath);
    },

    /**
     * Template del recurso
     */
    templates: [
        {
            uri: 'epiis://documents/silabos',
            name: 'Sílabos',
            description: 'Sílabos de cursos académicos',
        },
        {
            uri: 'epiis://documents/resoluciones',
            name: 'Resoluciones',
            description: 'Resoluciones administrativas',
        },
        {
            uri: 'epiis://documents/informes',
            name: 'Informes',
            description: 'Informes académicos',
        },
        {
            uri: 'epiis://documents/reglamentos',
            name: 'Reglamentos',
            description: 'Reglamentos institucionales',
        },
    ],
};

export default documentsResource;
