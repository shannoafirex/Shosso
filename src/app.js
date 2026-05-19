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
  // Proyectos debe inicializarse PRIMERO: setea current-project antes de
  // que las stores empiecen a leer/escribir
  if (window.Projects) Projects.init();
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
  Security.init();
  Planner.init();
  NewThread.init();
  KnowledgeWork.init();
  Workshop.init();
  Metrics.init();
  WorkspaceExport.init();
  WorkspaceImport.init();
  Archetypes.init();
  Shortcuts.init();
  CommandPalette.init();
  Health.init();
  I18N.init();
  Overview.init();
  Tutorial.init();
  ImportSkill.init();
  setupTerminal();

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
  setupGlobalEscape();
  // Restaurar historial; sólo saludamos si está vacío
  const restored = ChatPersistence.restore();
  if (!restored) greet();
}

// Escape cierra el modal visible más reciente (topmost en DOM order).
// Si el foco está en un INPUT o TEXTAREA dentro del modal, primer Escape
// blur el campo (preserva draft); segundo Escape cierra el modal.
function setupGlobalEscape() {
  document.addEventListener('keydown', (e) => {
    if (e.key !== 'Escape') return;
    if (window.CommandPalette?._modal) return; // palette tiene su propio handler
    const all = [...document.body.querySelectorAll('.z-50')];
    const visible = all.filter(m => !m.classList.contains('hidden') && m.offsetParent !== null);
    if (visible.length === 0) return;
    const top = visible[visible.length - 1];
    // Si el usuario está editando un text field dentro del modal,
    // primer Escape blur el campo en vez de cerrar el modal entero.
    const focused = document.activeElement;
    if (focused && top.contains(focused) &&
        (focused.tagName === 'TEXTAREA' || focused.tagName === 'INPUT')) {
      focused.blur();
      e.preventDefault();
      return;
    }
    e.preventDefault();
    e.stopPropagation();
    const closeBtn = top.querySelector('[data-close]')
      || top.querySelector('#sb-close, #pl-close, #tutorial-close');
    if (closeBtn) closeBtn.click();
  });
}

function loadFiles() {
  openFiles = SafeStorage.safeGet('shosso.files', structuredClone(window.SEED_FILES));
  persistFiles();
}

