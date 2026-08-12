# Changelog

All notable user-facing and developer-facing changes to TAILAM are documented
here. Format loosely follows [Keep a Changelog](https://keepachangelog.com/).
Engineering calculations, thresholds, and standards logic are never listed as
"changed" in this file unless a note explicitly says so — the diagnostic
engine (`src/js/engine/*.js`) has been calculation-frozen and independently
validated (`npm run validate`) throughout every entry below.

## [Unreleased] — 2026-07-31

A full re-verification pass against the currently published standards
(IEC 60599:2022, IEEE C57.104-2019, CIGRE TB 443/771 — all confirmed still
current), followed by a set of concrete improvements found during that
review.

### Added
- **Duval Triangle 4 (Duval 2008)** supplementary low-temperature
  confirmation — the engine already computed this (`calcDuval4`) but nothing
  in the UI ever surfaced it. Now shown automatically whenever the primary
  Duval Triangle 1 zone is PD, T1 or T2 (its documented range of
  applicability): a panel on the Main Tank dashboard, a step in the
  Engineering Workbook, an embedded figure in the PDF report, and a summary
  row in the Excel export.
- **CI**: a GitHub Actions workflow (`.github/workflows/validate.yml`) runs
  the engineering validation suite and the new UI smoke test on every push
  and pull request.
- **UI-layer smoke test** (`src/validation/uiSmokeTest.js`, `npm run
  test:ui`) — loads the real `index.html` and app scripts into `jsdom` and
  runs a fixed gas set through the full Main Tank / OLTC / Workbook / PDF /
  Excel-fallback flow, asserting 31 rendered/exported values. Complements
  the engine validation suite, which cannot see UI-layer regressions.
- **PWA support**: `manifest.json`, a service worker (`sw.js`) precaching
  the full app shell, and app icons (`assets/icons/`). TAILAM now installs
  and works completely offline after the first load — verified by killing
  the server outright and re-running a full analysis with zero network.
- This changelog.

### Fixed
- **CSV export formula-injection hardening** — a transformer name or
  location starting with `=`, `+`, `-` or `@` is now prefixed with a
  guarding apostrophe before being written to the CSV/Excel-fallback export,
  so it can never be interpreted as a formula by Excel/Sheets on reopen
  (OWASP "CSV Injection").
- **Accessibility contrast (WCAG AA)** — an audit across all four theme ×
  accent combinations (dark/light × Teal/Founder's-Edition-Gold) found and
  fixed several text/background pairs that fell under the 4.5:1 minimum for
  normal text: `--text3` (tertiary text) in both themes, and `--accent` /
  `--accent-2` in light mode, where they were used as small text (nav links,
  the hero eyebrow chip, workbook answer values) at only 3.1–3.4:1. A new
  `--accent-ink` token also fixes `.btn-primary`'s white-on-accent text,
  which was only ~2.2:1 in dark mode. All fixes are small, hue-preserving
  adjustments verified against every actual usage; the fault-type and
  health/status color systems were untouched.

## [1.0.0] — Community Edition

Cumulative summary of the work that shipped before the pass above.
Undated because it spans many iterative phases; see git history / prior
session transcripts for finer-grained provenance once this repo is under
version control.

### Engineering Workbook
- Added the "Detailed Engineering Calculations" / Engineering Workbook
  feature: a step-by-step, standards-cited breakdown of every diagnostic
  method (IEC 60599, Rogers, Doernenburg, IEEE C57.104, Key Gas/TDCG, CIGRE,
  THI, Duval Triangles 1 & 2), opened from either analysis panel.
- Standardized every method chapter to the same template (Engineering
  Reference panel, Engineering Notes, expanded calculation steps, expanded
  final diagnosis with typical causes/follow-up actions, "What We Learned"
  summary, limitations panel, and a closing References chapter).
- Migrated the on-screen Duval Triangles from `<canvas>` to SVG
  (`ui/duval-svg.js`) for crisper, non-evictable rendering; canvas is
  retained only for PDF/Excel image export.
- Added Table of Contents, sticky in-modal header, step navigation,
  collapsible steps, and a reading-progress bar to the Workbook modal.
- Converted the Workbook into a focus-trapped modal (Escape/backdrop
  dismiss, per-panel scroll-position memory for the session).

### Navigation, layout & mobile
- Converted the top navigation into a sticky header (clean at rest, subtle
  shadow + blur once scrolled), kept correctly behind the Workbook modal.
- Removed the on-page "Raw Calculations" section (superseded by the
  Workbook); its DOM carriers are retained but hidden so the existing
  render pipeline needs no changes.
- Fixed a mobile bug where, after running an analysis, the page would be
  auto-scaled down by the browser — root cause was a 7-column diagnostic
  table forcing a CSS Grid track to blow out past the viewport width; wide
  tables now scroll inside their own card instead of widening the page.
- Added full gas names (e.g. "H₂ — Hydrogen") to the OLTC input form and to
  every gas table in the PDF and Excel exports, matching the Main Tank form.

### Branding & hidden discoveries
- Removed the ™ symbol throughout; added the TAILAM acronym expansion,
  trust panel, and a refined, more realistic transformer illustration.
- Added two linked hidden discoveries: **Engineering Mode** (click all
  seven sensor nodes on the illustration) and **Founder's Edition** (once
  Engineering Mode is found, click the ★ achievement badge in the nav to
  toggle a gold brand-accent theme). Founder's Edition re-skins only the
  brand accent tokens — fault, health and confidence colors are untouched.
- Polished the header logo (dark tile, teal mark, soft glow).
- Removed the splash screen's "click anywhere to skip" text (the dismiss
  behavior — click/tap/any key — was kept).

### Analytics
- Integrated Google Analytics 4 with manual SPA virtual-page-view tracking
  (`src/js/analytics.js`), since TAILAM has no real router — Home, Main
  Tank, OLTC, Help, About, Feedback, Results and the Engineering Workbook
  each report a `page_view` at the point they actually become visible.
- Integrated Microsoft Clarity for session recording.
- Both are optional and fail silently if blocked (ad-blocker, offline,
  privacy extension) — no app feature depends on either having loaded.

### Fixed
- Updated the feedback destination email address.
