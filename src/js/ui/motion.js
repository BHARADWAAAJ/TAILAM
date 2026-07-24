/**
 * TAILAM — ui/motion.js
 * Final Visual Design Sprint — small, tasteful motion helpers that touch no
 * engineering value: animated landing-page statistic counters. Card/section
 * fade-ins are handled entirely in CSS (base.css .reveal-in) and need no JS.
 *
 * Plain script — publishes on window.TAILAM.ui.motion.
 */
(function () {
  'use strict';

  /**
   * Count every `[data-counter]` element from 0 up to its target value once,
   * on first call. Purely decorative — the numbers themselves (7 diagnostic
   * methods, 2 Duval triangles, etc.) are static product facts written in
   * index.html, not computed here.
   */
  function animateLandingCounters() {
    const els = document.querySelectorAll('[data-counter]');
    if (!els.length) return;
    const reduceMotion = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const DURATION = 900;
    els.forEach((el) => {
      const target = parseFloat(el.getAttribute('data-counter'));
      const suffix = el.getAttribute('data-counter-suffix') || '';
      if (Number.isNaN(target)) return;
      if (reduceMotion) { el.textContent = target + suffix; return; }
      const start = performance.now();
      function tick(now) {
        const p = Math.min(1, (now - start) / DURATION);
        const eased = 1 - Math.pow(1 - p, 3); // ease-out-cubic
        el.textContent = Math.round(target * eased) + suffix;
        if (p < 1) requestAnimationFrame(tick);
        else el.textContent = target + suffix; // land exactly on target
      }
      requestAnimationFrame(tick);
    });
  }

  /**
   * Scroll-flow reveal (flow.css): landing sections that start below the
   * fold get their existing .reveal-in animation paused (.flow-wait) until
   * they scroll into view, so the page "flows" in as you read it.
   * Progressive enhancement — without IntersectionObserver (or with JS off)
   * the original load-time reveal plays unchanged. Purely decorative.
   */
  function initFlowReveal() {
    if (!('IntersectionObserver' in window)) return;
    const reduceMotion = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (reduceMotion) return;
    const blocks = document.querySelectorAll('#view-landing .reveal-in');
    const io = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.remove('flow-wait');
          io.unobserve(entry.target);
        }
      });
    }, { threshold: 0.18 });
    blocks.forEach((el) => {
      // only pause blocks that start below the viewport; the hero plays at once
      if (el.getBoundingClientRect().top > window.innerHeight) {
        el.classList.add('flow-wait');
        io.observe(el);
      }
    });
  }

  /**
   * Opening splash screen (flow.css .splash): plays the logo draw-in intro
   * once per browser session, then removes itself from the DOM entirely.
   * Skippable by click or any key; skipped outright under reduced motion,
   * when sessionStorage is unavailable it simply plays on every load.
   * Purely decorative — the app underneath is fully initialised regardless.
   */
  function initSplash() {
    const el = document.getElementById('splash-screen');
    if (!el) return;
    const reduceMotion = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    let seen = false;
    try { seen = sessionStorage.getItem('tailam-splash') === '1'; } catch { /* private mode etc. */ }
    if (reduceMotion || seen) { el.remove(); return; }
    try { sessionStorage.setItem('tailam-splash', '1'); } catch { /* ignore */ }

    el.setAttribute('aria-hidden', 'false');
    let gone = false;
    function dismiss() {
      if (gone) return;
      gone = true;
      el.classList.add('splash-leave');
      window.removeEventListener('keydown', dismiss);
      setTimeout(() => el.remove(), 600);
    }
    el.addEventListener('click', dismiss);
    window.addEventListener('keydown', dismiss);
    setTimeout(dismiss, 3200); // auto-dismiss after the full sequence
  }

  /**
   * Interactive sensor nodes + engineering easter egg (branding phase).
   * The seven numbered .hero-node groups in the landing illustration each
   * describe one transformer component: hover/focus shows an educational
   * tooltip (#hero-tip, content from the node's data-tip attributes) and a
   * click marks the node visited (yellow, .hero-node-done). Once all seven
   * are visited, the "Engineering Mode Enabled" card (#hero-egg) fades in
   * over the illustration, lists the implemented standards, then fades back
   * out and the nodes reset. Tooltip facts are static, standard transformer
   * knowledge written in index.html — purely presentational, no engineering
   * value computed here.
   */
  function initEngineeringEgg() {
    const art = document.querySelector('.landing-hero-art');
    const egg = document.getElementById('hero-egg');
    const tip = document.getElementById('hero-tip');
    const nodes = art ? art.querySelectorAll('.hero-node') : [];
    if (!art || !nodes.length || !egg) return;
    const visited = new Set();
    let showing = false;

    // Session achievement: the ★ badge in the nav bar. Earned once per
    // browser session (sessionStorage, same mechanism as the splash);
    // restored silently on later page loads within the session.
    const ACHV_KEY = 'tailam-engineering-mode';
    function showAchievement(animate) {
      const star = document.getElementById('nav-achievement');
      if (!star) return;
      star.hidden = false;
      if (animate) star.classList.add('achv-pop');
    }
    try { if (sessionStorage.getItem(ACHV_KEY) === '1') showAchievement(false); } catch { /* private mode etc. */ }

    function showTip(node) {
      if (!tip) return;
      const title = node.getAttribute('data-tip-title') || '';
      const text = node.getAttribute('data-tip') || '';
      tip.textContent = '';
      const b = document.createElement('b');
      b.textContent = title;
      tip.appendChild(b);
      tip.appendChild(document.createTextNode(text));
      tip.hidden = false;
      // position near the node's hit circle, clamped inside the art box
      const artR = art.getBoundingClientRect();
      const hit = node.querySelector('.hero-node-hit') || node;
      const r = hit.getBoundingClientRect();
      const cx = r.left + r.width / 2 - artR.left;
      const w = tip.offsetWidth, h = tip.offsetHeight;
      const x = Math.max(6, Math.min(cx - w / 2, artR.width - w - 6));
      let y = r.top - artR.top - h - 10;
      if (y < 4) y = r.bottom - artR.top + 10;
      tip.style.left = x + 'px';
      tip.style.top = y + 'px';
    }
    function hideTip() { if (tip) tip.hidden = true; }

    /** Celebration: brand-coloured confetti burst over the illustration.
     *  Skipped entirely under prefers-reduced-motion. */
    function burstConfetti() {
      const reduceMotion = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
      if (reduceMotion) return;
      const colors = ['var(--accent)', 'var(--accent-2, var(--accent))', 'var(--yellow)', '#4c7cf0'];
      for (let i = 0; i < 36; i++) {
        const p = document.createElement('div');
        p.className = 'hero-confetti';
        const ang = Math.random() * Math.PI * 2;
        const dist = 90 + Math.random() * 160;
        p.style.setProperty('--dx', Math.cos(ang) * dist + 'px');
        p.style.setProperty('--dy', (Math.sin(ang) * dist * 0.8 + 70) + 'px'); // gravity bias downwards
        p.style.setProperty('--rot', Math.round(Math.random() * 540 - 270) + 'deg');
        p.style.background = colors[i % colors.length];
        p.style.width = p.style.height = (5 + Math.random() * 6).toFixed(1) + 'px';
        p.style.animationDelay = (Math.random() * 0.15).toFixed(2) + 's';
        art.appendChild(p);
        setTimeout(() => p.remove(), 2000);
      }
    }

    function visit(node) {
      if (showing) return;
      node.classList.add('hero-node-done');
      visited.add(node.getAttribute('data-node'));
      if (visited.size < nodes.length) return;
      showing = true;
      hideTip();
      burstConfetti();
      try { sessionStorage.setItem(ACHV_KEY, '1'); } catch { /* ignore */ }
      showAchievement(true);
      refreshDiscoveries();
      egg.hidden = false;
      // next frame so the opacity transition actually plays
      requestAnimationFrame(() => egg.classList.add('hero-egg-show'));
      setTimeout(() => {
        egg.classList.remove('hero-egg-show');
        setTimeout(() => {
          egg.hidden = true;
          nodes.forEach((n) => n.classList.remove('hero-node-done'));
          visited.clear();
          showing = false;
        }, 550); // matches the .5s fade in flow.css
      }, 6500);
    }

    nodes.forEach((node) => {
      node.addEventListener('mouseenter', () => showTip(node));
      node.addEventListener('mouseleave', hideTip);
      node.addEventListener('focus', () => showTip(node));
      node.addEventListener('blur', hideTip);
      node.addEventListener('click', () => visit(node));
      node.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); visit(node); }
      });
    });
  }

  /**
   * A small transient toast (bottom-centre) used to acknowledge an easter
   * egg firing. Auto-dismisses; purely presentational.
   */
  function showEggToast(icon, message, ms) {
    const t = document.createElement('div');
    t.className = 'egg-toast';
    t.setAttribute('role', 'status');
    const i = document.createElement('span');
    i.className = 'egg-toast-icon';
    i.textContent = icon;
    t.appendChild(i);
    t.appendChild(document.createTextNode(message));
    document.body.appendChild(t);
    setTimeout(() => {
      t.classList.add('egg-toast-out');
      setTimeout(() => t.remove(), 400);
    }, ms || 2600);
  }

  /**
   * The richer achievement toast shown when Founder's Edition is unlocked:
   *   🏆 Engineering Achievement / Founder's Edition Unlocked /
   *   Thank you for exploring TAILAM. / Only curious engineers discover this edition.
   */
  function showFounderAchievementToast() {
    const t = document.createElement('div');
    t.className = 'egg-toast egg-toast-rich';
    t.setAttribute('role', 'status');
    const icon = document.createElement('span');
    icon.className = 'egg-toast-icon';
    icon.textContent = '🏆';
    const body = document.createElement('div');
    body.className = 'egg-toast-body';
    const rows = [
      ['egg-toast-title', 'Engineering Achievement'],
      ['egg-toast-sub', "Founder's Edition Unlocked"],
      ['egg-toast-note', 'Thank you for exploring TAILAM.'],
      ['egg-toast-fine', 'Only curious engineers discover this edition.']
    ];
    rows.forEach(([cls, text]) => {
      const d = document.createElement('div');
      d.className = cls;
      d.textContent = text;
      body.appendChild(d);
    });
    t.appendChild(icon);
    t.appendChild(body);
    document.body.appendChild(t);
    setTimeout(() => {
      t.classList.add('egg-toast-out');
      setTimeout(() => t.remove(), 400);
    }, 4600);
  }

  /**
   * Reflect the two Engineering Discoveries in the About dialog list. A
   * discovery is shown as "✓ <name>" once its session flag is set, or "???"
   * while still hidden. Discovery status persists for the browser session and
   * — unlike Founder's Edition's active on/off state — is never cleared once
   * earned, so toggling the theme back off still reads as discovered.
   */
  function refreshDiscoveries() {
    const items = [
      ['discovery-engineering', 'tailam-engineering-mode', 'Engineering Mode'],
      ['discovery-founder', 'tailam-founder-discovered', "Founder's Edition"]
    ];
    items.forEach(([id, key, name]) => {
      const li = document.getElementById(id);
      if (!li) return;
      let unlocked = false;
      try { unlocked = sessionStorage.getItem(key) === '1'; } catch { /* ignore */ }
      li.classList.toggle('discovery-unlocked', unlocked);
      const icon = li.querySelector('.discovery-icon');
      const nm = li.querySelector('.discovery-name');
      if (icon) icon.textContent = unlocked ? '✓' : '???';
      if (nm) nm.textContent = name;
    });
  }

  /**
   * "Founder's Edition" — the second hidden discovery: a premium brand theme.
   * It is gated behind the first one: the user must have discovered
   * Engineering Mode (clicked all seven sensor nodes, which sets
   * sessionStorage 'tailam-engineering-mode'). Only then does interacting with
   * the header logo unlock Founder's Edition:
   *   • Option A — seven quick clicks on the logo, or
   *   • Option B — Shift + double-click the logo (quick toggle back).
   * Either one flips the brand accent from Teal to Gold (and back). The active
   * state persists for the browser session ('tailam-gold-mode') and is
   * restored on later loads; a separate 'tailam-founder-discovered' flag
   * records that the edition was found (so the About list stays ✓ even when
   * the theme is toggled back off). A new browser session returns to Teal.
   *
   * Re-skins the ACCENT tokens only (see variables.css .theme-gold) — the
   * health/status, fault-type, Duval, risk and confidence colours are all
   * untouched, so nothing about the diagnosis, thresholds or engineering
   * meaning changes. Presentation only. No typed keyword is involved.
   */
  function initGoldEasterEgg() {
    const ENG_KEY = 'tailam-engineering-mode';
    const ACTIVE_KEY = 'tailam-gold-mode';       // theme currently on/off
    const FOUND_KEY = 'tailam-founder-discovered'; // ever discovered this session
    const CLICKS_NEEDED = 7;
    const CLICK_WINDOW = 900; // ms max gap between counted clicks
    const root = document.documentElement;

    function engineeringUnlocked() {
      try { return sessionStorage.getItem(ENG_KEY) === '1'; } catch { return false; }
    }
    function applyFounder(on, animate) {
      if (animate) {
        root.classList.add('theme-switching');
        setTimeout(() => root.classList.remove('theme-switching'), 700);
      }
      root.classList.toggle('theme-gold', on);
      try { sessionStorage.setItem(ACTIVE_KEY, on ? '1' : '0'); } catch { /* private mode */ }
    }
    function toggleFounder() {
      const on = !root.classList.contains('theme-gold');
      applyFounder(on, true);
      if (on) {
        try { sessionStorage.setItem(FOUND_KEY, '1'); } catch { /* ignore */ }
        showFounderAchievementToast();
      } else {
        showEggToast('🌊', 'Standard theme restored');
      }
      refreshDiscoveries();
    }

    // restore session state silently (no toast, no transition)
    try {
      if (sessionStorage.getItem(ACTIVE_KEY) === '1') {
        applyFounder(true, false);
        sessionStorage.setItem(FOUND_KEY, '1'); // active implies discovered
      }
    } catch { /* private mode */ }
    refreshDiscoveries();

    const logo = document.querySelector('.nav-logo') || document.getElementById('nav-brand');
    if (!logo) return;

    // Option A — seven quick clicks on the logo (after Engineering Mode).
    // We do not stop propagation, so the logo's normal "go home" behaviour is
    // untouched; on the landing page (where the egg is discovered) that click
    // is a no-op, so the count accumulates cleanly.
    let clicks = 0, timer = null;
    logo.addEventListener('click', () => {
      if (!engineeringUnlocked()) return;
      clicks++;
      clearTimeout(timer);
      timer = setTimeout(() => { clicks = 0; }, CLICK_WINDOW);
      if (clicks >= CLICKS_NEEDED) {
        clicks = 0;
        clearTimeout(timer);
        toggleFounder();
      }
    });

    // Option B — Shift + double-click for a quick toggle.
    logo.addEventListener('dblclick', (e) => {
      if (!e.shiftKey || !engineeringUnlocked()) return;
      e.preventDefault();
      toggleFounder();
    });
  }

  window.TAILAM = window.TAILAM || {};
  window.TAILAM.ui = window.TAILAM.ui || {};
  window.TAILAM.ui.motion = { animateLandingCounters, initFlowReveal, initSplash, initEngineeringEgg, initGoldEasterEgg };
})();
