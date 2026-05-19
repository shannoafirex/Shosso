// Shosso main process: real filesystem, real terminal (node-pty),
// real git (simple-git), real LLM calls (Anthropic + OpenAI), API keys
// encrypted via Electron safeStorage. No simulation anywhere.

const { app, BrowserWindow, Menu, ipcMain, dialog, shell, safeStorage } = require('electron');
const fs = require('fs');
const fsp = require('fs/promises');
const path = require('path');
const os = require('os');
const { spawn } = require('child_process');

let mainWindow = null;
const ptyStore = new Map(); // id -> IPty
const agentRuns = new Map(); // runId -> { abort: AbortController }

// === Config & secrets ===
const CONFIG_DIR = path.join(app.getPath('userData'));
const SECRETS_FILE = path.join(CONFIG_DIR, 'secrets.bin');
const SETTINGS_FILE = path.join(CONFIG_DIR, 'settings.json');

function loadSettings() {
  try {
    return JSON.parse(fs.readFileSync(SETTINGS_FILE, 'utf8'));
  } catch {
    return {
      provider: 'anthropic',
      anthropicModel: 'claude-sonnet-4-5',
      openaiModel: 'gpt-4o',
      maxTokens: 4096,
      systemPrompt: '',
      lastFolder: null,
      autoCompactPct: 0.8
    };
  }
}
function saveSettings(s) {
  fs.mkdirSync(CONFIG_DIR, { recursive: true });
  fs.writeFileSync(SETTINGS_FILE, JSON.stringify(s, null, 2));
}
function loadSecrets() {
  try {
    if (!safeStorage.isEncryptionAvailable()) return {};
    const buf = fs.readFileSync(SECRETS_FILE);
    return JSON.parse(safeStorage.decryptString(buf));
  } catch { return {}; }
}
function saveSecrets(obj) {
  fs.mkdirSync(CONFIG_DIR, { recursive: true });
  if (!safeStorage.isEncryptionAvailable()) {
    throw new Error('safeStorage no disponible en este SO');
  }
  const buf = safeStorage.encryptString(JSON.stringify(obj));
  fs.writeFileSync(SECRETS_FILE, buf, { mode: 0o600 });
}

// === Window ===
function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1480, height: 920, minWidth: 1100, minHeight: 720,
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
  mainWindow.on('closed', () => {
    mainWindow = null;
    for (const p of ptyStore.values()) try { p.kill(); } catch {}
    ptyStore.clear();
  });
}

function buildMenu() {
  const template = [
    {
      label: 'Shosso',
      submenu: [
        { role: 'about' },
        { type: 'separator' },
        { label: 'Ajustes (API keys, modelo)…',
          accelerator: 'CmdOrCtrl+,',
          click: () => mainWindow?.webContents.send('shosso:menu', 'settings') },
        { type: 'separator' },
        { role: 'quit' }
      ]
    },
    {
      label: 'Archivo',
      submenu: [
        { label: 'Abrir carpeta…', accelerator: 'CmdOrCtrl+O',
          click: async () => {
            const r = await dialog.showOpenDialog(mainWindow, { properties: ['openDirectory'] });
            if (!r.canceled && r.filePaths[0]) {
              const s = loadSettings(); s.lastFolder = r.filePaths[0]; saveSettings(s);
              mainWindow.webContents.send('shosso:open-folder', r.filePaths[0]);
            }
          }
        },
        { label: 'Guardar', accelerator: 'CmdOrCtrl+S',
          click: () => mainWindow?.webContents.send('shosso:menu', 'save') },
        { type: 'separator' },
        { role: 'close' }
      ]
    },
    {
      label: 'Edicion',
      submenu: [
        { role: 'undo' }, { role: 'redo' }, { type: 'separator' },
        { role: 'cut' }, { role: 'copy' }, { role: 'paste' }, { role: 'selectAll' }
      ]
    },
    {
      label: 'Ver',
      submenu: [
        { label: 'Toggle terminal', accelerator: 'CmdOrCtrl+`',
          click: () => mainWindow?.webContents.send('shosso:menu', 'toggle-terminal') },
        { label: 'Toggle chat', accelerator: 'CmdOrCtrl+L',
          click: () => mainWindow?.webContents.send('shosso:menu', 'toggle-chat') },
        { type: 'separator' },
        { role: 'reload' }, { role: 'toggleDevTools' }
      ]
    },
    {
      label: 'Git',
      submenu: [
        { label: 'Estado', click: () => mainWindow?.webContents.send('shosso:menu', 'git-status') },
        { label: 'Commit…', accelerator: 'CmdOrCtrl+Shift+G',
          click: () => mainWindow?.webContents.send('shosso:menu', 'git-commit') }
      ]
    },
    {
      label: 'Ayuda',
      submenu: [
        { label: 'Documentacion Anthropic',
          click: () => shell.openExternal('https://docs.anthropic.com') },
        { label: 'Documentacion OpenAI',
          click: () => shell.openExternal('https://platform.openai.com/docs') }
      ]
    }
  ];
  Menu.setApplicationMenu(Menu.buildFromTemplate(template));
}

