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
let curLang='en',chatOpen=false,chatHistory=[],adminLoggedIn=false,siteWANum='917080800888';

// =====================================================
// SUPABASE HELPERS
// =====================================================
async function sbR(path){try{const r=await fetch(SB+path,{headers:{'apikey':AK,'Authorization':'Bearer '+AK}});return r.ok?await r.json():[];}catch(e){return[];}}
async function sbW(path,data,method='POST'){try{const r=await fetch(SB+path,{method,headers:{'Content-Type':'application/json','apikey':AK,'Authorization':'Bearer '+AK,'Prefer':'return=minimal'},body:JSON.stringify(data)});return r.ok||r.status===201||r.status===204;}catch(e){return false;}}

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
