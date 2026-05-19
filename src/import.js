// Workspace import: pega JSON exportado de Shosso → merge en workspace actual.
// Permite elegir qué se importa (skills/agents/memory/plans/metrics/agent.md).
// Estrategia: additive con detección de duplicados por id/nombre.

window.WorkspaceImport = {
  init() {
    document.getElementById('btn-import').addEventListener('click', () => this.openModal());
  },

  openModal() {
    const modal = document.createElement('div');
    modal.className = 'fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4';
    modal.innerHTML = `
      <div class="bg-panel border border-border rounded-lg w-full max-w-2xl max-h-[90vh] flex flex-col">
        <div class="flex items-center justify-between border-b border-border px-4 py-3">
          <div>
            <h3 class="font-semibold">Workspace import</h3>
            <p class="text-xs text-muted">Pega un snapshot JSON exportado de Shosso. Sólo añade lo que falta — no clobera.</p>
          </div>
          <button data-close class="text-muted hover:text-white">✕</button>
        </div>
        <div class="flex-1 overflow-y-auto p-4 space-y-3">
          <textarea id="imp-input" rows="10" placeholder='Pega el JSON aquí — ej: {"version":1,"skills":[...],"agents":[...]}'
            class="w-full bg-panel2 border border-border rounded px-3 py-2 text-xs font-mono outline-none focus:border-accent"></textarea>
          <div id="imp-preview" class="hidden bg-bg border border-border rounded p-3 text-xs space-y-2"></div>
          <div id="imp-error" class="hidden text-xs text-danger"></div>
        </div>
        <div class="border-t border-border p-3 flex justify-between gap-2">
          <button id="imp-parse" class="px-3 py-1.5 text-xs rounded bg-accent2/20 text-accent2 hover:bg-accent2/30">Analizar</button>
          <div class="flex gap-2">
            <button data-close class="px-3 py-1.5 text-xs rounded bg-panel2 hover:bg-border">Cancelar</button>
            <button id="imp-apply" class="px-3 py-1.5 text-xs rounded bg-accent hover:bg-accent/80 text-white" disabled>Importar</button>
          </div>
        </div>
      </div>`;
    document.body.appendChild(modal);
    const close = () => modal.remove();
    modal.querySelectorAll('[data-close]').forEach(b => b.onclick = close);
    modal.onclick = e => { if (e.target === modal) close(); };

    let parsed = null;
    const inp = modal.querySelector('#imp-input');
    const preview = modal.querySelector('#imp-preview');
    const errEl = modal.querySelector('#imp-error');
    const applyBtn = modal.querySelector('#imp-apply');

    modal.querySelector('#imp-parse').onclick = () => {
      errEl.classList.add('hidden');
      preview.classList.add('hidden');
      applyBtn.disabled = true;
      try {
        parsed = JSON.parse(inp.value);
      } catch (e) {
        errEl.textContent = 'JSON inválido: ' + e.message;
        errEl.classList.remove('hidden');
        return;
      }
      if (!parsed || typeof parsed !== 'object') {
        errEl.textContent = 'El JSON no tiene estructura de snapshot Shosso.';
        errEl.classList.remove('hidden');
        return;
      }
      // Version check
      const version = parsed.version || 0;
      const SHOSSO_IMPORT_VERSION = 1;
      if (version === 0 && !Array.isArray(parsed.skills) && !Array.isArray(parsed.agents)) {
        errEl.textContent = 'JSON sin metadata Shosso. ¿Es realmente un export?';
        errEl.classList.remove('hidden');
        return;
      }
      if (version > SHOSSO_IMPORT_VERSION) {
        errEl.innerHTML = `⚠ Snapshot version ${version} > soportada (${SHOSSO_IMPORT_VERSION}). El import seguirá pero algunos campos pueden ignorarse silenciosamente. Actualiza tu Shosso.`;
        errEl.className = 'text-xs text-warn';
        errEl.classList.remove('hidden');
      }
      preview.innerHTML = this._renderPreview(parsed);
      preview.classList.remove('hidden');
      applyBtn.disabled = false;
    };

    applyBtn.onclick = () => {
      const opts = {
        skills: modal.querySelector('#imp-opt-skills')?.checked,
        agents: modal.querySelector('#imp-opt-agents')?.checked,
        memory: modal.querySelector('#imp-opt-memory')?.checked,
        plans: modal.querySelector('#imp-opt-plans')?.checked,
        metrics: modal.querySelector('#imp-opt-metrics')?.checked,
        diagnostics: modal.querySelector('#imp-opt-diagnostics')?.checked,
        agentMd: modal.querySelector('#imp-opt-agentmd')?.checked
      };
      const report = this.apply(parsed, opts);
      close();
      MockAgent.log('system',
        `📥 <b>Import completado.</b><br>` +
        `Añadidos: ${report.skills} skills · ${report.agents} agentes · ${report.memory} memorias · ${report.plans} planes · ${report.metrics} métricas · ${report.diagnostics} diagnósticos` +
        (report.agentMd ? ' · agent.md fusionado' : '') +
        `<br><span class="text-muted text-xs">Lo que ya existía se conservó intacto.</span>`);
    };
  },

  _renderPreview(d) {
    const exported = d.exportedAt ? new Date(d.exportedAt).toLocaleString() : 'desconocido';
    const ver = d.shossoVersion || 'unknown';
    return `
      <div><b>Versión:</b> ${escapeHtml(ver)} · <b>Exportado:</b> ${escapeHtml(exported)}</div>
      <div class="space-y-1 mt-2">
        ${this._optRow('skills', 'Skills', d.skills?.length || 0)}
        ${this._optRow('agents', 'Agentes', d.agents?.length || 0)}
        ${this._optRow('memory', 'Memoria', d.memory?.length || 0)}
        ${this._optRow('plans', 'Planes', d.plans?.length || 0)}
        ${this._optRow('metrics', 'Métricas', Object.keys(d.metrics || {}).length)}
        ${this._optRow('diagnostics', 'Diagnósticos', d.diagnostics?.length || 0)}
        ${this._optRow('agentmd', 'agent.md', d.agentMd ? `${estimateTokens(d.agentMd)}t` : 'vacío', !!d.agentMd)}
      </div>
      <p class="text-[10px] text-muted mt-2">Marca lo que quieres importar. Duplicados (mismo id/nombre) se ignoran.</p>
    `;
  },

  _optRow(key, label, count, hasValue) {
    const has = hasValue !== undefined ? hasValue : (typeof count === 'number' ? count > 0 : !!count);
    const id = 'imp-opt-' + key;
    return `<label class="flex items-center justify-between text-xs gap-2 ${has ? '' : 'opacity-50'}">
      <span>${escapeHtml(label)}</span>
      <span class="flex items-center gap-2">
        <span class="text-muted font-mono">${count}</span>
        <input type="checkbox" id="${id}" ${has ? 'checked' : 'disabled'} class="accent-accent" />
      </span>
    </label>`;
  },

  apply(d, opts) {
    const report = { skills: 0, agents: 0, memory: 0, plans: 0, metrics: 0, diagnostics: 0, agentMd: false };

    if (opts.skills && Array.isArray(d.skills)) {
      for (const s of d.skills) {
        if (!s.id) continue;
        if (!SkillsStore.get(s.id)) {
          SkillsStore.skills.push(structuredClone(s));
          report.skills++;
        }
      }
      SkillsStore.persist();
      SkillsStore.render();
    }

    if (opts.agents && Array.isArray(d.agents)) {
      for (const a of d.agents) {
        if (!a.id || a.type === 'main') continue; // main protected
        const collision = AgentsStore.agents.some(
          x => x.name.toLowerCase() === (a.name || '').toLowerCase()
        );
        if (!collision) {
          AgentsStore.add({ ...a, id: 'imp-' + a.id });
          report.agents++;
        }
      }
    }

    if (opts.memory && Array.isArray(d.memory)) {
      for (const m of d.memory) {
        if (!m.text) continue;
        if (!MemoryStore.items.some(x => x.text === m.text)) {
          MemoryStore.items.unshift({
            id: 'imp-mem-' + Date.now() + '-' + Math.random().toString(36).slice(2, 5),
            text: m.text,
            created: m.created || Date.now(),
            recalls: 0
          });
          report.memory++;
        }
      }
      MemoryStore.persist();
      MemoryStore.render();
    }

    if (opts.plans && Array.isArray(d.plans)) {
      const current = SafeStorage.safeGet('shosso.plans', []);
      for (const p of d.plans) {
        if (!p.goal) continue;
        if (!current.some(x => x.goal === p.goal)) {
          current.unshift({
            ...p,
            id: 'imp-plan-' + Date.now() + '-' + Math.random().toString(36).slice(2, 5),
            // Normalize prs — sin esto render del Planner crashea en .filter
            prs: Array.isArray(p.prs) ? p.prs : []
          });
          report.plans++;
        }
      }
      SafeStorage.safeSet('shosso.plans', current.slice(0, 50));
      if (window.Planner) Planner.renderRecent();
    }

    if (opts.metrics && d.metrics && window.Metrics) {
      for (const [name, m] of Object.entries(d.metrics)) {
        if (!Metrics.data[name]) {
          Metrics.data[name] = structuredClone(m);
          report.metrics++;
        }
      }
      Metrics.persist();
    }

    if (opts.diagnostics && Array.isArray(d.diagnostics) && window.Diagnostics) {
      for (const f of d.diagnostics) {
        if (!f.skillId || !f.symptom) continue;
        // Normalize date — render hace .slice() y new Date().getTime(),
        // ambos fallan con date no-string o no-ISO.
        const safeDate = (typeof f.date === 'string' && f.date.length >= 10)
          ? f.date
          : new Date().toISOString();
        const sig = `${f.skillId}|${f.symptom}|${safeDate}`;
        const exists = window.Diagnostics.failures.some(x => `${x.skillId}|${x.symptom}|${x.date}` === sig);
        if (!exists) {
          window.Diagnostics.failures.push({
            ...f,
            id: 'imp-diag-' + Date.now() + '-' + Math.random().toString(36).slice(2, 5),
            date: safeDate
          });
          report.diagnostics++;
        }
      }
      window.Diagnostics.persist();
      window.Diagnostics.render();
    }

    if (opts.agentMd && d.agentMd && window.SystemPromptView) {
      const current = SystemPromptView.agentMd || '';
      if (!current.includes(d.agentMd.trim())) {
        SystemPromptView.agentMd = (current + '\n\n' + d.agentMd).trim();
        SafeStorage.safeSet('shosso.agentmd', SystemPromptView.agentMd);
        const ta = document.getElementById('agentmd-body');
        if (ta) ta.value = SystemPromptView.agentMd;
        SystemPromptView.refresh();
        report.agentMd = true;
      }
    }

    Context.refresh();
    if (window.Productivity) Productivity.refresh();
    return report;
  }
};
