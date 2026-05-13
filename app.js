// ============= Live clock (MSK / KST) =============
function pad(n) { return String(n).padStart(2, '0'); }
function fmtDate(d) {
  const months = ['янв', 'фев', 'мар', 'апр', 'мая', 'июн', 'июл', 'авг', 'сен', 'окт', 'ноя', 'дек'];
  return `${d.getDate()} ${months[d.getMonth()]}, ${['вс','пн','вт','ср','чт','пт','сб'][d.getDay()]}`;
}
function updateClocks() {
  const mskEl = document.querySelector('[data-tz="msk"]');
  const kstEl = document.querySelector('[data-tz="kst"]');
  if (!mskEl || !kstEl) return;
  const now = new Date();
  const utc = now.getTime() + now.getTimezoneOffset() * 60000;
  const msk = new Date(utc + 3 * 3600000);
  const kst = new Date(utc + 9 * 3600000);
  mskEl.textContent = `${pad(msk.getHours())}:${pad(msk.getMinutes())}`;
  kstEl.textContent = `${pad(kst.getHours())}:${pad(kst.getMinutes())}`;
  const mskD = document.querySelector('[data-tz-date="msk"]');
  const kstD = document.querySelector('[data-tz-date="kst"]');
  if (mskD) mskD.textContent = fmtDate(msk);
  if (kstD) kstD.textContent = fmtDate(kst);
}
updateClocks();
setInterval(updateClocks, 30000);

// ============= Highlight today's day card / tile =============
(function highlightToday() {
  const now = new Date();
  const utc = now.getTime() + now.getTimezoneOffset() * 60000;
  const kst = new Date(utc + 9 * 3600000);
  const todayStr = `${kst.getFullYear()}-${pad(kst.getMonth()+1)}-${pad(kst.getDate())}`;
  document.querySelectorAll('[data-date]').forEach(el => {
    if (el.dataset.date === todayStr) el.classList.add('today');
  });
})();

// ============= Day route builder + per-stop directions upgrade =============
(function buildDayRoutes() {
  const COORD_RE = /[?&]q=([-\d.]+),([-\d.]+)/;
  function pluralStops(n) {
    const r10 = n % 10, r100 = n % 100;
    if (r10 === 1 && r100 !== 11) return 'точка';
    if (r10 >= 2 && r10 <= 4 && (r100 < 10 || r100 >= 20)) return 'точки';
    return 'точек';
  }
  document.querySelectorAll('.day').forEach(day => {
    const stops = [];
    day.querySelectorAll('.map-btn').forEach(a => {
      const m = a.getAttribute('href').match(COORD_RE);
      if (!m) return;
      const lat = m[1], lng = m[2];
      const name = (a.previousElementSibling && a.previousElementSibling.classList.contains('place'))
        ? a.previousElementSibling.textContent.replace(/[.,;:]\s*$/, '').trim()
        : '';
      stops.push({ lat, lng, name });
      a.setAttribute('href',
        `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}&travelmode=driving`);
      a.setAttribute('rel', 'noopener');
      a.setAttribute('aria-label', `Открыть маршрут к ${name || 'точке'} в Google Maps`);
    });
    if (stops.length < 2) return;
    const origin = `${stops[0].lat},${stops[0].lng}`;
    const dest = `${stops[stops.length - 1].lat},${stops[stops.length - 1].lng}`;
    const wp = stops.slice(1, -1).map(s => `${s.lat},${s.lng}`).join('|');
    const url =
      `https://www.google.com/maps/dir/?api=1&origin=${origin}&destination=${dest}` +
      (wp ? `&waypoints=${encodeURIComponent(wp)}` : '') +
      `&travelmode=driving`;
    const cta = document.createElement('a');
    cta.className = 'day-route';
    cta.href = url;
    cta.target = '_blank';
    cta.rel = 'noopener';
    cta.setAttribute('aria-label', `Открыть маршрут всего дня (${stops.length} точек) в Google Maps`);
    cta.innerHTML = `
      <span class="pin" aria-hidden="true">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <path d="M3 7l6-3 6 3 6-3v13l-6 3-6-3-6 3z"/>
          <line x1="9" y1="4" x2="9" y2="17"/>
          <line x1="15" y1="7" x2="15" y2="20"/>
        </svg>
      </span>
      <span class="body">
        <span class="title">Маршрут дня · ${stops.length} ${pluralStops(stops.length)}</span>
        <span class="sub">Открыть в Google Maps · навигация</span>
      </span>
      <span class="arrow" aria-hidden="true">→</span>`;
    const subtitle = day.querySelector('.day-subtitle');
    const title = day.querySelector('.day-title');
    const anchor = subtitle || title;
    if (anchor) anchor.insertAdjacentElement('afterend', cta);
    else day.querySelector('.day-header').insertAdjacentElement('afterend', cta);
  });
})();

