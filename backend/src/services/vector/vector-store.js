import { ChromaClient } from 'chromadb';
import { OllamaService } from '../llm/ollama.service.js';
import { SimilaritySearch } from './similarity-search.js';
import { Logger } from '../../utils/logger.js';

/**
 * Servicio de Vector Store HÍBRIDO para búsqueda semántica LOCAL
 * Intenta usar ChromaDB, si no está disponible usa búsqueda en memoria
 */
export class VectorStoreService {
  constructor(config = {}) {
    this.collectionName = config.collectionName || process.env.COLLECTION_NAME || 'epiis_documents';
    this.chromaUrl = config.chromaUrl || process.env.CHROMADB_URL || 'http://localhost:8000';

    this.collection = null;
    this.ollamaService = new OllamaService();
    this.logger = new Logger('VectorStoreService');

    // Fallback en memoria
    this.memorySearch = new SimilaritySearch();

    this.initialized = false;
    this.available = false;
    this.mode = null; // 'chromadb' | 'memory'
  }

  /**
   * Inicializar - intenta ChromaDB, si falla usa memoria
   */
  async initialize() {
    if (this.initialized && this.available) return true;
    if (this.initialized && !this.available) return false;

    // 1. Intentar ChromaDB
    try {
      this.logger.info(`Intentando conectar a ChromaDB en ${this.chromaUrl}...`);
      this.client = new ChromaClient({ path: this.chromaUrl });
      await this.client.heartbeat();

      try {
        this.collection = await this.client.getCollection({
          name: this.collectionName,
        });
        this.logger.info('Colección ChromaDB existente encontrada');
      } catch (error) {
        this.collection = await this.client.createCollection({
          name: this.collectionName,
          metadata: { description: 'Documentos académicos EPIIS' },
        });
        this.logger.info('Nueva colección ChromaDB creada');
      }

      this.mode = 'chromadb';
      this.initialized = true;
      this.available = true;
      this.logger.info('✅ ChromaDB inicializado correctamente');
      return true;
    } catch (chromaError) {
      this.logger.warn(`ChromaDB no disponible (${chromaError.message}). Usando modo en memoria...`);
    }

    // 2. Fallback: modo en memoria
    try {
      this.mode = 'memory';
      this.initialized = true;
      this.available = true;
      this.logger.info('✅ VectorStore inicializado en modo MEMORIA (sin ChromaDB)');
      return true;
    } catch (error) {
      this.initialized = true;
      this.available = false;
      this.logger.error('Error al inicializar VectorStore', error);
      return false;
    }
  }

  /**
   * Obtener modo actual
   */
  getMode() {
    return this.mode || 'none';
  }

  /**
   * Agregar documento al vector store
   */
  async addDocument(document) {
    const isReady = await this.initialize();
    if (!isReady) throw new Error('Vector store no disponible');

    try {
      const { id, content, metadata } = document;

      if (this.mode === 'chromadb') {
        this.logger.info(`Generando embedding para documento: ${id}`);
        const embedding = await this.ollamaService.generateEmbeddings(content);

        await this.collection.add({
          ids: [id],
          embeddings: [embedding],
          documents: [content],
          metadatas: [metadata || {}],
        });
      } else {
        // Modo memoria
        await this.memorySearch.addDocument({ id, content, metadata });
      }

      this.logger.info(`Documento agregado (${this.mode}): ${id}`);
      return true;
    } catch (error) {
      this.logger.error('Error al agregar documento', error);
      throw error;
    }
  }

  /**
   * Agregar múltiples documentos en batch
   */
  async addDocuments(documents) {
    await this.initialize();

    try {
      this.logger.info(`Agregando ${documents.length} documentos (${this.mode})...`);

      if (this.mode === 'chromadb') {
        const ids = [];
        const embeddings = [];
        const contents = [];
        const metadatas = [];

        for (const doc of documents) {
          const embedding = await this.ollamaService.generateEmbeddings(doc.content);
          ids.push(doc.id);
          embeddings.push(embedding);
          contents.push(doc.content);
          metadatas.push(doc.metadata || {});
        }

        await this.collection.add({
          ids,
          embeddings,
          documents: contents,
          metadatas,
        });
      } else {
        await this.memorySearch.addDocuments(documents);
      }

      this.logger.info(`${documents.length} documentos agregados exitosamente`);
      return true;
    } catch (error) {
      this.logger.error('Error al agregar documentos en batch', error);
      throw error;
    }
  }

