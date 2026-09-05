// NepalMBBS.in — ai-gateway
//
// One server-side entry point for every model call the platform makes. It
// exists for four reasons, in order:
//
// 1. Keys stay here. Nothing in the browser has ever seen a provider key and
//    nothing should; the console calls this function with the counselor's own
//    Supabase JWT and this function talks to the providers.
// 2. One task, one model. The router picks a provider per task rather than
//    asking three models the same question — Gemini for bulk and cheap work,
//    GPT for structured analysis and short prose, Claude for synthesis that
//    needs to hold several signals together. Fallback happens only on failure.
// 3. Nothing is asked of a model that arithmetic can answer. Everything
//    numeric arrives already computed by exam_report(); the prompt says so and
//    the response is checked against it.
// 4. It has to be affordable. Responses are cached on a digest of the input,
//    every call is logged with its token counts, and a daily cap refuses to
//    spend past what the operator set.
//
// Raw fetch rather than a vendor SDK on purpose: this is a three-provider
// router in Deno with no build step, so a single shape for all three is
// clearer than three SDKs, and there is no third-party code between a
// student's marks and the provider.

import {
  cors, json, fail, requireStaff, requireInstitution, db, dbJson, sha256, HttpError,
} from '../_shared/http.ts';

/* ── model ids ───────────────────────────────────────────────────────────
   Overridable per deployment, because the right model for a college's budget
   is the operator's call, not this file's. */
const ANTHROPIC_MODEL = Deno.env.get('ANTHROPIC_MODEL') ?? 'claude-opus-5';
const OPENAI_MODEL    = Deno.env.get('OPENAI_MODEL')    ?? 'gpt-5';
const GOOGLE_MODEL    = Deno.env.get('GOOGLE_MODEL')    ?? 'gemini-2.5-flash';
const DAILY_CALL_CAP  = Number(Deno.env.get('AI_DAILY_CALL_CAP') ?? '400');

type Provider = 'openai' | 'anthropic' | 'google';

interface TaskDef {
  route: Provider[];
  effort: 'low' | 'medium' | 'high';
  maxTokens: number;
  system: string;
  schema: Record<string, unknown>;
  /** What to return when every provider is unavailable or over quota. */
  fallback: (input: Any) => Record<string, unknown>;
}
// deno-lint-ignore no-explicit-any
type Any = any;

/* ── the standing rules every task inherits ─────────────────────────────── */
const HOUSE_RULES = `
You are an academic performance analyst for a medical college.

Absolute rules:
- Every number you may use is already in the DATA you are given. Never compute,
  estimate, round or invent a figure. If a number is not in DATA, do not state
  one.
- Never claim a cause. You can see marks, not why they moved.
- Never predict an outcome, a rank, or a pass in a future exam.
- Never mention a student other than the one in DATA.
- Absent is not zero. If a subject is listed under absences, say the student
  did not sit it; do not describe it as a low mark.
- Write about the subject names exactly as DATA spells them.

Every observation you make has three parts, in this order:
  observed — the figure from DATA, quoted as it appears
  insight  — what that figure means for this student
  action   — one specific, doable thing, this month, by name of subject
`.trim();

