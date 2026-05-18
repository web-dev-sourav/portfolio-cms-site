/* ===== ADMIN DASHBOARD JS ===== */
'use strict';

// ── State ──────────────────────────────────────────────────────────────
let C = {};          // live content object
let token = localStorage.getItem('adminToken') || '';
let dirty = false;
let section = 'dashboard';

// ── API helpers ────────────────────────────────────────────────────────
const api = {
  headers: () => ({ 'Content-Type': 'application/json', 'x-admin-token': token }),

  get: (url) => fetch(url, { headers: api.headers() }).then(r => r.json()),

  post: (url, body) => fetch(url, {
    method: 'POST', headers: api.headers(), body: JSON.stringify(body)
  }).then(r => r.json()),

  put: (url, body) => fetch(url, {
    method: 'PUT', headers: api.headers(), body: JSON.stringify(body)
  }).then(r => r.json()),

  patch: (url, body) => fetch(url, {
    method: 'PATCH', headers: api.headers(), body: JSON.stringify(body)
  }).then(r => r.json()),

  del: (url) => fetch(url, { method: 'DELETE', headers: api.headers() }).then(r => r.json()),

  upload: async (file) => {
    const fd = new FormData();
    fd.append('file', file);
    const r = await fetch('/api/upload', { method: 'POST', headers: { 'x-admin-token': token }, body: fd });
    return r.json();
  }
};

// ── Auth ───────────────────────────────────────────────────────────────
async function checkAuth() {
  if (!token) { showLogin(); return; }
  try {
    const d = await api.get('/api/auth/check');
    if (!d.valid) { localStorage.removeItem('adminToken'); token = ''; showLogin(); return; }
    document.getElementById('loginScreen').style.display = 'none';
    await loadContent();
    navigate('dashboard');
  } catch (_) {
    showLogin('server');
  }
}

async function doLogin() {
  const pw = document.getElementById('loginPw').value.trim();
  const err = document.getElementById('loginError');
  const btn = document.querySelector('.login-btn');

  if (!pw) {
    showLoginError('Please enter your password.');
    return;
  }

  btn.textContent = 'Signing in…';
  btn.disabled = true;
  err.style.display = 'none';

  try {
    const d = await api.post('/api/auth/login', { password: pw });
    if (d.token) {
      token = d.token;
      localStorage.setItem('adminToken', token);
      document.getElementById('loginScreen').style.display = 'none';
      await loadContent();
      navigate('dashboard');
    } else {
      showLoginError('Wrong password — try again.');
      btn.textContent = 'Sign In →';
      btn.disabled = false;
    }
  } catch (_) {
    showLoginError('Cannot reach the server. Make sure you opened this page at http://localhost:3000/admin and that the server is running (node server.js).');
    btn.textContent = 'Sign In →';
    btn.disabled = false;
  }
}

async function doLogout() {
  try { await api.post('/api/auth/logout', {}); } catch (_) {}
  localStorage.removeItem('adminToken');
  token = '';
  location.reload();
}

function showLogin(reason) {
  const screen = document.getElementById('loginScreen');
  screen.style.display = 'flex';
  if (reason === 'server') {
    showLoginError('Server not reachable. Open this page at http://localhost:3000/admin and run node server.js first.');
  }
}

function showLoginError(msg) {
  const err = document.getElementById('loginError');
  err.style.display = 'block';
  err.textContent = msg;
}

// ── Content ────────────────────────────────────────────────────────────
async function loadContent() {
  C = await api.get('/api/content');
}

async function saveSection(key, data) {
  const r = await api.patch(`/api/content/${key}`, data || C[key]);
  if (r.ok) { markClean(); toast('Section saved!'); }
  else toast('Save failed — ' + (r.error || 'unknown error'), 'error');
}

async function saveAll() {
  const btn = document.querySelector('.save-all-btn');
  btn.classList.add('saving');
  btn.textContent = '💾 Saving…';
  const r = await api.put('/api/content', C);
  btn.classList.remove('saving');
  btn.innerHTML = '💾 Save All';
  if (r.ok) { markClean(); toast('All changes saved!', 'success'); }
  else toast('Save failed', 'error');
}

function markDirty() {
  dirty = true;
  document.querySelector('.dirty-dot').classList.add('show');
}
function markClean() {
  dirty = false;
  document.querySelector('.dirty-dot').classList.remove('show');
}

// ── Navigation ─────────────────────────────────────────────────────────
function navigate(name) {
  section = name;
  document.querySelectorAll('.nav-item').forEach(el => el.classList.toggle('active', el.dataset.section === name));
  const area = document.getElementById('contentArea');
  area.innerHTML = '<div class="loading-spinner"><div class="spinner"></div></div>';
  setTimeout(() => { renderSection(name); }, 80);
  const titles = {
    dashboard: 'Dashboard', site: 'Site Settings', hero: 'Hero Section',
    services: 'Services', portfolio: 'Portfolio', testimonials: 'Testimonials',
    process: 'Process Steps', pricing: 'Pricing Plans', about: 'About Page',
    contact: 'Contact Info', casestudy: 'Case Study', images: 'Images'
  };
  document.getElementById('topbarTitle').textContent = titles[name] || 'Admin';
}

// ── Section Renderers ──────────────────────────────────────────────────
function renderSection(name) {
  const area = document.getElementById('contentArea');
  const renderers = {
    dashboard: renderDashboard, site: renderSite, hero: renderHero,
    services: renderServices, portfolio: renderPortfolio, testimonials: renderTestimonials,
    process: renderProcess, pricing: renderPricing, about: renderAbout,
    contact: renderContact, casestudy: renderCaseStudy, images: renderImages
  };
  if (renderers[name]) renderers[name](area);
  else area.innerHTML = `<div style="color:var(--text2);padding:40px">Section "${name}" coming soon.</div>`;
}

