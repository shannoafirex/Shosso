// Bootstrap del IDE.

let monacoEditor = null;
let openFiles = [];
let activeFile = null;

require.config({ paths: { vs: 'https://cdn.jsdelivr.net/npm/monaco-editor@0.45.0/min/vs' } });
require(['vs/editor/editor.main'], function () {
  monaco.editor.defineTheme('shosso-dark', {
    base: 'vs-dark', inherit: true, rules: [],
    colors: {
      'editor.background': '#0b0e14',
      'editor.lineHighlightBackground': '#11151c',
      'editorGutter.background': '#0b0e14',
      'editorLineNumber.foreground': '#3a4252'
    }
  });
  monacoEditor = monaco.editor.create(document.getElementById('editor'), {
    value: '// Abre un archivo para empezar.',
    language: 'javascript',
    theme: 'shosso-dark',
    fontSize: 13,
    minimap: { enabled: false },
    automaticLayout: true,
    scrollBeyondLastLine: false,
  });
  monacoEditor.onDidChangeModelContent(() => {
    if (activeFile) activeFile.content = monacoEditor.getValue();
    persistFiles();
  });
  init();
});

function init() {
  loadFiles();
  SkillsStore.init();
  AgentsStore.init();
  Context.init();
  MemoryStore.init();
  Tokenizer.init();
  SystemPromptView.init();
  TemplatesStore.init();
  Compaction.init();
  Diagnostics.init();
  Predictor.init();
  AntiPatterns.init();
  Harnesses.init();
  Philosophy.init();
  Tutorial.init();
  ImportSkill.init();

  renderFileTree();
  SkillsStore.render();
  AgentsStore.render();
  MemoryStore.render();
  Context.refresh();
  Context.renderLogs();
  Productivity.refresh();
  renderTerminalSkills();

  const readme = openFiles.find(f => f.path === 'README.md');
  if (readme) openFile(readme);

  setupTabs();
  setupListeners();
  setupElectronBridge();
  greet();
}

function loadFiles() {
  const saved = localStorage.getItem('shosso.files');
  openFiles = saved ? JSON.parse(saved) : structuredClone(window.SEED_FILES);
  persistFiles();
}

function persistFiles() {
  localStorage.setItem('shosso.files', JSON.stringify(openFiles));
}

function renderFileTree() {
  const ul = document.getElementById('file-tree');
  ul.innerHTML = '';
  for (const f of openFiles) {
    const li = document.createElement('li');
    if (activeFile && activeFile.path === f.path) li.classList.add('active');
    li.innerHTML = `<span class="icon">${iconFor(f.path)}</span><span class="truncate">${escapeHtml(f.path)}</span>`;
    li.onclick = () => openFile(f);
    ul.appendChild(li);
  }
}

function iconFor(path) {
  if (path.endsWith('.md')) return '📄';
  if (path.endsWith('.js') || path.endsWith('.ts')) return '⚡';
  if (path.endsWith('.json')) return '📋';
  if (path.endsWith('.css')) return '🎨';
  if (path.endsWith('.html')) return '🌐';
  return '·';
}

function openFile(f) {
  activeFile = f;
  if (monacoEditor) {
    const lang = f.language || detectLang(f.path);
    monaco.editor.setModelLanguage(monacoEditor.getModel(), lang);
    monacoEditor.setValue(f.content || '');
  }
  renderTabs();
  renderFileTree();
}

function detectLang(path) {
  if (path.endsWith('.md')) return 'markdown';
  if (path.endsWith('.json')) return 'json';
  if (path.endsWith('.ts') || path.endsWith('.tsx')) return 'typescript';
  if (path.endsWith('.js') || path.endsWith('.jsx')) return 'javascript';
  if (path.endsWith('.html')) return 'html';
  if (path.endsWith('.css')) return 'css';
  return 'plaintext';
}

function renderTabs() {
  const wrap = document.getElementById('tabs');
  wrap.innerHTML = '';
  if (!activeFile) return;
  const tab = document.createElement('div');
  tab.className = 'tab active';
  tab.innerHTML = `<span>${iconFor(activeFile.path)} ${escapeHtml(activeFile.path)}</span>`;
  wrap.appendChild(tab);
}

function renderTerminalSkills() {
  const wrap = document.getElementById('terminal-skills');
  if (!wrap) return;
  wrap.innerHTML = SkillsStore.skills.map(s =>
    `<div>${s.name}.skill.md  <span class="text-muted">· ${estimateTokens(s.body)}t (body)</span></div>`
  ).join('');
}

