// Monaco bound to real files on disk. Dirty state, Cmd/Ctrl+S to save,
// reload on external write (from agent tools).
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
          const p = e.detail;
          const f = this.open.find(o => o.path === p || o.path.endsWith('/' + p));
          if (f && !f.dirty) this.reloadFromDisk(f.path);
          // Debounce: if the agent writes many files in quick succession,
          // only refresh the tree once at the end of the burst.
          clearTimeout(treeRefreshTimer);
          treeRefreshTimer = setTimeout(() => this._renderFileTree(), 300);
        });
        document.addEventListener('shosso:rootChanged', () => this._renderFileTree());
        document.getElementById('ft-refresh').onclick = () => this._renderFileTree();
        document.getElementById('ft-new-file').onclick = () => this._newFile();
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
      java: 'java', c: 'c', cpp: 'cpp', h: 'cpp',
      sql: 'sql'
    };
    return map[ext] || 'plaintext';
  },

  async openPath(filePath) {
    let entry = this.open.find(o => o.path === filePath);
    if (!entry) {
      const r = await window.shosso.fs.readFile(filePath);
      if (r.error) { alert('Error abriendo: ' + r.error); return; }
      const model = monaco.editor.createModel(r.content, this.detectLang(filePath),
        monaco.Uri.file(filePath));
      entry = { path: filePath, model, dirty: false, mtime: r.mtime };
      this.open.push(entry);
    }
    this.active = entry;
    this.monaco.setModel(entry.model);
    document.getElementById('status-file').textContent = filePath;
    this._renderTabs();
  },

  async reloadFromDisk(filePath) {
    const f = this.open.find(o => o.path === filePath);
    if (!f) return;
    const r = await window.shosso.fs.readFile(filePath);
    if (r.error) return;
    f.model.setValue(r.content);
    f.dirty = false;
    f.mtime = r.mtime;
    this._renderTabs();
  },

  async save() {
    if (!this.active) return;
    const f = this.active;
    const r = await window.shosso.fs.writeFile(f.path, f.model.getValue());
    if (r.error) { alert('Error guardando: ' + r.error); return; }
    f.dirty = false;
    f.mtime = r.mtime;
    this._renderTabs();
    document.dispatchEvent(new CustomEvent('shosso:fileSaved', { detail: f.path }));
  },

  close(filePath) {
    const idx = this.open.findIndex(o => o.path === filePath);
    if (idx < 0) return;
    const f = this.open[idx];
    if (f.dirty && !confirm('Descartar cambios en ' + filePath + '?')) return;
    f.model.dispose();
    this.open.splice(idx, 1);
    if (this.active === f) {
      this.active = this.open[idx] || this.open[idx - 1] || null;
      if (this.active) { this.monaco.setModel(this.active.model); document.getElementById('status-file').textContent = this.active.path; }
      else { this.monaco.setModel(monaco.editor.createModel('', 'plaintext')); document.getElementById('status-file').textContent = ''; }
    }
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

  async _renderFileTree() {
    const ul = document.getElementById('file-tree');
    const rootLabel = document.getElementById('file-tree-root');
    ul.innerHTML = '';
    if (!Projects.root) {
      rootLabel.textContent = 'sin carpeta';
      ul.innerHTML = '<li class="text-[10px] text-muted p-2">Cmd/Ctrl+O para abrir.</li>';
      return;
    }
    rootLabel.textContent = Projects.root.split(/[/\\]/).pop();
    await this._renderDir(ul, Projects.root, 0);
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
    const p = Projects.root + '/' + rel;
    const r = await window.shosso.fs.writeFile(p, '');
    if (r.error) return alert(r.error);
    await this._renderFileTree();
    this.openPath(p);
  }
};
