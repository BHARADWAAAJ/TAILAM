# TAILAM Architecture (Sprint 1, updated for file:// / GitHub Pages compatibility)

## Script loading — plain scripts, not ES modules

The app was originally written as ES6 modules (`type="module"`, `import`/
`export`). That was reverted: browsers block ES module loading under the
`file://` protocol (a same-origin/CORS restriction that doesn't apply to
classic scripts), which broke the "just double-click index.html" requirement.
Every file in `src/js/` is now a plain script, wrapped in an IIFE, that
attaches its public API to a shared `window.TAILAM` namespace instead of
using `export`:

```js
(function () {
  'use strict';
  function calcDuval(g) { /* ... */ }
  window.TAILAM = window.TAILAM || {};
  window.TAILAM.engine = window.TAILAM.engine || {};
  window.TAILAM.engine.duval = { calcDuval, calcDuval4 };
})();
```

Consumers read dependencies off the namespace instead of `import`-ing them:

```js
const { calcDuval } = window.TAILAM.engine.duval;
```

`index.html` loads all 24 files as ordered `<script src="...">` tags (no
`defer`/`async`/`module`) right before `</body>`, in dependency order —
`utils/* → engine/* → theme.js → ui/cards.js → ui/charts.js →
ui/dialogs.js → ui/modals.js → ui/workspace.js → ui/dashboard.js →
ui/export.js → navigation.js → app.js`. Because classic scripts execute
synchronously in document order, each file can assume every namespace it
needs already exists by the time it runs — no bundler, no build step, and
the identical file tree works from `file://` and from GitHub Pages.

## Dependency graph

```
app.js ─┬─ theme.js ◄──────────────┐
        ├─ navigation.js           │ (callbacks registered by app.js —
        ├─ ui/dashboard.js ─┬──────┘  no module reaches back into app.js)
        │                   ├─ engine/* (pure)
        │                   ├─ ui/charts.js ─ theme.js, engine/duval.js, engine/duval2.js
        │                   ├─ ui/cards.js ─ utils/helpers.js
        │                   ├─ ui/dialogs.js
        │                   └─ utils/*
        ├─ ui/export.js ─ ui/dashboard.js (state getters), ui/charts.js,
        │                 engine/thi.js, theme.js, utils/*
        └─ ui/modals.js (pure DOM, no cross-module deps)
```

Each arrow above is now "reads window.TAILAM.X" rather than an ES `import`;
the graph itself — who depends on whom — is unchanged from Sprint 1.

## Key decisions

1. **State lives in `ui/dashboard.js`** (`mtReport` / `otReport`) with getter
   exports. Exports and theme-redraw read state through getters, never
   directly.
2. **Callback registration instead of circular imports** — `theme.js` and
   `navigation.js` expose `register*` hooks; `app.js` connects them to the
   dashboard. Behavior matches the old global-function version exactly.
3. **`engine/duval2.js` hosts all OLTC engineering** (Triangle 2, TGC,
   ratios, tap normalisation, cross-contamination, §9 gate). The target
   structure had no `oltc.js`; grouping by oil compartment keeps the OLTC
   domain in one reviewable file.
4. **`confidence.js`** holds the agreement→confidence constants; consensus
   imports them (same values as the previous inline literals).
5. **`thi.js` `healthCategoryFor()`** replaced three duplicated
   risk-band expressions (dashboard, PDF export, CSV export). Same
   thresholds, labels, classes and print colors.
6. **ExcelJS via pinned CDN** — retained deliberately: removing it would
   delete the styled `.xlsx` + embedded-image export (functionality loss is
   out of scope for a refactor sprint). Auto-fallback to CSV when absent.

## Engineering integrity

No calculation, threshold, zone boundary, interpretation text or output
string was modified. Engine functions were moved verbatim; the only
code-level changes (across the Sprint 1 modularization and the later
ES-module → plain-script conversion) are `export`/`import` ↔
IIFE/`window.TAILAM.*` wiring, JSDoc comments, and the approved
de-duplications listed above (verified value-identical).

## Sprint 2 (done) — product identity

Landing screen, top nav (Main Tank / OLTC / Help / About), About/Help/
unsaved-analysis dialogs, empty-state dashboard placeholder, TAILAM™
branding throughout. See git history / project memory for details — not
re-documented here since it didn't change the module structure above.

## Sprint 3 (done) — Engineering Workspace

The right-hand results panel is now the "Engineering Workspace": a fixed
11-section flow (Status → Assessment → Decision → Action Plan → Health
Index → Interpretation → Evidence → Diagnostic Methods → Raw Calculations
→ References → Export) built from the same report object each panel
already produced. `ui/workspace.js` is a new presentation-only module —
it reads fields off the existing `mtReport`/`otReport` and relabels/
aggregates them; it introduces no new threshold, ratio or score. Every
one of its editorial choices (e.g. mapping the 4-band health score to the
spec's decision vocabulary) is documented inline with a `JUDGMENT:`
comment. `ui/dashboard.js#renderMainTank`/`renderOltc` each gained exactly
one additive call to `window.TAILAM.ui.workspace.render*Workspace(rp)` at
the end of the function — no existing line in either function was changed.
The original detailed per-method cards (Rogers, IEC, IEEE, Key Gas/TDCG,
Doernenburg, CIGRE, O₂, OLTC ratios/TGC) were relocated verbatim into the
new "Raw Calculations" collapsible section — same ids, same rendering
calls, just a new container.

## Remaining candidates (not started)

- Replace remaining inline `style=""` attributes with utility classes.
- Replace `alert()` in `ui/dialogs.js` with a styled non-blocking dialog.
- Unit-test harness for `engine/` (pure functions — trivially testable).
- Optional: vendor ExcelJS locally to drop the CDN dependency.