function setupTabs() {
  document.querySelectorAll('.side-tab').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.side-tab').forEach(b => b.classList.remove('bg-panel2', 'active'));
      btn.classList.add('bg-panel2', 'active');
      const t = btn.dataset.tab;
      document.querySelectorAll('.side-panel').forEach(p => {
        p.classList.toggle('hidden', p.dataset.panel !== t);
      });
    });
  });

  document.querySelectorAll('.bottom-tab').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.bottom-tab').forEach(b => b.classList.remove('bg-panel2', 'active'));
      btn.classList.add('bg-panel2', 'active');
      const t = btn.dataset.tab;
      document.querySelectorAll('.bottom-panel').forEach(p => {
        p.classList.toggle('hidden', p.dataset.panel !== t);
      });
    });
  });
  document.querySelector('.bottom-tab[data-tab="chat"]').classList.add('bg-panel2');
}

function setupListeners() {
  document.getElementById('chat-form').addEventListener('submit', (e) => {
    e.preventDefault();
    const input = document.getElementById('chat-input');
    const v = input.value;
    input.value = '';
    MockAgent.send(v);
  });

  document.getElementById('btn-new-skill').addEventListener('click', () => SkillBuilder.open());
  document.getElementById('sb-close').addEventListener('click', () => SkillBuilder.close());
  document.getElementById('sb-next').addEventListener('click', () => SkillBuilder.next());
  document.getElementById('sb-back').addEventListener('click', () => SkillBuilder.back());

  document.getElementById('btn-new-file').addEventListener('click', async () => {
    const path = prompt('Ruta del archivo:', 'src/nuevo.js');
    if (!path) return;
    const f = { path, language: detectLang(path), content: '' };
    openFiles.push(f);
    persistFiles();
    renderFileTree();
    openFile(f);
  });

  document.getElementById('btn-open-folder').addEventListener('click', async () => {
    if (!window.shosso) {
      alert('Abrir carpetas reales sólo está disponible en la versión Electron (npm start). En el navegador, edita los archivos virtuales en la lista.');
      return;
    }
    // Electron lo dispara desde el menú; el botón abre el menú nativo.
    alert('Usa el menú Archivo → Abrir carpeta… o Cmd/Ctrl+O.');
  });

  document.getElementById('btn-new-agent').addEventListener('click', () => {
    const name = prompt('Nombre del sub-agente (ej: research, ops):');
    if (!name) return;
    const role = prompt('¿Qué hace? (1 línea)') || '';
    AgentsStore.add({
      id: 'sub-' + Date.now(),
      name, role, type: 'sub', skills: [],
      productivityScore: 0
    });
    Productivity.refresh();
  });

  document.getElementById('btn-reset').addEventListener('click', async () => {
    let ok = false;
    if (window.shosso?.confirm) {
      const r = await window.shosso.confirm({
        type: 'warning',
        title: 'Reset completo',
        message: '¿Reiniciar el IDE completo?',
        detail: 'Se perderán tus skills, archivos virtuales, memoria, agentes y diagnósticos.',
        buttons: ['Cancelar', 'Resetear']
      });
      ok = r === 1;
    } else {
      ok = confirm('¿Reiniciar el IDE completo? Se perderán skills, archivos, memoria y agentes.');
    }
    if (!ok) return;
    localStorage.clear();
    location.reload();
  });
}

function setupElectronBridge() {
  if (!window.shosso) return;

  window.shosso.onOpenFolder(async (dir) => {
    Context.log(`Abriendo carpeta: ${dir}`);
    const entries = await window.shosso.readDir(dir);
    if (entries.error) { alert('Error: ' + entries.error); return; }
    // Carga hasta 30 archivos para no inundar el editor.
    for (const e of entries.slice(0, 30)) {
      if (e.isDir) continue;
      const r = await window.shosso.readFile(e.path);
      if (r.content !== undefined && !openFiles.find(f => f.path === e.name)) {
        openFiles.push({ path: e.name, language: detectLang(e.name), content: r.content });
      }
    }
    persistFiles();
    renderFileTree();
  });

  window.shosso.onMenu((action) => {
    if (action === 'new-skill') SkillBuilder.open();
    if (action === 'import-skill') ImportSkill.open();
  });

  window.shosso.onFocusPanel((panel) => {
    const btn = document.querySelector(`.side-tab[data-tab="${panel}"]`);
    if (btn) btn.click();
  });
}

function greet() {
  MockAgent.log('system',
    `Bienvenido a Shosso. Tengo <b>${SkillsStore.skills.length}</b> skills visibles (sólo nombre+desc en mi contexto, <b>${SkillsStore.metadataTokens()}t</b> en total).<br>` +
    `Pruébame con: <i>"investiga este patrocinador"</i>, <i>"genera reporte semanal"</i>, <i>"estructura este código"</i>, <i>"rundown de finanzas"</i> (easter egg).`);
}

// Re-render terminal cada vez que cambian las skills.
const _origRender = SkillsStore.render.bind(SkillsStore);
SkillsStore.render = function () { _origRender(); renderTerminalSkills(); };
