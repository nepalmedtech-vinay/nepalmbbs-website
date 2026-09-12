// NepalMBBS.in — admin.js
// Admin panel: auth, dashboard, content management
// Extracted from index.html in Phase 1; content is byte-identical.
// Classic script (not a module): these functions must stay global because the
// markup still calls them from inline on* handlers. Load order matters.

// =====================================================
// Authentication is Supabase Auth (see auth.js). There is no password in this
// file, no comparison in the browser, and no admin_settings row holding a
// hash: the panel obtains a real session and every request carries its JWT, so
// the database — not this code — decides what comes back.
//
// The sha256 helpers below are kept because the theme panel still uses them.

function openAdmin(){
  document.getElementById('admin-overlay').classList.add('open');
  document.getElementById('admin-err').textContent='';
  document.getElementById('admin-pass').value='';
  document.getElementById('admin-main').style.display='none';
  document.getElementById('admin-login-view').style.display='block';
  setTimeout(()=>document.getElementById('admin-pass').focus(),300);
}
function closeAdmin(){
  document.getElementById('admin-overlay').classList.remove('open');
  adminLoggedIn=false;
}

async function doAdminLogin(){
  var errEl  = document.getElementById('admin-err');
  var emailEl = document.getElementById('admin-email');
  var passEl  = document.getElementById('admin-pass');
  var email = emailEl ? emailEl.value.trim() : '';
  var pass  = passEl ? passEl.value : '';

  errEl.textContent = '';
  if(!email || !pass){ errEl.textContent = 'Enter your email and password.'; return; }

  var btn = document.querySelector('#admin-login-view .a-btn-primary');
  if(btn){ btn.disabled = true; btn.textContent = 'Signing in…'; }

  try {
    await Auth.signIn(email, pass);
  } catch (e) {
    // Deliberately one message for a wrong email and a wrong password. Telling
    // the two apart confirms which addresses exist, which is a free list of
    // valid targets for anyone probing.
    errEl.textContent = e.status === 400
      ? 'Those details do not match an account.'
      : (e.message || 'Sign-in failed. Please try again.');
    if(btn){ btn.disabled = false; btn.textContent = 'Sign in →'; }
    passEl.value = '';
    passEl.focus();
    return;
  }

  // Signed in is not the same as being on the team. This decides what the
  // panel shows; the database decides what it can actually fetch, and would
  // return nothing to a non-staff account regardless of what happens here.
  var me = await Auth.whoAmI();
  if(!me){
    await Auth.signOut();
    errEl.textContent = 'This account is not on the staff list. Ask an administrator to add you.';
    if(btn){ btn.disabled = false; btn.textContent = 'Sign in →'; }
    return;
  }

  adminLoggedIn = true;
  window.currentStaff = me;
  if(btn){ btn.disabled = false; btn.textContent = 'Sign in →'; }
  document.getElementById('admin-login-view').style.display = 'none';
  document.getElementById('admin-main').style.display = 'block';

  var who = document.getElementById('admin-who');
  if(who) who.textContent = (me.full_name || me.email) + ' · ' + me.role;

  await loadDashboard();
  await loadAdminSettings();
  await loadAdminVids();
  await loadAdminTests();
  await loadAdminFAQs();
}

async function doAdminLogout(){
  await Auth.signOut();
  adminLoggedIn = false;
  window.currentStaff = null;
  document.getElementById('admin-main').style.display = 'none';
  document.getElementById('admin-login-view').style.display = 'block';
  var p = document.getElementById('admin-pass'); if(p) p.value = '';
}

async function doAdminReset(){
  var emailEl = document.getElementById('admin-email');
  var errEl = document.getElementById('admin-err');
  var email = emailEl ? emailEl.value.trim() : '';
  if(!email){ errEl.textContent = 'Enter your email first, then choose Forgot password.'; return; }
  try { await Auth.sendReset(email); } catch (e) {}
  // Always the same message, sent or not — otherwise this endpoint becomes a
  // way to test which addresses are registered.
  errEl.textContent = 'If that address has an account, a reset link is on its way.';
}

// A session can outlive the page. If one is already valid, restore the panel
// rather than asking for a password that is no longer the credential.
(async function restoreAdminSession(){
  if(!window.Auth || !Auth.isSignedIn) return;
  var me = await Auth.whoAmI();
  if(!me) { await Auth.signOut(); return; }
  adminLoggedIn = true;
  window.currentStaff = me;
})();

function switchATab(btn,id){
  document.querySelectorAll('.a-tab').forEach(b=>b.classList.remove('on'));
  document.querySelectorAll('.a-pane').forEach(p=>p.classList.remove('on'));
  btn.classList.add('on');
  document.getElementById(id).classList.add('on');
  if(id==='ap-leads') loadLeadsTable();
}

