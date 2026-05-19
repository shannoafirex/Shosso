// Orquesta de agentes. Filosofía del podcast: empezar con UN agente.
// Sub-agentes sólo cuando aportan productividad real, no para verse cool.

window.AgentsStore = {
  agents: [],

  init() {
    const saved = localStorage.getItem('shosso.agents');
    this.agents = saved ? JSON.parse(saved) : structuredClone(window.SEED_AGENTS);
    this.persist();
  },

  persist() {
    localStorage.setItem('shosso.agents', JSON.stringify(this.agents));
  },

  add(agent) {
    this.agents.push(agent);
    this.persist();
    this.render();
    if (window.Productivity) Productivity.refresh();
    if (window.Workshop) Workshop.render();
  },

  remove(id) {
    if (id === 'main') return;
    this.agents = this.agents.filter(a => a.id !== id);
    this.persist();
    this.render();
    if (window.Productivity) Productivity.refresh();
    if (window.Workshop) Workshop.render();
  },

  render() {
    const ul = document.getElementById('agents-list');
    if (!ul) return;
    ul.innerHTML = '';
    const main = this.agents.find(a => a.type === 'main');
    const subs = this.agents.filter(a => a.type === 'sub');

    if (main) ul.appendChild(this._renderCard(main));
    subs.forEach(a => ul.appendChild(this._renderCard(a)));
  },

  _renderCard(a) {
    const li = document.createElement('li');
    li.className = `agent-card ${a.type}`;
    const skillsHtml = (a.skills || [])
      .map(sid => `<span>${escapeHtml(sid)}</span>`).join('');
    li.innerHTML = `
      <div class="flex justify-between items-start">
        <div>
          <div class="name">${escapeHtml(a.name)}</div>
          <div class="role">${escapeHtml(a.role)}</div>
        </div>
        ${a.type === 'sub' ? `<button class="text-xs text-muted hover:text-danger" data-action="remove">✕</button>` : ''}
      </div>
      <div class="skills-attached">${skillsHtml || '<span class="text-muted">sin skills</span>'}</div>
    `;
    const rm = li.querySelector('[data-action="remove"]');
    if (rm) rm.onclick = () => {
      if (confirm(`¿Borrar sub-agente "${a.name}"?`)) this.remove(a.id);
    };
    return li;
  }
};
