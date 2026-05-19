// Tour onboarding "rundown".
// Encarna directamente el clip de The Office: el nuevo empleado no sabe qué
// es un "rundown", igual que un agente sin contexto. El tour enseña al
// usuario a darle ese contexto.

window.Tutorial = {
  step: 0,
  flow: 'rundown',
  steps: {
    rundown: [
      {
        title: 'El problema del "rundown"',
        body: `<p>En The Office, el nuevo jefe le pide a Jim un "rundown". Jim no tiene contexto y persigue al jefe durante todo el episodio intentando descifrar qué quiere decir.</p>
               <p>Eso es exactamente lo que pasa con un agente al que no le das contexto.</p>
               <p>Los modelos parecen entender pero no entienden: predicen tokens. Tú aportas el contexto.</p>`
      },
      {
        title: 'Los modelos son buenos',
        body: `<p>En 2026 los modelos ya son <b>exceptionalmente</b> buenos.</p>
               <p>La frontera ya no es "mejor prompt". Es: <b>qué metes en el contexto y qué dejas fuera</b>.</p>
               <p>Mira el medidor de arriba: te dice exactamente cuántos tokens estás usando ahora mismo.</p>`
      },
      {
        title: 'agent.md vs skill',
        body: `<p>El podcast lo cuantifica:</p>
               <ul class="list-disc list-inside text-xs space-y-1">
                 <li><b>agent.md</b> con 944 tokens → entra en CADA turno.</li>
                 <li>La misma info como <b>skill</b> → sólo nombre+desc (~53t) entran siempre. El body se carga sólo cuando hace falta.</li>
               </ul>
               <p>Mira el panel <b>Sistema</b> a la derecha: ahí puedes ver tu agent.md y los tokens reales que cuesta.</p>`
      },
      {
        title: 'Skills se construyen viviéndolas',
        body: `<p>El error más caro: escribir el .md primero.</p>
               <p>Lo correcto: <b>caminar el workflow con el agente paso a paso</b>. Cuando tengas al menos una corrida exitosa, codificas.</p>
               <p>Usa <kbd class="bg-panel2 px-1 rounded">Cmd/Ctrl+K</kbd> para abrir el constructor recursivo.</p>`
      },
      {
        title: 'Cuando falle, alimenta el fallo',
        body: `<p>Tu skill va a fallar. Es lo normal — agradécelo: cada fallo te dice qué falta.</p>
               <p>Pregúntale al agente <i>"por qué fallaste?"</i>. Esa respuesta + un fix → actualiza la skill para que no vuelva a pasar.</p>
               <p>Lo verás en el panel <b>Diagnóstico de fallos</b> abajo.</p>`
      },
      {
        title: 'Escala para productividad, no para verse cool',
        body: `<p>Tentación: empezar con 15 skills y 30 sub-agentes.</p>
               <p>Realidad: <b>uno</b> agente principal. Cuando una clase de trabajo te exige skills propias y separadas, ahí nace un sub-agente.</p>
               <p>Shosso te muestra un medidor de productividad arriba: si añades sub-agentes vacíos, te va a regañar.</p>`
      },
      {
        title: 'Las dos semanas',
        body: `<p>Honesto: configurar bien un agent harness toma ~2 semanas de fricción. Las empresas que los venden no te lo dirán.</p>
               <p>Pero después, vuelas. Y la productividad escala contigo, no con un marketing deck.</p>
               <p>Bienvenido a Shosso. <b>Menos es más.</b></p>`
      }
    ],
    philosophy: [
      {
        title: 'Filosofía de Shosso',
        body: `<p>Shosso parte de seis ideas que vienen literalmente del podcast:</p>
               <ol class="list-decimal list-inside text-xs space-y-1">
                 <li>Los modelos son buenos. No los micromanage.</li>
                 <li>Skills &gt; agent.md (por progressive disclosure).</li>
                 <li>Construye skills caminando workflows reales.</li>
                 <li>Cuando falla, captura el error y actualiza la skill.</li>
                 <li>Sub-agentes sólo cuando aportan productividad real.</li>
                 <li>Vigila el contexto: el modelo se degrada cerca del límite.</li>
               </ol>`
      }
    ]
  },

  custom: null,
  customTitle: null,

  init() {
    document.getElementById('btn-tutorial').addEventListener('click', () => this.open('rundown'));
    document.getElementById('tutorial-close').addEventListener('click', () => this.close());
    document.getElementById('tutorial-next').addEventListener('click', () => this.next());
    document.getElementById('tutorial-back').addEventListener('click', () => this.back());

    if (window.shosso) {
      window.shosso.onTutorial((which) => this.open(which));
    }

    // Auto-show la primera vez
    if (!localStorage.getItem('shosso.tutorial-seen')) {
      setTimeout(() => this.open('rundown'), 700);
    }
  },

  open(flow) {
    this.flow = flow;
    this.step = 0;
    this.custom = null;
    const modal = document.getElementById('tutorial');
    modal.classList.remove('hidden');
    modal.onclick = (e) => { if (e.target === modal) this.close(); };
    this.render();
  },

  openCustom(title, paragraphs) {
    this.custom = paragraphs;
    this.customTitle = title;
    this.step = 0;
    document.getElementById('tutorial').classList.remove('hidden');
    this.render();
  },

  close() {
    document.getElementById('tutorial').classList.add('hidden');
    localStorage.setItem('shosso.tutorial-seen', '1');
  },

  _currentSteps() {
    if (this.custom) return this.custom.map((p, i) => ({ title: this.customTitle, body: p }));
    return this.steps[this.flow] || this.steps.rundown;
  },

  render() {
    const steps = this._currentSteps();
    if (!steps || steps.length === 0) { this.close(); return; }
    const s = steps[Math.min(this.step, steps.length - 1)];
    if (!s) { this.close(); return; }
    document.getElementById('tutorial-title').textContent = s.title;
    document.getElementById('tutorial-body').innerHTML = s.body;
    document.getElementById('tutorial-step').textContent = `${this.step + 1} de ${steps.length}`;
    document.getElementById('tutorial-next').textContent = (this.step === steps.length - 1) ? 'Empezar' : 'Siguiente';
  },

  next() {
    const steps = this._currentSteps();
    if (this.step >= steps.length - 1) { this.close(); return; }
    this.step++;
    this.render();
  },

  back() {
    if (this.step === 0) { this.close(); return; }
    this.step--;
    this.render();
  }
};