// DASHBOARD
async function loadDashboard(){
  try{
    const leads = await sbR('/rest/v1/leads?select=city,created_at');
    document.getElementById('st-total').textContent = leads.length;
    const today = new Date().toISOString().slice(0,10);
    document.getElementById('st-today').textContent = leads.filter(l=>l.created_at&&l.created_at.startsWith(today)).length;
    const cc=(c)=>leads.filter(l=>l.city&&l.city.toLowerCase().includes(c.toLowerCase())).length;
    document.getElementById('st-mumbai').textContent = cc('mumbai');
    document.getElementById('st-nagpur').textContent = cc('nagpur');
    document.getElementById('st-nanded').textContent = cc('nanded');
    document.getElementById('st-nashik').textContent = cc('nashik');
  }catch(e){document.getElementById('st-total').textContent='—';}
}

// LOAD SETTINGS INTO ADMIN FORM
async function loadAdminSettings(){
  const m = window._S||{};
  if(m.hero_badge) document.getElementById('a-hero-badge').value=m.hero_badge;
  if(m.hero_sub) document.getElementById('a-hero-sub').value=m.hero_sub;
  if(m.phone) document.getElementById('a-phone').value=m.phone;
  if(m.wa_number) document.getElementById('a-wa-num').value=m.wa_number;
  if(m.footer_about) document.getElementById('a-footer-about').value=m.footer_about;
  if(m.nmc_video_url) document.getElementById('a-nmc-url').value=m.nmc_video_url;
  if(m.nmc_video_title) document.getElementById('a-nmc-title').value=m.nmc_video_title;
  if(m.calendly_url) document.getElementById('a-calendly').value=m.calendly_url;
  if(m.ga_code) document.getElementById('a-ga-code').value=m.ga_code;
  // Sync toggles with actual state
  const swMap={show_ticker:'sw-ticker',show_wa_float:'sw-wa',show_chat:'sw-chat',show_lead_form:'sw-form'};
  Object.entries(swMap).forEach(([key,swId])=>{
    const sw=document.getElementById(swId);if(!sw)return;
    if(m[key]==='false') sw.classList.remove('on'); else sw.classList.add('on');
  });
}

// SAVE SETTING
async function saveSet(key,inputId,domId){
  const val=document.getElementById(inputId).value.trim();
  if(!val){toast('Value cannot be empty','err');return;}
  const ok=await sbW(`/rest/v1/admin_settings?key=eq.${key}`,{value:val,updated_at:new Date().toISOString()},'PATCH');
  if(ok){
    if(domId){const el=document.getElementById(domId);if(el)el.textContent=val;}
    if(window._S)window._S[key]=val;
    toast('Saved to Supabase — live on all devices','ok');
  } else {
    // Try INSERT if PATCH returned no rows
    const ins=await sbW('/rest/v1/admin_settings',{key,value:val});
    if(ins){toast('Saved','ok');}else toast('Error saving. Check Supabase connection.','err');
  }
}

// SAVE PHONE
async function savePhone(){
  const val=document.getElementById('a-phone').value.trim();
  if(!val){toast('Enter phone number','err');return;}
  const ok=await sbW('/rest/v1/admin_settings?key=eq.phone',{value:val,updated_at:new Date().toISOString()},'PATCH');
  if(ok){
    document.querySelectorAll('#footer-phone,#counsel-phone').forEach(el=>{if(el)el.textContent=val;});
    const fl=document.getElementById('footer-phone-link');if(fl)fl.href='tel:'+val.replace(/\s+/g,'');
    toast('Phone updated sitewide','ok');
  } else toast('Error. Check Supabase write policies.','err');
}

// SAVE WA NUMBER
async function saveWANum(){
  const val=document.getElementById('a-wa-num').value.trim().replace(/\D/g,'');
  if(!val||val.length<10){toast('Enter valid number with country code (e.g. 917080800888)','err');return;}
  const ok=await sbW('/rest/v1/admin_settings?key=eq.wa_number',{value:val,updated_at:new Date().toISOString()},'PATCH');
  if(ok){siteWANum=val;applyWALinks(val);toast('WhatsApp number updated on all devices','ok');}
  else toast('Error saving. Check Supabase write policies.','err');
}
function testWACall(){const num=document.getElementById('a-wa-num').value.replace(/\D/g,'')||siteWANum;window.open('https://wa.me/'+num+'?call','_blank');}

// SAVE HERO H1
async function saveHeroH1(){
  const val=document.getElementById('a-hero-h1').value.trim();
  if(!val){toast('Enter heading text','err');return;}
  const ok=await sbW('/rest/v1/admin_settings?key=eq.hero_h1',{value:val,updated_at:new Date().toISOString()},'PATCH');
  if(ok){const el=document.getElementById('hero-h1');if(el)el.innerHTML=val;toast('Hero heading updated','ok');}
  else{const ins=await sbW('/rest/v1/admin_settings',{key:'hero_h1',value:val});if(ins){const el=document.getElementById('hero-h1');if(el)el.innerHTML=val;toast('Saved','ok');}else toast('Error','err');}
}

