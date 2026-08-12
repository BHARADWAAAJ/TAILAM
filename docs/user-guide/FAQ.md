# Frequently Asked Questions

**Do I need an internet connection to use TAILAM?**
No, for analysis. Opening the app, entering gas values, running any of the
eight diagnostic methods, viewing the Engineering Workspace, and exporting
a PDF or CSV all work fully offline. Only the styled Excel export needs a
connection (to load the ExcelJS library from its CDN) — if you're offline,
Excel export automatically falls back to CSV instead.

**Does TAILAM store or upload my data anywhere?**
No. Everything runs in your browser tab. Gas values, transformer
information, and results exist only in memory for the current session and
are cleared when you reload the page, click New Analysis, or close the
tab. The only thing TAILAM saves between sessions is your dark/light theme
preference (in your browser's local storage) — nothing about your
analyses.

**Why don't Main Tank and OLTC share a report or export together?**
They're diagnostically distinct oil compartments — normal OLTC switching
generates gas patterns that would look like a fault in the main tank, and
vice versa. Keeping them fully independent (separate state, separate
rendering, separate exports) avoids ever mixing the two, by design. See
`docs/architecture/Engineering_Workflow.md`.

**I only have some of the seven gases. Can I still run an analysis?**
Yes. TAILAM requires only that at least one gas is non-zero. Methods that
need a gas you didn't provide will show as indeterminate or not applicable
for that specific method, but every other method still runs — see the
Supporting Evidence section of your results for exactly which methods
had enough data.

**Why do different methods (Duval, Rogers, IEC) sometimes disagree?**
This is normal and expected — it's exactly why TAILAM runs multiple
independent methods and reports their agreement level rather than picking
one. Ratio methods can occasionally register different classifications
from the same gas set, especially near a threshold boundary. The
Diagnostic Methods table explicitly shows which methods agree with the
primary diagnosis and which don't, and the Method Agreement / Confidence
fields quantify how much weight to put on the overall result.

**What does "confidence" actually mean?**
It's derived from how many of the three primary methods (Duval Triangle,
Rogers, IEC 60599) agree with each other: all three agreeing gives High
confidence, two of three gives Moderate, one or none gives Low. It is not
a statistical probability — it's an agreement-strength indicator. OLTC
analysis, which has only one primary method, reports confidence as not
applicable rather than inventing a number.

**Can I analyze the same sample more than once, or compare two samples?**
Not within Version 1.0 — each analysis is a single, independent
calculation with no memory of previous samples. Historical trending and
multi-sample comparison are planned for a future version — see
`docs/release/ROADMAP.md`.

**Is TAILAM a substitute for an engineer's judgment?**
No. TAILAM's results support, but do not replace, the judgment of a
qualified transformer engineer. Every report includes this disclaimer.

**Which standards does TAILAM implement?**
IEC 60599:2022, IEEE C57.104, CIGRE TB 771 and TB 443, plus references to
IEC 60567 (sampling) and IEC 60422 (oil supervision, dissolved-oxygen
portion). See `docs/standards/` for exactly what's implemented from each.

**Can I trust the numbers without checking the source code myself?**
You're welcome to check it — the entire engine is plain, readable
JavaScript with no minification or obfuscation, in `src/js/engine/`. There
is also an internal validation framework (`src/validation/`) that checks
the engine's output against reference data on every change; see
`docs/validation/Validation_Methodology.md`.

**Something looks wrong or I found a bug — what do I do?**
See `Troubleshooting.md` first. If that doesn't resolve it, report the
issue through your organization's usual channel for this tool, including
the gas values you entered and what you expected vs. what you saw.
