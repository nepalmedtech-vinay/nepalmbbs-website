// NepalMBBS.in — i18n.js
// EN/HI language switching
// Extracted from index.html in Phase 1; content is byte-identical.
// Classic script (not a module): these functions must stay global because the
// markup still calls them from inline on* handlers. Load order matters.

// =====================================================
// Complete translation dictionary
const TRANS={
  en:{
    'hero_badge':'NEET 2025 Results Out — Nepal Admissions Open',
    'nav_counsel':'Free Counseling →',
    'hero_h1':'After NEET —<br><em>Nepal MBBS</em><br>The Smartest Path',
    'hero_sub':'NMC India-recognised colleges. Official MEC Nepal admission process. English medium. Zero visa for Indian citizens. Honest guidance — no pressure, no false promises.',
    'form_title':'Register for Free Guidance',
    'form_btn':'Get Free Guidance →',
    'form_note':'Your information is 100% private and secure',
    'succ_title':'Successfully Registered!',
    'succ_msg':'Our expert counselor will contact you on WhatsApp within 2 hours.',
    'stat_nmc':'NMC Approved','stat_dur':'MBBS Duration','stat_visa':'Visa for Indians','stat_guide':'Students Guided',
  },
  hi:{
    'hero_badge':'NEET 2025 परिणाम आए — नेपाल प्रवेश खुला',
    'nav_counsel':'निःशुल्क काउंसलिंग →',
    'hero_h1':'NEET के बाद —<br><em>नेपाल MBBS</em><br>सबसे स्मार्ट रास्ता',
    'hero_sub':'NMC मान्यता प्राप्त कॉलेज। आधिकारिक MEC नेपाल प्रवेश प्रक्रिया। अंग्रेजी माध्यम। भारतीयों के लिए शून्य वीज़ा। ईमानदार मार्गदर्शन — कोई दबाव नहीं।',
    'form_title':'निःशुल्क मार्गदर्शन के लिए रजिस्टर करें',
    'form_btn':'निःशुल्क मार्गदर्शन पाएं →',
    'form_note':'आपकी जानकारी 100% निजी और सुरक्षित है',
    'succ_title':'सफलतापूर्वक रजिस्टर हो गए!',
    'succ_msg':'हमारे काउंसलर 2 घंटे के भीतर WhatsApp पर संपर्क करेंगे।',
    'stat_nmc':'NMC अनुमोदित','stat_dur':'MBBS अवधि','stat_visa':'वीज़ा भारतीयों के लिए','stat_guide':'छात्र मार्गदर्शित',
  }
};
function setLang(l){
  curLang=l;
  // Apply data-en / data-hi attributes
  document.querySelectorAll('[data-'+l+']').forEach(el=>{
    const v=el.getAttribute('data-'+l);if(v)el.innerHTML=v;
  });
  // Apply translation dictionary
  const t=TRANS[l]||TRANS.en;
  const applyT=(id,key)=>{const el=document.getElementById(id);if(el&&t[key])el.innerHTML=t[key];};
  applyT('hero-badge-text','hero_badge');
  applyT('hero-h1','hero_h1');
  applyT('hero-sub','hero_sub');
  // Form elements
  const fbt=document.getElementById('hf-btn');if(fbt)fbt.textContent=t.form_btn||fbt.textContent;
  const ftit=document.querySelector('.card-title');if(ftit)ftit.textContent=t.form_title||ftit.textContent;
  // Nav
  document.querySelectorAll('.nav-cta').forEach(el=>{if(el)el.textContent=t.nav_counsel||el.textContent;});
  // Lang buttons
  document.querySelectorAll('.lbtn').forEach(b=>b.classList.toggle('on',b.textContent.trim()===(l==='en'?'EN':'हि')));
  document.querySelectorAll('.mob-lang button').forEach(b=>b.classList.toggle('on',(l==='en'&&b.textContent.includes('English'))||(l==='hi'&&b.textContent.includes('हिंदी'))));
}
function toggleMenu(){
  document.getElementById('mob-menu').classList.toggle('open');
  document.getElementById('hbg').classList.toggle('open');
}
function closeMenu(){
  document.getElementById('mob-menu').classList.remove('open');
  document.getElementById('hbg').classList.remove('open');
}

// =====================================================
// TABS