// === IPC: settings + secrets ===
ipcMain.handle('settings:get', () => loadSettings());
ipcMain.handle('settings:set', (_e, s) => { saveSettings(s); return true; });

ipcMain.handle('secrets:has', (_e, key) => {
  const s = loadSecrets(); return Boolean(s[key]);
});
ipcMain.handle('secrets:set', (_e, key, value) => {
  const s = loadSecrets(); s[key] = value; saveSecrets(s); return true;
});
ipcMain.handle('secrets:clear', (_e, key) => {
  const s = loadSecrets(); delete s[key]; saveSecrets(s); return true;
});
ipcMain.handle('secrets:available', () => safeStorage.isEncryptionAvailable());

// === IPC: filesystem ===
ipcMain.handle('fs:readDir', async (_e, dir) => {
  try {
    const entries = await fsp.readdir(dir, { withFileTypes: true });
    return entries
      .filter(e => !e.name.startsWith('.') || e.name === '.shosso')
      .map(e => ({
        name: e.name,
        path: path.join(dir, e.name),
        isDir: e.isDirectory()
      }))
      .sort((a, b) => (a.isDir === b.isDir) ? a.name.localeCompare(b.name) : (a.isDir ? -1 : 1));
  } catch (err) { return { error: err.message }; }
});

ipcMain.handle('fs:readFile', async (_e, file) => {
  try {
    const stat = await fsp.stat(file);
    if (stat.size > 5 * 1024 * 1024) return { error: 'Archivo > 5MB' };
    const content = await fsp.readFile(file, 'utf8');
    return { content, mtime: stat.mtimeMs };
  } catch (err) { return { error: err.message }; }
});

ipcMain.handle('fs:writeFile', async (_e, file, content) => {
  try {
    await fsp.mkdir(path.dirname(file), { recursive: true });
    await fsp.writeFile(file, content, 'utf8');
    const stat = await fsp.stat(file);
    return { ok: true, mtime: stat.mtimeMs };
  } catch (err) { return { error: err.message }; }
});

ipcMain.handle('fs:delete', async (_e, file) => {
  try { await fsp.rm(file, { recursive: true, force: true }); return { ok: true }; }
  catch (err) { return { error: err.message }; }
});

ipcMain.handle('fs:rename', async (_e, from, to) => {
  try { await fsp.rename(from, to); return { ok: true }; }
  catch (err) { return { error: err.message }; }
});

ipcMain.handle('fs:mkdir', async (_e, dir) => {
  try { await fsp.mkdir(dir, { recursive: true }); return { ok: true }; }
  catch (err) { return { error: err.message }; }
});

ipcMain.handle('fs:stat', async (_e, file) => {
  try {
    const s = await fsp.stat(file);
    return { isDir: s.isDirectory(), size: s.size, mtime: s.mtimeMs };
  } catch (err) { return { error: err.message }; }
});

// glob via shell-free walk (limited depth)
async function walkDir(root, max = 5000) {
  const results = [];
  const stack = [root];
  while (stack.length && results.length < max) {
    const dir = stack.pop();
    let entries;
    try { entries = await fsp.readdir(dir, { withFileTypes: true }); }
    catch { continue; }
    for (const e of entries) {
      if (e.name === 'node_modules' || e.name === '.git' || e.name.startsWith('.')) continue;
      const p = path.join(dir, e.name);
      if (e.isDirectory()) stack.push(p);
      else results.push(p);
    }
  }
  return results;
}
ipcMain.handle('fs:walk', async (_e, root) => {
  try { return await walkDir(root); } catch (err) { return { error: err.message }; }
});

