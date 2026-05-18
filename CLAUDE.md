# Portfolio CMS — CLAUDE.md

This is a **META Ads / Ecommerce marketer portfolio site** with a built-in Node.js admin CMS. The portfolio is fully editable through an admin dashboard without touching any code.

---

## Stack

| Layer | Technology |
|---|---|
| Portfolio frontend | Pure HTML + CSS + Vanilla JS |
| CMS backend | Node.js + Express |
| Database | `data/content.json` (single JSON file) |
| Image uploads | Multer → `data/uploads/` |
| Auth | UUID session tokens, stored in `data/sessions.json` |
| Config | `.env` file (password + port) |

---

## How to Run

```powershell
# Install dependencies (first time only)
npm install

# Start the server
node server.js
```

- Portfolio: `http://localhost:3000`
- Admin dashboard: `http://localhost:3000/admin`
- Default password: `admin123` (set in `.env` as `ADMIN_PASSWORD`)

---

## File Structure

```
Portfolio Site/
├── server.js              # Express server — all API routes + static serving
├── package.json           # Dependencies: express, multer, uuid, dotenv
├── .env                   # ADMIN_PASSWORD and PORT
├── SETUP.md               # End-user setup instructions
│
├── index.html             # Homepage
├── services.html          # Services page
├── portfolio.html         # Portfolio/results page
├── about.html             # About page
├── contact.html           # Contact page
├── case-study.html        # Case study detail page
│
├── css/
│   ├── style.css          # Main styles, CSS variables, all components
│   └── animations.css     # Page loader, scroll animations, transitions
│
├── js/
│   ├── main.js            # Portfolio interactivity (navbar, cursor, counters)
│   └── content-loader.js  # Fetches /api/content and applies CMS data to DOM
│
├── data/
│   ├── content.json       # All editable content (single source of truth)
│   ├── sessions.json      # Active admin sessions (auto-managed)
│   └── uploads/           # User-uploaded images (served at /uploads/)
│
└── admin/
    ├── index.html         # Admin SPA (single HTML file)
    ├── css/admin.css      # Admin dashboard styles
    └── js/admin.js        # Admin dashboard logic (all sections)
```

---

## API Routes

| Method | Route | Auth | Purpose |
|---|---|---|---|
| POST | `/api/auth/login` | No | Login with password, returns token |
| POST | `/api/auth/logout` | Yes | Invalidate session token |
| GET | `/api/auth/check` | No | Validate token |
| POST | `/api/auth/change-password` | Yes | Update password in `.env` |
| GET | `/api/content` | No | Get all CMS content (used by portfolio pages) |
| PUT | `/api/content` | Yes | Save entire content object |
| PATCH | `/api/content/:section` | Yes | Save one section (e.g. `hero`, `services`) |
| POST | `/api/upload` | Yes | Upload an image file |
| DELETE | `/api/upload/:filename` | Yes | Delete an uploaded image |
| GET | `/api/uploads` | Yes | List all uploaded images |

---

## CMS Content System

`content.json` holds all content in named sections. Portfolio pages fetch `/api/content` on load via `js/content-loader.js` and apply values to the DOM using `data-cms` attributes.

**Single value binding:**
```html
<span data-cms="site.name"></span>
<h1 data-cms="hero.titleLine1"></h1>
```

**List rendering:**
```html
<div data-cms-list="services"></div>
```

If the server is not running, pages display their original static HTML — no broken page.

---

## Admin Dashboard Sections

| Section | What's Editable |
|---|---|
| Dashboard | Overview stats, quick info |
| Site Settings | Name, initials, tagline, colors, social links, availability, contact info |
| Images | Upload logo, profile photo, portfolio thumbnails; image library |
| Hero Section | Headlines (3 lines), description, CTA buttons, 4 stats, dashboard metrics |
| Services | Add / edit / delete service cards with tags |
| Testimonials | Add / edit / delete client reviews |
| Process Steps | 4-step process section |
| Portfolio | Add / edit / delete portfolio items with metrics |
| Pricing Plans | 3 plans — features, price, featured toggle |
| About Page | Bio, skills, timeline, values, tools list, certifications |
| Contact Info | Email, phone, location, response time, page text |
| Case Study | All case study metrics and content blocks |

---

## Progress — What's Done

- [x] All 6 portfolio pages built (index, services, portfolio, about, contact, case-study)
- [x] Dark theme design system with CSS variables and glass-morphism style
- [x] Animations: page loader, scroll reveal, custom cursor, counter animations
- [x] Responsive layout for all pages (mobile hamburger nav included)
- [x] Node.js/Express backend with full REST API
- [x] Session-based admin auth (UUID tokens, 7-day expiry)
- [x] `content.json` as a flat-file database for all content
- [x] `content-loader.js` — dynamic CMS injection into portfolio pages
- [x] Admin SPA with sidebar navigation (12 sections)
- [x] Image upload system (Multer, 10MB limit, JPEG/PNG/GIF/WebP/SVG)
- [x] Admin: change password from the UI (writes to `.env`)
- [x] Static fallback — pages work without the server running
- [x] SETUP.md for end-user onboarding

## Progress — Possible Next Steps

- [ ] Deploy to a live server (VPS, Railway, Render, etc.)
- [ ] Change placeholder name "Alex Morgan" → real name in `data/content.json`
- [ ] Update social links, email, phone in Site Settings
- [ ] Upload real profile photo and logo via the Images section
- [ ] Replace placeholder portfolio items and metrics with real results
- [ ] Update `.env` — change `ADMIN_PASSWORD` from `admin123` to something secure
- [ ] Add SEO meta tags dynamically from CMS content
- [ ] Optional: set up `pm2` to keep the server running on reboot (`pm2 start server.js`)

---

## Important Notes

- **Never commit `.env`** — it contains the admin password.
- **`data/sessions.json`** and **`data/uploads/`** are runtime-generated; don't delete them while the server is running.
- Changing the password via the admin UI updates `.env` but requires a **server restart** to take effect.
- All content edits in the admin are saved immediately to `content.json` — there is no staging or undo.
