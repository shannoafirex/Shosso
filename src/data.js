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
    id: 'api-design',
    name: 'api-design',
    description: 'Diseña endpoints REST/RPC con tipos compartidos cliente-servidor. Úsala al añadir un nuevo recurso o cambiar contrato existente.',
    body: `# api-design

Para cada nuevo recurso o endpoint:
1. Define el tipo del recurso (un único source of truth, usado por backend Y frontend).
2. Lista las operaciones (CRUD + acciones específicas) con tipos de input/output explícitos.
3. Decide auth requirements por endpoint (público / auth / role X).
4. Define errores: códigos + payloads tipados.
5. Añade validación en el boundary (zod, valibot) — no confíes en TypeScript en runtime.
6. Test contrato: el mismo type usado por frontend debe satisfacer el de backend.

## Reglas duras
- Nunca un endpoint sin tipo de respuesta. \`unknown\` no cuenta.
- Errores son ciudadanos de primera clase, no excepciones perdidas.
- Pagination explícita desde el día 1 si la lista puede crecer.

Output: tipos compartidos + handlers + tests contractuales.`,
    loaded: false, iterations: 4, failures: [],
    tags: ['engineering', 'saas']
  },
  {
    id: 'schema-migration',
    name: 'schema-migration',
    description: 'Genera migraciones DB seguras (zero-downtime cuando posible). Detecta cambios destructivos y propone migración en fases.',
    body: `# schema-migration

Antes de tocar la DB:
1. Clasifica el cambio: aditivo (nuevo campo/tabla) vs destructivo (rename/drop/change-type).
2. Aditivos: una migración basta.
3. Destructivos: SIEMPRE migración en fases — expand, migrate data, contract.
   - Fase 1: añade nueva columna/tabla, deja la vieja.
   - Fase 2: deploy app que escribe en ambos.
   - Fase 3: backfill datos viejos a nuevo formato.
   - Fase 4: deploy app que solo lee nuevo.
   - Fase 5: borra columna vieja.
4. Valida en staging con copia de prod antes de aplicar.
5. Test de rollback documentado.

## Reglas duras
- NUNCA borres una columna en la misma migración donde dejas de escribirla.
- Indices grandes: \`CREATE INDEX CONCURRENTLY\` en Postgres.
- Backfills > 100k rows: por batches con throttle.

Output: SQL/drizzle + plan de fases + verificación.`,
    loaded: false, iterations: 5, failures: [],
    tags: ['engineering', 'saas']
  },
  {
    id: 'churn-investigation',
    name: 'churn-investigation',
    description: 'Investiga por qué los usuarios cancelan. Cruza eventos, cohortes, sesiones de soporte y product analytics.',
    body: `# churn-investigation

Entrada: lista de usuarios que cancelaron + ventana de tiempo.

Pasos:
1. Pull eventos de producto últimos 30 días pre-cancelación.
2. Identifica el último "happy path" — última acción exitosa antes de la decadencia.
3. Cruza con tickets de soporte (¿hubo fricción reportada?).
4. Cruza con cohorte: ¿usuarios similares también churn-aron?
5. Identifica patrón: técnico (bug), valor (no entendieron feature X), pricing (overpriced), competencia.

## Salida
- Top 3 causas por frecuencia.
- Win-back posible (qué cambiaría para que volvieran).
- Acción producto recomendada (cambio que reduce el patrón).

## Reglas duras
- N < 10 churns → no concluyas, observa más.
- Nunca cierres como "no es para ellos" sin haber leído el ticket de soporte.`,
    loaded: false, iterations: 4, failures: [],
    tags: ['product', 'saas']
  },
  {
    id: 'pricing-experiment',
    name: 'pricing-experiment',
    description: 'Diseña experimento de pricing A/B con corte estadístico y guardrails de retención. Devuelve hipótesis, métricas y plan de rollout.',
    body: `# pricing-experiment

Entrada: hipótesis ("subir a $49 reduce CAC payback" o "tier $9 captura más conversión").

Pasos:
1. Define métrica primaria (revenue por visita, conversion, MRR a 90d).
2. Define guardrails (no degradar NPS, no inflar churn).
3. Estima tamaño de muestra requerido (potencia 80%, MDE realista).
4. Plan de rollout: A/B 50/50, segmentación por geo o por tipo de usuario nuevo.
5. Pre-mortem: ¿qué resultado nos haría parar?

## Reglas duras
- Nunca cambies pricing y mensaje a la vez.
- Pricing grandfathered: clientes existentes no cambian de tier.
- Mínimo 2 semanas; idealmente 4.
- Stop-loss: si guardrail rompe en >5%, abortar.

Output: doc de experimento + dashboards a setup + criterios de decisión.`,
    loaded: false, iterations: 3, failures: [],
    tags: ['growth', 'saas']
  },
  {
    id: 'user-interview-synth',
    name: 'user-interview-synth',
    description: 'Sintetiza 5-20 entrevistas en hallazgos accionables. Identifica patrones, citas representativas y siguientes pasos.',
    body: `# user-interview-synth

Entrada: transcripciones de entrevistas (texto o links a Notion/Granola).

Pasos:
1. Lee todas las transcripciones. NO resumas individualmente; busca señales cruzadas.
2. Cluster por temas (job-to-be-done, pain, hack actual, willingness to pay).
3. Identifica patrones con ≥ 30% de muestra.
4. Extrae 1-2 citas representativas por patrón.
5. Cruza con datos producto: ¿los entrevistados usan la feature mencionada?

## Salida
- 5-7 hallazgos accionables (no "los usuarios quieren X" → "X bloquea Y en N% de la base").
- 1 mapa de oportunidades (impacto vs esfuerzo).
- Siguientes pasos: a) experimentos sugeridos, b) más entrevistas, c) nada (señal débil).

## Reglas duras
- 5 entrevistas no son una "tendencia"; 12+ sí.
- Cita textual, no parafrasees.`,
    loaded: false, iterations: 3, failures: [],
    tags: ['product', 'saas']
  },
  {
    id: 'script-outline',
    name: 'script-outline',
    description: 'Genera outline de video largo (10-30 min) con hook fuerte, structure de retention, y CTA. Úsalo antes de escribir el script.',
    body: `# script-outline

Entrada: tema + duración objetivo.

Pasos:
1. <b>Hook</b> (0-15s): pregunta o promesa específica. NO "hoy vamos a hablar de…".
2. Curiosity gap o "stake": qué pierde el viewer si no termina.
3. Estructura por bloques de 90s con mini-cliffhangers.
4. Picos de retention cada 3-5 min (cambio de tono, B-roll, demo en vivo).
5. CTA al minuto 70-80% del video (no al final).

## Reglas duras
- Si el hook no diferencia tu video del 90% del nicho, reescríbelo.
- Nunca prometas algo que no entregues antes del minuto 50%.
- Outline tiene que caber en 1 pantalla.

Output: outline timestampeado + bullets de B-roll.`,
    loaded: false, iterations: 4, failures: [],
    tags: ['creator']
  },
  {
    id: 'thumbnail-iterate',
    name: 'thumbnail-iterate',
    description: 'Genera 3-5 variantes de thumbnail con hipótesis claras. Plan de A/B con TubeBuddy o similar.',
    body: `# thumbnail-iterate

Para cada video:
1. Base: lo que el algoritmo espera para tu nicho (review/tutorial/vlog).
2. 3 variantes:
   - <b>Emocional</b>: cara con expresión clara (sorpresa, foco).
   - <b>Texto + nombre</b>: 2-4 palabras grandes, alto contraste.
   - <b>Visual + objeto</b>: el producto/sujeto, sin cara.
3. Cada variante con hipótesis explícita: "esta gana si el viewer prioriza X".
4. Plan A/B: 24-48h, segmenta por device (mobile vs desktop).
5. Decision: CTR + average view duration combinado, no solo CTR.

## Reglas duras
- Nunca un thumbnail con > 4 palabras visibles.
- Coherencia visual: el thumbnail tiene que vivir en tu grid del canal.
- Si CTR sube pero AVD baja, era clickbait — descarta.

Output: 3 archivos + matriz de hipótesis/decisión.`,
    loaded: false, iterations: 3, failures: [],
    tags: ['creator']
  },
  {
    id: 'hook-rewrite',
    name: 'hook-rewrite',
    description: 'Reescribe el opening de un video para mejorar retention día 1-3 (cuando YouTube decide si te empuja).',
    body: `# hook-rewrite

Entrada: opening actual + métricas (AVD, retention día 7).

Reglas:
1. Primeros 15 segundos: NO presentación. Promesa específica + tensión.
2. Si dices el título, dilo distinto. Si lo metiste como hook, ya perdió.
3. Mostrar el resultado/punchline antes del proceso ("aquí está el final, ahora cómo llegamos").
4. Sentence-level: corta. Verbos al frente.

## Reglas duras
- Si la frase 1 podría abrir CUALQUIER video del nicho, reescribe.
- Nunca "antes de empezar, suscríbete". Eso desbloquea exit.
- Si retention <40% al minuto 1, el problema NO es el hook — es el tema.

Output: 3 versiones del hook con explicación de qué cambia en cada una.`,
    loaded: false, iterations: 3, failures: [],
    tags: ['creator']
  },
  {
    id: 'support-triage',
    name: 'support-triage',
    description: 'Clasifica tickets de soporte y propone respuesta + escalación. Detecta tickets que son bugs ocultos vs duda real.',
    body: `# support-triage

Entrada: ticket completo (mensaje + contexto del usuario si lo hay).

Pasos:
1. Categoriza: bug, how-to, account, billing, feature-request, abuso.
2. Severidad: P0 (caído) / P1 (degradado) / P2 (impacto bajo) / P3 (cosmético).
3. Si es bug → busca en logs/sentry mención del usuario o error.
4. Borrador de respuesta corta, empática, accionable.
5. Si severity ≥ P1 → ping al canal #incidents.

## Reglas duras
- Nunca pidas más info que el usuario ya dio (lee bien).
- Si la respuesta requiere cambio de código, NO prometas fecha — di "investigamos".
- Tickets repetidos del mismo tema 3x → señal: documenta o feature missing.

Output: { categoria, severidad, borrador, accion_sugerida }`,
    loaded: false, iterations: 4, failures: [],
    tags: ['support', 'saas']
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
  },
  {
    id: 'engineering',
    name: 'engineering',
    role: 'API, schemas, type contracts, performance.',
    type: 'sub',
    skills: ['api-design', 'schema-migration', 'code-structure'],
    productivityScore: 0.85
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
  },
  {
    id: 'saas-starter',
    name: 'saas-starter',
    description: 'SaaS completo: Next + Auth + Stripe billing + Postgres (Drizzle) + emails (Resend) + analytics. Lo más cerca posible de prod en día 1.',
    structure: [
      'app/(marketing)/page.tsx',
      'app/(marketing)/pricing/page.tsx',
      'app/(app)/dashboard/page.tsx',
      'app/(app)/settings/billing/page.tsx',
      'app/api/auth/[...nextauth]/route.ts',
      'app/api/webhooks/stripe/route.ts',
      'app/api/webhooks/resend/route.ts',
      'lib/auth.ts',
      'lib/db.ts',
      'lib/stripe.ts',
      'lib/email.ts',
      'lib/analytics.ts',
      'drizzle/schema.ts',
      'drizzle/migrations/',
      'components/billing/PricingTable.tsx',
      'components/auth/SignIn.tsx',
      'emails/welcome.tsx',
      'tests/billing.test.ts'
    ]
  },
  {
    id: 'agent-saas',
    name: 'agent-saas',
    description: 'SaaS agentic-native: además de saas-starter, incluye orquestación de agentes, skills marketplace local y context tracking.',
    structure: [
      'app/(app)/agents/page.tsx',
      'app/(app)/skills/page.tsx',
      'app/(app)/runs/page.tsx',
      'app/api/agents/dispatch/route.ts',
      'app/api/skills/invoke/route.ts',
      'lib/agents/runner.ts',
      'lib/skills/loader.ts',
      'lib/context/tracker.ts',
      'drizzle/schema.ts'
    ]
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
