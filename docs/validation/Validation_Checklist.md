# TAILAM — Validation Checklist

A concrete PASS/FAIL/SKIP reference for anyone reading a validation report,
and the checklist a maintainer should run before tagging any release that
touches `src/js/engine/`.

## 1. Per-dataset outcome definitions

| Outcome | Meaning | Counted toward accuracy % |
|---|---|---|
| `PASS` | Every comparison check for this dataset succeeded | Yes |
| `FAIL` | At least one comparison check for this dataset failed, or the engine call itself threw | Yes |
| `SKIPPED` | Dataset is a `PLACEHOLDER` (no verified expected value yet) | No |

A dataset can only be `PASS` or `FAIL` if it has real `expected*` values
(`status: "SNAPSHOT"` or `status: "REFERENCE"`). A `PLACEHOLDER` dataset
can never register a false PASS — this is enforced in
`validationRunner.js#evalDataset`, which returns `SKIPPED` before any
comparison is attempted.

## 2. Per-method PASS criteria

A method (e.g. "Rogers Ratio") is reported as method-level `PASS` when:

- At least one dataset was evaluated (not all placeholders), **and**
- Every evaluated dataset returned `PASS`.

A method with zero evaluated datasets reports `NO DATA` rather than a
misleading `PASS` — this cannot currently happen for any of the eight
methods (each has at least one `SNAPSHOT` dataset), but the runner handles
it explicitly in case a future dataset file is emptied by mistake.

## 3. Overall release-gate criteria

`runAllValidation()`'s `totals.status` is:

- `PASS` when `totals.fail === 0` across every method.
- `FAIL` when any evaluated dataset, in any method, failed.

**Release rule:** a release that touches `src/js/engine/` must not ship
with `totals.status !== "PASS"`. See `Regression_Process.md` for the full
procedure.

## 4. Pre-release checklist

Run through this list before tagging any release:

- [ ] `node src/validation/validationRunner.js` exits with code `0`
- [ ] The printed console report shows `PASS` for all eight methods
- [ ] `totals.accuracy` in the JSON report is `100` (of evaluated datasets —
      see `Validation_Methodology.md` §4 for what "evaluated" excludes)
- [ ] No new `PLACEHOLDER` dataset was accidentally left with a non-null
      `expected*` value (that would silently change its `status` handling —
      placeholders should always have `expected*: null`)
- [ ] If any engine file changed, its `SNAPSHOT` datasets were deliberately
      re-captured (not just left to fail) with a documented reason — see
      `Regression_Process.md` §3
- [ ] `VERSION.json` and `docs/release/CHANGELOG.md` reflect the change

## 5. Comparison-strategy quick reference

| Strategy | Used for | Behavior |
|---|---|---|
| `exactMatch` | CIGRE's sorted flag-name list | Strict `===` |
| `stringMatch` | Zone codes, fault names, diagnosis text | Trimmed string comparison |
| `floatTolerance` | Ratios, percentages | `\|actual − expected\| ≤ tolerance` (0.01 default in the runner) |
| `percentDifference` | Available for relative-tolerance cases | `\|actual − expected\| / \|expected\| × 100 ≤ maxPercent` |

Full implementation: `src/validation/lib/compare.js`.
