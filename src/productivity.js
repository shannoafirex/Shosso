// Medidor de productividad vs. "verse cool".
// El podcast: "Build up your own. Scale for productivity, not for what
// looks cool. No empieces con 15 sub-agentes y 30 skills."
//
// Heurística: penaliza sub-agentes sin skills probadas; premia skills
// con iteraciones reales y memoria poblada.

window.Productivity = {
  computeScore() {
    const agents = AgentsStore.agents;
    const skills = SkillsStore.skills;

    const subAgents = agents.filter(a => a.type === 'sub');
    const orphanSubs = subAgents.filter(a => (a.skills || []).length === 0);

    const totalIterations = skills.reduce((s, k) => s + (k.iterations || 0), 0);
    const battleTested = skills.filter(k => (k.iterations || 0) >= 3).length;

    // Score 0..100
    let score = 0;
    score += Math.min(40, battleTested * 10);                 // hasta 40 por skills maduras
    score += Math.min(20, totalIterations * 2);                // hasta 20 por iteración real
    score += Math.min(15, MemoryStore.items.length * 3);       // hasta 15 por memoria poblada
    score += subAgents.length > 0 && orphanSubs.length === 0 ? 15 : 0; // 15 si todos los subs tienen skills
    score -= orphanSubs.length * 10;                           // -10 por cada sub-agente vacío
    score -= (skills.length === 0 ? 20 : 0);                   // -20 si no tienes ninguna skill

    score = Math.max(0, Math.min(100, score));

    return {
      score,
      battleTested,
      orphanSubs: orphanSubs.length,
      totalSkills: skills.length,
      totalIterations
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
