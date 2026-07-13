# TAILAM Engineering Validation Framework

Internal developer/CI tooling. **Not part of the shipped app** — nothing under
`src/validation/` is loaded by `index.html`, referenced from any UI file, or
reachable by an end user. It exists to prove that TAILAM's diagnostic engine
(`src/js/engine/*.js`) keeps producing the results it's supposed to produce,
run after run, revision after revision.

## Purpose

TAILAM's engineering value depends entirely on its calculation engine being
correct and staying correct. The UI can be redesigned freely (and has been,
sprint over sprint) without ever touching the numbers underneath — this
framework is what makes that safe. It exists to:

1. Prove each diagnostic method (Duval Triangles 1 & 2, Rogers, IEC 60599,
   IEEE C57.104, Key Gas/TDCG, Doernenburg, CIGRE, THI) produces the result
   expected for a given gas input.
2. Catch regressions — a future code change that silently alters a
   threshold, a zone boundary, or a weighting must fail validation, not
   ship quietly.
3. Give every engineering method the same, repeatable check, run the same
   way, reported the same way.

It does **not** replace engineering review of the standards themselves, and
it does not (yet) prove standards conformance for every method — see
"Provenance" below for exactly what today's datasets do and don't establish.

## Folder structure

```
src/validation/
├── VALIDATION.md            this file
├── validationRunner.js      the runner: 8 per-method functions + runAllValidation()
├── lib/
│   ├── nodeEngineLoader.js  loads the unmodified src/js engine files into Node
│   └── compare.js           exactMatch / stringMatch / floatTolerance / percentDifference
├── datasets/
│   ├── Duval1/duval1.datasets.json
│   ├── Duval2/duval2.datasets.json
│   ├── Rogers/rogers.datasets.json
│   ├── IEC/iec.datasets.json
│   ├── IEEE/ieee.datasets.json
│   ├── KeyGas/keygas.datasets.json
│   ├── Doernenburg/doernenburg.datasets.json
│   ├── CIGRE/cigre.datasets.json
│   └── THI/thi.datasets.json
└── reports/                 runAllValidation() writes a timestamped JSON report here (gitignored-style scratch output, safe to delete)
```

## How the engine is loaded

`lib/nodeEngineLoader.js` does **not** duplicate, rewrite, or reimplement any
engine logic. The files in `src/js/engine/*.js` are plain browser scripts —
`(function () { ... })()` blocks that publish onto `window.TAILAM.*`. The
loader's only job is to set `global.window` to a plain object before
`require()`-ing each file, so the exact same code that runs in the browser
also runs under Node. If you add a new engine file, add its path to the
`files` array in `nodeEngineLoader.js`, in dependency order (anything that
reads `window.TAILAM.engine.X` at load time must come after `X`).

## Dataset format

Every dataset file is one JSON object: method metadata plus a `datasets`
array. Each entry in that array has:

| Field | Meaning |
|---|---|
| `datasetId` | unique id, e.g. `DUVAL1-SNAP-001` |
| `provenance` | `"published-standard"` or `"engine-snapshot"` — see below |
| `status` | `PLACEHOLDER`, `SNAPSHOT`, or `REFERENCE` |
| `description` | what this case is and why it exists |
| `inputGasValues` | `{ h2, ch4, c2h6, c2h4, c2h2, co, co2 }` in ppm (unused gases may be 0) |
| `expectedResult` | the expected diagnosis name/label (or array of flag names for CIGRE) |
| `expectedZone` | the expected zone/fault code, where the method has one |
| `expectedRatios` | expected numeric ratios/percentages, compared with a tolerance |
| `referenceStandard` | which standard this case is meant to represent |
| `revision` | the standard's edition/year |
| `todo` | (placeholders only) what needs to be sourced before this becomes a real reference case |

### Provenance — please read this before trusting a PASS

Every dataset is one of two kinds, and the runner treats them differently:

- **`published-standard` / `status: PLACEHOLDER`** — a structural stub. Its
  `expectedResult`/`expectedZone`/`expectedRatios` are `null` and its
  `inputGasValues` are zeroed out. **The runner does not evaluate these — it
  reports them as `SKIPPED`, never PASS or FAIL.** They exist to mark where a
  genuine worked example from IEC 60599:2022, IEEE C57.104, or CIGRE TB 771/443
  needs to be transcribed in. Nobody invented an engineering value to fill
  these in — that was an explicit instruction for this sprint, and a
  placeholder that silently "passed" against a fabricated number would be far
  more dangerous than an honest gap.
- **`engine-snapshot` / `status: SNAPSHOT`** — a real gas input run through
  the current, unmodified engine once, with its actual output captured as
  the expected value (`capturedOn` records when). These **are** evaluated
  and can PASS/FAIL. A snapshot dataset does not prove IEC/IEEE/CIGRE
  conformance — it proves the engine still does today what it did on the
  date it was captured. That is exactly the regression-safety goal from
  Task 6: if a future change to `duval.js`, `rogers.js`, etc. shifts a
  threshold or a zone boundary, the matching snapshot dataset fails and
  `runAllValidation()` returns FAIL.

Today, every method has both kinds: a `PLACEHOLDER` waiting on a published
example, and one or more `SNAPSHOT` cases giving immediate, real regression
coverage. THI is the one exception — it's TAILAM's own internal composite
weighting, not a value published by IEC/IEEE/CIGRE, so it only has
`engine-snapshot` datasets; there is nothing external to cite as a
"published-standard" case for it.

## How validation works

`validationRunner.js` exports one function per method plus the orchestrator:

```js
const {
  runIECValidation, runIEEEValidation, runDuvalValidation, runRogersValidation,
  runDoernenburgValidation, runKeyGasValidation, runCIGREValidation, runTHIValidation,
  runAllValidation
} = require('./validationRunner.js');
```

