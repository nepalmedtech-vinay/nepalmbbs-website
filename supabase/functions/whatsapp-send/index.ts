// NepalMBBS.in — whatsapp-send
//
// Sends one already-composed message to one already-chosen parent.
//
// The order of operations matters and is deliberate. The console writes the
// parent_messages row first, under the counselor's own JWT and therefore under
// RLS; this function is then given only that row's id. It re-reads everything
// from the database — the number, the student, the institution — and never
// trusts a phone number that arrived in the request body. Sending a report card
// to the wrong parent is the worst thing this feature can do, so the recipient
// is checked against the guardian record again here, on the server, immediately
// before the send.
//
// Without provider credentials this does NOT pretend to have sent anything. It
// returns status 'prepared' with a signed link to the flyer and a wa.me deep
// link, and the log says prepared, not sent.

import {
  cors, json, fail, requireStaff, dbJson, storage, storageUrl, HttpError,
} from '../_shared/http.ts';

const PROVIDER   = Deno.env.get('WHATSAPP_PROVIDER') ?? 'none';   // 'cloud' | 'none'
const TOKEN      = Deno.env.get('WHATSAPP_TOKEN') ?? '';
const PHONE_ID   = Deno.env.get('WHATSAPP_PHONE_NUMBER_ID') ?? '';
const GRAPH_VER  = Deno.env.get('WHATSAPP_GRAPH_VERSION') ?? 'v21.0';
const TEMPLATE   = Deno.env.get('WHATSAPP_TEMPLATE_NAME') ?? '';
const TEMPLATE_LANG = Deno.env.get('WHATSAPP_TEMPLATE_LANG') ?? 'en';
const MEDIA_TTL  = Number(Deno.env.get('REPORT_LINK_TTL_SECONDS') ?? '172800'); // 48h

