// Robust localStorage wrapper (JSON-safe + quota recovery).
window.SafeStorage = {
  safeGet(key, fallback) {
    try {
      const raw = localStorage.getItem(key);
      if (raw == null) return fallback;
      return JSON.parse(raw);
    } catch (e) {
      try { localStorage.removeItem(key); } catch {}
      return fallback;
    }
  },
  safeSet(key, value) {
    let str;
    try { str = typeof value === 'string' ? value : JSON.stringify(value); }
    catch { return false; }
    try { localStorage.setItem(key, str); return true; }
    catch (e) {
      if (e.name !== 'QuotaExceededError' && e.code !== 22) return false;
      this._prune();
      try { localStorage.setItem(key, str); return true; } catch { return false; }
    }
  },
  _prune() {
    for (const k of ['shosso.chat', 'shosso.agent.runs', 'shosso.terminal.hist']) {
      try {
        const arr = JSON.parse(localStorage.getItem(k) || '[]');
        if (Array.isArray(arr) && arr.length > 20) {
          localStorage.setItem(k, JSON.stringify(arr.slice(-20)));
        }
      } catch {}
    }
  }
};
