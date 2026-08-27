# Going live

**Nothing in this branch is running anywhere yet.** The migrations are written
and proven against a real Postgres, the site builds and passes its suites, and
production still serves the old build against the old database. This is the
order to change that in, and what to check at each step so a failure stops you
rather than surprises you a week later.

Read the whole page before starting the first step. Steps 1 and 2 are the ones
that are hard to undo.

---

## Before anything: the exposure that is live right now

The anon key ships in the page, as it is designed to. What decides whether that
matters is Row Level Security. Until 0001 runs, check whether your enquiry list
is currently downloadable by anyone who views source — paste this in a browser
console on nepalmbbs.in:

```js
fetch('https://fpzgcijbryvddtpegcmm.supabase.co/rest/v1/leads?select=student_name,contact_number&limit=1',
      { headers: { apikey: '<the anon key from the page source>' } })
  .then(r => r.json()).then(console.log)
```

If that returns a student's name and phone number, the exposure is live and
step 1 is urgent. If it returns `[]`, RLS is already on and step 1 is
housekeeping. Either way run it — do not assume which.

---

## 1. Apply the migrations

In the Supabase SQL editor for project `fpzgcijbryvddtpegcmm`, **in this order**,
one file at a time, reading the result of each before starting the next:

| File | What it does | Reversible? |
|---|---|---|
| `0001_security_baseline.sql` | RLS on every table; `staff`; `is_staff()` | Yes — the file names the rollback |
| `0002_admission_platform.sql` | applications, documents, notes, tasks, sequences, the portal function | Additive; drops nothing |
| `0003_abuse_and_storage.sql` | rate limits, CHECK constraints, the private documents bucket | Additive |
| `0004_lead_intake.sql` | lead → application conversion; seeded sequences | Additive |

Each file ends with an **AFTER RUNNING** block. Run those checks. They are
short and they are the difference between "it applied" and "it works".

### What will break, on purpose, the moment 0001 lands

The current admin dashboard reads leads with the anon key. After 0001 it will
show an empty list. That is the correct outcome — it was reading them with a key
the public also holds. It is fixed by step 3.

### If the enquiry form stops accepting submissions

That is the one failure worth rolling back immediately rather than debugging
live, because it silently costs you students:

```sql
alter table public.leads disable row level security;
```

Then work out why with no clock running.

---

## 2. Create the first staff account

RLS answers "is this request from someone in `staff`?". Right now nobody is.

1. Supabase dashboard → Authentication → Users → **Add user**. Use a real
   address you control; set a password you have not used elsewhere.
2. Copy the new user's UUID.
3. In the SQL editor:

```sql
insert into public.staff (id, email, full_name, role)
values ('<paste the uuid>', '<the same email>', '<your name>', 'admin');
```

4. Confirm it took:

```sql
select public.is_admin();   -- run while signed in as that user; expect true
```

Repeat 1–3 for each counselor with `'counselor'` instead of `'admin'`. The
difference is that only an admin can delete leads, delete documents, or manage
staff.

---

## 3. Deploy the site

Order matters here too: the new admin panel needs Supabase Auth, and Supabase
Auth needs step 2 done, or you will lock yourself out of your own dashboard.

Follow `DEPLOYMENT.md` for connecting the repository. Two things specific to
this branch:

- **`netlify.toml` carries a Content-Security-Policy** generated from the build.
  If you ever edit an inline `<script>`, its hash changes and the policy goes
  stale — a stale script hash does not degrade, it blanks the page. `npm run
  verify` fails when netlify.toml has drifted; `npm run csp` regenerates it.
  Do not hand-edit the generated block.
- **Check the two tracker apps after the first deploy.** They keep their own
  relaxed policy on `/wrc-tracker/*` and `/cmc-tracker/*`. Load each one and
  use its export button; the first CSP draft silently blocked `wrc-tracker`'s
  Excel library, which is exactly the kind of thing that looks fine on the
  homepage.

---

## 4. Check it end to end

Not "does the page load" — the specific things that are quiet when they break:

1. **The enquiry form still submits.** From a logged-out browser. This is the
   business; check it first.
2. **The list is no longer public.** Re-run the console snippet at the top of
   this page. Expect `[]`.
3. **Sign in at `/staff`.** You should see the console. Sign in with an account
   that authenticates but is *not* in `staff` — you should be refused and signed
   back out.
4. **Convert an enquiry.** Press *Start application* on a test enquiry. Expect an
   application on the board at *Enquiry*, the form's free text as the first
   note, and **four tasks** appearing in the queue over the following week. If
   there are no tasks, the sequences did not seed — check
   `select count(*) from public.sequence_steps;`.
5. **Open the student portal.** Take the application's `access_token`:

   ```sql
   select access_token from public.applications order by created_at desc limit 1;
   ```

   Visit `/portal?t=<token>`. You should see the student's own view — and the
   token should vanish from the address bar. Then check that a wrong token is
   refused: `/portal?t=nonsense`.
6. **Confirm the portal shows no internal notes.** Add an internal note in the
   console, reload the portal. It must not appear. The portal reads through
   `portal_application()`, whose projection has no notes column; this checks
   that the deployed function is that one.

---

## 5. Housekeeping worth doing once

```sql
-- Rate-limit counters are worthless after two days. Harmless without this;
-- tidier with it, if pg_cron is enabled.
select cron.schedule('sweep-rate-hits', '0 3 * * *', 'select public.sweep_rate_hits()');
```

---

## What is deliberately not built

Saying so is more useful than leaving you to discover it.

- **Student document upload.** The portal shows the checklist and its status;
  students send files by WhatsApp or email. `portal_upload_url()` exists and
  mints a path, but signing it needs a server-side key, which means an Edge
  Function that has not been written. The bucket is private and staff-only
  today, which is the safe half.
- **Messages are not sent.** Sequences materialise into a counselor's task
  queue at the right hour. Nothing here can send a WhatsApp or an email.
- **`style-src` still allows `unsafe-inline`.** 153 inline style attributes
  remain. Style injection is a much weaker vector than script injection, and
  removing them is a large refactor; `script-src` is the one that mattered and
  it is strict.
- **The two tracker apps are untouched**, by instruction. `cmc-tracker` talks to
  a *different* Supabase project (`tgsiltcuisgejmdkovxz`) whose RLS posture has
  not been audited as part of this work. Its embedded key is an `anon` key,
  which is public by design and not a leak — but whether that project's tables
  are protected is a separate question, and worth asking.

---

## Rollback points

Tags, not guesses:

| Tag | Back to |
|---|---|
| `pre-phase0-baseline` | the original site, before any of this |
| `phase1-static-rollback` | the single-page build |
| `phase2-rollback` | before the multi-page architecture |
| `pre-premium-rollback` | before the visual redesign |
| `pre-glass-rollback` | before the glass system |

Database migrations are not covered by a git tag. 0002–0004 are additive and
drop nothing; 0001 is the only one that changes who can read what, and its own
rollback line is in the file.
