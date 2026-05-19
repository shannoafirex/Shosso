// Demo "los modelos no piensan, predicen tokens".
// Del podcast: "No piensa. No entiende. Cuando le dices 'cuál es la capital
// de Francia', mapea eso en un grafo vectorial, busca el vecino más cercano
// y devuelve 'París'."
//
// Aquí simulamos esa intuición: dado un prefijo, mostramos las "siguientes"
// tokens más probables con pesos. No es un modelo real — es una visual que
// hace tangible la idea para que el usuario deje de antropomorfizar.

window.Predictor = {
  // Tabla de continuaciones más probables (muy simplificada, ilustrativa).
  TABLE: {
    'la capital de francia es': [['parís', 0.91], ['una', 0.04], ['la', 0.02], ['también', 0.02], ['conocida', 0.01]],
    'el agente cargó la skill': [['code-structure', 0.31], ['sponsor-research', 0.28], ['weekly-report', 0.22], ['correcta', 0.09], ['necesaria', 0.10]],
    'cuando una skill falla': [['tú', 0.34], ['el', 0.21], ['hay', 0.18], ['debes', 0.14], ['no', 0.13]],
    'menos es': [['más', 0.97], ['mejor', 0.02], ['mucho', 0.01]],
    'progressive': [['disclosure', 0.93], ['enhancement', 0.04], ['rendering', 0.02], ['rollout', 0.01]],
    'context': [['matters', 0.42], ['window', 0.31], ['is', 0.18], ['size', 0.09]],
    'el modelo': [['predice', 0.38], ['carga', 0.21], ['responde', 0.18], ['no', 0.13], ['entiende', 0.10]],
    'tienes': [['skills', 0.34], ['memoria', 0.22], ['un', 0.18], ['varios', 0.16], ['contexto', 0.10]]
  },

  init() {
    const wrap = document.getElementById('predictor');
    if (!wrap) return;
    wrap.innerHTML = `
      <div class="space-y-2">
        <div class="flex items-center justify-between">
          <h3 class="text-xs uppercase tracking-wide text-muted">Demo: el modelo no piensa, predice</h3>
          <button id="pred-roll" class="text-[10px] px-2 py-0.5 rounded bg-panel hover:bg-border">Ejemplo aleatorio</button>
        </div>
        <input id="pred-input" type="text" placeholder="escribe un prefijo… ej: 'menos es'"
          class="w-full bg-panel2 border border-border rounded px-2 py-1 text-xs font-mono outline-none focus:border-accent" />
        <div id="pred-output" class="space-y-1"></div>
        <p class="text-[10px] text-muted">No es un LLM real. Es una visualización del comportamiento: dado un prefijo, las "siguientes tokens" se ordenan por probabilidad. No hay pensamiento detrás. Lo que tú aportas (contexto, skills, memoria) es lo que sesga la distribución hacia respuestas útiles.</p>
      </div>
    `;
    document.getElementById('pred-input').addEventListener('input', e => this.render(e.target.value));
    document.getElementById('pred-roll').addEventListener('click', () => {
      const keys = Object.keys(this.TABLE);
      const pick = keys[Math.floor(Math.random() * keys.length)];
      document.getElementById('pred-input').value = pick;
      this.render(pick);
    });
    this.render('');
  },

  render(prefix) {
    const wrap = document.getElementById('pred-output');
    if (!wrap) return;
    const key = (prefix || '').toLowerCase().trim();
    let dist = this.TABLE[key];
    let usedKey = key;
    if (!dist) dist = this._fuzzyMatch(key, wrap);
    if (!dist) {
      wrap.innerHTML = `<div class="text-[11px] text-muted italic">Prueba con: "menos es", "el modelo", "context", "progressive", "cuando una skill falla", "tienes".</div>`;
      return;
    }
    const max = Math.max(...dist.map(d => d[1]));
    const bars = dist.map(([tok, p]) => `
      <div class="flex items-center gap-2 text-xs">
        <code class="font-mono w-32 truncate">${escapeHtml(tok)}</code>
        <div class="flex-1 h-2 bg-panel2 rounded overflow-hidden">
          <div class="h-full bg-gradient-to-r from-accent to-accent2" style="width:${(p/max)*100}%"></div>
        </div>
        <span class="font-mono text-muted w-12 text-right">${(p*100).toFixed(0)}%</span>
      </div>
    `).join('');
    const hint = key && key !== usedKey ? `<div class="text-[10px] text-muted italic mb-1">≈ usando match: "${escapeHtml(usedKey)}"</div>` : '';
    wrap.innerHTML = hint + bars;
  },

  _fuzzyMatch(key, wrap) {
    if (!key) return null;
    const keys = Object.keys(this.TABLE);
    let best = null, bestScore = 0;
    for (const k of keys) {
      const lastWord = key.split(/\s+/).pop();
      if (k.endsWith(lastWord) || k.startsWith(lastWord) || k.includes(lastWord)) {
        const score = lastWord.length / k.length;
        if (score > bestScore) { best = k; bestScore = score; }
      }
    }
    if (best) {
      // Mutamos para que render mostre el hint
      this._lastFuzzyKey = best;
      return this.TABLE[best];
    }
    return null;
  }
};
