// Workflow de planificación.
// Del 2º podcast: "Genero el plan. No para el agente — para mí, como
// accountability. Después le pido que lo divida en PRs súper pequeños y
// fáciles de revisar."
//
// El planner:
//   1. Goal: estado final deseado (Slash-goal style de Codex).
//   2. Big plan: borrador inicial generado.
//   3. Breakdown: split en PRs pequeños.
//   4. Envío: cada PR al chat como tarea independiente.

window.Planner = {
  step: 0,
  draft: null,

  init() {
    document.getElementById('btn-new-plan').addEventListener('click', () => this.open());
    document.getElementById('pl-close').addEventListener('click', () => this.close());
    document.getElementById('pl-next').addEventListener('click', () => this.next());
    document.getElementById('pl-back').addEventListener('click', () => this.back());
    this.renderRecent();
  },

  open() {
    this.step = 0;
    this.draft = { id: 'p' + Date.now(), goal: '', plan: '', prs: [] };
    document.getElementById('planner-modal').classList.remove('hidden');
    this.renderStep();
  },

  close() { document.getElementById('planner-modal').classList.add('hidden'); },

  renderStep() {
    const body = document.getElementById('pl-body');
    document.getElementById('pl-step').textContent = `Paso ${this.step + 1} de 3`;

    if (this.step === 0) {
      body.innerHTML = `
        <h4 class="font-semibold">1. ¿Cuál es el estado final?</h4>
        <p class="text-muted text-xs">Como el <code>/goal</code> de Codex. Describe el END STATE, no la tarea. "App desplegada con login funcional", no "implementar login".</p>
        <textarea id="pl-goal" rows="3" placeholder="ej: usuarios pueden auspiciar mi canal pagando con Stripe, dashboard básico, emails de bienvenida"
          class="w-full bg-panel2 border border-border rounded px-2 py-1.5 text-sm">${escapeHtml(this.draft.goal)}</textarea>
      `;
    } else if (this.step === 1) {
      if (!this.draft.plan) this.draft.plan = this._draftPlan(this.draft.goal);
      body.innerHTML = `
        <h4 class="font-semibold">2. Plan completo</h4>
        <p class="text-muted text-xs">Borrador inicial. El agente <i>no piensa</i> en el contexto cuando genera planes — siempre serán demasiado grandes. Lo recortarás en el paso 3.</p>
        <textarea id="pl-plan" rows="10" class="w-full bg-panel2 border border-border rounded px-2 py-1.5 text-xs font-mono">${escapeHtml(this.draft.plan)}</textarea>
        <p class="text-xs text-muted">Tokens estimados: <span class="font-mono">${estimateTokens(this.draft.plan)}</span></p>
      `;
      document.getElementById('pl-plan').addEventListener('input', e => this.draft.plan = e.target.value);
    } else if (this.step === 2) {
      if (this.draft.prs.length === 0) this.draft.prs = this._splitIntoPRs(this.draft.plan);
      body.innerHTML = `
        <h4 class="font-semibold">3. Divide en PRs pequeños</h4>
        <p class="text-muted text-xs">Edita, añade o elimina. Regla: ningún PR debe ocupar más de 500 líneas o el review loop se rompe.</p>
        <ul id="pl-prs" class="space-y-2"></ul>
        <button id="pl-add" class="text-xs px-2 py-1 rounded bg-panel2 hover:bg-border">+ PR</button>
      `;
      this._renderPRs();
      document.getElementById('pl-add').onclick = () => {
        this.draft.prs.push({ title: 'Nuevo PR', body: '' });
        this._renderPRs();
      };
    }
  },

  _renderPRs() {
    const ul = document.getElementById('pl-prs');
    ul.innerHTML = this.draft.prs.map((p, i) => `
      <li class="bg-panel2 border border-border rounded p-2 space-y-1">
        <div class="flex justify-between items-center">
          <input data-i="${i}" data-k="title" value="${escapeHtml(p.title)}"
            class="flex-1 bg-transparent text-sm font-semibold outline-none" />
          <button data-i="${i}" data-action="remove" class="text-muted hover:text-danger text-xs">✕</button>
        </div>
        <textarea data-i="${i}" data-k="body" rows="2" placeholder="qué cambia, archivos tocados, tests"
          class="w-full bg-bg border border-border rounded px-2 py-1 text-xs outline-none">${escapeHtml(p.body)}</textarea>
        <button data-i="${i}" data-action="send" class="text-[10px] px-2 py-0.5 rounded bg-accent/20 text-accent hover:bg-accent/30">→ Enviar PR ${i+1} al agente</button>
      </li>
    `).join('');
    ul.querySelectorAll('input,textarea').forEach(el => {
      el.addEventListener('input', e => {
        const i = +e.target.dataset.i, k = e.target.dataset.k;
        this.draft.prs[i][k] = e.target.value;
      });
    });
    ul.querySelectorAll('button[data-action="remove"]').forEach(b => {
      b.onclick = () => { this.draft.prs.splice(+b.dataset.i, 1); this._renderPRs(); };
    });
    ul.querySelectorAll('button[data-action="send"]').forEach(b => {
      b.onclick = () => {
        const p = this.draft.prs[+b.dataset.i];
        this._savePlan();
        this.close();
        MockAgent.send(`Implementa este PR pequeño:\n\n**${p.title}**\n${p.body}`);
      };
    });
  },

  _draftPlan(goal) {
    return `Goal: ${goal}\n\n` +
      `Plan inicial (largo a propósito — luego cortar):\n` +
      `1. Modelo de datos + migración.\n` +
      `2. API: endpoints CRUD + auth middleware.\n` +
      `3. Lógica de negocio en service layer.\n` +
      `4. UI: páginas, formularios, estados.\n` +
      `5. Tests unitarios + smoke E2E.\n` +
      `6. Integraciones externas (pagos, email, etc.).\n` +
      `7. Deploy + monitoring.\n\n` +
      `Riesgos:\n` +
      `- Si las integraciones cambian, la API queda obsoleta.\n` +
      `- Sin tests, el review loop no converge.\n`;
  },

  _splitIntoPRs(plan) {
    const lines = plan.split('\n').filter(l => /^\d+\./.test(l.trim()));
    return lines.map((l, i) => ({
      title: `PR ${i+1}: ${l.replace(/^\d+\.\s*/, '').slice(0, 60)}`,
      body: `Implementación mínima de "${l.replace(/^\d+\.\s*/, '')}". <500 líneas. Tests incluidos.`
    }));
  },

  next() {
    if (this.step === 0) {
      this.draft.goal = document.getElementById('pl-goal').value.trim();
      if (!this.draft.goal) { alert('Define el estado final primero.'); return; }
    }
    if (this.step >= 2) { this._savePlan(); this.close(); return; }
    this.step++;
    this.renderStep();
  },

  back() {
    if (this.step === 0) { this.close(); return; }
    this.step--;
    this.renderStep();
  },

  _savePlan() {
    const saved = JSON.parse(localStorage.getItem('shosso.plans') || '[]');
    saved.unshift({ ...this.draft, savedAt: Date.now() });
    localStorage.setItem('shosso.plans', JSON.stringify(saved.slice(0, 10)));
    this.renderRecent();
    Context.log(`Plan guardado: "${this.draft.goal.slice(0, 60)}…" (${this.draft.prs.length} PRs)`);
  },

  renderRecent() {
    const wrap = document.getElementById('plans-list');
    if (!wrap) return;
    const saved = JSON.parse(localStorage.getItem('shosso.plans') || '[]');
    if (saved.length === 0) {
      wrap.innerHTML = '<div class="text-xs text-muted">Sin planes aún. El plan es para ti — accountability, no para el agente.</div>';
      return;
    }
    wrap.innerHTML = saved.map(p => `
      <div class="bg-panel2 border border-border rounded p-2 text-xs">
        <div class="font-semibold">${escapeHtml(p.goal.slice(0, 80))}</div>
        <div class="text-muted text-[10px] mt-1">${p.prs.length} PRs · ${new Date(p.savedAt).toLocaleDateString()}</div>
      </div>
    `).join('');
  }
};
