/* ============================================================
   Aviation Updates DG — News Site
   ============================================================
   CONFIG: Update AIRLINE_STATUS_URL with your Netlify site URL
           Update BACKEND_URL with your Railway backend URL
   ============================================================ */

const CONFIG = {
  airlineStatusUrl: 'tracker/', // airline status tracker
  telegramUrl: 'https://t.me/AviationupdatesDG',
  backendUrl: 'https://israelflightstatus.onrender.com'
};

/* ── Category definitions ── */
const CATEGORIES = {
  civil:    { label: 'תעופה אזרחית',   color: 'blue',   accent: '#3b82f6', badgeClass: 'badge-civil' },
  military: { label: 'תעופה צבאית',    color: 'purple', accent: '#a855f7', badgeClass: 'badge-military' },
  security: { label: 'תעופה צבאית',    color: 'purple', accent: '#a855f7', badgeClass: 'badge-military' },
  status:   { label: 'עדכון סטטוס',    color: 'green',  accent: '#22c55e', badgeClass: 'badge-status' },
  aviation: { label: 'תעופה',          color: 'cyan',   accent: '#06b6d4', badgeClass: 'badge-aviation' },
  memorial: { label: 'יום זיכרון',     color: 'indigo', accent: '#6366f1', badgeClass: 'badge-memorial' }
};

/* ── Hero gradient per category ── */
const HERO_GRADIENTS = {
  civil:    'linear-gradient(135deg, #0c1b40 0%, #0d2860 60%, #0c1b40 100%)',
  military: 'linear-gradient(135deg, #180b30 0%, #2d1060 60%, #180b30 100%)',
  security: 'linear-gradient(135deg, #180b30 0%, #2d1060 60%, #180b30 100%)',
  status:   'linear-gradient(135deg, #082a14 0%, #0d4a24 60%, #082a14 100%)',
  aviation: 'linear-gradient(135deg, #081e2e 0%, #0d3a52 60%, #081e2e 100%)',
  memorial: 'linear-gradient(135deg, #10103a 0%, #1e1e6a 60%, #10103a 100%)'
};

/* ── In-memory posts array, populated from backend ── */
let POSTS = [];

/* ============================================================
   UTILITIES
   ============================================================ */

function formatDate(isoDate) {
  const now = new Date();
  const d = new Date(isoDate);
  const diffMs = now - d;
  const diffH = Math.floor(diffMs / 3600000);
  const diffD = Math.floor(diffMs / 86400000);
  if (diffH < 1)  return 'עכשיו';
  if (diffH < 24) return `לפני ${diffH} שעות`;
  if (diffD === 1) return 'אתמול';
  if (diffD < 7)  return `לפני ${diffD} ימים`;
  return d.toLocaleDateString('he-IL', { day: 'numeric', month: 'short', year: 'numeric' });
}

