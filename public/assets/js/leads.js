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
    // /counseling's "what happens after you enquire" card is always visible
    // (Phase 5F — most visitors need this before they'll trust the form with
    // their number, not after), so a real submit doesn't reveal new content;
    // it marks the first step/chip as genuinely underway instead.
    if(!h){
      const firstChip=document.querySelector('.counsel-journey .jr-path-step');
      if(firstChip) firstChip.classList.add('is-now');
      const firstStep=document.querySelector('.counsel-journey .jr-next li');
      if(firstStep) firstStep.classList.add('is-done');
    }
  }else{
    toast('Error submitting. Please WhatsApp us directly.','err');
    btn.disabled=false;btn.textContent=h?'Get Free Guidance →':'Send Enquiry →';
  }
}

// =====================================================
// NEET ELIGIBILITY CHECKER
// -----------------------------------------------------
// Was score-based against invented thresholds ({gen:400,obc:370,sc:320})
// that do not exist in any published regulation — NEET's qualifying MARK
// is reset every year against that year's results and NMC India does not
// publish it in advance, so no fixed mark can ever be honest here. The
// only two criteria the regulations actually fix in advance are NEET
// PERCENTILE and 12th PCB aggregate — both cited in src/data/knowledge.json
// (topics "neet-percentile", "eligibility-12th", source: NMC India — FMGL
// Regulations 2021). This checks those two instead of marks.
// =====================================================
function checkEligibility(){
  const pctEl=document.getElementById('calc-percentile');
  const cat=document.getElementById('calc-cat').value;
  const pcb=document.getElementById('calc-pcb').value;
  const res=document.getElementById('calc-result');
  const pct=pctEl.value===''?NaN:parseFloat(pctEl.value);
  if(isNaN(pct)||pct<0||pct>100){toast('Enter your NEET percentile (0–100) — it\'s on your official NTA scorecard, not the same as your raw score.','err');return;}
  if(!pcb){toast('Select your 12th PCB aggregate range.','err');return;}
  const reserved=cat==='sc';
  const pctMin=reserved?40:50;
  const pctOk=pct>=pctMin;
  const pcbState=pcb==='Below 50%'?(reserved?'unclear':'fail'):'ok';

  const row=(state,label,detail)=>{
    const icon=state==='ok'?'✅':state==='fail'?'⚠️':'❓';
    return `<div class="elig-row elig-${state}"><span class="elig-icon">${icon}</span><div><strong>${label}</strong><p>${detail}</p></div></div>`;
  };

  let html='<div class="result-card elig-card">';
  html+='<h4>Your eligibility, against the published rules</h4>';
  html+=row(pctOk?'ok':'fail','NEET percentile',
    `You entered the ${pct}th percentile. The qualifying threshold is the ${pctMin}th percentile for ${reserved?'SC/ST and reservation-covered OBC':'General and OBC'} candidates. ${pctOk?'This criterion is met.':'This criterion is not met at the percentile entered.'}`);
  html+=row(pcbState,'12th PCB aggregate',
    pcbState==='ok'
      ? `Your selected range (${pcb}) meets the ${reserved?40:50}% aggregate required for ${reserved?'reservation-covered':'General/OBC'} candidates.`
      : pcbState==='fail'
        ? `Your selected range (${pcb}) is below the 50% aggregate required for General/OBC candidates.`
        : `Your selected range (${pcb}) straddles the 40% reservation threshold — a range alone can't confirm this. Bring your exact percentage to your counsellor.`);
  html+='</div>';

  if(pctOk&&pcbState==='ok'){
    html+=`<div class="result-card res-ok"><h4>✅ You meet the published eligibility criteria</h4><p>Seat availability still depends on MEC Nepal's annual seat matrix and college-specific cutoffs — this checks regulatory eligibility only, not a seat offer.</p><span class="res-cta" data-act="click" data-do='[["switchTab","counsel"]]'>Book Free Counseling →</span></div>`;
  }else{
    html+=`<div class="result-card res-warn"><h4>⚠️ Talk to a counselor before ruling anything out</h4><p>At least one criterion above isn't clearly met from what you entered. A counsellor can review your exact numbers and any exceptions that apply.</p><span class="res-cta" data-act="click" data-do='[["switchTab","counsel"]]'>Talk to a Counselor →</span></div>`;
  }
  html+=`<p class="calc-dis" style="margin-top:8px">Sources: NMC India — FMGL Regulations 2021 (<a href="https://nmc.org.in" target="_blank" rel="noopener">nmc.org.in</a>), Medical Education Commission, Nepal (<a href="https://mec.gov.np" target="_blank" rel="noopener">mec.gov.np</a>).</p>`;
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
