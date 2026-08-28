// NepalMBBS.in — config.js
// Supabase endpoint + helpers, GA4 loader
// Extracted from index.html in Phase 1; content is byte-identical.
// Classic script (not a module): these functions must stay global because the
// markup still calls them from inline on* handlers. Load order matters.

// =====================================================
// SUPABASE CONFIG
// =====================================================
const SB='https://fpzgcijbryvddtpegcmm.supabase.co';
const AK='eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZwemdjaWpicnl2ZGR0cGVnY21tIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODI0NTk3ODIsImV4cCI6MjA5ODAzNTc4Mn0.EiIiB_CR7briJQ7IZB7fTHIzmooiT4TA6zZ7ox_bK1M';
// `chatOpen` and `chatHistory` used to live here because the chat widget read
// them as globals. chatbot.js scopes its own state now, and nothing else ever
// read these — leaving them would suggest the chat's state is shared across
// files when it is not, which is the kind of thing that costs a future reader
// half an hour.
let curLang='en',adminLoggedIn=false,siteWANum='917080800888';

// =====================================================
// SUPABASE HELPERS
// =====================================================
// Every request carries the signed-in user's JWT when there is one, and the
// anon key otherwise. That single line is what makes the staff policies apply:
// PostgREST derives the Postgres role from Authorization, so a signed-in
// counselor runs as `authenticated` and sees leads, while the same code path
// on a public page runs as `anon` and sees none.
function sbHeaders(extra){
  if (window.Auth && Auth.isSignedIn) return Auth.headers(extra);
  return Object.assign({ apikey: AK, Authorization: 'Bearer ' + AK }, extra || {});
}

async function sbR(path){
  try{
    const r = await fetch(SB+path, { headers: sbHeaders() });
    return r.ok ? await r.json() : [];
  }catch(e){ return []; }
}

async function sbW(path, data, method='POST'){
  try{
    const r = await fetch(SB+path, {
      method,
      // return=minimal on purpose: a representation is a READ, and anon has no
      // select policy on these tables, so asking for the row back would fail
      // the very inserts the public form depends on.
      headers: sbHeaders({ 'Content-Type':'application/json', 'Prefer':'return=minimal' }),
      body: JSON.stringify(data)
    });
    return r.ok || r.status===201 || r.status===204;
  }catch(e){ return false; }
}

// Surfaces why a write failed. The old helper returned a bare false, so a
// rate-limited submit and a network drop looked identical to the person
// filling in the form.
async function sbWDetail(path, data, method='POST'){
  try{
    const r = await fetch(SB+path, {
      method,
      headers: sbHeaders({ 'Content-Type':'application/json', 'Prefer':'return=minimal' }),
      body: JSON.stringify(data)
    });
    if (r.ok || r.status===201 || r.status===204) return { ok:true };
    const body = await r.json().catch(()=>({}));
    if (r.status === 429 || /rate limit/i.test(body.message||'')) {
      return { ok:false, reason:'rate', message:'Too many submissions just now. Please wait a few minutes.' };
    }
    if (r.status === 401 || r.status === 403) {
      return { ok:false, reason:'auth', message:'Not permitted. Please sign in again.' };
    }
    return { ok:false, reason:'other', message: body.message || 'Could not save. Please try again.' };
  }catch(e){ return { ok:false, reason:'network', message:'Network problem. Please try again.' }; }
}

// =====================================================
// ANALYTICS (GA4)
// =====================================================
// Only a GA4 Measurement ID is accepted — never arbitrary HTML from the database.
// The previous implementation innerHTML-ed a stored snippet, which (a) silently
// never ran, because innerHTML does not execute <script>, and (b) was an
// injection sink for anything that could write to admin_settings.
const GA_ID_RE = /^G-[A-Z0-9]{4,20}$/;
let gaLoaded = false;
function loadGA(id){
  if(gaLoaded) return true;
  id = String(id||'').trim().toUpperCase();
  if(!GA_ID_RE.test(id)) return false;
  gaLoaded = true;
  const s = document.createElement('script');
  s.async = true;
  s.src = 'https://www.googletagmanager.com/gtag/js?id=' + encodeURIComponent(id);
  document.head.appendChild(s);
  window.dataLayer = window.dataLayer || [];
  window.gtag = function(){ window.dataLayer.push(arguments); };
  window.gtag('js', new Date());
  window.gtag('config', id);
  return true;
}

// =====================================================
// INIT
