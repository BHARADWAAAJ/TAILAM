/**
 * TAILAM — ui/dialogs.js
 * User-facing notifications. Currently wraps the native alert so all
 * dialog usage funnels through one place (swap-in point for custom
 * modals in a future sprint without touching callers).
 *
 * Plain script — publishes on window.TAILAM.ui.dialogs.
 */
(function () {
  'use strict';

  /**
   * Show a blocking notification to the user.
   * @param {string} message
   */
  function notify(message) {
    alert(message);
  }

  window.TAILAM = window.TAILAM || {};
  window.TAILAM.ui = window.TAILAM.ui || {};
  window.TAILAM.ui.dialogs = { notify };
})();
