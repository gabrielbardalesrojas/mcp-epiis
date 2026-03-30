import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  ListToolsRequestSchema,
  CallToolRequestSchema,
  ListResourcesRequestSchema,
  ReadResourceRequestSchema,
  ListPromptsRequestSchema,
  GetPromptRequestSchema,
} from '@modelcontextprotocol/sdk/types.js';
import { z } from 'zod';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

// Configuración de variables de entorno (apuntando a la raíz)
const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, '../../../.env') });

// Importar servicios
import { OllamaService } from '../services/llm/ollama.service.js';
import { DocumentService } from '../services/document/document-service.js';
import { VectorStoreService } from '../services/vector/vector-store.js';
import { WebScraperService } from '../services/scraping/web-scraper.js';
import { InstitutionalContextService } from '../services/scraping/institutional-context.js';

/**
 * Servidor MCP para EPIIS - Gestión Académica
 * 100% Local con Llama
 */
class EPIISMCPServer {
  constructor() {
    this.server = new Server(
      {
        name: 'epiis-academic-server',
        version: '1.0.0',
      },
      {
        capabilities: {
          resources: {},
          tools: {},
          prompts: {},
        },
      }
    );

    // Inicializar servicios
    this.ollamaService = new OllamaService({
      host: process.env.OLLAMA_HOST || 'http://localhost:11434',
      model: process.env.OLLAMA_MODEL || 'llama3.2:latest',
    });

    this.documentService = new DocumentService();
    this.vectorStore = new VectorStoreService();
    this.webScraper = new WebScraperService();
    this.institutionalContext = new InstitutionalContextService();

    this.setupHandlers();
  }

  setupHandlers() {
    this.setupToolHandlers();
    this.setupResourceHandlers();
    this.setupPromptHandlers();
  }

