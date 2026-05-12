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
