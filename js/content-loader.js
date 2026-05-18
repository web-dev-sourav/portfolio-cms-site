/* Content Loader — applies CMS content to portfolio pages */
(async function () {
  try {
    const res = await fetch('/api/content');
    if (!res.ok) return;
    const C = await res.json();
    apply(C);
  } catch (_) { /* server not running — static content stays */ }

  function apply(C) {
    const s = C.site || {};
    const h = C.hero || {};

    // ── Helper: set text/html safely ────────────────────────────────
    const setText  = (sel, val) => { if (val == null) return; document.querySelectorAll(sel).forEach(el => el.textContent = val); };
    const setHTML  = (sel, val) => { if (val == null) return; document.querySelectorAll(sel).forEach(el => el.innerHTML = val); };
    const setAttr  = (sel, attr, val) => { if (val == null) return; document.querySelectorAll(sel).forEach(el => el.setAttribute(attr, val)); };
    const setStyle = (sel, prop, val) => { if (val == null) return; document.querySelectorAll(sel).forEach(el => el.style[prop] = val); };

    // ── CSS variable injection ──────────────────────────────────────
    if (s.primaryColor)   document.documentElement.style.setProperty('--primary', s.primaryColor);
    if (s.secondaryColor) document.documentElement.style.setProperty('--secondary', s.secondaryColor);
    if (s.accentColor)    document.documentElement.style.setProperty('--accent', s.accentColor);

    // ── Site-wide ───────────────────────────────────────────────────
    const name = s.name || 'Alex Morgan';
    setText('[data-cms="site.name"]', name);
    setText('[data-cms="site.email"]', s.email);
    setText('[data-cms="site.phone"]', s.phone);
    setText('[data-cms="site.location"]', s.location);
    setText('[data-cms="site.locationNote"]', s.locationNote);
    setText('[data-cms="site.responseTime"]', s.responseTime);
    setText('[data-cms="site.copyrightText"]', s.copyrightText);
    setText('[data-cms="site.footerTagline"]', s.footerTagline);

    // Page loader logo
    const initials = s.initials || 'AM';
    document.querySelectorAll('.loader-logo').forEach(el => {
      el.textContent = initials + '.';
    });

    // Nav logo — image or initials
    document.querySelectorAll('.nav-logo').forEach(el => {
      if (s.logoImage) {
        el.innerHTML = `<img src="${s.logoImage}" style="height:32px;vertical-align:middle;" alt="${name}" />`;
      } else {
        el.innerHTML = initials + '<span>.</span>';
      }
    });

    // Footer logo (full name)
    document.querySelectorAll('.footer-logo').forEach(el => {
      el.textContent = name + '.';
    });

    // Hero dashboard card avatar — photo if uploaded, else initials
    document.querySelectorAll('.card-avatar').forEach(el => {
      if (s.profileImage) {
        el.innerHTML = `<img src="${s.profileImage}" style="width:100%;height:100%;object-fit:cover;border-radius:50%;" alt="${name}" />`;
      } else {
        el.textContent = initials;
      }
    });

    // About page photo card — photo if uploaded, else keeps emoji
    document.querySelectorAll('.about-image-card').forEach(el => {
      if (s.profileImage) {
        el.innerHTML = `<img src="${s.profileImage}" style="width:100%;height:100%;object-fit:cover;" alt="${name}" />`;
      }
    });

    // Availability badge
    document.querySelectorAll('.hero-badge .badge-text').forEach(el => {
      el.textContent = s.availabilityText || 'Available for New Clients';
    });
    document.querySelectorAll('.hero-badge .dot').forEach(dot => {
      dot.style.background = s.availability ? '#22C55E' : '#EF4444';
    });

    // Social links
    if (s.social) {
      setAttr('[data-cms="social.linkedin"]', 'href', s.social.linkedin);
      setAttr('[data-cms="social.twitter"]', 'href', s.social.twitter);
      setAttr('[data-cms="social.instagram"]', 'href', s.social.instagram);
      setAttr('[data-cms="social.youtube"]', 'href', s.social.youtube);
    }

    // ── Hero Section ─────────────────────────────────────────────────
    if (h.badgeText)   setText('[data-cms="hero.badge"]', h.badgeText);
    if (h.titleLine1)  setText('[data-cms="hero.title1"]', h.titleLine1);
    if (h.titleLine2)  setText('[data-cms="hero.title2"]', h.titleLine2);
    if (h.titleLine3)  setText('[data-cms="hero.title3"]', h.titleLine3);
    if (h.description) setText('[data-cms="hero.description"]', h.description);

    // Hero CTA buttons
    document.querySelectorAll('[data-cms="hero.cta1"]').forEach(el => {
      el.textContent = h.cta1Text || el.textContent;
      el.href = h.cta1Link || el.href;
    });
    document.querySelectorAll('[data-cms="hero.cta2"]').forEach(el => {
      el.textContent = h.cta2Text || el.textContent;
      el.href = h.cta2Link || el.href;
    });

    // Hero stats
    if (h.stats) {
      h.stats.forEach((stat, i) => {
        const el = document.querySelector(`[data-cms="hero.stat.${i}.value"]`);
        if (el) {
          el.dataset.target = stat.value;
          el.dataset.suffix = stat.suffix;
          el.textContent = (stat.prefix || '') + stat.value + stat.suffix;
        }
        setText(`[data-cms="hero.stat.${i}.label"]`, stat.label);
      });
    }

    // Dashboard card metrics
    if (h.dashboardMetrics) {
      h.dashboardMetrics.forEach((m, i) => {
        setText(`[data-cms="dash.metric.${i}.label"]`, m.label);
        setText(`[data-cms="dash.metric.${i}.value"]`, m.value);
      });
    }

    // Profile image
    if (s.profileImage) {
      document.querySelectorAll('[data-cms="site.profileImage"]').forEach(el => {
        if (el.tagName === 'IMG') el.src = s.profileImage;
        else el.style.backgroundImage = `url(${s.profileImage})`;
      });
    }

    // ── Contact info ─────────────────────────────────────────────────
    if (C.contact) {
      const cc = C.contact;
      setText('[data-cms="contact.email"]', cc.email);
      setAttr('[data-cms="contact.emailLink"]', 'href', 'mailto:' + cc.email);
      setText('[data-cms="contact.phone"]', cc.phone);
      setText('[data-cms="contact.location"]', cc.location);
      setText('[data-cms="contact.locationNote"]', cc.locationNote);
      setText('[data-cms="contact.responseTime"]', cc.responseTime);
      setText('[data-cms="contact.heroTitle"]', cc.heroTitle);
      setText('[data-cms="contact.heroSubtitle"]', cc.heroSubtitle);
    }

    // ── Services (homepage preview) ──────────────────────────────────
    const servicesContainer = document.querySelector('[data-cms-list="services"]');
    if (servicesContainer && C.services) {
      servicesContainer.innerHTML = C.services.map(svc => `
        <div class="service-card">
          <div class="service-icon ${svc.iconColor}">${svc.icon}</div>
          <div class="service-name">${svc.name}</div>
          <div class="service-desc">${svc.description}</div>
          <div class="service-features">${(svc.tags||[]).map(t=>`<span class="service-tag">${t}</span>`).join('')}</div>
        </div>`).join('');
    }

    // ── Portfolio cards ──────────────────────────────────────────────
    const portfolioContainer = document.querySelector('[data-cms-list="portfolio"]');
    if (portfolioContainer && C.portfolio) {
      portfolioContainer.innerHTML = C.portfolio.map(p => `
        <div class="portfolio-card" data-category="${(p.category||'').toLowerCase().replace(/[^a-z]/g,'')}">
          <div class="portfolio-thumb">
            <div class="portfolio-thumb-bg ${p.thumbClass}">
              ${p.thumbImage ? `<img src="${p.thumbImage}" style="width:100%;height:100%;object-fit:cover;" />` : p.thumbEmoji}
            </div>
            <div class="portfolio-thumb-overlay">
              <a href="${p.link||'case-study.html'}" class="view-btn">View Case Study →</a>
            </div>
          </div>
          <div class="portfolio-info">
            <div class="portfolio-category">${p.category}</div>
            <div class="portfolio-title">${p.title}</div>
            <div class="portfolio-desc">${p.description}</div>
            <div class="portfolio-metrics">
              ${(p.metrics||[]).map(m=>`<div class="p-metric"><div class="pm-value">${m.value}</div><div class="pm-label">${m.label}</div></div>`).join('')}
            </div>
          </div>
        </div>`).join('');
    }

    // ── Testimonials ─────────────────────────────────────────────────
    const testimonialsContainer = document.querySelector('[data-cms-list="testimonials"]');
    if (testimonialsContainer && C.testimonials) {
      testimonialsContainer.innerHTML = C.testimonials.map(t => `
        <div class="testimonial-card">
          <div class="stars">${'★'.repeat(t.stars||5)}</div>
          <div class="quote-mark">"</div>
          <p class="testimonial-text">${t.text}</p>
          <div class="testimonial-author">
            <div class="author-avatar" style="background:${t.avatarGradient||'var(--gradient-1)'};">${t.initials||'??'}</div>
            <div>
              <div class="author-name">${t.name}</div>
              <div class="author-role">${t.role}</div>
            </div>
          </div>
        </div>`).join('');
    }

    // ── Result stats ─────────────────────────────────────────────────
    const resultsContainer = document.querySelector('[data-cms-list="results"]');
    if (resultsContainer && C.results) {
      C.results.forEach((r, i) => {
        const el = resultsContainer.querySelectorAll('.result-big-box')[i];
        if (el) {
          const numEl = el.querySelector('.result-big-num');
          if (numEl) numEl.textContent = r.value;
          const labelEl = el.querySelector('.result-big-label');
          if (labelEl) labelEl.textContent = r.label;
        }
      });
    }

    // ── Case study metrics ───────────────────────────────────────────
    if (C.caseStudy) {
      const cs = C.caseStudy;
      setText('[data-cms="cs.clientName"]', cs.clientName);
      setText('[data-cms="cs.industry"]', cs.industry);
      setText('[data-cms="cs.duration"]', cs.duration);
      setText('[data-cms="cs.adSpend"]', cs.adSpend);
      setText('[data-cms="cs.platform"]', cs.platform);
      setText('[data-cms="cs.headline"]', cs.headline);
      setText('[data-cms="cs.challenge"]', cs.challenge);
      setText('[data-cms="cs.clientQuote"]', cs.clientQuote);
      setText('[data-cms="cs.clientQuoteAuthor"]', cs.clientQuoteAuthor);
      if (cs.before) {
        setText('[data-cms="cs.before.roas"]', cs.before.roas);
        setText('[data-cms="cs.before.revenue"]', cs.before.revenue);
        setText('[data-cms="cs.before.cpa"]', cs.before.cpa);
        setText('[data-cms="cs.before.ctr"]', cs.before.ctr);
        setText('[data-cms="cs.after.roas"]', cs.after.roas);
        setText('[data-cms="cs.after.revenue"]', cs.after.revenue);
        setText('[data-cms="cs.after.cpa"]', cs.after.cpa);
        setText('[data-cms="cs.after.ctr"]', cs.after.ctr);
      }
    }

    // ── About page ───────────────────────────────────────────────────
    if (C.about) {
      const a = C.about;
      setText('[data-cms="about.headline"]', a.headline);
      // Bio paragraphs
      const bioContainer = document.querySelector('[data-cms-list="about.bio"]');
      if (bioContainer && a.bio) {
        bioContainer.innerHTML = a.bio.map(p => `<p class="about-desc">${p}</p>`).join('');
      }
      // Skills
      const skillsContainer = document.querySelector('[data-cms-list="about.skills"]');
      if (skillsContainer && a.skills) {
        skillsContainer.innerHTML = a.skills.map(sk => `
          <div class="skill-item">
            <div class="skill-header"><span>${sk.name}</span><span>${sk.percentage}%</span></div>
            <div class="skill-bar"><div class="skill-fill" data-width="${sk.percentage}%"></div></div>
          </div>`).join('');
      }
      // Timeline
      const timelineContainer = document.querySelector('[data-cms-list="about.timeline"]');
      if (timelineContainer && a.timeline) {
        timelineContainer.innerHTML = a.timeline.map(t => `
          <div class="timeline-item">
            <div class="timeline-dot"></div>
            <div class="timeline-year">${t.year}</div>
            <div class="timeline-title">${t.title}</div>
            <div class="timeline-desc">${t.description}</div>
          </div>`).join('');
      }
      // Values
      const valuesContainer = document.querySelector('[data-cms-list="about.values"]');
      if (valuesContainer && a.values) {
        valuesContainer.innerHTML = a.values.map(v => `
          <div class="value-card">
            <div class="value-icon">${v.icon}</div>
            <div class="value-title">${v.title}</div>
            <div class="value-desc">${v.description}</div>
          </div>`).join('');
      }
      // Tools
      const toolsContainer = document.querySelector('[data-cms-list="about.tools"]');
      if (toolsContainer && a.tools) {
        toolsContainer.innerHTML = a.tools.map(t => `<div class="tool-chip">${t}</div>`).join('');
      }
      // Certs
      const certsContainer = document.querySelector('[data-cms-list="about.certifications"]');
      if (certsContainer && a.certifications) {
        certsContainer.innerHTML = a.certifications.map(c => `
          <div class="cert-card">
            <div class="cert-icon">${c.icon}</div>
            <div class="cert-name">${c.name}</div>
            <div class="cert-org">${c.org}</div>
          </div>`).join('');
      }
    }

    // ── Pricing ──────────────────────────────────────────────────────
    const pricingContainer = document.querySelector('[data-cms-list="pricing"]');
    if (pricingContainer && C.pricing) {
      pricingContainer.innerHTML = C.pricing.map(pl => `
        <div class="pricing-card ${pl.featured ? 'featured' : ''}">
          <div class="pricing-name ${pl.featured ? '' : ''}">${pl.name}</div>
          <div class="pricing-price ${pl.featured ? 'style="background:var(--gradient-1);-webkit-background-clip:text;-webkit-text-fill-color:transparent;"' : ''}">$${pl.price}<sub>/mo</sub></div>
          <div class="pricing-period">${pl.period}</div>
          <ul class="pricing-features">
            ${(pl.features||[]).map(f=>`<li><span class="${f.included?'check':'cross'}">${f.included?'✓':'–'}</span>${f.text}</li>`).join('')}
          </ul>
          <a href="contact.html" class="${pl.featured?'btn-primary':'btn-secondary'}" style="display:block;text-align:center;padding:12px;border-radius:50px;font-weight:700;">${pl.ctaText}</a>
        </div>`).join('');
    }

    // ── Process steps ────────────────────────────────────────────────
    const processContainer = document.querySelector('[data-cms-list="process"]');
    if (processContainer && C.process) {
      processContainer.innerHTML = C.process.map(p => `
        <div class="step-card reveal">
          <div class="step-number">${p.step}</div>
          <div class="step-title">${p.title}</div>
          <div class="step-desc">${p.description}</div>
        </div>`).join('');
    }

    console.log('[CMS] Content loaded successfully');
  }
})();