// ── DASHBOARD ──────────────────────────────────────────────────────────
function renderDashboard(el) {
  const s = C.services?.length || 0;
  const p = C.portfolio?.length || 0;
  const t = C.testimonials?.length || 0;
  el.innerHTML = `
    <div class="section-head"><h2>Welcome back 👋</h2><p>Manage and update your portfolio content from here.</p></div>
    <div class="dashboard-grid">
      ${dashStat('⚡','Services', s, 'cards')}
      ${dashStat('📊','Portfolio Items', p, 'projects')}
      ${dashStat('💬','Testimonials', t, 'reviews')}
      ${dashStat('🟢','Status', C.site?.availability ? 'Open' : 'Closed', 'availability')}
    </div>
    <div class="card">
      <div class="card-header"><div class="card-title">Quick Edit</div></div>
      <div class="quick-links">
        ${quickLink('⚙️','Site Settings','site')}
        ${quickLink('🏠','Hero Section','hero')}
        ${quickLink('⚡','Services','services')}
        ${quickLink('📊','Portfolio','portfolio')}
        ${quickLink('💬','Testimonials','testimonials')}
        ${quickLink('💰','Pricing','pricing')}
        ${quickLink('👤','About Page','about')}
        ${quickLink('📬','Contact Info','contact')}
        ${quickLink('🖼️','Images','images')}
      </div>
    </div>
    <div class="card" style="margin-top:16px;">
      <div class="card-header"><div class="card-title">Live Site</div></div>
      <div style="display:flex;gap:10px;flex-wrap:wrap;">
        <a href="/" target="_blank" class="btn btn-ghost">🏠 Home</a>
        <a href="/services.html" target="_blank" class="btn btn-ghost">⚡ Services</a>
        <a href="/portfolio.html" target="_blank" class="btn btn-ghost">📊 Portfolio</a>
        <a href="/about.html" target="_blank" class="btn btn-ghost">👤 About</a>
        <a href="/contact.html" target="_blank" class="btn btn-ghost">📬 Contact</a>
        <a href="/case-study.html" target="_blank" class="btn btn-ghost">📖 Case Study</a>
      </div>
    </div>`;
  el.querySelectorAll('.quick-link').forEach(link => link.addEventListener('click', () => navigate(link.dataset.go)));
}

const dashStat = (icon, label, val, sub) => `<div class="dash-stat"><div class="dash-stat-icon">${icon}</div><div class="dash-stat-value">${val}</div><div class="dash-stat-label">${label}</div></div>`;
const quickLink = (icon, label, section) => `<div class="quick-link" data-go="${section}"><div class="quick-link-icon">${icon}</div><div class="quick-link-label">${label}</div></div>`;

// ── SITE SETTINGS ──────────────────────────────────────────────────────
function renderSite(el) {
  const s = C.site;
  el.innerHTML = `
    <div class="section-head"><h2>Site Settings</h2><p>Global settings that appear across all pages.</p></div>
    <div class="card">
      <div class="card-header"><div class="card-title">Identity</div></div>
      <div class="field-grid">
        ${field('Your Name','site.name', s.name)}
        ${field('Logo Text (initials)','site.initials', s.initials)}
      </div>
      ${field('Tagline / Specialty','site.tagline', s.tagline)}
      ${field('Footer Tagline','site.footerTagline', s.footerTagline)}
      ${field('Copyright Text','site.copyrightText', s.copyrightText)}
    </div>
    <div class="card">
      <div class="card-header"><div class="card-title">Logo Image</div></div>
      <div class="field-hint" style="margin-bottom:12px;">Upload a logo image to replace the text initials in the navbar. PNG/SVG with transparent background recommended.</div>
      ${imgUpload('site.logoImage', s.logoImage, 'logo')}
    </div>
    <div class="card">
      <div class="card-header"><div class="card-title">Profile / Avatar Photo</div></div>
      <div class="field-hint" style="margin-bottom:12px;">Used in the hero card and about page. Square image recommended.</div>
      ${imgUpload('site.profileImage', s.profileImage, 'avatar')}
    </div>
    <div class="card">
      <div class="card-header"><div class="card-title">Availability</div></div>
      <div class="toggle-row">
        <div class="toggle-info"><div class="toggle-label">Available for New Clients</div><div class="toggle-desc">Controls the green "available" badge and status dot</div></div>
        <label class="toggle"><input type="checkbox" data-field="site.availability" ${s.availability ? 'checked' : ''} /><span class="toggle-slider"></span></label>
      </div>
      ${field('Availability Badge Text','site.availabilityText', s.availabilityText)}
    </div>
    <div class="card">
      <div class="card-header"><div class="card-title">Contact Info</div></div>
      <div class="field-grid">
        ${field('Email','site.email', s.email, 'email')}
        ${field('Phone / WhatsApp','site.phone', s.phone, 'tel')}
      </div>
      ${field('Location','site.location', s.location)}
      ${field('Location Note','site.locationNote', s.locationNote)}
      ${field('Response Time','site.responseTime', s.responseTime)}
    </div>
    <div class="card">
      <div class="card-header"><div class="card-title">Social Media Links</div></div>
      <div class="field-grid">
        ${field('LinkedIn URL','site.social.linkedin', s.social.linkedin, 'url')}
        ${field('Twitter / X URL','site.social.twitter', s.social.twitter, 'url')}
        ${field('Instagram URL','site.social.instagram', s.social.instagram, 'url')}
        ${field('YouTube URL','site.social.youtube', s.social.youtube, 'url')}
      </div>
    </div>
    <div class="card">
      <div class="card-header"><div class="card-title">Theme Colors</div></div>
      <div class="field-grid">
        ${colorField('Primary Color','site.primaryColor', s.primaryColor)}
        ${colorField('Secondary Color','site.secondaryColor', s.secondaryColor)}
        ${colorField('Accent Color','site.accentColor', s.accentColor)}
      </div>
    </div>
    ${saveBar('site')}`;
  bindFields(el); bindImages(el); bindToggles(el); bindColorFields(el);
}

// ── HERO ───────────────────────────────────────────────────────────────
function renderHero(el) {
  const h = C.hero;
  el.innerHTML = `
    <div class="section-head"><h2>Hero Section</h2><p>The main section visitors see first on the homepage.</p></div>
    <div class="card">
      <div class="card-header"><div class="card-title">Badge</div></div>
      ${field('Badge Text (next to green dot)','hero.badgeText', h.badgeText)}
    </div>
    <div class="card">
      <div class="card-header"><div class="card-title">Headline (3 Lines)</div></div>
      ${field('Line 1 (white)','hero.titleLine1', h.titleLine1)}
      ${field('Line 2 (blue gradient)','hero.titleLine2', h.titleLine2)}
      ${field('Line 3 (gold accent)','hero.titleLine3', h.titleLine3)}
    </div>
    <div class="card">
      <div class="card-header"><div class="card-title">Description</div></div>
      ${textarea('Description Paragraph','hero.description', h.description)}
    </div>
    <div class="card">
      <div class="card-header"><div class="card-title">CTA Buttons</div></div>
      <div class="field-grid">
        ${field('Button 1 Text','hero.cta1Text', h.cta1Text)}
        ${field('Button 1 Link','hero.cta1Link', h.cta1Link)}
      </div>
      <div class="field-grid">
        ${field('Button 2 Text','hero.cta2Text', h.cta2Text)}
        ${field('Button 2 Link','hero.cta2Link', h.cta2Link)}
      </div>
    </div>
    <div class="card">
      <div class="card-header"><div class="card-title">Stats Bar</div></div>
      <div id="heroStatsEditor"></div>
    </div>
    <div class="card">
      <div class="card-header"><div class="card-title">Dashboard Card Metrics</div></div>
      <div class="info-box" style="margin-bottom:16px;">ℹ️ These are the 4 numbers shown on the floating dashboard card in the hero.</div>
      <div id="dashMetricsEditor"></div>
    </div>
    ${saveBar('hero')}`;
  bindFields(el);
  renderHeroStats(document.getElementById('heroStatsEditor'));
  renderDashMetrics(document.getElementById('dashMetricsEditor'));
}

