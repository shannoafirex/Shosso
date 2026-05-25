const path = require('node:path');
const crypto = require('node:crypto');
const express = require('express');
const session = require('express-session');
const bcrypt = require('bcryptjs');
const QRCode = require('qrcode');

const db = require('./db');
const PLANS = require('./plans');

const app = express();
const PORT = process.env.PORT || 3000;
const BASE_URL = (process.env.BASE_URL || `http://localhost:${PORT}`).replace(/\/$/, '');

// --- Stripe (opcional: solo se activa si hay claves) ---
const stripe = process.env.STRIPE_SECRET_KEY
  ? require('stripe')(process.env.STRIPE_SECRET_KEY)
  : null;

// Stripe webhook necesita el body crudo, así que va antes del json parser.
app.post('/api/stripe/webhook', express.raw({ type: 'application/json' }), (req, res) => {
  if (!stripe || !process.env.STRIPE_WEBHOOK_SECRET) return res.status(503).end();
  let event;
  try {
    event = stripe.webhooks.constructEvent(
      req.body,
      req.headers['stripe-signature'],
      process.env.STRIPE_WEBHOOK_SECRET
    );
  } catch (err) {
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  if (event.type === 'checkout.session.completed') {
    const s = event.data.object;
    const userId = Number(s.client_reference_id);
    if (userId) {
      db.prepare('UPDATE users SET plan = ?, stripe_customer_id = ? WHERE id = ?')
        .run('pro', s.customer || null, userId);
    }
  }
  if (event.type === 'customer.subscription.deleted') {
    const sub = event.data.object;
    db.prepare('UPDATE users SET plan = ? WHERE stripe_customer_id = ?')
      .run('free', sub.customer);
  }
  res.json({ received: true });
});

app.use(express.json());
app.use(session({
  secret: process.env.SESSION_SECRET || 'dev-insecure-secret-change-me',
  resave: false,
  saveUninitialized: false,
  cookie: { maxAge: 1000 * 60 * 60 * 24 * 30 },
}));

// --- Helpers ---
function genCode() {
  // base62 de 7 chars
  const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  const bytes = crypto.randomBytes(7);
  return Array.from(bytes, (b) => alphabet[b % alphabet.length]).join('');
}

function isValidUrl(u) {
  try {
    const parsed = new URL(u);
    return parsed.protocol === 'http:' || parsed.protocol === 'https:';
  } catch {
    return false;
  }
}

function currentUser(req) {
  if (!req.session.userId) return null;
  return db.prepare('SELECT id, email, plan, stripe_customer_id FROM users WHERE id = ?')
    .get(req.session.userId);
}

function requireAuth(req, res, next) {
  const user = currentUser(req);
  if (!user) return res.status(401).json({ error: 'No autenticado' });
  req.user = user;
  next();
}

function planOf(user) {
  return PLANS[user.plan] || PLANS.free;
}

// --- Auth ---
app.post('/api/auth/register', (req, res) => {
  const email = String(req.body.email || '').trim().toLowerCase();
  const password = String(req.body.password || '');
  if (!email.includes('@') || password.length < 8) {
    return res.status(400).json({ error: 'Email válido y contraseña de 8+ caracteres requeridos.' });
  }
  const exists = db.prepare('SELECT id FROM users WHERE email = ?').get(email);
  if (exists) return res.status(409).json({ error: 'Ese email ya está registrado.' });

  const hash = bcrypt.hashSync(password, 10);
  const info = db.prepare('INSERT INTO users (email, password_hash) VALUES (?, ?)').run(email, hash);
  req.session.userId = info.lastInsertRowid;
  res.json({ email, plan: 'free' });
});

app.post('/api/auth/login', (req, res) => {
  const email = String(req.body.email || '').trim().toLowerCase();
  const password = String(req.body.password || '');
  const user = db.prepare('SELECT * FROM users WHERE email = ?').get(email);
  if (!user || !bcrypt.compareSync(password, user.password_hash)) {
    return res.status(401).json({ error: 'Credenciales incorrectas.' });
  }
  req.session.userId = user.id;
  res.json({ email: user.email, plan: user.plan });
});

app.post('/api/auth/logout', (req, res) => {
  req.session.destroy(() => res.json({ ok: true }));
});

app.get('/api/me', (req, res) => {
  const user = currentUser(req);
  if (!user) return res.json({ user: null });
  const plan = planOf(user);
  res.json({
    user: { email: user.email, plan: user.plan },
    limits: { maxLinks: plan.maxLinks === Infinity ? null : plan.maxLinks, dynamic: plan.dynamic, analytics: plan.analytics },
  });
});

// --- Links / QR ---
app.get('/api/links', requireAuth, (req, res) => {
  const rows = db.prepare(`
    SELECT l.id, l.code, l.target_url, l.title, l.dynamic, l.created_at,
           (SELECT COUNT(*) FROM scans s WHERE s.link_id = l.id) AS scans
    FROM links l WHERE l.user_id = ? ORDER BY l.id DESC
  `).all(req.user.id);
  const plan = planOf(req.user);
  res.json(rows.map((r) => ({
    ...r,
    dynamic: !!r.dynamic,
    short_url: `${BASE_URL}/r/${r.code}`,
    scans: plan.analytics ? r.scans : null,
  })));
});

app.post('/api/links', requireAuth, (req, res) => {
  const plan = planOf(req.user);
  const target = String(req.body.target_url || '').trim();
  const title = String(req.body.title || '').trim().slice(0, 120) || null;
  if (!isValidUrl(target)) return res.status(400).json({ error: 'URL inválida (debe empezar por http:// o https://).' });

  const count = db.prepare('SELECT COUNT(*) AS n FROM links WHERE user_id = ?').get(req.user.id).n;
  if (count >= plan.maxLinks) {
    return res.status(402).json({ error: `Límite del plan ${plan.name} alcanzado (${plan.maxLinks}). Mejora a Pro para más.`, upgrade: true });
  }

  let code = genCode();
  while (db.prepare('SELECT 1 FROM links WHERE code = ?').get(code)) code = genCode();

  const info = db.prepare(
    'INSERT INTO links (user_id, code, target_url, title, dynamic) VALUES (?, ?, ?, ?, ?)'
  ).run(req.user.id, code, target, title, plan.dynamic ? 1 : 0);

  res.json({ id: info.lastInsertRowid, code, short_url: `${BASE_URL}/r/${code}` });
});

app.patch('/api/links/:id', requireAuth, (req, res) => {
  const plan = planOf(req.user);
  if (!plan.dynamic) {
    return res.status(402).json({ error: 'Editar el destino de un QR es una función Pro (QR dinámico).', upgrade: true });
  }
  const link = db.prepare('SELECT * FROM links WHERE id = ? AND user_id = ?').get(req.params.id, req.user.id);
  if (!link) return res.status(404).json({ error: 'No encontrado' });

  const target = String(req.body.target_url || '').trim();
  if (!isValidUrl(target)) return res.status(400).json({ error: 'URL inválida.' });
  db.prepare('UPDATE links SET target_url = ? WHERE id = ?').run(target, link.id);
  res.json({ ok: true });
});

app.delete('/api/links/:id', requireAuth, (req, res) => {
  const link = db.prepare('SELECT * FROM links WHERE id = ? AND user_id = ?').get(req.params.id, req.user.id);
  if (!link) return res.status(404).json({ error: 'No encontrado' });
  db.prepare('DELETE FROM scans WHERE link_id = ?').run(link.id);
  db.prepare('DELETE FROM links WHERE id = ?').run(link.id);
  res.json({ ok: true });
});

// QR como PNG dataURL. Color personalizado = función Pro.
const HEX = /^#[0-9a-fA-F]{6}$/;
app.get('/api/links/:id/qr', requireAuth, async (req, res) => {
  const link = db.prepare('SELECT * FROM links WHERE id = ? AND user_id = ?').get(req.params.id, req.user.id);
  if (!link) return res.status(404).json({ error: 'No encontrado' });

  const plan = planOf(req.user);
  let dark = '#000000';
  let light = '#ffffff';
  let customized = false;
  if (HEX.test(req.query.dark || '')) { dark = req.query.dark; customized = true; }
  if (HEX.test(req.query.light || '')) { light = req.query.light; customized = true; }
  if (customized && !plan.dynamic) {
    return res.status(402).json({ error: 'Personalizar el color del QR es una función Pro.', upgrade: true });
  }

  const dataUrl = await QRCode.toDataURL(`${BASE_URL}/r/${link.code}`, {
    width: 512, margin: 2, color: { dark, light },
  });
  res.json({ dataUrl, short_url: `${BASE_URL}/r/${link.code}`, canCustomize: plan.dynamic });
});

// Analíticas (solo Pro)
app.get('/api/links/:id/analytics', requireAuth, (req, res) => {
  const plan = planOf(req.user);
  if (!plan.analytics) return res.status(402).json({ error: 'Las analíticas son una función Pro.', upgrade: true });
  const link = db.prepare('SELECT * FROM links WHERE id = ? AND user_id = ?').get(req.params.id, req.user.id);
  if (!link) return res.status(404).json({ error: 'No encontrado' });

  const total = db.prepare('SELECT COUNT(*) AS n FROM scans WHERE link_id = ?').get(link.id).n;
  const byDay = db.prepare(`
    SELECT substr(ts, 1, 10) AS day, COUNT(*) AS n
    FROM scans WHERE link_id = ? GROUP BY day ORDER BY day DESC LIMIT 30
  `).all(link.id);
  res.json({ total, byDay });
});

// --- Stripe checkout ---
app.post('/api/billing/checkout', requireAuth, async (req, res) => {
  if (!stripe || !process.env.STRIPE_PRICE_ID) {
    return res.status(503).json({ error: 'Pagos no configurados todavía. Define STRIPE_SECRET_KEY y STRIPE_PRICE_ID.' });
  }
  const checkout = await stripe.checkout.sessions.create({
    mode: 'subscription',
    line_items: [{ price: process.env.STRIPE_PRICE_ID, quantity: 1 }],
    client_reference_id: String(req.user.id),
    customer_email: req.user.email,
    success_url: `${BASE_URL}/?upgraded=1`,
    cancel_url: `${BASE_URL}/`,
  });
  res.json({ url: checkout.url });
});

// --- Redirección pública + tracking ---
app.get('/r/:code', (req, res) => {
  const link = db.prepare('SELECT * FROM links WHERE code = ?').get(req.params.code);
  if (!link) return res.status(404).send('Enlace no encontrado.');
  db.prepare('INSERT INTO scans (link_id, referer, user_agent) VALUES (?, ?, ?)')
    .run(link.id, req.get('referer') || null, req.get('user-agent') || null);
  res.redirect(302, link.target_url);
});

app.use(express.static(path.join(__dirname, '..', 'public')));

app.listen(PORT, () => {
  console.log(`Shosso escuchando en ${BASE_URL}`);
  if (!stripe) console.log('[aviso] Stripe no configurado: el botón de upgrade estará inactivo hasta poner las claves.');
});
