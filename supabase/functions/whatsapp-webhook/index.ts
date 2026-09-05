// NepalMBBS.in — whatsapp-webhook
//
// Delivery receipts from the WhatsApp Cloud API. Two jobs: prove the request
// really came from Meta, and move the matching parent_messages row along.
//
// This function is public by necessity — Meta cannot present a Supabase JWT —
// so deploy it with --no-verify-jwt and let the signature be the gate. Every
// request whose HMAC does not check out is rejected before its body is read for
// anything. Without WHATSAPP_APP_SECRET set, the function refuses every POST
// rather than accepting unsigned status updates.

import { json, dbJson } from '../_shared/http.ts';

const VERIFY_TOKEN = Deno.env.get('WHATSAPP_VERIFY_TOKEN') ?? '';
const APP_SECRET   = Deno.env.get('WHATSAPP_APP_SECRET') ?? '';

// WhatsApp's status names, mapped onto ours. 'deleted' has no equivalent and is
// recorded as an event without moving the row.
const STATUS: Record<string, string> = {
  sent: 'sent', delivered: 'delivered', read: 'read', failed: 'failed',
};

Deno.serve(async (req) => {
  const url = new URL(req.url);

  // Subscription handshake.
  if (req.method === 'GET') {
    const mode = url.searchParams.get('hub.mode');
    const token = url.searchParams.get('hub.verify_token');
    const challenge = url.searchParams.get('hub.challenge') ?? '';
    if (mode === 'subscribe' && VERIFY_TOKEN && token === VERIFY_TOKEN) {
      return new Response(challenge, { status: 200 });
    }
    return new Response('forbidden', { status: 403 });
  }
  if (req.method !== 'POST') return new Response('method not allowed', { status: 405 });

  const raw = await req.text();
  if (!APP_SECRET) {
    console.error('whatsapp-webhook: WHATSAPP_APP_SECRET is not set — refusing');
    return new Response('not configured', { status: 503 });
  }
  if (!await validSignature(raw, req.headers.get('x-hub-signature-256'))) {
    return new Response('bad signature', { status: 401 });
  }

  let body: Record<string, unknown>;
  try { body = JSON.parse(raw); } catch { return new Response('bad json', { status: 400 }); }

  try {
    // deno-lint-ignore no-explicit-any
    for (const entry of ((body as any).entry ?? [])) {
      for (const change of (entry.changes ?? [])) {
        for (const st of (change.value?.statuses ?? [])) {
          const mapped = STATUS[st.status];
          const rows = await dbJson<Array<{ id: string; status: string }>>(
            `parent_messages?select=id,status&provider_message_id=eq.${encodeURIComponent(st.id)}`);
          if (!rows?.length) continue;
          const row = rows[0];

          await dbJson('message_events', {
            method: 'POST',
            body: JSON.stringify({ message_id: row.id, status: st.status, raw: st }),
          }).catch(() => {});

          if (!mapped) continue;
          // Status updates can arrive out of order. A 'sent' after a 'read'
          // would otherwise walk the row backwards.
          if (rank(mapped) <= rank(row.status) && mapped !== 'failed') continue;

          const patch: Record<string, unknown> = { status: mapped };
          if (mapped === 'delivered') patch.delivered_at = new Date().toISOString();
          if (mapped === 'read')      patch.read_at = new Date().toISOString();
          if (mapped === 'failed')    patch.error = st.errors?.[0]?.title ?? 'delivery failed';
          await dbJson(`parent_messages?id=eq.${row.id}`,
            { method: 'PATCH', body: JSON.stringify(patch) }).catch(() => {});
        }
      }
    }
  } catch (e) {
    // Always 200 on a signed request: Meta retries anything else, and a retry
    // storm over a database blip helps nobody. The error goes to the log.
    console.error('whatsapp-webhook', e);
  }
  return json(req, { received: true });
});

function rank(status: string): number {
  return ['queued', 'prepared', 'sent', 'delivered', 'read'].indexOf(status);
}

async function validSignature(raw: string, header: string | null): Promise<boolean> {
  if (!header?.startsWith('sha256=')) return false;
  const key = await crypto.subtle.importKey(
    'raw', new TextEncoder().encode(APP_SECRET),
    { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  const mac = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(raw));
  const expected = [...new Uint8Array(mac)].map((b) => b.toString(16).padStart(2, '0')).join('');
  const given = header.slice(7);
  // Constant-time: a length-independent early return here leaks the digest one
  // byte at a time to anyone willing to make enough requests.
  if (given.length !== expected.length) return false;
  let diff = 0;
  for (let i = 0; i < expected.length; i++) diff |= given.charCodeAt(i) ^ expected.charCodeAt(i);
  return diff === 0;
}
