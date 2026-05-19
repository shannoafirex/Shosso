// A "project" is just a real folder on disk. We track the active one and
// a short list of recent folders so the user can switch quickly.
window.Projects = {
  root: null,

  async init() {
    const settings = await window.shosso.settings.get();
    this.root = settings.lastFolder || null;
    this.recent = SafeStorage.safeGet('shosso.recent', []);
    this._renderPill();
  },

  async setRoot(dir) {
    this.root = dir;
    const s = await window.shosso.settings.get();
    s.lastFolder = dir;
    await window.shosso.settings.set(s);
    this.recent = [dir, ...this.recent.filter(p => p !== dir)].slice(0, 10);
    SafeStorage.safeSet('shosso.recent', this.recent);
    this._renderPill();
    document.dispatchEvent(new CustomEvent('shosso:rootChanged', { detail: dir }));
  },

  _renderPill() {
    const pill = document.getElementById('folder-pill');
    if (!pill) return;
    if (!this.root) {
      pill.textContent = '— abrir carpeta —';
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
