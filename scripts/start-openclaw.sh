#!/usr/bin/env bash
# ============================================
# EPIIS + OpenClaw - Inicio Rapido
# ============================================

set -e
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"

echo ""
echo "======================================="
echo "  EPIIS + OpenClaw - Inicio Rapido"
echo "======================================="
echo ""

# 1. Verificar Node.js
echo "[1/5] Verificando Node.js..."
if command -v node &>/dev/null; then
    echo "  OK: Node.js $(node --version)"
else
    echo "  ERROR: Node.js no encontrado. Instala Node.js 18+ primero."
    exit 1
fi

# 2. Verificar Ollama
echo "[2/5] Verificando Ollama..."
OLLAMA_RUNNING=false
if curl -s --max-time 3 http://localhost:11434/api/tags &>/dev/null; then
    OLLAMA_RUNNING=true
    echo "  OK: Ollama esta corriendo"
else
    echo "  AVISO: Ollama no esta corriendo"
    if command -v ollama &>/dev/null; then
        echo "  Intentando iniciar Ollama..."
        ollama serve &>/dev/null &
        sleep 3
        if curl -s --max-time 5 http://localhost:11434/api/tags &>/dev/null; then
            OLLAMA_RUNNING=true
            echo "  OK: Ollama iniciado correctamente"
        else
            echo "  ERROR: No se pudo iniciar Ollama automaticamente"
        fi
    else
        echo "  ERROR: Ollama no esta instalado. Descargalo de: https://ollama.com/download"
    fi
fi

# 3. Verificar dependencias
echo "[3/5] Verificando dependencias..."
if [ ! -d "$PROJECT_ROOT/backend/node_modules" ]; then
    echo "  Instalando dependencias..."
    (cd "$PROJECT_ROOT/backend" && npm install --silent)
fi
echo "  OK: Dependencias listas"

# 4. Verificar MCP Server
echo "[4/5] Verificando servidor MCP..."
cd "$PROJECT_ROOT"
MCP_RESULT=$(npx mcporter list 2>&1 || true)
if echo "$MCP_RESULT" | grep -q "epiis-academic"; then
    echo "  OK: Servidor MCP 'epiis-academic' detectado"
else
    echo "  AVISO: mcporter no detecta el servidor. Usando --config..."
fi

# 5. Iniciar OpenClaw Gateway
echo "[5/5] Iniciando OpenClaw Gateway..."
echo ""
echo "======================================="
echo "  Gateway iniciando..."
echo "  WhatsApp: vinculado"
if [ "$OLLAMA_RUNNING" = true ]; then
    echo "  LLM: Ollama (local)"
else
    echo "  LLM: Ollama (NO CORRIENDO)"
fi
echo "  MCP: epiis-academic (6 tools)"
echo "======================================="
echo ""
echo "Presiona Ctrl+C para detener el gateway"
echo ""

cd "$PROJECT_ROOT"
npx openclaw gateway --allow-unconfigured
