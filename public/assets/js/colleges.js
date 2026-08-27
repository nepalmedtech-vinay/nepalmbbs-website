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
  renderCollegeContent(college);
}

function renderCollegeContent(college) {
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
    renderNoVideoState(college, vidContainer);
  }
}

function renderNoVideoState(college, container) {
  if (!container) return;
  const label = document.querySelector('.college-tab[onclick*="\'' + college + '\'"]');
  const name = (label && label.textContent.trim()) || 'this college';
  const el = document.createElement('div');
  el.className = 'doc-empty';
  const title = document.createElement('p');
  title.className = 'doc-empty-title';
  title.textContent = 'No video for ' + name + ' yet';
  const body = document.createElement('p');
  body.className = 'doc-empty-body';
  body.textContent = 'We publish footage only when we have filmed it ourselves or the '
    + 'college has supplied it. Ask us and we will tell you what we have on '
    + name + ' — including what we do not.';
  el.append(title, body);
  container.replaceChildren(el);
}

function renderVideoGrid(videos, container) {
  if (!container) return;
  const grid = document.createElement('div');
  grid.className = 'vid-grid';
  videos.forEach(v => {
    let embedUrl = v.url;
    let thumbUrl = '';
    const ytMatch = v.url.match(/(?:youtube(?:-nocookie)?\.com\/embed\/|youtu\.be\/)([a-zA-Z0-9_-]{11})/);
    if (ytMatch) {
      embedUrl = `https://www.youtube-nocookie.com/embed/${ytMatch[1]}?rel=0`;
      thumbUrl = `https://img.youtube.com/vi/${ytMatch[1]}/hqdefault.jpg`;
    }
    const card = document.createElement('div');
    card.className = 'vid-card';
    card.innerHTML = thumbUrl
      ? `<div class="vid-thumb"><div class="vid-placeholder" ${actAttr('click',[['playVid','@el',embedUrl]])}><img src="${thumbUrl}" style="position:absolute;inset:0;width:100%;height:100%;object-fit:cover" loading="lazy"><div style="position:absolute;inset:0;background:rgba(0,0,0,.35)"></div><div class="play-btn" style="position:relative;z-index:1">▶</div></div></div><div class="vid-info"><h4>${v.title}</h4><p>${v.description||''}</p></div>`
      : `<div class="vid-thumb"><iframe src="${embedUrl}" loading="lazy" allowfullscreen style="position:absolute;inset:0;width:100%;height:100%;border:none"></iframe></div><div class="vid-info"><h4>${v.title}</h4><p>${v.description||''}</p></div>`;
    grid.appendChild(card);
  });
  container.innerHTML = '';
  container.appendChild(grid);
}

function playVid(el, url) {
  el.innerHTML = `<iframe src="${url}?autoplay=1" style="position:absolute;inset:0;width:100%;height:100%;border:none" allowfullscreen></iframe>`;
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
    // Show "all" by default
    renderCollegeContent('all');
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

function enquireCollege(collegeName) {
  const msg = encodeURIComponent(`Hello! I want to enquire about MBBS admission at ${collegeName} in Nepal. Please guide me.`);
  // Show a mini modal to let user pick number
  const modal = document.createElement('div');
  modal.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,.6);backdrop-filter:blur(8px);z-index:9999;display:flex;align-items:center;justify-content:center;padding:20px';
  modal.innerHTML = `<div style="background:#fff;border-radius:20px;padding:28px;max-width:340px;width:100%;box-shadow:0 24px 64px rgba(0,0,0,.3);text-align:center">
    <div style="font-size:28px;margin-bottom:8px">💬</div>
    <h3 style="font-family:Sora,sans-serif;font-size:17px;font-weight:700;color:#0e2347;margin-bottom:4px">Enquire about ${collegeName}</h3>
    <p style="font-size:12px;color:#64748b;margin-bottom:20px">WhatsApp available on both numbers</p>
    <a href="https://wa.me/917080800888?text=${msg}" target="_blank" rel="noopener" style="display:flex;align-items:center;gap:10px;padding:12px 16px;background:#25d366;color:#fff;border-radius:10px;text-decoration:none;font-weight:700;font-size:14px;margin-bottom:10px">
      <span style="font-size:20px">📱</span><div style="text-align:left"><div>+91 70808 00888</div><div style="font-size:11px;opacity:.8;font-weight:500">India • WhatsApp</div></div>
    </a>
    <a href="https://wa.me/9779802769950?text=${msg}" target="_blank" rel="noopener" style="display:flex;align-items:center;gap:10px;padding:12px 16px;background:#0d9488;color:#fff;border-radius:10px;text-decoration:none;font-weight:700;font-size:14px;margin-bottom:16px">
      <span style="font-size:20px">📞</span><div style="text-align:left"><div>+977-9802769950</div><div style="font-size:11px;opacity:.8;font-weight:500">Nepal • WhatsApp</div></div>
    </a>
    <button data-act="click" data-do='[["closeModal","@el"]]' style="background:transparent;border:none;color:#64748b;font-size:13px;cursor:pointer;text-decoration:underline">Close</button>
  </div>`;
  modal.addEventListener('click', (e) => { if(e.target === modal) modal.remove(); });
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
