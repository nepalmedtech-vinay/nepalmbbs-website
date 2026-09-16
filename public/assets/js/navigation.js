// NepalMBBS.in — navigation.js
// Tab routing, mobile menu, toast
// Extracted from index.html in Phase 1; content is byte-identical.
// Classic script (not a module): these functions must stay global because the
// markup still calls them from inline on* handlers. Load order matters.

// =====================================================
// Section id -> URL. Must stay in step with src/lib/routes.js, which is what
// the build uses; this is the copy the browser uses.
var ROUTES = {
  process:    '/admission-process',
  colleges:   '/colleges',
  why:        '/why-nepal',
  calculator: '/neet-calculator',
  guidelines: '/guidelines',
  videos:     '/videos',
  faq:        '/faq',
  lifestyle:  '/life-in-nepal',
  counsel:    '/counseling'
};

function switchTab(name){
  // Since Phase 2 each section is its own page, so most callers are now plain
  // links. But switchTab() is still called from CTAs inside body copy and from
  // the chatbot's replies, and those callers have no idea which page they are
  // on. If the section is not in this document, navigate to it — otherwise
  // every one of those links would silently do nothing.
  if(!document.getElementById('pane-'+name)){
    if(ROUTES[name]) window.location.href = ROUTES[name];
    return;
  }

  // Deactivate all tabs and panes
  document.querySelectorAll('.tab-card').forEach(b=>b.classList.remove('on'));
  document.querySelectorAll('.tab-pane').forEach(p=>p.classList.remove('on'));
  
  const btn = document.getElementById('tab-'+name);
  const pane = document.getElementById('pane-'+name);
  if(btn) btn.classList.add('on');
  if(pane) pane.classList.add('on');

  // ALWAYS close mobile menu immediately (fix: use remove not toggle)
  document.getElementById('mob-menu').classList.remove('open');
  document.getElementById('hbg').classList.remove('open');

  // Scroll somewhere meaningful. #tabs-section is the homepage's own
  // multi-tab remnant; every other page is single-pane since Phase 2, which
  // means the branch above just reactivated the pane that was already
  // showing — a true no-op unless the pane itself names a landing spot via
  // [data-scroll-target] (e.g. counseling.astro's enquiry form, so a body-copy
  // CTA like "Book Free Counseling" actually goes somewhere instead of
  // silently doing nothing, which is what every such CTA did before this).
  const target = document.getElementById('tabs-section')
    || (pane && pane.querySelector('[data-scroll-target]'));
  if(target){
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const targetY = target.getBoundingClientRect().top + window.pageYOffset - 68;
    window.scrollTo({top: targetY, behavior: reduce ? 'auto' : 'smooth'});
    const focusable = target.querySelector('input, select, textarea, button');
    if(focusable) setTimeout(() => focusable.focus({preventScroll: true}), reduce ? 0 : 450);
  }
}
function switchGuide(btn,id){
  document.querySelectorAll('.g-tab').forEach(b=>b.classList.remove('on'));
  document.querySelectorAll('.g-pane').forEach(p=>p.classList.remove('on'));
  btn.classList.add('on');document.getElementById(id).classList.add('on');
}

// =====================================================
// TOAST
// =====================================================
function toast(msg,type){const t=document.getElementById('toast');t.textContent=msg;t.className='show'+(type?' '+type:'');clearTimeout(t._t);t._t=setTimeout(()=>t.className='',3200);}

// =====================================================
// LEAD FORM
