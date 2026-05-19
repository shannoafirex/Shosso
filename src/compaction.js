// Compactación de contexto.
// Del podcast: "Cuando alcanzas el límite, ves cómo Claude Code y Codex
// compactan. Es necesario porque el modelo se vuelve dumb conforme el
// contexto se llena. Entre 80-100% empieza a degradarse."

window.Compaction = {
  threshold: 0.8, // 80%
  auto: true,

  init() {
    const cb = document.getElementById('cfg-auto-compact');
    if (cb) {
      cb.addEventListener('change', e => { this.auto = e.target.checked; });
    }
  },

  // Llamado por Context tras cada cambio.
  evaluate() {
    const total = Context.total();
    const pct = total / window.CTX_LIMIT;
    const badge = document.getElementById('compaction-badge');
    if (!badge) return;
    if (pct > 0.7) {
      badge.classList.remove('hidden');
      badge.textContent = pct >= this.threshold ? '⚠ compactando…' : '⚠ compactación cerca';
    } else {
      badge.classList.add('hidden');
    }
    if (pct >= this.threshold && this.auto) this.compact();
  },

  compact() {
    if (Context.conversationTokens < 2000) return; // nada que compactar
    const before = Context.conversationTokens;
    // Comprime al 30% del tamaño actual (simulado).
    const compressed = Math.round(before * 0.3);
    const saved = before - compressed;
    Context.conversationTokens = compressed;
    Context.log(`Compactación automática: conversación ${before}t → ${compressed}t (ahorro ${saved}t)`);
    MockAgent.log('system',
      `🗜 <b>Compactación automática</b> aplicada.<br>` +
      `Conversación: ${before}t → ${compressed}t (ahorro ${saved}t).<br>` +
      `<span class="text-muted text-xs">Se preservó lo esencial; el resto fue resumido. Igual que en Claude Code/Codex.</span>`);
    Context.refresh();
  }
};
