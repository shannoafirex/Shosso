// Bootstrap: wire everything together.
(async function main() {
  // Each init is isolated: a failure in one module must not prevent the
  // rest from coming up (partial functionality > blank window).
  const steps = [
    ['Settings',    () => Settings.init()],
    ['Projects',    () => Projects.init()],
    ['Editor',      () => Editor.init()],
    ['Terminal',    () => Terminal.init()],
    ['GitPanel',    () => GitPanel.init()],
    ['SkillsStore', () => SkillsStore.init()],
    ['MemoryStore', () => MemoryStore.init()],
    ['Context',     () => Context.init()],
    ['Tokenizer',   () => Tokenizer.init()],
    ['Agent',       () => Agent.init()],
  ];
  for (const [name, fn] of steps) {
    try { await fn(); }
    catch (err) {
      console.error(`[shosso] ${name}.init() failed:`, err);
      try {
        const log = document.getElementById('agent-logs');
        if (log) log.innerHTML += `<div class="text-danger">[init] ${name} failed: ${(err && err.message) || err}</div>`;
      } catch {}
    }
  }

  // Tabs (bottom, left, right). Generic activator updates ARIA + classes.
  function wireTabs(tabSel, panelSel, dataAttr, panelAttr, onActivate) {
    const tabs = document.querySelectorAll(tabSel);
    const panels = document.querySelectorAll(panelSel);
    tabs.forEach(b => {
      b.onclick = () => {
        const key = b.dataset[dataAttr];
        tabs.forEach(x => {
          const active = x === b;
          x.classList.toggle('bg-panel2', active);
          x.setAttribute('aria-selected', active ? 'true' : 'false');
          x.tabIndex = active ? 0 : -1;
        });
        panels.forEach(p => {
          const show = p.dataset[panelAttr] === key;
          p.classList.toggle('hidden', !show);
        });
        if (onActivate) onActivate(key);
      };
    });
  }
  wireTabs('.bottom-tab', '.bottom-panel', 'tab', 'panel', tab => {
    if (tab === 'terminal') { try { Terminal.focus(); } catch {} }
  });
  wireTabs('.left-tab', '.left-panel', 'lefttab', 'leftpanel');
  wireTabs('.right-tab', '.right-panel', 'righttab', 'rightpanel');

  const openFolderBtn = document.getElementById('btn-open-folder');
  if (openFolderBtn) openFolderBtn.onclick = async () => {
    const dir = await window.shosso.app.pickFolder();
    if (dir) Projects.setRoot(dir);
  };
  const skillNewBtn = document.getElementById('skill-new');
  if (skillNewBtn) skillNewBtn.onclick = () => SkillsStore.add();
  const skillFilter = document.getElementById('skill-filter');
  if (skillFilter) skillFilter.addEventListener('input', e => {
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
      document.getElementById('git-msg')?.focus();
    }
    if (action === 'toggle-terminal') {
      document.querySelector('.bottom-tab[data-tab="terminal"]')?.click();
    }
    if (action === 'toggle-chat') {
      document.querySelector('.bottom-tab[data-tab="chat"]')?.click();
      document.getElementById('chat-input')?.focus();
    }
  });

  // Escape closes top modal
  document.addEventListener('keydown', e => {
    if (e.key !== 'Escape') return;
    const modal = document.getElementById('settings-modal');
    if (modal && !modal.classList.contains('hidden')) Settings.close();
  });

  // Initial render. Projects.init() only loads lastFolder from settings; it
  // does NOT dispatch rootChanged, so we fire it here so every module that
  // listens (editor, git, skills, memory, terminal cwd) gets notified.
  if (Projects.root) {
    document.dispatchEvent(new CustomEvent('shosso:rootChanged', { detail: Projects.root }));
  } else {
    Agent.appendChat('system',
      `Bienvenido a Shosso.<br>` +
      `1. Abre una carpeta (botón <b>📁</b> o Cmd/Ctrl+O).<br>` +
      `2. Configura tu API key en <b>⚙ Ajustes</b>.<br>` +
      `3. Pídele algo al agente — leerá/escribirá ficheros, correrá comandos, etc.`);
  }
})();
