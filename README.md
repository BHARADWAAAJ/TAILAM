# TAILAM™

**Transformer Assessment for Insulating Liquid Analysis & Monitoring**

*Version 1.0.0 · Stable · Static Browser Edition*

A client-side, standards-based Dissolved Gas Analysis (DGA) interpretation
tool for oil-filled power transformers and their on-load tap changers
(OLTCs). Enter lab-report gas concentrations and get an instant,
multi-method diagnostic report — no account, no server, no data upload.
Everything runs in your browser.

> Engineering decisions deserve engineering evidence.

---

## Project overview

TAILAM turns a raw gas-in-oil lab report into a complete engineering
assessment: eight complementary diagnostic methods for the main tank, a
parallel set for the OLTC compartment, a weighted health index, and a
clear operational recommendation — all computed locally, in the time it
takes to click one button.

It is built as a zero-backend, zero-build-step static web application
specifically so it can be opened by double-clicking `index.html`, with no
installation, account, or IT approval process required, while remaining
fully deployable to any static web host for team-wide access.

## Features

- **Two independent analysis workflows** — Main Tank and OLTC — with
  separate inputs, engines, rendering, and exports, so the two
  diagnostically distinct oil compartments are never mixed.
- **The Engineering Workspace** — an eleven-section results layout, from a
  five-second Snapshot down to full Raw Calculations, designed to read
  like a professional engineering report.
- **Multi-method cross-checking** with an explicit agreement/confidence
  indicator, rather than trusting a single method's output alone.
- **Interactive Duval Triangle plots** (Triangle 1 for the main tank,
  Triangle 2 for the OLTC) with a clickable detail view.
- **A Transformer Health Index** — one weighted 0–100 composite score with
  a five-band classification.
- **PDF, styled Excel, and CSV export** — each strictly scoped to a single
  analysis, generated entirely client-side.
- **Dark and light themes**, with export-safe light-mode rendering for
  printed/embedded triangle images.
