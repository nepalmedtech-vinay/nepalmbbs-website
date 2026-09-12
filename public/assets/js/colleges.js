// NepalMBBS.in — colleges.js
// College cards and video system.
// Extracted from index.html in Phase 1; the stock-photo slideshow was removed
// in Phase 3C, so this file is no longer byte-identical to the original.
// Classic script (not a module): these functions must stay global because the
// markup still calls them from inline on* handlers. Load order matters.

// =====================================================
let currentCollege = 'all';
let allSiteVideos = [];

function selectCollege(btn, college) {
  document.querySelectorAll('.college-tab').forEach(b => b.classList.remove('on'));
  btn.classList.add('on');
  currentCollege = college;
  renderCollegeContent(college, btn);
}

function renderCollegeContent(college, btn) {
  const vidContainer = document.getElementById('videos-container');
  const photoShow = document.getElementById('college-photo-show');

  // Filter videos for this college
  const filtered = college === 'all'
    ? allSiteVideos
    : allSiteVideos.filter(v => (v.category || 'all') === college || (v.category || 'all') === 'all');

  if (filtered.length > 0) {
    // Show videos
    if (photoShow) photoShow.style.display = 'none';
    renderVideoGrid(filtered, vidContainer);
  } else {
    // No videos for this college.
    //
    // This branch used to fill the gap with stock Unsplash photographs,
    // labelled "official campus photos" and given the alt text
    // "<college> campus". They were never that college's campus, and on a site
    // whose value is being checkable, one reverse image search would have cost
    // the credibility of every other page — including the pages that are
    // accurate. An empty slot that says what is missing costs nothing.
    if (photoShow) photoShow.style.display = 'none';
    renderNoVideoState(college, vidContainer, btn);
  }
}

// Phase 5E: `btn` is the tab that was actually clicked (selectCollege has it
// on hand already), so this reads the college's name straight off it rather
// than an `[onclick*=...]` lookup that could never match — the tabs use
// data-act/data-do, not onclick, so that selector was silently failing on
// every call and this always fell back to "this college". Fixed by passing
// the element through instead of re-finding it by an attribute it never had.
function renderNoVideoState(college, container, btn) {
  if (!container) return;
  const name = college === 'all'
    ? null
    : ((btn && btn.textContent.trim()) || 'this college');
  const el = document.createElement('div');
  el.className = 'doc-empty';
  const title = document.createElement('p');
  title.className = 'doc-empty-title';
  title.textContent = name ? ('No video for ' + name + ' yet') : 'No videos published yet';
  const body = document.createElement('p');
  body.className = 'doc-empty-body';
  body.textContent = name
    ? ('We publish footage only when we have filmed it ourselves or the college has supplied it. '
      + 'Ask us and we will tell you what we have on ' + name + ' — including what we do not.')
    : 'We publish footage only when we have filmed it ourselves or a college has supplied it. Ask us — we will tell you what we hold, including where we hold nothing.';
  el.append(title, body);
  container.replaceChildren(el);
}

