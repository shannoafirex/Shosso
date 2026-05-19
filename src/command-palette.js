// Command palette estilo VSCode. Cmd+Shift+P abre un buscador fuzzy
// sobre todo: skills, agentes, memorias, planes, comandos, archetypes,
// acciones. Navegación con teclado, ejecución con Enter.
//
// Filosofía: cualquier acción del IDE debe ser alcanzable en <3 keystrokes
// desde cualquier panel.

window.CommandPalette = {
  _modal: null,
  _selectedIndex: 0,
  _results: [],

  init() {
    document.addEventListener('keydown', (e) => {
      const mod = e.metaKey || e.ctrlKey;
      if (mod && e.shiftKey && e.key.toUpperCase() === 'P') {
        e.preventDefault();
        e.stopPropagation();
        this.open();
      }
    });
  },

  open() {
    if (this._modal) { this._modal.querySelector('input')?.focus(); return; }
    const modal = document.createElement('div');
    modal.className = 'fixed inset-0 bg-black/40 z-50 flex items-start justify-center pt-24 px-4';
    modal.innerHTML = `
      <div class="bg-panel border border-border rounded-lg w-full max-w-xl shadow-2xl">
        <div class="border-b border-border px-3 py-2">
          <input id="cp-input" type="text" placeholder="Busca skills, agentes, comandos, memorias…"
            class="w-full bg-transparent text-sm outline-none placeholder:text-muted" autofocus />
        </div>
        <div class="cp-results max-h-80 overflow-y-auto"></div>
        <div class="border-t border-border px-3 py-1.5 flex justify-between text-[10px] text-muted">
          <span><kbd class="bg-panel2 px-1 rounded">↑↓</kbd> navega · <kbd class="bg-panel2 px-1 rounded">↵</kbd> ejecuta · <kbd class="bg-panel2 px-1 rounded">Esc</kbd> cierra</span>
          <span id="cp-counter"></span>
        </div>
      </div>`;
    document.body.appendChild(modal);
    this._modal = modal;
    const input = modal.querySelector('#cp-input');

    const update = () => {
      this._results = this._filter(input.value.trim());
      this._selectedIndex = 0;
      this._render();
      modal.querySelector('#cp-counter').textContent = this._results.length === 0
        ? 'sin resultados' : `${this._results.length} resultados`;
    };
    update();

    input.addEventListener('input', update);
    input.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') { e.preventDefault(); this.close(); }
      else if (e.key === 'ArrowDown') {
        e.preventDefault();
        this._selectedIndex = Math.min(this._selectedIndex + 1, this._results.length - 1);
        this._render();
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        this._selectedIndex = Math.max(this._selectedIndex - 1, 0);
        this._render();
      } else if (e.key === 'Enter') {
        e.preventDefault();
        this._execute(this._selectedIndex);
      }
    });

    modal.onclick = (e) => { if (e.target === modal) this.close(); };
  },

  close() {
    if (this._modal) this._modal.remove();
    this._modal = null;
  },

  _gatherItems() {
    const items = [];

    // Comandos slash
    const cmds = [
      { name: '/help', desc: 'Lista de comandos disponibles' },
      { name: '/grebloop', desc: 'Auto-review loop hasta 5/5' },
      { name: '/goal', desc: 'Define end state (estilo Codex)' },
      { name: '/plan', desc: 'Abre el Planner' },
      { name: '/dispatch', desc: 'Manda tarea a todos los sub-agentes en paralelo' },
      { name: '/metric', desc: 'Track métrica SaaS (MRR, churn, NPS)' },
      { name: '/incident', desc: 'Registra incidente de producción/cliente' },
      { name: '/newthread', desc: 'Empieza thread limpio (mejor que /compact)' },
      { name: '/archetype', desc: 'Picker de templates pre-pobladas' },
      { name: '/demo', desc: 'Corre escenario scripted' }
    ];
    for (const c of cmds) {
      items.push({
        category: 'Comando',
        title: c.name,
        subtitle: c.desc,
        icon: '$',
        action: () => MockAgent.send(c.name)
      });
    }

    // Skills (invocar)
    for (const s of SkillsStore.skills) {
      items.push({
        category: 'Skill',
        title: s.name,
        subtitle: s.description,
        icon: '⚡',
        action: () => MockAgent.invokeSkill(s.id)
      });
    }

    // Skills (toggle cargar)
    for (const s of SkillsStore.skills) {
      items.push({
        category: 'Skill · toggle',
        title: (s.loaded ? 'Descargar: ' : 'Cargar: ') + s.name,
        subtitle: `${s.loaded ? estimateTokens(s.body) : 0}t actual · ${estimateTokens(s.body)}t cuerpo`,
        icon: s.loaded ? '◉' : '○',
        action: () => SkillsStore.toggleLoaded(s.id)
      });
    }

    // Agentes
    for (const a of AgentsStore.agents) {
      items.push({
        category: 'Agente',
        title: a.name,
        subtitle: a.role || '(sin rol)',
        icon: a.type === 'main' ? '◆' : '◇',
        action: () => {
          document.querySelector('[data-tab="agents"]')?.click();
          if (a.type === 'sub') AgentsStore.edit(a.id);
        }
      });
    }

    // Memorias (recall by jump-to)
    for (const m of MemoryStore.items.slice(0, 30)) {
      items.push({
        category: 'Memoria',
        title: m.text.length > 60 ? m.text.slice(0, 57) + '…' : m.text,
        subtitle: `${m.recalls || 0} recalls · ${estimateTokens(m.text)}t`,
        icon: '🧠',
        action: () => {
          document.querySelector('[data-tab="memory"]')?.click();
        }
      });
    }

    // Planes (abrir Plan tab)
    const plans = SafeStorage.safeGet('shosso.plans', []);
    for (const p of plans.slice(0, 20)) {
      const sent = p.prs.filter(x => x.status === 'sent').length;
      items.push({
        category: 'Plan',
        title: p.goal.length > 60 ? p.goal.slice(0, 57) + '…' : p.goal,
        subtitle: `${sent}/${p.prs.length} PRs enviados · ${p.tag || 'sin tag'}`,
        icon: '📋',
        action: () => {
          document.querySelector('[data-tab="plan"]')?.click();
        }
      });
    }

    // Archetypes (built-in)
    if (window.Archetypes) {
      for (const a of Archetypes.LIST) {
        items.push({
          category: 'Archetype',
          title: a.name,
          subtitle: a.tagline,
          icon: a.icon,
          action: () => Archetypes.openPicker()
        });
      }
      // Customs
      for (const a of Archetypes._customs()) {
        items.push({
          category: 'Archetype · custom',
          title: a.name,
          subtitle: a.tagline,
          icon: a.icon || '⭐',
          action: () => Archetypes.openPicker()
        });
      }
    }

    // Knowledge work
    if (window.KnowledgeWork) {
      for (const kw of KnowledgeWork.ACTIONS) {
        items.push({
          category: 'Knowledge work',
          title: kw.name,
          subtitle: kw.desc,
          icon: kw.icon,
          action: () => KnowledgeWork.run(kw.id)
        });
      }
    }

    // Templates
    if (window.TemplatesStore) {
      for (const t of TemplatesStore.templates) {
        items.push({
          category: 'Template',
          title: t.name,
          subtitle: t.description,
          icon: '⌗',
          action: () => TemplatesStore.scaffold(t.id)
        });
      }
    }

    // Acciones globales
    const actions = [
      { title: 'Demo', subtitle: 'Escenario scripted', icon: '▶', action: () => Demo.run() },
      { title: 'Tour', subtitle: 'Onboarding rundown', icon: '🎓', action: () => Tutorial.open('rundown') },
      { title: 'Export workspace', subtitle: 'Snapshot MD/JSON', icon: '↗', action: () => WorkspaceExport.openModal() },
      { title: 'Import workspace', subtitle: 'Desde JSON', icon: '↘', action: () => WorkspaceImport.openModal() },
      { title: 'Overview', subtitle: 'Stats + ROI calculator', icon: '📊', action: () => Overview.open() },
      { title: 'Cambiar proyecto', subtitle: 'Switch project', icon: '📁', action: () => Projects.openMenu() },
      { title: 'Nueva skill', subtitle: 'Constructor recursivo', icon: '+', action: () => SkillBuilder.open() },
      { title: 'Nuevo plan', subtitle: 'Goal → small PRs', icon: '+', action: () => Planner.open() },
      { title: 'Atajos de teclado', subtitle: 'Lista completa', icon: '⌨', action: () => Shortcuts.showHelp() }
    ];
    for (const a of actions) items.push({ category: 'Acción', ...a });

    return items;
  },

  // Fuzzy match: prioriza match exacto en title > subtitle > category > subsequence.
  _fuzzyMatch(query, item) {
    if (!query) return 1;
    const q = query.toLowerCase();
    const title = item.title.toLowerCase();
    const subtitle = (item.subtitle || '').toLowerCase();
    const cat = item.category.toLowerCase();
    if (title === q) return 1000;
    if (title.startsWith(q)) return 500 - title.length;
    if (title.includes(q)) return 200 - title.indexOf(q);
    if (subtitle.includes(q)) return 100 - subtitle.indexOf(q);
    if (cat.includes(q)) return 50;
    // Subsequence en title
    let pos = 0, score = 0;
    for (const ch of q) {
      const i = title.indexOf(ch, pos);
      if (i < 0) return 0;
      score += 5 - Math.min(5, i - pos);
      pos = i + 1;
    }
    return score;
  },

  _filter(query) {
    const all = this._gatherItems();
    if (!query) return all.slice(0, 60);
    const scored = [];
    for (const item of all) {
      const score = this._fuzzyMatch(query, item);
      if (score > 0) scored.push({ ...item, _score: score });
    }
    scored.sort((a, b) => b._score - a._score);
    return scored.slice(0, 50);
  },

  _render() {
    const container = this._modal.querySelector('.cp-results');
    if (this._results.length === 0) {
      container.innerHTML = '<div class="text-xs text-muted p-3 text-center">Sin resultados. Prueba con menos letras.</div>';
      return;
    }
    container.innerHTML = this._results.map((r, i) => `
      <button data-i="${i}" class="cp-item w-full text-left px-3 py-2 hover:bg-panel2 flex items-center gap-3 border-l-2 ${i === this._selectedIndex ? 'bg-panel2 border-accent' : 'border-transparent'}">
        <span class="w-4 text-center text-muted">${escapeHtml(r.icon || '·')}</span>
        <div class="flex-1 min-w-0">
          <div class="text-sm truncate">${escapeHtml(r.title)}</div>
          ${r.subtitle ? `<div class="text-[10px] text-muted truncate">${escapeHtml(r.subtitle)}</div>` : ''}
        </div>
        <span class="text-[10px] text-muted whitespace-nowrap">${escapeHtml(r.category)}</span>
      </button>
    `).join('');
    container.querySelectorAll('.cp-item').forEach(b => {
      b.onclick = () => this._execute(+b.dataset.i);
      b.onmouseenter = () => { this._selectedIndex = +b.dataset.i; this._render(); };
    });
    const sel = container.querySelector('.cp-item.bg-panel2');
    if (sel) sel.scrollIntoView({ block: 'nearest' });
  },

  _execute(i) {
    const item = this._results[i];
    if (!item) return;
    this.close();
    try { item.action(); } catch (err) {
      console.warn('Palette action error:', err);
      MockAgent.log('system', `Error ejecutando "${item.title}": ${err.message}`);
    }
  }
};
