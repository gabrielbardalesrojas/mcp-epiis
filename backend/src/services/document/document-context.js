import { Logger } from '../../utils/logger.js';
import path from 'path';

/**
 * Servicio de Contexto de Documentos
 * Proporciona información sobre documentos almacenados al chat
 */
export class DocumentContextService {
    constructor(documentService) {
        this.documentService = documentService;
        this.logger = new Logger('DocumentContextService');
        this.cachedDocList = null;
        this.cacheTimestamp = 0;
        this.CACHE_TTL = 30000; // 30 segundos
    }

    /**
     * Detectar si el usuario pregunta sobre sus documentos
     */
    isDocumentQuery(message) {
        const normalized = message.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');

        const documentKeywords = [
            'documento', 'documentos', 'archivo', 'archivos',
            'guardado', 'guardados', 'subido', 'subidos',
            'tengo guardado', 'tengo subido', 'mis archivos', 'mis documentos',
            'que documentos', 'que archivos', 'cuales documentos',
            'lista de documentos', 'listar documentos',
            'almacenado', 'almacenados', 'disponible', 'disponibles',
            'pdf', 'docx', 'archivo subido',
            'que tengo', 'cuantos documentos', 'cuantos archivos',
            'biblioteca', 'repositorio',
            'basado en', 'en base a', 'tomando como', 'referencia', 'usando el',
            'segun el', 'segun los', 'modelo de', 'ejemplo de',
        ];

        return documentKeywords.some(kw => normalized.includes(kw));
    }

    /**
     * Obtener lista de documentos almacenados (con cache)
     */
    async getDocumentList() {
        const now = Date.now();
        if (this.cachedDocList && (now - this.cacheTimestamp) < this.CACHE_TTL) {
            return this.cachedDocList;
        }

        try {
            const docs = await this.documentService.scanAllDocuments();
            this.cachedDocList = docs;
            this.cacheTimestamp = now;
            return docs;
        } catch (error) {
            this.logger.error('Error al obtener lista de documentos', error);
            return [];
        }
    }

    /**
     * Invalidar cache (llamar después de upload/delete)
     */
    invalidateCache() {
        this.cachedDocList = null;
        this.cacheTimestamp = 0;
    }

    /**
     * Formatear lista de documentos para el contexto del LLM
     */
    formatDocumentList(docs) {
        if (!docs || docs.length === 0) {
            return 'No hay documentos almacenados actualmente.';
        }

        const lines = docs.map((doc, i) => {
            const sizeMB = (doc.size / (1024 * 1024)).toFixed(2);
            const ext = path.extname(doc.name).replace('.', '').toUpperCase();
            const date = doc.modified ? new Date(doc.modified).toLocaleDateString('es-PE') : 'N/A';
            return `${i + 1}. "${doc.name}" (${ext}, ${sizeMB} MB, tipo: ${doc.type}, fecha: ${date})`;
        });

        return `Se encontraron ${docs.length} documento(s) almacenado(s):\n${lines.join('\n')}`;
    }

    /**
     * Construir contexto de documentos para el chat
     */
    async buildDocumentContext(message) {
        const docs = await this.getDocumentList();
        let context = '';

        // Si pregunta sobre documentos, incluir la lista completa
        if (this.isDocumentQuery(message)) {
            context += '\n\nDOCUMENTOS ALMACENADOS EN EL SISTEMA:\n';
            context += this.formatDocumentList(docs);
            context += '\n\nIMPORTANTE: El usuario tiene acceso a estos documentos. Responde con esta información específica.';
        }

        // Siempre informar cuántos documentos hay disponibles
        if (docs.length > 0 && !this.isDocumentQuery(message)) {
            context += `\n\n[INFO: Hay ${docs.length} documento(s) almacenado(s) en el sistema disponibles para consulta.]`;
        }

        return context;
    }

    /**
     * Extraer contenido relevante de documentos para preguntas específicas
     */
    async getRelevantDocumentContent(message, maxChars = 3000) {
        try {
            const docs = await this.getDocumentList();
            if (docs.length === 0) return '';

            const normalizedMsg = message.toLowerCase();
            let relevantContent = '';

            // Buscar documentos cuyo nombre coincida con la consulta
            const matchedDocs = [];
            for (const doc of docs) {
                const docNameLower = doc.name.toLowerCase().replace(/[_-]/g, ' ');
                const nameWords = docNameLower.split(/\s+/).filter(w => w.length > 3);

                const isRelevant = nameWords.some(word => normalizedMsg.includes(word));

                if (isRelevant) {
                    matchedDocs.push(doc.name);
                    try {
                        const content = await this.documentService.extractContent(doc.path);
                        const truncated = content.substring(0, maxChars);
                        relevantContent += `\n\n--- Contenido de "${doc.name}" ---\n${truncated}`;

                        if (relevantContent.length > maxChars * 2) break;
                    } catch (e) {
                        this.logger.warn(`No se pudo extraer contenido de ${doc.name}: ${e.message}`);
                    }
                }
            }

            this.logger.info('Búsqueda de contenido relevante finalizada', {
                matches: matchedDocs.length,
                matchedDocs,
                contentLength: relevantContent.length
            });

            return relevantContent;
        } catch (error) {
            this.logger.error('Error al obtener contenido relevante', error);
            return '';
        }
    }
}

export default DocumentContextService;
