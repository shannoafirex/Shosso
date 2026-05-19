// xterm.js bound to a real pty via main process. Supports resize, history,
// and proper colors/control sequences. Falls back to a friendly notice if
// node-pty isn't built (e.g. user hasn't run `npm install` + rebuild).

// Cache xterm's Terminal class before we overwrite window.Terminal with our wrapper.
const XTerm = window.Terminal;
const XFit = window.FitAddon?.FitAddon;

window.Terminal = {
  term: null,
  fit: null,
  ptyId: null,

  async init() {
    const el = document.getElementById('terminal');
    if (!XTerm || !XFit) {
      el.innerHTML = '<div class="p-3 text-xs text-warn">xterm.js no cargó.</div>';
      return;
    }
    const xterm = new XTerm({
      fontFamily: 'ui-monospace, Menlo, Consolas, monospace',
      fontSize: 12,
      theme: {
        background: '#0b0e14',
        foreground: '#e5e7eb',
        cursor: '#22d3ee'
      },
      cursorBlink: true,
      convertEol: true
    });
    const fit = new XFit();
    xterm.loadAddon(fit);
    xterm.open(el);
    try { fit.fit(); } catch {}
    this.term = xterm;
    this.fit = fit;

    const r = await window.shosso.pty.spawn({
      cols: xterm.cols, rows: xterm.rows, cwd: Projects.root || undefined
    });
    if (r.error) {
      xterm.write('\r\n\x1b[33m[terminal no disponible: ' + r.error + ']\x1b[0m\r\n');
      xterm.write('\x1b[90mEjecuta `npm install && npm run rebuild` para activar node-pty.\x1b[0m\r\n');
      return;
    }
    this.ptyId = r.id;
    xterm.write(`\x1b[36mShosso terminal · ${r.shell}\x1b[0m\r\n`);

    window.shosso.pty.onData((id, data) => {
      if (id === this.ptyId) xterm.write(data);
    });
    window.shosso.pty.onExit((id, code) => {
      if (id === this.ptyId) {
        xterm.write(`\r\n\x1b[31m[shell salió con código ${code}]\x1b[0m\r\n`);
        this.ptyId = null;
      }
    });
    xterm.onData(data => {
      if (this.ptyId) window.shosso.pty.write(this.ptyId, data);
    });

    new ResizeObserver(() => {
      try {
        fit.fit();
        if (this.ptyId) window.shosso.pty.resize(this.ptyId, xterm.cols, xterm.rows);
      } catch {}
    }).observe(el);

    document.addEventListener('shosso:rootChanged', () => {
      if (!this.ptyId || !Projects.root) return;
      // On Windows shells, prefer forward slashes; quote always.
      const p = Projects.root.replace(/\\/g, '/').replace(/"/g, '\\"');
      window.shosso.pty.write(this.ptyId, `cd "${p}"\n`);
    });
  },

  focus() { this.term?.focus(); }
};
