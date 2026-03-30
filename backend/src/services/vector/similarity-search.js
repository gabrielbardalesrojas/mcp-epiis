import { EmbeddingService } from '../llm/embedding.service.js';
import { Logger } from '../../utils/logger.js';

const logger = new Logger('SimilaritySearch');

/**
 * Servicio de Búsqueda por Similitud
 * Búsqueda semántica local sin ChromaDB
 */
export class SimilaritySearch {
    constructor() {
        this.embeddingService = new EmbeddingService();
        this.documents = [];
        this.embeddings = new Map();
    }

    /**
     * Agregar documento al índice
     */
    async addDocument(doc) {
        const { id, content, metadata = {} } = doc;

        // Generar embedding
        const embedding = await this.embeddingService.generate(content);

        this.documents.push({
            id,
            content,
            metadata,
        });

        this.embeddings.set(id, embedding);

        logger.info(`Documento agregado al índice: ${id}`);
    }

    /**
     * Agregar múltiples documentos
     */
    async addDocuments(docs) {
        for (const doc of docs) {
            await this.addDocument(doc);
        }
        logger.info(`${docs.length} documentos agregados al índice`);
    }

    /**
     * Buscar documentos similares
     */
    async search(query, options = {}) {
        const { limit = 5, minScore = 0.5 } = options;

        // Generar embedding de la consulta
        const queryEmbedding = await this.embeddingService.generate(query);

        // Calcular similitud con todos los documentos
        const results = [];

        for (const doc of this.documents) {
            const docEmbedding = this.embeddings.get(doc.id);
            if (!docEmbedding) continue;

            const score = this.embeddingService.cosineSimilarity(queryEmbedding, docEmbedding);

            if (score >= minScore) {
                results.push({
                    ...doc,
                    score,
                });
            }
        }

        // Ordenar por score descendente
        results.sort((a, b) => b.score - a.score);

        logger.info(`Búsqueda "${query.substring(0, 50)}...": ${results.length} resultados`);

        return results.slice(0, limit);
    }

    /**
     * Buscar documento más similar
     */
    async findMostSimilar(query) {
        const results = await this.search(query, { limit: 1 });
        return results[0] || null;
    }

    /**
     * Eliminar documento
     */
    removeDocument(id) {
        const index = this.documents.findIndex(d => d.id === id);
        if (index !== -1) {
            this.documents.splice(index, 1);
            this.embeddings.delete(id);
            logger.info(`Documento eliminado del índice: ${id}`);
            return true;
        }
        return false;
    }

    /**
     * Actualizar documento
     */
    async updateDocument(id, content, metadata = {}) {
        this.removeDocument(id);
        await this.addDocument({ id, content, metadata });
    }

    /**
     * Obtener documento por ID
     */
    getDocument(id) {
        return this.documents.find(d => d.id === id) || null;
    }

    /**
     * Limpiar índice
     */
    clear() {
        this.documents = [];
        this.embeddings.clear();
        logger.info('Índice limpiado');
    }

    /**
     * Estadísticas del índice
     */
    getStats() {
        return {
            documentCount: this.documents.length,
            embeddingCount: this.embeddings.size,
            types: this.documents.reduce((acc, doc) => {
                const type = doc.metadata?.type || 'unknown';
                acc[type] = (acc[type] || 0) + 1;
                return acc;
            }, {}),
        };
    }

    /**
     * Exportar índice (sin embeddings para ahorrar espacio)
     */
    export() {
        return JSON.stringify({
            documents: this.documents,
            timestamp: new Date().toISOString(),
        });
    }

    /**
     * Importar índice (re-genera embeddings)
     */
    async import(jsonString) {
        const data = JSON.parse(jsonString);
        this.clear();

        for (const doc of data.documents) {
            await this.addDocument(doc);
        }

        logger.info(`Importados ${data.documents.length} documentos`);
    }

    /**
     * Búsqueda por palabras clave (fallback si no hay embeddings)
     */
    searchKeyword(query, options = {}) {
        const { limit = 5, minScore = 0.2 } = options;
        const queryNorm = this.normalize(query);
        const keywords = queryNorm.split(/\s+/).filter(k => k.length > 2);

        const results = [];

        for (const doc of this.documents) {
            const contentNorm = this.normalize(doc.content + ' ' + (doc.metadata?.title || ''));
            let score = 0;

            // Match exact phrase
            if (contentNorm.includes(queryNorm)) {
                score += 10;
            }

            // Match keywords
            for (const keyword of keywords) {
                if (contentNorm.includes(keyword)) {
                    const regex = new RegExp(keyword, 'gi');
                    const matches = contentNorm.match(regex);
                    score += (matches ? matches.length : 0) * 2;
                }
            }

            if (score > 0) {
                // Normalizar score a algo similar a lo semántico (0-1)
                const normalizedScore = Math.min(score / 20, 1);
                if (normalizedScore >= minScore) {
                    results.push({
                        ...doc,
                        score: normalizedScore,
                        keywordScore: score
                    });
                }
            }
        }

        results.sort((a, b) => b.score - a.score);
        return results.slice(0, limit);
    }

    /**
     * Normalizar texto
     */
    normalize(text) {
        return (text || '')
            .toLowerCase()
            .normalize('NFD')
            .replace(/[\u0300-\u036f]/g, '')
            .replace(/[^a-z0-9\s]/g, ' ')
            .replace(/\s+/g, ' ')
            .trim();
    }
}

export default SimilaritySearch;
