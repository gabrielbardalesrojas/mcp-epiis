import axios from 'axios';
import * as cheerio from 'cheerio';
import fs from 'fs/promises'; // ← BUG FIX: faltaba en el original
import { Logger } from '../../utils/logger.js';

// ─── Constantes ────────────────────────────────────────────────────────────────

/** @enum {string} Tipos de extracción de contenido general */
export const EXTRACT_TYPE = Object.freeze({
  TEXT: 'text',
  STRUCTURED: 'structured',
  SUMMARY: 'summary',
});

/** @enum {string} Tipos de contenido académico */
export const ACADEMIC_CONTENT_TYPE = Object.freeze({
  NEWS: 'news',
  EVENTS: 'events',
  ANNOUNCEMENTS: 'announcements',
});

const UNIVERSITY_SECTIONS = Object.freeze([
  '/noticias',
  '/eventos',
  '/comunicados',
  '/convocatorias',
]);

const SUMMARY_MAX_CHARS = 2_000;

// ─── Tipos ─────────────────────────────────────────────────────────────────────

/**
 * @typedef {Object} ScraperConfig
 * @property {number} [timeout=30000]
 * @property {number} [maxRetries=2]
 * @property {string} [userAgent='EPIIS-MCP-Bot/1.0']
 */

/**
 * @typedef {Object} StructuredContent
 * @property {string}                            url
 * @property {string}                            title
 * @property {string}                            description
 * @property {{ level: string; text: string }[]} headers
 * @property {string[]}                          paragraphs
 * @property {string[]}                          listItems
 * @property {{ url: string; text: string }[]}   links
 * @property {{ url: string; alt: string }[]}    images
 * @property {string}                            fullText
 */

/**
 * @typedef {Object} NewsItem
 * @property {string} title
 * @property {string} date
 * @property {string} content
 */

/**
 * @typedef {Object} EventItem
 * @property {string} title
 * @property {string} date
 * @property {string} location
 * @property {string} description
 */

/**
 * @typedef {Object} AnnouncementItem
 * @property {string} title
 * @property {string} content
 * @property {string} date
 */

/**
 * @typedef {Object} TableData
 * @property {string[]}   headers
 * @property {string[][]} rows
 */

/**
 * @typedef {Object} ContactInfo
 * @property {string[]} emails
 * @property {string[]} phones
 * @property {string[]} addresses
 */

/**
 * @typedef {Object} UrlCheckResult
 * @property {boolean} accessible
 * @property {number}  [status]
 * @property {string}  [contentType]
 * @property {string}  [error]
 */

/**
 * @typedef {Object} ExtractionResult
 * @property {string}  url
 * @property {boolean} success
 * @property {*}       [content]
 * @property {string}  [error]
 */

// ─── Servicio ──────────────────────────────────────────────────────────────────

/**
 * Servicio de Web Scraping para extraer contenido de sitios institucionales.
 *
 * @example
 * const scraper = new WebScraperService({ timeout: 15000, maxRetries: 3 });
 * const text = await scraper.extractContent('https://unsm.edu.pe', 'text');
 */
export class WebScraperService {

  /** @param {ScraperConfig} config */
  constructor(config = {}) {
    this.timeout = config.timeout ?? 30_000;
    this.maxRetries = config.maxRetries ?? 2;
    this.userAgent = config.userAgent ?? 'EPIIS-MCP-Bot/1.0';
    this.logger = new Logger('WebScraperService');

    this.axiosInstance = axios.create({
      timeout: this.timeout,
      headers: { 'User-Agent': this.userAgent },
    });
  }

  // ── Extracción principal ──────────────────────────────────────────────────

  /**
   * Extrae contenido de una URL con reintentos automáticos.
   *
   * @param {string} url
   * @param {string} [extractType='text']
   * @returns {Promise<string | StructuredContent>}
   */
  async extractContent(url, extractType = EXTRACT_TYPE.TEXT) {
    this.logger.info(`Extrayendo contenido (${extractType}): ${url}`);
    const html = await this._fetchWithRetry(url);
    const $ = cheerio.load(html);

    switch (extractType) {
      case EXTRACT_TYPE.STRUCTURED:
        return this.extractStructured($, url);

      case EXTRACT_TYPE.SUMMARY: {
        const text = this.extractText($);
        return text.slice(0, SUMMARY_MAX_CHARS);
      }

      case EXTRACT_TYPE.TEXT:
      default:
        return this.extractText($);
    }
  }

