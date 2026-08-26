# Phase 0 — Security & Stability Notes

This document covers the admin login change made in Phase 0 and the one action
that must be done by hand in the Supabase dashboard.

---

## 1. What changed in the admin login

**Before**

```js
const DEFAULT_PASS = 'NepalMBBS@2025';
...
if (pass === correctPass || pass === DEFAULT_PASS) { /* logged in */ }
```

Three problems:

1. The password was written in plain text in `index.html`, which is public.
   Anyone could open view-source and read it.
2. Because of `|| pass === DEFAULT_PASS`, that password kept working **even
   after** the admin changed it in Settings. Changing the password did not
   revoke it.
3. On every successful login the password was written to `localStorage`
   (`nmb_admin_pass`), leaving the secret readable on any shared device.

**After**

- No password of any kind is present in the source.
- Supabase (`admin_settings.key = 'admin_password'`) is the only source of truth.
- New passwords are stored as a **SHA-256 hash**, never as the password itself.
- Nothing is written to `localStorage`.
- A password already stored as plain text still works, so nobody is locked out.
  The admin sees a warning to rotate it; once rotated, it is stored hashed.

---

## 2. ACTION REQUIRED — check the password row before deploying

The bootstrap fallback is gone, so if `admin_settings` has **no**
`admin_password` row, the admin panel cannot be opened. Verify first.

Supabase dashboard → SQL Editor:

```sql
select key, value from admin_settings where key = 'admin_password';
```

- **A row comes back** → nothing to do. Log in with that password, then use
  Settings → Change Password once to convert it to a hash.
- **No row** → insert one. Generate the hash yourself so the password is never
  typed into a shared tool. In a browser console on any page:

  ```js
  const p = 'your-new-password';
  crypto.subtle.digest('SHA-256', new TextEncoder().encode(p))
    .then(b => console.log(Array.from(new Uint8Array(b))
      .map(x => x.toString(16).padStart(2, '0')).join('')));
  ```

  Then, with the 64-character hash it prints:

  ```sql
  insert into admin_settings (key, value)
  values ('admin_password', '<paste-the-64-char-hash>');
  ```

> The old password `NepalMBBS@2025` has been public in a public GitHub
> repository since June 2026. Treat it as compromised — do not reuse it here or
> anywhere else.

---

## 3. Still open — this is the fix that actually matters

The admin login is a **UI gate, not a security boundary**, and Phase 0 does not
change that.

The site talks to Supabase with the anonymous key, which is public by design
(it ships in the page — that part is normal and fine). What decides who can
actually read and write your data is **Row Level Security**. If RLS is
permissive, anyone holding that key can query the REST API directly and never
touch the login screen at all.

Two things to check in Supabase → Authentication → Policies:

| Table | Risk if RLS is open |
|---|---|
| `leads` | Every student's name and phone number is publicly readable. This is the serious one. |
| `admin_settings` | The password hash is readable, and the row can be overwritten by anyone. |

Recommended target state:

- `leads` — allow `INSERT` for the anon role (the public lead form needs it),
  **deny `SELECT`**. The admin dashboard should read leads through an
  authenticated role, not the anon key.
- `admin_settings` — split it. Public display settings (phone number, hero text,
  feature toggles) can stay anon-readable. `admin_password` must not be
  anon-readable or anon-writable.
- Move the admin panel onto Supabase Auth so the dashboard reads leads as a
  logged-in user rather than as anon.

This was **not** done in Phase 0: it requires database access this session did
not have, and a wrong policy would break the live lead form. It needs its own
change with a verified before/after.
