// i18n mínima pero útil. ES (por defecto) + EN.
// Estrategia: elementos con `data-i18n="<key>"` se traducen automáticamente
// al cambiar de idioma. La preferencia se persiste. No traduzco TODO el
// contenido (sería un libro) — sólo las etiquetas y labels más visibles.

window.I18N = {
  lang: 'es',

  STRINGS: {
    es: {
      'tagline': 'IDE nativo de skills · context-aware',
      'model.good': 'modelo: bueno',
      'productivity': 'Productividad',
      'context': 'Contexto',
      'demo': 'Demo',
      'tour': 'Tour',
      'reset': 'Reset',
      'tab.skills': 'Skills',
      'tab.agents': 'Agentes',
      'tab.plan': 'Plan',
      'tab.context': 'Contexto',
      'tab.memory': 'Memoria',
      'tab.tokenizer': 'Tokens',
      'tab.system': 'Sistema',
      'tab.security': 'Seguridad',
      'tab.philosophy': 'Filosofía',
      'bottom.chat': 'Chat con el agente',
      'bottom.terminal': 'Terminal (mock)',
      'bottom.logs': 'Logs de contexto',
      'bottom.diagnostics': 'Diagnóstico de fallos',
      'bottom.workshop': 'Workshop (paralelo)',
      'chat.placeholder': 'Pídele algo al agente… (ej: "genera reporte semanal", "investiga este auspicio")',
      'send': 'Enviar',
      'files': 'Archivos',
      'templates': 'Templates',
      'new.skill': '+ Skill',
      'new.plan': '+ Plan',
      'new.agent': '+ Sub-agente',
      'ready': 'Listo',
      'status.skills': 'cargadas / total',
      'status.agents': 'sub-agentes',
      'status.memory': 'memoria',
      'status.diag': 'diagnósticos abiertos',
      'compact.near': '⚠ compactación cerca',
      'compact.now': '⚠ compactando…',
      'compact.click': '⚠ click = thread nuevo',
      'compact.degraded': '⚠⚠ degradado · click = thread nuevo',
      'panel.skills.title': 'Skills disponibles',
      'panel.skills.desc': 'Solo nombre + descripción están en contexto. El cuerpo se carga cuando el agente lo necesita (progressive disclosure).',
      'panel.agents.title': 'Orquesta de agentes',
      'panel.agents.desc': 'Un agente principal; los sub-agentes solo aparecen cuando aportan productividad real.',
      'panel.plan.title': 'Planes',
      'panel.plan.desc': 'El plan es para TI — accountability. Después se divide en PRs pequeños que el review loop puede cerrar.',
      'panel.context.title': 'Composición del contexto',
      'panel.context.desc': 'Menos es más. Vigila lo que se inyecta en cada turno.',
      'panel.memory.title': 'Capa de memoria',
      'panel.memory.desc': 'Hechos persistentes entre sesiones. NO viven en el contexto principal; se recuperan cuando son relevantes.',
      'panel.tokens.title': 'Tokenizador',
      'panel.system.title': 'System prompt + harness',
      'panel.security.title': 'Postura de seguridad',
      'panel.philosophy.title': 'Filosofía'
    },
    en: {
      'tagline': 'skill-first IDE · context-aware',
      'model.good': 'model: good',
      'productivity': 'Productivity',
      'context': 'Context',
      'demo': 'Demo',
      'tour': 'Tour',
      'reset': 'Reset',
      'tab.skills': 'Skills',
      'tab.agents': 'Agents',
      'tab.plan': 'Plan',
      'tab.context': 'Context',
      'tab.memory': 'Memory',
      'tab.tokenizer': 'Tokens',
      'tab.system': 'System',
      'tab.security': 'Security',
      'tab.philosophy': 'Philosophy',
      'bottom.chat': 'Chat with agent',
      'bottom.terminal': 'Terminal (mock)',
      'bottom.logs': 'Context logs',
      'bottom.diagnostics': 'Failure diagnostics',
      'bottom.workshop': 'Workshop (parallel)',
      'chat.placeholder': 'Ask the agent… (e.g. "generate weekly report", "investigate this sponsor")',
      'send': 'Send',
      'files': 'Files',
      'templates': 'Templates',
      'new.skill': '+ Skill',
      'new.plan': '+ Plan',
      'new.agent': '+ Sub-agent',
      'ready': 'Ready',
      'status.skills': 'loaded / total',
      'status.agents': 'sub-agents',
      'status.memory': 'memory',
      'status.diag': 'open diagnostics',
      'compact.near': '⚠ compaction near',
      'compact.now': '⚠ compacting…',
      'compact.click': '⚠ click = new thread',
      'compact.degraded': '⚠⚠ degraded · click = new thread',
      'panel.skills.title': 'Available skills',
      'panel.skills.desc': 'Only name + description live in context. The body loads on demand when the agent needs it (progressive disclosure).',
      'panel.agents.title': 'Agent orchestra',
      'panel.agents.desc': 'One main agent; sub-agents only appear when they add real productivity.',
      'panel.plan.title': 'Plans',
      'panel.plan.desc': 'The plan is for YOU — accountability. Then split into small PRs that the review loop can close.',
      'panel.context.title': 'Context composition',
      'panel.context.desc': 'Less is more. Watch what gets injected each turn.',
      'panel.memory.title': 'Memory layer',
      'panel.memory.desc': 'Persistent facts across sessions. They do NOT live in main context; retrieved only when relevant.',
      'panel.tokens.title': 'Tokenizer',
      'panel.system.title': 'System prompt + harness',
      'panel.security.title': 'Security posture',
      'panel.philosophy.title': 'Philosophy'
    }
  },

  init() {
    this.lang = localStorage.getItem('shosso.lang') || this._detectBrowser();
    this.apply();
    const sel = document.getElementById('lang-switch');
    if (sel) {
      sel.value = this.lang;
      sel.addEventListener('change', e => this.setLang(e.target.value));
    }
  },

  _detectBrowser() {
    const nav = (navigator.language || 'es').toLowerCase();
    return nav.startsWith('en') ? 'en' : 'es';
  },

  setLang(lang) {
    if (!this.STRINGS[lang]) return;
    this.lang = lang;
    localStorage.setItem('shosso.lang', lang);
    this.apply();
    document.documentElement.lang = lang;
  },

  t(key) {
    return this.STRINGS[this.lang][key] || this.STRINGS.es[key] || key;
  },

  apply() {
    document.querySelectorAll('[data-i18n]').forEach(el => {
      const key = el.dataset.i18n;
      const val = this.t(key);
      if (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA') el.placeholder = val;
      else el.textContent = val;
    });
    document.querySelectorAll('[data-i18n-html]').forEach(el => {
      el.innerHTML = this.t(el.dataset.i18nHtml);
    });
  }
};
