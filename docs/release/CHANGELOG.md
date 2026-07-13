# Changelog

All notable changes to TAILAM are documented in this file. Format is
loosely based on [Keep a Changelog](https://keepachangelog.com/); TAILAM
does not yet follow strict Semantic Versioning tags for pre-1.0 internal
milestones, but will from `1.0.0` onward (see `ROADMAP.md`).

## [1.0.0] — 2026.07

### Added
- Eight-method main-tank diagnostic engine: Duval Triangle 1, Rogers
  4-ratio, IEC 60599 3-ratio, IEEE C57.104, Key Gas + TDCG, Doernenburg,
  CIGRE 5-key-ratio, CO₂/CO paper involvement, and O₂ interpretation.
- Independent OLTC diagnostic engine: Duval Triangle 2, CIGRE TB 443 TGC
  comparison, three OLTC diagnostic ratios, tap-normalized C₂H₂ check,
  cross-contamination detection, IEC 60599 §9 below-typical gate.
- Weighted Transformer Health Index (0–100 composite score) and
  cross-method agreement/confidence for the main tank.
- The Engineering Workspace: an eleven-section results layout (Snapshot,
  Status, Assessment, Operational Decision, Action Plan, Health Index,
  Interpretation, Supporting Evidence, Diagnostic Methods table, Raw
  Calculations, References) shared by both analysis types.
- Clickable Duval Triangle detail modal with zone explanation and IEC
  reference.
- PDF, styled Excel (.xlsx), and CSV-fallback export, strictly separated
  per analysis type.
- Dark/light theme with persistence and print/export-safe light-mode
  canvas rendering.
- Unsaved-analysis navigation guard (export/discard/cancel) to prevent
  accidental loss of an unexported report.
- Internal engineering validation framework (`src/validation/`) — Node-
  runnable regression checks against the live, unmodified engine, with a
  structured pass/fail report per method.
- Full documentation set: architecture, standards implementation notes,
  validation methodology, user guide, and this release documentation.

### Changed (during pre-1.0 development)
- Converted from ES module (`import`/`export`) syntax to plain namespaced
  scripts (`window.TAILAM.*`) to support opening `index.html` directly via
  `file://`, which browsers block for ES modules under CORS restrictions.
- Restructured the results panel from ad hoc per-method cards into the
  unified Engineering Workspace (see above), built as a presentation-only
  layer that reads — never recomputes — existing engine output.
- Multiple production-hardening passes: removed dead code and duplicate
  logic, hoisted static canvas-rendering data to avoid unnecessary
  re-allocation, added defensive DOM-null-guards, standardized module
  syntax, and expanded JSDoc coverage — all verified behavior-identical
  to what preceded them.

### Fixed (during pre-1.0 development)
- Duval Triangle detail-modal close button id mismatch between markup and
  event wiring.
- Duplicate-canvas-id risk when the Duval Triangle was made the primary
  visual element (resolved by removing the redundant copy from the Raw
  Calculations panel).

### Frozen as of 1.0.0
- All engineering calculations, thresholds, and zone geometry in
  `src/js/engine/`.
- Application UI layout and styling.
- PDF and Excel export formats.

No prior version was publicly tagged; `1.0.0` is TAILAM's first Version 1
release. See `RELEASE_NOTES_v1.0.0.md` for the full release summary and
`ROADMAP.md` for what's planned beyond it.
