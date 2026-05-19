// Importar skill externa con aviso de seguridad.
// El podcast: "Skills marketplaces son un vector de ataque fácil. Y además
// tu agente necesita el contexto de una corrida exitosa que TÚ viviste."

window.ImportSkill = {
  init() {
    const btn = document.getElementById('btn-import-skill');
    if (!btn) return;
    btn.addEventListener('click', () => this.open());
  },

  async open() {
    let confirmed = false;
    if (window.shosso?.confirm) {
      const r = await window.shosso.confirm({
        type: 'warning',
        title: 'Importar skill externa',
        message: '¿Estás seguro?',
        detail: 'El podcast recomienda EXPLÍCITAMENTE no descargar skills random. Razones:\n\n1. Vector de ataque: una skill puede instruir al agente a hacer cosas que no quieres.\n2. Tu agente no tendrá el contexto de una corrida exitosa real que tú viviste.\n\nSi aún así quieres importar (proveedor que confías, equipo interno), continúa.',
        buttons: ['Cancelar', 'Continuar con cuidado']
      });
      confirmed = r === 1;
    } else {
      confirmed = confirm('AVISO: importar skills externas es un vector de ataque.\n\nEl podcast recomienda construir las tuyas viviendo el workflow.\n\n¿Continuar?');
    }
    if (!confirmed) return;

    const raw = prompt('Pega aquí el contenido completo de la skill (formato markdown con front-matter "name:" y "description:"):');
    if (!raw) return;
    try {
      const parsed = this._parse(raw);
      if (!parsed) {
        alert('No pude parsear la skill. Necesita las líneas "name:" y "description:" al inicio.');
        return;
      }
      SkillsStore.add(parsed);
      Context.log(`Skill externa "${parsed.name}" importada (sin iteraciones propias — empieza en 0).`);
      MockAgent.log('system',
        `⚠ Importaste una skill externa: <b>${escapeHtml(parsed.name)}</b>.<br>` +
        `Tiene 0 iteraciones tuyas. Es muy probable que falle en tu workflow específico. ` +
        `Trátala como sospechosa hasta que la hayas iterado al menos 3 veces.`);
    } catch (e) {
      alert('Error parseando: ' + e.message);
    }
  },

  _parse(raw) {
    const name = (raw.match(/^name:\s*(.+)$/m) || [])[1]?.trim();
    const desc = (raw.match(/^description:\s*(.+)$/m) || [])[1]?.trim();
    if (!name || !desc) return null;
    return {
      id: 'imp-' + Date.now(),
      name,
      description: desc,
      body: raw.replace(/^(name|description):.+$/gm, '').trim(),
      loaded: false,
      iterations: 0,
      failures: [],
      external: true
    };
  }
};
