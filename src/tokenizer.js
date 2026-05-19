// Tokenizador in-app. Espejo del workflow del podcast:
// "Vamos a openai tokenizer y vemos cuántos tokens es. Si fuera un agent.md,
//  son 944 tokens en CADA conversación".
//
// La estimación coincide con tokens.js para consistencia visual.

window.Tokenizer = {
  // Tarifa típica de input para visualizar coste relativo.
  PRICE_PER_M: 3.0, // €/M tokens input (orden de magnitud)

  init() {
    const ta = document.getElementById('tokenizer-input');
    if (!ta) return;
    ta.addEventListener('input', () => this.render(ta.value));
    this.render('');
  },

  render(text) {
    const chars = text.length;
    const tokens = estimateTokens(text);
    const cost = (tokens / 1_000_000) * this.PRICE_PER_M;
    document.getElementById('tk-chars').textContent = chars;
    document.getElementById('tk-tokens').textContent = tokens;
    document.getElementById('tk-cost').textContent = '€' + cost.toFixed(4);

    // Visual: colorea cada "token" simulado para que se vea el efecto BPE.
    const visual = this._splitVisual(text);
    document.getElementById('tk-visual').innerHTML = visual;
  },

  // Pseudo-tokenización visual: corta por palabras + signos.
  _splitVisual(text) {
    if (!text) return '<span class="text-muted">(pega texto arriba)</span>';
    const palette = ['#7c5cff33', '#22d3ee33', '#22c55e33', '#f59e0b33', '#ef444433'];
    let i = 0;
    return text.replace(/(\s+|[^\w\s]+|\w+)/g, (m) => {
      if (m.match(/^\s+$/)) return m;
      const color = palette[i++ % palette.length];
      return `<span style="background:${color};padding:0 1px;border-radius:2px">${escapeHtml(m)}</span>`;
    });
  },

  // API para que otros módulos pidan medición.
  measure(text) {
    return {
      chars: (text || '').length,
      tokens: estimateTokens(text),
      cost: (estimateTokens(text) / 1_000_000) * this.PRICE_PER_M
    };
  }
};
