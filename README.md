# nepalmbbs.in

The public site for MBBS-in-Nepal admissions, plus the console the counselors
work in and the portal students track their own application from.

**Nothing on this branch is deployed.** Production still serves the previous
build against the previous database. `docs/GOLIVE.md` is the ordered runbook for
changing that.

---

## Run it

```bash
npm install
npm run dev            # localhost:4321
npm run build          # → dist/, 40 pages
npm run verify         # build + every browser suite (must be green before pushing)
bash supabase/test/run.sh   # the database suites, against a real Postgres
```

`npm run verify` also fails if `netlify.toml`'s generated
Content-Security-Policy has drifted from the build. `npm run csp` regenerates
it. Do not hand-edit the generated block — two of its directives are hashes of
inline scripts, and a stale script hash blanks the page rather than degrading.

---

## Layout

```
src/pages/            40 routes, incl. /staff (console) and /portal (student)
src/layouts/          GlassLayout is the site; `bare` drops the marketing chrome
public/assets/theme/  the design system — tokens, glass, aurora, motion
public/assets/js/     app code. auth.js holds the session; actions.js dispatches
                      every converted inline handler through an allow-list
supabase/migrations/  0001–0004, applied in order. Read them; they explain why
supabase/test/        assertions against a real Postgres, not a mock
tests/                browser suites
tools/                the codemods and the CSP generator
docs/                 GOLIVE, DEPLOYMENT, DESIGN-SYSTEM, SECURITY-PHASE0
```

`public/wrc-tracker/` and `public/cmc-tracker/` are standalone legacy apps,
copied verbatim and deliberately not modified. They keep their own relaxed CSP
on their own two paths. `cmc-tracker` talks to a different Supabase project
whose RLS posture has not been audited here.

---

## Two things to know before changing anything

**The database decides who sees what, not the UI.** Every screen sends the
signed-in counselor's JWT and the RLS policies in `0001`/`0002` answer. If a
screen asks for rows it should not have, the answer is an empty list, not a
leak. Never weaken a policy to make a screen easier to build — the screen is
the part that can be bypassed.

**There are no inline event handlers.** `script-src` carries no
`'unsafe-inline'`, which is what turns an HTML injection from a scripting bug
into a formatting bug. Markup carries intent as data:

```html
<button data-act="click" data-do='[["selectCollege","@el","all"]]'>
```

Adding a new handler means adding its name to `tools/action-allowlist.json`;
`npm run verify` fails if built HTML names anything outside it.

---

## Where the tests are pointed

They are weighted toward the things that are quiet when they break, not toward
rendering: that a wrong portal token and an expired one are indistinguishable to
whoever holds them, that internal notes never reach a student's screen, that a
name containing markup is drawn as text, that a valid account which is not staff
is refused, that the rate limiter refuses the seventh submission and not the
first, and that converting the same enquiry twice produces one student.
