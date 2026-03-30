<#
.SYNOPSIS
    Inicia el ecosistema OpenClaw + MCP Server EPIIS para WhatsApp
.DESCRIPTION
    Este script verifica dependencias, inicia Ollama si es necesario,
    valida el servidor MCP y arranca el gateway de OpenClaw.
#>

$ErrorActionPreference = "Continue"
$ProjectRoot = Split-Path -Parent $PSScriptRoot

Write-Host ""
Write-Host "=======================================" -ForegroundColor Cyan
Write-Host "  EPIIS + OpenClaw - Inicio Rapido" -ForegroundColor Cyan
Write-Host "=======================================" -ForegroundColor Cyan
Write-Host ""

# -----------------------------------------------
# 1. Verificar Node.js
# -----------------------------------------------
Write-Host "[1/5] Verificando Node.js..." -ForegroundColor Yellow
try {
    $nodeVersion = node --version 2>$null
    Write-Host "  OK: Node.js $nodeVersion" -ForegroundColor Green
} catch {
    Write-Host "  ERROR: Node.js no encontrado. Instala Node.js 18+ primero." -ForegroundColor Red
    exit 1
}

# -----------------------------------------------
# 2. Verificar Ollama
# -----------------------------------------------
Write-Host "[2/5] Verificando Ollama..." -ForegroundColor Yellow
$ollamaRunning = $false
try {
    $response = Invoke-RestMethod -Uri "http://localhost:11434/api/tags" -TimeoutSec 3 -ErrorAction Stop
    $ollamaRunning = $true
    Write-Host "  OK: Ollama esta corriendo" -ForegroundColor Green
    
    # Verificar modelo
    $models = $response.models | ForEach-Object { $_.name }
    if ($models -match "llama3") {
        Write-Host "  OK: Modelo llama3 disponible" -ForegroundColor Green
    } else {
        Write-Host "  AVISO: Modelo llama3 no encontrado. Modelos disponibles: $($models -join ', ')" -ForegroundColor Yellow
        Write-Host "  Ejecuta: ollama pull llama3.2:3b" -ForegroundColor Yellow
    }
} catch {
    Write-Host "  AVISO: Ollama no esta corriendo" -ForegroundColor Yellow
    Write-Host "  Intentando iniciar Ollama..." -ForegroundColor Yellow
    
    # Intentar iniciar Ollama
    $ollamaPath = Get-Command ollama -ErrorAction SilentlyContinue
    if ($ollamaPath) {
        Start-Process ollama -ArgumentList "serve" -WindowStyle Hidden
        Start-Sleep -Seconds 3
        
        try {
            Invoke-RestMethod -Uri "http://localhost:11434/api/tags" -TimeoutSec 5 -ErrorAction Stop | Out-Null
            $ollamaRunning = $true
            Write-Host "  OK: Ollama iniciado correctamente" -ForegroundColor Green
        } catch {
            Write-Host "  ERROR: No se pudo iniciar Ollama automaticamente" -ForegroundColor Red
            Write-Host "  Abre la aplicacion de Ollama manualmente" -ForegroundColor Yellow
        }
    } else {
        Write-Host "  ERROR: Ollama no esta instalado" -ForegroundColor Red
        Write-Host "  Descargalo de: https://ollama.com/download" -ForegroundColor Yellow
    }
}

# -----------------------------------------------
# 3. Verificar dependencias del proyecto
# -----------------------------------------------
Write-Host "[3/5] Verificando dependencias del proyecto..." -ForegroundColor Yellow
if (-not (Test-Path "$ProjectRoot\backend\node_modules")) {
    Write-Host "  Instalando dependencias..." -ForegroundColor Yellow
    Push-Location "$ProjectRoot\backend"
    npm install --silent 2>$null
    Pop-Location
}
Write-Host "  OK: Dependencias listas" -ForegroundColor Green

# -----------------------------------------------
# 4. Verificar MCP Server con mcporter
# -----------------------------------------------
Write-Host "[4/5] Verificando servidor MCP..." -ForegroundColor Yellow
Push-Location $ProjectRoot
try {
    $mcpResult = npx mcporter list 2>&1
    if ($mcpResult -match "epiis-academic") {
        Write-Host "  OK: Servidor MCP 'epiis-academic' detectado" -ForegroundColor Green
    } else {
        Write-Host "  AVISO: mcporter no detecta el servidor. Verificando con --config..." -ForegroundColor Yellow
        $mcpResult2 = npx mcporter list --config "$ProjectRoot\config\mcporter.json" 2>&1
        if ($mcpResult2 -match "epiis-academic") {
            Write-Host "  OK: Servidor MCP detectado con config explicito" -ForegroundColor Green
        } else {
            Write-Host "  ERROR: No se pudo conectar al servidor MCP" -ForegroundColor Red
        }
    }
} catch {
    Write-Host "  ERROR: mcporter no disponible" -ForegroundColor Red
}
Pop-Location

# -----------------------------------------------
# 5. Iniciar OpenClaw Gateway
# -----------------------------------------------
Write-Host "[5/5] Iniciando OpenClaw Gateway..." -ForegroundColor Yellow
Write-Host ""
Write-Host "=======================================" -ForegroundColor Green
Write-Host "  Gateway iniciando..." -ForegroundColor Green
Write-Host "  WhatsApp: vinculado" -ForegroundColor Green
if ($ollamaRunning) {
    Write-Host "  LLM: Ollama (local)" -ForegroundColor Green
} else {
    Write-Host "  LLM: Ollama (NO CORRIENDO)" -ForegroundColor Yellow
}
Write-Host "  MCP: epiis-academic (6 tools)" -ForegroundColor Green
Write-Host "=======================================" -ForegroundColor Green
Write-Host ""
Write-Host "Presiona Ctrl+C para detener el gateway" -ForegroundColor DarkGray
Write-Host ""

# Iniciar gateway desde la raiz del proyecto (para que detecte openclaw.json)
Push-Location $ProjectRoot
npx openclaw gateway --allow-unconfigured
Pop-Location
