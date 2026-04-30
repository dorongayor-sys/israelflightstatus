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

/* ── Posts data (newest first) ── */
const POSTS = [
  {
    id: 1,
    featured: true,
    breaking: true,
    category: 'civil',
    title: 'ארגנטינה עומדת להכריז על קו ישיר היסטורי תל אביב–בואנוס איירס',
    excerpt: 'הנשיא חביאר מילאי צפוי להכריז רשמית על קו ישיר חדש בין שדה התעופה בן גוריון בתל אביב לבואנוס איירס ב-9 ביוני, שיופעל על ידי Aerolíneas Argentinas — צעד משמעותי בהרחבת קשרי התעופה הדרום אמריקאיים עם ישראל.',
    date: '2026-04-29',
    displayDate: '29 באפריל 2026',
    telegramUrl: CONFIG.telegramUrl
  },
  {
    id: 2,
    category: 'civil',
    title: 'אייר פראנס מאריכה את השעיית הטיסות לישראל עד 11 במאי',
    excerpt: 'אייר פראנס הארכה את השעיית כל הטיסות מ/אל שדה התעופה הבינלאומי בן גוריון עד 11 במאי 2026, בשל הערכות ביטחון אזוריות שוטפות. החברה מצטרפת למספר חברות תעופה אירופאיות שדחו את לוחות הזמנים לחזרה לפעילות.',
    date: '2026-04-25',
    displayDate: '25 באפריל 2026',
    telegramUrl: CONFIG.telegramUrl
  },
  {
    id: 3,
    category: 'military',
    title: 'טקס יום הזיכרון של חיל האוויר מכבד 1,583 טייסים שנפלו בהר הטייסים',
    excerpt: 'חיל האוויר הישראלי ערך את טקס יום הזיכרון המרכזי בהר הטייסים, לזכר 1,583 חברי החיל שנפלו בשירות מאז הקמת צה"ל. F-16I סופה ביצע מעבר הצדעה מרגש במהלך הטקס.',
    date: '2026-04-28',
    displayDate: '28 באפריל 2026',
    telegramUrl: CONFIG.telegramUrl
  },
  {
    id: 4,
    category: 'military',
    title: 'חיזבאללה טוען להפלת כטב"מ הרמס 450 ישראלי מעל דרום לבנון',
    excerpt: 'חיזבאללה הודיע על הפלת כלי טיס בלתי מאויש מסוג הרמס 450 ישראלי שפעל מעל דרום לבנון — אובדן הכטב"מ השני שדווח באזור תוך ימים, בצל התגברות פעילות אווירית לאורך הגבול הצפוני.',
    date: '2026-04-27',
    displayDate: '27 באפריל 2026',
    telegramUrl: CONFIG.telegramUrl
  },
  {
    id: 5,
    category: 'military',
    title: 'קבוצת נושאת המטוסים USS George H.W. Bush נכנסת לאזור CENTCOM',
    excerpt: 'קבוצת נושאת המטוסים USS George H.W. Bush נכנסה לאזור הפיקוד המרכזי האמריקאי (CENTCOM) במזרח התיכון, ומחזקת את הנוכחות הימית האמריקאית באזור בצל מתחים גוברים.',
    date: '2026-04-27',
    displayDate: '27 באפריל 2026',
    telegramUrl: CONFIG.telegramUrl
  },
  {
    id: 6,
    category: 'security',
    alert: true,
    title: 'התראה: מסע הונאה מתחזה לאל על פועל ופוגע בנוסעים',
    excerpt: 'רשויות התעופה ואכיפת הצרכן הישראליות פרסמו אזהרה דחופה על מסע הונאה מתוחכם המתחזה לאל על ישראל. הנוסעים מתבקשים לאמת את כל התקשורת הקשורה לטיסה אך ורק דרך ערוצי אל על הרשמיים.',
    date: '2026-04-26',
    displayDate: '26 באפריל 2026',
    telegramUrl: CONFIG.telegramUrl
  },
  {
    id: 7,
    category: 'memorial',
    title: 'תצוגה אווירית ליום הזיכרון: חיל האוויר השלים תרגולים אחרונים מעל ירושלים',
    excerpt: 'טייסי חיל האוויר הישראלי השלימו גיחות תרגול אחרונות מעל ירושלים לקראט טקס מחווה אווירית ביום הזיכרון. תיעוד מהטיסות שותף על ידי משקיפים ברחבי העיר.',
    date: '2026-04-28',
    displayDate: '28 באפריל 2026',
    telegramUrl: CONFIG.telegramUrl
  },
  {
    id: 8,
    category: 'aviation',
    title: 'יום הטייס הבינלאומי 2026: חגיגת המקצוענים ששומרים על השמים מחוברים',
    excerpt: 'קהילת התעופה העולמית מציינת את יום הטייס הבינלאומי ב-26 באפריל, לכבוד הטייסים המקצועיים ששומרים על קישוריות עולמית דרך השמים. עדכוני תעופה DG משתחווה לכל הטייסים, צבאיים ואזרחיים כאחד.',
    date: '2026-04-26',
    displayDate: '26 באפריל 2026',
    telegramUrl: CONFIG.telegramUrl
  },
  {
    id: 9,
    category: 'status',
    title: 'לוח סטטוס חברות תעופה חי עודכן — עקוב אחרי חברות הטסות לבן גוריון',
    excerpt: 'עוקב הסטטוס הבלעדי שלנו עודכן עם המידע העדכני ביותר על חברות הטסות, פועלות חלקית, או בהשעייה מלאה בקווים לשדה התעופה בן גוריון (TLV). המידע מכסה יותר מ-100 חברות תעופה בזמן אמת.',
    date: '2026-04-28',
    displayDate: '28 באפריל 2026',
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
  const linkLabel = post.isStatusLink ? '← צפה בעוקב' : '← קרא בטלגרם';

  const html = `
    <a class="hero-card" href="${escape(linkUrl)}" target="_blank" rel="noopener" aria-label="${escape(post.title)}">
      <div class="hero-bg" style="background:${gradient}"></div>
      <div class="hero-dots"></div>
      <div class="hero-plane-bg" aria-hidden="true">✈</div>
      <div class="hero-overlay"></div>
      <div class="hero-content">
        <div class="hero-badges">
          ${post.breaking ? '<span class="breaking-badge">חדשות דחופות</span>' : ''}
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
              <line x1="19" y1="12" x2="5" y2="12"/>
              <polyline points="12 19 5 12 12 5"/>
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
