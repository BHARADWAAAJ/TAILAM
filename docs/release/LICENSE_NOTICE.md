# License Notice

## Software license — pending owner decision

As of Version 1.0.0, no formal open-source or proprietary license file
has been selected for the TAILAM codebase itself. This is a deliberate
placeholder, not an oversight: choosing a license is a decision for the
project owner (Bharadwaj), not something this documentation sprint makes
on their behalf.

**Before any public release or distribution of this repository**, add a
`LICENSE` file at the repository root reflecting that decision. Common
choices for a project like this include MIT, Apache 2.0, or a proprietary/
all-rights-reserved notice — the right choice depends on how the owner
intends TAILAM to be used, modified, and redistributed by others, which is
outside the scope of what this document can decide. Until a `LICENSE` file
is added, the default legal position is that **all rights are reserved**
by the author, and the codebase should not be treated as open source.

## Third-party software

TAILAM has exactly one runtime third-party dependency:

| Library | Purpose | Loaded from | License |
|---|---|---|---|
| ExcelJS 4.4.0 | Styled `.xlsx` export | Pinned CDN version (cdnjs) | MIT License (per ExcelJS's own published license) |

ExcelJS is loaded via a `<script>` tag pointed at a specific, pinned
version and is used only when the user requests an Excel export; it is
never bundled, modified, or redistributed as part of this repository's own
source. No other third-party runtime library, framework, or package is
used — TAILAM's own code has no other dependency.

## Engineering standards referenced

TAILAM's diagnostic engine implements interpretation logic informed by the
following standards and technical brochures. **TAILAM does not reproduce,
quote, or redistribute any copyrighted text, table, or figure from these
documents** — see `docs/standards/` for exactly what "implements" means in
each case (a software encoding of publicly-practiced diagnostic
methodology, not a copy of the standard itself).

- IEC 60599 (International Electrotechnical Commission)
- IEC 60567 (International Electrotechnical Commission)
- IEC 60422 (International Electrotechnical Commission)
- IEEE C57.104 (Institute of Electrical and Electronics Engineers)
- CIGRE Technical Brochures 443 and 771 (International Council on Large
  Electric Systems)

These standards remain the copyrighted property of their respective
publishing bodies (IEC, IEEE, CIGRE). Engineers who need the authoritative
source text, tables, or figures should obtain the official documents
through the publisher's own channel. TAILAM's implementation notes in
`docs/standards/` exist to document *how* the software applies each
standard's guidance, not to serve as a substitute for reading the standard
itself.

## Documentation license

This documentation set (`docs/`) is provided under the same licensing
status as the codebase — see "Software license" above. Until a formal
license is chosen, treat this documentation as all-rights-reserved,
internal-use material.

## No warranty

TAILAM is provided for engineering guidance only. It carries no warranty
of any kind, express or implied, including but not limited to accuracy,
fitness for a particular purpose, or merchantability, until and unless a
formal license file states otherwise. Results support, but do not
replace, the judgment of a qualified transformer engineer.
