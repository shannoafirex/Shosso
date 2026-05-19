// Datos semilla. Cada dato encarna un punto del podcast.

window.SEED_FILES = [
  {
    path: 'README.md',
    language: 'markdown',
    content: `# Shosso

Un IDE construido alrededor de **skills** y **gestión visible del contexto**.

## Por qué existe

El podcast de Ross Mike argumenta que:

1. Los modelos ya son buenos. La frontera no es el modelo, es el contexto.
2. \`agent.md\` y \`claude.md\` gastan tokens en CADA turno aunque no los necesites.
3. Las **skills** con *progressive disclosure* sólo cargan su cuerpo cuando hacen falta.
4. Las skills se construyen **viviendo el workflow primero**, no escribiendo el .md.
5. Cuando el agente falla, **alimentas el fallo de vuelta** y actualizas la skill (iteración recursiva).
6. Se escala para **productividad real**, no para verse cool.

Shosso hace todo esto visible.

## Atajos

- \`Cmd/Ctrl + K\`: nueva skill (constructor recursivo)
- \`Cmd/Ctrl + Shift + R\`: tour onboarding "rundown"
- \`Cmd/Ctrl + Shift + C\`: foco al panel de contexto

## Estado del modelo

> "Los modelos son exceptionalmente buenos. Opus 4.6 es increíble. GPT 5.4 es increíble."

Shosso no opina sobre cuál usar. Pero te muestra exactamente qué tokens estás gastando para que decidas con datos.`
  },
  {
    path: 'src/index.js',
    language: 'javascript',
    content: `// Punto de entrada de tu app.
// Pídele al agente: "estructura este archivo con la skill code-structure"
function main() {
  console.log('Hola desde Shosso');
}

main();
`
  },
  {
    path: 'workflows/sponsor-review.md',
    language: 'markdown',
    content: `# Workflow: revisar un patrocinador

> "Cada email de patrocinador que enviaba al agente, me decía: legit, legit,
> perfect, perfect. No había rechazo. No había análisis profundo. Entonces
> me di cuenta: el modelo necesita una guía paso a paso."

Pasos manuales (luego se codificaron como la skill \`sponsor-research\`,
5 iteraciones hasta acertar):

1. Leer el correo del patrocinador.
2. Buscar la empresa en Twitter, YouTube, Trustpilot, Crunchbase.
3. Si fallan 2 de 4 señales → rechazo automático.
4. Anotar resultado en hoja de cálculo con fecha + veredicto.
5. Si pasa el filtro → redactar respuesta con plantilla de tono.
`
  },
  {
    path: 'workflows/weekly-report.md',
    language: 'markdown',
    content: `# Workflow: reporte semanal

> "Tengo una skill que llama a 8 fuentes. No hay forma de que con un solo
> prompt el agente lo haga. Pero después de 5 iteraciones, lo ejecuta en
> 10 minutos sin fallar."

Fuentes:
1. Notion (tabla de métricas)
2. YouTube Analytics
3. Dub.co (links)
4. Stripe (MRR, churn)
5. Twitter/X
6. Substack (suscriptores)
7. Gumroad (ventas)
8. GitHub (estrellas, contribuciones)
`
  },
  {
    path: 'docs/philosophy.md',
    language: 'markdown',
    content: `# Filosofía

## Trata al agente como un empleado nuevo

> "Imagínate que contrato un empleado nuevo y le digo: 'necesito un rundown
> sobre las finanzas'. No tiene contexto. No sabe qué es un rundown."

(Referencia a Jim de The Office persiguiendo a su nuevo jefe para
descubrir qué quería decir con "rundown".)

## Las dos semanas

Antes de obtener productividad con OpenClaw te toma ~2 semanas configurarlo
bien. Las empresas que venden agent harnesses no te dirán esto porque no
levantarían tanto dinero. Pero es real.

## Menos es más

Si no puedes explicar tu workflow en pocas frases, probablemente no lo
entiendes lo suficiente. Y si no lo entiendes, no puedes codificarlo en
una skill.
`
  }
];

