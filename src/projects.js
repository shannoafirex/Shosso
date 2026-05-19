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
      const name = prompt('Nombre del nuevo proyecto:');
      if (!name) return;
      const id = this._create(name);
      close();
      if (confirm(`Proyecto "${name}" creado. ¿Cambiar a él ahora?\n\n(página recargará con workspace vacío)`)) {
        this.switchTo(id);
      } else {
        this._renderPill();
      }
    };
    modal.querySelector('#proj-from-arch').onclick = () => {
      const name = prompt('Nombre del nuevo proyecto:');
      if (!name) return;
      const id = this._create(name);
      // Switch primero, después aplicar archetype
      this._switchInternal(id);
      location.reload();
      // Tras reload, mostraremos picker — usamos session storage para señalizar
      sessionStorage.setItem('shosso.show-archetype-after-reload', '1');
    };
  },

  _create(name) {
    const id = 'proj-' + Date.now().toString(36);
    this._ensure(id, name);
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
