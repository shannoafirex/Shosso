// /grebloop — auto-review loop estilo CodeRabbit/Gravile.
// Del 2º podcast: "Le doy a /grebloop, el agente lee el PR, lee el review,
// corrige, espera nuevo review. Si fue 2/5 ahora es 3/5. Sigue. No para
// hasta que sea 5/5."
//
// Aquí simulamos esa convergencia. La única razón por la que NO converge
// es PR demasiado grande (>500 líneas). Convergencia en ~3-5 vueltas.

window.ReviewLoop = {
  running: false,
  queue: [],

  // Disparado por /grebloop. Si hay uno corriendo, encola en vez de bloquear.
  async run(prDescription) {
    if (this.running) {
      this.queue.push(prDescription);
      MockAgent.log('system',
        `⏳ /grebloop encolado · posición <b>${this.queue.length}</b>.<br>` +
        `<span class="text-muted text-xs">Se ejecutará automáticamente cuando termine el actual.</span>`);
      return;
    }
    this.running = true;
    const prSize = this._estimateSize(prDescription);
    let score = this._initialScore(prSize);
    let iter = 0;
    MockAgent.log('system',
      `▶ /grebloop iniciado — PR estimado <b>${prSize}</b> líneas.<br>` +
      `Si supera 500 líneas, el loop probablemente no converja a 5/5.`);

    while (score < 5 && iter < 6) {
      iter++;
      await MockAgent.sleep(700);
      const issues = this._issuesFor(score, iter);
      MockAgent.log('tool',
        `<b>review iter ${iter}</b> · score <span class="text-warn">${score}/5</span><br>` +
        issues.map(i => `• ${escapeHtml(i)}`).join('<br>'));
      await MockAgent.sleep(500);
      score = this._nextScore(score, prSize);
      MockAgent.log('agent',
        `Aplicando fix de iter ${iter}:<br>` +
        issues.map(i => `<span class="text-success">✓ ${escapeHtml(i)}</span>`).join('<br>'),
        `agente · /grebloop`);
    }

    if (score >= 5) {
      MockAgent.log('system',
        `✅ <b>5/5 alcanzado en ${iter} vueltas.</b> PR listo para mergear. Esto es Karpathy auto-research loop aplicado a code review.`);
    } else {
      MockAgent.log('system',
        `⏸ Loop pausado en ${score}/5 tras ${iter} vueltas. PR demasiado grande (${prSize} líneas). Divídelo con el Plan.`);
    }
    this.running = false;

    // Procesa la cola
    if (this.queue.length > 0) {
      const next = this.queue.shift();
      MockAgent.log('system', `▶ desencolando /grebloop (${this.queue.length} pendientes después)`);
      setTimeout(() => this.run(next), 300);
    }
  },

  _estimateSize(desc) {
    // Más texto → PR estimado más grande. Mock determinístico.
    return Math.min(2000, 80 + estimateTokens(desc) * 3);
  },

  _initialScore(size) {
    if (size < 200) return 4;
    if (size < 500) return 3;
    if (size < 1000) return 2;
    return 1;
  },

  _nextScore(current, size) {
    // Converge sólo si el PR no es enorme.
    if (size > 800 && current >= 3) return current; // estancado
    return Math.min(5, current + (Math.random() < 0.7 ? 1 : 0));
  },

  _issuesFor(score, iter) {
    const pool = [
      'falta test para el caso de error 4xx',
      'función duplicada con existing helper en src/lib/',
      'logging excesivo en hot path',
      'nombre de variable poco descriptivo (x → userInput)',
      'falta JSDoc en endpoint público',
      'manejo de null no cubierto en el array reducer',
      'fetch sin timeout configurado',
      'orden de imports no canónico',
      'magic number 86400 sin constante',
      'componente >300 líneas — extraer sub-componente'
    ];
    const n = Math.max(1, 6 - score);
    return pool.slice((iter * 2) % pool.length, ((iter * 2) % pool.length) + n);
  }
};
