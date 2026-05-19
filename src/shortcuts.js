// Atajos de teclado globales para power users.
// Convención: Cmd/Ctrl como modifier base; Shift cuando es destructivo.
//
// Se evita interferir cuando el foco está en input/textarea (excepto
// los atajos que explícitamente operan en texto).

window.Shortcuts = {
  BINDINGS: [
    { keys: ['MOD+SHIFT+P'],    label: 'Command palette (todo en uno)', action: () => CommandPalette.open() },
    { keys: ['MOD+/', 'MOD+?'], label: 'Help', action: () => MockAgent.send('/help') },
    { keys: ['MOD+B'],          label: 'Archetype picker', action: () => Archetypes.openPicker() },
    { keys: ['MOD+P'],          label: 'Nuevo plan', action: () => Planner.open() },
    { keys: ['MOD+E'],          label: 'Export workspace', action: () => WorkspaceExport.openModal() },
    { keys: ['MOD+I'],          label: 'Foco chat', action: () => {
        document.querySelector('.bottom-tab[data-tab="chat"]')?.click();
        document.getElementById('chat-input')?.focus();
      } },
    { keys: ['MOD+SHIFT+D'],    label: 'Dispatch (foco chat con /dispatch)', action: () => {
        document.querySelector('.bottom-tab[data-tab="chat"]')?.click();
        const inp = document.getElementById('chat-input');
        if (inp) { inp.value = '/dispatch '; inp.focus(); }
      } },
    { keys: ['MOD+SHIFT+M'],    label: 'Metric (foco chat con /metric)', action: () => {
        document.querySelector('.bottom-tab[data-tab="chat"]')?.click();
        const inp = document.getElementById('chat-input');
        if (inp) { inp.value = '/metric '; inp.focus(); }
      } },
    { keys: ['MOD+SHIFT+I'],    label: 'Incident (foco chat con /incident)', action: () => {
        document.querySelector('.bottom-tab[data-tab="chat"]')?.click();
        const inp = document.getElementById('chat-input');
        if (inp) { inp.value = '/incident '; inp.focus(); }
      } },
    { keys: ['MOD+SHIFT+G'],    label: 'Grebloop', action: () => MockAgent.send('/grebloop') },
    { keys: ['MOD+SHIFT+H'],    label: 'Toggle Overview', action: () => Overview.open() },
    { keys: ['MOD+SHIFT+?'],    label: 'Mostrar todos los atajos', action: () => Shortcuts.showHelp() }
  ],

  init() {
    document.addEventListener('keydown', (e) => this._handle(e));
  },

  _handle(e) {
    const mod = (e.metaKey || e.ctrlKey);
    if (!mod) return;
    // Foco en input/textarea: solo permite atajos que explícitamente
    // operan sobre el chat. Los que llenan texto en chat-input son OK
    // si el chat-input es el foco — pero los basados en /letra que no
    // requieren texto seleccionado, los dejamos pasar al editor.
    const t = e.target;
    const isText = t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.isContentEditable);
    // En text fields permitimos solo los muy generales: ?, /
    const k = this._normalizeKey(e);
    if (!k) return;
    // Match contra bindings
    for (const b of this.BINDINGS) {
      if (b.keys.includes(k)) {
        // Reglas de inputs: permitimos siempre los que escriben al chat,
        // y los help. Otros (Planner.open) se cancelan si el foco es texto
        // editable que no sea chat-input.
        if (isText && t.id !== 'chat-input' && !['MOD+/', 'MOD+?', 'MOD+SHIFT+?', 'MOD+I'].includes(k)) {
          continue;
        }
        e.preventDefault();
        e.stopPropagation();
        try { b.action(); } catch (err) { console.warn('Shortcut error:', err); }
        return;
      }
    }
  },

  _normalizeKey(e) {
    const parts = [];
    if (e.metaKey || e.ctrlKey) parts.push('MOD');
    if (e.shiftKey) parts.push('SHIFT');
    if (e.altKey) parts.push('ALT');
    const key = e.key.toUpperCase();
    if (key === 'META' || key === 'CONTROL' || key === 'SHIFT' || key === 'ALT') return null;
    parts.push(key);
    return parts.join('+');
  },

  showHelp() {
    const isMac = navigator.platform.toLowerCase().includes('mac');
    const mod = isMac ? '⌘' : 'Ctrl';
    const display = (k) => k.replace('MOD', mod).replace('SHIFT', isMac ? '⇧' : 'Shift').replace(/\+/g, ' + ');
    const modal = document.createElement('div');
    modal.className = 'fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4';
    modal.innerHTML = `
      <div class="bg-panel border border-border rounded-lg w-full max-w-lg">
        <div class="flex items-center justify-between border-b border-border px-4 py-3">
          <h3 class="font-semibold">Atajos de teclado</h3>
          <button data-close class="text-muted hover:text-white">✕</button>
        </div>
        <div class="p-4">
          <ul class="space-y-1.5 text-xs">
            ${this.BINDINGS.map(b => `
              <li class="flex justify-between items-center">
                <span>${escapeHtml(b.label)}</span>
                <span class="font-mono text-accent2 bg-panel2 px-2 py-0.5 rounded">${display(b.keys[0])}</span>
              </li>
            `).join('')}
          </ul>
          <p class="text-[10px] text-muted mt-3">Cuando estás escribiendo en un input, solo los atajos generales funcionan. Foco al chat con ${mod} + I.</p>
        </div>
      </div>`;
    document.body.appendChild(modal);
    modal.querySelector('[data-close]').onclick = () => modal.remove();
    modal.onclick = e => { if (e.target === modal) modal.remove(); };
  }
};
