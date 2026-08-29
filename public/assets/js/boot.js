// NepalMBBS.in — boot.js
// Startup sequence, site settings, dynamic content
// Extracted from index.html in Phase 1; content is byte-identical.
// Classic script (not a module): these functions must stay global because the
// markup still calls them from inline on* handlers. Load order matters.

// =====================================================
// The splash used to be dismissed only 1.6s after window 'load'. That event waits
// on every subresource, including 60+ hotlinked Unsplash images — so a single slow
// or blocked image left the loader up forever and the visitor saw a blank screen.
// Hiding it is now driven by its own timer from DOMContentLoaded and is idempotent.
function hideLoader(){const l=document.getElementById('loader');if(l)l.classList.add('hide');}
if(document.readyState==='loading'){
  document.addEventListener('DOMContentLoaded',()=>setTimeout(hideLoader,1600));
}else{
  setTimeout(hideLoader,1600);
}
window.addEventListener('load',()=>hideLoader());

// Boot the data-driven parts as soon as the DOM is ready rather than waiting on
// 'load', for the same reason.
(async()=>{
  if(document.readyState==='loading'){
    await new Promise(r=>document.addEventListener('DOMContentLoaded',r,{once:true}));
  }
  // Each step is isolated. This was a straight-line sequence, which was fine
  // when one page contained every element on the site. Across ten pages, a step
  // that trips over markup absent from the current page aborts every step after
  // it — silently, because none of this is visible until something is missing.
  // Losing one step must not cost the rest.
  const step = async (name, fn) => {
    try { await fn(); }
    catch (e) { console.error('[boot] ' + name + ' failed:', e); }
  };

  await step('initSiteSettings', initSiteSettings);
  await step('loadDynamicContent', loadDynamicContent);

  // Supabase realtime polling for live updates
  setInterval(async()=>{
    try{
      const cnt=await sbR('/rest/v1/leads?select=id&limit=1');
      // silently refresh if admin panel open
      const dash=document.getElementById('ap-dash');
      if(adminLoggedIn && dash && dash.classList.contains('on')) loadDashboard();
    }catch(e){}
  }, 30000); // refresh every 30s

  await step('convertCurr', () => convertCurr('inr'));
  await step('initChatSwipe', initChatSwipe);
})();
window.addEventListener('scroll',()=>{document.getElementById('navbar').classList.toggle('scrolled',scrollY>60);},{passive:true});

async function initSiteSettings(){
  try{
    const sets=await sbR('/rest/v1/admin_settings?select=key,value');
    if(!sets||!sets.length)return;
    const m={};sets.forEach(s=>m[s.key]=s.value);
    window._S=m;
    if(m.hero_badge){const e=document.getElementById('hero-badge-text');if(e)e.textContent=m.hero_badge;}
    if(m.hero_sub){const e=document.getElementById('hero-sub');if(e)e.innerHTML=m.hero_sub;}
    if(m.phone){
      const p=m.phone;
      document.querySelectorAll('#footer-phone,#counsel-phone').forEach(e=>{if(e)e.textContent=p;});
      const fl=document.getElementById('footer-phone-link');if(fl)fl.href='tel:'+p.replace(/\s+/g,'');
      const cb=document.getElementById('cbar-phone-txt');if(cb)cb.textContent=p;
    }
    if(m.wa_number){siteWANum=m.wa_number;applyWALinks(m.wa_number);}
    if(m.footer_about){const e=document.getElementById('footer-desc');if(e)e.textContent=m.footer_about;}
    if(m.calendly_url){document.querySelectorAll('#calendly-link,#footer-calendly').forEach(e=>{if(e)e.href=m.calendly_url;});}
    if(m.nmc_video_url&&m.nmc_video_url.trim()){
      const sec=document.getElementById('nmc-video-section');
      const fr=document.getElementById('nmc-video-frame');
      if(sec)sec.style.display='block';
      if(fr)fr.src=m.nmc_video_url;
    }
    if(m.show_ticker==='false'){const e=document.getElementById('ticker-bar');if(e)e.style.display='none';if(document.getElementById('sw-ticker'))document.getElementById('sw-ticker').classList.remove('on');}
    if(m.show_wa_float==='false'){const e=document.getElementById('wa-float-wrap');if(e)e.style.display='none';if(document.getElementById('sw-wa'))document.getElementById('sw-wa').classList.remove('on');}
    if(m.show_chat==='false'){const e=document.getElementById('chat-wrap');if(e)e.style.display='none';if(document.getElementById('sw-chat'))document.getElementById('sw-chat').classList.remove('on');}
    if(m.show_lead_form==='false'){const e=document.getElementById('hform-area');if(e)e.style.display='none';if(document.getElementById('sw-form'))document.getElementById('sw-form').classList.remove('on');}
    if(m.ga_code) loadGA(m.ga_code);
  }catch(e){console.log('Settings:',e.message);}
}