  /**
   * Extrae contenido de múltiples URLs en paralelo.
   *
   * @param {string[]} urls
   * @param {string}   [extractType='text']
   * @returns {Promise<ExtractionResult[]>}
   */
  async extractMultiple(urls, extractType = EXTRACT_TYPE.TEXT) {
    const results = await Promise.allSettled(
      urls.map((url) => this.extractContent(url, extractType)),
    );

    return results.map((result, i) =>
      result.status === 'fulfilled'
        ? { url: urls[i], success: true, content: result.value }
        : { url: urls[i], success: false, error: result.reason?.message },
    );
  }

  // ── Extracción de texto ───────────────────────────────────────────────────

  /**
   * Extrae texto limpio de un documento Cheerio.
   *
   * @param {import('cheerio').CheerioAPI} $
   * @returns {string}
   */
  extractText($) {
    const $doc = cheerio.load($.html());

    $doc('script, style, noscript, iframe, svg, [style*="display:none"], [style*="display: none"]').remove();

    const main = $doc('main, article, .content, #content, .main-content, #main-content').first();
    const root = main.length && main.text().trim().length >= 100 ? main : $doc('body');

    return root.text()
      .replace(/\s+/g, ' ')
      .replace(/\n\s*\n/g, '\n')
      .trim();
  }

  // ── Extracción estructurada ───────────────────────────────────────────────

  /**
   * Extrae contenido estructurado (headers, párrafos, links, imágenes, etc.).
   *
   * @param {import('cheerio').CheerioAPI} $
   * @param {string} url
   * @returns {StructuredContent}
   */
  extractStructured($, url) {
    /** @type {StructuredContent} */
    const data = {
      url,
      title: $('title').text().trim(),
      description: $('meta[name="description"]').attr('content')?.trim() ?? '',
      headers: [],
      paragraphs: [],
      listItems: [],
      links: [],
      images: [],
      fullText: '',
    };

    // Encabezados
    $('h1, h2, h3, h4, h5, h6').each((_, elem) => {
      const text = $(elem).text().trim();
      if (text.length > 1) data.headers.push({ level: elem.tagName, text });
    });

    // Párrafos
    $('p').each((_, elem) => {
      const text = $(elem).text().trim();
      if (text.length > 15) data.paragraphs.push(text);
    });

    // Items de lista
    $('li, dt, dd').each((_, elem) => {
      const text = $(elem).text().trim();
      if (text.length > 10 && text.length < 500) data.listItems.push(text);
    });

    // Divs con contenido sustancial (sin duplicar párrafos)
    const seen = new Set(data.paragraphs);
    $('div.field-item, div.content, div.field-items, div.view-content, td, .views-field').each((_, elem) => {
      const text = $(elem).text().trim();
      if (text.length < 20 || text.length > 2_000 || seen.has(text)) return;

      const isDuplicate = [...seen].some((s) => s.includes(text) || text.includes(s));
      if (!isDuplicate) {
        data.paragraphs.push(text);
        seen.add(text);
      }
    });

    // Texto completo unificado
    data.fullText = [
      ...data.headers.map((h) => `[${h.level.toUpperCase()}] ${h.text}`),
      ...data.paragraphs,
      ...data.listItems,
    ].join('\n').replace(/\n{3,}/g, '\n\n').trim();

    // Enlaces
    $('a[href]').each((_, elem) => {
      const href = $(elem).attr('href');
      const text = $(elem).text().trim();
      if (href && text) data.links.push({ url: this._resolveUrl(url, href), text });
    });

    // Imágenes
    $('img[src]').each((_, elem) => {
      const src = $(elem).attr('src');
      if (src) {
        data.images.push({
          url: this._resolveUrl(url, src),
          alt: $(elem).attr('alt')?.trim() ?? '',
        });
      }
    });

    return data;
  }

  // ── Tablas ────────────────────────────────────────────────────────────────

  /**
   * Extrae todas las tablas de un documento Cheerio.
   *
   * @param {import('cheerio').CheerioAPI} $
   * @returns {TableData[]}
   */
  extractTables($) {
    const tables = [];

    $('table').each((_, table) => {
      const headers = $(table)
        .find('thead th, thead td')
        .map((_, cell) => $(cell).text().trim())
        .get();

      const rows = [];
      $(table).find('tbody tr').each((_, row) => {
        const rowData = $(row)
          .find('td')
          .map((_, cell) => $(cell).text().trim())
          .get();
        if (rowData.length) rows.push(rowData);
      });

      if (headers.length || rows.length) tables.push({ headers, rows });
    });

    return tables;
  }

  // ── Información de contacto ───────────────────────────────────────────────