// Phase 5E: the first video gets a larger, editorial "featured" treatment —
// a bigger frame and its full caption read as a byline, not just a card
// title — instead of every video being an identically-sized grid tile. The
// same click-to-play, thumbnail-first mechanism as every other card; only
// the layout and copy prominence differ. Reuses the `.doc`/Record language
// (doc-head/doc-kicker) rather than inventing a second "featured" style.
// Phase 5E: hoisted out of renderVideoGrid so college-video.js (the college
// detail page's own video slot) can build an identical card rather than a
// second, slightly-different implementation of the same YouTube-URL-to-
// thumbnail logic. Global on purpose — colleges.js loads before
// college-video.js in GlassLayout, same ordering config.js/leads.js rely on.
function vidCardHTML(v, featured) {
  let embedUrl = v.url;
  let thumbUrl = '';
  const ytMatch = v.url.match(/(?:youtube(?:-nocookie)?\.com\/embed\/|youtu\.be\/)([a-zA-Z0-9_-]{11})/);
  if (ytMatch) {
    embedUrl = `https://www.youtube-nocookie.com/embed/${ytMatch[1]}?rel=0`;
    thumbUrl = `https://img.youtube.com/vi/${ytMatch[1]}/hqdefault.jpg`;
  }
  const cls = featured ? 'vid-card vid-card--featured' : 'vid-card';
  return thumbUrl
    ? `<div class="${cls}"><div class="vid-thumb"><div class="vid-placeholder" ${actAttr('click',[['playVid','@el',embedUrl]])}><img src="${thumbUrl}" style="position:absolute;inset:0;width:100%;height:100%;object-fit:cover" loading="lazy" decoding="async"><div style="position:absolute;inset:0;background:rgba(0,0,0,.35)"></div><div class="play-btn" style="position:relative;z-index:1">▶</div></div></div><div class="vid-info"><h4>${v.title}</h4><p>${v.description||''}</p></div></div>`
    : `<div class="${cls}"><div class="vid-thumb"><iframe src="${embedUrl}" loading="lazy" allowfullscreen style="position:absolute;inset:0;width:100%;height:100%;border:none"></iframe></div><div class="vid-info"><h4>${v.title}</h4><p>${v.description||''}</p></div></div>`;
}

function renderVideoGrid(videos, container) {
  if (!container) return;
  const wrap = document.createElement('div');
  wrap.className = 'vid-wrap';
  let html = `<div class="vid-featured">${vidCardHTML(videos[0], true)}</div>`;
  if (videos.length > 1) {
    html += `<div class="vid-grid">${videos.slice(1).map(v => vidCardHTML(v, false)).join('')}</div>`;
  }
  wrap.innerHTML = html;
  container.innerHTML = '';
  container.appendChild(wrap);
}

function playVid(el, url) {
  // vidCardHTML always hands this a URL that already carries `?rel=0`, so a
  // bare `${url}?autoplay=1` silently produced a second `?` (…?rel=0?autoplay=1)
  // — most players tolerate it, but it is not a valid query string. Found
  // while verifying Phase 5E's click-to-play path against real embed URLs.
  const sep = url.includes('?') ? '&' : '?';
  el.innerHTML = `<iframe src="${url}${sep}autoplay=1" style="position:absolute;inset:0;width:100%;height:100%;border:none" allowfullscreen></iframe>`;
  el.style.pointerEvents = 'none';
}

// The stock-photo slideshow that lived here (showCollegePhotos, slidePhoto,
// goToPhotoSlide, and the COLLEGE_PHOTOS / DEFAULT_COLLEGE_PHOTOS maps) has
// been removed. It served Unsplash stock images as a named college's campus,
// under the label "official campus photos". Nothing calls it now — the
// no-video case renders renderNoVideoState() instead.

