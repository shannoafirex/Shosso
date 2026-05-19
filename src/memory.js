// Capa de memoria persistente.
// "Open Claw tiene una capa de memoria y todo este tipo de cosas. Quieres
// que haga lo correcto. Y la única forma de que haga lo correcto es darle
// el contexto adecuado."
//
// Diseño: la memoria NO se inyecta entera en cada turno. El agente la
// recupera selectivamente (igual que con las skills).

window.MemoryStore = {
  items: [],

  init() {
    const saved = SafeStorage.safeGet('shosso.memory', null);
    this.items = Array.isArray(saved) ? saved : structuredClone(window.SEED_MEMORY);
    this.persist();
    document.getElementById('memory-form').addEventListener('submit', (e) => {
      e.preventDefault();
      const inp = document.getElementById('memory-input');
      const v = inp.value.trim();
      if (!v) return;
      this.add(v);
      inp.value = '';
    });
  },

  persist() { SafeStorage.safeSet('shosso.memory', this.items); },

  add(text) {
    this.items.unshift({
      id: 'm' + Date.now(),
      text,
      created: Date.now(),
      recalls: 0
    });
    this.persist();
    this.render();
    Context.log(`Memoria añadida: "${text.slice(0, 60)}${text.length > 60 ? '…' : ''}"`);
    if (window.Productivity) Productivity.refresh();
    // Status bar chip 🧠 (memorias) se actualiza en Context.refresh
    if (window.Context) Context.refresh();
  },

  remove(id) {
    this.items = this.items.filter(m => m.id !== id);
    this.persist();
    this.render();
    if (window.Productivity) Productivity.refresh();
    if (window.Context) Context.refresh();
  },

  // Recupera ítems de memoria relevantes a un texto, simulando un retrieval.
  // Aliases bidireccionales. Si una palabra de la query contiene alguno
  // de estos roots, expandimos a sus sinónimos antes de buscar en memoria.
  ALIASES: {
    'patrocin': ['sponsor', 'brand', 'auspici', 'colabora'],
    'sponsor':  ['patrocin', 'auspici', 'brand', 'colabora'],
    'auspici':  ['patrocin', 'sponsor', 'brand', 'colabora'],
    'brand':    ['patrocin', 'sponsor', 'colabora'],
    'colabora': ['patrocin', 'sponsor', 'brand'],
    'horario':  ['hora', 'tiempo', 'zona', 'timezone', 'huso'],
    'zona':     ['horaria', 'timezone', 'huso'],
    'timezone': ['zona', 'horaria', 'huso'],
    'reporte':  ['report', 'kpi', 'metric'],
    'report':   ['reporte', 'kpi', 'metric']
  },

  _normalize(s) {
    return (s || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
  },

  // Recall persistence se batchea: el counter se actualiza en memoria
  // siempre, pero el persist a localStorage se hace via debounce 2s.
  // Sin esto, cada mensaje del chat con recall escribe localStorage.
  _persistTimer: null,

  recall(query) {
    const q = this._normalize(query);
    const words = q.split(/[\s,.;:!?¡¿]+/).filter(w => w.length > 2);
    const expanded = new Set(words);
    for (const w of words) {
      for (const [root, aliases] of Object.entries(this.ALIASES)) {
        if (w.includes(root)) aliases.forEach(a => expanded.add(a));
      }
    }
    const hits = this.items.filter(m => {
      const t = this._normalize(m.text);
      for (const w of expanded) if (t.includes(w)) return true;
      return false;
    });
    hits.forEach(h => h.recalls++);
    if (hits.length) {
      // Debounce: si vienen muchos recalls en ráfaga, persistimos solo
      // tras 2s de pausa. La UI sí se actualiza inmediatamente.
      this.render();
      clearTimeout(this._persistTimer);
      this._persistTimer = setTimeout(() => this.persist(), 2000);
    }
    return hits;
  },

  filter: '',

  render() {
    const wrap = document.getElementById('memory-list');
    if (!wrap) return;
    let list = this.items;
    if (this.filter) {
      const q = this.filter.toLowerCase();
      list = list.filter(m => m.text.toLowerCase().includes(q));
    }
    if (list.length === 0) {
      wrap.innerHTML = this.filter
        ? `<div class="text-xs text-muted">Sin resultados para "${escapeHtml(this.filter)}".</div>`
        : '<div class="text-xs text-muted">Sin memoria. Anota un hecho que el agente deba recordar entre sesiones.</div>';
      return;
    }
    wrap.innerHTML = list.map(m => `
      <div class="bg-panel2 border border-border rounded p-2 text-xs flex justify-between items-start gap-2">
        <div>
          <div>${escapeHtml(m.text)}</div>
          <div class="text-[10px] text-muted mt-1">
            ${new Date(m.created).toLocaleDateString()} · ${estimateTokens(m.text)}t · recuperada ${m.recalls || 0} veces
          </div>
        </div>
        <button data-id="${m.id}" class="text-muted hover:text-danger">✕</button>
      </div>
    `).join('');
    wrap.querySelectorAll('button[data-id]').forEach(b => {
      b.onclick = () => this.remove(b.dataset.id);
    });
  }
};
