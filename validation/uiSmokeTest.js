/**
 * TAILAM — validation/uiSmokeTest.js
 *
 * UI-layer regression smoke test (developer/CI tool only).
 *
 * validationRunner.js proves the engine functions are correct in isolation.
 * It cannot catch a UI-layer regression — the exact class of bug this app
 * has actually had this session (the "Raw Calculations" section silently
 * left visible, a gas-label rename missed in one export path, a layout
 * change that reintroduced horizontal overflow). This script closes that
 * gap: it loads the REAL index.html + REAL app scripts into jsdom (see
 * lib/nodeDomLoader.js), runs a fixed gas set through the full Main Tank and
 * OLTC flows exactly as a user would (fill fields → click Analyze → open the
 * Engineering Workbook → export), and asserts a fixed set of rendered/
 * exported strings.
 *
 * This is a SMOKE test, not a replacement for validationRunner.js: it
 * doesn't re-verify engineering correctness (that's the engine suite's job),
 * only that the UI/export layer still surfaces those already-computed
 * values the way it's supposed to. Zero engineering logic lives here.
 *
 *   npm run test:ui
 *   node src/validation/uiSmokeTest.js
 */
'use strict';

const { loadDom } = require('./lib/nodeDomLoader.js');

let pass = 0, fail = 0;
const failures = [];

/** Record a pass/fail line, like validationRunner.js's console report. */
function check(label, condition) {
  if (condition) { pass++; console.log('  PASS  ' + label); }
  else { fail++; failures.push(label); console.log('  FAIL  ' + label); }
}
function includesAll(haystack, needles) {
  return needles.every((n) => haystack.includes(n));
}

/** Real Node delay — lets the app's own setTimeout-based "diagnostic
 *  computation" loading animation (ui/loading.js) finish and invoke the
 *  actual analyzeMain()/analyzeOltc() it wraps, exactly as it would in a
 *  browser after clicking "Run Analysis". Comfortably longer than the
 *  ~810ms sequence (6 steps x 105ms + 180ms). */
function waitForAnalysis() { return new Promise((resolve) => setTimeout(resolve, 1200)); }

function setField(doc, id, value) {
  const el = doc.getElementById(id);
  if (!el) throw new Error('Missing expected field #' + id + ' — index.html structure may have changed.');
  el.value = String(value);
}

/** Capture the HTML exportPDF() would have written into the print window. */
function capturePdf(window, exportFn, type) {
  const originalOpen = window.open;
  let captured = null;
  window.open = () => ({ document: { open() {}, write(h) { captured = h; }, close() {} }, focus() {}, print() {} });
  try { exportFn(type); } finally { window.open = originalOpen; }
  return captured;
}

/** Capture the CSV text exportExcelX()'s fallback would have downloaded
 *  (ExcelJS is never loaded in this Node environment, so exportExcelX()
 *  takes its existing, real "offline" branch straight to exportCSV()).
 *  jsdom's window.Blob doesn't implement .text()/.arrayBuffer() in the
 *  installed version, so this reads the raw parts passed to `new Blob(...)`
 *  directly rather than relying on that API. */
async function captureCsvBlob(window, exportExcelX, type) {
  const OriginalBlob = window.Blob;
  const originalClick = window.HTMLAnchorElement.prototype.click;
  let capturedParts = null;
  window.Blob = function (parts, opts) { capturedParts = parts; return new OriginalBlob(parts, opts); };
  window.HTMLAnchorElement.prototype.click = function () {};
  try { await exportExcelX(type); } finally {
    window.Blob = OriginalBlob;
    window.HTMLAnchorElement.prototype.click = originalClick;
  }
  return capturedParts ? capturedParts.join('') : null;
}

