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
  if(!url||!title){toast('URL and title are required','err');return;}
  const ok=await sbW('/rest/v1/site_videos',{url,title,description:desc,category:college,is_active:true,sort_order:0});
  if(ok){
    toast('Video added to Supabase','ok');
    document.getElementById('a-vid-url').value='';document.getElementById('a-vid-title').value='';document.getElementById('a-vid-desc').value='';
    await loadAdminVids();
    // Show immediately on page
    const c=document.getElementById('videos-container');
    if(c){const d=document.createElement('div');d.className='vid-card rev';d.innerHTML=`<div class="vid-thumb"><iframe src="${url}" loading="lazy" allowfullscreen style="position:absolute;inset:0;width:100%;height:100%;border:none"></iframe></div><div class="vid-info"><h4>${title}</h4><p>${desc}</p></div>`;c.appendChild(d);revObs.observe(d);}
  } else toast('Error adding video. Check Supabase write policies.','err');
}
async function loadAdminVids(){
  const list=document.getElementById('admin-vid-list');if(!list)return;
  const vids=await sbR('/rest/v1/site_videos?select=*&order=created_at.desc');
  if(!vids.length){list.innerHTML='<p style="color:var(--muted);font-size:13px">No videos added yet.</p>';return;}
  list.innerHTML=vids.map(v=>`<div class="vid-row"><div class="vid-row-info"><div class="vid-row-title">${v.title}</div><div class="vid-row-url">${v.url}</div></div><button class="a-btn a-btn-danger" ${actAttr('click',[['deleteVideo',v.id]])} style="padding:5px 10px;font-size:12px">✕ Delete</button></div>`).join('');
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

/* ── Live content: college media and notices ────────────────────────────────
   These write to college_media and college_notices, which live.js reads in
   the visitor's browser. A save here is on the site immediately — no rebuild,
   no deploy.

   That is the opposite of the College Cards block, which writes site_colleges
   and only lands at the next build. Both are correct: a seat count should
   pass the verify suite before a family reads it, and a notice that
   counselling has moved should not wait for a deploy. The admin panel labels
   which is which, because the person clicking Save needs to know.

   Everything is rendered with textContent and createElement. The values are
   typed by staff, which is a smaller threat than the open internet but not
   zero: a compromised staff account should not become stored XSS on the
   college pages that read these rows back. */

function collegeOptions(sel, firstLabel) {
  const el = document.getElementById(sel);
  if (!el) return;
  const keep = el.value;
  el.textContent = '';
  const first = document.createElement('option');
  first.value = ''; first.textContent = firstLabel;
  el.appendChild(first);
  (window.__adminColleges || []).forEach(function (c) {
    const o = document.createElement('option');
    o.value = c.slug; o.textContent = c.name;
    el.appendChild(o);
  });
  el.value = keep;
}

/* The college list comes from the page the panel is open on, which already
   ships all 27 in its own markup, so this needs no extra request. */
function ensureCollegeList() {
  if (window.__adminColleges) return Promise.resolve();
  return sbR('/rest/v1/site_colleges?select=slug,name').then(function (rows) {
    if (rows && rows.length) { window.__adminColleges = rows; return; }
    // site_colleges is an override layer and is usually empty. Fall back to
    // the links the colleges index renders, which are the committed 27.
    return fetch('/colleges/').then(function (r) { return r.text(); }).then(function (html) {
      const doc = new DOMParser().parseFromString(html, 'text/html');
      const seen = {};
      window.__adminColleges = [...doc.querySelectorAll('a[href^="/colleges/"]')]
        .map(function (a) {
          const slug = a.getAttribute('href').replace(/^\/colleges\//, '').replace(/\/$/, '');
          return { slug: slug, name: (a.textContent || slug).trim() };
        })
        .filter(function (c) {
          if (!c.slug || c.slug === 'compare' || seen[c.slug]) return false;
          seen[c.slug] = 1; return true;
        });
    }).catch(function () { window.__adminColleges = []; });
  });
}

function liveRow(host, label, sub, onDelete) {
  const row = document.createElement('div');
  row.className = 'a-live-row';
  const txt = document.createElement('div');
  const b = document.createElement('strong'); b.textContent = label;
  txt.appendChild(b);
  if (sub) { const s = document.createElement('span'); s.textContent = sub; txt.appendChild(s); }
  row.appendChild(txt);
  const del = document.createElement('button');
  del.className = 'a-btn a-btn-danger';
  del.type = 'button';
  del.textContent = 'Delete';
  del.addEventListener('click', onDelete);
  row.appendChild(del);
  host.appendChild(row);
}

async function loadCollegeMedia() {
  await ensureCollegeList();
  collegeOptions('a-media-college', 'Select a college…');
  const host = document.getElementById('a-media-list');
  if (!host) return;
  host.textContent = '';
  const slug = document.getElementById('a-media-college').value;
  if (!slug) return;
  const rows = await sbR('/rest/v1/college_media?select=id,kind,caption,external_url,storage_path' +
    '&order=sort_order.asc&college_slug=eq.' + encodeURIComponent(slug));
  if (!rows.length) { host.appendChild(document.createTextNode('Nothing for this college yet.')); return; }
  rows.forEach(function (r) {
    liveRow(host, r.caption || r.kind, r.external_url || r.storage_path || '', function () {
      deleteCollegeMedia(r.id);
    });
  });
}

async function addCollegeMedia() {
  const slug = document.getElementById('a-media-college').value;
  const kind = document.getElementById('a-media-kind').value;
  const url = document.getElementById('a-media-url').value.trim();
  if (!slug) { toast('Choose a college first.', 'err'); return; }
  // Same rule live.js enforces when reading. Refusing it here means a bad URL
  // never reaches the table, rather than being filtered out on every page load.
  if (!/^https?:\/\//i.test(url)) { toast('Enter a full http(s) URL.', 'err'); return; }
  const ok = await sbW('/rest/v1/college_media', {
    college_slug: slug,
    kind: kind,
    external_url: url,
    caption: document.getElementById('a-media-caption').value.trim() || null,
    credit: document.getElementById('a-media-credit').value.trim() || null,
  });
  if (ok) {
    toast('Saved. It is live on the college page now.', 'ok');
    document.getElementById('a-media-url').value = '';
    document.getElementById('a-media-caption').value = '';
    document.getElementById('a-media-credit').value = '';
    loadCollegeMedia();
  } else toast('Could not save. Check you are signed in as staff.', 'err');
}

async function deleteCollegeMedia(id) {
  const ok = await sbW('/rest/v1/college_media?id=eq.' + encodeURIComponent(id), null, 'DELETE');
  if (ok) { toast('Removed.', 'ok'); loadCollegeMedia(); }
  else toast('Could not remove.', 'err');
}

async function loadCollegeNotices() {
  await ensureCollegeList();
  collegeOptions('a-notice-college', 'Site-wide (all pages)');
  const host = document.getElementById('a-notice-list');
  if (!host) return;
  host.textContent = '';
  // Staff read everything, including drafts and expired notices — that is
  // what the staff policy is for, and you cannot edit what you cannot see.
  const rows = await sbR('/rest/v1/college_notices?select=id,title,college_slug,level,ends_at,published&order=created_at.desc&limit=30');
  if (!rows.length) { host.appendChild(document.createTextNode('No notices yet.')); return; }
  rows.forEach(function (r) {
    const where = r.college_slug || 'site-wide';
    const when = r.ends_at ? ' · until ' + String(r.ends_at).slice(0, 10) : '';
    const state = r.published ? '' : ' · unpublished';
    liveRow(host, r.title, where + ' · ' + r.level + when + state, function () {
      deleteCollegeNotice(r.id);
    });
  });
}

async function addCollegeNotice() {
  const title = document.getElementById('a-notice-title').value.trim();
  if (!title) { toast('A notice needs a title.', 'err'); return; }
  const ends = document.getElementById('a-notice-ends').value;
  const ok = await sbW('/rest/v1/college_notices', {
    college_slug: document.getElementById('a-notice-college').value || null,
    title: title,
    body: document.getElementById('a-notice-body').value.trim() || null,
    level: document.getElementById('a-notice-level').value,
    ends_at: ends ? new Date(ends + 'T23:59:59').toISOString() : null,
  });
  if (ok) {
    toast('Published. It is on the site now.', 'ok');
    document.getElementById('a-notice-title').value = '';
    document.getElementById('a-notice-body').value = '';
    loadCollegeNotices();
  } else toast('Could not publish. Check you are signed in as staff.', 'err');
}

async function deleteCollegeNotice(id) {
  const ok = await sbW('/rest/v1/college_notices?id=eq.' + encodeURIComponent(id), null, 'DELETE');
  if (ok) { toast('Removed.', 'ok'); loadCollegeNotices(); }
  else toast('Could not remove.', 'err');
}

// Re-list when the college selector changes, so the panel always shows what
// belongs to the college on screen.
document.addEventListener('DOMContentLoaded', function () {
  const m = document.getElementById('a-media-college');
  if (m) m.addEventListener('change', loadCollegeMedia);
});
