// NepalMBBS.in — navigation.js
// Tab routing, mobile menu, toast
// Extracted from index.html in Phase 1; content is byte-identical.
// Classic script (not a module): these functions must stay global because the
// markup still calls them from inline on* handlers. Load order matters.

// =====================================================
function switchTab(name){
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

  // Scroll to tabs section — past the hero — immediately
  const ts = document.getElementById('tabs-section');
  if(ts){
    const targetY = ts.getBoundingClientRect().top + window.pageYOffset - 68;
    window.scrollTo({top: targetY, behavior: 'smooth'});
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