function renderHeroStats(container) {
  container.innerHTML = C.hero.stats.map((s, i) => `
    <div style="display:grid;grid-template-columns:60px 80px 1fr 1fr;gap:10px;align-items:end;margin-bottom:12px;padding-bottom:12px;border-bottom:1px solid var(--border);">
      <div class="field-group" style="margin:0;">
        <label class="field-label">Prefix</label>
        <input class="field-input" data-field="hero.stats.${i}.prefix" value="${s.prefix}" />
      </div>
      <div class="field-group" style="margin:0;">
        <label class="field-label">Value</label>
        <input class="field-input" type="number" step="0.1" data-field="hero.stats.${i}.value" value="${s.value}" />
      </div>
      <div class="field-group" style="margin:0;">
        <label class="field-label">Suffix</label>
        <input class="field-input" data-field="hero.stats.${i}.suffix" value="${s.suffix}" />
      </div>
      <div class="field-group" style="margin:0;">
        <label class="field-label">Label</label>
        <input class="field-input" data-field="hero.stats.${i}.label" value="${s.label}" />
      </div>
    </div>`).join('');
  container.querySelectorAll('[data-field]').forEach(bindField);
}

function renderDashMetrics(container) {
  container.innerHTML = C.hero.dashboardMetrics.map((m, i) => `
    <div style="display:grid;grid-template-columns:1fr 1fr 120px;gap:10px;margin-bottom:10px;">
      <div class="field-group" style="margin:0;"><label class="field-label">Label</label><input class="field-input" data-field="hero.dashboardMetrics.${i}.label" value="${m.label}" /></div>
      <div class="field-group" style="margin:0;"><label class="field-label">Value</label><input class="field-input" data-field="hero.dashboardMetrics.${i}.value" value="${m.value}" /></div>
      <div class="field-group" style="margin:0;"><label class="field-label">Color</label>
        <select class="field-select" data-field="hero.dashboardMetrics.${i}.color">
          ${['green','blue','purple','gold'].map(c => `<option value="${c}" ${m.color===c?'selected':''}>${c}</option>`).join('')}
        </select></div>
    </div>`).join('');
  container.querySelectorAll('[data-field]').forEach(bindField);
}

// ── SERVICES ───────────────────────────────────────────────────────────
function renderServices(el) {
  el.innerHTML = `
    <div class="section-head"><h2>Services</h2><p>Manage the service cards shown on the homepage and services page.</p></div>
    <div id="servicesArray" class="array-editor"></div>
    ${saveBar('services')}`;
  renderServicesArray(document.getElementById('servicesArray'));
}

function renderServicesArray(container) {
  container.innerHTML = '';
  C.services.forEach((svc, i) => {
    const div = document.createElement('div');
    div.className = 'array-item';
    div.innerHTML = `
      <div class="array-item-header" onclick="toggleItem(this)">
        <span class="item-icon-preview">${svc.icon}</span>
        <span class="item-title-preview">${svc.name}</span>
        <div class="item-controls">
          <button class="btn btn-sm btn-danger" onclick="event.stopPropagation();removeService(${i})">✕</button>
          <span class="item-toggle-btn">▼</span>
        </div>
      </div>
      <div class="array-item-body">
        <div class="field-grid">
          ${field('Icon Emoji',`services.${i}.icon`, svc.icon)}
          <div class="field-group">
            <label class="field-label">Icon Color</label>
            <select class="field-select" data-field="services.${i}.iconColor">
              ${['blue','purple','gold','green','pink','teal'].map(c => `<option value="${c}" ${svc.iconColor===c?'selected':''}>${c}</option>`).join('')}
            </select>
          </div>
        </div>
        ${field('Service Name',`services.${i}.name`, svc.name)}
        ${textarea('Description',`services.${i}.description`, svc.description)}
        <div class="field-group"><label class="field-label">Tags</label>${tagsEditor(`services.${i}.tags`, svc.tags || [])}</div>
      </div>`;
    container.appendChild(div);
    div.querySelectorAll('[data-field]').forEach(bindField);
    div.querySelectorAll('.tag-add-input').forEach(inp => initTagInput(inp));
  });
  const addBtn = document.createElement('button');
  addBtn.className = 'add-item-btn';
  addBtn.innerHTML = '+ Add Service';
  addBtn.onclick = () => {
    C.services.push({ id: uid(), icon: '⭐', iconColor: 'blue', name: 'New Service', description: '', tags: [] });
    markDirty(); renderServicesArray(container);
  };
  container.appendChild(addBtn);
}

function removeService(i) { C.services.splice(i, 1); markDirty(); renderServicesArray(document.getElementById('servicesArray')); }

// ── PORTFOLIO ──────────────────────────────────────────────────────────
function renderPortfolio(el) {
  el.innerHTML = `
    <div class="section-head"><h2>Portfolio</h2><p>Manage portfolio/case study cards.</p></div>
    <div id="portfolioArray" class="array-editor"></div>
    ${saveBar('portfolio')}`;
  renderPortfolioArray(document.getElementById('portfolioArray'));
}

function renderPortfolioArray(container) {
  container.innerHTML = '';
  C.portfolio.forEach((p, i) => {
    const div = document.createElement('div');
    div.className = 'array-item';
    div.innerHTML = `
      <div class="array-item-header" onclick="toggleItem(this)">
        <span class="item-icon-preview">${p.thumbEmoji}</span>
        <span class="item-title-preview">${p.title}</span>
        <div class="item-controls">
          <button class="btn btn-sm btn-danger" onclick="event.stopPropagation();removePortfolio(${i})">✕</button>
          <span class="item-toggle-btn">▼</span>
        </div>
      </div>
      <div class="array-item-body">
        <div class="field-grid">
          ${field('Category','portfolio.'+i+'.category', p.category)}
          ${field('Thumbnail Emoji','portfolio.'+i+'.thumbEmoji', p.thumbEmoji)}
        </div>
        <div class="field-group">
          <label class="field-label">Thumbnail Color Theme</label>
          <select class="field-select" data-field="portfolio.${i}.thumbClass">
            ${['beauty','fitness','fashion','home','health','tech'].map(c=>`<option value="${c}" ${p.thumbClass===c?'selected':''}>${c}</option>`).join('')}
          </select>
        </div>
        ${field('Title','portfolio.'+i+'.title', p.title)}
        ${textarea('Description','portfolio.'+i+'.description', p.description)}
        ${field('Link (e.g. case-study.html)','portfolio.'+i+'.link', p.link)}
        <div class="field-group"><label class="field-label">Thumbnail Image (overrides emoji)</label>${imgUpload('portfolio.'+i+'.thumbImage', p.thumbImage,'card')}</div>
        <div class="card-header" style="margin-top:16px;"><div class="card-title">Metrics (3)</div></div>
        ${p.metrics.map((m,j) => `<div class="field-grid" style="margin-bottom:8px;">
          ${field('Value','portfolio.'+i+'.metrics.'+j+'.value', m.value)}
          ${field('Label','portfolio.'+i+'.metrics.'+j+'.label', m.label)}
        </div>`).join('')}
      </div>`;
    container.appendChild(div);
    div.querySelectorAll('[data-field]').forEach(bindField);
    div.querySelectorAll('.image-upload-area').forEach(a => bindImageArea(a));
  });
  const addBtn = document.createElement('button');
  addBtn.className = 'add-item-btn';
  addBtn.innerHTML = '+ Add Portfolio Item';
  addBtn.onclick = () => {
    C.portfolio.push({ id:uid(), category:'New Category', thumbEmoji:'📊', thumbClass:'blue', thumbImage:null, title:'New Project', description:'', link:'case-study.html', metrics:[{value:'0x',label:'ROAS'},{value:'0%',label:'Growth'},{value:'$0',label:'Revenue'}] });
    markDirty(); renderPortfolioArray(container);
  };
  container.appendChild(addBtn);
}

