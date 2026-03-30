import fs from 'fs/promises';
import path from 'path';
import { Logger } from '../../utils/logger.js';

const logger = new Logger('LocalStorage');

/**
 * Almacenamiento Local
 * Sistema de almacenamiento persistente basado en archivos JSON
 */
export class LocalStorage {
    constructor(config = {}) {
        this.storagePath = config.storagePath || path.join(process.cwd(), 'storage', 'data');
        this.cache = new Map();
        this.initialized = false;
    }

    /**
     * Inicializar almacenamiento
     */
    async initialize() {
        if (this.initialized) return;

        await fs.mkdir(this.storagePath, { recursive: true });
        this.initialized = true;
        logger.info('LocalStorage inicializado');
    }

    /**
     * Obtener ruta de colección
     */
    getCollectionPath(collection) {
        return path.join(this.storagePath, `${collection}.json`);
    }

    /**
     * Cargar colección
     */
    async loadCollection(collection) {
        await this.initialize();

        if (this.cache.has(collection)) {
            return this.cache.get(collection);
        }

        const filePath = this.getCollectionPath(collection);

        try {
            const data = await fs.readFile(filePath, 'utf-8');
            const parsed = JSON.parse(data);
            this.cache.set(collection, parsed);
            return parsed;
        } catch {
            return { items: [], metadata: { created: new Date().toISOString() } };
        }
    }

    /**
     * Guardar colección
     */
    async saveCollection(collection, data) {
        await this.initialize();

        const filePath = this.getCollectionPath(collection);
        data.metadata = {
            ...data.metadata,
            updated: new Date().toISOString(),
        };

        await fs.writeFile(filePath, JSON.stringify(data, null, 2));
        this.cache.set(collection, data);
    }

    /**
     * Agregar item a colección
     */
    async add(collection, item) {
        const data = await this.loadCollection(collection);

        const newItem = {
            id: item.id || `${collection}_${Date.now()}`,
            ...item,
            createdAt: new Date().toISOString(),
        };

        data.items.push(newItem);
        await this.saveCollection(collection, data);

        return newItem;
    }

    /**
     * Obtener item por ID
     */
    async get(collection, id) {
        const data = await this.loadCollection(collection);
        return data.items.find(item => item.id === id) || null;
    }

    /**
     * Obtener todos los items
     */
    async getAll(collection) {
        const data = await this.loadCollection(collection);
        return data.items;
    }

    /**
     * Actualizar item
     */
    async update(collection, id, updates) {
        const data = await this.loadCollection(collection);
        const index = data.items.findIndex(item => item.id === id);

        if (index === -1) {
            throw new Error(`Item no encontrado: ${id}`);
        }

        data.items[index] = {
            ...data.items[index],
            ...updates,
            updatedAt: new Date().toISOString(),
        };

        await this.saveCollection(collection, data);
        return data.items[index];
    }

    /**
     * Eliminar item
     */
    async delete(collection, id) {
        const data = await this.loadCollection(collection);
        const index = data.items.findIndex(item => item.id === id);

        if (index === -1) {
            return false;
        }

        data.items.splice(index, 1);
        await this.saveCollection(collection, data);
        return true;
    }

    /**
     * Buscar items
     */
    async find(collection, query) {
        const data = await this.loadCollection(collection);

        return data.items.filter(item => {
            for (const [key, value] of Object.entries(query)) {
                if (item[key] !== value) return false;
            }
            return true;
        });
    }

    /**
     * Contar items
     */
    async count(collection) {
        const data = await this.loadCollection(collection);
        return data.items.length;
    }

    /**
     * Limpiar colección
     */
    async clear(collection) {
        await this.saveCollection(collection, {
            items: [],
            metadata: { created: new Date().toISOString() },
        });
    }

    /**
     * Listar colecciones
     */
    async listCollections() {
        await this.initialize();

        try {
            const files = await fs.readdir(this.storagePath);
            return files
                .filter(f => f.endsWith('.json'))
                .map(f => f.replace('.json', ''));
        } catch {
            return [];
        }
    }

    /**
     * Limpiar cache
     */
    clearCache() {
        this.cache.clear();
    }

    /**
     * Exportar colección
     */
    async export(collection) {
        const data = await this.loadCollection(collection);
        return JSON.stringify(data, null, 2);
    }

    /**
     * Importar colección
     */
    async import(collection, jsonString) {
        const data = JSON.parse(jsonString);
        await this.saveCollection(collection, data);
        return data.items.length;
    }
}

export default LocalStorage;