// ============= Reveal on scroll =============
(function revealOnScroll() {
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const targets = document.querySelectorAll(
    '.day, .day-tile, .rest-card, .info-card, .food-item, .link-card, .tz, .work-window, .check-progress, .section-head, .guide-section, .app-card, .phrase, .emergency, .callout, .rest-group'
  );
  targets.forEach(el => el.classList.add('reveal'));
  if (reduced || !('IntersectionObserver' in window)) {
    targets.forEach(el => el.classList.add('in-view'));
    return;
  }
  const io = new IntersectionObserver((entries) => {
    entries.forEach(e => {
      if (e.isIntersecting) {
        e.target.classList.add('in-view');
        io.unobserve(e.target);
      }
    });
  }, { rootMargin: '0px 0px -8% 0px', threshold: 0.08 });
  targets.forEach(el => io.observe(el));
})();

// ============= Scroll progress bar =============
(function scrollProgress() {
  const bar = document.getElementById('scroll-progress-bar');
  if (!bar) return;
  let ticking = false;
  function update() {
    const h = document.documentElement;
    const scrolled = h.scrollTop || document.body.scrollTop;
    const max = (h.scrollHeight - h.clientHeight) || 1;
    bar.style.width = Math.min(100, (scrolled / max) * 100) + '%';
    ticking = false;
  }
  window.addEventListener('scroll', () => {
    if (!ticking) { requestAnimationFrame(update); ticking = true; }
  }, { passive: true });
  update();
})();

// ============= Active nav link based on visible section =============
(function activeNav() {
  const links = Array.from(document.querySelectorAll('.topnav a.navlink'));
  if (!links.length) return;
  const map = new Map();
  links.forEach(l => {
    const href = l.getAttribute('href') || '';
    if (!href.startsWith('#')) return;
    const id = href.slice(1);
    const sec = document.getElementById(id);
    if (sec) map.set(sec, l);
  });
  if (!map.size || !('IntersectionObserver' in window)) return;
  const io = new IntersectionObserver((entries) => {
    entries.forEach(e => {
      const link = map.get(e.target);
      if (!link) return;
      if (e.isIntersecting) {
        links.forEach(l => l.classList.remove('active'));
        link.classList.add('active');
      }
    });
  }, { rootMargin: '-40% 0px -55% 0px', threshold: 0 });
  map.forEach((_link, sec) => io.observe(sec));
})();

// ============= Checklist + localStorage =============
(function checklist() {
  const STORAGE_KEY = 'jeju-trip-checks-v1';
  const boxes = document.querySelectorAll('.checklist input[type="checkbox"]');
  if (!boxes.length) return;
  function load() {
    try { return JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}'); } catch { return {}; }
  }
  function save(state) { localStorage.setItem(STORAGE_KEY, JSON.stringify(state)); }
  function progress() {
    const total = boxes.length;
    const done = Array.from(boxes).filter(b => b.checked).length;
    const cEl = document.getElementById('check-count');
    const bEl = document.getElementById('bar-fill');
    if (cEl) cEl.textContent = `${done}/${total}`;
    if (bEl) bEl.style.width = `${(done/total)*100}%`;
  }
  const state = load();
  boxes.forEach(box => {
    const key = box.dataset.key;
    if (state[key]) box.checked = true;
    box.addEventListener('change', () => {
      state[key] = box.checked;
      save(state);
      progress();
    });
  });
  progress();
})();

// ============= Restaurants filter =============
(function restFilter() {
  const buttons = document.querySelectorAll('.rest-filter button[data-filter]');
  if (!buttons.length) return;
  const cards = document.querySelectorAll('.rest-card');
  buttons.forEach(btn => {
    btn.addEventListener('click', () => {
      buttons.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      const f = btn.dataset.filter;
      cards.forEach(card => {
        const tags = (card.dataset.tags || '').split(/\s+/);
        const hidden = f !== 'all' && !tags.includes(f);
        card.hidden = hidden;
      });
      // Re-trigger reveal for now-visible cards in viewport
      cards.forEach(c => { if (!c.hidden) c.classList.add('in-view'); });
    });
  });
})();

// ============= Wikipedia image hydration =============
// Fetches the lead image of a Wikipedia article and inserts it as an <img>
// inside any element matching the article's selector. Cached in sessionStorage
// to avoid re-hitting the API on navigation between pages.
//
// Usage in HTML:
//   <div class="thumb-slot" data-wiki="Seongsan_Ilchulbong"></div>
//   <a class="day-tile" data-wiki="Hallasan">...</a>
//   <article class="rest-card" data-wiki="Korean_black_pig">...</article>
//
// For elements with class .day-tile / .rest-card the image is set as a
// background on a generated .tile-thumb / .rest-thumb child. For .thumb-slot
// the image is inserted as an <img> child.
//
// Coord → wiki lookup: timeline stops have only lat/lng in their map links.
// We map known coordinates to Wikipedia articles and hydrate thumbnails
// inside the .t-body of each matching timeline entry.