// Skills semilla. 'body' NO entra al contexto hasta que se "carga".
window.SEED_SKILLS = [
  {
    id: 'code-structure',
    name: 'code-structure',
    description: 'Reorganiza código generado por el agente en una estructura legible y testeable. Úsala cuando hay lógica duplicada o ficheros largos.',
    body: `# code-structure

Cuando notes que el agente ha generado:
- ficheros con más de 250 líneas
- funciones que repiten la misma lógica con pequeñas variaciones
- mezcla de IO, lógica de negocio y presentación en el mismo módulo

Entonces:
1. Identifica los módulos cohesivos (un único motivo de cambio).
2. Extrae helpers puros sin side-effects.
3. Mueve IO al borde (boundary).
4. Renombra para que el código se lea como una frase.
5. Añade test de smoke por cada módulo extraído.

Output: diff propuesto + breve justificación por archivo tocado.

## Reglas duras
- No "preparar para hipotéticos futuros".
- Si no estás seguro de extraer algo, no lo extraigas todavía.
- Tres líneas similares pueden quedarse repetidas; cinco no.`,
    loaded: false,
    iterations: 3,
    failures: []
  },
  {
    id: 'sponsor-research',
    name: 'sponsor-research',
    description: 'Investiga un patrocinador entrante: redes, reputación, financiación. Devuelve veredicto y borrador de respuesta.',
    body: `# sponsor-research

Entrada: correo del patrocinador.

Pasos:
1. Extrae nombre de empresa, dominio y producto.
2. Comprueba en paralelo:
   - Twitter/X (engagement real, no bots)
   - YouTube (presencia y comentarios)
   - Trustpilot / reseñas
   - Crunchbase (financiación, ronda más reciente)
3. Si fallan 2 de 4 señales → veredicto "rechazo".
4. Si pasa el filtro → redacta respuesta inicial usando la plantilla de tono.
5. Anota en la hoja de cálculo con la fecha y veredicto.

## Reglas duras
- Nunca aceptes sin verificar al menos 3 fuentes.
- No reveles tu pipeline interno en la respuesta.
- Si la empresa promete "exposición" pero no dinero, rechazo automático.

## Aprendizajes acumulados (de fallos previos)
- Iter 2: añadido Crunchbase porque varias empresas pasaban con sólo redes.
- Iter 3: añadida regla de "exposición sin dinero" tras caso real.
- Iter 4: separado check en paralelo (antes era secuencial y tardaba 3x).
- Iter 5: añadido anotado en hoja de cálculo, antes se perdía el historial.

Output: { veredicto, score, fuentes[], borrador_respuesta? }`,
    loaded: false,
    iterations: 5,
    failures: [
      { date: '2025-09-14', symptom: 'aceptó empresa fantasma con bots en Twitter', fix: 'añadir Crunchbase como señal obligatoria' },
      { date: '2025-10-02', symptom: 'aceptó "exposición a cambio de tu canal"', fix: 'regla dura: sin dinero, rechazo' }
    ]
  },
  {
    id: 'weekly-report',
    name: 'weekly-report',
    description: 'Genera reporte semanal cruzando 8 fuentes (Notion, YouTube, Dub, Stripe, Twitter, Substack, Gumroad, GitHub).',
    body: `# weekly-report

Fuentes (las 8):
1. Notion (tabla "Métricas semanales")
2. YouTube Analytics (vistas, watch time, suscriptores)
3. Dub.co (links cortos y CTR)
4. Stripe (MRR, churn, refunds)
5. Twitter/X (impresiones, top tweet)
6. Substack (suscriptores netos, open rate)
7. Gumroad (ventas, top producto)
8. GitHub (stars, PRs mergeados, contribuyentes)

Pasos:
1. Pull paralelo de las 8 fuentes (no secuencial).
2. Normaliza fechas al lunes-domingo de la semana objetivo.
3. Construye tabla resumen.
4. Identifica 1 victoria, 1 alerta, 1 acción para la próxima semana.
5. Postea en Notion bajo "Reportes semanales".

## Reglas duras
- Si una fuente falla, NO abortes: marca "n/a" y continúa.
- Nunca inventes cifras. Si no las tienes, di "no disponible".
- El reporte siempre cabe en 1 pantalla. Si no cabe, sintetiza.

## Aprendizajes acumulados
- Iter 2: paralelizado (antes 25 min, ahora 9 min).
- Iter 3: añadido fallback "n/a" porque YouTube Analytics rate-limita.
- Iter 4: añadida limpieza de duplicados de Notion.
- Iter 5: añadido formato fijo para victoria/alerta/acción.`,
    loaded: false,
    iterations: 5,
    failures: [
      { date: '2025-08-21', symptom: 'abortó porque YouTube devolvía 429', fix: 'marcar n/a y continuar' },
      { date: '2025-09-04', symptom: 'reporte de 3 pantallas, ilegible', fix: 'restricción de tamaño + síntesis' }
    ]
  }
];

