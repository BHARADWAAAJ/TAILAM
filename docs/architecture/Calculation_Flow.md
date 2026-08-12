# TAILAM — Calculation Flow

How gas values become a complete report object. This document describes
**sequencing and composition only** — for the actual thresholds and
formulas of each method, see `docs/standards/` (implementation notes) and
the JSDoc comments in `src/js/engine/*.js` (the authoritative source).

## 1. Main Tank calculation sequence

```mermaid
sequenceDiagram
    participant U as Engineer (form input)
    participant V as utils/validators.js
    participant D as ui/dashboard.js
    participant E as engine/*.js

    U->>V: Click "Analyze"
    V->>D: readMainTankGases() → {h2, ch4, c2h6, c2h4, c2h2, co, co2, o2}
    D->>D: hasAnyGas() gate — refuse if all gases are zero
    D->>E: calcDuval(g)
    D->>E: calcRogers(g)
    D->>E: calcIEC(g)
    D->>E: calcIEEE(g)
    D->>E: calcKeyGas(g)
    D->>E: calcPaperInvolvement(g)
    D->>E: calcDoernenburg(g)
    D->>E: calcCIGRE(g)
    D->>E: calcAgreement(duval, rogers, iec)
    D->>E: calcRiskScore(duval, rogers, iec, ieee, keygas)
    D->>E: getRecommendation(duval.zone, risk)
    D->>E: interpretO2(g.o2)
    D->>D: assemble mtReport = {g, info, duval, rogers, iec, ieee,\nkeygas, paper, doern, cigre, agree, risk, rec, o2info}
    D->>D: renderMainTank(mtReport)
```

Every engine call above receives the **same gas object** `g`. No method's
output feeds into another method's threshold logic — the only compositions
are: (a) `calcAgreement` comparing three already-computed results, and
(b) `calcRiskScore` combining five already-computed results into one
weighted number. Both are documented, reviewable compositions, not hidden
recalculation.

## 2. OLTC calculation sequence

```mermaid
sequenceDiagram
    participant U as Engineer (form input)
    participant V as utils/validators.js
    participant D as ui/dashboard.js
    participant E as engine/duval2.js

    U->>V: Click "Analyze"
    V->>D: readOltcGases() → og {h2, ch4, c2h6, c2h4, c2h2, co, co2}
    D->>D: hasAnyGas() gate
    D->>E: calcDuval2(og)
    D->>E: calcOLTCAnalysis(og, taps)
    D->>E: applyBelowTypicalGate(duval2, oltcRes.anyAboveTGC)
    D->>E: calcCrossContam({h2, c2h2} from main-tank reference fields, {c2h2: og.c2h2})
    D->>D: assemble otReport = {og, taps, duval2, oltcRes, xcontam, info}
    D->>D: renderOltc(otReport)
```

OLTC has no multi-method consensus score (there is only one primary
triangle for the OLTC compartment), so `otReport` never contains an
`agree`/`risk` pair analogous to the main tank's — the Engineering
Workspace explicitly labels Confidence/Agreement as not applicable for
OLTC rather than deriving a number that doesn't exist in the engine.

## 3. The IEC §9 "below-typical" gate

`applyBelowTypicalGate` is the one place in the OLTC flow where a
zone result is conditionally re-labeled rather than just displayed: per
IEC 60599:2022 clause 9, a Duval Triangle 2 fault zone only represents an
active fault if at least one gas exceeds its CIGRE TB 443 typical
concentration. If none do, the zone is flagged `belowTypical` and displayed
in the healthy visual style with an added advisory sentence — the
underlying zone classification itself is never altered, only its
presentation.

## 4. Report object → render fan-out

```mermaid
flowchart LR
    R[Report object\nmtReport / otReport] --> RC[Raw Calculations cards\nui/dashboard.js#renderMainTank/renderOltc]
    R --> WS[Engineering Workspace\nui/workspace.js#renderMainWorkspace/renderOltcWorkspace]
    R --> CH[Duval Triangle canvases\nui/charts.js]
    R -.->|only on export click| EX[PDF / Excel / CSV\nui/export.js]
```

All four consumers on the right read the same report object built once in
§1/§2. `ui/workspace.js` never invents a new threshold — every editorial
choice it makes (e.g. mapping a 4-band health score to a 5-word decision
vocabulary) is documented inline in the source with a `JUDGMENT:` comment
and is presentation-only.

## 5. What never happens

- No engine function is ever called with a value derived from another
  engine function's *threshold logic* (only with already-computed *result
  objects*, as in `calcAgreement`/`calcRiskScore` above).
- No UI module recomputes a ratio, zone, or score independently — every
  number displayed anywhere in the app traces back to exactly one call
  into `engine/*.js`.
- No calculation depends on the transformer-information fields (name, MVA,
  voltage, location, date, oil type) — those are descriptive metadata only.
