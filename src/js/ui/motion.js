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

  window.TAILAM = window.TAILAM || {};
  window.TAILAM.ui = window.TAILAM.ui || {};
  window.TAILAM.ui.motion = { animateLandingCounters, initFlowReveal, initSplash };
})();
