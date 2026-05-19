// Skills = reusable prompt fragments, stored as `.shosso/skills/*.md`
// inside the user's project folder. When the user invokes a skill (or
// when its tags match the message), the body is injected into the next
// turn as a system note. No simulation: real files on disk.

window.SkillsStore = {
  skills: [], // { id, name, description, body, path }
  filter: '',

  _reloadSeq: 0,

  async init() {
    document.addEventListener('shosso:rootChanged', () => this.reload());
    // Files created/edited externally (vim, agent tool) won't notify us.
    // Reload on window focus so the list stays in sync without polling.
    // Debounced so a rapid alt-tab burst doesn't trigger N readDirs.
    let focusTimer = null;
    window.addEventListener('focus', () => {
      clearTimeout(focusTimer);
      focusTimer = setTimeout(() => this.reload(), 150);
    });
    await this.reload();
  },

  async reload() {
    // Token guard: rapid rootChanged → reload calls would otherwise let
    // a slower readDir overwrite a newer one with stale results.
    const seq = ++this._reloadSeq;
    if (!Projects.root) { this.skills = []; this.render(); return; }
    const dir = Projects.root + '/.shosso/skills';
    const r = await window.shosso.fs.readDir(dir);
    if (seq !== this._reloadSeq) return;
    if (!Array.isArray(r)) { this.skills = []; this.render(); return; }
    const collected = [];
    for (const e of r) {
      if (e.isDir || !e.name.toLowerCase().endsWith('.md')) continue;
      const file = await window.shosso.fs.readFile(e.path);
      if (seq !== this._reloadSeq) return;
      if (file.error) continue;
      collected.push(this._parse(e.path, file.content));
    }
    if (seq !== this._reloadSeq) return;
    this.skills = collected;
    this.render();
  },

  _parse(filePath, content) {
    // Tolerate: UTF-8 BOM, CRLF endings, tabs around the key/value
    // separator, and frontmatter where the closing `---` is missing or
    // followed by EOF rather than a newline. Values may contain ":"
    // (e.g. "name: foo: bar") — we only split on the first colon.
    if (content.charCodeAt(0) === 0xFEFF) content = content.slice(1);
    // Normalize line endings for our regex; preserve in body via a
    // post-step so saved files don't get reformatted unintentionally.
    const norm = content.replace(/\r\n?/g, '\n');
    let name = filePath.split(/[/\\]/).pop().replace(/\.md$/i, '');
    let description = '';
    let body = content;
    // Closing fence may be followed by \n OR end-of-file.
    const m = norm.match(/^---[ \t]*\n([\s\S]*?)\n---[ \t]*(?:\n([\s\S]*)|$)/);
    if (m) {
      for (const rawLine of m[1].split('\n')) {
        // Skip blank and YAML comment lines.
        const line = rawLine.replace(/^﻿/, '');
        if (!line.trim() || /^\s*#/.test(line)) continue;
        const sep = line.indexOf(':');
        if (sep < 0) continue;
        const k = line.slice(0, sep).trim().toLowerCase();
        let v = line.slice(sep + 1).trim();
        // Strip wrapping quotes if user added them.
        if ((v.startsWith('"') && v.endsWith('"')) ||
            (v.startsWith("'") && v.endsWith("'"))) {
          v = v.slice(1, -1);
        }
        if (k === 'name' && v) name = v;
        else if (k === 'description') description = v;
      }
      body = m[2] != null ? m[2] : '';
    }
    return { id: filePath, name, description, body, path: filePath };
  },

  async add() {
    if (!Projects.root) return alert('Abre una carpeta primero.');
    const name = prompt('Nombre de la skill (slug, p.ej. "weekly-report"):');
    if (!name) return;
    const safe = name.replace(/[^a-zA-Z0-9_.-]/g, '-').toLowerCase();
    if (!safe) return alert('Nombre inválido (sólo letras, números, "._-").');
    const path = Projects.root + '/.shosso/skills/' + safe + '.md';
    const exists = await window.shosso.fs.stat(path);
    if (!exists.error) {
      if (!confirm(`Ya existe la skill "${safe}". ¿Abrirla en el editor?`)) return;
      if (window.Editor) Editor.openPath(path);
      return;
    }
    const description = prompt('Descripción corta (qué hace):') || '';
    const body = '# ' + name + '\n\nEscribe aquí los pasos / el prompt que reutilizas.\n';
    const content = `---\nname: ${name}\ndescription: ${description}\n---\n\n${body}`;
    const w = await window.shosso.fs.writeFile(path, content);
    if (w.error) return alert('Error creando skill: ' + w.error);
    await this.reload();
    if (window.Editor) Editor.openPath(path);
  },

  render() {
    const ul = document.getElementById('skills-list');
    if (!ul) return;
    let list = this.skills;
    if (this.filter) {
      const q = this.filter.toLowerCase();
      list = list.filter(s => s.name.toLowerCase().includes(q) || (s.description || '').toLowerCase().includes(q));
    }
    if (list.length === 0) {
      ul.innerHTML = `<li class="text-[11px] text-muted">${Projects.root ? 'Sin skills en <code>.shosso/skills/</code>. + para crear.' : 'Abre una carpeta para ver/crear skills.'}</li>`;
      return;
    }
    ul.innerHTML = list.map(s => `
      <li class="skill-item p-1.5 rounded hover:bg-panel2 border border-transparent hover:border-border">
        <div class="flex items-center justify-between gap-1">
          <span class="font-medium text-[11px]">${escapeHtml(s.name)}</span>
          <div class="flex gap-1">
            <button data-act="edit" data-path="${escapeHtml(s.path)}" class="text-[10px] text-muted hover:text-accent2" title="Editar">✎</button>
            <button data-act="invoke" data-path="${escapeHtml(s.path)}" class="text-[10px] text-accent2 hover:text-accent" title="Invocar">▶</button>
          </div>
        </div>
        <div class="text-[10px] text-muted leading-tight">${escapeHtml(s.description || '—')}</div>
      </li>
    `).join('');
    ul.querySelectorAll('button[data-act]').forEach(b => {
      const path = b.dataset.path;
      const skill = this.skills.find(s => s.path === path);
      b.onclick = () => {
        if (b.dataset.act === 'edit') Editor.openPath(path);
        if (b.dataset.act === 'invoke') Agent.invokeSkill(skill);
      };
    });
  },

  // Used by Agent: scan the user's message for skill name mentions and
  // return any that match. Body gets injected into the system prompt.
  // Word-boundary match to avoid "log" matching "logger" or "dialog".
  matchByMention(text) {
    const t = text.toLowerCase();
    return this.skills.filter(s => {
      const name = s.name.toLowerCase();
      const escaped = name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      return new RegExp('(^|[^a-z0-9_])' + escaped + '($|[^a-z0-9_])', 'i').test(t);
    });
  }
};
