// Visualización del contexto.

window.Context = {
  logEntries: [],
  conversationTokens: 0,
  agentMdTokens: 0,

  init() {
    document.getElementById('cfg-load-agentmd').addEventListener('change', (e) => {
      this.log(`agent.md ${e.target.checked ? 'ACTIVADO (suma ' + this.agentMdTokens + 't en CADA turno)' : 'desactivado'}`);
      SystemPromptView.refresh();
      this.refresh();
    });
  },

  addConversationTokens(t) {
    this.conversationTokens += t;
    this.refresh();
  },

  reset() {
    this.conversationTokens = 0;
    this.logEntries = [];
    this.refresh();
    this.renderLogs();
  },

  log(msg) {
    const stamp = new Date().toLocaleTimeString();
    this.logEntries.unshift(`[${stamp}] ${msg}`);
    this.renderLogs();
  },

  renderLogs() {
    const el = document.getElementById('ctx-logs');
    if (!el) return;
    el.innerHTML = this.logEntries.length === 0
      ? '<div class="text-muted">Sin eventos. Carga una skill o habla con el agente para ver el flujo de contexto.</div>'
      : this.logEntries.map(e => `<div>${escapeHtml(e)}</div>`).join('');
  },

  breakdown() {
    const skillMeta = SkillsStore.metadataTokens();
    const skillBodies = SkillsStore.loadedBodiesTokens();
    const agentMdOn = document.getElementById('cfg-load-agentmd')?.checked;
    return [
      { label: 'System prompt', tokens: window.SYSTEM_PROMPT_TOKENS, color: '#22d3ee' },
      { label: 'Tools / harness', tokens: window.HARNESS_TOOLS_TOKENS, color: '#0ea5e9' },
      { label: 'agent.md', tokens: agentMdOn ? this.agentMdTokens : 0, color: '#f59e0b' },
      { label: 'Skills (name+desc)', tokens: skillMeta, color: '#7c5cff' },
      { label: 'Skills (cuerpo cargado)', tokens: skillBodies, color: '#a78bfa' },
      { label: 'Conversación', tokens: this.conversationTokens, color: '#22c55e' },
    ];
  },

  total() {
    return this.breakdown().reduce((s, r) => s + r.tokens, 0);
  },

  refresh() {
    const parts = this.breakdown();
    const total = parts.reduce((s, r) => s + r.tokens, 0);
    const pct = Math.min(100, (total / window.CTX_LIMIT) * 100);

    document.getElementById('ctx-bar').style.width = pct + '%';
    document.getElementById('ctx-numbers').textContent =
      `${formatTokens(total)} / ${formatTokens(window.CTX_LIMIT)}`;
    document.getElementById('status-right').textContent = `tokens: ${formatTokens(total)}`;

    // Densidad de información en el status bar para power users
    const loaded = SkillsStore.skills.filter(s => s.loaded).length;
    const totalSkills = SkillsStore.skills.length;
    const subs = AgentsStore.agents.filter(a => a.type === 'sub').length;
    const mem = MemoryStore.items.length;
    const openDiag = window.Diagnostics ? Diagnostics.failures.filter(f => !f.resolved).length : 0;
    const show = (id, val, formatter) => {
      const el = document.getElementById(id);
      if (!el) return;
      if (val > 0 || (id === 'status-skills' && totalSkills > 0)) {
        el.classList.remove('hidden');
        el.textContent = formatter(val);
      } else el.classList.add('hidden');
    };
    show('status-skills', loaded, v => `⌗ ${v}/${totalSkills}`);
    show('status-agents', subs, v => `▼ ${v}`);
    show('status-memory', mem, v => `🧠 ${v}`);
    show('status-diag', openDiag, v => `⚠ ${v}`);
    const diagEl = document.getElementById('status-diag');
    if (diagEl && openDiag > 0) diagEl.classList.add('text-warn');

    const panel = document.getElementById('ctx-breakdown');
    if (panel) {
      panel.innerHTML = `
        <div class="ctx-bar mb-2">
          ${parts.map(p => `<span style="width:${(p.tokens/window.CTX_LIMIT)*100}%; background:${p.color}"></span>`).join('')}
        </div>
        ${parts.map(p => `
          <div class="ctx-row">
            <span class="label"><span class="dot" style="background:${p.color}"></span>${p.label}</span>
            <span class="val">${formatTokens(p.tokens)}</span>
          </div>`).join('')}
        <div class="ctx-row mt-2 pt-2 border-t border-border">
          <span class="label font-semibold text-gray-200">Total</span>
          <span class="val font-semibold text-gray-200">${formatTokens(total)} (${pct.toFixed(1)}%)</span>
        </div>
      `;
    }

    const left = document.getElementById('status-left');
    if (pct > 90) {
      left.textContent = '⚠⚠ Contexto al ' + pct.toFixed(0) + '%: el modelo está degradado';
      left.className = 'text-danger';
    } else if (pct > 80) {
      left.textContent = '⚠ Contexto al ' + pct.toFixed(0) + '%: empieza la degradación';
      left.className = 'text-warn';
    } else if (pct > 60) {
      left.textContent = '· Contexto al ' + pct.toFixed(0) + '%';
      left.className = 'text-muted';
    } else {
      left.textContent = 'Listo';
      left.className = 'text-muted';
    }

    if (window.Compaction) Compaction.evaluate();
    if (window.Overview) Overview.refresh();
  }
};

function formatTokens(n) {
  // Defensive: si por algún flujo n es NaN o no-numeric, devuelve "0"
  // en vez de mostrar "NaN" visible al usuario.
  if (typeof n !== 'number' || isNaN(n) || !isFinite(n)) return '0';
  if (n >= 1000) return (n / 1000).toFixed(n >= 10000 ? 0 : 1) + 'k';
  return String(Math.round(n));
}
window.formatTokens = formatTokens;
