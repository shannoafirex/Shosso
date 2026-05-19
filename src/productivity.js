// Medidor de productividad vs. "verse cool".
// El podcast: "Build up your own. Scale for productivity, not for what
// looks cool. No empieces con 15 sub-agentes y 30 skills."
//
// Heurística: penaliza sub-agentes sin skills probadas; premia skills
// con iteraciones reales y memoria poblada.

window.Productivity = {
  // Recalibrado: el cap antiguo saturaba en ~70 para power users.
  // Ahora las skills maduras escalan más y se cuenta el ratio de subs con
  // skills asignadas.
  computeScore() {
    const agents = AgentsStore.agents;
    const skills = SkillsStore.skills;

    const subAgents = agents.filter(a => a.type === 'sub');
    const orphanSubs = subAgents.filter(a => (a.skills || []).length === 0);
    const wiredSubs = subAgents.length - orphanSubs.length;

    const totalIterations = skills.reduce((s, k) => s + (k.iterations || 0), 0);
    const battleTested = skills.filter(k => (k.iterations || 0) >= 3).length;
    const ratioWired = subAgents.length ? wiredSubs / subAgents.length : 1;

    // Componentes (cada uno puede dar hasta su máximo):
    const compSkills = Math.min(35, battleTested * 5 + Math.min(15, skills.length));
    const compIters  = Math.min(25, totalIterations * 1.5);
    const compMem    = Math.min(15, MemoryStore.items.length * 1.2);
    const compSubs   = Math.round(20 * ratioWired);             // hasta 20 si TODOS los subs tienen skills
    const compResolved = Diagnostics?.failures
      ? Math.min(15, Diagnostics.failures.filter(f => f.resolved).length * 2)
      : 0;

    let score = compSkills + compIters + compMem + compSubs + compResolved;
    if (subAgents.length === 0 && skills.length > 0) score = Math.max(score, 30); // baseline
    if (skills.length === 0) score = Math.min(score, 20);
    score = Math.max(0, Math.min(100, score));

    return {
      score,
      battleTested,
      orphanSubs: orphanSubs.length,
      wiredSubs,
      totalSkills: skills.length,
      totalIterations,
      breakdown: { compSkills, compIters, compMem, compSubs, compResolved }
    };
  },

  // Tipologías de aviso. Orden = prioridad (la primera que matchea se muestra).
  WARNINGS: [
    {
      id: 'orphan-subs',
      test: r => r.orphanSubs > 0,
      tone: 'warn',
      render: r => `<b>⚠ Estás escalando para verse cool.</b><br>` +
        `Tienes ${r.orphanSubs} sub-agente(s) sin skills probadas detrás. ` +
        `Construye skills primero.`
    },
    {
      id: 'no-mature',
      test: r => r.totalSkills > 0 && r.battleTested === 0,
      tone: 'warn',
      render: r => `<b>· Ninguna skill madura.</b><br>` +
        `Itera tus skills al menos 3 veces antes de tratarlas como confiables.`
    },
    {
      id: 'skills-unused',
      test: r => r.totalSkills >= 5 && r.skillsInvoked === 0,
      tone: 'warn',
      render: r => `<b>· Muchas skills, ninguna invocada.</b><br>` +
        `Tienes ${r.totalSkills} skills pero el agente no ha cargado ninguna. ` +
        `Probablemente sobran — borra las que no usas o intégralas en tu workflow.`
    },
    {
      id: 'memory-bloat',
      test: r => r.memoryCount >= 30 && r.memoryRecalled === 0,
      tone: 'warn',
      render: r => `<b>· Memoria gigante, nunca recuperada.</b><br>` +
        `${r.memoryCount} hechos en memoria pero 0 recalls. ` +
        `Si nunca son relevantes, no son memoria — son ruido.`
    },
    {
      id: 'stale-diag',
      test: r => r.staleOpenDiag > 0,
      tone: 'warn',
      render: r => `<b>· Diagnósticos viejos abiertos.</b><br>` +
        `Tienes ${r.staleOpenDiag} fallo(s) sin resolver de hace > 7 días. ` +
        `Resuélvelos o ciérralos: el bucle recursivo se rompe si los ignoras.`
    },
    {
      id: 'agentmd-bloat',
      test: r => r.agentMdTokens >= 800,
      tone: 'danger',
      render: r => `<b>⚠ agent.md desproporcionado (${r.agentMdTokens}t).</b><br>` +
        `Entra en CADA turno. Migra el contenido a skills para que sólo se cargue cuando hace falta.`
    },
    {
      id: 'compaction-spam',
      test: r => r.compactionsThisSession >= 5,
      tone: 'warn',
      render: r => `<b>· ${r.compactionsThisSession} compactaciones esta sesión.</b><br>` +
        `Demasiado churn de contexto. Considera abrir threads nuevos antes que confiar en /compact.`
    }
  ],

  refresh() {
    const r = this.computeScore();
    const enriched = this._enrich(r);
    const el = document.getElementById('productivity-score');
    if (!el) return;
    el.textContent = r.score + '/100';
    el.className = 'font-mono px-2 py-0.5 rounded cursor-pointer';
    if (r.score >= 70) el.classList.add('bg-success/20', 'text-success');
    else if (r.score >= 40) el.classList.add('bg-warn/20', 'text-warn');
    else el.classList.add('bg-danger/20', 'text-danger');

    const warn = document.getElementById('productivity-warning');
    if (!warn) return;

    // Encuentra todas las tipologías activas (top 2)
    const active = this.WARNINGS.filter(w => w.test(enriched)).slice(0, 2);
    if (active.length === 0) {
      warn.classList.add('hidden');
      return;
    }
    warn.classList.remove('hidden');
    warn.innerHTML = active.map(a => {
      const cls = a.tone === 'danger' ? 'bg-danger/10 border-danger/30 text-danger' : 'bg-warn/10 border-warn/30 text-warn';
      return `<div class="p-2 rounded border ${cls} text-xs mb-1.5">${a.render(enriched)}</div>`;
    }).join('');
  },

  _enrich(r) {
    const skillsInvoked = SkillsStore.skills.filter(s => s.loaded || (s.iterations || 0) > 0).length;
    const memoryRecalled = MemoryStore.items.reduce((sum, m) => sum + (m.recalls || 0), 0);
    const memoryCount = MemoryStore.items.length;
    const sevenDaysAgo = Date.now() - 7 * 86400000;
    const staleOpenDiag = (window.Diagnostics?.failures || [])
      .filter(f => !f.resolved && new Date(f.date).getTime() < sevenDaysAgo).length;
    const agentMdTokens = window.SystemPromptView?.agentMd
      ? estimateTokens(SystemPromptView.agentMd) : 0;
    const compactionsThisSession = (window.Compaction?.history || [])
      .filter(c => Date.now() - c.ts < 6 * 3600 * 1000).length;
    return { ...r, skillsInvoked, memoryRecalled, memoryCount, staleOpenDiag, agentMdTokens, compactionsThisSession };
  }
};
