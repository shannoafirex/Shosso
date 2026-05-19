// Captura de fallos + iteración recursiva de skills.
// Del podcast: "Cuando falla, le pregunto: 'por qué fallaste? cuál fue el
// error?' Te lo dice descriptivamente. Ese fallo se lo paso de vuelta. Una
// vez lo arregla, le digo: 'con el nuevo fix, actualiza la skill para que
// esto no vuelva a pasar'."

window.Diagnostics = {
  failures: [],

  init() {
    const saved = SafeStorage.safeGet('shosso.failures', []);
    this.failures = Array.isArray(saved) ? saved : [];
    this.render();
  },

  persist() { SafeStorage.safeSet('shosso.failures', this.failures); },

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
    if (window.Productivity) Productivity.refresh();
    // Status bar chip ⚠ (diagnósticos abiertos)
    if (window.Context) Context.refresh();
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

    // Incidents: no hay skill que actualizar. Marcamos resuelto y registramos
    // el fix como nota en la memoria (para que el agente lo recuerde).
    if (f.skillId === '__incident__') {
      f.resolved = true;
      f.resolvedAt = Date.now();
      this.persist();
      this.render();
      MemoryStore.add(`Incident resuelto (${f.date.slice(0,10)}): ${f.symptom} → fix aplicado: ${f.fix}`);
      Context.log(`✓ Incident resuelto y guardado en memoria.`);
      MockAgent.log('system',
        `🚨 Incident marcado como resuelto. El fix se guardó en memoria persistente para futura referencia.`);
      Productivity.refresh();
      return;
    }

    const s = SkillsStore.get(f.skillId);
    if (!s) {
      // Skill borrada después de capturar el fallo. Solo marcamos resuelto.
      f.resolved = true;
      this.persist();
      this.render();
      MockAgent.log('system', `Fallo marcado como resuelto. La skill ya no existe — sólo registro histórico.`);
      return;
    }

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
    // El body de la skill creció — refleja en breakdown si está loaded
    if (window.Context) Context.refresh();
  },

  filter: 'all', // all | open | resolved | <skillId>

  render() {
    const panel = document.getElementById('diagnostics-panel');
    if (!panel) return;
    let list = this.failures;
    if (this.filter === 'open') list = list.filter(f => !f.resolved);
    else if (this.filter === 'resolved') list = list.filter(f => f.resolved);
    else if (this.filter !== 'all') list = list.filter(f => f.skillId === this.filter);

    const skillOpts = [...new Set(this.failures.map(f => f.skillId))]
      .map(id => {
        const label = id === '__incident__' ? '🚨 incidents' : id;
        return `<option value="${escapeHtml(id)}">${escapeHtml(label)}</option>`;
      }).join('');
    const header = `
      <div class="flex items-center gap-2 mb-2">
        <select id="diag-filter" class="bg-panel2 border border-border rounded text-xs px-2 py-1 outline-none">
          <option value="all" ${this.filter==='all'?'selected':''}>Todos (${this.failures.length})</option>
          <option value="open" ${this.filter==='open'?'selected':''}>Abiertos (${this.failures.filter(f=>!f.resolved).length})</option>
          <option value="resolved" ${this.filter==='resolved'?'selected':''}>Resueltos (${this.failures.filter(f=>f.resolved).length})</option>
          ${skillOpts}
        </select>
        ${this.failures.some(f => f.resolved) ? `<button id="diag-archive" class="text-xs px-2 py-1 rounded bg-panel2 hover:bg-border" title="Archivar (borrar) los resueltos">archivar resueltos</button>` : ''}
      </div>`;

    if (list.length === 0) {
      panel.innerHTML = header + `<div class="text-xs text-muted">Sin entradas para el filtro actual.</div>
        <div class="mt-3 text-xs text-muted leading-snug">
          Truco del podcast: cuando una skill falla, NO te frustres. Pregúntale al agente <i>"por qué fallaste?"</i>. Esa respuesta es oro: alimenta el fix, y dile <i>"actualiza la skill para que no vuelva a pasar"</i>.
        </div>`;
      this._wireHeader();
      return;
    }
    panel.innerHTML = header + list.map(f => {
      const skill = SkillsStore.get(f.skillId);
      const isIncident = f.skillId === '__incident__';
      const icon = isIncident ? '🚨' : (f.resolved ? '✓' : '⚠');
      const sourceLabel = isIncident ? 'incident' : f.skillId;
      const borderColor = isIncident && !f.resolved
        ? 'border-danger/40'
        : f.resolved ? 'border-success/30' : 'border-warn/30';
      return `
      <div class="bg-panel2 border ${borderColor} rounded p-2 mb-2 text-xs">
        <div class="flex justify-between items-start">
          <div>
            <div class="font-semibold">${icon} ${escapeHtml(sourceLabel)} <span class="text-muted">— ${f.date.slice(0,10)}</span></div>
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
    this._wireHeader();
    panel.querySelectorAll('button[data-action]').forEach(b => {
      b.onclick = () => {
        const id = b.dataset.id;
        if (b.dataset.action === 'propose') this._askAgentForFix(id);
        if (b.dataset.action === 'apply') this.applyFix(id);
      };
    });
  },

  _wireHeader() {
    const sel = document.getElementById('diag-filter');
    if (sel) sel.onchange = e => { this.filter = e.target.value; this.render(); };
    const arch = document.getElementById('diag-archive');
    if (arch) arch.onclick = () => {
      const n = this.failures.filter(f => f.resolved).length;
      if (!confirm(`Archivar ${n} diagnósticos resueltos? (se borran del historial)`)) return;
      this.failures = this.failures.filter(f => !f.resolved);
      this.persist();
      this.render();
    };
  },

  _askAgentForFix(id) {
    const f = this.failures.find(x => x.id === id);
    if (!f) return;
    const skill = SkillsStore.get(f.skillId);
    const proposed = this._proposalFor(f);
    setTimeout(() => {
      this.proposeFix(id, proposed);
      MockAgent.log('agent',
        `Investigué el fallo de <b>${escapeHtml(skill?.name || f.skillId)}</b>.<br>` +
        `Síntoma: <i>${escapeHtml(f.symptom)}</i>.<br>` +
        `Propongo: <b>${escapeHtml(proposed)}</b>.<br>` +
        `Aplica el fix desde el panel de Diagnóstico para añadirlo permanentemente a la skill.`,
        `agente · diagnóstico`);
    }, 600);
  },

  _proposalFor(f) {
    // Si vino de dispatch paralelo, el síntoma describe ambigüedad, no la skill.
    if (/dispatch paralelo|dispatch parallel/i.test(f.symptom)) {
      return 'aclarar la tarea de dispatch en el system prompt del sub-agente (los modelos pierden contexto cuando la tarea es ambigua o genérica)';
    }
    const proposals = {
      'sponsor-research': 'añadir check de "exposición sin dinero" como rechazo automático',
      'weekly-report': 'marcar fuente como "n/a" en lugar de abortar cuando devuelve 429',
      'code-structure': 'no extraer helpers cuando solo hay 3 ocurrencias similares'
    };
    return proposals[f.skillId] || `revisar paso donde falla "${f.symptom}"`;
  }
};