// SAVE CALENDLY
async function saveCalendly(){
  const val=document.getElementById('a-calendly').value.trim();
  if(!val){toast('Enter Calendly URL','err');return;}
  const ok=await sbW('/rest/v1/admin_settings?key=eq.calendly_url',{value:val,updated_at:new Date().toISOString()},'PATCH');
  if(ok){document.querySelectorAll('#calendly-link,#footer-calendly').forEach(el=>{if(el)el.href=val;});toast('Calendly URL updated','ok');}
  else toast('Error saving','err');
}

// SAVE GA4 MEASUREMENT ID
async function saveGA(){
  const val=document.getElementById('a-ga-code').value.trim().toUpperCase();
  if(!val){toast('Enter your GA4 Measurement ID','err');return;}
  if(!GA_ID_RE.test(val)){toast('Enter a GA4 Measurement ID like G-XXXXXXXXXX (not the full script).','err');return;}
  const ok=await sbW('/rest/v1/admin_settings?key=eq.ga_code',{value:val,updated_at:new Date().toISOString()},'PATCH');
  if(ok){
    loadGA(val);
    toast('Measurement ID saved & applied','ok');
  } else toast('Error saving','err');
}

// CHANGE PASSWORD
async function changePass(){
  // Passwords are Supabase Auth's job now. The old flow wrote a SHA-256 hash
  // into admin_settings — a row the anon key could read until 0001 closed it,
  // and one that never had rate limiting, lockout, reset links or rotation.
  var np = document.getElementById('a-new-pass').value;
  var cp = document.getElementById('a-conf-pass').value;
  if(!np || np.length < 10){ toast('Use at least 10 characters.','err'); return; }
  if(np !== cp){ toast('Passwords do not match','err'); return; }
  if(!Auth.isSignedIn){ toast('Sign in again before changing your password.','err'); return; }

  try{
    var r = await fetch(SB + '/auth/v1/user', {
      method: 'PUT',
      headers: Auth.headers({ 'Content-Type': 'application/json' }),
      body: JSON.stringify({ password: np })
    });
    if(!r.ok){
      var j = await r.json().catch(function(){ return {}; });
      throw new Error(j.msg || j.message || 'Could not change password');
    }
    toast('Password changed.','ok');
    document.getElementById('a-new-pass').value = '';
    document.getElementById('a-conf-pass').value = '';
  }catch(e){ toast('' + e.message, 'err'); }
}

// FEATURE TOGGLES
async function toggleFeature(sw,key,domId){
  sw.classList.toggle('on');
  const isOn=sw.classList.contains('on');
  const el=document.getElementById(domId);
  if(el)el.style.display=isOn?'':'none';
  const ok=await sbW(`/rest/v1/admin_settings?key=eq.${key}`,{value:String(isOn),updated_at:new Date().toISOString()},'PATCH');
  if(!ok) await sbW('/rest/v1/admin_settings',{key,value:String(isOn)});
  toast(`${isOn?'✅ Enabled':'⛔ Disabled'}: ${key} — saved to Supabase`,'ok');
}

// TICKER
function addTicker(){
  const val=document.getElementById('a-ticker-new').value.trim();
  if(!val){toast('Enter announcement text','err');return;}
  const tc=document.getElementById('ticker-content');
  if(tc){[0,1].forEach(()=>{const s=document.createElement('span');s.className='ticker-item';s.textContent=val;tc.appendChild(s);});}
  document.getElementById('a-ticker-new').value='';
  toast('Ticker item added','ok');
}

// NMC VIDEO
async function saveNMCVid(){
  const url=document.getElementById('a-nmc-url').value.trim();
  const title=document.getElementById('a-nmc-title').value.trim()||'NMC India Guidelines Video';
  if(!url){toast('Enter YouTube embed URL (https://www.youtube.com/embed/VIDEO_ID)','err');return;}
  const ok1=await sbW('/rest/v1/admin_settings?key=eq.nmc_video_url',{value:url,updated_at:new Date().toISOString()},'PATCH');
  const ok2=await sbW('/rest/v1/admin_settings?key=eq.nmc_video_title',{value:title,updated_at:new Date().toISOString()},'PATCH');
  if(!ok1) await sbW('/rest/v1/admin_settings',{key:'nmc_video_url',value:url});
  if(!ok2) await sbW('/rest/v1/admin_settings',{key:'nmc_video_title',value:title});
  const sec=document.getElementById('nmc-video-section');
  const fr=document.getElementById('nmc-video-frame');
  if(sec)sec.style.display='block';
  if(fr)fr.src=url;
  toast('NMC video saved to Supabase','ok');
}
async function removeNMCVid(){
  await sbW('/rest/v1/admin_settings?key=eq.nmc_video_url',{value:'',updated_at:new Date().toISOString()},'PATCH');
  const sec=document.getElementById('nmc-video-section');if(sec)sec.style.display='none';
  toast('NMC video removed','ok');
}

