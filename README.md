# Shosso

IDE nativo de skills construido con Electron. Hace visible lo que normalmente
es invisible: cuántos tokens cuesta cada decisión, qué entra al contexto en
cada turno, y por qué construir tus propias skills es lo único que escala.

Encarna directamente las ideas del podcast de Ross Mike sobre cómo usar bien
los agentes — no en marketing, sino en producto:

- **Progressive disclosure** real: las skills sólo cargan su cuerpo cuando
  el agente las necesita.
- **Constructor recursivo de skills**: te obliga a vivir el workflow antes
  de codificarlo.
- **Captura de fallos → iteración**: cuando una skill falla, el panel de
  diagnóstico te lleva al fix y lo aplica como nueva iteración.
- **Visor de contexto**: ves system prompt, herramientas, agent.md y
  conversación en vivo, con tokens reales por sección.
- **Compactación automática** al 80% (como Claude Code / Codex).
- **Capa de memoria** progresiva (no se inyecta entera).
- **Tokenizador in-app** para auditar el coste de cualquier texto.
- **Templates auditables locales** (sin marketplace externo, por seguridad).
- **Medidor de productividad** que avisa cuando "escalas para verse cool"
  (sub-agentes vacíos, skills sin iteraciones).
- **Tour onboarding "rundown"** (sí, el de The Office).

## Requisitos

- Node.js ≥ 18 (en Windows: instala desde [nodejs.org](https://nodejs.org))
- npm o pnpm

## Ejecutar (Windows 11, macOS, Linux)

```bash
npm install
npm start
```

En Windows: abre PowerShell o Windows Terminal en la carpeta del proyecto y
ejecuta los comandos de arriba. Electron abrirá una ventana nativa.

## Compilar instalador

```bash
# Windows (.exe instalador NSIS)
npm run dist -- --win

# macOS (.dmg)
npm run dist -- --mac

# Linux (AppImage + .deb)
npm run dist -- --linux
```

El instalador queda en `dist/`.

## Atajos

- `Cmd/Ctrl + K` — nuevo skill (constructor recursivo)
- `Cmd/Ctrl + Shift + R` — tour onboarding "rundown"
- `Cmd/Ctrl + Shift + C` — foco al panel de contexto
- `Cmd/Ctrl + O` — abrir carpeta local

## Estructura

```
main.js               # proceso principal Electron
preload.js            # bridge seguro renderer ↔ main
index.html            # shell del IDE
src/
  app.js              # bootstrap
  data.js             # datos semilla (skills, agentes, templates, system prompt)
  tokens.js           # estimador de tokens
  skills.js           # store + render de skills (progressive disclosure)
  agents.js           # orquesta principal + sub-agentes
  context.js          # composición + medidor del contexto
  memory.js           # capa de memoria con recall
  tokenizer.js        # tokenizer in-app
  system-prompt.js    # visor system prompt + tools + agent.md editable
  templates.js        # templates scaffolds auditables
  productivity.js     # medidor productividad vs "verse cool"
  compaction.js       # compactación automática al 80%
  diagnostics.js      # captura de fallos → iteración recursiva
  mock-agent.js       # agente simulado (no LLM real; demuestra el flujo)
  skill-builder.js    # constructor recursivo de skills (4 pasos)
  tutorial.js         # tour onboarding "rundown" + filosofía
  import-skill.js     # importar skill externa con aviso de seguridad
  styles.css          # estilos
```

## Por qué un agente simulado

Para no acoplar Shosso a un proveedor específico ni pedir API keys, el
agente que ves en el chat es simulado. Su trabajo es **enseñar**: te muestra
exactamente cuándo cargaría una skill, cuándo recurriría a memoria, cuándo
fallaría y qué propondría como fix.

Cambiar `src/mock-agent.js` por una llamada real a Anthropic, OpenAI o
cualquier otro proveedor es un cambio aislado: el resto del IDE no se entera.

## Licencia

MIT
