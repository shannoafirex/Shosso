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
  estimateNextInput() {
    let t = 0;
    const sp = document.getElementById('system-prompt')?.value || '';
    t += estimateTokens(sp);
    for (const m of this.conversation) {
      if (typeof m.content === 'string') t += estimateTokens(m.content);
      else if (Array.isArray(m.content)) for (const b of m.content) t += estimateTokens(b);
    }
    return t;
  },

  refresh() {
    const settings = window._settings || {};
    const provider = settings.provider || 'anthropic';
    const limit = provider === 'openai' ? 128_000 : 200_000;
    this.modelLimit = limit;
    const est = this.estimateNextInput();
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
    if (wrap) {
      const sp = estimateTokens(document.getElementById('system-prompt')?.value || '');
      const msgs = this.conversation.length;
      let convoTok = 0;
      for (const m of this.conversation) {
        if (typeof m.content === 'string') convoTok += estimateTokens(m.content);
        else if (Array.isArray(m.content)) for (const b of m.content) convoTok += estimateTokens(b);
      }
      const rows = [
        ['System prompt', sp, '#22d3ee'],
        ['Tools (defs)', estimateTokens(JSON.stringify(Tools.defs)), '#0ea5e9'],
        [`Conversación (${msgs} msgs)`, convoTok, '#22c55e']
      ];
      wrap.innerHTML = rows.map(([label, t, color]) => `
        <div class="flex justify-between items-center">
          <span class="flex items-center gap-1.5"><span class="inline-block w-2 h-2 rounded-full" style="background:${color}"></span>${label}</span>
          <span class="font-mono">${formatTokens(t)}</span>
        </div>
      `).join('') + `
        <div class="flex justify-between mt-2 pt-2 border-t border-border font-semibold">
          <span>Total estimado (próximo turno)</span>
          <span class="font-mono">${formatTokens(est)}</span>
        </div>
        ${this.lastUsage ? `
          <div class="mt-2 pt-2 border-t border-border text-[10px] text-muted">
            <div class="text-success font-semibold mb-0.5">Último turno (real, API):</div>
            <div>input: ${this.lastUsage.input_tokens ?? this.lastUsage.prompt_tokens ?? '?'}</div>
            <div>output: ${this.lastUsage.output_tokens ?? this.lastUsage.completion_tokens ?? '?'}</div>
            ${this.lastUsage.cache_read_input_tokens ? `<div>cache read: ${this.lastUsage.cache_read_input_tokens}</div>` : ''}
          </div>` : ''}
      `;
    }
  }
};
