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

  window.TAILAM = window.TAILAM || {};
  window.TAILAM.ui = window.TAILAM.ui || {};
  window.TAILAM.ui.motion = { animateLandingCounters };
})();
