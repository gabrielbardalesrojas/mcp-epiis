# 🎓 EPIIS MCP Server - UNAS

**Servidor MCP (Model Context Protocol) para Gestión Académica EPIIS - UNAS**

Sistema 100% local (parcialmente híbrido) con Llama para análisis, generación y búsqueda de documentos académicos bajo estándares UNAS.

---

## 📋 Descripción

Servidor MCP que implementa herramientas de IA para la gestión académica de la Escuela Profesional de Ingeniería de Sistemas e Informática (EPIIS) de la Universidad Nacional Agraria de la Selva (UNAS).

### Características Principales

✅ **Híbrido (Local/Cloud)** - Opción de usar Ollama Cloud para mayor velocidad  
✅ **Llama 3.2/3.3** - Modelo de lenguaje ejecutado localmente con Ollama  
✅ **Búsqueda Semántica** - ChromaDB para búsqueda vectorial de documentos  
✅ **Procesamiento de Documentos** - PDF, DOCX, TXT  
✅ **Generación Académica Estricta** - Tesis, Proyectos de Investigación y Artículos con formato UNAS (Times New Roman, 1.5 interlineado)
✅ **Web Scraping** - Extracción de contenido institucional de la UNAS  
✅ **Protocol MCP** - Compatible con clientes MCP estándar  

---

## 🏗️ Arquitectura

```
┌─────────────────────────────────────────────────────┐
│                   CLIENTE MCP                        │
│            (Claude Desktop, IDEs, etc.)             │
└────────────────────┬────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────┐
│               SERVIDOR MCP EPIIS                     │
│  ┌──────────────────────────────────────────────┐  │
│  │  Tools: search, analyze, generate, scrape    │  │
│  ├──────────────────────────────────────────────┤  │
│  │  Resources: syllabi, resolutions, docs       │  │
│  ├──────────────────────────────────────────────┤  │
│  │  Prompts: academic templates                 │  │
│  └──────────────────────────────────────────────┘  │
└────────┬──────────────┬──────────────┬─────────────┘
         │              │              │
         ▼              ▼              ▼
┌────────────┐  ┌──────────────┐  ┌──────────┐
│   Ollama   │  │   ChromaDB   │  │  Local   │
│  (Llama)   │  │  (Vectors)   │  │ Storage  │
└────────────┘  └──────────────┘  └──────────┘
```

---

## 📦 Requisitos Previos

### Software Requerido

1. **Node.js** >= 18.0.0
   ```bash
   node --version
   ```

2. **Ollama** (para ejecutar Llama localmente)
   - Descargar: https://ollama.ai
   - Verificar instalación:
   ```bash
   ollama --version
   ```

3. **Git** (opcional)

### Modelos de IA Necesarios

```bash
# Modelo principal (Llama 3.2 - 3GB)
ollama pull llama3.2

# Modelo de embeddings (para búsqueda semántica)
ollama pull nomic-embed-text
```

**Alternativas de modelos:**
- `llama3.3:latest` (más potente, requiere más RAM)
- `llama3.1:8b` (balance calidad/rendimiento)
- `mistral:latest` (alternativa ligera)

---

## 🚀 Instalación

### 1. Clonar o Descargar el Proyecto

```bash
git clone <repository-url>
cd epiis-mcp-server/backend
```

### 2. Instalar Dependencias

```bash
npm install
```

### 3. Configurar el Proyecto

```bash
npm run setup
```

Este comando:
- ✅ Crea estructura de directorios
- ✅ Genera archivo `.env`
- ✅ Verifica instalación de Ollama
- ✅ Verifica modelos disponibles

### 4. Configurar Variables de Entorno

Editar `.env` según tu configuración:

```bash
# Ollama (verificar que esté corriendo)
OLLAMA_HOST=http://localhost:11434
OLLAMA_MODEL=llama3.2:latest

# Rutas de almacenamiento
STORAGE_PATH=./storage
```

### 5. Iniciar Ollama

```bash
# En una terminal separada
ollama serve
```

---

## 📚 Preparar Documentos

### Estructura de Carpetas

```
storage/documents/
├── silabos/          # Sílabos de cursos
├── resoluciones/     # Resoluciones administrativas
├── informes/         # Informes institucionales
├── reglamentos/      # Reglamentos y normativas
└── planes-estudio/   # Planes de estudio
```

### Agregar Documentos

1. Copiar archivos PDF/DOCX a la carpeta correspondiente
2. Ejecutar indexación:

