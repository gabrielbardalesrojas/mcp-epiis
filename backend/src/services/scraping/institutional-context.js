import { WebScraperService } from './web-scraper.js';
import { AcademicPortalScraper } from './academic-portal-scraper.js';
import { allInstitutionalUrls, institutionalUrls } from '../../config/institutional-urls.js';
import { Logger } from '../../utils/logger.js';
import fs from 'fs/promises';
import path from 'path';

/**
 * Servicio de Contexto Institucional
 * Extrae y cachea información de las URLs institucionales para responder consultas
 */
export class InstitutionalContextService {
    constructor() {
        this.scraper = new WebScraperService();
        this.portalScraper = new AcademicPortalScraper();
        this.logger = new Logger('InstitutionalContext');
        this.cache = new Map();
        this.cacheFile = path.join(process.cwd(), 'storage', 'institutional-cache.json');
        this.initialized = false;
        this.cacheMaxAgeMs = 24 * 60 * 60 * 1000; // 24 horas

        // Mapeo de keywords a categorías de URLs para búsqueda inteligente
        this.categoryKeywords = {
            facultad: ['facultad', 'fiis', 'creación', 'historia', 'decanatura', 'decano', 'autoridades', 'autoridad', 'misión', 'visión', 'valores', 'organigrama'],
            departamentos: ['departamento', 'dace', 'dacis', 'docente', 'docentes', 'profesor', 'profesores', 'plana'],
            escuelas: ['escuela', 'epiis', 'epic', 'informática', 'sistemas', 'ciberseguridad', 'carrera', 'director'],
            posgrado: ['posgrado', 'postgrado', 'maestría', 'maestria', 'doctorado', 'dirección', 'direccion', 'unidad de posgrado'],
            investigacion: ['investigación', 'investigacion', 'investigador', 'renacyt', 'unidad de investigación', 'grupo', 'grupos'],
            academias: ['academia', 'academias', 'cisco', 'huawei', 'vmware', 'red hat', 'fortinet', 'certificación'],
            comisiones: ['comisión', 'comision', 'comisiones', 'prácticas', 'practicas', 'grados', 'títulos', 'titulos', 'pre-profesionales'],
            noticias: ['noticia', 'noticias', 'comunicado', 'comunicados', 'anuncio', 'anuncios', 'actualidad', 'novedades', 'prensa', 'boletín'],
            eventos: ['evento', 'eventos', 'charla', 'charlas', 'conferencia', 'conferencias', 'seminario', 'taller', 'talleres', 'reunión', 'reunion', 'maratón', 'maraton', 'pitch', 'demo day'],
        };
        // Cambiamos a 'data/context' para que NO aparezcan en la lista de gestión de documentos
        this.institutionalDocsDir = path.join(process.cwd(), 'data', 'context', 'institutional');
    }

    /**
     * Inicializar servicio cargando cache
     */
    async initialize() {
        try {
            const data = await fs.readFile(this.cacheFile, 'utf-8');
            const parsed = JSON.parse(data);
            this.cache = new Map(Object.entries(parsed.content));
            this.cacheUpdatedAt = parsed.updatedAt ? new Date(parsed.updatedAt) : null;
            this.logger.info(`Cache cargado: ${this.cache.size} páginas (actualizado: ${parsed.updatedAt || 'desconocido'})`);
            this.initialized = true;

            // Integrar datos del portal académico siempre al inicio
            this.portalScraper.run().then(() => {
                this.indexInstitutionalDocs().catch(e => this.logger.error('Error indexando docs institucionales', e));
            }).catch(e => this.logger.error('Error en portal scraper', e));

            // Auto-refresh si cache es viejo (más de 24h)
            if (this.isCacheStale()) {
                this.logger.info('Cache antiguo, actualizando información en background...');
                this.scrapeAllUrls().catch(e => this.logger.error('Error en auto-refresh', e));
            }
        } catch {
            this.logger.info('Iniciando carga de conocimiento institucional...');
            this.initialized = true;
            
            // Scrapear inmediatamente si no hay nada
            this.scrapeAllUrls().catch(e => this.logger.error('Error en scraping inicial', e));

            this.portalScraper.run().then(() => {
                this.indexInstitutionalDocs().catch(e => this.logger.error('Error indexando docs institucionales', e));
            }).catch(e => this.logger.error('Error en portal scraper', e));
        }
    }

    /**
     * Indexar documentos de texto en la carpeta storage/documents/institutional
     */
    async indexInstitutionalDocs() {
        try {
            await fs.mkdir(this.institutionalDocsDir, { recursive: true });
            const files = await fs.readdir(this.institutionalDocsDir);
            const textFiles = files.filter(f => f.endsWith('.txt'));

            this.logger.info(`Indexando ${textFiles.length} documentos institucionales desde disco...`);

            for (const file of textFiles) {
                const filePath = path.join(this.institutionalDocsDir, file);
                const content = await fs.readFile(filePath, 'utf-8');

                if (content.length < 50) continue;

                const url = `file://institutional/${file}`;
                this.cache.set(url, {
                    content: { title: file, fullText: content },
                    text: content,
                    title: file,
                    headers: [],
                    scrapedAt: new Date().toISOString(),
                });
            }
            this.logger.info(`Total páginas en cache tras indexación de disco: ${this.cache.size}`);
        } catch (error) {
            this.logger.error('Error indexando documentos institucionales:', error);
        }
    }

