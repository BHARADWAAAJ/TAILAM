/**
 * TAILAM — validation/lib/compare.js
 *
 * Shared comparison utility for the validation framework (Task 5).
 * Four comparison strategies, all engine-agnostic and side-effect free.
 * This file contains NO engineering thresholds — tolerances are validation
 * parameters (how strictly we compare), not engineering limits.
 *
 * Plain Node CommonJS module (validation framework only — never loaded by
 * the browser app, never referenced from index.html).
 */
'use strict';

/**
 * Strict equality (numbers, booleans, or exact strings).
 * @returns {{pass:boolean, method:string, actual:*, expected:*}}
 */
function exactMatch(actual, expected) {
  return { method: 'exactMatch', pass: actual === expected, actual, expected };
}

/**
 * String comparison with optional case-insensitivity/trim.
 * @param {*} actual
 * @param {*} expected
 * @param {{caseSensitive?:boolean, trim?:boolean}} [opts]
 */
function stringMatch(actual, expected, opts) {
  opts = opts || {};
  const norm = (v) => {
    let s = String(v == null ? '' : v);
    if (opts.trim !== false) s = s.trim();
    if (opts.caseSensitive === false) s = s.toLowerCase();
    return s;
  };
  const a = norm(actual), e = norm(expected);
  return { method: 'stringMatch', pass: a === e, actual, expected };
}

/**
 * Numeric comparison within an absolute tolerance.
 * @param {*} actual
 * @param {*} expected
 * @param {number} [tolerance=0.001]
 */
function floatTolerance(actual, expected, tolerance) {
  tolerance = tolerance == null ? 0.001 : tolerance;
  if (actual == null || expected == null) {
    return { method: 'floatTolerance', pass: actual === expected, actual, expected, tolerance };
  }
  const a = Number(actual), e = Number(expected);
  if (Number.isNaN(a) || Number.isNaN(e)) {
    return { method: 'floatTolerance', pass: false, actual, expected, tolerance, note: 'non-numeric value' };
  }
  const delta = Math.abs(a - e);
  return { method: 'floatTolerance', pass: delta <= tolerance, actual, expected, tolerance, delta };
}

/**
 * Numeric comparison within a maximum percentage difference of the
 * expected value. expected === 0 requires actual === 0 to pass (percentage
 * difference is undefined at zero).
 * @param {*} actual
 * @param {*} expected
 * @param {number} [maxPercent=1] - max allowed |actual-expected|/|expected| * 100
 */
function percentDifference(actual, expected, maxPercent) {
  maxPercent = maxPercent == null ? 1 : maxPercent;
  const a = Number(actual), e = Number(expected);
  if (Number.isNaN(a) || Number.isNaN(e)) {
    return { method: 'percentDifference', pass: false, actual, expected, maxPercent, note: 'non-numeric value' };
  }
  if (e === 0) {
    return { method: 'percentDifference', pass: a === 0, actual, expected, maxPercent };
  }
  const percentDiff = Math.abs((a - e) / e) * 100;
  return { method: 'percentDifference', pass: percentDiff <= maxPercent, actual, expected, maxPercent, percentDiff };
}

module.exports = { exactMatch, stringMatch, floatTolerance, percentDifference };
