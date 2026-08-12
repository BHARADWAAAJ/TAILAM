# TAILAM Version 1.0.0 — Release Notes

**Release build:** 2026.07 · **Edition:** Community · **Status:** Stable

TAILAM (Transformer Assessment for Insulating Liquid Analysis &
Monitoring) Version 1.0.0 is the first stable release of a client-side,
standards-based Dissolved Gas Analysis (DGA) interpretation tool for power
transformer main tanks and on-load tap changers (OLTCs).

## Major features

- **Two fully independent analysis workflows** — Main Tank and OLTC — each
  with its own inputs, engine, rendering, and export, so the two
  diagnostically distinct oil compartments can never be mixed.
- **The Engineering Workspace** — a single, consistent eleven-section
  results layout (five-second Snapshot down to full Raw Calculations)
  used by both workflows, designed to read like a professional engineering
  assessment rather than a raw calculator dump.
- **Multi-method cross-checking** — the main tank result combines three
  independent primary classification methods plus five supporting
  methods, with an explicit agreement/confidence indicator rather than
  presenting a single method's output as the only answer.
- **A Transformer Health Index** — one weighted 0–100 composite score
  combining five quantitative main-tank methods, with a five-band health
  classification.
- **Interactive Duval Triangle visualization** — a large, clickable
  triangle plot for both Triangle 1 (main tank) and Triangle 2 (OLTC),
  with a detail modal explaining the plotted zone.
- **Three export formats** — PDF (print-ready), styled Excel with an
  embedded triangle image, and an automatic CSV fallback with zero
  external dependencies.
- **Runs entirely offline** (except the optional styled-Excel library
  load) — no account, no server, no data ever leaves the browser.
- **An internal engineering validation framework** proving the calculation
  engine's regression safety on every change — see
  `docs/validation/Validation_Methodology.md`.

## Engineering methods implemented

| Category | Methods |
|---|---|
| Main tank | Duval Triangle 1, Rogers 4-ratio, IEC 60599 3-ratio, IEEE C57.104 individual gas conditions, Key Gas + TDCG, Doernenburg, CIGRE 5-key-ratio screening, CO₂/CO paper involvement, dissolved-O₂ interpretation |
| OLTC | Duval Triangle 2, CIGRE TB 443 typical gas concentration comparison, three OLTC diagnostic ratios, tap-normalized C₂H₂ check, cross-contamination detection, IEC 60599 §9 below-typical gate |
| Composite | Weighted risk score / health index, cross-method agreement and confidence, standards-referenced maintenance recommendations |

Full implementation detail and standards references: `docs/standards/`.

## Browser compatibility

TAILAM uses standard, current web platform features (CSS custom
properties, the Canvas 2D API, `localStorage`, ES2020 syntax including
optional chaining and nullish coalescing) and no bundler-injected
polyfills. It is built and verified against current versions of:

| Browser | Minimum practical version |
|---|---|
| Google Chrome / Chromium-based (Edge, Brave, Opera) | 80+ |
| Mozilla Firefox | 75+ |
| Safari (macOS/iOS) | 13.1+ |

Internet Explorer (any version) is **not supported** — it does not
implement the JavaScript syntax TAILAM's source uses. This is a scope
boundary, not a defect; see `Known Limitations` below.

## Known limitations

See `docs/release/ROADMAP.md` and `Known_Limitations` (Task 7 of this
sprint, folded into this document per the release-notes format):

- Single-sample analysis only — each run is evaluated independently, with
  no historical record.
- No trending across multiple samples of the same transformer over time.
- No asset database — TAILAM does not track a fleet of transformers; each
  session is a blank slate.
- No laboratory system integration — gas values are entered manually.
- Static browser application — no user accounts, no multi-user
  collaboration, no server-side storage.
- Standards-conformance validation datasets are currently structural
  placeholders pending transcription from licensed standards documents
  (regression-safety validation is fully in place — see
  `docs/validation/Validation_Methodology.md` §4 for the precise
  distinction).

None of the above are defects in Version 1.0 — they are the intentional
scope boundary of a single-session, single-sample diagnostic tool. See
`ROADMAP.md` for how they're addressed in future versions.

## Future enhancements

Summarized here; full detail in `docs/release/ROADMAP.md`:

- **Version 1.1** — minor enhancements within the current single-sample,
  single-session scope.
- **Version 2.0** — trend analysis, fleet health overview, historical
  comparison, laboratory data import, transformer ranking, maintenance
  planning, enterprise reporting.
- **Version 3.0** — enterprise asset management, multi-user collaboration,
  role-based permissions, API integration, cloud synchronization,
  AI-assisted maintenance planning.

## Upgrade notes

This is the first stable release — there is no prior version to migrate
from. Future releases will document upgrade steps here if any manual
action is ever required (expected to be rare, given TAILAM stores no
persistent data beyond a theme preference).

## Acknowledgements

Designed by Bharadwaj. Diagnostic methods per IEC 60599:2022, IEEE
C57.104, CIGRE TB 443 and TB 771, Rogers Ratio, and Doernenburg — see
`docs/standards/` for the full implementation-note set and
`docs/release/LICENSE_NOTICE.md` for standards-copyright attribution.
