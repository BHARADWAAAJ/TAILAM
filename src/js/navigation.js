/**
 * TAILAM — navigation.js
 * View switching between the landing screen and the Main Tank / OLTC
 * workspaces. Main Tank and OLTC remain fully independent workspaces —
 * this module only controls which one is visible. The OLTC-shown callback
 * is registered by app.js (it pre-fills the cross-contamination reference
 * fields).
 *
 * Plain script — publishes on window.TAILAM.navigation.
 */
(function () {
  'use strict';

  let _onOltcShown = null;
  let _activeView = 'landing'; // 'landing' | 'main' | 'oltc'

  /**
   * Register a callback fired whenever the OLTC tab becomes active.
   * @param {Function} fn
   */
  function registerOltcShownCallback(fn) { _onOltcShown = fn; }

  /** @returns {'landing'|'main'|'oltc'} the currently displayed view. */
  function getActiveView() { return _activeView; }

  /** Show the landing screen and hide the analysis workspace. */
  function showLanding() {
    _activeView = 'landing';
    document.getElementById('view-landing').style.display = 'block';
    document.getElementById('view-workspace').style.display = 'none';
    updateNavActiveState();
  }

  /**
   * Switch to a workspace tab — shows the analysis workspace (hiding the
   * landing screen) and activates the requested panel.
   * @param {'main'|'oltc'} tab
   */
  function switchTab(tab) {
    _activeView = tab;
    document.getElementById('view-landing').style.display = 'none';
    document.getElementById('view-workspace').style.display = 'block';
    document.getElementById('panel-main').classList.toggle('active', tab === 'main');
    document.getElementById('panel-oltc').classList.toggle('active', tab === 'oltc');
    updateNavActiveState();
    if (tab === 'oltc' && _onOltcShown) _onOltcShown();
  }

  /** Sync the nav-link active styling with the current view. */
  function updateNavActiveState() {
    const mainBtn = document.getElementById('nav-main');
    const oltcBtn = document.getElementById('nav-oltc');
    if (mainBtn) mainBtn.classList.toggle('active', _activeView === 'main');
    if (oltcBtn) oltcBtn.classList.toggle('active', _activeView === 'oltc');
  }

  window.TAILAM = window.TAILAM || {};
  window.TAILAM.navigation = { registerOltcShownCallback, getActiveView, showLanding, switchTab };
})();