ipcMain.handle('fs:grep', async (_e, root, pattern, opts = {}) => {
  try {
    const files = await walkDir(root);
    const re = new RegExp(pattern, opts.ignoreCase ? 'gi' : 'g');
    const hits = [];
    for (const f of files) {
      try {
        const stat = await fsp.stat(f);
        if (stat.size > 1024 * 1024) continue;
        const content = await fsp.readFile(f, 'utf8');
        const lines = content.split(/\r?\n/);
        for (let i = 0; i < lines.length; i++) {
          if (re.test(lines[i])) {
            hits.push({ file: f, line: i + 1, text: lines[i].slice(0, 300) });
            if (hits.length >= 500) return hits;
          }
          re.lastIndex = 0;
        }
      } catch {}
    }
    return hits;
  } catch (err) { return { error: err.message }; }
});

// === IPC: terminal (node-pty) ===
let ptyMod = null;
try { ptyMod = require('node-pty'); }
catch (e) { console.warn('node-pty no disponible:', e.message); }

ipcMain.handle('pty:spawn', (_e, opts = {}) => {
  if (!ptyMod) return { error: 'node-pty no instalado. Ejecuta: npm install y npm run rebuild' };
  const shell = opts.shell || (process.platform === 'win32'
    ? (process.env.COMSPEC || 'cmd.exe')
    : (process.env.SHELL || '/bin/bash'));
  const id = 'pty-' + Date.now() + '-' + Math.random().toString(36).slice(2, 7);
  try {
    const p = ptyMod.spawn(shell, opts.args || [], {
      name: 'xterm-256color',
      cols: opts.cols || 80,
      rows: opts.rows || 24,
      cwd: opts.cwd || os.homedir(),
      env: { ...process.env, TERM: 'xterm-256color' }
    });
    ptyStore.set(id, p);
    p.onData(data => mainWindow?.webContents.send('pty:data', id, data));
    p.onExit(({ exitCode, signal }) => {
      mainWindow?.webContents.send('pty:exit', id, exitCode, signal);
      ptyStore.delete(id);
    });
    return { id, shell };
  } catch (err) { return { error: err.message }; }
});

ipcMain.handle('pty:write', (_e, id, data) => {
  const p = ptyStore.get(id); if (!p) return false;
  p.write(data); return true;
});
ipcMain.handle('pty:resize', (_e, id, cols, rows) => {
  const p = ptyStore.get(id); if (!p) return false;
  try { p.resize(cols, rows); return true; } catch { return false; }
});
ipcMain.handle('pty:kill', (_e, id) => {
  const p = ptyStore.get(id); if (!p) return false;
  try { p.kill(); } catch {}
  ptyStore.delete(id); return true;
});

// Fallback: child_process exec if pty not available
ipcMain.handle('shell:exec', async (_e, command, cwd) => {
  return new Promise(resolve => {
    const isWin = process.platform === 'win32';
    const sh = isWin ? 'cmd.exe' : '/bin/bash';
    const args = isWin ? ['/c', command] : ['-lc', command];
    const child = spawn(sh, args, { cwd: cwd || os.homedir() });
    let stdout = ''; let stderr = '';
    let killed = false;
    const timer = setTimeout(() => { killed = true; child.kill('SIGKILL'); }, 120_000);
    child.stdout.on('data', d => { stdout += d.toString(); if (stdout.length > 200_000) child.kill(); });
    child.stderr.on('data', d => { stderr += d.toString(); });
    child.on('close', code => {
      clearTimeout(timer);
      resolve({ stdout, stderr, code, timedOut: killed });
    });
    child.on('error', err => {
      clearTimeout(timer);
      resolve({ error: err.message });
    });
  });
});

// === IPC: git (simple-git) ===
let SimpleGit = null;
try { SimpleGit = require('simple-git'); }
catch (e) { console.warn('simple-git no disponible:', e.message); }

function gitFor(root) {
  if (!SimpleGit) throw new Error('simple-git no instalado');
  return SimpleGit(root);
}

ipcMain.handle('git:status', async (_e, root) => {
  try {
    const g = gitFor(root);
    if (!(await g.checkIsRepo())) return { isRepo: false };
    const s = await g.status();
    const branch = (await g.branch()).current;
    return {
      isRepo: true, branch,
      ahead: s.ahead, behind: s.behind,
      staged: s.staged, modified: s.modified, not_added: s.not_added,
      deleted: s.deleted, conflicted: s.conflicted, files: s.files
    };
  } catch (err) { return { error: err.message }; }
});

