// Dispatch paralelo a sub-agentes.
// Del 2º podcast: "Los que envían 100x más rápido en 2026 no son los que
// teclean prompts en un chatbot. Son los que corren múltiples agent
// harnesses en paralelo."
//
// /dispatch <tarea> manda la tarea a todos los sub-agentes activos y los
// ejecuta en paralelo. Cada uno puede tener distinto resultado.

window.Dispatcher = {
  running: false,

  async dispatch(task) {
    if (this.running) {
      MockAgent.log('system', '/dispatch ya está en ejecución.');
      return;
    }
    const subs = AgentsStore.agents.filter(a => a.type === 'sub');
    if (subs.length === 0) {
      MockAgent.log('system',
        `No tienes sub-agentes. Añade uno desde el tab <b>Agentes</b> → "+ Sub-agente". ` +
        `Recuerda: skills primero, sub-agentes después.`);
      return;
    }
    this.running = true;
    MockAgent.log('system',
      `▶ <b>dispatch</b> a ${subs.length} sub-agente(s) en paralelo<br>` +
      `Tarea: <i>${escapeHtml(task)}</i>`);

    // Cada sub-agente recibe la tarea; tiempo y resultado varían.
    const runs = subs.map(a => this._runOne(a, task));
    const results = await Promise.all(runs);

    const ok = results.filter(r => r.ok).length;
    const fail = results.length - ok;
    MockAgent.log('system',
      `✅ dispatch completado · <span class="text-success">${ok} ok</span>` +
      (fail ? ` · <span class="text-warn">${fail} fallaron</span>` : '') +
      `<br><span class="text-muted text-xs">Esto es agentic engineering: tú decides el goal, los minions trabajan en paralelo.</span>`);
    this.running = false;
  },

  async _runOne(agent, task) {
    const startMsg = this._line(agent, '⏳ working…', 'text-muted');
    const ms = 800 + Math.random() * 1800;
    await MockAgent.sleep(ms);
    const ok = Math.random() > 0.15;
    const skill = (agent.skills || [])[0];
    if (ok) {
      const out = this._mockOutput(agent, skill, task);
      startMsg.innerHTML = `<b>[${escapeHtml(agent.name)}]</b> ✓ ${(ms/1000).toFixed(1)}s` +
        (skill ? ` · skill: <code>${escapeHtml(skill)}</code>` : '') +
        `<div class="text-muted mt-0.5">${out}</div>`;
      startMsg.className = 'text-xs';
      Context.addConversationTokens(estimateTokens(out));
    } else {
      startMsg.innerHTML = `<b>[${escapeHtml(agent.name)}]</b> ⚠ fallo tras ${(ms/1000).toFixed(1)}s — registrado en diagnóstico`;
      startMsg.className = 'text-xs text-warn';
      if (skill && SkillsStore.get(skill)) {
        Diagnostics.capture({
          skillId: skill,
          symptom: `fallo en dispatch paralelo: ${task.slice(0, 80)}`,
          diagnosis: 'el sub-agente perdió contexto o la tarea quedó ambigua para esta skill'
        });
      }
    }
    return { ok, agent: agent.name };
  },

  _mockOutput(agent, skillId, task) {
    if (skillId === 'sponsor-research') return 'veredicto: aceptar con condiciones (3/4 señales fuertes).';
    if (skillId === 'weekly-report') return 'reporte generado, posteado en Notion.';
    if (skillId === 'code-structure') return 'extraje 2 helpers, eliminé duplicación de 47 líneas.';
    return `completé tarea: ${task.slice(0, 60)}…`;
  },

  _line(agent, msg, cls = '') {
    const wrap = document.getElementById('chat-log');
    const div = document.createElement('div');
    div.className = 'msg msg-tool ' + cls;
    div.innerHTML = `<b>[${escapeHtml(agent.name)}]</b> ${msg}`;
    wrap.appendChild(div);
    wrap.scrollTop = wrap.scrollHeight;
    return div;
  }
};
