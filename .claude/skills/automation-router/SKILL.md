---
name: automation-router
description: Decision router for how an automation should actually be built inside Claude Code / a Claude workstation — a hook, a skill, a subagent, a scheduled trigger/routine, an MCP tool, or an external automation platform (Zapier). Use whenever a request implies "do this automatically," "every time X happens," "on a schedule," or "whenever I ask for Y." Prevents two recurring mistakes — reaching for an LLM call where deterministic code would be faster and more reliable, and reaching for a hook where the task actually needs judgment a hook cannot make.
license: Internal — author's own project conventions, not third-party.
---

# Automation Router

Claude Code / a Claude workstation has more automation primitives than are
obvious at a glance, and picking the wrong one is the most common way an
"automate this" request goes wrong — not because the automation fails, but
because it's built with a mechanism that can't actually do what was asked
(a hook cannot exercise judgment; a skill cannot fire without being
invoked; a one-off script cannot survive a session ending).

## 1. The decision, in order

**Does it need to fire without a person present, initiating it?**
- No, it only runs when explicitly asked → §2 (skill or subagent)
- Yes, on a schedule → §3 (a Routine/scheduled trigger)
- Yes, in response to an external event (a webhook, a GitHub PR event, a
  file appearing) → §3 (event-driven trigger / webhook)
- Yes, in response to something happening *inside this session* (a tool
  about to run, a turn ending) → §4 (a hook)

**Does the step require judgment, or is it a fixed rule?**
- Fixed, deterministic, the same input always produces the same correct
  output → plain code (a script, a hook's own logic) — never an LLM call
  for this. An LLM call for deterministic logic is slower, costs money,
  and is the one case where it can be *less* reliable than a regex or an
  if-statement, because it can occasionally reason its way to a different
  answer than the deterministic rule would give.
- Needs interpretation, ambiguous input, or a decision that depends on
  context a rule can't fully enumerate → Claude reasoning is warranted —
  now pick *which* Claude-invoking mechanism (§2–4).

**Does it need to talk to a third-party app Claude has no native
integration with?**
- Yes, and it's a common consumer/business app → check whether an MCP
  server for it already exists before reaching for Zapier — a direct MCP
  integration is usually more reliable and lower-latency than routing
  through a separate automation platform.
- Yes, and there's no MCP server, or the workflow spans many apps in a
  chain a general automation platform is built for → Zapier (or the
  project's equivalent) is the right tool, not a reason to build a custom
  integration from scratch.

## 2. On-demand: skill vs. subagent vs. plain instructions

- **A skill** — reusable instructions Claude should follow *every time* a
  certain kind of request comes up, invoked by name or by trigger phrase,
  reused across many separate conversations/sessions. Build one when the
  same non-trivial methodology would otherwise need re-explaining in every
  new conversation — the entire design-skills-library built this session
  exists for exactly this reason.
- **A subagent** — a task that should run with its own isolated context
  (so its detail doesn't pollute the main conversation) or in parallel with
  other work. Not a substitute for a skill: a subagent is a *scope* choice
  (isolated context, possibly parallel), a skill is a *knowledge* choice
  (reusable instructions). The two combine — a subagent can be told to use
  a specific skill.
- **Plain instructions in the conversation** — a genuine one-off, never
  needed again in this exact shape. Don't build a skill for something that
  will only ever be asked once; that's the "unnecessary abstraction for a
  problem that appears once" anti-pattern, the automation-methodology
  version of `premium-design-os`'s "don't add a design token for one use."

## 3. Fires without anyone present: Routines / scheduled triggers / webhooks

This Claude Code environment's own primitives, concretely:

- **A one-shot reminder** (`send_later` / a `run_once_at` trigger) — "do
  this at/in X" once, then it's done. The lightest-weight option; use it
  for genuine one-time follow-ups, not recurring work.
- **A recurring schedule** (`create_trigger` with a `cron_expression`) —
  "every day/hour/week, do X." Pick the *target* deliberately:
  - **Fires into this same session** (default) — for work that should
    continue an existing conversation's context (a monitoring loop that
    needs to remember what it already checked).
  - **Fires into a specific other session** — waking a sibling session you
    created for a reason, not this one.
  - **Spawns a fresh session each time** — for work that should start
    clean every time, with no accumulated context to go stale (most
    "check X and report if it changed" routines want this — a session that
    accumulates weeks of "nothing changed" turns is wasted context).
- **An inbound webhook** (`watch_url`) — for being notified by an external
  service the moment something happens, rather than polling on a schedule.
  Prefer this over a tight polling schedule whenever the external service
  supports webhooks — a 5-minute poll loop for something that could push a
  webhook is both slower to react and wastes far more calls than the one
  real event.
- **The dynamic-pacing self-loop** (`ScheduleWakeup`, used by `/loop`) —
  for a task that should self-pace based on what it's actually waiting for
  (a CI run that takes ~8 minutes deserves one ~8-minute check, not eight
  1-minute ones) rather than a fixed cron interval. Never use this to poll
  for something the harness will notify about automatically (a background
  task's own completion) — that's the harness's job, polling for it wastes
  a wakeup.

**The mistake that actually happens: polling on a short fixed interval for
something that either (a) has a webhook available, or (b) the harness
already tracks and will notify about.** Both are strictly better than a
poll loop — check both before defaulting to a cron schedule.

## 4. Fires in response to something inside the session: hooks

A hook is deterministic code the harness runs at a defined point (before/
after a tool call, at session start/stop, before a prompt is submitted) —
configured in `settings.json`, not something the agent decides to do at
runtime. Use a hook when the trigger is a mechanical event (a tool about to
run, a turn ending) and the response is a fixed check or action (block a
dangerous command, run a linter, remind about an unfinished step) — not
when the response needs judgment about the specific situation, which a
hook's shell script cannot exercise the way an agent turn can.

This project's own hooks are the concrete examples: `stop-hook-git-check.sh`
(a deterministic check — are there uncommitted changes — run every time a
turn ends, no judgment required) and `session-start-git-identity.sh`
(deterministic setup, run once per session start). Neither needs an LLM
call; both would be *worse* as a skill invoked "when appropriate," because
a hook guarantees it runs, every time, without depending on the model
deciding to check.

## 5. Anti-patterns

- **A skill for a fixed, deterministic rule.** If the same input always
  produces the same correct output by a rule that can be fully written
  down, that's a hook or a plain script, not a skill Claude has to
  re-reason through every time.
- **A hook for something needing judgment.** A hook can't decide "is this
  commit message good enough" the way an agent turn can — that's a skill
  or a review step, not a hook.
- **Polling for something with a webhook, or something the harness already
  tracks.** §3 above.
- **A brand-new MCP integration for something Zapier or an existing
  connector already does well.** Check what's already connected before
  building a custom integration — the same "inspect before installing"
  discipline `premium-design-os`'s own audit already established for
  design tooling applies here too.
- **A recurring trigger that accumulates unbounded context** (fires into
  the same session forever, never summarized or rotated) — for anything
  that runs indefinitely, prefer a fresh session per fire, or a deliberate
  plan for what happens to context over months of firings.
