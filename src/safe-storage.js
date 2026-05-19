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
      // Quota errors are flagged in many ways across browsers/engines: name,
      // code, or the QuotaExceededError DOMException itself. Be permissive —
      // a serialization error already returned above, anything else here is
      // almost certainly quota.
      const isQuota = e && (
        e.name === 'QuotaExceededError' ||
        e.name === 'NS_ERROR_DOM_QUOTA_REACHED' ||
        e.code === 22 || e.code === 1014
      );
      if (!isQuota) {
        try { console.warn('[SafeStorage] setItem failed:', key, e); } catch {}
        return false;
      }
      this._prune();
      try { localStorage.setItem(key, str); return true; }
      catch (e2) {
        try { console.warn('[SafeStorage] quota exceeded after prune; dropping key:', key); } catch {}
        return false;
      }
    }
  },
  // Trim known append-only logs to their tail. Discovers project-scoped keys
  // (shosso.memory.<path>, shosso.chat.<path>) instead of hard-coding paths.
  _prune() {
    const trimArray = (k, keep) => {
      try {
        const raw = localStorage.getItem(k);
        if (!raw) return;
        const arr = JSON.parse(raw);
        if (Array.isArray(arr) && arr.length > keep) {
          localStorage.setItem(k, JSON.stringify(arr.slice(-keep)));
        }
      } catch {}
    };
    try {
      for (let i = 0; i < localStorage.length; i++) {
        const k = localStorage.key(i);
        if (!k) continue;
        if (k.startsWith('shosso.chat') || k === 'shosso.agent.runs' || k === 'shosso.terminal.hist') {
          trimArray(k, 20);
        }
      }
    } catch {}
  }
};
