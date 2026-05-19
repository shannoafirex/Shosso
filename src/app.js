// Bootstrap: wire everything together.
(async function main() {
  await Settings.init();
  await Projects.init();
  await Editor.init();
  await Terminal.init();
  await GitPanel.init();
  await SkillsStore.init();
  MemoryStore.init();
  Context.init();
  Tokenizer.init();
  Agent.init();

  // Tabs (bottom, left, right)
  document.querySelectorAll('.bottom-tab').forEach(b => {
    b.onclick = () => {
      document.querySelectorAll('.bottom-tab').forEach(x => x.classList.remove('bg-panel2'));
      b.classList.add('bg-panel2');
      const tab = b.dataset.tab;
      document.querySelectorAll('.bottom-panel').forEach(p =>
        p.classList.toggle('hidden', p.dataset.panel !== tab));
      if (tab === 'terminal') Terminal.focus();
    };
  });
  document.querySelectorAll('.left-tab').forEach(b => {
    b.onclick = () => {
      document.querySelectorAll('.left-tab').forEach(x => x.classList.remove('bg-panel2'));
      b.classList.add('bg-panel2');
      document.querySelectorAll('.left-panel').forEach(p =>
        p.classList.toggle('hidden', p.dataset.leftPanel !== b.dataset.leftTab));
    };
  });
  document.querySelectorAll('.right-tab').forEach(b => {
    b.onclick = () => {
      document.querySelectorAll('.right-tab').forEach(x => x.classList.remove('bg-panel2'));
      b.classList.add('bg-panel2');
      document.querySelectorAll('.right-panel').forEach(p =>
        p.classList.toggle('hidden', p.dataset.rightPanel !== b.dataset.rightTab));
    };
  });

  document.getElementById('btn-open-folder').onclick = async () => {
    const dir = await window.shosso.app.pickFolder();
    if (dir) Projects.setRoot(dir);
  };
  document.getElementById('skill-new').onclick = () => SkillsStore.add();
  document.getElementById('skill-filter').addEventListener('input', e => {
    SkillsStore.filter = e.target.value;
    SkillsStore.render();
  });

  // Menu events from main process
  window.shosso.on.openFolder(dir => Projects.setRoot(dir));
  window.shosso.on.menu(action => {
    if (action === 'settings') Settings.open();
    if (action === 'save') Editor.save();
    if (action === 'git-status') GitPanel.refresh();
    if (action === 'git-commit') {
      document.querySelector('[data-leftTab="git"]')?.click();
      document.getElementById('git-msg').focus();
    }
    if (action === 'toggle-terminal') {
      document.querySelector('.bottom-tab[data-tab="terminal"]')?.click();
    }
    if (action === 'toggle-chat') {
      document.querySelector('.bottom-tab[data-tab="chat"]')?.click();
      document.getElementById('chat-input').focus();
    }
  });

  // Escape closes top modal
  document.addEventListener('keydown', e => {
    if (e.key !== 'Escape') return;
    const modal = document.getElementById('settings-modal');
    if (!modal.classList.contains('hidden')) Settings.close();
  });

  // Initial render
  if (Projects.root) {
    Editor._renderFileTree();
    GitPanel.refresh();
    SkillsStore.reload();
  } else {
    Agent.appendChat('system',
      `Bienvenido a Shosso.<br>` +
      `1. Abre una carpeta (botón <b>📁</b> o Cmd/Ctrl+O).<br>` +
      `2. Configura tu API key en <b>⚙ Ajustes</b>.<br>` +
      `3. Pídele algo al agente — leerá/escribirá ficheros, correrá comandos, etc.`);
  }
})();