// Override loadDynamicContent to also populate college videos
const _origLoadDynamic = loadDynamicContent;
async function loadDynamicContent() {
  try {
    const vids = await sbR('/rest/v1/site_videos?select=*&is_active=eq.true&order=sort_order.asc,created_at.asc');
    allSiteVideos = vids || [];
    // Phase 5E: a college detail page's "watch more from this college" link
    // points here as /videos?college=<code> — pre-select that tab instead of
    // defaulting to "all" so the visitor lands already filtered to the
    // college they came from, not back at the top of the whole library.
    // Dispatched as a real click (not a direct renderCollegeContent call) so
    // it goes through the exact same code path a manual tab click does.
    const pre = new URLSearchParams(location.search).get('college');
    const preBtn = pre && document.querySelector('.college-tab[data-do*=\'"' + pre + '"\']');
    if (preBtn) preBtn.click();
    else renderCollegeContent('all');
  } catch(e) { allSiteVideos = []; }

  // Load testimonials
  try {
    const tests = await sbR('/rest/v1/site_testimonials?select=*&is_active=eq.true&order=sort_order.asc,created_at.asc');
    if (tests && tests.length) {
      const c = document.getElementById('testimonials-container');
      if (c) tests.forEach(t => {
        const d = document.createElement('div');
        d.className = 'test-card rev';
        d.innerHTML = `<div class="test-quote-icon">"</div><div class="test-stars">${'★'.repeat(t.stars||5)}</div><div class="test-text">${t.quote}</div><div class="test-author"><div class="test-avatar">${t.name[0]}</div><div><div class="test-name">${t.name}</div><div class="test-college">${t.city||''}</div><span class="test-year">${t.year||''}</span></div></div>`;
        c.appendChild(d); revObs.observe(d);
      });
    }
  } catch(e) {}

  // Load FAQs
  try {
    const faqs = await sbR('/rest/v1/site_faqs?select=*&is_active=eq.true&order=sort_order.asc,created_at.asc');
    if (faqs && faqs.length) {
      const c = document.getElementById('faq-container');
      if (c) faqs.forEach(f => {
        const d = document.createElement('div');
        d.className = 'faq-item rev';
        d.innerHTML = `<div class="faq-q" data-act="click" data-do='[["toggleFaq","@el"]]'><span>${f.question}</span><div class="faq-icon">+</div></div><div class="faq-body"><p>${f.answer}</p></div>`;
        c.appendChild(d); revObs.observe(d);
      });
    }
  } catch(e) {}

  // Lead count
  try {
    const cnt = await sbR('/rest/v1/leads?select=id');
    const el = document.getElementById('stat-leads');
    if (el && cnt && cnt.length > 10) el.textContent = (cnt.length + 450) + '+';
  } catch(e) {}
}

