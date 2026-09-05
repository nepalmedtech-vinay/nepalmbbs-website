// Shared plumbing for the three edge functions.
//
// No npm imports. Everything here is fetch, Deno.env and Web Crypto, which
// keeps the deploy reproducible and means there is no third-party code between
// a student's marks and the provider.

const ORIGINS = (Deno.env.get('ALLOWED_ORIGINS') ??
  'https://nepalmbbs.in,https://www.nepalmbbs.in,http://localhost:4321')
  .split(',').map((s) => s.trim()).filter(Boolean);

export function cors(req: Request): Record<string, string> {
  const origin = req.headers.get('origin') ?? '';
  // Echo only an origin we know. Reflecting whatever arrives would let any
  // site call these functions with a counselor's browser session.
  const allow = ORIGINS.includes(origin) ? origin : ORIGINS[0];
  return {
    'Access-Control-Allow-Origin': allow,
    'Access-Control-Allow-Headers': 'authorization, apikey, content-type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Vary': 'Origin',
  };
}

export function json(req: Request, body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...cors(req), 'content-type': 'application/json' },
  });
}

export const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

/** PostgREST as the service role. Used only after the caller has been checked. */
export async function db(path: string, init: RequestInit = {}): Promise<Response> {
  return fetch(`${SUPABASE_URL}/rest/v1/${path}`, {
    ...init,
    headers: {
      apikey: SERVICE_KEY,
      Authorization: `Bearer ${SERVICE_KEY}`,
      'content-type': 'application/json',
      ...(init.headers ?? {}),
    },
  });
}

export async function dbJson<T>(path: string, init: RequestInit = {}): Promise<T> {
  const res = await db(path, init);
  if (!res.ok) throw new Error(`db ${res.status}: ${await res.text()}`);
  return res.status === 204 ? (null as T) : await res.json();
}

/** Supabase Storage as the service role, for signing links to private objects. */
export async function storage(path: string, init: RequestInit = {}): Promise<Response> {
  return fetch(`${SUPABASE_URL}/storage/v1/${path}`, {
    ...init,
    headers: {
      apikey: SERVICE_KEY,
      Authorization: `Bearer ${SERVICE_KEY}`,
      'content-type': 'application/json',
      ...(init.headers ?? {}),
    },
  });
}

/** Absolute URL for the relative signedURL that Storage returns. */
export function storageUrl(relative: string): string {
  return `${SUPABASE_URL}/storage/v1${relative.startsWith('/') ? '' : '/'}${relative}`;
}

export interface Caller { userId: string; email: string | null; role: string; }

/**
 * Who is calling, established from their own JWT — not from anything in the
 * request body. A function that trusted a user_id in the payload would let any
 * signed-in user act as any counselor.
 */
export async function requireStaff(req: Request): Promise<Caller> {
  const auth = req.headers.get('authorization') ?? '';
  if (!auth.toLowerCase().startsWith('bearer ')) throw new HttpError(401, 'sign in first');
  const token = auth.slice(7);

  const who = await fetch(`${SUPABASE_URL}/auth/v1/user`, {
    headers: { apikey: SERVICE_KEY, Authorization: `Bearer ${token}` },
  });
  if (!who.ok) throw new HttpError(401, 'session expired');
  const user = await who.json();

  const rows = await dbJson<Array<{ role: string; is_active: boolean; email: string }>>(
    `staff?select=role,is_active,email&id=eq.${encodeURIComponent(user.id)}`);
  if (!rows?.length || !rows[0].is_active) throw new HttpError(403, 'not on the team');
  return { userId: user.id, email: rows[0].email ?? user.email ?? null, role: rows[0].role };
}

/** Membership of the institution a request is about. */
export async function requireInstitution(caller: Caller, institutionId: string): Promise<void> {
  if (!institutionId) throw new HttpError(400, 'institution_id is required');
  const rows = await dbJson<Array<{ role: string }>>(
    `institution_members?select=role&institution_id=eq.${institutionId}&staff_id=eq.${caller.userId}`);
  if (!rows?.length) throw new HttpError(403, 'not a member of that institution');
}

export class HttpError extends Error {
  // Written out rather than as a constructor parameter property so the file
  // parses under plain type-stripping — tests/exam-verify.mjs parse-checks
  // these functions without a Deno toolchain.
  status: number;
  constructor(status: number, message: string) { super(message); this.status = status; }
}

export function fail(req: Request, e: unknown): Response {
  const err = e as HttpError;
  const status = err?.status ?? 500;
  // A 500 says nothing about what went wrong internally; the detail goes to the
  // function log, not to the browser.
  if (status >= 500) console.error(e);
  return json(req, { error: status >= 500 ? 'server error' : err.message }, status);
}

export async function sha256(text: string): Promise<string> {
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text));
  return [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, '0')).join('');
}