    /**
     * Verificar si el cache está viejo
     */
    isCacheStale() {
        if (!this.cacheUpdatedAt) return true;
        return (Date.now() - this.cacheUpdatedAt.getTime()) > this.cacheMaxAgeMs;
    }

    /**
     * Extraer información de todas las URLs con soporte para extracción profunda en la URL base
     */
    async scrapeAllUrls() {
        this.logger.info(`Iniciando scraping de ${allInstitutionalUrls.length} URLs...`);

        for (const url of allInstitutionalUrls) {
            try {
                // Si es la URL base de la facultad, hacer extracción profunda (recursiva)
                if (url === institutionalUrls.baseUrl || url === 'https://www.sistemasunas.edu.pe/') {
                    this.logger.info(`Realizando extracción profunda para la facultad: ${url}`);
                    const deepResults = await this.scraper.deepExtract(url, {
                        maxDepth: 1,
                        maxPages: 15,
                        extractType: 'structured'
                    });

                    for (const res of deepResults) {
                        if (res.success) {
                            this._processAndCacheContent(res.url, res.content);
                        }
                    }
                    continue;
                }

                const content = await this.scraper.extractContent(url, 'structured');
                this._processAndCacheContent(url, content);

                // Pequeña pausa para no sobrecargar
                await new Promise(r => setTimeout(r, 500));
            } catch (error) {
                this.logger.error(`✗ ${url}: ${error.message}`);
            }
        }

        // Guardar cache
        await this.saveCache();
        this.logger.info('Scraping completado');
    }

    /**
     * Procesa el contenido extraído y lo guarda en el cache
     * @private
     */
    _processAndCacheContent(url, content) {
        // Construir texto completo
        const fullText = content.fullText || '';
        const paragraphText = content.paragraphs?.join('\n') || '';
        const headerText = content.headers?.map(h => h.text).join('\n') || '';
        const listText = content.listItems?.join('\n') || '';

        // Combinar todo el texto disponible
        const combinedText = [headerText, fullText || paragraphText, listText]
            .filter(t => t.length > 0)
            .join('\n')
            .replace(/\n{3,}/g, '\n\n')
            .trim();

        if (combinedText.length < 50) return; // Ignorar páginas casi vacías

        this.cache.set(url, {
            content: content,
            text: combinedText,
            title: content.title || url,
            headers: content.headers || [],
            scrapedAt: new Date().toISOString(),
        });
        this.logger.info(`✓ ${url} (${combinedText.length} chars)`);
    }

    /**
     * Guardar cache en archivo
     */
    async saveCache() {
        const cacheDir = path.dirname(this.cacheFile);
        await fs.mkdir(cacheDir, { recursive: true });

        const data = {
            updatedAt: new Date().toISOString(),
            content: Object.fromEntries(this.cache),
        };

        await fs.writeFile(this.cacheFile, JSON.stringify(data, null, 2));
        this.cacheUpdatedAt = new Date();
        this.logger.info('Cache guardado');
    }

    /**
     * Normalizar texto para búsqueda (sin acentos, minúsculas)
     */
    normalizeText(text) {
        return text
            .toLowerCase()
            .normalize('NFD')
            .replace(/[\u0300-\u036f]/g, '')  // eliminar acentos
            .replace(/[^a-z0-9\s]/g, ' ')
            .replace(/\s+/g, ' ')
            .trim();
    }

    /**
     * Buscar información relevante para una consulta
     */
    searchContext(query) {
        const queryNorm = this.normalizeText(query);
        const results = [];

        // Palabras clave - NO filtrar por longitud (palabras como "fiis", "dace" son críticas)
        const keywords = queryNorm.split(/\s+/).filter(w => w.length > 1);

        // También buscar frases parciales (ej: "posgrado" matchea "unidad de posgrado")
        for (const [url, data] of this.cache) {
            const text = this.normalizeText((data.text || '') + ' ' + (data.title || ''));
            const urlNorm = this.normalizeText(url);
            let score = 0;

            // Calcular relevancia por keywords
            for (const keyword of keywords) {
                // Buscar en texto
                if (text.includes(keyword)) {
                    const matches = text.match(new RegExp(keyword, 'gi')) || [];
                    score += matches.length * 2;
                }
                // Buscar en URL (muy relevante)
                if (urlNorm.includes(keyword)) {
                    score += 5;
                }
                // Buscar en headers
                if (data.headers) {
                    for (const h of data.headers) {
                        if (this.normalizeText(h.text).includes(keyword)) {
                            score += 3;
                        }
                    }
                }
            }

            // Bonus si la consulta completa aparece en el texto
            if (text.includes(queryNorm)) {
                score += 10;
            }

            if (score > 0) {
                results.push({
                    url,
                    title: data.title,
                    content: data.text?.substring(0, 3000) || '', // Aumentado de 1500 a 3000
                    score,
                });
            }
        }

        // Ordenar por relevancia
        results.sort((a, b) => b.score - a.score);
        return results.slice(0, 4); // Aumentado de 3 a 4
    }

