// Modo demo. Scripted scenario que el usuario nuevo puede ver sin teclear.
// Útil para entrevistas, presentaciones, primer encuentro.
//
// Flow: cargar skill → fail → diagnóstico → fix → re-run éxito → dispatch
// paralelo → /grebloop → compactación.

window.Demo = {
  running: false,

  async run() {
    if (this.running) return;
    this.running = true;
    const $ = ms => new Promise(r => setTimeout(r, ms));

    MockAgent.log('system', `🎬 <b>Modo demo</b> activado. Mira sin teclear.`);
    await $(800);

    // 1. Skill simple
    await MockAgent.send('investiga el patrocinador acme.io');
    await $(1200);

    // 2. Skill que falla con probabilidad alta
    AgentsStore.add({
      id: 'demo-research-' + Date.now(),
      name: 'research',
      role: 'fact-checking, due diligence',
      type: 'sub',
      skills: ['sponsor-research'],
      productivityScore: 0.7
    });
    await $(500);

    // 3. Dispatch paralelo
    await Dispatcher.dispatch('analiza propuesta de auspicio: dailygrind.io, $3.500/post, 12 entregables');
    await $(800);

    // 4. /grebloop
    ReviewLoop.run('PR pequeño: nuevo endpoint /sponsors/decision');
    await $(4500);

    // 5. Knowledge work
    KnowledgeWork.run('contract-review');
    await $(900);

    MockAgent.log('system',
      `🎬 <b>Demo completada.</b> Lo que viste:<br>` +
      `1. Skill cargada con progressive disclosure<br>` +
      `2. Sub-agente creado para una vertical<br>` +
      `3. Dispatch paralelo a múltiples agentes<br>` +
      `4. /grebloop convergiendo a 5/5<br>` +
      `5. Knowledge work (revisión de contrato real)<br>` +
      `<span class="text-muted text-xs">Ya puedes seguir tú. Usa /help para ver todos los comandos.</span>`);
    this.running = false;
  }
};
