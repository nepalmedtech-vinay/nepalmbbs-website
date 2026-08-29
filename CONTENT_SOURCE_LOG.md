# CONTENT_SOURCE_LOG.md

Per the master brief §11 (official data first, zero fabrication): every
important factual claim on the site should have a source, URL, date
checked, and confidence status recorded here. This file did not exist
before this session — it is being started, not completed.

**Current state: all 27 colleges have had a first-pass check** (see the
three tables below and the summary after them). This is *first-pass,
search-snippet-level* verification, not primary-source confirmation —
see the environment limitation immediately below. Treat a ✅ here as
"corroborated by independent secondary sources," not "certified."

## ✅ Seat counts — transcribed from the Commission's own matrix (2026-08-28)

The owner supplied the document this log had been asking for:
**MECEE-BL 2026, Seats for Foreign Sub-Category-II (First Matching)**,
published and signed by the Medical Education Commission. All 27 seat
figures now come from it rather than from secondary agreement.

**Integrity check before applying:** the transcription sums to **734**,
which is the total the document itself states. A transcription that adds
up to the source's own total is unlikely to contain a silent digit error.

### Four figures were wrong, all of them overstated

| College | Site said | Commission says |
|---|---:|---:|
| Institute of Medicine | 9 | **2** |
| B.P. Koirala Institute of Health Sciences | 9 | **3** |
| Patan Academy of Health Sciences | 6 | **5** |
| Manipal College of Medical Sciences | 60 | **59** |

The IOM error is the one that matters: the site was advertising **four and
a half times** the seats that actually exist in this category, at the most
sought-after government institution in the country. A family shortlisting
on 9 seats versus 2 is making a materially different decision.

Site-wide total drops from **749 to 734**, which corrects the headline
figure on the home page, the colleges index and the college map — all
three compute it from this file, so none needed editing.

### Two open questions the document closed on its own

- **Kathmandu Medical College: 43, not 33.** The site's figure was right
  and the secondary source that said 33 was wrong. Conflict resolved.
- **Pokhara Academy of Health Sciences appears in the list, at 4 seats.**
  This retires the 🔴 flag raised earlier in this log, which questioned
  whether PoAHS had a running MBBS programme at all. It does, and it takes
  foreign-quota students.

### What the figure is, and is not

Recorded on each college record as `seatsSource`, and stated on each
college page rather than left in this file:

- it is the **Foreign Sub-Category-II** allocation — not the total intake,
  which also spans paying, scholarship and Nepal Army Welfare Fund seats;
- it is the **First Matching** round of the **2026** intake — a
  first-round allocation, not a standing figure. Later rounds move.

### One naming note worth keeping

The Commission lists **"Maharajgunj Medical Campus" (2 seats)** where this
site says "Institute of Medicine (IOM)". Maharajgunj is IOM's constituent
medical campus and is the only IOM entity in the list, so the mapping is
sound — but if a future editor cross-checks names mechanically, that row
will not match and this note is why. The Commission also writes
"Purbanchal University School of Medicine" where the site says "Purbanchal
University School of Health Sciences".

## 🎯 The primary source for every seat count — found, not yet read

Chasing the Kathmandu Medical College seat conflict (this file records 43,
one secondary source says 33) surfaced the document that settles it, and
settles all 27 at once. **The Medical Education Commission publishes the
seat matrix itself:**

- **`https://www.mec.gov.np/uploads/shares/ug2024/ug_2024__seats.pdf`** — the
  2024 intake seat allocation
- `https://mec.gov.np/uploads/shares/ug/UG_2023_Seats.pdf` — 2023, for
  comparison
- `https://entrance.mec.gov.np/Report/CollegeSeatInfo/List` — the live
  college seat listing on the entrance portal
- `https://mec.gov.np/uploads/shares/ug2024/1st_paying_list.pdf` and
  `.../first_admission_list_scholarship.pdf` — the admission lists, which
  show the categories a seat can fall into (Nepal Army Welfare Fund,
  Foreign, Paying, Scholarship)

**This session could not read them.** `WebFetch` is blocked for every
domain in this sandbox, and these are PDFs behind that block.

**Why this entry matters more than another round of searching.** Every
seat number on this site currently rests on secondary agreement. One
person opening that PDF replaces all 27 guesses with the authority's own
figures, and resolves the KMC 43-vs-33 conflict as a side effect. That is
an afternoon's work with a browser, not a research project — and it is the
single highest-value thing anyone can do for this dataset.

