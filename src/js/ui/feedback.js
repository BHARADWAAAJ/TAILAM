/**
 * TAILAM — ui/feedback.js
 * User feedback dialog. Presentation + delivery only — no engineering value.
 *
 * DELIVERY — two modes, chosen by FEEDBACK_ENDPOINT below:
 *
 *   1. Form backend (recommended once set up):
 *      Create a free form at https://formspree.io (or any compatible
 *      service), then paste its endpoint below, e.g.:
 *          const FEEDBACK_ENDPOINT = 'https://formspree.io/f/abcdwxyz';
 *      Submissions are POSTed as JSON and arrive in your inbox/dashboard —
 *      users never leave the app.
 *
 *   2. Email fallback (works today, zero setup):
 *      Leave FEEDBACK_ENDPOINT = '' and the form opens the user's email
 *      client with a fully pre-filled message to FEEDBACK_EMAIL.
 *
 * Plain script — publishes on window.TAILAM.ui.feedback.
 */
(function () {
  'use strict';

  const FEEDBACK_ENDPOINT = ''; // ← paste your Formspree endpoint here
  const FEEDBACK_EMAIL = 'bharadwajmuppala807@gmail.com';

  let rating = 0;

  function el(id) { return document.getElementById(id); }

  /** Open the feedback dialog (resets only the status line, not the fields). */
  function openFeedback() {
    const o = el('modal-feedback');
    if (!o) return;
    o.style.display = 'flex';
    setStatus('', true);
  }

  /** Close the feedback dialog. */
  function closeFeedback() {
    const o = el('modal-feedback');
    if (o) o.style.display = 'none';
  }

  function setRating(n) {
    rating = n;
    document.querySelectorAll('#fb-stars .fb-star').forEach((b, i) => {
      b.classList.toggle('on', i < n);
      b.setAttribute('aria-checked', i === n - 1 ? 'true' : 'false');
    });
  }

  function setStatus(msg, ok) {
    const s = el('fb-status');
    if (!s) return;
    s.textContent = msg;
    s.className = 'fb-status' + (msg ? (ok ? ' ok' : ' err') : '');
  }

  function clearForm() {
    ['fb-name', 'fb-email', 'fb-message'].forEach((id) => { const e = el(id); if (e) e.value = ''; });
    const t = el('fb-type'); if (t) t.selectedIndex = 0;
    setRating(0);
  }

  /** Validate and deliver the feedback via the configured mode. */
  async function submitFeedback() {
    const name = el('fb-name').value.trim();
    const email = el('fb-email').value.trim();
    const type = el('fb-type').value;
    const message = el('fb-message').value.trim();
    if (!message) { setStatus('Please write a short message before sending.', false); return; }

    if (FEEDBACK_ENDPOINT) {
      const btn = el('fb-send');
      if (btn) btn.disabled = true;
      setStatus('Sending…', true);
      try {
        const res = await fetch(FEEDBACK_ENDPOINT, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
          body: JSON.stringify({
            product: 'TAILAM', version: '1.0.0', type,
            rating: rating ? rating + '/5' : 'not given',
            name: name || 'Anonymous', email: email || 'not given',
            message
          })
        });
        if (res.ok) { setStatus('Thank you! Your feedback has been sent.', true); clearForm(); }
        else { setStatus('Could not send right now — please try again in a moment.', false); }
      } catch {
        setStatus('Network problem — please check your connection and try again.', false);
      } finally {
        if (btn) btn.disabled = false;
      }
    } else {
      // Email fallback: open the user's mail client fully pre-filled.
      const subject = 'TAILAM Feedback — ' + type + (rating ? ' (' + rating + '/5)' : '');
      const body = 'Type: ' + type +
        '\nRating: ' + (rating ? rating + '/5' : '—') +
        '\nName: ' + (name || '—') +
        '\nReply-to: ' + (email || '—') +
        '\n\n' + message +
        '\n\n— sent from TAILAM v1.0.0 (Static Browser Edition)';
      window.location.href = 'mailto:' + FEEDBACK_EMAIL +
        '?subject=' + encodeURIComponent(subject) +
        '&body=' + encodeURIComponent(body);
      setStatus('Your email app should now open with the message ready to send.', true);
    }
  }

  /** Bind the star-rating buttons. Call once at startup (app.js). */
  function initFeedback() {
    document.querySelectorAll('#fb-stars .fb-star').forEach((b, i) => {
      b.addEventListener('click', () => setRating(i + 1));
    });
  }

  window.TAILAM = window.TAILAM || {};
  window.TAILAM.ui = window.TAILAM.ui || {};
  window.TAILAM.ui.feedback = { openFeedback, closeFeedback, submitFeedback, initFeedback };
})();
