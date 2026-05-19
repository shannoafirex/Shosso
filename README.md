# Shosso

IDE de escritorio (Electron) con agente LLM **real** — Anthropic Claude o
OpenAI GPT — capaz de leer, escribir, editar ficheros y ejecutar comandos
en tu carpeta. Sin simulación.

## Qué es real

| Pieza | Implementación |
|------|----------------|
| Agente LLM | `@anthropic-ai/sdk` + `openai` con streaming + tool use (loop hasta `end_turn`) |
| Tools | `read_file`, `write_file`, `edit_file`, `list_dir`, `glob`, `grep`, `bash`, `git`, `remember`, `recall` |
| Filesystem | `fs/promises` vía IPC. Monaco edita ficheros en disco con dirty state y Cmd/Ctrl+S |
| Terminal | `node-pty` + `xterm.js`. Shell nativo (bash/zsh/cmd) con resize y colores |
| Git | `simple-git`. Status, diff, stage/unstage, commit, log |
| API keys | Cifradas via Electron `safeStorage` (keychain/credential manager nativo del SO) |
| Skills | Ficheros `.md` con frontmatter en `<proyecto>/.shosso/skills/` |
| Memoria | Hechos persistentes por proyecto (localStorage) |
| Compactación | Resumen vía el propio LLM cuando el contexto se acerca al 80% |
| Tokens | Estimación char/4 para preview; tokens reales del API mostrados aparte |

## Requisitos

- Node.js ≥ 18
- Compilador C/C++ para `node-pty`:
  - **macOS**: Xcode Command Line Tools (`xcode-select --install`)
  - **Linux**: `build-essential`, `python3`
  - **Windows**: Visual Studio Build Tools (o `npm install --global windows-build-tools`)

## Instalar y arrancar

```bash
npm install
npm start
```

`postinstall` ejecuta `electron-builder install-app-deps` para recompilar
`node-pty` contra tu versión de Electron. Si el terminal no aparece, corre:

```bash
npm run rebuild
```

## Configurar API key

1. Abre Ajustes (botón ⚙ o Cmd/Ctrl+,)
2. Elige proveedor: Anthropic o OpenAI
3. Pega tu API key — se guarda **cifrada** en el keychain del SO
4. Alternativa: `ANTHROPIC_API_KEY` o `OPENAI_API_KEY` como variable de entorno

## Workflow

1. **📁 Abre una carpeta** (Cmd/Ctrl+O) — tu proyecto real
2. **Edita** ficheros en Monaco (Cmd/Ctrl+S guarda a disco)
3. **Terminal** real abajo (Cmd/Ctrl+`) corre comandos en la carpeta
4. **Git** en el panel lateral (Cmd/Ctrl+Shift+G para commit)
5. **Chat con el agente** (Cmd/Ctrl+L): pide cosas y verás cada tool call
   y su resultado en vivo
6. **Skills**: prompts reutilizables guardados como `.md` en
   `.shosso/skills/`. Pulsas ▶ o mencionas su nombre y se inyectan en el
   siguiente turno (progressive disclosure)
7. **Compactar**: cuando el contexto se llena, el LLM resume la
   conversación y la reemplaza por un solo turno comprimido

## Atajos

- `Cmd/Ctrl+O` — abrir carpeta
- `Cmd/Ctrl+,` — ajustes
- `Cmd/Ctrl+S` — guardar fichero activo
- `Cmd/Ctrl+L` — foco al chat
- `` Cmd/Ctrl+` `` — toggle terminal
- `Cmd/Ctrl+Shift+G` — commit

## Empaquetar instalador

```bash
npm run dist -- --win    # NSIS
npm run dist -- --mac    # DMG
npm run dist -- --linux  # AppImage + deb
```

## Arquitectura

```
main.js                  Proceso principal (IPC, filesystem, pty, git, LLM)
preload.js               Bridge seguro (contextIsolation activo)
index.html               Shell del IDE
src/
  app.js                 Bootstrap
  agent.js               Loop real con tool use (Anthropic + OpenAI)
  tools.js               Definiciones + ejecutor de tools
  editor.js              Monaco ↔ disco
  terminal.js            xterm.js ↔ pty
  git-panel.js           UI git con simple-git
  settings.js            Provider/modelo/key (safeStorage)
  skills.js              Skills como ficheros .md
  memory.js              Hechos persistentes por proyecto
  context.js             Tracking real de tokens (usage del API)
  compaction.js          Resumen con el propio LLM
  projects.js            Proyecto = carpeta real
  tokens.js              Estimador char/4
  tokenizer.js           Panel "pega y mide"
  safe-storage.js        Wrapper localStorage
  styles.css             Estilos
```

## Privacidad

- Tu código se envía únicamente al proveedor LLM que elijas (Anthropic u
  OpenAI) y solo cuando explícitamente mandas un mensaje al agente
- Las API keys nunca salen de tu máquina, viven cifradas en el keychain
- El terminal y los commits son locales

## Licencia

MIT
