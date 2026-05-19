// Overview del workspace + calculadora de coste.
// Para sesiones largas, el usuario quiere ver "qué tengo ahora" sin
// tener que hacer ronda por todos los paneles. Modal compacto.

window.Overview = {
  currentModal: null,

  init() {
    document.getElementById('productivity-score').addEventListener('click', () => this.open());
    document.getElementById('productivity-score').style.cursor = 'pointer';
    document.getElementById('productivity-score').title = 'Click para overview completo del workspace';
  },

  _refreshTimer: null,

  // Si el modal está abierto y el estado cambia (otra acción del usuario),
  // refresca los stats sin cerrar el modal. Debounce 400ms para evitar
  // flicker cuando Context.refresh dispara en ráfaga (turnos rápidos).
  refresh() {
    if (!this.currentModal || !document.body.contains(this.currentModal)) return;
    clearTimeout(this._refreshTimer);
    this._refreshTimer = setTimeout(() => {
      if (!this.currentModal || !document.body.contains(this.currentModal)) return;
      this.currentModal.remove();
      this.open();
    }, 400);
  },

  open() {
    const r = Productivity.computeScore();
    const ctx = Context.breakdown();
    const totalCtx = ctx.reduce((s, c) => s + c.tokens, 0);
    const skills = SkillsStore.skills;
    const loaded = skills.filter(s => s.loaded).length;
    const subs = AgentsStore.agents.filter(a => a.type === 'sub');
    const plans = JSON.parse(localStorage.getItem('shosso.plans') || '[]');
    const openDiag = window.Diagnostics ? Diagnostics.failures.filter(f => !f.resolved).length : 0;
    const resolvedDiag = window.Diagnostics ? Diagnostics.failures.filter(f => f.resolved).length : 0;

    const compactions = window.Compaction?.history?.length || 0;
    const lastCompact = window.Compaction?.history?.[0];

    const modal = document.createElement('div');
    modal.className = 'fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4';
    modal.innerHTML = `
      <div class="bg-panel border border-border rounded-lg w-full max-w-2xl max-h-[90vh] flex flex-col">
        <div class="flex items-center justify-between border-b border-border px-4 py-3">
          <div>
            <h3 class="font-semibold">Workspace overview</h3>
            <p class="text-xs text-muted">Foto del estado completo en una vista.</p>
          </div>
          <button data-close class="text-muted hover:text-white">✕</button>
        </div>
        <div class="flex-1 overflow-y-auto p-4 space-y-4 text-sm">
          <div class="grid grid-cols-2 lg:grid-cols-4 gap-2">
            ${this._statCard('Productividad', `${r.score}/100`, r.score >= 70 ? 'success' : r.score >= 40 ? 'warn' : 'danger')}
            ${this._statCard('Contexto', `${formatTokens(totalCtx)} / ${formatTokens(window.CTX_LIMIT)}`, totalCtx/window.CTX_LIMIT > 0.7 ? 'warn' : 'accent')}
            ${this._statCard('Skills', `${loaded}/${skills.length} cargadas`, 'accent2')}
            ${this._statCard('Sub-agentes', String(subs.length), subs.length ? 'accent2' : 'muted')}
            ${this._statCard('Memoria', String(MemoryStore.items.length), 'accent2')}
            ${this._statCard('Planes', String(plans.length), 'accent2')}
            ${this._statCard('Diag abiertos', String(openDiag), openDiag ? 'warn' : 'success')}
            ${this._statCard('Compactaciones', String(compactions), 'muted')}
          </div>

          <div class="border-t border-border pt-3">
            <h4 class="font-semibold text-sm mb-2">Productividad — desglose</h4>
            <div class="space-y-1 text-xs">
              ${this._barRow('Skills (cantidad + maduras)', r.breakdown.compSkills, 35)}
              ${this._barRow('Iteraciones reales', r.breakdown.compIters, 25)}
              ${this._barRow('Memoria poblada', r.breakdown.compMem, 15)}
              ${this._barRow('Sub-agentes cableados', r.breakdown.compSubs, 20)}
              ${this._barRow('Diagnósticos resueltos', r.breakdown.compResolved, 15)}
            </div>
          </div>

          <div class="border-t border-border pt-3">
            <h4 class="font-semibold text-sm mb-2">Última actividad</h4>
            <ul class="text-xs text-muted space-y-1">
              <li>${plans[0] ? `Plan más reciente: <i>${escapeHtml(plans[0].goal.slice(0,60))}…</i>` : 'Sin planes guardados'}</li>
              <li>${lastCompact ? `Última compactación: hace ${this._ago(lastCompact.ts)} · ${formatTokens(lastCompact.saved)} ahorrados` : 'Sin compactaciones'}</li>
              <li>${resolvedDiag} fallos resueltos a lo largo de la sesión</li>
            </ul>
          </div>

          <div class="border-t border-border pt-3">
            <h4 class="font-semibold text-sm mb-2">Calculadora de coste</h4>
            <p class="text-xs text-muted mb-2">Compara con alternativas humanas mencionadas en los podcasts.</p>
            <div class="grid grid-cols-2 gap-2 text-xs">
              <label class="block">
                <span class="text-muted">Subscripción mensual ($)</span>
                <input id="ov-sub" type="number" value="200" class="w-full bg-panel2 border border-border rounded px-2 py-1 mt-1 outline-none focus:border-accent" />
              </label>
              <label class="block">
                <span class="text-muted">Horas humanas evitadas / mes</span>
                <input id="ov-hours" type="number" value="20" class="w-full bg-panel2 border border-border rounded px-2 py-1 mt-1 outline-none focus:border-accent" />
              </label>
              <label class="block">
                <span class="text-muted">Tarifa profesional ($/h)</span>
                <input id="ov-rate" type="number" value="150" class="w-full bg-panel2 border border-border rounded px-2 py-1 mt-1 outline-none focus:border-accent" />
              </label>
              <label class="block">
                <span class="text-muted">Casos puntuales evitados ($)</span>
                <input id="ov-cases" type="number" value="5000" class="w-full bg-panel2 border border-border rounded px-2 py-1 mt-1 outline-none focus:border-accent" />
              </label>
            </div>
            <div id="ov-roi" class="mt-3 p-2 bg-panel2 rounded text-center"></div>
          </div>
        </div>
      </div>`;
    document.body.appendChild(modal);
    this.currentModal = modal;
    const close = () => { modal.remove(); this.currentModal = null; };
    modal.querySelector('[data-close]').onclick = close;
    modal.onclick = e => { if (e.target === modal) close(); };

    const recompute = () => {
      const sub = +modal.querySelector('#ov-sub').value || 0;
      const hours = +modal.querySelector('#ov-hours').value || 0;
      const rate = +modal.querySelector('#ov-rate').value || 0;
      const cases = +modal.querySelector('#ov-cases').value || 0;
      const monthly = hours * rate + cases;
      const net = monthly - sub;
      const roi = sub ? ((monthly - sub) / sub * 100).toFixed(0) : '∞';
      modal.querySelector('#ov-roi').innerHTML = `
        Coste mensual: <b>$${sub}</b><br>
        Valor estimado evitado: <b class="text-success">$${monthly.toLocaleString()}</b><br>
        Neto: <b class="${net > 0 ? 'text-success' : 'text-danger'}">$${net.toLocaleString()}</b> · ROI: <b>${roi}%</b>`;
    };
    modal.querySelectorAll('#ov-sub, #ov-hours, #ov-rate, #ov-cases')
      .forEach(i => i.addEventListener('input', recompute));
    recompute();
  },

  _statCard(label, value, color) {
    const colors = {
      success: 'text-success', warn: 'text-warn', danger: 'text-danger',
      accent: 'text-accent', accent2: 'text-accent2', muted: 'text-muted'
    };
    return `<div class="bg-panel2 border border-border rounded p-2 text-center">
      <div class="text-[10px] text-muted uppercase tracking-wide">${escapeHtml(label)}</div>
      <div class="font-mono font-semibold ${colors[color] || ''}">${escapeHtml(value)}</div>
    </div>`;
  },

  _barRow(label, val, max) {
    const pct = max ? Math.min(100, (val / max) * 100) : 0;
    return `<div class="flex items-center gap-2">
      <span class="w-44 text-muted">${escapeHtml(label)}</span>
      <div class="flex-1 h-1.5 bg-bg rounded overflow-hidden">
        <div class="h-full bg-gradient-to-r from-accent to-accent2" style="width:${pct}%"></div>
      </div>
      <span class="font-mono w-12 text-right">${val}/${max}</span>
    </div>`;
  },

  _ago(ts) {
    const s = Math.floor((Date.now() - ts) / 1000);
    if (s < 60) return s + 's';
    if (s < 3600) return Math.floor(s/60) + 'min';
    if (s < 86400) return Math.floor(s/3600) + 'h';
    return Math.floor(s/86400) + 'd';
  }
};