// =====================================================
// STATE → CITY MAPPING (All India)
// =====================================================
const STATE_CITIES = {
  'Maharashtra': ['Mumbai','Pune','Nagpur','Nashik','Nanded','Latur','Aurangabad','Solapur','Kolhapur','Amravati','Thane','Navi Mumbai','Akola','Jalgaon','Sangli','Satara','Ahmednagar','Ratnagiri','Chandrapur','Gadchiroli','Wardha','Yavatmal','Buldhana','Washim','Other'],
  'Uttar Pradesh': ['Lucknow','Kanpur','Agra','Varanasi','Allahabad/Prayagraj','Meerut','Ghaziabad','Noida','Bareilly','Aligarh','Gorakhpur','Moradabad','Firozabad','Mathura','Muzaffarnagar','Saharanpur','Shahjahanpur','Rampur','Bahraich','Sitapur','Lakhimpur','Hardoi','Unnao','Rae Bareli','Faizabad/Ayodhya','Sultanpur','Jhansi','Gonda','Ballia','Deoria','Mau','Azamgarh','Jaunpur','Ghazipur','Basti','Sant Kabir Nagar','Siddharthnagar','Kushinagar','Maharajganj','Other'],
  'Bihar': ['Patna','Gaya','Muzaffarpur','Bhagalpur','Darbhanga','Purnia','Arrah','Begusarai','Katihar','Munger','Chhapra','Bettiah','Motihari','Samastipur','Bihar Sharif','Hajipur','Supaul','Sitamarhi','Madhubani','Siwan','Chapra','Jehanabad','Nalanda','Buxar','Rohtas','Aurangabad (Bihar)','Nawada','Jamui','Banka','Kishanganj','Araria','Madhepura','Saharsa','Khagaria','Sheohar','Other'],
  'Rajasthan': ['Jaipur','Jodhpur','Udaipur','Kota','Ajmer','Bikaner','Bhilwara','Alwar','Bharatpur','Sikar','Ganganagar','Hanumangarh','Chittorgarh','Pali','Nagaur','Tonk','Barmer','Jaisalmer','Jhunjhunu','Dausa','Sawai Madhopur','Baran','Jhalawar','Karauli','Dholpur','Other'],
  'Madhya Pradesh': ['Bhopal','Indore','Gwalior','Jabalpur','Ujjain','Sagar','Ratlam','Satna','Rewa','Dewas','Chhindwara','Murwara (Katni)','Morena','Bhind','Guna','Shivpuri','Vidisha','Chhatarpur','Damoh','Mandsaur','Khandwa','Khargone','Seoni','Hoshangabad','Itarsi','Betul','Sehore','Rajgarh','Neemuch','Dhar','Barwani','Other'],
  'Gujarat': ['Ahmedabad','Surat','Vadodara','Rajkot','Bhavnagar','Jamnagar','Junagadh','Gandhinagar','Anand','Nadiad','Mehsana','Morbi','Surendranagar','Amreli','Bharuch','Navsari','Valsad','Patan','Botad','Gir Somnath','Other'],
  'Delhi': ['New Delhi','Central Delhi','North Delhi','South Delhi','East Delhi','West Delhi','North West Delhi','South West Delhi','North East Delhi','Shahdara','Outer Delhi','Outer North Delhi'],
  'Haryana': ['Faridabad','Gurugram','Rohtak','Hisar','Panipat','Sonipat','Yamunanagar','Bhiwani','Ambala','Karnal','Kaithal','Rewari','Jhajjar','Mahendragarh','Nuh','Palwal','Panchkula','Sirsa','Jind','Fatehabad','Kurukshetra','Charkhi Dadri','Other'],
  'Punjab': ['Ludhiana','Amritsar','Jalandhar','Patiala','Bathinda','Hoshiarpur','Mohali','Gurdaspur','Firozpur','Moga','Muktsar','Kapurthala','Fazilka','Faridkot','Mansa','Tarn Taran','Pathankot','Sangrur','Barnala','Rupnagar','Other'],
  'West Bengal': ['Kolkata','Howrah','Durgapur','Asansol','Siliguri','Bardhaman','Malda','Murshidabad','Nadia','North 24 Parganas','South 24 Parganas','Hooghly','Bankura','Purulia','Birbhum','West Midnapore','East Midnapore','Jalpaiguri','Cooch Behar','North Dinajpur','South Dinajpur','Other'],
  'Tamil Nadu': ['Chennai','Coimbatore','Madurai','Tiruchirappalli','Salem','Tirunelveli','Vellore','Erode','Tiruppur','Thoothukudi','Ranipet','Kancheepuram','Dindigul','Thanjavur','Cuddalore','Nagapattinam','Namakkal','Karur','Perambalur','Ariyalur','Dharmapuri','Krishnagiri','Villupuram','Kallakurichi','Virudhunagar','Sivaganga','Ramanathapuram','Tenkasi','Tirupattur','Tiruvannamalai','Other'],
  'Karnataka': ['Bengaluru','Mysuru','Hubballi-Dharwad','Mangaluru','Belagavi','Kalaburagi','Ballari','Vijayapura','Tumkur','Davanagere','Shivamogga','Raichur','Bidar','Udupi','Hassan','Chitradurga','Dharwad','Gadag','Bagalkot','Koppal','Yadgir','Chikkaballapur','Chikkamagaluru','Kodagu','Mandya','Chamarajanagar','Haveri','Other'],
  'Andhra Pradesh': ['Visakhapatnam','Vijayawada','Guntur','Nellore','Kurnool','Tirupati','Rajahmundry','Kadapa','Anantapur','Kakinada','Eluru','Ongole','Srikakulam','Vizianagaram','Chittoor','Krishna','Prakasam','West Godavari','East Godavari','Other'],
  'Telangana': ['Hyderabad','Warangal','Nizamabad','Karimnagar','Khammam','Ramagundam','Nalgonda','Adilabad','Mahbubnagar','Suryapet','Siddipet','Rangareddy','Medchal','Other'],
  'Kerala': ['Thiruvananthapuram','Kochi','Kozhikode','Thrissur','Kollam','Alappuzha','Palakkad','Malappuram','Kannur','Kottayam','Idukki','Wayanad','Kasaragod','Pathanamthitta','Ernakulam','Other'],
  'Odisha': ['Bhubaneswar','Cuttack','Rourkela','Brahmapur','Sambalpur','Puri','Angul','Dhenkanal','Kendrapara','Balasore','Bhadrak','Koraput','Rayagada','Gajapati','Kandhamal','Bolangir','Bargarh','Sonepur','Jharsuguda','Sundergarh','Other'],
  'Jharkhand': ['Ranchi','Jamshedpur','Dhanbad','Bokaro','Hazaribagh','Giridih','Deoghar','Phusro','Adityapur','Medininagar','Chaibasa','Dumka','Godda','Pakur','Lohardaga','Gumla','Simdega','Khunti','Ramgarh','Latehar','Other'],
  'Chhattisgarh': ['Raipur','Bhilai','Korba','Bilaspur','Durg','Rajnandgaon','Jagdalpur','Ambikapur','Raigarh','Dhamtari','Kanker','Kondagaon','Narayanpur','Bastar','Bijapur','Sukma','Dantewada','Other'],
  'Assam': ['Guwahati','Silchar','Dibrugarh','Jorhat','Tezpur','Nagaon','Tinsukia','Lakhimpur','Bongaigaon','Sibsagar','Dhubri','Goalpara','Cachar','Hailakandi','Karimganj','Sonitpur','Kamrup','Darrang','Other'],
  'Uttarakhand': ['Dehradun','Haridwar','Roorkee','Haldwani','Rudrapur','Kashipur','Rishikesh','Pithoragarh','Nainital','Almora','Pauri','Tehri','Uttarkashi','Chamoli','Bageshwar','Champawat','Udham Singh Nagar','Other'],
  'Himachal Pradesh': ['Shimla','Mandi','Dharamshala','Solan','Kullu','Manali','Una','Hamirpur','Bilaspur','Chamba','Kinnaur','Lahaul & Spiti','Sirmaur','Kangra','Other'],
  'Jammu & Kashmir': ['Jammu','Srinagar','Anantnag','Baramulla','Udhampur','Kathua','Rajouri','Poonch','Doda','Kupwara','Pulwama','Sopore','Leh','Kargil','Other'],
  'Goa': ['Panaji','Margao','Vasco da Gama','Mapusa','Ponda','Bicholim','Sanquelim','Curchorem','Other'],
  'Other': ['My City Not Listed']
};

