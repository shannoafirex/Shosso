# Instalación de Shosso

## Requisitos comunes

- **Node.js 18+** (https://nodejs.org — LTS recomendado)
- Compilador C/C++ nativo (necesario para `node-pty`, que da el terminal real)

## Por sistema operativo

### Windows

1. Instala **Visual Studio Build Tools 2022** con el workload "Desktop development with C++".
   - https://visualstudio.microsoft.com/visual-cpp-build-tools/
2. Doble click en `build-windows.bat`
3. Espera a que termine. El instalador queda en `dist\Shosso Setup 0.2.0.exe`

**Sin instalar**: `npm install && npm start` (también desde PowerShell).

### macOS

1. `xcode-select --install`
2. `./build-mac.sh`
3. Resultado en `dist/Shosso-0.2.0.dmg`

### Linux

1. `sudo apt install build-essential python3` (Debian/Ubuntu) o equivalente
2. `./build-linux.sh`
3. Resultado: `dist/Shosso-0.2.0.AppImage` y `dist/shosso_0.2.0_amd64.deb`

## Primer arranque

1. Abre Shosso
2. Click en **⚙ Ajustes** (Cmd/Ctrl+,)
3. Elige proveedor (Anthropic o OpenAI)
4. Pega tu API key — se guarda cifrada en el keychain del SO
5. Click en **📁 Carpeta** y elige el proyecto

## Solución de problemas

- **Terminal no aparece**: `npm run rebuild` (recompila node-pty)
- **"Cannot find module @anthropic-ai/sdk"**: `npm install`
- **"safeStorage no disponible"**: en Linux headless, instala libsecret-1-dev y reinicia
- **Crash al abrir carpeta enorme**: el árbol limita a la primera lectura;
  para repos gigantes evita cargar todo node_modules
