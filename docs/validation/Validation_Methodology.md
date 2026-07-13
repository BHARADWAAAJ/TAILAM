# TAILAM — Validation Methodology

**Purpose of this document:** explain, for an engineering reviewer or a
future maintainer, *how* TAILAM proves its calculation engine behaves
correctly and consistently — as distinct from `src/validation/VALIDATION.md`,
which is the framework's own developer-facing README. This document is the
release-readiness view; that one is the how-to-run view.

## 1. Why validation exists separately from the app

TAILAM's engine (`src/js/engine/*.js`) is pure, dependency-free JavaScript.
It has no automated test coverage of its own beyond manual engineering
review during development. The validation framework in `src/validation/`
closes that gap: it is a **developer/CI-only** tool, never loaded by
`index.html`, never exposed to an end user, whose only job is to run the
same engine functions the browser uses and check their output against
known-good reference data.

## 2. Two kinds of reference data

Every validation dataset (`src/validation/datasets/<Method>/*.json`) is
tagged with a `provenance` field, and the two kinds are treated
differently by the validation runner:

| Provenance | What it proves | Counted in PASS/FAIL? |
|---|---|---|
| `published-standard` | Standards conformance — the engine reproduces a worked example from IEC 60599, IEEE C57.104, or CIGRE literature | Only once populated (see §4) |
| `engine-snapshot` | Regression safety — the engine still returns today what it returned when the snapshot was captured | Yes, always |

This distinction matters: a validation suite that reports 100% PASS is
only meaningful if the reader knows what that 100% is measuring. TAILAM's
framework never lets an empty or placeholder expected value silently
"pass" — see `Validation_Checklist.md` for exactly how that's enforced.

## 3. How a validation run works

1. `src/validation/lib/nodeEngineLoader.js` loads the real, unmodified
   `src/js/engine/*.js` files into a Node.js process (by providing the
   `window` global they expect — no engine code is copied, rewritten, or
   transpiled).
2. Each `run<Method>Validation()` function in `validationRunner.js` loads
   its method's dataset file(s), calls the actual engine function on every
   non-placeholder dataset's input gas values, and compares the result to
   the dataset's expected value using one of four comparison strategies
   (`src/validation/lib/compare.js`): exact match, string match, floating-
   point tolerance, or percentage difference.
3. `runAllValidation()` runs all eight per-method validators (Duval
   internally covers both triangles) and rolls the results into one report
   with a per-method Pass/Fail/Accuracy summary and an overall percentage.
4. The runner prints a fixed-format console report and writes a full JSON
   report to `src/validation/reports/`.

## 4. Standards-conformance status (honest disclosure)

As of Version 1.0, every method has **structural placeholders** for
published-standard worked examples (`provenance: "published-standard"`,
`status: "PLACEHOLDER"`) with `expected*` fields left `null` and a `todo`
field describing exactly what needs to be sourced. These do not count
toward the pass/fail percentage — they are reported as `SKIPPED`.

**What this means in practice:** Version 1.0's 100% validation pass rate
demonstrates **regression safety** (the engine has not silently drifted
from its own established behavior) and **structural completeness** (every
method has a working, runnable validation path). It does not yet claim
standards-conformance proof against a third-party published example —
that requires populating the placeholders with values transcribed from the
official IEC/IEEE/CIGRE documents, which is licensed reference material
TAILAM does not redistribute. See `Reference_Datasets.md` §3 for the
process to add these.

## 5. Relationship to the engine-freeze policy

Because `runAllValidation()` exists and is runnable, any future change to
`src/js/engine/*.js` can be checked against the current snapshot baseline
before release — see `Regression_Process.md`. This is what makes it safe
to say the engine is "frozen": frozen does not mean unmaintainable, it
means any future change must pass through this validation gate first.

## 6. Where everything lives

```
src/validation/
├── VALIDATION.md          Developer-facing framework README (how to run, how to extend)
├── validationRunner.js    The runner — 8 per-method functions + runAllValidation()
├── lib/
│   ├── nodeEngineLoader.js
│   └── compare.js
├── datasets/<Method>/*.json
└── reports/                Timestamped JSON output from each run (git-ignorable scratch)
```
