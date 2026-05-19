// Real LLM agent. Streams responses via main IPC, executes tools locally,
// loops until the model issues stop_reason='end_turn'. Anthropic + OpenAI.
window.Agent = {
  currentRunId: null,
  abortRequested: false,

  init() {
    document.getElementById('chat-form').addEventListener('submit', e => {
      e.preventDefault();
      const inp = document.getElementById('chat-input');
      const v = inp.value.trim();
      if (!v) return;
      inp.value = '';
      inp.style.height = '';
      this.userMessage(v);
    });
    // Shift+Enter = newline, Enter = send
    const chatInput = document.getElementById('chat-input');
    chatInput.addEventListener('keydown', e => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        document.getElementById('chat-form').requestSubmit();
      }
    });
    chatInput.addEventListener('input', () => {
      chatInput.style.height = '';
      chatInput.style.height = Math.min(chatInput.scrollHeight, 160) + 'px';
    });
    document.getElementById('chat-stop').onclick = () => this.abort();
    document.getElementById('tools-list').innerHTML = Tools.defs.map(t =>
      `<li>· ${t.name}</li>`).join('');

    // Register the LLM event listener exactly once. It dispatches by runId
    // to whichever turn is currently active.
    // Render is throttled: _renderMarkdown is O(N) per call, deltas can fire
    // hundreds of times per response → O(N²) without batching.
    let renderTimer = null;
    const flushRender = () => {
      renderTimer = null;
      if (!this._streamingEl) return;
      this._streamingEl.innerHTML = `<div class="text-[10px] text-muted">${this._streamMeta}</div>${this._renderMarkdown(this._streamText)}`;
      const log = document.getElementById('chat-log');
      log.scrollTop = log.scrollHeight;
    };
    window.shosso.llm.onEvent((runId, evt) => {
      if (runId !== this.currentRunId) return;
      if (evt.type === 'text_delta' && this._streamingEl) {
        this._streamText += evt.text;
        if (!renderTimer) renderTimer = setTimeout(flushRender, 50);
      }
      if (evt.type === 'block_start' && evt.block?.type === 'tool_use') {
        this.appendLog(`tool_call: ${evt.block.name}`);
      }
    });
  },

  appendChat(role, html, meta) {
    const log = document.getElementById('chat-log');
    if (!log) return;
    const div = document.createElement('div');
    div.className = `chat-msg chat-${role}`;
    div.innerHTML = (meta ? `<div class="text-[10px] text-muted">${escapeHtml(meta)}</div>` : '') + html;
    log.appendChild(div);
    // Cap DOM growth: keep the last 200 messages. Older history is gone
    // visually but still lives in Context.conversation if relevant.
    while (log.children.length > 200) log.removeChild(log.firstChild);
    log.scrollTop = log.scrollHeight;
    return div;
  },

  appendLog(text) {
    const el = document.getElementById('agent-logs');
    if (!el) return;
    const t = new Date().toLocaleTimeString();
    el.innerHTML += `<div>[${t}] ${escapeHtml(text)}</div>`;
    el.scrollTop = el.scrollHeight;
  },

  setRunStatus(text) {
    const el = document.getElementById('run-status');
    if (!el) return;
    if (text) { el.textContent = text; el.classList.remove('hidden'); }
    else el.classList.add('hidden');
    document.getElementById('chat-stop').classList.toggle('hidden', !text);
  },

  abort() {
    if (!this.currentRunId) return;
    this.abortRequested = true;
    window.shosso.llm.abort(this.currentRunId);
  },

  async userMessage(text) {
    if (this.currentRunId) {
      this.appendChat('system', '⚠ Hay un turno en curso. Pulsa Detener antes de enviar otro mensaje.');
      return;
    }
    this.appendChat('user', escapeHtml(text), 'tú');

    // Inject any skill mentioned by name as a system note for this turn.
    const matched = SkillsStore.matchByMention ? SkillsStore.matchByMention(text) : [];
    let perTurnSystem = '';
    if (matched.length) {
      const blocks = matched.map(s => `## Skill: ${s.name}\n${s.description}\n\n${s.body}`).join('\n\n');
      perTurnSystem = `Skills relevantes para este turno:\n\n${blocks}`;
      this.appendChat('system', `📚 Skill cargada: <b>${matched.map(s => escapeHtml(s.name)).join(', ')}</b>`);
    }

    Context.push({ role: 'user', content: text });
    await this.run({ perTurnSystem });
  },

  async invokeSkill(skill) {
    if (this.currentRunId) {
      this.appendChat('system', '⚠ Hay un turno en curso.');
      return;
    }
    const msg = `Aplica la skill "${skill.name}" según sus instrucciones.`;
    this.appendChat('user', escapeHtml(msg), 'tú · invoke skill');
    const perTurnSystem = `## Skill: ${skill.name}\n${skill.description}\n\n${skill.body}`;
    Context.push({ role: 'user', content: msg });
    await this.run({ perTurnSystem });
  },

  buildSystem(perTurn) {
    const s = window._settings || {};
    let sys = s.systemPrompt || 'Eres un agente que asiste con el código y los workflows del usuario. Sé conciso. Cuando necesites información del proyecto, usa las tools (read_file, glob, grep, list_dir, bash). Pide confirmación antes de escribir cambios significativos.';
    if (perTurn) sys += '\n\n' + perTurn;
    if (Projects.root) sys += `\n\nCarpeta de trabajo: ${Projects.root}`;
    return sys;
  },

  async run({ perTurnSystem } = {}) {
    const s = window._settings || {};
    const provider = s.provider || 'anthropic';
    const model = provider === 'openai' ? s.openaiModel : s.anthropicModel;

    // We rely on the main process to throw if no key is found (it checks both
    // safeStorage and process.env). Surface a hint here if safeStorage is empty
    // so the user doesn't wait for the API error.
    const hasKey = await window.shosso.secrets.has(provider);
    if (!hasKey) {
      this.appendChat('system', `⚠ No hay API key de ${provider} en safeStorage. Si no la tienes en variable de entorno, configúrala en ⚙ Ajustes.`);
    }

    // Loop until the model stops calling tools.
    let iterations = 0;
    const maxIter = 25;
    while (iterations++ < maxIter) {
      this.currentRunId = 'run-' + Date.now() + '-' + Math.random().toString(36).slice(2, 7);
      this.abortRequested = false;
      this.setRunStatus('Pensando…');

      const opts = {
        runId: this.currentRunId,
        provider,
        model,
        system: this.buildSystem(perTurnSystem),
        messages: this._messagesFor(provider),
        tools: provider === 'openai' ? Tools.asOpenAI(Tools.defs) : Tools.defs,
        maxTokens: s.maxTokens || 4096
      };

      // Streaming UI: create a placeholder assistant message; the single
      // global event listener (registered in init) streams into it.
      const assistantEl = this.appendChat('assistant', '<span class="text-muted">…</span>', `${provider} · ${model}`);
      this._streamingEl = assistantEl;
      this._streamText = '';
      this._streamMeta = `${provider} · ${model}`;

      let res;
      try {
        res = await window.shosso.llm.run(opts);
      } catch (err) {
        assistantEl.innerHTML = `<div class="text-danger text-xs">⚠ ${escapeHtml(err.message)}</div>`;
        this.setRunStatus(null);
        this.currentRunId = null;
        this._streamingEl = null;
        return;
      }

      if (res?.error) {
        assistantEl.innerHTML = `<div class="text-danger text-xs">⚠ ${escapeHtml(res.error)}</div>`;
        this.setRunStatus(null);
        this.currentRunId = null;
        this._streamingEl = null;
        return;
      }

      Context.setUsage(res.usage);

      // Defensive: SDK may return res.content as null/undefined on empty
      // responses. Normalize to array before any filter/map.
      const content = Array.isArray(res.content) ? res.content : [];

      // Persist assistant message into running conversation
      Context.push({ role: 'assistant', content });

      // Render tool calls into chat for visibility
      const toolUses = content.filter(b => b.type === 'tool_use');
      if (toolUses.length === 0) {
        const finalText = content.filter(b => b.type === 'text').map(b => b.text).join('\n');
        if (!finalText && !this._streamText) {
          assistantEl.innerHTML = `<div class="text-[10px] text-muted">${provider} · ${model}</div><span class="text-muted italic">(respuesta vacía)</span>`;
        } else if (finalText && finalText !== this._streamText) {
          assistantEl.innerHTML = `<div class="text-[10px] text-muted">${provider} · ${model}</div>${this._renderMarkdown(finalText)}`;
        }
        this._streamingEl = null;
        break;
      }
      this._streamingEl = null;

      // Execute tools sequentially; collect tool_result blocks
      const toolResults = [];
      for (const tu of toolUses) {
        this.setRunStatus(`tool: ${tu.name}`);
        const argsPreview = JSON.stringify(tu.input).slice(0, 200);
        this.appendChat('tool', `<b>${escapeHtml(tu.name)}</b>(<code class="text-[10px]">${escapeHtml(argsPreview)}</code>)`, 'tool call');
        let result;
        try { result = await Tools.execute(tu.name, tu.input); }
        catch (err) { result = { error: err.message }; }
        const summary = this._summarizeToolResult(result);
        this.appendChat('tool-result', `<pre class="text-[10px] whitespace-pre-wrap bg-panel2 p-1.5 rounded max-h-40 overflow-y-auto">${escapeHtml(summary)}</pre>`, 'tool result');
        this.appendLog(`tool_result: ${tu.name} → ${summary.slice(0, 80)}`);
        toolResults.push({ tool_use_id: tu.id, name: tu.name, result });
      }

      // Always store in Anthropic-style format (tool_result blocks under role='user').
      // The provider-specific message builder converts at request time.
      Context.push({
        role: 'user',
        content: toolResults.map(r => ({
          type: 'tool_result',
          tool_use_id: r.tool_use_id,
          content: typeof r.result === 'string' ? r.result : JSON.stringify(r.result)
        }))
      });
      // Loop continues — model will see tool outputs and respond.
      if (this.abortRequested) break;
    }

    this.setRunStatus(null);
    this.currentRunId = null;
    Context.refresh();
    await Compaction.maybeAuto();
  },

  // Build messages array in the format the chosen provider expects.
  _messagesFor(provider) {
    if (provider === 'anthropic') {
      return Context.conversation.map(m => ({
        role: m.role,
        content: m.content
      }));
    }
    // OpenAI: role 'user'/'assistant'/'tool'. Convert assistant blocks with
    // tool_use into assistant messages with `tool_calls`. tool_result blocks
    // become role='tool' messages.
    const out = [];
    for (const m of Context.conversation) {
      if (m.role === 'assistant' && Array.isArray(m.content)) {
        const text = m.content.filter(b => b.type === 'text').map(b => b.text).join('');
        const toolCalls = m.content.filter(b => b.type === 'tool_use').map(b => ({
          id: b.id, type: 'function',
          function: { name: b.name, arguments: JSON.stringify(b.input || {}) }
        }));
        // OpenAI allows content:null only if tool_calls is present.
        // Otherwise we must use empty string to keep the message valid.
        const msg = { role: 'assistant', content: text || (toolCalls.length ? null : '') };
        if (toolCalls.length) msg.tool_calls = toolCalls;
        out.push(msg);
      } else if (m.role === 'user' && Array.isArray(m.content)) {
        // tool_result blocks → role='tool'
        for (const b of m.content) {
          if (b.type === 'tool_result') {
            out.push({ role: 'tool', tool_call_id: b.tool_use_id, content: typeof b.content === 'string' ? b.content : JSON.stringify(b.content) });
          }
        }
      } else {
        out.push({ role: m.role, content: typeof m.content === 'string' ? m.content : JSON.stringify(m.content) });
      }
    }
    return out;
  },

  _summarizeToolResult(r) {
    if (!r) return '(vacío)';
    if (r.error) return 'error: ' + r.error;
    if (typeof r === 'string') return r.slice(0, 400);
    const s = JSON.stringify(r);
    return s.length > 600 ? s.slice(0, 600) + '…' : s;
  },

  _renderMarkdown(text) {
    // Minimal markdown: code fences + bold + inline code. Avoid pulling a lib.
    let html = escapeHtml(text);
    html = html.replace(/```(\w*)\n([\s\S]*?)```/g, (_, lang, code) =>
      `<pre class="bg-panel2 p-2 rounded text-[11px] overflow-x-auto"><code>${code}</code></pre>`);
    html = html.replace(/`([^`]+)`/g, '<code class="bg-panel2 px-1 rounded text-[11px]">$1</code>');
    html = html.replace(/\*\*([^*]+)\*\*/g, '<b>$1</b>');
    html = html.replace(/\n/g, '<br>');
    return html;
  },

  // Used by Compaction.
  async summarizeConversation(conv) {
    const s = window._settings || {};
    const provider = s.provider || 'anthropic';
    const model = provider === 'openai' ? s.openaiModel : s.anthropicModel;
    const messages = [
      { role: 'user', content:
        'Resume la conversación previa en un párrafo denso (máx 500 palabras). ' +
        'Incluye decisiones tomadas, archivos modificados, comandos ejecutados, ' +
        'errores encontrados y estado actual. No incluyas saludos ni meta-comentarios.\n\n' +
        '---\nCONVERSACIÓN:\n' +
        conv.map(m => `[${m.role}] ${typeof m.content === 'string' ? m.content : JSON.stringify(m.content).slice(0, 1000)}`).join('\n\n')
      }
    ];
    const res = await window.shosso.llm.run({
      runId: 'compact-' + Date.now(),
      provider, model, system: 'Eres un resumidor preciso de conversaciones técnicas.',
      messages, tools: [], maxTokens: 1024
    });
    if (res.error) throw new Error(res.error);
    const text = (res.content || []).filter(b => b.type === 'text').map(b => b.text).join('\n');
    return text || '(sin resumen)';
  }
};

