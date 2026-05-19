// Detector de anti-patrones en agent.md.
// Del podcast: "No le digas al modelo 'use react'. Lo sabe. No le digas
// 'denota dinero con el signo de dólar'. Lo sabe. No malgastes tokens en
// lo que el modelo ya domina."
//
// Cada turno, esos tokens entran. En 1.000 turnos, ~1M tokens tirados.

window.AntiPatterns = {
  RULES: [
    {
      re: /\b(use|usa|usar|using)\s+(React|Next\.?js|TypeScript|Tailwind|Vue|Angular|Svelte|Python|JavaScript|Node\.?js)\b/gi,
      reason: 'El modelo ya conoce este framework. Decirlo en cada turno es 100% desperdicio.'
    },
    {
      re: /\b(denote|denot[ae]|usa el signo)\s+.*\b(dólar|dollar|\$|euro|€)/gi,
      reason: 'El modelo formatea moneda sin que se lo digas. Confía en el modelo.'
    },
    {
      re: /\bbe (helpful|friendly|polite|nice|kind)\b/gi,
      reason: 'Los modelos son entrenados con RLHF justamente para esto. Token desperdiciado.'
    },
    {
      re: /\b(if|cuando|si)\s+(?:you|tú|no)?\s*(don'?t know|no\s+sabes|not sure|no\s+est[áa]s\s+seguro).{0,40}(say so|d[íi]lo|admite)/gi,
      reason: 'Los modelos modernos ya admiten desconocer. No necesitas instruirlo.'
    },
    {
      re: /\bthink step by step\b|\bpiensa paso a paso\b/gi,
      reason: 'Las arquitecturas actuales ya razonan internamente. Es ruido en agent.md.'
    },
    {
      re: /\byou are an? (?:expert|experienced)\b|eres (un|una) experto/gi,
      reason: 'El role-playing genérico no mejora resultados modernos. Sí: dale CONTEXTO real.'
    },
    {
      re: /\bnever (?:lie|miente)\b|\bno mientas\b|\bdon'?t hallucinate\b/gi,
      reason: 'Decirle "no mientas" no impide alucinaciones. Dale fuentes y verifica el output.'
    },
    {
      re: /\bthis (?:project|codebase) (?:uses|is built with)\b|este (?:proyecto|codebase) usa\b/gi,
      reason: 'El agente puede LEER tu codebase. No le repitas lo que ya está en los archivos.'
    }
  ],

  init() {
    const ta = document.getElementById('agentmd-body');
    if (!ta) return;
    ta.addEventListener('input', () => this.scan(ta.value));
    this.scan(ta.value);
  },

  scan(text) {
    const wrap = document.getElementById('antipatterns-warnings');
    if (!wrap) return;
    const hits = [];
    let wasted = 0;
    for (const r of this.RULES) {
      const matches = [...text.matchAll(r.re)];
      for (const m of matches) {
        hits.push({ match: m[0], reason: r.reason });
        wasted += estimateTokens(m[0]) * 4; // *4 porque queda en CADA turno
      }
    }
    if (hits.length === 0) {
      wrap.innerHTML = text.trim()
        ? '<div class="text-[11px] text-success">✓ Sin anti-patrones detectados.</div>'
        : '';
      return;
    }
    wrap.innerHTML = `
      <div class="text-[11px] text-warn font-semibold mb-1">⚠ ${hits.length} anti-patrón(es) detectados — desperdiciarán ~${wasted}t (en sólo 4 turnos):</div>
      <ul class="text-[10px] space-y-1">
        ${hits.slice(0, 8).map(h => `
          <li class="bg-warn/10 border border-warn/20 rounded p-1.5">
            <code class="font-mono text-warn">${escapeHtml(h.match)}</code><br>
            <span class="text-muted">${escapeHtml(h.reason)}</span>
          </li>
        `).join('')}
      </ul>
    `;
  }
};
