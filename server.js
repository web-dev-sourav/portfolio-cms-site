require('dotenv').config();
const express = require('express');
const multer  = require('multer');
const path    = require('path');
const fs      = require('fs');
const { v4: uuidv4 } = require('uuid');

const app  = express();
const PORT = process.env.PORT || 3000;
const PASS = process.env.ADMIN_PASSWORD || 'admin123';

const DATA_DIR    = path.join(__dirname, 'data');
const CONTENT_FILE= path.join(DATA_DIR, 'content.json');
const SESSION_FILE= path.join(DATA_DIR, 'sessions.json');

// On Vercel the deployment root is read-only; uploads fall back to /tmp
const UPLOAD_DIR = (() => {
  const d = path.join(DATA_DIR, 'uploads');
  try { if (!fs.existsSync(d)) fs.mkdirSync(d, { recursive: true }); return d; } catch(_) {}
  const t = '/tmp/portfolio-uploads';
  try { if (!fs.existsSync(t)) fs.mkdirSync(t, { recursive: true }); } catch(_) {}
  return t;
})();

// ── Ensure dirs/files exist ───────────────────────────────────────────
try { if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true }); } catch(_) {}
try { if (!fs.existsSync(SESSION_FILE)) fs.writeFileSync(SESSION_FILE, '{}'); } catch(_) {}
if (!fs.existsSync(CONTENT_FILE)) {
  try {
    const defaultContent = require('./data/content.json');
    fs.writeFileSync(CONTENT_FILE, JSON.stringify(defaultContent, null, 2));
  } catch(_) {}
}

// ── Session helpers ───────────────────────────────────────────────────
let sessions = {};
try { sessions = JSON.parse(fs.readFileSync(SESSION_FILE, 'utf8')); } catch(_) {}
const saveSessions = () => { try { fs.writeFileSync(SESSION_FILE, JSON.stringify(sessions, null, 2)); } catch(_) {} };

// Clean expired sessions (older than 7 days)
const now = Date.now();
Object.keys(sessions).forEach(k => { if (now - sessions[k].created > 7 * 864e5) delete sessions[k]; });
saveSessions();

// ── Content helpers ───────────────────────────────────────────────────
const getContent  = () => JSON.parse(fs.readFileSync(CONTENT_FILE, 'utf8'));
const saveContent = d  => { try { fs.writeFileSync(CONTENT_FILE, JSON.stringify(d, null, 2)); } catch(_) {} };

// ── Multer (image uploads) ────────────────────────────────────────────
const storage = multer.diskStorage({
  destination: (_, __, cb) => cb(null, UPLOAD_DIR),
  filename:    (_, file, cb) => cb(null, uuidv4() + path.extname(file.originalname).toLowerCase())
});
const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (_, file, cb) => {
    const ok = /^image\/(jpeg|jpg|png|gif|webp|svg\+xml)$/.test(file.mimetype);
    cb(ok ? null : new Error('Images only'), ok);
  }
});

// ── Middleware ────────────────────────────────────────────────────────
app.use(express.json({ limit: '20mb' }));
app.use(express.static(__dirname));          // serves portfolio + admin
app.use('/uploads', express.static(UPLOAD_DIR));

const requireAuth = (req, res, next) => {
  const token = req.headers['x-admin-token'];
  if (token && sessions[token]) return next();
  res.status(401).json({ error: 'Unauthorized' });
};

// ── Auth routes ───────────────────────────────────────────────────────
app.post('/api/auth/login', (req, res) => {
  if (req.body.password !== PASS) return res.status(401).json({ error: 'Wrong password' });
  const token = uuidv4();
  sessions[token] = { created: Date.now() };
  saveSessions();
  res.json({ token });
});

app.post('/api/auth/logout', requireAuth, (req, res) => {
  delete sessions[req.headers['x-admin-token']];
  saveSessions();
  res.json({ ok: true });
});

app.get('/api/auth/check', (req, res) => {
  const token = req.headers['x-admin-token'];
  res.json({ valid: !!(token && sessions[token]) });
});

// ── Content routes ────────────────────────────────────────────────────
app.get('/api/content', (_, res) => res.json(getContent()));

// Save entire content object
app.put('/api/content', requireAuth, (req, res) => {
  try { saveContent(req.body); res.json({ ok: true }); }
  catch(e) { res.status(500).json({ error: e.message }); }
});

// Save one top-level section (e.g., PATCH /api/content/hero)
app.patch('/api/content/:section', requireAuth, (req, res) => {
  try {
    const c = getContent();
    c[req.params.section] = req.body;
    saveContent(c);
    res.json({ ok: true });
  } catch(e) { res.status(500).json({ error: e.message }); }
});

// ── Upload route ──────────────────────────────────────────────────────
app.post('/api/upload', requireAuth, upload.single('file'), (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'No file received' });
  res.json({ url: `/uploads/${req.file.filename}` });
});

// Delete uploaded file
app.delete('/api/upload/:filename', requireAuth, (req, res) => {
  const filepath = path.join(UPLOAD_DIR, req.params.filename);
  if (fs.existsSync(filepath)) fs.unlinkSync(filepath);
  res.json({ ok: true });
});

// List uploads
app.get('/api/uploads', requireAuth, (_, res) => {
  try {
    const files = fs.readdirSync(UPLOAD_DIR).map(f => ({ name: f, url: `/uploads/${f}` }));
    res.json(files);
  } catch(_) { res.json([]); }
});

// ── Change admin password ─────────────────────────────────────────────
app.post('/api/auth/change-password', requireAuth, (req, res) => {
  const { newPassword } = req.body;
  if (!newPassword || newPassword.length < 6) return res.status(400).json({ error: 'Password too short' });
  try {
    const envPath = path.join(__dirname, '.env');
    let envContent = fs.readFileSync(envPath, 'utf8');
    envContent = envContent.replace(/^ADMIN_PASSWORD=.*/m, `ADMIN_PASSWORD=${newPassword}`);
    fs.writeFileSync(envPath, envContent);
  } catch(_) {}
  process.env.ADMIN_PASSWORD = newPassword;
  res.json({ ok: true, message: 'Password updated (restart server to apply)' });
});

// ── SPA fallback for /admin ───────────────────────────────────────────
app.get('/admin', (_, res) => res.sendFile(path.join(__dirname, 'admin', 'index.html')));

// ── Start ─────────────────────────────────────────────────────────────
module.exports = app;
app.listen(PORT, () => {
  console.log('\n🚀 Portfolio CMS running!');
  console.log(`   Portfolio : http://localhost:${PORT}`);
  console.log(`   Admin     : http://localhost:${PORT}/admin`);
  console.log(`   Password  : ${PASS}\n`);
});
