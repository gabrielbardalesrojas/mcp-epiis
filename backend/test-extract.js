import { PDFParser } from '../src/services/document/pdf-parser.js';
import path from 'path';

async function test() {
    const parser = new PDFParser();
    const filePath = 'c:\\Users\\HP\\Downloads\\llama3\\epiis-mcp-server\\backend\\storage\\documents\\general\\Reglamento de PPP FIIS.pdf';
    try {
        const result = await parser.parse(filePath);
        console.log("--- START TEXT ---");
        console.log(result.text);
        console.log("--- END TEXT ---");
    } catch (e) {
        console.error(e);
    }
}

test();