  /**
   * Extrae emails y teléfonos del cuerpo de la página.
   *
   * @param {import('cheerio').CheerioAPI} $
   * @returns {ContactInfo}
   */
  extractContactInfo($) {
    const text = $('body').text();

    return {
      emails: [...new Set(text.match(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g) ?? [])],
      phones: [...new Set(text.match(/\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{3,4}|\d{9}/g) ?? [])],
      addresses: [],
    };
  }

  // ── Contenido académico ───────────────────────────────────────────────────

  /**
   * Extrae contenido académico especializado (noticias, eventos, anuncios).
   *
   * @param {string} url
   * @param {string} [contentType='news']
   * @returns {Promise<NewsItem[] | EventItem[] | AnnouncementItem[] | string>}
   */
  async extractAcademicContent(url, contentType = ACADEMIC_CONTENT_TYPE.NEWS) {
    this.logger.info(`Extrayendo contenido académico (${contentType}): ${url}`);
    const html = await this._fetchWithRetry(url);
    const $ = cheerio.load(html);

    switch (contentType) {
      case ACADEMIC_CONTENT_TYPE.NEWS: return this._extractNews($);
      case ACADEMIC_CONTENT_TYPE.EVENTS: return this._extractEvents($);
      case ACADEMIC_CONTENT_TYPE.ANNOUNCEMENTS: return this._extractAnnouncements($);
      default: return this.extractText($);
    }
  }

  /**
   * Extrae todos los enlaces a PDFs de una página.
   *
   * @param {string} url
   * @returns {Promise<{ url: string; title: string }[]>}
   */
  async extractPDFLinks(url) {
    this.logger.info(`Extrayendo enlaces PDF: ${url}`);
    const html = await this._fetchWithRetry(url);
    const $ = cheerio.load(html);

    return $('a[href$=".pdf"], a[href*=".pdf?"]')
      .map((_, elem) => ({
        url: this._resolveUrl(url, $(elem).attr('href')),
        title: $(elem).text().trim() || 'PDF sin título',
      }))
      .get();
  }

  /**
   * Extrae contenido de las secciones principales de un portal universitario en paralelo.
   *
   * @param {string} baseUrl
   * @returns {Promise<Record<string, StructuredContent | null>>}
   */
  async extractUniversityPortal(baseUrl) {
    this.logger.info(`Extrayendo portal universitario: ${baseUrl}`);
    const results = {};

    await Promise.allSettled(
      UNIVERSITY_SECTIONS.map(async (section) => {
        try {
          results[section] = await this.extractContent(
            `${baseUrl}${section}`,
            EXTRACT_TYPE.STRUCTURED,
          );
        } catch {
          this.logger.warn(`Sección no disponible: ${section}`);
          results[section] = null;
        }
      }),
    );

    return results;
  }

  /**
   * Extrae contenido de una URL y sus sub-enlaces de forma recursiva.
   *
   * @param {string} url - URL raíz
   * @param {Object} options - Opciones de rastreo
   * @param {number} [options.maxDepth=1] - Profundidad máxima
   * @param {number} [options.maxPages=10] - Límite de páginas
   * @param {string} [options.extractType='text'] - Tipo de extracción por página
   * @returns {Promise<ExtractionResult[]>}
   */
  async deepExtract(url, options = {}) {
    const maxDepth = options.maxDepth ?? 1;
    const maxPages = options.maxPages ?? 10;
    const extractType = options.extractType ?? EXTRACT_TYPE.TEXT;

    this.logger.info(`Iniciando extracción profunda en ${url} (Depth: ${maxDepth}, Pages: ${maxPages})`);

    const visited = new Set();
    const queue = [{ url, depth: 0 }];
    const results = [];
    const domain = new URL(url).hostname;

    while (queue.length > 0 && results.length < maxPages) {
      const { url: currentUrl, depth } = queue.shift();

      if (visited.has(currentUrl)) continue;
      visited.add(currentUrl);

      try {
        const html = await this._fetchWithRetry(currentUrl);
        const $ = cheerio.load(html);
        const content = extractType === EXTRACT_TYPE.STRUCTURED
          ? this.extractStructured($, currentUrl)
          : this.extractText($);

        results.push({ url: currentUrl, success: true, content });

        // Si no hemos llegado al máximo de profundidad, buscar más enlaces
        if (depth < maxDepth) {
          const links = $('a[href]')
            .map((_, elem) => this._resolveUrl(currentUrl, $(elem).attr('href')))
            .get()
            .filter((link) => {
              try {
                const linkUrl = new URL(link);
                // Quedarse en el mismo dominio o subdominio
                return linkUrl.hostname.endsWith(domain) && !visited.has(link);
              } catch {
                return false;
              }
            });

          for (const link of [...new Set(links)]) {
            if (results.length + queue.length < maxPages * 2) { // Limitar cola para no explotar
              queue.push({ url: link, depth: depth + 1 });
            }
          }
        }
      } catch (error) {
        this.logger.warn(`Error al extraer ${currentUrl}: ${error.message}`);
        results.push({ url: currentUrl, success: false, error: error.message });
      }
    }

    return results;
  }

