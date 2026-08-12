/**
 * TAILAM — validation/lib/nodeDomLoader.js
 *
 * Loads the REAL index.html into a jsdom document, then runs the app's
 * actual, unmodified <script> files against it in the exact same order
 * index.html loads them in — so uiSmokeTest.js exercises the same DOM
 * structure and the same plain-script IIFE modules (window.TAILAM.*) the
 * browser does, not a reimplementation or a mock of the app.
 *
 * jsdom has no real <canvas> 2D rendering backend, so this stubs
 * HTMLCanvasElement's getContext()/toDataURL() with harmless no-ops before
 * any app script loads. That's the ONLY behavioural difference from a real
 * browser: charts.js's drawing calls become no-ops and image capture
 * (hiResDuvalPng, canvasPngLight in ui/export.js) returns a placeholder
 * string instead of a real PNG. Nothing about engineering values, DOM text,
 * or control flow changes — the smoke test never inspects pixels, only the
 * already-computed report values rendered into text/HTML.
 *
 * This file contains ZERO engineering logic — it only wires up a runtime
 * environment so the real app code can execute outside a browser, the same
 * spirit as validation/lib/nodeEngineLoader.js (which does the same thing
 * for the engine-only files, without needing a DOM at all).
 *
 * DO NOT modify any src/js/* file to make this loader work — if the app
 * needs a browser API jsdom doesn't provide, extend the stub below.
 */
'use strict';

const fs = require('fs');
const path = require('path');
const vm = require('vm');
const { JSDOM } = require('jsdom');

// Exact order index.html loads these in (kept in sync manually — the smoke
// test itself will fail loudly if a file is missing/misordered, since a
// later file's IIFE would throw on a missing window.TAILAM.* dependency).
const SCRIPT_ORDER = [
  'utils/helpers.js', 'utils/validators.js',
  'engine/confidence.js', 'engine/duval.js', 'engine/duval2.js', 'engine/rogers.js',
  'engine/iec.js', 'engine/ieee.js', 'engine/keygas.js', 'engine/doernenburg.js',
  'engine/cigre.js', 'engine/consensus.js', 'engine/thi.js', 'engine/recommendations.js',
  'ui/icons.js', '../js/theme.js', 'ui/cards.js', 'ui/charts.js', 'ui/duval-legend.js',
  'ui/duval-svg.js', 'ui/dialogs.js', 'ui/modals.js', 'ui/workspace.js', 'ui/detailed-calcs.js',
  'ui/dashboard.js', 'ui/export.js', 'ui/loading.js', 'ui/feedback.js', 'ui/motion.js',
  'navigation.js', 'analytics.js', 'app.js'
];

/** A permissive stand-in for a CanvasRenderingContext2D — every method is a
 *  no-op; gradient factories return an object with a no-op addColorStop. */
function makeStubCanvasContext() {
  const gradient = { addColorStop() {} };
  return new Proxy({}, {
    get(target, prop) {
      if (prop === 'createRadialGradient' || prop === 'createLinearGradient') return () => gradient;
      if (prop in target) return target[prop];
      return () => {};
    },
    set() { return true; }
  });
}

/**
 * @returns {import('jsdom').JSDOM} a jsdom instance with the real index.html
 *   loaded and every app script already executed against it (i.e. ready for
 *   dom.window.TAILAM.ui.dashboard.analyzeMain() etc. to be called).
 */
function loadDom() {
  const repoRoot = path.join(__dirname, '..', '..', '..');
  const html = fs.readFileSync(path.join(repoRoot, 'index.html'), 'utf8');
  const dom = new JSDOM(html, {
    url: 'http://localhost/index.html',
    pretendToBeVisual: true,   // enables requestAnimationFrame, used by motion.js
    runScripts: 'outside-only' // we load scripts ourselves, below, via vm
  });
  const { window } = dom;

  window.HTMLCanvasElement.prototype.getContext = function () { return makeStubCanvasContext(); };
  window.HTMLCanvasElement.prototype.toDataURL = function () { return 'data:image/png;base64,STUB'; };

  // jsdom implements Blob but not URL.createObjectURL/revokeObjectURL (a
  // real browser has both) — ui/export.js's CSV/Excel fallback path calls
  // createObjectURL, so stub it with a fake but distinguishable URL. The
  // smoke test never dereferences it; it inspects the Blob content directly.
  if (typeof window.URL.createObjectURL !== 'function') {
    window.URL.createObjectURL = () => 'blob:stub-url';
    window.URL.revokeObjectURL = () => {};
  }

  // jsdom doesn't implement scrollIntoView (there's no real layout/viewport)
  // — several UI modules call it purely as a "smooth-scroll to result" nicety
  // that has nothing to do with the values being tested.
  if (typeof window.Element.prototype.scrollIntoView !== 'function') {
    window.Element.prototype.scrollIntoView = function () {};
  }

  const jsDir = path.join(repoRoot, 'src', 'js');
  const ctx = dom.getInternalVMContext();
  for (const rel of SCRIPT_ORDER) {
    const full = path.join(jsDir, rel);
    const src = fs.readFileSync(full, 'utf8');
    vm.runInContext(src, ctx, { filename: full });
  }
  return dom;
}

module.exports = { loadDom };
