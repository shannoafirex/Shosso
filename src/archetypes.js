// Archetypes — "qué quieres construir". Para el primer momento del IDE,
// el beginner no sabe qué skills/sub-agentes/plan necesita. Esto es el
// "start here" guiado: elige un archetype y se popula automáticamente
// (additive: NO borra tu setup actual, solo añade lo que falta).

window.Archetypes = {
  LIST: [
    {
      id: 'saas-b2b',
      name: 'SaaS B2B',
      icon: '🏢',
      tagline: 'Vendes a empresas. Sales motion + PLG.',
      skills: ['api-design', 'schema-migration', 'churn-investigation', 'pricing-experiment', 'weekly-report', 'support-triage'],
      subAgents: [
        { name: 'engineering', role: 'API, schemas, performance.', skills: ['api-design', 'schema-migration', 'code-structure'] },
        { name: 'customer-success', role: 'Onboarding + retención + soporte.', skills: ['churn-investigation', 'support-triage'] },
        { name: 'growth', role: 'Outbound + pricing + experimentos.', skills: ['pricing-experiment', 'weekly-report'] }
      ],
      memory: [
        'Modelo de pricing inicial: Starter $99, Team $299, Enterprise custom.',
        'ICP: empresas 10-50 personas, vertical específica.',
        'Sales motion: product-led growth + outbound a champions.'
      ],
      plan: {
        goal: 'Launch v1: auth + dashboard + Stripe + onboarding + analytics + landing.',
        tag: 'engineering',
        prs: [
          { title: 'PR 1: Auth + roles (Clerk)', body: 'Sign-up, sign-in, role-based middleware. Tests.' },
          { title: 'PR 2: Schema + drizzle migrations', body: 'Users, orgs, plans, usage tables. Migración inicial.' },
          { title: 'PR 3: Stripe billing + webhooks', body: 'Checkout, subscriptions, webhook handlers (signed). Test mode.' },
          { title: 'PR 4: Dashboard skeleton', body: 'Layout + nav + empty states. Lighthouse > 90.' },
          { title: 'PR 5: Onboarding wizard (3 steps)', body: 'Crear org, conectar source, primer dato. Persist progress.' },
          { title: 'PR 6: Analytics base (Posthog)', body: 'Identify + event taxonomy + onboarding funnel.' },
          { title: 'PR 7: Landing + pricing page', body: 'Hero + features + 3 tiers + FAQ. CMS opcional.' },
          { title: 'PR 8: Email lifecycle (Resend)', body: 'Welcome, day-3 nudge, billing receipts.' }
        ]
      }
    },
    {
      id: 'saas-b2c',
      name: 'SaaS B2C',
      icon: '🧑‍💻',
      tagline: 'Vendes a individuos. Tier bajo + viral loops.',
      skills: ['api-design', 'schema-migration', 'user-interview-synth', 'pricing-experiment', 'weekly-report', 'support-triage'],
      subAgents: [
        { name: 'engineering', role: 'Build + perf.', skills: ['api-design', 'schema-migration', 'code-structure'] },
        { name: 'growth', role: 'Acquisition + activation + retention.', skills: ['pricing-experiment', 'user-interview-synth', 'weekly-report'] },
        { name: 'support', role: 'Tickets + comunidad.', skills: ['support-triage'] }
      ],
      memory: [
        'Pricing: Free + $9 Pro + $29 Power.',
        'Distribución: organic SEO + paid social + community.',
        'Norte: free→paid en <14 días.'
      ],
      plan: {
        goal: 'MVP B2C lanzado: signup viral, primer "aha", upgrade path.',
        tag: 'engineering',
        prs: [
          { title: 'PR 1: Auth con social providers', body: 'Magic link + Google + Apple. Friction mínima.' },
          { title: 'PR 2: Schema users + usage limits', body: 'Track usage; free cap; soft + hard limits.' },
          { title: 'PR 3: Core feature MVP', body: 'La feature singular que justifica el producto.' },
          { title: 'PR 4: Aha-moment funnel', body: 'Activación medible en <5 min. Event triggers.' },
          { title: 'PR 5: Stripe upgrade flow', body: 'Inline upsell cuando free hit limit. Stripe.' },
          { title: 'PR 6: Viral loops', body: 'Share artifact + referral code. Track attribution.' },
          { title: 'PR 7: Public landing + SEO base', body: 'OG tags, sitemap, blog scaffold.' },
          { title: 'PR 8: Analytics + funnel dashboard', body: 'Posthog + signup→aha→paid funnel visible.' }
        ]
      }
    },
    {
      id: 'creator',
      name: 'Creator brand',
      icon: '🎬',
      tagline: 'YouTube/newsletter/podcast. Audiencia + sponsors.',
      skills: ['script-outline', 'thumbnail-iterate', 'hook-rewrite', 'sponsor-research', 'weekly-report'],
      subAgents: [
        { name: 'production', role: 'Scripts, thumbnails, hooks.', skills: ['script-outline', 'thumbnail-iterate', 'hook-rewrite'] },
        { name: 'business', role: 'Sponsors + pricing + outreach.', skills: ['sponsor-research'] },
        { name: 'audience', role: 'Métricas + comunidad + reporte.', skills: ['weekly-report'] }
      ],
      memory: [
        'Nicho específico (no "tech": elige sub-vertical).',
        'Pricing patrocinio: mínimo $2.000/post, no exposure deals.',
        'Cadencia: 1 video largo / semana + 3 shorts.'
      ],
      plan: {
        goal: 'Primeros 12 videos shipped + primer sponsor cerrado.',
        tag: 'product',
        prs: [
          { title: 'PR 1: Definir 12 ideas con hooks', body: 'Tabla de 12 títulos. Cada uno con hook draft.' },
          { title: 'PR 2: Setup studio + workflow', body: 'Mic, lighting, edit pipeline, naming convention.' },
          { title: 'PR 3: Primeros 4 videos producidos', body: 'Producción + edit + thumbnails A/B.' },
          { title: 'PR 4: Análisis retention semana 4', body: 'AVD, hook performance, ajustes.' },
          { title: 'PR 5: Outreach a 20 sponsors', body: 'Lista cualificada. Pitch templado. Track replies.' },
          { title: 'PR 6: Cerrar primer sponsor', body: 'Negociación + contract + integration en video.' },
          { title: 'PR 7: Newsletter como side-channel', body: 'Substack/beehiiv. Cross-promote video.' },
          { title: 'PR 8: Sistema de métricas semanales', body: 'Notion + dashboards. Reporte automatizado.' }
        ]
      }
    },
    {
      id: 'internal-tool',
      name: 'Tool interno',
      icon: '🔧',
      tagline: 'Para tu equipo, no para vender. Velocidad > polish.',
      skills: ['api-design', 'schema-migration', 'code-structure', 'support-triage'],
      subAgents: [
        { name: 'engineering', role: 'Build rápido, simple.', skills: ['api-design', 'schema-migration', 'code-structure'] }
      ],
      memory: [
        'Tamaño de equipo: definir.',
        'Pain point específico que resuelve.',
        'Vida útil esperada: 6m/1y/perpetual.'
      ],
      plan: {
        goal: 'Tool desplegada, equipo la usa diariamente.',
        tag: 'engineering',
        prs: [
          { title: 'PR 1: SSO con identidad corporativa', body: 'Google Workspace / Okta. Sin signup público.' },
          { title: 'PR 2: Schema de la entidad central', body: 'Solo lo que necesitas. No over-engineer.' },
          { title: 'PR 3: Vista lista + detalle', body: 'CRUD básico. Tabla con filtros. Sin paginación bonita aún.' },
          { title: 'PR 4: Integración con tool existente', body: 'API call al sistema que ya tiene la data.' },
          { title: 'PR 5: Despliegue interno', body: 'Render / Fly / Railway. URL interna.' },
          { title: 'PR 6: Onboarding rápido al equipo', body: '1 doc + 1 demo en standup.' }
        ]
      }
    },
    {
      id: 'marketplace',
      name: 'Marketplace',
      icon: '🛍',
      tagline: 'Dos lados. Chicken-and-egg + trust&safety.',
      skills: ['api-design', 'schema-migration', 'user-interview-synth', 'churn-investigation', 'support-triage'],
      subAgents: [
        { name: 'engineering', role: 'Build de los dos lados.', skills: ['api-design', 'schema-migration', 'code-structure'] },
        { name: 'supply', role: 'Adquirir + retener oferentes (sellers).', skills: ['user-interview-synth', 'churn-investigation'] },
        { name: 'demand', role: 'Adquirir + retener compradores.', skills: ['user-interview-synth', 'pricing-experiment'] },
        { name: 'trust-safety', role: 'Verificación + disputas + fraude.', skills: ['support-triage'] }
      ],
      memory: [
        'Lado más difícil: definir y atacar primero (cold start problem).',
        'Take rate inicial: típico 5-15%.',
        'Vertical específico antes de horizontal.'
      ],
      plan: {
        goal: 'Two-sided MVP: 50 sellers, 200 demand-side, primera transacción.',
        tag: 'engineering',
        prs: [
          { title: 'PR 1: Auth + roles (seller/buyer/admin)', body: 'Tres roles distintos con permisos.' },
          { title: 'PR 2: Schema listings + bookings', body: 'Listings, bookings, reviews, dispute.' },
          { title: 'PR 3: Listing CRUD para sellers', body: 'Crear/editar/pausar listing. Fotos.' },
          { title: 'PR 4: Search + filter para buyers', body: 'Lucene-lite, filter por precio/loc/categoría.' },
          { title: 'PR 5: Booking + payment escrow', body: 'Stripe Connect para pagos al seller. Hold + release.' },
          { title: 'PR 6: Reviews bilateral', body: 'Seller califica buyer y viceversa. Anti-fake.' },
          { title: 'PR 7: Trust & safety básico', body: 'Verificación email + flagging + admin queue.' },
          { title: 'PR 8: Outreach manual a 50 sellers', body: 'Cold start: NO automatices. Manual.' }
        ]
      }
    },
    {
      id: 'agency',
      name: 'Agencia',
      icon: '🤝',
      tagline: 'Servicios bajo demanda. Project-based.',
      skills: ['code-structure', 'sponsor-research', 'weekly-report'],
      subAgents: [
        { name: 'delivery', role: 'Ejecución de proyectos.', skills: ['code-structure'] },
        { name: 'biz-dev', role: 'Lead-gen + cierre.', skills: ['sponsor-research'] },
        { name: 'ops', role: 'Reporting + finanzas.', skills: ['weekly-report'] }
      ],
      memory: [
        'Pricing model: por proyecto / hora / retainer.',
        'Vertical específico: una categoría dominada > generalismo.',
        'Capacity actual: número de proyectos en paralelo.'
      ],
      plan: {
        goal: 'Primeros 3 clientes cerrados y entregados.',
        tag: 'growth',
        prs: [
          { title: 'PR 1: Landing + portfolio', body: 'Una página. Hero + casos + CTA reservar call.' },
          { title: 'PR 2: SOP de delivery', body: 'Checklist por fase. Templates de comunicación.' },
          { title: 'PR 3: Pipeline de lead-gen', body: 'Outreach concrete. 100 contactos investigados.' },
          { title: 'PR 4: Cerrar cliente 1', body: 'Demo + propuesta + contrato. Cobro 50% upfront.' },
          { title: 'PR 5: Entrega cliente 1', body: 'Ejecución + handover doc. Tiempo trackeado.' },
          { title: 'PR 6: Cliente 2 + 3 en paralelo', body: 'Capacity test: ¿puedes con 2 a la vez?' },
          { title: 'PR 7: Sistema de reporting', body: 'Notion + reporte semanal a clientes.' }
        ]
      }
    }
  ],

  init() {
    document.getElementById('btn-archetype').addEventListener('click', () => this.openPicker());
    // Auto-show la primera vez si el tour ya se cerró y no hay nada aplicado
    setTimeout(() => {
      const seen = SafeStorage.safeGet('shosso.archetype-seen', false);
      const tourSeen = localStorage.getItem('shosso.tutorial-seen');
      if (!seen && tourSeen) {
        // Sólo si el chat es solo el greeting (no engagement aún)
        const msgs = SafeStorage.safeGet('shosso.chat.history', []);
        if (msgs.length <= 2) this.openPicker();
      }
    }, 1500);
  },

  openPicker() {
    SafeStorage.safeSet('shosso.archetype-seen', true);
    const modal = document.createElement('div');
    modal.className = 'fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4';
    modal.innerHTML = `
      <div class="bg-panel border border-border rounded-lg w-full max-w-3xl max-h-[90vh] flex flex-col">
        <div class="flex items-center justify-between border-b border-border px-4 py-3">
          <div>
            <h3 class="font-semibold">¿Qué estás construyendo?</h3>
            <p class="text-xs text-muted">Elige un archetype y pre-poblamos skills, sub-agentes, memoria y plan inicial. Es <b>additive</b>: no borra nada existente.</p>
          </div>
          <button data-close class="text-muted hover:text-white">✕</button>
        </div>
        <div class="flex-1 overflow-y-auto p-4 grid grid-cols-1 md:grid-cols-2 gap-2">
          ${this.LIST.map(a => `
            <button class="arch-card text-left border border-border rounded-lg p-3 hover:border-accent hover:bg-panel2 transition" data-id="${a.id}">
              <div class="flex items-center gap-2">
                <span class="text-2xl">${a.icon}</span>
                <span class="font-semibold">${escapeHtml(a.name)}</span>
              </div>
              <p class="text-xs text-muted mt-1">${escapeHtml(a.tagline)}</p>
              <div class="flex flex-wrap gap-1 mt-2">
                <span class="text-[10px] bg-bg px-1.5 py-0.5 rounded">${a.skills.length} skills</span>
                <span class="text-[10px] bg-bg px-1.5 py-0.5 rounded">${a.subAgents.length} sub-agentes</span>
                <span class="text-[10px] bg-bg px-1.5 py-0.5 rounded">${a.plan.prs.length} PRs</span>
                <span class="text-[10px] bg-bg px-1.5 py-0.5 rounded">${a.memory.length} memorias</span>
              </div>
            </button>
          `).join('')}
        </div>
        <div class="border-t border-border p-3 flex justify-between items-center">
          <span class="text-xs text-muted">Cancelar = seguir como estás. Siempre puedes volver con el botón ✦ Archetype.</span>
          <button data-close class="px-3 py-1.5 text-xs rounded bg-panel2 hover:bg-border">Cancelar</button>
        </div>
      </div>`;
    document.body.appendChild(modal);
    const close = () => modal.remove();
    modal.querySelectorAll('[data-close]').forEach(b => b.onclick = close);
    modal.onclick = e => { if (e.target === modal) close(); };
    modal.querySelectorAll('.arch-card').forEach(c => {
      c.onclick = () => this._showDetail(c.dataset.id, modal);
    });
  },

  _showDetail(id, parentModal) {
    const a = this.LIST.find(x => x.id === id);
    if (!a) return;
    parentModal.querySelector('.arch-card[data-id="' + id + '"]')?.scrollIntoView();
    const modal = document.createElement('div');
    modal.className = 'fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4';
    modal.innerHTML = `
      <div class="bg-panel border border-border rounded-lg w-full max-w-2xl max-h-[90vh] flex flex-col">
        <div class="flex items-center justify-between border-b border-border px-4 py-3">
          <div class="flex items-center gap-2">
            <span class="text-2xl">${a.icon}</span>
            <div>
              <h3 class="font-semibold">${escapeHtml(a.name)}</h3>
              <p class="text-xs text-muted">${escapeHtml(a.tagline)}</p>
            </div>
          </div>
          <button data-close class="text-muted hover:text-white">✕</button>
        </div>
        <div class="flex-1 overflow-y-auto p-4 text-xs space-y-3">
          <div>
            <h4 class="font-semibold text-sm mb-1">Skills (${a.skills.length})</h4>
            <div class="flex flex-wrap gap-1">${a.skills.map(s => `<code class="bg-panel2 px-1.5 py-0.5 rounded text-accent2">${escapeHtml(s)}</code>`).join('')}</div>
          </div>
          <div>
            <h4 class="font-semibold text-sm mb-1">Sub-agentes (${a.subAgents.length})</h4>
            <ul class="space-y-1">${a.subAgents.map(s => `
              <li class="bg-panel2 border border-border rounded p-2">
                <b>${escapeHtml(s.name)}</b> — <span class="text-muted">${escapeHtml(s.role)}</span><br>
                <span class="text-[10px] text-muted">skills: ${s.skills.join(', ')}</span>
              </li>`).join('')}</ul>
          </div>
          <div>
            <h4 class="font-semibold text-sm mb-1">Memoria inicial</h4>
            <ul class="list-disc list-inside text-muted">${a.memory.map(m => `<li>${escapeHtml(m)}</li>`).join('')}</ul>
          </div>
          <div>
            <h4 class="font-semibold text-sm mb-1">Plan inicial (tag: ${a.plan.tag})</h4>
            <p class="text-muted italic">${escapeHtml(a.plan.goal)}</p>
            <ul class="list-disc list-inside mt-1">${a.plan.prs.map(p => `<li>${escapeHtml(p.title)}</li>`).join('')}</ul>
          </div>
        </div>
        <div class="border-t border-border p-3 flex justify-end gap-2">
          <button data-close class="px-3 py-1.5 text-xs rounded bg-panel2 hover:bg-border">Atrás</button>
          <button data-apply class="px-3 py-1.5 text-xs rounded bg-accent hover:bg-accent/80 text-white">Aplicar este archetype</button>
        </div>
      </div>`;
    document.body.appendChild(modal);
    const close = () => modal.remove();
    modal.querySelectorAll('[data-close]').forEach(b => b.onclick = close);
    modal.onclick = e => { if (e.target === modal) close(); };
    modal.querySelector('[data-apply]').onclick = () => {
      this.apply(a);
      close();
      parentModal.remove();
    };
  },

  // Aplica el archetype additive: añade skills/agentes/memoria/plan
  // que no existen ya. No clobera.
  apply(a) {
    let report = { skills: 0, agents: 0, memory: 0, plans: 0 };

    // Skills: las del archetype ya están como seed, sólo verifica que existen.
    for (const sid of a.skills) {
      if (!SkillsStore.get(sid)) {
        // Si por algún motivo no está, la creamos vacía con la descripción del seed
        const seed = (window.SEED_SKILLS || []).find(s => s.id === sid);
        if (seed) {
          SkillsStore.skills.push(structuredClone(seed));
          report.skills++;
        }
      }
    }
    SkillsStore.persist();
    SkillsStore.render();

    // Sub-agentes: skip si ya hay uno con ese nombre (case-insensitive).
    for (const s of a.subAgents) {
      const exists = AgentsStore.agents.some(
        x => x.name.toLowerCase() === s.name.toLowerCase()
      );
      if (!exists) {
        AgentsStore.add({
          id: 'arch-' + a.id + '-' + s.name + '-' + Date.now(),
          name: s.name, role: s.role, type: 'sub',
          skills: s.skills, productivityScore: 0.5
        });
        report.agents++;
      }
    }

    // Memoria: añade los que no existen exactos.
    for (const m of a.memory) {
      if (!MemoryStore.items.some(x => x.text === m)) {
        MemoryStore.items.unshift({
          id: 'mem-arch-' + Date.now() + '-' + Math.random().toString(36).slice(2, 6),
          text: m, created: Date.now(), recalls: 0
        });
        report.memory++;
      }
    }
    MemoryStore.persist();
    MemoryStore.render();

    // Plan: agregar como nuevo plan (no merge).
    const planObj = {
      id: 'p-arch-' + a.id + '-' + Date.now(),
      goal: a.plan.goal,
      plan: 'Generado desde archetype "' + a.name + '".',
      prs: a.plan.prs.map(p => ({ ...p, status: 'pending' })),
      tag: a.plan.tag,
      savedAt: Date.now()
    };
    const plans = SafeStorage.safeGet('shosso.plans', []);
    plans.unshift(planObj);
    SafeStorage.safeSet('shosso.plans', plans.slice(0, 50));
    if (window.Planner) Planner.renderRecent();
    report.plans = 1;

    // Sumario en chat
    MockAgent.log('system',
      `✦ <b>Archetype aplicado: ${escapeHtml(a.name)}</b><br>` +
      `• ${report.skills} skills añadidas · ${report.agents} sub-agentes · ${report.memory} hechos de memoria · ${report.plans} plan<br>` +
      `<span class="text-muted text-xs">Empieza por el plan: panel <b>Plan</b> → ${escapeHtml(a.plan.goal.slice(0, 60))}…</span>`);
    Context.log(`Archetype "${a.name}" aplicado.`);
    if (window.Productivity) Productivity.refresh();
  }
};
