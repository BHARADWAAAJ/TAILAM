# Exporting Reports

TAILAM produces reports entirely in your browser — nothing is uploaded,
and no export requires an internet connection except the styled Excel
format (see below).

## Available formats

| Format | Button | Best for |
|---|---|---|
| PDF | Export PDF | Printing, emailing, or archiving a formatted report; opens a new browser tab and triggers your browser's print dialog |
| Excel (.xlsx) | Export Excel | Further analysis, record-keeping in a spreadsheet system, or sharing an editable file — includes a styled workbook with the Duval Triangle image embedded |
| CSV | Automatic fallback | Used automatically if the Excel library couldn't load (e.g. no internet connection) — same data, no styling or embedded image |

## Exporting a PDF report

1. Complete an analysis (Main Tank or OLTC).
2. Click **Export PDF**.
3. A new browser tab opens with a formatted, print-ready report.
4. Your browser's print dialog opens automatically after a moment — choose
   "Save as PDF" (or your printer) from there.

The PDF is built fresh from your analysis results — it is not a
screenshot of the on-screen workspace — so it always contains complete,
correctly formatted data even if you've scrolled or resized your browser
window.

## Exporting an Excel report

1. Complete an analysis.
2. Click **Export Excel**.
3. TAILAM builds a styled workbook (transformer information, a
   summary-of-findings section, full gas values, per-method detail, and
   the Duval Triangle plotted as an embedded image) and downloads it
   directly — check your browser's downloads folder.

If your browser can't load the Excel library (offline, blocked CDN,
restrictive network policy), TAILAM automatically downloads a plain CSV
file instead, with a filename indicating the same report — no error, no
lost data, just a simpler format.

## What's in every export

- Transformer information (name, rating, voltage, location, sample date,
  oil type) as entered
- All gas values as entered
- Every diagnostic method's individual result
- The overall risk score / health category (Main Tank) or primary zone
  (OLTC)
- The engineering recommendation text
- For PDF and Excel: the Duval Triangle plot as an image

## Main Tank and OLTC exports never mix

Each export button exports **only** the analysis for that specific
workspace. If you need both a Main Tank and an OLTC report for the same
transformer, export each one separately from its own workspace.

## Exported vs. unexported state

TAILAM tracks, per analysis, whether you've exported it at least once. If
you try to navigate away from a workspace with an analysis you haven't
exported yet, TAILAM asks whether you want to export first, discard it, or
cancel and stay. This exists because TAILAM keeps no copy of your analysis
anywhere except the current browser tab — once you navigate away without
exporting (or close the tab), that specific result cannot be recovered.
See `Troubleshooting.md` if you've lost a result this way.

## Privacy note

No export format, and no part of TAILAM, sends your data anywhere. PDF
export opens a local browser tab; Excel and CSV export build a file
locally and trigger a normal browser download. The only network request
TAILAM ever makes is loading the Excel library itself from its CDN —
never your gas values, transformer information, or results.