function updateCities(stateId, cityId) {
  const state = document.getElementById(stateId);
  const city = document.getElementById(cityId);
  if (!state || !city) return;
  const selectedState = state.value;
  if (!selectedState) {
    city.innerHTML = '<option value="">— Select State First —</option>';
    return;
  }
  const cities = STATE_CITIES[selectedState] || ['Other'];
  city.innerHTML = '<option value="">Select Your City</option>' +
    cities.map(c => `<option value="${c}">${c}</option>`).join('');
  // Style the city select to indicate it's populated
  city.style.borderColor = 'rgba(232,160,32,.5)';
  city.style.background = 'rgba(232,160,32,.06)';
  setTimeout(()=>{ city.style.borderColor=''; city.style.background=''; }, 1200);
}

// =====================================================
// COLLEGES SECTION
// =====================================================
function filterColleges(btn, type) {
  document.querySelectorAll('[onclick*="filterColleges"]').forEach(b => b.classList.remove('on'));
  btn.classList.add('on');
  document.querySelectorAll('.college-card').forEach(card => {
    if (type === 'all') {
      card.classList.remove('hidden');
    } else {
      card.classList.toggle('hidden', card.dataset.type !== type);
    }
  });
}

/* The enquiry modal.
   Rewritten for three faults, none of which any suite could see: it is
   built on click, so it never exists when the page is measured.

   1. Contrast. The two buttons filled with WhatsApp's own #25d366 and a
      #0d9488 teal, both carrying white text — 1.98:1 and 3.74:1 against a
      4.5 requirement. The phone numbers, which are the entire point of the
      modal, were the least readable thing in it. #0B7A55 measures 5.34:1
      and still reads as WhatsApp green; it is the same deepened green the
      contact bar already uses, for the same reason.
   2. The college name went into innerHTML unescaped. It comes from
      colleges.json today but the admin panel can write it through
      site_colleges, so a name containing markup would land in the DOM. CSP
      makes that a formatting bug rather than a scripting one — the node
      still should not be built that way.
   3. Emoji as iconography, and a font (Sora) the site does not load.

   Colours are CSS custom properties rather than hex so the modal follows
   the admin theme panel like everything else. */
