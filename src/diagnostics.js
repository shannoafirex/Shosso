// Captura de fallos + iteración recursiva de skills.
// Del podcast: "Cuando falla, le pregunto: 'por qué fallaste? cuál fue el
// error?' Te lo dice descriptivamente. Ese fallo se lo paso de vuelta. Una
// vez lo arregla, le digo: 'con el nuevo fix, actualiza la skill para que
// esto no vuelva a pasar'."

window.Diagnostics = {
  failures: [],

  init() {
    const saved = localStorage.getItem('shosso.failures');
    this.failures = saved ? JSON.parse(saved) : [];
    this.render();
  },

  persist() { localStorage.setItem('shosso.failures', JSON.stringify(this.failures)); },

  capture(failure) {
    const item = {
      id: 'f' + Date.now(),
      date: new Date().toISOString(),
      skillId: failure.skillId,
      symptom: failure.symptom,
      diagnosis: failure.diagnosis || 'sin diagnóstico aún',
      fix: failure.fix || null,
      resolved: false
    };
    this.failures.unshift(item);
    this.persist();
    this.render();
    Context.log(`⚠ Fallo capturado en skill "${failure.skillId}": ${failure.symptom}`);
    return item;
  },

  proposeFix(failureId, fix) {
    const f = this.failures.find(x => x.id === failureId);
    if (!f) return;
    f.fix = fix;
    f.diagnosis = `agente propuso fix: ${fix}`;
    this.persist();
    this.render();
  },

  // Aplica el fix a la skill: añade un bullet a "Aprendizajes acumulados"
  // y sube el contador de iteraciones.
  applyFix(failureId) {
    const f = this.failures.find(x => x.id === failureId);
    if (!f || !f.fix) return;
    const s = SkillsStore.get(f.skillId);
    if (!s) return;

    const date = f.date.slice(0, 10);
    const learning = `- Iter ${(s.iterations || 0) + 1} (${date}): ${f.fix}`;
    if (s.body.includes('## Aprendizajes acumulados')) {
      s.body = s.body.replace(/## Aprendizajes acumulados[^\n]*\n/, (m) => m + learning + '\n');
    } else {
      s.body += `\n\n## Aprendizajes acumulados\n${learning}\n`;
    }
    s.iterations = (s.iterations || 0) + 1;
    s.failures = s.failures || [];
    s.failures.push({ date, symptom: f.symptom, fix: f.fix });
    SkillsStore.persist();
    SkillsStore.render();

    f.resolved = true;
    this.persist();
    this.render();

    Context.log(`✓ Skill "${s.name}" actualizada (iter ${s.iterations}). El fallo no debería repetirse.`);
    MockAgent.log('system',
      `Skill <b>${escapeHtml(s.name)}</b> actualizada a iter <b>${s.iterations}</b>.<br>` +
      `Nuevo aprendizaje: <i>${escapeHtml(f.fix)}</i>.<br>` +
      `<span class="text-muted text-xs">Esto es el bucle recursivo del que habla el podcast.</span>`);
    Productivity.refresh();
  },

  render() {
    const panel = document.getElementById('diagnostics-panel');
    if (!panel) return;
    if (this.failures.length === 0) {
      panel.innerHTML = `<div class="text-xs text-muted">Sin fallos registrados. Cuando una skill falle, aparecerá aquí para que la mejores.</div>
        <div class="mt-3 text-xs text-muted leading-snug">
          Truco del podcast: cuando una skill falla, NO te frustres. Pregúntale al agente <i>"por qué fallaste?"</i>. Esa respuesta es oro: alimenta el fix, y dile <i>"actualiza la skill para que no vuelva a pasar"</i>.
        </div>`;
      return;
    }
    panel.innerHTML = this.failures.map(f => {
      const skill = SkillsStore.get(f.skillId);
      return `
      <div class="bg-panel2 border ${f.resolved ? 'border-success/30' : 'border-warn/30'} rounded p-2 mb-2 text-xs">
        <div class="flex justify-between items-start">
          <div>
            <div class="font-semibold">${f.resolved ? '✓' : '⚠'} ${escapeHtml(f.skillId)} <span class="text-muted">— ${f.date.slice(0,10)}</span></div>
            <div class="text-muted mt-1">${escapeHtml(f.symptom)}</div>
          </div>
          ${f.resolved ? `<span class="text-success text-[10px] uppercase">resuelto</span>` : ''}
        </div>
        <div class="mt-2 text-[11px]">
          <div><b>Diagnóstico:</b> ${escapeHtml(f.diagnosis)}</div>
          ${f.fix ? `<div class="mt-1"><b>Fix propuesto:</b> ${escapeHtml(f.fix)}</div>` : ''}
        </div>
        ${!f.resolved ? `
          <div class="mt-2 flex gap-2">
            ${!f.fix ? `<button data-action="propose" data-id="${f.id}" class="text-[10px] px-2 py-1 rounded bg-panel hover:bg-border">Pedirle al agente un fix</button>` : ''}
            ${f.fix ? `<button data-action="apply" data-id="${f.id}" class="text-[10px] px-2 py-1 rounded bg-accent/30 text-accent hover:bg-accent/50">Aplicar a la skill (+1 iter)</button>` : ''}
          </div>
        ` : ''}
      </div>`;
    }).join('');
    panel.querySelectorAll('button[data-action]').forEach(b => {
      b.onclick = () => {
        const id = b.dataset.id;
        if (b.dataset.action === 'propose') this._askAgentForFix(id);
        if (b.dataset.action === 'apply') this.applyFix(id);
      };
    });
  },

  _askAgentForFix(id) {
    const f = this.failures.find(x => x.id === id);
    if (!f) return;
    const skill = SkillsStore.get(f.skillId);
    const proposals = {
      'sponsor-research': 'añadir check de "exposición sin dinero" como rechazo automático',
      'weekly-report': 'marcar fuente como "n/a" en lugar de abortar cuando devuelve 429',
      'code-structure': 'no extraer helpers cuando solo hay 3 ocurrencias similares'
    };
    const proposed = proposals[f.skillId] || `revisar paso donde falla "${f.symptom}"`;
    setTimeout(() => {
      this.proposeFix(id, proposed);
      MockAgent.log('agent',
        `Investigué el fallo de <b>${escapeHtml(skill?.name || f.skillId)}</b>.<br>` +
        `Síntoma: <i>${escapeHtml(f.symptom)}</i>.<br>` +
        `Propongo: <b>${escapeHtml(proposed)}</b>.<br>` +
        `Aplica el fix desde el panel de Diagnóstico para añadirlo permanentemente a la skill.`,
        `agente · diagnóstico`);
    }, 600);
  }
};