function removePortfolio(i) { C.portfolio.splice(i, 1); markDirty(); renderPortfolioArray(document.getElementById('portfolioArray')); }

// ── TESTIMONIALS ───────────────────────────────────────────────────────
function renderTestimonials(el) {
  el.innerHTML = `
    <div class="section-head"><h2>Testimonials</h2><p>Client reviews and testimonials shown on the homepage.</p></div>
    <div id="testimonialsArray" class="array-editor"></div>
    ${saveBar('testimonials')}`;
  renderTestimonialsArray(document.getElementById('testimonialsArray'));
}

function renderTestimonialsArray(container) {
  container.innerHTML = '';
  C.testimonials.forEach((t, i) => {
    const div = document.createElement('div');
    div.className = 'array-item';
    div.innerHTML = `
      <div class="array-item-header" onclick="toggleItem(this)">
        <span class="item-icon-preview">💬</span>
        <span class="item-title-preview">${t.name} — ${t.role}</span>
        <div class="item-controls">
          <button class="btn btn-sm btn-danger" onclick="event.stopPropagation();removeTestimonial(${i})">✕</button>
          <span class="item-toggle-btn">▼</span>
        </div>
      </div>
      <div class="array-item-body">
        ${textarea('Quote Text','testimonials.'+i+'.text', t.text)}
        <div class="field-grid">
          ${field('Author Name','testimonials.'+i+'.name', t.name)}
          ${field('Role / Company','testimonials.'+i+'.role', t.role)}
          ${field('Initials (Avatar)','testimonials.'+i+'.initials', t.initials)}
          <div class="field-group"><label class="field-label">Star Rating</label>
            <select class="field-select" data-field="testimonials.${i}.stars">
              ${[5,4,3,2,1].map(n=>`<option value="${n}" ${t.stars==n?'selected':''}>${'★'.repeat(n)}</option>`).join('')}
            </select></div>
        </div>
      </div>`;
    container.appendChild(div);
    div.querySelectorAll('[data-field]').forEach(bindField);
  });
  const addBtn = document.createElement('button');
  addBtn.className = 'add-item-btn';
  addBtn.innerHTML = '+ Add Testimonial';
  addBtn.onclick = () => {
    C.testimonials.push({ id:uid(), stars:5, text:'', name:'New Client', role:'Company Name', initials:'NC' });
    markDirty(); renderTestimonialsArray(container);
  };
  container.appendChild(addBtn);
}

function removeTestimonial(i) { C.testimonials.splice(i,1); markDirty(); renderTestimonialsArray(document.getElementById('testimonialsArray')); }

// ── PROCESS ────────────────────────────────────────────────────────────
function renderProcess(el) {
  el.innerHTML = `
    <div class="section-head"><h2>Process Steps</h2><p>The 4-step "How I Work" section on the homepage.</p></div>
    <div id="processArray" class="array-editor"></div>
    ${saveBar('process')}`;
  renderProcessArray(document.getElementById('processArray'));
}

function renderProcessArray(container) {
  container.innerHTML = '';
  C.process.forEach((p, i) => {
    const div = document.createElement('div');
    div.className = 'array-item';
    div.innerHTML = `
      <div class="array-item-header" onclick="toggleItem(this)">
        <span class="item-icon-preview">${p.step}</span>
        <span class="item-title-preview">${p.title}</span>
        <div class="item-controls"><span class="item-toggle-btn">▼</span></div>
      </div>
      <div class="array-item-body">
        <div class="field-grid">
          ${field('Step Number','process.'+i+'.step', p.step)}
          ${field('Title','process.'+i+'.title', p.title)}
        </div>
        ${textarea('Description','process.'+i+'.description', p.description)}
      </div>`;
    container.appendChild(div);
    div.querySelectorAll('[data-field]').forEach(bindField);
  });
}

// ── PRICING ────────────────────────────────────────────────────────────
function renderPricing(el) {
  el.innerHTML = `
    <div class="section-head"><h2>Pricing Plans</h2><p>Edit your 3 service pricing tiers on the services page.</p></div>
    <div id="pricingArray" class="array-editor"></div>
    ${saveBar('pricing')}`;
  renderPricingArray(document.getElementById('pricingArray'));
}

