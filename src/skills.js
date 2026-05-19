// Skills = reusable prompt fragments, stored as `.shosso/skills/*.md`
// inside the user's project folder. When the user invokes a skill (or
// when its tags match the message), the body is injected into the next
// turn as a system note. No simulation: real files on disk.

window.SkillsStore = {
  skills: [], // { id, name, description, body, path }
  filter: '',

  async init() {
    document.addEventListener('shosso:rootChanged', () => this.reload());
    await this.reload();
  },

  async reload() {
    this.skills = [];
    if (!Projects.root) { this.render(); return; }
    const dir = Projects.root + '/.shosso/skills';
    const r = await window.shosso.fs.readDir(dir);
    if (!Array.isArray(r)) { this.render(); return; } // not created yet
    for (const e of r) {
      if (e.isDir || !e.name.endsWith('.md')) continue;
      const file = await window.shosso.fs.readFile(e.path);
      if (file.error) continue;
      this.skills.push(this._parse(e.path, file.content));
    }
    this.render();
  },

  _parse(filePath, content) {
    // Frontmatter: --- name / description --- body
    const m = content.match(/^---\s*\n([\s\S]*?)\n---\s*\n([\s\S]*)$/);
    let name = filePath.split(/[/\\]/).pop().replace(/\.md$/, '');
    let description = '';
    let body = content;
    if (m) {
      for (const line of m[1].split('\n')) {
        const [k, ...rest] = line.split(':');
        const v = rest.join(':').trim();
        if (k.trim().toLowerCase() === 'name') name = v;
        if (k.trim().toLowerCase() === 'description') description = v;
      }
      body = m[2];
    }
    return { id: filePath, name, description, body, path: filePath };
  },

  async add() {
    if (!Projects.root) return alert('Abre una carpeta primero.');
    const name = prompt('Nombre de la skill (slug, p.ej. "weekly-report"):');
    if (!name) return;
    const safe = name.replace(/[^a-zA-Z0-9_.-]/g, '-').toLowerCase();
    const description = prompt('Descripción corta (qué hace):') || '';
    const body = '# ' + name + '\n\nEscribe aquí los pasos / el prompt que reutilizas.\n';
    const path = Projects.root + '/.shosso/skills/' + safe + '.md';
    const content = `---\nname: ${name}\ndescription: ${description}\n---\n\n${body}`;
    await window.shosso.fs.writeFile(path, content);
    await this.reload();
    // Open it in the editor
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
  matchByMention(text) {
    const t = text.toLowerCase();
    return this.skills.filter(s => t.includes(s.name.toLowerCase()));
  }
};
