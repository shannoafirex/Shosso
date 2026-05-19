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
  _initStarted: false,
  _disabled: false,
  _lastCols: 0,
  _lastRows: 0,

  async init() {
    // Guard against accidental re-entry (e.g. manual respawn) leaking pty ids.
    if (this._initStarted) return;
    this._initStarted = true;

    const el = document.getElementById('terminal');
    if (!XTerm || !XFit) {
      el.innerHTML = '<div class="p-3 text-xs text-warn">xterm.js no cargó.</div>';
      this._disabled = true;
      return;
    }
    const xterm = new XTerm({
      // ui-monospace is macOS; Menlo (mac), Consolas (Windows), and generic
      // monospace cover the other platforms when ui-monospace is unknown.
      fontFamily: 'ui-monospace, Menlo, Consolas, "DejaVu Sans Mono", monospace',
      fontSize: 12,
      theme: {
        background: '#0b0e14',
        foreground: '#e5e7eb',
        cursor: '#22d3ee'
      },
      cursorBlink: true,
      // convertEol: outgoing writes from pty are passed through as-is by
      // node-pty (PTYs already emit \r\n on Windows and \n on *nix that the
      // shell converts). We keep this true so any bare \n from app code or
      // tool output renders correctly across platforms. It does NOT affect
      // user input — that goes straight to the pty.
      convertEol: true
    });
    const fit = new XFit();
    xterm.loadAddon(fit);
    xterm.open(el);
    // First fit may run while the terminal panel is hidden, in which case
    // the container measures 0x0 and fit() throws. Retry once we have a
    // real size before spawning the pty.
    const safeFit = () => {
      if (!el.offsetWidth || !el.offsetHeight) return false;
      try { fit.fit(); } catch { return false; }
      return xterm.cols > 0 && xterm.rows > 0;
    };
    if (!safeFit()) {
      // Fall back to sensible defaults; ResizeObserver below will correct
      // once the panel is shown.
      try { xterm.resize(80, 24); } catch {}
    }
    this.term = xterm;
    this.fit = fit;

    const r = await window.shosso.pty.spawn({
      cols: xterm.cols || 80, rows: xterm.rows || 24, cwd: Projects.root || undefined
    });
    if (r.error) {
      xterm.write('\r\n\x1b[33m[terminal no disponible: ' + r.error + ']\x1b[0m\r\n');
      xterm.write('\x1b[90mEjecuta `npm install && npm run rebuild` para activar node-pty.\x1b[0m\r\n');
      // Mark disabled so we don't silently consume keystrokes (no pty to send to).
      this._disabled = true;
      xterm.options.disableStdin = true;
      return;
    }
    this.ptyId = r.id;
    this._lastCols = xterm.cols;
    this._lastRows = xterm.rows;
    xterm.write(`\x1b[36mShosso terminal · ${r.shell}\x1b[0m\r\n`);

    window.shosso.pty.onData((id, data) => {
      if (id === this.ptyId) xterm.write(data);
    });
    window.shosso.pty.onExit((id, code) => {
      if (id === this.ptyId) {
        xterm.write(`\r\n\x1b[31m[shell salió con código ${code}]\x1b[0m\r\n`);
        this.ptyId = null;
        // Stop input from going nowhere after the shell exits.
        try { xterm.options.disableStdin = true; } catch {}
      }
    });
    xterm.onData(data => {
      if (this.ptyId) window.shosso.pty.write(this.ptyId, data);
    });

    // Debounce-ish resize: fit() can throw on 0-sized elements (panel hidden);
    // also avoid spamming pty.resize when cols/rows don't change.
    new ResizeObserver(() => {
      if (!el.offsetWidth || !el.offsetHeight) return;
      try { fit.fit(); } catch { return; }
      const cols = xterm.cols, rows = xterm.rows;
      if (cols <= 0 || rows <= 0) return;
      if (cols === this._lastCols && rows === this._lastRows) return;
      this._lastCols = cols;
      this._lastRows = rows;
      if (this.ptyId) {
        try { window.shosso.pty.resize(this.ptyId, cols, rows); } catch {}
      }
    }).observe(el);

    document.addEventListener('shosso:rootChanged', () => {
      if (!this.ptyId || !Projects.root) return;
      // On Windows shells, prefer forward slashes; quote always.
      const p = Projects.root.replace(/\\/g, '/').replace(/"/g, '\\"');
      window.shosso.pty.write(this.ptyId, `cd "${p}"\n`);
    });
  },

  focus() {
    if (this._disabled || !this.term) return;
    // After tab-switch the container may have just become visible; fit once
    // so cols/rows match the actual pixel size and the shell prompt aligns.
    try {
      const el = document.getElementById('terminal');
      if (el && el.offsetWidth && el.offsetHeight) {
        this.fit?.fit();
        if (this.ptyId && (this.term.cols !== this._lastCols || this.term.rows !== this._lastRows)) {
          this._lastCols = this.term.cols;
          this._lastRows = this.term.rows;
          window.shosso.pty.resize(this.ptyId, this.term.cols, this.term.rows);
        }
      }
    } catch {}
    this.term.focus();
  }
};
