/* ============================================================
   Aviation Updates DG — News Site
   ============================================================
   CONFIG: Update AIRLINE_STATUS_URL with your Netlify site URL
   ============================================================ */

const CONFIG = {
  airlineStatusUrl: 'https://israelflightstatustlv.netlify.app/', // existing airline status site
  telegramUrl: 'https://t.me/AviationupdatesDG'
};

/* ── Category definitions ── */
const CATEGORIES = {
  civil:    { label: 'Civil Aviation', color: 'blue',    accent: '#3b82f6', badgeClass: 'badge-civil' },
  military: { label: 'Military',       color: 'purple',  accent: '#a855f7', badgeClass: 'badge-military' },
  security: { label: 'Security Alert', color: 'red',     accent: '#ef4444', badgeClass: 'badge-security' },
  status:   { label: 'Status Update',  color: 'green',   accent: '#22c55e', badgeClass: 'badge-status' },
  aviation: { label: 'Aviation',       color: 'cyan',    accent: '#06b6d4', badgeClass: 'badge-aviation' },
  memorial: { label: 'Memorial',       color: 'indigo',  accent: '#6366f1', badgeClass: 'badge-memorial' }
};

/* ── Hero gradient per category ── */
const HERO_GRADIENTS = {
  civil:    'linear-gradient(135deg, #0c1b40 0%, #0d2860 60%, #0c1b40 100%)',
  military: 'linear-gradient(135deg, #180b30 0%, #2d1060 60%, #180b30 100%)',
  security: 'linear-gradient(135deg, #2a0808 0%, #4c1010 60%, #2a0808 100%)',
  status:   'linear-gradient(135deg, #082a14 0%, #0d4a24 60%, #082a14 100%)',
  aviation: 'linear-gradient(135deg, #081e2e 0%, #0d3a52 60%, #081e2e 100%)',
  memorial: 'linear-gradient(135deg, #10103a 0%, #1e1e6a 60%, #10103a 100%)'
};

/* ── Posts data (newest first) ── */
const POSTS = [
  {
    id: 1,
    featured: true,
    breaking: true,
    category: 'civil',
    title: 'Argentina Set to Announce Historic Direct Tel Aviv–Buenos Aires Route',
    excerpt: 'President Javier Milei is expected to officially announce a new non-stop route between Tel Aviv Ben Gurion Airport and Buenos Aires on June 9, to be operated by Aerolíneas Argentinas — marking a significant expansion of South American aviation links to Israel.',
    date: '2026-04-29',
    displayDate: 'April 29, 2026',
    telegramUrl: CONFIG.telegramUrl
  },
  {
    id: 2,
    category: 'civil',
    title: 'Air France Extends Israel Flight Suspension Through May 11',
    excerpt: 'Air France has extended its suspension of all flights to and from Ben Gurion International Airport through May 11, 2026, citing ongoing regional security assessments. The carrier joins several European airlines that have pushed back resumption timelines.',
    date: '2026-04-25',
    displayDate: 'April 25, 2026',
    telegramUrl: CONFIG.telegramUrl
  },
  {
    id: 3,
    category: 'military',
    title: 'IDF Air Force Memorial Ceremony Honors 1,583 Fallen Pilots at Har Tayasim',
    excerpt: "Israel's Air Force held its central memorial ceremony at Har Tayasim, honoring the 1,583 members who have fallen in service since the IDF's founding. An F-16I Sufa performed a moving tribute flyover during the ceremony.",
    date: '2026-04-28',
    displayDate: 'April 28, 2026',
    telegramUrl: CONFIG.telegramUrl
  },
  {
    id: 4,
    category: 'military',
    title: 'Hezbollah Claims Downing of Israeli Hermes 450 UAV Over Southern Lebanon',
    excerpt: 'Hezbollah has announced the downing of an Israeli Hermes 450 unmanned aerial vehicle operating over southern Lebanon — the second drone loss reported in the region within days, amid escalating aerial activity along the northern border.',
    date: '2026-04-27',
    displayDate: 'April 27, 2026',
    telegramUrl: CONFIG.telegramUrl
  },
  {
    id: 5,
    category: 'military',
    title: 'USS George H.W. Bush Carrier Strike Group Enters CENTCOM Zone',
    excerpt: 'The USS George H.W. Bush aircraft carrier strike group has entered the U.S. Central Command area of operations in the Middle East, reinforcing American naval presence in the region amid heightened tensions.',
    date: '2026-04-27',
    displayDate: 'April 27, 2026',
    telegramUrl: CONFIG.telegramUrl
  },
  {
    id: 6,
    category: 'security',
    alert: true,
    title: 'ALERT: Fraudulent El Al Impersonation Campaign Actively Targeting Passengers',
    excerpt: 'Israeli aviation and consumer protection authorities have issued an urgent warning about a sophisticated scam campaign impersonating El Al Israel Airlines. Passengers are urged to verify all flight-related communications exclusively through official El Al channels.',
    date: '2026-04-26',
    displayDate: 'April 26, 2026',
    telegramUrl: CONFIG.telegramUrl
  },
  {
    id: 7,
    category: 'memorial',
    title: 'Memorial Day Aerial Display: IDF Completes Final Training Runs Over Jerusalem',
    excerpt: 'Israeli Air Force pilots completed final rehearsal sorties over Jerusalem ahead of Israel\'s Memorial Day aerial tribute ceremony. Documentation from the training flights was captured and shared by observers across the city.',
    date: '2026-04-28',
    displayDate: 'April 28, 2026',
    telegramUrl: CONFIG.telegramUrl
  },
  {
    id: 8,
    category: 'aviation',
    title: 'International Pilot Day 2026: Celebrating the Professionals Who Keep the Skies Connected',
    excerpt: 'The global aviation community marks International Pilot Day on April 26, honoring the professional aviators who keep the world connected through the skies. Aviation Updates DG salutes all pilots, military and civilian alike.',
    date: '2026-04-26',
    displayDate: 'April 26, 2026',
    telegramUrl: CONFIG.telegramUrl
  },
  {
    id: 9,
    category: 'status',
    title: 'Live Airline Status Dashboard Updated — Track Which Carriers Fly to Ben Gurion',
    excerpt: 'Our exclusive airline status tracker has been updated with the latest information on which carriers are flying, partially operating, or fully suspended on routes to Ben Gurion Airport (TLV). Data covers 100+ airlines in real time.',
    date: '2026-04-28',
    displayDate: 'April 28, 2026',
    isStatusLink: true,
    telegramUrl: CONFIG.airlineStatusUrl
  }
];

