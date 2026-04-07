#!/bin/bash

# Script para instalar dependencias de Puppeteer/Chromium en Ubuntu 24.04+ (Noble)
# FIIS · UNAS

echo "--------------------------------------------------------"
echo "📦 Instalando dependencias de Puppeteer/Chromium"
echo "   (Compatible con Ubuntu 24.04 Noble)"
echo "--------------------------------------------------------"

# Verificar si se ejecuta como root o con sudo
if [ "$EUID" -ne 0 ]; then
  echo "⚠️  Por favor, ejecuta este script con sudo:"
  echo "sudo bash backend/scripts/install-puppeteer-deps.sh"
  exit 1
fi

echo "🔄 Actualizando lista de paquetes..."
apt-get update

echo "🚀 Instalando librerías compartidas..."
apt-get install -y \
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

echo ""
echo "✅ Instalación completada exitosamente."
echo "🔄 Se recomienda reiniciar el servidor de backend."
echo ""