// VIDEOS
async function addVideo(){
  // Auto-convert YouTube watch URLs to nocookie embed
  const rawUrl=document.getElementById('a-vid-url').value.trim();
  let embedUrl=rawUrl;
  const yt1=rawUrl.match(/youtube\.com\/watch\?v=([a-zA-Z0-9_-]{11})/);
  const yt2=rawUrl.match(/youtu\.be\/([a-zA-Z0-9_-]{11})/);
  const ytId=yt1?yt1[1]:yt2?yt2[1]:null;
  if(ytId) embedUrl=`https://www.youtube-nocookie.com/embed/${ytId}?rel=0`;
  document.getElementById('a-vid-url').value=embedUrl;
  // continue with original addVideo logic
  const url=document.getElementById('a-vid-url').value.trim();
  const title=document.getElementById('a-vid-title').value.trim();
  const desc=document.getElementById('a-vid-desc').value.trim();
  const college=document.getElementById('a-vid-college')?document.getElementById('a-vid-college').value:'all';
  const rights=document.getElementById('a-vid-rights')?document.getElementById('a-vid-rights').value:'unknown';
  const featured=document.getElementById('a-vid-featured')?document.getElementById('a-vid-featured').checked:false;
  if(!url||!title){toast('URL and title are required','err');return;}
  // Media-readiness follow-up: saved as a draft (is_active:false) rather
  // than instantly public — a wrong URL or mistyped college used to go
  // live on the actual page the moment this button was clicked, with no
  // chance to check it first. Publish it explicitly from the list below.
  const ok=await sbW('/rest/v1/site_videos',{
    url,title,description:desc,category:college,
    rights_status:rights,source_type:ytId?'youtube':'external',featured,
    is_active:false,sort_order:0,
  });
  if(ok){
    toast('Saved as a draft — publish it from the list below when it looks right.','ok');
    document.getElementById('a-vid-url').value='';
    document.getElementById('a-vid-title').value='';
    document.getElementById('a-vid-desc').value='';
    if(document.getElementById('a-vid-featured')) document.getElementById('a-vid-featured').checked=false;
    await loadAdminVids();
  } else toast('Error adding video. Check Supabase write policies.','err');
}
async function loadAdminVids(){
  const list=document.getElementById('admin-vid-list');if(!list)return;
  const vids=await sbR('/rest/v1/site_videos?select=*&order=created_at.desc');
  if(!vids.length){list.innerHTML='<p style="color:var(--muted);font-size:13px">No videos added yet.</p>';return;}
  list.innerHTML=vids.map(v=>{
    const status=v.is_active
      ?'<span style="color:#0B7A55;font-weight:700">Live</span>'
      :'<span style="color:#92400e;font-weight:700">Draft</span>';
    const toggleBtn=v.is_active
      ?`<button class="a-btn a-btn-sec" ${actAttr('click',[['setVideoActive',v.id,false]])} style="padding:5px 10px;font-size:12px">Unpublish</button>`
      :`<button class="a-btn a-btn-primary" ${actAttr('click',[['setVideoActive',v.id,true]])} style="padding:5px 10px;font-size:12px">Publish</button>`;
    const meta=[v.category&&v.category!=='all'?v.category:null,v.rights_status&&v.rights_status!=='unknown'?v.rights_status:null].filter(Boolean).join(' · ');
    return `<div class="vid-row"><div class="vid-row-info"><div class="vid-row-title">${v.title} — ${status}</div><div class="vid-row-url">${v.url}${meta?' · '+meta:''}</div></div><div style="display:flex;gap:6px;flex-shrink:0">${toggleBtn}<button class="a-btn a-btn-danger" ${actAttr('click',[['deleteVideo',v.id]])} style="padding:5px 10px;font-size:12px">✕ Delete</button></div></div>`;
  }).join('');
}
async function setVideoActive(id,active){
  const ok=await sbW(`/rest/v1/site_videos?id=eq.${id}`,{is_active:active},'PATCH');
  if(ok){
    toast(active?'Published — now live on /videos and its college page.':'Unpublished.','ok');
    await loadAdminVids();
  } else toast('Error updating video.','err');
}
async function deleteVideo(id){
  if(!confirm('Delete this video permanently?'))return;
  const ok=await sbW(`/rest/v1/site_videos?id=eq.${id}`,null,'DELETE');
  if(ok){toast('Video deleted','ok');await loadAdminVids();}else toast('Error deleting','err');
}