- **An internal engineering validation framework** — see
  [Validation](#validation) below — proving the calculation engine's
  regression safety.
- **Runs fully offline** except the optional styled-Excel export library.

## Supported standards

| Standard / Brochure | TAILAM implementation |
|---|---|
| IEC 60599:2022 | Duval Triangle 1 & 2, three-ratio method, §9 below-typical gate, CO₂/CO paper involvement |
| IEEE C57.104 | Individual gas condition limits, TDCG bands, Key Gas dominant-pattern recognition |
| CIGRE TB 771 | Five-key-ratio screening method |
| CIGRE TB 443 | OLTC typical gas concentrations, diagnostic ratios, tap-normalized C₂H₂ |
| IEC 60422 | Dissolved-oxygen interpretation |
| IEC 60567 | Referenced for sampling/analysis context (not computationally implemented) |
| Rogers 4-ratio | Independent main-tank cross-check |
| Doernenburg | Legacy ratio method for indeterminate cases |

Full implementation notes, scope, and limitations for each standard:
[`docs/standards/`](docs/standards/).

## Screenshots

*(Placeholders — add screenshots before publishing.)*

| Landing screen | Engineering Snapshot | Duval Triangle detail |
|---|---|---|
| `docs/assets/screenshot-landing.png` | `docs/assets/screenshot-snapshot.png` | `docs/assets/screenshot-duval-modal.png` |

## Installation

No build step, no package manager, no server required.

```bash
# Option 1 — just open it
# Double-click index.html, or drag it into a browser window.

# Option 2 — serve it locally
cd dga-web-simple
python -m http.server 8080   # or: npx serve .
```

Full instructions, including deployment to a static host: [`docs/user-guide/Installation.md`](docs/user-guide/Installation.md).
New to TAILAM? [`docs/user-guide/Quick_Start.md`](docs/user-guide/Quick_Start.md)
gets you through a first analysis in under five minutes.

## Browser support

| Browser | Minimum practical version |
|---|---|
| Chrome / Chromium-based (Edge, Brave, Opera) | 80+ |
| Firefox | 75+ |
| Safari (macOS/iOS) | 13.1+ |

Internet Explorer is not supported. Full detail:
[`docs/release/RELEASE_NOTES_v1.0.0.md`](docs/release/RELEASE_NOTES_v1.0.0.md).

## Folder structure

```
dga-web-simple/
├── index.html              Markup shell — loads every script in dependency order
├── README.md                This file
├── VERSION.json             Version metadata
├── assets/                  Static assets
├── docs/
│   ├── ARCHITECTURE.md      Original module-map + dependency-graph record
│   ├── architecture/        Diagram-driven architecture docs
│   ├── standards/           Per-standard implementation notes
│   ├── validation/          Validation framework documentation
│   ├── release/             Changelog, release notes, roadmap, license notice
│   └── user-guide/          End-user documentation
└── src/
    ├── css/                 Design tokens, layout, components, print styles
    ├── js/
    │   ├── app.js            Entry point — event wiring, first-load init
    │   ├── navigation.js     View switching
    │   ├── theme.js          Dark/light theme
    │   ├── engine/           Pure diagnostic logic — frozen for v1.0
    │   ├── ui/               Rendering, orchestration, export, dialogs
    │   └── utils/            Shared helpers, form reading, validation
    └── validation/           Developer/CI-only validation framework
```

Full responsibility breakdown per file: [`docs/architecture/Module_Structure.md`](docs/architecture/Module_Structure.md).

## Development

TAILAM has no build step — edit a file, refresh the browser. A few rules
keep the codebase coherent:

- **The engine is frozen.** `src/js/engine/*.js` contains every threshold
  and zone boundary; changes require a dedicated, standards-referenced
  review and must pass the validation framework before merging.
- **Plain scripts, not ES modules.** Every file wraps itself in an IIFE
  and publishes onto `window.TAILAM.*`, loaded in dependency order by
  `index.html`. This is why the app works from `file://` without a
  server — ES modules are blocked there by browser CORS policy.
- **One dependency.** ExcelJS, loaded from a pinned CDN version, used only
  for styled Excel export, with an automatic CSV fallback.

Architecture deep-dive: [`docs/architecture/`](docs/architecture/).

## Validation

TAILAM includes an internal, developer/CI-only validation framework
(`src/validation/`) that runs the live, unmodified engine against
reference datasets and reports a pass/fail summary per diagnostic method:

```bash
node src/validation/validationRunner.js
```

This is never exposed in the app UI — it exists to catch unintended
engine regressions before release. Methodology, dataset format, and the
regression process: [`docs/validation/`](docs/validation/).

## Roadmap

- **Version 1.1** — minor enhancements within the current single-sample
  scope.
- **Version 2.0** — trend analysis, fleet health, historical comparison,
  laboratory import, transformer ranking, maintenance planning, enterprise
  reporting.
- **Version 3.0** — enterprise asset management, multi-user collaboration,
  role-based permissions, API integration, cloud sync, AI-assisted
  maintenance planning.

Full roadmap: [`docs/release/ROADMAP.md`](docs/release/ROADMAP.md).

## License

No formal license has been selected yet for this repository — see
[`docs/release/LICENSE_NOTICE.md`](docs/release/LICENSE_NOTICE.md) for the
current status, third-party (ExcelJS, MIT) attribution, and the standards-
copyright notice covering IEC/IEEE/CIGRE references. Until a `LICENSE`
file is added, treat this repository as all-rights-reserved.

## Credits

Designed by **Bharadwaj**. Diagnostic methods implemented per IEC
60599:2022, IEEE C57.104, CIGRE TB 443 and TB 771, Rogers Ratio, and
Doernenburg — see [`docs/standards/`](docs/standards/) for full
implementation notes and attribution.

## Disclaimer

For engineering guidance only. Results support, but do not replace, the
judgment of a qualified transformer engineer.
