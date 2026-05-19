// Knowledge work — acciones reales.
// Del 2º podcast: "Soy más bullish en knowledge work que en agentic
// engineering. Los modelos ya son suficientes — falta tooling."
//
// Casos reales del podcast:
// - Revisión de contrato: $5K en abogados → AI detecta abusos, 3x el precio
// - Accounting: 3.000 transacciones, $6K firma → 2 horas con AI
// - Asesoría legal/médica personal: ChatGPT Pro vs profesional

window.KnowledgeWork = {
  ACTIONS: [
    {
      id: 'contract-review',
      name: 'Revisar contrato',
      icon: '📄',
      desc: 'Detecta abusos y propone rebuttals',
      cost: '$200/mes', alt: '$3.000-5.000 (abogado)',
      steps: [
        { delay: 600, label: 'extrayendo cláusulas del PDF…' },
        { delay: 900, label: 'comparando contra market standard (p10/p50/p90)…' },
        { delay: 800, label: 'detectando asimetrías en favor de la contraparte…' },
        { delay: 700, label: 'redactando rebuttals con tono profesional…' }
      ],
      run: () => `<b>Análisis del contrato (27 páginas):</b><br>
        • Cláusula 4.2: indemnización ilimitada → <b>rechazar o cap a 1x fees</b>.<br>
        • Cláusula 7.1: IP perpetua → renegociar a licencia limitada.<br>
        • Cláusula 12.4: terminación unilateral sin causa → exigir 60 días notice.<br>
        • Pricing: $50/hora propuesto, market p90 = $150/hora.<br>
        <b>Recomendación:</b> rechazar tal cual; pedir 3x el precio + límites de liability.<br>
        <span class="text-success">Ahorro estimado: $4.800 vs abogado tradicional.</span>`
    },
    {
      id: 'accounting',
      name: 'Audit accounting',
      icon: '🧾',
      desc: '3.000 transacciones en 2h',
      cost: '$200/mes', alt: '$5.000-6.000 (firma)',
      steps: [
        { delay: 700, label: 'descargando 3.012 transacciones de Stripe/PayPal/Wise…' },
        { delay: 1000, label: 'normalizando categorías y monedas…' },
        { delay: 900, label: 'detectando duplicados y reembolsos…' },
        { delay: 800, label: 'cruzando contra extractos bancarios…' },
        { delay: 700, label: 'aplicando reglas fiscales locales…' }
      ],
      run: () => `<b>Audit accounting 2024:</b><br>
        • 3.012 transacciones procesadas (Stripe + PayPal + Wise).<br>
        • 14 categorizaciones erróneas corregidas.<br>
        • 3 deducciones perdidas recuperadas ($1.847).<br>
        • Reconciliación bancaria: ✓ todo cuadra (±0,02€).<br>
        • Tax-loss harvesting sugerido: $4.200.<br>
        <span class="text-success">Tiempo: 2h. Ahorro: $5.800 vs firma + $1.847 recuperados.</span>`
    },
    {
      id: 'exec-report',
      name: 'Reporte ejecutivo',
      icon: '📊',
      desc: 'KPIs cruzados, formato 1 página',
      cost: '$0 (incluido)', alt: '$1.500 (consultor)',
      steps: [
        { delay: 500, label: 'pulling Notion + Stripe + GA + Substack…' },
        { delay: 600, label: 'normalizando semanas y calculando deltas…' },
        { delay: 500, label: 'identificando outliers y narrativas…' }
      ],
      run: () => `<b>Reporte ejecutivo Q:</b><br>
        • Revenue: +18% QoQ (+8% YoY).<br>
        • Burn: -22% vs Q anterior, runway 14 meses.<br>
        • NPS: 47 (sube de 38).<br>
        <b>Victoria:</b> nueva curva de retención post-onboarding rediseñado.<br>
        <b>Alerta:</b> CAC en EU subió 31% — auditar canales pagos.<br>
        <b>Acción:</b> mover 30% del budget paid a partnerships orgánicos.`
    },
    {
      id: 'investor-update',
      name: 'Investor update',
      icon: '📈',
      desc: 'Update mensual estilo "Lighthouse" en 1 click',
      cost: '$0 (incluido)', alt: '6h founders + $500 CFO',
      steps: [
        { delay: 500, label: 'pulling MRR, churn, NPS de tracker…' },
        { delay: 700, label: 'cruzando con burn y runway…' },
        { delay: 600, label: 'identificando wins/lows/asks de las notas…' },
        { delay: 500, label: 'redactando en tono concise + métricas duras…' }
      ],
      run: () => `<b>Investor update — Noviembre:</b><br>
        <b>Top of funnel</b>: visitas +24%, signups +18%, conversion 4.1%.<br>
        <b>Revenue</b>: MRR $14.200 (+11% MoM), 47 clientes paying, ARR $170k.<br>
        <b>Salud</b>: churn 2.1% (logo), NRR 108%, NPS 52.<br>
        <b>Wins</b>: lanzado tier Business, primer cliente enterprise ($500/mo).<br>
        <b>Lows</b>: CAC subió a $340 (canales pagos saturados).<br>
        <b>Asks</b>: warm intro a 3 fondos seed, feedback sobre pricing Business.<br>
        <b>Runway</b>: 11 meses al burn actual.<br>
        <span class="text-success">Tiempo: 3min. Comparado con 6h+ founders + draft del CFO.</span>`
    },
    {
      id: 'pricing-analysis',
      name: 'Análisis de pricing',
      icon: '💵',
      desc: 'Compara tiers, elasticidad y propone cambios',
      cost: '$200/mes', alt: '$3.000-8.000 (consultor pricing)',
      steps: [
        { delay: 600, label: 'analizando distribución actual por tier…' },
        { delay: 800, label: 'comparando vs benchmarks de la categoría…' },
        { delay: 700, label: 'modelando elasticidad de demanda…' },
        { delay: 600, label: 'proponiendo cambios y riesgos…' }
      ],
      run: () => `<b>Análisis pricing actual:</b><br>
        • Starter $9 (62% de clientes), Pro $29 (32%), Business $99 (6%).<br>
        • Median upgrade time: Starter → Pro = 43 días.<br>
        • <b>Hallazgo:</b> Starter está infravalorado — usuarios usan funcionalidad que en competidores cuesta $19-29.<br>
        • <b>Benchmark</b>: percentil 50 de tu categoría = $14 entry tier.<br>
        <br><b>Propuesta:</b><br>
        1. Subir Starter a $14 (riesgo bajo, +$5/mo × 62 cuentas = +$300/mo).<br>
        2. Cap features de Starter más agresivo (force upgrade path).<br>
        3. Grandfather usuarios existentes 6 meses.<br>
        <span class="text-warn">Riesgo: churn temporal +1-2%. Mitigación: campaña dedicada + valor claro.</span>`
    },
    {
      id: 'churn-cohort',
      name: 'Reporte cohorte de churn',
      icon: '📉',
      desc: 'Cohort + retention curves + causa raíz',
      cost: '$200/mes', alt: '$1.500-4.000 (data analyst)',
      steps: [
        { delay: 700, label: 'extrayendo cohortes por mes de signup…' },
        { delay: 900, label: 'calculando retention day 7/14/30/90…' },
        { delay: 800, label: 'cruzando con eventos producto y soporte…' },
        { delay: 700, label: 'destilando causa raíz por cohorte…' }
      ],
      run: () => `<b>Cohort de churn — Q4:</b><br>
        <table class="text-xs font-mono mt-1">
          <tr><td class="pr-2">Cohorte</td><td class="pr-2">D7</td><td class="pr-2">D30</td><td>D90</td></tr>
          <tr><td>Sept</td><td>87%</td><td>72%</td><td>61%</td></tr>
          <tr><td>Oct</td><td>91%</td><td>78%</td><td>—</td></tr>
          <tr><td>Nov</td><td>93%</td><td>—</td><td>—</td></tr>
        </table>
        <br><b>Causa raíz Sept→Oct:</b> ✓ nuevo onboarding redujo fricción Stripe.<br>
        <b>Causa raíz Oct→Nov:</b> ✓ welcome email rediseñado mejoró D7.<br>
        <b>Riesgo Nov D30</b>: subconjunto de power users reporta lag en dashboard (1/3 de la cohorte).<br>
        <b>Acción</b>: prioridad sprint perf dashboard antes de D30 de cohorte Nov.`
    },
    {
      id: 'cross-post-adapt',
      name: 'Adapt cross-platform',
      icon: '📡',
      desc: 'Un contenido → 5 plataformas con tono nativo',
      cost: '$200/mes', alt: '4h/semana + community manager $1.500',
      steps: [
        { delay: 500, label: 'extrayendo idea central del contenido…' },
        { delay: 700, label: 'adaptando a tono Twitter (thread)…' },
        { delay: 600, label: 'adaptando a LinkedIn (carrousel)…' },
        { delay: 600, label: 'adaptando a IG (caption + alt text)…' },
        { delay: 500, label: 'sintetizando newsletter teaser…' }
      ],
      run: () => `<b>Adaptaciones del video "Vendí $4.2k en 21 días":</b><br>
        • <b>Twitter (thread 7 tweets)</b>: tweet 1 = hook con número, t2-6 = pasos, t7 = CTA al video.<br>
        • <b>LinkedIn (carrousel)</b>: slide 1 = stat, slides 2-7 = lecciones, slide 8 = CTA.<br>
        • <b>IG caption</b>: 4 párrafos, primer línea hook independiente, hashtags al final.<br>
        • <b>Newsletter teaser</b>: párrafo gancho + 3 takeaways + link al video.<br>
        <span class="text-success">Tono ajustado por plataforma. Listo para schedule.</span>`
    },
    {
      id: 'comment-triage',
      name: 'Triage de comentarios',
      icon: '💬',
      desc: 'Clasifica 200 comentarios en señal vs ruido',
      cost: '$200/mes', alt: '2h/video moderating',
      steps: [
        { delay: 600, label: 'pulling 247 comentarios del último video…' },
        { delay: 700, label: 'detectando spam + auto-promo (37 marcados)…' },
        { delay: 800, label: 'identificando preguntas legítimas (52)…' },
        { delay: 700, label: 'detectando feedback accionable (8 patrones)…' }
      ],
      run: () => `<b>Triage de 247 comentarios:</b><br>
        • <b>Spam / auto-promo</b>: 37 (hide masivo recomendado).<br>
        • <b>Preguntas legítimas</b>: 52 — top 5 con plantilla de respuesta sugerida.<br>
        • <b>Bug reports</b>: 3 (pasar a Diagnostics como /incident).<br>
        • <b>Feature requests</b>: 12 — agrupados en 2 patrones (export, bulk-actions).<br>
        • <b>Feedback emocional (positivo)</b>: 143 — destacar 2-3 testimoniales para landing.<br>
        <span class="text-success">Tiempo: 2 min. Vs 2h moderando manualmente.</span>`
    },
    {
      id: 'legal-research',
      name: 'Investigación legal',
      icon: '⚖',
      desc: 'Jurisprudencia local + risk score',
      cost: '$200/mes', alt: '$2.500 (consulta)',
      steps: [
        { delay: 700, label: 'consultando marco normativo (GDPR, AEPD)…' },
        { delay: 900, label: 'buscando sentencias relevantes 2022-2024…' },
        { delay: 800, label: 'evaluando risk score caso-específico…' },
        { delay: 600, label: 'redactando recomendaciones accionables…' }
      ],
      run: () => `<b>Investigación: GDPR + biometric data (UE):</b><br>
        • Marco: Art. 9 GDPR (datos categoría especial), AEPD guía 2023.<br>
        • Sentencias relevantes: 3 casos UE 2022-2024.<br>
        • Riesgo: <b>alto</b> sin consentimiento explícito + DPIA.<br>
        • Recomendación: contratar DPO + Privacy by Design audit antes de launch.<br>
        <span class="text-warn">Esto no sustituye a un abogado. Es preparación para que la consulta dure 30 min en vez de 3h.</span>`
    }
  ],

  init() {
    const wrap = document.getElementById('kw-list');
    if (!wrap) return;
    wrap.innerHTML = this.ACTIONS.map(a => `
      <button class="kw-action text-left w-full bg-panel2 hover:bg-border border border-border rounded p-2 transition" data-id="${a.id}">
        <div class="flex justify-between items-start">
          <div>
            <div class="font-semibold text-sm">${a.icon} ${escapeHtml(a.name)}</div>
            <div class="text-[11px] text-muted">${escapeHtml(a.desc)}</div>
          </div>
          <div class="text-right text-[10px]">
            <div class="text-success">${escapeHtml(a.cost)}</div>
            <div class="text-muted line-through">${escapeHtml(a.alt)}</div>
          </div>
        </div>
      </button>
    `).join('');
    wrap.querySelectorAll('.kw-action').forEach(b => {
      b.onclick = () => this.run(b.dataset.id);
    });
  },

  async run(id) {
    const a = this.ACTIONS.find(x => x.id === id);
    if (!a) return;
    document.querySelector('[data-tab="chat"]')?.click();
    MockAgent.log('user', `Ejecuta knowledge work: ${a.name}`, 'tú');

    // Progress por pasos. NO usamos MockAgent.log (persistiría el HTML
    // con width:0% y al reload el bar quedaría stuck). DOM transitorio
    // que se descarta al terminar; el resultado final SÍ se persiste.
    const steps = a.steps || [];
    const progressMsg = this._transientLog(
      `<b>${a.icon} ${escapeHtml(a.name)}</b> · <span class="kw-step-label">iniciando…</span><br>` +
      `<div class="kw-progress mt-1"><div class="kw-progress-bar" style="width:0%"></div></div>`);
    const labelEl = progressMsg.querySelector('.kw-step-label');
    const barEl = progressMsg.querySelector('.kw-progress-bar');

    for (let i = 0; i < steps.length; i++) {
      const step = steps[i];
      labelEl.textContent = step.label;
      barEl.style.width = `${((i + 1) / steps.length) * 100}%`;
      await new Promise(r => setTimeout(r, step.delay));
    }
    // Quita el progress transitorio antes de loguear el resultado final.
    progressMsg.remove();
    MockAgent.log('agent', a.run(), `agente · knowledge work · ${a.id}`);
  },

  // Mensaje en el chat que NO se persiste — útil para UI temporal.
  _transientLog(html) {
    const wrap = document.getElementById('chat-log');
    const div = document.createElement('div');
    div.className = 'msg msg-tool';
    div.innerHTML = html;
    wrap.appendChild(div);
    wrap.scrollTop = wrap.scrollHeight;
    return div;
  }
};
