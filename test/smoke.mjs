// Smoke test sin dependencias: arranca el server y verifica los flujos clave.
import { spawn } from 'node:child_process';
import { setTimeout as sleep } from 'node:timers/promises';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import assert from 'node:assert/strict';

const PORT = 4123;
const BASE = `http://localhost:${PORT}`;
const dataDir = fs.mkdtempSync(path.join(os.tmpdir(), 'shosso-test-'));

const server = spawn('node', ['src/server.js'], {
  env: { ...process.env, PORT: String(PORT), DATA_DIR: dataDir, SESSION_SECRET: 'ci-test', BASE_URL: BASE },
  stdio: 'inherit',
});

function cookieFrom(res) {
  const c = res.headers.get('set-cookie');
  return c ? c.split(';')[0] : null;
}

async function waitForServer() {
  for (let i = 0; i < 50; i++) {
    try { await fetch(`${BASE}/api/me`); return; } catch { await sleep(200); }
  }
  throw new Error('El server no arrancó a tiempo');
}

let failed = false;
function check(name, fn) {
  return fn().then(() => console.log(`ok - ${name}`)).catch((e) => {
    failed = true;
    console.error(`FAIL - ${name}: ${e.message}`);
  });
}

try {
  await waitForServer();
  let cookie;

  await check('register', async () => {
    const res = await fetch(`${BASE}/api/auth/register`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'ci@test.com', password: 'password123' }),
    });
    assert.equal(res.status, 200);
    cookie = cookieFrom(res);
    assert.ok(cookie, 'debe devolver cookie de sesión');
  });

  let linkId, code;
  await check('create link', async () => {
    const res = await fetch(`${BASE}/api/links`, {
      method: 'POST', headers: { 'Content-Type': 'application/json', cookie },
      body: JSON.stringify({ target_url: 'https://example.com', title: 'CI' }),
    });
    assert.equal(res.status, 200);
    const body = await res.json();
    linkId = body.id; code = body.code;
    assert.ok(code);
  });

  await check('qr generation', async () => {
    const res = await fetch(`${BASE}/api/links/${linkId}/qr`, { headers: { cookie } });
    assert.equal(res.status, 200);
    const body = await res.json();
    assert.ok(body.dataUrl.startsWith('data:image/png;base64,'));
  });

  await check('redirect + scan tracking', async () => {
    const res = await fetch(`${BASE}/r/${code}`, { redirect: 'manual' });
    assert.equal(res.status, 302);
    assert.equal(res.headers.get('location'), 'https://example.com');
  });

  await check('free plan blocks color customization (402)', async () => {
    const res = await fetch(`${BASE}/api/links/${linkId}/qr?dark=%23ff0000`, { headers: { cookie } });
    assert.equal(res.status, 402);
  });

  await check('free plan blocks dynamic edit (402)', async () => {
    const res = await fetch(`${BASE}/api/links/${linkId}`, {
      method: 'PATCH', headers: { 'Content-Type': 'application/json', cookie },
      body: JSON.stringify({ target_url: 'https://other.com' }),
    });
    assert.equal(res.status, 402);
  });

  await check('free plan link limit (402 on 4th)', async () => {
    for (let i = 0; i < 2; i++) {
      await fetch(`${BASE}/api/links`, {
        method: 'POST', headers: { 'Content-Type': 'application/json', cookie },
        body: JSON.stringify({ target_url: `https://n${i}.com` }),
      });
    }
    const res = await fetch(`${BASE}/api/links`, {
      method: 'POST', headers: { 'Content-Type': 'application/json', cookie },
      body: JSON.stringify({ target_url: 'https://over.com' }),
    });
    assert.equal(res.status, 402);
  });

  await check('rejects invalid url (400)', async () => {
    const res = await fetch(`${BASE}/api/links`, {
      method: 'POST', headers: { 'Content-Type': 'application/json', cookie },
      body: JSON.stringify({ target_url: 'javascript:alert(1)' }),
    });
    assert.equal(res.status, 400);
  });
} finally {
  server.kill();
  fs.rmSync(dataDir, { recursive: true, force: true });
}

process.exit(failed ? 1 : 0);
