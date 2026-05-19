// Constructor recursivo de skills. Implementa el método del podcast:
//   1. Identifica el workflow.
//   2. Camina paso a paso con el agente (NO saltes a crear el skill).
//   3. Una vez has tenido al menos UNA ejecución exitosa, codifica.
//   4. Cuando falle, alimenta el fallo de vuelta y actualiza el skill.

window.SkillBuilder = {
  step: 0,
  draft: null,

  open() {
    this.step = 0;
    this.draft = {
      id: 'skill-' + Date.now(),
      name: '',
      description: '',
      body: '',
      loaded: false,
      iterations: 0,
      workflowNotes: [],
      successfulRun: false
    };
    const modal = document.getElementById('skill-builder');
    modal.classList.remove('hidden');
    // Backdrop click cierra
    modal.onclick = (e) => { if (e.target === modal) this.close(); };
    this.render();
  },

  close() {
    document.getElementById('skill-builder').classList.add('hidden');
  },

  render() {
    const body = document.getElementById('sb-body');
    const step = document.getElementById('sb-step');
    step.textContent = `Paso ${this.step + 1} de 4`;

    if (this.step === 0) {
      body.innerHTML = `
        <h4 class="font-semibold">1. Identifica el workflow</h4>
        <p class="text-muted text-xs">No empieces escribiendo el .md. Describe en una frase qué quieres que el agente haga repetidamente.</p>
        <input id="sb-name" placeholder="nombre-corto (ej: sponsor-research)" value="${escapeHtml(this.draft.name)}" class="w-full bg-panel2 border border-border rounded px-2 py-1.5 text-sm" />
        <textarea id="sb-desc" rows="3" placeholder="Descripción: cuándo debe usarse esta skill. Esta es la frase que el agente lee SIEMPRE para decidir si la necesita."
          class="w-full bg-panel2 border border-border rounded px-2 py-1.5 text-sm">${escapeHtml(this.draft.description)}</textarea>
      `;
    } else if (this.step === 1) {
      body.innerHTML = `
        <h4 class="font-semibold">2. Camina con el agente</h4>
        <p class="text-muted text-xs">Antes de codificar, ejecuta el workflow tú, dándole instrucciones paso a paso al agente. Apunta cada paso que tuviste que corregirle.</p>
        <textarea id="sb-notes" rows="8" placeholder="Notas crudas: 'pedí X, falló porque…', 'tuve que decirle Y'..."
          class="w-full bg-panel2 border border-border rounded px-2 py-1.5 text-sm font-mono">${escapeHtml(this.draft.workflowNotes.join('\n'))}</textarea>
        <label class="flex items-center gap-2 text-xs mt-2">
          <input type="checkbox" id="sb-success" ${this.draft.successfulRun ? 'checked' : ''} />
          <span>Tuve al menos UNA ejecución exitosa de punta a punta</span>
        </label>
        <p class="text-warn text-xs">No avances hasta marcar esto. Codificar sin una corrida exitosa es lo que produce skills basura.</p>
      `;
    } else if (this.step === 2) {
      // Auto-genera un borrador a partir de las notas
      if (!this.draft.body) {
        this.draft.body = this._draftFromNotes();
      }
      body.innerHTML = `
        <h4 class="font-semibold">3. Codifica el skill</h4>
        <p class="text-muted text-xs">Hemos pre-rellenado el cuerpo a partir de tus notas. Edita lo necesario.</p>
        <textarea id="sb-body-text" rows="12" class="w-full bg-panel2 border border-border rounded px-2 py-1.5 text-sm font-mono">${escapeHtml(this.draft.body)}</textarea>
        <p class="text-xs text-muted">Tokens estimados: <span id="sb-body-tokens" class="font-mono">${estimateTokens(this.draft.body)}</span></p>
      `;
      document.getElementById('sb-body-text').addEventListener('input', (e) => {
        document.getElementById('sb-body-tokens').textContent = estimateTokens(e.target.value);
      });
    } else if (this.step === 3) {
      const metaTokens = estimateTokens(`${this.draft.name}: ${this.draft.description}`);
      const bodyTokens = estimateTokens(this.draft.body);
      const agentMdEquivalent = metaTokens + bodyTokens;
      body.innerHTML = `
        <h4 class="font-semibold">4. Revisa el ahorro de contexto</h4>
        <p class="text-muted text-xs">Esto es lo que ahorras respecto a meter este conocimiento en un agent.md.</p>
        <div class="grid grid-cols-2 gap-2 mt-2">
          <div class="bg-panel2 rounded p-3">
            <div class="text-xs text-muted">Como skill</div>
            <div class="text-2xl font-bold text-success">${metaTokens}t</div>
            <div class="text-xs text-muted">en cada turno</div>
          </div>
          <div class="bg-panel2 rounded p-3">
            <div class="text-xs text-muted">Como agent.md</div>
            <div class="text-2xl font-bold text-danger">${agentMdEquivalent}t</div>
            <div class="text-xs text-muted">en cada turno</div>
          </div>
        </div>
        <div class="bg-panel2 rounded p-3 text-xs">
          <b>Resumen:</b><br>
          • Nombre: <code>${escapeHtml(this.draft.name)}</code><br>
          • Descripción: ${escapeHtml(this.draft.description)}<br>
          • Iteraciones planificadas: comienza en 1; sube +1 cada vez que el agente falle y actualices el body.
        </div>
        <p class="text-success text-xs">Al guardar, este skill quedará en tu lista. Cuando el agente lo necesite, cargará el body solo.</p>
      `;
    }
  },

  _draftFromNotes() {
    const notes = this.draft.workflowNotes.filter(Boolean);
    if (notes.length === 0) {
      return `# ${this.draft.name}\n\n${this.draft.description}\n\nPasos:\n1. (describe el primer paso)\n2. (...)\n\nReglas duras:\n- (regla 1)\n\nOutput esperado:\n- (qué devuelve)`;
    }
    return `# ${this.draft.name}\n\n${this.draft.description}\n\nPasos (extraídos de tu workflow real):\n` +
      notes.map((n, i) => `${i + 1}. ${n}`).join('\n') +
      `\n\nReglas duras:\n- (añade aquí las restricciones que no negocias)\n\nOutput esperado:\n- (formato de salida)`;
  },

  next() {
    // Captura inputs del paso actual
    if (this.step === 0) {
      this.draft.name = document.getElementById('sb-name').value.trim();
      this.draft.description = document.getElementById('sb-desc').value.trim();
      if (!this.draft.name || !this.draft.description) {
        alert('Necesitas nombre y descripción.');
        return;
      }
    } else if (this.step === 1) {
      this.draft.workflowNotes = document.getElementById('sb-notes').value.split('\n').filter(Boolean);
      this.draft.successfulRun = document.getElementById('sb-success').checked;
      if (!this.draft.successfulRun) {
        alert('Marca la casilla de "ejecución exitosa" o vuelve a probar el workflow con el agente.');
        return;
      }
    } else if (this.step === 2) {
      this.draft.body = document.getElementById('sb-body-text').value;
      if (!this.draft.body.trim()) {
        alert('El cuerpo del skill no puede estar vacío.');
        return;
      }
    } else if (this.step === 3) {
      // Guardar
      this.draft.iterations = 1;
      SkillsStore.add(this.draft);
      Context.log(`Skill "${this.draft.name}" creada (${estimateTokens(this.draft.body)}t en body, ${estimateTokens(this.draft.name + ': ' + this.draft.description)}t en metadata).`);
      this.close();
      return;
    }
    this.step++;
    this.render();
  },

  back() {
    if (this.step === 0) { this.close(); return; }
    this.step--;
    this.render();
  }
};