// TESTIMONIALS
async function addTestimonial(){
  const name=document.getElementById('a-test-name').value.trim();
  const city=document.getElementById('a-test-city').value.trim();
  const year=document.getElementById('a-test-year').value.trim();
  const stars=parseInt(document.getElementById('a-test-stars').value)||5;
  const quote=document.getElementById('a-test-quote').value.trim();
  if(!name||!quote){toast('Name and quote are required','err');return;}
  const ok=await sbW('/rest/v1/site_testimonials',{name,city,year,stars,quote,is_active:true,sort_order:0});
  if(ok){
    toast('Testimonial added to Supabase','ok');
    document.getElementById('a-test-name').value='';document.getElementById('a-test-city').value='';
    document.getElementById('a-test-year').value='';document.getElementById('a-test-quote').value='';
    await loadAdminTests();
    // Show immediately
    const c=document.getElementById('testimonials-container');
    if(c){const d=document.createElement('div');d.className='test-card rev';d.innerHTML=`<div class="test-quote-icon">"</div><div class="test-stars">${'★'.repeat(stars)}</div><div class="test-text">${quote}</div><div class="test-author"><div class="test-avatar">${name[0]}</div><div><div class="test-name">${name}</div><div class="test-college">${city}</div><span class="test-year">${year}</span></div></div>`;c.appendChild(d);revObs.observe(d);}
  } else toast('Error. Check Supabase write policies.','err');
}
async function loadAdminTests(){
  const list=document.getElementById('admin-test-list');if(!list)return;
  const tests=await sbR('/rest/v1/site_testimonials?select=*&order=created_at.desc');
  if(!tests.length){list.innerHTML='<p style="color:var(--muted);font-size:13px">No testimonials added via admin yet.</p>';return;}
  list.innerHTML=tests.map(t=>`<div class="vid-row"><div class="vid-row-info"><div class="vid-row-title">${t.name} — ${t.city||''} (${t.year||''})</div><div class="vid-row-url">${(t.quote||'').substring(0,80)}...</div></div><button class="a-btn a-btn-danger" ${actAttr('click',[['deleteTest',t.id]])} style="padding:5px 10px;font-size:12px">✕ Delete</button></div>`).join('');
}
async function deleteTest(id){
  if(!confirm('Delete this testimonial permanently?'))return;
  const ok=await sbW(`/rest/v1/site_testimonials?id=eq.${id}`,null,'DELETE');
  if(ok){toast('Testimonial deleted','ok');await loadAdminTests();}else toast('Error deleting','err');
}

// FAQs
async function addFAQ(){
  const q=document.getElementById('a-faq-q').value.trim();
  const a=document.getElementById('a-faq-a').value.trim();
  const cat=document.getElementById('a-faq-cat').value;
  const order=parseInt(document.getElementById('a-faq-order').value)||99;
  if(!q||!a){toast('Question and answer are required','err');return;}
  const ok=await sbW('/rest/v1/site_faqs',{question:q,answer:a,category:cat,sort_order:order,is_active:true});
  if(ok){
    toast('FAQ added to Supabase','ok');
    document.getElementById('a-faq-q').value='';document.getElementById('a-faq-a').value='';
    await loadAdminFAQs();
    // Show immediately in FAQ tab
    const c=document.getElementById('faq-container');
    if(c){const d=document.createElement('div');d.className='faq-item rev';d.innerHTML=`<div class="faq-q" data-act="click" data-do='[["toggleFaq","@el"]]'><span>${q}</span><div class="faq-icon">+</div></div><div class="faq-body"><p>${a}</p></div>`;c.appendChild(d);revObs.observe(d);}
  } else toast('Error. Check Supabase (site_faqs table may need creation).','err');
}
async function loadAdminFAQs(){
  const list=document.getElementById('admin-faq-list');if(!list)return;
  const faqs=await sbR('/rest/v1/site_faqs?select=*&order=sort_order.asc,created_at.desc');
  if(!faqs.length){list.innerHTML='<p style="color:var(--muted);font-size:13px">No custom FAQs added yet.</p>';return;}
  list.innerHTML=faqs.map(f=>`<div class="vid-row"><div class="vid-row-info"><div class="vid-row-title">${f.question}</div><div class="vid-row-url">Category: ${f.category||'General'}</div></div><button class="a-btn a-btn-danger" ${actAttr('click',[['deleteFAQ',f.id]])} style="padding:5px 10px;font-size:12px">✕ Delete</button></div>`).join('');
}
async function deleteFAQ(id){
  if(!confirm('Delete this FAQ permanently?'))return;
  const ok=await sbW(`/rest/v1/site_faqs?id=eq.${id}`,null,'DELETE');
  if(ok){toast('FAQ deleted','ok');await loadAdminFAQs();}else toast('Error deleting','err');
}

