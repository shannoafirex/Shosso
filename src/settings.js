// Settings: provider, model, API keys (via safeStorage), max tokens,
// auto-compact threshold, system prompt persisted to disk.
window.Settings = {
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
    document.getElementById('cfg-max-tokens').addEventListener('change', e =>
      this._save({ maxTokens: parseInt(e.target.value, 10) || 4096 }));
    document.getElementById('cfg-auto-compact').addEventListener('change', e =>
      this._save({ autoCompactPct: (parseInt(e.target.value, 10) || 80) / 100 }));

    document.getElementById('cfg-anthropic-save').onclick = () => this._saveKey('anthropic');
    document.getElementById('cfg-openai-save').onclick = () => this._saveKey('openai');

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
    document.getElementById(inputId).value = '';
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
    document.getElementById('cfg-anthropic-block').classList.toggle('hidden', s.provider === 'openai');
    document.getElementById('cfg-openai-block').classList.toggle('hidden', s.provider !== 'openai');
    document.getElementById('settings-modal').classList.remove('hidden');
    this._refreshKeyStatus();
  },

  close() { document.getElementById('settings-modal').classList.add('hidden'); }
};