const TASKS: Record<string, TaskDef> = {
  /* Structured analysis of one student. GPT first: this is a constrained,
     schema-shaped job it does well and cheaply. */
  student_analysis: {
    route: ['openai', 'anthropic', 'google'],
    effort: 'medium',
    maxTokens: 1400,
    system: `${HOUSE_RULES}

Analyse one student's performance in one exam. Between two and four
observations. Set risk to "urgent" only when DATA shows a failed paper or a
subject under 30 percent; "watch" for a decline of 5 points or more or any
subject under 40 percent; otherwise "none".`,
    schema: {
      type: 'object',
      additionalProperties: false,
      required: ['headline', 'observations', 'risk', 'priorities'],
      properties: {
        headline: { type: 'string', description: 'One sentence, max 20 words.' },
        observations: {
          type: 'array', minItems: 2, maxItems: 4,
          items: {
            type: 'object', additionalProperties: false,
            required: ['observed', 'insight', 'action'],
            properties: {
              observed: { type: 'string' }, insight: { type: 'string' }, action: { type: 'string' },
            },
          },
        },
        risk: { type: 'string', enum: ['none', 'watch', 'urgent'] },
        priorities: { type: 'array', maxItems: 3, items: { type: 'string' } },
      },
    },
    fallback: (input: Any) => deterministicAnalysis(input),
  },

  /* The message a parent reads. GPT first for the same reason — short,
     controlled prose to a fixed shape. */
  parent_message: {
    route: ['openai', 'google', 'anthropic'],
    effort: 'low',
    maxTokens: 700,
    system: `${HOUSE_RULES}

Write one WhatsApp message from the college coordinator to the parent named in
DATA. Constraints:
- Open with the exact greeting given in DATA.greeting, then the parent's form of
  address as given in DATA.address.
- 60 to 110 words. Plain sentences. No bullet points, no emoji, no markdown.
- Name the student, the exam, and the overall figure exactly as DATA gives them.
- One or two specific suggestions naming subjects from DATA.
- Close warmly and offer to speak. Do not promise a result.
- English, in the register an Indian college coordinator writes to a parent.`,
    schema: {
      type: 'object', additionalProperties: false, required: ['message'],
      properties: { message: { type: 'string' } },
    },
    fallback: (input: Any) => ({ message: deterministicParentMessage(input) }),
  },

  /* Whole-cohort synthesis. Claude first: several signals at once and a
     judgement about which ones matter together. */
  cohort_synthesis: {
    route: ['anthropic', 'openai', 'google'],
    effort: 'high',
    maxTokens: 1800,
    system: `${HOUSE_RULES}

You are given aggregates for a whole batch in one exam — no individual marks.
Identify two to four themes across the cohort. A theme must rest on a figure in
DATA. Do not name any student.`,
    schema: {
      type: 'object', additionalProperties: false,
      required: ['headline', 'themes'],
      properties: {
        headline: { type: 'string' },
        themes: {
          type: 'array', minItems: 2, maxItems: 4,
          items: {
            type: 'object', additionalProperties: false,
            required: ['observed', 'insight', 'action'],
            properties: {
              observed: { type: 'string' }, insight: { type: 'string' }, action: { type: 'string' },
            },
          },
        },
      },
    },
    fallback: (input: Any) => deterministicCohort(input),
  },
};

/* ── providers ───────────────────────────────────────────────────────────
   Each returns the same shape so the router does not care which one ran. */

interface Completion { text: string; promptTokens: number; completionTokens: number; model: string; }

function keyFor(p: Provider): string | undefined {
  return p === 'openai' ? Deno.env.get('OPENAI_API_KEY')
       : p === 'anthropic' ? Deno.env.get('ANTHROPIC_API_KEY')
       : Deno.env.get('GOOGLE_API_KEY');
}

async function callOpenAI(task: TaskDef, prompt: string): Promise<Completion> {
  const res = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: { 'content-type': 'application/json',
               authorization: `Bearer ${keyFor('openai')}` },
    body: JSON.stringify({
      model: OPENAI_MODEL,
      max_completion_tokens: task.maxTokens,
      response_format: {
        type: 'json_schema',
        json_schema: { name: 'result', strict: true, schema: task.schema },
      },
      messages: [{ role: 'system', content: task.system },
                 { role: 'user', content: prompt }],
    }),
  });
  if (!res.ok) throw new Error(`openai ${res.status}: ${(await res.text()).slice(0, 300)}`);
  const body = await res.json();
  return {
    text: body.choices?.[0]?.message?.content ?? '',
    promptTokens: body.usage?.prompt_tokens ?? 0,
    completionTokens: body.usage?.completion_tokens ?? 0,
    model: body.model ?? OPENAI_MODEL,
  };
}

