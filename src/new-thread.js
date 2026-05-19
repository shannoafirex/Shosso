// "Start new thread" — botón explícito.
// Del 2º podcast: "Codex me dice 77%, listo, empiezo un thread nuevo.
// Incluso un dev senior de Claude Code no usa /compact — abre sesión nueva.
// Es más rápido y limpio."

window.NewThread = {
  init() {
    const badge = document.getElementById('compaction-badge');
    if (!badge) return;
    // Convertimos el badge existente en un botón clickable cuando aplica.
    badge.addEventListener('click', () => {
      if (badge.classList.contains('hidden')) return;
      this.start();
    });
    badge.style.cursor = 'pointer';
    badge.title = 'Click para iniciar un thread nuevo (preserva skills, memoria y diagnósticos)';
  },

  async start() {
    let ok = false;
    if (window.shosso?.confirm) {
      const r = await window.shosso.confirm({
        type: 'info',
        title: 'Iniciar thread nuevo',
        message: '¿Iniciar un thread limpio?',
        detail: 'Esto vacía la conversación (los tokens de chat se ponen a 0). Tus skills, memoria, agentes, diagnósticos y archivos se conservan. Es más rápido que /compact y suele dar mejor resultado.',
        buttons: ['Cancelar', 'Iniciar nuevo']
      });
      ok = r === 1;
    } else {
      ok = confirm('Iniciar un thread nuevo (limpia la conversación, conserva skills/memoria)?');
    }
    if (!ok) return;
    document.getElementById('chat-log').innerHTML = '';
    Context.conversationTokens = 0;
    Context.refresh();
    Context.log('▶ Thread nuevo iniciado. Conversación reseteada; skills y memoria intactas.');
    MockAgent.log('system',
      `▶ <b>Thread nuevo iniciado.</b> Como hacen los devs de Claude Code: <i>no /compact, abre sesión limpia</i>. Conservé tus ${SkillsStore.skills.length} skills y ${MemoryStore.items.length} hechos de memoria.`);
  }
};