  /**
   * Búsqueda semántica
   */
  async searchSimilar(query, options = {}) {
    const isReady = await this.initialize();
    if (!isReady) return [];

    try {
      const {
        limit = 5,
        type = null,
        minScore = 0.3,
      } = options;

      this.logger.info(`Búsqueda semántica (${this.mode}):`, { query: query.substring(0, 50), limit });

      // Función auxiliar para formatear resultados de memoria a formato estándar
      const formatMemoryResults = (results) => {
        return results.map(r => ({
          id: r.id,
          content: r.content,
          metadata: r.metadata,
          score: r.score,
          title: r.metadata?.title || 'Sin título',
          type: r.metadata?.type || 'unknown',
          path: r.metadata?.path || '',
        }));
      };

      if (this.mode === 'chromadb') {
        try {
          const queryEmbedding = await this.ollamaService.generateEmbeddings(query);
          const where = type && type !== 'all' ? { type } : undefined;

          const results = await this.collection.query({
            queryEmbeddings: [queryEmbedding],
            nResults: limit,
            where,
          });

          const formattedResults = [];
          if (results.ids && results.ids[0]) {
            for (let i = 0; i < results.ids[0].length; i++) {
              const score = 1 - results.distances[0][i];
              if (score >= minScore) {
                formattedResults.push({
                  id: results.ids[0][i],
                  content: results.documents[0][i],
                  metadata: results.metadatas[0][i],
                  score,
                  title: results.metadatas[0][i]?.title || 'Sin título',
                  type: results.metadatas[0][i]?.type || 'unknown',
                  path: results.metadatas[0][i]?.path || '',
                });
              }
            }
          }

          this.logger.info(`Encontrados ${formattedResults.length} resultados (ChromaDB)`);
          return formattedResults;
        } catch (embedError) {
          if (embedError.message === 'EMBEDDINGS_NOT_SUPPORTED') {
            this.logger.warn('Embeddings no soportados en ChromaDB, usando fallback de palabras clave en memoria');
            const results = await this.memorySearch.searchKeyword(query, { limit, minScore });
            return formatMemoryResults(results);
          }
          throw embedError;
        }
      } else {
        // Modo memoria
        try {
          const results = await this.memorySearch.search(query, { limit, minScore });
          this.logger.info(`Encontrados ${results.length} resultados (memoria)`);
          return formatMemoryResults(results);
        } catch (embedError) {
          if (embedError.message === 'EMBEDDINGS_NOT_SUPPORTED') {
            this.logger.warn('Embeddings no soportados, usando búsqueda por palabras clave');
            const results = await this.memorySearch.searchKeyword(query, { limit, minScore });
            return formatMemoryResults(results);
          }
          throw embedError;
        }
      }
    } catch (error) {
      this.logger.error('Error en búsqueda semántica', error);
      // Último recurso: búsqueda por keyword si algo falló
      try {
        const results = await this.memorySearch.searchKeyword(query, { limit: options.limit || 5, minScore: 0.1 });
        return results.map(r => ({
          id: r.id,
          content: r.content,
          metadata: r.metadata,
          score: r.score,
          title: r.metadata?.title || 'Sin título',
          type: r.metadata?.type || 'unknown',
          path: r.metadata?.path || '',
        }));
      } catch (finalError) {
        return [];
      }
    }
  }

  /**
   * Actualizar documento
   */
  async updateDocument(id, updates) {
    await this.initialize();

    try {
      const { content, metadata } = updates;

      if (this.mode === 'chromadb') {
        const updateData = { ids: [id] };
        if (content) {
          const embedding = await this.ollamaService.generateEmbeddings(content);
          updateData.embeddings = [embedding];
          updateData.documents = [content];
        }
        if (metadata) {
          updateData.metadatas = [metadata];
        }
        await this.collection.update(updateData);
      } else {
        if (content) {
          await this.memorySearch.updateDocument(id, content, metadata);
        }
      }

      this.logger.info(`Documento actualizado: ${id}`);
      return true;
    } catch (error) {
      this.logger.error('Error al actualizar documento', error);
      throw error;
    }
  }

