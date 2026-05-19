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

  history: [],

  compact() {
    if (Context.conversationTokens < 2000) return;
    const before = Context.conversationTokens;
    const compressed = Math.round(before * 0.3);
    const saved = before - compressed;
    Context.conversationTokens = compressed;
    // Captura un resumen mock de lo que se compactó (visible bajo demanda).
    const summary = this._summarize(before);
    this.history.unshift({
      ts: Date.now(), before, after: compressed, saved, summary
    });
    if (this.history.length > 20) this.history.pop();
    Context.log(`Compactación automática: conversación ${before}t → ${compressed}t (ahorro ${saved}t)`);
    const detailId = 'cmp-' + Date.now();
    MockAgent.log('system',
      `🗜 <b>Compactación automática</b> aplicada.<br>` +
      `Conversación: ${before}t → ${compressed}t (ahorro ${saved}t).<br>` +
      `<button data-action="show-compact" data-id="${detailId}" class="text-[10px] underline text-accent2 hover:text-accent">ver qué se compactó</button>`);
    // Asocia el handler en el último mensaje
    setTimeout(() => {
      document.querySelectorAll(`[data-id="${detailId}"]`).forEach(b => {
        b.onclick = () => this._showSummary(summary);
      });
    }, 50);
    Context.refresh();
  },

  _summarize(beforeTokens) {
    const turns = Math.max(2, Math.round(beforeTokens / 1500));
    return {
      turns,
      preserved: [
        'la última decisión del usuario',
        'la skill activa más reciente',
        'reglas duras mencionadas',
        'identificadores (ids, paths, URLs)'
      ],
      dropped: [
        'salidas de skill ya satisfechas',
        'mensajes de status repetidos',
        'invocaciones a memoria ya integradas',
        'logs de tools verbosos'
      ]
    };
  },

  _showSummary(summary) {
    const modal = document.createElement('div');
    modal.className = 'fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4';
    modal.innerHTML = `
      <div class="bg-panel border border-border rounded-lg w-full max-w-md">
        <div class="flex items-center justify-between border-b border-border px-4 py-3">
          <h3 class="font-semibold text-sm">Compactación · ${summary.turns} turnos resumidos</h3>
          <button data-close class="text-muted hover:text-white">✕</button>
        </div>
        <div class="p-4 text-xs space-y-3">
          <div>
            <div class="font-semibold text-success mb-1">✓ Preservado</div>
            <ul class="list-disc list-inside text-muted">${summary.preserved.map(p => `<li>${escapeHtml(p)}</li>`).join('')}</ul>
          </div>
          <div>
            <div class="font-semibold text-warn mb-1">↓ Resumido / descartado</div>
            <ul class="list-disc list-inside text-muted">${summary.dropped.map(p => `<li>${escapeHtml(p)}</li>`).join('')}</ul>
          </div>
          <p class="text-[10px] text-muted italic">Esto es una simulación de la heurística que usan Claude Code / Codex al comprimir.</p>
        </div>
      </div>`;
    document.body.appendChild(modal);
    modal.querySelector('[data-close]').onclick = () => modal.remove();
    modal.onclick = e => { if (e.target === modal) modal.remove(); };
  }
};
