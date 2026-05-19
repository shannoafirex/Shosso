// Tool definitions + executor. Tools run via main process IPC (filesystem
// + shell exec). No simulation — every tool actually does its thing.

window.Tools = (() => {
  const path = {
    resolve(...parts) {
      // Minimal client-side path resolve relative to Projects.root.
      const root = Projects.root || '';
      const joined = parts.filter(Boolean).join('/').replace(/\\/g, '/');
      if (/^([a-z]:|\/)/i.test(joined)) return joined; // absolute
      return (root + '/' + joined).replace(/\/+/g, '/');
    }
  };

  function ensureRoot() {
    if (!Projects.root) throw new Error('No hay carpeta abierta. Abre una con Cmd/Ctrl+O.');
    return Projects.root;
  }

  // Anthropic-format tool definitions (we convert to OpenAI format on the fly).
  const defs = [
    {
      name: 'read_file',
      description: 'Lee el contenido de un fichero (texto). Path relativo a la carpeta del proyecto, o absoluto.',
      input_schema: {
        type: 'object',
        properties: {
          path: { type: 'string', description: 'Ruta del fichero' }
        },
        required: ['path']
      }
    },
    {
      name: 'write_file',
      description: 'Crea o sobrescribe un fichero. Crea directorios padre si no existen. ÚSALO con cuidado, sobrescribe.',
      input_schema: {
        type: 'object',
        properties: {
          path: { type: 'string' },
          content: { type: 'string' }
        },
        required: ['path', 'content']
      }
    },
    {
      name: 'edit_file',
      description: 'Reemplaza una cadena exacta por otra en un fichero. La cadena `old_string` debe aparecer una sola vez. Usa esto en vez de write_file para cambios puntuales.',
      input_schema: {
        type: 'object',
        properties: {
          path: { type: 'string' },
          old_string: { type: 'string' },
          new_string: { type: 'string' }
        },
        required: ['path', 'old_string', 'new_string']
      }
    },
    {
      name: 'list_dir',
      description: 'Lista archivos y subcarpetas de un directorio.',
      input_schema: {
        type: 'object',
        properties: { path: { type: 'string' } },
        required: ['path']
      }
    },
    {
      name: 'glob',
      description: 'Lista TODOS los ficheros bajo un directorio (omitiendo node_modules, .git y ocultos), opcionalmente filtrados por extensión.',
      input_schema: {
        type: 'object',
        properties: {
          root: { type: 'string', description: 'Directorio raíz (default: carpeta del proyecto)' },
          ext: { type: 'string', description: 'Filtra por extensión, ej "js" o "ts,tsx"' }
        }
      }
    },
    {
      name: 'grep',
      description: 'Busca un patrón (regex) en todos los ficheros de la carpeta. Devuelve líneas con coincidencias.',
      input_schema: {
        type: 'object',
        properties: {
          pattern: { type: 'string' },
          root: { type: 'string' },
          ignore_case: { type: 'boolean' }
        },
        required: ['pattern']
      }
    },
    {
      name: 'bash',
      description: 'Ejecuta un comando shell en la carpeta del proyecto. Timeout 120s. Devuelve stdout/stderr/exit code.',
      input_schema: {
        type: 'object',
        properties: {
          command: { type: 'string' },
          cwd: { type: 'string', description: 'Override CWD (default: project root)' }
        },
        required: ['command']
      }
    },
    {
      name: 'git',
      description: 'Subcomandos git seguros: status, diff, log, branches. Para commit usa bash con `git commit`.',
      input_schema: {
        type: 'object',
        properties: {
          sub: { type: 'string', enum: ['status', 'diff', 'log', 'branches'] },
          file: { type: 'string' }
        },
        required: ['sub']
      }
    },
    {
      name: 'remember',
      description: 'Guarda un hecho persistente que el agente debe recordar entre sesiones (memoria a largo plazo).',
      input_schema: {
        type: 'object',
        properties: { fact: { type: 'string' } },
        required: ['fact']
      }
    },
    {
      name: 'recall',
      description: 'Recupera hechos guardados de memoria que coincidan con un término.',
      input_schema: {
        type: 'object',
        properties: { query: { type: 'string' } },
        required: ['query']
      }
    }
  ];

  // Per-tool argument schema: required keys + expected primitive type. The
  // type check catches LLM calls that pass numbers for paths, arrays for
  // commands, etc., which would otherwise crash deep in the IPC handlers.
  const SCHEMA = {
    read_file:  { path: { required: true, type: 'string' } },
    write_file: { path: { required: true, type: 'string' }, content: { required: true, type: 'string' } },
    edit_file:  { path: { required: true, type: 'string' }, old_string: { required: true, type: 'string' }, new_string: { required: true, type: 'string' } },
    list_dir:   { path: { type: 'string' } },
    glob:       { root: { type: 'string' }, ext: { type: 'string' } },
    grep:       { pattern: { required: true, type: 'string' }, root: { type: 'string' }, ignore_case: { type: 'boolean' } },
    bash:       { command: { required: true, type: 'string' }, cwd: { type: 'string' } },
    git:        { sub: { required: true, type: 'string' }, file: { type: 'string' } },
    remember:   { fact: { required: true, type: 'string' } },
    recall:     { query: { required: true, type: 'string' } }
  };
  // Known tool names — anything outside this list is rejected before we
  // even look up SCHEMA, to prevent prototype-key spoofing
  // (e.g. tool name '__proto__' / 'constructor' would otherwise resolve
  // to inherited object properties and break for...of iteration).
  const KNOWN = new Set(Object.keys(SCHEMA));
  const MAX_BASH_LEN = 16_000;

  // Reject input objects with prototype-pollution keys. tu.input comes
  // straight from the LLM; even though JSON.parse strips __proto__ in modern
  // runtimes, OpenAI's tool_calls.arguments arrive as a string we re-parse
  // upstream and the LLM can also literally request prototype property access
  // by key name.
  function sanitizeArgs(args) {
    if (!args || typeof args !== 'object') return {};
    const clean = Object.create(null);
    for (const k of Object.keys(args)) {
      if (k === '__proto__' || k === 'constructor' || k === 'prototype') continue;
      clean[k] = args[k];
    }
    return clean;
  }

  async function execute(name, rawArgs) {
    if (typeof name !== 'string' || !Object.prototype.hasOwnProperty.call(SCHEMA, name) || !KNOWN.has(name)) {
      return { error: 'tool desconocida: ' + String(name) };
    }
    const args = sanitizeArgs(rawArgs);
    const schema = SCHEMA[name];
    for (const k of Object.keys(schema)) {
      const spec = schema[k];
      const v = args[k];
      if (v === undefined || v === null) {
        if (spec.required) return { error: `tool ${name}: argumento requerido "${k}" no provisto` };
        continue;
      }
      if (spec.type && typeof v !== spec.type) {
        return { error: `tool ${name}: argumento "${k}" debe ser ${spec.type}, no ${typeof v}` };
      }
    }
    if (name === 'bash' && args.command.length > MAX_BASH_LEN) {
      return { error: `tool bash: comando demasiado largo (${args.command.length} > ${MAX_BASH_LEN} chars)` };
    }
    switch (name) {
      case 'read_file': {
        const root = ensureRoot();
        const r = await window.shosso.fs.readFile(path.resolve(args.path));
        if (r.error) return { error: r.error };
        return { content: r.content };
      }
      case 'write_file': {
        ensureRoot();
        const r = await window.shosso.fs.writeFile(path.resolve(args.path), args.content);
        if (r.error) return { error: r.error };
        document.dispatchEvent(new CustomEvent('shosso:fileWritten', { detail: path.resolve(args.path) }));
        return { ok: true };
      }
      case 'edit_file': {
        ensureRoot();
        if (args.old_string === '') return { error: 'edit_file: old_string vacío no es válido. Para reemplazar todo el fichero usa write_file.' };
        if (args.old_string === args.new_string) return { error: 'edit_file: old_string y new_string son idénticos (no hay cambio).' };
        const p = path.resolve(args.path);
        const r = await window.shosso.fs.readFile(p);
        if (r.error) return { error: r.error };
        let occ = r.content.split(args.old_string).length - 1;
        let oldStr = args.old_string;
        let newStr = args.new_string;
        // CRLF tolerance: LLM tools strip carriage returns; if no direct match
        // and the file uses CRLF, retry with line endings normalized to match
        // the file. We rewrite the whole file content with the same EOL style
        // it already has, so we don't accidentally flip the file from CRLF→LF.
        if (occ === 0 && r.content.includes('\r\n') && !args.old_string.includes('\r\n')) {
          oldStr = args.old_string.replace(/\n/g, '\r\n');
          newStr = args.new_string.replace(/\n/g, '\r\n');
          occ = r.content.split(oldStr).length - 1;
        }
        if (occ === 0) return { error: 'old_string no encontrado en ' + args.path };
        if (occ > 1) return { error: `old_string aparece ${occ} veces; añade más contexto para hacerla única` };
        const updated = r.content.replace(oldStr, newStr);
        const w = await window.shosso.fs.writeFile(p, updated);
        if (w.error) return { error: w.error };
        document.dispatchEvent(new CustomEvent('shosso:fileWritten', { detail: path.resolve(args.path) }));
        return { ok: true, occurrences: 1 };
      }
      case 'list_dir': {
        const target = args.path ? path.resolve(args.path) : ensureRoot();
        const r = await window.shosso.fs.readDir(target);
        if (r && r.error) return { error: r.error };
        return { entries: r.map(e => ({ name: e.name, isDir: e.isDir })) };
      }
      case 'glob': {
        const root = args.root ? path.resolve(args.root) : ensureRoot();
        const r = await window.shosso.fs.walk(root);
        if (r && r.error) return { error: r.error };
        let files = r;
        if (args.ext) {
          const exts = args.ext.split(',').map(e => '.' + e.trim().replace(/^\./, ''));
          files = files.filter(f => exts.some(e => f.endsWith(e)));
        }
        return { files: files.slice(0, 500), truncated: files.length > 500 };
      }
      case 'grep': {
        const root = args.root ? path.resolve(args.root) : ensureRoot();
        const r = await window.shosso.fs.grep(root, args.pattern, { ignoreCase: args.ignore_case });
        if (r && r.error) return { error: r.error };
        return { matches: r };
      }
      case 'bash': {
        ensureRoot();
        const cwd = args.cwd ? path.resolve(args.cwd) : Projects.root;
        const r = await window.shosso.shell.exec(args.command, cwd);
        if (r.error) return { error: r.error };
        return {
          stdout: r.stdout?.slice(0, 50_000),
          stderr: r.stderr?.slice(0, 20_000),
          exit_code: r.code,
          timed_out: !!r.timedOut
        };
      }
      case 'git': {
        const root = ensureRoot();
        if (args.sub === 'status') return await window.shosso.git.status(root);
        if (args.sub === 'diff')   return await window.shosso.git.diff(root, args.file, false);
        if (args.sub === 'log')    return await window.shosso.git.log(root, 30);
        if (args.sub === 'branches') return await window.shosso.git.branches(root);
        return { error: 'sub desconocido' };
      }
      case 'remember': {
        MemoryStore.add(args.fact);
        return { ok: true };
      }
      case 'recall': {
        return { matches: MemoryStore.recall(args.query) };
      }
    }
    return { error: 'tool desconocida: ' + name };
  }

  // Convert Anthropic-format tool defs to OpenAI function format.
  function asOpenAI(defs) {
    return defs.map(t => ({
      type: 'function',
      function: {
        name: t.name,
        description: t.description,
        parameters: t.input_schema
      }
    }));
  }

  return { defs, execute, asOpenAI };
})();
