---
name: agent-architecture-lab
description: Methodology for designing and building AI agents and multi-agent systems — single-agent vs. subagent vs. multi-agent orchestration, tool design discipline, prompt/context engineering, evaluation, and failure-mode guardrails. Use when the task is building an agent (not a one-off skill) — a customer-support bot, a coding agent, a multi-step autonomous workflow, a multi-agent pipeline. Routes to claude-api for raw API mechanics (models, pricing, streaming, MCP) rather than duplicating it; this skill is architecture and judgment, that one is reference.
license: Internal — author's own project conventions, not third-party.
---

# Agent Architecture Lab

`claude-api` already covers the mechanics — model IDs, pricing, tool-use
syntax, MCP, streaming, caching. Read it for those. This skill is the layer
above the mechanics: **how to decide what to build, and how to know if it's
actually good** — the same relationship `premium-design-os` has to raw CSS
knowledge.

## 1. The first question: does this need an agent at all?

An "agent" — something that reasons, calls tools, and decides its own next
step — is the right answer to a narrower set of problems than it's usually
reached for. Before building one:

- **Deterministic logic that doesn't need judgment** → plain code, not an
  LLM call. If the task is "if X then Y," a script is faster, cheaper, and
  more reliable than an agent that might reason its way to a different
  answer than intended.
- **A single, well-defined transformation** (summarize this, extract these
  fields, classify this) → a single prompt/completion, not a multi-step
  agent loop. An agent loop adds latency and failure surface for no benefit
  if the task never needs to decide *which* tool to call next.
- **A genuinely multi-step task where the right next action depends on
  what the previous action returned** (research something, then decide what
  to research next based on findings; fix a bug, then verify the fix
  actually worked and iterate if not) → this is where an agent loop earns
  its complexity.

The failure mode in both directions is real: over-building (an agent loop
for a task that never branches) burns latency and cost for nothing;
under-building (a rigid script for a task that genuinely needs judgment on
ambiguous input) breaks the first time input doesn't match the assumed
shape.

## 2. Single agent vs. subagents vs. multi-agent

| Shape | When | Real example from this session |
|---|---|---|
| **Single agent, one context** | The whole task fits in one coherent train of thought — most coding tasks, most single-document work | Most of this session's own NepalMBBS work |
| **Subagents (spawned, isolated context)** | A subtask would pollute the main context with detail the main thread doesn't need (a broad codebase search, a long research task), or independent subtasks can run in parallel | The `Explore` agent type — used for broad fan-out searches specifically so the raw results don't fill the main conversation |
| **Multi-agent, persistent, communicating** | Genuinely separate long-running roles that need to coordinate over time, not just complete one subtask and report back | Rare in practice; most tasks that seem to need this are actually the subagent pattern above, called repeatedly |

**The real cost of subagents/multi-agent is context loss, not latency.** A
spawned agent starts cold — it has none of the conversation history, none
of the decisions already made, none of the "why" behind the current state.
Every subagent call has to carry enough context in its prompt to make good
decisions without the history the main thread has. This is the single most
common way a multi-agent design underperforms a single well-scoped agent:
not because parallelism is bad, but because the coordination overhead
(writing prompts that carry the needed context, reconciling what each
sub-task returns) exceeds what a single continuous agent would have spent
just doing the work in order.

## 3. Tool design discipline

The tools an agent has access to determine its ceiling more than the model
does. Bad tool design (ambiguous names, unclear parameters, silent
failures) produces bad agent behavior even from a capable model — the model
is reasoning correctly about a badly-specified interface.

- **One tool, one clear job.** A tool that does three different things
  based on a mode parameter is three tools wearing one name — the model has
  to correctly infer which mode from context, which is exactly the kind of
  ambiguity that produces wrong calls.
- **Descriptions are the interface, not documentation.** The model decides
  whether and how to call a tool almost entirely from its name and
  description — vague ("does stuff with data") or missing edge-case
  guidance (when NOT to use it, what it returns on failure) is the most
  common cause of a tool being called wrong or not called when it should
  be.
- **Fail loud, fail structured.** A tool that fails silently or returns an
  ambiguous empty result gives the agent nothing to reason about — it will
  either retry blindly or hallucinate a reason. Return a clear error the
  model can actually act on (retry with different params, tell the user,
  try a different tool).