function renderPricingArray(container) {
  container.innerHTML = '';
  C.pricing.forEach((pl, i) => {
    const div = document.createElement('div');
    div.className = 'array-item';
    div.innerHTML = `
      <div class="array-item-header" onclick="toggleItem(this)">
        <span class="item-icon-preview">💰</span>
        <span class="item-title-preview">${pl.name} — $${pl.price}/mo ${pl.featured ? '⭐ Featured' : ''}</span>
        <span class="item-toggle-btn">▼</span>
      </div>
      <div class="array-item-body">
        <div class="field-grid">
          ${field('Plan Name','pricing.'+i+'.name', pl.name)}
          ${field('Price (number only, no $)','pricing.'+i+'.price', pl.price)}
        </div>
        ${field('Period / Best For text','pricing.'+i+'.period', pl.period)}
        ${field('CTA Button Text','pricing.'+i+'.ctaText', pl.ctaText)}
        <div class="toggle-row"><div class="toggle-info"><div class="toggle-label">Featured Plan</div><div class="toggle-desc">Shows "Most Popular" ribbon</div></div>
          <label class="toggle"><input type="checkbox" data-field="pricing.${i}.featured" ${pl.featured?'checked':''} /><span class="toggle-slider"></span></label></div>
        <div class="field-group" style="margin-top:16px;"><label class="field-label">Features</label>
          <div class="features-list" id="features-${i}">${renderFeaturesList(pl.features, i)}</div>
          <button class="btn btn-ghost btn-sm" style="margin-top:8px;" onclick="addFeature(${i})">+ Add Feature</button>
        </div>
      </div>`;
    container.appendChild(div);
    div.querySelectorAll('[data-field]').forEach(bindField);
    div.querySelectorAll('.toggle input').forEach(bindToggle);
    div.querySelectorAll('.feature-text-input').forEach(inp => {
      inp.addEventListener('input', e => { const [,pi,,fi] = e.target.dataset.field.split('.'); setPath(C, `pricing.${pi}.features.${fi}.text`, e.target.value); markDirty(); });
    });
    div.querySelectorAll('.feature-check').forEach(btn => {
      btn.addEventListener('click', e => {
        const [,pi,,fi] = e.target.dataset.field.split('.');
        C.pricing[pi].features[fi].included = !C.pricing[pi].features[fi].included;
        markDirty(); renderPricingArray(container);
      });
    });
    div.querySelectorAll('.feature-remove').forEach(btn => {
      btn.addEventListener('click', e => {
        const [pi, fi] = [e.target.dataset.plan, e.target.dataset.feat];
        C.pricing[pi].features.splice(fi, 1); markDirty(); renderPricingArray(container);
      });
    });
  });
}

function renderFeaturesList(features, pi) {
  return features.map((f, fi) => `
    <div class="feature-row">
      <span class="feature-check ${f.included?'active':''}" data-field="pricing.${pi}.features.${fi}.included">${f.included?'✓':'–'}</span>
      <input class="feature-text-input" value="${f.text}" data-field="pricing.${pi}.features.${fi}.text" placeholder="Feature name" />
      <span class="feature-remove" data-plan="${pi}" data-feat="${fi}">✕</span>
    </div>`).join('');
}

function addFeature(pi) {
  C.pricing[pi].features.push({ text: 'New feature', included: true });
  markDirty(); renderPricingArray(document.getElementById('pricingArray'));
}

// ── ABOUT ──────────────────────────────────────────────────────────────
function renderAbout(el) {
  const a = C.about;
  el.innerHTML = `
    <div class="section-head"><h2>About Page</h2><p>Edit your bio, skills, career timeline, values, and certifications.</p></div>
    <div class="tab-bar">
      <button class="tab-btn active" onclick="switchTab(this,'tab-bio')">Bio</button>
      <button class="tab-btn" onclick="switchTab(this,'tab-skills')">Skills</button>
      <button class="tab-btn" onclick="switchTab(this,'tab-timeline')">Timeline</button>
      <button class="tab-btn" onclick="switchTab(this,'tab-values')">Values</button>
      <button class="tab-btn" onclick="switchTab(this,'tab-tools')">Tools & Certs</button>
    </div>
    <div id="tab-bio" class="tab-content active">
      <div class="card">
        <div class="card-header"><div class="card-title">Section Headline</div></div>
        ${field('About Section Headline','about.headline', a.headline)}
      </div>
      <div class="card">
        <div class="card-header"><div class="card-title">Bio Paragraphs</div><div class="card-action" onclick="addBioPara()">+ Add Paragraph</div></div>
        <div id="bioParagraphs">${a.bio.map((p,i)=>`<div class="field-group">${textarea('Paragraph '+(i+1),'about.bio.'+i, p, 3)}<button class="btn btn-sm btn-danger" onclick="removeBioPara(${i})" style="margin-top:4px;">Remove</button></div>`).join('')}</div>
      </div>
    </div>
    <div id="tab-skills" class="tab-content">
      <div class="card">
        <div class="card-header"><div class="card-title">Skills</div><div class="card-action" onclick="addSkill()">+ Add Skill</div></div>
        <div id="skillsList">${renderSkillsList(a.skills)}</div>
      </div>
    </div>
    <div id="tab-timeline" class="tab-content">
      <div class="card">
        <div class="card-header"><div class="card-title">Career Timeline</div><div class="card-action" onclick="addTimelineItem()">+ Add Item</div></div>
        <div id="timelineList" class="array-editor">${renderTimelineList(a.timeline)}</div>
      </div>
    </div>
    <div id="tab-values" class="tab-content">
      <div class="card">
        <div class="card-header"><div class="card-title">Core Values</div><div class="card-action" onclick="addValue()">+ Add Value</div></div>
        <div id="valuesList" class="array-editor">${renderValuesList(a.values)}</div>
      </div>
    </div>
    <div id="tab-tools" class="tab-content">
      <div class="card">
        <div class="card-header"><div class="card-title">Tools (comma-separated)</div></div>
        <textarea class="field-textarea" data-field="about.tools-csv" style="height:80px;" placeholder="Tool 1, Tool 2, Tool 3...">${a.tools.join(', ')}</textarea>
        <div class="field-hint">Separate tools with commas. They appear as chips on the about page.</div>
      </div>
      <div class="card">
        <div class="card-header"><div class="card-title">Certifications</div><div class="card-action" onclick="addCert()">+ Add Cert</div></div>
        <div id="certsList" class="array-editor">${renderCertsList(a.certifications)}</div>
      </div>
    </div>
    ${saveBar('about')}`;
  bindFields(el); bindToggles(el);
  el.querySelectorAll('[data-field="about.tools-csv"]').forEach(t => {
    t.addEventListener('input', e => { C.about.tools = e.target.value.split(',').map(s=>s.trim()).filter(Boolean); markDirty(); });
  });
  el.querySelectorAll('.skill-pct-input').forEach(inp => {
    inp.addEventListener('input', e => {
      const i = e.target.dataset.idx;
      C.about.skills[i].percentage = parseInt(e.target.value)||0;
      const bar = e.target.closest('.skill-row').querySelector('.skill-bar-fill');
      if (bar) bar.style.width = (C.about.skills[i].percentage) + '%';
      markDirty();
    });
  });
}

function renderSkillsList(skills) {
  return skills.map((s,i) => `
    <div class="skill-row" style="margin-bottom:12px;">
      <input class="field-input" style="width:200px;" data-field="about.skills.${i}.name" value="${s.name}" />
      <div class="skill-bar-wrap"><div class="skill-bar-fill" style="width:${s.percentage}%"></div></div>
      <input class="skill-pct-input" type="number" min="0" max="100" value="${s.percentage}" data-idx="${i}" />
      <button class="btn btn-sm btn-danger" onclick="removeSkill(${i})">✕</button>
    </div>`).join('');
}

