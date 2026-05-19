// Templates marketplace local. El podcast predice un "renacimiento" de los
// templates porque, citado: "el código mismo se vuelve contexto. Más
// importante que un agent.md largo es empezar con una base sólida."
//
// Aquí no es una tienda externa: son scaffolds locales que el usuario puede
// auditar antes de usarlos (siguiendo la lección de "no descargues skills
// random").

window.TemplatesStore = {
  templates: [],

  init() {
    this.templates = structuredClone(window.SEED_TEMPLATES);
    this.render();
    document.getElementById('btn-template-info').onclick = () => this.showInfo();
  },

  render() {
    const ul = document.getElementById('template-list');
    if (!ul) return;
    ul.innerHTML = this.templates.map(t => `
      <li class="hover:bg-panel2 rounded px-1.5 py-1 cursor-pointer" data-id="${t.id}" title="${escapeHtml(t.description)}">
        <span class="text-accent2">⌗</span> ${escapeHtml(t.name)}
      </li>`).join('');
    ul.querySelectorAll('li[data-id]').forEach(li => {
      li.onclick = () => this.scaffold(li.dataset.id);
    });
  },

  scaffold(id) {
    const t = this.templates.find(x => x.id === id);
    if (!t) return;
    if (!confirm(`Generar scaffold de "${t.name}"?\n\nSe crearán ${t.structure.length} archivos/carpetas en tu workspace virtual.\n\n${t.description}`)) return;

    let created = 0;
    for (const p of t.structure) {
      const path = p.endsWith('/') ? p + '.gitkeep' : p;
      if (!openFiles.find(f => f.path === path)) {
        openFiles.push({
          path,
          language: detectLang(path),
          content: this._stubFor(path, t)
        });
        created++;
      }
    }
    persistFiles();
    renderFileTree();
    Context.log(`Template "${t.name}" aplicado (${created} archivos creados). El codebase ahora ES contexto.`);
    MockAgent.log('system',
      `Se aplicó el template <b>${escapeHtml(t.name)}</b>. Recuerda: con una base sólida no necesitas un agent.md describiendo "este proyecto usa X". El agente puede leer la estructura directamente.`);
  },

  _stubFor(path, template) {
    if (path === 'vite.config.ts') return `import { defineConfig } from 'vite';\nexport default defineConfig({});\n`;
    if (path === 'app.json') return `{\n  "expo": { "name": "${template.name}" }\n}\n`;
    if (path === 'src/cli.ts') return `#!/usr/bin/env bun\nconsole.log('cli');\n`;
    if (path.endsWith('.gitkeep')) return '';
    return `// scaffolded from template ${template.name}\n`;
  },

  showInfo() {
    Tutorial.openCustom('Renacimiento de los templates',
      [`<p>Cuando los modelos son tan buenos, lo que más mueve la aguja es el <b>punto de partida</b>.</p>`,
       `<p>Un template bien diseñado es contexto gratis: el agente lee la estructura y entiende dónde va cada cosa, sin que tú lo escribas en un <code>agent.md</code>.</p>`,
       `<p>Por eso Shosso lleva templates auditables. No es un marketplace externo (no descargues lo random) — son scaffolds locales que puedes leer antes de aplicar.</p>`]);
  }
};
