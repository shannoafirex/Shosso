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
      'ready': 'Listo'
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
      'ready': 'Ready'
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