function renderTimelineList(timeline) {
  return timeline.map((t,i) => `
    <div class="array-item">
      <div class="array-item-header" onclick="toggleItem(this)">
        <span class="item-icon-preview">📅</span>
        <span class="item-title-preview">${t.year}: ${t.title}</span>
        <div class="item-controls"><button class="btn btn-sm btn-danger" onclick="event.stopPropagation();removeTimeline(${i})">✕</button><span class="item-toggle-btn">▼</span></div>
      </div>
      <div class="array-item-body">
        ${field('Year/Period','about.timeline.'+i+'.year', t.year)}
        ${field('Title','about.timeline.'+i+'.title', t.title)}
        ${textarea('Description','about.timeline.'+i+'.description', t.description)}
      </div>
    </div>`).join('');
}

function renderValuesList(values) {
  return values.map((v,i) => `
    <div class="array-item">
      <div class="array-item-header" onclick="toggleItem(this)">
        <span class="item-icon-preview">${v.icon}</span>
        <span class="item-title-preview">${v.title}</span>
        <div class="item-controls"><button class="btn btn-sm btn-danger" onclick="event.stopPropagation();removeValue(${i})">✕</button><span class="item-toggle-btn">▼</span></div>
      </div>
      <div class="array-item-body">
        <div class="field-grid">
          ${field('Icon Emoji','about.values.'+i+'.icon', v.icon)}
          ${field('Title','about.values.'+i+'.title', v.title)}
        </div>
        ${textarea('Description','about.values.'+i+'.description', v.description)}
      </div>
    </div>`).join('');
}

function renderCertsList(certs) {
  return certs.map((c,i) => `
    <div class="array-item">
      <div class="array-item-header" onclick="toggleItem(this)">
        <span class="item-icon-preview">${c.icon}</span>
        <span class="item-title-preview">${c.name}</span>
        <div class="item-controls"><button class="btn btn-sm btn-danger" onclick="event.stopPropagation();removeCert(${i})">✕</button><span class="item-toggle-btn">▼</span></div>
      </div>
      <div class="array-item-body">
        <div class="field-grid">
          ${field('Icon Emoji','about.certifications.'+i+'.icon', c.icon)}
          ${field('Name','about.certifications.'+i+'.name', c.name)}
        </div>
        ${field('Organization & Year','about.certifications.'+i+'.org', c.org)}
      </div>
    </div>`).join('');
}

// About action helpers
window.addBioPara = () => { C.about.bio.push(''); markDirty(); navigate('about'); };
window.removeBioPara = (i) => { C.about.bio.splice(i,1); markDirty(); navigate('about'); };
window.addSkill = () => { C.about.skills.push({id:uid(),name:'New Skill',percentage:80}); markDirty(); navigate('about'); };
window.removeSkill = (i) => { C.about.skills.splice(i,1); markDirty(); navigate('about'); };
window.addTimelineItem = () => { C.about.timeline.push({id:uid(),year:'20XX',title:'New Role',description:''}); markDirty(); navigate('about'); };
window.removeTimeline = (i) => { C.about.timeline.splice(i,1); markDirty(); navigate('about'); };
window.addValue = () => { C.about.values.push({id:uid(),icon:'⭐',title:'New Value',description:''}); markDirty(); navigate('about'); };
window.removeValue = (i) => { C.about.values.splice(i,1); markDirty(); navigate('about'); };
window.addCert = () => { C.about.certifications.push({id:uid(),icon:'🎓',name:'New Certification',org:'Issuer, Year'}); markDirty(); navigate('about'); };
window.removeCert = (i) => { C.about.certifications.splice(i,1); markDirty(); navigate('about'); };

// ── CONTACT ────────────────────────────────────────────────────────────
function renderContact(el) {
  const c = C.contact;
  el.innerHTML = `
    <div class="section-head"><h2>Contact Info</h2><p>Information shown on the contact page and footer.</p></div>
    <div class="card">
      <div class="card-header"><div class="card-title">Page Header</div></div>
      ${field('Contact Page Title','contact.heroTitle', c.heroTitle)}
      ${textarea('Contact Page Subtitle','contact.heroSubtitle', c.heroSubtitle)}
    </div>
    <div class="card">
      <div class="card-header"><div class="card-title">Contact Details</div></div>
      <div class="field-grid">
        ${field('Email','contact.email', c.email, 'email')}
        ${field('Phone / WhatsApp','contact.phone', c.phone, 'tel')}
      </div>
      ${field('Location','contact.location', c.location)}
      ${field('Location Note','contact.locationNote', c.locationNote)}
      ${field('Response Time','contact.responseTime', c.responseTime)}
    </div>
    ${saveBar('contact')}`;
  bindFields(el);
}

// ── CASE STUDY ─────────────────────────────────────────────────────────
function renderCaseStudy(el) {
  const cs = C.caseStudy;
  el.innerHTML = `
    <div class="section-head"><h2>Case Study</h2><p>Edit the featured case study page content.</p></div>
    <div class="card">
      <div class="card-header"><div class="card-title">Client Info</div></div>
      <div class="field-grid">
        ${field('Client Name','caseStudy.clientName', cs.clientName)}
        ${field('Industry','caseStudy.industry', cs.industry)}
        ${field('Duration','caseStudy.duration', cs.duration)}
        ${field('Ad Spend','caseStudy.adSpend', cs.adSpend)}
        ${field('Platform','caseStudy.platform', cs.platform)}
      </div>
    </div>
    <div class="card">
      <div class="card-header"><div class="card-title">Headline & Challenge</div></div>
      ${field('Page Headline','caseStudy.headline', cs.headline)}
      ${textarea('Challenge Description','caseStudy.challenge', cs.challenge, 5)}
    </div>
    <div class="card">
      <div class="card-header"><div class="card-title">Before / After Metrics</div></div>
      <div class="field-grid">
        <div><div class="card-title" style="margin-bottom:12px;color:var(--red);">❌ Before</div>
          ${field('ROAS','caseStudy.before.roas', cs.before.roas)}
          ${field('Revenue','caseStudy.before.revenue', cs.before.revenue)}
          ${field('CPA','caseStudy.before.cpa', cs.before.cpa)}
          ${field('CTR','caseStudy.before.ctr', cs.before.ctr)}
        </div>
        <div><div class="card-title" style="margin-bottom:12px;color:var(--green);">✅ After</div>
          ${field('ROAS','caseStudy.after.roas', cs.after.roas)}
          ${field('Revenue','caseStudy.after.revenue', cs.after.revenue)}
          ${field('CPA','caseStudy.after.cpa', cs.after.cpa)}
          ${field('CTR','caseStudy.after.ctr', cs.after.ctr)}
        </div>
      </div>
    </div>
    <div class="card">
      <div class="card-header"><div class="card-title">Key Results (4 boxes)</div></div>
      ${cs.results.map((r,i) => `<div class="field-grid" style="margin-bottom:10px;">
        ${field('Prefix','caseStudy.results.'+i+'.prefix', r.prefix)}
        ${field('Value','caseStudy.results.'+i+'.value', r.value)}
        ${field('Suffix','caseStudy.results.'+i+'.suffix', r.suffix)}
        ${field('Label','caseStudy.results.'+i+'.label', r.label)}
      </div>`).join('')}
    </div>
    <div class="card">
      <div class="card-header"><div class="card-title">Client Quote</div></div>
      ${textarea('Quote Text','caseStudy.clientQuote', cs.clientQuote)}
      ${field('Quote Author','caseStudy.clientQuoteAuthor', cs.clientQuoteAuthor)}
    </div>
    ${saveBar('caseStudy')}`;
  bindFields(el);
}

