// Real compaction: ask the LLM to summarize the conversation, replace
// the running history with a single summary message. Triggered manually
// (button) or automatically when estimated next-input exceeds threshold.
window.Compaction = {
  threshold: 0.8,
  running: false,

  async run() {
    if (this.running) return;
    if (Context.conversation.length < 4) {
      alert('Conversación corta — no hay nada que compactar.');
      return;
    }
    this.running = true;
    const btn = document.getElementById('ctx-compact');
    if (btn) { btn.disabled = true; btn.textContent = 'Compactando…'; }
    try {
      const summary = await Agent.summarizeConversation(Context.conversation);
      const kept = Context.conversation.slice(-2); // keep last user+assistant turn
      Context.conversation = [
        { role: 'user', content: `[Resumen comprimido de turnos previos]\n${summary}` },
        { role: 'assistant', content: 'Entendido, continúo a partir de aquí.' },
        ...kept
      ];
      Context.refresh();
      Agent.appendChat('system', `🗜 Conversación compactada. Resumen guardado como primer turno.`);
    } catch (err) {
      Agent.appendChat('system', `⚠ No pude compactar: ${escapeHtml(err.message)}`);
    } finally {
      this.running = false;
      if (btn) { btn.disabled = false; btn.textContent = 'Compactar (LLM resume)'; }
    }
  },

  async maybeAuto() {
    const settings = window._settings || {};
    const thr = (settings.autoCompactPct ?? 0.8);
    const est = Context.estimateNextInput();
    if (est / Context.modelLimit >= thr) {
      await this.run();
    }
  }
};
