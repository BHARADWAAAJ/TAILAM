/**
 * TAILAM — app.js
 * Application entry point: wires DOM events to the UI layer, registers the
 * cross-module callbacks and runs first-load initialisation. No inline
 * JavaScript remains in index.html.
 *
 * Plain script — the last one loaded. Reads every other module off
 * window.TAILAM.* (no ES module imports, so this file runs unmodified from
 * file:// as well as from a real HTTP origin such as GitHub Pages).
 */
(function () {
  'use strict';

  const { initTheme, toggleTheme, registerThemeRedraw } = window.TAILAM.theme;
  const { switchTab, showLanding, getActiveView, registerOltcShownCallback } = window.TAILAM.navigation;
  const { analyzeMain, clearMain, analyzeOltc, clearOltc, renderMainTank, renderOltc,
           getMtReport, getOtReport, isMainDirty, isOltcDirty, syncCrossContamDefaults } = window.TAILAM.ui.dashboard;
  const { exportPDF, exportExcelX } = window.TAILAM.ui.export;
  const { openAbout, closeAbout, openHelp, closeHelp, initDismissableModals,
           openUnsavedDialog, closeUnsavedDialog, confirmUnsavedExportPDF,
           confirmUnsavedExportExcel, confirmUnsavedDiscard } = window.TAILAM.ui.modals;
  const { openDuvalModal, closeDuvalModal } = window.TAILAM.ui.workspace;
  const { openFeedback, closeFeedback, submitFeedback, initFeedback } = window.TAILAM.ui.feedback;
  const { runLoadingSequence } = window.TAILAM.ui.loading;
  const { animateLandingCounters, initFlowReveal, initSplash } = window.TAILAM.ui.motion;

  /** Bind a click handler by element id. */
  function on(id, handler) {
    const el = document.getElementById(id);
    if (el) el.addEventListener('click', handler);
  }

  /**
   * Go straight to a view (no dirty-state check). The one place that touches
   * navigation.js's view functions, so the guard below has a single target.
   * @param {'landing'|'main'|'oltc'} target
   */
  function goTo(target) {
    if (target === 'landing') showLanding(); else switchTab(target);
  }

  /**
   * Module-isolation guard (Task 4): if the currently active workspace has an
   * analysis that hasn't been exported yet, block the switch and ask the user
   * to export, discard, or cancel instead of silently losing their work.
   * @param {'landing'|'main'|'oltc'} target
   */
  function requestNavigate(target) {
    const active = getActiveView();
    if (active === target) return;
    const dirty = (active === 'main' && isMainDirty()) || (active === 'oltc' && isOltcDirty());
    if (!dirty) { goTo(target); return; }
    openUnsavedDialog(active, target, {
      exportPDF,
      exportExcelX,
      discard: (tab) => { if (tab === 'main') clearMain(); else clearOltc(); },
      navigate: goTo
    });
  }

  // ── Cross-module callbacks (avoid circular imports) ──
  registerThemeRedraw(() => {
    const mt = getMtReport(); if (mt) renderMainTank(mt);
    const ot = getOtReport(); if (ot) renderOltc(ot);
  });
  registerOltcShownCallback(syncCrossContamDefaults);

  // ── Event wiring (replaces the former inline onclick attributes) ──
  on('nav-brand',           () => requestNavigate('landing'));
  on('nav-home',             () => requestNavigate('landing'));
  on('crumb-home-main',      () => requestNavigate('landing'));
  on('crumb-home-oltc',      () => requestNavigate('landing'));
  on('nav-main',             () => requestNavigate('main'));
  on('nav-oltc',             () => requestNavigate('oltc'));
  on('nav-help',             openHelp);
  on('nav-about',            openAbout);
  on('nav-feedback',         openFeedback);
  on('footer-feedback',      openFeedback);
  on('modal-feedback-close', closeFeedback);
  on('fb-send',              submitFeedback);
  on('fb-cancel',            closeFeedback);
  on('modal-help-close',     closeHelp);
  on('modal-about-close',    closeAbout);
  on('landing-btn-main',     () => requestNavigate('main'));
  on('landing-btn-oltc',     () => requestNavigate('oltc'));
  on('landing-cta-main',     () => requestNavigate('main'));
  on('landing-cta-oltc',     () => requestNavigate('oltc'));
  on('theme-btn',            toggleTheme);
  // Design sprint — the loading sequence is purely a presentational delay;
  // it calls the SAME unmodified analyzeMain()/analyzeOltc() when done, so
  // every computed value is identical to a direct call.
  on('btn-analyze-main',     () => runLoadingSequence(analyzeMain));
  on('btn-clear-main',       clearMain);
  // Design sprint — empty-state CTA: focuses the first gas-value input
  // instead of performing any action itself (presentation only).
  on('empty-cta-main',       () => { const el = document.getElementById('g-h2'); if (el) { el.scrollIntoView({ behavior:'smooth', block:'center' }); el.focus(); } });
  on('empty-cta-oltc',       () => { const el = document.getElementById('ot-h2'); if (el) { el.scrollIntoView({ behavior:'smooth', block:'center' }); el.focus(); } });
  on('btn-export-main-pdf',  () => exportPDF('main'));
  on('btn-export-main-xlsx', () => exportExcelX('main'));
  on('btn-new-main',         () => { clearMain(); const p = document.getElementById('panel-main'); if (p) p.scrollIntoView({ behavior:'smooth' }); });
  on('btn-analyze-oltc',     () => runLoadingSequence(analyzeOltc));
  on('btn-clear-oltc',       clearOltc);
  on('btn-export-oltc-pdf',  () => exportPDF('oltc'));
  on('btn-export-oltc-xlsx', () => exportExcelX('oltc'));
  on('btn-new-oltc',         () => { clearOltc(); const p = document.getElementById('panel-oltc'); if (p) p.scrollIntoView({ behavior:'smooth' }); });
  on('unsaved-export-pdf',   confirmUnsavedExportPDF);
  on('unsaved-export-xlsx',  confirmUnsavedExportExcel);
  on('unsaved-discard',      confirmUnsavedDiscard);
  on('unsaved-cancel',       closeUnsavedDialog);

  // Duval Triangle hero → detail modal (click or keyboard activate)
  on('duval-svg-main', () => openDuvalModal('main'));
  on('duval-svg-oltc', () => openDuvalModal('oltc'));
  on('modal-duval-close',     closeDuvalModal);
  on('duval-modal-close-btn', closeDuvalModal);
  ['duval-svg-main', 'duval-svg-oltc'].forEach((id) => {
    const el = document.getElementById(id);
    if (el) el.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); openDuvalModal(id === 'duval-svg-main' ? 'main' : 'oltc'); }
    });
  });

  // ── Primary Diagnosis <details> — explicit keyboard support + ARIA sync ──
  // No role="button" is set on the <summary> — deliberately. The HTML-ARIA
  // spec once allowed it as an IE11-polyfill accommodation but later removed
  // that allowance (w3c/html-aria#85 / PR #213); TAILAM doesn't support IE.
  // Worse, an explicit role="button" is actively harmful in one of TAILAM's
  // three officially supported browsers: macOS Safari + VoiceOver then
  // treats <summary> as a plain button and drops the expanded/collapsed
  // state announcement entirely. The native implicit semantics (whatever a
  // given engine exposes) are left alone; what this function adds is purely
  // behavioral — Enter/Space activation, since native keyboard support for
  // <summary> is documented as inconsistent across engines — and the
  // aria-expanded sync, which the same spec discussion endorses keeping in
  // sync with the `open` attribute (that part is not the harmful bit).
  // aria-expanded stays synced via the `toggle` event, which also fires for
  // the programmatic auto-expand dashboard.js performs after each analysis,
  // so no separate sync call is needed there. Presentation/accessibility
  // only — no engineering value involved.
  function wirePrimaryDiagnosisToggle(detailsId) {
    const details = document.getElementById(detailsId);
    const summary = details && details.querySelector(':scope > summary');
    if (!details || !summary) return;
    const syncAria = () => summary.setAttribute('aria-expanded', String(details.open));
    syncAria();
    details.addEventListener('toggle', syncAria);
    summary.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); details.open = !details.open; }
    });
  }
  wirePrimaryDiagnosisToggle('primary-diagnosis-main');
  wirePrimaryDiagnosisToggle('primary-diagnosis-oltc');

  // ── "Show Detailed Calculations" toggle ──
  // Pure visibility control: shows/hides the whole pre-rendered detailed-
  // calculations card (heading included, so the professional view never
  // shows an empty heading) for whichever panel it belongs to. Content is
  // populated separately by ui/detailed-calcs.js. No engineering value is
  // computed or altered here. Defaults to OFF and is never persisted —
  // every new session/reload starts unchecked, per spec.
  function wireDetailedToggle(toggleId, sectionId) {
    const toggle = document.getElementById(toggleId);
    const section = document.getElementById(sectionId);
    if (!toggle || !section) return;
    toggle.checked = false;
    section.hidden = true;
    toggle.addEventListener('change', () => { section.hidden = !toggle.checked; });
  }
  wireDetailedToggle('toggle-detailed-main', 'detailed-main-section');
  wireDetailedToggle('toggle-detailed-oltc', 'detailed-oltc-section');

  // keyboard access for the nav brand's "go home" role="button"
  const navBrandEl = document.getElementById('nav-brand');
  if (navBrandEl) navBrandEl.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); requestNavigate('landing'); }
  });

  // ── First-load initialisation ──
  const tfDateEl = document.getElementById('tf-date');
  if (tfDateEl) tfDateEl.value = new Date().toISOString().split('T')[0];
  initTheme();
  initDismissableModals();
  initFeedback();
  showLanding();
  initSplash();
  animateLandingCounters();
  initFlowReveal();
})();