ipcMain.handle('git:diff', async (_e, root, file, staged) => {
  try {
    const g = gitFor(root);
    const args = staged ? ['--cached'] : [];
    if (file) args.push('--', file);
    return { diff: await g.diff(args) };
  } catch (err) { return { error: err.message }; }
});

ipcMain.handle('git:stage', async (_e, root, files) => {
  try { await gitFor(root).add(files); return { ok: true }; }
  catch (err) { return { error: err.message }; }
});
ipcMain.handle('git:unstage', async (_e, root, files) => {
  try { await gitFor(root).reset(['HEAD', '--', ...files]); return { ok: true }; }
  catch (err) { return { error: err.message }; }
});
ipcMain.handle('git:commit', async (_e, root, message) => {
  try { const r = await gitFor(root).commit(message); return { ok: true, commit: r.commit }; }
  catch (err) { return { error: err.message }; }
});
ipcMain.handle('git:branches', async (_e, root) => {
  try { const b = await gitFor(root).branchLocal(); return { branches: b.all, current: b.current }; }
  catch (err) { return { error: err.message }; }
});
ipcMain.handle('git:log', async (_e, root, limit = 30) => {
  try { const l = await gitFor(root).log({ maxCount: limit }); return { commits: l.all }; }
  catch (err) { return { error: err.message }; }
});

// === IPC: LLM calls (Anthropic + OpenAI) ===
// Streaming with tool use. Renderer streams events; main process executes tools
// by calling back into renderer via IPC so the agent UI logs each step.

ipcMain.handle('llm:run', async (event, opts) => {
  const { provider, runId } = opts;
  const ctrl = new AbortController();
  agentRuns.set(runId, { abort: ctrl });
  try {
    if (provider === 'anthropic') return await runAnthropic(opts, event, ctrl.signal);
    if (provider === 'openai')    return await runOpenAI(opts, event, ctrl.signal);
    throw new Error('Provider desconocido: ' + provider);
  } catch (err) {
    return { error: err.message };
  } finally {
    agentRuns.delete(runId);
  }
});

ipcMain.handle('llm:abort', (_e, runId) => {
  const r = agentRuns.get(runId);
  if (r) { try { r.abort.abort(); } catch {} return true; }
  return false;
});

function sendEvt(sender, runId, evt) {
  try { sender.send('llm:event', runId, evt); } catch {}
}

async function runAnthropic(opts, event, signal) {
  const { Anthropic } = require('@anthropic-ai/sdk');
  const secrets = loadSecrets();
  const apiKey = secrets.anthropic || process.env.ANTHROPIC_API_KEY;
  if (!apiKey) throw new Error('Falta ANTHROPIC_API_KEY (Ajustes > API keys)');
  const client = new Anthropic({ apiKey });
  const { runId, model, system, messages, tools, maxTokens } = opts;

  const stream = await client.messages.stream({
    model: model || 'claude-sonnet-4-5',
    max_tokens: maxTokens || 4096,
    system: system || undefined,
    tools: tools && tools.length ? tools : undefined,
    messages
  }, { signal });

  let assistantBlocks = [];
  let usage = null;

  for await (const chunk of stream) {
    if (chunk.type === 'content_block_start') {
      const block = chunk.content_block;
      assistantBlocks[chunk.index] = block.type === 'text'
        ? { type: 'text', text: '' }
        : { type: 'tool_use', id: block.id, name: block.name, input: {} };
      sendEvt(event.sender, runId, { type: 'block_start', index: chunk.index, block });
    } else if (chunk.type === 'content_block_delta') {
      const d = chunk.delta;
      if (d.type === 'text_delta') {
        assistantBlocks[chunk.index].text += d.text;
        sendEvt(event.sender, runId, { type: 'text_delta', index: chunk.index, text: d.text });
      } else if (d.type === 'input_json_delta') {
        assistantBlocks[chunk.index]._partialJson = (assistantBlocks[chunk.index]._partialJson || '') + d.partial_json;
        sendEvt(event.sender, runId, { type: 'tool_input_delta', index: chunk.index, partial: d.partial_json });
      }
    } else if (chunk.type === 'message_delta') {
      if (chunk.usage) usage = chunk.usage;
    }
  }
  const final = await stream.finalMessage();
  for (const b of assistantBlocks) {
    if (b && b.type === 'tool_use' && b._partialJson) {
      try { b.input = JSON.parse(b._partialJson); } catch {}
      delete b._partialJson;
    }
  }
  // Prefer SDK's parsed content
  const content = final.content || assistantBlocks;
  return {
    provider: 'anthropic',
    stopReason: final.stop_reason,
    content,
    usage: final.usage || usage
  };
}

