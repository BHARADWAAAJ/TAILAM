# TAILAM Roadmap

This roadmap describes planned direction, not a committed schedule. Dates
are intentionally omitted — each version ships when its scope is complete
and validated, not on a fixed calendar. Nothing in this document
authorizes or implies work has begun on any Version 2.0 or 3.0 item; per
TAILAM's engineering-freeze policy, no roadmap item is implemented without
its own dedicated, reviewed sprint.

## Version 1.0 (current)

Single-session, single-sample DGA interpretation for main tank and OLTC,
with a full standards-referenced diagnostic engine, professional
Engineering Workspace presentation, three export formats, and an internal
validation framework. See `RELEASE_NOTES_v1.0.0.md`.

## Version 1.1 — Minor enhancements

Small, low-risk improvements within the existing single-sample scope:

- Expanding the validation framework's standards-conformance datasets from
  structural placeholders to fully-sourced published worked examples (see
  `docs/validation/Reference_Datasets.md` §3).
- Accessibility refinements beyond the Version 1.0 baseline.
- Minor usability polish identified from real-world Version 1.0 usage,
  scoped to not require any engineering-calculation or UI-layout change
  beyond what the frozen-engine/frozen-UI policy allows for a point
  release.

## Version 2.0 — Trend and fleet capability

The next major capability tier, moving beyond single-sample analysis:

- **Trend Analysis** — track a transformer's gas values across multiple
  samples over time, surfacing rate-of-change rather than only a
  point-in-time snapshot.
- **Fleet Health** — an overview across multiple transformers at once,
  rather than one analysis per session.
- **Historical Comparison** — compare a current sample against a
  transformer's own prior results.
- **Laboratory Import** — accept lab-report data files directly instead of
  manual gas-value entry.
- **Transformer Ranking** — prioritize a fleet by relative condition
  severity.
- **Maintenance Planning** — turn accumulated findings into a scheduled
  maintenance view.
- **Enterprise Reporting** — multi-transformer, multi-period report
  generation beyond the current single-analysis PDF/Excel/CSV exports.

Version 2.0 necessarily introduces persistent data storage (a fleet and
its history cannot exist in browser memory alone) — this is a significant
architectural expansion beyond Version 1.0's zero-backend design and will
be scoped and documented as its own architecture decision when undertaken.

## Version 3.0 — Enterprise platform

- **Enterprise Asset Management** — full lifecycle tracking beyond DGA
  interpretation alone.
- **Multi-user collaboration** — shared access to fleet data across a
  team.
- **Role-based permissions** — differentiated access for engineers,
  reviewers, and administrators.
- **API integration** — programmatic access for connecting TAILAM to
  other enterprise systems.
- **Cloud synchronization** — data availability across devices and
  sessions.
- **AI-assisted maintenance planning** — recommendation support layered
  on top of (never replacing) the standards-based diagnostic engine.

## Design commitment across every future version

Whatever is added in Version 2.0 or 3.0, the following Version 1.0
commitments carry forward as non-negotiable:

- The diagnostic engine remains standards-referenced and validated —
  no method ships without a documented basis and a validation dataset.
- Every engineering calculation remains transparent and auditable in
  source form — no black-box scoring.
- TAILAM's results continue to support, never replace, the judgment of a
  qualified transformer engineer.
