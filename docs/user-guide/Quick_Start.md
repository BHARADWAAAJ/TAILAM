# Quick Start — Your First Analysis in Under 5 Minutes

This walks a new engineer through one complete Main Tank analysis, start
to exported report. OLTC analysis follows the identical pattern — see
`OLTC_Analysis.md` for its specific fields.

## Before you start

Have your DGA lab report open. You need at minimum one gas concentration
in ppm — the more of the seven combustible/carbon-oxide gases you have
(H₂, CH₄, C₂H₆, C₂H₄, C₂H₂, CO, CO₂), the more of TAILAM's eight
diagnostic methods will have data to work with.

## Step 1 — Open TAILAM (10 seconds)

Open `index.html` in your browser (see `Installation.md` if you haven't
set it up yet). You'll land on the TAILAM landing screen.

## Step 2 — Choose Main Tank Analysis (5 seconds)

Click **Main Tank Analysis**. You're taken to the Main Tank workspace with
an empty gas-entry form on the left.

## Step 3 — Enter your gas values (1–2 minutes)

Type each gas concentration, in ppm, into its field: H₂, CH₄, C₂H₆, C₂H₄,
C₂H₂, CO, CO₂, and optionally dissolved O₂. Leave any gas blank or at zero
if you don't have a value for it — TAILAM only requires that at least one
gas is non-zero.

Optionally, fill in the transformer information fields (name, MVA rating,
voltage, location, sample date, oil type) — these appear on your exported
report but never affect any calculation, so they can be filled in later
or left as defaults.

## Step 4 — Click Analyze (instant)

Click the **Analyze** button. TAILAM runs all eight main-tank diagnostic
methods and immediately displays the Engineering Workspace.

## Step 5 — Read the Engineering Snapshot (30 seconds)

At the top of the results, the Engineering Snapshot gives you the
five-second read: transformer condition, most probable fault, the
recommended operational decision, confidence, and method agreement. This
is enough for a quick triage; scroll down for full detail.

## Step 6 — Review supporting detail (as long as you need)

Below the Snapshot: Engineering Status, the full Engineering Assessment
with the Duval Triangle 1 plot, the Immediate Action Plan, the
Transformer Health Index, a written Engineering Interpretation, Supporting
Evidence, a Diagnostic Methods comparison table, and (expandable) Raw
Calculations showing every method's full detail.

## Step 7 — Export your report (30 seconds)

Scroll to the Export section and click **Export PDF** for a print-ready
report, or **Export Excel** for a styled workbook with the triangle image
embedded. See `Exporting_Reports.md` for details on each format.

## Step 8 — Start your next analysis

Click **New Analysis** to clear the form and run another sample, or
navigate to **OLTC Analysis** from the top navigation to assess a tap
changer — Main Tank and OLTC are fully independent, so nothing you entered
above is lost or mixed in.

## That's it

Total time for an engineer who already has lab values in hand: under five
minutes from opening the app to holding an exported PDF. For a section-by-
section explanation of what each part of the workspace means, see
`docs/architecture/Engineering_Workflow.md`.
