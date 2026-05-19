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
    const saved = localStorage.getItem('shosso.memory');
    this.items = saved ? JSON.parse(saved) : structuredClone(window.SEED_MEMORY);
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

  persist() { localStorage.setItem('shosso.memory', JSON.stringify(this.items)); },

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
  },

  remove(id) {
    this.items = this.items.filter(m => m.id !== id);
    this.persist();
    this.render();
  },

  // Recupera ítems de memoria relevantes a un texto, simulando un retrieval.
  recall(query) {
    const q = query.toLowerCase();
    const hits = this.items.filter(m => {
      const t = m.text.toLowerCase();
      return q.split(/\s+/).some(w => w.length > 3 && t.includes(w));
    });
    hits.forEach(h => h.recalls++);
    if (hits.length) {
      this.persist();
      this.render();
    }
    return hits;
  },

  render() {
    const wrap = document.getElementById('memory-list');
    if (!wrap) return;
    if (this.items.length === 0) {
      wrap.innerHTML = '<div class="text-xs text-muted">Sin memoria. Anota un hecho que el agente deba recordar entre sesiones.</div>';
      return;
    }
    wrap.innerHTML = this.items.map(m => `
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
