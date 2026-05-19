// Puente seguro entre renderer y main. Mantiene contextIsolation activo.
const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('shosso', {
  readDir: (p) => ipcRenderer.invoke('shosso:read-dir', p),
  readFile: (p) => ipcRenderer.invoke('shosso:read-file', p),
  writeFile: (p, c) => ipcRenderer.invoke('shosso:write-file', p, c),
  confirm: (opts) => ipcRenderer.invoke('shosso:show-confirm', opts),

  onOpenFolder: (cb) => ipcRenderer.on('shosso:open-folder', (_e, p) => cb(p)),
  onMenu: (cb) => ipcRenderer.on('shosso:menu', (_e, action) => cb(action)),
  onTutorial: (cb) => ipcRenderer.on('shosso:tutorial', (_e, which) => cb(which)),
  onFocusPanel: (cb) => ipcRenderer.on('shosso:focus-panel', (_e, panel) => cb(panel)),

  platform: process.platform
});
