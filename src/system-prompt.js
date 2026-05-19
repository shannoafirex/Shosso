// Visor del system prompt + harness. Hace literal lo del podcast:
// "Cloud code leaked recently y una de las cosas cool, especialmente como
//  developer, fue que pude leer el system prompt".
//
// Aquí lo hacemos transparente desde el día uno.

window.SystemPromptView = {
  agentMd: '',

  init() {
    const body = document.getElementById('sys-prompt-body');
    body.textContent = window.SEED_SYSTEM_PROMPT;
    document.getElementById('sys-prompt-tokens').textContent = estimateTokens(window.SEED_SYSTEM_PROMPT) + 't';

    const toolsUl = document.getElementById('sys-tools-body');
    toolsUl.innerHTML = window.SEED_TOOLS.map(t => `
      <li class="flex justify-between gap-2 border-b border-border last:border-0 py-1">
        <div>
          <div class="font-mono text-accent2">${escapeHtml(t.name)}</div>
          <div class="text-muted">${escapeHtml(t.desc)}</div>
        </div>
        <span class="font-mono text-muted">${t.tokens}t</span>
      </li>
    `).join('');
    const totalTools = window.SEED_TOOLS.reduce((s, t) => s + t.tokens, 0);
    document.getElementById('sys-tools-tokens').textContent = totalTools + 't';
    window.HARNESS_TOOLS_TOKENS = totalTools;
    window.SYSTEM_PROMPT_TOKENS = estimateTokens(window.SEED_SYSTEM_PROMPT);

    // agent.md editable
    const saved = localStorage.getItem('shosso.agentmd') || '';
    this.agentMd = saved;
    const ta = document.getElementById('agentmd-body');
    ta.value = saved;
    ta.addEventListener('input', () => {
      this.agentMd = ta.value;
      localStorage.setItem('shosso.agentmd', this.agentMd);
      this._refreshAgentMdTokens();
      Context.refresh();
      if (window.AntiPatterns) AntiPatterns.scan(this.agentMd);
    });
    this._refreshAgentMdTokens();
  },

  _refreshAgentMdTokens() {
    const t = estimateTokens(this.agentMd);
    const enabled = document.getElementById('cfg-load-agentmd')?.checked;
    document.getElementById('sys-agentmd-tokens').textContent = enabled ? `${t}t · ACTIVO` : `${t}t · desactivado`;
    Context.agentMdTokens = t;
  },

  refresh() { this._refreshAgentMdTokens(); }
};
