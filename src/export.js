// Export del workspace a markdown.
// Útil para: investor updates, handoff a nuevo team member, backup,
// pegar en doc compartido. Compone un snapshot legible del estado.

window.WorkspaceExport = {
  init() {
    document.getElementById('btn-export').addEventListener('click', () => this.openModal());
  },

  // Snapshot estructurado: re-importable.
  buildJSON() {
    return {
      version: 1,
      exportedAt: Date.now(),
      shossoVersion: '0.1.0',
      skills: SkillsStore.skills,
      agents: AgentsStore.agents,
      memory: MemoryStore.items,
      plans: SafeStorage.safeGet('shosso.plans', []),
      metrics: window.Metrics ? Metrics.data : {},
      agentMd: window.SystemPromptView?.agentMd || '',
      security: SafeStorage.safeGet('shosso.security', null),
      diagnostics: window.Diagnostics?.failures || []
    };
  },

  build() {
    const now = new Date().toISOString().slice(0, 10);
    const lines = [];
    lines.push(`# Workspace snapshot · ${now}`);
    lines.push('');

    // Productividad
    const p = Productivity.computeScore();
    lines.push(`## Productividad: ${p.score}/100`);
    lines.push(`- Skills: ${p.totalSkills} (${p.battleTested} maduras)`);
    lines.push(`- Sub-agentes cableados: ${p.wiredSubs}/${p.wiredSubs + p.orphanSubs}`);
    lines.push(`- Iteraciones acumuladas: ${p.totalIterations}`);
    lines.push('');

    // Contexto
    const ctx = Context.total();
    lines.push(`## Contexto en este momento`);
    lines.push(`- Total: ${formatTokens(ctx)} / ${formatTokens(window.CTX_LIMIT)}`);
    const parts = Context.breakdown();
    for (const part of parts) {
      lines.push(`  - ${part.label}: ${formatTokens(part.tokens)}`);
    }
    lines.push('');

    // Métricas
    if (window.Metrics) {
      const summary = Metrics.summarize();
      if (summary.length > 0) {
        lines.push('## Métricas SaaS');
        for (const m of summary) {
          const deltaStr = m.delta == null ? '' : ` (${m.delta > 0 ? '+' : ''}${m.delta.toFixed(1)}%)`;
          lines.push(`- **${m.name}**: ${m.value}${m.unit ? ' ' + m.unit : ''}${deltaStr}`);
        }
        lines.push('');
      }
    }

    // Skills por tag
    lines.push('## Skills');
    const byTag = {};
    for (const s of SkillsStore.skills) {
      const tags = s.tags && s.tags.length ? s.tags : ['(sin tag)'];
      for (const tag of tags) {
        (byTag[tag] = byTag[tag] || []).push(s);
      }
    }
    for (const tag of Object.keys(byTag).sort()) {
      lines.push(`\n### ${tag}`);
      for (const s of byTag[tag]) {
        lines.push(`- **${s.name}** (iter ${s.iterations || 0}): ${s.description}`);
      }
    }
    lines.push('');

    // Agentes
    lines.push('## Agentes');
    for (const a of AgentsStore.agents) {
      const skillList = (a.skills || []).join(', ') || '(sin skills)';
      lines.push(`- **${a.name}** [${a.type}] — ${a.role}`);
      lines.push(`  - Skills: ${skillList}`);
    }
    lines.push('');

    // Planes agrupados por tag
    const plans = SafeStorage.safeGet('shosso.plans', []);
    if (plans.length > 0) {
      lines.push('## Planes recientes');
      const byTag = {};
      for (const p of plans.slice(0, 10)) {
        const tag = p.tag || '(sin área)';
        (byTag[tag] = byTag[tag] || []).push(p);
      }
      for (const tag of Object.keys(byTag).sort()) {
        lines.push(`\n### ${tag}`);
        for (const p of byTag[tag]) {
          const prs = Array.isArray(p.prs) ? p.prs : [];
          const sent = prs.filter(x => x.status === 'sent').length;
          lines.push(`- **${p.goal}** — ${sent}/${prs.length} PRs enviados`);
        }
      }
      lines.push('');
    }

    // Diagnósticos abiertos
    if (window.Diagnostics) {
      const open = Diagnostics.failures.filter(f => !f.resolved);
      if (open.length > 0) {
        lines.push('## Diagnósticos abiertos');
        for (const f of open) {
          const tag = f.skillId === '__incident__' ? '🚨 incident' : `⚠ ${f.skillId}`;
          lines.push(`- ${tag} (${f.date.slice(0, 10)}): ${f.symptom}`);
        }
        lines.push('');
      }
    }

    // Memoria
    if (MemoryStore.items.length > 0) {
      lines.push('## Memoria persistente');
      for (const m of MemoryStore.items.slice(0, 20)) {
        lines.push(`- ${m.text}`);
      }
      if (MemoryStore.items.length > 20) {
        lines.push(`- … y ${MemoryStore.items.length - 20} más`);
      }
      lines.push('');
    }

    // Compactaciones
    if (window.Compaction && Compaction.history.length > 0) {
      lines.push('## Compactaciones recientes');
      for (const c of Compaction.history.slice(0, 5)) {
        const ago = new Date(c.ts).toLocaleString();
        lines.push(`- ${ago}: ${formatTokens(c.before)} → ${formatTokens(c.after)} (${c.summary?.turns || '?'} turnos resumidos)`);
      }
      lines.push('');
    }

    lines.push(`---`);
    lines.push(`*Generado por Shosso · ${new Date().toLocaleString()}*`);
    return lines.join('\n');
  },

  openModal() {
    const md = this.build();
    const json = JSON.stringify(this.buildJSON(), null, 2);
    const modal = document.createElement('div');
    modal.className = 'fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4';
    modal.innerHTML = `
      <div class="bg-panel border border-border rounded-lg w-full max-w-3xl max-h-[90vh] flex flex-col">
        <div class="flex items-center justify-between border-b border-border px-4 py-3">
          <div>
            <h3 class="font-semibold">Workspace export</h3>
            <p class="text-xs text-muted">Markdown para humanos · JSON para re-importar.</p>
          </div>
          <button data-close class="text-muted hover:text-white">✕</button>
        </div>
        <div class="border-b border-border flex">
          <button data-mode="md" class="ex-tab flex-1 py-1.5 text-xs bg-panel2">Markdown</button>
          <button data-mode="json" class="ex-tab flex-1 py-1.5 text-xs">JSON</button>
        </div>
        <div class="flex-1 overflow-y-auto p-3">
          <textarea id="ex-content" readonly class="w-full h-full min-h-[400px] bg-bg border border-border rounded p-3 text-xs font-mono outline-none">${escapeHtml(md)}</textarea>
        </div>
        <div class="border-t border-border p-3 flex justify-between gap-2">
          <span id="ex-stats" class="text-xs text-muted self-center">${md.length.toLocaleString()} chars · ${estimateTokens(md)}t</span>
          <div class="flex gap-2">
            <button data-copy class="px-3 py-1.5 text-xs rounded bg-accent hover:bg-accent/80 text-white">Copiar</button>
            <button data-download class="px-3 py-1.5 text-xs rounded bg-panel2 hover:bg-border">Descargar</button>
            <button data-close class="px-3 py-1.5 text-xs rounded bg-panel2 hover:bg-border">Cerrar</button>
          </div>
        </div>
      </div>`;
    document.body.appendChild(modal);
    const close = () => modal.remove();
    let mode = 'md';
    const ta = modal.querySelector('#ex-content');
    const stats = modal.querySelector('#ex-stats');
    const setMode = (m) => {
      mode = m;
      modal.querySelectorAll('.ex-tab').forEach(b => b.classList.toggle('bg-panel2', b.dataset.mode === m));
      const content = m === 'md' ? md : json;
      ta.value = content;
      stats.textContent = `${content.length.toLocaleString()} chars · ${estimateTokens(content)}t · ${m.toUpperCase()}`;
    };
    modal.querySelectorAll('.ex-tab').forEach(b => b.onclick = () => setMode(b.dataset.mode));
    modal.querySelectorAll('[data-close]').forEach(b => b.onclick = close);
    modal.onclick = e => { if (e.target === modal) close(); };
    modal.querySelector('[data-copy]').onclick = async () => {
      try {
        await navigator.clipboard.writeText(mode === 'md' ? md : json);
        const btn = modal.querySelector('[data-copy]');
        const orig = btn.textContent;
        btn.textContent = '✓ copiado';
        btn.classList.add('bg-success');
        setTimeout(() => { btn.textContent = orig; btn.classList.remove('bg-success'); }, 1400);
      } catch {
        alert('Error copiando. Selecciona el texto manualmente.');
      }
    };
    modal.querySelector('[data-download]').onclick = () => {
      const content = mode === 'md' ? md : json;
      const ext = mode === 'md' ? 'md' : 'json';
      const mime = mode === 'md' ? 'text/markdown' : 'application/json';
      const blob = new Blob([content], { type: mime });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `shosso-snapshot-${new Date().toISOString().slice(0, 10)}.${ext}`;
      a.click();
      URL.revokeObjectURL(url);
    };
  }
};
