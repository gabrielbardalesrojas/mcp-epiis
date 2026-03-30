#!/usr/bin/env node

import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.join(__dirname, '..');

/**
 * Script de configuración inicial del proyecto EPIIS MCP
 */

async function setup() {
  console.log('🚀 Iniciando configuración del servidor EPIIS MCP...\n');

  // 1. Crear directorios necesarios
  console.log('📁 Creando estructura de directorios...');
  const directories = [
    'storage',
    'storage/documents',
    'storage/documents/silabos',
    'storage/documents/resoluciones',
    'storage/documents/informes',
    'storage/documents/reglamentos',
    'storage/documents/planes-estudio',
    'storage/generated',
    'storage/templates',
    'storage/chromadb',
    'storage/temp',
    'logs',
    'database',
  ];

  for (const dir of directories) {
    const dirPath = path.join(rootDir, dir);
    try {
      await fs.mkdir(dirPath, { recursive: true });
      console.log(`  ✓ ${dir}`);
    } catch (error) {
      console.error(`  ✗ Error creando ${dir}:`, error.message);
    }
  }

  // 2. Copiar .env.example a .env si no existe
  console.log('\n⚙️  Configurando variables de entorno...');
  const envExample = path.join(rootDir, '.env.example');
  const envFile = path.join(rootDir, '.env');

  try {
    await fs.access(envFile);
    console.log('  ℹ  Archivo .env ya existe');
  } catch {
    await fs.copyFile(envExample, envFile);
    console.log('  ✓ Archivo .env creado desde .env.example');
  }

  // 3. Crear archivos de ejemplo
  console.log('\n📄 Creando archivos de ejemplo...');
  
  // README para storage/documents
  const docsReadme = `# Documentos Académicos EPIIS

Esta carpeta almacena todos los documentos académicos organizados por tipo:

- **silabos/**: Sílabos de cursos
- **resoluciones/**: Resoluciones administrativas y académicas
- **informes/**: Informes institucionales
- **reglamentos/**: Reglamentos y normativas
- **planes-estudio/**: Planes de estudio y mallas curriculares

## Cómo agregar documentos

1. Copiar archivos a la carpeta correspondiente
2. Ejecutar el script de indexación: \`npm run index-docs\`
3. Los documentos estarán disponibles para búsqueda semántica

## Formatos soportados

- PDF (.pdf)
- Word (.docx)
- Texto plano (.txt)
`;

  await fs.writeFile(
    path.join(rootDir, 'storage/documents/README.md'),
    docsReadme
  );
  console.log('  ✓ README.md en storage/documents');

  // 4. Verificar Ollama
  console.log('\n🤖 Verificando instalación de Ollama...');
  try {
    const { default: Ollama } = await import('ollama');
    const ollama = new Ollama({ host: 'http://localhost:11434' });
    
    try {
      await ollama.list();
      console.log('  ✓ Ollama está corriendo');
      
      // Verificar modelos
      const models = await ollama.list();
      const hasLlama = models.models.some(m => m.name.includes('llama'));
      const hasEmbed = models.models.some(m => m.name.includes('nomic-embed'));
      
      if (!hasLlama) {
        console.log('  ⚠  Modelo Llama no encontrado');
        console.log('     Descarga con: ollama pull llama3.2');
      } else {
        console.log('  ✓ Modelo Llama disponible');
      }
      
      if (!hasEmbed) {
        console.log('  ⚠  Modelo de embeddings no encontrado');
        console.log('     Descarga con: ollama pull nomic-embed-text');
      } else {
        console.log('  ✓ Modelo de embeddings disponible');
      }
    } catch (error) {
      console.log('  ✗ Ollama no está corriendo');
      console.log('     Inicia Ollama antes de usar el servidor MCP');
    }
  } catch (error) {
    console.log('  ✗ Ollama no está instalado');
    console.log('     Instala desde: https://ollama.ai');
  }

  // 5. Instrucciones finales
  console.log('\n✅ Configuración completada!\n');
  console.log('📋 Próximos pasos:\n');
  console.log('1. Asegúrate de que Ollama esté corriendo:');
  console.log('   ollama serve\n');
  console.log('2. Descarga los modelos necesarios:');
  console.log('   ollama pull llama3.2');
  console.log('   ollama pull nomic-embed-text\n');
  console.log('3. Agrega documentos a storage/documents/<tipo>/\n');
  console.log('4. Indexa los documentos:');
  console.log('   npm run index-docs\n');
  console.log('5. Inicia el servidor MCP:');
  console.log('   npm start\n');
  console.log('6. O inicia la API REST (opcional):');
  console.log('   npm run api\n');
}

setup().catch(console.error);