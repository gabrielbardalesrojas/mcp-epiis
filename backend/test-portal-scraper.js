import { AcademicPortalScraper } from './src/services/scraping/academic-portal-scraper.js';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.join(process.cwd(), '..', '.env') });

async function testScraper() {
    console.log('--- TEST DE SCRAPER DEL PORTAL ACADÉMICO ---');
    const scraper = new AcademicPortalScraper();

    // Probar primero el calendario que es más rápido
    console.log('\n1. Probando Calendario Académico...');
    await scraper.scrapeCalendar();

    // Probar un plan específico (Agronomía)
    console.log('\n2. Probando Plan de Estudio (Agronomía - fa-epa)...');
    await scraper.scrapeSpecificPlan('fa-epa', 'FA2018-2020');

    console.log('\n3. Listando planes para Sistemas (para ver códigos)...');
    try {
        await scraper.scrapeAllStudyPlans();
    } catch (e) {
        console.error('Error en scrapeAll:', e.message);
    }

    console.log('\n--- FIN DEL TEST ---');
}

testScraper().catch(console.error);
