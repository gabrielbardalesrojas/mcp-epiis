# 🎓 SELVA INTELIGENTE — Sistema Académico EPIIS · UNAS

<div align="center">

**Plataforma de Gestión Académica con Inteligencia Artificial**

*Escuela Profesional de Ingeniería Informática y Sistemas — Universidad Nacional Agraria de la Selva*

[![Node.js](https://img.shields.io/badge/Node.js-v20+-339933?logo=node.js&logoColor=white)](#)
[![Ubuntu](https://img.shields.io/badge/Ubuntu-24.04_LTS-E95420?logo=ubuntu&logoColor=white)](#)
[![Ollama](https://img.shields.io/badge/Ollama-Cloud_&_Local-000000?logo=ollama&logoColor=white)](#)
[![WhatsApp](https://img.shields.io/badge/WhatsApp-Integrado-25D366?logo=whatsapp&logoColor=white)](#)
[![License](https://img.shields.io/badge/Licencia-MIT-blue)](#-licencia)

</div>

---

## 📋 Tabla de Contenidos

1. [Descripción del Proyecto](#-descripción)
2. [Características](#-características)
3. [Arquitectura del Sistema](#️-arquitectura-del-sistema)
4. [Manual de Instalación](#-manual-de-instalación)
   - [Método 1 — Instalación rápida con OVA (Recomendado)](#método-1--instalación-rápida-con-ova-recomendado)
   - [Método 2 — Instalación manual desde cero (GitHub)](#método-2--instalación-manual-desde-cero-github)
5. [Manual de Usuario](#-manual-de-usuario)
6. [Panel de Administración](#️-panel-de-administración)
7. [Generación de Documentos](#-generación-de-documentos)
8. [Integración WhatsApp](#-integración-whatsapp)
9. [Configuración Avanzada](#️-configuración-avanzada)
10. [API REST — Endpoints](#-api-rest--endpoints)
11. [Solución de Problemas](#-solución-de-problemas)
12. [Roadmap](#️-roadmap)
13. [Licencia](#-licencia)
14. [Créditos](#-créditos)

---

## 📖 Descripción

**Selva Inteligente** es una plataforma web con inteligencia artificial diseñada para la gestión académica de la Escuela Profesional de Ingeniería Informática y Sistemas (EPIIS) de la Universidad Nacional Agraria de la Selva (UNAS). Combina un asistente conversacional inteligente con generación automática de documentos profesionales y un canal de comunicación vía WhatsApp.

### ¿Qué hace el sistema?

- 🤖 **Chat con IA**: Un asistente conversacional que responde preguntas sobre la EPIIS, planes de estudio, cursos, trámites y más.
- 📄 **Genera documentos**: Crea automáticamente archivos en PDF, Word, Excel y PowerPoint con formato académico profesional.
- 💬 **WhatsApp Bot**: Permite a docentes y alumnos consultar al asistente directamente desde su celular.
- 🔍 **Búsqueda inteligente**: Encuentra información en documentos institucionales usando búsqueda semántica (ChromaDB).
- 🌐 **Web Scraping**: Extrae automáticamente noticias y contenido actualizado de la UNAS.

El sistema se ejecuta sobre **Ubuntu 24.04 LTS** en una máquina virtual (VirtualBox) y utiliza **Ollama Cloud** para inferencia de IA con modelos de alta capacidad como MiniMax M2, DeepSeek V3, Kimi K2.5, Qwen3 Coder y Gemini Flash.

---

## ✨ Características

| Categoría | Funcionalidad |
|---|---|
| 🤖 **IA Híbrida** | Ollama Cloud (MiniMax, DeepSeek, Kimi, Qwen, Gemini) + Ollama Local |
| 📄 **Documentos** | Generación automática de PDF, Word (.docx), Excel (.xlsx) y PowerPoint (.pptx) |
| 💬 **WhatsApp** | Asistente integrado con envío de documentos por chat |
| 🔍 **Búsqueda Semántica** | ChromaDB para búsqueda inteligente en documentos |
| 🌐 **Web Scraping** | Extracción automática de noticias y contenido de la UNAS |
| 🔐 **Autenticación** | Login con Google y JWT |
| 📊 **Dashboard** | Interfaz web moderna con React + Vite |

---

## 🏗️ Arquitectura del Sistema

```
                    ┌───────────────────────────────┐
                    │      USUARIO FINAL            │
                    │  (Navegador / WhatsApp)        │
                    └──────────┬────────────────────┘
                               │
              ┌────────────────┼────────────────┐
              │                │                │
              ▼                ▼                ▼
     ┌──────────────┐  ┌────────────┐  ┌──────────────┐
     │   Frontend   │  │  WhatsApp  │  │   ngrok      │
     │   React+Vite │  │  Web.js    │  │  (túnel)     │
     │   :3000      │  │  QR Auth   │  │              │
     └──────┬───────┘  └─────┬──────┘  └──────┬───────┘
            │                │                │
            └────────────────┼────────────────┘
                             │
                    ┌────────▼────────┐
                    │  Backend API    │
                    │  Express :3001  │
                    └────────┬────────┘
                             │
         ┌───────────────────┼───────────────────┐
         │                   │                   │
         ▼                   ▼                   ▼
┌─────────────────┐ ┌──────────────┐  ┌──────────────────┐
│  Ollama Cloud   │ │  ChromaDB    │  │  Document        │
│  (IA Remota)    │ │  (Vectores)  │  │  Generator       │
│  MiniMax, Kimi  │ │              │  │  PDF/DOCX/XLSX/  │
│  DeepSeek, etc. │ └──────────────┘  │  PPTX            │
└─────────────────┘                   └──────────────────┘
```

### Stack Tecnológico

| Capa | Tecnología |
|---|---|
| **Sistema Operativo** | Ubuntu 24.04 LTS (VirtualBox OVA) |
| **Frontend** | React 18 + Vite 5 |
| **Backend** | Node.js 20 + Express 4 |
| **IA** | Ollama Cloud (MiniMax M2, DeepSeek V3, Kimi K2.5, Qwen3, Gemini Flash) |
| **Base de Datos** | SQLite (usuarios/sesiones) + ChromaDB (vectores) |
| **Documentos** | pdf-lib, docx, ExcelJS, PptxGenJS |
| **WhatsApp** | whatsapp-web.js + Puppeteer/Chromium |
| **Exposición** | ngrok (túnel HTTPS) |

### Estructura del Proyecto

```
epiis-mcp-server/
├── backend/                    # API REST + Lógica de negocio
│   ├── src/
│   │   ├── app.js              # Punto de entrada del servidor
│   │   ├── routes/             # Rutas de la API
│   │   ├── services/           # Servicios (LLM, documentos, scraper)
│   │   ├── middleware/         # Autenticación JWT
│   │   └── mcp/               # Protocolo MCP
│   ├── scripts/
│   │   └── install-puppeteer-deps.sh  # Dependencias de Chromium
│   ├── storage/                # Almacenamiento de documentos
│   │   ├── documents/          # Documentos fuente indexados
│   │   ├── generated/          # Documentos generados por IA
│   │   ├── chromadb/           # Base de datos vectorial
│   │   └── templates/          # Plantillas
│   └── database/               # SQLite
├── frontend/                   # Interfaz web
│   ├── src/
│   │   ├── App.jsx             # Componente principal
│   │   ├── components/         # Componentes React
│   │   └── assets/             # Estilos y recursos
│   ├── dist/                   # Build de producción
│   └── vite.config.js          # Configuración de Vite
├── scripts/                    # Scripts de utilidad
│   ├── setup.sh                # Configuración inicial
│   └── index-documents.js      # Indexación de documentos
├── .env                        # Variables de entorno (privado)
├── .env.example                # Ejemplo de variables de entorno
├── package.json                # Control centralizado
└── README.md                   # Este archivo
```

---

## 📦 Manual de Instalación

Existen **dos métodos** para instalar y ejecutar el sistema. Elige el que mejor se adapte a tu situación:

| Método | Dificultad | Tiempo | Ideal para |
|---|---|---|---|
| **[Método 1: OVA](#método-1--instalación-rápida-con-ova-recomendado)** | ⭐ Fácil | ~15 min | Uso rápido, evaluación, демонстración |
| **[Método 2: Desde cero](#método-2--instalación-manual-desde-cero-github)** | ⭐⭐⭐ Avanzado | ~45–60 min | Desarrollo, personalización, servidores propios |

---

### Método 1 — Instalación rápida con OVA (Recomendado)

> 💡 **¿Qué es una OVA?**  
> Una OVA (Open Virtual Appliance) es una máquina virtual pre-configurada que contiene todo el sistema listo para usar: Ubuntu 24.04, Node.js, Ollama, el proyecto completo y todas las dependencias instaladas. Solo necesitas importarla en VirtualBox y ejecutar.

#### 📥 Enlace de Descarga

Descarga el archivo OVA desde el siguiente enlace de **MEGA**:

> 🔗 **[Descargar OVA desde MEGA](https://mega.nz/file/XXXXXXXX)**  
> *(Tamaño aproximado: ~8–12 GB)*

> [!IMPORTANT]
> Si el enlace no funciona o ha expirado, contacta al equipo de desarrollo para obtener un enlace actualizado.

---

#### Requisitos previos del equipo host (tu PC)

Antes de comenzar, verifica que tu computadora cumple con estos requisitos:

| Requisito | Mínimo | Recomendado |
|---|---|---|
| **Sistema Operativo** | Windows 10 / macOS / Linux | Windows 11 / macOS 14+ |
| **RAM total** | 8 GB (4 GB libres para la VM) | 16 GB (8 GB para la VM) |
| **Disco duro** | 20 GB libres | 30 GB libres |
| **Procesador** | 2 núcleos con virtualización | 4+ núcleos |
| **Software** | VirtualBox 7.0+ | VirtualBox 7.1+ |
| **Red** | Conexión a Internet activa | Internet estable (para IA Cloud) |

> [!NOTE]
> **Virtualización (VT-x/AMD-V)**: Tu procesador debe tener la virtualización activada en la BIOS. Si al importar la OVA ves errores como *"VT-x is disabled"*, reinicia tu PC, entra a la BIOS (presionando F2, F12 o DEL según tu equipo) y activa la opción **Intel VT-x** o **AMD-V / SVM**.

---

#### Paso 1 — Instalar VirtualBox

**Si ya tienes VirtualBox instalado**, salta al [Paso 2](#paso-2--descargar-e-importar-la-ova).

1. Abre tu navegador y ve a: **https://www.virtualbox.org/wiki/Downloads**
2. Descarga el instalador correspondiente a tu sistema operativo:
   - **Windows**: *VirtualBox x.x.x platform packages → Windows hosts*
   - **macOS**: *VirtualBox x.x.x platform packages → macOS / Intel hosts* (o ARM)
   - **Linux**: Selecciona tu distribución
3. Ejecuta el instalador descargado:
   - En Windows: doble clic en `VirtualBox-x.x.x-Win.exe`
   - Acepta todas las opciones predeterminadas
   - Haz clic en **"Install"** y espera a que termine
4. **Reinicia tu computadora** si el instalador lo solicita
5. Abre VirtualBox para verificar que se instaló correctamente

> [!TIP]
> En Windows, si te pide instalar drivers de red, acepta. Son necesarios para que la VM tenga conexión a internet.

---

#### Paso 2 — Descargar e importar la OVA

##### 2.1 Descargar la OVA

1. Haz clic en el [enlace de descarga de MEGA](#-enlace-de-descarga) proporcionado arriba
2. En la página de MEGA, haz clic en **"Descargar"** (o *"Download"*)
3. Espera a que se complete la descarga del archivo `.ova`
   - El archivo pesa aproximadamente **8–12 GB**, ten paciencia
   - Verifica que el archivo se descargó completamente (no debe estar cortado)

> [!WARNING]
> **No renombres** el archivo `.ova` descargado. Mantén el nombre original para evitar problemas de importación.

##### 2.2 Importar en VirtualBox

1. Abre **VirtualBox**
2. En el menú superior, ve a: **Archivo → Importar servicio virtualizado** (o *File → Import Appliance*)

   ![Menú importar](https://docs.oracle.com/en/virtualization/virtualbox/7.0/user/images/import-appliance.png)

3. Haz clic en el ícono de carpeta 📂 y selecciona el archivo `.ova` que descargaste
4. Haz clic en **"Siguiente"** (*Next*)
5. Aparecerá una pantalla con la **configuración de la máquina virtual**. Ajusta los siguientes valores:
   
   | Parámetro | Valor recomendado | Notas |
   |---|---|---|
   | **Nombre** | `SELVA-INTELIGENTE-EPIIS` | Puedes dejarlo como viene |
   | **CPU** | `2` (mínimo) | Sube a `4` si tu PC tiene 8+ cores |
   | **RAM** | `4096 MB` (mínimo) | Sube a `8192 MB` si tienes 16+ GB de RAM |
   | **Política MAC** | Generar nuevas direcciones | **Importante**: selecciona esta opción |

6. Haz clic en **"Importar"** (*Import*)
7. Espera a que termine el proceso de importación (puede tomar 5–10 minutos)
8. Al finalizar, verás la máquina virtual en la lista de VirtualBox ✅

---

#### Paso 3 — Configurar la red de la máquina virtual

La configuración de red determina cómo accederás al sistema desde tu PC.

1. Selecciona la máquina virtual importada en la lista (un clic, sin iniciarla)
2. Haz clic en **"Configuración"** (ícono de engranaje ⚙️) o clic derecho → *Configuración*
3. Ve a la sección **"Red"** (*Network*) en el panel izquierdo
4. En la pestaña **"Adaptador 1"**:

   **Opción A — Adaptador Puente ⭐ (Recomendado)**
   
   | Campo | Valor |
   |---|---|
   | ☑ Habilitar adaptador de red | Activado |
   | Conectado a | **Adaptador puente** (*Bridged Adapter*) |
   | Nombre | *(tu adaptador de red, ej: "Intel Wi-Fi" o "Realtek Ethernet")* |
   
   > Con esta opción, la VM obtiene una IP propia en tu red local (ej: `192.168.1.57`), permitiéndote acceder desde tu navegador.

   **Opción B — NAT con reenvío de puertos**
   
   | Campo | Valor |
   |---|---|
   | ☑ Habilitar adaptador de red | Activado |
   | Conectado a | **NAT** |
   
   Si usas NAT, debes configurar el **reenvío de puertos**:
   - Haz clic en **"Avanzadas"** → **"Reenvío de puertos"** (*Port Forwarding*)
   - Agrega estas reglas:
   
   | Nombre | Protocolo | IP Host | Puerto Host | IP Invitado | Puerto Invitado |
   |---|---|---|---|---|---|
   | Frontend | TCP | 127.0.0.1 | 3000 | 10.0.2.15 | 3000 |
   | Backend | TCP | 127.0.0.1 | 3001 | 10.0.2.15 | 3001 |

5. Haz clic en **"Aceptar"** (*OK*) para guardar

---

#### Paso 4 — Iniciar la máquina virtual

1. Selecciona la máquina virtual en VirtualBox
2. Haz **doble clic** o presiona el botón **"Iniciar"** ▶️
3. Espera a que cargue Ubuntu 24.04 LTS (puede tomar 1–2 minutos la primera vez)
4. En la pantalla de login de Ubuntu, inicia sesión con las credenciales:

   ```
   👤 Usuario:     epiismcp
   🔑 Contraseña:  epiismcp2026
   ```

> [!CAUTION]
> Estas son las credencias predeterminadas de la OVA. **Cámbialas después** del primer inicio por seguridad ejecutando: `passwd` en la terminal.

5. Una vez dentro del escritorio de Ubuntu, estás listo para iniciar el sistema

---

#### Paso 5 — Iniciar el sistema Selva Inteligente

1. Abre una **terminal** en Ubuntu: presiona `Ctrl + Alt + T`
2. Navega al directorio del proyecto:

   ```bash
   cd ~/mcp-epiis
   ```

3. Inicia el sistema completo (backend + frontend + ngrok):

   ```bash
   npm run dev
   ```

4. Espera a que aparezcan los siguientes mensajes confirmando que todo está funcionando:

   ```
   ✅ Backend corriendo:
   🚀 API Server corriendo en HTTPS: https://localhost:3001
   📋 Health check: https://localhost:3001/api/health

   ✅ Frontend corriendo:
     VITE v5.x.x  ready in XXX ms
     ➜  Local:   https://localhost:3000/
     ➜  Network: https://192.168.x.x:3000/

   ✅ ngrok corriendo:
     Forwarding: https://krystina-weedier-howard.ngrok-free.dev → https://localhost:3000
   ```

> [!NOTE]
> El proceso `npm run dev` inicia **tres servicios simultáneamente** usando `concurrently`:
> - **Backend API** en el puerto `3001`
> - **Frontend React** en el puerto `3000`  
> - **ngrok** (túnel HTTPS para acceso público)
>
> No cierres la terminal mientras uses el sistema.

---

#### Paso 6 — Acceder a la aplicación

Hay **tres formas** de acceder a la aplicación dependiendo de tu configuración:

##### Opción A — Desde el navegador de la VM (dentro de Ubuntu)

Abre Firefox dentro de Ubuntu y ve a:
```
https://localhost:3000
```

##### Opción B — Desde tu PC host (Adaptador Puente)

1. Primero, obtén la IP de la máquina virtual. En la terminal de Ubuntu ejecuta:

   ```bash
   ip addr show
   ```

2. Busca la dirección IP en la interfaz de red (generalmente `enp0s3` o `ens33`):

   ```
   2: enp0s3: <BROADCAST,MULTICAST,UP,LOWER_UP>
       inet 192.168.1.57/24 brd 192.168.1.255 scope global dynamic enp0s3
             ^^^^^^^^^^^^ ← Esta es la IP de tu VM
   ```

3. Abre un navegador en tu PC (Chrome, Edge, Firefox) y ve a:

   ```
   https://192.168.1.57:3000
   ```
   
   *(reemplaza `192.168.1.57` con la IP real de tu VM)*

4. Si el navegador muestra una advertencia de certificado SSL, haz clic en **"Avanzado"** → **"Continuar de todos modos"** (es seguro, el certificado es auto-firmado)

##### Opción C — Acceso público con ngrok (desde cualquier dispositivo)

Si ngrok está configurado, puedes acceder desde **cualquier dispositivo con internet** usando:

```
https://krystina-weedier-howard.ngrok-free.dev
```

> [!TIP]
> La URL de ngrok funciona desde tu celular, tablet o cualquier PC. Solo necesitas conexión a internet. Si aparece una página de ngrok pidiendo confirmación, haz clic en **"Visit Site"**.

---

#### Paso 7 — Verificar que todo funciona

Ejecuta estas verificaciones en la terminal de Ubuntu:

```bash
# 1. Verificar que el backend responde
curl -k https://localhost:3001/api/health

# Respuesta esperada:
# {"status":"ok","uptime":...,"services":{...}}

# 2. Verificar que Ollama está corriendo
systemctl status ollama

# Debe mostrar: Active: active (running)

# 3. Verificar que el frontend carga
curl -k -o /dev/null -s -w "%{http_code}" https://localhost:3000

# Respuesta esperada: 200
```

🎉 **¡Listo!** El sistema está funcionando. Ve al [Manual de Usuario](#-manual-de-usuario) para aprender a usarlo.

---

### Método 2 — Instalación manual desde cero (GitHub)

> 🛠️ **Este método es para usuarios avanzados** que quieren configurar el sistema en su propio servidor Ubuntu, hacer desarrollo, o no pueden usar la OVA. Requiere conocimientos básicos de Linux, terminal y git.

---

#### Requisitos previos

| Requisito | Versión | Cómo verificar |
|---|---|---|
| **Ubuntu** | 24.04 LTS (o 22.04) | `lsb_release -a` |
| **Node.js** | v20 o superior | `node --version` |
| **npm** | v10 o superior | `npm --version` |
| **Git** | v2.x | `git --version` |
| **Ollama** | Última versión | `ollama --version` |
| **Conexión a internet** | Estable | — |

#### Hardware recomendado

| Recurso | Mínimo | Recomendado |
|---|---|---|
| **RAM** | 4 GB | 8 GB |
| **Disco** | 10 GB libres | 20 GB libres |
| **CPU** | 2 núcleos | 4 núcleos |

---

#### Paso 1 — Preparar el sistema operativo

Abre una terminal y actualiza el sistema:

```bash
# Actualizar lista de paquetes y sistema
sudo apt update && sudo apt upgrade -y

# Instalar herramientas básicas necesarias
sudo apt install -y curl wget git build-essential
```

---

#### Paso 2 — Instalar Node.js v20

```bash
# Agregar el repositorio oficial de NodeSource para Node.js 20
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -

# Instalar Node.js (incluye npm)
sudo apt install -y nodejs

# Verificar la instalación
node --version   # Debe mostrar v20.x.x
npm --version    # Debe mostrar v10.x.x
```

> [!NOTE]
> Si ya tienes otra versión de Node.js instalada, puedes usar **nvm** (Node Version Manager) para gestionar múltiples versiones:
> ```bash
> curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.7/install.sh | bash
> source ~/.bashrc
> nvm install 20
> nvm use 20
> ```

---

#### Paso 3 — Instalar Ollama

Ollama es el motor de IA que ejecuta los modelos de lenguaje.

```bash
# Instalar Ollama con el script oficial
curl -fsSL https://ollama.com/install.sh | sh

# Verificar que se instaló correctamente
ollama --version

# Ollama se inicia automáticamente como servicio
# Verificar que está corriendo:
systemctl status ollama
```

Ahora descarga el modelo de **embeddings** (necesario para la búsqueda semántica):

```bash
# Descargar el modelo de embeddings (obligatorio, ~274 MB)
ollama pull nomic-embed-text

# (Opcional) Descargar un modelo local para IA sin internet
ollama pull llama3.2:3b
```

> [!IMPORTANT]
> El modelo `nomic-embed-text` es **obligatorio** para que funcione la búsqueda semántica y la indexación de documentos. Sin este modelo, el sistema no podrá buscar información en los documentos cargados.

---

#### Paso 4 — Instalar dependencias de Chromium (para WhatsApp)

El bot de WhatsApp usa Puppeteer con Chromium. En Ubuntu 24.04 se necesitan librerías específicas:

```bash
# NOTA: Ejecutar esto DESPUÉS de clonar el proyecto (Paso 5)
# Se incluye aquí para que sepas que es necesario

sudo apt install -y \
    libasound2t64 \
    libatk1.0-0t64 \
    libatk-bridge2.0-0t64 \
    libc6 \
    libcairo2 \
    libcups2t64 \
    libdbus-1-3 \
    libexpat1 \
    libfontconfig1 \
    libgcc-s1 \
    libgdk-pixbuf-2.0-0 \
    libglib2.0-0t64 \
    libgtk-3-0t64 \
    libnspr4 \
    libpango-1.0-0 \
    libpangocairo-1.0-0 \
    libstdc++6 \
    libx11-6 \
    libx11-xcb1 \
    libxcb1 \
    libxcomposite1 \
    libxcursor1 \
    libxdamage1 \
    libxext6 \
    libxfixes3 \
    libxi6 \
    libxrandr2 \
    libxrender1 \
    libxss1 \
    libxtst6 \
    ca-certificates \
    fonts-liberation \
    libayatana-appindicator3-1 \
    libnss3 \
    lsb-release \
    xdg-utils \
    wget \
    libgbm-dev \
    libdrm2 \
    libxshmfence1 \
    libxkbcommon0
```

> **Alternativa**: También puedes usar el script incluido en el proyecto (después de clonar):
> ```bash
> sudo bash backend/scripts/install-puppeteer-deps.sh
> ```

---

#### Paso 5 — Instalar ngrok (túnel HTTPS)

ngrok permite exponer tu servidor local a internet con una URL pública HTTPS.

```bash
# Descargar e instalar ngrok
curl -sSL https://ngrok-agent.s3.amazonaws.com/ngrok-v3-stable-linux-amd64.tgz \
  | sudo tar xz -C /usr/local/bin

# Verificar la instalación
ngrok version

# Configurar tu token de autenticación
# (Obtén tu token en https://dashboard.ngrok.com/get-started/your-authtoken)
ngrok config add-authtoken <TU_TOKEN_NGROK>
```

> [!NOTE]
> Si no necesitas acceso público (solo usarás la app en tu red local), puedes omitir la instalación de ngrok. En ese caso, modifica el script `dev` en `package.json` para quitar la parte de ngrok.

---

#### Paso 6 — Clonar el repositorio del proyecto

```bash
# Clonar el repositorio desde GitHub
git clone https://github.com/gabrielbardalesrojas/mcp-epiis.git ~/mcp-epiis

# Entrar al directorio del proyecto
cd ~/mcp-epiis
```

Si el repositorio es **privado**, necesitarás un token de acceso:

```bash
# Con token de acceso personal
git clone https://<TU_TOKEN>@github.com/gabrielbardalesrojas/mcp-epiis.git ~/mcp-epiis

# O configurar SSH
git clone git@github.com:gabrielbardalesrojas/mcp-epiis.git ~/mcp-epiis
```

---

#### Paso 7 — Instalar dependencias del proyecto

```bash
# Asegurarte de estar en el directorio del proyecto
cd ~/mcp-epiis

# Instalar la dependencia raíz (concurrently)
npm install

# Instalar todas las dependencias (backend + frontend)
npm run install:all
```

Este comando ejecuta:
- `npm install --prefix backend` — Instala las dependencias del backend (~55 paquetes incluyendo Express, Ollama, pdf-lib, docx, whatsapp-web.js, etc.)
- `npm install --prefix frontend` — Instala las dependencias del frontend (~React, Vite, etc.)

> [!WARNING]
> La instalación puede tomar varios minutos. Si falla por permisos, **NO uses `sudo npm install`**. En su lugar, corrige los permisos:
> ```bash
> sudo chown -R $(whoami) ~/mcp-epiis
> npm run install:all
> ```

---

#### Paso 8 — Instalar dependencias de Chromium (para WhatsApp)

```bash
# Ejecutar el script de instalación de dependencias de Puppeteer
sudo bash backend/scripts/install-puppeteer-deps.sh
```

---

#### Paso 9 — Configurar variables de entorno

```bash
# Copiar el archivo de ejemplo
cp .env.example .env

# Editar con nano (o tu editor preferido)
nano .env
```

Configura los siguientes valores en el archivo `.env`:

```bash
# ============================================
# EPIIS MCP Server - Configuración
# ============================================

# --- Modo de IA ---
# Opciones: local | cloud | auto
# - local: Usa Ollama instalado en esta máquina (requiere modelo descargado)
# - cloud: Usa Ollama Cloud (requiere API Key e internet)
# - auto:  Intenta cloud primero, si falla usa local
IA_MODE=cloud

# --- Configuración Ollama Local ---
OLLAMA_HOST=http://localhost:11434
OLLAMA_MODEL=llama3.2:3b
EMBED_MODEL=nomic-embed-text

# --- Configuración Ollama Cloud ---
# Obtén tu API Key en: https://ollama.com → Settings → API Keys
OLLAMA_CLOUD_API_KEY=<TU_API_KEY_AQUI>
OLLAMA_CLOUD_HOST=https://api.ollama.com
OLLAMA_CLOUD_MODEL=minimax-m2:cloud

# --- Servidor ---
PORT=3001
NODE_ENV=development

# --- Rutas de Almacenamiento ---
STORAGE_PATH=./storage
DATA_PATH=./data

# --- Parámetros del LLM ---
LLM_TEMPERATURE=0.3          # 0=determinista, 1=creativo (0.3 recomendado)
LLM_MAX_TOKENS=4096          # Largo máximo de respuesta
LLM_NUM_CTX=8192             # Ventana de contexto

# --- Vector Store (ChromaDB) ---
CHROMADB_PATH=./storage/chromadb
COLLECTION_NAME=epiis_documents

# --- Web Scraping ---
UNSM_BASE_URL=https://www.unas.edu.pe
FIIS_URL=https://fiis.unas.edu.pe
SCRAPER_TIMEOUT=30000

# --- Logging ---
LOG_LEVEL=info
```

Guarda y cierra: `Ctrl + O`, `Enter`, `Ctrl + X`

> [!IMPORTANT]
> **¿Cómo obtener la API Key de Ollama Cloud?**
> 1. Ve a **https://ollama.com** e inicia sesión (o crea una cuenta)
> 2. Ve a **Settings** (configuración de tu cuenta)
> 3. Busca la sección **API Keys** 
> 4. Haz clic en **Generate new key**
> 5. Copia la key generada y pégala en `OLLAMA_CLOUD_API_KEY` en tu `.env`

---

#### Paso 10 — Ejecutar la configuración inicial

```bash
# Crear directorios necesarios y verificar instalación
cd ~/mcp-epiis/backend
npm run setup
```

Este script automáticamente:
- ✅ Crea la estructura de carpetas (`storage/documents/`, `storage/generated/`, etc.)
- ✅ Verifica que Ollama está corriendo
- ✅ Verifica que los modelos necesarios están descargados
- ✅ Crea el archivo `.env` si no existe

---

#### Paso 11 — Iniciar el sistema

```bash
# Volver al directorio raíz del proyecto
cd ~/mcp-epiis

# Asegurarse de que Ollama está corriendo
sudo systemctl start ollama

# Iniciar el sistema completo
npm run dev
```

Verás la salida con los tres servicios iniciándose simultáneamente:

```
[0] 🚀 API Server corriendo en HTTPS: https://localhost:3001
[1]   VITE v5.x.x  ready in XXX ms
[1]   ➜  Local:   https://localhost:3000/
[2]   Forwarding: https://xxxxx.ngrok-free.dev → https://localhost:3000
```

---

#### Paso 12 — Verificar la instalación

```bash
# 1. Backend healthcheck
curl -k https://localhost:3001/api/health
# Esperado: {"status":"ok",...}

# 2. Verificar Ollama
curl http://localhost:11434/api/tags
# Esperado: lista de modelos instalados

# 3. Abrir en el navegador
xdg-open https://localhost:3000
```

🎉 **¡Instalación completa!** Ve al [Manual de Usuario](#-manual-de-usuario) para comenzar a usar el sistema.

---

#### (Opcional) Configurar inicio automático con PM2

Si quieres que el sistema se inicie automáticamente cada vez que enciendas Ubuntu:

```bash
# Instalar PM2 (gestor de procesos de producción)
sudo npm install -g pm2

# Iniciar los servicios con PM2
pm2 start backend/src/app.js --name "epiis-backend"
pm2 start "npm run dev --prefix frontend" --name "epiis-frontend"

# Guardar la configuración para auto-inicio
pm2 startup
pm2 save

# Comandos útiles de PM2:
pm2 status              # Ver estado de los servicios
pm2 logs                # Ver logs en tiempo real
pm2 restart all         # Reiniciar todos los servicios
pm2 stop all            # Detener todos los servicios
```

---

#### Resumen de comandos (Método 2 — Referencia rápida)

```bash
# === INSTALACIÓN COMPLETA EN UN SOLO BLOQUE ===

# 1. Sistema base
sudo apt update && sudo apt upgrade -y
sudo apt install -y curl wget git build-essential

# 2. Node.js 20
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs

# 3. Ollama
curl -fsSL https://ollama.com/install.sh | sh
ollama pull nomic-embed-text

# 4. ngrok
curl -sSL https://ngrok-agent.s3.amazonaws.com/ngrok-v3-stable-linux-amd64.tgz \
  | sudo tar xz -C /usr/local/bin
ngrok config add-authtoken <TU_TOKEN>

# 5. Clonar proyecto
git clone https://github.com/gabrielbardalesrojas/mcp-epiis.git ~/mcp-epiis
cd ~/mcp-epiis

# 6. Instalar dependencias
npm install
npm run install:all
sudo bash backend/scripts/install-puppeteer-deps.sh

# 7. Configurar
cp .env.example .env
nano .env    # Configurar API Keys y modo de IA

# 8. Setup inicial
cd backend && npm run setup && cd ..

# 9. Iniciar
npm run dev
```

---

## 👤 Manual de Usuario

### Acceso al Sistema

1. Abre tu navegador y ve a la dirección del servidor:
   - **Desde la VM**: `https://localhost:3000`
   - **Desde tu PC**: `https://<IP-de-la-VM>:3000`
   - **URL pública**: `https://krystina-weedier-howard.ngrok-free.dev`
2. Haz clic en **"Iniciar sesión con Google"**
3. Selecciona tu cuenta de Google institucional
4. Serás redirigido al panel principal

### Pantalla Principal — Chat con IA

La interfaz principal es un **chat conversacional** donde puedes hacer preguntas y solicitar documentos:

```
┌─────────────────────────────────────────────┐
│  ☰  SELVA INTELIGENTE           ● ● ■      │
├─────────────────────────────────────────────┤
│                                             │
│  ┌─────────────────────────────────────┐    │
│  │ Historial de conversaciones        │    │
│  │ • Nueva conversación               │    │
│  │ • Informe de gestión FIIS          │    │
│  │ • Sílabo de IA                     │    │
│  └─────────────────────────────────────┘    │
│                                             │
│  ┌─────────────────────────────────────────┐│
│  │ 🤖 ¡Hola! Soy el asistente de la FIIS.││
│  │    ¿En qué puedo ayudarte?             ││
│  └─────────────────────────────────────────┘│
│                                             │
│  ┌─────────────────────────────────────────┐│
│  │ Escribe tu mensaje...          ⚙️  ➤   ││
│  └─────────────────────────────────────────┘│
│                   CONFIGURACIÓN ⚙️          │
└─────────────────────────────────────────────┘
```

### Tipos de Consultas

#### 1. Preguntas informativas (texto simple)  
Escribe cualquier pregunta y el asistente responderá con información institucional.

| Ejemplo de consulta | Respuesta |
|---|---|
| *"¿Cuáles son los planes de estudio de la FIIS?"* | Información detallada |
| *"¿Qué cursos hay en el semestre 2026-I?"* | Lista de cursos |
| *"¿Cuál es el horario de atención del decanato?"* | Datos de contacto |
| *"Dame las últimas noticias de la UNAS"* | Noticias extraídas de la web |

#### 2. Generación de documentos (archivos descargables)  
Cuando pides un documento, el sistema lo genera automáticamente y te muestra un botón de descarga.

| Solicitud | Formato generado |
|---|---|
| *"Genera un informe sobre la FIIS en PDF"* | 📄 PDF profesional |
| *"Crea un documento Word sobre el plan de estudios"* | 📝 DOCX con formato académico |
| *"Genera un Excel con los cursos del semestre"* | 📊 XLSX con tablas y formato |
| *"Crea una presentación sobre la UNAS"* | 📊 PPTX con diapositivas |
| *"Hazme un sílabo del curso de Base de Datos"* | 📄 PDF formato UNAS |

> **Tip**: Sé específico en tu solicitud. En vez de *"genera un PDF"*, escribe *"genera un informe en PDF sobre los logros académicos de la FIIS en el semestre 2025-II"*.

### Centro de Configuración

Haz clic en **CONFIGURACIÓN ⚙️** en la parte inferior para acceder al centro de configuración:

#### Pestaña: IA Avanzada
- **Modelo de Lenguaje (Cloud)**: Selecciona entre los modelos disponibles:
  - 🟢 **MiniMax M2** — Redacción académica (recomendado)
  - 🔵 **DeepSeek V3** — Razonamiento lógico
  - 🟡 **Kimi K2.5** — Contexto masivo
  - 🟣 **Qwen3 Coder** — Tareas técnicas
  - 🔴 **Gemini Flash** — Eficiencia y rapidez
- **Modo de Operación**: Local, Nube (Cloud), o Auto
- **API Key**: Credenciales de Ollama Cloud

#### Pestaña: WhatsApp
- Escanear código QR para vincular WhatsApp
- Ver estado de la conexión
- Desconectar sesión

#### Pestaña: Sistema
- Ver estado del servidor
- Estadísticas de documentos
- Información del sistema

---

## 🛡️ Panel de Administración

El sistema cuenta con un **panel de administración** protegido que permite gestionar los documentos que los usuarios suben al sistema. Ningún documento ingresa a la base de conocimiento de la IA sin antes ser **revisado y aprobado** por un administrador.

### Acceso al Panel de Administración

El panel de administración tiene una autenticación **separada** del login de usuario (Google OAuth). Usa credenciales locales almacenadas en la base de datos SQLite.

```
👤 Usuario predeterminado:  admin
🔑 Contraseña predeterminada: admin2026
```

> [!CAUTION]
> Cambia la contraseña predeterminada inmediatamente desde **Perfil → Cambiar contraseña** dentro del panel de administración.

**Endpoint:** `POST /api/admin/login`  
**Autenticación:** JWT Token con validez de 24 horas y flag `isAdmin: true`

---

### Flujo de Gestión Documental (Upload → Aprobación)

El sistema implementa un flujo de **aprobación obligatoria** para todos los documentos subidos por los usuarios. Esto garantiza que solo contenido verificado y relevante ingrese a la base de conocimiento de la IA.

#### Paso a paso del flujo:

```
 USUARIO                    SISTEMA                     ADMINISTRADOR
   │                          │                              │
   │  1. Sube documento       │                              │
   │  (PDF, DOCX, XLSX...)   │                              │
   ├─────────────────────────►│                              │
   │                          │  2. Guarda en                │
   │                          │     storage/pending/         │
   │                          │     Registra en SQLite       │
   │                          │     status = 'pending'       │
   │  3. Confirmación:        │                              │
   │  "Pendiente de           │                              │
   │   aprobación"            │                              │
   │◄─────────────────────────┤                              │
   │                          │                              │
   │                          │  4. Admin ve doc pendiente   │
   │                          │◄─────────────────────────────┤
   │                          │                              │
   │                          │  5. Admin previsualiza       │
   │                          │◄─────────────────────────────┤
   │                          │                              │
   │                          │  6a. ✅ APROBAR              │
   │                          │◄─────────────────────────────┤
   │                          │  → Mover a documents/        │
   │                          │  → Indexar en ChromaDB       │
   │                          │  → Disponible para IA        │
   │                          │                              │
   │                          │  6b. ❌ RECHAZAR             │
   │                          │◄─────────────────────────────┤
   │                          │  → Eliminar archivo          │
   │                          │  → status = 'rejected'       │
   │                          │                              │
```

#### 1. El usuario sube un documento

Desde la interfaz web, el usuario puede subir documentos académicos que quedarán **pendientes de revisión**.

| Parámetro | Detalle |
|---|---|
| **Endpoint** | `POST /api/documents/upload` |
| **Librería** | `multer` (middleware de subida) |
| **Tamaño máximo** | 50 MB por archivo |
| **Formatos permitidos** | `.pdf`, `.docx`, `.doc`, `.xlsx`, `.xls`, `.pptx`, `.ppt`, `.txt`, `.md` |
| **Tipos de documento** | `silabo`, `resolucion`, `informe`, `reglamento`, `general` |
| **Destino temporal** | `storage/pending/` (con nombre único `timestamp_nombre.ext`) |

> [!NOTE]
> **Subida Transitoria:** También existe el endpoint `POST /api/documents/upload-transient` que permite subir un archivo únicamente para usarlo como contexto en el chat actual. El contenido se extrae, se envía al chat, y el archivo se **elimina automáticamente**. No requiere aprobación del administrador.

#### 2. El sistema registra el documento como pendiente

Al recibir el archivo, el backend:
- Lo guarda en `storage/pending/` con un nombre único (`timestamp_nombreOriginal.ext`)
- Lo registra en la tabla `pending_documents` de SQLite con `status = 'pending'`
- Devuelve al usuario un mensaje confirmando que está pendiente de aprobación

#### 3. El administrador revisa los documentos pendientes

Desde el panel de administración, el admin puede:

| Acción | Endpoint | Descripción |
|---|---|---|
| 📋 **Listar pendientes** | `GET /api/admin/pending` | Ver todos los documentos con `status = 'pending'` |
| 👁️ **Previsualizar** | `GET /api/admin/pending/:id/preview` | Ver el contenido del documento (renderiza PDF inline, descarga otros formatos) |
| ✅ **Aprobar** | `POST /api/admin/approve/:id` | Aprueba y mueve a la biblioteca activa |
| ❌ **Rechazar** | `POST /api/admin/reject/:id` | Rechaza y elimina permanentemente |
| 📜 **Ver historial** | `GET /api/admin/history` | Últimos 50 documentos revisados (aprobados y rechazados) |

#### 4. Proceso de aprobación (`approve`)

Cuando el administrador aprueba un documento, el sistema ejecuta **automáticamente** estos pasos:

1. **Mover el archivo** de `storage/pending/` a su carpeta correspondiente:
   
   | Tipo de documento | Carpeta destino |
   |---|---|
   | `silabo` | `storage/documents/silabos/` |
   | `resolucion` | `storage/documents/resoluciones/` |
   | `informe` | `storage/documents/informes/` |
   | `reglamento` | `storage/documents/reglamentos/` |
   | `general` | `storage/documents/general/` |

2. **Indexar en ChromaDB**: Se procesa el documento, se divide en *chunks* (fragmentos) y se generan embeddings con `nomic-embed-text` para la búsqueda semántica.

3. **Invalidar caché**: Se limpia el caché del `DocumentContextService` para que las próximas consultas reflejen el nuevo documento.

4. **Actualizar SQLite**: Se marca como `status = 'approved'` con la fecha y el usuario que lo aprobó.

> Después de la aprobación, el contenido del documento estará **disponible para la IA** en las respuestas del chat y en la búsqueda semántica.

#### 5. Proceso de rechazo (`reject`)

Si el administrador rechaza el documento:
1. Se **elimina el archivo** del disco (`storage/pending/`)
2. Se actualiza el registro en SQLite a `status = 'rejected'`
3. El documento queda en el historial pero ya no es accesible

---

### Biblioteca de Documentos

El administrador también puede gestionar los documentos **ya aprobados** que forman parte de la base de conocimiento activa del sistema.

| Acción | Endpoint | Descripción |
|---|---|---|
| 📚 **Ver biblioteca** | `GET /api/admin/library` | Listar todos los documentos aprobados por categoría |
| 🗑️ **Eliminar documento** | `DELETE /api/admin/library/:category/:filename` | Eliminar de disco y del VectorStore (ChromaDB) |

Al eliminar un documento de la biblioteca:
- Se elimina el archivo físico del disco
- Se eliminan sus embeddings del VectorStore (ChromaDB)
- Se invalida el caché del `DocumentContextService`

---

### Perfil y Seguridad del Administrador

| Acción | Endpoint |
|---|---|
| 👤 **Ver perfil** | `GET /api/admin/profile` |
| ✏️ **Actualizar perfil** | `PUT /api/admin/profile` |
| 🔑 **Cambiar contraseña** | `PUT /api/admin/password` |

El endpoint de perfil también devuelve **estadísticas**:
- Total de documentos pendientes
- Total de documentos aprobados
- Total de documentos rechazados

### Medidas de Seguridad del Panel Admin

| Medida | Implementación |
|---|---|
| 🔐 **Autenticación JWT** | Cada petición al panel admin requiere un token JWT válido (`adminAuthMiddleware`) |
| 🛡️ **Verificación de rol** | El token debe contener `isAdmin: true`, verificado en cada request |
| 🔑 **Contraseñas hasheadas** | Las contraseñas se almacenan con hash SHA-256 (nunca en texto plano) |
| ⏱️ **Expiración de sesión** | El token JWT expira automáticamente a las **24 horas** |
| 📁 **Validación de archivos** | `fileFilter` de multer rechaza archivos con extensiones no permitidas |
| 📏 **Límite de tamaño** | Máximo **50 MB** por archivo subido |
| 🧹 **Sanitización** | Los nombres de archivo se sanitizan para prevenir inyección de ruta (`sanitizeFilename`) |
| 🔒 **CORS configurado** | En producción, solo acepta peticiones del origen autorizado |
| 📝 **Auditoría** | Cada aprobación/rechazo queda registrado con `reviewed_by` y `reviewed_at` |

---

## 📄 Generación de Documentos

El sistema genera 4 tipos de documentos profesionales con diseño editorial de alta calidad:

### PDF
- Portada con banner de color institucional (azul FIIS)
- Encabezado y pie de página en cada hoja
- Tabla de contenido automática
- Soporte para tablas, listas, bloques de código
- Formato A4, paginación automática

### Word (DOCX)
- Formato académico: Times New Roman, interlineado 1.5
- Portada profesional con metadatos
- Encabezados jerárquicos (H1, H2, H3)
- Tablas con formato institucional
- Sangrías de primera línea

### Excel (XLSX)
- Encabezados de tabla con color institucional
- Metadatos y fecha de generación
- Filas alternadas para facilitar lectura
- Auto-ajuste de anchos de columna

### PowerPoint (PPTX)
- Diapositiva de portada con branding FIIS
- 8-12 diapositivas con contenido estructurado
- Soporte para tablas en diapositivas
- Diseño profesional con colores institucionales

---

## 💬 Integración WhatsApp

El sistema incluye un bot de WhatsApp que permite a docentes y alumnos interactuar con la IA directamente desde su celular.

### Configuración inicial

1. En la interfaz web, ve a **Configuración → WhatsApp**
2. Haz clic en **"Iniciar sesión"**
3. Escanea el código QR con tu WhatsApp:
   - Abre WhatsApp en tu celular
   - Ve a **Ajustes → Dispositivos vinculados → Vincular dispositivo**
   - Escanea el QR mostrado en pantalla
4. Espera a que el estado cambie a **"Conectado"** ✅

### Uso desde WhatsApp

Una vez conectado, envía mensajes al número vinculado:

```
📱 Tú: Genera un PDF sobre los planes de estudio de la FIIS
🤖 Bot: 📄 Generando tu documento... un momento ⏳
🤖 Bot: [Envía el PDF adjunto]

📱 Tú: Crea una presentación sobre la UNAS
🤖 Bot: [Envía el PPTX adjunto]

📱 Tú: ¿Cuáles son los requisitos de graduación?
🤖 Bot: [Responde con información institucional]
```

### Comandos especiales

| Comando | Acción |
|---|---|
| `!estado` | Ver estado del sistema |
| `!ayuda` | Lista de funciones disponibles |
| `!limpiar` | Reiniciar contexto de conversación |

---

## ⚙️ Configuración Avanzada

### Cambiar modelo de IA

Puedes cambiar el modelo desde la interfaz web (Configuración → IA Avanzada) o directamente en el archivo `.env`:

```bash
# Modelos Cloud disponibles (Ollama Cloud)
OLLAMA_CLOUD_MODEL=minimax-m2:cloud       # MiniMax M2 — Redacción
OLLAMA_CLOUD_MODEL=deepseek-v3:cloud      # DeepSeek V3 — Razonamiento
OLLAMA_CLOUD_MODEL=kimi-k2.5:cloud        # Kimi K2.5 — Contexto largo
OLLAMA_CLOUD_MODEL=qwen3-coder:cloud      # Qwen3 — Código/técnico
OLLAMA_CLOUD_MODEL=gemini-flash:cloud     # Gemini Flash — Velocidad

# Para usar IA local (requiere GPU o CPU potente)
IA_MODE=local
OLLAMA_MODEL=llama3.2:3b
```

### Ajustar parámetros del LLM

```bash
LLM_TEMPERATURE=0.3        # 0=determinista, 1=creativo (0.3 recomendado)
LLM_MAX_TOKENS=4096         # Largo máximo de respuesta
LLM_NUM_CTX=8192            # Ventana de contexto
```

### Gestionar documentos indexados

```bash
# Estructura del almacenamiento
storage/
├── documents/           # Documentos subidos y procesados
│   ├── silabos/
│   ├── resoluciones/
│   ├── informes/
│   ├── reglamentos/
│   └── planes-estudio/
├── generated/           # Documentos generados por la IA
├── chromadb/            # Base de datos vectorial
└── templates/           # Plantillas de documentos
```

Para agregar nuevos documentos al sistema:
1. Coloca los archivos PDF/DOCX en la carpeta correspondiente dentro de `storage/documents/`
2. Reinicia el backend — los documentos se indexan automáticamente al inicio

### Usar con PM2 (producción)

```bash
# Instalar PM2
sudo npm install -g pm2

# Iniciar servicios
pm2 start backend/src/app.js --name "epiis-backend"
pm2 start "npm run dev --prefix frontend" --name "epiis-frontend"

# Auto-inicio al reiniciar Ubuntu
pm2 startup
pm2 save

# Ver logs
pm2 logs

# Reiniciar después de cambios
pm2 restart all
```

---

## 📊 API REST — Endpoints

| Método | Endpoint | Descripción |
|---|---|---|
| `GET` | `/api/health` | Estado del servidor y servicios |
| `GET` | `/api/status` | Estadísticas del sistema |
| `POST` | `/api/chat` | Chat con la IA (principal) |
| `POST` | `/api/chat/stream` | Chat en streaming |
| `POST` | `/api/search` | Búsqueda semántica en documentos |
| `POST` | `/api/settings/ai` | Cambiar configuración de IA |
| `POST` | `/api/scrape` | Extraer contenido web institucional |
| `GET` | `/api/context/status` | Estado del contexto institucional |
| `POST` | `/api/generate/syllabus` | Generar sílabo |
| `POST` | `/api/generate/resolution` | Generar resolución |
| `GET` | `/api/whatsapp/status` | Estado de WhatsApp |
| `POST` | `/api/whatsapp/init` | Iniciar sesión WhatsApp |

---

## 🔧 Solución de Problemas

### ❌ El sistema muestra "Error en cloud: Request failed"

**Causa**: API Key de Ollama Cloud inválida o expirada.

```bash
# Verificar tu API Key
nano ~/mcp-epiis/.env
# Revisa que OLLAMA_CLOUD_API_KEY tenga un valor válido

# Probar la API directamente
curl https://ollama.com/api/chat \
  -H "Authorization: Bearer <TU_API_KEY>" \
  -d '{"model":"minimax-m2:cloud","messages":[{"role":"user","content":"hola"}],"stream":false}'
```

**Solución**: Genera una nueva API Key en https://ollama.com → Settings → API Keys

---

### ❌ WhatsApp no conecta / falta librería

**Causa**: Dependencias de Chromium no instaladas.

```bash
# Instalar dependencias de Chromium para Ubuntu 24.04
cd ~/mcp-epiis
sudo bash backend/scripts/install-puppeteer-deps.sh

# Reiniciar el backend
pm2 restart epiis-backend
# o: npm run dev
```

---

### ❌ Los documentos no se generan

**Causa**: Timeout de la IA o error en la conversión JSON.

1. Verifica los logs del backend:
   ```bash
   pm2 logs epiis-backend --lines 50
   ```
2. Si ves `timeout`, cambia a un modelo más rápido (Gemini Flash)
3. Si ves errores de JSON, el documento se generará como PDF de respaldo automáticamente

---

### ❌ No puedo acceder desde mi PC al sistema en la VM

```bash
# En Ubuntu, verificar la IP
ip addr show

# Verificar que los servicios estén corriendo
curl -k https://localhost:3001/api/health

# Si usas firewall, abrir puertos
sudo ufw allow 3000
sudo ufw allow 3001
```

**Otras verificaciones:**
- En VirtualBox, asegúrate de que la red esté en **Adaptador Puente** (no NAT)
- Verifica que tu PC y la VM estén en la **misma red Wi-Fi/Ethernet**
- Desactiva temporalmente el firewall de Windows para probar: *Panel de Control → Firewall de Windows → Desactivar*

---

### ❌ Ollama local no funciona

```bash
# Verificar estado
systemctl status ollama

# Reiniciar
sudo systemctl restart ollama

# Verificar que tenga el modelo de embeddings
ollama list
ollama pull nomic-embed-text
```

---

### ❌ La VM está muy lenta

1. **Aumentar RAM**: Configuración → Sistema → Memoria base (mínimo 4 GB, recomendado 8 GB)
2. **Aumentar CPUs**: Configuración → Sistema → Procesador (mínimo 2, recomendado 4)
3. **Usar modo Cloud**: En `.env` configurar `IA_MODE=cloud` para no depender del hardware local
4. **Instalar Guest Additions**: En el menú de VirtualBox → Dispositivos → Insertar imagen de Guest Additions → seguir instrucciones

---

### ❌ Error "ENOSPC: no space left on device"

```bash
# Verificar espacio en disco
df -h

# Limpiar archivos temporales
sudo apt clean
sudo apt autoremove -y
rm -rf ~/mcp-epiis/backend/storage/generated/*.pdf  # Limpiar documentos generados antiguos
```

---

### ❌ npm install falla con errores de permisos

```bash
# Corregir permisos del directorio del proyecto
sudo chown -R $(whoami):$(whoami) ~/mcp-epiis

# Limpiar caché de npm
npm cache clean --force

# Reintentar
cd ~/mcp-epiis
npm run install:all
```

---

### ❌ Error SSL "self-signed certificate" en el navegador

Esto es **normal** y no es un error real. El sistema usa un certificado auto-firmado para HTTPS.

**Chrome/Edge**: Haz clic en *"Avanzado"* → *"Continuar a localhost (no seguro)"*  
**Firefox**: Haz clic en *"Avanzado"* → *"Aceptar el riesgo y continuar"*

---

## 🗺️ Roadmap

- [x] Chat conversacional con IA
- [x] Generación de PDF profesional
- [x] Generación de Word (DOCX) con formato UNAS
- [x] Generación de Excel (XLSX) con formato profesional
- [x] Generación de PowerPoint (PPTX)
- [x] Integración con WhatsApp
- [x] Búsqueda semántica con ChromaDB
- [x] Web scraping institucional
- [x] Autenticación con Google
- [x] Soporte Ollama Cloud (MiniMax, DeepSeek, Kimi, Qwen, Gemini)
- [x] Despliegue en Ubuntu 24.04 LTS (OVA)
- [ ] Dashboard de estadísticas
- [ ] Análisis de imágenes en documentos
- [ ] Integración con sistema de matrícula
- [ ] App móvil nativa

---

## 📄 Licencia

MIT License — Ver archivo [LICENSE](LICENSE)

---

## 👥 Créditos

**Proyecto de Tesis**  
Escuela Profesional de Ingeniería Informática y Sistemas  
Universidad Nacional Agraria de la Selva — Tingo María, Perú

**Desarrollado por:**
- Gabriel Bardales Rojas

---

<div align="center">

**Versión**: 2.0.0  
**Plataforma**: Ubuntu 24.04 LTS (VirtualBox OVA)  
**Última actualización**: Abril 2026

---

*Hecho con ❤️ para la comunidad académica de la UNAS*

</div>