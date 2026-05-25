// RoboShosso · Propagador.
// Recorre todos los repos de la cuenta autenticada e instala (o actualiza)
// los archivos de RoboShosso y el secreto ANTHROPIC_API_KEY. Idempotente:
// solo escribe cuando el contenido difiere o el secreto no existe.
//
// Se ejecuta desde la RAÍZ del repo de control (lee los archivos fuente de
// ahí). Variables de entorno:
//   ROBOSHOSSO_TOKEN   PAT con acceso a contents + workflows + secrets de tus repos (obligatorio)
//   ANTHROPIC_API_KEY  clave que se replicará como secreto en cada repo (opcional)
//   ROBOSHOSSO_SKIP    lista separada por comas de repos a omitir (opcional)
//   DRY_RUN            'true' para simular sin escribir (opcional)

import { Octokit } from '@octokit/rest';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';

// libsodium-wrappers tiene un dist ESM roto en varias versiones; lo cargamos
// por CommonJS, que sí funciona.
const sodium = createRequire(import.meta.url)('libsodium-wrappers');

const token = process.env.ROBOSHOSSO_TOKEN;
if (!token) {
  console.error('Falta ROBOSHOSSO_TOKEN. Aborto.');
  process.exit(1);
}
const anthropicKey = process.env.ANTHROPIC_API_KEY || '';
const DRY_RUN = process.env.DRY_RUN === 'true';
const skip = new Set(
  (process.env.ROBOSHOSSO_SKIP || '').split(',').map((s) => s.trim()).filter(Boolean)
);

// Fuente de verdad: estos archivos del repo de control se copian a cada repo.
const FILES = [
  '.github/workflows/roboshosso.yml',
  '.github/workflows/roboshosso-agent.yml',
  'roboshosso/simulate.sh',
];
const localContent = Object.fromEntries(FILES.map((p) => [p, readFileSync(p, 'utf8')]));

const octokit = new Octokit({ auth: token });
const b64 = (s) => Buffer.from(s, 'utf8').toString('base64');

async function ensureFile(owner, repo, path, content) {
  let sha;
  try {
    const { data } = await octokit.repos.getContent({ owner, repo, path });
    if (!Array.isArray(data) && data.type === 'file') {
      const current = Buffer.from(data.content, 'base64').toString('utf8');
      if (current === content) return 'igual';
      sha = data.sha;
    }
  } catch (e) {
    if (e.status !== 404) throw e;
  }
  if (DRY_RUN) return sha ? 'actualizaría' : 'crearía';
  await octokit.repos.createOrUpdateFileContents({
    owner,
    repo,
    path,
    message: `chore(roboshosso): ${sha ? 'actualizar' : 'instalar'} ${path}`,
    content: b64(content),
    ...(sha ? { sha } : {}),
  });
  return sha ? 'actualizado' : 'creado';
}

async function ensureSecret(owner, repo) {
  if (!anthropicKey) return 'sin-clave';
  try {
    await octokit.actions.getRepoSecret({ owner, repo, secret_name: 'ANTHROPIC_API_KEY' });
    return 'ya-existe';
  } catch (e) {
    if (e.status !== 404) throw e;
  }
  if (DRY_RUN) return 'pondría-secreto';
  const { data: pk } = await octokit.actions.getRepoPublicKey({ owner, repo });
  await sodium.ready;
  const enc = sodium.crypto_box_seal(
    sodium.from_string(anthropicKey),
    sodium.from_base64(pk.key, sodium.base64_variants.ORIGINAL)
  );
  await octokit.actions.createOrUpdateRepoSecret({
    owner,
    repo,
    secret_name: 'ANTHROPIC_API_KEY',
    encrypted_value: sodium.to_base64(enc, sodium.base64_variants.ORIGINAL),
    key_id: pk.key_id,
  });
  return 'secreto-puesto';
}

const { data: me } = await octokit.users.getAuthenticated();
console.log(`RoboShosso propagando como @${me.login}${DRY_RUN ? ' · DRY RUN' : ''}`);

const repos = await octokit.paginate(octokit.repos.listForAuthenticatedUser, {
  affiliation: 'owner',
  per_page: 100,
});

let touched = 0;
let skipped = 0;
const CHANGED = /creado|actualizado|crearía|actualizaría|puesto|pondría/;

for (const r of repos) {
  if (r.archived || r.fork || r.disabled) { skipped++; continue; }
  if (skip.has(r.name) || skip.has(r.full_name)) { skipped++; continue; }
  const owner = r.owner.login;
  const repo = r.name;
  try {
    const results = [];
    for (const p of FILES) results.push(`${p}: ${await ensureFile(owner, repo, p, localContent[p])}`);
    const secretResult = await ensureSecret(owner, repo);
    if (results.some((x) => CHANGED.test(x)) || CHANGED.test(secretResult)) touched++;
    console.log(`• ${r.full_name}`);
    for (const line of results) console.log(`   ${line}`);
    console.log(`   secreto ANTHROPIC_API_KEY: ${secretResult}`);
  } catch (e) {
    console.error(`✗ ${r.full_name}: ${e.status || ''} ${e.message}`);
  }
}

console.log(`\nListo. Modificados: ${touched} · omitidos: ${skipped} · total: ${repos.length}`);
