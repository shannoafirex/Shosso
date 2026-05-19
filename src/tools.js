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

  // Minimal required-args validation. Without it a malformed LLM call
  // can write "undefined" to disk or read a directory as a file.
  const REQUIRED = {
    read_file: ['path'],
    write_file: ['path', 'content'],
    edit_file: ['path', 'old_string', 'new_string'],
    list_dir: [],
    glob: [],
    grep: ['pattern'],
    bash: ['command'],
    git: ['sub'],
    remember: ['fact'],
    recall: ['query']
  };

  async function execute(name, args) {
    args = args || {};
    const need = REQUIRED[name];
    if (need) {
      for (const k of need) {
        if (args[k] === undefined || args[k] === null) {
          return { error: `tool ${name}: argumento requerido "${k}" no provisto` };
        }
      }
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
        const p = path.resolve(args.path);
        const r = await window.shosso.fs.readFile(p);
        if (r.error) return { error: r.error };
        const occ = r.content.split(args.old_string).length - 1;
        if (occ === 0) return { error: 'old_string no encontrado en ' + args.path };
        if (occ > 1) return { error: `old_string aparece ${occ} veces; añade más contexto para hacerla única` };
        const updated = r.content.replace(args.old_string, args.new_string);
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