// LEADS TABLE
async function loadLeadsTable(){
  const tb=document.getElementById('leads-tbody');
  tb.innerHTML='<tr><td colspan="9" style="text-align:center;color:var(--muted);padding:20px">Loading...</td></tr>';
  const leads=await sbR('/rest/v1/leads?select=*&order=created_at.desc&limit=200');
  if(!leads.length){tb.innerHTML='<tr><td colspan="9" style="text-align:center;color:var(--muted);padding:16px">No leads yet</td></tr>';return;}
  tb.innerHTML=leads.map((l,i)=>{
    const cat=l.notes?l.notes.match(/Cat:([^|]+)/)?.[1]||'—':'—';
    const src=l.notes?l.notes.match(/Mode:([^|]+)/)?.[1]||'—':'—';
    return `<tr>
      <td>${i+1}</td>
      <td><strong>${l.student_name||'—'}</strong></td>
      <td><a href="https://wa.me/${(l.contact_number||'').replace(/\D/g,'')}" target="_blank" style="color:var(--blue);font-weight:600">${l.contact_number||'—'}</a></td>
      <td>${l.city||'—'}</td>
      <td>${l.neet_score||'—'}</td>
      <td>${cat}</td>
      <td><select class="stage-pill s-${l.stage||'new'}" ${actAttr('change',[['updateLeadStage',l.id,'@el']])} style="border:none;cursor:pointer;font-weight:700;font-family:inherit">
        <option value="new" ${l.stage==='new'?'selected':''}>🆕 New</option>
        <option value="contacted" ${l.stage==='contacted'?'selected':''}>📞 Contacted</option>
        <option value="interested" ${l.stage==='interested'?'selected':''}>🔥 Interested</option>
        <option value="admitted" ${l.stage==='admitted'?'selected':''}>🎓 Admitted</option>
      </select></td>
      <td>${src}</td>
      <td>${l.created_at?new Date(l.created_at).toLocaleDateString('en-IN'):'—'}</td>
    </tr>`;
  }).join('');
}

async function updateLeadStage(id, select){
  const stage=select.value;
  select.className=`stage-pill s-${stage}`;
  const ok=await sbW(`/rest/v1/leads?id=eq.${id}`,{stage},'PATCH');
  if(ok) toast(`✅ Stage updated to "${stage}"`, 'ok');
  else toast('Error updating stage. Check Supabase write policy for leads table.','err');
}

// =====================================================
// ADMIN — COLLEGES MANAGEMENT
// =====================================================
async function addCollegeAdmin(){
  const name = document.getElementById('ac-name').value.trim();
  const loc = document.getElementById('ac-loc').value.trim();
  const seats = parseInt(document.getElementById('ac-seats').value)||0;
  const type = document.getElementById('ac-type').value;
  const web = document.getElementById('ac-web').value.trim();
  const est = document.getElementById('ac-est').value.trim();
  const fees = document.getElementById('ac-fees').value.trim();
  if(!name){toast('College name is required','err');return;}
  const ok = await sbW('/rest/v1/site_colleges',{name,location:loc,foreign_seats:seats,college_type:type,website:web||null,established:est||null,fee_notes_internal:fees||null,is_active:true,sort_order:99});
  if(ok){
    toast('College added to Supabase','ok');
    document.getElementById('ac-name').value='';
    document.getElementById('ac-loc').value='';
    document.getElementById('ac-seats').value='';
    document.getElementById('ac-web').value='';
    document.getElementById('ac-est').value='';
    document.getElementById('ac-fees').value='';
    await loadAdminColleges();
  } else toast('Error adding college. Ensure site_colleges table exists in Supabase.','err');
}
async function loadAdminColleges(){
  const list = document.getElementById('admin-college-list');
  if(!list) return;
  try {
    const cols = await sbR('/rest/v1/site_colleges?select=*&order=sort_order.asc,created_at.desc');
    if(!cols || !cols.length){list.innerHTML='<p style="color:var(--muted);font-size:13px">No colleges in Supabase yet. Colleges are currently hardcoded in HTML.</p>';return;}
    list.innerHTML = cols.map(c=>`<div class="vid-row"><div class="vid-row-info"><div class="vid-row-title">${c.name}</div><div class="vid-row-url">${c.location||''} | Seats: ${c.foreign_seats||'—'} | Type: ${c.college_type||'—'}</div></div><button class="a-btn a-btn-danger" ${actAttr('click',[['deleteCollege',c.id]])} style="padding:5px 10px;font-size:12px">✕ Delete</button></div>`).join('');
  } catch(e){list.innerHTML='<p style="color:var(--muted);font-size:13px">Error loading — ensure site_colleges table exists in Supabase.</p>';}
}
async function deleteCollege(id){
  if(!confirm('Delete this college from Supabase?'))return;
  const ok = await sbW(`/rest/v1/site_colleges?id=eq.${id}`,null,'DELETE');
  if(ok){toast('Deleted','ok'); await loadAdminColleges();}else toast('Error','err');
}

