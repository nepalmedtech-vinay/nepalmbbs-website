// NepalMBBS.in — effects.js
// Glass tap glow
// Extracted from index.html in Phase 1; content is byte-identical.
// Classic script (not a module): these functions must stay global because the
// markup still calls them from inline on* handlers. Load order matters.

(function(){
  function addGlow(e){
    const el = e.currentTarget;
    el.classList.remove('glass-glow-tap');
    void el.offsetWidth;
    el.classList.add('glass-glow-tap');
    setTimeout(()=>el.classList.remove('glass-glow-tap'),450);
  }
  const SEL = [
    '.tab-card','.trust-badge','.college-enquire','.college-link',
    '.wa-chat-btn','.wa-call-btn-f','.phone-call-btn-f',
    '[onclick*="filterColleges"]','.mob-lang button',
    '.h-cta-btn','.hbtns a','.a-btn','.cbar-icon-btn',
    '.college-filter-btn','button[type="submit"]'
  ];
  function bind(){
    SEL.forEach(s=>{
      document.querySelectorAll(s).forEach(el=>{
        if(el._glassGlow) return;
        el._glassGlow = true;
        el.addEventListener('touchstart',addGlow,{passive:true});
        el.addEventListener('mousedown',addGlow);
      });
    });
  }
  document.addEventListener('DOMContentLoaded',bind);
  setTimeout(bind,1500);
  setTimeout(bind,4000);
})();


