// Real context tracking. Holds the running conversation and surfaces
// usage data from the API (input/output tokens, cache hits when present).
window.Context = {
  conversation: [], // [{ role, content }] in Anthropic format. 'content' can be string or blocks array.
  lastUsage: null,
  totalInputTokens: 0,
  totalOutputTokens: 0,
  cacheReadTokens: 0,
  modelLimit: 200_000,

  init() {
    document.getElementById('ctx-compact')?.addEventListener('click', () => Compaction.run());
    document.getElementById('ctx-clear')?.addEventListener('click', () => this.reset());
    this.refresh();
  },

  reset() {
    this.conversation = [];
    this.lastUsage = null;
    this.totalInputTokens = 0;
    this.totalOutputTokens = 0;
    this.cacheReadTokens = 0;
    this.refresh();
    const log = document.getElementById('chat-log');
    if (log) log.innerHTML = '';
  },

  push(message) {
    this.conversation.push(message);
  },

  setUsage(usage) {
    if (!usage) return;
    this.lastUsage = usage;
    if (typeof usage.input_tokens === 'number') {
      this.totalInputTokens += usage.input_tokens;
      this.totalOutputTokens += usage.output_tokens || 0;
      if (usage.cache_read_input_tokens) this.cacheReadTokens += usage.cache_read_input_tokens;
    } else if (typeof usage.prompt_tokens === 'number') {
      this.totalInputTokens += usage.prompt_tokens;
      this.totalOutputTokens += usage.completion_tokens || 0;
    }
    this.refresh();
  },

  // Estimate of what the next request will cost (input tokens). Used for the bar.
  // Computes system + conversation tokens. Callers may pass an out object to
  // receive the breakdown (avoids a second O(N) walk in refresh()).
  estimateNextInput(out) {
    const sp = document.getElementById('system-prompt')?.value || '';
    const spTok = estimateTokens(sp);
    let convoTok = 0;
    for (const m of this.conversation) {
      if (typeof m.content === 'string') convoTok += estimateTokens(m.content);
      else if (Array.isArray(m.content)) for (const b of m.content) convoTok += estimateTokens(b);
    }
    if (out) { out.systemTokens = spTok; out.convoTokens = convoTok; }
    return spTok + convoTok;
  },

  refresh() {
    const settings = window._settings || {};
    const provider = settings.provider || 'anthropic';
    const limit = provider === 'openai' ? 128_000 : 200_000;
    this.modelLimit = limit;
    const breakdown = {};
    const est = this.estimateNextInput(breakdown);
    const pct = Math.min(100, (est / limit) * 100);

    const bar = document.getElementById('ctx-bar');
    const nums = document.getElementById('ctx-numbers');
    if (bar) bar.style.width = pct + '%';
    if (nums) nums.textContent = `${formatTokens(est)} / ${formatTokens(limit)}`;

    const out = document.getElementById('status-tokens');
    if (out) out.textContent = `in: ${formatTokens(this.totalInputTokens)} · out: ${formatTokens(this.totalOutputTokens)}${this.cacheReadTokens ? ' · cache: ' + formatTokens(this.cacheReadTokens) : ''}`;

    const left = document.getElementById('status-left');
    if (left) {
      if (pct > 90) { left.textContent = `⚠⚠ Contexto al ${pct.toFixed(0)}%`; left.className = 'text-danger'; }
      else if (pct > 80) { left.textContent = `⚠ Contexto al ${pct.toFixed(0)}%`; left.className = 'text-warn'; }
      else { left.textContent = 'Listo'; left.className = 'text-muted'; }
    }

    const wrap = document.getElementById('ctx-breakdown');
    // Only repaint the breakdown panel when its tab is actually visible —
    // it lives under [data-rightPanel="context"]. Cheap optimization.
    const panel = wrap ? wrap.closest('.right-panel') : null;
    if (wrap && (!panel || !panel.classList.contains('hidden'))) {
      const sp = breakdown.systemTokens || 0;
      const convoTok = breakdown.convoTokens || 0;
      const msgs = this.conversation.length;
      // Tools may not be initialized yet (Tools.init in agent flow). Guard.
      const toolDefs = (window.Tools && Array.isArray(Tools.defs)) ? Tools.defs : [];
      const rows = [
        ['System prompt', sp, '#22d3ee'],
        ['Tools (defs)', estimateTokens(JSON.stringify(toolDefs)), '#0ea5e9'],
        [`Conversación (${msgs} msgs)`, convoTok, '#22c55e']
      ];
      const lu = this.lastUsage;
      // escapeHtml the numeric/possibly-string values from the API before
      // injecting via innerHTML.
      const fmt = v => escapeHtml(v == null ? '?' : v);
      wrap.innerHTML = rows.map(([label, t, color]) => `
        <div class="flex justify-between items-center">
          <span class="flex items-center gap-1.5"><span class="inline-block w-2 h-2 rounded-full" style="background:${color}"></span>${escapeHtml(label)}</span>
          <span class="font-mono">${formatTokens(t)}</span>
        </div>
      `).join('') + `
        <div class="flex justify-between mt-2 pt-2 border-t border-border font-semibold">
          <span>Total estimado (próximo turno)</span>
          <span class="font-mono">${formatTokens(est)}</span>
        </div>
        ${lu ? `
          <div class="mt-2 pt-2 border-t border-border text-[10px] text-muted">
            <div class="text-success font-semibold mb-0.5">Último turno (real, API):</div>
            <div>input: ${fmt(lu.input_tokens ?? lu.prompt_tokens)}</div>
            <div>output: ${fmt(lu.output_tokens ?? lu.completion_tokens)}</div>
            ${lu.cache_read_input_tokens ? `<div>cache read: ${fmt(lu.cache_read_input_tokens)}</div>` : ''}
          </div>` : ''}
      `;
    }
  }
};
