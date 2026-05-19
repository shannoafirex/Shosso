// Simulación del CLI `opensource` (Vercel).
// Del 2º podcast: "opensource fetches el código fuente de cualquier paquete
// con el que estés trabajando y lo mete en tu codebase. En vez de docs
// man-made, le das al agente el code as source of truth."
//
// Aquí lo simulamos como comando del terminal mock: `opensource <repo>`
// crea una carpeta repos/<repo>/ con stubs representativos. El agente
// puede entonces "referenciar el codebase" con confianza.

window.OpenSource = {
  CATALOG: {
    // Agentes / infra
    'browser-use': { files: ['index.ts', 'src/agent.ts', 'src/browser.ts', 'README.md'] },
    'composio':    { files: ['index.ts', 'src/auth.ts', 'src/tools.ts', 'README.md'] },
    'daytona':     { files: ['sdk.ts', 'src/sandbox.ts', 'src/exec.ts', 'README.md'] },
    'open-claw':   { files: ['index.ts', 'src/loop.ts', 'src/hooks.ts', 'README.md'] },
    'langchain':   { files: ['index.ts', 'src/chains/index.ts', 'src/agents/index.ts', 'README.md'] },
    'mcp':         { files: ['index.ts', 'src/server.ts', 'src/client.ts', 'README.md'] },
    // Frameworks frontend
    'svelte':      { files: ['index.ts', 'src/runtime/index.ts', 'src/compiler/index.ts', 'README.md'] },
    'react':       { files: ['index.js', 'src/React.js', 'src/ReactHooks.js', 'README.md'] },
    'vite':        { files: ['index.ts', 'src/config.ts', 'src/dev-server.ts', 'README.md'] },
    'lit':         { files: ['index.ts', 'src/lit-element.ts', 'README.md'] },
    'tailwindcss': { files: ['index.js', 'src/util/dataTypes.js', 'README.md'] },
    // Backend / data
    'convex':      { files: ['index.ts', 'src/server.ts', 'src/react.ts', 'schema.ts', 'README.md'] },
    'drizzle-orm': { files: ['index.ts', 'src/pg-core/index.ts', 'src/mysql-core/index.ts', 'README.md'] },
    'effect':      { files: ['index.ts', 'src/Effect.ts', 'src/Layer.ts', 'README.md'] },
    'hono':        { files: ['index.ts', 'src/router.ts', 'src/context.ts', 'README.md'] },
    'elysia':      { files: ['index.ts', 'src/elysia.ts', 'README.md'] },
    // Runtimes
    'bun':         { files: ['index.ts', 'src/runtime.ts', 'README.md'] },
    'deno':        { files: ['mod.ts', 'src/runtime.ts', 'README.md'] },
    // SDKs IA
    'anthropic-sdk': { files: ['index.ts', 'src/client.ts', 'src/resources/messages.ts', 'README.md'] },
    'openai-sdk':    { files: ['index.ts', 'src/client.ts', 'src/resources/chat.ts', 'README.md'] },
    // Servicios
    'supabase':    { files: ['index.ts', 'src/SupabaseClient.ts', 'README.md'] },
    'stripe':      { files: ['index.ts', 'src/stripe.ts', 'README.md'] },
    'posthog':     { files: ['index.ts', 'src/posthog-core.ts', 'README.md'] },
    'sentry':      { files: ['index.ts', 'src/sdk.ts', 'README.md'] }
  },

  fetch(repo) {
    const slug = repo.replace(/^https?:\/\/github\.com\//, '').replace(/\/$/, '').toLowerCase();
    const key = Object.keys(this.CATALOG).find(k => slug.includes(k));
    if (!key) {
      const list = Object.keys(this.CATALOG).sort().join(', ');
      return { ok: false, msg: `No tengo un mock de "${repo}". El comando real sí lo fetchea; aquí simulo: ${list}.` };
    }
    const spec = this.CATALOG[key];
    const base = `repos/github.com/${key}`;
    let added = 0;
    for (const f of spec.files) {
      const path = `${base}/${f}`;
      if (!openFiles.find(x => x.path === path)) {
        openFiles.push({
          path,
          language: detectLang(path),
          content: this._stubFor(key, f)
        });
        added++;
      }
    }
    persistFiles();
    renderFileTree();
    return { ok: true, msg: `Clonado ${key} (${added} archivos en ${base}/). Ahora puedes pedirle al agente: "referencia el codebase ${base}".` };
  },

  _stubFor(repo, file) {
    if (file === 'README.md') {
      return `# ${repo}\n\nMock para Shosso. En producción, \`opensource\` clona el repo real.\n`;
    }
    return `// stub: ${repo}/${file}\n// El comando real trae el código original. Aquí simulamos.\nexport {};\n`;
  }
};