async function runOpenAI(opts, event, signal) {
  const { default: OpenAI } = require('openai');
  const secrets = loadSecrets();
  const apiKey = secrets.openai || process.env.OPENAI_API_KEY;
  if (!apiKey) throw new Error('Falta OPENAI_API_KEY (Ajustes > API keys)');
  const client = new OpenAI({ apiKey });
  const { runId, model, system, messages, tools, maxTokens } = opts;

  // Convert messages: system + user/assistant; tools in OpenAI format
  const msgs = [];
  if (system) msgs.push({ role: 'system', content: system });
  for (const m of messages) msgs.push(m);

  const stream = await client.chat.completions.create({
    model: model || 'gpt-4o',
    messages: msgs,
    tools: tools && tools.length ? tools : undefined,
    max_tokens: maxTokens || 4096,
    stream: true,
    stream_options: { include_usage: true }
  }, { signal });

  let textBuf = '';
  const toolAcc = {}; // index -> { id, name, args }
  let usage = null;
  let finishReason = null;
  for await (const part of stream) {
    if (part.usage) usage = part.usage;
    const choice = part.choices?.[0];
    if (!choice) continue;
    if (choice.finish_reason) finishReason = choice.finish_reason;
    const d = choice.delta;
    if (!d) continue;
    if (d.content) {
      textBuf += d.content;
      sendEvt(event.sender, runId, { type: 'text_delta', index: 0, text: d.content });
    }
    if (d.tool_calls) {
      for (const tc of d.tool_calls) {
        const idx = tc.index;
        if (!toolAcc[idx]) toolAcc[idx] = { id: tc.id || ('call_' + idx), name: '', args: '' };
        if (tc.id) toolAcc[idx].id = tc.id;
        if (tc.function?.name) toolAcc[idx].name = tc.function.name;
        if (tc.function?.arguments) toolAcc[idx].args += tc.function.arguments;
        sendEvt(event.sender, runId, {
          type: 'tool_input_delta', index: idx + 1,
          partial: tc.function?.arguments || ''
        });
      }
    }
  }
  // Assemble content blocks in Anthropic-style format for unified handling
  const content = [];
  if (textBuf) content.push({ type: 'text', text: textBuf });
  for (const idx of Object.keys(toolAcc)) {
    const t = toolAcc[idx];
    let input = {};
    try { input = JSON.parse(t.args || '{}'); } catch {}
    content.push({ type: 'tool_use', id: t.id, name: t.name, input });
  }
  return {
    provider: 'openai',
    stopReason: finishReason === 'tool_calls' ? 'tool_use' : (finishReason || 'end_turn'),
    content,
    usage
  };
}

// === IPC: misc ===
ipcMain.handle('app:cwd', () => process.cwd());
ipcMain.handle('app:homedir', () => os.homedir());
ipcMain.handle('app:platform', () => process.platform);
ipcMain.handle('app:openExternal', (_e, url) => shell.openExternal(url));
ipcMain.handle('app:showConfirm', async (_e, opts) => {
  const r = await dialog.showMessageBox(mainWindow, {
    type: opts.type || 'warning',
    buttons: opts.buttons || ['Cancelar', 'Continuar'],
    defaultId: opts.defaultId ?? 0, cancelId: 0,
    title: opts.title || 'Confirmar', message: opts.message || '', detail: opts.detail || ''
  });
  return r.response;
});
ipcMain.handle('app:pickFolder', async () => {
  const r = await dialog.showOpenDialog(mainWindow, { properties: ['openDirectory'] });
  return r.canceled ? null : r.filePaths[0];
});

app.whenReady().then(() => { buildMenu(); createWindow();
  app.on('activate', () => { if (BrowserWindow.getAllWindows().length === 0) createWindow(); });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});
