# TAILAM — Application Architecture

**Audience:** engineers and reviewers evaluating TAILAM's technical design.
**Status:** describes the frozen Version 1.0 architecture. No engineering
calculation, UI, or behavior is altered by this document.

## 1. What TAILAM is

TAILAM (Transformer Assessment for Insulating Liquid Analysis & Monitoring)
is a single-page, client-side web application for Dissolved Gas Analysis
(DGA) interpretation of oil-filled power transformers and their on-load tap
changers (OLTCs). It runs entirely in the browser: there is no backend, no
account system, no database, and no data leaves the user's machine.

## 2. Design principles

1. **Zero build step.** The app is plain HTML/CSS/JavaScript loaded as
   classic `<script>` tags. There is no bundler, no transpiler, and no
   package manager dependency for the runtime app itself. `index.html` can
   be opened directly from disk (`file://`) or served from any static host
   (GitHub Pages, Netlify, a plain nginx directory) with identical behavior.
2. **Engine is sacred.** All diagnostic mathematics lives in
   `src/js/engine/*.js` — pure functions with no DOM access. This is the one
   part of the codebase that Version 1.0 treats as frozen: UI sprints and
   hardening sprints are explicitly forbidden from touching it.
3. **One-directional dependency graph.** `engine ← ui ← app`. Engine modules
   depend on nothing outside `engine/`. UI modules read engine output and
   touch the DOM. `app.js` is the only file that wires DOM events; it is
   loaded last.
4. **Strict separation of Main Tank and OLTC.** The two analyses never share
   state, never share a report object, and are exported (PDF/Excel/CSV)
   independently. This mirrors how the two oil compartments are physically
   and diagnostically distinct.
5. **One pinned external dependency.** ExcelJS (loaded from a fixed CDN
   version) is used only for the styled `.xlsx` export, with an automatic
   plain-CSV fallback if the CDN is unreachable or blocked. Nothing else in
   the app depends on a third-party library.

## 3. Folder structure

```
dga-web-simple/
├── index.html                 Markup shell; loads every script in dependency order
├── README.md                  Project overview (public-facing)
├── VERSION.json                Version metadata
├── assets/                    Static assets (favicon is an inline SVG; folder otherwise empty)
├── docs/                      This documentation set
│   ├── ARCHITECTURE.md        Original Sprint 1 module-map (module-by-module + dependency graph)
│   ├── architecture/          Diagram-driven architecture docs (this folder)
│   ├── standards/             Per-standard implementation notes
│   ├── validation/            Validation framework documentation
│   ├── release/               Changelog, release notes, roadmap, license notice
│   └── user-guide/            End-user documentation
└── src/
    ├── css/                   variables.css, base.css, layout.css, components.css, dashboard.css, print.css
    ├── js/
    │   ├── app.js              Entry point — event wiring, first-load init
    │   ├── navigation.js       Landing / Main Tank / OLTC view switching
    │   ├── theme.js            Dark/light theme + export force-light override
    │   ├── engine/             Pure diagnostic logic (frozen — see §2.2)
    │   ├── ui/                 Rendering, orchestration, export, dialogs
    │   └── utils/              Shared helpers, form reading, input validation
    └── validation/             Developer/CI-only validation framework (never shipped to the browser)
```

See `Module_Structure.md` in this folder for a responsibility breakdown of
every file, and the existing `docs/ARCHITECTURE.md` for the original
Sprint 1 design record (script-loading rationale, dependency graph, and the
history of decisions that got the codebase to its current shape).

## 4. High-level data flow

```mermaid
flowchart LR
    A[Engineer enters gas ppm values] --> B[utils/validators.js\nreads + parses form fields]
    B --> C[engine/*.js\npure calculation functions]
    C --> D[ui/dashboard.js\nbuilds the report object\nmtReport / otReport]
    D --> E[ui/dashboard.js\nrenders Raw Calculations cards]
    D --> F[ui/workspace.js\nrenders Engineering Workspace\n(Snapshot, Status, Assessment,\nAction Plan, THI, Interpretation,\nEvidence, Diagnostic Table)]
    D --> G[ui/charts.js\ndraws Duval Triangle canvases\n+ risk gauge]
    D --> H[ui/export.js\nPDF / Excel / CSV\n— reads the SAME report object]
```

The report object (`mtReport` for Main Tank, `otReport` for OLTC) is built
once per "Analyze" click and is the single source of truth that every
downstream renderer — the detailed cards, the Engineering Workspace, the
canvases, and every export format — reads from. Nothing downstream
recomputes a diagnostic value; they all format the same numbers.

## 5. Runtime environment

- **No server-side component.** Every calculation executes in the browser's
  JavaScript engine.
- **No persistence beyond the current tab**, except: (a) the dark/light
  theme preference, stored in `localStorage` under `dga-theme`; (b) nothing
  else. Gas values, transformer info and generated reports are held only in
  memory and are cleared on page reload or "New Analysis".
- **No network calls** other than the one pinned ExcelJS CDN script tag
  (loaded with `defer`, and only actually used when the user requests an
  Excel export).

## 6. Related documents

| Document | Covers |
|---|---|
| `Engineering_Workflow.md` | The end-to-end path from gas entry to on-screen report, in engineering terms |
| `Module_Structure.md` | File-by-file responsibility table |
| `Calculation_Flow.md` | How the 8+ diagnostic methods combine into one report object |
| `Export_Workflow.md` | PDF / Excel / CSV generation, independent of and after the calculation flow |
| `docs/validation/Validation_Methodology.md` | How engine correctness is verified outside the browser |
