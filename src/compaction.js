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
      if (pct >= 0.9) {
        badge.textContent = '⚠⚠ degradado · click = thread nuevo';
        badge.className = 'ml-auto mr-2 text-[10px] px-2 py-0.5 rounded-full bg-danger/20 text-danger animate-pulse cursor-pointer';
      } else if (pct >= this.threshold) {
        badge.textContent = this.auto ? '⚠ compactando…' : '⚠ click = thread nuevo';
        badge.className = 'ml-auto mr-2 text-[10px] px-2 py-0.5 rounded-full bg-warn/20 text-warn animate-pulse cursor-pointer';
      } else {
        badge.textContent = `⚠ ${Math.round(pct*100)}% · cerca del umbral`;
        badge.className = 'ml-auto mr-2 text-[10px] px-2 py-0.5 rounded-full bg-warn/15 text-warn cursor-pointer';
      }
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
