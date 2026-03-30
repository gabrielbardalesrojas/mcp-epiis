/**
 * Limpiador de Contenido
 * Procesa y limpia contenido extraído de páginas web
 */

/**
 * Limpiar HTML
 */
export const cleanHtml = (html) => {
    if (!html) return '';

    return html
        // Eliminar scripts y estilos
        .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
        .replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, '')
        // Eliminar comentarios
        .replace(/<!--[\s\S]*?-->/g, '')
        // Eliminar tags
        .replace(/<[^>]+>/g, ' ')
        // Decodificar entidades HTML
        .replace(/&nbsp;/g, ' ')
        .replace(/&amp;/g, '&')
        .replace(/&lt;/g, '<')
        .replace(/&gt;/g, '>')
        .replace(/&quot;/g, '"')
        .replace(/&#39;/g, "'")
        // Limpiar espacios
        .replace(/\s+/g, ' ')
        .trim();
};

/**
 * Limpiar texto
 */
export const cleanText = (text) => {
    if (!text) return '';

    return text
        // Normalizar saltos de línea
        .replace(/\r\n/g, '\n')
        .replace(/\r/g, '\n')
        // Eliminar líneas vacías múltiples
        .replace(/\n{3,}/g, '\n\n')
        // Eliminar espacios múltiples
        .replace(/[ \t]+/g, ' ')
        // Eliminar espacios al inicio/fin de líneas
        .split('\n')
        .map(line => line.trim())
        .join('\n')
        .trim();
};

/**
 * Extraer texto principal
 */
export const extractMainContent = (text) => {
    if (!text) return '';

    const lines = text.split('\n');
    const contentLines = [];

    for (const line of lines) {
        // Filtrar líneas muy cortas (menús, navegación)
        if (line.length < 10) continue;

        // Filtrar patrones de navegación
        if (/^(menu|nav|header|footer|sidebar)/i.test(line)) continue;
        if (/^(home|inicio|contacto|buscar)/i.test(line)) continue;

        // Filtrar líneas con muchos enlaces
        if ((line.match(/\|/g) || []).length > 3) continue;

        contentLines.push(line);
    }

    return contentLines.join('\n').trim();
};

/**
 * Eliminar boilerplate
 */
export const removeBoilerplate = (text) => {
    if (!text) return '';

    const boilerplatePatterns = [
        /copyright\s*©?\s*\d{4}/gi,
        /all rights reserved/gi,
        /todos los derechos reservados/gi,
        /política de privacidad/gi,
        /términos y condiciones/gi,
        /cookies policy/gi,
        /suscríbete a nuestro newsletter/gi,
        /síguenos en redes sociales/gi,
        /compartir en (facebook|twitter|linkedin)/gi,
    ];

    let cleaned = text;

    for (const pattern of boilerplatePatterns) {
        cleaned = cleaned.replace(pattern, '');
    }

    return cleanText(cleaned);
};

/**
 * Normalizar para búsqueda
 */
export const normalizeForSearch = (text) => {
    if (!text) return '';

    return text
        .toLowerCase()
        // Eliminar acentos
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        // Eliminar caracteres especiales
        .replace(/[^a-z0-9\s]/g, ' ')
        // Normalizar espacios
        .replace(/\s+/g, ' ')
        .trim();
};

/**
 * Truncar texto preservando palabras
 */
export const truncate = (text, maxLength = 500) => {
    if (!text || text.length <= maxLength) return text;

    const truncated = text.substring(0, maxLength);
    const lastSpace = truncated.lastIndexOf(' ');

    if (lastSpace > maxLength * 0.8) {
        return truncated.substring(0, lastSpace) + '...';
    }

    return truncated + '...';
};

/**
 * Extraer oraciones
 */
export const extractSentences = (text, maxSentences = 10) => {
    if (!text) return [];

    const sentences = text.match(/[^.!?]+[.!?]+/g) || [];
    return sentences.slice(0, maxSentences).map(s => s.trim());
};

/**
 * Detectar idioma (básico)
 */
export const detectLanguage = (text) => {
    if (!text) return 'unknown';

    const spanishWords = ['el', 'la', 'de', 'que', 'en', 'un', 'es', 'por', 'con', 'para'];
    const englishWords = ['the', 'be', 'to', 'of', 'and', 'a', 'in', 'that', 'have', 'it'];

    const words = text.toLowerCase().split(/\s+/);
    let spanishCount = 0;
    let englishCount = 0;

    for (const word of words) {
        if (spanishWords.includes(word)) spanishCount++;
        if (englishWords.includes(word)) englishCount++;
    }

    if (spanishCount > englishCount) return 'es';
    if (englishCount > spanishCount) return 'en';
    return 'unknown';
};

export default {
    cleanHtml,
    cleanText,
    extractMainContent,
    removeBoilerplate,
    normalizeForSearch,
    truncate,
    extractSentences,
    detectLanguage,
};