  /**
   * 🛠️ HERRAMIENTAS MCP
   */
  setupToolHandlers() {
    // Listar herramientas disponibles
    this.server.setRequestHandler(ListToolsRequestSchema, async () => ({
      tools: [
        {
          name: 'search_documents',
          description: 'Buscar documentos académicos usando búsqueda semántica con embeddings locales',
          inputSchema: {
            type: 'object',
            properties: {
              query: {
                type: 'string',
                description: 'Consulta de búsqueda',
              },
              document_type: {
                type: 'string',
                enum: ['silabo', 'resolucion', 'informe', 'reglamento', 'all'],
                description: 'Tipo de documento a buscar',
              },
              limit: {
                type: 'number',
                description: 'Número máximo de resultados',
                default: 5,
              },
            },
            required: ['query'],
          },
        },
        {
          name: 'analyze_document',
          description: 'Analizar un documento académico usando Llama (extrae resumen, puntos clave, etc.)',
          inputSchema: {
            type: 'object',
            properties: {
              document_path: {
                type: 'string',
                description: 'Ruta del documento a analizar',
              },
              analysis_type: {
                type: 'string',
                enum: ['summary', 'key_points', 'compliance', 'full'],
                description: 'Tipo de análisis a realizar',
              },
            },
            required: ['document_path', 'analysis_type'],
          },
        },
        {
          name: 'generate_syllabus',
          description: 'Generar un sílabo académico usando plantilla y contenido proporcionado',
          inputSchema: {
            type: 'object',
            properties: {
              course_code: {
                type: 'string',
                description: 'Código del curso',
              },
              course_name: {
                type: 'string',
                description: 'Nombre del curso',
              },
              professor: {
                type: 'string',
                description: 'Nombre del docente',
              },
              semester: {
                type: 'string',
                description: 'Semestre académico',
              },
              content_guidelines: {
                type: 'string',
                description: 'Lineamientos o contenido base para el sílabo',
              },
            },
            required: ['course_code', 'course_name', 'professor', 'semester'],
          },
        },
        {
          name: 'generate_resolution',
          description: 'Generar una resolución administrativa con formato oficial',
          inputSchema: {
            type: 'object',
            properties: {
              resolution_type: {
                type: 'string',
                enum: ['directoral', 'decanal', 'academica'],
                description: 'Tipo de resolución',
              },
              subject: {
                type: 'string',
                description: 'Asunto de la resolución',
              },
              content: {
                type: 'string',
                description: 'Contenido o considerandos',
              },
              date: {
                type: 'string',
                description: 'Fecha de la resolución',
              },
            },
            required: ['resolution_type', 'subject', 'content'],
          },
        },
        {
          name: 'extract_web_content',
          description: 'Extraer y analizar contenido de páginas web institucionales',
          inputSchema: {
            type: 'object',
            properties: {
              url: {
                type: 'string',
                description: 'URL de la página web a extraer',
              },
              extract_type: {
                type: 'string',
                enum: ['text', 'structured', 'summary'],
                description: 'Tipo de extracción',
              },
            },
            required: ['url'],
          },
        },
        {
          name: 'compare_documents',
          description: 'Comparar dos documentos y encontrar diferencias o similitudes',
          inputSchema: {
            type: 'object',
            properties: {
              document1_path: {
                type: 'string',
                description: 'Ruta del primer documento',
              },
              document2_path: {
                type: 'string',
                description: 'Ruta del segundo documento',
              },
              comparison_type: {
                type: 'string',
                enum: ['differences', 'similarities', 'both'],
                description: 'Tipo de comparación',
              },
            },
            required: ['document1_path', 'document2_path'],
          },
        },
        {
          name: 'web_search',
          description: 'Realizar una búsqueda web usando la API de Ollama Cloud para obtener información actualizada',
          inputSchema: {
            type: 'object',
            properties: {
              query: {
                type: 'string',
                description: 'Consulta de búsqueda',
              },
              max_results: {
                type: 'number',
                description: 'Número máximo de resultados (1-10)',
                default: 5,
              },
            },
            required: ['query'],
          },
        },
        {
          name: 'web_fetch',
          description: 'Extraer el contenido completo de una página web específica usando Ollama Cloud',
          inputSchema: {
            type: 'object',
            properties: {
              url: {
                type: 'string',
                description: 'URL absoluta de la página a extraer',
              },
            },
            required: ['url'],
          },
        },
        {
          name: 'crawl_site',
          description: 'Rastreo recursivo de un sitio web para extraer contenido de la página principal y sus sub-enlaces',
          inputSchema: {
            type: 'object',
            properties: {
              url: {
                type: 'string',
                description: 'URL raíz a rastrear',
              },
              max_depth: {
                type: 'number',
                description: 'Profundidad máxima de enlaces a seguir (por defecto 1)',
                default: 1,
              },
              max_pages: {
                type: 'number',
                description: 'Límite máximo de páginas a extraer (por defecto 10)',
                default: 10,
              },
            },
            required: ['url'],
          },
        },
        {
          name: 'query_institutional_knowledge',
          description: 'Consultar información institucional guardada (FIIS, UNAS, procesos académicos)',
          inputSchema: {
            type: 'object',
            properties: {
              query: {
                type: 'string',
                description: 'Consulta o pregunta sobre la institución',
              },
            },
            required: ['query'],
          },
        },
        {
          name: 'update_institutional_cache',
          description: 'Actualizar forzadamente el cache de información institucional desde los enlaces oficiales',
          inputSchema: {
            type: 'object',
            properties: {},
          },
        },
      ],
    }));

    // Ejecutar herramientas
    this.server.setRequestHandler(CallToolRequestSchema, async (request) => {
      const { name, arguments: args } = request.params;

      try {
        switch (name) {
          case 'search_documents':
            return await this.handleSearchDocuments(args);

          case 'analyze_document':
            return await this.handleAnalyzeDocument(args);

          case 'generate_syllabus':
            return await this.handleGenerateSyllabus(args);

          case 'generate_resolution':
            return await this.handleGenerateResolution(args);

          case 'extract_web_content':
            return await this.handleExtractWebContent(args);

          case 'compare_documents':
            return await this.handleCompareDocuments(args);

          case 'web_search':
            return await this.handleWebSearch(args);

          case 'web_fetch':
            return await this.handleWebFetch(args);

          case 'crawl_site':
            return await this.handleCrawlSite(args);

          case 'query_institutional_knowledge':
            return await this.handleQueryInstitutionalKnowledge(args);

          case 'update_institutional_cache':
            return await this.handleUpdateInstitutionalCache(args);

          default:
            throw new Error(`Herramienta desconocida: ${name}`);
        }
      } catch (error) {
        return {
          content: [
            {
              type: 'text',
              text: `Error al ejecutar ${name}: ${error.message}`,
            },
          ],
          isError: true,
        };
      }
    });
  }

