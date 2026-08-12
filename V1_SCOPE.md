# TAILAM — Version 1.0 Product Scope

*Transformer Assessment for Insulating Liquid Analysis & Monitoring*
Status: Stable · Static Browser Edition · Engine frozen for this version

This document defines what Version 1.0 **is**, who it is for, what it
deliberately does **not** do, and how "done" is measured. It is the
reference to check against before any feature is proposed for this
release — if something isn't listed under "Included," it belongs in a
later version's roadmap discussion, not a v1.0 patch.

---

## 1. Product Vision

TAILAM turns a raw dissolved-gas-in-oil lab report into a complete,
standards-referenced engineering assessment — instantly, entirely inside
the user's browser, with no account, no server, and no data ever leaving
the device.

Its governing principle: **engineering decisions deserve engineering
evidence.** Every diagnosis TAILAM produces is traceable to a named,
cited standard and a transparent calculation — never a black-box score.
Version 1.0 is deliberately narrow in scope (one transformer, one sample,
one session) so that this evidentiary standard can be fully met before
any broader capability is added.

## 2. Target Users

| User | What they need from TAILAM |
|---|---|
| **Transformer / protection engineers** (utilities, industrial plants, substations) | A fast, trustworthy second opinion when a lab report comes back, without re-deriving triangle geometry and ratio thresholds by hand |
| **Testing & diagnostics labs** | A consistent, professional interpretation layer to attach to raw lab results |
| **Consulting / condition-assessment engineers** | An exportable, citation-backed report suitable for a client deliverable |
| **Maintenance planners** | A clear operational decision (continue sampling / monitor / plan outage / urgent) they can act on without themselves being a DGA specialist |

**Not** the v1.0 target: fleet/asset managers needing a portfolio view,
anyone needing historical trending, or organizations requiring
multi-user accounts or centralized data storage — those needs are
acknowledged but explicitly deferred (see §7).

## 3. Problems It Solves

1. **Interpretation is genuinely hard to do by hand.** A single sample
   requires cross-referencing at least 6–7 distinct methods (Duval
   Triangles, Rogers, IEC three-ratio, IEEE limits, Key Gas/TDCG,
   Doernenburg, CIGRE) — each with its own geometry or ratio table.
   Manual cross-checking is slow and error-prone.
2. **Single-method diagnosis is risky.** Methods can disagree; a
   maintenance decision made on one method alone is weaker evidence than
   one made on cross-method agreement. TAILAM computes and surfaces that
   agreement explicitly rather than hiding it.
3. **Existing tools often require uploading sensitive asset data to a
   third party.** Transformer condition data can be commercially or
   operationally sensitive. TAILAM's zero-backend design means nothing is
   ever transmitted anywhere.
4. **Reports need to look and read like engineering documents**, not a
   raw calculator dump — suitable to attach to a maintenance record or
   hand to a client, without additional formatting work.

## 4. Features Included in Version 1.0

**Main Tank Analysis**
- Duval Triangle 1 (primary) and Triangle 4 (low-temperature supplementary), IEC 60599:2022
- Rogers four-ratio method
- IEC 60599 three-ratio method + CO₂/CO paper-involvement assessment
- IEEE C57.104 individual-gas condition limits
- Key Gas method + TDCG (Total Dissolved Combustible Gas) condition bands
- Doernenburg ratio method
- CIGRE TB 771 five-key-ratio screening method
- Dissolved-O₂ interpretation (IEC 60422), shown when O₂ is entered
- Cross-method agreement/confidence indicator (Duval 1 × Rogers × IEC 60599)
- Transformer Health Index — weighted 0–100 composite score, five-band classification

**OLTC Analysis** (fully independent workflow)
- Duval Triangle 2, IEC 60599:2022 Fig. B.4
- TGC (Typical Gas Concentration) comparison against CIGRE TB 443 reference values
- Three OLTC-specific diagnostic ratios (arcing, thermal, discharge)
- Tap-count normalization (C₂H₂ per 1,000 operations)
- Cross-contamination check against main-tank reference values
- IEC 60599:2022 §9 "below typical" gate (flags an early pattern as not-yet-a-fault)

**Engineering Workspace (shared presentation layer)**
- Unified 11-section report: Snapshot → Status → Assessment → Decision →
  Action Plan → Health Index → Interpretation → Evidence → Diagnostic
  Methods table → Raw Calculations → References → Export
- Interactive Duval Triangle plots with a clickable full-size detail view
- "Why?" progressive-disclosure sections explaining each result in plain language

**Export**
- Professional print-ready PDF (single analysis)
- Styled Excel (`.xlsx`) with embedded Duval triangle image
- CSV fallback (automatic if the Excel library is unavailable)