// ── IMAGES ─────────────────────────────────────────────────────────────
function renderImages(el) {
  el.innerHTML = `
    <div class="section-head"><h2>Image Library</h2><p>All uploaded images. Click to copy URL.</p></div>
    <div class="card">
      <div class="card-header"><div class="card-title">Upload New Image</div></div>
      <div class="image-upload-area" id="globalUploadArea" style="max-width:400px;">
        <div class="upload-icon">📁</div>
        <div class="upload-text">Click or drag to upload an image</div>
        <div class="upload-hint">JPEG, PNG, GIF, WebP, SVG — max 10MB</div>
      </div>
      <input type="file" id="globalFileInput" accept="image/*" />
    </div>
    <div class="card">
      <div class="card-header"><div class="card-title">Uploaded Images</div></div>
      <div id="imageGallery" style="display:grid;grid-template-columns:repeat(auto-fill,minmax(150px,1fr));gap:12px;"></div>
    </div>`;
  const area = document.getElementById('globalUploadArea');
  const input = document.getElementById('globalFileInput');
  area.addEventListener('click', () => input.click());
  area.addEventListener('dragover', e => { e.preventDefault(); area.style.borderColor = 'var(--blue)'; });
  area.addEventListener('dragleave', () => { area.style.borderColor = ''; });
  area.addEventListener('drop', e => { e.preventDefault(); area.style.borderColor = ''; if (e.dataTransfer.files[0]) uploadGlobalFile(e.dataTransfer.files[0]); });
  input.addEventListener('change', e => { if (e.target.files[0]) uploadGlobalFile(e.target.files[0]); });
  loadImageGallery();
}

async function uploadGlobalFile(file) {
  toast('Uploading…', 'info');
  const r = await api.upload(file);
  if (r.url) { toast('Uploaded! URL copied.'); navigator.clipboard.writeText(location.origin + r.url).catch(()=>{}); loadImageGallery(); }
  else toast('Upload failed', 'error');
}

async function loadImageGallery() {
  const gallery = document.getElementById('imageGallery');
  if (!gallery) return;
  const files = await api.get('/api/uploads');
  if (!files.length) { gallery.innerHTML = '<p style="color:var(--text2);font-size:0.85rem;">No images uploaded yet.</p>'; return; }
  gallery.innerHTML = files.map(f => `
    <div style="border:1px solid var(--border);border-radius:var(--radius);overflow:hidden;cursor:pointer;" onclick="copyUrl('${f.url}')">
      <img src="${f.url}" style="width:100%;height:100px;object-fit:cover;display:block;" />
      <div style="padding:6px 8px;font-size:0.7rem;color:var(--text2);overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">${f.name}</div>
    </div>`).join('');
}

window.copyUrl = (url) => {
  navigator.clipboard.writeText(location.origin + url).then(() => toast('URL copied!'));
};

// ── UI HELPERS ─────────────────────────────────────────────────────────
function field(label, path, value, type = 'text') {
  return `<div class="field-group"><label class="field-label">${label}</label><input class="field-input" type="${type}" data-field="${path}" value="${esc(value)}" /></div>`;
}

function textarea(label, path, value, rows = 3) {
  return `<div class="field-group"><label class="field-label">${label}</label><textarea class="field-textarea" rows="${rows}" data-field="${path}">${esc(value)}</textarea></div>`;
}

function colorField(label, path, value) {
  return `<div class="field-group"><label class="field-label">${label}</label><div class="field-color">
    <input type="color" class="color-preview" value="${value}" data-color-for="${path}" />
    <input type="text" class="color-text" data-field="${path}" value="${value}" />
  </div></div>`;
}

function imgUpload(path, url, type = 'card') {
  const hasImg = url && url.trim();
  return `<div class="image-upload-area ${hasImg ? 'has-image' : ''}" data-field="${path}" data-upload-type="${type}">
    ${hasImg ? `<img src="${url}" class="upload-preview ${type}" /><button class="upload-remove-btn" onclick="event.stopPropagation();removeImage('${path}',this)">✕</button>` : `<div class="upload-icon">📷</div><div class="upload-text">Click to upload image</div><div class="upload-hint">JPEG, PNG, WebP — max 10MB</div>`}
    <input type="file" accept="image/*" />
  </div>`;
}

function tagsEditor(path, tags) {
  return `<div class="tags-editor">
    <div class="tags-list">${tags.map((t,i) => `<span class="tag-pill">${t}<span class="tag-remove" data-path="${path}" data-idx="${i}">✕</span></span>`).join('')}</div>
    <div class="tag-input-row">
      <input class="tag-add-input" placeholder="Add tag…" data-tags-path="${path}" />
      <button class="btn btn-ghost btn-sm" onclick="addTag(this)">Add</button>
    </div>
  </div>`;
}

function saveBar(sectionKey) {
  return `<div class="section-save-bar"><span class="save-status" id="saveStatus-${sectionKey}"></span><button class="btn btn-success" onclick="saveSectionBtn('${sectionKey}')">💾 Save ${sectionKey.charAt(0).toUpperCase()+sectionKey.slice(1)}</button></div>`;
}

