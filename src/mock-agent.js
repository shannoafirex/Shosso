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
    if (window.ChatPersistence) ChatPersistence.save(role, html, meta);
    return div;
  },

  sleep(ms) { return new Promise(r => setTimeout(r, ms)); },

  async send(userText) {
    if (!userText.trim()) return;
    this.turn++;
    this.log('user', escapeHtml(userText), 'tú');
    Context.addConversationTokens(estimateTokens(userText));

    // Comandos de barra: /grebloop, /goal, /plan
    if (await this._handleSlashCommands(userText)) {
      Productivity.refresh();
      Compaction.evaluate();
      return;
    }

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
      skill.expandOnRender = true; // visualízalo al usuario
      SkillsStore.persist();
      SkillsStore.render();
      Context.refresh();
      Context.log(`Agente cargó skill "${skill.name}" automáticamente (+${estimateTokens(skill.body)}t).`);
    }

    // Decide si simulamos un fallo. Skills jóvenes (60%), maduras (8%).
    // Las maduras también pueden fallar — así el usuario ve el flow de
    // diagnóstico aunque empiece con las seed skills.
    const iter = skill.iterations || 0;
    const failRate = iter < 2 ? 0.6 : (iter < 5 ? 0.15 : 0.08);
    const shouldFail = Math.random() < failRate;

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

  _normalize(s) {
    return (s || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
  },

  _matchSkill(text) {
    const t = this._normalize(text);
    const rules = [
      { id: 'sponsor-research', keys: ['patrocin', 'sponsor', 'auspici', 'brand deal', 'colabora'] },
      { id: 'code-structure',   keys: ['estructur', 'refactor', 'limpi', 'organiz', 'code-structure', 'reorgan', 'service layer'] },
      { id: 'weekly-report',    keys: ['reporte semanal', 'weekly', 'reporte de la semana', 'reporte', 'metricas semanales', 'kpis'] },
      { id: 'api-design',       keys: ['api', 'endpoint', 'contrato', 'contract', 'rpc', 'rest'] },
      { id: 'schema-migration', keys: ['migracion', 'migration', 'schema', 'esquema', 'drizzle', 'columna'] },
      { id: 'churn-investigation', keys: ['churn', 'cancelacion', 'cancellation', 'retencion', 'cohorte'] },
      { id: 'pricing-experiment',  keys: ['pricing', 'precio', 'tier', 'a/b', 'experimento'] },
      { id: 'user-interview-synth',keys: ['entrevista', 'interview', 'sintet', 'patron de usuario', 'usuarios dicen'] },
      { id: 'support-triage',      keys: ['ticket', 'soporte', 'support', 'queja', 'complaint', 'triage'] },
      { id: 'script-outline',      keys: ['outline', 'guion', 'script', 'estructura del video', 'video largo'] },
      { id: 'thumbnail-iterate',   keys: ['thumbnail', 'miniatura', 'portada del video'] },
      { id: 'hook-rewrite',        keys: ['hook', 'opening', 'apertura del video', 'primeros 15'] }
    ];
    for (const r of rules) {
      if (r.keys.some(k => t.includes(this._normalize(k)))) {
        if (SkillsStore.get(r.id)) return r.id;
      }
    }
    return null;
  },

  _respondWithSkill(text, skill) {
    if (skill.id === 'weekly-report') return this._weeklyReport();
    if (skill.id === 'sponsor-research') return this._sponsorResearch();
    if (skill.id === 'code-structure') return this._codeStructure();
    if (skill.id === 'api-design') return this._apiDesign();
    if (skill.id === 'schema-migration') return this._schemaMigration();
    if (skill.id === 'churn-investigation') return this._churnInvestigation();
    if (skill.id === 'pricing-experiment') return this._pricingExperiment();
    if (skill.id === 'user-interview-synth') return this._userInterviewSynth();
    if (skill.id === 'support-triage') return this._supportTriage();
    if (skill.id === 'script-outline') return this._scriptOutline();
    if (skill.id === 'thumbnail-iterate') return this._thumbnailIterate();
    if (skill.id === 'hook-rewrite') return this._hookRewrite();
    return `Skill ${skill.name} ejecutada.`;
  },

  _apiDesign() {
    return `Propuesta para <code>POST /sponsors</code>:<br>
      • Type compartido: <code>Sponsor = { id, name, email, status: 'pending'|'accepted'|'rejected', notes }</code>.<br>
      • Auth: requiere session válida + role <code>creator</code>.<br>
      • Validación: zod schema en boundary (rechaza email malformado, name &lt; 2 chars).<br>
      • Errores tipados: <code>409 SponsorExists</code>, <code>422 ValidationError</code>.<br>
      • Tests contractuales: type del frontend coincide con response de backend.`;
  },

  _schemaMigration() {
    return `Cambio: añadir <code>tier</code> a la tabla <code>customers</code>.<br>
      Clasificación: <b>aditivo</b> — una migración basta.<br>
      • Add column <code>tier VARCHAR(20) DEFAULT 'free' NOT NULL</code>.<br>
      • Index si vas a filtrar por tier: <code>CREATE INDEX CONCURRENTLY idx_customers_tier ON customers(tier)</code>.<br>
      • Test rollback: <code>DROP COLUMN tier</code> con datos backed up.<br>
      • No requiere fases. Aplica directo en staging primero.`;
  },

  _churnInvestigation() {
    return `Investigación de churn (3 cancelaciones esta semana):<br>
      • Patrón identificado: 3/3 cancelaron entre día 5-7 post-signup.<br>
      • Último happy path común: completaron onboarding pero NO conectaron Stripe.<br>
      • Tickets soporte: 1/3 abrió ticket sobre Stripe ("no encuentro el botón").<br>
      • Cohorte similar: 12% no-Stripe en día 7 → 60% churn al día 14.<br>
      <br><b>Causa:</b> fricción en conexión de Stripe — UX/Stripe.<br>
      <b>Acción:</b> revisar flow de Stripe Connect, añadir checkpoint en onboarding.`;
  },

  _pricingExperiment() {
    return `Experimento: <b>tier $9 vs $19 starter</b>.<br>
      • Hipótesis: $9 captura 2x conversiones pero 40% downgrade desde $19.<br>
      • Métrica primaria: revenue por visitante (no conversion alone).<br>
      • Guardrails: NPS no baja >3 puntos, churn no sube >0.5%.<br>
      • Muestra: 800/grupo (potencia 80%, MDE 8% revenue/visit).<br>
      • Duración: 3 semanas. Geo: US/UK/CA en cohorte nueva.<br>
      • Stop-loss: si revenue/visit baja >10% en semana 1, abortar.`;
  },

  _userInterviewSynth() {
    return `Síntesis de 14 entrevistas (week 6 de research):<br>
      • <b>Patrón 1</b> (10/14): "el dashboard tarda mucho en cargar" — performance real (p95 = 3.2s).<br>
      • <b>Patrón 2</b> (8/14): no entienden la diferencia entre tier Pro y Business.<br>
      • <b>Patrón 3</b> (6/14): quieren bulk-action en sponsors (seleccionar varios).<br>
      <br>Citas:<br>
      <i>"Espero 3 segundos cada vez que filtro, eso me saca del flow."</i><br>
      <i>"Pago Pro pero no sé qué me da que Free no."</i><br>
      <br><b>Próximos pasos:</b> A/B test mensaje pricing + sprint perf dashboard.`;
  },

  _scriptOutline() {
    return `Outline para "Cómo monté SponsorSync en 3 semanas" (target 14 min):<br>
      • <b>00:00-00:15 Hook</b>: "Vendí $4.200 en sponsorships en 21 días sin abogado. Aquí cómo."<br>
      • <b>00:15-01:30 Stakes</b>: la fricción específica que tu audiencia conoce (chasing emails, sin sistema).<br>
      • <b>01:30-04:00</b> Idea inicial + estructura del producto (incluye demo).<br>
      • <b>04:00-07:00</b> Build con AI (capturas de cursor).<br>
      • <b>07:00-09:30</b> Primer cliente — narrativa real con pricing en pantalla.<br>
      • <b>09:30-11:00 Pico retention</b>: error + recuperación.<br>
      • <b>11:00-12:30</b> Métricas y CTA suave.<br>
      • <b>12:30-14:00</b> Lecciones + "qué construir tú".`;
  },

  _thumbnailIterate() {
    return `Variantes para video "Vendí $4.2k en 21 días":<br>
      • <b>V1 Emocional</b>: tu cara mirando el laptop sorprendida + número grande "$4.2K".<br>
        Hipótesis: gana en mobile, alta emoción visible.<br>
      • <b>V2 Texto fuerte</b>: "21 días" + flecha hacia "$4.200" en fondo color marca.<br>
        Hipótesis: gana en desktop, lectura rápida.<br>
      • <b>V3 Visual</b>: laptop con stripe dashboard de pagos reales + tu logo.<br>
        Hipótesis: gana con audiencia técnica, baja sensación clickbait.<br>
      <br>Plan A/B: 48h, decisión por CTR + AVD combinado. NO por CTR solo.`;
  },

  _hookRewrite() {
    return `Hook original detectado como genérico ("hoy os enseño cómo monté…"). 3 versiones:<br>
      • <b>V1 Promesa específica</b>: "Vendí $4.200 en 21 días sin ningún abogado ni ayuda. Te muestro exactamente cómo, en orden."<br>
      • <b>V2 Reverse-reveal</b>: <i>(screenshot del Stripe dashboard)</i> "Este dashboard valió $4.200 este mes. Y lo monté yo desde cero en 3 semanas."<br>
      • <b>V3 Tension</b>: "Tres semanas atrás no sabía qué era un webhook. Hoy mi sistema procesa pagos automáticamente. Aquí está el atajo."<br>
      <br>Recomiendo V2: visual hook bate texto en YouTube. V1 si tu nicho odia clickbait.`;
  },

  _supportTriage() {
    return `Ticket #1247 triado:<br>
      • <b>Categoría:</b> bug (Stripe webhook no actualiza estado).<br>
      • <b>Severidad:</b> P1 (afecta a usuarios paying).<br>
      • <b>Logs:</b> encontrado en Sentry — error 503 en endpoint /api/webhooks/stripe.<br>
      • <b>Borrador respuesta:</b> "Hola Jordi, lo vemos. Tu pago se procesó (verificado en Stripe), reconciliamos el estado en tu cuenta en próximas horas. Te avisamos."<br>
      • <b>Acción:</b> ping #incidents (P1), parche en retry-logic del webhook.`;
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

  async _handleSlashCommands(text) {
    const m = text.trim().match(/^\/(\w+)(?:\s+(.+))?$/);
    if (!m) return false;
    const cmd = m[1].toLowerCase();
    const args = m[2] || '';

    if (cmd === 'help' || cmd === '?') {
      this.log('system',
        `<b>Comandos disponibles:</b><br>` +
        `<code>/goal &lt;end state&gt;</code> — define el estado final (estilo Codex)<br>` +
        `<code>/plan</code> — abre el Planner (goal → small PRs)<br>` +
        `<code>/grebloop [PR]</code> — auto-review hasta 5/5<br>` +
        `<code>/opensource &lt;repo&gt;</code> — clona código de un paquete<br>` +
        `<code>/newthread</code> o <code>/compact</code> — empieza thread limpio<br>` +
        `<code>/dispatch &lt;tarea&gt;</code> — manda en paralelo a todos los sub-agentes<br>` +
        `<code>/archetype</code> — picker "qué estás construyendo" (pre-popula workspace)<br>` +
        `<code>/metric &lt;nombre&gt; &lt;valor&gt; [unidad]</code> — tracker SaaS (MRR, churn, NPS…)<br>` +
        `<code>/incident &lt;descripción&gt;</code> — registra incidente de producción/cliente<br>` +
        `<code>/demo</code> — corre un escenario scripted (mira sin teclear)<br>` +
        `<code>/help</code> — esta lista<br><br>` +
        `<b>Easter eggs:</b> "rundown", "food at home", "am I cooked", "1.8 billion", "vibe vs agentic", "knowledge work", "permanent underclass", "2 semanas".`);
      return true;
    }
    if (cmd === 'grebloop') {
      ReviewLoop.run(args || 'PR actual');
      return true;
    }
    if (cmd === 'goal') {
      if (!args) {
        this.log('agent', `Uso: <code>/goal &lt;descripción del end state&gt;</code>. Define el estado final, no la tarea.`, 'agente');
        return true;
      }
      this.log('agent',
        `🎯 <b>Goal registrado.</b><br>` +
        `End state: <i>${escapeHtml(args)}</i><br>` +
        `Voy a trabajar hacia ahí. Si quieres, abre el Planner (panel <b>Plan</b>) para dividirlo en PRs pequeños.`,
        'agente · /goal');
      return true;
    }
    if (cmd === 'plan') {
      Planner.open();
      this.log('system', 'Abriendo Planner…');
      return true;
    }
    if (cmd === 'opensource') {
      const r = OpenSource.fetch(args);
      this.log(r.ok ? 'agent' : 'system', escapeHtml(r.msg), r.ok ? 'agente · opensource' : null);
      return true;
    }
    if (cmd === 'compact' || cmd === 'newthread') {
      NewThread.start();
      return true;
    }
    if (cmd === 'metric') {
      // /metric MRR 12500 [unit]
      const parts = args.split(/\s+/);
      const name = parts[0];
      const value = parts[1];
      const unit = parts.slice(2).join(' ');
      if (!name || value === undefined || isNaN(Number(value))) {
        this.log('agent', `Uso: <code>/metric &lt;nombre&gt; &lt;valor&gt; [unidad]</code>. Ej: <code>/metric MRR 12500</code> o <code>/metric churn 2.1 %</code>.`, 'agente');
        return true;
      }
      const prev = Metrics.getLatest(name);
      Metrics.set(name, value, unit);
      const delta = Metrics.delta(name);
      const deltaStr = delta == null ? '' : ` (${delta > 0 ? '+' : ''}${delta.toFixed(1)}% vs anterior)`;
      this.log('system',
        `📊 <b>${escapeHtml(name)}</b> = ${Metrics._formatVal(value)}${unit ? ' ' + escapeHtml(unit) : ''}${deltaStr}<br>` +
        `<span class="text-muted text-xs">Visible en Overview (click productivity score).</span>`);
      // Refresca Overview si está abierto
      if (window.Overview) Overview.refresh();
      return true;
    }
    if (cmd === 'incident') {
      if (!args) {
        this.log('agent', `Uso: <code>/incident &lt;descripción&gt;</code>. Registra un incidente de producción o cliente (separado de skill failures).`, 'agente');
        return true;
      }
      Diagnostics.capture({
        skillId: '__incident__',
        symptom: args,
        diagnosis: 'incidente reportado manualmente (no proviene de skill failure)'
      });
      this.log('system',
        `🚨 <b>Incidente registrado</b>: ${escapeHtml(args)}.<br>` +
        `<span class="text-muted text-xs">Visible en panel Diagnóstico bajo filtro 'abiertos'. Triage con la skill <code>support-triage</code>.</span>`);
      return true;
    }
    if (cmd === 'dispatch') {
      if (!args) {
        this.log('agent', `Uso: <code>/dispatch &lt;tarea&gt;</code>. Manda la tarea a todos los sub-agentes en paralelo.`, 'agente');
        return true;
      }
      Dispatcher.dispatch(args);
      return true;
    }
    if (cmd === 'archetype') {
      Archetypes.openPicker();
      return true;
    }
    if (cmd === 'demo') {
      Demo.run();
      return true;
    }
    return false;
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
    // Am I cooked?
    if (/(am i cooked|estoy cooked|estoy comprometido|me hackearon)/i.test(text)) {
      await this.sleep(180);
      this.log('agent',
        `🩺 Para chequearlo: abre el panel <b>Seguridad</b> → "Am I cooked?". Pega el resumen del breach (paquete, CVE, tweet) y escaneo tu workspace. ` +
        `O en chat: dime el nombre del paquete y la versión.`,
        'agente · easter egg');
      return true;
    }
    // Reference the codebase
    if (/(reference the codebase|referencia el codebase|@codebase)/i.test(text)) {
      await this.sleep(180);
      this.log('agent',
        `📚 <b>Code as context.</b> Para hacerlo bien:<br>` +
        `1. <code>opensource &lt;repo&gt;</code> en el terminal (clona el código del paquete).<br>` +
        `2. En tu prompt: "referencia el codebase repos/github.com/X" + lo que quieres construir.<br>` +
        `El agente lee el código real en vez de adivinar de docs man-made.`,
        'agente · easter egg');
      return true;
    }
    // Vibe vs agentic
    if (/(vibe cod|agentic engineer)/i.test(text)) {
      await this.sleep(180);
      this.log('agent',
        `⚔ <b>Vibe coding</b>: ofreces el thinking al agente.<br>` +
        `<b>Agentic engineering</b>: tú piensas, los minions trabajan. Skills + plan + review loop = output 100x.<br>` +
        `Shosso está diseñado para lo segundo.`,
        'agente · easter egg');
      return true;
    }
    // Svelte vs React / Convex vs Supabase (stacks codificados)
    if (/(svelte vs react|convex vs supabase|codified stack|tooling para agentes)/i.test(text)) {
      await this.sleep(180);
      this.log('agent',
        `🧰 <b>Elige stack codificado</b> (el agente entiende mejor):<br>` +
        `• Frontend: <b>Svelte</b> (HTML+TS al hueso) > React (hooks + foot-guns).<br>` +
        `• Backend: <b>Convex</b> (todo es código TS, sin dashboard) > Supabase (a veces hace falta UI).<br>` +
        `Regla: menos dashboard, más código. El agente sólo lee código.`,
        'agente · easter egg');
      return true;
    }
    // Knowledge work bullish
    if (/(knowledge work|trabajo de conocimiento|reemplazar abogado|reemplazar contable)/i.test(text)) {
      await this.sleep(180);
      this.log('agent',
        `💼 <b>Más bullish en knowledge work que en coding.</b><br>` +
        `Contratos, reportes, accounting, research legal/médico personal: el modelo ya es suficiente. Lo que falta es <b>tooling</b>.<br>` +
        `Un Claude Pro de $200/mes ahorra 5.000€ en un contrato, 6.000€ en accounting. ROI evidente.`,
        'agente · easter egg');
      return true;
    }
    // SaaS easter eggs
    if (/\b(MRR|monthly recurring|annual recurring|ARR)\b/i.test(text)) {
      await this.sleep(180);
      this.log('agent',
        `💰 <b>MRR / ARR</b> son la métrica norte de un SaaS, pero NO la única señal de salud.<br>` +
        `Lo que el dashboard tiene que mostrar contigo: MRR, churn (logo + revenue), CAC payback, LTV/CAC, NPS, NRR.<br>` +
        `Para no obsesionarte: ARR objetivo del trimestre + 1 número de calidad (NPS o retención semana 4).`,
        'agente · saas');
      return true;
    }
    if (/\b(churn|cancelaciones|cancellations)\b/i.test(text)) {
      await this.sleep(180);
      this.log('agent',
        `📉 <b>Churn</b> tiene dos sabores que la gente confunde:<br>` +
        `• <b>Logo churn</b>: cuentas que cancelan.<br>` +
        `• <b>Revenue churn</b>: dinero perdido (downgrade + cancelaciones).<br>` +
        `Para investigar churn real: invoca <code>churn-investigation</code>.<br>` +
        `Para SaaS B2B: net revenue retention (NRR) > 100% es la verdadera señal.`,
        'agente · saas');
      return true;
    }
    if (/\b(CAC|cost of acquisition|payback|LTV)\b/i.test(text)) {
      await this.sleep(180);
      this.log('agent',
        `🎯 <b>CAC payback</b> = meses para recuperar el coste de adquirir un cliente.<br>` +
        `Regla de salud: < 12 meses (B2B), < 6 meses (B2C).<br>` +
        `<b>LTV/CAC</b> > 3 es bueno; > 5 quizás estás dejando crecimiento en la mesa.<br>` +
        `Subestimación clásica: olvidar el coste del equipo de marketing en el CAC.`,
        'agente · saas');
      return true;
    }
    if (/\b(NPS|net promoter|csat)\b/i.test(text)) {
      await this.sleep(180);
      this.log('agent',
        `📊 <b>NPS</b> > 50 es excelente para SaaS; 30-50 normal; <30 hay fricción real.<br>` +
        `OJO: NPS sin texto open-ended es ruido. Los detractores te dicen QUÉ romper.<br>` +
        `Mide CSAT post-ticket de soporte, NPS trimestralmente al universo entero.`,
        'agente · saas');
      return true;
    }
    if (/\b(product[- ]market fit|PMF)\b/i.test(text)) {
      await this.sleep(180);
      this.log('agent',
        `🎯 <b>Product-market fit</b> no es un check-box, es un olor.<br>` +
        `Señales: usuarios usan sin onboarding extenso, refieren orgánicamente, churn natural <5%/mes (B2C) o <2% (B2B), demanda > supply.<br>` +
        `Pre-PMF: tiempo en construir > tiempo en hablar con usuarios = bandera roja.`,
        'agente · saas');
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