async function callAnthropic(task: TaskDef, prompt: string): Promise<Completion> {
  // A strict tool is how the answer comes back schema-valid. tool_choice stays
  // 'auto' with the instruction naming the tool: forced tool use is rejected on
  // the newest models, and 'auto' plus strict gets the same guarantee on all of
  // them.
  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      'x-api-key': keyFor('anthropic') ?? '',
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model: ANTHROPIC_MODEL,
      max_tokens: task.maxTokens,
      system: task.system,
      thinking: { type: 'adaptive' },
      output_config: { effort: task.effort },
      tools: [{
        name: 'emit', description: 'Return the analysis.',
        strict: true, input_schema: task.schema,
      }],
      tool_choice: { type: 'auto' },
      messages: [{ role: 'user', content: `${prompt}\n\nCall the emit tool with your answer.` }],
    }),
  });
  if (!res.ok) throw new Error(`anthropic ${res.status}: ${(await res.text()).slice(0, 300)}`);
  const body = await res.json();
  // A safety decline arrives as a 200 with stop_reason 'refusal'. Treating it
  // as a success would put an empty analysis on a report card.
  if (body.stop_reason === 'refusal') {
    throw new Error(`anthropic refused: ${body.stop_details?.category ?? 'unspecified'}`);
  }
  const tool = (body.content ?? []).find((b: Any) => b.type === 'tool_use');
  const text = (body.content ?? []).filter((b: Any) => b.type === 'text')
                                   .map((b: Any) => b.text).join('\n');
  return {
    text: tool ? JSON.stringify(tool.input) : text,
    promptTokens: body.usage?.input_tokens ?? 0,
    completionTokens: body.usage?.output_tokens ?? 0,
    model: body.model ?? ANTHROPIC_MODEL,
  };
}

async function callGoogle(task: TaskDef, prompt: string): Promise<Completion> {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${GOOGLE_MODEL}:generateContent`;
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'content-type': 'application/json', 'x-goog-api-key': keyFor('google') ?? '' },
    body: JSON.stringify({
      systemInstruction: { parts: [{ text: task.system }] },
      contents: [{ role: 'user', parts: [{ text: prompt }] }],
      generationConfig: {
        maxOutputTokens: task.maxTokens,
        responseMimeType: 'application/json',
        responseSchema: stripForGoogle(task.schema),
      },
    }),
  });
  if (!res.ok) throw new Error(`google ${res.status}: ${(await res.text()).slice(0, 300)}`);
  const body = await res.json();
  const parts = body.candidates?.[0]?.content?.parts ?? [];
  return {
    text: parts.map((p: Any) => p.text ?? '').join(''),
    promptTokens: body.usageMetadata?.promptTokenCount ?? 0,
    completionTokens: body.usageMetadata?.candidatesTokenCount ?? 0,
    model: GOOGLE_MODEL,
  };
}

/** Gemini's schema dialect has no additionalProperties and no minItems/maxItems. */
function stripForGoogle(schema: Any): Any {
  if (Array.isArray(schema)) return schema.map(stripForGoogle);
  if (schema && typeof schema === 'object') {
    const out: Any = {};
    for (const [k, v] of Object.entries(schema)) {
      if (k === 'additionalProperties' || k === 'minItems' || k === 'maxItems') continue;
      out[k] = stripForGoogle(v);
    }
    return out;
  }
  return schema;
}

const CALLERS: Record<Provider, (t: TaskDef, p: string) => Promise<Completion>> = {
  openai: callOpenAI, anthropic: callAnthropic, google: callGoogle,
};

/* ── grounding ───────────────────────────────────────────────────────────
   The one check that makes "never invent a fact" enforceable rather than
   hoped-for: every number in the model's answer must be a number that was in
   the input. A model that writes "improved from 54% to 68%" when DATA says 58
   fails here and the answer is thrown away. */
function numbersIn(value: unknown, into = new Set<string>()): Set<string> {
  if (value === null || value === undefined) return into;
  if (typeof value === 'number') { into.add(fmt(value)); return into; }
  if (typeof value === 'string') {
    for (const m of value.matchAll(/-?\d+(?:\.\d+)?/g)) into.add(fmt(Number(m[0])));
    return into;
  }
  if (Array.isArray(value)) { value.forEach((v) => numbersIn(v, into)); return into; }
  if (typeof value === 'object') {
    Object.values(value as Record<string, unknown>).forEach((v) => numbersIn(v, into));
  }
  return into;
}
function fmt(n: number): string { return String(Math.round(n * 100) / 100); }

function ungrounded(output: unknown, allowed: Set<string>): string[] {
  const bad: string[] = [];
  for (const n of numbersIn(output)) {
    if (allowed.has(n)) continue;
    // Small counts are ordinary prose ("two subjects", "one exam") and appear
    // in no dataset. Anything larger has to trace to the input.
    if (Math.abs(Number(n)) <= 12 && Number.isInteger(Number(n))) continue;
    bad.push(n);
  }
  return bad;
}

/* ── deterministic fallbacks ─────────────────────────────────────────────
   Used when every provider fails or the daily cap is spent. They say less, and
   everything they say is a figure copied from the input. A coordinator is
   never left with nothing, and never with something made up. */
function deterministicAnalysis(d: Any) {
  const t = d.totals ?? {};
  const obs: Any[] = [];
  if (t.percentage != null) {
    obs.push({
      observed: `${t.obtained} of ${t.max_marks} (${t.percentage}%), rank ${t.rank} of ${t.cohort_size}.`,
      insight: 'This is the overall standing for this exam.',
      action: 'Review the subject table below with the student.',
    });
  }
  (d.attention ?? []).slice(0, 2).forEach((a: Any) => {
    obs.push({
      observed: `${a.subject}: ${a.obtained} of ${a.max_marks} (${a.percentage}%).`,
      insight: 'This subject is the furthest below the pass mark.',
      action: `Add a fixed weekly slot for ${a.subject} and re-test at the next internal.`,
    });
  });
  return {
    headline: 'Automatic summary — the analysis service was unavailable.',
    observations: obs,
    risk: (d.attention ?? []).length ? 'watch' : 'none',
    priorities: (d.attention ?? []).map((a: Any) => a.subject).slice(0, 3),
    generated_by: 'deterministic',
  };
}

function deterministicParentMessage(d: Any) {
  const t = d.totals ?? {};
  const weak = (d.attention ?? []).map((a: Any) => a.subject).slice(0, 2).join(' and ');
  const strong = (d.strengths ?? []).map((s: Any) => s.subject).slice(0, 2).join(' and ');
  const lines = [
    `${d.greeting} ${d.address},`,
    `This is from ${d.institution} regarding ${d.student}'s ${d.exam} result.`,
    t.percentage != null
      ? `${d.student} scored ${t.obtained} out of ${t.max_marks} (${t.percentage}%).`
      : `${d.student}'s result card is attached.`,
    strong ? `The performance in ${strong} is encouraging.` : '',
    weak ? `${weak} needs regular attention over the coming weeks.` : '',
    'The full report card is attached. Please feel free to call us to discuss it.',
  ];
  return lines.filter(Boolean).join(' ');
}