function enquireCollege(collegeName) {
  const esc = (s) => String(s).replace(/[&<>"']/g, (c) =>
    ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

  const name = esc(collegeName);
  const msg = encodeURIComponent(
    `Hello, I would like to enquire about MBBS admission at ${collegeName} in Nepal.`);

  const WA = 'background:#0B7A55;color:#fff';
  const row = 'display:flex;align-items:center;gap:12px;padding:13px 16px;border-radius:10px;' +
              'text-decoration:none;font-weight:600;font-size:14px;margin-bottom:10px;';
  const sub = 'font-size:11px;font-weight:500;color:rgba(255,255,255,.85)';

  const modal = document.createElement('div');
  modal.style.cssText = 'position:fixed;inset:0;background:rgba(15,20,32,.55);backdrop-filter:blur(8px);' +
    'z-index:9999;display:flex;align-items:center;justify-content:center;padding:20px';
  modal.innerHTML =
    `<div role="dialog" aria-modal="true" aria-label="Enquire about ${name}" style="background:var(--m-fill-solid,#fff);border-radius:var(--r-md,16px);padding:26px;max-width:360px;width:100%;box-shadow:0 24px 64px rgba(15,20,32,.24)">
      <h3 style="font-family:var(--ty-body);font-size:16px;font-weight:600;color:var(--g-ink,#0F1420);margin:0 0 6px">Enquire about ${name}</h3>
      <p style="font-size:12px;color:var(--g-ink-3,#6D717C);margin:0 0 18px">Either number reaches the same counselling team on WhatsApp.</p>
      <a href="https://wa.me/917080800888?text=${msg}" target="_blank" rel="noopener" style="${row}${WA}">
        <div style="text-align:left"><div>+91 70808 00888</div><div style="${sub}">India</div></div>
      </a>
      <a href="https://wa.me/9779802769950?text=${msg}" target="_blank" rel="noopener" style="${row}${WA}">
        <div style="text-align:left"><div>+977 9802769950</div><div style="${sub}">Nepal</div></div>
      </a>
      <button data-act="click" data-do='[["closeModal","@el"]]' style="background:transparent;border:none;color:var(--g-ink-2,#4F5460);font-size:13px;cursor:pointer;text-decoration:underline;padding:6px 2px;margin-top:4px">Close</button>
    </div>`;
  modal.addEventListener('click', (e) => { if (e.target === modal) modal.remove(); });
  document.addEventListener('keydown', function onEsc(e) {
    if (e.key === 'Escape') { modal.remove(); document.removeEventListener('keydown', onEsc); }
  });
  document.body.appendChild(modal);
}
// =====================================================
// ADMIN PANEL — FULL SUPABASE CONTROL


/* The toast's Close button used to carry
     onclick="this.closest('[style*=fixed]').remove()"
   which a Content-Security-Policy without 'unsafe-inline' refuses to run.
   Same behaviour, reachable by name. */
function closeModal(el) {
  var m = el && el.closest('[style*=fixed]');
  if (m) m.remove();
}