interface MessageRow {
  id: string; student_id: string; guardian_id: string | null; to_phone: string;
  body: string; media_path: string | null; status: string; attempts: number;
  recipient_relation: string | null;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors(req) });
  if (req.method !== 'POST') return json(req, { error: 'POST only' }, 405);

  try {
    const caller = await requireStaff(req);
    const { message_id } = await req.json();
    if (!message_id) throw new HttpError(400, 'message_id is required');

    const rows = await dbJson<MessageRow[]>(
      `parent_messages?select=id,student_id,guardian_id,to_phone,body,media_path,status,attempts,recipient_relation&id=eq.${message_id}`);
    if (!rows?.length) throw new HttpError(404, 'no such message');
    const msg = rows[0];

    // Membership, established from the student the message is about — not from
    // anything the caller sent.
    const student = (await dbJson<Array<{ institution_id: string; full_name: string }>>(
      `students?select=institution_id,full_name&id=eq.${msg.student_id}`))?.[0];
    if (!student) throw new HttpError(404, 'no such student');
    const member = await dbJson<Array<{ role: string }>>(
      `institution_members?select=role&institution_id=eq.${student.institution_id}&staff_id=eq.${caller.userId}`);
    if (!member?.length) throw new HttpError(403, 'not a member of that institution');

    if (msg.status === 'sent' || msg.status === 'delivered' || msg.status === 'read') {
      throw new HttpError(409, 'this message has already been sent');
    }

    // ── the wrong-recipient check ──
    // The number on the message must still be the number on the guardian row.
    // If someone corrected the parent's number between composing and sending,
    // this stops the send rather than delivering a child's marks to a stale
    // number.
    if (msg.guardian_id) {
      const g = (await dbJson<Array<{ phone_e164: string | null; phone_raw: string | null;
                                      student_id: string; full_name: string | null }>>(
        `guardians?select=phone_e164,phone_raw,student_id,full_name&id=eq.${msg.guardian_id}`))?.[0];
      if (!g) throw new HttpError(409, 'the parent record has been removed');
      if (g.student_id !== msg.student_id) {
        throw new HttpError(409, 'that parent is not on this student\'s record');
      }
      const onFile = [g.phone_e164, g.phone_raw].filter(Boolean).map(digits);
      if (!onFile.includes(digits(msg.to_phone))) {
        await mark(msg.id, { status: 'failed', error: 'recipient no longer matches the parent record' });
        throw new HttpError(409,
          'the number on this message no longer matches the parent record — reopen the student and try again');
      }
    }

    // ── the flyer ──
    // A signed URL, minted here with the service role and expiring. The bucket
    // is private: a report card is a named child's marks and must not sit on a
    // public URL that outlives the conversation.
    let mediaUrl: string | null = null;
    if (msg.media_path) {
      const signed = await storage(`object/sign/${msg.media_path}`, {
        method: 'POST', body: JSON.stringify({ expiresIn: MEDIA_TTL }),
      });
      if (signed.ok) {
        const out = await signed.json();
        const rel = out.signedUrl ?? out.signedURL;
        if (rel) mediaUrl = storageUrl(rel);
      }
    }

    // ── no credentials: prepare, and say so ──
    if (PROVIDER !== 'cloud' || !TOKEN || !PHONE_ID) {
      await mark(msg.id, { status: 'prepared', provider: 'manual',
                           attempts: msg.attempts, error: null });
      return json(req, {
        status: 'prepared',
        sent: false,
        media_url: mediaUrl,
        wa_link: `https://wa.me/${digits(msg.to_phone)}?text=${encodeURIComponent(msg.body)}`,
        note: 'No WhatsApp Business credentials are configured, so nothing was sent. '
            + 'The message and the report card image are ready to attach by hand.',
      });
    }

    // ── send ──
    const to = digits(msg.to_phone);
    const payload = TEMPLATE
      ? {
          messaging_product: 'whatsapp', to, type: 'template',
          template: {
            name: TEMPLATE, language: { code: TEMPLATE_LANG },
            components: [
              ...(mediaUrl ? [{ type: 'header', parameters: [{ type: 'image', image: { link: mediaUrl } }] }] : []),
              { type: 'body', parameters: [{ type: 'text', text: msg.body }] },
            ],
          },
        }
      : mediaUrl
        ? { messaging_product: 'whatsapp', to, type: 'image',
            image: { link: mediaUrl, caption: msg.body.slice(0, 1024) } }
        : { messaging_product: 'whatsapp', to, type: 'text',
            text: { preview_url: false, body: msg.body } };

    const res = await fetch(`https://graph.facebook.com/${GRAPH_VER}/${PHONE_ID}/messages`, {
      method: 'POST',
      headers: { 'content-type': 'application/json', authorization: `Bearer ${TOKEN}` },
      body: JSON.stringify(payload),
    });
    const body = await res.json().catch(() => ({}));

    if (!res.ok) {
      const err = body?.error ?? {};
      // 131047 is the re-engagement error: outside the 24-hour window WhatsApp
      // only accepts an approved template. Saying that plainly is more use to a
      // coordinator than "send failed".
      const human = String(err.code) === '131047'
        ? 'WhatsApp refused a free-form message to this parent (no reply from them in 24 hours). '
        + 'An approved message template is needed — see docs/EXAM-INTELLIGENCE.md.'
        : (err.message ?? `provider error ${res.status}`);
      await mark(msg.id, { status: 'failed', provider: 'cloud',
                           attempts: msg.attempts + 1, error: human });
      await event(msg.id, 'failed', body);
      return json(req, { status: 'failed', sent: false, error: human, media_url: mediaUrl }, 502);
    }

    const providerId = body?.messages?.[0]?.id ?? null;
    await mark(msg.id, {
      status: 'sent', provider: 'cloud', provider_message_id: providerId,
      attempts: msg.attempts + 1, error: null, sent_at: new Date().toISOString(),
    });
    await event(msg.id, 'sent', body);
    return json(req, { status: 'sent', sent: true, provider_message_id: providerId,
                       media_url: mediaUrl });
  } catch (e) {
    return fail(req, e);
  }
});

function digits(v: string | null): string { return String(v ?? '').replace(/\D/g, ''); }

async function mark(id: string, patch: Record<string, unknown>) {
  await dbJson(`parent_messages?id=eq.${id}`,
    { method: 'PATCH', body: JSON.stringify(patch) }).catch(() => {});
}

async function event(messageId: string, status: string, raw: unknown) {
  await dbJson('message_events',
    { method: 'POST', body: JSON.stringify({ message_id: messageId, status, raw }) })
    .catch(() => {});
}