  /**
   * Eliminar documento
   */
  async deleteDocument(id) {
    await this.initialize();

    try {
      if (this.mode === 'chromadb') {
        await this.collection.delete({ ids: [id] });
      } else {
        this.memorySearch.removeDocument(id);
      }

      this.logger.info(`Documento eliminado: ${id}`);
      return true;
    } catch (error) {
      this.logger.error('Error al eliminar documento', error);
      throw error;
    }
  }

  /**
   * Obtener documento por ID
   */
  async getDocument(id) {
    await this.initialize();

    try {
      if (this.mode === 'chromadb') {
        const result = await this.collection.get({ ids: [id] });
        if (result.ids.length === 0) return null;
        return {
          id: result.ids[0],
          content: result.documents[0],
          metadata: result.metadatas[0],
        };
      } else {
        return this.memorySearch.getDocument(id);
      }
    } catch (error) {
      this.logger.error('Error al obtener documento', error);
      throw error;
    }
  }

  /**
   * Listar todos los documentos
   */
  async listDocuments(options = {}) {
    await this.initialize();

    try {
      if (this.mode === 'chromadb') {
        const { type = null, limit = 100 } = options;
        const where = type ? { type } : undefined;
        const results = await this.collection.get({ where, limit });
        return results.ids.map((id, i) => ({
          id,
          content: results.documents[i],
          metadata: results.metadatas[i],
        }));
      } else {
        return this.memorySearch.documents.map(d => ({
          id: d.id,
          content: d.content,
          metadata: d.metadata,
        }));
      }
    } catch (error) {
      this.logger.error('Error al listar documentos', error);
      throw error;
    }
  }

  /**
   * Contar documentos
   */
  async countDocuments(type = null) {
    await this.initialize();

    try {
      if (this.mode === 'chromadb') {
        const where = type ? { type } : undefined;
        const count = await this.collection.count({ where });
        return count;
      } else {
        if (type) {
          return this.memorySearch.documents.filter(d => d.metadata?.type === type).length;
        }
        return this.memorySearch.documents.length;
      }
    } catch (error) {
      this.logger.error('Error al contar documentos', error);
      return 0;
    }
  }

  /**
   * Limpiar toda la colección
   */
  async clearAll() {
    await this.initialize();

    try {
      if (this.mode === 'chromadb') {
        await this.client.deleteCollection({ name: this.collectionName });
        this.collection = await this.client.createCollection({
          name: this.collectionName,
          metadata: { description: 'Documentos académicos EPIIS' },
        });
      } else {
        this.memorySearch.clear();
      }

      this.logger.info('Colección limpiada');
      return true;
    } catch (error) {
      this.logger.error('Error al limpiar colección', error);
      throw error;
    }
  }

  /**
   * Obtener estadísticas
   */
  async getStats() {
    await this.initialize();

    try {
      const total = await this.countDocuments();
      const types = ['silabo', 'resolucion', 'informe', 'reglamento'];
      const countByType = {};

      for (const type of types) {
        countByType[type] = await this.countDocuments(type);
      }

      return {
        total,
        byType: countByType,
        collectionName: this.collectionName,
        mode: this.mode,
      };
    } catch (error) {
      this.logger.error('Error al obtener estadísticas', error);
      throw error;
    }
  }

  /**
   * Buscar documentos similares a otro documento
   */
  async findSimilarDocuments(documentId, limit = 5) {
    await this.initialize();

    try {
      const doc = await this.getDocument(documentId);
      if (!doc) {
        throw new Error('Documento no encontrado');
      }

      const results = await this.searchSimilar(doc.content, { limit: limit + 1 });
      return results.filter(r => r.id !== documentId);
    } catch (error) {
      this.logger.error('Error al buscar documentos similares', error);
      throw error;
    }
  }

  /**
   * Indexar directorio completo de documentos
   */
  async indexDirectory(documentsData) {
    await this.initialize();

    try {
      this.logger.info(`Iniciando indexación de ${documentsData.length} documentos (${this.mode})...`);

      const batchSize = 10;
      let indexed = 0;

      for (let i = 0; i < documentsData.length; i += batchSize) {
        const batch = documentsData.slice(i, i + batchSize);
        await this.addDocuments(batch);
        indexed += batch.length;

        this.logger.info(`Progreso: ${indexed}/${documentsData.length} documentos indexados`);
      }

      this.logger.info('Indexación completada');
      return { success: true, total: indexed };
    } catch (error) {
      this.logger.error('Error durante indexación', error);
      throw error;
    }
  }
}

export default VectorStoreService;