import { Logger } from './logger.js';

/**
 * Utilidad simple de cola para gestionar peticiones concurrentes a la IA
 * Evita que el servidor local (Ollama) colapse con múltiples usuarios
 */
class RequestQueue {
    constructor() {
        this.queue = [];
        this.processing = false;
        this.logger = new Logger('RequestQueue');
    }

    /**
     * Añade una tarea a la cola y devuelve una promesa que se resuelve cuando la tarea termina
     * @param {Function} task - Función asíncrona que ejecuta la petición a la IA
     * @returns {Promise<any>}
     */
    async enqueue(task) {
        return new Promise((resolve, reject) => {
            this.queue.push({ task, resolve, reject });
            this._process();
        });
    }

    async _process() {
        if (this.processing || this.queue.length === 0) return;

        this.processing = true;
        const { task, resolve, reject } = this.queue.shift();

        try {
            this.logger.info(`Procesando tarea. Tareas en cola: ${this.queue.length}`);
            const result = await task();
            resolve(result);
        } catch (error) {
            reject(error);
        } finally {
            this.processing = false;
            // Pequeño retardo entre tareas para dejar respirar al hardware
            setTimeout(() => this._process(), 100);
        }
    }

    getQueueLength() {
        return this.queue.length;
    }
}

export const aiQueue = new RequestQueue();
