/**
 * TAILAM — ui/loading.js
 * Final Visual Design Sprint — the "engineering computation" loading
 * sequence shown for under a second when an analysis is run. This module
 * NEVER computes anything: it only staggers a fixed, static checklist of
 * method names (already-known constants, not read from any engine result)
 * through active/done CSS states, then invokes the caller's callback — the
 * real, unmodified analyzeMain()/analyzeOltc() from ui/dashboard.js — once
 * the animation finishes. If the #loading-overlay markup is missing for any
 * reason, the callback still runs immediately; the app is never blocked by
 * this purely decorative layer.
 *
 * Plain script — publishes on window.TAILAM.ui.loading.
 */
(function () {
  'use strict';

  const STEPS = ['iec', 'ieee', 'rogers', 'duval', 'keygas', 'thi'];
  const STEP_MS = 105; // 6 steps × 105ms ≈ 630ms, well under the 1s budget

  /**
   * Play the diagnostic-method checklist animation, then call onComplete().
   * @param {Function} onComplete - the real analysis function to run after
   */
  function runLoadingSequence(onComplete) {
    const overlay = document.getElementById('loading-overlay');
    const reduceMotion = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (!overlay || reduceMotion) { onComplete(); return; }

    const items = STEPS.map((s) => overlay.querySelector('[data-step="' + s + '"]'));
    items.forEach((el) => { if (el) el.classList.remove('active', 'done'); });
    overlay.classList.add('active');
    overlay.setAttribute('aria-hidden', 'false');

    STEPS.forEach((_, i) => {
      setTimeout(() => {
        if (i > 0 && items[i - 1]) { items[i - 1].classList.remove('active'); items[i - 1].classList.add('done'); }
        if (items[i]) items[i].classList.add('active');
      }, i * STEP_MS);
    });

    setTimeout(() => {
      const last = items[items.length - 1];
      if (last) { last.classList.remove('active'); last.classList.add('done'); }
      setTimeout(() => {
        overlay.classList.remove('active');
        overlay.setAttribute('aria-hidden', 'true');
        onComplete();
      }, 180);
    }, STEPS.length * STEP_MS);
  }

  window.TAILAM = window.TAILAM || {};
  window.TAILAM.ui = window.TAILAM.ui || {};
  window.TAILAM.ui.loading = { runLoadingSequence };
})();