  /**
   * 📚 RECURSOS MCP
   */
  setupResourceHandlers() {
    this.server.setRequestHandler(ListResourcesRequestSchema, async () => ({
      resources: [
        {
          uri: 'epiis://documents/syllabi',
          name: 'Sílabos EPIIS',
          description: 'Todos los sílabos académicos almacenados',
          mimeType: 'application/json',
        },
        {
          uri: 'epiis://documents/resolutions',
          name: 'Resoluciones',
          description: 'Resoluciones administrativas y académicas',
          mimeType: 'application/json',
        },
        {
          uri: 'epiis://documents/regulations',
          name: 'Reglamentos',
          description: 'Reglamentos académicos y administrativos',
          mimeType: 'text/plain',
        },
        {
          uri: 'epiis://templates/syllabus',
          name: 'Plantilla de Sílabo',
          description: 'Plantilla oficial para sílabos',
          mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        },
      ],
    }));

    this.server.setRequestHandler(ReadResourceRequestSchema, async (request) => {
      const { uri } = request.params;

      // Lógica para leer recursos según URI
      if (uri.startsWith('epiis://documents/')) {
        const type = uri.split('/')[2];
        const documents = await this.documentService.listByType(type);

        return {
          contents: [
            {
              uri,
              mimeType: 'application/json',
              text: JSON.stringify(documents, null, 2),
            },
          ],
        };
      }

      throw new Error(`Recurso no encontrado: ${uri}`);
    });
  }

  /**
   * 💬 PROMPTS PREDEFINIDOS
   */
  setupPromptHandlers() {
    this.server.setRequestHandler(ListPromptsRequestSchema, async () => ({
      prompts: [
        {
          name: 'analyze_curriculum',
          description: 'Analizar malla curricular y sugerir mejoras',
          arguments: [
            {
              name: 'curriculum_data',
              description: 'Datos de la malla curricular',
              required: true,
            },
          ],
        },
        {
          name: 'generate_class_guide',
          description: 'Generar guía de clase basada en contenido',
          arguments: [
            {
              name: 'topic',
              description: 'Tema de la clase',
              required: true,
            },
            {
              name: 'duration',
              description: 'Duración en minutos',
              required: true,
            },
          ],
        },
      ],
    }));

    this.server.setRequestHandler(GetPromptRequestSchema, async (request) => {
      const { name, arguments: args } = request.params;

      const prompts = {
        analyze_curriculum: {
          messages: [
            {
              role: 'user',
              content: {
                type: 'text',
                text: `Analiza la siguiente malla curricular y proporciona:
1. Evaluación de coherencia
2. Sugerencias de mejora
3. Identificación de vacíos

Malla curricular:
${args.curriculum_data}`,
              },
            },
          ],
        },
        generate_class_guide: {
          messages: [
            {
              role: 'user',
              content: {
                type: 'text',
                text: `Genera una guía de clase detallada para:
Tema: ${args.topic}
Duración: ${args.duration} minutos

Incluye:
- Objetivos de aprendizaje
- Contenido teórico
- Actividades prácticas
- Evaluación
- Recursos necesarios`,
              },
            },
          ],
        },
      };

      return prompts[name] || { messages: [] };
    });
  }

  /**
   * 🔧 IMPLEMENTACIÓN DE HERRAMIENTAS
   */

