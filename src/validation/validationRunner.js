/**
 * TAILAM — validation/validationRunner.js
 *
 * Internal Engineering Validation Framework (developer/CI tool only).
 * Loads the UNMODIFIED browser engine files (via lib/nodeEngineLoader.js),
 * runs them against the reference datasets in datasets/<Method>/, and
 * reports PASS/FAIL per dataset and per method.
 *
 * This file contains ZERO engineering logic of its own — it only calls the
 * real engine functions and compares their output to each dataset's
 * expected* fields using the shared comparators in lib/compare.js.
 *
 * NOT wired into index.html, NOT loaded by the browser app, NOT exposed to
 * end users. Run it from a terminal with Node:
 *
 *   node src/validation/validationRunner.js
 *
 * See VALIDATION.md for the full framework explanation.
 */
'use strict';

const fs = require('fs');
const path = require('path');
const { loadEngine } = require('./lib/nodeEngineLoader.js');
const cmp = require('./lib/compare.js');

const DATASETS_DIR = path.join(__dirname, 'datasets');
const REPORTS_DIR = path.join(__dirname, 'reports');
const RATIO_TOLERANCE = 0.01; // absolute tolerance for float ratio/percentage comparisons

/** Read + parse one dataset JSON file. */
function loadDatasetFile(relPath) {
  const full = path.join(DATASETS_DIR, relPath);
  return JSON.parse(fs.readFileSync(full, 'utf8'));
}

/**
 * Evaluate a single dataset against an `actual` object computed by the
 * caller's `computeActual(inputGasValues)` function.
 * PLACEHOLDER datasets (no verified expected values yet) are reported as
 * SKIPPED and excluded from pass/fail/accuracy — comparing against a null
 * expected value would produce a meaningless, misleading PASS.
 */
function evalDataset(ds, computeActual) {
  if (ds.status === 'PLACEHOLDER') {
    return {
      datasetId: ds.datasetId,
      status: 'SKIPPED',
      provenance: ds.provenance,
      reason: 'Placeholder dataset — pending a published-standard reference value (see its "todo" field). Not counted toward pass/fail or accuracy.'
    };
  }

  let actual;
  try {
    actual = computeActual(ds.inputGasValues);
  } catch (err) {
    return { datasetId: ds.datasetId, status: 'FAIL', pass: false, provenance: ds.provenance, error: String((err && err.message) || err) };
  }

  const checks = [];

  if (ds.expectedZone != null) {
    checks.push({ field: 'zone', ...cmp.stringMatch(actual.zone, ds.expectedZone) });
  }

  if (ds.expectedResult != null) {
    if (Array.isArray(ds.expectedResult)) {
      // Order-independent comparison for methods that return multiple flags (e.g. CIGRE).
      const a = JSON.stringify([...(actual.resultList || [])].sort());
      const e = JSON.stringify([...ds.expectedResult].sort());
      checks.push({ field: 'result', ...cmp.exactMatch(a, e) });
    } else {
      checks.push({ field: 'result', ...cmp.stringMatch(actual.result, ds.expectedResult) });
    }
  }

  if (ds.expectedRatios) {
    Object.entries(ds.expectedRatios).forEach(([key, expectedVal]) => {
      if (expectedVal == null) return;
      const actualVal = actual.ratios ? actual.ratios[key] : undefined;
      if (typeof expectedVal === 'string') {
        checks.push({ field: 'ratio.' + key, ...cmp.stringMatch(actualVal, expectedVal) });
      } else {
        checks.push({ field: 'ratio.' + key, ...cmp.floatTolerance(actualVal, expectedVal, RATIO_TOLERANCE) });
      }
    });
  }

  const pass = checks.length > 0 && checks.every((c) => c.pass);
  return { datasetId: ds.datasetId, status: pass ? 'PASS' : 'FAIL', pass, provenance: ds.provenance, checks };
}

/** Roll up a list of per-dataset results into a method-level summary. */
function summarize(methodName, results) {
  const evaluated = results.filter((r) => r.status !== 'SKIPPED');
  const pass = evaluated.filter((r) => r.pass).length;
  const fail = evaluated.filter((r) => !r.pass).length;
  const skipped = results.length - evaluated.length;
  const accuracy = evaluated.length ? Math.round((pass / evaluated.length) * 1000) / 10 : null;
  return {
    method: methodName,
    datasetCount: results.length,
    evaluated: evaluated.length,
    pass,
    fail,
    skipped,
    accuracy, // percentage, one decimal place; null when nothing was evaluated
    overallStatus: evaluated.length === 0 ? 'NO DATA' : (fail === 0 ? 'PASS' : 'FAIL'),
    results
  };
}

// ── Per-method validation runners (Task 3) ─────────────────────────────

/**
 * Duval covers both triangles (Triangle 1 = main tank, Triangle 2 = OLTC).
 * They share one function per the spec's function-name list; the return
 * value exposes both individual breakdowns plus a combined summary so
 * callers can inspect either granularity.
 */
