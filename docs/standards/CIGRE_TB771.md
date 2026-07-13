# Standard Implementation Note — CIGRE Technical Brochures (TB 771 / TB 443)

**Reference:** CIGRE Technical Brochure 771, *Advances in DGA
interpretation*, and CIGRE Technical Brochure 443, *DGA in non-mineral
oils and load tap changers, and improved diagnostic solutions for both
mineral and non-mineral oils.*
**Status in TAILAM:** Implemented. Frozen for Version 1.0.
**This document does not reproduce any text, table, or figure from either
brochure.** Engineers verifying TAILAM's output should refer to the
official CIGRE Technical Brochures for the authoritative guidance.

## Purpose

TAILAM implements two distinct pieces of CIGRE guidance: TB 771's
five-key-ratio screening method (main tank), and TB 443's typical gas
concentration (TGC) reference values and diagnostic approach for OLTC
compartments.

## Scope of TAILAM's implementation

1. **Five-key-ratio screening (TB 771)** —
   `src/js/engine/cigre.js#calcCIGRE`. Evaluates five diagnostic ratios
   (K1, K2, R1, R2, R3, each computed from a pair of the seven measured
   gases) and raises a named flag for each ratio that crosses its
   screening threshold, with a plain-language verdict per flag. Unlike the
   ratio methods above, CIGRE screening can raise zero, one, or several
   flags simultaneously — it is a screening layer, not a single-zone
   classifier.
2. **OLTC typical gas concentrations (TB 443)** —
   `src/js/engine/duval2.js#calcOLTCAnalysis` (the `tgc` field). Each of
   the seven OLTC gases is compared against its CIGRE TB 443 90th-percentile
   typical value and classified into a Normal/Near Limit/Above TGC/High
   status band.
3. **OLTC diagnostic ratios and tap normalization (TB 443)** — also in
   `calcOLTCAnalysis`: three additional OLTC-specific ratios (arcing,
   thermal, discharge indicators) and the C₂H₂-per-1000-tap-operations
   normalization used to judge whether acetylene generation is
   proportionate to switching activity.

## How TAILAM implements it

`calcCIGRE` returns every computed ratio plus a `flags` array; a sample
with no threshold crossings returns a single explicit "no flag triggered"
entry rather than an empty, ambiguous result. `calcOLTCAnalysis` returns
the full TGC comparison table, the three ratios, and (when a tap count is
entered) the normalized tap-change result — all as plain data, formatted
identically in the Raw Calculations table and the compact Diagnostic
Methods table.

## Limitations

- TAILAM implements the CIGRE ratio thresholds and TGC reference values
  as encoded in its engine; it does not implement the full duty-cycle or
  design-family-specific TGC adjustments some CIGRE guidance allows for
  (the standard itself notes some OLTC designs normally show elevated
  values in zones TAILAM otherwise flags — this is surfaced as an
  advisory note in the relevant zone descriptions, not as an automatic
  per-model adjustment).
- CIGRE screening in TAILAM is evaluated on a single sample; trend-based
  screening (which CIGRE guidance also discusses) is not implemented in
  Version 1.0.

## Revision notes

| TAILAM version | Guidance implemented | Notes |
|---|---|---|
| 1.0.0 | CIGRE TB 771 (five-key-ratio screening), CIGRE TB 443 (OLTC TGC + ratios + tap normalization) | Initial implementation |
