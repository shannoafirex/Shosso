// Agente simulado. No llama a un modelo real. Su job es enseñar:
//   - cuándo carga una skill (progressive disclosure)
//   - cuándo invoca memoria
//   - qué hace cuando algo falla
//   - cómo se ven los 8 pulls del weekly-report
//   - cómo cuesta cada turno en tokens reales

window.MockAgent = {
  turn: 0,

  log(role, html, meta = null) {
    const wrap = document.getElementById('chat-log');
    const div = document.createElement('div');
    div.className = `msg msg-${role}`;
    div.innerHTML = (meta ? `<div class="meta">${meta}</div>` : '') + html;
    wrap.appendChild(div);
    wrap.scrollTop = wrap.scrollHeight;
    if (role === 'agent' && window.Sycophancy) Sycophancy.wrap(div, html);
    return div;
  },

  sleep(ms) { return new Promise(r => setTimeout(r, ms)); },

  async send(userText) {
    if (!userText.trim()) return;
    this.turn++;
    this.log('user', escapeHtml(userText), 'tú');
    Context.addConversationTokens(estimateTokens(userText));

    // 0. Easter eggs — responden directamente y cierran el turno.
    if (await this._handleEasterEggs(userText)) {
      Productivity.refresh();
      Compaction.evaluate();
      return;
    }

    // 1. Recall de memoria relevante (progressive, igual que skills)
    const recalls = MemoryStore.recall(userText);
    if (recalls.length) {
      const items = recalls.map(r => `• ${escapeHtml(r.text)}`).join('<br>');
      this.log('system',
        `🧠 Recuperé <b>${recalls.length}</b> hecho(s) de memoria relevantes (+${recalls.reduce((s,r)=>s+estimateTokens(r.text),0)}t en este turno, no permanente):<br><span class="text-xs">${items}</span>`);
      Context.addConversationTokens(recalls.reduce((s, r) => s + estimateTokens(r.text), 0));
    }

    // 2. Match de skill
    const matched = this._matchSkill(userText);
    await this.sleep(220);

    if (matched) {
      await this._runSkill(matched, userText);
    } else {
      const response = this._genericReply(userText);
      this.log('agent', response, 'agente');
      Context.addConversationTokens(estimateTokens(response));
    }

    // 3. Después de cada turno: actualiza productividad y evalúa compactación
    Productivity.refresh();
    Compaction.evaluate();
  },

  async _runSkill(id, userText) {
    const skill = SkillsStore.get(id);
    this.log('system',
      `Detecté que la skill <b>${escapeHtml(skill.name)}</b> es relevante. ` +
      `Su descripción (${estimateTokens(skill.name + ': ' + skill.description)}t) ya estaba en contexto.<br>` +
      `Cargando el cuerpo: <b>+${estimateTokens(skill.body)}t</b>.`);
    if (!skill.loaded) {
      skill.loaded = true;
      SkillsStore.persist();
      SkillsStore.render();
      Context.refresh();
      Context.log(`Agente cargó skill "${skill.name}" automáticamente (+${estimateTokens(skill.body)}t).`);
    }

    // Decide si simulamos un fallo (skills jóvenes fallan más)
    const shouldFail = (skill.iterations || 0) < 2 && Math.random() < 0.6;

    await this.sleep(450);

    if (shouldFail) {
      const symptoms = {
        'sponsor-research': 'devolví "aceptar" para una empresa sin presencia verificable',
        'weekly-report': 'aborté cuando YouTube Analytics rate-limited',
        'code-structure': 'extraje un helper de 3 líneas que no aportaba nada'
      };
      const symptom = symptoms[skill.id] || 'el output no fue el esperado';
      this.log('tool',
        `<b>fail</b> · skill <code>${escapeHtml(skill.name)}</code> · iter ${skill.iterations || 0}<br>` +
        `<span class="text-warn">síntoma: ${escapeHtml(symptom)}</span>`);
      Diagnostics.capture({
        skillId: skill.id,
        symptom,
        diagnosis: 'pendiente de análisis (abre el panel "Diagnóstico de fallos")'
      });
      this.log('agent',
        `Fallé esta vez. Revisa el panel <b>Diagnóstico de fallos</b> abajo y pídele al agente un fix. Esto es exactamente el bucle recursivo del podcast.`,
        `agente · skill: ${skill.name}`);
      return;
    }

    const response = this._respondWithSkill(userText, skill);
    this.log('agent', response, `agente · skill: ${skill.name} · iter ${skill.iterations}`);
    Context.addConversationTokens(estimateTokens(response));
  },

  _matchSkill(text) {
    const t = text.toLowerCase();
    const rules = [
      { id: 'sponsor-research', keys: ['patrocinador', 'sponsor', 'auspicia', 'auspiciante'] },
      { id: 'code-structure',   keys: ['estructura', 'refactor', 'limpia el código', 'organiza el código', 'code-structure'] },
      { id: 'weekly-report',    keys: ['reporte semanal', 'weekly', 'reporte de la semana', 'reporte'] }
    ];
    for (const r of rules) {
      if (r.keys.some(k => t.includes(k))) {
        if (SkillsStore.get(r.id)) return r.id;
      }
    }
    return null;
  },

  _respondWithSkill(text, skill) {
    if (skill.id === 'weekly-report') return this._weeklyReport();
    if (skill.id === 'sponsor-research') return this._sponsorResearch();
    if (skill.id === 'code-structure') return this._codeStructure();
    return `Skill ${skill.name} ejecutada.`;
  },

  _weeklyReport() {
    const sources = [
      ['Notion', '✓', '12 entradas nuevas'],
      ['YouTube', '✓', 'vistas +12%, watch time +4%'],
      ['Dub', '✓', '4.2k clicks, CTR 8.1%'],
      ['Stripe', '✓', 'MRR +€340, churn 1.1%'],
      ['Twitter/X', '⚠ n/a', 'rate-limit (skill maneja el fallo, no aborta)'],
      ['Substack', '✓', '+38 suscriptores netos'],
      ['Gumroad', '✓', '7 ventas, top: "Skills cookbook"'],
      ['GitHub', '✓', '+22 stars, 4 PRs mergeados']
    ];
    const rows = sources.map(s => `<tr><td class="pr-2">${s[0]}</td><td class="pr-2">${s[1]}</td><td class="text-muted">${escapeHtml(s[2])}</td></tr>`).join('');
    return `Pull paralelo a las <b>8 fuentes</b>:<br>
      <table class="text-xs mt-1 font-mono">${rows}</table>
      <div class="mt-2">
        <b>Victoria:</b> watch time arriba sin cambios de calendario.<br>
        <b>Alerta:</b> churn al alza por segunda semana → revisar onboarding.<br>
        <b>Acción:</b> entrevistas con los 3 churns recientes.
      </div>`;
  },

  _sponsorResearch() {
    return `Apliqué <b>sponsor-research</b> en paralelo:<br>
      • <b>Twitter:</b> 12k seguidores, engagement medio (real).<br>
      • <b>YouTube:</b> sin canal verificable. <span class="text-warn">señal débil</span><br>
      • <b>Trustpilot:</b> 3.1 ★ (87 reseñas, varias quejas de soporte). <span class="text-warn">señal débil</span><br>
      • <b>Crunchbase:</b> sin financiación pública.<br>
      <br><b>Veredicto:</b> rechazo (2/4 señales débiles).<br>
      Memoria consultada: política mínima de 2.000€/post — aplicada.<br>
      Anotado en hoja de cálculo. ¿Redacto declinación cortés?`;
  },

  _codeStructure() {
    return `Propuesta de reestructura siguiendo <b>code-structure</b>:<br>
      • Mover IO (fetch, localStorage) a <code>src/io/</code>.<br>
      • Consolidar <code>estimateTokens</code> y <code>formatTokens</code> en <code>src/lib/tokens.js</code>.<br>
      • Dividir <code>app.js</code> en bootstrap + listeners.<br>
      • Smoke test por módulo extraído.<br>
      <br>¿Aplico el diff?`;
  },

  _genericReply(text) {
    const lower = text.toLowerCase();

    // Patrón "you're absolutely right" inducido cuando el usuario "presiona".
    // Lo añadimos a propósito para que el detector de sycophancy se active y
    // el usuario vea el botón de "desafiar".
    if (/(por qué no|why didn'?t|deberías haber|should have)/i.test(text)) {
      return `Tienes toda la razón, perdón por la confusión. Debí haberlo verificado antes. <span class="text-muted text-xs">[Shosso detectó este patrón y debería mostrarte un botón para desafiar.]</span>`;
    }

    if (lower.includes('hola') || lower.includes('hi') || lower.includes('hey')) {
      return 'Hola. Pídeme algo concreto y, si necesito una skill, la cargaré yo mismo.';
    }
    if (lower.includes('rundown')) {
      return `<b>"Rundown"</b>… ¿Qué quieres decir con eso exactamente? <span class="text-muted text-xs">(En serio: este es el momento de The Office. Sin contexto, no puedo continuar. Aclárame.)</span>`;
    }
    if (lower.includes('skill')) {
      return 'Tienes ' + SkillsStore.skills.length + ' skills. Veo sus nombres y descripciones (eso es progressive disclosure). Si me pides algo específico, cargaré la que corresponda.';
    }
    if (lower.includes('memoria') || lower.includes('memory')) {
      return `Memoria activa: ${MemoryStore.items.length} hechos. Los recupero sólo cuando son relevantes, no en cada turno.`;
    }
    if (lower.includes('context') || lower.includes('contexto')) {
      const t = Context.total();
      return `Contexto actual: ${formatTokens(t)} de ${formatTokens(window.CTX_LIMIT)}. Si pasa el 80%, compactaré.`;
    }
    return `Entendido. Esta consulta no requiere una skill específica.<br><span class="text-muted text-xs">(Si crees que sí, dime el nombre o crea una con +Skill.)</span>`;
  },

  invokeSkill(id) {
    const s = SkillsStore.get(id);
    if (!s) return;
    document.querySelector('[data-tab="chat"]')?.click();
    this.send(`Invoca la skill ${s.name}`);
  },

  async _handleEasterEggs(text) {
    if (/(1\.?8\s*(billion|bn|b)\b|vibe[- ]?cod(e|ed|ing)|\$1\.8|1800 ?millones)/i.test(text)) {
      await this.sleep(220);
      this.log('agent',
        `🦄 Sí. Alguien vibe-codeó una app y vendió por <b>$1.800.000.000</b>. No es Monopoly, no son Carney coins — son Benjamins reales.<br>` +
        `La moraleja no es "tú vas a hacer lo mismo". Es: la frontera técnica/no-técnica se está disolviendo. La nueva habilidad es <b>orquestar skills bien</b>.<br>` +
        `<span class="text-muted text-xs">Necesitas la delusión justa para lanzar. No la tengas excesiva.</span>`,
        'agente · easter egg');
      return true;
    }
    if (/(food at home|comida en casa|descargo|download(ar)? skill)/i.test(text)) {
      await this.sleep(180);
      this.log('agent',
        `🍽 <b>"Tenemos comida en casa."</b> Antes de descargar una skill random:<br>` +
        `1. Es un vector de ataque conocido.<br>` +
        `2. No tiene el contexto de TU workflow exitoso.<br>` +
        `3. Probablemente la construyes en una tarde.<br>` +
        `Abre el constructor recursivo (Cmd/Ctrl+K) y dame instrucciones paso a paso.`,
        'agente · easter egg');
      return true;
    }
    if (/(permanent underclass|underclass permanente|me va a reemplazar|me reemplaza)/i.test(text)) {
      await this.sleep(180);
      this.log('agent',
        `🎯 <b>Permanent</b> es una palabra muy fuerte. Hay desplazamiento, sí, eso es real.<br>` +
        `Pero quien aprende a construir skills + orquestar agentes tiene una palanca, no un trabajo que se evapora.<br>` +
        `Por eso existe Shosso. <span class="text-muted text-xs">No es el discurso cool que querías oír; es el que funciona.</span>`,
        'agente · easter egg');
      return true;
    }
    if (/(20 personas|20 a[ñn]os|\$20\/?\s*mes|\$20\s*a\s*month|20 bucks)/i.test(text)) {
      await this.sleep(180);
      this.log('agent',
        `💸 Conocimiento que antes requería 20 personas durante 20 años hoy cuesta ~$20/mes.<br>` +
        `Eso es un cambio de orden de magnitud. La pregunta no es si te afecta — es si lo usas.<br>` +
        `<span class="text-muted text-xs">Y "usarlo bien" empieza por leer este chat, no por descargar 30 skills aleatorias.</span>`,
        'agente · easter egg');
      return true;
    }
    if (/(no es lo cool|not the cool|hot take|esto es aburrido|2 semanas|two weeks)/i.test(text)) {
      await this.sleep(180);
      this.log('agent',
        `🥱 Confirmo: <b>esto no es lo cool que querías oír</b>. Empezar con UN agente, vivir UN workflow, codificar UNA skill, iterar 5 veces. Toma ~<b>2 semanas</b> de fricción. Luego, vuelas. Aburrido. Funciona.`,
        'agente · easter egg');
      return true;
    }
    return false;
  }
};
