// Tracker de métricas SaaS. Guarda series temporales por nombre.
// El usuario las actualiza con /metric <nombre> <valor>. Útil para tener
// MRR/churn/NPS visibles sin pegarlas en chat cada vez.

window.Metrics = {
  data: {}, // { name: [{ ts, value }] }
  KEY: 'shosso.metrics',

  init() {
    this.data = SafeStorage.safeGet(this.KEY, {});
  },

  persist() { SafeStorage.safeSet(this.KEY, this.data); },

  // /metric <name> <value> [unit]
  set(name, value, unit = '') {
    const key = name.toLowerCase();
    if (!this.data[key]) this.data[key] = { unit, series: [] };
    this.data[key].unit = unit || this.data[key].unit || '';
    this.data[key].series.push({ ts: Date.now(), value: Number(value) });
    // Cap a últimas 100 entradas por métrica
    if (this.data[key].series.length > 100) {
      this.data[key].series = this.data[key].series.slice(-100);
    }
    this.persist();
  },

  getLatest(name) {
    const m = this.data[name.toLowerCase()];
    if (!m || m.series.length === 0) return null;
    return m.series[m.series.length - 1];
  },

  // Cambio porcentual entre el valor más reciente y el anterior.
  delta(name) {
    const m = this.data[name.toLowerCase()];
    if (!m || m.series.length < 2) return null;
    const a = m.series[m.series.length - 2].value;
    const b = m.series[m.series.length - 1].value;
    if (a === 0) return null;
    return ((b - a) / Math.abs(a)) * 100;
  },

  // Genera HTML para mostrar en Overview / chat: { name, latest, delta, unit }
  summarize() {
    const out = [];
    for (const [name, m] of Object.entries(this.data)) {
      const latest = m.series[m.series.length - 1];
      if (!latest) continue;
      const delta = this.delta(name);
      out.push({ name, value: latest.value, unit: m.unit || '', delta, ts: latest.ts });
    }
    // Orden: las más recientemente actualizadas primero.
    out.sort((a, b) => b.ts - a.ts);
    return out;
  },

  renderInOverview() {
    const summary = this.summarize();
    if (summary.length === 0) {
      return `<div class="text-xs text-muted">Sin métricas trackeadas. Usa <code>/metric MRR 12500</code> o <code>/metric churn 2.1 %</code> para empezar.</div>`;
    }
    return `<div class="grid grid-cols-2 lg:grid-cols-3 gap-2">
      ${summary.map(m => {
        const arrow = m.delta == null ? '' : m.delta > 0.5 ? '↑' : m.delta < -0.5 ? '↓' : '→';
        const tone = m.delta == null ? 'text-muted' : (
          this._goodWhenDown(m.name) ? (m.delta > 0 ? 'text-warn' : 'text-success')
          : (m.delta > 0 ? 'text-success' : 'text-warn')
        );
        return `<div class="bg-bg border border-border rounded p-2 text-center">
          <div class="text-[10px] uppercase text-muted">${escapeHtml(m.name)}</div>
          <div class="font-mono text-lg">${this._formatVal(m.value)}${m.unit ? ' ' + escapeHtml(m.unit) : ''}</div>
          ${m.delta != null ? `<div class="text-[10px] ${tone}">${arrow} ${m.delta > 0 ? '+' : ''}${m.delta.toFixed(1)}%</div>` : ''}
        </div>`;
      }).join('')}
    </div>`;
  },

  _goodWhenDown(name) {
    // Métricas donde "más bajo = mejor" (CAC, churn, payback)
    return /churn|cac|payback|cost|p95|latency/i.test(name);
  },

  _formatVal(v) {
    if (Math.abs(v) >= 1000) return v.toLocaleString();
    if (v % 1 === 0) return String(v);
    return v.toFixed(2);
  }
};
