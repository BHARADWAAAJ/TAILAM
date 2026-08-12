# Troubleshooting

## The page is blank, or I see a script error

- Make sure you opened `index.html` itself, not just the folder.
- Some very old or locked-down browser configurations block local
  JavaScript execution even for plain scripts. Try a current version of
  Chrome, Firefox, or Edge (see `docs/release/RELEASE_NOTES_v1.0.0.md` for
  the supported list).
- If you're opening TAILAM from a network drive or a restrictive corporate
  environment, try copying the folder to your local disk first.

## Clicking Analyze does nothing

- TAILAM requires at least one gas value to be non-zero. If every field is
  blank or zero, you'll see a message asking you to enter at least one
  main-tank (or OLTC) gas value — this is expected behavior, not an error.
- Check that you're entering numbers only (no units, no commas) in the gas
  fields.

## The Excel export downloaded a .csv file instead of .xlsx

This is the automatic offline/blocked-CDN fallback working as designed —
see `Exporting_Reports.md`. Your data is complete in the CSV; it's simply
unstyled and without the embedded triangle image. To get the styled
`.xlsx`, confirm you have an internet connection and that your network
doesn't block `cdnjs.cloudflare.com`, then try the export again.

## The PDF export opened a blank or unstyled tab

Some browsers' pop-up blockers can interfere with the new tab TAILAM opens
for PDF export. Allow pop-ups for the page you're running TAILAM from and
try again. If the print dialog didn't appear automatically, use your
browser's own Print command (Ctrl/Cmd+P) on the report tab that did open.

## I lost my analysis after navigating away

TAILAM keeps no copy of any analysis outside the current browser tab. If
you dismissed the "unsaved analysis" dialog with Discard, or closed the
tab/reloaded the page without exporting, the analysis cannot be recovered
— you'll need to re-enter the gas values and re-run it. This is a
deliberate design choice (no server, no data persistence), documented in
`docs/architecture/Application_Architecture.md` §5.

## My OLTC cross-contamination fields didn't auto-fill

Auto-fill only happens once, from a Main Tank analysis completed in the
**same browser session**, and only into fields that are still empty — it
will not overwrite a value you've already typed. If you closed and
reopened the tab, or ran Main Tank after OLTC, enter the reference values
manually.

## The Duval Triangle plot looks different in dark vs. light theme

This is expected — the on-screen triangle is theme-aware for readability.
Exported images (PDF and Excel) are always re-rendered in light colors
regardless of your current theme, so printed reports stay legible on a
white background. See `docs/architecture/Export_Workflow.md` §4.

## Two methods disagree, or a result looks unexpected

This is very often not a bug — see the FAQ entry "Why do different methods
(Duval, Rogers, IEC) sometimes disagree?" in `FAQ.md`. Check the
Diagnostic Methods table and Raw Calculations section to see the exact
ratios and thresholds each method used.

## I think I've found an actual calculation error

TAILAM's engine is frozen and validated against reference data (see
`docs/validation/`). If you believe a specific result is wrong:

1. Note the exact gas values you entered.
2. Note which method's result you believe is incorrect and why (ideally
   with a citation to the relevant standard clause).
3. Report it through your organization's usual channel for this tool —
   include both pieces of information above so it can be checked against
   the validation framework and, if confirmed, handled through the
   documented regression process (`docs/validation/Regression_Process.md`).

## Still stuck?

Check `FAQ.md` for common questions, or `docs/release/RELEASE_NOTES_v1.0.0.md`
for known Version 1.0 limitations that might explain what you're seeing.
