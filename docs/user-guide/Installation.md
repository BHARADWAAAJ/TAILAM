# Installing TAILAM

TAILAM is a static web application. There is nothing to compile, no
package manager, and no server to run. Choose whichever of the two options
below fits how you want to use it.

## Option 1 — Run it directly from a folder (fastest)

1. Download or copy the `dga-web-simple` folder to your computer.
2. Open the `index.html` file inside it by double-clicking it (or dragging
   it into a browser window).
3. TAILAM opens immediately. No installation step, no account, no
   internet connection required for the diagnostic engine itself.

This works because TAILAM loads its own JavaScript as plain scripts rather
than ES modules — a deliberate choice so the app runs identically whether
opened from disk or from a web server. See
`docs/architecture/Application_Architecture.md` for why this matters.

> **Note on Excel export:** the styled `.xlsx` export uses a small external
> library (ExcelJS) loaded from a CDN. If you're offline or the CDN is
> blocked, Excel export automatically falls back to a plain CSV file —
> everything else in the app, including PDF export, works fully offline.

## Option 2 — Serve it from a local or hosted web server

Any static file server works, with no build step:

```bash
# Python (built into most systems)
cd dga-web-simple
python -m http.server 8080
# then open http://localhost:8080

# Node (if you have it installed)
npx serve .
```

To publish TAILAM for a team, upload the folder as-is to any static host —
GitHub Pages, Netlify, an internal nginx server, a company intranet
share — no build step, no environment variables, no backend to provision.

## System requirements

- A modern desktop or laptop browser (see `docs/release/RELEASE_NOTES_v1.0.0.md`
  for the specific browser/version support list).
- No installed software beyond the browser itself.
- No account, license key, or activation step.

## Verifying the install

Once `index.html` is open, you should see the TAILAM landing screen with
two options: **Main Tank Analysis** and **OLTC Analysis**. If instead you
see a blank page or a browser error about scripts being blocked, see
`Troubleshooting.md`.

## Updating TAILAM

Replace the folder contents with a newer release (see
`docs/release/CHANGELOG.md` for what changed). TAILAM stores nothing on
your computer except your dark/light theme preference, so updating never
risks losing data — there is no data to lose between sessions in the first
place (see `Quick_Start.md` for what this means for your workflow).
