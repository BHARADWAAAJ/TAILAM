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
  const { animateLandingCounters, initFlowReveal, initSplash, initEngineeringEgg, initGoldEasterEgg } = window.TAILAM.ui.motion;

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

  // ── "Engineering Workbook" modal ──
  // The Detailed Engineering Calculations content used to expand inline in
  // the dashboard, which made the page very long and forced a full scroll
  // back to the top to collapse it. It now opens in a large modal overlay
  // instead — the dashboard behind is untouched and stays exactly where it
  // was; only the modal's own body scrolls. Content is populated separately
  // by ui/detailed-calcs.js (into #detailed-main / #detailed-oltc, now
  // nested inside #modal-workbook's body) — no engineering value is
  // computed or altered here, this is the launcher/chrome only.
  //
  // #modal-workbook deliberately has no [data-dismissable]: that generic
  // mechanism (modals.js#initDismissableModals) only ever calls
  // `overlay.style.display = 'none'` for modals it doesn't special-case,
  // which would leave the scroll-lock applied and the focus-trap listener
  // attached forever after a backdrop-click close. Simpler and safer to
  // keep this modal's open/close/focus-trap/scroll-lock entirely
  // self-contained here, rather than teaching modals.js about a second
  // "close via owner" special case.
  let _workbookLastFocused = null;
  let _workbookKeydownHandler = null;
  let _workbookCurrentPanel = null;
  // In-memory only (module-level variable, never written to storage) — so
  // reopening the modal later in the SAME page session restores where the
  // user left off, but a page reload naturally forgets it, per spec.
  const _workbookScrollPos = { main: 0, oltc: 0 };
  // Fixed per panel — the primary diagnostic method never changes for a
  // given panel (Main Tank is always Duval Triangle 1, OLTC always Duval
  // Triangle 2), so this is static metadata, not derived from scroll.
  const WORKBOOK_META = {
    main: { transformer: 'Main Tank', faultMethod: 'Duval Triangle 1' },
    oltc: { transformer: 'OLTC', faultMethod: 'Duval Triangle 2' }
  };

  /** Every currently visible, focusable element inside a container, in DOM order. */
  function focusableIn(container) {
    return Array.from(container.querySelectorAll(
      'a[href], button:not([disabled]), textarea:not([disabled]), input:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])'
    )).filter((el) => el.offsetParent !== null);
  }

  /** Toggle one step's collapsed state (default expanded, per spec). */
  function toggleWorkbookStep(stepEl) {
    if (!stepEl) return;
    const collapsed = stepEl.classList.toggle('collapsed');
    const head = stepEl.querySelector('.wb-step-head');
    if (head) head.setAttribute('aria-expanded', String(!collapsed));
  }

  /** Scroll smoothly to a target id inside the workbook, auto-expanding it first if it was a collapsed step. Silently no-ops at either end of the workbook (no earlier/later step exists) — by design, not an error. */
  function jumpToWorkbookTarget(targetId) {
    const target = document.getElementById(targetId);
    if (!target) return;
    if (target.classList.contains('wb-step') && target.classList.contains('collapsed')) toggleWorkbookStep(target);
    target.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  /** Reading-progress fill/percentage, computed from the modal body's own scroll (never the underlying dashboard, which is scroll-locked). */
  function updateWorkbookProgress(body) {
    const fill = document.getElementById('wb-progress-fill');
    const pctEl = document.getElementById('wb-progress-pct');
    if (!fill || !pctEl) return;
    const max = body.scrollHeight - body.clientHeight;
    const pct = max > 0 ? Math.min(100, Math.max(0, Math.round((body.scrollTop / max) * 100))) : 0;
    fill.style.width = pct + '%';
    pctEl.textContent = pct + '%';
  }

  /** Highlight whichever chapter is nearest the top of the (currently visible panel's) Table of Contents. */
  function updateWorkbookScrollspy(body) {
    if (!_workbookCurrentPanel) return;
    const activeContent = document.getElementById(_workbookCurrentPanel === 'main' ? 'detailed-main' : 'detailed-oltc');
    if (!activeContent) return;
    const chapters = Array.from(activeContent.querySelectorAll('.wb-method'));
    const bodyRect = body.getBoundingClientRect();
    let currentId = chapters.length ? chapters[0].id : null;
    chapters.forEach((chEl) => { if (chEl.getBoundingClientRect().top - bodyRect.top <= 80) currentId = chEl.id; });
    activeContent.querySelectorAll('.wb-toc-link').forEach((a) => { a.classList.toggle('active', a.dataset.target === currentId); });
  }

  /** Scroll handler — progress bar, scrollspy and scroll-memory, all from one
   *  scroll event. These are cheap reads (scrollTop / a getBoundingClientRect
   *  per chapter) plus class/style writes; no DOM is recreated, so running
   *  directly on scroll is fine and avoids any rAF-in-hidden-tab stall. */
  function onWorkbookBodyScroll(e) {
    const body = e.currentTarget;
    updateWorkbookProgress(body);
    updateWorkbookScrollspy(body);
    if (_workbookCurrentPanel) _workbookScrollPos[_workbookCurrentPanel] = body.scrollTop;
  }

  /** Close the Engineering Workbook modal: save scroll position, unlock scroll, drop the trap, restore focus. */
  function closeWorkbookModal() {
    const overlay = document.getElementById('modal-workbook');
    if (!overlay || overlay.style.display === 'none' || !overlay.style.display) return;
    const body = overlay.querySelector('.modal-workbook-body');
    if (body) {
      if (_workbookCurrentPanel) _workbookScrollPos[_workbookCurrentPanel] = body.scrollTop;
      body.removeEventListener('scroll', onWorkbookBodyScroll);
    }
    overlay.style.display = 'none';
    document.body.style.overflow = '';
    if (_workbookKeydownHandler) { document.removeEventListener('keydown', _workbookKeydownHandler); _workbookKeydownHandler = null; }
    if (_workbookLastFocused && typeof _workbookLastFocused.focus === 'function') _workbookLastFocused.focus();
    _workbookLastFocused = null;
    _workbookCurrentPanel = null;
  }

  /**
   * Open the Engineering Workbook modal, showing whichever panel's
   * already-rendered content is relevant. Never touches #detailed-main's or
   * #detailed-oltc's innerHTML — that's rendered once per analysis by
   * ui/detailed-calcs.js; opening/closing the modal only toggles `hidden`
   * and reads/writes scroll position, so no DOM is recreated on open/close.
   * @param {'main'|'oltc'} panel
   */
  function openWorkbookModal(panel) {
    const overlay = document.getElementById('modal-workbook');
    if (!overlay) return;
    const mainContent = document.getElementById('detailed-main');
    const oltcContent = document.getElementById('detailed-oltc');
    if (mainContent) mainContent.hidden = panel !== 'main';
    if (oltcContent) oltcContent.hidden = panel !== 'oltc';
    _workbookCurrentPanel = panel;

    const meta = WORKBOOK_META[panel] || {};
    const transformerEl = document.getElementById('modal-workbook-transformer');
    const faultMethodEl = document.getElementById('modal-workbook-fault-method');
    if (transformerEl) transformerEl.textContent = meta.transformer || '—';
    if (faultMethodEl) faultMethodEl.textContent = meta.faultMethod || '—';

    // Restore focus to THIS panel's launch button on close — captured
    // deterministically by id rather than from document.activeElement,
    // which a mouse click doesn't reliably leave on the button (notably on
    // macOS Safari/Firefox), so the spec's "focus returns to the launch
    // button" holds however the modal was opened.
    _workbookLastFocused = document.getElementById('btn-toggle-detailed-' + panel) || document.activeElement;
    overlay.style.display = 'flex';
    document.body.style.overflow = 'hidden'; // background dashboard no longer scrolls; scroll position is preserved untouched

    const box = overlay.querySelector('.modal-box');
    const body = overlay.querySelector('.modal-workbook-body');
    const closeBtn = document.getElementById('modal-workbook-close');
    if (closeBtn) closeBtn.focus();

    if (body) {
      body.scrollTop = _workbookScrollPos[panel] || 0; // restore this-session position (0 the first time, or after a reload)
      updateWorkbookProgress(body);
      updateWorkbookScrollspy(body);
      body.addEventListener('scroll', onWorkbookBodyScroll);
    }

    _workbookKeydownHandler = (e) => {
      if (e.key === 'Escape') { e.preventDefault(); closeWorkbookModal(); return; }
      if (e.key === 'Tab' && box) {
        const focusable = focusableIn(box);
        if (!focusable.length) return;
        const first = focusable[0], last = focusable[focusable.length - 1];
        if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
        else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
      }
      // Enter/Space activates a focused, keyboard-operable step header (role="button").
      if ((e.key === 'Enter' || e.key === ' ') && e.target && e.target.dataset && e.target.dataset.action === 'toggle-step') {
        e.preventDefault(); toggleWorkbookStep(e.target.closest('.wb-step'));
      }
    };
    document.addEventListener('keydown', _workbookKeydownHandler);
  }

  // Single delegated click handler for every workbook navigation control —
  // Table of Contents links, Expand All / Collapse All, per-step collapse
  // toggles, Previous/Next. Registered once, on document: ui/detailed-
  // calcs.js completely replaces #detailed-main/#detailed-oltc's innerHTML
  // on every analysis, which would silently drop any listeners bound
  // directly to those buttons — delegation from a stable ancestor (here,
  // document itself) is unaffected by that replacement.
  document.addEventListener('click', (e) => {
    const el = e.target.closest('[data-action]');
    if (!el) return;
    const action = el.dataset.action;
    if (action === 'jump-to') { e.preventDefault(); jumpToWorkbookTarget(el.dataset.target); }
    else if (action === 'toggle-step') { toggleWorkbookStep(el.closest('.wb-step')); }
    else if (action === 'expand-all' || action === 'collapse-all') {
      const scope = el.closest('.detailed-calcs');
      if (!scope) return;
      scope.querySelectorAll('.wb-step').forEach((s) => {
        s.classList.toggle('collapsed', action === 'collapse-all');
        const head = s.querySelector('.wb-step-head');
        if (head) head.setAttribute('aria-expanded', String(action !== 'collapse-all'));
      });
    }
  });

  on('btn-toggle-detailed-main', () => openWorkbookModal('main'));
  on('btn-toggle-detailed-oltc', () => openWorkbookModal('oltc'));
  on('modal-workbook-close', closeWorkbookModal);
  // Backdrop click — only when the click lands on the overlay itself, not the box inside it.
  (function () {
    const overlay = document.getElementById('modal-workbook');
    if (overlay) overlay.addEventListener('click', (e) => { if (e.target === overlay) closeWorkbookModal(); });
  })();

  // keyboard access for the nav brand's "go home" role="button"
  const navBrandEl = document.getElementById('nav-brand');
  if (navBrandEl) navBrandEl.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); requestNavigate('landing'); }
  });

  // Sticky top nav — toggles `.is-scrolled` (shadow + tint + blur) once the
  // page has scrolled past a small threshold; clean/flat at rest. rAF-throttled
  // since scroll fires far more often than the UI needs to repaint.
  (function initStickyNav() {
    const nav = document.querySelector('.topnav');
    if (!nav) return;
    const THRESHOLD = 8;
    let ticking = false;
    function apply() {
      ticking = false;
      nav.classList.toggle('is-scrolled', window.scrollY > THRESHOLD);
    }
    window.addEventListener('scroll', () => {
      if (ticking) return;
      ticking = true;
      requestAnimationFrame(apply);
    }, { passive: true });
    apply();
  })();

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
  initEngineeringEgg();
  initGoldEasterEgg();
})();