    /**
     * Determinar categorías relevantes para una consulta
     */
    getRelevantCategories(query) {
        const queryNorm = this.normalizeText(query);
        const relevantCategories = [];

        for (const [category, keywords] of Object.entries(this.categoryKeywords)) {
            for (const keyword of keywords) {
                if (queryNorm.includes(this.normalizeText(keyword))) {
                    relevantCategories.push(category);
                    break;
                }
            }
        }

        return relevantCategories;
    }

    /**
     * Buscar en cache y, si no hay resultados útiles, scrapear en tiempo real
     */
    async searchAndScrapeIfNeeded(query) {
        // Primero buscar en cache
        let results = this.searchContext(query);

        // Si hay resultados con score decente, devolverlos
        // Bajamos el umbral de 3 a 2 para capturar coincidencias únicas pero importantes
        if (results.length > 0 && results[0].score >= 2) {
            this.logger.info(`Encontrados ${results.length} resultados en cache (score máx: ${results[0].score})`);
            return results;
        }

        // Si no hay buenos resultados, hacer scraping de URLs relevantes
        this.logger.info('Cache no tiene resultados útiles, intentando scraping en tiempo real...');

        const relevantCategories = this.getRelevantCategories(query);
        let urlsToScrape = [];

        if (relevantCategories.length > 0) {
            // Scrapear URLs de las categorías relevantes
            for (const cat of relevantCategories) {
                const catUrls = institutionalUrls.getByCategory(cat);
                urlsToScrape.push(...catUrls);
            }
        } else {
            // Si no se detecta categoría, scrapear las URLs principales
            urlsToScrape = [
                'https://www.sistemasunas.edu.pe/nuestra-facultad/autoridades',
                'https://www.sistemasunas.edu.pe/',
                'https://www.sistemasunas.edu.pe/nuestra-facultad',
            ];
        }

        // Eliminar duplicados
        urlsToScrape = [...new Set(urlsToScrape)];
        this.logger.info(`Scrapeando ${urlsToScrape.length} URLs relevantes: ${relevantCategories.join(', ') || 'principales'}`);

        // Scrapear cada URL y actualizar cache
        for (const url of urlsToScrape) {
            try {
                const content = await this.scraper.extractContent(url, 'structured');
                const fullText = content.fullText || '';
                const paragraphText = content.paragraphs?.join('\n') || '';
                const headerText = content.headers?.map(h => h.text).join('\n') || '';
                const listText = content.listItems?.join('\n') || '';

                const combinedText = [headerText, fullText || paragraphText, listText]
                    .filter(t => t.length > 0)
                    .join('\n')
                    .replace(/\n{3,}/g, '\n\n')
                    .trim();

                this.cache.set(url, {
                    content,
                    text: combinedText,
                    title: content.title,
                    headers: content.headers || [],
                    scrapedAt: new Date().toISOString(),
                });
                this.logger.info(`✓ Scrapeado en tiempo real: ${url} (${combinedText.length} chars)`);
            } catch (error) {
                this.logger.error(`✗ Error scrapeando ${url}: ${error.message}`);
            }
        }

        // Guardar cache actualizado (en background)
        this.saveCache().catch(e => this.logger.error('Error guardando cache', e));

        // Buscar de nuevo con cache actualizado
        results = this.searchContext(query);
        this.logger.info(`Después de scraping: ${results.length} resultados (score máx: ${results[0]?.score || 0})`);

        return results;
    }

    /**
     * Obtener contexto formateado para el prompt
     */
    getContextForPrompt(query) {
        const results = this.searchContext(query);

        if (results.length === 0) {
            return '';
        }

        let context = '\n\n--- INFORMACIÓN INSTITUCIONAL ACTUALIZADA ---\n';
        for (const result of results) {
            context += `\nFuente: ${result.title} (${result.url})\n`;
            context += `${result.content}\n`;
        }
        context += '--- FIN INFORMACIÓN INSTITUCIONAL ---\n';

        return context;
    }

    /**
     * Obtener contexto con scraping en tiempo real si es necesario
     */
    async getContextForPromptAsync(query) {
        const results = await this.searchAndScrapeIfNeeded(query);

        if (results.length === 0) {
            return '';
        }

        let context = '\n\n--- INFORMACIÓN INSTITUCIONAL ACTUALIZADA ---\n';
        for (const result of results) {
            context += `\nFuente: ${result.title} (${result.url})\n`;
            context += `${result.content}\n`;
        }
        context += '--- FIN INFORMACIÓN INSTITUCIONAL ---\n';

        return context;
    }

    /**
     * Obtener toda la información como texto
     */
    getAllContent() {
        let all = '';
        for (const [url, data] of this.cache) {
            all += `\n=== ${data.title} ===\n${data.text}\n`;
        }
        return all;
    }

    /**
     * Verificar si tiene información
     */
    hasContent() {
        return this.cache.size > 0;
    }
}

export default InstitutionalContextService;
