import fs from 'fs/promises';
import path from 'path';
import { Logger } from '../../utils/logger.js';

const logger = new Logger('FileManager');

/**
 * Administrador de Archivos
 * Gestiona operaciones de archivos para documentos
 */
export class FileManager {
    constructor(config = {}) {
        this.basePath = config.basePath || path.join(process.cwd(), 'storage');
        this.tempPath = path.join(this.basePath, 'temp');
        this.documentsPath = path.join(this.basePath, 'documents');
        this.generatedPath = path.join(this.basePath, 'generated');
    }

    /**
     * Inicializar directorios
     */
    async initialize() {
        const dirs = [
            this.basePath,
            this.tempPath,
            this.documentsPath,
            this.generatedPath,
            path.join(this.documentsPath, 'silabos'),
            path.join(this.documentsPath, 'resoluciones'),
            path.join(this.documentsPath, 'informes'),
            path.join(this.documentsPath, 'reglamentos'),
        ];

        for (const dir of dirs) {
            await fs.mkdir(dir, { recursive: true });
        }

        logger.info('Directorios inicializados');
    }

    /**
     * Guardar archivo
     */
    async save(buffer, filename, subdir = '') {
        const targetDir = subdir
            ? path.join(this.documentsPath, subdir)
            : this.documentsPath;

        await fs.mkdir(targetDir, { recursive: true });

        const filePath = path.join(targetDir, filename);
        await fs.writeFile(filePath, buffer);

        logger.info(`Archivo guardado: ${filePath}`);
        return filePath;
    }

    /**
     * Guardar archivo temporal
     */
    async saveTemp(buffer, filename) {
        await fs.mkdir(this.tempPath, { recursive: true });

        const filePath = path.join(this.tempPath, `${Date.now()}_${filename}`);
        await fs.writeFile(filePath, buffer);

        return filePath;
    }

    /**
     * Leer archivo
     */
    async read(filePath) {
        return await fs.readFile(filePath);
    }

    /**
     * Leer como texto
     */
    async readText(filePath) {
        return await fs.readFile(filePath, 'utf-8');
    }

    /**
     * Mover archivo
     */
    async move(source, destination) {
        await fs.mkdir(path.dirname(destination), { recursive: true });
        await fs.rename(source, destination);
        logger.info(`Archivo movido: ${source} -> ${destination}`);
    }

    /**
     * Copiar archivo
     */
    async copy(source, destination) {
        await fs.mkdir(path.dirname(destination), { recursive: true });
        await fs.copyFile(source, destination);
        logger.info(`Archivo copiado: ${source} -> ${destination}`);
    }

    /**
     * Eliminar archivo
     */
    async delete(filePath) {
        try {
            await fs.unlink(filePath);
            logger.info(`Archivo eliminado: ${filePath}`);
            return true;
        } catch (error) {
            logger.error('Error al eliminar archivo', error);
            return false;
        }
    }

    /**
     * Verificar existencia
     */
    async exists(filePath) {
        try {
            await fs.access(filePath);
            return true;
        } catch {
            return false;
        }
    }

    /**
     * Obtener información de archivo
     */
    async getInfo(filePath) {
        const stats = await fs.stat(filePath);
        return {
            name: path.basename(filePath),
            path: filePath,
            size: stats.size,
            extension: path.extname(filePath),
            created: stats.birthtime,
            modified: stats.mtime,
            isFile: stats.isFile(),
            isDirectory: stats.isDirectory(),
        };
    }

    /**
     * Listar archivos en directorio
     */
    async list(dirPath, options = {}) {
        const { recursive = false, extensions = [] } = options;
        const files = [];

        try {
            const items = await fs.readdir(dirPath);

            for (const item of items) {
                const fullPath = path.join(dirPath, item);
                const stats = await fs.stat(fullPath);

                if (stats.isFile()) {
                    const ext = path.extname(item).toLowerCase();
                    if (extensions.length === 0 || extensions.includes(ext)) {
                        files.push({
                            name: item,
                            path: fullPath,
                            size: stats.size,
                            extension: ext,
                            modified: stats.mtime,
                        });
                    }
                } else if (stats.isDirectory() && recursive) {
                    const subFiles = await this.list(fullPath, options);
                    files.push(...subFiles);
                }
            }
        } catch (error) {
            logger.warn('Error al listar directorio', { path: dirPath, error: error.message });
        }

        return files;
    }

    /**
     * Limpiar archivos temporales
     */
    async cleanTemp(maxAge = 3600000) { // 1 hora por defecto
        try {
            const files = await this.list(this.tempPath);
            const now = Date.now();
            let deleted = 0;

            for (const file of files) {
                const age = now - file.modified.getTime();
                if (age > maxAge) {
                    await this.delete(file.path);
                    deleted++;
                }
            }

            logger.info(`Limpieza de temp: ${deleted} archivos eliminados`);
            return deleted;
        } catch (error) {
            logger.error('Error al limpiar temp', error);
            return 0;
        }
    }

    /**
     * Obtener estadísticas de almacenamiento
     */
    async getStats() {
        const stats = {
            documents: 0,
            generated: 0,
            temp: 0,
            totalSize: 0,
        };

        const dirs = [
            { key: 'documents', path: this.documentsPath },
            { key: 'generated', path: this.generatedPath },
            { key: 'temp', path: this.tempPath },
        ];

        for (const dir of dirs) {
            try {
                const files = await this.list(dir.path, { recursive: true });
                stats[dir.key] = files.length;
                stats.totalSize += files.reduce((sum, f) => sum + f.size, 0);
            } catch {
                // Ignorar si no existe
            }
        }

        stats.totalSizeMB = (stats.totalSize / (1024 * 1024)).toFixed(2);
        return stats;
    }
}

export default FileManager;
