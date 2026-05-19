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
    '"Tenemos comida en casa": construye tus skills.',
    'Code > docs.',
    'Plan para ti, no para el agente.',
    'PRs pequeños o el review loop no converge.',
    'Nunca instales un paquete con < 14 días de vida.',
    'No /compact — abre thread nuevo.',
    'Stack codificado > stack popular.',
    'Lanza ya. La perfección es cobardía.',
    '"No soy técnico" = "no soy futuro".'
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
    },
    {
      title: 'Vibe coding vs agentic engineering',
      body: 'Vibe coding ofrece el thinking al agente. Agentic engineering: TÚ piensas (plan, end state, criterios), el agente ejecuta. Es la diferencia entre 95% del código generado por AI con calidad de staff engineer, y código que se cae en producción.'
    },
    {
      title: 'Code > docs (death of documentation)',
      body: 'Docs man-made son lo peor. Código es el mejor source of truth. Por eso opensource (de Vercel) explotó: clona el repo del paquete en tu workspace, y el agente lee el código real en vez de adivinar.'
    },
    {
      title: 'Stack codificado > stack popular',
      body: 'Svelte > React: el agente entiende mejor HTML+TS que hooks + foot-guns. Convex > Supabase: todo es código TS, no hace falta dashboard. La regla: minimiza la UI que el agente NO puede leer.'
    },
    {
      title: 'Más bullish en knowledge work que en coding',
      body: 'El modelo ya es suficiente para legal, accounting, research personal, generación de reportes. Lo que falta es tooling. Si trabajas en una empresa que no usa nada de esto, una sola demo te puede hacer manager (caso real del podcast: 24 años → manager tras una demo de Claude Code).'
    },
    {
      title: '$200/mes vs lawyer/accountant',
      body: 'Un Claude Pro a $200/mes te ahorró 5.000€ en un contrato (3x el precio al detectar abusos), 6.000€ en accounting de 3.000 transacciones procesadas en 2 horas. Si no puedes pagarlo, salta una salida con los amigos. La subvención se va a acabar.'
    },
    {
      title: 'Plan ES para ti, no para el agente',
      body: 'El plan es accountability tuya. El agente no piensa en su context window cuando lo genera — siempre será demasiado grande. Pídele que lo recorte en PRs pequeños. Eso convierte el feature en algo que el review loop pueda cerrar.'
    },
    {
      title: 'No /compact, abre thread nuevo',
      body: 'Hasta los devs líderes de Claude Code abren sesión nueva en vez de /compact. Es más rápido, más limpio, y el modelo no arrastra la basura del contexto anterior. Shosso te ofrece el botón ⚠ "compactación cerca" para hacerlo en un click.'
    },
    {
      title: 'Lanza, no perfecciones',
      body: 'En SF la gente lanza apps semi-funcionales con videos animados. Cierran rondas, contratan, mejoran. Tú y yo seguimos ajustando "una feature más". Quien lanza, gana. La delusión correcta es esencial.'
    },
    {
      title: 'Paquetes <14 días = sospechosos',
      body: 'La mayoría de supply-chain attacks publica una versión maliciosa que dura horas o días antes de ser cazada. Bloquea por defecto cualquier paquete con menos de 14 días. El panel Seguridad te lo configura.'
    },
    {
      title: '"No soy técnico" = "no soy futuro"',
      body: 'Reformúlalo: cuando dices "no soy técnico" estás diciendo "no soy futuro". Todo va a ser tecnología, no sólo software. La pregunta no es si te incumbe — es si lo aprendes antes o después.'
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
