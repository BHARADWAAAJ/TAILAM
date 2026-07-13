/**
 * TAILAM — validation/lib/nodeEngineLoader.js
 *
 * Loads the UNMODIFIED browser engine files (src/js/utils/helpers.js and
 * src/js/engine/*.js) into a plain Node.js process so the validation
 * framework can call the exact same functions that ship to the browser.
 *
 * These engine files are plain `(function () { ... })()` scripts that
 * publish their API onto `window.TAILAM.*` — they are never bundled,
 * transpiled or rewritten. In the browser, `window` is supplied by the
 * DOM. In Node, this loader supplies the same thing: a plain object
 * assigned to `global.window` before each file is `require()`d. Node's
 * global-scope lookup means an unqualified `window` reference inside the
 * required file resolves to `global.window`, exactly as an unqualified
 * global would in a browser's global scope.
 *
 * This file contains ZERO engineering logic. It does not read, alter, or
 * duplicate any calculation, threshold, or standard reference value from
 * the engine — it only wires up a runtime environment so the real engine
 * code can execute outside a browser.
 *
 * DO NOT copy engine logic here. DO NOT modify src/js/engine/*.js to make
 * this loader work — if a future engine file needs a browser API this
 * loader doesn't provide (e.g. `document`), extend the shim below, never
 * the engine file.
 */
'use strict';

const path = require('path');

/**
 * @returns {object} the window.TAILAM namespace, populated with
 *   .utils.helpers and .engine.* exactly as shipped to the browser.
 */
function loadEngine() {
  // Fresh window/TAILAM namespace per call, so repeated validation runs
  // (e.g. in a long-lived watch process) never see state left over from
  // a previous run.
  const win = {};
  win.window = win; // some engine files may reference `window.window`-style patterns; harmless no-op alias
  global.window = win;
  global.window.TAILAM = {};

  const jsDir = path.join(__dirname, '..', '..', 'js');

  // Dependency order matters: consensus.js reads window.TAILAM.engine.confidence
  // at load time, so confidence.js must load first. This mirrors the exact
  // <script> order already used in index.html.
  const files = [
    'utils/helpers.js',
    'engine/confidence.js',
    'engine/duval.js',
    'engine/duval2.js',
    'engine/rogers.js',
    'engine/iec.js',
    'engine/ieee.js',
    'engine/keygas.js',
    'engine/doernenburg.js',
    'engine/cigre.js',
    'engine/consensus.js',
    'engine/thi.js',
    'engine/recommendations.js'
  ];

  for (const rel of files) {
    const full = path.join(jsDir, rel);
    delete require.cache[require.resolve(full)];
    require(full); // executes the file's IIFE, which populates global.window.TAILAM
  }

  return global.window.TAILAM;
}

module.exports = { loadEngine };
