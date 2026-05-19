// Panel de Seguridad. Del 2º podcast (Mickey/David):
// "Es scary. Los modelos están tan buenos que se pueden correr en loop para
// hacer cosas nefastas. Para nosotros: passphrase familiar, 2FA real (no
// SMS), password manager, y SOBRE TODO nunca instales un paquete con
// menos de 14 días de vida — ahí están los supply chain attacks."

window.Security = {
  state: {
    passphrase: '',
    twoFAEnabled: false,
    passwordManager: false,
    backupKey: false,
    packageMinAge: 14
  },

  init() {
    const saved = localStorage.getItem('shosso.security');
    if (saved) this.state = { ...this.state, ...JSON.parse(saved) };
    this.render();
    this._bind();
  },

  persist() { localStorage.setItem('shosso.security', JSON.stringify(this.state)); },

  _bind() {
    document.getElementById('sec-pp').addEventListener('input', e => {
      this.state.passphrase = e.target.value; this.persist(); this._renderScore();
    });
    document.getElementById('sec-2fa').addEventListener('change', e => {
      this.state.twoFAEnabled = e.target.checked; this.persist(); this._renderScore();
    });
    document.getElementById('sec-pm').addEventListener('change', e => {
      this.state.passwordManager = e.target.checked; this.persist(); this._renderScore();
    });
    document.getElementById('sec-bk').addEventListener('change', e => {
      this.state.backupKey = e.target.checked; this.persist(); this._renderScore();
    });
    document.getElementById('sec-pkg-age').addEventListener('change', e => {
      this.state.packageMinAge = parseInt(e.target.value) || 14;
      this.persist(); this._renderScore();
    });

    document.getElementById('sec-pkg-form').addEventListener('submit', e => {
      e.preventDefault();
      const pkg = document.getElementById('sec-pkg-input').value.trim();
      this.checkPackage(pkg);
    });
    document.getElementById('sec-cooked-form').addEventListener('submit', e => {
      e.preventDefault();
      const desc = document.getElementById('sec-cooked-input').value.trim();
      this.amICooked(desc);
    });
  },

  render() {
    const wrap = document.getElementById('security-panel-body');
    if (!wrap) return;
    wrap.innerHTML = `
      <div class="space-y-4">
        <div>
          <div class="flex items-center justify-between">
            <h3 class="text-sm font-semibold">Postura de seguridad</h3>
            <span id="sec-score" class="text-xs font-mono px-2 py-0.5 rounded bg-panel2"></span>
          </div>
          <p class="text-[11px] text-muted leading-snug mt-1">Lo mínimo para no estar "cooked" en la era agentic.</p>
        </div>

        <div class="space-y-2">
          <label class="flex items-center justify-between text-xs gap-2">
            <span>2FA real (no SMS — SIM swap es real)</span>
            <input type="checkbox" id="sec-2fa" ${this.state.twoFAEnabled?'checked':''} class="accent-accent" />
          </label>
          <label class="flex items-center justify-between text-xs gap-2">
            <span>Gestor de contraseñas (1Password / Bitwarden)</span>
            <input type="checkbox" id="sec-pm" ${this.state.passwordManager?'checked':''} class="accent-accent" />
          </label>
          <label class="flex items-center justify-between text-xs gap-2">
            <span>Backup key entregada a familiar de confianza</span>
            <input type="checkbox" id="sec-bk" ${this.state.backupKey?'checked':''} class="accent-accent" />
          </label>
        </div>

        <div>
          <label class="text-xs flex flex-col gap-1">
            <span>Passphrase familiar (contra voice cloning)</span>
            <input type="text" id="sec-pp" value="${escapeHtml(this.state.passphrase)}"
              placeholder='ej: "el perro de la abuela"'
              class="bg-panel2 border border-border rounded px-2 py-1 text-xs outline-none focus:border-accent" />
          </label>
          <p class="text-[10px] text-muted mt-1">Si alguien con tu voz pide dinero por teléfono, deben saber la passphrase. La voz clonada hoy es indistinguible.</p>
        </div>

        <div class="pt-3 border-t border-border space-y-2">
          <h3 class="text-sm font-semibold">Bloqueo de paquetes recientes</h3>
          <label class="text-xs flex items-center justify-between gap-2">
            <span>Bloquear paquetes con menos de</span>
            <span class="flex items-center gap-1">
              <input type="number" id="sec-pkg-age" value="${this.state.packageMinAge}" min="0" max="365"
                class="w-14 bg-panel2 border border-border rounded px-2 py-1 text-xs font-mono outline-none focus:border-accent" />
              <span>días</span>
            </span>
          </label>
          <p class="text-[10px] text-muted">La mayor parte de los supply chain attacks publica una versión maliciosa y la mete en árboles de dependencias antes de ser detectada. 14 días suele bastar.</p>
          <form id="sec-pkg-form" class="flex gap-1">
            <input id="sec-pkg-input" placeholder="ej: left-pad@1.3.0 — comprobar edad"
              class="flex-1 bg-panel2 border border-border rounded px-2 py-1 text-xs outline-none focus:border-accent" />
            <button class="text-xs px-2 py-1 rounded bg-accent/20 text-accent">Check</button>
          </form>
          <div id="sec-pkg-result" class="text-xs"></div>
        </div>

        <div class="pt-3 border-t border-border space-y-2">
          <h3 class="text-sm font-semibold">Am I cooked?</h3>
          <p class="text-[11px] text-muted leading-snug">Pega aquí el resumen de una alerta (tweet, CVE, descripción de un breach). Shosso simula el chequeo sobre tu workspace.</p>
          <form id="sec-cooked-form" class="space-y-1">
            <textarea id="sec-cooked-input" rows="3"
              placeholder="ej: 'paquete chalk@5.4.1 publicado hace 3 horas tiene postinstall malicioso'"
              class="w-full bg-panel2 border border-border rounded px-2 py-1 text-xs outline-none focus:border-accent"></textarea>
            <button class="text-xs px-2 py-1 rounded bg-warn/20 text-warn w-full">Escanear workspace</button>
          </form>
          <div id="sec-cooked-result" class="text-xs"></div>
        </div>
      </div>
    `;
    this._renderScore();
  },

  _renderScore() {
    let s = 0;
    if (this.state.twoFAEnabled) s += 25;
    if (this.state.passwordManager) s += 20;
    if (this.state.backupKey) s += 15;
    if (this.state.passphrase.length >= 4) s += 20;
    if (this.state.packageMinAge >= 7) s += 20;
    const el = document.getElementById('sec-score');
    if (!el) return;
    el.textContent = s + '/100';
    el.className = 'text-xs font-mono px-2 py-0.5 rounded';
    if (s >= 80) el.classList.add('bg-success/20', 'text-success');
    else if (s >= 50) el.classList.add('bg-warn/20', 'text-warn');
    else el.classList.add('bg-danger/20', 'text-danger');
  },

  // Mock: cualquier paquete con "@" reciente o nombre sospechoso → riesgo.
  checkPackage(spec) {
    const wrap = document.getElementById('sec-pkg-result');
    if (!spec) { wrap.innerHTML = ''; return; }
    const ageDays = this._mockAge(spec);
    const min = this.state.packageMinAge;
    if (ageDays < min) {
      wrap.innerHTML = `<div class="p-2 mt-1 bg-danger/10 border border-danger/30 rounded">
        ⚠ <b>${escapeHtml(spec)}</b> tiene ~${ageDays} día(s) — por debajo de tu umbral (${min}).<br>
        <span class="text-muted">No lo instales todavía. Espera ${min - ageDays} día(s) más o pin a una versión anterior estable.</span>
      </div>`;
    } else {
      wrap.innerHTML = `<div class="p-2 mt-1 bg-success/10 border border-success/30 rounded">
        ✓ <b>${escapeHtml(spec)}</b> tiene ~${ageDays} días. Por encima del umbral; razonablemente seguro instalarlo.
      </div>`;
    }
  },

  _mockAge(spec) {
    // Hash determinístico → edad 0-90 días.
    let h = 0;
    for (let i = 0; i < spec.length; i++) h = (h * 31 + spec.charCodeAt(i)) & 0xffff;
    return h % 91;
  },

  amICooked(desc) {
    const wrap = document.getElementById('sec-cooked-result');
    if (!desc) { wrap.innerHTML = ''; return; }
    // Simulación: extrae nombre de paquete y busca en archivos virtuales.
    const pkgMatch = desc.match(/([a-z][a-z0-9-]+)(?:@([0-9.]+))?/i);
    const pkg = pkgMatch ? pkgMatch[1] : null;
    let found = false;
    if (pkg) {
      found = openFiles.some(f => f.content && f.content.toLowerCase().includes(pkg.toLowerCase()));
    }
    if (found) {
      wrap.innerHTML = `<div class="p-2 mt-1 bg-danger/10 border border-danger/30 rounded">
        ⚠ <b>Estás cooked.</b> Encontré referencias a <code>${escapeHtml(pkg)}</code> en tu workspace.<br>
        <span class="text-muted">Acción: pin a versión anterior, audita lo que se ejecutó (postinstall), rota credenciales si las hubo.</span>
      </div>`;
      MockAgent.log('system',
        `🚨 Security escaneó el workspace y encontró <code>${escapeHtml(pkg)}</code>. Revisa el panel Seguridad.`);
    } else {
      wrap.innerHTML = `<div class="p-2 mt-1 bg-success/10 border border-success/30 rounded">
        ✓ <b>No estás cooked</b> (al menos por esta amenaza específica). No encontré referencias a ${pkg ? `<code>${escapeHtml(pkg)}</code>` : 'paquetes mencionados'} en tu workspace.
      </div>`;
    }
  }
};
