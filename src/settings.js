// Settings: provider, model, API keys (via safeStorage), max tokens,
// auto-compact threshold, system prompt persisted to disk.
window.Settings = {
  _keyDownTrap: null,
  _prevFocus: null,

  async init() {
    const s = await window.shosso.settings.get();
    window._settings = s;

    document.getElementById('btn-settings').onclick = () => this.open();
    document.getElementById('cfg-provider').addEventListener('change', e => {
      const newVal = e.target.value;
      const applyToggle = (val) => {
        document.getElementById('cfg-anthropic-block').classList.toggle('hidden', val !== 'anthropic');
        document.getElementById('cfg-openai-block').classList.toggle('hidden', val !== 'openai');
      };
      applyToggle(newVal);
      // If there's history with tool_use blocks, the IDs are provider-
      // specific (toolu_xxx vs call_xxx) and don't translate cleanly.
      const hasToolHistory = (Context.conversation || []).some(m =>
        Array.isArray(m.content) && m.content.some(b => b.type === 'tool_use' || b.type === 'tool_result'));
      if (hasToolHistory) {
        if (confirm('Cambiar de proveedor con tool calls en el historial requiere reset de la conversación (los IDs no son compatibles). ¿Continuar?')) {
          Context.reset();
        } else {
          e.target.value = window._settings.provider;
          applyToggle(window._settings.provider);
          return;
        }
      }
      this._save({ provider: newVal });
      this._renderProviderPill();
    });
    document.getElementById('cfg-anthropic-model').addEventListener('change', e =>
      this._save({ anthropicModel: e.target.value }));
    document.getElementById('cfg-openai-model').addEventListener('change', e =>
      this._save({ openaiModel: e.target.value }));
    document.getElementById('cfg-max-tokens').addEventListener('change', e => {
      const n = parseInt(e.target.value, 10);
      const clamped = Math.max(256, Math.min(32000, isFinite(n) ? n : 4096));
      e.target.value = clamped;
      this._save({ maxTokens: clamped });
    });
    document.getElementById('cfg-auto-compact').addEventListener('change', e => {
      // Input is type=number step=5, but parseInt also defends against
      // pasted decimals like "82.5" — we floor to an int and clamp.
      const n = parseInt(e.target.value, 10);
      const clamped = Math.max(50, Math.min(95, isFinite(n) ? n : 80));
      e.target.value = clamped;
      this._save({ autoCompactPct: clamped / 100 });
    });

    document.getElementById('cfg-anthropic-save').onclick = () => this._saveKey('anthropic');
    document.getElementById('cfg-openai-save').onclick = () => this._saveKey('openai');

    // Show/hide eye toggle for password inputs so the user can verify a
    // pasted key. Toggles only the input it sits next to.
    this._attachKeyReveal('cfg-anthropic-key');
    this._attachKeyReveal('cfg-openai-key');

    document.querySelectorAll('#settings-modal [data-close]').forEach(b =>
      b.onclick = () => this.close());
    // Click outside the dialog closes it (modal backdrop).
    const modal = document.getElementById('settings-modal');
    modal.addEventListener('click', e => { if (e.target === modal) this.close(); });

    // System prompt persistence to settings (not a secret, just shared config)
    const sp = document.getElementById('system-prompt');
    sp.value = s.systemPrompt || '';
    document.getElementById('system-save').onclick = () => {
      this._save({ systemPrompt: sp.value });
      Agent.appendChat('system', '✓ System prompt guardado.');
    };

    this._renderProviderPill();
    await this._refreshKeyStatus();
  },

  _attachKeyReveal(inputId) {
    const input = document.getElementById(inputId);
    if (!input || input.parentElement?.querySelector(`[data-reveal="${inputId}"]`)) return;
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.dataset.reveal = inputId;
    btn.title = 'Mostrar/ocultar';
    btn.textContent = '👁';
    btn.className = 'text-xs px-2 rounded bg-panel2 hover:bg-border';
    btn.onclick = () => {
      input.type = input.type === 'password' ? 'text' : 'password';
    };
    // Insert the eye button right after the input (before the Save button).
    input.insertAdjacentElement('afterend', btn);
  },

  async _save(patch) {
    const s = await window.shosso.settings.get();
    Object.assign(s, patch);
    await window.shosso.settings.set(s);
    window._settings = s;
    this._renderProviderPill();
    if (window.Context) Context.refresh();
  },

  _renderProviderPill() {
    const s = window._settings || {};
    const pill = document.getElementById('provider-pill');
    if (!pill) return;
    const model = s.provider === 'openai' ? s.openaiModel : s.anthropicModel;
    pill.textContent = (s.provider || 'anthropic') + ' · ' + (model || '');
  },

  async _saveKey(which) {
    const inputId = `cfg-${which}-key`;
    const v = document.getElementById(inputId).value.trim();
    if (!v) return alert('Pega la API key primero.');
    const avail = await window.shosso.secrets.available();
    if (!avail) return alert('safeStorage no está disponible en este SO. Pon la key en variable de entorno: ' + (which === 'anthropic' ? 'ANTHROPIC_API_KEY' : 'OPENAI_API_KEY'));
    try {
      await window.shosso.secrets.set(which, v);
    } catch (err) {
      return alert('Error guardando la key: ' + (err.message || err));
    }
    const input = document.getElementById(inputId);
    input.value = '';
    // Restore password masking if the user had toggled it to text.
    input.type = 'password';
    await this._refreshKeyStatus();
  },

  async _refreshKeyStatus() {
    for (const which of ['anthropic', 'openai']) {
      const has = await window.shosso.secrets.has(which);
      const status = document.getElementById(`cfg-${which}-status`);
      if (status) status.textContent = has ? '✓ key guardada (cifrada)' : '— sin key —';
    }
  },

  open() {
    const s = window._settings || {};
    document.getElementById('cfg-provider').value = s.provider || 'anthropic';
    document.getElementById('cfg-anthropic-model').value = s.anthropicModel || 'claude-sonnet-4-5';
    document.getElementById('cfg-openai-model').value = s.openaiModel || 'gpt-4o';
    document.getElementById('cfg-max-tokens').value = s.maxTokens || 4096;
    document.getElementById('cfg-auto-compact').value = Math.round((s.autoCompactPct ?? 0.8) * 100);
    // Initial open: toggle the correct block based on the persisted provider
    // so the user doesn't see Anthropic fields while configured for OpenAI.
    const provider = s.provider || 'anthropic';
    document.getElementById('cfg-anthropic-block').classList.toggle('hidden', provider !== 'anthropic');
    document.getElementById('cfg-openai-block').classList.toggle('hidden', provider !== 'openai');
    const modal = document.getElementById('settings-modal');
    modal.classList.remove('hidden');
    // Remember where focus was so we can restore it on close.
    this._prevFocus = document.activeElement;
    // Move focus into the dialog and trap Tab inside it. Without this,
    // Tab walks into the background editor / sidebar (still in the DOM).
    this._installFocusTrap(modal);
    this._refreshKeyStatus();
  },

  close() {
    const modal = document.getElementById('settings-modal');
    modal.classList.add('hidden');
    this._removeFocusTrap();
    // Mask any password inputs that the user revealed.
    ['cfg-anthropic-key', 'cfg-openai-key'].forEach(id => {
      const el = document.getElementById(id);
      if (el) el.type = 'password';
    });
    // Restore focus to whatever was focused before opening (typically the
    // gear button) so keyboard users don't lose their place.
    try { this._prevFocus?.focus?.(); } catch {}
    this._prevFocus = null;
  },

  _focusables(root) {
    const sel = 'a[href], button:not([disabled]), input:not([disabled]):not([type="hidden"]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';
    return Array.from(root.querySelectorAll(sel)).filter(el => {
      // Skip hidden elements (display:none ancestor → offsetParent is null).
      return el.offsetParent !== null || el === document.activeElement;
    });
  },

  _installFocusTrap(modal) {
    this._removeFocusTrap();
    const items = this._focusables(modal);
    if (items.length) items[0].focus();
    this._keyDownTrap = (e) => {
      if (e.key === 'Escape') { e.preventDefault(); this.close(); return; }
      if (e.key !== 'Tab') return;
      const current = this._focusables(modal);
      if (!current.length) { e.preventDefault(); return; }
      const first = current[0];
      const last = current[current.length - 1];
      const active = document.activeElement;
      if (e.shiftKey) {
        if (active === first || !modal.contains(active)) {
          e.preventDefault();
          last.focus();
        }
      } else {
        if (active === last || !modal.contains(active)) {
          e.preventDefault();
          first.focus();
        }
      }
    };
    document.addEventListener('keydown', this._keyDownTrap, true);
  },

  _removeFocusTrap() {
    if (this._keyDownTrap) {
      document.removeEventListener('keydown', this._keyDownTrap, true);
      this._keyDownTrap = null;
    }
  }
};