Note while reading it: the admission lists show seats are split across
several categories. "Foreign quota" is one column among Paying,
Scholarship and Army — so a college's *total* intake is not its foreign
quota, and the figure this site publishes must be the foreign one.

## Third pass, 2026-08-28 — the six colleges with no website on file

These six had neither an `established` year nor a website recorded. Each
was searched with results restricted to its own domain.

| College | Applied | Official source |
|---|---|---|
| Nepal Medical College, Jorpati | est. **1996**, website `nmcth.edu` | [nmcth.edu/about](https://www.nmcth.edu/about) — "established in 1996 AD". Note: aggregators gave 1997; the institution's own site gives 1996, and it wins. |
| Nepalgunj Medical College | est. **1997**, website `ngmc.edu.np`, location **Kohalpur, Banke** | [ngmc.edu.np — historical background](https://ngmc.edu.np/about-us/historical-background) — "established in 1997 under the aegis of Lord Buddha Educational Academy". Its own site places the teaching hospital at Kohalpur and the basic-science campus at Chisapani, so "Nepalgunj" alone was imprecise. Aggregators gave 1996. |
| National Medical College, Birgunj | est. **2001**, website `nmcbir.edu.np` | [nmcbir.edu.np/about-us](https://nmcbir.edu.np/about-us) — "established in the year 2001, promoted by National Medical College Company Pvt. Ltd." |
| Gandaki Medical College | website `gmc.edu.np` only | Official domain confirmed; no founding year stated in anything readable. `established` deliberately left blank rather than filled from an aggregator. |
| Janaki Medical College | website `janakimedicalcollege.edu.np` only | Official domain confirmed; no founding year readable. Left blank. |
| Birat Medical College | website `biratmedicalcollegenepal.com` only | ⚠️ **Its own about-us page has been read as giving both 1991 and 2014.** A source that contradicts itself is not a source. `established` left blank until someone can resolve it against a registration document. |

**A note on what was *not* taken.** National Medical College's own site
describes itself as "number one among all medical colleges in Nepal".
That is the institution's marketing, not a fact this site can carry, and
nothing of that kind was copied across — only the factual fields.

## Second pass, 2026-08-28 — official-domain evidence + corrections applied

The first pass below used general web search, which surfaces aggregator
sites (edusanjal, edufever, consultancy pages) as often as primary ones.
A second pass used `WebSearch`'s `allowed_domains` filter to restrict
results **to each institution's own website**, which is much stronger
evidence and is what the fixes below rest on. (`WebFetch` remains blocked
— see the limitation note after this section — so this is still
snippet-level reading of official pages, not full-page reads.)

### Corrections applied to `src/data/colleges.json`

| College | Field | Was | Now | Official source |
|---|---|---|---|---|
| Universal College of Medical Sciences | `name` | "Universal **Medicine College** (UCMS)" | "Universal **College of Medical Sciences** (UCMS)" | [ucms.edu.np](https://ucms.edu.np/about/introduction/) — the site's own page titles read "Universal College of Medical Sciences" throughout |
| Universal College of Medical Sciences | `established` | *(blank)* | 1998 | ucms.edu.np: "founded in 1998 with accreditation from Tribhuwan University" |
| Universal College of Medical Sciences | `website` | `null` | `https://ucms.edu.np` | confirmed live official domain |
| College of Medical Sciences, Bharatpur | `established` | 1994 | 1993 | [cmsnepal.edu.np](https://cmsnepal.edu.np/introduction/): ISME and the Ministry of Education "signed an agreement on the 8th day of August **1993** giving birth to the College of Medical Sciences-Nepal". 1994 matches no date on their own site. (Their first MBBS intake was **1996** — noted here so a future editor knows the two candidate meanings and doesn't "correct" 1993 back.) |
| Nepalese Army Institute of Health Sciences | `website` | `null` | `https://naihs.edu.np` | official domain confirmed live, hosts their MBBS material |
| Rapti Academy of Health Sciences | `website` | `null` | `https://www.rahs.edu.np` | official domain; also re-confirmed est. 2017 from their own site |

### ❌ A correction to my own earlier finding — PAHS was NOT wrong

The first pass flagged Patan Academy of Health Sciences' `established:
"2010"` as contradicted, because several secondary sources give 2008
(the parliamentary charter year). **That flag was wrong and has been
withdrawn.** PAHS's own website says the academy's School of Medicine
"began to teach prospective doctors in **2010**" — so 2010 and 2008 are
both true and simply mean different things (teaching start vs. charter).
The site's existing value is defensible and was left alone.

This is exactly why the first pass deliberately changed nothing: had
those findings been auto-applied, this one would have replaced a correct
value with a differently-correct-but-unintended one, and the site would
have silently lost the meaning it had chosen. Worth remembering before
bulk-"fixing" the remaining blanks.

### ⚠️ PoAHS — earlier alarm downgraded, but still not resolved

The first pass raised Pokhara Academy of Health Sciences as a possible
"listed but has no MBBS program" case. Searching their own domains
found a **dedicated MBBS page at `poahs.edu.np/pages/MBBS/`**, which is
meaningful evidence the program does exist. The "working to launch MBBS
by 2024" language that triggered the alarm sits on `pahs.gov.np`'s
about-us page and reads as pre-2024 text that was never updated.

**Downgraded from 🔴 to ⚠️.** Still unresolved: whether it currently
admits *foreign-quota* students and whether the site's figure of 4 seats
is right. Neither could be read from search snippets. Worth confirming
with MEC before the next intake, but it is no longer a "we may be
advertising seats that don't exist" concern.

### Still open after this pass

- **Kathmandu Medical College seats (site 43 vs. one secondary source 33)** —
  KMC's own site describes the admission process but the snippets did not
  expose a foreign-quota number. Unresolved; needs MEC or a direct call.
- **NAIHS `established`** — still blank. Their own site did not state a
  founding year in the snippets; secondary sources give 2010 (Ministry of
  Defence approval) or 2012 (presidential inauguration). Left blank rather
  than guessing between two defensible dates.
- **The other blank `established` fields** (Nepal Medical College Jorpati,
  Birat, Nepalgunj, Gandaki, National, Janaki, Purbanchal USHS) — sourced
  candidates exist in the first-pass tables below, but from aggregators,
  not official domains. Deliberately **not** applied. The PAHS lesson
  above is the reason: an aggregator's "established" year may be a
  different milestone than the one this dataset means.
- **Three programs whose MBBS is very new** (B&C 2024, MIHS 2024, Madan
  Bhandari 2025) — still not surfaced anywhere on the site.

## ⚠️ Environment limitation, read before continuing this work

`WebFetch` (fetching a specific page's full content) is blocked by this
sandbox's network egress policy for every domain tried, including
`mec.gov.np` itself, official college sites, Wikipedia, and news outlets
(tested against 4+ distinct domains, all refused with `EGRESS_BLOCKED` —
this is the sandbox's policy, not a per-domain issue). `WebSearch` still
works and returns real snippets with citable URLs, so verification below
was done from search-result snippets only, not by reading a full official
page or PDF. This is real but shallower evidence than "read the MEC
notice directly" — good enough to catch a wrong year or a genuinely
missing program, not good enough to certify an exact current seat count.
A session with unblocked `WebFetch` (or the owner checking directly)
should treat every row below as a lead to confirm more deeply, not a
closed case.

## Findings — government colleges (checked 2026-08-28)

| Claim | Where it appears | What was found | Source | Status |
|---|---|---|---|---|
| IOM established 1972 | `institute-of-medicine` | Multiple independent sources agree: 1972 | [Wikipedia](https://en.wikipedia.org/wiki/Institute_of_Medicine,_Nepal), [iom.edu.np](https://iom.edu.np/foreign-students/) | ✅ confirmed |
| BPKIHS established 1993 | `b-p-koirala-institute-of-health-sciences` | Established Jan 18, 1993; MBBS began 1994; upgraded to autonomous university Oct 1998 | [Wikipedia](https://en.wikipedia.org/wiki/B._P._Koirala_Institute_of_Health_Sciences), [bpkihs.edu](https://bpkihs.edu/2025/about/introduction) | ✅ confirmed |
| PAHS established 2010 | `patan-academy-of-health-sciences` | Multiple sources (Wikipedia, edufever, bodmaseducation) independently give **2008** (2064 B.S.), not 2010, as the parliamentary charter year | [Wikipedia](https://en.wikipedia.org/wiki/Patan_Academy_of_Health_Sciences), [PAHS MBBS program](https://web.pahs.edu.np/programs/pahs-mbbs-program/) | ❌ **contradicted** — see note below |
| KAHS established 2011 | `karnali-academy-of-health-sciences` | Established by Act of Parliament, Oct 20, 2011 (upgraded from Karnali Zonal Hospital) | [Wikipedia](https://en.wikipedia.org/wiki/Karnali_Academy_of_Health_Sciences), [kahs.edu.np](https://kahs.edu.np/) | ✅ confirmed |
| Nepalese Army IHS established — *(currently blank on site)* | `nepalese-army-institute-of-health-sciences` | Ministry of Defence approval: Bhadra 30, 2067 B.S. = **2010**; inaugurated by the President: 10 Jestha 2069 B.S. = **23 May 2012** | [naihs.edu.np](https://naihs.edu.np/), [edusanjal](https://edusanjal.com/college/naihs-college-medicine/) | ⚠️ two candidate years, needs a call — approval (2010) or inauguration (2012)? |
| Pokhara AHS — listed as MBBS-admitting, 4 foreign-quota seats | `pokhara-academy-of-health-sciences` | **Contradictory.** One source: PoAHS was still only "working towards launching MBBS by 2024," offering MD/MS only as of that writing. A second, separately-worded result calls it MBBS-offering but appears to conflate PoAHS (Pokhara) with the differently-named PAHS (Patan) mid-paragraph — a real, easy mix-up given the near-identical acronyms. Could not resolve with search alone (`WebFetch` to `pahs.gov.np` blocked). | [Wikipedia](https://en.wikipedia.org/wiki/Pokhara_Academy_of_Health_Sciences), [pahs.gov.np/about-us](https://pahs.gov.np/about-us) | 🔴 **needs urgent direct verification** — if PoAHS does not actually have a running, recognised MBBS intake, it should not be listed among the 27 colleges at all. This is a "could this be actively misleading a family" case, not a routine data-freshness one. |
| MIHS established 2021 | `madhesh-institute-of-health-sciences` | Established 2021 under the Madhesh Institute of Health Science Act 2077; MBBS program itself only started **2024**, 50-student MEC permission | [edusanjal](https://edusanjal.com/university/madhesh-institute-health-sciences/), [mihs.edu.np](https://mihs.edu.np/) | ✅ established year confirmed; note MBBS is very new (since 2024) — worth stating on the college's own page as a trust signal, not hiding a young program |
| Rapti AHS established 2017 | `rapti-academy-of-health-sciences` | "Rapti Health Science Academy Bill 2074" (2017) passed unanimously by parliament, upgrading Rapti Sub-regional Hospital | [Wikipedia](https://en.wikipedia.org/wiki/Rapti_Academy_of_Health_Sciences), [rahs.edu.np](https://www.rahs.edu.np/about-us/introduction) | ✅ confirmed |
| Madan Bhandari AHS established 2018 | `madan-bhandari-academy-of-health-sciences` | Established by Provincial Act, 2018, Hetauda. **MBBS program itself only launched in 2025** — scholarship for 37 of 50 total MBBS seats mentioned, but that figure isn't clearly the foreign quota specifically | [Wikipedia](https://en.wikipedia.org/wiki/Madan_Bhandari_Academy_of_Health_Sciences), [mbahs.edu.np](https://mbahs.edu.np/pages/introduction/) | ✅ established year confirmed; ⚠️ MBBS is extremely new (2025) — the foreign-quota seat figure (site says 4) could not be independently confirmed and deserves a direct check given how new the program is |
| Purbanchal USHS established — *(currently blank on site)* | `purbanchal-university-school-of-health-sciences` | Purbanchal **University** (the parent) was established 1993 — but PUSHS as a constituent school may have a later, distinct founding date not found in this search. One source describes PUSHS as standing "alongside a **forthcoming** medical college and teaching hospital," which may signal the teaching-hospital side is still being built out | [pufomas.edu.np](https://www.pufomas.edu.np/pushs/about), [pushs.edu.np](https://pushs.edu.np/) | ⚠️ could not verify a PUSHS-specific founding year (1993 is the university's, not necessarily this school's) — do not fill in 1993 without confirming it's the right date for this specific school |

## Findings — Kathmandu University-affiliated colleges (checked 2026-08-28)

| Claim | Where it appears | What was found | Source | Status |
|---|---|---|---|---|
| Manipal MCOMS est. 1994 | `manipal-college-of-medical-sciences` | Opened 1994 with an MBBS program; first private medical institute in Nepal post-1990 liberalisation | [Wikipedia](https://en.wikipedia.org/wiki/Manipal_College_of_Medical_Sciences), [manipal.edu](https://www.manipal.edu/campus/mcoms.html) | ✅ confirmed |
| CMS Bharatpur est. 1994 | `college-of-medical-sciences` | Three candidate dates found, **none of them 1994**: agreement signed 8 Aug **1993**; letter of intent **1993**; first MBBS batch **1996** (Wikipedia gives 1996 as "established") | [Wikipedia](https://en.wikipedia.org/wiki/College_of_Medical_Sciences,_Bharatpur), [cmsnepal.edu.np](https://cmsnepal.edu.np/) | ❌ **contradicted** — 1994 matches no source found. Likely should be 1993 (founding) or 1996 (first intake); pick one and label which it means |
| KUSMS est. 2001 | `kathmandu-university-school-of-medical-sciences` | MBBS program began 7 Sept 2001 with Dhulikhel Hospital | [Wikipedia](https://en.wikipedia.org/wiki/Kathmandu_University_School_of_Medical_Sciences), [kusms.edu.np](https://kusms.edu.np/) | ✅ confirmed |
| KMC est. 1997; **43** foreign seats | `kathmandu-medical-college` | Established 1997 ✅. But one source states "100 seats for MBBS with **33** foreign seats" — not 43 | [Wikipedia](https://en.wikipedia.org/wiki/Kathmandu_Medical_College) | ✅ year confirmed; ⚠️ **seat count conflicts** (33 vs the site's 43) — needs a direct MEC check |
| Nepal Medical College Jorpati est. — *(blank on site)* | `nepal-medical-college-jorpati` | Most sources: **1997** (teaching hospital also 1997); one outlier says 1994 | [Wikipedia](https://en.wikipedia.org/wiki/Nepal_Medical_College) | ⬜ gap fillable with 1997, pending confirmation |
| Nobel est. 2004 | `nobel-medical-college-teaching-hospital` | Established 2004, Biratnagar; KU-affiliated, NMC-recognised | [nobelmedicalcollege.com.np](https://www.nobelmedicalcollege.com.np/about) | ✅ confirmed |
| Birat Medical College est. — *(blank on site)* | `birat-medical-college-biratnagar` | **2014** (one outlier source says 1991, which looks wrong) | [biratmedicalcollegenepal.com](https://biratmedicalcollegenepal.com/about-us.php) | ⬜ gap fillable with 2014, pending confirmation |
| Nepalgunj est. — *(blank)*; location "Nepalgunj" | `nepalgunj-medical-college` | Established **1996**, MBBS from 1997. Note the campus/teaching hospital is at **Kohalpur**, Banke (750-bed), with a second 250-bed hospital at Nepalgunj — so "Nepalgunj" alone is imprecise as the location | [Wikipedia](https://en.wikipedia.org/wiki/Nepalgunj_Medical_College) | ⬜ year fillable with 1996; ⚠️ location field arguably should say Kohalpur, Banke |
| Lumbini est. 2009 | `lumbini-medical-college-teaching-hospital` | 2009 per most sources (one says 2008) | [edusanjal](https://edusanjal.com/college/lumbini-medical-college/) | ✅ confirmed (minor 2008/2009 variance) |
| Devdaha est. 2008 | `devdaha-medical-college-research-institute` | Established 2008, Devdaha-9, Rupandehi; KU affiliation for MBBS | [edusanjal](https://edusanjal.com/college/devdaha-medical-college/) | ✅ confirmed |
| B&C Medical College est. — *(blank)* | `b-c-medical-college-and-teaching-hospital` | Hospital opened **2015**; the **medical college formally commenced 2024**, MBBS offered from **2024 AD** | [Wikipedia](https://en.wikipedia.org/wiki/B&C_Medical_College_Teaching_Hospital_and_Research_Center), [bncmedicalcollege.edu.np](https://bncmedicalcollege.edu.np/) | ⚠️ **MBBS program is brand new (2024)** — a family should be told this plainly; a 1-year-old program is a materially different proposition from a 30-year-old one |

## Findings — Tribhuvan University-affiliated colleges (checked 2026-08-28)

| Claim | Where it appears | What was found | Source | Status |
|---|---|---|---|---|
| KIST est. 2006 | `kist-medical-college-teaching-hospital` | Established BS 2062 = 2006 AD; **MBBS itself started BS 2065 = 2008** | [kistmcth.edu.np](https://kistmcth.edu.np/kist/about-hospital) | ✅ confirmed |
| Chitwan Medical College est. 2006 | `chitwan-medical-college` | Established 20 June 2006, TU-affiliated | [Wikipedia](https://en.wikipedia.org/wiki/Chitwan_Medical_College) | ✅ confirmed |
| Gandaki est. — *(blank on site)* | `gandaki-medical-college` | **2007**, Pokhara, TU-affiliated (GMCTHRC) | [collegesnepal](https://www.collegesnepal.com/gandaki-medical-college/) | ⬜ gap fillable with 2007, pending confirmation (sources here are aggregators, not the college's own site) |
| National Medical College Birgunj est. — *(blank)* | `national-medical-college-birgunj` | **2001**, TU-affiliated, NMC-recognised, 1,050-bed teaching hospital | [edusanjal](https://edusanjal.com/college/national-medical-college/) | ⬜ gap fillable with 2001, pending confirmation |
| **Name: "Universal Medicine College (UCMS)"** | `universal-medicine-college` | The institution's actual name is **"Universal College of Medical Sciences"** — the site's name is wrong, though the "UCMS" acronym is right. Established **1998**, Bhairahawa, affiliated to TU's Institute of Medicine | [ucms.edu.np](https://ucms.edu.np/about/introduction/) | ❌ **name is incorrect** — an admissions site getting an institution's name wrong is a credibility problem in itself. Also: est. 1998 fillable |
| Janaki est. — *(blank on site)* | `janaki-medical-college` | **2003** per Wikipedia (one source says 1999); Janakpur, TU/IOM association | [Wikipedia](https://en.wikipedia.org/wiki/Janaki_Medical_College) | ⬜ gap fillable with 2003, pending confirmation |

## Summary of what this pass found

All 27 colleges have now had at least a first-pass search check. Headline
results:

- **1 name is wrong** — "Universal Medicine College" should be
  "Universal College of Medical Sciences".
- **2 established years look wrong** — PAHS (site 2010, sources 2008) and
  CMS Bharatpur (site 1994, sources 1993 or 1996, never 1994).
- **1 seat count conflicts** — KMC (site 43, one source 33).
- **1 program's existence is unconfirmed** — PoAHS (see 🔴 above and
  `NEXT_TASK.md`).
- **3 MBBS programs are brand new** and the site doesn't say so: B&C
  (2024), MIHS (2024), Madan Bhandari (2025). Not an error, but a family
  choosing a college would reasonably want to know a program is in its
  first or second intake.
- **9 blank `established` fields are fillable** from sources found here
  (Nepal Medical College 1997, Birat 2014, Nepalgunj 1996, Gandaki 2007,
  National 2001, UCMS 1998, Janaki 2003, NAIHS 2010-or-2012, plus
  Purbanchal USHS still unresolved).
- **1 location is imprecise** — Nepalgunj Medical College's campus is at
  Kohalpur, Banke.

**Nothing in `src/data/colleges.json` was changed based on any of this.**
Editing a live data file from search-snippet-level evidence, without being
able to read the primary source directly, risks trading one unverified
claim for another. These are findings for a human (or a future session
with working `WebFetch`) to act on, not applied fixes.

One genuinely reassuring cross-check found along the way: a
Kathmandu Post article (Aug 2026) independently confirmed KUSMS's 43
foreign-quota seats exactly matches what's already in `colleges.json` —
so the repeated "43" across several `ku`-affiliated colleges is plausibly
a real, uniform per-university policy (43 of a 130-seat program is
~33%, matching the legal cap), not a copy-paste error. The KMC 33-vs-43
conflict above is the one data point that cuts against that theory, so
it is worth resolving specifically.

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
3. **Fee figures — not currently planned.** A later session (2026-08-28)
   found that the codebase already has a deliberate, written editorial
   decision not to publish fee figures at all ("a number that is stale by
   the time you read it is worse than no number" — see `colleges/[slug].astro`
   and `colleges/index.astro`), because fees are set per intake and go
   stale. `NEXT_TASK.md` now says explicitly not to build a fee calculator
   without the owner revisiting that decision first. If that ever changes,
   any fee data shown must still carry OFFICIAL / ESTIMATED / CALCULATED
   labeling per brief §10.E, sourced here first.
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
