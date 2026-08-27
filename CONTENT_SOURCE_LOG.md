# CONTENT_SOURCE_LOG.md

Per the master brief §11 (official data first, zero fabrication): every
important factual claim on the site should have a source, URL, date
checked, and confidence status recorded here. This file did not exist
before this session — it is being started, not completed.

**Current state: empty inventory, not a verified log.** Do not read the
absence of a "contradicted" row below as confirmation that the site's
existing claims are correct — nothing has been checked against an
official source yet. Treat every unsourced claim currently on the site as
**unverified**, not as false and not as confirmed.

## Format for each entry, once research starts

| Claim | Where it appears | Source | URL | Date checked | Status |
|---|---|---|---|---|---|
| e.g. "IOM, est. 1972" | `src/data/colleges.json` → `institute-of-medicine` | Institute of Medicine official site | (fill in) | (fill in) | ⬜ unverified / ✅ confirmed / ⚠️ could not verify / ❌ contradicted |

## What needs sourcing (priority order)

1. **`src/data/colleges.json` — all 27 colleges.** Fields currently
   asserted with no source on file: `type`, `badge` (recognition status),
   `affiliation`, `established`, `seats`, `admission` (route). Seat counts
   and admission routes are the two fields most likely to actually change
   year to year and most damaging to get wrong for a family making a
   five-and-a-half-year, high-stakes decision.
2. **Any NEET-eligibility rules** encoded in `neet-calculator.astro` and
   its supporting JS — these should trace to Medical Education Commission
   (MEC) Nepal / National Medical Commission (India) publications, not be
   left as engineering assumptions.
3. **Any fee figures**, once a fee/cost planner is built (see
   `TECHNICAL_DEBT.md` and `NEXT_TASK.md`) — must ship with OFFICIAL /
   ESTIMATED / CALCULATED labeling from day one, per brief §10.E, not
   retrofitted later.
4. **Deadline/announcement content**, if a deadline center is built —
   dates must never be invented; every date needs a source and a
   last-checked timestamp visible on the page, not just in this log.

## Recommended official sources (starting list, not exhaustive)

- Medical Education Commission, Nepal (MEC) — entrance/admission rules
- Nepal Medical Council — recognition/registration status
- Individual college official websites — the `website` field already in
  `colleges.json` for each entry is the starting point for verifying that
  college's own claims
- National Medical Commission, India / Government of India — for
  NEET-related eligibility rules affecting Indian students
- Tribhuvan University / Kathmandu University / other affiliating
  universities named in `colleges.json`'s `affiliation` field

## Why this is logged separately from a normal code review

Verifying 27 institutions' current admission data against live official
sources is slow, external-fact-checking work — it does not compress into
a single coding session the way a test fix does, and rushing it risks
exactly the fabrication the brief prohibits. Recorded here as an explicit,
named, not-yet-done task rather than silently skipped.
