// Git panel: real status via simple-git through IPC. Stage/unstage/commit.
window.GitPanel = {
  status: null,

  async init() {
    document.getElementById('git-commit-btn').onclick = () => this.commit();
    document.addEventListener('shosso:rootChanged', () => this.refresh());
    document.addEventListener('shosso:fileSaved', () => this.refresh());
    document.addEventListener('shosso:fileWritten', () => this.refresh());
    await this.refresh();
  },

  async refresh() {
    const summary = document.getElementById('git-summary');
    const filesWrap = document.getElementById('git-files');
    const branchPill = document.getElementById('branch-pill');
    if (!Projects.root) {
      summary.textContent = 'Abre una carpeta';
      filesWrap.innerHTML = '';
      branchPill.classList.add('hidden');
      return;
    }
    const r = await window.shosso.git.status(Projects.root);
    if (r.error) {
      summary.textContent = 'git: ' + r.error;
      filesWrap.innerHTML = '';
      branchPill.classList.add('hidden');
      return;
    }
    if (!r.isRepo) {
      summary.textContent = 'No es un repo git.';
      filesWrap.innerHTML = `<button id="git-init" class="text-[11px] px-2 py-1 rounded bg-panel2 hover:bg-border">git init</button>`;
      branchPill.classList.add('hidden');
      document.getElementById('git-init').onclick = async () => {
        const x = await window.shosso.shell.exec('git init', Projects.root);
        Agent.appendChat('system', x.stdout + (x.stderr ? '\n' + x.stderr : ''));
        this.refresh();
      };
      return;
    }
    this.status = r;
    branchPill.textContent = r.branch + (r.ahead ? ` ↑${r.ahead}` : '') + (r.behind ? ` ↓${r.behind}` : '');
    branchPill.classList.remove('hidden');
    summary.textContent = `${r.branch} · ${r.files.length} fichero(s) modificados`;

    filesWrap.innerHTML = r.files.length === 0
      ? '<div class="text-muted">Working tree limpio.</div>'
      : r.files.map(f => `
          <div class="flex items-center justify-between gap-1">
            <label class="flex items-center gap-1 flex-1 truncate">
              <input type="checkbox" data-stage="${escapeHtml(f.path)}" ${f.index !== ' ' && f.index !== '?' ? 'checked' : ''} class="accent-accent" />
              <span class="font-mono text-[10px] ${this._color(f)}">${escapeHtml(f.path)}</span>
            </label>
            <span class="text-[10px] text-muted">${escapeHtml(f.index + f.working_dir)}</span>
            <button data-diff="${escapeHtml(f.path)}" class="text-[10px] text-muted hover:text-accent2" title="Diff">δ</button>
          </div>
        `).join('');
    filesWrap.querySelectorAll('input[data-stage]').forEach(cb => {
      cb.onchange = async () => {
        const p = cb.dataset.stage;
        const fn = cb.checked ? 'stage' : 'unstage';
        const x = await window.shosso.git[fn](Projects.root, [p]);
        if (x.error) alert(x.error);
        this.refresh();
      };
    });
    filesWrap.querySelectorAll('button[data-diff]').forEach(b => {
      b.onclick = async () => {
        const p = b.dataset.diff;
        const d = await window.shosso.git.diff(Projects.root, p, false);
        if (d.error) { alert(d.error); return; }
        Agent.appendChat('system', `<pre class="text-[10px] whitespace-pre-wrap bg-panel2 p-2 rounded">${escapeHtml(d.diff || '(sin diff)')}</pre>`);
      };
    });

    // Log
    const logEl = document.getElementById('git-log');
    const log = await window.shosso.git.log(Projects.root, 20);
    if (logEl && !log.error) {
      logEl.innerHTML = log.commits.map(c => `
        <div class="flex gap-1 text-muted">
          <span class="text-accent2">${c.hash.slice(0, 7)}</span>
          <span class="truncate">${escapeHtml(c.message)}</span>
        </div>
      `).join('') || '<div class="text-muted">— sin commits —</div>';
    }
  },

  _color(f) {
    if (f.path && f.index === '?') return 'text-warn';
    if (f.index !== ' ' && f.index !== '?') return 'text-success';
    return 'text-accent2';
  },

  async commit() {
    if (!Projects.root) return;
    const msg = document.getElementById('git-msg').value.trim();
    if (!msg) return alert('Mensaje vacío.');
    const r = await window.shosso.git.commit(Projects.root, msg);
    if (r.error) return alert(r.error);
    document.getElementById('git-msg').value = '';
    Agent.appendChat('system', `✓ commit ${r.commit}: ${escapeHtml(msg)}`);
    this.refresh();
  }
};
