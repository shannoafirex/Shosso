// Workspace health check. Audit accionable del estado del workspace.
// Cada check devuelve: severidad + descripción + (opcional) acción de fix.
// El usuario ejecuta los fixes con un click.

window.Health = {
  init() {
    // Trigger desde shortcut Cmd+Shift+H está ocupado por Overview;
    // este vive solo desde palette + botón en Overview.
  },

  // Devuelve { score, findings: [{ category, severity, title, fix? }] }
  audit() {
    const findings = [];

    // === Skills ===
    const skills = SkillsStore.skills;
    const subs = AgentsStore.agents.filter(a => a.type === 'sub');
    const assignedSkillIds = new Set(subs.flatMap(a => a.skills || []));
    const orphanSkills = skills.filter(s => !assignedSkillIds.has(s.id));
    const untaggedSkills = skills.filter(s => !s.tags || s.tags.length === 0);
    const zeroIterSkills = skills.filter(s => (s.iterations || 0) === 0);

    if (orphanSkills.length > 0) {
      findings.push({
        category: 'Skills',
        severity: 'info',
        title: `${orphanSkills.length} skill(s) sin asignar a ningún sub-agente`,
        detail: orphanSkills.slice(0, 5).map(s => s.name).join(', '),
        fix: orphanSkills.length <= 10 ? {
          label: 'Ver lista en panel Skills',
          action: () => document.querySelector('[data-tab="skills"]')?.click(),
          skipReaudit: true
        } : null
      });
    }

    if (untaggedSkills.length > 0) {
      findings.push({
        category: 'Skills',
        severity: 'info',
        title: `${untaggedSkills.length} skill(s) sin tag`,
        detail: 'Sin tags, no se pueden agrupar ni sugerir a sub-agentes nuevos.',
        fix: untaggedSkills.length <= 10 ? {
          label: 'Editar skills',
          action: () => document.querySelector('[data-tab="skills"]')?.click(),
          skipReaudit: true
        } : null
      });
    }

    if (zeroIterSkills.length > 0 && skills.length > 0) {
      findings.push({
        category: 'Skills',
        severity: zeroIterSkills.length / skills.length > 0.5 ? 'warn' : 'info',
        title: `${zeroIterSkills.length} skill(s) con iteración 0`,
        detail: 'Las skills sin iteraciones reales son sólo prompts disfrazados. Vívelas en un workflow.',
        fix: null
      });
    }

    // === Agentes ===
    const orphanSubs = subs.filter(a => (a.skills || []).length === 0);
    if (orphanSubs.length > 0) {
      findings.push({
        category: 'Agentes',
        severity: 'warn',
        title: `${orphanSubs.length} sub-agente(s) sin skills`,
        detail: 'Esto es "escalar para verse cool" del podcast. Asígnales skills o bórralos.',
        fix: {
          label: 'Abrir tab Agentes',
          action: () => document.querySelector('[data-tab="agents"]')?.click(),
          skipReaudit: true
        }
      });
    }

    // Sub-agentes con skills duplicadas — overlapping responsability
    const skillOwners = new Map(); // skillId -> [agentName]
    for (const a of subs) {
      for (const sid of (a.skills || [])) {
        if (!skillOwners.has(sid)) skillOwners.set(sid, []);
        skillOwners.get(sid).push(a.name);
      }
    }
    const duplicated = [...skillOwners.entries()].filter(([_, ag]) => ag.length > 1);
    if (duplicated.length > 0) {
      findings.push({
        category: 'Agentes',
        severity: 'info',
        title: `${duplicated.length} skill(s) compartidas entre sub-agentes`,
        detail: duplicated.slice(0, 3).map(([s, ags]) => `${s}: ${ags.join(' + ')}`).join('; '),
        fix: null
      });
    }

    // === Memoria ===
    const mem = MemoryStore.items;
    const neverRecalled = mem.filter(m => (m.recalls || 0) === 0);
    if (mem.length >= 10 && neverRecalled.length / mem.length > 0.7) {
      findings.push({
        category: 'Memoria',
        severity: 'warn',
        title: `${neverRecalled.length}/${mem.length} memorias nunca recuperadas`,
        detail: 'Memoria que nunca se recupera no es memoria — es ruido. Considera podar.',
        fix: {
          label: 'Abrir tab Memoria',
          action: () => document.querySelector('[data-tab="memory"]')?.click(),
          skipReaudit: true
        }
      });
    }

    const ninetyDaysAgo = Date.now() - 90 * 86400000;
    const stale = mem.filter(m => m.created < ninetyDaysAgo && (m.recalls || 0) < 2);
    if (stale.length > 0) {
      findings.push({
        category: 'Memoria',
        severity: 'info',
        title: `${stale.length} memoria(s) viejas (>90d) con <2 recalls`,
        detail: 'Posibles candidatas a archivar o reformular.',
        fix: stale.length <= 20 ? {
          label: 'Podar (eliminar)',
          action: () => {
            if (!confirm(`Borrar ${stale.length} memorias viejas sin uso?`)) return;
            // Batch: una sola persist + render + refresh en vez de 20
            const stalIds = new Set(stale.map(m => m.id));
            MemoryStore.items = MemoryStore.items.filter(m => !stalIds.has(m.id));
            MemoryStore.persist();
            MemoryStore.render();
            if (window.Productivity) Productivity.refresh();
            MockAgent.log('system', `🧹 Podadas ${stale.length} memorias inactivas.`);
          }
        } : null
      });
    }

    // === Planes ===
    const plans = SafeStorage.safeGet('shosso.plans', []);
    const stalePlans = plans.filter(p => {
      const sent = p.prs.filter(x => x.status === 'sent').length;
      return sent === 0 && (Date.now() - p.savedAt) > 14 * 86400000;
    });
    if (stalePlans.length > 0) {
      findings.push({
        category: 'Planes',
        severity: 'info',
        title: `${stalePlans.length} plan(es) sin progreso en >14 días`,
        detail: 'Si no empezaron, ¿siguen siendo válidos? Re-evalúa o archiva.',
        fix: null
      });
    }

    // === Contexto / agent.md ===
    const agentMdTokens = window.SystemPromptView?.agentMd
      ? estimateTokens(SystemPromptView.agentMd) : 0;
    if (agentMdTokens >= 800) {
      findings.push({
        category: 'Contexto',
        severity: 'danger',
        title: `agent.md = ${agentMdTokens}t (en cada turno)`,
        detail: 'Migra el contenido a skills. Si lo necesitas SIEMPRE, ya tienes una decisión deliberada — confírmalo.',
        fix: {
          label: 'Abrir tab Sistema',
          action: () => document.querySelector('[data-tab="system"]')?.click(),
          skipReaudit: true
        }
      });
    }

    // === Diagnósticos ===
    const failures = window.Diagnostics?.failures || [];
    const openOld = failures.filter(f => {
      const age = Date.now() - new Date(f.date).getTime();
      return !f.resolved && age > 7 * 86400000;
    });
    if (openOld.length > 0) {
      findings.push({
        category: 'Diagnósticos',
        severity: 'warn',
        title: `${openOld.length} fallo(s) abierto(s) hace >7 días`,
        detail: 'El bucle recursivo de skills se rompe si los ignoras.',
        fix: {
          label: 'Ver diagnósticos abiertos',
          action: () => {
            document.querySelector('.bottom-tab[data-tab="diagnostics"]')?.click();
            if (window.Diagnostics) {
              Diagnostics.filter = 'open';
              Diagnostics.render();
            }
          },
          skipReaudit: true
        }
      });
    }

    const resolvedOld = failures.filter(f => {
      if (!f.resolved) return false;
      const age = Date.now() - new Date(f.date).getTime();
      return age > 60 * 86400000;
    });
    if (resolvedOld.length > 0) {
      findings.push({
        category: 'Diagnósticos',
        severity: 'info',
        title: `${resolvedOld.length} fallo(s) resueltos >60d (candidatos a archivo)`,
        detail: 'Ya cumplieron su función pedagógica. Archivar reduce ruido.',
        fix: {
          label: 'Archivar resueltos viejos',
          action: () => {
            if (!confirm(`Archivar ${resolvedOld.length} fallos resueltos viejos?`)) return;
            window.Diagnostics.failures = window.Diagnostics.failures.filter(f => !resolvedOld.includes(f));
            window.Diagnostics.persist();
            window.Diagnostics.render();
            if (window.Productivity) Productivity.refresh();
            MockAgent.log('system', `🗂 Archivados ${resolvedOld.length} fallos resueltos.`);
          }
        }
      });
    }

    // === Métricas ===
    if (window.Metrics) {
      const summary = Metrics.summarize();
      const oldMetrics = summary.filter(m => Date.now() - m.ts > 30 * 86400000);
      if (oldMetrics.length > 0) {
        findings.push({
          category: 'Métricas',
          severity: 'info',
          title: `${oldMetrics.length} métrica(s) no actualizada(s) en >30d`,
          detail: 'Una métrica que no actualizas no informa. ¿Sigue siendo relevante?',
          fix: null
        });
      }
    }

    // === Compactaciones ===
    const compactions = window.Compaction?.history || [];
    const recentCompactions = compactions.filter(c => Date.now() - c.ts < 24 * 3600 * 1000);
    if (recentCompactions.length >= 8) {
      findings.push({
        category: 'Contexto',
        severity: 'warn',
        title: `${recentCompactions.length} compactaciones en últimas 24h`,
        detail: 'Demasiado churn. Considera threads nuevos en vez de /compact, o sesiones más cortas.',
        fix: null
      });
    }

    // === Score ===
    const score = this._computeScore(findings);
    return { score, findings };
  },

  _computeScore(findings) {
    let score = 100;
    for (const f of findings) {
      if (f.severity === 'danger') score -= 15;
      else if (f.severity === 'warn') score -= 6;
      else score -= 2;
    }
    return Math.max(0, score);
  },

  open() {
    const { score, findings } = this.audit();
    const grouped = {};
    for (const f of findings) {
      (grouped[f.category] = grouped[f.category] || []).push(f);
    }
    const cats = Object.keys(grouped).sort();
    const sevIcon = { danger: '🔴', warn: '🟡', info: '🔵' };
    const sevClass = {
      danger: 'border-danger/30 bg-danger/5',
      warn:   'border-warn/30 bg-warn/5',
      info:   'border-border bg-bg'
    };
    const scoreColor = score >= 80 ? 'text-success' : score >= 50 ? 'text-warn' : 'text-danger';

    const modal = document.createElement('div');
    modal.className = 'fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4';
    modal.innerHTML = `
      <div class="bg-panel border border-border rounded-lg w-full max-w-2xl max-h-[90vh] flex flex-col">
        <div class="flex items-center justify-between border-b border-border px-4 py-3">
          <div>
            <h3 class="font-semibold">Workspace health check</h3>
            <p class="text-xs text-muted">Audit accionable. Cada finding viene con (cuando aplica) un botón para arreglarlo.</p>
          </div>
          <button data-close class="text-muted hover:text-white">✕</button>
        </div>
        <div class="flex-1 overflow-y-auto p-4 space-y-4">
          <div class="text-center bg-panel2 rounded-lg p-4">
            <div class="text-[10px] uppercase tracking-wide text-muted">Health score</div>
            <div class="font-mono text-4xl font-bold ${scoreColor}">${score}<span class="text-xl text-muted">/100</span></div>
            <div class="text-xs text-muted mt-1">${findings.length} ${findings.length === 1 ? 'finding' : 'findings'}</div>
          </div>
          ${findings.length === 0 ? `
            <div class="text-center text-success p-6">
              <div class="text-3xl mb-2">✓</div>
              <p class="font-medium">Workspace impecable.</p>
              <p class="text-xs text-muted mt-1">Sin findings. Sigue iterando.</p>
            </div>
          ` : cats.map(cat => `
            <div>
              <h4 class="font-semibold text-sm mb-2">${escapeHtml(cat)} <span class="text-muted font-normal">(${grouped[cat].length})</span></h4>
              <div class="space-y-2">
                ${grouped[cat].map((f, i) => `
                  <div class="border rounded p-2 ${sevClass[f.severity]}">
                    <div class="flex items-start gap-2">
                      <span>${sevIcon[f.severity]}</span>
                      <div class="flex-1">
                        <div class="text-sm font-medium">${escapeHtml(f.title)}</div>
                        ${f.detail ? `<div class="text-[11px] text-muted mt-0.5">${escapeHtml(f.detail)}</div>` : ''}
                        ${f.fix ? `<button data-cat="${escapeHtml(cat)}" data-i="${i}" class="hc-fix mt-1.5 text-[10px] px-2 py-0.5 rounded bg-panel hover:bg-border">${escapeHtml(f.fix.label)} →</button>` : ''}
                      </div>
                    </div>
                  </div>
                `).join('')}
              </div>
            </div>
          `).join('')}
        </div>
        <div class="border-t border-border p-3 flex justify-between items-center">
          <span class="text-xs text-muted">Re-ejecuta tras aplicar fixes para ver el score nuevo.</span>
          <div class="flex gap-2">
            <button id="hc-rerun" class="px-3 py-1.5 text-xs rounded bg-panel2 hover:bg-border">Re-auditar</button>
            <button data-close class="px-3 py-1.5 text-xs rounded bg-panel2 hover:bg-border">Cerrar</button>
          </div>
        </div>
      </div>`;
    document.body.appendChild(modal);
    const close = () => modal.remove();
    modal.querySelectorAll('[data-close]').forEach(b => b.onclick = close);
    modal.onclick = e => { if (e.target === modal) close(); };
    modal.querySelector('#hc-rerun').onclick = () => { close(); this.open(); };
    modal.querySelectorAll('.hc-fix').forEach(b => {
      b.onclick = () => {
        const cat = b.dataset.cat;
        const i = +b.dataset.i;
        const f = grouped[cat][i];
        if (f?.fix?.action) {
          try { f.fix.action(); } catch (err) { console.warn(err); }
          if (f.fix.skipReaudit) {
            // Fix de navegación pura — el usuario quería ir a ese tab.
            // No reabrir Health encima.
            close();
          } else {
            // Mutación de estado — re-audit muestra el resultado.
            setTimeout(() => { close(); this.open(); }, 200);
          }
        }
      };
    });
  }
};