// =====================================================
// ADMIN — COLLEGE PHOTOS (Phase 4, migrations/0006)
// =====================================================
// Separate from the site_colleges block above on purpose: this reads/writes
// the college-photos Storage bucket directly, keyed by the same slug every
// college page already renders from — it does not depend on the
// disconnected site_colleges table.
const COLLEGE_PHOTO_EXT = { 'image/jpeg':'jpg', 'image/png':'png', 'image/webp':'webp' };
const COLLEGE_PHOTO_MAX_BYTES = 5 * 1024 * 1024;

async function uploadCollegePhoto(){
  const sel = document.getElementById('ap-college-select');
  const fileEl = document.getElementById('ap-college-file');
  const slug = sel ? sel.value : '';
  const file = fileEl && fileEl.files && fileEl.files[0];
  if(!slug || !file){ toast('Choose a college and a file first.', 'err'); return; }
  if(!window.Auth || !Auth.isSignedIn){ toast('Sign in first.', 'err'); return; }

  const ext = COLLEGE_PHOTO_EXT[file.type];
  if(!ext){ toast('Use a JPG, PNG or WebP file.', 'err'); return; }
  if(file.size > COLLEGE_PHOTO_MAX_BYTES){ toast('File is larger than 5MB.', 'err'); return; }

  const path = `${slug}/cover.${ext}`;
  try{
    const r = await fetch(`${SB}/storage/v1/object/college-photos/${path}`, {
      method: 'POST',
      // x-upsert lets a re-upload replace the existing cover photo instead of
      // failing on a duplicate path — the whole point of a fixed filename.
      headers: Object.assign(Auth.headers(), { 'Content-Type': file.type, 'x-upsert': 'true' }),
      body: file
    });
    if(r.ok){
      toast('Photo uploaded — live on the college page now.', 'ok');
      fileEl.value = '';
      // Media-readiness follow-up: the file itself is already live (this
      // upload flow always has been, deliberately — see the section's own
      // copy above), so the describable facts about it are saved
      // immediately too, not held back as a draft the way a new video is.
      await upsertHeroPhotoMeta(slug, path);
      await loadCollegePhotoPreview();
    } else {
      const body = await r.json().catch(()=>({}));
      toast(body.message || 'Upload failed.', 'err');
    }
  }catch(e){ toast('Network problem. Please try again.', 'err'); }
}

async function upsertHeroPhotoMeta(slug, storagePath){
  const caption = (document.getElementById('ap-college-photo-caption')||{}).value?.trim() || null;
  const alt = (document.getElementById('ap-college-photo-alt')||{}).value?.trim() || null;
  const rights = (document.getElementById('ap-college-photo-rights')||{}).value || 'unknown';
  const existing = await sbR(`/rest/v1/site_photos?select=id&college_slug=eq.${encodeURIComponent(slug)}&category=eq.hero&kind=eq.hosted`);
  const payload = {
    college_slug: slug, category: 'hero', kind: 'hosted', storage_path: storagePath,
    caption, alt_text: alt, rights_status: rights, is_active: true, featured: true,
  };
  if(Array.isArray(existing) && existing.length){
    await sbW(`/rest/v1/site_photos?id=eq.${existing[0].id}`, payload, 'PATCH');
  } else {
    await sbW('/rest/v1/site_photos', payload, 'POST');
  }
}

async function loadCollegePhotoPreview(){
  const sel = document.getElementById('ap-college-select');
  const slug = sel ? sel.value : '';
  const box = document.getElementById('ap-college-photo-preview');
  if(!slug || !box) return;
  box.innerHTML = '<p style="color:var(--muted);font-size:13px">Checking…</p>';
  const files = await sbStorageList('college-photos', slug + '/');
  if(Array.isArray(files) && files.length){
    const url = sbPublicUrl('college-photos', slug + '/' + files[0].name);
    box.innerHTML = `<img src="${url}" alt="" style="max-width:220px;border-radius:8px;display:block">`;
    // Pre-fill the metadata fields from what's on file, so re-checking a
    // photo also shows (and lets someone correct) its caption/alt/rights
    // rather than only ever being set once at upload time.
    const meta = await sbR(`/rest/v1/site_photos?select=*&college_slug=eq.${encodeURIComponent(slug)}&category=eq.hero&kind=eq.hosted&limit=1`);
    const row = Array.isArray(meta) && meta[0];
    if(document.getElementById('ap-college-photo-caption')) document.getElementById('ap-college-photo-caption').value = (row && row.caption) || '';
    if(document.getElementById('ap-college-photo-alt')) document.getElementById('ap-college-photo-alt').value = (row && row.alt_text) || '';
    if(document.getElementById('ap-college-photo-rights') && row) document.getElementById('ap-college-photo-rights').value = row.rights_status || 'unknown';
  } else {
    box.innerHTML = '<p style="color:var(--muted);font-size:13px">No photo uploaded for this college yet.</p>';
  }
  await loadPhotoRefs();
}

