/**
 * TAILAM — ui/sidebar.js
 * Off-canvas navigation drawer for mobile widths (<=767px, see layout.css
 * .mobile-sidebar). The desktop nav-center links are unaffected; this only
 * drives open/close, focus handling and dismissal for the mobile sidebar
 * markup in index.html. The nav destinations themselves stay wired in
 * app.js, same as every other nav trigger — this module owns visibility only.
 *
 * Plain script — publishes on window.TAILAM.ui.sidebar.
 */
(function () {
  'use strict';

  let isOpen = false;
  let lastFocused = null;

  function els() {
    return {
      sidebar: document.getElementById('mobile-sidebar'),
      backdrop: document.getElementById('sidebar-backdrop'),
      hamburger: document.getElementById('hamburger-btn'),
      closeBtn: document.getElementById('sidebar-close')
    };
  }

  /** Focusable elements inside the sidebar, in DOM order, for the Tab trap. */
  function focusables(container) {
    return Array.from(container.querySelectorAll('button, [href], [tabindex]:not([tabindex="-1"])'))
      .filter((el) => !el.disabled);
  }

  function onKeydown(e) {
    if (e.key === 'Escape') { closeSidebar(); return; }
    if (e.key !== 'Tab') return;
    const { sidebar } = els();
    const items = focusables(sidebar);
    if (!items.length) return;
    const first = items[0], last = items[items.length - 1];
    if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
    else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
  }

  function openSidebar() {
    const { sidebar, backdrop, hamburger, closeBtn } = els();
    if (!sidebar || isOpen) return;
    isOpen = true;
    lastFocused = document.activeElement;
    sidebar.classList.add('sidebar-open');
    sidebar.setAttribute('aria-hidden', 'false');
    sidebar.inert = false;
    if (backdrop) backdrop.classList.add('sidebar-backdrop-show');
    if (hamburger) hamburger.setAttribute('aria-expanded', 'true');
    document.body.classList.add('sidebar-lock-scroll');
    document.addEventListener('keydown', onKeydown);
    (closeBtn || sidebar).focus();
  }

  function closeSidebar() {
    const { sidebar, backdrop, hamburger } = els();
    if (!sidebar || !isOpen) return;
    isOpen = false;
    sidebar.classList.remove('sidebar-open');
    sidebar.setAttribute('aria-hidden', 'true');
    sidebar.inert = true;
    if (backdrop) backdrop.classList.remove('sidebar-backdrop-show');
    if (hamburger) hamburger.setAttribute('aria-expanded', 'false');
    document.body.classList.remove('sidebar-lock-scroll');
    document.removeEventListener('keydown', onKeydown);
    // Always return focus to the trigger, not whatever was focused before
    // it opened — matches the requested "restore focus to the hamburger".
    if (hamburger) hamburger.focus();
    else if (lastFocused && lastFocused.focus) lastFocused.focus();
  }

  function toggleSidebar() { if (isOpen) closeSidebar(); else openSidebar(); }
  function isSidebarOpen() { return isOpen; }

  /** Wire the hamburger, close button and backdrop. Call once at startup. */
  function initSidebar() {
    const { sidebar, backdrop, hamburger, closeBtn } = els();
    if (!sidebar) return;
    sidebar.inert = true; // closed by default
    if (hamburger) hamburger.addEventListener('click', (e) => { e.stopPropagation(); toggleSidebar(); });
    if (closeBtn) closeBtn.addEventListener('click', closeSidebar);
    if (backdrop) backdrop.addEventListener('click', closeSidebar);
  }

  window.TAILAM = window.TAILAM || {};
  window.TAILAM.ui = window.TAILAM.ui || {};
  window.TAILAM.ui.sidebar = { initSidebar, openSidebar, closeSidebar, toggleSidebar, isSidebarOpen };
})();
