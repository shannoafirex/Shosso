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

  _normRoot(p) {
    if (!p) return '__no_root__';
    let s = String(p).replace(/\\/g, '/');
    if (s.length > 1 && /\/$/.test(s) && !/^[a-zA-Z]:\/$/.test(s)) {
      s = s.replace(/\/+$/, '');
    }
    return s;
  },

  _key() {
    return 'shosso.memory.' + this._normRoot(Projects.root);
  },

  reload() {
    // Migrate any legacy key written before path normalization (e.g.
    // "/foo/" with trailing slash) into the normalized bucket so the
    // user doesn't appear to lose facts after this update.
    const target = this._key();
    const stored = SafeStorage.safeGet(target, []);
    if (Projects.root) {
      const raw = String(Projects.root);
      const alt1 = 'shosso.memory.' + raw;
      const alt2 = 'shosso.memory.' + raw.replace(/\\/g, '/');
      for (const altKey of [alt1, alt2]) {
        if (altKey === target) continue;
        const legacy = SafeStorage.safeGet(altKey, null);
        if (Array.isArray(legacy) && legacy.length) {
          // Merge: prepend legacy items that aren't already present (by id).
          const knownIds = new Set(stored.map(m => m.id));
          for (const m of legacy) if (!knownIds.has(m.id)) stored.push(m);
          SafeStorage.safeSet(target, stored);
          try { localStorage.removeItem(altKey); } catch (_) {}
        }
      }
    }
    this.items = stored;
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
    const q = (query || '').toLowerCase().trim();
    if (!q) return [];
    // Keep 2-char+ words; "git", "ci", "v1" should still match.
    const words = q.split(/\W+/).filter(w => w.length >= 2);
    if (words.length === 0) return [];
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