const COORD_TO_WIKI = {
  '33.5113,126.4929': 'Jeju_International_Airport',
  '33.247,126.5621':  'Seogwipo',
  '33.2469,126.5589': 'Cheonjiyeon_Falls',
  '33.2424,126.5587': 'Saeyeon_Bridge',
  '33.241,126.5599':  'Saeseom',
  '33.2497,126.5650': 'Black_pig',
  '33.3613,126.5326': 'Hallasan_National_Park',
  '33.3589,126.5419': 'Hallasan',
  '33.4591,126.9396': 'Seongsan_Ilchulbong',
  '33.5066,126.9534': 'Udo,_Jeju',
  '33.4257,126.9286': 'Seopjikoji',
  '33.5436,126.6701': 'Hamdeok_Beach',
  '33.4314,126.6519': 'Saryeoni_Forest',
  '33.2876,126.2898': "O'Sulloc_Tea_Museum",
  '33.4602,126.3081': 'Aewol-eup',
  '33.394,126.24':    'Hyeopjae_Beach',
  '33.388,126.2606':  'Hallim_Park',
  '33.1991,126.295':  'Songaksan',
  '33.2375,126.4225': 'Jusangjeolli_Cliff',
  '33.2444,126.4106': 'Jungmun_Beach',
  '33.2362,126.3137': 'Sanbangsan',
  '33.2317,126.3119': 'Yongmeori_Coast',
};

const WIKI_CACHE_KEY = 'jeju-trip-wiki-thumbs-v1';
function wikiLoadCache() {
  try { return JSON.parse(sessionStorage.getItem(WIKI_CACHE_KEY) || '{}'); }
  catch { return {}; }
}
function wikiSaveCache(c) {
  try { sessionStorage.setItem(WIKI_CACHE_KEY, JSON.stringify(c)); } catch {}
}

// Convert a Wikimedia /thumb/ URL to the direct full-size file URL.
// /thumb/A/AB/File.jpg/1000px-File.jpg → /A/AB/File.jpg
// Direct URLs load reliably without redirect chains in all environments.
function thumbToDirect(url) {
  if (!url) return url;
  const m = url.match(/^(https:\/\/upload\.wikimedia\.org\/wikipedia\/[^/]+)\/thumb\/([0-9a-f]\/[0-9a-f]{2}\/.+?)\/\d+px-[^/]+$/);
  return m ? `${m[1]}/${m[2]}` : url;
}

async function fetchWikiThumb(title, lang) {
  lang = lang || 'en';
  const cache = wikiLoadCache();
  const key = lang + ':' + title;
  if (key in cache) return cache[key];
  try {
    const url = `https://${lang}.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(title)}`;
    const r = await fetch(url, { headers: { 'Accept': 'application/json' } });
    if (!r.ok) {
      cache[key] = null; wikiSaveCache(cache);
      return null;
    }
    const data = await r.json();
    let src = (data.originalimage && data.originalimage.source) || (data.thumbnail && data.thumbnail.source) || null;
    // Convert /thumb/ redirect URL to a direct file URL for reliable loading
    // in all environments (browsers, testing tools, headless contexts).
    if (src) src = thumbToDirect(src);
    cache[key] = src;
    wikiSaveCache(cache);
    return src;
  } catch {
    return null;
  }
}

async function fetchWikiThumbWithFallback(title) {
  // Hardcoded overrides for articles that return logos or low-quality images.
  // All URLs are direct Wikimedia Commons file URLs (no /thumb/ redirects).
  const IMAGE_OVERRIDE = {
    // O'Sulloc Wikipedia article returns a corporate interior shot; show west-Jeju coastal scenery instead.
    "O'Sulloc_Tea_Museum": 'https://upload.wikimedia.org/wikipedia/commons/c/ce/Jeju_Olle_Route_14_%282%29.jpg',
    // Airport article image varies; use a confirmed 2024 exterior photo.
    'Jeju_International_Airport': 'https://upload.wikimedia.org/wikipedia/commons/d/dd/Jejuairport2024.jpg',
  };
  if (IMAGE_OVERRIDE[title]) return IMAGE_OVERRIDE[title];

  // Try English first, fall back to Korean Wikipedia.
  const KR_FALLBACK = {
    'Saeyeon_Bridge': '새연교',
    'Saeseom': '새섬',
    'Saryeoni_Forest': '사려니숲길',
    'Aewol-eup': '애월읍',
    'Hyeopjae_Beach': '협재해수욕장',
    'Songaksan': '송악산',
    'Yongmeori_Coast': '용머리해안',
    'Jungmun_Beach': '중문해수욕장',
    'Hamdeok_Beach': '함덕해수욕장',
    'Hallim_Park': '한림공원',
    "O'Sulloc_Tea_Museum": '오설록',
    'Black_pig': '흑돼지',
    'Jusangjeolli_Cliff': '주상절리',
    'Udo,_Jeju': '우도면',
    'Cheonjiyeon_Falls': '천지연폭포',
    'Seopjikoji': '섭지코지',
    'Hotteok': '호떡',
    'Hallasan_National_Park': '한라산',
    'Jeju_International_Airport': '제주국제공항',
    'Seogwipo': '서귀포시',
    'Jeju_City': '제주시',
    'Sanbangsan': '산방산',
  };
  let src = await fetchWikiThumb(title, 'en');
  if (src) return src;
  const krTitle = KR_FALLBACK[title];
  if (krTitle) {
    src = await fetchWikiThumb(krTitle, 'ko');
    if (src) return src;
  }
  return null;
}