function runDuvalValidation() {
  const T = loadEngine();

  const d1 = loadDatasetFile('Duval1/duval1.datasets.json').datasets.map((ds) =>
    evalDataset(ds, (g) => {
      const r = T.engine.duval.calcDuval(g);
      return { zone: r.zone, result: r.name, ratios: { pCH4: r.pCH4, pC2H4: r.pC2H4, pC2H2: r.pC2H2, total: r.total } };
    })
  );
  const d2 = loadDatasetFile('Duval2/duval2.datasets.json').datasets.map((ds) =>
    evalDataset(ds, (g) => {
      const r = T.engine.duval2.calcDuval2(g);
      return { zone: r.zone, result: r.name, ratios: { pCH4: r.pCH4, pC2H4: r.pC2H4, pC2H2: r.pC2H2, total: r.total } };
    })
  );

  const triangle1 = summarize('Duval Triangle 1', d1);
  const triangle2 = summarize('Duval Triangle 2 (OLTC)', d2);
  const summary = summarize('Duval (Triangle 1 + Triangle 2)', d1.concat(d2));
  return { method: 'Duval', triangle1, triangle2, summary };
}

function runRogersValidation() {
  const T = loadEngine();
  const results = loadDatasetFile('Rogers/rogers.datasets.json').datasets.map((ds) =>
    evalDataset(ds, (g) => {
      const r = T.engine.rogers.calcRogers(g);
      return { zone: r.fault, result: r.name, ratios: { R1: r.R1, R2: r.R2, R3: r.R3, R4: r.R4, code: r.code } };
    })
  );
  return summarize('Rogers Ratio', results);
}

function runIECValidation() {
  const T = loadEngine();
  const results = loadDatasetFile('IEC/iec.datasets.json').datasets.map((ds) =>
    evalDataset(ds, (g) => {
      const r = T.engine.iec.calcIEC(g);
      return { zone: r.fault, result: r.name, ratios: { r1: r.r1, r2: r.r2, r3: r.r3 } };
    })
  );
  return summarize('IEC 60599 Three-Ratio', results);
}

function runIEEEValidation() {
  const T = loadEngine();
  const results = loadDatasetFile('IEEE/ieee.datasets.json').datasets.map((ds) =>
    evalDataset(ds, (g) => {
      const r = T.engine.ieee.calcIEEE(g);
      return { zone: String(r.maxCond), result: r.condName, ratios: null };
    })
  );
  return summarize('IEEE C57.104', results);
}

function runKeyGasValidation() {
  const T = loadEngine();
  const results = loadDatasetFile('KeyGas/keygas.datasets.json').datasets.map((ds) =>
    evalDataset(ds, (g) => {
      const r = T.engine.keygas.calcKeyGas(g);
      return { zone: r.fault, result: r.name, ratios: { TDCG: r.TDCG, tdcgCond: r.tdcgCond } };
    })
  );
  return summarize('Key Gas + TDCG', results);
}

function runDoernenburgValidation() {
  const T = loadEngine();
  const results = loadDatasetFile('Doernenburg/doernenburg.datasets.json').datasets.map((ds) =>
    evalDataset(ds, (g) => {
      const r = T.engine.doernenburg.calcDoernenburg(g);
      return { zone: r.fault, result: r.name, ratios: { R1: r.R1, R2: r.R2, R3: r.R3, R4: r.R4 } };
    })
  );
  return summarize('Doernenburg', results);
}

function runCIGREValidation() {
  const T = loadEngine();
  const results = loadDatasetFile('CIGRE/cigre.datasets.json').datasets.map((ds) =>
    evalDataset(ds, (g) => {
      const r = T.engine.cigre.calcCIGRE(g);
      return { zone: null, result: null, resultList: r.flags.map((f) => f.name), ratios: { k1: r.k1, k2: r.k2, r1: r.r1, r2: r.r2, r3: r.r3 } };
    })
  );
  return summarize('CIGRE 5-Key-Ratio', results);
}

/**
 * THI has no independent gas-reading logic of its own — calcRiskScore takes
 * the already-computed duval/rogers/iec/ieee/keygas results as arguments.
 * The runner reproduces exactly that composition (never a shortcut formula
 * of its own) before comparing the score.
 */
function runTHIValidation() {
  const T = loadEngine();
  const results = loadDatasetFile('THI/thi.datasets.json').datasets.map((ds) =>
    evalDataset(ds, (g) => {
      const duval = T.engine.duval.calcDuval(g);
      const rogers = T.engine.rogers.calcRogers(g);
      const iec = T.engine.iec.calcIEC(g);
      const ieee = T.engine.ieee.calcIEEE(g);
      const keygas = T.engine.keygas.calcKeyGas(g);
      const risk = T.engine.thi.calcRiskScore(duval, rogers, iec, ieee, keygas);
      const health = T.engine.thi.healthCategoryFor(risk);
      return { zone: null, result: health.label, ratios: { risk } };
    })
  );
  return summarize('Transformer Health Index', results);
}