function todayFormatted() {
  return new Date().toLocaleDateString('he-IL', {
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

  // Build background — photo if available, otherwise gradient
  let bgStyle;
  let creditHtml = '';
  if (post.photoFileId) {
    const imgUrl = `${CONFIG.backendUrl}/api/news/image/${encodeURIComponent(post.photoFileId)}`;
    bgStyle = `background: ${gradient}; background-image: url('${imgUrl}'); background-size: cover; background-position: center;`;
    if (post.photoCredit) {
      creditHtml = `<span class="hero-photo-credit">📷 ${escape(post.photoCredit)}</span>`;
    }
  } else {
    bgStyle = `background:${gradient}`;
  }

  const html = `
    <div class="hero-card" aria-label="${escape(post.title)}" onclick="openPostModal(${post.id})" style="cursor:pointer;">
      <div class="hero-bg" style="${bgStyle}"></div>
      <div class="hero-dots"></div>
      <div class="hero-plane-bg" aria-hidden="true">✈</div>
      <div class="hero-overlay"></div>
      <div class="hero-content">
        <div class="hero-badges">
          ${post.breaking ? '<span class="breaking-badge">מבזק</span>' : ''}
          <span class="cat-badge" style="color:${cat.accent}; border-color:${cat.accent}40; background:${cat.accent}15;">
            ${cat.label}
          </span>
        </div>
        <h2 class="hero-title">${escape(post.title)}</h2>
        <p class="hero-excerpt">${escape(post.excerpt)}</p>
        <div class="hero-meta">
          <span class="hero-date">📅 ${post.displayDate}</span>
        </div>
      </div>
      ${creditHtml}
    </div>`;

  document.getElementById('heroSection').innerHTML = html;
}

/* ============================================================
   RENDER NEWS CARDS
   ============================================================ */

function renderCard(post) {
  const cat = getCat(post.category);
  const timeAgo = formatDate(post.date);

  const photoHtml = post.photoFileId ? `
    <div class="card-photo">
      <img src="${CONFIG.backendUrl}/api/news/image/${encodeURIComponent(post.photoFileId)}" alt="${escape(post.title)}" loading="lazy" />
      ${post.hasVideo ? '<span class="card-video-badge">▶ סרטון</span>' : ''}
      ${post.photoCredit ? `<span class="card-photo-credit">📷 ${escape(post.photoCredit)}</span>` : ''}
    </div>` : `<div class="card-no-photo">✈</div>`;

  return `
    <article class="news-card" data-category="${escape(post.category)}" role="listitem" onclick="openPostModal(${post.id})">
      ${photoHtml}
      <div class="card-header">
        <span class="card-cat-badge ${cat.badgeClass}">${cat.label}</span>
        ${post.breaking ? '<span class="card-alert">🚨 מבזק</span>' : ''}
      </div>
      <div class="card-body">
        <h3 class="card-title">${escape(post.title)}</h3>
        <p class="card-excerpt">${escape(post.excerpt)}</p>
        <div class="card-footer">
          <span class="card-date" title="${post.displayDate}">${timeAgo}</span>
          <button class="card-tg-btn" onclick="event.stopPropagation(); openPostModal(${post.id})">לכתבה המלאה</button>
        </div>
      </div>
    </article>`;
}

/* ============================================================
   POST DETAIL MODAL
   ============================================================ */

function openPostModal(id) {
  const post = POSTS.find(p => p.id === id);
  if (!post) return;

  const cat = getCat(post.category);

  // Video player (takes priority over photo)
  const videoEl = document.getElementById('modalVideo');
  const videoPlayer = document.getElementById('modalVideoPlayer');
  const imgEl = document.getElementById('modalImg');

  if (post.videoFileId) {
    videoPlayer.src = `${CONFIG.backendUrl}/api/news/video/${encodeURIComponent(post.videoFileId)}`;
    videoEl.style.display = 'block';
    imgEl.style.display = 'none';
    imgEl.innerHTML = '';
  } else if (post.photoFileId) {
    videoEl.style.display = 'none';
    videoPlayer.src = '';
    const src = `${CONFIG.backendUrl}/api/news/image/${encodeURIComponent(post.photoFileId)}`;
    imgEl.innerHTML = `<img src="${src}" alt="${escape(post.title)}" />`;
    imgEl.style.display = 'block';
  } else {
    videoEl.style.display = 'none';
    videoPlayer.src = '';
    imgEl.style.display = 'none';
    imgEl.innerHTML = '';
  }

  // Badges
  document.getElementById('modalBadges').innerHTML = `
    ${post.breaking ? '<span class="breaking-badge">מבזק</span>' : ''}
    <span class="cat-badge" style="color:${cat.accent};border-color:${cat.accent}40;background:${cat.accent}15;">${cat.label}</span>`;

  document.getElementById('modalTitle').textContent = post.title;
  document.getElementById('modalDate').textContent = '📅 ' + post.displayDate;
  document.getElementById('modalText').textContent = post.excerpt || post.fullText;

  const creditEl = document.getElementById('modalCredit');
  if (post.photoCredit) {
    creditEl.textContent = '📷 ' + post.photoCredit;
    creditEl.style.display = 'block';
  } else {
    creditEl.style.display = 'none';
  }

  const videoBtnEl = document.getElementById('modalVideoBtn');
  if (post.hasVideo && post.telegramUrl) {
    videoBtnEl.href = post.telegramUrl;
    videoBtnEl.style.display = 'inline-flex';
  } else {
    videoBtnEl.style.display = 'none';
  }

  const modal = document.getElementById('postModal');
  modal.style.display = 'flex';
  document.body.style.overflow = 'hidden';
}

function closePostModal(e) {
  if (e && e.target !== document.getElementById('postModal') && !e.target.classList.contains('post-modal-close')) return;
  const vp = document.getElementById('modalVideoPlayer');
  if (vp) { vp.pause(); vp.src = ''; }
  document.getElementById('postModal').style.display = 'none';
  document.body.style.overflow = '';
}

document.addEventListener('keydown', e => { if (e.key === 'Escape') { const vp = document.getElementById('modalVideoPlayer'); if (vp) { vp.pause(); vp.src = ''; } document.getElementById('postModal').style.display = 'none'; document.body.style.overflow = ''; } });

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
    titleEl.textContent = 'עדכונים אחרונים';
  } else {
    titleEl.textContent = (CATEGORIES[category]?.label || category) + ' — עדכונים';
  }

  // Filter posts (excluding featured)
  // 'military' tab shows both military and security posts (unified as "תעופה צבאית")
  const nonFeatured = POSTS.filter(p => !p.featured);
  const filtered = category === 'all'
    ? nonFeatured
    : category === 'military'
      ? nonFeatured.filter(p => p.category === 'military' || p.category === 'security')
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

function initTicker(posts) {
  const tickerHeadlines = posts.map(p => p.title);
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
   LOADING / ERROR STATES
   ============================================================ */

function showLoading() {
  const heroSection = document.getElementById('heroSection');
  const newsGrid = document.getElementById('newsGrid');
  if (heroSection) {
    heroSection.innerHTML = `
      <div class="hero-card" style="display:flex;align-items:center;justify-content:center;min-height:340px;">
        <div style="text-align:center;color:rgba(255,255,255,0.6);">
          <div class="loading-spinner" style="margin:0 auto 16px;"></div>
          <p>טוען עדכונים...</p>
        </div>
      </div>`;
  }
  if (newsGrid) {
    newsGrid.innerHTML = `
      <div style="grid-column:1/-1;text-align:center;padding:48px 0;color:rgba(255,255,255,0.5);">
        <div class="loading-spinner" style="margin:0 auto 16px;"></div>
        <p>טוען כתבות...</p>
      </div>`;
  }
}

function showError(message) {
  const heroSection = document.getElementById('heroSection');
  const newsGrid = document.getElementById('newsGrid');
  const errHtml = `
    <div style="text-align:center;padding:48px 24px;color:rgba(255,255,255,0.6);">
      <p style="font-size:2rem;margin-bottom:12px;">⚠</p>
      <p style="font-size:1.1rem;margin-bottom:8px;">שגיאה בטעינת עדכונים</p>
      <p style="font-size:0.85rem;opacity:0.7;">${escape(message)}</p>
    </div>`;
  if (heroSection) heroSection.innerHTML = errHtml;
  if (newsGrid) newsGrid.innerHTML = '';
}

/* ============================================================
   FETCH AND RENDER
   ============================================================ */

async function fetchAndRender() {
  showLoading();
  try {
    const res = await fetch(`${CONFIG.backendUrl}/api/news/posts`);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const posts = await res.json();

    POSTS = posts;

    // Ticker
    initTicker(POSTS);

    // Render featured hero (first post, which the backend marks featured: true)
    const featured = POSTS.find(p => p.featured);
    if (featured) renderHero(featured);
    else document.getElementById('heroSection').innerHTML = '';

    // Render grid using current active filter
    filterPosts(activeFilter);

  } catch (err) {
    console.error('[fetchAndRender] Failed to load posts:', err);
    showError(err.message);
  }
}

/* ============================================================
   INIT
   ============================================================ */

document.addEventListener('DOMContentLoaded', () => {
  setTodayDate();
  setStatusLinks();
  initNavTabs();
  fetchAndRender();
});
