# RoboShosso

Bot de GitHub para revisar, probar y arreglar Pull Requests automáticamente,
impulsado por **Claude** (el mismo motor que usa [`robobun`](https://github.com/robobun),
el bot del proyecto Bun). Vive dentro del repositorio como GitHub Actions.

## Qué hace

RoboShosso tiene **tres modos**:

| Modo | Cuándo se activa | Qué hace |
| --- | --- | --- |
| **Revisión** | Al abrir/actualizar un PR | Claude revisa el diff y deja comentarios con hallazgos y sugerencias. |
| **Simulación** | Al abrir/actualizar un PR | Detecta el stack, instala dependencias y corre lint + tests + build. Publica una tabla de resultados en el PR y marca el check en rojo si algo falla. |
| **Agente** | Al comentar `/roboshosso <instrucción>` en un issue o PR | Claude entra al repo, hace los cambios pedidos y los empuja a la rama del PR. |

La simulación reconoce automáticamente proyectos **Node.js, Python, Go, Rust**
y, como respaldo, un `Makefile` con target `test`. Ver `roboshosso/simulate.sh`.

## Estructura

```
.github/workflows/
  roboshosso.yml         # Revisión + simulación en cada PR
  roboshosso-agent.yml   # Modo agente disparado por comentario
roboshosso/
  simulate.sh            # Detecta el stack, instala y corre los chequeos
```

## Puesta en marcha (una sola vez)

1. **Instala la GitHub App de Claude** en el repositorio: ejecuta
   `/install-github-app` en la CLI de Claude Code, o instálala manualmente
   desde [github.com/apps/claude](https://github.com/apps/claude).
2. **Añade el secreto `ANTHROPIC_API_KEY`** en
   *Settings → Secrets and variables → Actions* del repositorio
   (la clave empieza por `sk-ant-`).
3. Listo. Abre un PR y RoboShosso lo revisará y lo simulará solo. Para el modo
   agente, comenta por ejemplo:

   ```
   /roboshosso corrige el error de tipos en src/server.js y añade un test
   ```

## Personalización

- **Frase de activación del agente:** cambia `trigger_phrase: "/roboshosso"`
  en `roboshosso-agent.yml`.
- **Modelo:** ajusta `--model` en el campo `claude_args` de ambos workflows.
- **Límite de pasos del agente:** `--max-turns` en `roboshosso-agent.yml`.
- **Qué prueba la simulación:** edita `roboshosso/simulate.sh` para añadir
  más comandos o stacks.

## Notas honestas

- **Cuesta dinero:** cada ejecución consume tokens de tu cuenta de Anthropic
  (vía `ANTHROPIC_API_KEY`) y minutos de GitHub Actions. Revisa tus límites de
  gasto antes de dejarlo suelto en un repo con mucho tráfico de PRs.
- **El modo agente puede empujar código** a la rama del PR (`contents: write`).
  Úsalo en repos donde confíes en quién puede comentar, o protege la rama
  principal con required reviews para que nada se mezcle sin aprobación humana.
- RoboShosso ayuda y acelera, pero **no sustituye la revisión humana final**.
