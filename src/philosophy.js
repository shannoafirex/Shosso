// Panel de filosofía. Encarna los mensajes "culturales" del podcast que no
// son features pero sí actitudes que el IDE quiere transmitir.

window.Philosophy = {
  MOTTOS: [
    'Menos es más.',
    'El modelo ya lo sabe — no se lo repitas.',
    'Skills > agent.md.',
    'Vive el workflow antes de codificarlo.',
    'Si una skill falla, no te frustres: itera.',
    'Escala para productividad, no para verse cool.',
    'El contexto manda.',
    'No hay permanent underclass para quien aprende esto.',
    '"Tenemos comida en casa": construye tus skills.'
  ],

  CARDS: [
    {
      title: 'Menos es más',
      body: 'Si no puedes explicar tu workflow en pocas frases, probablemente no lo entiendes lo suficiente. Y si no lo entiendes, no puedes codificarlo en una skill útil. Toda la UI de Shosso refleja esto: una métrica por panel, no veinte.'
    },
    {
      title: 'Las 2 semanas',
      body: 'Configurar bien un agent harness toma ~2 semanas de fricción. Las empresas que los venden no te lo dirán porque no levantarían tanto dinero. Pero es real. Después, vuelas.'
    },
    {
      title: '$20/mes para lo que tomó 20 años',
      body: 'Conocimiento que antes requería 20 personas durante 20 años hoy cuesta 20 dólares al mes. Eso es un cambio de orden de magnitud. La pregunta no es si te afecta — es si lo usas o no.'
    },
    {
      title: '¿"Permanent underclass"? No necesariamente.',
      body: 'Hay quien dice que la AI va a crear una "underclass permanente" de gente sustituida. Permanente es una palabra muy fuerte. Quien aprende a construir y orquestar skills tiene una palanca real, no un trabajo que se evapora. Esto requiere trabajo — no atajos.'
    },
    {
      title: 'Esto no es lo cool que querías oír',
      body: 'No te vamos a vender: "instala estos 15 sub-agentes y serás imparable". Lo cool no escala. Empieza con UN agente, vive un workflow, codifícalo cuando hayas tenido una corrida exitosa. Iterá. Aburrido. Funciona.'
    },
    {
      title: 'Tenemos comida en casa',
      body: 'Antes de descargar la skill de un random en internet (vector de ataque + no tiene tu contexto), pregunta: ¿puedo construir esta yo mismo en una tarde? Casi siempre la respuesta es sí. Tu mamá ya te lo dijo.'
    },
    {
      title: 'El vibe-coded $1.8B',
      body: 'Sí, alguien vibe-codeó una app y vendió por $1.800.000.000. Eso pasó. No es que tú vas a hacer lo mismo mañana — es que la frontera entre técnico y no-técnico se está disolviendo. La habilidad nueva: orquestar agentes y skills bien.'
    }
  ],

  init() {
    this.renderPanel();
    this.startRotatingMotto();
  },

  renderPanel() {
    const wrap = document.getElementById('philosophy-list');
    if (!wrap) return;
    wrap.innerHTML = this.CARDS.map(c => `
      <div class="bg-panel2 border border-border rounded p-3">
        <div class="font-semibold text-sm">${escapeHtml(c.title)}</div>
        <div class="text-xs text-muted mt-1 leading-snug">${escapeHtml(c.body)}</div>
      </div>
    `).join('');
  },

  // Leitmotiv: el mensaje "menos es más" + variantes rotan en la barra
  // superior cada 9s. Discreto pero presente.
  startRotatingMotto() {
    const el = document.getElementById('motto');
    if (!el) return;
    let i = 0;
    const tick = () => {
      el.style.opacity = 0;
      setTimeout(() => {
        el.textContent = this.MOTTOS[i % this.MOTTOS.length];
        el.style.opacity = 1;
        i++;
      }, 300);
    };
    tick();
    setInterval(tick, 9000);
  }
};
