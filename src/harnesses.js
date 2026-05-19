// Comparativa de harnesses. Del podcast: "Cursor, Claude Code, Codex.
// Los modelos son los mismos. La diferencia está en el harness y el
// contexto que te dejan controlar."

window.Harnesses = {
  DATA: [
    {
      name: 'Cursor',
      mode: 'editor-first',
      strengths: ['UX pulida', 'Tab autocomplete fuerte', 'Inline chat ergonómico'],
      weaknesses: ['Harness opaco', 'Tu skills son rules.md (no progressive)', 'Tokens consumidos invisibles'],
      contextControl: 35
    },
    {
      name: 'Claude Code',
      mode: 'terminal + agentic',
      strengths: ['Agentic loops largos', 'Skills con progressive disclosure', 'Hooks + MCP servers'],
      weaknesses: ['CLI-first (menos visual)', 'Compactación ocasionalmente agresiva'],
      contextControl: 80
    },
    {
      name: 'Codex (OpenAI)',
      mode: 'terminal + agentic',
      strengths: ['Buen razonamiento', 'Integración con o-series', 'Sandboxing fuerte'],
      weaknesses: ['Menos extensible que Claude Code', 'Skills no son ciudadanos de primera clase'],
      contextControl: 60
    },
    {
      name: 'Shosso',
      mode: 'skill-first + context-visible',
      strengths: ['Tokens visibles en vivo', 'Skill builder recursivo forzado', 'Anti-patrones en agent.md detectados', 'No descargues skills (warning)'],
      weaknesses: ['Mock-agent (necesita adapter real)', 'Joven'],
      contextControl: 100
    }
  ],

  init() {
    this.render();
  },

  render() {
    const wrap = document.getElementById('harnesses-list');
    if (!wrap) return;
    wrap.innerHTML = this.DATA.map(h => `
      <div class="bg-panel2 border border-border rounded p-2 ${h.name === 'Shosso' ? 'border-accent/50' : ''}">
        <div class="flex justify-between items-baseline">
          <div class="font-semibold text-sm">${escapeHtml(h.name)}</div>
          <div class="text-[10px] text-muted">${escapeHtml(h.mode)}</div>
        </div>
        <div class="mt-1.5">
          <div class="flex items-center gap-2 text-[10px]">
            <span class="text-muted w-20">Control ctx</span>
            <div class="flex-1 h-1.5 bg-bg rounded overflow-hidden">
              <div class="h-full bg-gradient-to-r from-accent to-accent2" style="width:${h.contextControl}%"></div>
            </div>
            <span class="font-mono">${h.contextControl}%</span>
          </div>
        </div>
        <div class="mt-2 text-[10px]">
          <div class="text-success">+ ${h.strengths.map(escapeHtml).join(' · ')}</div>
          <div class="text-warn mt-0.5">− ${h.weaknesses.map(escapeHtml).join(' · ')}</div>
        </div>
      </div>
    `).join('');
  }
};
