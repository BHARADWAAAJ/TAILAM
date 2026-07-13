# Main Tank Analysis — User Guide

## What it's for

Interpreting a dissolved gas analysis (DGA) lab result from a
transformer's main oil tank, using eight complementary diagnostic methods
at once.

## Inputs

| Field | Required? | Notes |
|---|---|---|
| H₂ (ppm) | At least one gas required | Hydrogen |
| CH₄ (ppm) | " | Methane |
| C₂H₆ (ppm) | " | Ethane |
| C₂H₄ (ppm) | " | Ethylene |
| C₂H₂ (ppm) | " | Acetylene |
| CO (ppm) | " | Carbon monoxide |
| CO₂ (ppm) | " | Carbon dioxide |
| O₂ (ppm) | Optional | Dissolved oxygen — enables the IEC 60422 oxygen-condition check |
| Transformer name, MVA, voltage, location, sample date, oil type | Optional | Descriptive only — appears on exports, never affects any calculation |

At least one of the seven combustible/carbon-oxide gases must be non-zero;
TAILAM will prompt you if you click Analyze with everything blank.

## What runs when you click Analyze

| Method | What it tells you |
|---|---|
| Duval Triangle 1 | Primary fault-type classification (partial discharge, low/high energy discharge, thermal fault by temperature band, or mixed thermal+electrical) |
| Rogers 4-ratio | A second, independent fault classification for cross-checking Duval |
| IEC 60599 3-ratio | A third independent classification, per the international standard |
| IEEE C57.104 | Individual-gas condition severity (Condition 1–4) |
| Key Gas + TDCG | Dominant-gas pattern plus total combustible gas load severity |
| Doernenburg | A legacy ratio method, useful when other methods are indeterminate |
| CIGRE 5-key-ratio | Screening flags for specific fault signatures the ratio methods above might not isolate |
| CO₂/CO paper involvement | Whether cellulose (paper) insulation appears to be thermally or electrically degrading |
| O₂ interpretation | Oil/tank sealing condition, if you entered a dissolved-O₂ value |

Duval Triangle 1, Rogers, and IEC 60599 additionally feed a **method
agreement** check (how many of the three primary methods point to the same
fault family) and a **Transformer Health Index** — a weighted 0–100
composite score combining all five quantitative methods above.

## Reading the results

Start at the **Engineering Snapshot** for the five-second read, then work
down through Status, Assessment, Action Plan, Health Index, and
Interpretation for increasing detail. The **Diagnostic Methods table**
shows every method side by side with an explicit agreement indicator
against the primary diagnosis. **Raw Calculations** (collapsed by default)
contains full per-method detail — every ratio, every threshold comparison
— for engineers who want to verify the numbers themselves.

## Clicking the Duval Triangle

The enlarged Duval Triangle plot in the Assessment card is clickable — it
opens a detail view with the full-size triangle, your sample's exact
plotted point, the zone's engineering description, and the IEC reference
for that figure.

## Clearing and starting over

**Clear** empties the form without leaving the workspace. **New Analysis**
(available after results are shown) clears the form and returns to the
empty state. Neither action affects any OLTC analysis you may also have
open — see `docs/architecture/Engineering_Workflow.md` §4 for what happens
if you navigate away with an unexported report.

## Related guides

- `OLTC_Analysis.md` — the equivalent workflow for tap changers
- `Exporting_Reports.md` — PDF/Excel/CSV output
- `docs/standards/` — what each method above actually implements
