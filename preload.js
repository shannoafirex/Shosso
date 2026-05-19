// Secure bridge: contextIsolation stays on. Everything the renderer can
// touch is explicit here.
const { contextBridge, ipcRenderer } = require('electron');

const invoke = (ch, ...a) => ipcRenderer.invoke(ch, ...a);

// Wrap ipcRenderer.on so the renderer can unsubscribe. Returning the wrapped
// listener is not enough across the contextBridge (functions are cloned), so
// we hand back a disposer. Renderer code that re-runs (e.g. hot reload of a
// component) can call the disposer to avoid duplicate handlers.
function subscribe(channel, transform) {
  return (cb) => {
    if (typeof cb !== 'function') return () => {};
    const listener = (_e, ...args) => {
      try { cb(...transform(args)); } catch (err) { console.error(channel, err); }
    };
    ipcRenderer.on(channel, listener);
    return () => { try { ipcRenderer.removeListener(channel, listener); } catch {} };
  };
}

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
    onData: subscribe('pty:data', ([id, data]) => [id, data]),
    onExit: subscribe('pty:exit', ([id, code, signal]) => [id, code, signal])
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
    onEvent: subscribe('llm:event', ([runId, evt]) => [runId, evt])
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
    openFolder: subscribe('shosso:open-folder', ([p]) => [p]),
    menu: subscribe('shosso:menu', ([action]) => [action])
  }
});