  // ── Utilidades de red ─────────────────────────────────────────────────────

  /**
   * Descarga un archivo binario a disco.
   *
   * @param {string} url
   * @param {string} outputPath
   * @returns {Promise<string>}
   */
  async downloadFile(url, outputPath) {
    this.logger.info(`Descargando archivo: ${url}`);
    try {
      const response = await this.axiosInstance.get(url, { responseType: 'arraybuffer' });
      await fs.writeFile(outputPath, response.data);
      this.logger.info(`Archivo guardado: ${outputPath}`);
      return outputPath;
    } catch (error) {
      this.logger.error('Error al descargar archivo', error);
      throw new Error(`No se pudo descargar ${url}: ${error.message}`);
    }
  }

  /**
   * Verifica si una URL es accesible mediante HEAD request.
   *
   * @param {string} url
   * @returns {Promise<UrlCheckResult>}
   */
  async checkUrl(url) {
    try {
      const { status, headers } = await this.axiosInstance.head(url);
      return { accessible: true, status, contentType: headers['content-type'] };
    } catch (error) {
      return { accessible: false, error: error.message };
    }
  }

  // ── Métodos privados ──────────────────────────────────────────────────────

  /**
   * GET con reintentos y backoff exponencial: 500ms → 1s → 2s.
   *
   * @param {string} url
   * @returns {Promise<string>}
   * @private
   */
  async _fetchWithRetry(url) {
    let lastError;

    for (let attempt = 0; attempt <= this.maxRetries; attempt++) {
      try {
        const { data } = await this.axiosInstance.get(url);
        return data;
      } catch (error) {
        lastError = error;
        if (attempt < this.maxRetries) {
          const delay = 500 * 2 ** attempt;
          this.logger.warn(`Reintento ${attempt + 1}/${this.maxRetries} para ${url} en ${delay}ms`);
          await new Promise((resolve) => setTimeout(resolve, delay));
        }
      }
    }

    this.logger.error(`Error definitivo al acceder a ${url}`, lastError);
    throw new Error(`Error al obtener ${url}: ${lastError.message}`);
  }

  /**
   * Resuelve una URL relativa respecto a una base.
   *
   * @param {string} base
   * @param {string} relative
   * @returns {string}
   * @private
   */
  _resolveUrl(base, relative) {
    try {
      return new URL(relative, base).href;
    } catch {
      return relative;
    }
  }

  /**
   * @param {import('cheerio').CheerioAPI} $
   * @returns {NewsItem[]}
   * @private
   */
  _extractNews($) {
    const news = [];
    const selectors = ['article', '.news-item', '.post', '.noticia'];

    for (const selector of selectors) {
      $(selector).each((_, elem) => {
        const title = $(elem).find('h1, h2, h3, .title').first().text().trim();
        const date = $(elem).find('.date, time, .fecha').first().text().trim();
        const content = $(elem).find('p, .content, .texto').text().trim();
        if (title) news.push({ title, date, content });
      });
      if (news.length) break;
    }

    return news;
  }

  /**
   * @param {import('cheerio').CheerioAPI} $
   * @returns {EventItem[]}
   * @private
   */
  _extractEvents($) {
    const events = [];

    $('.event, .evento, article').each((_, elem) => {
      const title = $(elem).find('h1, h2, h3, .title').first().text().trim();
      const date = $(elem).find('.date, time, .fecha').first().text().trim();
      const location = $(elem).find('.location, .lugar').first().text().trim();
      const description = $(elem).find('p, .description').first().text().trim();
      if (title) events.push({ title, date, location, description });
    });

    return events;
  }

  /**
   * @param {import('cheerio').CheerioAPI} $
   * @returns {AnnouncementItem[]}
   * @private
   */
  _extractAnnouncements($) {
    const announcements = [];

    $('.announcement, .comunicado, .aviso').each((_, elem) => {
      const title = $(elem).find('h1, h2, h3').first().text().trim();
      const content = $(elem).find('p').text().trim();
      const date = $(elem).find('.date, time').text().trim();
      if (title) announcements.push({ title, content, date });
    });

    return announcements;
  }
}

export default WebScraperService;