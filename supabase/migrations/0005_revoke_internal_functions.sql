-- NepalMBBS.in — 0005_revoke_internal_functions.sql
--
-- Found by Supabase's own database linter after 0001-0004 were applied to the
-- live project, which is the point of running an independent check: my own
-- migrations revoked EXECUTE on enforce_rate_limit() and caller_key() and
-- forgot the rest.
--
-- PostgREST exposes every function in `public` as an RPC endpoint. A trigger
-- function has no business being callable that way — it exists to fire on a
-- table, and reaching it through /rest/v1/rpc/... is only ever an attempt to
-- do something it was not written for. sweep_rate_hits() is worse in kind: it
-- deletes from the rate-limit counter table, and a function that prunes the
-- abuse counters should not be reachable by the party being counted.
--
-- Revoking EXECUTE does not stop a trigger from firing. Triggers run as the
-- table owner regardless of who holds EXECUTE on the function.

begin;

revoke all on function public.log_stage_change()         from public, anon, authenticated;
revoke all on function public.enrol_sequences()          from public, anon, authenticated;
revoke all on function public.scrub_public_application() from public, anon, authenticated;
revoke all on function public.sweep_rate_hits()          from public, anon, authenticated;

commit;

-- ─────────────────────────────────────────────────────────────────────────
-- Four SECURITY DEFINER functions stay reachable, each for a stated reason.
-- The linter still flags them; that is expected, and this is the answer:
--
--   is_staff() / is_admin()   Policies evaluate these in the CALLER's context,
--                             so `authenticated` genuinely needs EXECUTE. They
--                             read one row of `staff` and return a boolean.
--   portal_application()      The student portal IS an anonymous caller
--                             holding a token — that is the design. It returns
--                             a fixed seven-column projection, so a column
--                             added to `applications` later cannot leak
--                             through it, and notes are not in it.
--   portal_upload_url()       Same, and it validates the token itself before
--                             doing anything.
--   convert_lead_to_application()  authenticated only, and its first statement
--                             is an is_staff() check — definer rights are for
--                             crossing the policy boundary once, not for
--                             handing the boundary to anyone signed in.
-- ─────────────────────────────────────────────────────────────────────────
