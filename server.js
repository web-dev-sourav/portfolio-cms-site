require('dotenv').config();
const express = require('express');
const multer  = require('multer');
const path    = require('path');
const fs      = require('fs');
const { v4: uuidv4 } = require('uuid');

const app  = express();
const PORT = process.env.PORT || 3000;
let   PASS = process.env.ADMIN_PASSWORD || 'admin123';

// ── Local paths (used in dev, fallback in prod) ───────────────────────
const DATA_DIR     = path.join(__dirname, 'data');
const CONTENT_FILE = path.join(DATA_DIR, 'content.json');
const SESSION_FILE = path.join(DATA_DIR, 'sessions.json');
const UPLOAD_DIR   = (() => {
  const d = path.join(DATA_DIR, 'uploads');
  try { if (!fs.existsSync(d)) fs.mkdirSync(d, { recursive: true }); return d; } catch(_) {}
  const t = '/tmp/portfolio-uploads';
  try { if (!fs.existsSync(t)) fs.mkdirSync(t, { recursive: true }); } catch(_) {}
  return t;
})();
try { if (!fs.existsSync(DATA_DIR))    fs.mkdirSync(DATA_DIR, { recursive: true }); } catch(_) {}
try { if (!fs.existsSync(SESSION_FILE)) fs.writeFileSync(SESSION_FILE, '{}'); } catch(_) {}

// ── Upstash Redis (production content + sessions) ─────────────────────
const UPSTASH_URL   = process.env.UPSTASH_REDIS_REST_URL;
const UPSTASH_TOKEN = process.env.UPSTASH_REDIS_REST_TOKEN;
const USE_REDIS     = !!(UPSTASH_URL && UPSTASH_TOKEN);

async function redis(...args) {
  if (!USE_REDIS) return null;
  try {
    const res = await fetch(UPSTASH_URL, {
      method:  'POST',
      headers: { Authorization: `Bearer ${UPSTASH_TOKEN}`, 'Content-Type': 'application/json' },
      body:    JSON.stringify(args)
    });
    return (await res.json()).result ?? null;
  } catch(_) { return null; }
}

// ── Vercel Blob (production image uploads) ────────────────────────────
const USE_BLOB = !!process.env.BLOB_READ_WRITE_TOKEN;
let blob;
if (USE_BLOB) { try { blob = require('@vercel/blob'); } catch(_) {} }

// ── Session helpers ───────────────────────────────────────────────────
let sessions = {};
try { sessions = JSON.parse(fs.readFileSync(SESSION_FILE, 'utf8')); } catch(_) {}
const now = Date.now();
Object.keys(sessions).forEach(k => { if (now - sessions[k].created > 7 * 864e5) delete sessions[k]; });

function saveLocalSessions() {
  try { fs.writeFileSync(SESSION_FILE, JSON.stringify(sessions, null, 2)); } catch(_) {}
}

async function sessionValid(token) {
  if (!token) return false;
  if (sessions[token]) return true;
  const val = await redis('GET', `session:${token}`);
  if (val) { sessions[token] = typeof val === 'string' ? JSON.parse(val) : val; return true; }
  return false;
}

async function createSession(token) {
  const data = { created: Date.now() };
  sessions[token] = data;
  await redis('SETEX', `session:${token}`, 604800, JSON.stringify(data));
  saveLocalSessions();
}

async function removeSession(token) {
  delete sessions[token];
  await redis('DEL', `session:${token}`);
  saveLocalSessions();
}

// ── Content helpers ───────────────────────────────────────────────────
async function getContent() {
  if (USE_REDIS) {
    const val = await redis('GET', 'portfolio:content');
    if (val) return typeof val === 'string' ? JSON.parse(val) : val;
  }
  try { return JSON.parse(fs.readFileSync(CONTENT_FILE, 'utf8')); } catch(_) { return {}; }
}

async function saveContent(data) {
  if (USE_REDIS) await redis('SET', 'portfolio:content', JSON.stringify(data));
  try { fs.writeFileSync(CONTENT_FILE, JSON.stringify(data, null, 2)); } catch(_) {}
}

// ── Multer setup ──────────────────────────────────────────────────────
const fileFilter = (_, file, cb) => {
  const ok = /^image\/(jpeg|jpg|png|gif|webp|svg\+xml)$/.test(file.mimetype);
  cb(ok ? null : new Error('Images only'), ok);
};
const uploadDisk   = multer({ storage: multer.diskStorage({ destination: (_, __, cb) => cb(null, UPLOAD_DIR), filename: (_, file, cb) => cb(null, uuidv4() + path.extname(file.originalname).toLowerCase()) }), limits: { fileSize: 10 * 1024 * 1024 }, fileFilter });
const uploadMemory = multer({ storage: multer.memoryStorage(), limits: { fileSize: 10 * 1024 * 1024 }, fileFilter });

