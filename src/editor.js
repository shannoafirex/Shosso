// Monaco bound to real files on disk. Dirty state, Cmd/Ctrl+S to save,
// reload on external write (from agent tools).

// On Windows the file tree returns backslash paths while the agent's
// fileWritten event emits forward-slash paths. Normalize for comparisons.
function normPath(p) { return (p || '').replace(/\\/g, '/'); }

window.Editor = {
  monaco: null,
  open: [], // [{ path, model, dirty, mtime }]
  active: null,

  async init() {
    return new Promise(resolve => {
      require.config({ paths: { vs: 'https://cdn.jsdelivr.net/npm/monaco-editor@0.45.0/min/vs' } });
      require(['vs/editor/editor.main'], () => {
        monaco.editor.defineTheme('shosso-dark', {
          base: 'vs-dark', inherit: true, rules: [],
          colors: {
            'editor.background': '#0b0e14',
            'editor.lineHighlightBackground': '#11151c',
            'editorGutter.background': '#0b0e14',
            'editorLineNumber.foreground': '#3a4252'
          }
        });
        this.monaco = monaco.editor.create(document.getElementById('editor'), {
          value: '// Abre una carpeta (Cmd/Ctrl+O) para empezar.',
          language: 'plaintext',
          theme: 'shosso-dark',
          fontSize: 13,
          minimap: { enabled: false },
          automaticLayout: true,
          scrollBeyondLastLine: false
        });
        this.monaco.onDidChangeModelContent(() => {
          if (!this.active) return;
          this.active.dirty = true;
          this._renderTabs();
        });
        this.monaco.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyS, () => this.save());

        let treeRefreshTimer = null;
        document.addEventListener('shosso:fileWritten', e => {
          const p = normPath(e.detail);
          const f = this.open.find(o => normPath(o.path) === p);
          if (f && !f.dirty) this.reloadFromDisk(f.path);
          clearTimeout(treeRefreshTimer);
          treeRefreshTimer = setTimeout(() => this._renderFileTree(), 300);
        });
        document.addEventListener('shosso:rootChanged', () => this._renderFileTree());
        document.getElementById('ft-refresh').onclick = () => this._renderFileTree();
        document.getElementById('ft-new-file').onclick = () => this._newFile();
        // External edits (vim, agent CLI, etc.) won't fire fileWritten.
        // On window focus, re-stat open files and prompt if disk drifted.
        window.addEventListener('focus', () => this._checkDiskDrift());
        resolve();
      });
    });
  },

  detectLang(p) {
    const ext = p.split('.').pop().toLowerCase();
    const map = {
      js: 'javascript', jsx: 'javascript', mjs: 'javascript', cjs: 'javascript',
      ts: 'typescript', tsx: 'typescript',
      json: 'json', md: 'markdown', html: 'html', css: 'css',
      py: 'python', rb: 'ruby', go: 'go', rs: 'rust',
      sh: 'shell', yml: 'yaml', yaml: 'yaml', xml: 'xml',
      java: 'java', c: 'c', cpp: 'cpp', cc: 'cpp', cxx: 'cpp', hpp: 'cpp', h: 'cpp',
      sql: 'sql',
      vue: 'html', svelte: 'html',
      toml: 'ini', ini: 'ini',
      lua: 'lua', swift: 'swift', kt: 'kotlin', php: 'php',
      scss: 'scss', less: 'less'
    };
    return map[ext] || 'plaintext';
  },

  _setStatusFile(p) {
    const el = document.getElementById('status-file');
    if (!el) return;
    if (!p) { el.textContent = ''; el.title = ''; return; }
    // Truncate long paths from the middle so both project context and
    // filename remain visible; keep full path in title for hover.
    const MAX = 64;
    if (p.length <= MAX) { el.textContent = p; el.title = p; return; }
    const head = p.slice(0, 20);
    const tail = p.slice(-(MAX - 20 - 1));
    el.textContent = head + '…' + tail;
    el.title = p;
  },

  async openPath(filePath) {
    filePath = normPath(filePath);
    let entry = this.open.find(o => normPath(o.path) === filePath);
    if (!entry) {
      const r = await window.shosso.fs.readFile(filePath);
      if (r.error) { alert('Error abriendo: ' + r.error); return; }
      // Reuse existing Monaco model if a previous load already created one
      // for this URI. Two rapid clicks would otherwise collide.
      const uri = monaco.Uri.file(filePath);
      let model = monaco.editor.getModel(uri);
      if (!model) model = monaco.editor.createModel(r.content, this.detectLang(filePath), uri);
      else if (model.getValue() !== r.content) model.setValue(r.content);
      const dup = this.open.find(o => normPath(o.path) === filePath);
      if (dup) { entry = dup; }
      else {
        entry = { path: filePath, model, dirty: false, mtime: r.mtime };
        this.open.push(entry);
      }
    }
    this.active = entry;
    this.monaco.setModel(entry.model);
    this._setStatusFile(filePath);
    this._renderTabs();
  },

  async _checkDiskDrift() {
    // Serialize: avoid stacking checks if focus fires rapidly.
    if (this._driftBusy) return;
    this._driftBusy = true;
    try {
      // Snapshot to avoid reacting to entries closed mid-iteration.
      const snapshot = this.open.slice();
      for (const f of snapshot) {
        if (!this.open.includes(f)) continue;
        const st = await window.shosso.fs.stat(f.path);
        if (!st || st.error || !st.mtime) continue;
        if (f.mtime && st.mtime === f.mtime) continue;
        if (!f.mtime) { f.mtime = st.mtime; continue; }
        if (f.dirty) {
          if (confirm('"' + f.path + '" cambió en disco y tienes cambios sin guardar. ¿Sobrescribir con la versión del disco?')) {
            await this.reloadFromDisk(f.path);
          } else {
            // Mark new baseline so we don't ask again until next change.
            f.mtime = st.mtime;
          }
        } else {
          await this.reloadFromDisk(f.path);
        }
      }
    } finally {
      this._driftBusy = false;
    }
  },

  async reloadFromDisk(filePath) {
    const np = normPath(filePath);
    const f = this.open.find(o => normPath(o.path) === np);
    if (!f) return;
    const r = await window.shosso.fs.readFile(f.path);
    if (r.error) return;
    f.model.setValue(r.content);
    f.dirty = false;
    f.mtime = r.mtime;
    this._renderTabs();
  },

  async save() {
    if (!this.active) {
      const status = document.getElementById('status-left');
      if (status) {
        status.textContent = '⚠ Sin fichero activo';
        setTimeout(() => Context && Context.refresh && Context.refresh(), 1500);
      }
      return;
    }
    const f = this.active;
    const r = await window.shosso.fs.writeFile(f.path, f.model.getValue());
    if (r.error) { alert('Error guardando: ' + r.error); return; }
    f.dirty = false;
    f.mtime = r.mtime;
    this._renderTabs();
    const status = document.getElementById('status-left');
    if (status) {
      status.textContent = '✓ guardado';
      setTimeout(() => Context && Context.refresh && Context.refresh(), 1500);
    }
    document.dispatchEvent(new CustomEvent('shosso:fileSaved', { detail: f.path }));
  },

  close(filePath) {
    const np = normPath(filePath);
    const idx = this.open.findIndex(o => normPath(o.path) === np);
    if (idx < 0) return;
    const f = this.open[idx];
    if (f.dirty && !confirm('Descartar cambios en ' + filePath + '?')) return;
    const wasActive = this.active === f;
    // Decide successor *before* mutating; splice first so we don't pick the
    // closed entry itself, then dispose only after Monaco has been swapped
    // off the disposed model — avoids "model is disposed" in pending events.
    this.open.splice(idx, 1);
    if (wasActive) {
      this.active = this.open[idx] || this.open[idx - 1] || null;
      if (this.active) {
        this.monaco.setModel(this.active.model);
        this._setStatusFile(this.active.path);
      } else {
        if (!this._emptyModel || this._emptyModel.isDisposed()) {
          this._emptyModel = monaco.editor.createModel('', 'plaintext');
        } else {
          this._emptyModel.setValue('');
        }
        this.monaco.setModel(this._emptyModel);
        this._setStatusFile('');
      }
    }
    try { f.model.dispose(); } catch (_) { /* model may already be gone */ }
    this._renderTabs();
  },

  _renderTabs() {
    const wrap = document.getElementById('tabs');
    wrap.innerHTML = '';
    for (const f of this.open) {
      const div = document.createElement('div');
      const isActive = f === this.active;
      div.className = 'flex items-center gap-1 px-2 py-1 text-xs border-r border-border cursor-pointer ' +
        (isActive ? 'bg-bg' : 'bg-panel hover:bg-panel2');
      const name = f.path.split(/[/\\]/).pop();
      div.innerHTML = `<span>${escapeHtml(name)}${f.dirty ? ' <span class="text-warn">●</span>' : ''}</span>
                       <button class="text-muted hover:text-danger ml-1">✕</button>`;
      div.onclick = () => this.openPath(f.path);
      div.querySelector('button').onclick = (e) => { e.stopPropagation(); this.close(f.path); };
      wrap.appendChild(div);
    }
  },

  _treeToken: 0,
  async _renderFileTree() {
    // Concurrent invocations from rootChanged + fileWritten + manual refresh
    // would otherwise interleave: each clears then appends, producing
    // duplicate entries. Use a token: only the latest call may write.
    const token = ++this._treeToken;
    const ul = document.getElementById('file-tree');
    const rootLabel = document.getElementById('file-tree-root');
    ul.innerHTML = '';
    if (!Projects.root) {
      rootLabel.textContent = 'sin carpeta';
      ul.innerHTML = '<li class="text-[10px] text-muted p-2">Cmd/Ctrl+O para abrir.</li>';
      return;
    }
    rootLabel.textContent = Projects.root.split(/[/\\]/).pop();
    const tempUl = document.createElement('ul');
    await this._renderDir(tempUl, Projects.root, 0);
    if (token !== this._treeToken) return; // a newer render superseded us
    ul.innerHTML = '';
    while (tempUl.firstChild) ul.appendChild(tempUl.firstChild);
  },

  async _renderDir(parentUl, dir, depth) {
    const entries = await window.shosso.fs.readDir(dir);
    if (!Array.isArray(entries)) return;
    for (const e of entries) {
      const li = document.createElement('li');
      li.className = 'text-[11px] cursor-pointer hover:bg-panel2 px-2 py-0.5 flex items-center gap-1';
      li.style.paddingLeft = (4 + depth * 12) + 'px';
      li.innerHTML = `<span>${e.isDir ? '▸' : '·'}</span><span class="truncate">${escapeHtml(e.name)}</span>`;
      parentUl.appendChild(li);
      if (e.isDir) {
        const childUl = document.createElement('ul');
        childUl.style.display = 'none';
        parentUl.appendChild(childUl);
        let loaded = false;
        li.onclick = async () => {
          if (!loaded) { await this._renderDir(childUl, e.path, depth + 1); loaded = true; }
          childUl.style.display = childUl.style.display === 'none' ? '' : 'none';
          li.querySelector('span').textContent = childUl.style.display === 'none' ? '▸' : '▾';
        };
      } else {
        li.onclick = () => this.openPath(e.path);
      }
    }
  },

  async _newFile() {
    if (!Projects.root) return alert('Abre una carpeta primero.');
    const rel = prompt('Ruta del nuevo fichero (relativa a la carpeta):', 'untitled.txt');
    if (!rel) return;
    // Sanitize: strip leading slash, reject path traversal and absolute paths.
    const clean = rel.replace(/\\/g, '/').replace(/^\/+/, '');
    if (clean.split('/').some(seg => seg === '..' || seg === '') ||
        /^[a-z]:/i.test(clean)) {
      return alert('Ruta inválida (no se permite "..", paths absolutos ni segmentos vacíos).');
    }
    const p = Projects.root + '/' + clean;
    const exists = await window.shosso.fs.stat(p);
    if (!exists.error) return alert('Ya existe un fichero en esa ruta.');
    const r = await window.shosso.fs.writeFile(p, '');
    if (r.error) return alert(r.error);
    await this._renderFileTree();
    this.openPath(p);
  }
};
