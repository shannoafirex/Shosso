// Persistencia del historial del chat.
// Las skills, agentes, memoria, etc. ya se persisten. Faltaba el chat —
// el usuario perdía toda la conversación al recargar.
//
// Diseño: guardamos el HTML de cada mensaje + metadata, hasta un cap. Al
// iniciar restauramos. No re-procesamos (no recalculamos tokens) — la
// conversación es archivo.

window.ChatPersistence = {
  CAP: 200,
  KEY: 'shosso.chat.history',

  save(role, html, meta) {
    const list = this._read();
    list.push({ role, html, meta, ts: Date.now() });
    if (list.length > this.CAP) list.splice(0, list.length - this.CAP);
    SafeStorage.safeSet(this.KEY, list);
  },

  _read() {
    return SafeStorage.safeGet(this.KEY, []);
  },

  clear() {
    localStorage.removeItem(this.KEY);
  },

  restore() {
    const list = this._read();
    if (list.length === 0) return false;
    const wrap = document.getElementById('chat-log');
    if (!wrap) return false;
    wrap.innerHTML = '';
    for (const m of list) {
      const div = document.createElement('div');
      div.className = `msg msg-${m.role}`;
      div.innerHTML = (m.meta ? `<div class="meta">${escapeHtml(m.meta)}</div>` : '') + m.html;
      wrap.appendChild(div);
      this._rehydrate(div, m);
    }
    wrap.scrollTop = wrap.scrollHeight;
    // Banner discreto
    const banner = document.createElement('div');
    banner.className = 'msg msg-system';
    banner.innerHTML = `📂 Sesión restaurada · <b>${list.length}</b> mensajes <button id="clear-history" class="ml-2 text-[10px] underline text-warn hover:text-danger">borrar historial</button>`;
    wrap.insertBefore(banner, wrap.firstChild);
    document.getElementById('clear-history').onclick = () => {
      this.clear();
      wrap.innerHTML = '';
      Context.log('Historial de chat borrado.');
      if (typeof greet === 'function') greet();
    };
    return true;
  },

  // Re-asocia onclick handlers en mensajes restaurados (chips, desafiar,
  // compaction summary, ...). Sin esto, los botones del chat persistido
  // quedan visuales pero muertos.
  _rehydrate(div, m) {
    // Example chips
    div.querySelectorAll('.example-chip[data-text]').forEach(b => {
      b.addEventListener('click', () => MockAgent.send(b.dataset.text));
    });
    // Banner sycophancy (re-detectar y re-asociar)
    if (m.role === 'agent' && window.Sycophancy) Sycophancy.wrap(div, m.html);
    // Botones inline de compaction summary
    if (window.Compaction) Compaction._wireInlineButton(div);
    // clear-history button del banner anterior (si quedó en historial — no debería)
    const ch = div.querySelector('#clear-history');
    if (ch) ch.remove();
  }
};
