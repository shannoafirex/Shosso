# RoboShosso

Bot de GitHub para revisar, probar y arreglar Pull Requests automáticamente,
impulsado por **Claude** (el mismo enfoque que [`robobun`](https://github.com/robobun),
el bot del proyecto Bun).

Este repositorio es el **repo de control**: además de correr RoboShosso sobre sí
mismo, lo **propaga a todos los repos de tu cuenta** —incluidos los nuevos— sin
necesidad de un servidor. Todo vive dentro de tu GitHub.

## Qué hace en cada repo

| Modo | Cuándo se activa | Qué hace |
| --- | --- | --- |
| **Revisión** | Al abrir/actualizar un PR | Claude revisa el diff y deja comentarios con hallazgos y sugerencias. |
| **Simulación** | Al abrir/actualizar un PR | Detecta el stack, instala dependencias y corre lint + tests + build. Publica una tabla de resultados en el PR y marca el check en rojo si algo falla. |
| **Agente** | Al comentar `/roboshosso <instrucción>` en un issue o PR | Claude entra al repo, hace los cambios y los empuja a la rama del PR. |

La simulación reconoce automáticamente proyectos **Node.js, Python, Go, Rust**
y, como respaldo, un `Makefile` con target `test`. Ver `roboshosso/simulate.sh`.

## Cómo cubre "todos los repos"

Un workflow programado (`roboshosso-propagate.yml`) corre cada 30 min en este
repo de control. En cada ejecución:

1. Lista todos los repos que **posees** (omite forks, archivados y los de la
   lista de exclusión).
2. En cada uno, crea o actualiza los archivos de RoboShosso si difieren.
3. Si al repo le falta el secreto `CLAUDE_CODE_OAUTH_TOKEN`, lo añade (cifrado).

Como recorre toda la cuenta en cada pasada, **los repos nuevos se incorporan
solos** en la siguiente ejecución (hasta 30 min). No es instantáneo, pero no
requiere ningún servidor.

## Estructura

```
.github/workflows/
  roboshosso.yml            # Revisión + simulación en cada PR (se propaga)
  roboshosso-agent.yml      # Modo agente por comentario (se propaga)
  roboshosso-propagate.yml  # Cron de propagación (SOLO en el repo de control)
roboshosso/
  simulate.sh               # Detecta el stack, instala y corre chequeos (se propaga)
  propagate/
    propagate.mjs           # Lógica de propagación
    package.json
```

Solo los tres archivos marcados "(se propaga)" se copian a los demás repos. El
cron y el propagador se quedan únicamente aquí.

## Puesta en marcha (una sola vez)

1. **Instala la GitHub App de Claude** en tu cuenta, con acceso a *todos* los
   repos: `/install-github-app` en la CLI de Claude Code, o desde
   [github.com/apps/claude](https://github.com/apps/claude).
2. **Genera un token de tu suscripción** (no se usa API key que cobra por
   tokens). En la CLI de Claude Code, con tu sesión de Pro/Max iniciada:

   ```bash
   claude setup-token
   ```

   Copia el token que imprime (dura ~1 año). Usa tu plan de suscripción, no
   créditos de la API.
3. En **este repo de control**, *Settings → Secrets and variables → Actions*,
   añade dos secretos:
   - `CLAUDE_CODE_OAUTH_TOKEN` — el token del paso anterior. Se replicará a cada
     repo y autentica a Claude con tu suscripción.
   - `ROBOSHOSSO_TOKEN` — un **Personal Access Token** con permiso de escritura
     sobre tus repos. Con un PAT clásico: scopes `repo` + `workflow`. Con uno
     *fine-grained*: acceso a todos tus repos con permisos **Contents: write**,
     **Workflows: write** y **Secrets: write**. Ponle caducidad.
4. (Opcional) Variable `ROBOSHOSSO_SKIP` (*Settings → Variables*) con nombres de
   repos a excluir, separados por comas.
5. Lanza la propagación a mano la primera vez: pestaña **Actions →
   "RoboShosso · Propagar" → Run workflow**. Marca *dry run* para ver qué haría
   sin escribir nada.

A partir de ahí cada PR en cualquier repo se revisa y simula solo. Para el modo
agente, comenta por ejemplo:

```
/roboshosso corrige el error de tipos en src/server.js y añade un test
```

## Personalización

- **Frecuencia de propagación:** el `cron` en `roboshosso-propagate.yml`.
- **Frase del agente:** `trigger_phrase` en `roboshosso-agent.yml`.
- **Modelo / límite de pasos:** `--model` y `--max-turns` en `claude_args`.
- **Qué prueba la simulación:** `roboshosso/simulate.sh`.
- **Repos excluidos:** variable `ROBOSHOSSO_SKIP`.

## Notas honestas (léelas)

- **Costo / límites.** Se autentica con tu **suscripción** (no API de pago por
  token) vía `claude setup-token`. Ese token consume de la misma cuota que tus
  sesiones interactivas de Claude: con muchos repos/PRs puedes toparte con los
  límites de tu plan y competir con tu uso normal. Empieza con un subconjunto vía
  `ROBOSHOSSO_SKIP`. (Las ejecuciones también gastan minutos de GitHub Actions.)
- **Seguridad — superficie amplia.** El `ROBOSHOSSO_TOKEN` puede escribir en
  todos tus repos, y tu `CLAUDE_CODE_OAUTH_TOKEN` queda replicado como secreto en
  cada uno. El modo agente ejecuta un LLM con permiso de push sobre PRs que puede
  abrir cualquiera, lo que abre la puerta a inyección de prompts. Mitiga:
  protege la rama principal con *required reviews*, usa un PAT *fine-grained* con
  caducidad, y limita en qué repos corre.
- **Caducidad del token:** `claude setup-token` dura ~1 año; tendrás que
  regenerarlo y re-propagar cuando expire.
- **No es instantáneo:** los repos nuevos entran en la siguiente pasada del
  cron (≤ 30 min).
- RoboShosso acelera, pero **no sustituye la revisión humana final**.
