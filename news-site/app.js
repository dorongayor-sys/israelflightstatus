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
  civil:    { label: 'תעופה אזרחית',   color: 'blue',   accent: '#3b82f6', badgeClass: 'badge-civil' },
  military: { label: 'צבאי',           color: 'purple', accent: '#a855f7', badgeClass: 'badge-military' },
  security: { label: 'התראת ביטחון',   color: 'red',    accent: '#ef4444', badgeClass: 'badge-security' },
  status:   { label: 'עדכון סטטוס',    color: 'green',  accent: '#22c55e', badgeClass: 'badge-status' },
  aviation: { label: 'תעופה',          color: 'cyan',   accent: '#06b6d4', badgeClass: 'badge-aviation' },
  memorial: { label: 'יום זיכרון',     color: 'indigo', accent: '#6366f1', badgeClass: 'badge-memorial' }
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

/* ── Posts data (newest first, sourced from @AviationupdatesDG) ── */
const POSTS = [
  {
    id: 1,
    featured: true,
    breaking: true,
    category: 'civil',
    title: 'לראשונה זה 7 שנים: חודשו הטיסות הישירות מארה"ב לוונצואלה',
    excerpt: 'לראשונה מזה שבע שנים חודשו הטיסות הישירות בין ארצות הברית לוונצואלה.',
    date: '2026-04-26',
    displayDate: '26 באפריל 2026',
    telegramUrl: 'https://t.me/AviationupdatesDG/1143'
  },
  {
    id: 2,
    category: 'civil',
    title: 'אייר פראנס מאריכה את ביטולי הטיסות לישראל עד ה-11.5',
    excerpt: 'אייר פראנס הודיעה על הארכת ביטול הטיסות לישראל ומישראל עד ה-11 במאי.',
    date: '2026-04-26',
    displayDate: '26 באפריל 2026',
    telegramUrl: 'https://t.me/AviationupdatesDG/1141'
  },
  {
    id: 3,
    category: 'military',
    title: 'פעם השנייה בתוך שבוע: חיזבאללה הפיל כטב"מ ישראלי',
    excerpt: 'חיזבאללה הצליח להפיל כטב"מ ישראלי — זו הפעם השנייה בתוך שבוע אחד בלבד.',
    date: '2026-04-26',
    displayDate: '26 באפריל 2026',
    telegramUrl: 'https://t.me/AviationupdatesDG/1142'
  },
  {
    id: 4,
    category: 'aviation',
    title: 'היום מציינים את יום הטייס הבינלאומי',
    excerpt: 'כמדי שנה, ב-26 באפריל מציינת קהילת התעופה העולמית את יום הטייס הבינלאומי.',
    date: '2026-04-26',
    displayDate: '26 באפריל 2026',
    telegramUrl: 'https://t.me/AviationupdatesDG/1140'
  },
  {
    id: 5,
    category: 'security',
    alert: true,
    title: 'התראה: הונאות בשם אל על — אל תיפלו בפח',
    excerpt: 'התראה על הונאות המתחזות לחברת אל על ומציעות הטבות שווא לנוסעים. אמתו מידע רק דרך ערוצי אל על הרשמיים.',
    date: '2026-04-25',
    displayDate: '25 באפריל 2026',
    telegramUrl: 'https://t.me/AviationupdatesDG/1138'
  },
  {
    id: 6,
    category: 'military',
    title: 'כטב"מ "זיק" (הרמס 450) של חיל האוויר הופל בשמי צור',
    excerpt: 'כטב"מ מסוג "זיק" (הרמס 450) של חיל האוויר הישראלי הופל מעל שמי צור בדרום לבנון.',
    date: '2026-04-25',
    displayDate: '25 באפריל 2026',
    telegramUrl: 'https://t.me/AviationupdatesDG/1137'
  },
  {
    id: 7,
    category: 'military',
    title: 'נושאת המטוסים האמריקאית "ג\'ורג\' בוש" נכנסה לאזור הפיקוד של הסנטקום',
    excerpt: 'נושאת המטוסים האמריקאית USS George Bush נכנסה לאזור הפיקוד של הסנטקום במזרח התיכון.',
    date: '2026-04-24',
    displayDate: '24 באפריל 2026',
    telegramUrl: 'https://t.me/AviationupdatesDG/1136'
  },
  {
    id: 8,
    category: 'memorial',
    title: 'טקס יום הזיכרון המרכזי של חיל האוויר',
    excerpt: 'חיל האוויר ערך את טקס יום הזיכרון המרכזי לזכר חללי החיל, לווה במטס הצדעה.',
    date: '2026-04-24',
    displayDate: '24 באפריל 2026',
    telegramUrl: 'https://t.me/AviationupdatesDG/1133'
  },
  {
    id: 9,
    category: 'memorial',
    title: 'אימונים אחרונים למטס יום הזיכרון',
    excerpt: 'חיל האוויר השלים את האימונים האחרונים לקראת מטס יום הזיכרון.',
    date: '2026-04-24',
    displayDate: '24 באפריל 2026',
    telegramUrl: 'https://t.me/AviationupdatesDG/1124'
  },
  {
    id: 10,
    category: 'civil',
    title: 'מילאי צפוי להכריז על קו ישיר ישראל–ארגנטינה',
    excerpt: 'לפי דיווחים, נשיא ארגנטינה חביאר מילאי צפוי להכריז על פתיחת קו טיסה ישיר בין ישראל לארגנטינה.',
    date: '2026-04-24',
    displayDate: '24 באפריל 2026',
    telegramUrl: 'https://t.me/AviationupdatesDG/1123'
  },
  {
    id: 11,
    category: 'aviation',
    title: 'תאונת דרכים קשה בטרמינל 1',
    excerpt: 'תאונת דרכים קשה אירעה בטרמינל 1 בנתב"ג.',
    date: '2026-04-24',
    displayDate: '24 באפריל 2026',
    telegramUrl: 'https://t.me/AviationupdatesDG/1122'
  },
  {
    id: 12,
    category: 'status',
    title: 'עוקב הסטטוס של חברות התעופה לנתב"ג — עודכן',
    excerpt: 'עוקב הסטטוס הבלעדי עודכן עם המידע העדכני ביותר על חברות הטסות, פועלות חלקית, או מושעות לנתב"ג.',
    date: '2026-04-24',
    displayDate: '24 באפריל 2026',
    isStatusLink: true,
    telegramUrl: 'https://t.me/AviationupdatesDG/1134'
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
  const container = document.getElementById('heroSection');

  // Extract "Channel/PostNumber" from the full telegram URL
  const postPath = post.telegramUrl.replace('https://t.me/', '');

  container.innerHTML = `
    <div class="hero-embed-wrap">
      <script async src="https://telegram.org/js/telegram-widget.js?22"
        data-telegram-post="${postPath}"
        data-width="100%"
        data-dark="1"
        data-userpic="false">
      <\/script>
    </div>`;
}

/* ============================================================
   RENDER NEWS CARDS
   ============================================================ */

function renderCard(post) {
  const cat = getCat(post.category);
  const linkUrl = post.isStatusLink ? CONFIG.airlineStatusUrl : post.telegramUrl;
  const linkLabel = post.isStatusLink ? '← פתח עוקב' : '← קרא בטלגרם';
  const timeAgo = formatDate(post.date);

  return `
    <article class="news-card" data-category="${escape(post.category)}" role="listitem">
      <div class="card-header">
        <span class="card-cat-badge ${cat.badgeClass}">${cat.label}</span>
        ${post.alert ? '<span class="card-alert">⚠ התראה</span>' : ''}
      </div>
      <div class="card-body">
        <h3 class="card-title">${escape(post.title)}</h3>
        <p class="card-excerpt">${escape(post.excerpt)}</p>
        <div class="card-footer">
          <span class="card-date" title="${post.displayDate}">${timeAgo}</span>
          <a href="${escape(linkUrl)}" target="_blank" rel="noopener" class="card-link" aria-label="${escape(post.title)} — ${linkLabel}">
            ${linkLabel}
            <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" aria-hidden="true">
              <line x1="19" y1="12" x2="5" y2="12"/>
              <polyline points="12 19 5 12 12 5"/>
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
    titleEl.textContent = 'עדכונים אחרונים';
  } else {
    titleEl.textContent = (CATEGORIES[category]?.label || category) + ' — עדכונים';
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
