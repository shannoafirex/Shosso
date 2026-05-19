// Orquesta de agentes. Filosofía del podcast: empezar con UN agente.
// Sub-agentes sólo cuando aportan productividad real, no para verse cool.

window.AgentsStore = {
  agents: [],

  init() {
    const saved = localStorage.getItem('shosso.agents');
    this.agents = saved ? JSON.parse(saved) : structuredClone(window.SEED_AGENTS);
    this.persist();
  },

  persist() {
    localStorage.setItem('shosso.agents', JSON.stringify(this.agents));
  },

  add(agent) {
    this.agents.push(agent);
    this.persist();
    this.render();
    if (window.Productivity) Productivity.refresh();
    if (window.Workshop) Workshop.render();
  },

  remove(id) {
    if (id === 'main') return;
    this.agents = this.agents.filter(a => a.id !== id);
    this.persist();
    this.render();
    if (window.Productivity) Productivity.refresh();
    if (window.Workshop) Workshop.render();
  },

  render() {
    const ul = document.getElementById('agents-list');
    if (!ul) return;
    ul.innerHTML = '';
    const main = this.agents.find(a => a.type === 'main');
    const subs = this.agents.filter(a => a.type === 'sub');

    if (main) ul.appendChild(this._renderCard(main));
    subs.forEach(a => ul.appendChild(this._renderCard(a)));
  },

  _renderCard(a) {
    const li = document.createElement('li');
    li.className = `agent-card ${a.type}`;
    const skillsHtml = (a.skills || [])
      .map(sid => `<span>${escapeHtml(sid)}</span>`).join('');
    li.innerHTML = `
      <div class="flex justify-between items-start">
        <div class="flex-1 cursor-pointer" data-action="edit">
          <div class="name">${escapeHtml(a.name)}</div>
          <div class="role">${escapeHtml(a.role)}</div>
        </div>
        <div class="flex gap-1">
          ${a.type === 'sub' ? `<button class="text-[10px] text-muted hover:text-accent2" data-action="edit-btn" title="Editar">✎</button>` : ''}
          ${a.type === 'sub' ? `<button class="text-xs text-muted hover:text-danger" data-action="remove" title="Borrar">✕</button>` : ''}
        </div>
      </div>
      <div class="skills-attached">${skillsHtml || '<span class="text-muted">sin skills</span>'}</div>
    `;
    const openEditor = () => this.edit(a.id);
    li.querySelector('[data-action="edit"]').onclick = openEditor;
    const edBtn = li.querySelector('[data-action="edit-btn"]');
    if (edBtn) edBtn.onclick = openEditor;
    const rm = li.querySelector('[data-action="remove"]');
    if (rm) rm.onclick = () => {
      if (confirm(`¿Borrar sub-agente "${a.name}"?`)) this.remove(a.id);
    };
    return li;
  },

  edit(id) {
    const a = this.agents.find(x => x.id === id);
    if (!a) return;
    const skillIds = SkillsStore.skills.map(s => s.id);
    const checks = skillIds.map(sid => `
      <label class="flex items-center gap-2 text-xs py-1">
        <input type="checkbox" value="${escapeHtml(sid)}" ${(a.skills||[]).includes(sid)?'checked':''} />
        <code class="text-accent2">${escapeHtml(sid)}</code>
      </label>
    `).join('');
    const modal = document.createElement('div');
    modal.className = 'fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4';
    modal.innerHTML = `
      <div class="bg-panel border border-border rounded-lg w-full max-w-md">
        <div class="flex items-center justify-between border-b border-border px-4 py-3">
          <h3 class="font-semibold">Editar agente · ${escapeHtml(a.name)}</h3>
          <button data-close class="text-muted hover:text-white">✕</button>
        </div>
        <div class="p-4 space-y-3 text-sm">
          ${a.type === 'sub' ? `
          <label class="block">
            <span class="text-xs text-muted">Nombre</span>
            <input id="ed-name" value="${escapeHtml(a.name)}" class="w-full bg-panel2 border border-border rounded px-2 py-1 text-sm mt-1 outline-none focus:border-accent" />
          </label>` : `<div class="text-xs text-muted">Agente principal (no se puede renombrar).</div>`}
          <label class="block">
            <span class="text-xs text-muted">Rol</span>
            <input id="ed-role" value="${escapeHtml(a.role || '')}" class="w-full bg-panel2 border border-border rounded px-2 py-1 text-sm mt-1 outline-none focus:border-accent" />
          </label>
          <div>
            <div class="text-xs text-muted mb-1">Skills asignadas</div>
            <div id="ed-skills" class="max-h-40 overflow-y-auto bg-panel2 border border-border rounded p-2">
              ${checks || '<div class="text-xs text-muted">No hay skills aún. Crea una primero.</div>'}
            </div>
          </div>
        </div>
        <div class="border-t border-border p-3 flex justify-end gap-2">
          <button data-close class="px-3 py-1.5 text-xs rounded bg-panel2 hover:bg-border">Cancelar</button>
          <button data-save class="px-3 py-1.5 text-xs rounded bg-accent hover:bg-accent/80 text-white">Guardar</button>
        </div>
      </div>`;
    document.body.appendChild(modal);
    const close = () => modal.remove();
    modal.querySelectorAll('[data-close]').forEach(b => b.onclick = close);
    modal.onclick = e => { if (e.target === modal) close(); };
    modal.querySelector('[data-save]').onclick = () => {
      if (a.type === 'sub') {
        const newName = modal.querySelector('#ed-name').value.trim();
        if (newName) a.name = newName;
      }
      a.role = modal.querySelector('#ed-role').value.trim();
      a.skills = [...modal.querySelectorAll('#ed-skills input:checked')].map(i => i.value);
      this.persist();
      this.render();
      if (window.Productivity) Productivity.refresh();
      if (window.Workshop) Workshop.render();
      close();
    };
  }
};