window.SEED_AGENTS = [
  {
    id: 'main',
    name: 'main',
    role: 'Orquesta general. Empieza siempre por aquí.',
    type: 'main',
    skills: ['code-structure'],
    productivityScore: 0.8
  },
  {
    id: 'marketing',
    name: 'marketing',
    role: 'Sponsors, redes, reportes de creator.',
    type: 'sub',
    skills: ['sponsor-research', 'weekly-report'],
    productivityScore: 0.9
  }
];

// Templates: el "renaissance" del que habla el podcast.
window.SEED_TEMPLATES = [
  {
    id: 'web-react',
    name: 'web-react',
    description: 'Web app con React + Vite + TS + Tailwind. Estructura para que el agente la entienda sin agent.md.',
    structure: ['src/', 'src/components/', 'src/lib/', 'src/pages/', 'tests/', 'vite.config.ts']
  },
  {
    id: 'web-next',
    name: 'web-next',
    description: 'Next.js (app router) + TS + Tailwind + Drizzle. Para que la base sea contexto.',
    structure: ['app/', 'app/(marketing)/', 'app/api/', 'components/', 'lib/', 'drizzle/']
  },
  {
    id: 'mobile-expo',
    name: 'mobile-expo',
    description: 'Expo + React Native + Tamagui. Foundations sólidas, no agent.md.',
    structure: ['app/', 'components/', 'hooks/', 'app.json']
  },
  {
    id: 'cli-bun',
    name: 'cli-bun',
    description: 'CLI con Bun + cac. Single-binary friendly.',
    structure: ['src/cli.ts', 'src/commands/', 'src/lib/', 'bun.lockb']
  }
];

// System prompt simulado, con la "leak" filosofía del podcast.
window.SEED_SYSTEM_PROMPT = `Eres un agente de programación trabajando dentro de Shosso IDE.

Tienes acceso a un conjunto de herramientas para leer/escribir archivos,
ejecutar comandos y consultar skills. Usa la herramienta que mejor encaje
con cada tarea.

Skills:
- Antes de invocar una skill, lee su nombre y descripción.
- Si una skill encaja, cárgala (verás su body completo).
- Si después de cargarla descubres que no encajaba, descárgala.
- Cuando una skill falla, registra el fallo y propón una actualización al skill.

Contexto:
- Sé explícito sobre lo que añades al contexto.
- Si el contexto supera el 80% del límite, ofrece compactar.
- No introduzcas información que ya está en el codebase: léela en su lugar.

Comportamiento:
- Trabaja como un colega que acaba de entrar: pregunta sólo cuando hay
  ambigüedad real, no para pasar el balón.
- Devuelve diffs, no narraciones.
- Cuando algo es irreversible, pide confirmación.`;

window.SEED_TOOLS = [
  { name: 'read_file', desc: 'Lee un archivo del workspace.', tokens: 65 },
  { name: 'write_file', desc: 'Escribe o sobrescribe un archivo.', tokens: 70 },
  { name: 'edit_file', desc: 'Edit estilo "search & replace" sobre un archivo.', tokens: 85 },
  { name: 'list_dir', desc: 'Lista el contenido de un directorio.', tokens: 55 },
  { name: 'run_command', desc: 'Ejecuta un comando de shell sandboxed.', tokens: 90 },
  { name: 'search_code', desc: 'Búsqueda semántica + literal sobre el workspace.', tokens: 95 },
  { name: 'invoke_skill', desc: 'Carga el body de una skill por id.', tokens: 60 },
  { name: 'recall_memory', desc: 'Consulta la capa de memoria persistente.', tokens: 55 }
];

window.SEED_MEMORY = [
  { id: 'm1', text: 'Mi zona horaria es Europe/Madrid; reporta horas en ese huso.', created: Date.now() - 86400000 * 12 },
  { id: 'm2', text: 'Patrocinadores aceptados: mínimo 2.000€/post, sin "exposure deals".', created: Date.now() - 86400000 * 5 }
];