function deterministicCohort(d: Any) {
  return {
    headline: 'Automatic summary — the analysis service was unavailable.',
    themes: [{
      observed: `Batch average ${d.summary?.avg_percentage}% across ${d.summary?.students} students.`,
      insight: 'This is the cohort position for this exam.',
      action: 'Open the subject table to see which papers pull the average down.',
    }],
    generated_by: 'deterministic',
  };
}

/* ── quota ───────────────────────────────────────────────────────────────
   A free tier is not an unlimited tier. The cap is counted from what was
   actually logged, so it survives a restart. */
async function overCap(): Promise<boolean> {
  if (!DAILY_CALL_CAP) return false;
  const since = new Date(Date.now() - 86400000).toISOString();
  // HEAD with count=exact: PostgREST returns the total in Content-Range and no
  // rows, so the cap costs one cheap request rather than pulling a day of logs.
  const res = await db(
    `ai_usage?select=id&cache_hit=is.false&created_at=gte.${since}`,
    { method: 'HEAD', headers: { Prefer: 'count=exact' } },
  ).catch(() => null);
  if (!res || !res.ok) return false;                    // never block on a broken counter
  const total = Number((res.headers.get('content-range') ?? '').split('/')[1]);
  return Number.isFinite(total) && total >= DAILY_CALL_CAP;
}