(function hydrateWikipediaImages() {
  // Day tiles: prepend a tile-thumb div with background image
  document.querySelectorAll('.day-tile[data-wiki]').forEach(async (tile) => {
    const title = tile.dataset.wiki;
    if (!title) return;
    const src = await fetchWikiThumbWithFallback(title);
    if (!src) return;
    const thumb = document.createElement('div');
    thumb.className = 'tile-thumb';
    thumb.style.backgroundImage = `url("${src}")`;
    tile.insertBefore(thumb, tile.firstChild);
    tile.classList.add('has-thumb');
  });

  // Restaurant cards: prepend a rest-thumb div with background image
  document.querySelectorAll('.rest-card[data-wiki]').forEach(async (card) => {
    const title = card.dataset.wiki;
    if (!title) return;
    const src = await fetchWikiThumbWithFallback(title);
    if (!src) return;
    const thumb = document.createElement('div');
    thumb.className = 'rest-thumb';
    thumb.style.backgroundImage = `url("${src}")`;
    card.insertBefore(thumb, card.firstChild);
    card.classList.add('has-thumb');
  });

  // Atlas spreads: inline image element
  document.querySelectorAll('[data-wiki-thumb]').forEach(async (slot) => {
    const title = slot.dataset.wikiThumb;
    if (!title) return;
    const src = await fetchWikiThumbWithFallback(title);
    if (!src) {
      slot.classList.add('thumb-missing');
      return;
    }
    const img = document.createElement('img');
    img.src = src;
    img.alt = title.replace(/_/g, ' ');
    img.loading = 'lazy';
    img.decoding = 'async';
    slot.appendChild(img);
    slot.classList.add('thumb-loaded');
  });

  // Day timeline: for each .map-btn with known coords, insert a thumb
  // into the parent .t-body so each stop gets an inline image accent.
  const COORD_RE = /[?&](?:q|destination)=([-\d.]+),([-\d.]+)/;
  document.querySelectorAll('.timeline > li').forEach(async (li) => {
    const btn = li.querySelector('.map-btn');
    if (!btn) return;
    const m = btn.getAttribute('href').match(COORD_RE);
    if (!m) return;
    const key = `${m[1]},${m[2]}`;
    const title = COORD_TO_WIKI[key];
    if (!title) return;
    const src = await fetchWikiThumbWithFallback(title);
    if (!src) return;
    const body = li.querySelector('.t-body');
    if (!body || body.querySelector('.t-thumb')) return;
    const thumb = document.createElement('a');
    thumb.className = 't-thumb';
    thumb.href = btn.getAttribute('href');
    thumb.target = '_blank';
    thumb.rel = 'noopener';
    thumb.setAttribute('aria-label', `Открыть ${title.replace(/_/g, ' ')} в Maps`);
    const img = document.createElement('img');
    img.src = src;
    img.alt = title.replace(/_/g, ' ');
    img.loading = 'lazy';
    img.decoding = 'async';
    thumb.appendChild(img);
    body.appendChild(thumb);
    li.classList.add('has-thumb');
  });
})();

// ============= Korean phrase: copy to clipboard =============
(function phraseCopy() {
  const buttons = document.querySelectorAll('.phrase button.copy');
  buttons.forEach(btn => {
    btn.addEventListener('click', async () => {
      const phrase = btn.closest('.phrase');
      const kr = phrase.querySelector('.kr')?.textContent || '';
      try {
        await navigator.clipboard.writeText(kr);
        const orig = btn.textContent;
        btn.textContent = 'Скопировано';
        btn.classList.add('copied');
        setTimeout(() => {
          btn.textContent = orig;
          btn.classList.remove('copied');
        }, 1200);
      } catch (err) {
        btn.textContent = 'Ошибка';
        setTimeout(() => { btn.textContent = 'Копировать'; }, 1200);
      }
    });
  });
})();