**Product shell**
- Landing page, top navigation, Help / About / Feedback dialogs
- Dark and light themes, with export-safe light-mode rendering for print
- Zero install: runs from a double-clicked `index.html` or any static host (e.g. GitHub Pages)
- Internal engineering validation framework (developer/CI-facing, not user-visible) proving engine regression-safety

## 5. Features Explicitly Excluded from Version 1.0

| Excluded | Why it's out of scope for v1.0 |
|---|---|
| Multi-sample trend analysis | Requires tracking a transformer across time — v2.0 |
| Fleet health / multi-transformer overview | Requires a persistent, multi-record data model — v2.0 |
| Historical comparison against a transformer's own past results | Same persistence dependency as above |
| Laboratory file import (auto-ingest lab data files) | New untrusted-input attack surface; needs its own dedicated security review — v2.0 |
| Transformer ranking across a fleet | Depends on fleet capability existing first |
| Maintenance scheduling / planning views | Depends on historical + fleet data existing first |
| Enterprise (multi-transformer, multi-period) reporting | Depends on persistent storage existing first |
| User accounts, authentication, roles/permissions | Breaks the zero-backend, zero-account value proposition core to v1.0 |
| Cloud sync / any server-side data storage | Same reason — v1.0 is deliberately backend-free |
| API / programmatic integration endpoints | No backend exists to expose one from |
| AI-assisted recommendations | Reserved for v3.0, and even then only as a layer that supports — never replaces — the standards-based engine |
| User-editable/configurable diagnostic thresholds | The engine is frozen by design; thresholds are standards-derived, not user-tunable |

## 6. Release Goals

1. Ship a diagnostic tool that a working transformer engineer would
   actually trust — every result traceable to a named standard and
   clause, never a black box.
2. Guarantee that no transformer data ever leaves the user's browser.
3. Run anywhere with zero setup — `file://`, a static host, or a
   corporate intranet — with no install, account, or IT approval process.
4. Produce export-quality reports (PDF/Excel/CSV) suitable to attach
   directly to a maintenance record or client deliverable.
5. Keep the calculation engine frozen and regression-tested so that
   presentation and export can keep evolving without ever risking a
   silent change to an engineering result.

## 7. Success Criteria

- All 7 diagnostic methods and both Duval triangles pass the internal
  validation framework (`node src/validation/validationRunner.js` reports
  `PASS` with zero failures) before any release.
- PDF, Excel, and CSV export each complete successfully in Chrome,
  Firefox, Edge, and Safari (per the supported-browser list in
  `README.md`).
- A first-time user can complete one full analysis — enter gas values,
  read the assessment, export a report — without external instruction,
  in under five minutes (matching the existing `Quick_Start.md` target).
- No engineering value (threshold, ratio boundary, zone geometry, output
  string) is ever changed outside of a dedicated, documented,
  standards-referenced review — the frozen-engine commitment holds for
  the entire life of Version 1.x.
- Zero data-exfiltration paths exist in the shipped app — verified by
  the absence of any network call carrying user-entered gas or
  transformer data.

## 8. Future Roadmap

### Version 1.1 — Minor enhancements (still single-sample scope)
- Expand the validation framework's published-standard datasets from
  structural placeholders to fully-sourced worked examples.
- Accessibility refinements beyond the v1.0 baseline.
- Low-risk usability polish that requires no engineering-calculation or
  UI-layout change.

### Version 2.0 — Trend and fleet capability
- Trend Analysis — track a transformer's gas values across multiple
  samples over time.
- Fleet Health — an overview across multiple transformers at once.
- Historical Comparison — a current sample against a transformer's own
  prior results.
- Laboratory Import — accept lab-report data files directly.
- Transformer Ranking — prioritize a fleet by relative condition severity.
- Maintenance Planning — turn accumulated findings into a scheduled view.
- Enterprise Reporting — multi-transformer, multi-period reports.
- Note: this version necessarily introduces persistent data storage — a
  significant architectural expansion beyond v1.0's zero-backend design,
  to be scoped as its own dedicated architecture decision when undertaken.

### Version 3.0 — Enterprise platform
- Enterprise Asset Management — full lifecycle tracking beyond DGA
  interpretation alone.
- Multi-user collaboration and role-based permissions.
- API integration for connecting TAILAM to other enterprise systems.
- Cloud synchronization across devices and sessions.
- AI-assisted maintenance planning — layered on top of, and never
  replacing, the standards-based diagnostic engine.

### Non-negotiable across every future version
- The diagnostic engine remains standards-referenced and validated — no
  method ships without a documented basis and a validation dataset.
- Every calculation remains transparent and auditable in source form —
  no black-box scoring.
- TAILAM's results continue to support, never replace, the judgment of a
  qualified transformer engineer.

---

*No application code was modified in producing this document. Code
changes arising from this scope require separate approval before any
file is touched.*
