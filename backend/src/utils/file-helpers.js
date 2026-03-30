import fs from 'fs/promises';
import path from 'path';

/**
 * Verificar si un archivo existe
 * @param {string} filePath - Ruta del archivo
 * @returns {Promise<boolean>}
 */
export const fileExists = async (filePath) => {
    try {
        await fs.access(filePath);
        return true;
    } catch {
        return false;
    }
};

/**
 * Crear directorio si no existe
 * @param {string} dirPath - Ruta del directorio
 */
export const ensureDir = async (dirPath) => {
    await fs.mkdir(dirPath, { recursive: true });
};

/**
 * Obtener información de archivo
 * @param {string} filePath - Ruta del archivo
 * @returns {Promise<object|null>}
 */
export const getFileInfo = async (filePath) => {
    try {
        const stats = await fs.stat(filePath);
        return {
            name: path.basename(filePath),
            path: filePath,
            size: stats.size,
            extension: path.extname(filePath).toLowerCase(),
            isFile: stats.isFile(),
            isDirectory: stats.isDirectory(),
            created: stats.birthtime,
            modified: stats.mtime,
        };
    } catch {
        return null;
    }
};

/**
 * Listar archivos en directorio
 * @param {string} dirPath - Ruta del directorio
 * @param {object} options - Opciones
 * @returns {Promise<object[]>}
 */
export const listFiles = async (dirPath, options = {}) => {
    const {
        extensions = [],
        recursive = false,
        includeHidden = false
    } = options;

    const results = [];

    try {
        const items = await fs.readdir(dirPath);

        for (const item of items) {
            if (!includeHidden && item.startsWith('.')) continue;

            const fullPath = path.join(dirPath, item);
            const stats = await fs.stat(fullPath);

            if (stats.isFile()) {
                const ext = path.extname(item).toLowerCase();

                if (extensions.length === 0 || extensions.includes(ext)) {
                    results.push({
                        name: item,
                        path: fullPath,
                        size: stats.size,
                        extension: ext,
                        modified: stats.mtime,
                    });
                }
            } else if (stats.isDirectory() && recursive) {
                const subFiles = await listFiles(fullPath, options);
                results.push(...subFiles);
            }
        }
    } catch {
        // Directorio no existe o no accesible
    }

    return results;
};

/**
 * Copiar archivo
 * @param {string} source - Origen
 * @param {string} destination - Destino
 */
export const copyFile = async (source, destination) => {
    await ensureDir(path.dirname(destination));
    await fs.copyFile(source, destination);
};

/**
 * Mover archivo
 * @param {string} source - Origen
 * @param {string} destination - Destino
 */
export const moveFile = async (source, destination) => {
    await ensureDir(path.dirname(destination));
    await fs.rename(source, destination);
};

/**
 * Eliminar archivo o directorio
 * @param {string} targetPath - Ruta a eliminar
 * @param {boolean} recursive - Eliminar recursivamente si es directorio
 */
export const remove = async (targetPath, recursive = false) => {
    try {
        const stats = await fs.stat(targetPath);

        if (stats.isDirectory() && recursive) {
            await fs.rm(targetPath, { recursive: true });
        } else {
            await fs.unlink(targetPath);
        }
        return true;
    } catch {
        return false;
    }
};

/**
 * Leer archivo como texto
 * @param {string} filePath - Ruta del archivo
 * @returns {Promise<string>}
 */
export const readText = async (filePath) => {
    return await fs.readFile(filePath, 'utf-8');
};

/**
 * Escribir texto a archivo
 * @param {string} filePath - Ruta del archivo
 * @param {string} content - Contenido
 */
export const writeText = async (filePath, content) => {
    await ensureDir(path.dirname(filePath));
    await fs.writeFile(filePath, content, 'utf-8');
};

/**
 * Obtener tamaño de directorio
 * @param {string} dirPath - Ruta del directorio
 * @returns {Promise<number>}
 */
export const getDirSize = async (dirPath) => {
    let size = 0;

    try {
        const files = await listFiles(dirPath, { recursive: true });
        for (const file of files) {
            size += file.size;
        }
    } catch {
        // Ignorar errores
    }

    return size;
};

/**
 * Formatear bytes a string legible
 * @param {number} bytes - Bytes
 * @returns {string}
 */
export const formatBytes = (bytes) => {
    if (bytes === 0) return '0 Bytes';

    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));

    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
};

export default {
    fileExists,
    ensureDir,
    getFileInfo,
    listFiles,
    copyFile,
    moveFile,
    remove,
    readText,
    writeText,
    getDirSize,
    formatBytes,
};