Each `run*Validation()` function: loads its dataset file(s), calls the real
engine function on each non-placeholder dataset's `inputGasValues`, and
compares actual vs. expected using `lib/compare.js`:

- **`exactMatch`** — strict `===`, used for CIGRE's sorted flag-name list.
- **`stringMatch`** — trimmed string comparison (optionally case-insensitive), used for zone/fault codes and diagnosis names.
- **`floatTolerance`** — `|actual − expected| ≤ tolerance` (default tolerance in the runner is `0.01`), used for ratios and percentages.
- **`percentDifference`** — `|actual − expected| / |expected| × 100 ≤ maxPercent`, available for cases where a relative rather than absolute tolerance makes more sense.

`runDuvalValidation()` covers **both** Duval triangles (Triangle 1 for the
main tank, Triangle 2 for the OLTC) — the task spec names one function for
"Duval," so it returns `{ triangle1, triangle2, summary }`, where `summary`
is the combined pass/fail count and the two triangles are also broken out
individually.

`runAllValidation()` calls all eight, rolls every method's summary into one
report object (`{ generatedAt, methods: {...}, totals: {...} }`), and that
report is what `printConsoleReport()` and `writeReport()` consume.

## Running it

From a terminal, with Node installed:

```
node src/validation/validationRunner.js
```

This prints the fixed-format console report, writes the full JSON report to
`src/validation/reports/validation-report-<timestamp>.json`, and exits with
code `0` if every evaluated dataset passed, or `1` if any failed — so it can
be wired into a CI step or a pre-release checklist directly:

```
node src/validation/validationRunner.js || exit 1
```

Console output looks like:

```
================================================
TAILAM Validation Report
IEC
PASS
IEEE
PASS
Duval
PASS
Rogers
PASS
Doernenburg
PASS
Key Gas
PASS
CIGRE
PASS
THI
PASS
Overall
100%
================================================
```

(Doernenburg and CIGRE are included alongside the six methods named in the
original report template, since `runAllValidation()` genuinely executes all
eight — the console report always reflects everything that was checked.)

## Regression framework (Task 6)

Treat `runAllValidation()` as a release gate: run it before shipping any
change that touches `src/js/engine/*.js`, `src/js/ui/workspace.js`, or
anything the engine depends on. If `totals.fail > 0`, something the engine
used to compute has changed — find out why before releasing. A `SKIPPED`
placeholder dataset never blocks a release; only a real `FAIL` on an
evaluated (`SNAPSHOT` or `REFERENCE`) dataset does.

## How to add new datasets

1. Pick the method's folder under `datasets/`.
2. Add a new object to that file's `datasets` array with a unique
   `datasetId`.
3. If you have a genuine published worked example: set
   `provenance: "published-standard"`, `status: "REFERENCE"`, fill in every
   field with the real values from the standard, and cite the exact clause
   in `referenceStandard`/`revision`. Do not estimate or round a published
   figure to make it "cleaner" — transcribe it exactly.
4. If you just want more regression coverage: set
   `provenance: "engine-snapshot"`, `status: "SNAPSHOT"`, pick an
   `inputGasValues` set, run the relevant `run*Validation()` function once
   to see what the engine currently returns, and record that as
   `expectedResult`/`expectedZone`/`expectedRatios` with `capturedOn` set to
   today's date.
5. Re-run `node src/validation/validationRunner.js` and confirm the new
   dataset reports PASS before committing it.

## How to interpret failures

A `FAIL` on a `SNAPSHOT` dataset means the engine's output changed since the
snapshot was captured. Two possibilities:

- **The engine has a real bug or an unintended threshold change** — fix the
  engine, re-run validation, confirm it returns to PASS.
- **The engine change was intentional** (a deliberate, reviewed update to a
  threshold or algorithm) — re-capture the snapshot: run the method's
  validator, record the new actual output as the new `expectedResult`/
  `expectedZone`/`expectedRatios`, update `capturedOn`, and note in the
  dataset's `description` why the value changed and when/where it was
  reviewed. Never silently overwrite a snapshot without recording the reason
  — that defeats the purpose of having it.

A `FAIL` on a `REFERENCE` (published-standard) dataset is more serious: it
means TAILAM's engine disagrees with a cited, verified published example.
That should block release until resolved — either the engine has a genuine
defect, or the dataset was transcribed incorrectly and needs re-checking
against the source.

`SKIPPED` is not a failure — it means the dataset is a structural
placeholder with no verified expected value yet. Track these separately as
a backlog of standards-conformance work; they don't gate releases.

## Extensibility (Task 9)

The dataset schema, the loader, and the runner were all written so that
future work never has to touch existing datasets:

- **New standard revisions** (e.g. a future IEC 60599 edition) can be added
  as new datasets with a different `revision` value in the same method
  folder — old datasets stay as-is, dated to their own revision.
- **New diagnostic methods** (e.g. a future Duval Pentagon) need: a new
  `datasets/<Method>/` folder following the same schema, one new
  `run<Method>Validation()` function in `validationRunner.js` following the
  existing pattern (load dataset → call the real engine function → compare
  with `lib/compare.js`), and one new line added to `runAllValidation()`'s
  method list and to `printConsoleReport()`'s `order` array. No existing
  method's code or data changes.
- **New comparison needs** can be added to `lib/compare.js` as a new
  exported function without touching the four that already exist.

## What this framework explicitly does not do

Per the sprint that created it: it does not touch `index.html`, any CSS
file, any file in `src/js/engine/`, `src/js/ui/export.js`, or any other
existing application file — it is purely additive. It is not exposed in the
UI and has no user-facing screen; it is a developer/CI tool, run from a
terminal, read by engineers.
