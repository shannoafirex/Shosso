// Persistent facts. Stored in localStorage scoped per project root.
// Agent recalls relevant facts via the `recall` tool (no auto-injection).
window.MemoryStore = {
  items: [],

  init() {
    document.addEventListener('shosso:rootChanged', () => this.reload());
    this.reload();
    const form = document.getElementById('memory-form');
    if (form) form.addEventListener('submit', e => {
      e.preventDefault();
      const inp = document.getElementById('memory-input');
      const v = inp.value.trim();
      if (!v) return;
      this.add(v);
      inp.value = '';
    });
  },

  _key() {
    return 'shosso.memory.' + (Projects.root || '__no_root__');
  },

  reload() {
    this.items = SafeStorage.safeGet(this._key(), []);
    this.render();
  },

  persist() { SafeStorage.safeSet(this._key(), this.items); },

  add(text) {
    this.items.unshift({ id: 'm' + Date.now(), text, created: Date.now(), recalls: 0 });
    this.persist();
    this.render();
  },

  remove(id) {
    this.items = this.items.filter(m => m.id !== id);
    this.persist();
    this.render();
  },

  recall(query) {
    const q = (query || '').toLowerCase();
    const words = q.split(/\W+/).filter(w => w.length > 2);
    const hits = this.items.filter(m => {
      const t = m.text.toLowerCase();
      return words.some(w => t.includes(w));
    });
    hits.forEach(h => h.recalls = (h.recalls || 0) + 1);
    if (hits.length) { this.persist(); this.render(); }
    return hits.map(h => ({ text: h.text, recalls: h.recalls }));
  },

  render() {
    const wrap = document.getElementById('memory-list');
    if (!wrap) return;
    if (this.items.length === 0) {
      wrap.innerHTML = '<li class="text-[10px] text-muted">— sin hechos —</li>';
      return;
    }
    wrap.innerHTML = this.items.map(m => `
      <li class="flex items-start justify-between gap-1 text-[10px]">
        <span class="flex-1">${escapeHtml(m.text)}</span>
        <button data-id="${m.id}" class="text-muted hover:text-danger">✕</button>
      </li>
    `).join('');
    wrap.querySelectorAll('button[data-id]').forEach(b => {
      b.onclick = () => this.remove(b.dataset.id);
    });
  }
};
