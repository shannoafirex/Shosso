const $ = (sel) => document.querySelector(sel);
let me = null;
let currentQrId = null;

async function api(path, opts = {}) {
  const res = await fetch(path, {
    headers: { 'Content-Type': 'application/json' },
    ...opts,
    body: opts.body ? JSON.stringify(opts.body) : undefined,
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw Object.assign(new Error(data.error || 'Error'), { data, status: res.status });
  return data;
}

function show(view) {
  $('#auth').classList.toggle('hidden', view !== 'auth');
  $('#dashboard').classList.toggle('hidden', view !== 'dashboard');
}

async function refresh() {
  const info = await api('/api/me');
  me = info.user;
  if (!me) { $('#userbar').classList.add('hidden'); show('auth'); return; }

  $('#userbar').classList.remove('hidden');
  $('#user-email').textContent = me.email;
  $('#user-plan').textContent = me.plan.toUpperCase();
  $('#btn-upgrade').classList.toggle('hidden', me.plan === 'pro');
  me.limits = info.limits;
  show('dashboard');
  await loadLinks();
}

async function loadLinks() {
  const links = await api('/api/links');
  const container = $('#links');
  container.innerHTML = '';
  if (!links.length) {
    container.innerHTML = '<p class="muted">Aún no tienes enlaces. Crea el primero arriba.</p>';
    return;
  }
  for (const l of links) {
    const el = document.createElement('div');
    el.className = 'link-item';
    const scansHtml = l.scans === null
      ? '<span class="locked">Escaneos: función Pro</span>'
      : `<span class="scans">${l.scans} escaneos</span>`;
    el.innerHTML = `
      <div class="link-top">
        <span class="link-title">${escapeHtml(l.title || l.code)}</span>
        ${scansHtml}
      </div>
      <div class="link-short">${l.short_url}</div>
      <div class="link-target">→ ${escapeHtml(l.target_url)} ${l.dynamic ? '<em>(dinámico)</em>' : ''}</div>
      <div class="link-actions">
        <button data-act="qr" data-id="${l.id}">Ver QR</button>
        <button class="btn-ghost" data-act="copy" data-url="${l.short_url}">Copiar enlace</button>
        <button class="btn-ghost" data-act="edit" data-id="${l.id}">Cambiar destino</button>
        <button class="btn-ghost" data-act="del" data-id="${l.id}">Borrar</button>
      </div>`;
    container.appendChild(el);
  }
}

function escapeHtml(s) {
  return String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

// --- Eventos ---
$('#auth-form').addEventListener('submit', async (e) => {
  e.preventDefault();
  const mode = e.submitter?.dataset.mode || 'login';
  $('#auth-error').textContent = '';
  try {
    await api(`/api/auth/${mode}`, { method: 'POST', body: { email: $('#email').value, password: $('#password').value } });
    await refresh();
  } catch (err) {
    $('#auth-error').textContent = err.message;
  }
});

$('#btn-logout').addEventListener('click', async () => {
  await api('/api/auth/logout', { method: 'POST' });
  me = null; await refresh();
});

$('#btn-upgrade').addEventListener('click', async () => {
  try {
    const { url } = await api('/api/billing/checkout', { method: 'POST' });
    window.location.href = url;
  } catch (err) {
    alert(err.message);
  }
});

$('#link-form').addEventListener('submit', async (e) => {
  e.preventDefault();
  $('#link-error').textContent = '';
  try {
    await api('/api/links', { method: 'POST', body: { target_url: $('#target-url').value, title: $('#link-title').value } });
    $('#target-url').value = ''; $('#link-title').value = '';
    await loadLinks();
  } catch (err) {
    $('#link-error').textContent = err.message + (err.data?.upgrade ? ' 👉 Usa "Mejorar a Pro".' : '');
  }
});

$('#links').addEventListener('click', async (e) => {
  const btn = e.target.closest('button');
  if (!btn) return;
  const { act, id, url } = btn.dataset;
  try {
    if (act === 'copy') {
      await navigator.clipboard.writeText(url);
      btn.textContent = '¡Copiado!';
      setTimeout(() => (btn.textContent = 'Copiar enlace'), 1200);
    } else if (act === 'qr') {
      currentQrId = id;
      const { dataUrl, short_url, canCustomize } = await api(`/api/links/${id}/qr`);
      $('#qr-img').src = dataUrl;
      $('#qr-download').href = dataUrl;
      $('#qr-url').textContent = short_url;
      $('#qr-colors').classList.toggle('hidden', !canCustomize);
      $('#qr-pro-hint').classList.toggle('hidden', canCustomize);
      $('#qr-modal').classList.remove('hidden');
    } else if (act === 'edit') {
      const target = prompt('Nuevo destino (URL):');
      if (!target) return;
      await api(`/api/links/${id}`, { method: 'PATCH', body: { target_url: target } });
      await loadLinks();
    } else if (act === 'del') {
      if (!confirm('¿Borrar este enlace?')) return;
      await api(`/api/links/${id}`, { method: 'DELETE' });
      await loadLinks();
    }
  } catch (err) {
    alert(err.message + (err.data?.upgrade ? '\n\nMejora a Pro para desbloquearlo.' : ''));
  }
});

$('#qr-close').addEventListener('click', () => $('#qr-modal').classList.add('hidden'));

async function regenQr() {
  if (!currentQrId) return;
  const dark = encodeURIComponent($('#qr-dark').value);
  const light = encodeURIComponent($('#qr-light').value);
  try {
    const { dataUrl } = await api(`/api/links/${currentQrId}/qr?dark=${dark}&light=${light}`);
    $('#qr-img').src = dataUrl;
    $('#qr-download').href = dataUrl;
  } catch (err) {
    alert(err.message);
  }
}
$('#qr-dark').addEventListener('change', regenQr);
$('#qr-light').addEventListener('change', regenQr);

refresh().catch(() => show('auth'));
