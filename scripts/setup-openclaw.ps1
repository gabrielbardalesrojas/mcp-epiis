<#
.SYNOPSIS
    Setup inicial de OpenClaw para el proyecto EPIIS
.DESCRIPTION
    Configura OpenClaw con Ollama como modelo local, verifica WhatsApp,
    y registra el servidor MCP. Ejecutar solo la primera vez.
#>

$ErrorActionPreference = "Continue"
$ProjectRoot = Split-Path -Parent $PSScriptRoot

Write-Host ""
Write-Host "=======================================" -ForegroundColor Cyan
Write-Host "  EPIIS + OpenClaw - Setup Inicial" -ForegroundColor Cyan
Write-Host "=======================================" -ForegroundColor Cyan
Write-Host ""

# -----------------------------------------------
# 1. Verificar OpenClaw
# -----------------------------------------------
Write-Host "[1/5] Verificando OpenClaw..." -ForegroundColor Yellow
try {
    $version = npx openclaw --version 2>$null
    Write-Host "  OK: OpenClaw v$version" -ForegroundColor Green
} catch {
    Write-Host "  ERROR: OpenClaw no instalado." -ForegroundColor Red
    Write-Host '  Ejecuta: iwr -useb https://openclaw.ai/install.ps1 | iex' -ForegroundColor Yellow
    exit 1
}

# -----------------------------------------------
# 2. Configurar modelo Ollama en OpenClaw
# -----------------------------------------------
Write-Host "[2/5] Configurando modelo LLM..." -ForegroundColor Yellow

# Verificar si Ollama esta corriendo
$ollamaAvailable = $false
try {
    Invoke-RestMethod -Uri "http://localhost:11434/api/tags" -TimeoutSec 3 -ErrorAction Stop | Out-Null
    $ollamaAvailable = $true
} catch {}

if ($ollamaAvailable) {
    Write-Host "  Ollama detectado. Configurando como modelo local..." -ForegroundColor Green
    npx openclaw config set agent.model "ollama/llama3.2:3b" 2>$null
    Write-Host "  OK: Modelo configurado -> ollama/llama3.2:3b" -ForegroundColor Green
} else {
    Write-Host "  AVISO: Ollama no esta corriendo." -ForegroundColor Yellow
    Write-Host "  Puedes configurar el modelo manualmente despues:" -ForegroundColor Yellow
    Write-Host '    npx openclaw config set agent.model "ollama/llama3.2:3b"' -ForegroundColor DarkGray
    Write-Host '    O usa un modelo en la nube:' -ForegroundColor DarkGray
    Write-Host '    npx openclaw config set agent.model "anthropic/claude-sonnet-4-20250514"' -ForegroundColor DarkGray
}

# -----------------------------------------------
# 3. Registrar MCP Server en mcporter
# -----------------------------------------------
Write-Host "[3/5] Registrando servidor MCP en mcporter..." -ForegroundColor Yellow
Push-Location $ProjectRoot

try {
    # Verificar si ya esta registrado
    $listResult = npx mcporter list 2>&1
    if ($listResult -match "epiis-academic") {
        Write-Host "  OK: Servidor 'epiis-academic' ya registrado" -ForegroundColor Green
    } else {
        # Registrar usando el config existente
        npx mcporter config add epiis-academic --command node --arg "backend/src/mcp/server.js" --env "OLLAMA_HOST=http://localhost:11434" --env "OLLAMA_MODEL=llama3.2:3b" --description "Servidor academico EPIIS-UNSM" 2>$null
        Write-Host "  OK: Servidor 'epiis-academic' registrado" -ForegroundColor Green
    }
} catch {
    Write-Host "  ERROR: No se pudo registrar el servidor MCP" -ForegroundColor Red
    Write-Host "  El archivo config/mcporter.json ya tiene la configuracion." -ForegroundColor Yellow
}
Pop-Location

# -----------------------------------------------
# 4. Verificar canal WhatsApp
# -----------------------------------------------
Write-Host "[4/5] Verificando WhatsApp..." -ForegroundColor Yellow
$channelResult = npx openclaw channels list 2>&1
if ($channelResult -match "linked") {
    Write-Host "  OK: WhatsApp vinculado y habilitado" -ForegroundColor Green
} else {
    Write-Host "  WhatsApp no vinculado. Iniciando proceso de vinculacion..." -ForegroundColor Yellow
    Write-Host "  Se abrira un QR code. Escanea con tu telefono." -ForegroundColor Yellow
    Write-Host ""
    npx openclaw channels login --channel whatsapp --verbose
}

# -----------------------------------------------
# 5. Resumen
# -----------------------------------------------
Write-Host ""
Write-Host "=======================================" -ForegroundColor Green
Write-Host "  Setup completado!" -ForegroundColor Green
Write-Host "=======================================" -ForegroundColor Green
Write-Host ""
Write-Host "Para iniciar OpenClaw:" -ForegroundColor White
Write-Host "  .\scripts\start-openclaw.ps1" -ForegroundColor Cyan
Write-Host ""
Write-Host "Comandos utiles:" -ForegroundColor White
Write-Host "  npx openclaw status          # ver estado" -ForegroundColor DarkGray
Write-Host "  npx openclaw channels list   # ver canales" -ForegroundColor DarkGray
Write-Host "  npx mcporter list            # ver herramientas MCP" -ForegroundColor DarkGray
Write-Host "  npx openclaw doctor          # diagnostico" -ForegroundColor DarkGray
Write-Host ""
