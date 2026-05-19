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

  refresh() {
    const r = this.computeScore();
    const el = document.getElementById('productivity-score');
    if (!el) return;
    el.textContent = r.score + '/100';
    el.className = 'font-mono px-2 py-0.5 rounded';
    if (r.score >= 70) {
      el.classList.add('bg-success/20', 'text-success');
    } else if (r.score >= 40) {
      el.classList.add('bg-warn/20', 'text-warn');
    } else {
      el.classList.add('bg-danger/20', 'text-danger');
    }

    // Aviso si se está "escalando para verse cool"
    const warn = document.getElementById('productivity-warning');
    if (!warn) return;
    if (r.orphanSubs > 0) {
      warn.classList.remove('hidden');
      warn.innerHTML = `<b>⚠ Estás escalando para verse cool.</b><br>` +
        `Tienes ${r.orphanSubs} sub-agente(s) sin skills probadas detrás. ` +
        `El podcast lo advierte: construye skills antes de añadir sub-agentes.`;
    } else if (r.totalSkills > 0 && r.battleTested === 0) {
      warn.classList.remove('hidden');
      warn.innerHTML = `<b>· Ninguna skill madura.</b><br>` +
        `Itera tus skills al menos 3 veces antes de tratarlas como confiables. Una skill nueva miente igual que cualquier prompt.`;
    } else {
      warn.classList.add('hidden');
    }
  }
};