```bash
npm run index-docs
```

Esto:
- Extrae texto de los documentos
- Genera embeddings con Ollama
- Almacena en ChromaDB para búsqueda semántica

---

## 🎯 Uso

### Modo 1: Servidor MCP (Principal)

```bash
npm start
```

El servidor MCP estará disponible para clientes compatibles (Claude Desktop, etc.)

### Modo 2: API REST (Opcional)

```bash
npm run api
```

API disponible en `http://localhost:3000`

Endpoints principales:
- `POST /api/search` - Buscar documentos
- `POST /api/analyze` - Analizar documento
- `POST /api/generate/syllabus` - Generar sílabo
- `POST /api/scrape` - Extraer contenido web

---

## 🦞 OpenClaw + WhatsApp

Interactúa con las herramientas académicas directamente desde **WhatsApp** usando [OpenClaw](https://openclaw.ai) como agente intermediario.

### Setup Inicial (una sola vez)

```powershell
# 1. Instalar OpenClaw (si aún no)
iwr -useb https://openclaw.ai/install.ps1 | iex

# 2. Ejecutar setup
.\scripts\setup-openclaw.ps1
```

El setup configurará:
- ✅ Modelo LLM (Ollama local)
- ✅ Servidor MCP en mcporter
- ✅ Conexión WhatsApp (escanear QR si es necesario)

### Uso Diario

```powershell
# Iniciar todo (Ollama + MCP + Gateway)
.\scripts\start-openclaw.ps1
```

### Comandos Útiles

```powershell
npx openclaw status              # Estado general
npx openclaw channels list       # Canales conectados
npx mcporter list                # Herramientas MCP disponibles
npx openclaw doctor              # Diagnóstico completo
npx openclaw channels login --channel whatsapp  # Re-vincular WhatsApp
```

### Ejemplos desde WhatsApp

Una vez iniciado el gateway, envía mensajes como:
- *"Busca documentos sobre sílabo de IA"*
- *"Genera un sílabo para el curso de Base de Datos"*
- *"Analiza el reglamento de graduación"*
- *"Extrae las noticias de la web de UNAS"*
- *"Genera una Tesis sobre Inteligencia Artificial aplicada a la salud"*
- *"Crea un Proyecto de Investigación sobre ciberseguridad según el reglamento"*

---

## 🛠️ Herramientas MCP Disponibles

### 1. `search_documents`
Búsqueda semántica en documentos

```json
{
  "query": "estructura de un sílabo",
  "document_type": "silabo",
  "limit": 5
}
```

### 2. `analyze_document`
Analizar contenido de documentos

```json
{
  "document_path": "/storage/documents/silabos/curso123.pdf",
  "analysis_type": "full"
}
```

Tipos de análisis:
- `summary` - Resumen ejecutivo
- `key_points` - Puntos clave
- `compliance` - Cumplimiento normativo
- `full` - Análisis completo

### 3. `generate_academic_document`
Generar documentos académicos con formato oficial UNAS

```json
{
  "type": "thesis", // thesis, research_project, article
  "title": "Impacto de la IA en la Educación",
  "author": "Bach. Pedro Pérez",
  "advisor": "Dr. Carlos Ruiz"
}
```

### 4. `generate_syllabus`
Generar sílabos académicos

```json
{
  "course_code": "IS401",
  "course_name": "Inteligencia Artificial",
  "professor": "Dr. Juan Pérez",
  "semester": "2024-I"
}
```

### 4. `generate_resolution`
Crear resoluciones oficiales

```json
{
  "resolution_type": "directoral",
  "subject": "Aprobación de proyecto",
  "content": "Considerandos..."
}
```

### 5. `extract_web_content`
Extraer contenido de sitios web

```json
{
  "url": "https://www.unsm.edu.pe/noticias",
  "extract_type": "structured"
}
```

### 6. `compare_documents`
Comparar dos documentos

```json
{
  "document1_path": "/path/to/doc1.pdf",
  "document2_path": "/path/to/doc2.pdf",
  "comparison_type": "both"
}
```

---

## 📖 Recursos MCP

Recursos disponibles a través del protocolo:

- `epiis://documents/syllabi` - Todos los sílabos
- `epiis://documents/resolutions` - Resoluciones
- `epiis://documents/regulations` - Reglamentos
- `epiis://templates/syllabus` - Plantilla de sílabo

---

## 🔧 Configuración Avanzada

### Ajustar Modelo de IA

```bash
# Usar Llama 3.3 (más potente)
OLLAMA_MODEL=llama3.3:latest

# Ajustar temperatura (creatividad)
LLM_TEMPERATURE=0.7  # 0 = determinista, 1 = creativo
```

### Optimizar Búsqueda Semántica

```bash
# Tamaño de chunks de texto
CHUNK_SIZE=1000

# Overlap entre chunks
CHUNK_OVERLAP=200

# Mínimo score de similitud
MIN_SIMILARITY_SCORE=0.5
```

### Configurar Web Scraping

```bash
# URLs institucionales
UNSM_BASE_URL=https://www.unsm.edu.pe
EPIIS_URL=https://www.unsm.edu.pe/epiis

# Timeout (ms)
SCRAPER_TIMEOUT=30000
```

---

## 🧪 Testing

```bash
# Ejecutar tests
npm test

# Tests específicos
npm test -- mcp-tools.test.js
```

---

## 📊 Monitoreo

### Ver Logs

```bash
# Logs en tiempo real
tail -f logs/combined.log

# Solo errores
tail -f logs/error.log
```

### Estadísticas de Documentos

```javascript
// En el código
const stats = await documentService.getStorageStats();
console.log(stats);
```

### Estado del Vector Store

```javascript
const vectorStats = await vectorStore.getStats();
console.log(vectorStats);
```

---

## 🔍 Solución de Problemas

### Ollama no se conecta

```bash
# Verificar que Ollama esté corriendo
curl http://localhost:11434/api/tags

# Si no responde, iniciar:
ollama serve
```

### Modelo no encontrado

```bash
# Listar modelos instalados
ollama list

# Descargar modelo faltante
ollama pull llama3.2
```

### Error de memoria

Si Llama consume mucha RAM:
```bash
# Usar modelo más ligero
ollama pull llama3.2:1b

# O limitar contexto en .env
LLM_MAX_TOKENS=2048
```

### ChromaDB no inicializa

```bash
# Limpiar datos de ChromaDB
rm -rf storage/chromadb

# Reinicializar
npm run index-docs
```

---

## 📝 Casos de Uso

### 1. Búsqueda de Información Académica

**Pregunta**: "¿Qué cursos enseñan machine learning?"

El sistema:
1. Busca en todos los sílabos indexados
2. Identifica cursos relevantes
3. Retorna información estructurada

### 2. Generación de Documentos

**Solicitud**: "Generar sílabo para curso de IA"

El sistema:
1. Usa plantilla institucional
2. Completa con Llama
3. Genera documento .docx

### 3. Análisis de Reglamentos

**Pregunta**: "¿Cuáles son los requisitos de graduación?"

El sistema:
1. Busca en reglamentos académicos
2. Analiza con Llama
3. Extrae información específica

### 4. Monitoreo Web

**Tarea**: "Extraer últimas noticias UNSM"

El sistema:
1. Scraping del sitio web
2. Procesa contenido
3. Almacena para consulta

---

## 🤝 Contribuir

### Agregar Nueva Herramienta MCP

1. Crear archivo en `src/mcp/tools/`
2. Implementar función handler
3. Registrar en `server.js`

### Agregar Nuevo Tipo de Documento

1. Crear carpeta en `storage/documents/`
2. Actualizar `DocumentService`
3. Reindexar con `npm run index-docs`

---

## 📄 Licencia

MIT License - Ver archivo LICENSE

---

## 👥 Créditos

**Proyecto de Tesis**  
Escuela Profesional de Ingeniería de Sistemas e Informática  
Universidad Nacional de San Martín - Tarapoto

---

---

## 🐧 Despliegue en Linux / Ubuntu (VirtualBox)

Este proyecto es compatible con entornos Linux. Para instrucciones detalladas sobre cómo configurar el servidor en Ubuntu, consulta la guía de migración:

👉 **[Guía de Migración a Ubuntu](file:///c:/Users/HP/Downloads/llama3/epiis-mcp-server/migracion_ubuntu.md)**

---

## 🗺️ Roadmap

- [x] Integración con OpenClaw + WhatsApp
- [ ] Interfaz web completa
- [ ] Soporte para más formatos (Excel, PPT)
- [ ] Integración con sistema académico
- [ ] Análisis de imágenes en documentos
- [ ] Exportar a múltiples formatos
- [ ] Dashboard de estadísticas

---

**Versión**: 1.0.0  
**Última actualización**: Febrero 2026