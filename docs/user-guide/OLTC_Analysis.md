# OLTC Analysis — User Guide

## What it's for

Interpreting a dissolved gas analysis lab result from an on-load tap
changer (OLTC) oil compartment — a diagnostically distinct environment
from the main tank, where normal switching activity itself generates gas
(mainly acetylene), so it needs its own reference framework rather than
the main-tank thresholds.

## Inputs

| Field | Required? | Notes |
|---|---|---|
| H₂, CH₄, C₂H₆, C₂H₄, C₂H₂, CO, CO₂ (ppm) | At least one gas required | Same seven gases as Main Tank, read from the OLTC compartment sample |
| Tap operation count | Optional | Enables the C₂H₂-per-1000-operations normalization |
| Main-tank reference H₂ and C₂H₂ (ppm) | Optional | Used only for the cross-contamination check — auto-filled from a completed Main Tank analysis in the same session if available, or enter manually |

## What runs when you click Analyze

| Method | What it tells you |
|---|---|
| Duval Triangle 2 | Primary OLTC fault-type classification (Normal, Abnormal Arcing, Overheating, Coking, or Severe Coking by temperature band) |
| CIGRE TB 443 TGC comparison | Each gas measured against its typical 90th-percentile concentration for OLTCs |
| Three OLTC diagnostic ratios | Arcing indicator (C₂H₂/H₂), thermal indicator (C₂H₄/C₂H₆), discharge indicator |
| Tap-normalized C₂H₂ | Whether acetylene generation is proportionate to how many times the tap changer has switched, if you entered a tap count |
| Cross-contamination check | Whether OLTC oil appears to be leaking into the main tank, using your entered main-tank reference values |

## The "below typical" gate

If Duval Triangle 2 lands in a fault zone but none of the seven gases
actually exceed their CIGRE TB 443 typical value, TAILAM presents the
result as an **early pattern, not an active fault** — displayed in the
healthy visual style with an explanatory note. This reflects IEC
60599:2022 §9 guidance: a zone classification without any gas actually
being elevated is not yet a confirmed condition. See
`docs/standards/IEC60599.md`.

## What's different from Main Tank

OLTC analysis has **no multi-method consensus score** — there is one
primary triangle (Duval Triangle 2), corroborated by the TGC comparison
and the three ratios, rather than three independent primary methods being
cross-checked against each other. The Engineering Workspace reflects this
honestly: Confidence and Agreement fields show "N/A — single primary
method" rather than fabricating a percentage that doesn't correspond to
anything the engine actually computed.

## Cross-contamination check

This is the one place OLTC analysis reads values from outside its own
gas set — the main-tank H₂ and C₂H₂ reference fields. If you've already
run a Main Tank analysis in the same browser session, these are pre-filled
automatically (only if you haven't already typed something into them);
otherwise, enter them manually from your main-tank lab report if you want
this check to run meaningfully. Leaving them blank simply means the check
reports it has no reference values yet — it does not block the rest of
the OLTC analysis.

## Related guides

- `Main_Tank_Analysis.md` — the main-tank equivalent
- `Exporting_Reports.md` — PDF/Excel/CSV output
- `docs/standards/CIGRE_TB771.md` — TGC and OLTC ratio implementation detail
