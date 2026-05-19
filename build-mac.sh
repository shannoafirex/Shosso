#!/usr/bin/env bash
# Build Shosso for macOS. Requires Node 18+ and Xcode CLT (`xcode-select --install`).
set -e
echo "=== Shosso macOS builder ==="
echo "[1/3] npm install"
npm install
echo "[2/3] rebuild node-pty for Electron"
npm run rebuild || echo "AVISO: rebuild fallo. Terminal puede no funcionar."
echo "[3/3] dist --mac"
npm run dist -- --mac
echo
echo "=== LISTO ==="
echo "DMG en: dist/Shosso-0.2.0.dmg"
