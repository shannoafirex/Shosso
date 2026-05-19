// A "project" is just a real folder on disk. We track the active one and
// a short list of recent folders so the user can switch quickly.

// Normalize a folder path so `/foo` and `/foo/` (and on Windows mixed
// slashes) hash to the same key. Memory and recent-list rely on this to
// avoid duplicate entries pointing at the same physical folder.
function normRoot(p) {
  if (!p) return p;
  let s = String(p).replace(/\\/g, '/');
  // Drop trailing slashes but keep root "/" and drive root "C:/".
  if (s.length > 1 && /\/$/.test(s) && !/^[a-zA-Z]:\/$/.test(s)) {
    s = s.replace(/\/+$/, '');
  }
  return s;
}

window.Projects = {
  root: null,
  _setRootSeq: 0,

  async init() {
    const settings = await window.shosso.settings.get();
    this.root = normRoot(settings.lastFolder) || null;
    const stored = SafeStorage.safeGet('shosso.recent', []);
    // Normalize, de-dupe, and validate that paths still exist. Stale
    // recents (deleted folders, unmounted drives) are dropped silently.
    const seen = new Set();
    const cleaned = [];
    for (const raw of stored) {
      const n = normRoot(raw);
      if (!n || seen.has(n)) continue;
      seen.add(n);
      // stat is async; collect first, validate in parallel below.
      cleaned.push(n);
    }
    const stats = await Promise.all(cleaned.map(p =>
      window.shosso.fs.stat(p).catch(() => ({ error: 'stat failed' }))
    ));
    this.recent = cleaned.filter((_, i) => stats[i] && !stats[i].error).slice(0, 10);
    if (this.recent.length !== stored.length) {
      SafeStorage.safeSet('shosso.recent', this.recent);
    }
    this._renderPill();
  },

  async setRoot(dir) {
    dir = normRoot(dir);
    if (!dir) return;
    // Rapid double-click on the folder pill (or recent list) could race:
    // root mutates after a slower setRoot kicked off but before its
    // settings write completes. Sequence number lets stale callers bail.
    const seq = ++this._setRootSeq;
    this.root = dir;
    const s = await window.shosso.settings.get();
    if (seq !== this._setRootSeq) return; // superseded mid-await
    s.lastFolder = dir;
    await window.shosso.settings.set(s);
    if (seq !== this._setRootSeq) return;
    this.recent = [dir, ...(this.recent || []).filter(p => normRoot(p) !== dir)].slice(0, 10);
    SafeStorage.safeSet('shosso.recent', this.recent);
    this._renderPill();
    document.dispatchEvent(new CustomEvent('shosso:rootChanged', { detail: dir }));
  },

  _renderPill() {
    const pill = document.getElementById('folder-pill');
    if (!pill) return;
    if (!this.root) {
      pill.textContent = '— abrir carpeta —';
      pill.title = '';
    } else {
      const short = this.root.split(/[/\\]/).slice(-2).join('/');
      pill.textContent = '📁 ' + short;
      pill.title = this.root;
    }
    pill.onclick = async () => {
      const dir = await window.shosso.app.pickFolder();
      if (dir) this.setRoot(dir);
    };
  }
};