async function deleteCollegePhoto(){
  const sel = document.getElementById('ap-college-select');
  const slug = sel ? sel.value : '';
  if(!slug) return;
  if(!window.Auth || !Auth.isSignedIn){ toast('Sign in first.', 'err'); return; }
  if(!confirm('Remove the current photo for this college?')) return;

  const files = await sbStorageList('college-photos', slug + '/');
  if(!Array.isArray(files) || !files.length){ toast('No photo to remove.', 'err'); return; }

  try{
    const r = await fetch(`${SB}/storage/v1/object/college-photos/${slug}/${files[0].name}`, {
      method: 'DELETE',
      headers: Auth.headers()
    });
    if(r.ok){
      toast('Photo removed.', 'ok');
      const existing = await sbR(`/rest/v1/site_photos?select=id&college_slug=eq.${encodeURIComponent(slug)}&category=eq.hero&kind=eq.hosted`);
      if(Array.isArray(existing) && existing.length){
        await sbW(`/rest/v1/site_photos?id=eq.${existing[0].id}`, null, 'DELETE');
      }
      await loadCollegePhotoPreview();
    }
    else toast('Could not remove photo — admin role required.', 'err');
  }catch(e){ toast('Network problem. Please try again.', 'err'); }
}

// Media-readiness follow-up: the reference-link path for a real photo whose
// reuse rights aren't clear — nothing is copied or hosted, only a link to
// where the institution has actually published it. See CONTENT_ASSET_PLAN.md.
async function addOfficialPhotoRef(){
  const sel = document.getElementById('ap-college-select');
  const slug = sel ? sel.value : '';
  const url = document.getElementById('ap-photo-ref-url').value.trim();
  const source = document.getElementById('ap-photo-ref-source').value.trim();
  if(!slug || !url){ toast('Choose a college and enter a URL.', 'err'); return; }
  const ok = await sbW('/rest/v1/site_photos', {
    college_slug: slug, category: 'hero', kind: 'reference',
    external_url: url, source_name: source || null,
    rights_status: 'official-public', is_active: true,
  });
  if(ok){
    toast('Reference link added.', 'ok');
    document.getElementById('ap-photo-ref-url').value = '';
    document.getElementById('ap-photo-ref-source').value = '';
    await loadPhotoRefs();
  } else toast('Error adding reference.', 'err');
}

async function loadPhotoRefs(){
  const sel = document.getElementById('ap-college-select');
  const slug = sel ? sel.value : '';
  const box = document.getElementById('ap-photo-ref-list');
  if(!slug || !box) return;
  const refs = await sbR(`/rest/v1/site_photos?select=*&college_slug=eq.${encodeURIComponent(slug)}&kind=eq.reference&order=created_at.desc`);
  if(!Array.isArray(refs) || !refs.length){ box.innerHTML = ''; return; }
  box.innerHTML = refs.map(r => `<div class="vid-row"><div class="vid-row-info"><div class="vid-row-title">${r.source_name || 'Reference link'}</div><div class="vid-row-url">${r.external_url}</div></div><button class="a-btn a-btn-danger" ${actAttr('click',[['deletePhotoRef',r.id]])} style="padding:5px 10px;font-size:12px">✕ Delete</button></div>`).join('');
}

async function deletePhotoRef(id){
  if(!confirm('Remove this reference link?')) return;
  const ok = await sbW(`/rest/v1/site_photos?id=eq.${id}`, null, 'DELETE');
  if(ok){ toast('Removed.', 'ok'); await loadPhotoRefs(); } else toast('Error removing.', 'err');
}

async function exportCSV(){
  const leads=await sbR('/rest/v1/leads?select=*&order=created_at.desc');
  if(!leads.length){toast('No leads to export','err');return;}
  const csv=['Name,Phone,City,NEET Score,Category,Stage,Source,Date',...leads.map(l=>{
    const cat=l.notes?l.notes.match(/Cat:([^|]+)/)?.[1]||'':'';;
    const src=l.notes?l.notes.match(/Mode:([^|]+)/)?.[1]||'':'';
    return `"${l.student_name||''}","${l.contact_number||''}","${l.city||''}","${l.neet_score||''}","${cat}","${l.stage||''}","${src}","${l.created_at?new Date(l.created_at).toLocaleDateString('en-IN'):''}"`
  })].join('\n');
  const a=document.createElement('a');
  a.href='data:text/csv;charset=utf-8,\uFEFF'+encodeURIComponent(csv);
  a.download='nepalmbbs_leads_'+new Date().toISOString().slice(0,10)+'.csv';
  a.click();
  toast('CSV downloaded','ok');
}



// ═══ GLASS TAP GLOW — COMPREHENSIVE ═══