/* ============================================================
   UTILITIES
   ============================================================ */

function formatDate(isoDate) {
  const now = new Date();
  const d = new Date(isoDate);
  const diffMs = now - d;
  const diffH = Math.floor(diffMs / 3600000);
  const diffD = Math.floor(diffMs / 86400000);
  if (diffH < 1)  return 'Just now';
  if (diffH < 24) return `${diffH}h ago`;
  if (diffD === 1) return 'Yesterday';
  if (diffD < 7)  return `${diffD} days ago`;
  return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
}

function todayFormatted() {
  return new Date().toLocaleDateString('en-GB', {
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric'
  });
}

function getCat(key) {
  return CATEGORIES[key] || CATEGORIES.aviation;
}

function escape(str) {
  return str.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

/* ============================================================
   RENDER HERO
   ============================================================ */

function renderHero(post) {
  const cat = getCat(post.category);
  const gradient = HERO_GRADIENTS[post.category] || HERO_GRADIENTS.civil;
  const linkUrl = post.isStatusLink ? CONFIG.airlineStatusUrl : post.telegramUrl;
  const linkLabel = post.isStatusLink ? 'View Status Tracker →' : 'Read on Telegram →';

  const html = `
    <a class="hero-card" href="${escape(linkUrl)}" target="_blank" rel="noopener" aria-label="${escape(post.title)}">
      <div class="hero-bg" style="background:${gradient}"></div>
      <div class="hero-dots"></div>
      <div class="hero-plane-bg" aria-hidden="true">✈</div>
      <div class="hero-overlay"></div>
      <div class="hero-content">
        <div class="hero-badges">
          ${post.breaking ? '<span class="breaking-badge">Breaking News</span>' : ''}
          <span class="cat-badge" style="color:${cat.accent}; border-color:${cat.accent}40; background:${cat.accent}15;">
            ${cat.label}
          </span>
        </div>
        <h2 class="hero-title">${escape(post.title)}</h2>
        <p class="hero-excerpt">${escape(post.excerpt)}</p>
        <div class="hero-meta">
          <span class="hero-date">📅 ${post.displayDate}</span>
          <span class="hero-btn">
            ${linkLabel}
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" aria-hidden="true">
              <line x1="5" y1="12" x2="19" y2="12"/>
              <polyline points="12 5 19 12 12 19"/>
            </svg>
          </span>
        </div>
      </div>
    </a>`;

  document.getElementById('heroSection').innerHTML = html;
}

/* ============================================================
   RENDER NEWS CARDS
   ============================================================ */

function renderCard(post) {
  const cat = getCat(post.category);
  const linkUrl = post.isStatusLink ? CONFIG.airlineStatusUrl : post.telegramUrl;
  const linkLabel = post.isStatusLink ? 'Open tracker →' : 'Read on Telegram →';
  const timeAgo = formatDate(post.date);

  return `
    <article class="news-card" data-category="${escape(post.category)}" role="listitem">
      <div class="card-header">
        <span class="card-cat-badge ${cat.badgeClass}">${cat.label}</span>
        ${post.alert ? '<span class="card-alert">⚠ Alert</span>' : ''}
      </div>
      <div class="card-body">
        <h3 class="card-title">${escape(post.title)}</h3>
        <p class="card-excerpt">${escape(post.excerpt)}</p>
        <div class="card-footer">
          <span class="card-date" title="${post.displayDate}">${timeAgo}</span>
          <a href="${escape(linkUrl)}" target="_blank" rel="noopener" class="card-link" aria-label="${escape(post.title)} — ${linkLabel}">
            ${linkLabel}
            <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" aria-hidden="true">
              <line x1="5" y1="12" x2="19" y2="12"/>
              <polyline points="12 5 19 12 12 19"/>
            </svg>
          </a>
        </div>
      </div>
    </article>`;
}

function renderGrid(posts) {
  const grid = document.getElementById('newsGrid');
  const empty = document.getElementById('emptyState');
  if (!posts.length) {
    grid.innerHTML = '';
    empty.style.display = 'block';
    return;
  }
  empty.style.display = 'none';
  grid.innerHTML = posts.map(renderCard).join('');
}

/* ============================================================
   CATEGORY FILTER
   ============================================================ */

let activeFilter = 'all';

function filterPosts(category) {
  activeFilter = category;

  // Update tabs
  document.querySelectorAll('.nav-tab').forEach(btn => {
    const isActive = btn.dataset.filter === category;
    btn.classList.toggle('active', isActive);
    btn.setAttribute('aria-selected', isActive);
  });

  // Update section title
  const titleEl = document.getElementById('sectionTitle');
  if (category === 'all') {
    titleEl.textContent = 'Latest Updates';
  } else {
    titleEl.textContent = (CATEGORIES[category]?.label || category) + ' Updates';
  }

  // Filter posts (excluding featured)
  const nonFeatured = POSTS.filter(p => !p.featured);
  const filtered = category === 'all'
    ? nonFeatured
    : nonFeatured.filter(p => p.category === category);

  renderGrid(filtered);
}

// Expose for footer links
window.filterByCategory = function(cat) {
  filterPosts(cat);
  window.scrollTo({ top: 0, behavior: 'smooth' });
};

/* ============================================================
   TICKER
   ============================================================ */

function initTicker() {
  const tickerHeadlines = POSTS.map(p => p.title);
  const allItems = [...tickerHeadlines, ...tickerHeadlines]; // duplicate for seamless loop
  const html = allItems.map(h => `<span class="ticker-item">${escape(h)}</span>`).join('');
  document.getElementById('tickerTrack').innerHTML = html;
}

/* ============================================================
   STATUS LINKS
   ============================================================ */

function setStatusLinks() {
  const url = CONFIG.airlineStatusUrl;
  const ids = ['statusNavLink', 'statusCtaBtn', 'footerStatusLink'];
  ids.forEach(id => {
    const el = document.getElementById(id);
    if (el) el.href = url;
  });
}

/* ============================================================
   DATE IN TOP BAR
   ============================================================ */

function setTodayDate() {
  const el = document.getElementById('todayDate');
  if (el) el.textContent = todayFormatted().toUpperCase();
}

/* ============================================================
   NAV TAB CLICK HANDLERS
   ============================================================ */

function initNavTabs() {
  document.querySelectorAll('.nav-tab').forEach(btn => {
    btn.addEventListener('click', () => filterPosts(btn.dataset.filter));
  });
}

/* ============================================================
   INIT
   ============================================================ */

document.addEventListener('DOMContentLoaded', () => {
  setTodayDate();
  setStatusLinks();
  initTicker();

  // Render featured hero (first post with featured: true)
  const featured = POSTS.find(p => p.featured);
  if (featured) renderHero(featured);

  // Render grid (non-featured posts)
  filterPosts('all');

  initNavTabs();
});
