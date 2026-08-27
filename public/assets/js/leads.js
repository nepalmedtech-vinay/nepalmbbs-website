// NepalMBBS.in — leads.js
// Lead form, NEET calculator, currency
// Extracted from index.html in Phase 1; content is byte-identical.
// Classic script (not a module): these functions must stay global because the
// markup still calls them from inline on* handlers. Load order matters.

// =====================================================
async function submitLead(src){
  const h=src==='hero';
  const name=document.getElementById(h?'h-name':'c-name').value.trim();
  const phone=document.getElementById(h?'h-phone':'c-phone').value.trim();
  const neet=document.getElementById(h?'h-neet':'c-neet').value;
  const state=h?document.getElementById('h-state').value:document.getElementById('c-state').value;
  const city=h?document.getElementById('h-city').value:document.getElementById('c-city').value;
  const cat=h?document.getElementById('h-cat').value:'';
  const attempt=h?(document.getElementById('h-attempt')?document.getElementById('h-attempt').value:''):(document.getElementById('c-attempt')?document.getElementById('c-attempt').value:'');
  const pcb=h?(document.getElementById('h-pcb')?document.getElementById('h-pcb').value:''):(document.getElementById('c-pcb')?document.getElementById('c-pcb').value:'');
  const bio=h&&document.getElementById('h-bio')?document.getElementById('h-bio').value:'';
  const mode=h?'Hero Form':document.getElementById('c-mode').value;
  if(!name||!phone){toast('Name and phone are required.','err');return;}
  if(!/^\d{10}$/.test(phone)){toast('Enter a valid 10-digit phone number.','err');return;}
  const btn=document.getElementById(h?'hf-btn':'cf-btn');
  btn.disabled=true;btn.textContent='Submitting...';
  const ok=await sbW('/rest/v1/leads',{student_name:name,contact_number:phone,neet_score:neet?parseInt(neet):null,city:city||null,stage:'new',notes:`Cat:${cat||'—'}|State:${state||'—'}|Attempt:${attempt||'—'}|PCB:${pcb||'—'}|Bio:${bio||'—'}|Mode:${mode}|Lang:${curLang}|Src:nepalmbbs.in`});
  if(ok){
    document.getElementById(h?'hform-area':'cform-area').style.display='none';
    document.getElementById(h?'hform-success':'cform-success').style.display='block';
    toast('Registered successfully! We will contact you shortly.','ok');
  }else{
    toast('Error submitting. Please WhatsApp us directly.','err');
    btn.disabled=false;btn.textContent=h?'Get Free Guidance →':'Send Enquiry →';
  }
}

// =====================================================
// NEET CALCULATOR
// =====================================================
function checkEligibility(){
  const score=parseInt(document.getElementById('calc-score').value)||0;
  const cat=document.getElementById('calc-cat').value;
  const res=document.getElementById('calc-result');
  if(!score||score<1||score>720){toast('Please enter a valid NEET score (1–720)','err');return;}
  const mins={gen:400,obc:370,sc:320};
  const min=mins[cat]||400;
  let html='';
  if(score>=min){
    html=`<div class="result-card res-ok"><h4>✅ Likely Meets Basic Eligibility Threshold</h4><p>Your NEET score of <strong>${score}</strong> (${cat.toUpperCase()} category) appears to meet the indicative minimum threshold for Nepal MBBS eligibility. However, actual seat availability depends on MEC Nepal's annual seat matrix and specific college cutoffs. This is indicative guidance only.</p><span class="res-cta" data-act="click" data-do='[["switchTab","counsel"]]'>Book Free Counseling →</span><a href="https://mec.gov.np" target="_blank" rel="noopener" class="res-cta">Verify at MEC Nepal ↗</a></div>`;
  }else{
    html=`<div class="result-card res-warn"><h4>⚠️ Score May Be Below Typical Threshold</h4><p>Your NEET score of <strong>${score}</strong> (${cat.toUpperCase()} category) may be below the indicative minimum (~${min}+). This is general guidance only — actual eligibility depends on current NMC India and MEC Nepal regulations. Please speak with our counselor for accurate, personalised guidance.</p><span class="res-cta" data-act="click" data-do='[["switchTab","counsel"]]'>Talk to a Counselor →</span></div>`;
  }
  html+=`<p class="calc-dis" style="margin-top:8px">⚠️ Indicative only. Verify at <a href="https://nmc.org.in" target="_blank">nmc.org.in</a> & <a href="https://mec.gov.np" target="_blank">mec.gov.np</a></p>`;
  res.innerHTML=html;res.style.display='block';
}

// =====================================================
// CURRENCY
// =====================================================
function convertCurr(from){
  const r=1.6;
  // The converter lives on one page, but boot.js primes it on every page. In
  // the single-page build those elements were always present; now they usually
  // are not, and an unguarded .value here threw before initChatSwipe() could
  // run — so chat swipe-to-close was dead on nine pages out of ten.
  const inr=document.getElementById('inr-val');
  const npr=document.getElementById('npr-val');
  const out=document.getElementById('curr-result');
  if(!inr||!npr||!out) return;
  const fmt=(i,n)=>'₹'+i.toLocaleString('en-IN')+' = रू '+n.toLocaleString('en-IN');
  if(from==='inr'){const v=parseFloat(inr.value)||0;const n=Math.round(v*r);npr.value=n;out.textContent=fmt(v,n);}
  else{const v=parseFloat(npr.value)||0;const i=Math.round(v/r);inr.value=i;out.textContent=fmt(i,v);}
}

// =====================================================
// FAQ
// =====================================================
function toggleFaq(el){const it=el.parentElement;const op=it.classList.contains('on');document.querySelectorAll('.faq-item.on').forEach(i=>i.classList.remove('on'));if(!op)it.classList.add('on');}

// =====================================================
// REVEAL