- **Idempotency where possible.** An agent that might retry a call (due to
  its own uncertainty, or a transient failure) should not cause duplicate
  side effects when it does — a tool that sends an email or creates a
  record needs its own guard against double-execution, because the agent
  layer above it cannot reliably prevent a retry.
- **Return only what's needed to decide the next step.** A tool that dumps
  a huge raw payload back into the agent's context costs tokens on every
  subsequent turn of that conversation, not just once — summarize/filter at
  the tool boundary where possible, don't push that cost onto the model to
  do post-hoc every time (this project's own `Grep`/`Read`-over-`cat` and
  the file-output pattern several tools here use for large results are the
  concrete version of this rule).

## 4. Context and prompt engineering

- **System prompt: identity and standing rules. Tool results: facts.**
  Don't restate facts that a tool already returned in the system prompt as
  if they were permanent — a system prompt is expensive (paid on every
  turn) and static; put things there that are genuinely always true for
  this agent, not the current state of anything.
- **Prefer structure the model doesn't have to parse from prose.** A tool
  result as a clean JSON/table the model can reference precisely beats a
  paragraph the model has to re-extract facts from — every re-extraction
  is a chance to misread a number.
- **State the decision, don't just show the data.** Where a system or
  tool already knows the right call (a threshold crossed, a state that
  requires action), say so explicitly rather than handing over raw numbers
  and hoping the model computes the same conclusion every time — a
  computed conclusion is deterministic, a model's read of ambiguous
  numbers isn't guaranteed to be.

## 5. Guardrails and failure modes

Name the specific way this agent could go wrong before it ships, not after:

- **Infinite/runaway loops** — a bound on iteration count or a
  hard timeout, always, for any agent that can call itself or re-plan.
- **Scope creep in autonomous action** — an agent with write access
  (files, external APIs, money-moving actions) needs an explicit boundary
  on what it's allowed to do without a human checkpoint, not an implicit
  trust that it will stay in scope because the prompt asked it to.
- **Prompt injection from tool results / fetched content** — anything an
  agent reads that wasn't written by the operator (a web page, a file
  someone else uploaded, an email) is untrusted input and should be treated
  as data, never as instructions, explicitly stated as a rule the agent
  follows, not assumed.
- **Hallucinated tool calls or arguments** — a well-specified tool schema
  (§3) reduces this but doesn't eliminate it; validate critical arguments
  (does this file path exist, is this ID in a valid format) before acting
  on them where the cost of acting on a wrong one is high.
- **Silent partial failure** — a multi-step agent that completes steps 1-3
  and silently skips step 4 because of an error it swallowed is worse than
  one that stops and reports the failure; never let error-handling logic
  quietly continue past a failure that matters.

## 6. Evaluation — the part usually skipped

The same discipline `skill-creator` applies to skills (draft → test
prompts → grade → iterate), applied to a full agent:

- **A real test set**, not just the developer's own happy-path prompts —
  include the edge cases and adversarial inputs the agent will actually
  see (ambiguous requests, missing information, a tool that returns an
  error).
- **A grading rubric stated in advance**, not a vibe check after the fact
  — what does "the agent handled this correctly" concretely mean for each
  test case, written down before running it, so the evaluation isn't
  unconsciously graded to whatever the agent happened to do.
- **Regression testing on every prompt/tool change** — an agent's behavior
  is sensitive to its system prompt and tool descriptions in ways that are
  not always predictable; a change made to fix one case can silently break
  another. Re-run the test set, don't just verify the one case that
  prompted the change.
- **Measure cost and latency alongside correctness** — an agent that's
  right 95% of the time but takes 8 tool-call round trips per task has a
  different economics profile than one that's right 90% of the time in 2
  round trips; know both numbers before deciding a design is "good."

## 7. Reference

`claude-api` skill — model selection, exact tool-use JSON schema, MCP
server mechanics, prompt caching, streaming. `skill-creator` — for building
the specific case of a reusable *skill* (instructions Claude follows) as
opposed to a full agent system with its own tool loop; the eval methodology
in §6 above is directly modeled on skill-creator's own, generalized.
