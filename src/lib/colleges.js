import fallback from '../data/colleges.json';

// College data has two sources and a deliberate order of preference.
//
// src/data/colleges.json is the committed baseline, extracted from the markup
// the site already shipped. It is the source of truth for the build.
//
// If SUPABASE_URL and SUPABASE_ANON_KEY are present, the build additionally
// pulls site_colleges and merges rows onto the baseline by slug, so the team
// can correct a seat count or add a college from the admin panel without a code
// change. The merge is one-directional: Supabase can override or add, never
// remove — a table that is empty, unreachable, or locked down by RLS must not
// be able to silently delete 27 pages from the sitemap.
//
// No network at build time is a supported, non-fatal case. The build must
// succeed offline, in CI, and in a sandbox with egress blocked.

const slugify = (s) =>
  String(s)
    .replace(/\([^)]*\)/g, '')
    .replace(/[^a-zA-Z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .toLowerCase()
    .replace(/-+/g, '-');

async function fromSupabase() {
  const url = import.meta.env.SUPABASE_URL || process.env.SUPABASE_URL;
  const key = import.meta.env.SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY;
  if (!url || !key) return null;
  try {
    const res = await fetch(`${url}/rest/v1/site_colleges?select=*`, {
      headers: { apikey: key, Authorization: `Bearer ${key}` },
      signal: AbortSignal.timeout(10_000),
    });
    if (!res.ok) {
      console.warn(`[colleges] Supabase returned ${res.status}; using committed data`);
      return null;
    }
    const rows = await res.json();
    return Array.isArray(rows) && rows.length ? rows : null;
  } catch (e) {
    console.warn(`[colleges] Supabase unreachable (${e.message}); using committed data`);
    return null;
  }
}

export async function getColleges() {
  const rows = await fromSupabase();
  if (!rows) {
    console.log(`[colleges] ${fallback.length} colleges from committed data`);
    return fallback;
  }
  const merged = new Map(fallback.map((c) => [c.slug, c]));
  let added = 0;
  for (const row of rows) {
    const slug = row.slug || slugify(row.name || '');
    if (!slug) continue;
    if (!merged.has(slug)) added++;
    merged.set(slug, { ...(merged.get(slug) || {}), ...row, slug });
  }
  console.log(`[colleges] ${merged.size} colleges (${rows.length} from Supabase, ${added} new)`);
  return [...merged.values()];
}

export const isGovernment = (c) => c.type === 'govt';
