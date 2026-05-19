// Proceso principal de Electron.
// Es deliberadamente mínimo: el harness es donde se acumula la complejidad
// que el podcast critica. Aquí sólo abrimos la ventana, exponemos APIs de
// disco/clipboard via preload, y dejamos que el renderer haga el trabajo.

const { app, BrowserWindow, Menu, ipcMain, dialog, shell } = require('electron');
const fs = require('fs');
const path = require('path');

let mainWindow = null;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1480,
    height: 920,
    minWidth: 1100,
    minHeight: 720,
    backgroundColor: '#0b0e14',
    title: 'Shosso',
    titleBarStyle: process.platform === 'darwin' ? 'hiddenInset' : 'default',
    autoHideMenuBar: true,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false
    }
  });

  mainWindow.loadFile('index.html');

  if (process.env.SHOSSO_DEVTOOLS === '1') {
    mainWindow.webContents.openDevTools({ mode: 'detach' });
  }

  mainWindow.on('closed', () => { mainWindow = null; });
}

// === Menú nativo (mínimo, no añade ruido) ===
function buildMenu() {
  const template = [
    {
      label: 'Shosso',
      submenu: [
        { role: 'about' },
        { type: 'separator' },
        {
          label: 'Acerca de Shosso',
          click: () => {
            dialog.showMessageBox(mainWindow, {
              type: 'info',
              title: 'Shosso',
              message: 'Shosso IDE 0.1.0',
              detail: 'IDE nativo de skills.\n\nDiseñado para hacer visible lo invisible: cuántos tokens cuesta cada decisión, qué se carga en cada turno, y por qué construir tus propias skills es lo único que escala.'
            });
          }
        },
        { type: 'separator' },
        { role: 'quit' }
      ]
    },
    {
      label: 'Archivo',
      submenu: [
        {
          label: 'Abrir carpeta…',
          accelerator: 'CmdOrCtrl+O',
          click: async () => {
            const r = await dialog.showOpenDialog(mainWindow, { properties: ['openDirectory'] });
            if (!r.canceled && r.filePaths[0]) {
              mainWindow.webContents.send('shosso:open-folder', r.filePaths[0]);
            }
          }
        },
        { type: 'separator' },
        { role: 'close' }
      ]
    },
    {
      label: 'Edición',
      submenu: [
        { role: 'undo' }, { role: 'redo' }, { type: 'separator' },
        { role: 'cut' }, { role: 'copy' }, { role: 'paste' }, { role: 'selectAll' }
      ]
    },
    {
      label: 'Ver',
      submenu: [
        {
          label: 'Onboarding "rundown"',
          accelerator: 'CmdOrCtrl+Shift+R',
          click: () => mainWindow.webContents.send('shosso:tutorial', 'rundown')
        },
        {
          label: 'Diagnóstico de contexto',
          accelerator: 'CmdOrCtrl+Shift+C',
          click: () => mainWindow.webContents.send('shosso:focus-panel', 'context')
        },
        { type: 'separator' },
        { role: 'reload' }, { role: 'toggleDevTools' }
      ]
    },
    {
      label: 'Skills',
      submenu: [
        {
          label: 'Nueva skill (constructor recursivo)…',
          accelerator: 'CmdOrCtrl+K',
          click: () => mainWindow.webContents.send('shosso:menu', 'new-skill')
        },
        {
          label: 'Importar skill externa (con aviso de seguridad)',
          click: () => mainWindow.webContents.send('shosso:menu', 'import-skill')
        }
      ]
    },
    {
      label: 'Ayuda',
      submenu: [
        {
          label: 'Filosofía del producto',
          click: () => mainWindow.webContents.send('shosso:tutorial', 'philosophy')
        },
        {
          label: 'Reportar problema',
          click: () => shell.openExternal('https://github.com/shannoafirex/shosso/issues')
        }
      ]
    }
  ];
  Menu.setApplicationMenu(Menu.buildFromTemplate(template));
}

// === IPC: lectura/escritura de carpeta del usuario ===
ipcMain.handle('shosso:read-dir', async (_e, dir) => {
  try {
    const entries = fs.readdirSync(dir, { withFileTypes: true });
    return entries
      .filter(e => !e.name.startsWith('.'))
      .map(e => ({
        name: e.name,
        path: path.join(dir, e.name),
        isDir: e.isDirectory()
      }));
  } catch (err) { return { error: err.message }; }
});

ipcMain.handle('shosso:read-file', async (_e, file) => {
  try {
    const content = fs.readFileSync(file, 'utf8');
    return { content };
  } catch (err) { return { error: err.message }; }
});

ipcMain.handle('shosso:write-file', async (_e, file, content) => {
  try {
    fs.mkdirSync(path.dirname(file), { recursive: true });
    fs.writeFileSync(file, content, 'utf8');
    return { ok: true };
  } catch (err) { return { error: err.message }; }
});

ipcMain.handle('shosso:show-confirm', async (_e, opts) => {
  const r = await dialog.showMessageBox(mainWindow, {
    type: opts.type || 'warning',
    buttons: opts.buttons || ['Cancelar', 'Continuar'],
    defaultId: opts.defaultId ?? 0,
    cancelId: 0,
    title: opts.title || 'Confirmar',
    message: opts.message || '',
    detail: opts.detail || ''
  });
  return r.response;
});

app.whenReady().then(() => {
  buildMenu();
  createWindow();
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});
