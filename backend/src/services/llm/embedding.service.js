import { OllamaService } from './ollama.service.js';
import { Logger } from '../../utils/logger.js';

const logger = new Logger('EmbeddingService');

/**
 * Servicio de Embeddings
 * Genera embeddings vectoriales para documentos
 */
export class EmbeddingService {
    constructor(config = {}) {
        this.ollamaService = new OllamaService();
        this.model = config.model || process.env.EMBED_MODEL || 'nomic-embed-text';
        this.batchSize = config.batchSize || 10;
    }

    /**
     * Generar embedding para texto
     * @param {string} text - Texto a vectorizar
     * @returns {Promise<number[]>}
     */
    async generate(text) {
        try {
            const embedding = await this.ollamaService.generateEmbeddings(text);
            return embedding;
        } catch (error) {
            logger.error('Error al generar embedding', error);
            throw error;
        }
    }

    /**
     * Generar embeddings en batch
     * @param {string[]} texts - Array de textos
     * @returns {Promise<number[][]>}
     */
    async generateBatch(texts) {
        const embeddings = [];

        for (let i = 0; i < texts.length; i += this.batchSize) {
            const batch = texts.slice(i, i + this.batchSize);
            const batchEmbeddings = await Promise.all(
                batch.map(text => this.generate(text))
            );
            embeddings.push(...batchEmbeddings);

            logger.info(`Procesado batch ${Math.floor(i / this.batchSize) + 1}/${Math.ceil(texts.length / this.batchSize)}`);
        }

        return embeddings;
    }

    /**
     * Calcular similitud coseno
     * @param {number[]} vec1 - Vector 1
     * @param {number[]} vec2 - Vector 2
     * @returns {number}
     */
    cosineSimilarity(vec1, vec2) {
        if (vec1.length !== vec2.length) {
            throw new Error('Los vectores deben tener la misma dimensión');
        }

        let dotProduct = 0;
        let norm1 = 0;
        let norm2 = 0;

        for (let i = 0; i < vec1.length; i++) {
            dotProduct += vec1[i] * vec2[i];
            norm1 += vec1[i] * vec1[i];
            norm2 += vec2[i] * vec2[i];
        }

        return dotProduct / (Math.sqrt(norm1) * Math.sqrt(norm2));
    }

    /**
     * Encontrar más similares
     * @param {number[]} queryEmbedding - Embedding de consulta
     * @param {Array<{id: string, embedding: number[]}>} documents - Documentos
     * @param {number} topK - Cantidad de resultados
     * @returns {Array<{id: string, score: number}>}
     */
    findMostSimilar(queryEmbedding, documents, topK = 5) {
        const scores = documents.map(doc => ({
            id: doc.id,
            score: this.cosineSimilarity(queryEmbedding, doc.embedding),
        }));

        return scores
            .sort((a, b) => b.score - a.score)
            .slice(0, topK);
    }

    /**
     * Verificar modelo de embeddings
     */
    async checkModel() {
        try {
            const testEmbedding = await this.generate('test');
            return testEmbedding && testEmbedding.length > 0;
        } catch {
            return false;
        }
    }

    /**
     * Obtener dimensión del modelo
     */
    async getDimension() {
        const testEmbedding = await this.generate('test');
        return testEmbedding.length;
    }
}

export default EmbeddingService;
