import { Logger } from '../../utils/logger.js';

/**
 * Servicio de Chunking (división de documentos)
 * Divide documentos grandes en fragmentos manejables para embeddings
 */
export class ChunkingService {
    constructor(config = {}) {
        this.chunkSize = config.chunkSize || 1000; // Caracteres por chunk
        this.chunkOverlap = config.chunkOverlap || 200; // Overlap entre chunks
        this.logger = new Logger('ChunkingService');
    }

    /**
     * Dividir texto en chunks
     * @param {string} text - Texto a dividir
     * @param {object} options - Opciones de chunking
     * @returns {string[]} - Array de chunks
     */
    chunk(text, options = {}) {
        const chunkSize = options.chunkSize || this.chunkSize;
        const overlap = options.overlap || this.chunkOverlap;

        if (!text || text.length === 0) {
            return [];
        }

        // Si el texto es más pequeño que el chunk, devolverlo completo
        if (text.length <= chunkSize) {
            return [text];
        }

        const chunks = [];
        let startIndex = 0;

        while (startIndex < text.length) {
            let endIndex = startIndex + chunkSize;

            // Intentar terminar en un límite natural (punto, párrafo)
            if (endIndex < text.length) {
                const searchEnd = Math.min(endIndex + 100, text.length);
                const searchText = text.substring(endIndex, searchEnd);

                // Buscar el mejor punto de corte
                const periodIndex = searchText.indexOf('. ');
                const newlineIndex = searchText.indexOf('\n\n');

                if (periodIndex !== -1 && periodIndex < 100) {
                    endIndex += periodIndex + 2;
                } else if (newlineIndex !== -1 && newlineIndex < 100) {
                    endIndex += newlineIndex + 2;
                }
            }

            const chunk = text.substring(startIndex, endIndex).trim();
            if (chunk.length > 0) {
                chunks.push(chunk);
            }

            // Avanzar con overlap
            startIndex = endIndex - overlap;

            // Evitar bucle infinito
            if (startIndex >= text.length - overlap) {
                break;
            }
        }

        this.logger.info(`Texto dividido en ${chunks.length} chunks`);
        return chunks;
    }

    /**
     * Dividir texto por párrafos
     * @param {string} text - Texto a dividir
     * @returns {string[]} - Array de párrafos
     */
    chunkByParagraphs(text) {
        if (!text) return [];

        const paragraphs = text
            .split(/\n\n+/)
            .map(p => p.trim())
            .filter(p => p.length > 0);

        // Combinar párrafos pequeños
        const merged = [];
        let current = '';

        for (const paragraph of paragraphs) {
            if (current.length + paragraph.length < this.chunkSize) {
                current += (current ? '\n\n' : '') + paragraph;
            } else {
                if (current) merged.push(current);
                current = paragraph;
            }
        }

        if (current) merged.push(current);

        return merged;
    }

    /**
     * Dividir texto por oraciones
     * @param {string} text - Texto a dividir
     * @returns {string[]} - Array de chunks basados en oraciones
     */
    chunkBySentences(text) {
        if (!text) return [];

        // Dividir por oraciones
        const sentences = text.match(/[^.!?]+[.!?]+/g) || [text];

        const chunks = [];
        let current = '';

        for (const sentence of sentences) {
            if (current.length + sentence.length < this.chunkSize) {
                current += sentence;
            } else {
                if (current) chunks.push(current.trim());
                current = sentence;
            }
        }

        if (current) chunks.push(current.trim());

        return chunks;
    }

    /**
     * Dividir documento con metadatos
     * @param {object} document - Documento con text y metadata
     * @returns {object[]} - Array de chunks con metadatos
     */
    chunkDocument(document) {
        const { text, metadata = {}, id } = document;
        const chunks = this.chunk(text);

        return chunks.map((chunk, index) => ({
            id: `${id || 'doc'}_chunk_${index}`,
            content: chunk,
            metadata: {
                ...metadata,
                chunkIndex: index,
                totalChunks: chunks.length,
                parentId: id,
            },
        }));
    }

    /**
     * Reconstruir texto desde chunks
     * @param {string[]} chunks - Array de chunks
     * @returns {string} - Texto reconstruido
     */
    reconstruct(chunks) {
        if (!chunks || chunks.length === 0) return '';

        // Eliminar duplicados del overlap
        let result = chunks[0];

        for (let i = 1; i < chunks.length; i++) {
            const chunk = chunks[i];
            const overlapText = result.substring(result.length - this.chunkOverlap);
            const overlapIndex = chunk.indexOf(overlapText);

            if (overlapIndex > -1) {
                result += chunk.substring(overlapIndex + overlapText.length);
            } else {
                result += ' ' + chunk;
            }
        }

        return result;
    }

    /**
     * Obtener estadísticas de chunks
     * @param {string[]} chunks - Array de chunks
     * @returns {object} - Estadísticas
     */
    getStats(chunks) {
        if (!chunks || chunks.length === 0) {
            return { count: 0, avgSize: 0, minSize: 0, maxSize: 0 };
        }

        const sizes = chunks.map(c => c.length);

        return {
            count: chunks.length,
            avgSize: Math.round(sizes.reduce((a, b) => a + b, 0) / sizes.length),
            minSize: Math.min(...sizes),
            maxSize: Math.max(...sizes),
            totalSize: sizes.reduce((a, b) => a + b, 0),
        };
    }
}

export default ChunkingService;
