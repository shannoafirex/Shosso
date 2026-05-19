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
      run: () => `<b>Reporte ejecutivo Q:</b><br>
        • Revenue: +18% QoQ (+8% YoY).<br>
        • Burn: -22% vs Q anterior, runway 14 meses.<br>
        • NPS: 47 (sube de 38).<br>
        <b>Victoria:</b> nueva curva de retención post-onboarding rediseñado.<br>
        <b>Alerta:</b> CAC en EU subió 31% — auditar canales pagos.<br>
        <b>Acción:</b> mover 30% del budget paid a partnerships orgánicos.`
    },
    {
      id: 'legal-research',
      name: 'Investigación legal',
      icon: '⚖',
      desc: 'Jurisprudencia local + risk score',
      cost: '$200/mes', alt: '$2.500 (consulta)',
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

  run(id) {
    const a = this.ACTIONS.find(x => x.id === id);
    if (!a) return;
    document.querySelector('[data-tab="chat"]')?.click();
    MockAgent.log('user', `Ejecuta knowledge work: ${a.name}`, 'tú');
    setTimeout(() => {
      MockAgent.log('agent', a.run(), `agente · knowledge work · ${a.id}`);
    }, 500);
  }
};