function persistFiles() {
  SafeStorage.safeSet('shosso.files', openFiles);
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

function setupTerminal() {
  const form = document.getElementById('terminal-form');
  const inp = document.getElementById('terminal-input');
  const out = document.getElementById('terminal-output');
  if (!form) return;
  const print = (html, cls = '') => {
    const div = document.createElement('div');
    div.className = cls;
    div.innerHTML = html;
    out.appendChild(div);
    out.parentElement.scrollTop = out.parentElement.scrollHeight;
  };
  const history = SafeStorage.safeGet('shosso.term.hist', []);
  let histIdx = history.length;
  inp.addEventListener('keydown', e => {
    if (e.key === 'ArrowUp') {
      if (histIdx > 0) { histIdx--; inp.value = history[histIdx] || ''; }
      e.preventDefault();
    } else if (e.key === 'ArrowDown') {
      if (histIdx < history.length - 1) { histIdx++; inp.value = history[histIdx] || ''; }
      else { histIdx = history.length; inp.value = ''; }
      e.preventDefault();
    }
  });
  form.addEventListener('submit', e => {
    e.preventDefault();
    const cmd = inp.value.trim();
    if (!cmd) return;
    print(`<span class="text-accent2">$</span> ${escapeHtml(cmd)}`);
    history.push(cmd);
    if (history.length > 100) history.shift();
    SafeStorage.safeSet('shosso.term.hist', history);
    histIdx = history.length;
    inp.value = '';
    const [bin, ...args] = cmd.split(/\s+/);
    if (bin === 'help') {
      print('comandos: opensource &lt;repo&gt;, ls [dir], clear, help', 'text-muted');
    } else if (bin === 'clear') {
      out.innerHTML = '';
    } else if (bin === 'ls') {
      const dir = args[0] || '.';
      const items = openFiles.filter(f => f.path.startsWith(dir) || dir === '.');
      print(items.slice(0, 20).map(f => f.path).join('<br>') || `(vacío)`);
    } else if (bin === 'opensource') {
      if (!args[0]) { print('uso: opensource &lt;repo&gt;', 'text-warn'); return; }
      const r = OpenSource.fetch(args[0]);
      print(r.msg, r.ok ? 'text-success' : 'text-warn');
    } else {
      print(`comando no reconocido: ${escapeHtml(bin)}`, 'text-warn');
    }
  });
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
    const name = prompt('Nombre del sub-agente (ej: marketing, ops, support):');
    if (!name) return;
    // Aviso si ya existe uno con ese nombre exacto (case-insensitive).
    const collision = AgentsStore.agents.find(
      a => a.name.toLowerCase() === name.toLowerCase()
    );
    if (collision) {
      const ok = confirm(
        `Ya existe un agente "${collision.name}" (${collision.type}).\n\n` +
        `Si creas otro, conviven como agentes separados con IDs distintos.\n\n` +
        `¿Continuar igual?`
      );
      if (!ok) return;
    }
    const role = prompt('¿Qué hace? (1 línea)') || '';
    // Sugerencia de skills por matching nombre → tag.
    // Marketing → tag growth; support → tag support; etc.
    const tagMap = {
      // EN
      marketing: 'growth', growth: 'growth', sales: 'growth',
      support: 'support', success: 'support',
      product: 'product', design: 'product',
      eng: 'engineering', engineering: 'engineering', dev: 'engineering',
      ops: 'engineering', devops: 'engineering',
      // ES
      ventas: 'growth', mercadeo: 'growth', crecimiento: 'growth',
      soporte: 'support', atencion: 'support', exito: 'support',
      producto: 'product', diseno: 'product', diseño: 'product',
      ingenieria: 'engineering', ingeniería: 'engineering',
      desarrollo: 'engineering', operaciones: 'engineering'
    };
    const lower = name.toLowerCase();
    const matchedTag = Object.keys(tagMap).find(k => lower.includes(k));
    let suggested = [];
    if (matchedTag) {
      const tag = tagMap[matchedTag];
      suggested = SkillsStore.skills
        .filter(s => (s.tags || []).includes(tag))
        .map(s => s.id);
    }
    if (suggested.length > 0) {
      const ok = confirm(
        `Detecté que "${name}" es de tipo ${matchedTag}.\n\n` +
        `¿Asignar automáticamente estas skills?\n` +
        suggested.map(s => '  · ' + s).join('\n') +
        `\n\nPodrás cambiarlas luego desde el editor (✎).`
      );
      if (!ok) suggested = [];
    }
    AgentsStore.add({
      id: 'sub-' + Date.now(),
      name, role, type: 'sub', skills: suggested,
      productivityScore: 0
    });
    Productivity.refresh();
  });

  document.getElementById('btn-demo').addEventListener('click', () => Demo.run());

  // Filtros (search across collections)
  const skillsFilter = document.getElementById('skills-filter');
  if (skillsFilter) skillsFilter.addEventListener('input', e => {
    SkillsStore.filter = e.target.value.trim();
    SkillsStore.render();
  });
  const memoryFilter = document.getElementById('memory-filter');
  if (memoryFilter) memoryFilter.addEventListener('input', e => {
    MemoryStore.filter = e.target.value.trim();
    MemoryStore.render();
  });
  const diagFilter = document.getElementById('diag-filter');
  if (diagFilter) diagFilter.addEventListener('change', e => {
    Diagnostics.filter = e.target.value;
    Diagnostics.render();
  });

  document.getElementById('btn-reset').addEventListener('click', async () => {
    const projects = window.Projects ? Projects.list() : [];
    const multi = projects.length > 1;
    const detail = multi
      ? `Nuke total: ${projects.length} proyectos, skills, archivos, memoria, agentes, diagnósticos, métricas, planes, archetypes custom, atajos. TODO. No reversible.`
      : 'Se perderán skills, archivos virtuales, memoria, agentes, diagnósticos, métricas, planes. No reversible.';
    let ok = false;
    if (window.shosso?.confirm) {
      const r = await window.shosso.confirm({
        type: 'warning',
        title: multi ? 'Reset completo (TODOS los proyectos)' : 'Reset completo',
        message: '¿Reiniciar el IDE completo?',
        detail,
        buttons: ['Cancelar', 'Resetear todo']
      });
      ok = r === 1;
    } else {
      ok = confirm(`¿Reiniciar el IDE completo?\n\n${detail}`);
    }
    if (!ok) return;
    localStorage.clear();
    sessionStorage.clear(); // flags como show-archetype-after-reload
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
  const examples = [
    { label: 'investiga este auspicio', tag: 'skill' },
    { label: 'genera reporte semanal', tag: 'skill' },
    { label: 'estructura este código', tag: 'skill' },
    { label: '/grebloop PR del checkout', tag: 'cmd' },
    { label: '/goal app desplegada con pagos', tag: 'cmd' },
    { label: 'am I cooked', tag: 'security' },
    { label: 'food at home', tag: 'easter' },
    { label: 'rundown de finanzas', tag: 'easter' }
  ];
  const chips = examples.map(e =>
    `<button class="example-chip" data-text="${escapeHtml(e.label)}" title="tipo: ${e.tag}">${escapeHtml(e.label)}</button>`
  ).join(' ');
  const el = MockAgent.log('system',
    `Bienvenido a Shosso. Tengo <b>${SkillsStore.skills.length}</b> skills visibles (sólo nombre+desc en mi contexto, <b>${SkillsStore.metadataTokens()}t</b> en total).<br>` +
    `Haz click en cualquiera para probar:<br><div class="mt-2 flex flex-wrap gap-1">${chips}</div>`);
  el.querySelectorAll('.example-chip').forEach(b => {
    b.addEventListener('click', () => MockAgent.send(b.dataset.text));
  });
}

// Re-render terminal cada vez que cambian las skills.
const _origRender = SkillsStore.render.bind(SkillsStore);
SkillsStore.render = function () { _origRender(); renderTerminalSkills(); };
