# TAILAM — Reference Datasets

Describes the dataset schema used across `src/validation/datasets/` and
the process for expanding it — including converting today's structural
placeholders into genuine standards-conformance references.

## 1. Dataset schema

Each `datasets/<Method>/*.json` file is one object: method metadata plus a
`datasets` array. Every entry in that array has:

| Field | Type | Meaning |
|---|---|---|
| `datasetId` | string | Unique id, e.g. `DUVAL1-SNAP-001` |
| `provenance` | `"published-standard"` \| `"engine-snapshot"` | Where the expected value came from — see `Validation_Methodology.md` §2 |
| `status` | `"PLACEHOLDER"` \| `"SNAPSHOT"` \| `"REFERENCE"` | Whether this dataset is evaluated |
| `description` | string | What this case is and why it exists |
| `inputGasValues` | object | `{h2, ch4, c2h6, c2h4, c2h2, co, co2}` in ppm |
| `expectedResult` | string \| string[] \| null | Expected diagnosis name/label (array for CIGRE's multi-flag output) |
| `expectedZone` | string \| null | Expected zone/fault code, where the method has one |
| `expectedRatios` | object \| null | Expected numeric ratios/percentages |
| `referenceStandard` | string | Which standard this case represents |
| `revision` | string | The standard's edition/year |
| `capturedOn` | string (snapshot only) | Date the engine-snapshot value was captured |
| `todo` | string (placeholder only) | What needs to be sourced before this becomes a REFERENCE dataset |

## 2. Current dataset inventory (Version 1.0)

| Method | Folder | Datasets | Placeholder | Snapshot |
|---|---|---|---|---|
| Duval Triangle 1 | `datasets/Duval1/` | 3 | 1 | 2 |
| Duval Triangle 2 (OLTC) | `datasets/Duval2/` | 5 | 1 | 4 |
| Rogers Ratio | `datasets/Rogers/` | 3 | 1 | 2 |
| IEC 60599 Three-Ratio | `datasets/IEC/` | 3 | 1 | 2 |
| IEEE C57.104 | `datasets/IEEE/` | 3 | 1 | 2 |
| Key Gas + TDCG | `datasets/KeyGas/` | 3 | 1 | 2 |
| Doernenburg | `datasets/Doernenburg/` | 3 | 1 | 2 |
| CIGRE 5-Key-Ratio | `datasets/CIGRE/` | 3 | 1 | 2 |
| Transformer Health Index | `datasets/THI/` | 2 | 0 | 2 |

THI has no published-standard placeholder because it is TAILAM's own
internal composite weighting (documented in `docs/architecture/Calculation_Flow.md`),
not a value published by any external standards body — there is nothing
external to source a reference case from.

## 3. Converting a placeholder into a REFERENCE dataset

This is the path to strengthening TAILAM's standards-conformance evidence
in a future release, without touching the engine:

1. Obtain the official standard document (IEC 60599:2022, IEEE C57.104,
   or the relevant CIGRE Technical Brochure) through a licensed channel.
2. Locate a worked example — most of these standards publish at least one
   illustrative gas-concentration case with its resulting classification.
3. Transcribe the gas values and resulting classification exactly into the
   placeholder dataset's `inputGasValues` and `expectedZone`/`expectedResult`/
   `expectedRatios` fields. Do not round, adjust, or "clean up" a published
   figure.
4. Set `status` to `"REFERENCE"` and cite the exact clause/table/figure in
   `referenceStandard`.
5. Run `node src/validation/validationRunner.js` and confirm the new
   dataset reports `PASS`. If it reports `FAIL`, that is a serious finding
   — see `Validation_Checklist.md` §3 — and must be investigated before
   the dataset is committed as a REFERENCE case.

## 4. Adding a new engine-snapshot dataset

For ongoing regression coverage (not standards-conformance), no external
document is needed:

1. Pick a representative gas input for the method (ideally covering a zone
   or fault code not already exercised by existing snapshots).
2. Run the relevant `run<Method>Validation()` function once against that
   input, or call the engine function directly, to see what the engine
   currently returns.
3. Record that output as `expectedResult`/`expectedZone`/`expectedRatios`
   with `provenance: "engine-snapshot"`, `status: "SNAPSHOT"`, and
   `capturedOn` set to the current date.
4. Re-run the full suite to confirm `PASS`.

## 5. What must never happen to a dataset

- An engine-snapshot's `expected*` value must never be edited to match a
  new engine output without a recorded reason (see
  `Regression_Process.md` §3) — that would silently hide a behavior
  change instead of surfacing it.
- A placeholder must never be given a fabricated `expected*` value that
  isn't actually transcribed from the cited standard — an unverified
  number is more dangerous than an honest `SKIPPED`.
