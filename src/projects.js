// Multi-project. Cada proyecto vive en su propio namespace de localStorage,
// pero las claves "activas" (que las stores leen) siguen sin prefijo. Al
// hacer switch, snapshot del current → prefijado, load del target → activo,
// reload de la página para re-inicializar todas las stores limpiamente.
//
// Globales (no scoped): tutorial-seen, lang, archetype-seen,
// custom-archetypes, projects, current-project.

window.Projects = {
  CURRENT_KEY: 'shosso.current-project',
  LIST_KEY: 'shosso.projects',
  PROJECT_SCOPED_KEYS: [
    'shosso.skills',
    'shosso.agents',
    'shosso.memory',
    'shosso.failures',
    'shosso.chat.history',
    'shosso.plans',
    'shosso.metrics',
    'shosso.security',
    'shosso.compactions',
    'shosso.term.hist',
    'shosso.agentmd',
    'shosso.files'
  ],

  init() {
    // Si no hay proyecto actual, declarar 'default' y migrar
    if (!localStorage.getItem(this.CURRENT_KEY)) {
      localStorage.setItem(this.CURRENT_KEY, 'default');
      this._ensure('default', 'Workspace principal');
    }
    this._renderPill();
  },

  getCurrent() {
    return localStorage.getItem(this.CURRENT_KEY) || 'default';
  },

  list() {
    return SafeStorage.safeGet(this.LIST_KEY, []);
  },

  _ensure(id, name) {
    const projects = this.list();
    if (!projects.find(p => p.id === id)) {
      projects.push({ id, name, createdAt: Date.now() });
      SafeStorage.safeSet(this.LIST_KEY, projects);
    }
  },

  _renderPill() {
    const pill = document.getElementById('project-pill');
    if (!pill) return;
    const current = this.getCurrent();
    const project = this.list().find(p => p.id === current);
    const name = project ? project.name : current;
    pill.innerHTML = `<span class="text-muted">📁</span> ${escapeHtml(name)} <span class="text-muted">▾</span>`;
    pill.onclick = () => this.openMenu();
  },

  openMenu() {
    const projects = this.list();
    const current = this.getCurrent();
    const modal = document.createElement('div');
    modal.className = 'fixed inset-0 bg-black/60 z-50 flex items-start justify-end p-4';
    modal.innerHTML = `
      <div class="bg-panel border border-border rounded-lg w-full max-w-sm mt-12 mr-4">
        <div class="flex items-center justify-between border-b border-border px-3 py-2">
          <h3 class="font-semibold text-sm">Proyectos</h3>
          <button data-close class="text-muted hover:text-white">✕</button>
        </div>
        <div class="p-2 max-h-72 overflow-y-auto">
          ${projects.map(p => `
            <button data-id="${escapeHtml(p.id)}" class="proj-item w-full text-left px-2 py-1.5 rounded text-xs hover:bg-panel2 flex justify-between items-center ${p.id === current ? 'bg-panel2' : ''}">
              <span>${escapeHtml(p.name)}${p.id === current ? ' <span class="text-success">●</span>' : ''}</span>
              ${p.id !== current && p.id !== 'default' ? `<span class="proj-delete text-muted hover:text-danger" data-del="${escapeHtml(p.id)}" title="Borrar">✕</span>` : ''}
            </button>
          `).join('')}
        </div>
        <div class="border-t border-border p-2 flex gap-1">
          <button id="proj-new" class="flex-1 text-xs px-2 py-1.5 rounded bg-accent/20 text-accent hover:bg-accent/30">+ Nuevo</button>
          <button id="proj-from-arch" class="flex-1 text-xs px-2 py-1.5 rounded bg-accent2/20 text-accent2 hover:bg-accent2/30">+ Desde archetype</button>
        </div>
      </div>`;
    document.body.appendChild(modal);
    const close = () => modal.remove();
    modal.querySelector('[data-close]').onclick = close;
    modal.onclick = e => { if (e.target === modal) close(); };
    // Click en proyecto = switch
    modal.querySelectorAll('.proj-item').forEach(btn => {
      btn.onclick = (ev) => {
        if (ev.target.classList.contains('proj-delete')) {
          ev.stopPropagation();
          const id = ev.target.dataset.del;
          this._delete(id);
          close();
          this.openMenu();
          return;
        }
        const id = btn.dataset.id;
        if (id !== current) {
          if (confirm(`Cambiar al proyecto "${this.list().find(p => p.id === id)?.name}"?\n\nLa página se recargará para reinicializar todos los stores.`)) {
            this.switchTo(id);
          }
        }
      };
    });
    modal.querySelector('#proj-new').onclick = () => {
      close();
      this._createWithTemplate();
    };
    modal.querySelector('#proj-from-arch').onclick = () => {
      const name = prompt('Nombre del nuevo proyecto:');
      if (!name) return;
      const id = this._create(name, 'blank');
      this._switchInternal(id);
      sessionStorage.setItem('shosso.show-archetype-after-reload', '1');
      location.reload();
    };
  },

  // UI para crear proyecto con opciones de template.
  _createWithTemplate() {
    const modal = document.createElement('div');
    modal.className = 'fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4';
    modal.innerHTML = `
      <div class="bg-panel border border-border rounded-lg w-full max-w-md">
        <div class="flex items-center justify-between border-b border-border px-4 py-3">
          <h3 class="font-semibold text-sm">Nuevo proyecto</h3>
          <button data-close class="text-muted hover:text-white">✕</button>
        </div>
        <div class="p-4 space-y-3">
          <label class="block">
            <span class="text-xs text-muted">Nombre</span>
            <input id="np-name" placeholder="ej: SponsorSync v2"
              class="w-full bg-panel2 border border-border rounded px-2 py-1.5 text-sm mt-1 outline-none focus:border-accent" autofocus />
          </label>
          <div>
            <span class="text-xs text-muted">Empezar con:</span>
            <div class="grid grid-cols-1 gap-2 mt-1">
              <label class="flex items-start gap-2 p-2 border border-border rounded hover:bg-panel2 cursor-pointer">
                <input type="radio" name="np-template" value="default" checked class="mt-0.5 accent-accent" />
                <div>
                  <div class="text-sm font-medium">Seed por defecto</div>
                  <div class="text-[11px] text-muted">16 skills · 2 sub-agentes · 2 memorias (lo que viene en el seed)</div>
                </div>
              </label>
              <label class="flex items-start gap-2 p-2 border border-border rounded hover:bg-panel2 cursor-pointer">
                <input type="radio" name="np-template" value="blank" class="mt-0.5 accent-accent" />
                <div>
                  <div class="text-sm font-medium">Vacío</div>
                  <div class="text-[11px] text-muted">Sólo el agente principal. Tú construyes todo desde cero.</div>
                </div>
              </label>
            </div>
          </div>
        </div>
        <div class="border-t border-border p-3 flex justify-end gap-2">
          <button data-close class="px-3 py-1.5 text-xs rounded bg-panel2 hover:bg-border">Cancelar</button>
          <button id="np-create" class="px-3 py-1.5 text-xs rounded bg-accent hover:bg-accent/80 text-white">Crear y cambiar</button>
        </div>
      </div>`;
    document.body.appendChild(modal);
    const close = () => modal.remove();
    modal.querySelectorAll('[data-close]').forEach(b => b.onclick = close);
    modal.onclick = e => { if (e.target === modal) close(); };
    modal.querySelector('#np-create').onclick = () => {
      const name = modal.querySelector('#np-name').value.trim();
      if (!name) { alert('Nombre requerido.'); return; }
      const template = modal.querySelector('input[name="np-template"]:checked').value;
      const id = this._create(name, template);
      close();
      this._switchInternal(id);
      location.reload();
    };
  },

  _create(name, template = 'default') {
    const id = 'proj-' + Date.now().toString(36);
    this._ensure(id, name);
    // Si template = 'blank', pre-poblamos las claves scoped con estados
    // mínimos antes de que el switch lo active. Si 'default', no hacemos
    // nada y las stores usarán sus seeds en init().
    if (template === 'blank') {
      const blankAgents = [{
        id: 'main', name: 'main', role: 'Orquesta general. Empieza siempre por aquí.',
        type: 'main', skills: [], productivityScore: 0.5
      }];
      localStorage.setItem(`shosso.proj.${id}.shosso.skills`, '[]');
      localStorage.setItem(`shosso.proj.${id}.shosso.agents`, JSON.stringify(blankAgents));
      localStorage.setItem(`shosso.proj.${id}.shosso.memory`, '[]');
      localStorage.setItem(`shosso.proj.${id}.shosso.failures`, '[]');
      localStorage.setItem(`shosso.proj.${id}.shosso.plans`, '[]');
      localStorage.setItem(`shosso.proj.${id}.shosso.chat.history`, '[]');
      localStorage.setItem(`shosso.proj.${id}.shosso.metrics`, '{}');
    }
    return id;
  },

  _delete(id) {
    if (id === this.getCurrent()) {
      alert('No puedes borrar el proyecto activo. Cambia primero.');
      return;
    }
    if (id === 'default') {
      alert('El proyecto default no se puede borrar.');
      return;
    }
    if (!confirm(`¿Borrar el proyecto y todos sus datos? Esto es irreversible.`)) return;
    const projects = this.list().filter(p => p.id !== id);
    SafeStorage.safeSet(this.LIST_KEY, projects);
    for (const key of this.PROJECT_SCOPED_KEYS) {
      localStorage.removeItem(`shosso.proj.${id}.${key}`);
    }
  },

  switchTo(id) {
    this._switchInternal(id);
    location.reload();
  },

  // Snapshot + swap sin reload (uso interno antes de un location.reload).
  _switchInternal(id) {
    const current = this.getCurrent();
    if (current === id) return;
    // Snapshot del proyecto actual
    for (const key of this.PROJECT_SCOPED_KEYS) {
      const val = localStorage.getItem(key);
      if (val != null) {
        try { localStorage.setItem(`shosso.proj.${current}.${key}`, val); } catch {}
      }
    }
    // Load del target (puede no existir aún si es nuevo)
    for (const key of this.PROJECT_SCOPED_KEYS) {
      const val = localStorage.getItem(`shosso.proj.${id}.${key}`);
      if (val != null) localStorage.setItem(key, val);
      else localStorage.removeItem(key); // clean state
    }
    localStorage.setItem(this.CURRENT_KEY, id);
    // Actualizar last-active
    const projects = this.list();
    const p = projects.find(x => x.id === id);
    if (p) {
      p.lastActive = Date.now();
      SafeStorage.safeSet(this.LIST_KEY, projects);
    }
  }
};
