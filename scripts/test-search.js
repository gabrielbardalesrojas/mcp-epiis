import { InstitutionalContextService } from '../backend/src/services/scraping/institutional-context.js';
import dotenv from 'dotenv';
dotenv.config();

async function test() {
    const service = new InstitutionalContextService();
    console.log('--- Probando búsqueda: "quien es el decano" ---');
    const results = await service.searchAndScrapeIfNeeded('quien es el decano');

    if (results.length === 0) {
        console.log('No se encontraron resultados.');
    } else {
        results.forEach((r, i) => {
            console.log(`\nResult ${i + 1}: ${r.title} (Score: ${r.score})`);
            console.log(`URL: ${r.url}`);
            console.log(`Content: ${r.content.substring(0, 200)}...`);
        });
    }
}

test().catch(console.error);
