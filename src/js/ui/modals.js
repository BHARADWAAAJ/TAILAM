/**
 * TAILAM — ui/modals.js
 * Static content dialogs (About, Help) and the unsaved-analysis guard
 * dialog shown when the user tries to switch modules (or return to the
 * landing screen) while the active workspace has an unexported report.
 *
 * Plain script — publishes on window.TAILAM.ui.modals.
 */
(function () {
  'use strict';

  function show(id) { document.getElementById(id).style.display = 'flex'; }
  function hide(id) { document.getElementById(id).style.display = 'none'; }

  /** Open the About dialog. */
  function openAbout() { show('modal-about'); }
  /** Close the About dialog. */
  function closeAbout() { hide('modal-about'); }
  /** Open the Help dialog. */
  function openHelp() { show('modal-help'); }
  /** Close the Help dialog. */
  function closeHelp() { hide('modal-help'); }

  /**
   * Close the Duval detail modal through its owner (ui/workspace.js) so its
   * canvas-repaint bug fix always runs, whichever way the modal was
   * dismissed. Read lazily — workspace.js loads after this file.
   */
  function closeDuvalViaWorkspace() {
    const ws = window.TAILAM.ui.workspace;
    if (ws && ws.closeDuvalModal) ws.closeDuvalModal(); else hide('modal-duval');
  }

  /** Close every backdrop-dismissable modal that click/escape can reach. */
  function closeDismissable() {
    closeAbout(); closeHelp(); closeDuvalViaWorkspace();
    const fb = window.TAILAM.ui.feedback; // lazy — loads after this file
    if (fb && fb.closeFeedback) fb.closeFeedback();
  }

  /**
   * Wire backdrop-click dismissal for modals marked [data-dismissable] and
   * an Escape-key shortcut. Call once at startup.
   */
  function initDismissableModals() {
    document.querySelectorAll('.modal-overlay[data-dismissable]').forEach(overlay => {
      overlay.addEventListener('click', (e) => {
        if (e.target !== overlay) return;
        // Route the Duval modal through its owner so the hero canvas is
        // repainted after the backdrop recomposite (see workspace.js).
        if (overlay.id === 'modal-duval') closeDuvalViaWorkspace();
        else overlay.style.display = 'none';
      });
    });
    document.addEventListener('keydown', (e) => { if (e.key === 'Escape') closeDismissable(); });
  }

  // ── Unsaved-analysis guard dialog ──
  let _pendingFrom = null;   // 'main' | 'oltc' — the dirty workspace being left
  let _pendingTarget = null; // 'landing' | 'main' | 'oltc' — where navigation was headed
  let _handlers = null;      // { exportPDF, exportExcelX, discard, navigate }

  /**
   * Open the unsaved-analysis dialog for a blocked navigation attempt.
   * @param {'main'|'oltc'} fromTab - the workspace with the unexported report
   * @param {'landing'|'main'|'oltc'} toTarget - where the user tried to go
   * @param {{exportPDF:Function, exportExcelX:Function, discard:Function, navigate:Function}} handlers
   */
  function openUnsavedDialog(fromTab, toTarget, handlers) {
    _pendingFrom = fromTab;
    _pendingTarget = toTarget;
    _handlers = handlers;
    show('modal-unsaved');
  }

  /** Close the unsaved-analysis dialog without navigating (Cancel). */
  function closeUnsavedDialog() {
    hide('modal-unsaved');
    _pendingFrom = null;
    _pendingTarget = null;
    _handlers = null;
  }

  /** Export the pending workspace as PDF, then continue to the target view. */
  function confirmUnsavedExportPDF() {
    if (!_handlers) return;
    const { exportPDF, navigate } = _handlers;
    const from = _pendingFrom, target = _pendingTarget;
    exportPDF(from);
    closeUnsavedDialog();
    navigate(target);
  }

  /** Export the pending workspace as Excel, then continue to the target view. */
  async function confirmUnsavedExportExcel() {
    if (!_handlers) return;
    const { exportExcelX, navigate } = _handlers;
    const from = _pendingFrom, target = _pendingTarget;
    await exportExcelX(from);
    closeUnsavedDialog();
    navigate(target);
  }

  /** Discard the pending workspace's report, then continue to the target view. */
  function confirmUnsavedDiscard() {
    if (!_handlers) return;
    const { discard, navigate } = _handlers;
    const from = _pendingFrom, target = _pendingTarget;
    discard(from);
    closeUnsavedDialog();
    navigate(target);
  }

  window.TAILAM = window.TAILAM || {};
  window.TAILAM.ui = window.TAILAM.ui || {};
  window.TAILAM.ui.modals = {
    openAbout, closeAbout, openHelp, closeHelp, initDismissableModals,
    openUnsavedDialog, closeUnsavedDialog,
    confirmUnsavedExportPDF, confirmUnsavedExportExcel, confirmUnsavedDiscard
  };
})();