function applyWALinks(num){
  const chat=`https://wa.me/${num}?text=Hello!%20I%20need%20guidance%20for%20Nepal%20MBBS%202025.`;
  const call=`https://wa.me/${num}?call`;
  const chatEnq=`https://wa.me/${num}?text=I%20want%20to%20book%20a%20free%20Nepal%20MBBS%20counseling%20session.`;
  document.querySelectorAll('#wa-hero-chat,#cbar-wa-chat,#counsel-wa-chat,#footer-wa-chat,#footer-wa,#wa-float-chat').forEach(e=>{if(e)e.href=chat;});
  document.querySelectorAll('#wa-hero-call,#cbar-wa-call,#counsel-wa-call,#footer-wa-call,#wa-float-call').forEach(e=>{if(e)e.href=call;});
  const sw=document.getElementById('wa-success');if(sw)sw.href=`https://wa.me/${num}?text=I%20just%20registered%20on%20NepalMBBS.in`;
  const cc=document.getElementById('counsel-wa-chat');if(cc)cc.href=chatEnq;
}

async function loadDynamicContent(){
  // Videos
  try{
    const vids=await sbR('/rest/v1/site_videos?select=*&is_active=eq.true&order=sort_order.asc,created_at.asc');
    if(vids&&vids.length){
      const c=document.getElementById('videos-container');
      if(c)vids.forEach(v=>{
        const d=document.createElement('div');d.className='vid-card rev';
        // Convert youtube URLs to nocookie + thumbnail
        let embedUrl=v.url;
        let thumbUrl='';
        const ytMatch=v.url.match(/(?:youtube\.com\/embed\/|youtu\.be\/)([a-zA-Z0-9_-]{11})/);
        if(ytMatch){
          embedUrl=`https://www.youtube-nocookie.com/embed/${ytMatch[1]}?rel=0`;
          thumbUrl=`https://img.youtube.com/vi/${ytMatch[1]}/hqdefault.jpg`;
        }
        d.innerHTML=thumbUrl?
          `<div class="vid-thumb"><div class="vid-placeholder" ${actAttr('click',[['playVid','@el',embedUrl]])}><img src="${thumbUrl}" style="position:absolute;inset:0;width:100%;height:100%;object-fit:cover" loading="lazy"><div style="position:absolute;inset:0;background:rgba(0,0,0,.35)"></div><div class="play-btn" style="position:relative;z-index:1">▶</div></div></div><div class="vid-info"><h4>${v.title}</h4><p>${v.description||''}</p></div>`
          :`<div class="vid-thumb"><iframe src="${embedUrl}" loading="lazy" allowfullscreen style="position:absolute;inset:0;width:100%;height:100%;border:none"></iframe></div><div class="vid-info"><h4>${v.title}</h4><p>${v.description||''}</p></div>`;
        c.appendChild(d);revObs.observe(d);
      });
    }
  }catch(e){}
  // Testimonials
  try{
    const tests=await sbR('/rest/v1/site_testimonials?select=*&is_active=eq.true&order=sort_order.asc,created_at.asc');
    if(tests&&tests.length){
      const c=document.getElementById('testimonials-container');
      if(c)tests.forEach(t=>{
        const d=document.createElement('div');d.className='test-card rev';
        d.innerHTML=`<div class="test-quote-icon">"</div><div class="test-stars">${'★'.repeat(t.stars||5)}</div><div class="test-text">${t.quote}</div><div class="test-author"><div class="test-avatar">${t.name[0]}</div><div><div class="test-name">${t.name}</div><div class="test-college">${t.city||''}</div><span class="test-year">${t.year||''}</span></div></div>`;
        c.appendChild(d);revObs.observe(d);
      });
    }
  }catch(e){}
  // Custom FAQs
  try{
    const faqs=await sbR('/rest/v1/site_faqs?select=*&is_active=eq.true&order=sort_order.asc,created_at.asc');
    if(faqs&&faqs.length){
      const c=document.getElementById('faq-container');
      if(c)faqs.forEach(f=>{
        const d=document.createElement('div');d.className='faq-item rev';
        d.innerHTML=`<div class="faq-q" data-act="click" data-do='[["toggleFaq","@el"]]'><span>${f.question}</span><div class="faq-icon">+</div></div><div class="faq-body"><p>${f.answer}</p></div>`;
        c.appendChild(d);revObs.observe(d);
      });
    }
  }catch(e){}
  // Lead count for stat
  try{
    const cnt=await sbR('/rest/v1/leads?select=id&limit=1&count=exact');
    const total=parseInt(cnt?.length)||0;
    const el=document.getElementById('stat-leads');
    if(el&&total>10)el.textContent=(total+450)+'+';
  }catch(e){}
}

// =====================================================
// LANGUAGE
