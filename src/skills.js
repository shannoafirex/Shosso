// Gestión de skills: render, carga progresiva (progressive disclosure),
// y cálculo de su huella en el contexto.

window.SkillsStore = {
  skills: [],

  init() {
    const saved = localStorage.getItem('shosso.skills');
    this.skills = saved ? JSON.parse(saved) : structuredClone(window.SEED_SKILLS);
    this.persist();
  },

  persist() {
    localStorage.setItem('shosso.skills', JSON.stringify(this.skills));
  },

  add(skill) {
    this.skills.push(skill);
    this.persist();
    this.render();
    Context.refresh();
  },

  remove(id) {
    this.skills = this.skills.filter(s => s.id !== id);
    this.persist();
    this.render();
    Context.refresh();
  },

  get(id) { return this.skills.find(s => s.id === id); },

  // Carga progresiva: sólo el body cuenta como tokens "cargados".
  toggleLoaded(id) {
    const s = this.get(id);
    if (!s) return;
    s.loaded = !s.loaded;
    s.expandOnRender = s.loaded; // auto-expandir al cargar para que se VEA qué entró
    this.persist();
    this.render();
    Context.refresh();
    Context.log(`Skill "${s.name}" ${s.loaded ? 'CARGADA' : 'descargada'} (${s.loaded ? `+${estimateTokens(s.body)}` : `-${estimateTokens(s.body)}`} tokens en contexto)`);
  },

  // Tokens "permanentes" en contexto: nombre + descripción de cada skill.
  metadataTokens() {
    return this.skills.reduce((sum, s) =>
      sum + estimateTokens(`${s.name}: ${s.description}`), 0);
  },

  // Tokens de bodies actualmente cargados.
  loadedBodiesTokens() {
    return this.skills
      .filter(s => s.loaded)
      .reduce((sum, s) => sum + estimateTokens(s.body), 0);
  },

  filter: '',

  render() {
    const ul = document.getElementById('skills-list');
    if (!ul) return;
    let list = this.skills;
    if (this.filter) {
      const q = this.filter.toLowerCase();
      list = list.filter(s =>
        s.name.toLowerCase().includes(q) ||
        (s.description || '').toLowerCase().includes(q));
    }
    ul.innerHTML = '';
    if (list.length === 0) {
      ul.innerHTML = this.filter
        ? `<li class="text-xs text-muted">Sin resultados para "${escapeHtml(this.filter)}".</li>`
        : '<li class="text-xs text-muted">Aún no tienes skills. Construye uno desde un workflow real, no lo descargues de internet.</li>';
      return;
    }
    for (const s of list) {
      const li = document.createElement('li');
      li.className = 'skill-card' + (s.loaded ? ' loaded' : '') + (s.expandOnRender ? ' expanded' : '');
      if (s.expandOnRender) s.expandOnRender = false;
      const metaTok = estimateTokens(`${s.name}: ${s.description}`);
      const bodyTok = estimateTokens(s.body);
      li.innerHTML = `
        <div class="name">
          <span>${escapeHtml(s.name)}</span>
          <button class="text-xs text-muted hover:text-white" data-action="toggle-body">▾</button>
        </div>
        <div class="desc">${escapeHtml(s.description)}</div>
        <div class="meta">
          <span class="pill">desc: ${metaTok}t</span>
          <span class="pill ${s.loaded ? 'loaded' : ''}">body: ${bodyTok}t${s.loaded ? ' · cargada' : ''}</span>
          <span class="pill">iter: ${s.iterations || 0}</span>
        </div>
        <div class="body">${escapeHtml(s.body)}</div>
        <div class="actions">
          <button data-action="load">${s.loaded ? 'Descargar' : 'Cargar'}</button>
          <button data-action="invoke">Invocar</button>
          <button data-action="delete">Borrar</button>
        </div>`;
      li.querySelector('[data-action="toggle-body"]').onclick = (e) => {
        e.stopPropagation();
        li.classList.toggle('expanded');
      };
      li.querySelector('[data-action="load"]').onclick = () => this.toggleLoaded(s.id);
      li.querySelector('[data-action="invoke"]').onclick = () => MockAgent.invokeSkill(s.id);
      li.querySelector('[data-action="delete"]').onclick = () => {
        if (confirm(`¿Borrar skill "${s.name}"?`)) this.remove(s.id);
      };
      ul.appendChild(li);
    }
  }
};

function escapeHtml(str) {
  return String(str || '').replace(/[&<>"']/g, c => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
  }[c]));
}
window.escapeHtml = escapeHtml;
