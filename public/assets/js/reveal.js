// NepalMBBS.in — reveal.js
// Scroll reveal observer
// Extracted from index.html in Phase 1; content is byte-identical.
// Classic script (not a module): these functions must stay global because the
// markup still calls them from inline on* handlers. Load order matters.

// =====================================================
const revObs=new IntersectionObserver(es=>{es.forEach(e=>{if(e.isIntersecting){e.target.classList.add('vis');revObs.unobserve(e.target);}});},{threshold:0.06});
document.querySelectorAll('.rev').forEach(el=>revObs.observe(el));

// =====================================================
// CHATBOT — 50+ QUERIES