// ── Middleware ────────────────────────────────────────────────────────
app.use(express.json({ limit: '20mb' }));
app.use(express.static(__dirname));
if (!USE_BLOB) app.use('/uploads', express.static(UPLOAD_DIR));

const requireAuth = async (req, res, next) => {
  if (await sessionValid(req.headers['x-admin-token'])) return next();
  res.status(401).json({ error: 'Unauthorized' });
};

// ── Auth routes ───────────────────────────────────────────────────────
app.post('/api/auth/login', async (req, res) => {
  if (req.body.password !== PASS) return res.status(401).json({ error: 'Wrong password' });
  const token = uuidv4();
  await createSession(token);
  res.json({ token });
});

app.post('/api/auth/logout', requireAuth, async (req, res) => {
  await removeSession(req.headers['x-admin-token']);
  res.json({ ok: true });
});

app.get('/api/auth/check', async (req, res) => {
  res.json({ valid: await sessionValid(req.headers['x-admin-token']) });
});

// ── Content routes ────────────────────────────────────────────────────
app.get('/api/content', async (_, res) => {
  try { res.json(await getContent()); }
  catch(e) { res.status(500).json({ error: e.message }); }
});

app.put('/api/content', requireAuth, async (req, res) => {
  try { await saveContent(req.body); res.json({ ok: true }); }
  catch(e) { res.status(500).json({ error: e.message }); }
});

app.patch('/api/content/:section', requireAuth, async (req, res) => {
  try {
    const c = await getContent();
    c[req.params.section] = req.body;
    await saveContent(c);
    res.json({ ok: true });
  } catch(e) { res.status(500).json({ error: e.message }); }
});

// ── Upload routes — Vercel Blob (prod) or disk (dev) ──────────────────
if (USE_BLOB && blob) {
  app.post('/api/upload', requireAuth, uploadMemory.single('file'), async (req, res) => {
    if (!req.file) return res.status(400).json({ error: 'No file received' });
    try {
      const ext = path.extname(req.file.originalname).toLowerCase();
      const { url } = await blob.put(uuidv4() + ext, req.file.buffer, {
        access: 'public', contentType: req.file.mimetype
      });
      res.json({ url });
    } catch(e) { res.status(500).json({ error: e.message }); }
  });

  app.delete('/api/upload/:filename', requireAuth, async (req, res) => {
    try {
      const { url } = req.body;
      if (url) await blob.del(url);
      res.json({ ok: true });
    } catch(e) { res.status(500).json({ error: e.message }); }
  });

  app.get('/api/uploads', requireAuth, async (_, res) => {
    try {
      const { blobs } = await blob.list();
      res.json(blobs.map(b => ({ name: b.pathname, url: b.url })));
    } catch(e) { res.status(500).json({ error: e.message }); }
  });

} else {
  app.post('/api/upload', requireAuth, uploadDisk.single('file'), (req, res) => {
    if (!req.file) return res.status(400).json({ error: 'No file received' });
    res.json({ url: `/uploads/${req.file.filename}` });
  });

  app.delete('/api/upload/:filename', requireAuth, (req, res) => {
    const fp = path.join(UPLOAD_DIR, req.params.filename);
    if (fs.existsSync(fp)) fs.unlinkSync(fp);
    res.json({ ok: true });
  });

  app.get('/api/uploads', requireAuth, (_, res) => {
    try { res.json(fs.readdirSync(UPLOAD_DIR).map(f => ({ name: f, url: `/uploads/${f}` }))); }
    catch(_) { res.json([]); }
  });
}

// ── Change password ───────────────────────────────────────────────────
app.post('/api/auth/change-password', requireAuth, (req, res) => {
  const { newPassword } = req.body;
  if (!newPassword || newPassword.length < 6) return res.status(400).json({ error: 'Password too short' });
  PASS = newPassword;
  process.env.ADMIN_PASSWORD = newPassword;
  try {
    const envPath = path.join(__dirname, '.env');
    let envContent = fs.readFileSync(envPath, 'utf8');
    envContent = envContent.replace(/^ADMIN_PASSWORD=.*/m, `ADMIN_PASSWORD=${newPassword}`);
    fs.writeFileSync(envPath, envContent);
  } catch(_) {}
  res.json({ ok: true, message: 'Password updated' });
});

// ── SPA fallback ──────────────────────────────────────────────────────
app.get('/admin', (_, res) => res.sendFile(path.join(__dirname, 'admin', 'index.html')));

// ── Start ─────────────────────────────────────────────────────────────
module.exports = app;
app.listen(PORT, () => {
  console.log(`\n🚀 Portfolio CMS running on http://localhost:${PORT}`);
  console.log(`   Admin    : http://localhost:${PORT}/admin`);
  console.log(`   Storage  : ${USE_REDIS ? 'Upstash Redis' : 'local filesystem'}`);
  console.log(`   Images   : ${USE_BLOB && blob ? 'Vercel Blob' : 'local uploads'}\n`);
});