async function main() {
  console.log('================================================');
  console.log('TAILAM UI Smoke Test');
  console.log('================================================');

  const dom = loadDom();
  const { window } = dom;
  const doc = window.document;
  const T = window.TAILAM;

  // ── MAIN TANK ── fixed reference gas set used throughout manual testing
  // this project: known result T2 (Thermal Fault 300-700C), which also
  // triggers the Duval Triangle 4 supplementary confirmation (zone C).
  console.log('\n-- Main Tank --');
  doc.getElementById('nav-main').click();
  // Deliberately formula-injection-shaped transformer name — exercises the
  // CSV export's csvSafe() guard (ui/export.js) end-to-end below.
  setField(doc, 'tf-name', '=1+1');
  const mainGases = { 'g-h2': 120, 'g-ch4': 240, 'g-c2h6': 30, 'g-c2h4': 90, 'g-c2h2': 4, 'g-co': 200, 'g-co2': 2000, 'g-o2': 5000 };
  Object.entries(mainGases).forEach(([id, v]) => setField(doc, id, v));
  doc.getElementById('btn-analyze-main').click();
  await waitForAnalysis();

  const rp = T.ui.dashboard.getMtReport();
  check('Main Tank analysis produced a report', !!rp);
  check('Duval Triangle 1 zone is T2', rp.duval.zone === 'T2');
  check('Snapshot fault text rendered', doc.getElementById('snapshot-fault-main').textContent.includes('T2'));
  check('Snapshot decision text rendered', doc.getElementById('snapshot-decision-main').textContent.length > 0);
  check('Snapshot confidence text rendered', /\d+%/.test(doc.getElementById('snapshot-confidence-main').textContent));
  check('Diagnostic Methods table has rows', doc.getElementById('diagnostic-table-main').children.length > 0);
  check('Duval Triangle 4 computed for this zone', !!rp.duval4);
  check('Duval Triangle 4 panel is visible', doc.getElementById('duval4-panel-main').hidden === false);
  check('Duval Triangle 4 zone rendered', doc.getElementById('duval4-zone-main').textContent === rp.duval4.zone);

  const wbMainHtml = doc.getElementById('detailed-main').innerHTML;
  check('Workbook rendered IEC chapter', wbMainHtml.includes('IEC 60599 Three-Ratio Method'));
  check('Workbook rendered Duval Triangle 1 chapter', wbMainHtml.includes('Duval Triangle 1'));
  check('Workbook rendered the Triangle 4 supplementary step', wbMainHtml.includes('Supplementary Confirmation'));

  const pdfMain = capturePdf(window, T.ui.export.exportPDF, 'main');
  check('Main Tank PDF export produced HTML', !!pdfMain);
  if (pdfMain) {
    check('PDF gas table shows full gas names', includesAll(pdfMain, ['H₂ — Hydrogen', 'CH₄ — Methane', 'O₂ — Oxygen']));
    check('PDF embeds the Duval Triangle 4 figure', pdfMain.includes('Duval Triangle 4 — Supplementary Confirmation'));
    check('PDF embeds exactly 3 images (gauge + T1 + T4)', (pdfMain.match(/<img/g) || []).length === 3);
  }

  const csvMain = await captureCsvBlob(window, T.ui.export.exportExcelX, 'main');
  check('Main Tank CSV/Excel-fallback export produced content', !!csvMain && csvMain.length > 0);
  if (csvMain) {
    check('CSV export mentions Duval Triangle 1', csvMain.includes('Duval Triangle 1'));
    check('CSV guards a formula-injection-shaped name (starts with =)', csvMain.includes('"\'=1+1"') && !csvMain.includes('"=1+1"'));
  }

  // ── OLTC ── fixed reference gas set with a known X3 zone result.
  console.log('\n-- OLTC --');
  doc.getElementById('nav-oltc').click();
  const oltcGases = { 'ot-h2': 50, 'ot-ch4': 80, 'ot-c2h6': 10, 'ot-c2h4': 120, 'ot-c2h2': 60, 'ot-co': 300, 'ot-co2': 1500, 'ot-taps': 8000 };
  Object.entries(oltcGases).forEach(([id, v]) => setField(doc, id, v));
  doc.getElementById('btn-analyze-oltc').click();
  await waitForAnalysis();

  const otrp = T.ui.dashboard.getOtReport();
  check('OLTC analysis produced a report', !!otrp);
  check('Duval Triangle 2 zone computed', typeof otrp.duval2.zone === 'string' && otrp.duval2.zone.length > 0);
  const oltcLabelText = Array.from(doc.querySelectorAll('#panel-oltc .grid label')).map((l) => l.textContent).join(' | ');
  check('OLTC H2 label shows full name', oltcLabelText.includes('H₂ — Hydrogen'));
  check('OLTC TGC table has rows', doc.getElementById('oltc-tgc-body').children.length > 0);
  check('Raw Calculations carrier stays hidden (OLTC)', doc.getElementById('raw-calculations-oltc').hidden === true);
  check('Raw Calculations carrier stays hidden (Main)', doc.getElementById('raw-calculations-main').hidden === true);

  const wbOltcHtml = doc.getElementById('detailed-oltc').innerHTML;
  check('OLTC workbook rendered Duval Triangle 2 chapter', wbOltcHtml.includes('Duval Triangle 2'));

  const pdfOltc = capturePdf(window, T.ui.export.exportPDF, 'oltc');
  check('OLTC PDF export produced HTML', !!pdfOltc);
  if (pdfOltc) check('OLTC PDF gas table shows full names', includesAll(pdfOltc, ['H₂ — Hydrogen', 'CO₂ — Carbon Dioxide']));

  // ── Cross-cutting ──
  console.log('\n-- Cross-cutting --');
  check('Feedback email is configured', /@/.test(require('fs').readFileSync(
    require('path').join(__dirname, '..', 'js', 'ui', 'feedback.js'), 'utf8'
  ).match(/FEEDBACK_EMAIL = '([^']+)'/)[1]));
  check('Analytics module exposes trackPageView', typeof T.analytics.trackPageView === 'function');
  check('Gold-mode accent token exists without altering fault colours', (() => {
    const cssPath = require('path').join(__dirname, '..', 'css', 'variables.css');
    const css = require('fs').readFileSync(cssPath, 'utf8');
    return css.includes('.theme-gold') && css.includes('--fault-normal');
  })());

  console.log('\n================================================');
  console.log(`TAILAM UI Smoke Test — ${pass} passed, ${fail} failed`);
  console.log('================================================');
  if (fail) {
    console.log('\nFailed checks:');
    failures.forEach((f) => console.log('  - ' + f));
  }
  process.exitCode = fail === 0 ? 0 : 1;
}

main().catch((e) => {
  console.error('\nUI smoke test crashed:', e.stack || e.message);
  process.exitCode = 1;
});