/**
 * Runs every method's validation and rolls the results up into one report
 * object (Task 4). This is the function a CI/release gate should call
 * (Task 6): a non-empty `totals.fail` means the release must not proceed.
 */
function runAllValidation() {
  const duval = runDuvalValidation();
  const rogers = runRogersValidation();
  const iec = runIECValidation();
  const ieee = runIEEEValidation();
  const keygas = runKeyGasValidation();
  const doernenburg = runDoernenburgValidation();
  const cigre = runCIGREValidation();
  const thi = runTHIValidation();

  const methodSummaries = [duval.summary, rogers, iec, ieee, keygas, doernenburg, cigre, thi];
  const totalDatasets = methodSummaries.reduce((s, m) => s + m.datasetCount, 0);
  const totalEvaluated = methodSummaries.reduce((s, m) => s + m.evaluated, 0);
  const totalPass = methodSummaries.reduce((s, m) => s + m.pass, 0);
  const totalFail = methodSummaries.reduce((s, m) => s + m.fail, 0);
  const totalSkipped = methodSummaries.reduce((s, m) => s + m.skipped, 0);
  const overallAccuracy = totalEvaluated ? Math.round((totalPass / totalEvaluated) * 1000) / 10 : null;

  return {
    generatedAt: new Date().toISOString(),
    methods: {
      'Duval Triangle 1': duval.triangle1,
      'Duval Triangle 2 (OLTC)': duval.triangle2,
      'Rogers Ratio': rogers,
      'IEC 60599 Three-Ratio': iec,
      'IEEE C57.104': ieee,
      'Key Gas + TDCG': keygas,
      'Doernenburg': doernenburg,
      'CIGRE 5-Key-Ratio': cigre,
      'Transformer Health Index': thi
    },
    totals: {
      datasetCount: totalDatasets,
      evaluated: totalEvaluated,
      pass: totalPass,
      fail: totalFail,
      skipped: totalSkipped,
      accuracy: overallAccuracy,
      status: totalFail === 0 ? 'PASS' : 'FAIL'
    }
  };
}

// ── Console report (Task 7) ─────────────────────────────────────────────

/**
 * Prints the fixed-format console report. Follows the exact
 * name-line / status-line / "Overall" / percentage pattern specified for
 * TAILAM's validation output, extended to cover all eight methods the
 * runner actually executes (the spec's example showed six as a template —
 * Doernenburg and CIGRE are included here so the printed report always
 * reflects everything runAllValidation() checked).
 */
function printConsoleReport(report) {
  const lines = [];
  lines.push('================================================');
  lines.push('TAILAM Validation Report');
  const order = [
    ['IEC', 'IEC 60599 Three-Ratio'],
    ['IEEE', 'IEEE C57.104'],
    ['Duval', null], // combined Triangle 1 + Triangle 2
    ['Rogers', 'Rogers Ratio'],
    ['Doernenburg', 'Doernenburg'],
    ['Key Gas', 'Key Gas + TDCG'],
    ['CIGRE', 'CIGRE 5-Key-Ratio'],
    ['THI', 'Transformer Health Index']
  ];
  order.forEach(([label, key]) => {
    lines.push(label);
    if (key === null) {
      const d1 = report.methods['Duval Triangle 1'].overallStatus;
      const d2 = report.methods['Duval Triangle 2 (OLTC)'].overallStatus;
      const status = (d1 === 'FAIL' || d2 === 'FAIL') ? 'FAIL' : (d1 === 'NO DATA' && d2 === 'NO DATA') ? 'NO DATA' : 'PASS';
      lines.push(status);
    } else {
      lines.push(report.methods[key].overallStatus);
    }
  });
  lines.push('Overall');
  lines.push((report.totals.accuracy == null ? 'N/A' : report.totals.accuracy + '%'));
  lines.push('================================================');
  const text = lines.join('\n');
  console.log(text);
  return text;
}

/** Writes the full JSON report to validation/reports/ (developer-facing only). */
function writeReport(report) {
  if (!fs.existsSync(REPORTS_DIR)) fs.mkdirSync(REPORTS_DIR, { recursive: true });
  const file = path.join(REPORTS_DIR, `validation-report-${report.generatedAt.replace(/[:.]/g, '-')}.json`);
  fs.writeFileSync(file, JSON.stringify(report, null, 2), 'utf8');
  return file;
}

module.exports = {
  runIECValidation,
  runIEEEValidation,
  runDuvalValidation,
  runRogersValidation,
  runDoernenburgValidation,
  runKeyGasValidation,
  runCIGREValidation,
  runTHIValidation,
  runAllValidation,
  printConsoleReport,
  writeReport
};

// ── CLI entry point ─────────────────────────────────────────────────────
// `node src/validation/validationRunner.js` — intended for developers/CI,
// never invoked from the browser app or index.html.
if (require.main === module) {
  const report = runAllValidation();
  printConsoleReport(report);
  const savedTo = writeReport(report);
  console.log('\nFull JSON report saved to: ' + savedTo);
  process.exitCode = report.totals.status === 'PASS' ? 0 : 1;
}
