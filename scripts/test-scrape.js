
import { WebScraperService } from '../backend/src/services/scraping/web-scraper.js';

async function testScrape() {
    const scraper = new WebScraperService();
    const url = 'https://www.sistemasunas.edu.pe/comisiones';

    console.log(`Scraping ${url}...`);
    try {
        const content = await scraper.extractContent(url, 'structured');
        const fullText = content.fullText || '';

        // Logic from InstitutionalContextService to build combined text
        const paragraphText = content.paragraphs?.join('\n') || '';
        const headerText = content.headers?.map(h => h.text).join('\n') || '';
        const listText = content.listItems?.join('\n') || '';

        const combinedText = [headerText, fullText || paragraphText, listText]
            .filter(t => t.length > 0)
            .join('\n')
            .replace(/\n{3,}/g, '\n\n')
            .trim();

        console.log(`Full Text Length: ${combinedText.length}`);
        console.log('--- PREVIEW START ---');
        console.log(combinedText.substring(0, 500));
        console.log('--- PREVIEW END ---');

        if (combinedText.length > 1500) {
            console.log('⚠️ ALERT: Content length exceeds 1500 characters. Current implementation truncates this!');
            console.log('Truncated version would look like:');
            console.log(combinedText.substring(0, 1500) + '...');
        }

    } catch (error) {
        console.error('Error:', error);
    }
}

testScrape();
