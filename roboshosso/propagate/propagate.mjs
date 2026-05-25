// RoboShosso · Propagador.
// Recorre todos los repos de la cuenta autenticada e instala (o actualiza)
// los archivos de RoboShosso y el secreto CLAUDE_CODE_OAUTH_TOKEN. Idempotente:
// solo escribe cuando el contenido difiere o el secreto no existe.
//
// Se ejecuta desde la RAÍZ del repo de control (lee los archivos fuente de
// ahí). Variables de entorno:
//   ROBOSHOSSO_TOKEN         PAT con acceso a contents + workflows + secrets de tus repos (obligatorio)
//   CLAUDE_CODE_OAUTH_TOKEN  token de tu suscripción (claude setup-token); se replica como secreto (opcional)
//   ROBOSHOSSO_SKIP          lista separada por comas de repos a omitir (opcional)
//   DRY_RUN                  'true' para simular sin escribir (opcional)

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
const oauthToken = process.env.CLAUDE_CODE_OAUTH_TOKEN || '';
const DRY_RUN = process.env.DRY_RUN === 'true';
const skip = new Set(
  (process.env.ROBOSHOSSO_SKIP || '').split(',').map((s) => s.trim()).filter(Boolean)
);

// Portón obligatorio: protege la rama principal exigiendo PR + el check de
// simulación de RoboShosso en verde. ROBOSHOSSO_GATE=off lo desactiva.
// Nota: NO exigimos "Revisión de código con Claude" como check obligatorio
// porque la GitHub App de Claude rechaza su token en PRs que modifican los
// propios workflows (validación de workflow idéntico), lo que bloquearía para
// siempre las actualizaciones de RoboShosso. La revisión igual corre en cada
// PR, pero el cerrojo de merge es la simulación (determinista y confiable).
const GATE = process.env.ROBOSHOSSO_GATE !== 'off';
const REQUIRED_CHECKS = ['Simular y probar el PR'];

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
  try {
    await octokit.repos.createOrUpdateFileContents({
      owner,
      repo,
      path,
      message: `chore(roboshosso): ${sha ? 'actualizar' : 'instalar'} ${path}`,
      content: b64(content),
      ...(sha ? { sha } : {}),
    });
  } catch (e) {
    // La rama está protegida por el portón: el commit directo se rechaza.
    if ([403, 409, 422].includes(e.status)) return 'protegido (actualiza vía PR)';
    throw e;
  }
  return sha ? 'actualizado' : 'creado';
}

const SECRET_NAME = 'CLAUDE_CODE_OAUTH_TOKEN';

async function ensureSecret(owner, repo) {
  if (!oauthToken) return 'sin-token';
  // Siempre lo (re)escribimos: no podemos leer el valor actual, así que esta es
  // la única forma de propagar una rotación del token a toda la flota.
  if (DRY_RUN) return 'pondría-secreto';
  const { data: pk } = await octokit.actions.getRepoPublicKey({ owner, repo });
  await sodium.ready;
  const enc = sodium.crypto_box_seal(
    sodium.from_string(oauthToken),
    sodium.from_base64(pk.key, sodium.base64_variants.ORIGINAL)
  );
  await octokit.actions.createOrUpdateRepoSecret({
    owner,
    repo,
    secret_name: SECRET_NAME,
    encrypted_value: sodium.to_base64(enc, sodium.base64_variants.ORIGINAL),
    key_id: pk.key_id,
  });
  return 'sincronizado';
}

async function ensureGate(owner, repo, branch) {
  if (!GATE) return 'desactivado';
  // ¿Ya hay protección en la rama?
  let existing = null;
  try {
    const { data } = await octokit.repos.getBranchProtection({ owner, repo, branch });
    existing = data;
  } catch (e) {
    // 404 = no hay protección; otro error (403/plan, permiso) = no se puede gestionar.
    if (e.status !== 404) return `sin portón (${e.status || '?'}: ${(e.message || '').split('\n')[0]})`;
  }
  // Si hay protección y NO es de RoboShosso (no exige nuestro check), la respetamos.
  if (existing) {
    const ctx = existing.required_status_checks?.contexts || [];
    if (!ctx.includes('Simular y probar el PR')) return 'protección propia respetada';
  }
  if (DRY_RUN) return existing ? 'refrescaría' : 'protegería';
  try {
    await octokit.repos.updateBranchProtection({
      owner,
      repo,
      branch,
      required_status_checks: { strict: false, contexts: REQUIRED_CHECKS },
      // enforce_admins: false → el portón exige PR + simulación a todos, pero el
      // token de RoboShosso (dueño) puede mantener los archivos al día sin
      // quedar bloqueado por su propio portón.
      enforce_admins: false,
      required_pull_request_reviews: { required_approving_review_count: 0 },
      restrictions: null,
    });
    return existing ? 'portón refrescado' : 'portón activo';
  } catch (e) {
    // Repos privados en plan gratuito no permiten branch protection, etc.
    const msg = (e.message || '').split('\n')[0];
    return `sin portón (${e.status || '?'}: ${msg})`;
  }
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
    const gateResult = await ensureGate(owner, repo, r.default_branch);
    if (results.some((x) => CHANGED.test(x)) || CHANGED.test(secretResult)) touched++;
    console.log(`• ${r.full_name}`);
    for (const line of results) console.log(`   ${line}`);
    console.log(`   secreto ${SECRET_NAME}: ${secretResult}`);
    console.log(`   portón (${r.default_branch}): ${gateResult}`);
  } catch (e) {
    console.error(`✗ ${r.full_name}: ${e.status || ''} ${e.message}`);
  }
}

console.log(`\nListo. Modificados: ${touched} · omitidos: ${skipped} · total: ${repos.length}`);