  async handleSearchDocuments(args) {
    const { query, document_type = 'all', limit = 5 } = args;

    // Búsqueda semántica usando embeddings
    const results = await this.vectorStore.searchSimilar(query, {
      type: document_type,
      limit,
    });

    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify({
            query,
            results: results.map(r => ({
              title: r.title,
              type: r.type,
              path: r.path,
              similarity: r.score,
              snippet: r.content.substring(0, 200) + '...',
            })),
          }, null, 2),
        },
      ],
    };
  }

  async handleAnalyzeDocument(args) {
    const { document_path, analysis_type } = args;

    // Extraer contenido del documento
    const content = await this.documentService.extractContent(document_path);

    // Construir prompt según tipo de análisis
    const prompts = {
      summary: `Resume el siguiente documento académico de forma concisa:\n\n${content}`,
      key_points: `Extrae los puntos clave del siguiente documento:\n\n${content}`,
      compliance: `Analiza el cumplimiento normativo del siguiente documento:\n\n${content}`,
      full: `Realiza un análisis completo (resumen, puntos clave, estructura, recomendaciones) del siguiente documento:\n\n${content}`,
    };

    // Análisis con Llama
    const analysis = await this.ollamaService.generate(prompts[analysis_type]);

    return {
      content: [
        {
          type: 'text',
          text: analysis,
        },
      ],
    };
  }

  async handleGenerateSyllabus(args) {
    const { course_code, course_name, professor, semester, content_guidelines } = args;

    const prompt = `Genera un sílabo académico completo con la siguiente información:

Código del curso: ${course_code}
Nombre del curso: ${course_name}
Docente: ${professor}
Semestre: ${semester}

${content_guidelines ? `Lineamientos:\n${content_guidelines}` : ''}

El sílabo debe incluir:
1. Datos generales
2. Sumilla
3. Competencias
4. Contenido por unidades
5. Metodología
6. Evaluación
7. Bibliografía

Formato profesional y siguiendo estándares universitarios peruanos.`;

    const syllabus = await this.ollamaService.generate(prompt);

    // Generar documento Word
    const docPath = await this.documentService.generateSyllabus({
      course_code,
      course_name,
      professor,
      semester,
      content: syllabus,
    });

    return {
      content: [
        {
          type: 'text',
          text: `Sílabo generado exitosamente.\n\nContenido:\n${syllabus}\n\nDocumento guardado en: ${docPath}`,
        },
      ],
    };
  }

  async handleGenerateResolution(args) {
    const { resolution_type, subject, content, date } = args;

    const prompt = `Genera una resolución ${resolution_type} oficial con:

ASUNTO: ${subject}
FECHA: ${date || new Date().toLocaleDateString('es-PE')}

CONTENIDO/CONSIDERANDOS:
${content}

Formato oficial peruano con:
- Visto
- Considerando
- SE RESUELVE
- Artículos numerados
- Firmas correspondientes`;

    const resolution = await this.ollamaService.generate(prompt);

    const docPath = await this.documentService.generateResolution({
      type: resolution_type,
      subject,
      content: resolution,
      date,
    });

    return {
      content: [
        {
          type: 'text',
          text: `Resolución generada:\n\n${resolution}\n\nDocumento guardado en: ${docPath}`,
        },
      ],
    };
  }

  async handleExtractWebContent(args) {
    const { url, extract_type = 'text' } = args;

    const content = await this.webScraper.extractContent(url, extract_type);

    if (extract_type === 'summary') {
      const summary = await this.ollamaService.generate(
        `Resume el siguiente contenido web:\n\n${content}`
      );
      return {
        content: [{ type: 'text', text: summary }],
      };
    }

    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify(content, null, 2),
        },
      ],
    };
  }

  async handleCompareDocuments(args) {
    const { document1_path, document2_path, comparison_type = 'both' } = args;

    const content1 = await this.documentService.extractContent(document1_path);
    const content2 = await this.documentService.extractContent(document2_path);

    const prompt = `Compara los siguientes dos documentos y encuentra ${comparison_type}:

DOCUMENTO 1:
${content1}

DOCUMENTO 2:
${content2}

Proporciona un análisis detallado.`;

    const comparison = await this.ollamaService.generate(prompt);

    return {
      content: [
        {
          type: 'text',
          text: comparison,
        },
      ],
    };
  }

  async handleWebSearch(args) {
    const { query, max_results = 5 } = args;
    const results = await this.ollamaService.webSearch(query, max_results);

    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify(results, null, 2),
        },
      ],
    };
  }

  async handleWebFetch(args) {
    const { url } = args;
    const content = await this.ollamaService.webFetch(url);

    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify(content, null, 2),
        },
      ],
    };
  }

  async handleCrawlSite(args) {
    const { url, max_depth = 1, max_pages = 10 } = args;
    const results = await this.webScraperService.deepExtract(url, {
      maxDepth: max_depth,
      maxPages: max_pages,
      extractType: 'text',
    });

    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify(results, null, 2),
        },
      ],
    };
  }

  async handleQueryInstitutionalKnowledge(args) {
    const { query } = args;
    const context = await this.institutionalContext.getContextForPromptAsync(query);

    return {
      content: [
        {
          type: 'text',
          text: context || 'No se encontró información específica en el contexto institucional guardado.',
        },
      ],
    };
  }

  async handleUpdateInstitutionalCache() {
    // Iniciar scraping en background y avisar
    this.institutionalContext.scrapeAllUrls().catch(console.error);

    return {
      content: [
        {
          type: 'text',
          text: 'Se ha iniciado la actualización del cache institucional en segundo plano. Los cambios estarán disponibles pronto.',
        },
      ],
    };
  }

  /**
   * Iniciar servidor
   */
  async start() {
    // Inicializar cache institucional antes de arrancar
    await this.institutionalContext.initialize();

    const transport = new StdioServerTransport();
    await this.server.connect(transport);
    console.error('🚀 EPIIS MCP Server iniciado');
  }
}

// Ejecutar servidor
const server = new EPIISMCPServer();
server.start().catch(console.error);

export default EPIISMCPServer;