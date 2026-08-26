// NepalMBBS.in — hero.js
// Hero slideshow
// Extracted from index.html in Phase 1; content is byte-identical.
// Classic script (not a module): these functions must stay global because the
// markup still calls them from inline on* handlers. Load order matters.

// =====================================================
let heroSlideIndex = 0;
let heroTimer = null;
let heroStarted = false;
let heroContentHidden = false;
let photoSlideIndex = 0;
let photoSlideTimer = null;
let heroIsAnimating = false;

function initHeroSlideshow() {
  const slides = document.querySelectorAll('.hero-slide');
  const heroSection = document.querySelector('section.hero');
  const dotsEl = document.getElementById('slide-dots');
  if (!slides.length) return;

  // Find the slide with class 'active' (the college slide at index 7)
  let activeIdx = 0;
  slides.forEach((s, i) => {
    if (s.classList.contains('active')) activeIdx = i;
  });
  heroSlideIndex = activeIdx;

  // Position all slides: active one visible, rest off-screen right
  slides.forEach((s, i) => {
    s.style.transition = 'none';
    s.style.transform = i === activeIdx ? 'translateX(0)' : 'translateX(100%)';
  });

  // Build dot indicators
  if (dotsEl) {
    slides.forEach((_, i) => {
      const dot = document.createElement('div');
      dot.className = 'slide-dot' + (i === 0 ? ' active' : '');
      dot.onclick = () => { if(!heroIsAnimating) goToSlide(i); };
      dotsEl.appendChild(dot);
    });
  }

  // Preload all slide images silently
  slides.forEach(s => {
    const bgStyle = s.style.backgroundImage;
    const urlMatch = bgStyle.match(/url\(['"]?([^'"]+)['"]?\)/);
    if(urlMatch) {
      const img = new Image(); img.crossOrigin = "anonymous";
      img.src = urlMatch[1];
      // If image fails, mark slide to skip
      img.onerror = () => { s.dataset.broken = 'true'; };
    }
  });

  // After EXACTLY 5 seconds: activate slide mode
  setTimeout(() => {
    // Add .sliding class → CSS removes dark overlay, content fades
    if (heroSection) heroSection.classList.add('sliding');

    // Show caption
    const cap = document.getElementById('slide-caption');
    if (cap) cap.classList.add('show');

    // Start auto-advance every 4 seconds
    startSlideAuto();
  }, 5000);
}

function startSlideAuto() {
  clearInterval(window._heroSlidInterval);
  window._heroSlidInterval = setInterval(() => {
    const slides = document.querySelectorAll('.hero-slide');
    goToSlide((heroSlideIndex + 1) % slides.length);
  }, 2000);
}

function goToSlide(idx) {
  if (heroIsAnimating) return;
  heroIsAnimating = true;

  const slides = document.querySelectorAll('.hero-slide');
  const dots = document.querySelectorAll('.slide-dot');
  const capEl = document.getElementById('slide-caption-text');
  const prevIdx = heroSlideIndex;

  if (prevIdx === idx) { heroIsAnimating = false; return; }

  // Skip broken/blank slides automatically
  if (slides[idx] && slides[idx].dataset.broken === 'true') {
    heroIsAnimating = false;
    const total = slides.length;
    goToSlide((idx + 1) % total);
    return;
  }

  // OUT: current slide exits LEFT
  if (slides[prevIdx]) {
    slides[prevIdx].style.transition = 'transform 0.85s cubic-bezier(0.77,0,0.175,1)';
    slides[prevIdx].style.transform = 'translateX(-100%)';
    slides[prevIdx].classList.remove('active');
  }

  // IN: next slide enters from RIGHT
  if (slides[idx]) {
    slides[idx].style.transition = 'none';
    slides[idx].style.transform = 'translateX(100%)';
    slides[idx].classList.add('active');
    slides[idx].getBoundingClientRect(); // force reflow
    slides[idx].style.transition = 'transform 0.85s cubic-bezier(0.77,0,0.175,1)';
    slides[idx].style.transform = 'translateX(0)';
  }

  // Update caption text
  if (capEl && slides[idx]) capEl.textContent = slides[idx].dataset.caption || '';

  // Update dots
  dots.forEach((d, i) => d.classList.toggle('active', i === idx));

  heroSlideIndex = idx;
  setTimeout(() => { heroIsAnimating = false; }, 900);
}

// ─── TOUCH SWIPE SUPPORT ───────────────────────────────────
(function(){
  const el = document.getElementById('hero-slides');
  if(!el) return;
  let startX = 0, startY = 0, isDragging = false;

  el.addEventListener('touchstart', e => {
    startX = e.touches[0].clientX;
    startY = e.touches[0].clientY;
    isDragging = true;
  }, {passive:true});

  el.addEventListener('touchend', e => {
    if(!isDragging) return;
    isDragging = false;
    const dx = e.changedTouches[0].clientX - startX;
    const dy = e.changedTouches[0].clientY - startY;
    // Only horizontal swipes (dx > dy to avoid scroll conflicts)
    if(Math.abs(dx) > 40 && Math.abs(dx) > Math.abs(dy)){
      const slides = document.querySelectorAll('.hero-slide');
      const total = slides.length;
      if(dx < 0){
        // Swipe left → next slide
        goToSlide((heroSlideIndex + 1) % total);
      } else {
        // Swipe right → prev slide
        goToSlide((heroSlideIndex - 1 + total) % total);
      }
      // Reset auto-timer after manual swipe
      startSlideAuto();
    }
  }, {passive:true});

  // Mouse drag support for desktop
  let mouseStartX = 0;
  el.addEventListener('mousedown', e => { mouseStartX = e.clientX; });
  el.addEventListener('mouseup', e => {
    const dx = e.clientX - mouseStartX;
    if(Math.abs(dx) > 50){
      const slides = document.querySelectorAll('.hero-slide');
      const total = slides.length;
      if(dx < 0) goToSlide((heroSlideIndex + 1) % total);
      else goToSlide((heroSlideIndex - 1 + total) % total);
      startSlideAuto();
    }
  });
})();
// ────────────────────────────────────────────────────────────

// Wrap hero initial content for hide/show
function wrapHeroContent() {
  const heroGrid = document.querySelector('.hero-content > div:first-child');
  if (heroGrid && !heroGrid.classList.contains('hero-text-initial')) {
    heroGrid.classList.add('hero-text-initial');
  }
}

// =====================================================
// COLLEGE VIDEO / PHOTO SYSTEM
