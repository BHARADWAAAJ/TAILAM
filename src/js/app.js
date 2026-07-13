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
  on('modal-help-close',     closeHelp);
  on('modal-about-close',    closeAbout);
  on('landing-btn-main',     () => requestNavigate('main'));
  on('landing-btn-oltc',     () => requestNavigate('oltc'));
  on('theme-btn',            toggleTheme);
  on('btn-analyze-main',     analyzeMain);
  on('btn-clear-main',       clearMain);
  on('btn-export-main-pdf',  () => exportPDF('main'));
  on('btn-export-main-xlsx', () => exportExcelX('main'));
  on('btn-new-main',         () => { clearMain(); const p = document.getElementById('panel-main'); if (p) p.scrollIntoView({ behavior:'smooth' }); });
  on('btn-analyze-oltc',     analyzeOltc);
  on('btn-clear-oltc',       clearOltc);
  on('btn-export-oltc-pdf',  () => exportPDF('oltc'));
  on('btn-export-oltc-xlsx', () => exportExcelX('oltc'));
  on('btn-new-oltc',         () => { clearOltc(); const p = document.getElementById('panel-oltc'); if (p) p.scrollIntoView({ behavior:'smooth' }); });
  on('unsaved-export-pdf',   confirmUnsavedExportPDF);
  on('unsaved-export-xlsx',  confirmUnsavedExportExcel);
  on('unsaved-discard',      confirmUnsavedDiscard);
  on('unsaved-cancel',       closeUnsavedDialog);

  // Duval Triangle hero → detail modal (click or keyboard activate)
  on('duval-canvas',  () => openDuvalModal('main'));
  on('duval2-canvas', () => openDuvalModal('oltc'));
  on('modal-duval-close',     closeDuvalModal);
  on('duval-modal-close-btn', closeDuvalModal);
  ['duval-canvas', 'duval2-canvas'].forEach((id) => {
    const el = document.getElementById(id);
    if (el) el.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); openDuvalModal(id === 'duval-canvas' ? 'main' : 'oltc'); }
    });
  });

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
  showLanding();
})();
