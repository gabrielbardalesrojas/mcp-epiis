import fs from 'fs';
const data = JSON.parse(fs.readFileSync('c:\\Users\\HP\\Downloads\\llama3\\epiis-mcp-server\\backend\\storage\\institutional-cache.json', 'utf-8'));
console.log(Object.keys(data.content));
