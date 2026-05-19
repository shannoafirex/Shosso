@echo off
REM Build Shosso for Windows. Run once after extracting the zip.
REM Requires Node.js 18+ and Visual Studio Build Tools 2022 (Desktop C++).

echo === Shosso Windows builder ===
echo.

where node >nul 2>&1
if errorlevel 1 (
  echo ERROR: Node.js no esta en PATH. Instala desde https://nodejs.org
  pause
  exit /b 1
)

echo [1/3] Instalando dependencias...
call npm install
if errorlevel 1 (
  echo ERROR: npm install fallo. Asegurate de tener Visual Studio Build Tools instalado.
  echo  Mas info: https://github.com/microsoft/node-pty#dependencies
  pause
  exit /b 1
)

echo.
echo [2/3] Recompilando node-pty para Electron...
call npm run rebuild
if errorlevel 1 (
  echo AVISO: rebuild fallo. El terminal puede no funcionar; el resto si.
)

echo.
echo [3/3] Generando instalador .exe en dist\
call npm run dist -- --win --x64
if errorlevel 1 (
  echo ERROR: build fallo. Mira el log arriba.
  pause
  exit /b 1
)

echo.
echo === LISTO ===
echo Instalador en: dist\Shosso Setup 0.2.0.exe
echo Para ejecutar sin instalar: npm start
pause