/* ── handler ─────────────────────────────────────────────────────────────── */

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors(req) });
  if (req.method !== 'POST') return json(req, { error: 'POST only' }, 405);

  const started = Date.now();
  let caller;
  try {
    caller = await requireStaff(req);
    const body = await req.json();
    const taskName: string = body.task;
    const task = TASKS[taskName];
    if (!task) throw new HttpError(400, `unknown task ${taskName}`);
    if (body.institution_id) await requireInstitution(caller, body.institution_id);

    const input = body.input ?? {};
    const prompt = `DATA:\n${JSON.stringify(input, null, 1)}`;
    // Keyed on the task and the input, not the model: two coordinators opening
    // the same student on the same marks is one call.
    const cacheKey = await sha256(`${taskName}|v3|${JSON.stringify(input)}`);

    if (!body.no_cache) {
      const hit = await dbJson<Array<{ response: unknown; model: string; provider: string }>>(
        `ai_cache?select=response,model,provider&key=eq.${cacheKey}`).catch(() => []);
      if (hit?.length) {
        await dbJson('rpc/bump_ai_cache',
          { method: 'POST', body: JSON.stringify({ p_key: cacheKey }) }).catch(() => {});
        await log(caller.userId, body.institution_id, taskName, hit[0].provider,
                  hit[0].model, 0, 0, true, Date.now() - started, true, null);
        return json(req, { result: hit[0].response, provider: hit[0].provider,
                           model: hit[0].model, cached: true });
      }
    }

    if (await overCap()) {
      await log(caller.userId, body.institution_id, taskName, null, null, 0, 0,
                false, Date.now() - started, false, 'daily cap reached');
      return json(req, {
        result: task.fallback(input), provider: 'none', model: 'deterministic',
        cached: false, degraded: 'The daily model-call cap has been reached. This summary was computed, not written.',
      });
    }

    const allowed = numbersIn(input);
    const errors: string[] = [];

    for (const provider of task.route) {
      if (!keyFor(provider)) { errors.push(`${provider}: no key configured`); continue; }
      try {
        const out = await CALLERS[provider](task, prompt);
        let parsed: Any;
        try { parsed = JSON.parse(extractJson(out.text)); }
        catch { throw new Error(`${provider}: response was not JSON`); }

        const bad = ungrounded(parsed, allowed);
        if (bad.length) {
          // Not retried against the same provider: a model that invented a
          // figure once is not more trustworthy on the second ask, and the
          // next provider costs less than a wrong number on a report card.
          throw new Error(`${provider}: figures not present in the data — ${bad.join(', ')}`);
        }

        await dbJson('ai_cache', {
          method: 'POST',
          headers: { Prefer: 'resolution=merge-duplicates' },
          body: JSON.stringify({ key: cacheKey, task: taskName, provider,
                                 model: out.model, response: parsed }),
        }).catch(() => {});
        await log(caller.userId, body.institution_id, taskName, provider, out.model,
                  out.promptTokens, out.completionTokens, false, Date.now() - started, true, null);
        return json(req, { result: parsed, provider, model: out.model, cached: false });
      } catch (e) {
        errors.push(String((e as Error).message).slice(0, 200));
      }
    }

    await log(caller.userId, body.institution_id, taskName, null, null, 0, 0, false,
              Date.now() - started, false, errors.join(' | ').slice(0, 500));
    return json(req, {
      result: task.fallback(input), provider: 'none', model: 'deterministic', cached: false,
      degraded: 'No model was reachable. This summary was computed from the marks, not written.',
      errors,
    });
  } catch (e) {
    return fail(req, e);
  }
});

/** Models sometimes wrap JSON in a fence even when told not to. */
function extractJson(text: string): string {
  const t = (text ?? '').trim();
  if (t.startsWith('{')) return t;
  const fence = t.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (fence) return fence[1].trim();
  const brace = t.indexOf('{');
  return brace >= 0 ? t.slice(brace, t.lastIndexOf('}') + 1) : t;
}

async function log(userId: string, institutionId: string | null, task: string,
                   provider: string | null, model: string | null,
                   promptTokens: number, completionTokens: number, cacheHit: boolean,
                   latencyMs: number, ok: boolean, error: string | null) {
  await dbJson('ai_usage', {
    method: 'POST',
    body: JSON.stringify({
      institution_id: institutionId ?? null, task, provider, model,
      prompt_tokens: promptTokens, completion_tokens: completionTokens,
      cache_hit: cacheHit, latency_ms: latencyMs, ok, error, created_by: userId,
    }),
  }).catch(() => {});
}
