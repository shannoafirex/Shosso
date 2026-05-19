#!/usr/bin/env bash
# Build Shosso for Linux. Requires Node 18+ and build-essential + python3.
set -e
echo "=== Shosso Linux builder ==="
echo "[1/3] npm install"
npm install
echo "[2/3] rebuild node-pty for Electron"
npm run rebuild || echo "AVISO: rebuild fallo. Terminal puede no funcionar."
echo "[3/3] dist --linux"
npm run dist -- --linux
echo
echo "=== LISTO ==="
echo "AppImage en: dist/Shosso-0.2.0.AppImage"
echo ".deb en: dist/shosso_0.2.0_amd64.deb"
