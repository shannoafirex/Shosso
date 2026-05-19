// Workshop — vista side-by-side de sub-agentes en paralelo.
// Cuando /dispatch corre, en vez de interleaving en el chat, cada sub-agente
// tiene su propia columna con su skill, estado, tiempo y output.

window.Workshop = {
  columns: new Map(), // agentId -> column DOM element

  init() {
    document.getElementById('btn-clear-workshop').addEventListener('click', () => this.clear());
    this.render();
  },

  render() {
    const grid = document.getElementById('workshop-grid');
    if (!grid) return;
    const subs = AgentsStore.agents.filter(a => a.type === 'sub');
    // GC: limpia columnas de sub-agentes que ya no existen (evita leaks de
    // referencias en this.columns Map).
    const validIds = new Set(subs.map(a => a.id));
    for (const id of [...this.columns.keys()]) {
      if (!validIds.has(id)) this.columns.delete(id);
    }
    if (subs.length === 0) {
      grid.innerHTML = `<div class="text-xs text-muted col-span-full p-2">Sin sub-agentes. Crea al menos uno desde el tab <b>Agentes</b> para usar dispatch paralelo.</div>`;
      this.columns.clear();
      return;
    }
    grid.innerHTML = '';
    grid.className = this._gridClassFor(subs.length);
    this.columns.clear();
    for (const a of subs) {
      const col = document.createElement('div');
      col.className = 'workshop-col';
      col.innerHTML = `
        <div class="workshop-col-header">
          <span class="font-semibold text-xs">${escapeHtml(a.name)}</span>
          <span class="text-[10px] text-muted">${(a.skills || []).join(' · ') || 'sin skills'}</span>
        </div>
        <div class="workshop-col-body" data-empty="esperando…"></div>
      `;
      grid.appendChild(col);
      this.columns.set(a.id, col.querySelector('.workshop-col-body'));
    }
  },

  _gridClassFor(n) {
    if (n === 1) return 'workshop-grid grid-cols-1';
    if (n === 2) return 'workshop-grid grid-cols-2';
    if (n === 3) return 'workshop-grid grid-cols-3';
    if (n <= 4) return 'workshop-grid grid-cols-2 lg:grid-cols-4';
    // >4 sub-agentes: scroll horizontal en vez de columnas estrechísimas
    return 'workshop-grid workshop-scroll';
  },

  // Llamado por Dispatcher al iniciar el run de un sub-agente.
  startRun(agentId, task) {
    this._focusTab();
    let col = this.columns.get(agentId);
    if (!col) { this.render(); col = this.columns.get(agentId); }
    if (!col) return null;
    col.removeAttribute('data-empty');
    col.innerHTML = `
      <div class="workshop-task">${escapeHtml(task)}</div>
      <div class="workshop-status">⏳ working…</div>
    `;
    return col;
  },

  endRun(agentId, { ok, ms, output, skill }) {
    const col = this.columns.get(agentId);
    if (!col) return;
    const statusEl = col.querySelector('.workshop-status');
    if (!statusEl) return;
    if (ok) {
      statusEl.outerHTML = `
        <div class="workshop-status workshop-ok">
          ✓ ${(ms/1000).toFixed(1)}s${skill ? ` · <code class="text-accent2">${escapeHtml(skill)}</code>` : ''}
        </div>
        <div class="workshop-output">${output}</div>
      `;
    } else {
      statusEl.outerHTML = `
        <div class="workshop-status workshop-fail">
          ⚠ fallo tras ${(ms/1000).toFixed(1)}s — diagnóstico capturado
        </div>
      `;
    }
  },

  clear() {
    for (const col of this.columns.values()) {
      col.innerHTML = '';
      col.setAttribute('data-empty', 'esperando…');
    }
  },

  _focusTab() {
    // Auto-focus solo si el usuario NO está mirando chat activamente.
    // Si está en chat, mostramos toast discreto en vez de robarle el foco.
    const wsBtn = document.querySelector('.bottom-tab[data-tab="workshop"]');
    const chatActive = document.querySelector('.bottom-tab[data-tab="chat"]')?.classList.contains('bg-panel2');
    if (!wsBtn) return;
    if (wsBtn.classList.contains('bg-panel2')) return; // ya está activo
    if (chatActive) {
      // Notifica sin cambiar de tab
      this._notify('▶ dispatch en Workshop — click para ver');
      wsBtn.classList.add('workshop-pulse');
      wsBtn.addEventListener('click', () => wsBtn.classList.remove('workshop-pulse'), { once: true });
      return;
    }
    wsBtn.click();
  },

  _notify(text) {
    // Banner discreto sobre el chat, auto-desaparece
    if (this._toast) this._toast.remove();
    const t = document.createElement('div');
    t.className = 'workshop-toast';
    t.innerHTML = `${text} <button class="ml-2 underline">ir</button>`;
    t.querySelector('button').onclick = () => {
      document.querySelector('.bottom-tab[data-tab="workshop"]')?.click();
      t.remove();
    };
    document.body.appendChild(t);
    this._toast = t;
    setTimeout(() => t.remove(), 4500);
  }
};