function esc(v) { return String(v ?? '').replace(/&/g,'&amp;').replace(/"/g,'&quot;').replace(/</g,'&lt;').replace(/>/g,'&gt;'); }

// ── Field binding ──────────────────────────────────────────────────────
function bindField(el) {
  const path = el.dataset.field;
  if (!path) return;
  el.addEventListener('input', () => {
    let v = el.type === 'number' ? parseFloat(el.value) : el.value;
    setPath(C, path, v);
    markDirty();
  });
}

function bindFields(container) { container.querySelectorAll('[data-field]').forEach(bindField); }

function bindToggle(el) {
  el.addEventListener('change', () => { setPath(C, el.dataset.field, el.checked); markDirty(); });
}
function bindToggles(container) { container.querySelectorAll('.toggle input').forEach(bindToggle); }

function bindColorFields(container) {
  container.querySelectorAll('[data-color-for]').forEach(picker => {
    picker.addEventListener('input', () => {
      const path = picker.dataset.colorFor;
      const textEl = container.querySelector(`[data-field="${path}"]`);
      if (textEl) textEl.value = picker.value;
      setPath(C, path, picker.value);
      markDirty();
    });
  });
  container.querySelectorAll('.color-text').forEach(txt => {
    txt.addEventListener('input', () => {
      const path = txt.dataset.field;
      const picker = container.querySelector(`[data-color-for="${path}"]`);
      if (picker) picker.value = txt.value;
      setPath(C, path, txt.value);
      markDirty();
    });
  });
}

function bindImages(container) { container.querySelectorAll('.image-upload-area').forEach(a => bindImageArea(a)); }

function bindImageArea(area) {
  if (area._bound) return;
  area._bound = true;
  area.addEventListener('click', e => { if (!e.target.classList.contains('upload-remove-btn')) area.querySelector('input[type=file]')?.click(); });
  area.addEventListener('dragover', e => { e.preventDefault(); area.style.borderColor = 'var(--blue)'; });
  area.addEventListener('dragleave', () => { area.style.borderColor = ''; });
  area.addEventListener('drop', e => { e.preventDefault(); area.style.borderColor = ''; const f = e.dataTransfer.files[0]; if (f) doUpload(area, f); });
  area.querySelector('input[type=file]')?.addEventListener('change', e => { if (e.target.files[0]) doUpload(area, e.target.files[0]); });
}

async function doUpload(area, file) {
  toast('Uploading…');
  const r = await api.upload(file);
  if (r.url) {
    const path = area.dataset.field;
    setPath(C, path, r.url);
    markDirty();
    area.classList.add('has-image');
    area.innerHTML = `<img src="${r.url}" class="upload-preview ${area.dataset.uploadType}" /><button class="upload-remove-btn" onclick="event.stopPropagation();removeImage('${path}',this)">✕</button><input type="file" accept="image/*" />`;
    area._bound = false;
    bindImageArea(area);
    toast('Image uploaded!', 'success');
  } else toast('Upload failed', 'error');
}

window.removeImage = (path, btn) => {
  setPath(C, path, null);
  markDirty();
  const area = btn.closest('.image-upload-area');
  area.classList.remove('has-image');
  area.innerHTML = `<div class="upload-icon">📷</div><div class="upload-text">Click to upload image</div><div class="upload-hint">JPEG, PNG, WebP — max 10MB</div><input type="file" accept="image/*" />`;
  area._bound = false;
  bindImageArea(area);
};

// ── Tags ───────────────────────────────────────────────────────────────
function initTagInput(inp) {
  inp.addEventListener('keydown', e => { if (e.key === 'Enter') { e.preventDefault(); addTagFromInput(inp); } });
}

window.addTag = (btn) => { const inp = btn.previousElementSibling; addTagFromInput(inp); };

function addTagFromInput(inp) {
  const path = inp.dataset.tagsPath;
  const val = inp.value.trim();
  if (!val) return;
  let arr = getPath(C, path);
  if (!Array.isArray(arr)) arr = [];
  arr.push(val);
  setPath(C, path, arr);
  inp.value = '';
  markDirty();
  const tagsEl = inp.closest('.tags-editor').querySelector('.tags-list');
  if (tagsEl) tagsEl.innerHTML = arr.map((t,i) => `<span class="tag-pill">${t}<span class="tag-remove" data-path="${path}" data-idx="${i}">✕</span></span>`).join('');
  tagsEl?.querySelectorAll('.tag-remove').forEach(el => el.addEventListener('click', removeTag));
}

document.addEventListener('click', e => {
  if (e.target.classList.contains('tag-remove')) removeTag.call(e.target);
});

function removeTag() {
  const path = this.dataset.path;
  const i = parseInt(this.dataset.idx);
  let arr = getPath(C, path);
  arr.splice(i, 1);
  setPath(C, path, arr);
  markDirty();
  this.closest('.tag-pill').remove();
  // Re-index remaining tags
  const list = this.closest('.tags-list');
  if (list) list.querySelectorAll('.tag-remove').forEach((el, j) => el.dataset.idx = j);
}

// ── Path helpers ───────────────────────────────────────────────────────
function getPath(obj, path) {
  return path.split('.').reduce((o, k) => (o && o[k] !== undefined ? o[k] : undefined), obj);
}

function setPath(obj, path, val) {
  const parts = path.split('.');
  let curr = obj;
  for (let i = 0; i < parts.length - 1; i++) {
    const k = parts[i];
    const next = parts[i + 1];
    if (curr[k] === undefined || curr[k] === null) curr[k] = isNaN(next) ? {} : [];
    curr = curr[k];
  }
  curr[parts[parts.length - 1]] = val;
}

// ── UI utilities ───────────────────────────────────────────────────────
function toggleItem(header) {
  header.parentElement.classList.toggle('expanded');
}

function switchTab(btn, tabId) {
  btn.closest('.tab-bar').querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
  btn.classList.add('active');
  const area = btn.closest('.section-head')?.nextElementSibling ?? document.getElementById('contentArea');
  document.querySelectorAll('.tab-content').forEach(t => t.classList.remove('active'));
  document.getElementById(tabId)?.classList.add('active');
}

async function saveSectionBtn(key) {
  const statusEl = document.getElementById('saveStatus-' + key);
  if (statusEl) { statusEl.textContent = 'Saving…'; statusEl.className = 'save-status'; }
  await saveSection(key);
  if (statusEl) { statusEl.textContent = '✓ Saved'; statusEl.className = 'save-status saved'; setTimeout(() => { if(statusEl) statusEl.textContent = ''; }, 3000); }
}

function toast(msg, type = 'success') {
  const container = document.getElementById('toastContainer');
  const t = document.createElement('div');
  t.className = `toast ${type}`;
  const icons = { success: '✅', error: '❌', info: 'ℹ️', warning: '⚠️' };
  t.innerHTML = `<span class="toast-icon">${icons[type]||'ℹ️'}</span><span>${msg}</span><span class="toast-close" onclick="this.parentElement.remove()">✕</span>`;
  container.appendChild(t);
  setTimeout(() => t.remove(), 4000);
}

function uid() { return Math.random().toString(36).slice(2, 9); }

// ── Init ───────────────────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
  document.getElementById('loginForm').addEventListener('submit', e => { e.preventDefault(); doLogin(); });
  document.getElementById('loginPw').addEventListener('keydown', e => { if (e.key === 'Enter') doLogin(); });
  document.querySelectorAll('.nav-item').forEach(item => {
    item.addEventListener('click', () => navigate(item.dataset.section));
  });
  checkAuth();
});

window.saveSectionBtn = saveSectionBtn;
window.saveAll = saveAll;
window.doLogout = doLogout;
window.navigate = navigate;
window.toggleItem = toggleItem;
window.switchTab = switchTab;
window.removeService = removeService;
window.removePortfolio = removePortfolio;
window.removeTestimonial = removeTestimonial;
window.addFeature = addFeature;
window.copyUrl = window.copyUrl;
