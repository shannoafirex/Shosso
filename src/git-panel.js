// Git panel: real status via simple-git through IPC. Stage/unstage/commit.
window.GitPanel = {
  status: null,
  _committing: false,
  _refreshing: false,
  _refreshQueued: false,
  _stagingInFlight: new Set(),

  async init() {
    document.getElementById('git-commit-btn').onclick = () => this.commit();
    document.addEventListener('shosso:rootChanged', () => this.refresh());
    document.addEventListener('shosso:fileSaved', () => this.refresh());
    document.addEventListener('shosso:fileWritten', () => this.refresh());
    await this.refresh();
  },

  async refresh() {
    // Coalesce overlapping refreshes so a checkbox click in flight doesn't
    // race with the redraw that overwrites the user's pending toggle.
    if (this._refreshing) { this._refreshQueued = true; return; }
    this._refreshing = true;
    try {
      await this._doRefresh();
    } finally {
      this._refreshing = false;
      if (this._refreshQueued) {
        this._refreshQueued = false;
        // Yield so a burst of events collapses into one extra refresh.
        setTimeout(() => this.refresh(), 0);
      }
    }
  },

  async _doRefresh() {
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
      const initBtn = document.getElementById('git-init');
      initBtn.onclick = async () => {
        initBtn.disabled = true;
        initBtn.textContent = 'init…';
        const x = await window.shosso.shell.exec('git init', Projects.root);
        Agent.appendChat('system', escapeHtml((x.stdout || '') + (x.stderr ? '\n' + x.stderr : '')));
        await this.refresh();
      };
      return;
    }
    this.status = r;
    // Detached HEAD or pre-first-commit: simple-git returns '' or
    // 'HEAD (no branch)'. Surface something useful instead of an empty pill.
    let branchLabel = (r.branch || '').trim();
    if (!branchLabel || /^HEAD/i.test(branchLabel) || branchLabel === '(detached)') {
      branchLabel = 'HEAD detached';
    }
    branchPill.textContent = branchLabel + (r.ahead ? ` ↑${r.ahead}` : '') + (r.behind ? ` ↓${r.behind}` : '');
    branchPill.classList.remove('hidden');
    const conflicts = Array.isArray(r.conflicted) ? r.conflicted.length : 0;
    const conflictMsg = conflicts ? ` · ⚠ ${conflicts} conflicto(s)` : '';
    summary.textContent = `${branchLabel} · ${r.files.length} fichero(s) modificados${conflictMsg}`;

    filesWrap.innerHTML = r.files.length === 0
      ? '<div class="text-muted">Working tree limpio.</div>'
      : r.files.map(f => {
          const conflicted = conflicts && r.conflicted.indexOf(f.path) !== -1;
          const colorCls = conflicted ? 'text-danger' : this._color(f);
          // Truncate visually with CSS (truncate + title tooltip for full path).
          return `
          <div class="flex items-center justify-between gap-1">
            <label class="flex items-center gap-1 flex-1 min-w-0" title="${escapeHtml(f.path)}">
              <input type="checkbox" data-stage="${escapeHtml(f.path)}" ${f.index !== ' ' && f.index !== '?' ? 'checked' : ''} ${conflicted ? 'disabled' : ''} class="accent-accent shrink-0" />
              <span class="font-mono text-[10px] truncate ${colorCls}">${escapeHtml(f.path)}</span>
            </label>
            <span class="text-[10px] text-muted shrink-0">${escapeHtml((f.index || ' ') + (f.working_dir || ' '))}</span>
            <button data-diff="${escapeHtml(f.path)}" class="text-[10px] text-muted hover:text-accent2 shrink-0" title="Diff">δ</button>
          </div>
        `;
        }).join('');
    filesWrap.querySelectorAll('input[data-stage]').forEach(cb => {
      cb.onchange = async () => {
        const p = cb.dataset.stage;
        if (this._stagingInFlight.has(p)) return;
        this._stagingInFlight.add(p);
        cb.disabled = true;
        try {
          const fn = cb.checked ? 'stage' : 'unstage';
          const x = await window.shosso.git[fn](Projects.root, [p]);
          if (x.error) alert(x.error);
        } finally {
          this._stagingInFlight.delete(p);
          // Don't re-enable cb directly — refresh() will re-render and the
          // new checkbox reflects the latest authoritative state.
          this.refresh();
        }
      };
    });
    filesWrap.querySelectorAll('button[data-diff]').forEach(b => {
      b.onclick = async () => {
        const p = b.dataset.diff;
        const d = await window.shosso.git.diff(Projects.root, p, false);
        if (d.error) { alert(d.error); return; }
        const raw = d.diff || '';
        // simple-git returns 'Binary files a/foo and b/foo differ' for
        // binary diffs — show a friendly note instead of a useless blob.
        const isBinary = /^Binary files .* differ$/m.test(raw) || /\0/.test(raw);
        let body;
        if (!raw) {
          body = '<div class="text-[10px] text-muted">(sin diff)</div>';
        } else if (isBinary) {
          body = `<div class="text-[10px] text-warn">Archivo binario — diff no disponible.</div><pre class="text-[10px] whitespace-pre-wrap bg-panel2 p-2 rounded">${escapeHtml(raw)}</pre>`;
        } else {
          // chat-log has a 200-msg DOM cap; very large diffs may scroll off
          // the top over time. We keep the simple inline render and rely on
          // max-h + overflow so the chat panel itself isn't pushed around.
          body = `<pre class="text-[10px] whitespace-pre-wrap bg-panel2 p-2 rounded max-h-80 overflow-y-auto">${escapeHtml(raw)}</pre>`;
        }
        Agent.appendChat('system', `<div class="text-[10px] text-muted mb-1">diff ${escapeHtml(p)}</div>${body}`);
      };
    });

    // Log
    const logEl = document.getElementById('git-log');
    const log = await window.shosso.git.log(Projects.root, 20);
    if (logEl) {
      if (log.error || !Array.isArray(log.commits)) {
        // Empty repo / no commits yet → simple-git rejects with a message
        // like "does not have any commits yet". Render an empty state.
        logEl.innerHTML = '<div class="text-muted">— sin commits —</div>';
      } else {
        logEl.innerHTML = log.commits.map(c => `
          <div class="flex gap-1 text-muted">
            <span class="text-accent2">${escapeHtml((c.hash || '').slice(0, 7))}</span>
            <span class="truncate" title="${escapeHtml(c.message || '')}">${escapeHtml(c.message || '')}</span>
          </div>
        `).join('') || '<div class="text-muted">— sin commits —</div>';
      }
    }
  },

  _color(f) {
    if (f.path && f.index === '?') return 'text-warn';
    if (f.index !== ' ' && f.index !== '?') return 'text-success';
    return 'text-accent2';
  },

  async commit() {
    if (!Projects.root) return;
    if (this._committing) return;
    const btn = document.getElementById('git-commit-btn');
    const msg = document.getElementById('git-msg').value.trim();
    if (!msg) return alert('Mensaje vacío.');
    this._committing = true;
    if (btn) { btn.disabled = true; btn.dataset._label = btn.textContent; btn.textContent = 'committing…'; }
    try {
      const r = await window.shosso.git.commit(Projects.root, msg);
      if (r.error) { alert(r.error); return; }
      document.getElementById('git-msg').value = '';
      Agent.appendChat('system', `✓ commit ${escapeHtml(r.commit || '')}: ${escapeHtml(msg)}`);
      this.refresh();
    } finally {
      this._committing = false;
      if (btn) { btn.disabled = false; btn.textContent = btn.dataset._label || 'Commit'; }
    }
  }
};
