// Secure bridge: contextIsolation stays on. Everything the renderer can
// touch is explicit here.
const { contextBridge, ipcRenderer } = require('electron');

const invoke = (ch, ...a) => ipcRenderer.invoke(ch, ...a);

contextBridge.exposeInMainWorld('shosso', {
  platform: process.platform,

  settings: {
    get: () => invoke('settings:get'),
    set: (s) => invoke('settings:set', s)
  },

  secrets: {
    has: (k) => invoke('secrets:has', k),
    set: (k, v) => invoke('secrets:set', k, v),
    clear: (k) => invoke('secrets:clear', k),
    available: () => invoke('secrets:available')
  },

  fs: {
    readDir: (p) => invoke('fs:readDir', p),
    readFile: (p) => invoke('fs:readFile', p),
    writeFile: (p, c) => invoke('fs:writeFile', p, c),
    delete: (p) => invoke('fs:delete', p),
    rename: (a, b) => invoke('fs:rename', a, b),
    mkdir: (p) => invoke('fs:mkdir', p),
    stat: (p) => invoke('fs:stat', p),
    walk: (root) => invoke('fs:walk', root),
    grep: (root, pattern, opts) => invoke('fs:grep', root, pattern, opts)
  },

  pty: {
    spawn: (opts) => invoke('pty:spawn', opts),
    write: (id, data) => invoke('pty:write', id, data),
    resize: (id, c, r) => invoke('pty:resize', id, c, r),
    kill: (id) => invoke('pty:kill', id),
    onData: (cb) => ipcRenderer.on('pty:data', (_e, id, data) => cb(id, data)),
    onExit: (cb) => ipcRenderer.on('pty:exit', (_e, id, code, signal) => cb(id, code, signal))
  },

  shell: {
    exec: (cmd, cwd) => invoke('shell:exec', cmd, cwd)
  },

  git: {
    status: (root) => invoke('git:status', root),
    diff: (root, file, staged) => invoke('git:diff', root, file, staged),
    stage: (root, files) => invoke('git:stage', root, files),
    unstage: (root, files) => invoke('git:unstage', root, files),
    commit: (root, msg) => invoke('git:commit', root, msg),
    branches: (root) => invoke('git:branches', root),
    log: (root, limit) => invoke('git:log', root, limit)
  },

  llm: {
    run: (opts) => invoke('llm:run', opts),
    abort: (runId) => invoke('llm:abort', runId),
    onEvent: (cb) => ipcRenderer.on('llm:event', (_e, runId, evt) => cb(runId, evt))
  },

  app: {
    cwd: () => invoke('app:cwd'),
    homedir: () => invoke('app:homedir'),
    platform: () => invoke('app:platform'),
    openExternal: (u) => invoke('app:openExternal', u),
    confirm: (opts) => invoke('app:showConfirm', opts),
    pickFolder: () => invoke('app:pickFolder')
  },

  on: {
    openFolder: (cb) => ipcRenderer.on('shosso:open-folder', (_e, p) => cb(p)),
    menu: (cb) => ipcRenderer.on('shosso:menu', (_e, action) => cb(action))
  }
});
