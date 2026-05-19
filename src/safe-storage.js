// Helpers de almacenamiento robusto. localStorage falla en 2 escenarios
// que se ignoraban hasta ahora:
//   1. JSON corrupto (parse throw)
//   2. Quota exceeded en write (sesiones largas + muchas features)
//
// safeGet / safeSet hacen el wrapping centralizado.

window.SafeStorage = {
  safeGet(key, fallback) {
    try {
      const raw = localStorage.getItem(key);
      if (raw == null) return fallback;
      return JSON.parse(raw);
    } catch (e) {
      console.warn(`SafeStorage: ${key} corrupted, using fallback.`, e);
      // Si la entrada está corrupta, la borramos para no seguir intentando.
      try { localStorage.removeItem(key); } catch {}
      return fallback;
    }
  },

  // Si quota se excede, intenta liberar espacio podando claves grandes
  // (chat history, compactions history, etc.) y reintenta una vez.
  safeSet(key, value) {
    const str = typeof value === 'string' ? value : JSON.stringify(value);
    try {
      localStorage.setItem(key, str);
      return true;
    } catch (e) {
      if (e.name !== 'QuotaExceededError' && e.code !== 22) {
        console.warn('SafeStorage.set unexpected error:', e);
        return false;
      }
      // Quota. Intenta pruning agresivo y reintenta.
      console.warn('SafeStorage: quota exceeded, pruning...');
      this._prune();
      try {
        localStorage.setItem(key, str);
        return true;
      } catch (e2) {
        console.error('SafeStorage: quota still exceeded after prune.', e2);
        if (window.Context) Context.log('⚠ localStorage lleno. Considera Reset o exportar y limpiar.');
        return false;
      }
    }
  },

  // Borra/poda lo más prescindible primero.
  _prune() {
    // 1. Chat history: corta a la mitad.
    try {
      const chat = JSON.parse(localStorage.getItem('shosso.chat.history') || '[]');
      if (chat.length > 50) {
        const half = chat.slice(Math.floor(chat.length / 2));
        localStorage.setItem('shosso.chat.history', JSON.stringify(half));
      }
    } catch {}
    // 2. Compaction history: 20 → 5
    try {
      const c = JSON.parse(localStorage.getItem('shosso.compactions') || '[]');
      if (c.length > 5) localStorage.setItem('shosso.compactions', JSON.stringify(c.slice(0, 5)));
    } catch {}
    // 3. Terminal history: 100 → 30
    try {
      const t = JSON.parse(localStorage.getItem('shosso.term.hist') || '[]');
      if (t.length > 30) localStorage.setItem('shosso.term.hist', JSON.stringify(t.slice(-30)));
    } catch {}
    // 4. Failures resueltos antiguos
    try {
      const f = JSON.parse(localStorage.getItem('shosso.failures') || '[]');
      const recentOrOpen = f.filter(x => !x.resolved || (Date.now() - new Date(x.date).getTime()) < 30 * 86400000);
      if (recentOrOpen.length < f.length) localStorage.setItem('shosso.failures', JSON.stringify(recentOrOpen));
    } catch {}
  }
};
