import axios from 'axios';
import * as cheerio from 'cheerio';
import fs from 'fs/promises';
import path from 'path';
import { Logger } from '../../utils/logger.js';

/**
 * Scraper especializado para el Portal Académico de la UNAS
 * Extrae Planes de Estudio y Calendario Académico
 */
export class AcademicPortalScraper {
    constructor() {
        this.baseUrl = 'https://academico.unas.edu.pe';
        this.logger = new Logger('AcademicPortalScraper');
        this.storagePath = path.join(process.cwd(), 'storage', 'documents', 'institutional');

        this.schoolAcronyms = [
            'fa-epa',       // Agronomía
            'fz-epz',       // Zootecnia
            'fiia-epiia',   // Industrias Alimentarias
            'frnr-epif',    // Forestal
            'fcea-epa',     // Administración
            'fcea-epc',     // Contabilidad
            'fcea-epe',     // Economía
            'fiis-epiis',   // Informática y Sistemas
            'fiis-epic',    // Ciberseguridad
            'fce-epe',      // Educación
            'fca-epca',     // Ambiental
            'fca-epca-m',   // Ambiental (Moyobamba)
        ];
    }

    /**
     * Ejecutar scraping completo
     */
    async run() {
        this.logger.info('Iniciando scraping del Portal Académico...');
        await fs.mkdir(this.storagePath, { recursive: true });

        try {
            await this.scrapeCalendar();
            await this.scrapeAllStudyPlans();
            this.logger.info('Scraping del Portal Académico completado con éxito');
        } catch (error) {
            this.logger.error('Error general en AcademicPortalScraper:', error.message);
        }
    }

    /**
     * Extraer Calendario Académico
     */
    async scrapeCalendar() {
        try {
            this.logger.info('Extrayendo Calendario Académico...');
            // Intentamos obtener el calendario del periodo actual (aproximado por año)
            const currentYear = new Date().getFullYear();
            const url = `${this.baseUrl}/calendario-academico/${currentYear}-1`;

            const response = await axios.get(url);
            const $ = cheerio.load(response.data);

            let calendarText = `CALENDARIO ACADÉMICO UNAS ${currentYear}-I\n\n`;

            $('table tr').each((i, row) => {
                const cols = $(row).find('td');
                if (cols.length >= 2) {
                    const date = $(cols[0]).text().trim();
                    const activity = $(cols[1]).text().trim();
                    if (date && activity) {
                        calendarText += `- ${date}: ${activity}\n`;
                    }
                }
            });

            const filePath = path.join(this.storagePath, `calendario_${currentYear}.txt`);
            await fs.writeFile(filePath, calendarText);
            this.logger.info(`Calendario guardado en: ${filePath}`);
        } catch (error) {
            this.logger.error('Error extrayendo calendario:', error.message);
        }
    }

    /**
     * Extraer todos los planes de estudio conocidos
     */
    async scrapeAllStudyPlans() {
        for (const acronym of this.schoolAcronyms) {
            try {
                this.logger.info(`Extrayendo Planes de Estudio para: ${acronym}`);

                const planListUrl = `${this.baseUrl}/planes-de-estudio/${acronym}`;
                const listResponse = await axios.get(planListUrl);
                const $list = cheerio.load(listResponse.data);

                const currCodes = [];
                // Actualizado para buscar enlaces con la clase específica y extraer codcurr del href
                $list('a.btn-showstudyplan[href*="planes-de-estudio"]').each((i, link) => {
                    const href = $list(link).attr('href');
                    this.logger.debug(`Encontrado enlace de plan: ${href}`);

                    const parts = href.split('/');
                    if (parts.length >= 4) {
                        const codcurr = parts[parts.length - 1];
                        currCodes.push(codcurr);
                        this.logger.info(`Código detectado desde href: ${codcurr}`);
                    }
                });

                if (currCodes.length === 0) {
                    this.logger.warn(`No se encontraron códigos en el HTML de ${acronym}. Probando selector alternativo...`);
                    // Fallback: buscar botones que podrían tener el código en onclick (comportamiento antiguo)
                    $list('button[onclick*="showStudyPlan"]').each((i, btn) => {
                        const onclick = $list(btn).attr('onclick');
                        const match = onclick.match(/['"]([^'"]+)['"]\s*,\s*['"]([^'"]+)['"]/);
                        if (match) {
                            currCodes.push(match[2]);
                            this.logger.info(`Código detectado desde onclick fallback: ${match[2]}`);
                        }
                    });
                }

                if (currCodes.length === 0) {
                    this.logger.warn(`Definitivamente no se encontraron códigos para ${acronym}`);
                    continue;
                }

                // Extraer el plan más reciente
                const latestCurr = currCodes[0];
                await this.scrapeSpecificPlan(acronym, latestCurr);

            } catch (error) {
                this.logger.error(`Error en planes de ${acronym}: ${error.message}`);
            }
        }
    }

    /**
     * Extraer un plan de estudio específico vía AJAX
     */
    async scrapeSpecificPlan(acronym, codcurr) {
        try {
            const formData = new URLSearchParams();
            formData.append('load', 'StudyPlansController@showStudyPlan');
            formData.append('data[acronym]', acronym);
            formData.append('data[codcurr]', codcurr);

            const response = await axios.post(this.baseUrl, formData.toString(), {
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8',
                    'X-Requested-With': 'XMLHttpRequest'
                }
            });

            const $ = cheerio.load(response.data);
            let planText = `PLAN DE ESTUDIOS - ESCUELA: ${acronym.toUpperCase()} - CÓDIGO: ${codcurr}\n\n`;

            $('table tr').each((i, row) => {
                const cols = $(row).find('td');
                if (cols.length >= 2) {
                    const code = $(cols[0]).text().trim();
                    const name = $(cols[1]).text().trim();
                    const credits = $(cols[2])?.text().trim() || '';
                    if (code && name) {
                        planText += `${code} | ${name} | Créditos: ${credits}\n`;
                    }
                }
            });

            const fileName = `plan_${acronym}_${codcurr}.txt`.replace(/[^a-z0-9_.]/gi, '_');
            const filePath = path.join(this.storagePath, fileName);
            await fs.writeFile(filePath, planText);
            this.logger.info(`Plan guardado: ${fileName}`);
        } catch (error) {
            const errorMsg = error.response ?
                `Status: ${error.response.status} - ${JSON.stringify(error.response.data).substring(0, 200)}` :
                error.message;
            this.logger.error(`Error en plan específico ${acronym}/${codcurr}: ${errorMsg}`);
        }
    }
}
