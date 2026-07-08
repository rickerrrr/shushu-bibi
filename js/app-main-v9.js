/* ==================== 鼠鼠&笔笔 恋爱官网 - 核心逻辑 ==================== */

// ==================== 手术级清理：斩断所有历史残留 ====================
(function surgicalCleanup() {
  // 只执行一次（用 sessionStorage 标记，每次浏览器会话只清理一次）
  if (sessionStorage.getItem('_sc_done')) return;
  sessionStorage.setItem('_sc_done', '1');

  console.log('%c[手术] 正在切除所有旧身份残留...', 'color:red;font-weight:bold');

  // 需要斩杀的 localStorage key 清单（不含 currentUser，它是有用的身份标记！）
  var killList = [
    // 旧身份系统残留
    'lc_user', 'lc_season', '_locked_identity', '_login_email',
    // OTP 验证码残留
    '_mock_otp_shushu', '_mock_otp_bibi',
    'otp_rate_shushu', 'otp_rate_bibi',
    'otp_window_shushu', 'otp_window_bibi'
  ];

  // 模糊匹配：杀光所有 _mock_otp_* 和 otp_* 和 lc_*
  var allKeys = [];
  for (var i = 0; i < localStorage.length; i++) allKeys.push(localStorage.key(i));
  allKeys.forEach(function(k) {
    if (k.indexOf('_mock_otp') === 0 ||
        k.indexOf('otp_rate_') === 0 ||
        k.indexOf('otp_window_') === 0 ||
        k.indexOf('lc_') === 0) {
      killList.push(k);
    }
  });

  // 执行斩杀
  killList.forEach(function(key) {
    try {
      localStorage.removeItem(key);
      console.log('[手术] 已切除:', key);
    } catch(e) {}
  });

  // identity-system 残留清理
  try { localStorage.removeItem('partner_status_cache'); } catch(e) {}
  try { localStorage.removeItem('partner_last_seen'); } catch(e) {}
  console.log('%c[手术] 残留清除完成', 'color:green;font-weight:bold');
})();

// ==================== 全局配置 ====================
const SITE_FOUND_DATE = '2026-06-23';
const DEFAULT_LOVE_START = '2026-05-16'; // 默认相恋日，可修改
let currentUser = null;
let currentFilter = { messages: 'all', albums: 'all', dates: 'all', transactions: 'all' };
let mediaRecorder = null;
let audioChunks = [];
let coolDownInterval = null;
let coolDownSeconds = 1800; // 30分钟

// ==================== PWA Service Worker (已禁用) ====================
// SW 已移除 — 避免缓存导致更新延迟


// PWA 安装提示
let deferredPrompt = null;
window.addEventListener('beforeinstallprompt', (e) => {
  e.preventDefault();
  deferredPrompt = e;
  // 3秒后在首页显示安装提示
  setTimeout(() => {
    const appEl = document.getElementById('app');
    if (appEl && !appEl.classList.contains('hidden') && deferredPrompt) {
      showInstallBanner();
    }
  }, 3000);
});

function showInstallBanner() {
  if (document.getElementById('pwa-install-banner')) return;
  const banner = document.createElement('div');
  banner.id = 'pwa-install-banner';
  banner.innerHTML = `
    <div class="pwa-banner-inner">
      <span>📱 把「鼠鼠笔笔」装到手机桌面，像App一样打开～</span>
      <button class="btn-pwa-install" id="btn-pwa-install">立即安装</button>
      <button class="btn-pwa-close" id="btn-pwa-close">✕</button>
    </div>
  `;
  document.getElementById('app').appendChild(banner);
  banner.classList.add('show');
  document.getElementById('btn-pwa-install').onclick = () => {
    if (deferredPrompt) {
      deferredPrompt.prompt();
      deferredPrompt.userChoice.then(() => {
        deferredPrompt = null;
        banner.remove();
      });
    }
  };
  document.getElementById('btn-pwa-close').onclick = () => banner.remove();
}

window.addEventListener('appinstalled', () => {
  deferredPrompt = null;
  const banner = document.getElementById('pwa-install-banner');
  if (banner) banner.remove();
  console.log('💕 App 已安装到桌面！');
});

// ==================== 数据管理 ====================
function getData(key, defaultValue = null) {
  try { const v = localStorage.getItem('lb_' + key); return v ? JSON.parse(v) : defaultValue; }
  catch(e) { return defaultValue; }
}

function setData(key, value) {
  try {
    const json = JSON.stringify(value);
    localStorage.setItem('lb_' + key, json);
    return true;
  } catch(e) {
    console.error('localStorage写入失败（可能空间不足）:', key, e.name);
    return false;
  }
}

function getStorageUsage() {
  let total = 0;
  for (let i = 0; i < localStorage.length; i++) {
    const k = localStorage.key(i);
    if (k && k.startsWith('lb_')) {
      total += localStorage.getItem(k).length;
    }
  }
  // 每个JS字符约2字节，localStorage限制约5MB
  return { used: total, usedMB: (total / 1024 / 1024).toFixed(2), limitMB: 5 };
}

// 存储空间预检（基于实际字符数）
function checkStorageBeforeUpload(fileCount) {
  var usage = getStorageUsage();
  // 压缩后每张约 15-30KB base64 字符（经 Canvas JPEG 0.65 质量 800px 后）
  var estPerPhoto = 25 * 1024;
  var estimated = usage.used + fileCount * estPerPhoto;
  var limit = 4.2 * 1024 * 1024; // 4.2MB 安全上限（留 0.8MB 给其他数据）
  if (estimated > limit) {
    var remain = Math.floor((limit - usage.used) / estPerPhoto);
    if (remain <= 0) {
      showToast('⚠️ 存储空间已满！请删除旧照片后再上传');
    } else {
      showToast('⚠️ 存储空间不足！预计还能存 ' + remain + ' 张照片');
    }
    return false;
  }
  return true;
}

// 安全写入 localStorage（带回滚）
function safeSetAlbums(albums) {
  // 先备份旧数据
  var backup = null;
  try { backup = localStorage.getItem('lb_albums'); } catch(e) {}
  try {
    var json = JSON.stringify(albums);
    localStorage.setItem('lb_albums', json);
    return true;
  } catch(e) {
    // 写入失败，恢复备份
    if (backup !== null) {
      try { localStorage.setItem('lb_albums', backup); } catch(e2) {}
    }
    console.error('相册存储失败:', e.name);
    return false;
  }
}

function updateStorageBar() {
  const bar = document.getElementById('storage-bar');
  if (!bar) return;
  const usage = getStorageUsage();
  const pct = Math.min(100, (usage.used / (4.5 * 1024 * 1024)) * 100);
  const fill = document.getElementById('storage-fill');
  const text = document.getElementById('storage-text');

  if (fill) {
    fill.style.width = pct + '%';
    fill.className = 'storage-fill' + (pct > 80 ? ' danger' : pct > 60 ? ' warn' : '');
  }
  if (text) {
    text.textContent = usage.usedMB + ' MB / ~5 MB';
  }
}

// 初始化默认数据
function initDefaultData() {
  // 数据版本管理：升级时自动迁移
  const DATA_VERSION = 'v2-countdown';
  const storedVersion = getData('_data_version', '');
  if (storedVersion !== DATA_VERSION) {
    localStorage.removeItem('lb_countdowns'); // 强制刷新纪念日数据
    setData('_data_version', DATA_VERSION);
  }

  if (!getData('love_start') || getData('love_start') === '2023-06-23') setData('love_start', DEFAULT_LOVE_START);
  if (!getData('password')) setData('password', '0623');
  if (!getData('messages')) setData('messages', []);
  if (!getData('albums')) safeSetAlbums([]);
  if (!getData('date_projects')) setData('date_projects', []);
  if (!getData('transactions')) setData('transactions', []);
  if (!getData('plans')) setData('plans', []);
  if (!getData('countdowns')) setData('countdowns', [
    { id: 'cd1', title: '笔笔生日', date: '2000-12-29', icon: '🎂', giftBudget: 500, type: 'birthday' },
    { id: 'cd2', title: '鼠鼠生日', date: '2002-09-12', icon: '🎂', giftBudget: 500, type: 'birthday' },
    { id: 'cd3', title: '第一次见面纪念', date: '2026-05-16', icon: '🌟', giftBudget: 200, type: 'memory' },
    { id: 'cd4', title: '相恋周年纪念日', date: '2027-05-16', icon: '💕', giftBudget: 300, type: 'anniversary' }
  ]);
  if (!getData('conventions')) setData('conventions', [
    {
      id: 'conv1', version: 'v1.0', date: '2026-06-23',
      title: '《情侣约会正式公约》原始版',
      content: '1. 所有约会行程遵循本公约执行。\n2. 单日短途约会：路费各自承担。\n3. 2天1晚及以上：交通费用公摊AA。\n4. 提前约定全包特例：由发起方承担全部费用。\n5. 餐饮、住宿等公摊消费按约定比例分摊。\n6. 个人购物、私人物品为个人自费。\n7. 每月进行一次财务对账。',
      changes: '初始版本，于官网成立日生效。'
    }
  ]);
  if (!getData('vouchers')) setData('vouchers', []);
  if (!getData('growth_logs')) setData('growth_logs', { shushu: [], bibi: [] });
  if (!getData('daily_checkins')) setData('daily_checkins', {});
  if (!getData('emergency_notes')) setData('emergency_notes', []);
  if (!getData('fund_balance')) setData('fund_balance', 0);
  if (!getData('monthly_statuses')) setData('monthly_statuses', { shushu: '学业顺利，每天都想笔笔 ❤️', bibi: '坚持站桩健身，想和鼠鼠一起去旅行 ✨' });
  if (!getData('love_start') || getData('love_start') === '2023-06-23') setData('love_start', DEFAULT_LOVE_START);
}

// ==================== 生成唯一ID ====================
function genId() { return 'id_' + Date.now() + '_' + Math.random().toString(36).substr(2, 6); }

// ==================== 工具函数 ====================
function formatDate(d) {
  if (!d) return '';
  const dt = new Date(d);
  return dt.getFullYear() + '-' + String(dt.getMonth()+1).padStart(2,'0') + '-' + String(dt.getDate()).padStart(2,'0');
}

function formatDateTime(d) {
  const dt = new Date(d);
  return formatDate(d) + ' ' + String(dt.getHours()).padStart(2,'0') + ':' + String(dt.getMinutes()).padStart(2,'0');
}

function getToday() { return formatDate(new Date()); }

function daysBetween(d1, d2) {
  return Math.floor((new Date(d2) - new Date(d1)) / (1000 * 60 * 60 * 24));
}

function getDaysUntil(targetDate) {
  const today = getToday();
  let target = new Date(targetDate + 'T00:00:00');
  // 如果是过去的日期，自动推进到未来最近的同月同日（每年重复）
  let diff = daysBetween(today, target.toISOString().split('T')[0]);
  if (diff < 0) {
    const m = target.getMonth();
    const d = target.getDate();
    const todayFull = new Date(today);
    target = new Date(todayFull.getFullYear(), m, d);
    if (target < new Date(today)) {
      target = new Date(todayFull.getFullYear() + 1, m, d);
    }
  }
  return daysBetween(today, target.toISOString().split('T')[0]);
}

function showToast(msg) {
  // 防止在 session 恢复过程中弹出"欢迎回来"提示
  if (window._is_restoring && msg.indexOf('欢迎回来') !== -1) return;
  const t = document.createElement('div');
  t.className = 'toast';
  t.textContent = msg;
  document.body.appendChild(t);
  setTimeout(() => t.remove(), 3000);
}

function formatCurrency(n) { return '¥' + Number(n).toFixed(2); }

// ==================== 双人身份永久绑定登录系统 ====================

function doLogin(user) {
  if (window._loginInProgress) return;
  window._loginInProgress = true;
  currentUser = user || 'shushu';
  // 保存到 localStorage，刷新后自动恢复
  localStorage.setItem('currentUser', currentUser);
  if (window.IdentitySystem && window.IdentitySystem.setIdentity) {
    window.IdentitySystem.setIdentity(currentUser);
  }
  const myName = currentUser === 'shushu' ? '鼠鼠' : '笔笔';
  console.log('[Auth] 登录成功:', currentUser, myName);
  const loginPage = document.getElementById('login-page');
  if (loginPage) loginPage.classList.add('hidden');
  const app = document.getElementById('app');
  if (app) app.classList.remove('hidden');
  document.body.classList.add('logged-in');
  if (window.OceanParticles && !window.OceanParticles.canvas) window.OceanParticles.init();
  const topBar = document.querySelector('.top-bar');
  if (topBar) topBar.style.display = '';
  const bottomNav = document.querySelector('.bottom-nav');
  if (bottomNav) bottomNav.style.display = '';
  initApp();
  showToast('欢迎回来，' + myName + '！💕');
  window._loginInProgress = false;
}
function doLogout() {
  if (confirm('确定要退出登录吗？')) {
    if (window.IdentitySystem && window.IdentitySystem.clearIdentity) {
      window.IdentitySystem.clearIdentity();
    }
    // 清除本地保存的身份，防止刷新后自动登录
    localStorage.removeItem('currentUser');
    currentUser = null;
    document.body.classList.remove('logged-in');
    document.getElementById('app').classList.add('hidden');
    document.getElementById('login-page').classList.remove('hidden');
    if (coolDownInterval) { clearInterval(coolDownInterval); coolDownInterval = null; }
  }
}

// ==================== Session 恢复（页面刷新后自动登录）====================
function tryRestoreSession() {
  window._is_restoring = true;
  try {
    const saved = localStorage.getItem('currentUser');
    if (saved && (saved === 'shushu' || saved === 'bibi')) {
      console.log('[Auth] 从本地恢复 session:', saved);
      currentUser = saved;
      if (window.IdentitySystem && window.IdentitySystem.setIdentity) {
        window.IdentitySystem.setIdentity(currentUser);
      }
      const loginPage = document.getElementById('login-page');
      if (loginPage) loginPage.classList.add('hidden');
      const app = document.getElementById('app');
      if (app) app.classList.remove('hidden');
      document.body.classList.add('logged-in');
      if (window.OceanParticles && !window.OceanParticles.canvas) window.OceanParticles.init();
      const topBar = document.querySelector('.top-bar');
      if (topBar) topBar.style.display = '';
      const bottomNav = document.querySelector('.bottom-nav');
      if (bottomNav) bottomNav.style.display = '';
      initApp();
      window._is_restoring = false;
      return true;
    }
    window._is_restoring = false;
    console.log('[Auth] 无有效 session，显示登录页');
    return false;
  } catch (e) {
    window._is_restoring = false;
    console.error('[Auth] Session 恢复失败:', e.message);
    return false;
  }
}

// 登录页头像切换
document.addEventListener('DOMContentLoaded', () => {
  // 刷新页面后自动恢复登录（localStorage 有身份时跳过登录页）
  const restored = tryRestoreSession();

  // 没有保存的登录状态 → 显示头像登录界面
  if (!restored) {
    currentUser = null;
    document.body.classList.remove('logged-in');
    const app = document.getElementById('app');
    if (app) app.classList.add('hidden');
    const loginPage = document.getElementById('login-page');
    if (loginPage) loginPage.classList.remove('hidden');
  }

  initDefaultData();
});

// 键盘快捷操作
document.addEventListener('keydown', function(e) {
  if (e.key === 'Escape') {
    if (!document.getElementById('photo-viewer').classList.contains('hidden')) {
      closePhotoViewer();
    }
  }
});

// ==================== 设置 ====================
function showSettings() {
  const loveStart = getData('love_start', DEFAULT_LOVE_START);
  const html = `
    <h3>⚙️ 官网设置</h3>
    <div class="form-group">
      <label>💕 恋爱关系确立日期：</label>
      <input type="date" id="settings-love-start" value="${loveStart}">
      <small style="color:#9ca3af;">修改后将重新计算相恋天数</small>
    </div>
    <div class="form-group">
      <label>🔐 登录密码：</label>
      <input type="password" id="settings-password" placeholder="留空则不改密码">
    </div>
    <div class="form-actions">
      <button class="btn-secondary" onclick="closeGlobalModal()">取消</button>
      <button class="btn-primary" onclick="saveSettings()">保存设置</button>
    </div>
  `;
  showGlobalModal(html);
}

function saveSettings() {
  const newDate = document.getElementById('settings-love-start').value;
  const newPwd = document.getElementById('settings-password').value;

  if (newDate) {
    setData('love_start', newDate);
  }
  if (newPwd) {
    setData('password', newPwd);
    showToast('密码已更新 🔐');
  }

  closeGlobalModal();
  startLoveCounter();
  showToast('设置已保存！💕');
}

// ==================== 应用初始化 ====================
function initApp() {
  startLoveCounter();
  initGreeting();
  initMilestones();
  renderAnnouncementPreview();
  renderMonthlyStatus();
  renderAllModules();
  switchPage('home');
  autoSignIn();
  initLoveQuotes();
  initNotifications();
}

// ==================== 今日情话轮播 ====================
const LOVE_QUOTES = {
  spring: {
    badge: '🌸 春日恋曲',
    quotes: [
      { text: '春风十里，不如你。', author: '—— 写给你的第 1 封情书' },
      { text: '你是人间四月天，笑响点亮了四面风。', author: '—— 写给你的第 2 封情书' },
      { text: '遇见你，是我这辈子最美丽的意外。', author: '—— 写给你的第 3 封情书' },
      { text: '想和你一起看花开，看日落，看细水长流。', author: '—— 写给你的第 4 封情书' },
      { text: '你的笑容，比春天所有的花都好看。', author: '—— 写给你的第 5 封情书' },
      { text: '我携星辰以赠你，仍觉星辰不及你。', author: '—— 写给你的第 6 封情书' },
    ],
  },
  summer: {
    badge: '🌊 夏日恋曲',
    quotes: [
      { text: '你是我遇见的所有美好里的刚刚好。', author: '—— 写给你的第 1 封情书' },
      { text: '夏天的风我永远记得，清清楚楚地说你爱我。', author: '—— 写给你的第 2 封情书' },
      { text: '和你在一起，连空气都是甜的。', author: '—— 写给你的第 3 封情书' },
      { text: '想和你去海边，踩最浪的浪，说最甜的话。', author: '—— 写给你的第 4 封情书' },
      { text: '世间万物，皆不如你。', author: '—— 写给你的第 5 封情书' },
      { text: '你是我做过最美的梦，也是我醒来最想见的人。', author: '—— 写给你的第 6 封情书' },
    ],
  },
  autumn: {
    badge: '🍂 秋日恋曲',
    quotes: [
      { text: '落叶归根，我归你。', author: '—— 写给你的第 1 封情书' },
      { text: '秋天是倒放的春天，晚霞是爱意的开篇。', author: '—— 写给你的第 2 封情书' },
      { text: '你一笑，整个世界都亮了。', author: '—— 写给你的第 3 封情书' },
      { text: '我想和你一起虚度时光，从晨光到暮色。', author: '—— 写给你的第 4 封情书' },
      { text: '星河滚烫，你是人间理想。', author: '—— 写给你的第 5 封情书' },
      { text: '有你在，就是最好的季节。', author: '—— 写给你的第 6 封情书' },
    ],
  },
  winter: {
    badge: '❄️ 冬日恋曲',
    quotes: [
      { text: '如果冬天来了，你会抱紧我吗？', author: '—— 写给你的第 1 封情书' },
      { text: '初雪落下的时候，第一个想到的总是你。', author: '—— 写给你的第 2 封情书' },
      { text: '有人问我春天是什么，我将遇见你的那一天命名为春天。', author: '—— 写给你的第 3 封情书' },
      { text: '万物皆有裂痕，那是光照进来的地方——而你就是那道光。', author: '—— 写给你的第 4 封情书' },
      { text: '在寒冷的日子里，想到你就很暖。', author: '—— 写给你的第 5 封情书' },
      { text: '踏雪而来，只为见你一面。', author: '—— 写给你的第 6 封情书' },
    ],
  },
};

let loveQuoteSeason = 'summer';
let loveQuoteLastIndex = -1;
let loveQuoteInterval = null;
let loveHeartInterval = null;

function initLoveQuotes() {
  if (loveQuoteInterval) return;

  const season = getCurrentSeason();
  loveQuoteSeason = season;

  updateQuoteBadge();
  showRandomQuote();

  // 每8秒轮播一条情话
  loveQuoteInterval = setInterval(showRandomQuote, 8000);

  // 每3秒浮出一个小心心
  loveHeartInterval = setInterval(spawnFloatingHeart, 3000);
  spawnFloatingHeart();
  spawnFloatingHeart();
}

function showRandomQuote() {
  const seasonQuotes = LOVE_QUOTES[loveQuoteSeason] || LOVE_QUOTES.summer;
  const list = seasonQuotes.quotes;
  if (!list.length) return;

  let idx;
  do { idx = Math.floor(Math.random() * list.length); }
  while (idx === loveQuoteLastIndex && list.length > 1);
  loveQuoteLastIndex = idx;

  const q = list[idx];
  const textEl = document.getElementById('quote-text');
  const authEl = document.getElementById('quote-author');

  if (textEl && authEl) {
    textEl.classList.add('fade');
    authEl.classList.add('fade');
    setTimeout(() => {
      textEl.textContent = q.text;
      authEl.textContent = q.author;
      textEl.classList.remove('fade');
      authEl.classList.remove('fade');
    }, 480);
  }
}

function updateQuoteBadge() {
  const badgeEl = document.getElementById('quote-season-badge');
  if (!badgeEl) return;
  const seasonQuotes = LOVE_QUOTES[loveQuoteSeason] || LOVE_QUOTES.summer;
  badgeEl.textContent = seasonQuotes.badge;
}

function spawnFloatingHeart() {
  const container = document.getElementById('quote-floating-hearts');
  if (!container) return;

  const heart = document.createElement('span');
  heart.className = 'quote-float-heart';
  const emojis = ['\u{1F495}', '\u{1F496}', '\u{1F497}', '\u{1F49D}', '\u{1F498}', '\u{1FA77}', '\u{1F493}', '\u{1F49E}'];
  heart.textContent = emojis[Math.floor(Math.random() * emojis.length)];
  heart.style.left = (10 + Math.random() * 80) + '%';
  heart.style.animationDuration = (3 + Math.random() * 4) + 's';
  heart.style.animationDelay = '0s';
  heart.style.setProperty('--rotation', (Math.random() * 60 - 30) + 'deg');
  heart.style.fontSize = (10 + Math.random() * 14) + 'px';

  container.appendChild(heart);

  setTimeout(() => {
    if (heart.parentNode) heart.parentNode.removeChild(heart);
  }, 7000);
}

// 季节切换时更新情话
function switchLoveQuoteSeason(season) {
  if (loveQuoteSeason === season) return;
  loveQuoteSeason = season;
  loveQuoteLastIndex = -1;
  updateQuoteBadge();
  showRandomQuote();
}

// ==================== 早晚安问候 ====================
const GREETINGS = {
  dawn: { // 0:00 - 6:00
    period: '凌晨',
    icons: ['🌙', '✨', '🌠', '🦉'],
    titles: ['夜深了，早点休息', '星星在说晚安', '夜深了，好梦'],
    subs: ['明天又是美好的一天', '梦里见', '偷偷想你中...', '枕边风都是甜的', '数羊不如数你'],
  },
  morning: { // 6:00 - 9:00
    period: '早上',
    icons: ['🌅', '☀️', '🌤️', '🌸'],
    titles: ['早上好', '新的一天开始啦', '早安，小可爱'],
    subs: ['今天也要元气满满', '你是我起床的动力', '阳光和你都在', '今日份的甜已送达'],
  },
  forenoon: { // 9:00 - 12:00
    period: '上午',
    icons: ['☀️', '🌻', '🦋', '🌿'],
    titles: ['上午好', '又是想你的一上午', '阳光正好'],
    subs: ['认真工作/学习，然后想我', '忙完了来找你', '吃午饭了没呀'],
  },
  noon: { // 12:00 - 14:00
    period: '中午',
    icons: ['☀️', '🍱', '🍜', '🌞'],
    titles: ['中午好', '该吃饭啦', '午安'],
    subs: ['好好吃饭，不许饿肚子', '吃饱了才有力气想我', '记得午休一下哦'],
  },
  afternoon: { // 14:00 - 18:00
    period: '下午',
    icons: ['🌤️', '🍃', '🫖', '🌺'],
    titles: ['下午好', '午后时光', '悠闲的下午'],
    subs: ['来杯奶茶吧', '今天的你也很棒', '距离见面又近了一天', '想你ing...'],
  },
  dusk: { // 18:00 - 20:00
    period: '傍晚',
    icons: ['🌅', '🌆', '🌇', '🎑'],
    titles: ['傍晚好', '日落时分', '晚霞好美'],
    subs: ['晚霞和你一样温柔', '一天又过去了', '晚上吃什么呢'],
  },
  night: { // 20:00 - 24:00
    period: '晚上',
    icons: ['🌙', '🌃', '✨', '🕯️'],
    titles: ['晚上好', '夜色温柔', '晚安前的悄悄话'],
    subs: ['今天过得开心吗', '睡前记得想我', '你一定是今晚最好看的梦', '明天醒来又想你了'],
  },
};

function getGreetingPeriod() {
  const h = new Date().getHours();
  if (h < 6) return 'dawn';
  if (h < 9) return 'morning';
  if (h < 12) return 'forenoon';
  if (h < 14) return 'noon';
  if (h < 18) return 'afternoon';
  if (h < 20) return 'dusk';
  return 'night';
}

let greetingSeed = 0;

function initGreeting() {
  const period = getGreetingPeriod();
  const g = GREETINGS[period];
  const today = new Date().toISOString().slice(0, 10);
  
  // 用日期+时段做种子，同一天同一时段不会变
  greetingSeed = (parseInt(today.replace(/-/g, '')) + period.length) % 100;
  
  const iconIdx = greetingSeed % g.icons.length;
  const titleIdx = greetingSeed % g.titles.length;
  const subIdx = (greetingSeed + 3) % g.subs.length;
  
  const iconEl = document.getElementById('greeting-icon');
  const titleEl = document.getElementById('greeting-title');
  const subEl = document.getElementById('greeting-sub');
  const userEl = document.getElementById('greeting-user');
  
  if (iconEl) iconEl.textContent = g.icons[iconIdx];
  if (titleEl) titleEl.textContent = g.titles[titleIdx];
  if (subEl) subEl.textContent = g.subs[subIdx];
  
  // 显示当前登录用户
  if (userEl && currentUser) {
    userEl.textContent = currentUser === 'shushu' ? '🐹 鼠鼠' : '🐱 笔笔';
  }
}

// ==================== 恋爱里程碑 ====================
const LOVE_MILESTONES = [
  { days: 1, label: '相恋第1天', emoji: '🎉' },
  { days: 7, label: '在一起一周', emoji: '💝' },
  { days: 14, label: '在一起两周', emoji: '💐' },
  { days: 30, label: '满月纪念', emoji: '🌕' },
  { days: 50, label: '50天纪念', emoji: '💎' },
  { days: 99, label: '长长久久', emoji: '💗' },
  { days: 100, label: '在一起100天', emoji: '💯' },
  { days: 150, label: '150天纪念', emoji: '🎀' },
  { days: 200, label: '200天纪念', emoji: '💖' },
  { days: 250, label: '250天纪念', emoji: '🌸' },
  { days: 300, label: '300天纪念', emoji: '💫' },
  { days: 365, label: '一周年快乐', emoji: '🎂' },
  { days: 400, label: '400天纪念', emoji: '💝' },
  { days: 500, label: '500天纪念', emoji: '🏅' },
  { days: 520, label: '520天 我爱你', emoji: '💕' },
  { days: 600, label: '600天纪念', emoji: '🌟' },
  { days: 700, label: '700天纪念', emoji: '✨' },
  { days: 800, label: '800天纪念', emoji: '🎁' },
  { days: 900, label: '900天纪念', emoji: '🌈' },
  { days: 999, label: '999天长长久久', emoji: '💒' },
  { days: 1000, label: '在一起1000天', emoji: '👑' },
  { days: 1314, label: '1314天 一生一世', emoji: '💍' },
];

function getLoveDays() {
  const start = getData('love_start', DEFAULT_LOVE_START);
  const now = new Date();
  const startDate = new Date(start);
  return Math.floor((now - startDate) / (1000 * 60 * 60 * 24));
}

function getCurrentMilestone() {
  const days = getLoveDays();
  for (let i = LOVE_MILESTONES.length - 1; i >= 0; i--) {
    if (days >= LOVE_MILESTONES[i].days) {
      return { current: LOVE_MILESTONES[i], days: days };
    }
  }
  return { current: LOVE_MILESTONES[0], days: days };
}

function getNextMilestone() {
  const days = getLoveDays();
  for (let i = 0; i < LOVE_MILESTONES.length; i++) {
    if (LOVE_MILESTONES[i].days > days) {
      return LOVE_MILESTONES[i];
    }
  }
  return null;
}

function isHitToday(days, target) {
  return days === target;
}

function initMilestones() {
  const days = getLoveDays();
  const { current } = getCurrentMilestone();
  const next = getNextMilestone();
  const inner = document.getElementById('milestone-inner');
  if (!inner) return;
  
  let html = '';
  
  // 当前里程碑徽章
  html += '<span class="milestone-badge">' + current.emoji + ' ' + current.label + ' (' + days + '天)</span>';
  
  // 如果今天恰是里程碑日，标记
  if (isHitToday(days, current.days)) {
    html += '<span class="milestone-badge" style="animation:greetingPulse 0.8s ease-in-out 3;background:linear-gradient(135deg,rgba(59,130,246,0.2),rgba(96,165,250,0.2));">🎊 今天就是' + current.label + '!</span>';
  }
  
  // 下一个里程碑倒计时
  if (next) {
    const remaining = next.days - days;
    html += '<span class="milestone-next">下一个里程碑 <strong>' + next.emoji + ' ' + next.label + '</strong> 还有 <strong>' + remaining + '</strong> 天</span>';
  }
  
  inner.innerHTML = html;
}

// ==================== 相恋计时器 ====================
let loveCounterInterval = null;

function startLoveCounter() {
  if (loveCounterInterval) clearInterval(loveCounterInterval);
  function update() {
    const start = getData('love_start', DEFAULT_LOVE_START);
    const now = new Date();
    const startDate = new Date(start);
    const diffMs = now - startDate;
    const totalDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    const hours = now.getHours();
    const mins = now.getMinutes();
    const secs = now.getSeconds();

    document.getElementById('love-counter').textContent = '💕 相恋 ' + totalDays + ' 天';
    document.getElementById('hero-days').textContent = totalDays;
    document.getElementById('hero-hours').textContent = hours;
    document.getElementById('hero-mins').textContent = mins;
    document.getElementById('hero-secs').textContent = secs;
    
    // 跨天时更新里程碑（每分钟检查一次）
    if (secs === 0 && mins === 0) {
      initMilestones();
    }
  }
  update();
  loveCounterInterval = setInterval(update, 1000);
}

// ==================== 页面路由 ====================
function switchPage(pageName) {
  document.querySelectorAll('.page-section').forEach(s => s.classList.remove('active'));
  document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));

  const target = document.getElementById('page-' + pageName);
  if (target) target.classList.add('active');

  const navBtn = document.querySelector('.nav-item[data-page="' + pageName + '"]');
  if (navBtn) navBtn.classList.add('active');

  document.getElementById('more-menu').classList.add('hidden');

  // 渲染对应页面
  switch(pageName) {
    case 'messages': renderMessages(); break;
    case 'albums': renderAlbums(); updateStorageBar(); break;
    case 'dates': renderDateProjects(); break;
    case 'finance': renderFinance(); break;
    case 'plans': renderPlans(); break;
    case 'countdowns': renderCountdowns(); break;
    case 'conventions': renderConventions(); break;
    case 'vouchers': renderVouchers(); break;
    case 'growth': renderGrowth(); break;
    case 'daily-checkin': renderDailyCheckin(); break;
    case 'emergency': renderEmergency(); break;
    case 'drift-bottle': renderDriftBottle(); break;
    case 'yearly': break;
    case 'mood': renderMoodPage(); break;
    case 'blindbox': renderBlindboxPage(); break;
    case 'quiz': renderQuizPage(); break;
    case 'wishlist': renderWishlistPage(); break;
    case 'fund-tree': renderFundTree(); break;
    case 'achievements': renderAchievements(); break;
    case 'museum': renderMuseum(); break;
    case 'tarot': renderTarotPage(); break;
    case 'bagua': renderBaguaPage(); break;
    case 'dice': renderDicePage(); break;
    case 'awards': break;
    case 'mbti': renderMbtiGrid(); break;
    case 'music-planet': renderMusicPlanetPage(); break;
    case 'wheel': initWheel(); break;
    case 'puzzle': initPuzzlePage(); break;
    case 'footprint': initFootprint(); break;
    case 'love-tree': initLoveTree(); break;
    case 'challenge': initChallenge(); break;
    case 'love-letter': initLoveLetter(); break;
    case 'games': initGames(); break;
    case 'dashboard': renderDashboard(); break;
    case 'diary': renderDiaryList(); break;
  }

  window.scrollTo({ top: 0, behavior: 'smooth' });
}

function toggleMoreMenu() {
  document.getElementById('more-menu').classList.toggle('hidden');
}

// ==================== 公告系统 ====================
function renderAnnouncementPreview() {
  const conventions = getData('conventions', []);
  if (conventions.length > 0) {
    const latest = conventions[conventions.length - 1];
    document.getElementById('announcement-preview').textContent = latest.content.replace(/\n/g, ' · ');
    const versionEl = document.querySelector('.announcement-version');
    if (versionEl) versionEl.textContent = latest.version;
  }
}

function showAnnouncement() {
  const conventions = getData('conventions', []);
  let html = '<h2>📜 情侣约会正式公约</h2>';
  conventions.forEach((c, i) => {
    html += '<div style="margin-bottom:20px;padding:14px;background:#eff6ff;border-radius:10px;">';
    html += '<strong>' + c.version + '</strong> <small style="color:#9ca3af">' + c.date + '</small>';
    html += '<h3 style="margin-top:8px;">' + c.title + '</h3>';
    html += '<pre style="white-space:pre-wrap;font-family:inherit;font-size:14px;line-height:1.8;">' + c.content + '</pre>';
    if (c.changes) {
      html += '<p style="font-size:12px;color:#9ca3af;margin-top:8px;">变更记录：' + c.changes + '</p>';
    }
    html += '</div>';
  });
  document.getElementById('announcement-content').innerHTML = html;
  document.getElementById('announcement-modal').classList.remove('hidden');
}

function closeAnnouncementModal() {
  document.getElementById('announcement-modal').classList.add('hidden');
}

// ==================== 月度状态栏 ====================
function renderMonthlyStatus() {
  const statuses = getData('monthly_statuses', {});
  const now = new Date();
  const monthStr = now.getFullYear() + '年' + (now.getMonth() + 1) + '月';
  document.getElementById('monthly-shushu').textContent = statuses.shushu || '暂无';
  document.getElementById('monthly-bibi').textContent = statuses.bibi || '暂无';
  document.getElementById('monthly-shushu-time').textContent = monthStr;
  document.getElementById('monthly-bibi-time').textContent = monthStr;
}

function editMonthlyStatus() {
  const statuses = getData('monthly_statuses', {});
  const html = `
    <h3>✏️ 更新本月状态</h3>
    <div class="form-group">
      <label>🐹 鼠鼠本月小目标与感悟：</label>
      <textarea id="edit-shushu-status" rows="3">${statuses.shushu || ''}</textarea>
    </div>
    <div class="form-group">
      <label>🐱 笔笔本月小目标与感悟：</label>
      <textarea id="edit-bibi-status" rows="3">${statuses.bibi || ''}</textarea>
    </div>
    <div class="form-actions">
      <button class="btn-secondary" onclick="closeGlobalModal()">取消</button>
      <button class="btn-primary" onclick="saveMonthlyStatus()">保存</button>
    </div>
  `;
  showGlobalModal(html);
}

function saveMonthlyStatus() {
  const shushu = document.getElementById('edit-shushu-status').value;
  const bibi = document.getElementById('edit-bibi-status').value;
  setData('monthly_statuses', { shushu, bibi });
  closeGlobalModal();
  renderMonthlyStatus();
  showToast('月度状态已更新 ✅');
}

// ==================== 通用弹窗 ====================
function showGlobalModal(html) {
  document.getElementById('global-modal-content').innerHTML = html;
  document.getElementById('global-modal').classList.remove('hidden');
}

function closeGlobalModal() {
  document.getElementById('global-modal').classList.add('hidden');
}

// ==================== 板块1：私密留言墙 ====================
function renderMessages() {
  const messages = getData('messages', []);
  const searchTerm = (document.getElementById('message-search')?.value || '').toLowerCase();
  let filtered = messages;

  if (currentFilter.messages !== 'all') {
    filtered = filtered.filter(m => m.category === currentFilter.messages);
  }
  if (searchTerm) {
    filtered = filtered.filter(m => m.content.toLowerCase().includes(searchTerm));
  }

  // 按时间倒序
  filtered.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

  const list = document.getElementById('message-list');
  if (filtered.length === 0) {
    list.innerHTML = '<p style="text-align:center;color:#9ca3af;padding:40px;">还没有留言，快写下第一句话吧 💌</p>';
    return;
  }

  list.innerHTML = filtered.map(m => {
    const isFuture = m.category === 'future';
    const isUnlocked = !isFuture || !m.unlockDate || new Date() >= new Date(m.unlockDate);
    const tagLabels = { confession: '💕 告白', daily: '📝 碎碎念', apology: '🙏 致歉', future: '⏰ 未来信' };
    const cardClass = isUnlocked ? m.category : 'locked';

    let bodyHtml = '';
    if (m.voiceUrl) {
      bodyHtml += '<div class="msg-voice"><audio controls playsinline preload="metadata" src="' + m.voiceUrl + '"></audio></div>';
    }
    if (isUnlocked) {
      bodyHtml += '<div class="msg-body">' + escapeHtml(m.content) + '</div>';
    } else {
      bodyHtml += '<div class="msg-body">' + escapeHtml(m.content) + '</div>';
      bodyHtml += '<div class="lock-badge">🔒 将于 ' + formatDate(m.unlockDate) + ' 解锁</div>';
      if (daysBetween(getToday(), m.unlockDate) <= 0) {
        bodyHtml += '<button class="unlock-btn" onclick="unlockMessage(\'' + m.id + '\')">🔓 点击解锁</button>';
      }
    }

    return `
      <div class="message-card ${cardClass}">
        <div class="msg-header">
          <span class="msg-author">${m.author === 'shushu' ? '🐹 鼠鼠' : '🐱 笔笔'}</span>
          <span class="msg-tag">${tagLabels[m.category] || m.category}</span>
        </div>
        ${bodyHtml}
        <div class="msg-time">${formatDateTime(m.createdAt)}</div>
      </div>`;
  }).join('');
}

function filterMessages(cat) {
  currentFilter.messages = cat;
  document.querySelectorAll('#page-messages .tab').forEach(t => t.classList.remove('active'));
  const tab = document.querySelector('#page-messages .tab[data-tab="' + cat + '"]');
  if (tab) tab.classList.add('active');
  renderMessages();
}

function searchMessages() { renderMessages(); }

function unlockMessage(id) {
  const messages = getData('messages', []);
  const idx = messages.findIndex(m => m.id === id);
  if (idx >= 0 && messages[idx].unlockDate && new Date() >= new Date(messages[idx].unlockDate)) {
    messages[idx].unlockDate = null;
    setData('messages', messages);
    renderMessages();
    showToast('信件已解锁！💌');
  }
}

// 获取移动端兼容的录音格式
function getSupportedMimeType() {
  // iOS Safari 只支持 audio/mp4, Android Chrome 优先 audio/webm
  const types = [
    'audio/mp4',
    'audio/webm;codecs=opus',
    'audio/webm',
    'audio/ogg;codecs=opus',
    'audio/aac'
  ];
  for (const t of types) {
    if (MediaRecorder.isTypeSupported(t)) return t;
  }
  return ''; // 让浏览器自己决定
}

// Blob → base64 Data URL（解决 blob URL 刷新后失效问题）
function blobToDataURL(blob) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}

function toggleVoiceRecord() {
  if (mediaRecorder && mediaRecorder.state === 'recording') {
    mediaRecorder.stop();
    document.getElementById('voice-btn').textContent = '🎤 语音留言';
    document.getElementById('voice-status').classList.add('hidden');
  } else {
    const mimeType = getSupportedMimeType();
    const recOpts = mimeType ? { mimeType } : {};
    navigator.mediaDevices.getUserMedia({ audio: true }).then(stream => {
      mediaRecorder = new MediaRecorder(stream, recOpts);
      audioChunks = [];
      mediaRecorder.ondataavailable = e => audioChunks.push(e.data);
      mediaRecorder.onstop = async () => {
        const actualType = mediaRecorder.mimeType || mimeType || 'audio/webm';
        const blob = new Blob(audioChunks, { type: actualType });
        // 转为 base64 Data URL 保证刷新后仍可播放
        const dataUrl = await blobToDataURL(blob);
        const preview = document.getElementById('voice-preview');
        preview.src = dataUrl;
        preview.classList.remove('hidden');
        preview.dataset.blobUrl = dataUrl;
      };
      mediaRecorder.start();
      document.getElementById('voice-btn').textContent = '⏹️ 停止录音';
      document.getElementById('voice-status').classList.remove('hidden');
    }).catch((err) => {
      console.error('录音失败:', err);
      showToast('无法访问麦克风，请检查权限 🎤');
    });
  }
}

function postMessage() {
  const category = document.getElementById('msg-category').value;
  const content = document.getElementById('msg-content').value.trim();
  const author = document.getElementById('msg-author').value;
  const voiceUrl = document.getElementById('voice-preview')?.dataset.blobUrl || null;

  if (!content && !voiceUrl) {
    showToast('请填写留言内容或录制语音 📝');
    return;
  }

  const msg = {
    id: genId(),
    category,
    content,
    author,
    voiceUrl,
    createdAt: new Date().toISOString(),
    unlockDate: null
  };

  if (category === 'future') {
    const unlockOption = document.getElementById('future-unlock').value;
    if (unlockOption === 'custom') {
      const customDate = document.getElementById('future-custom-date').value;
      if (!customDate) { showToast('请选择解锁日期 📅'); return; }
      msg.unlockDate = customDate;
    } else {
      const days = parseInt(unlockOption);
      const d = new Date();
      d.setDate(d.getDate() + days);
      msg.unlockDate = formatDate(d);
    }
  }

  const messages = getData('messages', []);
  messages.push(msg);
  setData('messages', messages);

  // 清空表单
  document.getElementById('msg-content').value = '';
  document.getElementById('voice-preview').classList.add('hidden');
  document.getElementById('voice-preview').src = '';
  delete document.getElementById('voice-preview').dataset.blobUrl;

  renderMessages();
  showToast('留言已发布！💌');
}

function escapeHtml(text) {
  if (!text) return '';
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

// 监听分类选择变化
document.addEventListener('DOMContentLoaded', () => {
  setTimeout(() => {
    const catSelect = document.getElementById('msg-category');
    if (catSelect) {
      catSelect.addEventListener('change', function() {
        const futureOpts = document.getElementById('future-options');
        if (futureOpts) {
          futureOpts.classList.toggle('hidden', this.value !== 'future');
        }
      });
    }

    const unlockSelect = document.getElementById('future-unlock');
    if (unlockSelect) {
      unlockSelect.addEventListener('change', function() {
        const customDate = document.getElementById('future-custom-date');
        if (customDate) {
          customDate.classList.toggle('hidden', this.value !== 'custom');
        }
      });
    }
  }, 100);
});

// ==================== 板块2：恋爱相册 ====================
// 当前浏览的相册ID和照片索引（用于查看器）
let currentViewerAlbumId = null;
let currentViewerPhotoIdx = -1;
let currentUploadAlbumId = null;

function renderAlbums() {
  const albums = getData('albums', []);
  let filtered = albums;
  if (currentFilter.albums !== 'all' && currentFilter.albums !== 'private') {
    filtered = albums.filter(a => a.type === currentFilter.albums);
  } else if (currentFilter.albums === 'private') {
    filtered = albums.filter(a => a.isPrivate);
  }

  const grid = document.getElementById('album-grid');
  if (filtered.length === 0) {
    grid.innerHTML = '<p style="text-align:center;color:#9ca3af;padding:40px;grid-column:1/-1;">还没有相册，创建第一个吧 📸</p>';
    return;
  }

  let html = '';
  
  // 快捷上传卡片（放在最前面）
  html += '<div class="album-card album-add-card" onclick="showQuickUpload()">';
  html += '<div class="album-cover add-cover"><span class="add-icon">➕</span></div>';
  html += '<div class="album-info"><h4>快速上传照片</h4><p>点击选择相册上传</p></div>';
  html += '</div>';

  html += filtered.map(a => {
    const typeIcons = { daily: '📅', travel: '✈️', anniversary: '🎉' };
    const firstPhoto = (a.photos && a.photos.length > 0) ? a.photos[0] : null;
    let coverHtml = '';
    if (firstPhoto && firstPhoto.dataUrl) {
      coverHtml = '<img src="' + firstPhoto.dataUrl + '" alt="封面" class="album-cover-img">';
      if (a.isPrivate) coverHtml += '<span class="lock-icon">🔒</span>';
    } else {
      coverHtml = typeIcons[a.type] || '📸';
      if (a.isPrivate) coverHtml += '<span class="lock-icon">🔒</span>';
    }
    return `
      <div class="album-card" onclick="viewAlbum('${a.id}')">
        <div class="album-cover ${firstPhoto && firstPhoto.dataUrl ? 'has-photo' : a.type}">
          ${coverHtml}
        </div>
        <div class="album-info">
          <h4>${escapeHtml(a.title)}</h4>
          <p>${a.date || ''} · ${(a.photos || []).length} 张照片</p>
          <div class="album-links">
            ${a.planId ? '<span class="album-link" onclick="event.stopPropagation();switchPage(\'plans\')">📋 行程计划</span>' : ''}
            ${a.transactionId ? '<span class="album-link" onclick="event.stopPropagation();switchPage(\'finance\')">💰 账单</span>' : ''}
          </div>
        </div>
      </div>`;
  }).join('');

  grid.innerHTML = html;
}

function filterAlbums(cat) {
  currentFilter.albums = cat;
  document.querySelectorAll('#page-albums .tab').forEach(t => t.classList.remove('active'));
  const tab = document.querySelector('#page-albums .tab[data-tab="' + cat + '-album"]');
  if (tab) tab.classList.add('active');
  renderAlbums();
}

function showCreateAlbum() {
  const plans = getData('plans', []);
  const transactions = getData('transactions', []);

  const html = `
    <h3>➕ 创建新相册</h3>
    <div class="form-group">
      <label>相册名称：</label>
      <input type="text" id="album-title" placeholder="例如：2026年端午出游">
    </div>
    <div class="form-group">
      <label>相册类型：</label>
      <select id="album-type">
        <option value="daily">📅 日常单日约会</option>
        <option value="travel">✈️ 多日旅行</option>
        <option value="anniversary">🎉 纪念日专属</option>
      </select>
    </div>
    <div class="form-group">
      <label>日期：</label>
      <input type="date" id="album-date" value="${getToday()}">
    </div>
    <div class="form-group">
      <label>关联行程计划：</label>
      <select id="album-plan">
        <option value="">无关联</option>
        ${plans.map(p => '<option value="' + p.id + '">' + escapeHtml(p.title) + '</option>').join('')}
      </select>
    </div>
    <div class="form-group">
      <label>关联账单：</label>
      <select id="album-transaction">
        <option value="">无关联</option>
        ${transactions.map(t => '<option value="' + t.id + '">' + escapeHtml(t.description) + ' (' + formatCurrency(t.amount) + ')</option>').join('')}
      </select>
    </div>
    <div class="form-group">
      <label><input type="checkbox" id="album-private"> 设为私密相册（需密码查看）</label>
    </div>
    <div class="form-actions">
      <button class="btn-secondary" onclick="closeGlobalModal()">取消</button>
      <button class="btn-primary" onclick="createAlbum()">创建相册</button>
    </div>
  `;
  showGlobalModal(html);
}

function createAlbum() {
  const title = document.getElementById('album-title').value.trim();
  if (!title) { showToast('请输入相册名称 📸'); return; }

  const album = {
    id: genId(),
    title,
    type: document.getElementById('album-type').value,
    date: document.getElementById('album-date').value,
    planId: document.getElementById('album-plan').value || null,
    transactionId: document.getElementById('album-transaction').value || null,
    isPrivate: document.getElementById('album-private').checked,
    photos: [],
    createdAt: new Date().toISOString()
  };

  const albums = getData('albums', []);
  albums.push(album);
  safeSetAlbums(albums);
  closeGlobalModal();
  renderAlbums();
  showToast('相册创建成功！📸');
}

function viewAlbum(id) {
  const albums = getData('albums', []);
  const album = albums.find(a => a.id === id);
  if (!album) return;

  if (album.isPrivate) {
    const pwd = prompt('此相册为私密相册，请输入查看密码：');
    const storedPwd = getData('password', '0623');
    if (pwd !== storedPwd) {
      showToast('密码错误 🔒');
      return;
    }
  }

  currentViewerAlbumId = id;

  let html = '<div class="album-modal-content">';
  html += '<h3>' + escapeHtml(album.title) + '</h3>';
  html += '<p style="color:#6b7280;font-size:13px;">' + album.date + ' · ' + album.type + '</p>';

  // 照片网格
  html += '<div class="album-photo-grid" id="album-photo-grid-' + id + '">';
  
  // 已有照片
  (album.photos || []).forEach((p, idx) => {
    if (p.dataUrl) {
      html += '<div class="album-photo has-img" onclick="openPhotoViewer(\'' + id + '\',' + idx + ')">';
      html += '<img src="' + p.dataUrl + '" alt="照片">';
      html += '<span class="photo-del-btn" onclick="event.stopPropagation();deletePhoto(\'' + id + '\',' + idx + ')">✕</span>';
      html += '</div>';
    } else {
      html += '<div class="album-photo">' + (p.emoji || '🖼️') + '</div>';
    }
  });

  // 上传按钮（始终显示）
  html += '<div class="album-photo album-upload-btn" onclick="triggerPhotoUpload(\'' + id + '\')">';
  html += '<span class="upload-plus">+</span>';
  html += '<span class="upload-label">上传照片</span>';
  html += '</div>';

  html += '</div>';

  if (album.planId || album.transactionId) {
    html += '<div style="margin-top:16px;display:flex;gap:8px;">';
    if (album.planId) html += '<button class="btn-secondary" onclick="closeGlobalModal();switchPage(\'plans\')">📋 查看行程计划</button>';
    if (album.transactionId) html += '<button class="btn-secondary" onclick="closeGlobalModal();switchPage(\'finance\')">💰 查看账单</button>';
    html += '</div>';
  }

  html += '<div style="margin-top:16px;"><button class="btn-secondary" style="color:#ef4444;" onclick="deleteItem(\'albums\',\'' + album.id + '\');closeGlobalModal();renderAlbums();">🗑️ 删除相册</button></div>';
  html += '</div>';

  showGlobalModal(html);
}

function triggerPhotoUpload(albumId) {
  currentUploadAlbumId = albumId;
  document.getElementById('photo-upload-input').value = '';
  document.getElementById('photo-upload-input').click();
}

function showQuickUpload() {
  const albums = getData('albums', []);
  if (albums.length === 0) {
    showToast('请先创建相册 📸');
    return;
  }

  let html = '<h3>📸 快速上传照片</h3>';
  html += '<p style="color:#6b7280;font-size:13px;margin-bottom:12px;">选择目标相册，然后上传照片</p>';
  html += '<div class="form-group"><label>目标相册：</label><select id="quick-upload-album">';
  albums.forEach(a => {
    html += '<option value="' + a.id + '">' + escapeHtml(a.title) + ' (' + (a.photos ? a.photos.length : 0) + '张)</option>';
  });
  html += '</select></div>';
  html += '<div class="form-actions">';
  html += '<button class="btn-secondary" onclick="closeGlobalModal()">取消</button>';
  html += '<button class="btn-primary" onclick="startQuickUpload()">选择照片</button>';
  html += '</div>';

  showGlobalModal(html);
}

function startQuickUpload() {
  const albumId = document.getElementById('quick-upload-album').value;
  // 直接触发上传，不关闭弹窗不延迟，保证用户手势链不断
  triggerPhotoUpload(albumId);
}

async function handlePhotoUpload(event) {
  var files = event.target.files;
  if (!files || files.length === 0) return;

  var albumId = currentUploadAlbumId;
  if (!albumId) {
    showToast('请先选择相册 📸');
    return;
  }

  // 存储空间预检
  if (!checkStorageBeforeUpload(files.length)) {
    currentUploadAlbumId = null;
    return;
  }

  var albums = getData('albums', []);
  var album = albums.find(function(a) { return a.id === albumId; });
  if (!album) return;
  if (!album.photos) album.photos = [];

  showToast('正在压缩上传 ' + files.length + ' 张照片...');

  var successCount = 0;
  var failCount = 0;

  for (var i = 0; i < files.length; i++) {
    var file = files[i];
    if (!file.type || !file.type.startsWith('image/')) { failCount++; continue; }
    try {
      // Canvas 压缩 → JPEG Blob（最大 800px，质量 0.65）
      var compressedBlob = await compressImageBlob(file, 800, 0.65);
      // Blob → base64 Data URL
      var dataUrl = await blobToBase64(compressedBlob);
      album.photos.push({
        dataUrl: dataUrl,
        addedAt: new Date().toISOString(),
        fileName: file.name
      });
      successCount++;
    } catch(e) {
      console.error('压缩照片失败:', file.name, e);
      failCount++;
    }
  }

  finishUpload(albums, albumId, successCount, failCount);
}

// Canvas 压缩图片为 JPEG Blob（返回 Promise）
function compressImageBlob(file, maxW, quality) {
  maxW = maxW || 800;
  quality = quality || 0.65;
  return new Promise(function(resolve, reject) {
    var img = new Image();
    var url = URL.createObjectURL(file);
    img.onload = function() {
      URL.revokeObjectURL(url);
      var w = img.width, h = img.height;
      if (w > maxW) { h = Math.round(h * maxW / w); w = maxW; }
      var canvas = document.createElement('canvas');
      canvas.width = w; canvas.height = h;
      var ctx = canvas.getContext('2d');
      ctx.drawImage(img, 0, 0, w, h);
      canvas.toBlob(function(blob) {
        if (blob) resolve(blob);
        else reject(new Error('canvas toBlob failed'));
      }, 'image/jpeg', quality);
    };
    img.onerror = function() { URL.revokeObjectURL(url); reject(new Error('image load failed')); };
    img.src = url;
  });
}

// 文件 → base64 Data URL（用于小型数据如语音）
function blobToBase64(blob) {
  return new Promise(function(resolve, reject) {
    var reader = new FileReader();
    reader.onloadend = function() { resolve(reader.result); };
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}

function finishUpload(albums, albumId, successCount, failCount) {
  var saved = safeSetAlbums(albums);
  currentUploadAlbumId = null;
  renderAlbums();
  // 如果相册弹窗开着，刷新它
  if (!document.getElementById('global-modal').classList.contains('hidden')) {
    viewAlbum(albumId);
  }
  if (saved) {
    var msg = '照片上传完成！📸 成功 ' + successCount + ' 张';
    if (failCount > 0) msg += '，失败 ' + failCount + ' 张';
    showToast(msg);
  } else {
    showToast('⚠️ 存储空间已满！请删除旧照片后重试');
  }
  updateStorageBar();
}

// ==================== 照片查看器 ====================
function openPhotoViewer(albumId, idx) {
  const albums = getData('albums', []);
  const album = albums.find(a => a.id === albumId);
  if (!album || !album.photos || !album.photos[idx] || !album.photos[idx].dataUrl) return;

  currentViewerAlbumId = albumId;
  currentViewerPhotoIdx = idx;

  const viewer = document.getElementById('photo-viewer');
  const img = document.getElementById('photo-viewer-img');
  img.src = album.photos[idx].dataUrl;
  viewer.classList.remove('hidden');

  updateViewerNav(album);
}

function updateViewerNav(album) {
  const prev = document.querySelector('.photo-viewer-prev');
  const next = document.querySelector('.photo-viewer-next');
  const photos = (album.photos || []).filter(p => p.dataUrl);
  
  prev.style.display = (currentViewerPhotoIdx > 0) ? 'flex' : 'none';
  next.style.display = (currentViewerPhotoIdx < photos.length - 1) ? 'flex' : 'none';
}

function photoViewerNav(direction) {
  const albums = getData('albums', []);
  const album = albums.find(a => a.id === currentViewerAlbumId);
  if (!album || !album.photos) return;

  const photos = album.photos.filter(p => p.dataUrl);
  const newIdx = currentViewerPhotoIdx + direction;
  if (newIdx < 0 || newIdx >= photos.length) return;

  // 找到实际索引
  const actualIdx = album.photos.indexOf(photos[newIdx]);
  currentViewerPhotoIdx = actualIdx;

  document.getElementById('photo-viewer-img').src = album.photos[actualIdx].dataUrl;
  updateViewerNav(album);
}

function closePhotoViewer() {
  document.getElementById('photo-viewer').classList.add('hidden');
  currentViewerAlbumId = null;
  currentViewerPhotoIdx = -1;
}

function deleteCurrentPhoto() {
  if (!currentViewerAlbumId || currentViewerPhotoIdx < 0) return;
  if (!confirm('确定删除这张照片吗？')) return;

  const albums = getData('albums', []);
  const album = albums.find(a => a.id === currentViewerAlbumId);
  if (!album || !album.photos) return;

  album.photos.splice(currentViewerPhotoIdx, 1);
  safeSetAlbums(albums);

  const remaining = album.photos.filter(p => p.dataUrl);
  if (remaining.length === 0) {
    closePhotoViewer();
  } else {
    currentViewerPhotoIdx = Math.min(currentViewerPhotoIdx, remaining.length - 1);
    const actualIdx = album.photos.indexOf(remaining[currentViewerPhotoIdx]);
    currentViewerPhotoIdx = actualIdx;
    document.getElementById('photo-viewer-img').src = album.photos[actualIdx].dataUrl;
    updateViewerNav(album);
  }
  renderAlbums();
  showToast('照片已删除 🗑️');
}

function deletePhoto(albumId, idx) {
  if (!confirm('确定删除这张照片吗？')) return;
  const albums = getData('albums', []);
  const album = albums.find(a => a.id === albumId);
  if (!album || !album.photos) return;

  album.photos.splice(idx, 1);
  safeSetAlbums(albums);
  viewAlbum(albumId);
  renderAlbums();
  updateStorageBar();
  showToast('照片已删除 🗑️');
}

function closeAlbumModal() {
  document.getElementById('album-modal').classList.add('hidden');
}

function generateYearReview() {
  const year = new Date().getFullYear();
  const albums = getData('albums', []);
  const yearAlbums = albums.filter(a => a.date && a.date.startsWith(String(year)));

  const reviewAlbum = {
    id: genId(),
    title: year + '年度恋爱回顾相册',
    type: 'anniversary',
    date: year + '-12-31',
    isPrivate: false,
    photos: [],
    createdAt: new Date().toISOString()
  };

  yearAlbums.forEach(a => {
    if (a.photos) reviewAlbum.photos.push(...a.photos);
  });

  if (reviewAlbum.photos.length === 0) {
    showToast('本年度还没有照片，先去创建相册吧 📸');
    return;
  }

  const albums2 = getData('albums', []);
  albums2.push(reviewAlbum);
  safeSetAlbums(albums2);
  renderAlbums();
  showToast('年度回顾相册已生成！📖 共收录 ' + reviewAlbum.photos.length + ' 张照片');
}

// ==================== 板块3：未来约会项目打卡库 ====================
function renderDateProjects() {
  const projects = getData('date_projects', []);
  let filtered = projects;
  if (currentFilter.dates !== 'all') {
    filtered = projects.filter(p => p.tag === currentFilter.dates);
  }

  // 未打卡排前面，按票数排序
  filtered.sort((a, b) => {
    if (a.checked !== b.checked) return a.checked ? 1 : -1;
    return (b.votes || 0) - (a.votes || 0);
  });

  const list = document.getElementById('date-list');
  if (filtered.length === 0) {
    list.innerHTML = '<p style="text-align:center;color:#9ca3af;padding:40px;">还没有约会项目，快来添加吧 🎯</p>';
    return;
  }

  list.innerHTML = filtered.map(p => {
    const tagLabels = { short: '🚗 单日短途（路费自理）', long: '🏨 2天1晚+（交通AA）', special: '🎁 全包特例' };
    const tagClass = p.tag;
    const votes = p.votes || {};
    const shushuVoted = votes.shushu || false;
    const bibiVoted = votes.bibi || false;
    const voteCount = (shushuVoted ? 1 : 0) + (bibiVoted ? 1 : 0);

    let html = '<div class="date-card' + (p.checked ? ' checked' : '') + '">';
    html += '<div class="date-header">';
    html += '<span class="date-title">' + escapeHtml(p.title) + '</span>';
    html += '<span class="date-tag ' + tagClass + '">' + tagLabels[p.tag] + '</span>';
    html += '</div>';
    html += '<div class="date-info">📍 ' + escapeHtml(p.location || '待定') + ' · 💰 预估 ' + formatCurrency(p.estimatedBudget || 0) + '</div>';
    if (p.actualCost !== undefined) {
      html += '<div class="date-info">💳 实际花费 ' + formatCurrency(p.actualCost) + (p.actualCost > p.estimatedBudget ? ' ⚠️ 超预算' : ' ✅ 在预算内') + '</div>';
    }
    html += '<div class="date-info">📅 计划日期：' + (p.plannedDate || '待定') + '</div>';

    html += '<div class="date-votes">';
    html += '<span style="font-size:12px;">票数：' + voteCount + '/2</span>';
    html += '<button class="vote-btn' + (shushuVoted ? ' voted' : '') + '" onclick="voteDate(\'' + p.id + '\',\'shushu\')">🐹 鼠鼠' + (shushuVoted ? ' ✓' : '') + '</button>';
    html += '<button class="vote-btn' + (bibiVoted ? ' voted' : '') + '" onclick="voteDate(\'' + p.id + '\',\'bibi\')">🐱 笔笔' + (bibiVoted ? ' ✓' : '') + '</button>';
    html += '</div>';

    if (!p.checked) {
      html += '<button class="checkin-date-btn" onclick="checkinDate(\'' + p.id + '\')">✅ 完成打卡</button>';
    } else {
      html += '<div style="margin-top:8px;color:#059669;font-weight:600;">🎉 已打卡完成！</div>';
    }

    html += '<div style="margin-top:6px;">';
    html += '<button class="btn-secondary" style="font-size:11px;padding:4px 10px;" onclick="editDateProject(\'' + p.id + '\')">✏️ 编辑</button>';
    html += '<button class="btn-secondary" style="font-size:11px;padding:4px 10px;color:#ef4444;" onclick="deleteItem(\'date_projects\',\'' + p.id + '\');renderDateProjects();">🗑️</button>';
    html += '</div>';

    html += '</div>';
    return html;
  }).join('');
}

function filterDates(cat) {
  currentFilter.dates = cat;
  document.querySelectorAll('#page-dates .tab').forEach(t => t.classList.remove('active'));
  const tab = document.querySelector('#page-dates .tab[data-tab="' + cat + '-date"]');
  if (tab) tab.classList.add('active');
  renderDateProjects();
}

function showCreateDate() {
  const html = `
    <h3>➕ 添加约会项目</h3>
    <div class="form-group">
      <label>项目名称：</label>
      <input type="text" id="date-title" placeholder="例如：去迪士尼乐园">
    </div>
    <div class="form-group">
      <label>地点：</label>
      <input type="text" id="date-location" placeholder="约会地点">
    </div>
    <div class="form-group">
      <label>类型标签：</label>
      <select id="date-tag">
        <option value="short">🚗 单日短途（路费自理）</option>
        <option value="long">🏨 2天1晚及以上（交通公摊AA）</option>
        <option value="special">🎁 提前约定全包特例</option>
      </select>
    </div>
    <div class="form-group">
      <label>计划日期：</label>
      <input type="date" id="date-planned">
    </div>
    <div class="form-group">
      <label>预估预算（元）：</label>
      <input type="number" id="date-budget" placeholder="0" step="0.01">
    </div>
    <div class="form-actions">
      <button class="btn-secondary" onclick="closeGlobalModal()">取消</button>
      <button class="btn-primary" onclick="createDateProject()">添加</button>
    </div>
  `;
  showGlobalModal(html);
}

function createDateProject() {
  const title = document.getElementById('date-title').value.trim();
  if (!title) { showToast('请输入项目名称 🎯'); return; }

  const project = {
    id: genId(),
    title,
    location: document.getElementById('date-location').value.trim(),
    tag: document.getElementById('date-tag').value,
    plannedDate: document.getElementById('date-planned').value,
    estimatedBudget: parseFloat(document.getElementById('date-budget').value) || 0,
    actualCost: undefined,
    votes: { shushu: false, bibi: false },
    checked: false,
    createdAt: new Date().toISOString()
  };

  const projects = getData('date_projects', []);
  projects.push(project);
  setData('date_projects', projects);
  closeGlobalModal();
  renderDateProjects();
  showToast('约会项目已添加！🎯');
}

function editDateProject(id) {
  const projects = getData('date_projects', []);
  const p = projects.find(x => x.id === id);
  if (!p) return;

  const html = `
    <h3>✏️ 编辑约会项目</h3>
    <div class="form-group">
      <label>实际花费（元）：</label>
      <input type="number" id="edit-date-cost" placeholder="实际花费" step="0.01" value="${p.actualCost || ''}">
    </div>
    <div class="form-actions">
      <button class="btn-secondary" onclick="closeGlobalModal()">取消</button>
      <button class="btn-primary" onclick="saveDateEdit('${id}')">保存</button>
    </div>
  `;
  showGlobalModal(html);
}

function saveDateEdit(id) {
  const projects = getData('date_projects', []);
  const p = projects.find(x => x.id === id);
  if (p) {
    p.actualCost = parseFloat(document.getElementById('edit-date-cost').value) || 0;
    setData('date_projects', projects);
  }
  closeGlobalModal();
  renderDateProjects();
  showToast('已更新！✅');
}

function voteDate(id, user) {
  const projects = getData('date_projects', []);
  const p = projects.find(x => x.id === id);
  if (p) {
    if (!p.votes) p.votes = { shushu: false, bibi: false };
    p.votes[user] = !p.votes[user];
    setData('date_projects', projects);
    renderDateProjects();
    showToast((p.votes[user] ? '已投票' : '已取消投票') + ' ✅');
  }
}

function checkinDate(id) {
  if (!confirm('确认完成此约会项目的打卡吗？打卡后将自动归档到相册和账单系统。')) return;

  const projects = getData('date_projects', []);
  const p = projects.find(x => x.id === id);
  if (p) {
    p.checked = true;
    p.checkedAt = new Date().toISOString();

    // 自动创建相册
    const album = {
      id: genId(),
      title: '🎯 ' + p.title,
      type: p.tag === 'long' ? 'travel' : 'daily',
      date: formatDate(new Date()),
      planId: null,
      transactionId: null,
      isPrivate: false,
      photos: [{ emoji: '✅', addedAt: new Date().toISOString() }],
      createdAt: new Date().toISOString()
    };
    const albums = getData('albums', []);
    albums.push(album);
    safeSetAlbums(albums);

    // 如果填写了实际花费，自动创建账单
    if (p.actualCost !== undefined && p.actualCost > 0) {
      const trans = {
        id: genId(),
        description: p.title + ' - 实际花费',
        amount: p.actualCost,
        category: '游玩',
        type: 'shared',
        date: formatDate(new Date()),
        tag: p.tag,
        createdAt: new Date().toISOString()
      };
      const transactions = getData('transactions', []);
      transactions.push(trans);
      setData('transactions', transactions);
    }

    setData('date_projects', projects);
    renderDateProjects();
    showToast('🎉 打卡完成！已自动归档到相册和账单系统');
  }
}

// ==================== 板块4：约会经济预算总台账 ====================
function renderFinance() {
  const transactions = getData('transactions', []);
  let filtered = transactions;
  if (currentFilter.transactions !== 'all') {
    filtered = transactions.filter(t => t.type === currentFilter.transactions);
  }

  // 摘要
  const totalShared = transactions.filter(t => t.type === 'shared').reduce((s, t) => s + t.amount, 0);
  const totalPersonal = transactions.filter(t => t.type === 'personal').reduce((s, t) => s + t.amount, 0);
  const fundBalance = getData('fund_balance', 0);

  document.getElementById('finance-summary').innerHTML = `
    <div class="summary-card shared">
      <div class="summary-amount">${formatCurrency(totalShared)}</div>
      <div class="summary-label">公摊消费总额</div>
    </div>
    <div class="summary-card personal">
      <div class="summary-amount">${formatCurrency(totalPersonal)}</div>
      <div class="summary-label">个人消费总额</div>
    </div>
    <div class="summary-card fund">
      <div class="summary-amount">${formatCurrency(fundBalance)}</div>
      <div class="summary-label">小金库余额</div>
    </div>
  `;

  // 交通费核算
  renderTransportSummary(transactions);

  // 账单列表
  filtered.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  const list = document.getElementById('transaction-list');
  if (filtered.length === 0) {
    list.innerHTML = '<p style="text-align:center;color:#9ca3af;padding:40px;">还没有账单记录 💰</p>';
    return;
  }

  list.innerHTML = filtered.map(t => `
    <div class="transaction-card ${t.type}">
      <div class="trans-left">
        <strong>${escapeHtml(t.description)}</strong>
        <span class="trans-category">${t.category} · ${t.date} · ${t.type === 'shared' ? '公摊' : t.type === 'fund' ? '小金库' : '个人'}</span>
      </div>
      <div class="trans-amount">${t.type === 'fund' ? (t.isDeposit ? '+' : '-') : ''}${formatCurrency(t.amount)}</div>
    </div>
  `).join('');
}

function renderTransportSummary(transactions) {
  // 根据标签计算交通费
  const shortDates = transactions.filter(t => t.category === '交通' && t.tag === 'short');
  const longDates = transactions.filter(t => t.category === '交通' && t.tag === 'long');
  const totalTransport = transactions.filter(t => t.category === '交通').reduce((s, t) => s + t.amount, 0);

  document.getElementById('transport-summary').innerHTML = `
    <h4>🚗 本月交通费核算</h4>
    <div>单日短途路费（各自承担）：${formatCurrency(shortDates.reduce((s, t) => s + t.amount, 0))}</div>
    <div>2天+交通费（公摊AA）：${formatCurrency(longDates.reduce((s, t) => s + t.amount, 0))} → 每人 ${formatCurrency(longDates.reduce((s, t) => s + t.amount, 0) / 2)}</div>
    <div style="font-weight:700;margin-top:4px;">交通总计：${formatCurrency(totalTransport)}</div>
  `;
}

function filterTransactions(cat) {
  currentFilter.transactions = cat;
  document.querySelectorAll('#page-finance .tab').forEach(t => t.classList.remove('active'));
  const tab = document.querySelector('#page-finance .tab[data-tab="' + cat + '-trans"]');
  if (tab) tab.classList.add('active');
  renderFinance();
}

function showCreateTransaction() {
  const html = `
    <h3>💳 记录消费</h3>
    <div class="form-group">
      <label>消费描述：</label>
      <input type="text" id="trans-desc" placeholder="例如：午餐、电影票、高铁票">
    </div>
    <div class="form-group">
      <label>金额（元）：</label>
      <input type="number" id="trans-amount" placeholder="0" step="0.01">
    </div>
    <div class="form-group">
      <label>类别：</label>
      <select id="trans-category">
        <option value="餐饮">🍽️ 餐饮</option>
        <option value="游玩">🎢 游玩</option>
        <option value="交通">🚗 交通</option>
        <option value="住宿">🏨 住宿</option>
        <option value="纪念品">🎁 纪念品</option>
        <option value="其他">📦 其他</option>
      </select>
    </div>
    <div class="form-group">
      <label>消费类型：</label>
      <select id="trans-type">
        <option value="shared">👥 公摊消费</option>
        <option value="personal">👤 个人自费</option>
      </select>
    </div>
    <div class="form-group">
      <label>关联约会标签（用于交通核算）：</label>
      <select id="trans-tag">
        <option value="">不关联</option>
        <option value="short">🚗 单日短途</option>
        <option value="long">🏨 2天1晚+</option>
        <option value="special">🎁 全包特例</option>
      </select>
    </div>
    <div class="form-group">
      <label>日期：</label>
      <input type="date" id="trans-date" value="${getToday()}">
    </div>
    <div class="form-actions">
      <button class="btn-secondary" onclick="closeGlobalModal()">取消</button>
      <button class="btn-primary" onclick="createTransaction()">记录</button>
    </div>
  `;
  showGlobalModal(html);
}

function createTransaction() {
  const desc = document.getElementById('trans-desc').value.trim();
  const amount = parseFloat(document.getElementById('trans-amount').value);
  if (!desc || isNaN(amount) || amount <= 0) { showToast('请填写完整的消费信息 💰'); return; }

  const trans = {
    id: genId(),
    description: desc,
    amount,
    category: document.getElementById('trans-category').value,
    type: document.getElementById('trans-type').value,
    tag: document.getElementById('trans-tag').value || null,
    date: document.getElementById('trans-date').value,
    createdAt: new Date().toISOString()
  };

  const transactions = getData('transactions', []);
  transactions.push(trans);
  setData('transactions', transactions);
  closeGlobalModal();
  renderFinance();
  showToast('消费已记录！💰');
}

function showFundTransaction() {
  const balance = getData('fund_balance', 0);
  const html = `
    <h3>🏦 情侣共同小金库</h3>
    <p style="font-size:24px;font-weight:800;color:#059669;text-align:center;margin:16px 0;">余额：${formatCurrency(balance)}</p>
    <div class="form-group">
      <label>操作类型：</label>
      <select id="fund-type">
        <option value="deposit">💰 存入</option>
        <option value="withdraw">💸 取出</option>
      </select>
    </div>
    <div class="form-group">
      <label>金额（元）：</label>
      <input type="number" id="fund-amount" placeholder="0" step="0.01">
    </div>
    <div class="form-group">
      <label>备注：</label>
      <input type="text" id="fund-note" placeholder="例如：纪念日基金、旅行基金">
    </div>
    <div class="form-actions">
      <button class="btn-secondary" onclick="closeGlobalModal()">取消</button>
      <button class="btn-primary" onclick="doFundTransaction()">确认</button>
    </div>
  `;
  showGlobalModal(html);
}

function doFundTransaction() {
  const type = document.getElementById('fund-type').value;
  const amount = parseFloat(document.getElementById('fund-amount').value);
  const note = document.getElementById('fund-note').value.trim();
  if (isNaN(amount) || amount <= 0) { showToast('请输入有效金额 💰'); return; }

  let balance = getData('fund_balance', 0);
  if (type === 'withdraw' && amount > balance) {
    showToast('余额不足！💸');
    return;
  }

  balance = type === 'deposit' ? balance + amount : balance - amount;
  setData('fund_balance', balance);

  const trans = {
    id: genId(),
    description: note || (type === 'deposit' ? '小金库存入' : '小金库取出'),
    amount,
    category: '小金库',
    type: 'fund',
    isDeposit: type === 'deposit',
    date: getToday(),
    createdAt: new Date().toISOString()
  };
  const transactions = getData('transactions', []);
  transactions.push(trans);
  setData('transactions', transactions);

  closeGlobalModal();
  renderFinance();
  showToast('小金库操作完成！🏦');
}

function showMonthlyReport() {
  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0);
  const monthStr = now.getFullYear() + '年' + (now.getMonth() + 1) + '月';

  const transactions = getData('transactions', []);
  const monthTrans = transactions.filter(t => {
    const d = new Date(t.date);
    return d >= monthStart && d <= monthEnd;
  });

  const totalShared = monthTrans.filter(t => t.type === 'shared').reduce((s, t) => s + t.amount, 0);
  const totalPersonal = monthTrans.filter(t => t.type === 'personal').reduce((s, t) => s + t.amount, 0);
  const totalAll = totalShared + totalPersonal;

  // 按类别统计
  const byCategory = {};
  monthTrans.filter(t => t.type === 'shared').forEach(t => {
    byCategory[t.category] = (byCategory[t.category] || 0) + t.amount;
  });

  let html = '<h3>📊 ' + monthStr + ' 财务复盘报表</h3>';

  html += '<div class="report-section">';
  html += '<h3>总览</h3>';
  html += '<div class="report-row"><span>公摊消费总额</span><span class="report-val">' + formatCurrency(totalShared) + '</span></div>';
  html += '<div class="report-row"><span>个人消费总额</span><span class="report-val">' + formatCurrency(totalPersonal) + '</span></div>';
  html += '<div class="report-row"><span>合计</span><span class="report-val">' + formatCurrency(totalAll) + '</span></div>';
  html += '<div class="report-row"><span>小金库余额</span><span class="report-val">' + formatCurrency(getData('fund_balance', 0)) + '</span></div>';
  html += '</div>';

  html += '<div class="report-section">';
  html += '<h3>公摊消费分类占比</h3>';
  Object.entries(byCategory).sort((a, b) => b[1] - a[1]).forEach(([cat, amt]) => {
    const pct = totalShared > 0 ? (amt / totalShared * 100) : 0;
    html += '<div class="report-row"><span>' + cat + '</span><span class="report-val">' + formatCurrency(amt) + ' (' + pct.toFixed(1) + '%)</span></div>';
    html += '<div class="report-chart-bar"><div class="report-chart-fill" style="width:' + pct + '%"></div></div>';
  });
  html += '</div>';

  html += '<div class="report-section">';
  html += '<h3>本月账单明细</h3>';
  if (monthTrans.length === 0) {
    html += '<p style="color:#9ca3af;">本月暂无消费记录</p>';
  } else {
    monthTrans.forEach(t => {
      html += '<div class="report-row"><span>' + t.date + ' ' + escapeHtml(t.description) + '</span><span class="report-val">' + formatCurrency(t.amount) + '</span></div>';
    });
  }
  html += '</div>';

  html += '<button class="btn-primary" onclick="closeGlobalModal()">关闭</button>';

  showGlobalModal(html);
}

function closeReportModal() {
  document.getElementById('report-modal').classList.add('hidden');
}

// ==================== 板块5：标准化恋爱约会计划表 ====================
function renderPlans() {
  const plans = getData('plans', []);
  const list = document.getElementById('plan-list');
  if (plans.length === 0) {
    list.innerHTML = '<p style="text-align:center;color:#9ca3af;padding:40px;">还没有约会计划 📋</p>';
    return;
  }

  list.innerHTML = plans.map(p => `
    <div class="plan-card">
      <h4>📋 ${escapeHtml(p.title)}</h4>
      <div class="plan-details">
        <span>📅 日期：${p.date || '待定'}</span>
        <span>🏷️ 类型：${p.type || '未指定'}</span>
        <span>⏰ 时间表：${p.schedule || '待填写'}</span>
        <span>🚗 交通方案：${p.transport || '待填写'}</span>
        <span>💰 费用明细：${p.costDetail || '待填写'}</span>
        <span>📝 特殊约定：${p.specialNote || '无'}</span>
        <span>📋 复盘备注：${p.reviewNote || '待复盘'}</span>
      </div>
      <div style="margin-top:10px;display:flex;gap:6px;">
        <button class="btn-secondary" style="font-size:11px;" onclick="editPlan('${p.id}')">✏️ 编辑</button>
        <button class="btn-secondary" style="font-size:11px;color:#ef4444;" onclick="deleteItem('plans','${p.id}');renderPlans();">🗑️</button>
      </div>
    </div>
  `).join('');
}

function showCreatePlan() {
  const html = `
    <h3>📋 新建约会计划</h3>
    <div class="form-group">
      <label>约会名称：</label>
      <input type="text" id="plan-title" placeholder="例如：周末公园野餐">
    </div>
    <div class="form-group">
      <label>日期：</label>
      <input type="date" id="plan-date" value="${getToday()}">
    </div>
    <div class="form-group">
      <label>行程类型：</label>
      <select id="plan-type">
        <option value="单日短途">🚗 单日短途</option>
        <option value="2天1晚+">🏨 2天1晚及以上</option>
        <option value="全包特例">🎁 全包特例</option>
      </select>
    </div>
    <div class="form-group">
      <label>时间表：</label>
      <textarea id="plan-schedule" rows="2" placeholder="例如：10:00 见面 → 12:00 午餐 → 14:00 看电影..."></textarea>
    </div>
    <div class="form-group">
      <label>交通方案：</label>
      <input type="text" id="plan-transport" placeholder="例如：地铁2号线到XX站">
    </div>
    <div class="form-group">
      <label>费用明细：</label>
      <textarea id="plan-cost" rows="2" placeholder="例如：午餐 ¥200 / 门票 ¥100 / 交通 ¥50..."></textarea>
    </div>
    <div class="form-group">
      <label>特殊约定：</label>
      <input type="text" id="plan-special" placeholder="例如：AA制 / 鼠鼠请客...">
    </div>
    <div class="form-actions">
      <button class="btn-secondary" onclick="closeGlobalModal()">取消</button>
      <button class="btn-primary" onclick="createPlan()">创建计划</button>
    </div>
  `;
  showGlobalModal(html);
}

function createPlan() {
  const title = document.getElementById('plan-title').value.trim();
  if (!title) { showToast('请输入约会名称 📋'); return; }

  const plan = {
    id: genId(),
    title,
    date: document.getElementById('plan-date').value,
    type: document.getElementById('plan-type').value,
    schedule: document.getElementById('plan-schedule').value.trim(),
    transport: document.getElementById('plan-transport').value.trim(),
    costDetail: document.getElementById('plan-cost').value.trim(),
    specialNote: document.getElementById('plan-special').value.trim(),
    reviewNote: '',
    createdAt: new Date().toISOString()
  };

  const plans = getData('plans', []);
  plans.push(plan);
  setData('plans', plans);
  closeGlobalModal();
  renderPlans();
  showToast('约会计划已创建！📋');
}

function editPlan(id) {
  const plans = getData('plans', []);
  const p = plans.find(x => x.id === id);
  if (!p) return;

  const html = `
    <h3>✏️ 编辑约会计划</h3>
    <div class="form-group">
      <label>复盘备注：</label>
      <textarea id="edit-plan-review" rows="3">${p.reviewNote || ''}</textarea>
    </div>
    <div class="form-actions">
      <button class="btn-secondary" onclick="closeGlobalModal()">取消</button>
      <button class="btn-primary" onclick="savePlanEdit('${id}')">保存</button>
    </div>
  `;
  showGlobalModal(html);
}

function savePlanEdit(id) {
  const plans = getData('plans', []);
  const p = plans.find(x => x.id === id);
  if (p) {
    p.reviewNote = document.getElementById('edit-plan-review').value.trim();
    setData('plans', plans);
  }
  closeGlobalModal();
  renderPlans();
  showToast('复盘备注已保存！📋');
}

// ==================== 板块6-1：纪念日倒计时 ====================
function renderCountdowns() {
  const countdowns = getData('countdowns', []);
  const grid = document.getElementById('countdown-grid');

  countdowns.sort((a, b) => getDaysUntil(a.date) - getDaysUntil(b.date));

  grid.innerHTML = countdowns.map(c => {
    const daysLeft = getDaysUntil(c.date);
    const isUrgent = daysLeft <= 7 && daysLeft > 0;
    const isPast = daysLeft < 0;
    // 计算下次发生的实际日期
    const today = new Date(getToday());
    const origDate = new Date(c.date + 'T00:00:00');
    let nextDate = new Date(today.getFullYear(), origDate.getMonth(), origDate.getDate());
    if (nextDate < today) nextDate = new Date(today.getFullYear() + 1, origDate.getMonth(), origDate.getDate());
    const displayDate = nextDate.getFullYear() + '-' + String(nextDate.getMonth() + 1).padStart(2, '0') + '-' + String(nextDate.getDate()).padStart(2, '0');
    return `
      <div class="countdown-card${isUrgent ? ' urgent' : ''}">
        <div class="cd-icon">${c.icon}</div>
        <div class="cd-title">${escapeHtml(c.title)}</div>
        <div class="cd-date">📅 下次：${displayDate}</div>
        <div class="cd-days">${isPast ? '已过' : (daysLeft === 0 ? '就是今天！🎉' : daysLeft + ' 天')}</div>
        <div class="cd-gift">🎁 礼物预算：${formatCurrency(c.giftBudget || 0)}</div>
        ${daysLeft <= 3 && daysLeft > 0 ? '<div style="color:#ef4444;font-size:12px;font-weight:700;">⚠️ 临近提醒！</div>' : ''}
        <button class="btn-secondary" style="font-size:11px;margin-top:6px;" onclick="deleteItem('countdowns','${c.id}');renderCountdowns();">🗑️</button>
      </div>`;
  }).join('');
}

function showCreateCountdown() {
  const html = `
    <h3>➕ 添加纪念日</h3>
    <div class="form-group">
      <label>名称：</label>
      <input type="text" id="cd-title" placeholder="例如：在一起100天">
    </div>
    <div class="form-group">
      <label>日期：</label>
      <input type="date" id="cd-date">
    </div>
    <div class="form-group">
      <label>图标：</label>
      <select id="cd-icon">
        <option value="🎂">🎂 生日</option>
        <option value="💕">💕 纪念日</option>
        <option value="🌟">🌟 特殊日子</option>
        <option value="🎄">🎄 节日</option>
        <option value="✈️">✈️ 旅行</option>
        <option value="🎁">🎁 礼物</option>
      </select>
    </div>
    <div class="form-group">
      <label>礼物预算（元）：</label>
      <input type="number" id="cd-gift" placeholder="0" step="0.01">
    </div>
    <div class="form-actions">
      <button class="btn-secondary" onclick="closeGlobalModal()">取消</button>
      <button class="btn-primary" onclick="createCountdown()">添加</button>
    </div>
  `;
  showGlobalModal(html);
}

function createCountdown() {
  const title = document.getElementById('cd-title').value.trim();
  const date = document.getElementById('cd-date').value;
  if (!title || !date) { showToast('请填写完整信息 ⏳'); return; }

  const cd = {
    id: genId(),
    title,
    date,
    icon: document.getElementById('cd-icon').value,
    giftBudget: parseFloat(document.getElementById('cd-gift').value) || 0,
    createdAt: new Date().toISOString()
  };

  const countdowns = getData('countdowns', []);
  countdowns.push(cd);
  setData('countdowns', countdowns);
  closeGlobalModal();
  renderCountdowns();
  showToast('纪念日已添加！⏳');
}

// ==================== 板块6-2：情侣公约档案库 ====================
function renderConventions() {
  const conventions = getData('conventions', []);
  const timeline = document.getElementById('convention-timeline');

  timeline.innerHTML = conventions.map(c => `
    <div class="convention-item">
      <span class="conv-version">${c.version}</span>
      <div class="conv-date">📅 ${c.date}</div>
      <div class="conv-title">${escapeHtml(c.title)}</div>
      <div class="conv-content">${escapeHtml(c.content).replace(/\n/g, '<br>')}</div>
      ${c.changes ? '<p style="font-size:12px;color:#9ca3af;margin-top:6px;">📝 变更：' + escapeHtml(c.changes) + '</p>' : ''}
    </div>
  `).join('');
}

function showCreateConvention() {
  const conventions = getData('conventions', []);
  const nextVersion = 'v' + (conventions.length + 1) + '.0';
  const html = `
    <h3>➕ 新增增补条款</h3>
    <div class="form-group">
      <label>版本号：</label>
      <input type="text" id="conv-version" value="${nextVersion}">
    </div>
    <div class="form-group">
      <label>标题：</label>
      <input type="text" id="conv-title" placeholder="例如：《情侣公约》增补条款">
    </div>
    <div class="form-group">
      <label>条款内容：</label>
      <textarea id="conv-content" rows="5" placeholder="请输入增补条款的详细内容..."></textarea>
    </div>
    <div class="form-group">
      <label>变更说明：</label>
      <input type="text" id="conv-changes" placeholder="说明此次修改的内容">
    </div>
    <div class="form-actions">
      <button class="btn-secondary" onclick="closeGlobalModal()">取消</button>
      <button class="btn-primary" onclick="createConvention()">添加条款</button>
    </div>
  `;
  showGlobalModal(html);
}

function createConvention() {
  const content = document.getElementById('conv-content').value.trim();
  if (!content) { showToast('请输入条款内容 📜'); return; }

  const conv = {
    id: genId(),
    version: document.getElementById('conv-version').value.trim() || 'v1.0',
    date: getToday(),
    title: document.getElementById('conv-title').value.trim() || '增补条款',
    content,
    changes: document.getElementById('conv-changes').value.trim(),
    createdAt: new Date().toISOString()
  };

  const conventions = getData('conventions', []);
  conventions.push(conv);
  setData('conventions', conventions);
  closeGlobalModal();
  renderConventions();
  renderAnnouncementPreview();
  showToast('条款已添加！📜');
}

// ==================== 板块6-3：心愿兑换券仓库 ====================
function renderVouchers() {
  const vouchers = getData('vouchers', []);
  const grid = document.getElementById('voucher-grid');

  if (vouchers.length === 0) {
    grid.innerHTML = '<p style="text-align:center;color:#9ca3af;padding:40px;grid-column:1/-1;">还没有兑换券 🎫</p>';
    return;
  }

  grid.innerHTML = vouchers.map(v => `
    <div class="voucher-card${v.used ? ' used' : ''}">
      <div class="voucher-icon">${v.icon || '🎫'}</div>
      <div class="voucher-title">${escapeHtml(v.title)}</div>
      <div class="voucher-from">来自：${v.from === 'shushu' ? '🐹 鼠鼠' : '🐱 笔笔'} → ${v.to === 'shushu' ? '🐹 鼠鼠' : '🐱 笔笔'}</div>
      <div class="voucher-time">${formatDate(v.createdAt)}</div>
      ${!v.used ? '<button class="use-voucher-btn" onclick="useVoucher(\'' + v.id + '\')">✅ 核销使用</button>' : '<div style="margin-top:8px;font-size:12px;color:#9ca3af;">已使用</div>'}
    </div>
  `).join('');
}

function showCreateVoucher() {
  const voucherTypes = [
    { icon: '🍽️', title: '请客券', desc: '任意餐厅请客一次' },
    { icon: '👂', title: '倾听券', desc: '专注倾听30分钟不打断' },
    { icon: '🤝', title: '和解券', desc: '吵架后主动和解一次' },
    { icon: '🚗', title: '短途约会券', desc: '安排一次短途约会' },
    { icon: '💆', title: '按摩券', desc: '免费按摩15分钟' },
    { icon: '🎁', title: '惊喜券', desc: '准备一个小惊喜' },
    { icon: '📱', title: '不玩手机券', desc: '约会全程不看手机' },
    { icon: '🎵', title: '点歌券', desc: '唱一首对方指定的歌' }
  ];

  let typeOptions = voucherTypes.map((t, i) =>
    '<option value="' + i + '">' + t.icon + ' ' + t.title + ' - ' + t.desc + '</option>'
  ).join('');

  const html = `
    <h3>🎁 发放兑换券</h3>
    <div class="form-group">
      <label>选择券类型：</label>
      <select id="voucher-type">${typeOptions}</select>
    </div>
    <div class="form-group">
      <label>发放人：</label>
      <select id="voucher-from">
        <option value="shushu">🐹 鼠鼠</option>
        <option value="bibi">🐱 笔笔</option>
      </select>
    </div>
    <div class="form-group">
      <label>接收人：</label>
      <select id="voucher-to">
        <option value="bibi">🐱 笔笔</option>
        <option value="shushu">🐹 鼠鼠</option>
      </select>
    </div>
    <div class="form-actions">
      <button class="btn-secondary" onclick="closeGlobalModal()">取消</button>
      <button class="btn-primary" onclick="createVoucher()">发放</button>
    </div>
  `;
  showGlobalModal(html);
}

function createVoucher() {
  const voucherTypes = [
    { icon: '🍽️', title: '请客券' },
    { icon: '👂', title: '倾听券' },
    { icon: '🤝', title: '和解券' },
    { icon: '🚗', title: '短途约会券' },
    { icon: '💆', title: '按摩券' },
    { icon: '🎁', title: '惊喜券' },
    { icon: '📱', title: '不玩手机券' },
    { icon: '🎵', title: '点歌券' }
  ];
  const typeIdx = parseInt(document.getElementById('voucher-type').value);
  const typeInfo = voucherTypes[typeIdx];

  const voucher = {
    id: genId(),
    icon: typeInfo.icon,
    title: typeInfo.title,
    from: document.getElementById('voucher-from').value,
    to: document.getElementById('voucher-to').value,
    used: false,
    createdAt: new Date().toISOString()
  };

  const vouchers = getData('vouchers', []);
  vouchers.push(voucher);
  setData('vouchers', vouchers);
  closeGlobalModal();
  renderVouchers();
  showToast('兑换券已发放！🎫');
}

function useVoucher(id) {
  if (!confirm('确认核销这张兑换券吗？')) return;
  const vouchers = getData('vouchers', []);
  const v = vouchers.find(x => x.id === id);
  if (v) {
    v.used = true;
    v.usedAt = new Date().toISOString();
    setData('vouchers', vouchers);
    renderVouchers();
    showToast('兑换券已核销！✅');
  }
}

// ==================== 板块6-4：双人成长打卡区 ====================
function renderGrowth() {
  const logs = getData('growth_logs', { shushu: [], bibi: [] });
  const today = getToday();

  function calcStreak(list) {
    let streak = 0;
    const sorted = [...list].sort((a, b) => b.localeCompare(a));
    for (let i = 0; i < sorted.length; i++) {
      const expected = new Date();
      expected.setDate(expected.getDate() - i);
      if (sorted[i] === formatDate(expected)) streak++;
      else break;
    }
    return streak;
  }

  function renderCal(containerId, list, label) {
    const container = document.getElementById(containerId);
    if (!container) return;
    const days = [];
    for (let i = 13; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      days.push(formatDate(d));
    }
    container.innerHTML = days.map(d => {
      const checked = list.includes(d);
      const dayNum = new Date(d).getDate();
      return '<div class="cal-day' + (checked ? ' checked' : '') + '">' + dayNum + '</div>';
    }).join('');
  }

  const shushuLogs = logs.shushu || [];
  const bibiLogs = logs.bibi || [];

  document.getElementById('shushu-growth-streak').textContent = calcStreak(shushuLogs);
  document.getElementById('bibi-growth-streak').textContent = calcStreak(bibiLogs);
  renderCal('shushu-growth-cal', shushuLogs);
  renderCal('bibi-growth-cal', bibiLogs);
}

function checkinGrowth(user) {
  const today = getToday();
  const logs = getData('growth_logs', { shushu: [], bibi: [] });
  const list = logs[user] || [];

  if (list.includes(today)) {
    showToast('今日已打卡！✅');
    return;
  }

  list.push(today);
  logs[user] = list;
  setData('growth_logs', logs);
  renderGrowth();

  const name = user === 'shushu' ? '汤姆猫' : '杰瑞鼠';
  const streak = list.length > 0 ? (() => {
    let s = 0;
    const sorted = [...list].sort((a, b) => b.localeCompare(a));
    for (let i = 0; i < sorted.length; i++) {
      const expected = new Date();
      expected.setDate(expected.getDate() - i);
      if (sorted[i] === formatDate(expected)) s++;
      else break;
    }
    return s;
  })() : 1;

  showToast(name + ' 打卡成功！已连续 ' + streak + ' 天 🔥');
}

// ==================== 板块6-5：异地日常打卡专区 ====================
function renderDailyCheckin() {
  const today = getToday();
  const checkins = getData('daily_checkins', {});

  function getTodayCheckins() {
    return checkins[today] || {};
  }

  function calcStreak(type) {
    let streak = 0;
    const d = new Date();
    while (true) {
      const dateStr = formatDate(d);
      const dayCheckins = checkins[dateStr] || {};
      if (dayCheckins[type]) streak++;
      else break;
      d.setDate(d.getDate() - 1);
      if (streak > 365) break; // 安全上限
    }
    return streak;
  }

  const todayChecks = getTodayCheckins();
  const types = ['morning', 'night', 'nosugar', 'noice'];
  const statusEls = {
    morning: document.getElementById('morning-status'),
    night: document.getElementById('night-status'),
    nosugar: document.getElementById('nosugar-status'),
    noice: document.getElementById('noice-status')
  };
  const labels = { morning: '早安', night: '晚安', nosugar: '戒糖', noice: '戒冰' };

  types.forEach(t => {
    if (statusEls[t]) {
      statusEls[t].textContent = todayChecks[t] ? '✅ 今日已打卡' : '今日未打卡';
      statusEls[t].style.color = todayChecks[t] ? '#059669' : '#9ca3af';
    }
    const streakEl = document.getElementById(t + '-streak');
    if (streakEl) streakEl.textContent = calcStreak(t);
  });

  // 福利留言
  renderRewardMessages();
}

function dailyCheckin(type) {
  const today = getToday();
  const checkins = getData('daily_checkins', {});

  if (!checkins[today]) checkins[today] = {};
  if (checkins[today][type]) {
    showToast('今日已打卡！✅');
    return;
  }

  checkins[today][type] = true;
  setData('daily_checkins', checkins);
  renderDailyCheckin();

  const labels = { morning: '早安 ☀️', night: '晚安 🌙', nosugar: '戒糖 🍬', noice: '戒冰 🧊' };
  showToast(labels[type] + ' 打卡成功！');
}

function renderRewardMessages() {
  const checkins = getData('daily_checkins', {});
  const types = ['morning', 'night', 'nosugar', 'noice'];

  function getStreak(type) {
    let streak = 0;
    const d = new Date();
    while (true) {
      const dateStr = formatDate(d);
      const dayCheckins = checkins[dateStr] || {};
      if (dayCheckins[type]) streak++;
      else break;
      d.setDate(d.getDate() - 1);
      if (streak > 365) break;
    }
    return streak;
  }

  const allStreaks = types.map(t => ({ type: t, streak: getStreak(t) }));
  const minStreak = Math.min(...allStreaks.map(s => s.streak));

  const rewardMessages = [
    { days: 3, msg: '🌟 连续3天全员打卡！解锁：一条专属早安语音留言 💌' },
    { days: 7, msg: '🎉 连续7天全员打卡！解锁：互相写一封手写信 ✉️' },
    { days: 14, msg: '💎 连续14天全员打卡！解锁：一次视频约会惊喜 🎥' },
    { days: 30, msg: '👑 连续30天全员打卡！解锁：超级大惊喜礼包 🎁' }
  ];

  let html = '';
  rewardMessages.forEach(r => {
    if (minStreak >= r.days) {
      html += '<div style="color:#059669;margin:4px 0;">✅ ' + r.msg + '</div>';
    } else if (minStreak >= r.days - 1) {
      html += '<div style="color:#f59e0b;margin:4px 0;">🔜 还差1天！' + r.msg + '</div>';
    } else {
      html += '<div style="color:#9ca3af;margin:4px 0;">🔒 ' + r.msg + ' (还差' + (r.days - minStreak) + '天)</div>';
    }
  });

  document.getElementById('reward-messages').innerHTML = html || '<div>开始打卡来解锁福利吧 🎁</div>';
}

// ==================== 板块6-6：矛盾沟通应急预案 ====================
function renderEmergency() {
  const notes = getData('emergency_notes', []);
  const history = document.getElementById('emergency-history');
  if (notes.length === 0) {
    history.innerHTML = '<p style="color:#9ca3af;text-align:center;padding:20px;">暂无矛盾记录，这是好事 💕</p>';
    return;
  }

  history.innerHTML = '<h4 style="margin-top:16px;">📋 历史记录</h4>' + notes.map(n => `
    <div class="emergency-history-item">
      <div style="font-size:12px;color:#9ca3af;">${formatDateTime(n.createdAt)}</div>
      <div style="margin-top:4px;">${escapeHtml(n.note)}</div>
    </div>
  `).join('');
}

function startCoolDown() {
  if (coolDownInterval) {
    clearInterval(coolDownInterval);
  }

  coolDownSeconds = 1800; // 30分钟
  updateTimerDisplay();

  coolDownInterval = setInterval(() => {
    coolDownSeconds--;
    updateTimerDisplay();
    if (coolDownSeconds <= 0) {
      clearInterval(coolDownInterval);
      coolDownInterval = null;
      document.getElementById('cool-down-timer').textContent = '00:00';
      showToast('冷静时间到！现在可以开始沟通了 💕');
    }
  }, 1000);

  showToast('冷静计时开始，给彼此30分钟 ⏱️');
}

function updateTimerDisplay() {
  const mins = Math.floor(coolDownSeconds / 60);
  const secs = coolDownSeconds % 60;
  document.getElementById('cool-down-timer').textContent =
    String(mins).padStart(2, '0') + ':' + String(secs).padStart(2, '0');
}

function resetCoolDown() {
  if (coolDownInterval) {
    clearInterval(coolDownInterval);
    coolDownInterval = null;
  }
  coolDownSeconds = 1800;
  updateTimerDisplay();
  showToast('计时器已重置 ⏱️');
}

function saveEmergencyNote() {
  const note = document.getElementById('emergency-note').value.trim();
  if (!note) { showToast('请记录一些内容 📝'); return; }

  const notes = getData('emergency_notes', []);
  notes.push({
    id: genId(),
    note,
    createdAt: new Date().toISOString()
  });
  setData('emergency_notes', notes);
  document.getElementById('emergency-note').value = '';
  renderEmergency();
  showToast('记录已保存 📝');
}

// ==================== 年度总结 ====================
function generateYearlySummary() {
  const year = new Date().getFullYear();
  const messages = getData('messages', []);
  const albums = getData('albums', []);
  const dateProjects = getData('date_projects', []);
  const transactions = getData('transactions', []);
  const vouchers = getData('vouchers', []);

  const yearStart = year + '-01-01';
  const yearEnd = year + '-12-31';

  const yearMessages = messages.filter(m => m.createdAt >= yearStart + 'T00:00:00' && m.createdAt <= yearEnd + 'T23:59:59');
  const yearAlbums = albums.filter(a => a.createdAt >= yearStart + 'T00:00:00' && a.createdAt <= yearEnd + 'T23:59:59');
  const yearDates = dateProjects.filter(d => d.createdAt >= yearStart + 'T00:00:00' && d.createdAt <= yearEnd + 'T23:59:59');
  const checkedDates = yearDates.filter(d => d.checked);
  const yearTrans = transactions.filter(t => t.date >= yearStart && t.date <= yearEnd);
  const totalSpent = yearTrans.reduce((s, t) => s + t.amount, 0);
  const totalPhotos = yearAlbums.reduce((s, a) => s + (a.photos || []).length, 0);

  let html = '<div class="yearly-summary">';
  html += '<h3>📖 ' + year + '年 恋爱总结手册</h3>';

  html += '<div class="yearly-stat"><span>💌 留言总数</span><span class="stat-value">' + yearMessages.length + ' 条</span></div>';
  html += '<div class="yearly-stat"><span>📸 相册数量</span><span class="stat-value">' + yearAlbums.length + ' 个</span></div>';
  html += '<div class="yearly-stat"><span>🖼️ 照片总数</span><span class="stat-value">' + totalPhotos + ' 张</span></div>';
  html += '<div class="yearly-stat"><span>🎯 约会项目</span><span class="stat-value">' + yearDates.length + ' 个</span></div>';
  html += '<div class="yearly-stat"><span>✅ 已完成约会</span><span class="stat-value">' + checkedDates.length + ' 个</span></div>';
  html += '<div class="yearly-stat"><span>💳 消费记录</span><span class="stat-value">' + yearTrans.length + ' 笔</span></div>';
  html += '<div class="yearly-stat"><span>💰 全年总花费</span><span class="stat-value">' + formatCurrency(totalSpent) + '</span></div>';
  html += '<div class="yearly-stat"><span>🎫 兑换券</span><span class="stat-value">' + vouchers.length + ' 张</span></div>';

  html += '<div class="yearly-stat"><span>🏰 官网成立</span><span class="stat-value">' + SITE_FOUND_DATE + '</span></div>';

  html += '<p style="text-align:center;margin-top:20px;color:var(--blue-500);font-size:14px;">';
  html += '感谢这一年的陪伴与爱 💕<br>期待下一年继续记录我们的故事 ✨';
  html += '</p>';

  html += '</div>';

  document.getElementById('yearly-result').innerHTML = html;
}

// ==================== 通用删除 ====================
function deleteItem(storeKey, id) {
  if (!confirm('确认删除吗？此操作不可撤销！')) return;

  const items = getData(storeKey, []);
  const filtered = items.filter(item => item.id !== id);
  setData(storeKey, filtered);
  showToast('已删除 🗑️');

  // 刷新相关页面
  renderAllModules();
}

// ==================== 统一渲染 ====================
function renderAllModules() {
  // 根据当前显示的页面来渲染
  const activeSection = document.querySelector('.page-section.active');
  if (!activeSection) return;
  const pageId = activeSection.id.replace('page-', '');
  switchPage(pageId);
}

// ==================== 点击弹窗外部关闭 ====================
document.addEventListener('DOMContentLoaded', () => {
  document.getElementById('announcement-modal').addEventListener('click', function(e) {
    if (e.target === this) closeAnnouncementModal();
  });
  document.getElementById('global-modal').addEventListener('click', function(e) {
    if (e.target === this) closeGlobalModal();
  });

  // 点击非更多菜单区域关闭
  document.addEventListener('click', function(e) {
    const menu = document.getElementById('more-menu');
    if (menu && !menu.classList.contains('hidden')) {
      if (!e.target.closest('.nav-more') && !e.target.closest('#more-menu')) {
        menu.classList.add('hidden');
      }
    }
  });
});

// ==================== 页面加载完成 ====================
console.log('🐹💕🐱 鼠鼠&笔笔恋爱官网 v2.0 游乐场版 已就绪');
console.log('🏰 成立日期：2026年6月23日');
console.log('🍾 漂流瓶 + 🗺️ 恋爱大地图已加载');
console.log('🎮 全新游戏化体验上线！');

// ==================== 🍾 漂流瓶系统 ====================
// ============================================================
//  🍾 漂流瓶系统 — 旧版代码保留（被 drift-v2.js 覆盖）
// ============================================================

// ---- 运行时状态（保留变量名供兼容） ----
let driftBottles   = [];   // canvas 上漂浮的瓶子（含用户写的）
// driftAnimFrame 在 drift-v2.js 里也有定义，这里注释掉避免重复声明
// let driftAnimFrame = null;
let _driftCurrentTab = 'my';

// ---- 预置消息（供v2兼容） ----
const bottleMessages = [
  { from: 'shushu', msg: '笔笔，今天看到一只猫咪特别像你！想你了 🐱💕', avatar: '🐹' },
  { from: 'bibi',   msg: '鼠鼠最可爱啦！下次见面要抱好久好久 🤗',         avatar: '🐱' },
  { from: 'shushu', msg: '今天食堂的红烧肉特别好吃，下次带你来尝尝 🍖',   avatar: '🐹' },
  { from: 'bibi',   msg: '好想和你一起看电影，窝在沙发上那种 🎬',           avatar: '🐱' },
  { from: 'shushu', msg: '笔笔你要多穿点衣服，天气又变冷了 🧣',             avatar: '🐹' },
  { from: 'bibi',   msg: '鼠鼠学习辛苦了！笔笔给你加油打气 💪✨',          avatar: '🐱' },
];

// ---- 旧版 localStorage 工具（兼容保留，v2用 drift_my_bottles_v2）----
function getDriftMyBottles()        { return getData('drift_my_bottles', []); }
function saveDriftMyBottles(arr)    { setData('drift_my_bottles', arr); }
function getDriftCaughtBottles()    { return getData('drift_caught_bottles', []); }
function saveDriftCaughtBottles(a)  { setData('drift_caught_bottles', a); }

// ---- 渲染入口：优先调用 drift-v2.js 的 renderDriftBottle ----
function renderDriftBottle() {
  // drift-v2.js 加载后会覆盖此函数，这里是后备
  if (typeof window._driftV2Render === 'function') {
    window._driftV2Render();
  }
}

// ---- 旧版函数存根（被 drift-v2.js 或 index.html inline script 覆盖）----
// throwBottle / catchRandomBottle / deleteDriftBottle 均在 drift-v2.js 中定义
// 以下是后备空实现，确保页面不报错
function throwBottle_legacy()       { showToast('漂流瓶 v2 加载中...'); }
function catchRandomBottle_legacy() { showToast('漂流瓶 v2 加载中...'); }
function deleteDriftBottle_legacy(id) { }

// ---- 统计（v2版在 drift-v2.js 里，这里只是后备）----
function updateDriftStats() {
  if (typeof getLocalBottles === 'function') {
    const myList  = getLocalBottles();
    const caught  = typeof getLocalCaught === 'function' ? getLocalCaught() : [];
    const el1 = document.getElementById('drifting-count');
    const el2 = document.getElementById('thrown-count');
    const el3 = document.getElementById('caught-count');
    if (el1) el1.textContent = myList.filter(b => !b.caught).length;
    if (el2) el2.textContent = myList.length;
    if (el3) el3.textContent = caught.length;
  }
}

// ---- 标签页切换（v2版）----
function switchDriftTab(tab) {
  if (typeof switchDriftTabV2 === 'function') {
    switchDriftTabV2(tab);
  }
}

// ---- 列表渲染（委托给 v2）----
function renderDriftMyList() {
  if (typeof window._driftV2RenderMyList === 'function') window._driftV2RenderMyList();
}
function renderDriftCaughtList() {
  if (typeof window._driftV2RenderCaughtList === 'function') window._driftV2RenderCaughtList();
}

// ============================================================
//  数据存储工具
// ============================================================
function getLoveData() {
  try { return JSON.parse(localStorage.getItem('lb_loveData') || '{}'); } catch(e) { return {}; }
}
function saveLoveData(d) {
  const cur = getLoveData();
  const merged = { ...cur, ...d };
  setData('loveData', merged);
  return merged;
}

// ============================================================
//  情绪天气台
// ============================================================
function getMoodData() {
  try { return JSON.parse(localStorage.getItem('lb_moodData') || '{}'); } catch(e) { return {}; }
}
function saveMoodData(d) { setData('moodData', { ...getMoodData(), ...d }); }

const MOOD_MAP = {
  sunny: { emoji: '☀️', text: '晴天', sky: '☀️', color: '#fbbf24' },
  cloudy: { emoji: '☁️', text: '疲惫/多云', sky: '☁️', color: '#9ca3af' },
  love:   { emoji: '🥰', text: '想贴贴', sky: '💕', color: '#3b82f6' },
  space:  { emoji: '🌙', text: '需要空间', sky: '🌙', color: '#3b82f6' },
  storm:  { emoji: '⛈️', text: '烦躁/雷雨', sky: '⛈️', color: '#6b7280' },
  sick:   { emoji: '🤒', text: '不舒服', sky: '🌧️', color: '#f97316' },
};

function setMood(user, mood) {
  const today = new Date().toISOString().split('T')[0];
  const d = getMoodData();
  if (!d.history) d.history = {};
  if (!d.history[today]) d.history[today] = {};
  d.history[today][user] = mood;
  saveMoodData(d);
  // UI update
  const displayEl = document.getElementById(user + '-mood-display');
  const m = MOOD_MAP[mood];
  if (displayEl) displayEl.innerHTML = m.emoji + ' ' + m.text;
  // Update mood buttons
  const grid = document.getElementById(user + '-mood-grid');
  if (grid) {
    grid.querySelectorAll('.mood-btn').forEach(b => {
      b.classList.toggle('active', b.dataset.mood === mood);
    });
  }
  updateMoodWeather();
  updateMoodHistory();

}

function updateMoodWeather() {
  const d = getMoodData();
  const today = new Date().toISOString().split('T')[0];
  const todayData = (d.history || {})[today] || {};
  const sMood = todayData.shushu || 'sunny';
  const bMood = todayData.bibi || 'sunny';
  const skyEl = document.getElementById('mood-sky');
  const textEl = document.getElementById('mood-weather-text');

  const bothHappy = (sMood === 'sunny' || sMood === 'love') && (bMood === 'sunny' || bMood === 'love');
  const oneStorm = sMood === 'storm' || bMood === 'storm';
  const oneSpace = sMood === 'space' || bMood === 'space';

  if (bothHappy) {
    if (skyEl) skyEl.textContent = '🌈';
    if (textEl) textEl.textContent = '今天两个人心情都很好呢！甜蜜值 MAX！';
  } else if (oneStorm) {
    if (skyEl) skyEl.textContent = '⛈️';
    if (textEl) textEl.textContent = '有人心情不太好，记得给对方一个温暖的拥抱哦~';
  } else if (oneSpace) {
    if (skyEl) skyEl.textContent = '🌙';
    if (textEl) textEl.textContent = '有人今天需要一点独处空间，公约说了"空余1周独处休整"，温柔等候~';
  } else {
    if (skyEl) skyEl.textContent = '🌤️';
    if (textEl) textEl.textContent = '又是普普通通却珍贵的一天呢！';
  }
}

function updateMoodHistory() {
  const d = getMoodData();
  const chart = document.getElementById('mood-week-chart');
  if (!chart) return;
  const days = [];
  for (let i = 6; i >= 0; i--) {
    const date = new Date();
    date.setDate(date.getDate() - i);
    days.push(date.toISOString().split('T')[0]);
  }
  chart.innerHTML = days.map(day => {
    const dd = (d.history || {})[day] || {};
    const hasData = dd.shushu || dd.bibi;
    const shortDay = day.slice(5);
    const barColor = hasData ? '#3b82f6' : '#dbeafe';
    return '<div class="mood-day-bar" style="height:' + (hasData ? '50px' : '20px') + ';background:' + barColor + ';"><span>' + shortDay + '</span></div>';
  }).join('');
}

function initMoodPage() {
  const d = getMoodData();
  const today = new Date().toISOString().split('T')[0];
  const todayData = (d.history || {})[today] || {};
  const sMood = todayData.shushu || 'sunny';
  const bMood = todayData.bibi || 'sunny';
  document.getElementById('shushu-mood-display').innerHTML = MOOD_MAP[sMood].emoji + ' ' + MOOD_MAP[sMood].text;
  document.getElementById('bibi-mood-display').innerHTML = MOOD_MAP[bMood].emoji + ' ' + MOOD_MAP[bMood].text;
  // highlight buttons
  const sGrid = document.getElementById('shushu-mood-grid');
  const bGrid = document.getElementById('bibi-mood-grid');
  if (sGrid) sGrid.querySelectorAll('.mood-btn').forEach(b => { b.classList.toggle('active', b.dataset.mood === sMood); });
  if (bGrid) bGrid.querySelectorAll('.mood-btn').forEach(b => { b.classList.toggle('active', b.dataset.mood === bMood); });
  updateMoodWeather();
  updateMoodHistory();
}

// ============================================================
//  盲盒日历 / 每日任务
// ============================================================
const BLINDBOX_TASKS = [
  { icon: '💝', title: '今天夸对方3个具体的优点', desc: '不是"你好帅/美"，而是"你今天帮我倒水的时候我觉得好贴心"', exp: 50 },
  { icon: '📸', title: '拍一张天空的照片拼在一起', desc: '各自拍下此刻头顶的天空，发在相册墙里拼图', exp: 50 },
  { icon: '🎵', title: '分享一首高中时最爱的歌', desc: '把链接发给对方，讲讲和这首歌有关的故事', exp: 40 },
  { icon: '🍳', title: '一起做一顿饭（或远程同步）', desc: '各自做一道菜，拍照给对方看', exp: 60 },
  { icon: '💌', title: '给对方写一封50字的短信', desc: '可以在留言墙留下，或者写在手机备忘录截图', exp: 40 },
  { icon: '🎨', title: '画一幅对方的简笔画', desc: '不求好看，只求用心，画完互相分享', exp: 50 },
  { icon: '🏃', title: '今日运动打卡挑战', desc: '各自运动20分钟，完成后互相汇报', exp: 45 },
  { icon: '🎬', title: '推荐一部电影给对方', desc: '写下推荐理由和想一起看的场景', exp: 35 },
  { icon: '🕯️', title: '今日不吵架挑战', desc: '无论发生什么都不生气，挑战成功各+50EXP', exp: 55 },
  { icon: '💸', title: '今日开销节俭挑战', desc: '今天两人合计花费不超过50元（不含固定支出）', exp: 50 },
  { icon: '☕', title: '给对方点一杯远程奶茶', desc: '外卖下单对方最喜欢的口味', exp: 45 },
  { icon: '🎤', title: '唱一首歌发给对方', desc: '微信语音录30秒，走调也没关系', exp: 40 },
  { icon: '📖', title: '读一页书给对方听', desc: '挑一段喜欢的文字，用语音发过去', exp: 35 },
  { icon: '🧩', title: '分享一个童年故事', desc: '讲讲小时候最糗或最开心的一件事', exp: 45 },
  { icon: '❤️', title: '灵魂拷问日', desc: '回答"如果下辈子变成动物，希望对方是什么？为什么？"', exp: 40 },
];

function getBlindboxData() {
  try { return JSON.parse(localStorage.getItem('lb_blindbox') || '{}'); } catch(e) { return {}; }
}
function saveBlindboxData(d) { setData('blindbox', d); }

function getTodayTask() {
  const today = new Date().toISOString().split('T')[0];
  const d = getBlindboxData();
  // 使用日期哈希来确定今天的任务
  const hash = today.split('').reduce((a, c) => a + c.charCodeAt(0), 0);
  const idx = hash % BLINDBOX_TASKS.length;
  return { date: today, task: BLINDBOX_TASKS[idx], completed: (d.completed || {})[today] || false };
}

function openBlindbox() {
  const todayTask = getTodayTask();
  const box = document.getElementById('blindbox-box');
  const result = document.getElementById('blindbox-result');
  const lid = document.getElementById('blindbox-lid');

  // 开盒动画
  if (lid) lid.classList.add('open');

  setTimeout(() => {
    if (box) box.classList.add('hidden');
    if (result) {
      result.classList.remove('hidden');
      document.getElementById('blindbox-task-icon').textContent = todayTask.task.icon;
      document.getElementById('blindbox-task-title').textContent = todayTask.task.title;
      document.getElementById('blindbox-task-desc').textContent = todayTask.task.desc;
      const rewardEl = result.querySelector('.blindbox-task-reward');
      if (rewardEl) rewardEl.textContent = '✨ 完成奖励：+' + todayTask.task.exp + ' EXP';
    }
  }, 600);
}

function completeBlindbox() {
  const todayTask = getTodayTask();
  const d = getBlindboxData();
  if (!d.completed) d.completed = {};
  if (!d.history) d.history = [];
  d.completed[todayTask.date] = true;
  d.history.unshift({ date: todayTask.date, task: todayTask.task, time: new Date().toISOString() });
  saveBlindboxData(d);

  showToast('✅ 任务完成！+' + todayTask.task.exp + ' EXP');
  renderBlindboxHistory();
  document.getElementById('blindbox-result').classList.add('hidden');
  document.getElementById('blindbox-box').classList.remove('hidden');
  document.getElementById('blindbox-lid').classList.remove('open');
}

function renderBlindboxHistory() {
  const d = getBlindboxData();
  const list = d.history || [];
  const el = document.getElementById('blindbox-task-list');
  if (!el) return;
  if (list.length === 0) { el.innerHTML = '<p style="color:#9ca3af;font-size:13px;">还没有完成过任务哦~</p>'; return; }
  el.innerHTML = list.slice(0, 10).map(item => `
    <div class="blindbox-task-item">
      <span class="task-icon">${item.task.icon}</span>
      <div class="task-info">
        <div class="task-name">${item.task.title}</div>
        <div class="task-date">${item.date}</div>
      </div>
      <span class="task-status done">已完成</span>
    </div>
  `).join('');
}

function initBlindboxPage() {
  const todayTask = getTodayTask();
  if (todayTask.completed) {
    document.getElementById('blindbox-box').classList.add('hidden');
    document.getElementById('blindbox-result').classList.remove('hidden');
    document.getElementById('blindbox-task-icon').textContent = todayTask.task.icon;
    document.getElementById('blindbox-task-title').textContent = todayTask.task.title;
    document.getElementById('blindbox-task-desc').textContent = todayTask.task.desc;
    const rewardEl = document.getElementById('blindbox-result').querySelector('.blindbox-task-reward');
    if (rewardEl) rewardEl.textContent = '✅ 今日已完成！明天再来~';
    // hide complete button
    const completeBtn = document.getElementById('blindbox-result').querySelector('.btn-primary');
    if (completeBtn) completeBtn.style.display = 'none';
  } else {
    document.getElementById('blindbox-box').classList.remove('hidden');
    document.getElementById('blindbox-result').classList.add('hidden');
    document.getElementById('blindbox-lid').classList.remove('open');
  }
  renderBlindboxHistory();
}

// ============================================================
//  默契度大考验
// ============================================================
const QUIZ_QUESTIONS = [
  { q: '鼠鼠最爱吃的菜是什么？', opts: ['糖醋排骨', '红烧肉', '清蒸鱼', '麻婆豆腐'], ans: 0 },
  { q: '笔笔最讨厌的天气是？', opts: ['下雨天', '大热天', '阴天', '下雪天'], ans: 0 },
  { q: '公约里应急备用金是最低百分之几？', opts: ['5%', '10%', '15%', '20%'], ans: 1 },
  { q: '鼠鼠如果下辈子变成动物，希望笔笔是什么？', opts: ['小猫', '小鸟', '小兔子', '小金鱼'], ans: 0 },
  { q: '笔笔的生日是哪天？', opts: ['12月25日', '12月29日', '1月1日', '12月31日'], ans: 1 },
  { q: '两人第一次见面的日期是？', opts: ['2026年4月16日', '2026年5月16日', '2026年6月16日', '2026年5月1日'], ans: 1 },
  { q: '鼠鼠最喜欢的颜色是？', opts: ['蓝色', '粉色', '黑色', '白色'], ans: 1 },
  { q: '笔笔最想去的旅行目的地是？', opts: ['云南', '西藏', '海边', '日本'], ans: 2 },
  { q: '鼠鼠的生日是哪天？', opts: ['9月10日', '9月12日', '9月15日', '9月20日'], ans: 1 },
  { q: '公约规定行程取消提前几天以上可免赔付？', opts: ['1天', '2天', '3天', '5天'], ans: 2 },
  { q: '笔笔最喜欢喝的奶茶口味？', opts: ['珍珠奶茶', '芝士葡萄', '杨枝甘露', '芋泥波波'], ans: 3 },
  { q: '鼠鼠最常说的口头禅是？', opts: ['随便', '都行', '笔笔最好看', '等一下'], ans: 2 },
  { q: '公约规定纪念品双条件是？', opts: ['实用+有纪念意义', '便宜+好看', '商量+同意', '实用+双方共识'], ans: 3 },
  { q: '笔笔最喜欢的季节？', opts: ['春天', '夏天', '秋天', '冬天'], ans: 2 },
  { q: '鼠鼠的MBTI是什么？', opts: ['INTJ', 'INFP', 'ESFJ', '未知'], ans: 3 },
];

let quizState = { questions: [], current: 0, score: 0, user: 'shushu', active: false, answers: [] };

function setQuizUser(user) {
  quizState.user = user;
  document.querySelectorAll('.quiz-user-btn').forEach(b => b.classList.toggle('active', b.dataset.user === user));
}

function startQuiz() {
  // 随机抽5题
  const shuffled = [...QUIZ_QUESTIONS].sort(() => Math.random() - 0.5).slice(0, 5);
  quizState = { questions: shuffled, current: 0, score: 0, user: quizState.user, active: true, answers: [] };
  document.getElementById('quiz-start-btn').style.display = 'none';
  document.getElementById('quiz-percent').textContent = '0';
  document.getElementById('quiz-score-ring').style.strokeDashoffset = '339';
  document.getElementById('quiz-level-text').textContent = '答题中...';
  renderQuizQuestion();
}

function renderQuizQuestion() {
  const q = quizState.questions[quizState.current];
  document.getElementById('quiz-round-num').textContent = quizState.current + 1;
  document.getElementById('quiz-question').textContent = q.q;
  const optsEl = document.getElementById('quiz-options');
  optsEl.innerHTML = q.opts.map((opt, i) => `
    <button class="quiz-option" onclick="answerQuiz(${i})">${String.fromCharCode(65+i)}. ${opt}</button>
  `).join('');
}

function answerQuiz(idx) {
  if (!quizState.active) return;
  const q = quizState.questions[quizState.current];
  const correct = idx === q.ans;
  if (correct) quizState.score++;
  quizState.answers.push({ q: q.q, userAnswer: q.opts[idx], correctAnswer: q.opts[q.ans], correct });

  // highlight
  const opts = document.querySelectorAll('.quiz-option');
  opts.forEach((o, i) => {
    o.style.pointerEvents = 'none';
    if (i === q.ans) o.classList.add('correct');
    if (i === idx && !correct) o.classList.add('wrong');
  });

  setTimeout(() => {
    quizState.current++;
    if (quizState.current >= quizState.questions.length) {
      finishQuiz();
    } else {
      renderQuizQuestion();
    }
  }, 1000);
}

function finishQuiz() {
  quizState.active = false;
  const pct = Math.round((quizState.score / quizState.questions.length) * 100);
  document.getElementById('quiz-percent').textContent = pct;
  document.getElementById('quiz-score-ring').style.strokeDashoffset = 339 - (339 * pct / 100);
  document.getElementById('quiz-start-btn').style.display = 'inline-block';

  let levelText = '';
  if (pct === 100) levelText = '🏆 完美默契！你们简直是灵魂伴侣！';
  else if (pct >= 80) levelText = '💕 超高默契！太了解彼此了！';
  else if (pct >= 60) levelText = '👍 不错哦，继续加深了解~';
  else if (pct >= 40) levelText = '🔍 还有进步空间，多交流吧~';
  else levelText = '😂 看来还需要多多了解对方呢！';
  document.getElementById('quiz-level-text').textContent = levelText;

  // Save result
  const history = JSON.parse(localStorage.getItem('lb_quizHistory') || '[]');
  history.unshift({ date: new Date().toISOString(), user: quizState.user, score: quizState.score, total: quizState.questions.length, pct });
  if (history.length > 20) history.length = 20;
  setData('quizHistory', history);

  document.getElementById('quiz-question').textContent = '答题完成！';
  document.getElementById('quiz-options').innerHTML = '';
}

// ============================================================
//  年度愿望清单
// ============================================================
function getWishData() {
  try { return JSON.parse(localStorage.getItem('lb_wishes') || '[]'); } catch(e) { return []; }
}
function saveWishData(d) { setData('wishes', d); }

function addWish() {
  const input = document.getElementById('wishlist-input');
  const text = input.value.trim();
  if (!text) { showToast('请输入愿望内容'); return; }
  const wishes = getWishData();
  wishes.push({ id: Date.now(), text, done: false, doneDate: null, createdAt: new Date().toISOString() });
  saveWishData(wishes);
  input.value = '';
  renderWishes();

}

function toggleWish(id) {
  const wishes = getWishData();
  const w = wishes.find(w => w.id === id);
  if (!w) return;
  if (!w.done) {
    w.done = true;
    w.doneDate = new Date().toISOString();

    showToast('✅ 愿望完成！+20 EXP');
  } else {
    w.done = false;
    w.doneDate = null;
  }
  saveWishData(wishes);
  renderWishes();
}

function deleteWish(id) {
  const wishes = getWishData().filter(w => w.id !== id);
  saveWishData(wishes);
  renderWishes();
}

let wishFilter = 'all';
function filterWishes(f) {
  wishFilter = f;
  document.querySelectorAll('#page-wishlist .wishlist-filter .tab').forEach(t => t.classList.toggle('active', t.textContent.includes(f === 'all' ? '全部' : f === 'todo' ? '待完成' : '已完成')));
  renderWishes();
}

function renderWishes() {
  const wishes = getWishData();
  const filtered = wishFilter === 'done' ? wishes.filter(w => w.done) : wishFilter === 'todo' ? wishes.filter(w => !w.done) : wishes;
  const doneCount = wishes.filter(w => w.done).length;
  const pct = wishes.length > 0 ? (doneCount / wishes.length) * 100 : 0;

  document.getElementById('wishlist-done-count').textContent = doneCount;
  document.getElementById('wishlist-progress-fill').style.width = pct + '%';

  const grid = document.getElementById('wishlist-grid');
  if (filtered.length === 0) {
    grid.innerHTML = '<p style="color:#9ca3af;text-align:center;padding:20px;">还没有愿望哦，快来添加吧！</p>';
    return;
  }
  grid.innerHTML = filtered.map(w => `
    <div class="wish-item ${w.done ? 'done' : ''}" onclick="toggleWish(${w.id})">
      <div class="wish-checkbox">${w.done ? '✓' : ''}</div>
      <div class="wish-text">${w.text}</div>
      <div class="wish-date">${w.done ? '✓ ' + w.doneDate.split('T')[0] : ''}</div>
      <div class="wish-delete" onclick="event.stopPropagation();deleteWish(${w.id})">🗑️</div>
    </div>
  `).join('');
}

// ============================================================
//  约会基金·种树计划
// ============================================================
function getFundData() {
  try { return JSON.parse(localStorage.getItem('lb_fund') || '{}'); } catch(e) { return {}; }
}
function saveFundData(d) { setData('fund', { ...getFundData(), ...d }); }

function updateFundGoal() {
  const input = document.getElementById('fund-goal-input');
  const val = parseInt(input.value) || 20000;
  saveFundData({ goal: val });
  renderFundTree();
}

function addFund() {
  const amount = parseInt(document.getElementById('fund-add-input').value) || 0;
  const note = document.getElementById('fund-add-note').value.trim();
  if (amount <= 0) { showToast('请输入有效金额'); return; }
  const d = getFundData();
  if (!d.records) d.records = [];
  d.current = (d.current || 0) + amount;
  d.records.unshift({ amount, note: note || '存入', date: new Date().toISOString() });
  saveFundData(d);
  document.getElementById('fund-add-input').value = '';
  document.getElementById('fund-add-note').value = '';

  showToast('💧 浇水成功！+' + amount + '元，+15 EXP');
  renderFundTree();
}

function calcEquivalent() {
  const amount = parseInt(document.getElementById('calc-amount').value) || 0;
  if (amount <= 0) return;
  const milkTea = Math.floor(amount / 15);
  const movie = Math.floor(amount / 60);
  const hotpot = Math.floor(amount / 200);
  const d = getFundData();
  const goal = d.goal || 20000;
  const pct = ((amount / goal) * 100).toFixed(1);
  const resultEl = document.getElementById('calc-result');
  resultEl.innerHTML = `
    💰 省下 <b>${amount}元</b> 可以：<br>
    🧋 多喝 <b>${milkTea}杯</b> 奶茶<br>
    🎬 多看 <b>${movie}场</b> 电影<br>
    🍲 多吃 <b>${hotpot}顿</b> 火锅<br>
    🎯 距离年度目标近 <b>${pct}%</b>
  `;
}

function renderFundTree() {
  const d = getFundData();
  const goal = d.goal || 20000;
  const current = d.current || 0;
  const pct = Math.min(100, (current / goal) * 100);
  const records = d.records || [];

  document.getElementById('fund-goal-input').value = goal;
  document.getElementById('fund-current').textContent = current;
  document.getElementById('fund-target').textContent = goal;
  document.getElementById('fund-percent').textContent = Math.round(pct) + '%';
  document.getElementById('fundtree-bar-fill').style.width = pct + '%';

  // Tree stages
  let stageEmoji, stageDesc, trunkH, leafSize;
  if (pct < 20) { stageEmoji = '🌱'; stageDesc = '刚种下种子，继续浇水吧！'; trunkH = 10; leafSize = 0; }
  else if (pct < 40) { stageEmoji = '🌿'; stageDesc = '小苗发芽了，加油！'; trunkH = 30; leafSize = 20; }
  else if (pct < 60) { stageEmoji = '🪴'; stageDesc = '小树苗茁壮成长中！'; trunkH = 50; leafSize = 40; }
  else if (pct < 80) { stageEmoji = '🌳'; stageDesc = '大树已经成形啦！'; trunkH = 70; leafSize = 60; }
  else if (pct < 100) { stageEmoji = '🌸'; stageDesc = '开花了！快结果了！'; trunkH = 90; leafSize = 80; }
  else { stageEmoji = '🍎'; stageDesc = '果实成熟！可以兑换旅行啦！'; trunkH = 100; leafSize = 90; }

  document.getElementById('tree-stage').textContent = stageEmoji;
  document.getElementById('tree-stage-desc').textContent = stageDesc;
  const trunk = document.getElementById('tree-trunk');
  const leaves = document.getElementById('tree-leaves');
  const fruits = document.getElementById('tree-fruits');
  if (trunk) trunk.style.height = trunkH + 'px';
  if (leaves) { leaves.style.width = leafSize + 'px'; leaves.style.height = leafSize + 'px'; leaves.style.bottom = trunkH + 'px'; }
  if (fruits) fruits.innerHTML = pct >= 100 ? '🍎🍎🍎' : pct >= 80 ? '🌸🌸' : '';

  // Records
  const recEl = document.getElementById('fundtree-records');
  if (recEl) {
    if (records.length === 0) { recEl.innerHTML = '<p style="color:#9ca3af;font-size:13px;">还没有存钱记录~</p>'; return; }
    recEl.innerHTML = records.slice(0, 15).map(r => `
      <div class="fund-record">
        <span>💧 ${r.note}</span>
        <span style="font-weight:700;color:#16a34a;">+${r.amount}元</span>
        <span style="color:#9ca3af;font-size:11px;">${r.date.split('T')[0]}</span>
      </div>
    `).join('');
  }
}

// ============================================================
//  成就勋章墙
// ============================================================
const ACHIEVEMENTS = [
  { id: 'first_login', icon: '🚪', name: '初次到访', desc: '第一次登录恋爱官网', check: (d) => d.loginCount >= 1, module: 'home' },
  { id: 'login_7', icon: '📅', name: '常驻居民', desc: '累计登录7天', check: (d) => d.loginCount >= 7, module: 'home' },
  { id: 'login_30', icon: '🏠', name: '原住民', desc: '累计登录30天', check: (d) => d.loginCount >= 30, module: 'home' },
  { id: 'first_msg', icon: '💌', name: '第一封信', desc: '发布第一条留言', check: (d) => d.msgCount >= 1, module: 'messages' },
  { id: 'msg_10', icon: '📝', name: '话痨情侣', desc: '发布10条留言', check: (d) => d.msgCount >= 10, module: 'messages' },
  { id: 'first_photo', icon: '📸', name: '定格瞬间', desc: '上传第一张照片', check: (d) => d.photoCount >= 1, module: 'albums' },
  { id: 'photo_20', icon: '📷', name: '摄影达人', desc: '上传20张照片', check: (d) => d.photoCount >= 20, module: 'albums' },
  { id: 'first_checkin', icon: '✅', name: '打卡新人', desc: '完成第一次每日打卡', check: (d) => d.checkinCount >= 1, module: 'daily-checkin' },
  { id: 'checkin_30', icon: '🔥', name: '坚持到底', desc: '累计打卡30次', check: (d) => d.checkinCount >= 30, module: 'daily-checkin' },
  { id: 'first_date', icon: '🎯', name: '约会规划师', desc: '创建第一个约会项目', check: (d) => d.dateCount >= 1, module: 'dates' },
  { id: 'save_1000', icon: '💰', name: '小有积蓄', desc: '基金攒满1000元', check: (d) => d.fundSaved >= 1000, module: 'finance' },
  { id: 'save_10000', icon: '🏦', name: '万元户', desc: '基金攒满10000元', check: (d) => d.fundSaved >= 10000, module: 'finance' },
  { id: 'quiz_100', icon: '🧩', name: '心有灵犀', desc: '默契测试拿到100分', check: (d) => d.quizPerfect, module: 'quiz' },
  { id: 'wish_10', icon: '🌟', name: '愿望收割机', desc: '完成10个愿望', check: (d) => d.wishDone >= 10, module: 'wishlist' },
  { id: 'wish_50', icon: '🎖️', name: '愿望大师', desc: '完成50个愿望', check: (d) => d.wishDone >= 50, module: 'wishlist' },
  { id: 'mood_both_happy', icon: '🌈', name: '甜蜜暴击', desc: '双方同一天都选了开心', check: (d) => d.bothHappy, module: 'mood' },
  { id: 'tarot_first', icon: '🔮', name: '占卜师', desc: '第一次抽塔罗牌', check: (d) => d.tarotCount >= 1, module: 'tarot' },
  { id: 'bagua_first', icon: '☯️', name: '八卦大师', desc: '第一次摇八卦', check: (d) => d.baguaCount >= 1, module: 'bagua' },
  { id: 'farm_harvest', icon: '🎡', name: '幸运儿', desc: '第一次使用幸运转盘', check: (d) => d.wheelSpins >= 1, module: 'wheel' },
  { id: 'music_listen', icon: '🎵', name: '音乐鉴赏家', desc: '听过10首歌', check: (d) => d.musicPlayed >= 10, module: 'music-planet' },
];

// 轮转状态：当前展示模块索引
let achievRotationIdx = 0;
let achievRotateInterval = null;

function getAchievementData() {
  try { return JSON.parse(localStorage.getItem('lb_achievements') || '{}'); } catch(e) { return {}; }
}

function checkAchievements() {
  const achData = getAchievementData();
  if (!achData.unlocked) achData.unlocked = [];
  const d = getLoveData();
  const stats = {
    loginCount: d.loginCount || 0,
    msgCount: d.msgCount || 0,
    photoCount: d.photoCount || 0,
    checkinCount: d.checkinCount || 0,
    dateCount: d.dateCount || 0,
    fundSaved: (getFundData().current || 0),
    quizPerfect: achData.quizPerfect || false,
    wishDone: (getWishData().filter(w => w.done).length),
    bothHappy: achData.bothHappy || false,
    tarotCount: achData.tarotCount || 0,
    baguaCount: achData.baguaCount || 0,
    farmHarvests: d.farmHarvests || 0,
    musicPlayed: d.musicPlayed || 0,
  };

  let newUnlocks = false;
  ACHIEVEMENTS.forEach(ach => {
    if (!achData.unlocked.includes(ach.id) && ach.check(stats)) {
      achData.unlocked.push(ach.id);
      newUnlocks = true;

      showToast('🏆 解锁成就：' + ach.name + '！+30 EXP');
    }
  });

  if (newUnlocks) setData('achievements', achData);
  return achData;
}

function renderAchievements() {
  const achData = getAchievementData();
  const unlocked = achData.unlocked || [];
  const grid = document.getElementById('achievements-grid');
  if (!grid) return;

  document.getElementById('ach-unlocked').textContent = unlocked.length;
  document.getElementById('ach-total').textContent = ACHIEVEMENTS.length;
  document.getElementById('ach-percent').textContent = Math.round((unlocked.length / ACHIEVEMENTS.length) * 100) + '%';

  // 获取当前轮转的模块
  const modules = [...new Set(ACHIEVEMENTS.map(a => a.module))];
  const currentModule = modules[achievRotationIdx % modules.length];
  const modAchievs = ACHIEVEMENTS.filter(a => a.module === currentModule);

  // 徽章展示区（当前模块）
  let html = '<div class="ach-module-label">📂 ' + getModuleLabel(currentModule) + '</div>';
  html += '<div class="ach-rotate-hint">👆 点击下方未解锁徽章尝试解锁！已解锁的自动进收藏墙</div>';
  
  html += '<div class="ach-module-grid">';
  modAchievs.forEach(ach => {
    const isUnlocked = unlocked.includes(ach.id);
    html += '<div class="ach-badge ' + (isUnlocked ? 'unlocked' : 'locked clickable') + '" onclick="' + (isUnlocked ? '' : 'tryUnlockAch(\'' + ach.id + '\')') + '" title="' + ach.desc + '">';
    html += '<div class="ach-icon">' + (isUnlocked ? ach.icon : '🔒') + '</div>';
    html += '<div class="ach-name">' + ach.name + '</div>';
    html += '<div class="ach-desc">' + ach.desc + '</div>';
    if (!isUnlocked) html += '<div class="ach-click-hint">点击解锁</div>';
    html += '</div>';
  });
  html += '</div>';

  // 收藏墙（已解锁的勋章）
  html += '<div class="ach-collection-wall">';
  html += '<h3>🏆 勋章收藏墙 <span class="ach-collection-count">(' + unlocked.length + '/' + ACHIEVEMENTS.length + ')</span></h3>';
  html += '<div class="ach-collection-grid">';
  if (unlocked.length === 0) {
    html += '<p style="color:#9ca3af;grid-column:1/-1;text-align:center;padding:20px;">还没有解锁勋章，快去各个板块完成任务吧！</p>';
  } else {
    unlocked.forEach(id => {
      const ach = ACHIEVEMENTS.find(a => a.id === id);
      if (ach) {
        html += '<div class="ach-collection-item">';
        html += '<div class="ach-icon">' + ach.icon + '</div>';
        html += '<div class="ach-name">' + ach.name + '</div>';
        html += '</div>';
      }
    });
  }
  html += '</div></div>';

  // 模块轮转按钮
  html += '<div class="ach-rotate-btns">';
  html += '<button class="btn-secondary" onclick="rotateAchModule(-1)">⬅ 上一个模块</button>';
  html += '<button class="btn-primary" onclick="rotateAchModule(1)">下一个模块 ➡</button>';
  html += '<button class="btn-secondary" onclick="toggleAchAutoRotate()" id="ach-auto-btn">🔄 自动轮播</button>';
  html += '</div>';

  grid.innerHTML = html;
}

function getModuleLabel(mod) {
  const labels = {
    'home': '🏠 首页基础', 'messages': '💌 留言墙', 'albums': '📸 相册', 'daily-checkin': '🌅 日常打卡',
    'dates': '🎯 约会打卡', 'finance': '💰 财务', 'growth': '🌱 成长', 'quiz': '🧩 默契考验',
    'wishlist': '✅ 愿望清单', 'mood': '🌤️ 情绪天气', 'tarot': '🔮 塔罗', 'bagua': '☯️ 八卦',
    'music-planet': '🎵 音乐星球', 'wheel': '🎡 幸运转盘', 'puzzle': '🧩 照片拼图',
    'footprint': '📍 足迹地图', 'love-tree': '💞 爱情树', 'challenge': '🔥 30天挑战',
    'love-letter': '💌 情书设计器', 'games': '🎮 双人小游戏'
  };
  return labels[mod] || mod;
}

function tryUnlockAch(id) {
  const achData = getAchievementData();
  if (!achData.unlocked) achData.unlocked = [];
  if (achData.unlocked.includes(id)) { showToast('🏆 已解锁！'); return; }

  // 检查条件
  const d = getLoveData();
  const stats = {
    loginCount: d.loginCount || 0,
    msgCount: d.msgCount || 0,
    photoCount: d.photoCount || 0,
    checkinCount: d.checkinCount || 0,
    dateCount: d.dateCount || 0,
    fundSaved: (getFundData().current || 0),
    quizPerfect: achData.quizPerfect || false,
    wishDone: (getWishData().filter(w=>w.done).length),
    bothHappy: achData.bothHappy || false,
    tarotCount: achData.tarotCount || 0,
    baguaCount: achData.baguaCount || 0,
    farmHarvests: d.farmHarvests || 0,
    musicPlayed: d.musicPlayed || 0,
  };
  const ach = ACHIEVEMENTS.find(a => a.id === id);
  if (!ach) return;
  if (ach.check(stats)) {
    achData.unlocked.push(id);
    setData('achievements', achData);

    renderAchievements();
    showToast('🎉 解锁成就：' + ach.name + '！+30 EXP ✨');
    showAchUnlockAnim(ach);
  } else {
    showToast('🔒 条件未满足：' + ach.desc + ' — 继续努力吧！');
  }
}

function showAchUnlockAnim(ach) {
  const ov = document.createElement('div');
  ov.style.cssText = 'position:fixed;inset:0;display:flex;align-items:center;justify-content:center;z-index:9999;pointer-events:none;';
  const card = document.createElement('div');
  card.style.cssText = 'background:linear-gradient(135deg,#fbbf24,#f59e0b);padding:32px 40px;border-radius:24px;text-align:center;color:#1e1b4b;box-shadow:0 20px 60px rgba(251,191,36,0.5);animation:achBounceIn 0.6s cubic-bezier(0.175, 0.885, 0.32, 1.275);font-size:48px;';
  card.innerHTML = ach.icon + '<div style="font-size:20px;font-weight:800;margin-top:8px;">' + ach.name + '</div><div style="font-size:14px;opacity:0.8;">已收入收藏墙 🏆</div>';
  ov.appendChild(card);
  document.body.appendChild(ov);
  setTimeout(() => { ov.style.opacity='0'; ov.style.transition='opacity 0.5s'; }, 2000);
  setTimeout(() => ov.remove(), 2500);
}

function rotateAchModule(dir) {
  const modules = [...new Set(ACHIEVEMENTS.map(a => a.module))];
  achievRotationIdx = (achievRotationIdx + dir + modules.length) % modules.length;
  renderAchievements();
}

function toggleAchAutoRotate() {
  if (achievRotateInterval) {
    clearInterval(achievRotateInterval);
    achievRotateInterval = null;
    document.getElementById('ach-auto-btn').textContent = '🔄 自动轮播';
  } else {
    document.getElementById('ach-auto-btn').textContent = '⏸ 停止轮播';
    achievRotateInterval = setInterval(() => {
      rotateAchModule(1);
    }, 3000);
  }
}

// 注入勋章解锁动画
(function(){
  if (document.getElementById('ach-bounce-style')) return;
  const s = document.createElement('style');
  s.id = 'ach-bounce-style';
  s.textContent = '@keyframes achBounceIn{0%{transform:scale(0.3) rotate(-15deg);opacity:0}60%{transform:scale(1.1) rotate(3deg);opacity:1}100%{transform:scale(1) rotate(0)}}';
  document.head.appendChild(s);
})();

// ============================================================
//  丑照/出糗博物馆
// ============================================================
function getMuseumData() {
  try { return JSON.parse(localStorage.getItem('lb_museum') || '[]'); } catch(e) { return []; }
}
function saveMuseumData(d) { setData('museum', d); }

function handleMuseumUpload(event) {
  const files = event.target.files;
  if (!files.length) return;
  const museum = getMuseumData();
  let loaded = 0;
  Array.from(files).forEach(file => {
    const reader = new FileReader();
    reader.onload = function(e) {
      museum.unshift({
        id: Date.now() + Math.random(),
        src: e.target.result,
        caption: '',
        date: new Date().toISOString(),
      });
      loaded++;
      if (loaded === files.length) {
        saveMuseumData(museum);
        renderMuseum();

      }
    };
    reader.readAsDataURL(file);
  });
  event.target.value = '';
}

function deleteMuseumItem(id) {
  const museum = getMuseumData().filter(m => m.id !== id);
  saveMuseumData(museum);
  renderMuseum();
}

function editMuseumCaption(id) {
  const caption = prompt('输入这张糗照的备注（发生了什么糗事？）');
  if (caption === null) return;
  const museum = getMuseumData();
  const item = museum.find(m => m.id === id);
  if (item) { item.caption = caption; saveMuseumData(museum); renderMuseum(); }
}

function renderMuseum() {
  const museum = getMuseumData();
  const grid = document.getElementById('museum-grid');
  if (!grid) return;
  if (museum.length === 0) {
    grid.innerHTML = '<p style="color:#9ca3af;text-align:center;padding:30px;">🧐 还没有糗照哦，快上传那些"拍糊了但超好笑的"照片吧！</p>';
    return;
  }
  grid.innerHTML = museum.map(m => `
    <div class="museum-item">
      <img src="${m.src}" alt="糗照" onclick="editMuseumCaption(${m.id})">
      <div class="museum-caption">${m.caption || '点击添加备注...'}</div>
      <button class="museum-delete" onclick="event.stopPropagation();deleteMuseumItem(${m.id})">✕</button>
    </div>
  `).join('');
}

// ============================================================
//  梦境塔罗
// ============================================================
const TAROT_CARDS = [
  { emoji: '🌟', name: '星星', pos: '正位', meaning: '希望与灵感降临。今天是充满可能性的一天，保持乐观，美好的事情即将发生。', advice: '相信直觉，勇敢迈出第一步。' },
  { emoji: '🌙', name: '月亮', pos: '正位', meaning: '潜意识在说话。有些事可能还不太清晰，但请相信你的内心指引。适合静下心来倾听自己。', advice: '不要被表面迷惑，多观察，少冲动。' },
  { emoji: '☀️', name: '太阳', pos: '正位', meaning: '喜悦、成功与活力！今天做什么都会很顺利，适合表达爱意和规划未来。', advice: '大方分享你的快乐，感染身边的人。' },
  { emoji: '💕', name: '恋人', pos: '正位', meaning: '爱情运势 MAX！今天你们的关系会更加亲密，适合约会、表白或做出重要的感情决定。', advice: '真诚表达你的感受，对方会感受到的。' },
  { emoji: '⚖️', name: '正义', pos: '正位', meaning: '公平与平衡。今天适合清算旧账、做出公正的决定。如果有误会，今天适合坦诚沟通。', advice: '以理服人，也以情动人。' },
  { emoji: '🎡', name: '命运之轮', pos: '正位', meaning: '命运在转动！今天可能遇到意想不到的事情，可能是惊喜也可能是考验。', advice: '顺势而为，不要抗拒变化。' },
  { emoji: '💪', name: '力量', pos: '正位', meaning: '内心的力量觉醒。今天你比想象中更强大，可以克服任何困难。', advice: '温柔也是一种力量，不需要大吼大叫。' },
  { emoji: '🧙', name: '魔术师', pos: '正位', meaning: '创造力与行动力！今天适合启动新计划，你的想法可以变成现实。', advice: '想到了就去做，不要犹豫。' },
  { emoji: '👑', name: '女皇', pos: '正位', meaning: '丰盛与滋养。今天适合享受生活、犒劳自己，也适合照顾身边的人。', advice: '给自己和对方一点温柔的奖励。' },
  { emoji: '🏰', name: '塔', pos: '逆位', meaning: '旧的结构在瓦解，但这是为了更好的重建。不要害怕改变，裂缝是光照进来的地方。', advice: '接受不完美，有些事需要推倒重来。' },
  { emoji: '💀', name: '死神', pos: '正位', meaning: '一个阶段的结束，新阶段的开始。今天适合告别旧习惯、旧想法，迎接全新的自己。', advice: '放手也是一种勇气。' },
  { emoji: '🎭', name: '倒吊人', pos: '逆位', meaning: '换个角度看世界。今天可能有些事让你感到停滞，但这正是反思和调整的好时机。', advice: '停下来不是退步，是为了更好地前进。' },
];

function getTarotData() {
  try { return JSON.parse(localStorage.getItem('lb_tarot') || '{}'); } catch(e) { return {}; }
}

function drawTarot() {
  const card = TAROT_CARDS[Math.floor(Math.random() * TAROT_CARDS.length)];
  document.getElementById('tarot-deck').classList.add('hidden');
  const result = document.getElementById('tarot-result');
  result.classList.remove('hidden');
  document.getElementById('tarot-card-display').textContent = card.emoji;
  document.getElementById('tarot-card-name').textContent = card.name + ' · ' + card.pos;
  document.getElementById('tarot-position').textContent = '今日塔罗指引';
  document.getElementById('tarot-meaning').textContent = card.meaning;
  document.getElementById('tarot-advice').textContent = '💡 ' + card.advice;

  // Save to history
  const d = getTarotData();
  if (!d.history) d.history = [];
  d.history.unshift({ card, date: new Date().toISOString() });
  if (d.history.length > 20) d.history.length = 20;
  setData('tarot', d);

  // Achievement tracking
  const achData = getAchievementData();
  achData.tarotCount = (achData.tarotCount || 0) + 1;
  setData('achievements', achData);

  showToast('🔮 ' + card.name + ' · ' + card.pos + ' +20 EXP');
  renderTarotHistory();
}

function resetTarot() {
  document.getElementById('tarot-deck').classList.remove('hidden');
  document.getElementById('tarot-result').classList.add('hidden');
}

function renderTarotHistory() {
  const d = getTarotData();
  const list = d.history || [];
  const el = document.getElementById('tarot-history-list');
  if (!el) return;
  if (list.length === 0) { el.innerHTML = '<p style="color:#9ca3af;font-size:13px;">还没有抽过牌哦~</p>'; return; }
  el.innerHTML = list.map(h => `
    <div class="tarot-history-item">
      <span class="th-icon">${h.card.emoji}</span>
      <div class="th-info">
        <div class="th-name">${h.card.name} · ${h.card.pos}</div>
        <div class="th-date">${h.date.split('T')[0]}</div>
      </div>
    </div>
  `).join('');
}

// ============================================================
//  八卦运势
// ============================================================
const BAGUA_TRIGRAMS = [
  { symbol: '☰', name: '乾卦', desc: '天行健，君子以自强不息。大吉之卦，今天做什么都顺风顺水！', love: '★★★★★', career: '★★★★★', health: '★★★★☆', wealth: '★★★★☆' },
  { symbol: '☷', name: '坤卦', desc: '地势坤，君子以厚德载物。宜稳扎稳打，以柔克刚，耐心等待时机。', love: '★★★★☆', career: '★★★☆☆', health: '★★★★★', wealth: '★★★☆☆' },
  { symbol: '☵', name: '坎卦', desc: '水洊至，习坎。虽有险阻，但只要保持信念，定能化险为夷。', love: '★★★☆☆', career: '★★☆☆☆', health: '★★☆☆☆', wealth: '★★☆☆☆' },
  { symbol: '☲', name: '离卦', desc: '明两作，离。光明照耀，适合展现自我、表达爱意，今天魅力四射！', love: '★★★★★', career: '★★★★☆', health: '★★★☆☆', wealth: '★★★☆☆' },
  { symbol: '☳', name: '震卦', desc: '洊雷震。可能有突发事件，但不要慌，变动中往往藏着机会。', love: '★★★☆☆', career: '★★★☆☆', health: '★★★☆☆', wealth: '★★☆☆☆' },
  { symbol: '☴', name: '巽卦', desc: '随风巽。宜顺势而为，灵活应变。今天适合沟通交流，温和表达。', love: '★★★★☆', career: '★★★★☆', health: '★★★★☆', wealth: '★★★☆☆' },
  { symbol: '☶', name: '艮卦', desc: '兼山艮。宜静不宜动，适合反思和内省。不要强求，顺其自然。', love: '★★★☆☆', career: '★★☆☆☆', health: '★★★☆☆', wealth: '★★★☆☆' },
  { symbol: '☱', name: '兑卦', desc: '丽泽兑。喜悦之象！今天心情愉悦，人际关系顺畅，适合社交和表达爱。', love: '★★★★★', career: '★★★★☆', health: '★★★★☆', wealth: '★★★★☆' },
];

function spinBagua() {
  const center = document.querySelector('.bagua-center');
  if (center) center.classList.add('spinning');

  setTimeout(() => {
    if (center) center.classList.remove('spinning');
    const trigram = BAGUA_TRIGRAMS[Math.floor(Math.random() * BAGUA_TRIGRAMS.length)];

    document.getElementById('bagua-result').classList.remove('hidden');
    document.getElementById('bagua-hexagram-display').textContent = trigram.symbol;
    document.getElementById('bagua-name').textContent = trigram.name;
    document.getElementById('bagua-desc').textContent = trigram.desc;
    document.getElementById('bagua-love').textContent = trigram.love;
    document.getElementById('bagua-career').textContent = trigram.career;
    document.getElementById('bagua-health').textContent = trigram.health;
    document.getElementById('bagua-wealth').textContent = trigram.wealth;

    // Track
    const achData = getAchievementData();
    achData.baguaCount = (achData.baguaCount || 0) + 1;
    setData('achievements', achData);

    showToast('☯️ ' + trigram.name + ' +15 EXP');
  }, 800);
}

function resetBagua() {
  document.getElementById('bagua-result').classList.add('hidden');
}

// ============================================================
//  摇骰子心情运势
// ============================================================
const DICE_FORTUNES = [
  { num: 1, title: '🍀 小吉', desc: '运势平稳，适合按部就班。今天宜低调行事，小小的幸运正在路上。', stars: '⭐' },
  { num: 2, title: '🌈 中吉', desc: '好事成双！今天适合合作和沟通，两个人的力量大于一个人。', stars: '⭐⭐' },
  { num: 3, title: '🎉 吉', desc: '三阳开泰！充满活力和创造力的一天，适合尝试新鲜事物。', stars: '⭐⭐⭐' },
  { num: 4, title: '💫 大吉', desc: '四平八稳又带惊喜！今天做什么都很顺利，别忘了和TA分享你的好运。', stars: '⭐⭐⭐⭐' },
  { num: 5, title: '🌟 超吉', desc: '五星高照！今天是你的幸运日，想做的事情大胆去做吧！', stars: '⭐⭐⭐⭐⭐' },
  { num: 6, title: '👑 至尊吉', desc: '六六大顺！各方面运势拉满，适合表白、求婚、定下重要约定！', stars: '⭐⭐⭐⭐⭐⭐' },
];

function rollDice() {
  const cube = document.getElementById('dice-cube');
  if (cube) cube.classList.add('rolling');

  // 1-6随机
  const n = Math.floor(Math.random() * 6) + 1;

  setTimeout(() => {
    if (cube) cube.classList.remove('rolling');
    const fortune = DICE_FORTUNES[n - 1];

    document.getElementById('dice-result').classList.remove('hidden');
    document.getElementById('dice-number').textContent = n;
    document.getElementById('dice-fortune-title').textContent = fortune.title;
    document.getElementById('dice-fortune-desc').textContent = fortune.desc;
    document.getElementById('dice-stars').textContent = fortune.stars;

    // Save
    const history = JSON.parse(localStorage.getItem('lb_diceHistory') || '[]');
    history.unshift({ num: n, fortune, date: new Date().toISOString() });
    if (history.length > 30) history.length = 30;
    setData('diceHistory', history);
    renderDiceHistory();

  }, 800);
}

function renderDiceHistory() {
  const history = JSON.parse(localStorage.getItem('lb_diceHistory') || '[]');
  const el = document.getElementById('dice-history-list');
  if (!el) return;
  if (history.length === 0) { el.innerHTML = '<p style="color:#9ca3af;font-size:13px;">还没有摇过骰子哦~</p>'; return; }
  el.innerHTML = history.slice(0, 10).map(h => `
    <div class="dice-history-item">
      <span>🎲 <b>${h.num}</b> ${h.fortune.title}</span>
      <span style="color:#9ca3af;">${h.date.split('T')[0]}</span>
    </div>
  `).join('');
}

// ============================================================
//  年度颁奖典礼
// ============================================================
function generateAnnualReport() {
  const d = getLoveData();
  const wishes = getWishData();
  const fund = getFundData();
  const tarotD = getTarotData();
  const diceHistory = JSON.parse(localStorage.getItem('lb_diceHistory') || '[]');
  const messages = JSON.parse(localStorage.getItem('lb_messages') || '[]');
  const now = new Date();
  const yearStart = now.getFullYear() + '-01-01';

  const thisYearMsgs = messages.filter(m => m.time >= yearStart);
  const thisYearTarot = (tarotD.history || []).filter(h => h.date >= yearStart);
  const thisYearDice = diceHistory.filter(h => h.date >= yearStart);
  const doneWishes = wishes.filter(w => w.doneDate && w.doneDate >= yearStart);
  const totalSaved = fund.current || 0;
  const totalLoveDays = Math.floor((now - new Date('2026-06-23')) / (1000 * 60 * 60 * 24));

  // 常见词分析
  const allText = thisYearMsgs.map(m => m.content || '').join('');
  const wordCount = {};
  allText.replace(/[\u4e00-\u9fa5]{1,2}/g, w => { wordCount[w] = (wordCount[w] || 0) + 1; });
  const topWords = Object.entries(wordCount).sort((a,b) => b[1] - a[1]).slice(0, 5);

  const resultEl = document.getElementById('awards-result');
  resultEl.innerHTML = `
    <div class="awards-report">
      <h2>🏅 爱情公司第${Math.ceil(totalLoveDays/365)}年运营年报</h2>
      <div class="awards-section">
        <h3>📅 年度数据</h3>
        <p>💞 相恋天数：${totalLoveDays} 天</p>
        <p>💌 留言条数：${thisYearMsgs.length} 条</p>
        <p>✅ 完成愿望：${doneWishes.length} 个</p>
        <p>💰 基金攒入：${totalSaved} 元</p>
        <p>🔮 塔罗占卜：${thisYearTarot.length} 次</p>
        <p>🎲 摇骰次数：${thisYearDice.length} 次</p>
      </div>
      <div class="awards-section">
        <h3>💬 年度高频词</h3>
        <p>${topWords.length > 0 ? topWords.map(([w, c]) => '"' + w + '"(' + c + '次)').join('、') : '数据收集中...'}</p>
      </div>
      <div class="awards-section">
        <h3>🏆 年度荣誉称号</h3>
        <p>🐹 鼠鼠：${getRandomTitle('shushu')}</p>
        <p>🐱 笔笔：${getRandomTitle('bibi')}</p>
      </div>
      <div class="awards-section">
        <h3>🦞 趣味换算</h3>
        <p>${totalSaved} 元 ≈ ${Math.floor(totalSaved/50)} 斤小龙虾 ≈ ${Math.floor(totalSaved/15)} 杯奶茶 ≈ ${Math.floor(totalSaved/200)} 顿火锅</p>
      </div>
      <p style="text-align:center;margin-top:16px;font-size:13px;opacity:0.7;">📅 生成于 ${now.toLocaleDateString('zh-CN')}</p>
    </div>
  `;
}

const RANDOM_TITLES_SHUSHU = ['年度最佳男友力奖', '最温柔投喂官', '持家小能手', '24小时微笑大使', '最佳捧场王', '省钱鬼才', '年度最甜担当'];
const RANDOM_TITLES_BIBI = ['年度最美少女奖', '最会撒娇小猫咪', '持家女神', '温暖小太阳', '年度最佳女主角', '省钱天后', '年度最萌担当'];

function getRandomTitle(user) {
  const arr = user === 'shushu' ? RANDOM_TITLES_SHUSHU : RANDOM_TITLES_BIBI;
  return arr[Math.floor(Math.random() * arr.length)];
}

// ============================================================
//  switchPage 扩展支持新页面
// ============================================================
const originalSwitchPage = switchPage;
switchPage = function(pageId) {
  originalSwitchPage(pageId);

  // 初始化各页面
  if (pageId === 'mood') initMoodPage();
  if (pageId === 'blindbox') initBlindboxPage();
  if (pageId === 'wishlist') renderWishes();
  if (pageId === 'fund-tree') renderFundTree();
  if (pageId === 'achievements') renderAchievements();
  if (pageId === 'museum') renderMuseum();
  if (pageId === 'tarot') renderTarotHistory();
  if (pageId === 'dice') renderDiceHistory();
};

// ============================================================
//  初始化增强
// ============================================================
// 劫持原有的 postMessage / 打卡等函数来增加 EXP
const _origPostMessage = postMessage;
postMessage = function() {
  _origPostMessage();
  const d = getLoveData();
  d.msgCount = (d.msgCount || 0) + 1;
  saveLoveData(d);

  checkAchievements();
};

const _origDailyCheckin = dailyCheckin;
dailyCheckin = function(type) {
  _origDailyCheckin(type);
  const d = getLoveData();
  d.checkinCount = (d.checkinCount || 0) + 1;
  saveLoveData(d);

  checkAchievements();
};

// 处理照片上传的 EXP
const _origPhotoUpload = handlePhotoUpload;
handlePhotoUpload = function(event) {
  _origPhotoUpload(event);
  const d = getLoveData();
  d.photoCount = (d.photoCount || 0) + (event.target.files ? event.target.files.length : 0);
  saveLoveData(d);

  checkAchievements();
};

// 追踪登录次数
(function trackLogin() {
  const d = getLoveData();
  const today = new Date().toISOString().split('T')[0];
  if (d.lastLoginDate !== today) {
    d.loginCount = (d.loginCount || 0) + 1;
    d.lastLoginDate = today;
    saveLoveData(d);

    checkAchievements();
  }

})();

// 追踪愿望完成数
const _origToggleWish = toggleWish;
toggleWish = function(id) {
  _origToggleWish(id);
  checkAchievements();
};

// ============================================================
//  init 增强
// ============================================================
const _origInit = window.init || function(){};
window.init = function() {
  _origInit();

  // 快捷导航已静态化，无需JS动态渲染
};

// ============================================================
//  🧬 MBTI 人格墙
// ============================================================
const MBTI_TYPES = [
  { code:'INTJ', name:'建筑师', icon:'🏛️', traits:['独立','战略','理性','远见'], desc:'富有想象力和战略性的思想家，一切皆在计划之中。' },
  { code:'INTP', name:'逻辑学家', icon:'🔬', traits:['创新','好奇','分析','抽象'], desc:'充满好奇心的发明家，对知识有着永不满足的渴望。' },
  { code:'ENTJ', name:'指挥官', icon:'👑', traits:['果断','领导','魄力','远见'], desc:'大胆、富有想象力的领导者，总能找到前进的方向。' },
  { code:'ENTP', name:'辩论家', icon:'💡', traits:['机智','好奇','善辩','创新'], desc:'聪明好奇的思想者，永远不会被智力挑战难倒。' },
  { code:'INFJ', name:'提倡者', icon:'🌙', traits:['理想','共情','洞察','深度'], desc:'安静而神秘，但鼓舞人心的理想主义者。' },
  { code:'INFP', name:'调停者', icon:'🕊️', traits:['诗意','善良','利他','理想'], desc:'富有诗意的理想主义者，永远在寻找善良和美好。' },
  { code:'ENFJ', name:'主人公', icon:'🌟', traits:['魅力','共情','领导','利他'], desc:'富有魅力的领导者，用真诚感染身边的每一个人。' },
  { code:'ENFP', name:'竞选者', icon:'🎪', traits:['热情','创意','社交','自由'], desc:'热情、有创造力的自由灵魂，总能找到微笑的理由。' },
  { code:'ISTJ', name:'物流师', icon:'📋', traits:['务实','可靠','秩序','勤勉'], desc:'一丝不苟的检查者，用行动兑现每一个承诺。' },
  { code:'ISFJ', name:'守卫者', icon:'🛡️', traits:['守护','温暖','细致','奉献'], desc:'专注温暖的守护者，时刻准备保护所爱之人。' },
  { code:'ESTJ', name:'总经理', icon:'🏢', traits:['高效','管理','果断','传统'], desc:'出色的管理者，在管理事务和人员方面无与伦比。' },
  { code:'ESFJ', name:'执政官', icon:'🤝', traits:['关怀','社交','热心','尽责'], desc:'极富同理心的社交达人，永远乐于助人。' },
  { code:'ISTP', name:'鉴赏家', icon:'🔧', traits:['冷静','实操','探索','灵活'], desc:'大胆而实际的探险家，用双手理解世界。' },
  { code:'ISFP', name:'探险家', icon:'🎨', traits:['艺术','敏感','自由','魅力'], desc:'灵活有魅力的艺术家，随时准备探索新体验。' },
  { code:'ESTP', name:'企业家', icon:'🚀', traits:['行动','敏锐','大胆','直接'], desc:'聪明、精力充沛的实干家，活在当下的每一刻。' },
  { code:'ESFP', name:'表演者', icon:'🎭', traits:['热情','即兴','社交','活力'], desc:'自发的、充满活力的表演者，生活永远不会无聊。' },
];

const MBTI_COMPAT = {
  'INTJ': { 'ENFP':95,'ENTP':90,'INFJ':88,'INFP':82,'INTJ':75,'INTP':72,'ENFJ':70,'ENTJ':65,'ISTP':55,'ISFP':50,'ESTJ':45,'ESFP':42,'ISTJ':40,'ISFJ':38,'ESTP':35,'ESFJ':30 },
  'INTP': { 'ENTJ':95,'ESTJ':90,'INFJ':88,'INTJ':85,'ENTP':82,'INTP':78,'ENFJ':72,'ISTJ':65,'INFP':60,'ENFP':55,'ISFJ':50,'ESTP':45,'ESFJ':40,'ISTP':38,'ISFP':35,'ESFP':30 },
  'ENTJ': { 'INTP':95,'INFP':90,'INTJ':88,'ENTP':85,'INFJ':82,'ENFJ':78,'ISTP':70,'ISFP':65,'ENTJ':60,'ENFP':55,'ESTP':50,'ESFP':45,'ISTJ':42,'ESTJ':40,'ISFJ':35,'ESFJ':30 },
  'ENTP': { 'INFJ':95,'INTJ':90,'INFP':88,'ENTJ':85,'ENTP':82,'ENFJ':78,'INTP':72,'ENFP':68,'ISFJ':55,'ISTJ':50,'ISFP':48,'ISTP':45,'ESFJ':40,'ESTJ':35,'ESFP':32,'ESTP':30 },
  'INFJ': { 'ENTP':95,'ENFP':92,'INTJ':90,'INFP':88,'INFJ':85,'ENFJ':82,'INTP':75,'ENTJ':70,'ISFP':60,'ISTP':55,'ISFJ':50,'ESFP':48,'ISTJ':42,'ESTP':40,'ESTJ':35,'ESFJ':32 },
  'INFP': { 'ENFJ':95,'ENTJ':92,'INFJ':90,'INTJ':88,'INFP':85,'ENFP':82,'ENTP':75,'ESFJ':68,'ISFP':60,'ISFJ':55,'ISTP':48,'ESTJ':42,'ISTJ':40,'ESFP':38,'ESTP':35,'INTJ':30 },
  'ENFJ': { 'INFP':95,'ISFP':92,'INFJ':90,'ENFP':88,'INTJ':82,'ENTP':80,'ENFJ':78,'ENTJ':72,'ISFJ':68,'ESFJ':62,'ESTJ':55,'ISTJ':50,'INTP':48,'ISTP':45,'ESTP':40,'ESFP':38 },
  'ENFP': { 'INTJ':95,'INFJ':92,'INFP':90,'ENTJ':88,'ENFJ':85,'ENTP':82,'ENFP':80,'ISTJ':65,'ISFJ':60,'ESTJ':55,'ESFJ':50,'ISFP':48,'ISTP':45,'ESTP':40,'ESFP':38,'INTP':35 },
  'ISTJ': { 'ESFP':90,'ESTP':88,'ISFJ':85,'ESFJ':82,'ISTJ':80,'ESTJ':78,'ISFP':72,'ISTP':68,'ENTJ':55,'INTJ':50,'INTP':48,'ENTP':45,'ENFJ':42,'ENFP':40,'INFJ':38,'INFP':35 },
  'ISFJ': { 'ESTP':90,'ESFP':88,'ISTJ':85,'ISFJ':82,'ESTJ':78,'ESFJ':75,'ISTP':70,'ISFP':68,'ENTP':55,'ENTJ':50,'INTP':48,'INTJ':45,'ENFP':42,'ENFJ':40,'INFP':38,'INFJ':35 },
  'ESTJ': { 'ISTP':90,'ISFP':88,'ESTP':85,'ESFP':82,'ESTJ':80,'ISTJ':78,'ENTJ':72,'ENTP':68,'ESFJ':60,'ISFJ':55,'ENFJ':50,'INTJ':48,'ENFP':45,'INFP':42,'INFJ':38,'INTP':35 },
  'ESFJ': { 'ISTP':90,'ISFP':88,'ESTP':85,'ESFP':82,'ESFJ':80,'ISFJ':78,'ENFJ':72,'ENFP':68,'ESTJ':60,'ISTJ':55,'ENTJ':50,'ENTP':48,'INFJ':45,'INFP':42,'INTJ':38,'INTP':35 },
  'ISTP': { 'ESTJ':90,'ENTJ':88,'ESFJ':85,'ENFJ':82,'ISTP':80,'ESTP':78,'ISFP':72,'ESFP':68,'INTJ':55,'ISTJ':50,'INTP':48,'INFJ':45,'ENTP':42,'ENFP':40,'ISFJ':38,'INFP':35 },
  'ISFP': { 'ESTJ':90,'ENTJ':88,'ESFJ':85,'ENFJ':82,'ISFP':80,'ESFP':78,'ISTP':72,'ESTP':68,'INFJ':60,'INTJ':55,'INFP':50,'ENFP':48,'ISFJ':45,'ISTJ':42,'ENTP':38,'INTP':35 },
  'ESTP': { 'ISFJ':90,'ISTJ':88,'ESFP':85,'ISFP':82,'ESTP':80,'ISTP':78,'ESFJ':72,'ESTJ':68,'ENFJ':55,'ENTJ':50,'INFJ':48,'ENFP':45,'INFP':42,'INTJ':38,'INTP':35,'ENTP':32 },
  'ESFP': { 'ISTJ':90,'ISFJ':88,'ESTP':85,'ISTP':82,'ESFP':80,'ISFP':78,'ESTJ':72,'ESFJ':68,'ENFP':55,'ENFJ':50,'INFP':48,'ENTP':45,'INFJ':42,'INTJ':38,'ENTJ':35,'INTP':32 },
};

let mbtiTarget = 'shushu';
let mbtiData = { shushu: null, bibi: null };

function initMbtiData() {
  const saved = getData('mbti_types', null);
  if (saved) mbtiData = { ...mbtiData, ...saved };
}
function saveMbti() { setData('mbti_types', mbtiData); }

function setMbtiTarget(user) {
  mbtiTarget = user;
  document.querySelectorAll('.mbti-select-user').forEach(b => b.classList.toggle('active', b.dataset.for === user));
  document.getElementById('mbti-select-hint').textContent = '为 ' + (user === 'shushu' ? '🐹 鼠鼠' : '🐱 笔笔') + ' 选择人格类型';
  renderMbtiGrid();
}

function renderMbtiGrid() {
  const grid = document.getElementById('mbti-type-grid');
  if (!grid) return;
  grid.innerHTML = MBTI_TYPES.map(t => {
    const selected = mbtiData[mbtiTarget] === t.code;
    return '<button class="mbti-type-btn' + (selected ? ' selected' : '') + '" onclick="selectMbtiType(\'' + t.code + '\')">' + t.icon + ' ' + t.code + '</button>';
  }).join('');
}

function selectMbtiType(code) {
  mbtiData[mbtiTarget] = code;
  saveMbti();
  renderMbtiGrid();
  renderMbtiDisplay();
  renderMbtiMatch();
}

function renderMbtiDisplay() {
  ['shushu', 'bibi'].forEach(user => {
    const code = mbtiData[user];
    const badge = document.getElementById(user + '-mbti-display').querySelector('.mbti-type-badge');
    const name = document.getElementById(user + '-mbti-name');
    const desc = document.getElementById(user + '-mbti-desc');
    const traits = document.getElementById(user + '-mbti-traits');
    if (code) {
      const t = MBTI_TYPES.find(x => x.code === code) || {};
      badge.textContent = code;
      badge.className = 'mbti-type-badge';
      name.textContent = (t.icon || '') + ' ' + (t.name || code);
      desc.textContent = t.desc || '';
      traits.innerHTML = (t.traits || []).map(tr => '<span class="mbti-trait">' + tr + '</span>').join('');
    } else {
      badge.textContent = '未选择';
      badge.className = 'mbti-type-badge unset';
      name.textContent = '点击下方选择';
      desc.textContent = '';
      traits.innerHTML = '';
    }
  });
}

function renderMbtiMatch() {
  const s = mbtiData.shushu;
  const b = mbtiData.bibi;
  const el = document.getElementById('mbti-match');
  if (!s || !b) { el.style.display = 'none'; return; }
  el.style.display = 'block';

  const pct = MBTI_COMPAT[s] && MBTI_COMPAT[s][b] ? MBTI_COMPAT[s][b] : 50;
  // 检查双方是否同类型（自身匹配度来自两个不同类型的兼容表，但同类型给75-85）
  let finalPct = pct;
  if (s === b) finalPct = s === 'ENFP' ? 80 : s === 'INFJ' ? 85 : s === 'ISTJ' ? 80 : s === 'ESFP' ? 80 : 78;

  document.getElementById('mbti-match-pct').textContent = finalPct;
  const ring = document.getElementById('mbti-match-ring');
  ring.setAttribute('stroke-dashoffset', 339 * (1 - finalPct / 100));

  let descText;
  if (finalPct >= 90) descText = '🌟 天作之合！你们的性格完美互补，像拼图一样契合！';
  else if (finalPct >= 80) descText = '💖 非常合拍！虽然性格不同，但正是这些差异让你们彼此吸引。';
  else if (finalPct >= 65) descText = '🌈 互补型CP！你们能在彼此身上学到很多，关系充满成长空间。';
  else if (finalPct >= 50) descText = '🌤️ 需要磨合。性格差异较大，但真爱能跨越一切——沟通是你们的秘密武器。';
  else descText = '🌙 特别的存在。你们是两个独立的世界，但正是这种独特让关系格外精彩。';

  document.getElementById('mbti-match-desc').textContent = descText;

  const st = MBTI_TYPES.find(x => x.code === s) || {};
  const bt = MBTI_TYPES.find(x => x.code === b) || {};
  document.getElementById('mbti-match-detail').innerHTML =
    '<p>🐹 鼠鼠：' + (st.icon||'') + ' <b>' + s + '</b> ' + (st.name||'') + '</p>' +
    '<p>🐱 笔笔：' + (bt.icon||'') + ' <b>' + b + '</b> ' + (bt.name||'') + '</p>' +
    '<p style="margin-top:8px;font-style:italic;">"了解彼此的人格，不是为了贴标签，而是为了更好地理解和接纳对方的独一无二。"</p>';
}

// 初始化 MBTI
(function() {
  initMbtiData();
  setTimeout(() => {
    renderMbtiGrid();
    renderMbtiDisplay();
    renderMbtiMatch();
  }, 100);
})();

// ============================================================
//  🎵 音乐星球
// ============================================================
const MUSIC_TRACKS = [
  // 星空氛围 ambient
  { id:'amb1', title:'星海漫游', artist:'音乐星球', icon:'🌌', genre:'ambient', duration:'3:42', freq:[220,277,330,440], wave:'sine', bpm:60 },
  { id:'amb2', title:'月光浮游', artist:'音乐星球', icon:'🌙', genre:'ambient', duration:'4:15', freq:[261,329,392,523], wave:'sine', bpm:55 },
  { id:'amb3', title:'极光之舞', artist:'音乐星球', icon:'🌠', genre:'ambient', duration:'3:18', freq:[196,246,293,392], wave:'triangle', bpm:50 },
  { id:'amb4', title:'深邃宇宙', artist:'音乐星球', icon:'🪐', genre:'ambient', duration:'4:02', freq:[165,220,330,440], wave:'sine', bpm:48 },
  // 舒缓钢琴 piano
  { id:'piano1', title:'晨露轻语', artist:'音乐星球', icon:'💧', genre:'piano', duration:'2:55', freq:[523,659,784,1047], wave:'sine', bpm:72 },
  { id:'piano2', title:'黄昏絮语', artist:'音乐星球', icon:'🌅', genre:'piano', duration:'3:20', freq:[440,554,660,880], wave:'sine', bpm:68 },
  { id:'piano3', title:'樱花落', artist:'音乐星球', icon:'🌸', genre:'piano', duration:'3:05', freq:[392,494,587,784], wave:'triangle', bpm:65 },
  // Lo-Fi 咖啡 lofi
  { id:'lofi1', title:'午后咖啡馆', artist:'音乐星球', icon:'☕', genre:'lofi', duration:'3:30', freq:[330,392,440,523], wave:'sine', bpm:80 },
  { id:'lofi2', title:'雨天窗边', artist:'音乐星球', icon:'🌧️', genre:'lofi', duration:'3:45', freq:[262,330,392,440], wave:'triangle', bpm:75 },
  { id:'lofi3', title:'城市霓虹', artist:'音乐星球', icon:'🌃', genre:'lofi', duration:'3:15', freq:[294,370,440,554], wave:'sine', bpm:85 },
  // 自然之声 nature
  { id:'nat1', title:'森林晨歌', artist:'音乐星球', icon:'🌲', genre:'nature', duration:'4:00', freq:[280,350,420], wave:'sine', bpm:45 },
  { id:'nat2', title:'海浪轻拍', artist:'音乐星球', icon:'🌊', genre:'nature', duration:'4:20', freq:[200,260,330], wave:'triangle', bpm:40 },
  { id:'nat3', title:'溪涧私语', artist:'音乐星球', icon:'💧', genre:'nature', duration:'3:50', freq:[230,300,370], wave:'sine', bpm:42 },
  // 元气流行 pop
  { id:'pop1', title:'甜蜜加速度', artist:'音乐星球', icon:'💕', genre:'pop', duration:'2:48', freq:[440,554,660,880], wave:'sine', bpm:120 },
  { id:'pop2', title:'心跳节拍', artist:'音乐星球', icon:'💓', genre:'pop', duration:'3:10', freq:[523,659,784,988], wave:'triangle', bpm:115 },
  { id:'pop3', title:'元气满满', artist:'音乐星球', icon:'⚡', genre:'pop', duration:'2:35', freq:[494,622,740,932], wave:'sine', bpm:125 },
];

let musicAudioCtx = null;
let musicGainNode = null;
let musicCurrentTrack = null;
let musicIsPlaying = false;
let musicShuffle = false;
let musicRepeat = false;
let musicAutoPlay = true;
let musicVolume = 0.7;
let musicPlaylist = [];
let musicFilteredGenre = 'all';
let musicUploadedTracks = [];
let musicOscNodes = [];
let musicStartTime = 0;
let musicPauseOffset = 0;
let musicProgressInterval = null;
let musicOrbitAnimId = null;

function initMusicEngine() {
  if (musicAudioCtx) return;
  musicAudioCtx = new (window.AudioContext || window.webkitAudioContext)();
  musicGainNode = musicAudioCtx.createGain();
  musicGainNode.gain.value = musicVolume;
  musicGainNode.connect(musicAudioCtx.destination);
  // 移动端：创建后立即尝试恢复（利用用户手势上下文）
  if (musicAudioCtx.state === 'suspended') {
    musicAudioCtx.resume().catch(() => {});
  }
  // 加载上传的曲目
  const saved = getData('music_uploaded', null);
  musicUploadedTracks = saved || [];
  musicPlaylist = [...MUSIC_TRACKS, ...musicUploadedTracks];
  renderMusicPlaylist();
  renderMusicOrbit();
  if (musicAutoPlay) {
    // 不自动播放，等待用户交互
  }
}

function musicSetVolume(val) {
  musicVolume = val / 100;
  if (musicGainNode) musicGainNode.gain.value = musicVolume;
}

function musicToggleShuffle() {
  musicShuffle = !musicShuffle;
  document.getElementById('music-btn-shuffle').classList.toggle('active', musicShuffle);
}

function musicToggleRepeat() {
  musicRepeat = !musicRepeat;
  document.getElementById('music-btn-repeat').classList.toggle('active', musicRepeat);
}

function musicToggleAutoplay() {
  musicAutoPlay = !musicAutoPlay;
  document.getElementById('music-btn-autoplay').classList.toggle('active', musicAutoPlay);
}

function musicFilterGenre(genre) {
  musicFilteredGenre = genre;
  document.querySelectorAll('.music-genre-tab').forEach(t => t.classList.toggle('active', t.textContent.includes(genre) || (genre==='all' && t.textContent==='全部')));
  renderMusicPlaylist();
}

function renderMusicPlaylist() {
  const list = document.getElementById('music-track-list');
  if (!list) return;
  const tracks = musicFilteredGenre === 'all' ? musicPlaylist : musicPlaylist.filter(t => t.genre === musicFilteredGenre);
  list.innerHTML = tracks.map(t => {
    const isPlaying = musicCurrentTrack && musicCurrentTrack.id === t.id;
    return '<div class="music-track-item' + (isPlaying ? ' playing' : '') + '" onclick="musicPlayTrack(\'' + t.id + '\')">' +
      '<span class="track-genre-icon">' + t.icon + '</span>' +
      '<div class="track-info"><div class="track-title">' + t.title + '</div><div class="track-artist">' + t.artist + '</div></div>' +
      '<span class="track-duration">' + t.duration + '</span>' +
      '</div>';
  }).join('');
}

function musicPlayTrack(id) {
  const track = musicPlaylist.find(t => t.id === id);
  if (!track) return;

  // 停止当前
  musicStop();

  if (track.freq) {
    // 合成音乐（async，内部会处理 resume 等待）
    musicCurrentTrack = track;
    musicPlaySynthesized(track);
  } else if (track.url) {
    // 上传的音乐文件
    musicCurrentTrack = track;
    musicPlayAudioFile(track);
  }

  musicIsPlaying = true;
  musicUpdateUI();
  renderMusicPlaylist();
}

async function musicPlaySynthesized(track) {
  if (!musicAudioCtx) initMusicEngine();
  // 🔑 关键修复：移动端 AudioContext 默认 suspended，必须 await resume()
  if (musicAudioCtx.state === 'suspended') {
    try { await musicAudioCtx.resume(); } catch(e) {}
  }
  // 如果 resume 后还是 suspended（iOS 限制），提示用户
  if (musicAudioCtx.state !== 'running') {
    showToast('🎵 请点击屏幕任意位置激活音频');
    return;
  }

  // ⚠️ 在 resume() 之后重新获取 currentTime，避免使用冻结的时间戳
  const now = musicAudioCtx.currentTime;
  musicStartTime = now;
  musicPauseOffset = 0;

  const secondsPerBeat = 60 / track.bpm;
  const totalBeats = 8;

  // 为每个频率创建振荡器组
  musicOscNodes = [];
  let endedCount = 0;
  const totalOscs = track.freq.length;

  track.freq.forEach((freq, idx) => {
    const osc = musicAudioCtx.createOscillator();
    const gain = musicAudioCtx.createGain();
    osc.type = track.wave || 'sine';
    osc.frequency.value = freq;
    gain.gain.value = 0.08 / track.freq.length;
    gain.gain.setValueAtTime(0, now);

    // 渐入
    gain.gain.linearRampToValueAtTime(0.08 / track.freq.length, now + 0.5);

    // 节奏型：每拍交替
    for (let beat = 0; beat < totalBeats; beat++) {
      const t = now + beat * secondsPerBeat;
      if (beat % 2 === idx % 2 || track.genre === 'ambient') {
        gain.gain.setValueAtTime(0.06 / track.freq.length, t);
        gain.gain.linearRampToValueAtTime(0.1 / track.freq.length, t + secondsPerBeat * 0.3);
        gain.gain.linearRampToValueAtTime(0.04 / track.freq.length, t + secondsPerBeat * 0.8);
      }
    }

    // 渐出
    gain.gain.linearRampToValueAtTime(0, now + totalBeats * secondsPerBeat + 0.3);

    osc.connect(gain);
    gain.connect(musicGainNode);
    osc.start(now);
    osc.stop(now + totalBeats * secondsPerBeat + 0.5);

    musicOscNodes.push({ osc, gain });

    osc.onended = () => {
      endedCount++;
      if (endedCount >= totalOscs) {
        // 所有振荡器结束后
        if (musicRepeat) {
          setTimeout(() => musicPlayTrack(track.id), 200);
        } else {
          musicNext();
        }
      }
    };
  });

  musicStartProgressTracking(track);
}

function musicPlayAudioFile(track) {
  // 使用 Audio element 播放上传的文件
  const audio = new Audio(track.url);
  audio.volume = musicVolume;
  audio.play().catch(e => {});
  audio.onended = () => {
    if (musicRepeat) {
      audio.currentTime = 0;
      audio.play().catch(e => {});
    } else {
      musicNext();
    }
  };
  // 存储引用用于控制
  musicOscNodes = [{ audio }];
  musicStartProgressTracking(track, audio);
}

function musicStartProgressTracking(track, audioEl) {
  if (musicProgressInterval) clearInterval(musicProgressInterval);
  const totalSec = parseDuration(track.duration);
  musicProgressInterval = setInterval(() => {
    let currentSec;
    if (audioEl) {
      currentSec = audioEl.currentTime || 0;
    } else {
      const elapsed = (musicAudioCtx.currentTime - musicStartTime) + musicPauseOffset;
      currentSec = Math.min(elapsed, totalSec);
    }
    const pct = totalSec > 0 ? (currentSec / totalSec) * 100 : 0;
    document.getElementById('music-progress-fill').style.width = pct + '%';
    document.getElementById('music-progress-thumb').style.left = pct + '%';
    document.getElementById('music-time-current').textContent = formatTime(currentSec);
    document.getElementById('music-time-total').textContent = track.duration;
    if (currentSec >= totalSec && !musicRepeat) {
      clearInterval(musicProgressInterval);
    }
  }, 100);
}

function parseDuration(dur) {
  if (typeof dur === 'number') return dur;
  const parts = (dur || '0:00').split(':');
  return parseInt(parts[0]) * 60 + parseInt(parts[1] || 0);
}

function formatTime(sec) {
  const m = Math.floor(sec / 60);
  const s = Math.floor(sec % 60);
  return m.toString().padStart(2, '0') + ':' + s.toString().padStart(2, '0');
}

function musicTogglePlay() {
  if (!musicCurrentTrack) {
    if (musicPlaylist.length > 0) musicPlayTrack(musicPlaylist[0].id);
    return;
  }
  if (musicIsPlaying) {
    musicPause();
  } else {
    musicResume();
  }
}

function musicPause() {
  musicIsPlaying = false;
  // 记录暂停位置
  if (musicAudioCtx) musicPauseOffset += musicAudioCtx.currentTime - musicStartTime;
  if (musicAudioCtx) musicAudioCtx.suspend();
  if (musicProgressInterval) clearInterval(musicProgressInterval);
  musicUpdateUI();
}

async function musicResume() {
  if (!musicCurrentTrack) return;
  if (musicAudioCtx) {
    if (musicAudioCtx.state === 'suspended') {
      try { await musicAudioCtx.resume(); } catch(e) {}
    }
    musicStartTime = musicAudioCtx.currentTime;
  }
  musicIsPlaying = true;
  musicStartProgressTracking(musicCurrentTrack);
  musicUpdateUI();
}

function musicStop() {
  musicIsPlaying = false;
  musicPauseOffset = 0;
  if (musicProgressInterval) clearInterval(musicProgressInterval);
  // 停止所有振荡器
  musicOscNodes.forEach(n => {
    try {
      if (n.osc) { n.osc.stop(); n.osc.disconnect(); }
      if (n.gain) n.gain.disconnect();
      if (n.audio) { n.audio.pause(); n.audio.src = ''; }
    } catch(e) {}
  });
  musicOscNodes = [];
  document.getElementById('music-progress-fill').style.width = '0%';
  document.getElementById('music-progress-thumb').style.left = '0%';
  document.getElementById('music-time-current').textContent = '00:00';
}

function musicNext() {
  if (!musicCurrentTrack) return;
  const idx = musicPlaylist.findIndex(t => t.id === musicCurrentTrack.id);
  let nextIdx;
  if (musicShuffle) {
    nextIdx = Math.floor(Math.random() * musicPlaylist.length);
  } else {
    nextIdx = (idx + 1) % musicPlaylist.length;
  }
  musicPlayTrack(musicPlaylist[nextIdx].id);
}

function musicPrev() {
  if (!musicCurrentTrack) return;
  const idx = musicPlaylist.findIndex(t => t.id === musicCurrentTrack.id);
  const prevIdx = (idx - 1 + musicPlaylist.length) % musicPlaylist.length;
  musicPlayTrack(musicPlaylist[prevIdx].id);
}

function musicUpdateUI() {
  const btn = document.getElementById('music-btn-play');
  if (btn) btn.textContent = musicIsPlaying ? '⏸️' : '▶️';
  const core = document.getElementById('music-planet-core');
  if (core) core.classList.toggle('playing', musicIsPlaying);

  if (musicCurrentTrack) {
    document.getElementById('music-track-icon').textContent = musicCurrentTrack.icon;
    document.getElementById('music-track-title').textContent = musicCurrentTrack.title;
    document.getElementById('music-track-artist').textContent = musicCurrentTrack.artist;
    document.getElementById('music-time-total').textContent = musicCurrentTrack.duration;
  }
}

function musicDownload() {
  if (!musicCurrentTrack) {
    showToast('⚠️ 请先选择一首音乐');
    return;
  }
  // 对于合成音乐，生成一个简单的WAV文件
  if (musicCurrentTrack.freq && musicAudioCtx) {
    const sampleRate = musicAudioCtx.sampleRate;
    const duration = parseDuration(musicCurrentTrack.duration);
    const length = sampleRate * duration;
    const buffer = musicAudioCtx.createBuffer(1, length, sampleRate);
    const data = buffer.getChannelData(0);
    const bpm = musicCurrentTrack.bpm;
    const spb = 60 / bpm;
    for (let i = 0; i < length; i++) {
      const t = i / sampleRate;
      let sample = 0;
      musicCurrentTrack.freq.forEach((freq, idx) => {
        const beatPhase = (t % spb) / spb;
        let env = 1;
        if (beatPhase < 0.1) env = beatPhase / 0.1;
        else if (beatPhase > 0.7) env = (1 - beatPhase) / 0.3;
        const vol = 0.15 / musicCurrentTrack.freq.length;
        sample += Math.sin(2 * Math.PI * freq * t) * env * vol;
      });
      // 淡入淡出
      if (t < 0.5) sample *= t / 0.5;
      if (t > duration - 0.5) sample *= (duration - t) / 0.5;
      data[i] = Math.max(-0.8, Math.min(0.8, sample));
    }
    // 编码为WAV
    const wav = encodeWav(buffer);
    const blob = new Blob([wav], { type: 'audio/wav' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = musicCurrentTrack.title + '.wav';
    a.click();
    URL.revokeObjectURL(url);
    showToast('💾 ' + musicCurrentTrack.title + ' 下载中...');
  } else {
    showToast('💾 请右键点击歌单中的曲目下载');
  }
}

function encodeWav(buffer) {
  const numChannels = buffer.numberOfChannels;
  const sampleRate = buffer.sampleRate;
  const format = 1; // PCM
  const bitsPerSample = 16;
  const data = buffer.getChannelData(0);
  const dataLength = data.length * (bitsPerSample / 8);
  const headerLength = 44;
  const totalLength = headerLength + dataLength;
  const arrayBuffer = new ArrayBuffer(totalLength);
  const view = new DataView(arrayBuffer);

  writeString(view, 0, 'RIFF');
  view.setUint32(4, totalLength - 8, true);
  writeString(view, 8, 'WAVE');
  writeString(view, 12, 'fmt ');
  view.setUint32(16, 16, true);
  view.setUint16(20, format, true);
  view.setUint16(22, numChannels, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * numChannels * (bitsPerSample / 8), true);
  view.setUint16(32, numChannels * (bitsPerSample / 8), true);
  view.setUint16(34, bitsPerSample, true);
  writeString(view, 36, 'data');
  view.setUint32(40, dataLength, true);

  for (let i = 0; i < data.length; i++) {
    const sample = Math.max(-1, Math.min(1, data[i]));
    const intSample = sample < 0 ? sample * 0x8000 : sample * 0x7FFF;
    view.setInt16(headerLength + i * 2, intSample, true);
  }

  return arrayBuffer;
}

function writeString(view, offset, str) {
  for (let i = 0; i < str.length; i++) {
    view.setUint8(offset + i, str.charCodeAt(i));
  }
}

function handleMusicUpload(event) {
  const files = event.target.files;
  if (!files.length) return;
  Array.from(files).forEach(file => {
    if (!file.type.startsWith('audio/')) return;
    const reader = new FileReader();
    reader.onload = function(e) {
      const id = 'upload_' + Date.now() + '_' + Math.random().toString(36).slice(2,6);
      const name = file.name.replace(/\.(mp3|wav|ogg|aac|m4a|flac)$/i, '');
      const track = {
        id, title: name, artist: '我的上传',
        icon: '📁', genre: 'uploaded',
        duration: '--:--', url: e.target.result
      };
      musicUploadedTracks.unshift(track);
      setData('music_uploaded', musicUploadedTracks);
      musicPlaylist = [...MUSIC_TRACKS, ...musicUploadedTracks];
      renderMusicPlaylist();
      showToast('📤 已添加：' + name);
    };
    reader.readAsDataURL(file);
  });
}

// 音乐星球轨道动画
function renderMusicOrbit() {
  const canvas = document.getElementById('music-orbit-canvas');
  if (!canvas) return;
  const W = canvas.parentElement.clientWidth;
  const H = canvas.parentElement.clientHeight;
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext('2d');

  const particles = [];
  for (let i = 0; i < 60; i++) {
    particles.push({
      angle: Math.random() * Math.PI * 2,
      dist: 70 + Math.random() * 140,
      speed: (0.2 + Math.random() * 0.5) * (Math.random() > 0.5 ? 1 : -1),
      size: 1 + Math.random() * 2.5,
      opacity: 0.3 + Math.random() * 0.6,
    });
  }

  function draw() {
    ctx.clearRect(0, 0, W, H);
    const cx = W / 2, cy = H / 2;

    particles.forEach(p => {
      p.angle += p.speed * 0.008;
      const x = cx + Math.cos(p.angle) * p.dist * (W / 700);
      const y = cy + Math.sin(p.angle) * p.dist * (H / 280) * 0.4;
      const pulse = musicIsPlaying ? 0.6 + Math.sin(Date.now() * 0.003 + p.angle) * 0.4 : 1;
      ctx.fillStyle = 'rgba(196,181,253,' + (p.opacity * pulse) + ')';
      ctx.beginPath();
      ctx.arc(x, y, p.size, 0, Math.PI * 2);
      ctx.fill();
    });

    musicOrbitAnimId = requestAnimationFrame(draw);
  }
  draw();
}

// 初始化音乐星球 — 用 touchstart + click 双保险确保移动端激活 AudioContext
document.addEventListener('click', function musicInit() {
  // 如果 AudioContext 已存在但处于 suspended，尝试恢复
  if (musicAudioCtx && musicAudioCtx.state === 'suspended') {
    musicAudioCtx.resume().catch(() => {});
  }
  if (!musicAudioCtx && document.getElementById('page-music-planet')) {
    try { initMusicEngine(); } catch(e) {}
  }
}, { once: false });
document.addEventListener('touchstart', function musicTouchInit() {
  if (musicAudioCtx && musicAudioCtx.state === 'suspended') {
    musicAudioCtx.resume().catch(() => {});
  }
  if (!musicAudioCtx && document.getElementById('page-music-planet')) {
    try { initMusicEngine(); } catch(e) {}
  }
}, { once: false });

// 清理
window.addEventListener('beforeunload', () => {
  if (musicOrbitAnimId) cancelAnimationFrame(musicOrbitAnimId);
  if (musicProgressInterval) clearInterval(musicProgressInterval);
  musicStop();
});

// ============================================================
//  新增页面渲染函数（switchPage 中调用的缺失函数）
// ============================================================

function renderMoodPage() {
  const saved = getData('mood_data', null);
  if (saved) {
    if (saved.shushu) {
      const el = document.getElementById('shushu-mood-display');
      const moods = { sunny: '☀️ 晴天', cloudy: '☁️ 疲惫', love: '🥰 想贴贴', space: '🌙 需空间', storm: '⛈️ 烦躁', sick: '🤒 不舒服' };
      if (el) el.textContent = moods[saved.shushu] || '☀️ 晴天';
      if (saved.shushu_mood) {
        document.querySelectorAll('#shushu-mood-grid .mood-btn').forEach(b => b.classList.remove('active'));
        const ab = document.querySelector('#shushu-mood-grid .mood-btn[data-mood="' + saved.shushu + '"]');
        if (ab) ab.classList.add('active');
      }
    }
    if (saved.bibi) {
      const el = document.getElementById('bibi-mood-display');
      const moods = { sunny: '☀️ 晴天', cloudy: '☁️ 疲惫', love: '🥰 想贴贴', space: '🌙 需空间', storm: '⛈️ 烦躁', sick: '🤒 不舒服' };
      if (el) el.textContent = moods[saved.bibi] || '☀️ 晴天';
      if (saved.bibi_mood) {
        document.querySelectorAll('#bibi-mood-grid .mood-btn').forEach(b => b.classList.remove('active'));
        const ab = document.querySelector('#bibi-mood-grid .mood-btn[data-mood="' + saved.bibi + '"]');
        if (ab) ab.classList.add('active');
      }
    }
  }
  updateMoodWeather();
}

function renderBlindboxPage() {
  // 检查今天的盲盒状态
  const saved = getData('blindbox_data', null);
  const today = new Date().toISOString().split('T')[0];
  const boxArea = document.getElementById('blindbox-area');
  if (!boxArea) return;
  if (saved && saved.date === today && saved.opened) {
    boxArea.innerHTML = '<div class="blindbox-opened"><div class="blindbox-opened-icon">' + saved.task.icon + '</div><h3>' + saved.task.title + '</h3><p>' + saved.task.desc + '</p><button class="btn-primary" onclick="completeBlindbox()">✅ 完成任务 (+50 EXP)</button></div>';
  } else {
    boxArea.innerHTML = '<div class="blindbox-closed" onclick="openBlindbox()"><div class="blindbox-box">🎁</div><p>点击打开今日盲盒</p></div>';
  }
  renderBlindboxHistory();
}

function renderQuizPage() {
  // 重置答题状态
  if (typeof quizState !== 'undefined') {
    quizState.currentQuestion = 0;
    quizState.answers = [];
    quizState.score = 0;
    quizState.selectedUser = quizState.selectedUser || 'shushu';
  }
  document.getElementById('quiz-result').classList.add('hidden');
  document.getElementById('quiz-question-area').classList.remove('hidden');
  renderQuizQuestion();
}

function renderWishlistPage() {
  const list = document.getElementById('wishlist-list');
  if (!list) return;
  const saved = getData('wishlist', []);
  const filter = document.getElementById('wishlist-filter') ? document.getElementById('wishlist-filter').value : 'all';
  let items = saved;
  if (filter === 'done') items = saved.filter(w => w.done);
  else if (filter === 'undone') items = saved.filter(w => !w.done);
  
  const total = saved.length;
  const done = saved.filter(w => w.done).length;
  const pct = total > 0 ? Math.round((done / total) * 100) : 0;
  document.getElementById('wishlist-progress-text').textContent = done + '/' + total + ' 已完成';
  document.getElementById('wishlist-progress-bar').style.width = pct + '%';
  
  list.innerHTML = items.map((w, i) => '<div class="wish-item' + (w.done ? ' done' : '') + '"><div class="wish-check" onclick="toggleWish(' + i + ')">' + (w.done ? '✅' : '⬜') + '</div><div class="wish-content"><div class="wish-title">' + w.text + '</div>' + (w.done && w.date ? '<div class="wish-date">完成于 ' + w.date + '</div>' : '') + '</div></div>').join('') || '<p style="text-align:center;color:#9ca3af;">还没有添加愿望，快来写吧！</p>';
}

function renderTarotPage() {
  renderTarotHistory();
}

function renderBaguaPage() {
  // Nothing to pre-render, interaction-driven
}

function renderDicePage() {
  renderDiceHistory();
}

// ============================================================
//  🌾 开心农场
// ============================================================
const FARM_CROPS = {
  'carrot': { name:'🥕 胡萝卜', icon:'🥕', growTime:3, price:15, buyPrice:5, color:'#f97316' },
  'tomato': { name:'🍅 小番茄', icon:'🍅', growTime:4, price:20, buyPrice:8, color:'#ef4444' },
  'corn':   { name:'🌽 玉米',   icon:'🌽', growTime:5, price:25, buyPrice:10, color:'#eab308' },
  'lettuce':{ name:'🥬 生菜',   icon:'🥬', growTime:2, price:12, buyPrice:4, color:'#22c55e' },
  'strawberry':{ name:'🍓 草莓', icon:'🍓', growTime:6, price:35, buyPrice:15, color:'#ef4444' },
  'sunflower':{ name:'🌻 向日葵', icon:'🌻', growTime:4, price:18, buyPrice:7, color:'#fbbf24' },
  'watermelon':{ name:'🍉 西瓜', icon:'🍉', growTime:7, price:45, buyPrice:20, color:'#059669' },
  'rose':   { name:'🌹 玫瑰',   icon:'🌹', growTime:5, price:30, buyPrice:12, color:'#3b82f6' },
};

function getFarmData() { try{return JSON.parse(localStorage.getItem('lb_farm')||'{}')}catch(e){return{}} }
function saveFarmData(d) { const cur=getFarmData(); const m={...cur,...d}; setData('farm',m); return m; }

function initFarmData() {
  const d = getFarmData();
  if (!d.plots) {
    const plots = [];
    for (let i=0;i<6;i++) plots.push({ id:i, crop:null, plantedAt:null, waterCount:0, lastWaterDate:null, stage:0 });
    return saveFarmData({ plots, coins: 100, level: 1, harvests:[], waterToday:0, lastWaterReset:getToday() });
  }
  // Reset daily water
  const today = getToday();
  if (d.lastWaterReset !== today) {
    d.waterToday = 0;
    d.lastWaterReset = today;
    saveFarmData(d);
  }
  return d;
}

function renderFarmPage() {
  const d = initFarmData();
  document.getElementById('farm-level').textContent = d.level || 1;
  document.getElementById('farm-coins').textContent = d.coins || 0;
  document.getElementById('farm-water-count').textContent = d.waterToday || 0;

  // Render plots
  const grid = document.getElementById('farm-grid');
  const plots = d.plots || [];
  grid.innerHTML = plots.map((p,i) => {
    let stageHtml = '';
    let actionsHtml = '';
    if (p.crop) {
      const crop = FARM_CROPS[p.crop];
      const elapsed = p.stage || 0;
      const maxStage = crop.growTime;
      const pct = Math.min(100, (elapsed/maxStage)*100);
      let growthIcon = '🌱';
      if (pct >= 100) growthIcon = crop.icon;
      else if (pct >= 66) growthIcon = '🌿';
      else if (pct >= 33) growthIcon = '🌱';
      
      stageHtml = '<div class="farm-crop-icon">' + growthIcon + '</div>'
        + '<div class="farm-crop-name">' + crop.name + '</div>'
        + '<div class="farm-grow-bar"><div class="farm-grow-fill" style="width:' + pct + '%"></div></div>'
        + '<span class="farm-grow-text">' + (pct>=100 ? '已成熟！🎉' : '生长中 ' + pct.toFixed(0) + '%') + '</span>';
      
      if (pct >= 100) {
        actionsHtml = '<button class="btn-primary farm-btn" onclick="harvestCrop(' + i + ')">🪣 收获</button>';
      } else if (p.waterCount < 3) {
        actionsHtml = '<button class="btn-secondary farm-btn" onclick="waterCrop(' + i + ')">💧 浇水</button>';
      } else {
        actionsHtml = '<span style="color:#9ca3af;font-size:12px;">💧 已浇满</span>';
      }
    } else {
      stageHtml = '<div class="farm-empty-plot">🟫</div><span style="color:#9ca3af;font-size:11px;">空地</span>';
    }
    return '<div class="farm-plot" id="farm-plot-' + i + '">' + stageHtml + '<div class="farm-actions">' + actionsHtml + '</div></div>';
  }).join('');

  // Render shop
  const seeds = document.getElementById('farm-seed-list');
  seeds.innerHTML = Object.entries(FARM_CROPS).map(([k,v]) => {
    const canBuy = (d.coins||0) >= v.buyPrice;
    return '<div class="farm-seed-card' + (canBuy?'':' disabled') + '" onclick="' + (canBuy?'buySeed(\'' + k + '\')':'') + '">'
      + '<span class="farm-seed-icon">' + v.icon + '</span>'
      + '<span class="farm-seed-name">' + v.name + '</span>'
      + '<span class="farm-seed-info">⏱ ' + v.growTime + '天 | 💰 卖' + v.price + '币</span>'
      + '<span class="farm-seed-price">🪙 ' + v.buyPrice + '</span>'
      + '</div>';
  }).join('');

  // Harvested items
  const harvests = d.harvests || [];
  const harvestList = document.getElementById('farm-harvest-list');
  if (harvests.length === 0) {
    harvestList.innerHTML = '<p style="color:#9ca3af;text-align:center;padding:16px;">🎒 仓库空空如也~快种点菜吧！</p>';
  } else {
    const counts = {};
    harvests.forEach(h => { counts[h] = (counts[h]||0) + 1; });
    harvestList.innerHTML = Object.entries(counts).map(([k,c]) => {
      const crop = FARM_CROPS[k] || { icon:'🌱', name:k };
      return '<div class="farm-harvest-item"><span>' + crop.icon + '</span> ' + crop.name + ' x' + c + '</div>';
    }).join('');
  }
}

function getEmptyPlot() {
  const d = getFarmData();
  const plots = d.plots || [];
  const emptyIdx = plots.findIndex(p => !p.crop);
  return emptyIdx >= 0 ? emptyIdx : -1;
}

function buySeed(cropKey) {
  const d = getFarmData();
  const crop = FARM_CROPS[cropKey];
  if (!crop) return;
  if ((d.coins||0) < crop.buyPrice) { showToast('🪙 金币不足！'); return; }
  const emptyIdx = getEmptyPlot();
  if (emptyIdx < 0) { showToast('🌾 没有空地了！先收获再种吧~'); return; }

  d.coins -= crop.buyPrice;
  d.plots[emptyIdx] = { id:emptyIdx, crop:cropKey, plantedAt:new Date().toISOString(), waterCount:0, lastWaterDate:null, stage:0 };
  saveFarmData(d);
  renderFarmPage();
  showToast('已种下 ' + crop.name + '！记得每天浇水哦 💧');

}

function waterCrop(idx) {
  const d = getFarmData();
  const plot = d.plots[idx];
  if (!plot || !plot.crop) return;
  if (plot.waterCount >= 3) { showToast('💧 已经浇满了！'); return; }
  if ((d.waterToday||0) >= 10) { showToast('💧 今日浇水次数已用完，明天再来吧~'); return; }
  
  plot.waterCount++;
  plot.lastWaterDate = getToday();
  d.waterToday = (d.waterToday||0) + 1;
  
  // Watering speeds up growth
  plot.stage = Math.min((FARM_CROPS[plot.crop]?.growTime || 4), (plot.stage||0) + 0.5);
  
  saveFarmData(d);
  renderFarmPage();
  showToast('💧 浇水成功！' + (plot.waterCount >= 3 ? '已浇满！' : '还差' + (3-plot.waterCount) + '次'));

}

function harvestCrop(idx) {
  const d = getFarmData();
  const plot = d.plots[idx];
  if (!plot || !plot.crop) return;
  const crop = FARM_CROPS[plot.crop];
  if (!crop) return;
  const maxStage = crop.growTime;
  if ((plot.stage||0) < maxStage) { showToast('⏳ 还没成熟呢~'); return; }

  d.coins = (d.coins||0) + crop.price;
  if (!d.harvests) d.harvests = [];
  d.harvests.push(plot.crop);
  
  // Check level up
  const totalHarvests = d.harvests.length;
  const newLevel = Math.min(10, 1 + Math.floor(totalHarvests / 5));
  if (newLevel > (d.level||1)) {
    d.level = newLevel;
    showToast('🎉 农场升级！Lv.' + newLevel + ' 解锁更多作物！');
  }

  // Reset plot
  d.plots[idx] = { id:idx, crop:null, plantedAt:null, waterCount:0, lastWaterDate:null, stage:0 };
  
  saveFarmData(d);
  renderFarmPage();
  showToast('🪣 收获 ' + crop.name + '！+🪙' + crop.price + ' 金币');

}

// ============================================================
//  每日签到（升级经验来源）
// ============================================================
function doDailySignIn() {
  const d = getLoveData();
  const today = getToday();
  if (d.lastSignInDate === today) {
    showToast('✅ 今日已签到！');
    return;
  }
  d.lastSignInDate = today;
  d.signInStreak = (d.signInStreak || 0) + 1;
  const bonus = 10 + Math.min(d.signInStreak * 2, 30); // 10~40 EXP per day
  saveLoveData(d);

  showToast('✅ 签到成功！+EXP ' + bonus + (d.signInStreak >= 7 ? ' 🔥 连续' + d.signInStreak + '天！' : ''));
}

// 页面加载时自动签到
function autoSignIn() {
  const d = getLoveData();
  const today = getToday();
  if (d.lastSignInDate !== today) {
    doDailySignIn();
  }
}

function renderMusicPlanetPage() {
  if (!musicAudioCtx) {
    try { initMusicEngine(); } catch(e) {}
  }
  // 刷新播放列表
  if (typeof renderMusicPlaylist === 'function') renderMusicPlaylist();
  // 启动轨道动画
  if (typeof renderMusicOrbit === 'function') renderMusicOrbit();
}

// ============================================================
//  📝 城市便利贴
// ============================================================

// 国家 → 城市 数据
const COUNTRY_CITIES = {
  '🇨🇳 中国': ['北京','上海','广州','深圳','成都','重庆','杭州','南京','武汉','西安','长沙','苏州','厦门','青岛','大连','昆明','三亚','拉萨','哈尔滨','桂林','丽江','大理','天津','沈阳','济南','郑州','合肥','福州','南宁','海口','贵阳','南昌','乌鲁木齐','兰州','银川','西宁','呼和浩特','澳门','香港','台北'],
  '🇯🇵 日本': ['东京','京都','大阪','札幌','福冈','名古屋','神户','奈良','冲绳','横滨'],
  '🇰🇷 韩国': ['首尔','釜山','济州','仁川','大邱'],
  '🇹🇭 泰国': ['曼谷','清迈','普吉岛','芭提雅','苏梅岛','甲米'],
  '🇸🇬 新加坡': ['新加坡'],
  '🇲🇾 马来西亚': ['吉隆坡','槟城','兰卡威','沙巴','马六甲'],
  '🇻🇳 越南': ['河内','胡志明市','岘港','芽庄','会安'],
  '🇮🇩 印度尼西亚': ['巴厘岛','雅加达','日惹','龙目岛'],
  '🇵🇭 菲律宾': ['马尼拉','长滩岛','宿务','薄荷岛'],
  '🇮🇳 印度': ['新德里','孟买','斋浦尔','阿格拉','果阿'],
  '🇰🇭 柬埔寨': ['暹粒','金边'],
  '🇲🇲 缅甸': ['仰光','蒲甘','曼德勒'],
  '🇱🇰 斯里兰卡': ['科伦坡','康提','加勒'],
  '🇲🇻 马尔代夫': ['马累'],
  '🇳🇵 尼泊尔': ['加德满都','博卡拉'],
  '🇦🇪 阿联酋': ['迪拜','阿布扎比'],
  '🇹🇷 土耳其': ['伊斯坦布尔','卡帕多奇亚','安塔利亚','棉花堡'],
  '🇮🇱 以色列': ['耶路撒冷','特拉维夫'],
  '🇮🇷 伊朗': ['德黑兰','伊斯法罕'],
  '🇶🇦 卡塔尔': ['多哈'],
  '🇸🇦 沙特阿拉伯': ['利雅得','吉达'],
  '🇫🇷 法国': ['巴黎','尼斯','马赛','里昂','波尔多','普罗旺斯'],
  '🇮🇹 意大利': ['罗马','威尼斯','佛罗伦萨','米兰','那不勒斯','五渔村','比萨'],
  '🇪🇸 西班牙': ['巴塞罗那','马德里','塞维利亚','格拉纳达','瓦伦西亚'],
  '🇬🇧 英国': ['伦敦','爱丁堡','曼彻斯特','利物浦','牛津','剑桥'],
  '🇩🇪 德国': ['柏林','慕尼黑','法兰克福','汉堡','科隆','海德堡'],
  '🇨🇭 瑞士': ['苏黎世','日内瓦','卢塞恩','因特拉肯','采尔马特'],
  '🇳🇱 荷兰': ['阿姆斯特丹','鹿特丹','海牙'],
  '🇧🇪 比利时': ['布鲁塞尔','布鲁日','安特卫普'],
  '🇦🇹 奥地利': ['维也纳','萨尔茨堡','哈尔施塔特'],
  '🇨🇿 捷克': ['布拉格','CK小镇'],
  '🇭🇺 匈牙利': ['布达佩斯'],
  '🇬🇷 希腊': ['雅典','圣托里尼','米克诺斯','克里特岛'],
  '🇵🇹 葡萄牙': ['里斯本','波尔图','辛特拉'],
  '🇸🇪 瑞典': ['斯德哥尔摩','哥德堡'],
  '🇳🇴 挪威': ['奥斯陆','卑尔根','特罗姆瑟'],
  '🇫🇮 芬兰': ['赫尔辛基','罗瓦涅米'],
  '🇩🇰 丹麦': ['哥本哈根'],
  '🇮🇸 冰岛': ['雷克雅未克'],
  '🇭🇷 克罗地亚': ['杜布罗夫尼克','萨格勒布','斯普利特'],
  '🇮🇪 爱尔兰': ['都柏林','高威'],
  '🇷🇺 俄罗斯': ['莫斯科','圣彼得堡','贝加尔湖','摩尔曼斯克'],
  '🇵🇱 波兰': ['华沙','克拉科夫'],
  '🇺🇸 美国': ['纽约','洛杉矶','旧金山','芝加哥','拉斯维加斯','波士顿','西雅图','华盛顿','迈阿密','檀香山','奥兰多','新奥尔良'],
  '🇨🇦 加拿大': ['多伦多','温哥华','蒙特利尔','魁北克','班夫','渥太华'],
  '🇲🇽 墨西哥': ['墨西哥城','坎昆','瓜纳华托'],
  '🇧🇷 巴西': ['里约热内卢','圣保罗','萨尔瓦多'],
  '🇦🇷 阿根廷': ['布宜诺斯艾利斯','乌斯怀亚','埃尔卡拉法特'],
  '🇨🇱 智利': ['圣地亚哥','复活节岛'],
  '🇵🇪 秘鲁': ['利马','库斯科','马丘比丘'],
  '🇨🇴 哥伦比亚': ['波哥大','卡塔赫纳','麦德林'],
  '🇨🇺 古巴': ['哈瓦那','巴拉德罗'],
  '🇨🇷 哥斯达黎加': ['圣何塞'],
  '🇦🇺 澳大利亚': ['悉尼','墨尔本','黄金海岸','凯恩斯','珀斯','布里斯班','阿德莱德'],
  '🇳🇿 新西兰': ['奥克兰','皇后镇','基督城','惠灵顿','罗托鲁瓦'],
  '🇫🇯 斐济': ['苏瓦','楠迪'],
  '🇲🇦 摩洛哥': ['卡萨布兰卡','马拉喀什','非斯','舍夫沙万','撒哈拉'],
  '🇪🇬 埃及': ['开罗','卢克索','阿斯旺','亚历山大','沙姆沙伊赫'],
  '🇿🇦 南非': ['开普敦','约翰内斯堡','德班'],
  '🇰🇪 肯尼亚': ['内罗毕','马赛马拉'],
  '🇹🇿 坦桑尼亚': ['达累斯萨拉姆','桑给巴尔'],
  '🇹🇳 突尼斯': ['突尼斯','蓝白小镇'],
  '🇸🇨 塞舌尔': ['维多利亚'],
  '🇲🇺 毛里求斯': ['路易港'],
};

// 国家 flags
const COUNTRY_FLAGS = {
  '🇨🇳 中国': '🇨🇳', '🇯🇵 日本': '🇯🇵', '🇰🇷 韩国': '🇰🇷', '🇹🇭 泰国': '🇹🇭',
  '🇸🇬 新加坡': '🇸🇬', '🇲🇾 马来西亚': '🇲🇾', '🇻🇳 越南': '🇻🇳', '🇮🇩 印度尼西亚': '🇮🇩',
  '🇵🇭 菲律宾': '🇵🇭', '🇮🇳 印度': '🇮🇳', '🇰🇭 柬埔寨': '🇰🇭', '🇲🇲 缅甸': '🇲🇲',
  '🇱🇰 斯里兰卡': '🇱🇰', '🇲🇻 马尔代夫': '🇲🇻', '🇳🇵 尼泊尔': '🇳🇵',
  '🇦🇪 阿联酋': '🇦🇪', '🇹🇷 土耳其': '🇹🇷', '🇮🇱 以色列': '🇮🇱', '🇮🇷 伊朗': '🇮🇷',
  '🇶🇦 卡塔尔': '🇶🇦', '🇸🇦 沙特阿拉伯': '🇸🇦',
  '🇫🇷 法国': '🇫🇷', '🇮🇹 意大利': '🇮🇹', '🇪🇸 西班牙': '🇪🇸', '🇬🇧 英国': '🇬🇧',
  '🇩🇪 德国': '🇩🇪', '🇨🇭 瑞士': '🇨🇭', '🇳🇱 荷兰': '🇳🇱', '🇧🇪 比利时': '🇧🇪',
  '🇦🇹 奥地利': '🇦🇹', '🇨🇿 捷克': '🇨🇿', '🇭🇺 匈牙利': '🇭🇺', '🇬🇷 希腊': '🇬🇷',
  '🇵🇹 葡萄牙': '🇵🇹', '🇸🇪 瑞典': '🇸🇪', '🇳🇴 挪威': '🇳🇴', '🇫🇮 芬兰': '🇫🇮',
  '🇩🇰 丹麦': '🇩🇰', '🇮🇸 冰岛': '🇮🇸', '🇭🇷 克罗地亚': '🇭🇷', '🇮🇪 爱尔兰': '🇮🇪',
  '🇷🇺 俄罗斯': '🇷🇺', '🇵🇱 波兰': '🇵🇱',
  '🇺🇸 美国': '🇺🇸', '🇨🇦 加拿大': '🇨🇦', '🇲🇽 墨西哥': '🇲🇽',
  '🇧🇷 巴西': '🇧🇷', '🇦🇷 阿根廷': '🇦🇷', '🇨🇱 智利': '🇨🇱', '🇵🇪 秘鲁': '🇵🇪',
  '🇨🇴 哥伦比亚': '🇨🇴', '🇨🇺 古巴': '🇨🇺', '🇨🇷 哥斯达黎加': '🇨🇷',
  '🇦🇺 澳大利亚': '🇦🇺', '🇳🇿 新西兰': '🇳🇿', '🇫🇯 斐济': '🇫🇯',
  '🇲🇦 摩洛哥': '🇲🇦', '🇪🇬 埃及': '🇪🇬', '🇿🇦 南非': '🇿🇦', '🇰🇪 肯尼亚': '🇰🇪',
  '🇹🇿 坦桑尼亚': '🇹🇿', '🇹🇳 突尼斯': '🇹🇳', '🇸🇨 塞舌尔': '🇸🇨', '🇲🇺 毛里求斯': '🇲🇺',
};

// 当前选中的国家和城市（picker 状态）
let stickySelectedCountry = '';
let stickySelectedCity = '';

// 获取存储的便利贴
function getStickyNotes() {
  const d = getLoveData();
  return d.stickyNotes || [];
}

function saveStickyNotes(notes) {
  const d = getLoveData();
  d.stickyNotes = notes;
  saveLoveData(d);
}

// 打开选择器
function openStickyPicker() {
  const overlay = document.getElementById('sticky-picker-overlay');
  const countrySelect = document.getElementById('sticky-country-select');
  const citySelect = document.getElementById('sticky-city-select');
  const preview = document.getElementById('sticky-preview');
  const confirmBtn = document.getElementById('sticky-confirm-btn');

  // 填充国家列表
  const countries = Object.keys(COUNTRY_CITIES);
  countrySelect.innerHTML = '<option value="">-- 请选择国家 --</option>' +
    countries.map(c => `<option value="${c}">${c}</option>`).join('');

  // 重置
  countrySelect.value = '';
  citySelect.innerHTML = '<option value="">-- 请先选择国家 --</option>';
  citySelect.value = '';
  preview.classList.add('hidden');
  confirmBtn.disabled = true;
  stickySelectedCountry = '';
  stickySelectedCity = '';

  overlay.classList.remove('hidden');
}

// 关闭选择器
function closeStickyPicker(e) {
  if (e && e.target !== document.getElementById('sticky-picker-overlay')) return;
  document.getElementById('sticky-picker-overlay').classList.add('hidden');
}

// 国家变更
function onStickyCountryChange() {
  const countrySelect = document.getElementById('sticky-country-select');
  const citySelect = document.getElementById('sticky-city-select');
  const preview = document.getElementById('sticky-preview');
  const confirmBtn = document.getElementById('sticky-confirm-btn');

  const country = countrySelect.value;
  stickySelectedCountry = country;
  stickySelectedCity = '';
  preview.classList.add('hidden');
  confirmBtn.disabled = true;

  if (!country) {
    citySelect.innerHTML = '<option value="">-- 请先选择国家 --</option>';
    return;
  }

  const cities = COUNTRY_CITIES[country] || [];
  citySelect.innerHTML = '<option value="">-- 请选择城市 --</option>' +
    cities.map(c => `<option value="${c}">${c}</option>`).join('');
}

// 城市变更
function onStickyCityChange() {
  const citySelect = document.getElementById('sticky-city-select');
  const preview = document.getElementById('sticky-preview');
  const confirmBtn = document.getElementById('sticky-confirm-btn');

  const city = citySelect.value;
  stickySelectedCity = city;

  if (!city || !stickySelectedCountry) {
    preview.classList.add('hidden');
    confirmBtn.disabled = true;
    return;
  }

  // 显示预览
  const countryEmoji = stickySelectedCountry.slice(0, 2);
  const countryName = stickySelectedCountry.slice(3);
  document.getElementById('sticky-preview-emoji').textContent = countryEmoji;
  document.getElementById('sticky-preview-name').textContent = city;
  document.getElementById('sticky-preview-country').textContent = countryName;

  preview.classList.remove('hidden');
  confirmBtn.disabled = false;
}

// 添加便利贴
function addStickyNote() {
  if (!stickySelectedCountry || !stickySelectedCity) return;

  const countryEmoji = stickySelectedCountry.slice(0, 2);
  const countryName = stickySelectedCountry.slice(3);

  const notes = getStickyNotes();
  // 检查是否已存在
  const exists = notes.find(n => n.city === stickySelectedCity && n.country === countryName);
  if (exists) {
    alert('这个城市已经贴在墙上了哦～');
    return;
  }

  notes.push({
    city: stickySelectedCity,
    country: countryName,
    emoji: countryEmoji,
    date: new Date().toISOString().slice(0, 10),
    id: Date.now()
  });

  saveStickyNotes(notes);
  document.getElementById('sticky-picker-overlay').classList.add('hidden');
  renderStickyNotes();
}

// 删除便利贴
function removeStickyNote(id) {
  if (!confirm('确定要撕掉这张便利贴吗？')) return;
  let notes = getStickyNotes();
  notes = notes.filter(n => n.id !== id);
  saveStickyNotes(notes);
  renderStickyNotes();
}

// 渲染便利贴墙
function renderStickyNotes() {
  const grid = document.getElementById('sticky-grid');
  const empty = document.getElementById('sticky-empty');
  const count = document.getElementById('sticky-count');
  const notes = getStickyNotes();

  count.textContent = `共 ${notes.length} 张便利贴`;

  if (notes.length === 0) {
    grid.innerHTML = `
      <div class="sticky-empty" id="sticky-empty">
        <div class="sticky-empty-icon">📍</div>
        <p>还没有便利贴哦～</p>
        <p class="sticky-empty-hint">点击上方按钮，添加你们想去的城市吧！</p>
      </div>`;
    return;
  }

  grid.innerHTML = notes.map(n => `
    <div class="sticky-note">
      <button class="sticky-note-delete" onclick="removeStickyNote(${n.id})" title="撕掉">✕</button>
      <div class="sticky-note-emoji">${n.emoji}</div>
      <div class="sticky-note-name">${n.city}</div>
      <div class="sticky-note-country">${n.country}</div>
      <div class="sticky-note-date">📅 ${n.date}</div>
    </div>
  `).join('');
}

// 在切换页面时触发渲染
const _origSwitchPage2 = switchPage;
switchPage = function(pageId) {
  _origSwitchPage2(pageId);
  if (pageId === 'adventure-map') {
    setTimeout(renderStickyNotes, 100);
  }
};

// ==================== 🌸🌊🍂❄️ 四季皮肤系统 ====================

const SEASON_CONFIG = {
  spring: {
    className: 'season-spring',
    name: '春日樱花',
    badge: '🌸 春日皮肤',
    particles: ['🌸', '🌺', '🌷', '💮'],
    count: 12,
    duration: [8, 15],
  },
  summer: {
    className: 'season-summer',
    name: '夏日大海',
    badge: '🏖️ 夏日皮肤',
    particles: ['🫧', '🐚', '🐠', '🌊', '⛵', '🐟', '💧', '✨', '⭐'],
    count: 20,
    duration: [8, 15],
  },
  autumn: {
    className: 'season-autumn',
    name: '秋日枫林',
    badge: '🍂 秋日皮肤',
    particles: ['🍂', '🍁', '🍃', '🌾'],
    count: 14,
    duration: [7, 14],
  },
  winter: {
    className: 'season-winter',
    name: '冬日雪景',
    badge: '❄️ 冬日皮肤',
    particles: ['❄️', '🌨️', '⛄', '🌟'],
    count: 16,
    duration: [8, 18],
  },
};

function getCurrentSeason() {
  // 严格按月份：3-5春、6-8夏、9-11秋、12-2冬
  const month = new Date().getMonth() + 1;
  if (month >= 3 && month <= 5)  return 'spring';
  if (month >= 6 && month <= 8)  return 'summer';
  if (month >= 9 && month <= 11) return 'autumn';
  return 'winter';
}

function applySeason(season) {
  const config = SEASON_CONFIG[season];
  if (!config) return;

  // 移除旧 season class
  document.body.classList.remove(
    'season-spring', 'season-summer', 'season-autumn', 'season-winter'
  );
  document.body.classList.add(config.className);

  // 更新日历徽章
  const badge = document.getElementById('cal-season-badge');
  if (badge) badge.textContent = config.badge;

  // 生成粒子
  spawnSeasonParticles(config);

  // 自动切换音乐歌单
  autoSwitchSeasonMusic(season);
}

// 自动按季节切换情话
function autoSwitchSeasonMusic(season) {
  switchLoveQuoteSeason(season);
}

function spawnSeasonParticles(config) {
  const container = document.getElementById('season-particles');
  if (!container) return;
  container.innerHTML = '';

  for (let i = 0; i < config.count; i++) {
    const el = document.createElement('div');
    el.className = 'season-particle';
    const emoji = config.particles[Math.floor(Math.random() * config.particles.length)];
    el.textContent = emoji;
    const left = Math.random() * 100;
    const delay = Math.random() * 10;
    const dur = config.duration[0] + Math.random() * (config.duration[1] - config.duration[0]);
    const size = 12 + Math.random() * 14;
    el.style.cssText = `
      left: ${left}%;
      font-size: ${size}px;
      animation-duration: ${dur}s;
      animation-delay: ${-delay}s;
    `;
    container.appendChild(el);
  }
}

// ==================== 动态日历增强版 ====================

let calendarViewYear = null;
let calendarViewMonth = null; // 0-indexed

function initSeasonSystem() {
  const season = getCurrentSeason();
  applySeason(season);
  const now = new Date();
  calendarViewYear = now.getFullYear();
  calendarViewMonth = now.getMonth();
  renderSeasonCalendar();
}

// ==================== 实时天气（成都） ====================

const WEATHER_ICONS = {
  0: '☀️', 1: '🌤️', 2: '⛅', 3: '☁️',
  45: '🌫️', 48: '🌫️',
  51: '🌦️', 53: '🌦️', 55: '🌧️',
  61: '🌧️', 63: '🌧️', 65: '🌧️',
  71: '🌨️', 73: '🌨️', 75: '❄️',
  80: '🌦️', 81: '🌧️', 82: '⛈️',
  95: '⛈️', 96: '⛈️', 99: '⛈️'
};

const WEATHER_LABELS = {
  0: '晴天', 1: '少云', 2: '多云', 3: '阴天',
  45: '雾', 48: '冻雾',
  51: '小毛毛雨', 53: '毛毛雨', 55: '大毛毛雨',
  61: '小雨', 63: '中雨', 65: '大雨',
  71: '小雪', 73: '中雪', 75: '大雪',
  80: '阵雨', 81: '中阵雨', 82: '大阵雨',
  95: '雷暴', 96: '冰雹雷暴', 99: '强冰雹雷暴'
};

// ==================== 全国城市列表 ====================
const CHINA_CITIES = [
  { name: '北京', lat: 39.90, lng: 116.40, province: '北京' },
  { name: '上海', lat: 31.23, lng: 121.47, province: '上海' },
  { name: '广州', lat: 23.13, lng: 113.26, province: '广东' },
  { name: '深圳', lat: 22.54, lng: 114.06, province: '广东' },
  { name: '成都', lat: 30.57, lng: 104.07, province: '四川' },
  { name: '重庆', lat: 29.56, lng: 106.55, province: '重庆' },
  { name: '杭州', lat: 30.29, lng: 120.15, province: '浙江' },
  { name: '武汉', lat: 30.59, lng: 114.31, province: '湖北' },
  { name: '西安', lat: 34.26, lng: 108.94, province: '陕西' },
  { name: '南京', lat: 32.06, lng: 118.80, province: '江苏' },
  { name: '苏州', lat: 31.30, lng: 120.62, province: '江苏' },
  { name: '天津', lat: 39.13, lng: 117.19, province: '天津' },
  { name: '长沙', lat: 28.23, lng: 112.94, province: '湖南' },
  { name: '郑州', lat: 34.75, lng: 113.62, province: '河南' },
  { name: '济南', lat: 36.67, lng: 116.98, province: '山东' },
  { name: '青岛', lat: 36.09, lng: 120.38, province: '山东' },
  { name: '大连', lat: 38.91, lng: 121.61, province: '辽宁' },
  { name: '沈阳', lat: 41.80, lng: 123.43, province: '辽宁' },
  { name: '哈尔滨', lat: 45.80, lng: 126.53, province: '黑龙江' },
  { name: '长春', lat: 43.88, lng: 125.32, province: '吉林' },
  { name: '昆明', lat: 25.04, lng: 102.68, province: '云南' },
  { name: '贵阳', lat: 26.65, lng: 106.63, province: '贵州' },
  { name: '南宁', lat: 22.82, lng: 108.32, province: '广西' },
  { name: '桂林', lat: 25.27, lng: 110.29, province: '广西' },
  { name: '厦门', lat: 24.48, lng: 118.09, province: '福建' },
  { name: '福州', lat: 26.07, lng: 119.30, province: '福建' },
  { name: '合肥', lat: 31.82, lng: 117.23, province: '安徽' },
  { name: '南昌', lat: 28.68, lng: 115.86, province: '江西' },
  { name: '石家庄', lat: 38.04, lng: 114.51, province: '河北' },
  { name: '太原', lat: 37.87, lng: 112.55, province: '山西' },
  { name: '呼和浩特', lat: 40.84, lng: 111.75, province: '内蒙古' },
  { name: '兰州', lat: 36.06, lng: 103.83, province: '甘肃' },
  { name: '西宁', lat: 36.62, lng: 101.78, province: '青海' },
  { name: '银川', lat: 38.49, lng: 106.23, province: '宁夏' },
  { name: '乌鲁木齐', lat: 43.83, lng: 87.62, province: '新疆' },
  { name: '拉萨', lat: 29.65, lng: 91.14, province: '西藏' },
  { name: '海口', lat: 20.02, lng: 110.20, province: '海南' },
  { name: '三亚', lat: 18.25, lng: 109.51, province: '海南' },
  { name: '珠海', lat: 22.27, lng: 113.58, province: '广东' },
  { name: '东莞', lat: 23.05, lng: 113.75, province: '广东' },
  { name: '佛山', lat: 23.03, lng: 113.12, province: '广东' },
  { name: '温州', lat: 28.02, lng: 120.65, province: '浙江' },
  { name: '宁波', lat: 29.87, lng: 121.55, province: '浙江' },
  { name: '无锡', lat: 31.57, lng: 120.30, province: '江苏' },
  { name: '常州', lat: 31.81, lng: 119.97, province: '江苏' },
  { name: '徐州', lat: 34.20, lng: 117.28, province: '江苏' },
  { name: '烟台', lat: 37.54, lng: 121.39, province: '山东' },
  { name: '威海', lat: 37.51, lng: 122.12, province: '山东' },
  { name: '洛阳', lat: 34.62, lng: 112.45, province: '河南' },
  { name: '开封', lat: 34.80, lng: 114.31, province: '河南' },
  { name: '宜昌', lat: 30.69, lng: 111.29, province: '湖北' },
  { name: '襄阳', lat: 32.01, lng: 112.14, province: '湖北' },
  { name: '岳阳', lat: 29.37, lng: 113.13, province: '湖南' },
  { name: '株洲', lat: 27.83, lng: 113.13, province: '湖南' },
  { name: '赣州', lat: 25.83, lng: 114.93, province: '江西' },
  { name: '九江', lat: 29.71, lng: 115.99, province: '江西' },
  { name: '泉州', lat: 24.91, lng: 118.59, province: '福建' },
  { name: '漳州', lat: 24.52, lng: 117.65, province: '福建' },
  { name: '绵阳', lat: 31.47, lng: 104.68, province: '四川' },
  { name: '宜宾', lat: 28.77, lng: 104.62, province: '四川' },
  { name: '遵义', lat: 27.70, lng: 106.93, province: '贵州' },
  { name: '大理', lat: 25.59, lng: 100.23, province: '云南' },
  { name: '丽江', lat: 26.86, lng: 100.23, province: '云南' },
  { name: '香格里拉', lat: 27.83, lng: 99.70, province: '云南' },
  { name: '漠河', lat: 53.48, lng: 122.37, province: '黑龙江' },
  { name: '延吉', lat: 42.89, lng: 129.51, province: '吉林' },
  { name: '喀什', lat: 39.47, lng: 75.99, province: '新疆' },
];

// 获取已保存的城市（带校验）
function getSavedCity() {
  try {
    const saved = localStorage.getItem('lb_weather_city');
    if (saved) {
      const city = JSON.parse(saved);
      if (city && city.name && city.lat != null && city.lng != null) {
        // 校验城市必须在 CHINA_CITIES 列表中
        const found = CHINA_CITIES.find(c => c.name === city.name);
        if (found) return found;
      }
    }
  } catch(e) {}
  // 默认成都 —— 永远不会变
  const def = CHINA_CITIES.find(c => c.name === '成都');
  return def || { name: '成都', lat: 30.57, lng: 104.07, province: '四川' };
}

// 保存城市
function saveCity(city) {
  localStorage.setItem('lb_weather_city', JSON.stringify(city));
  // 更新城市名显示
  const cityEl = document.getElementById('weather-city');
  if (cityEl) cityEl.textContent = '📍 ' + city.name;
  // 重新获取天气
  fetchWeather();
}

// 打开/关闭城市选择器
function toggleCityPicker() {
  var dropdown = document.getElementById('city-dropdown');
  if (!dropdown) { console.warn('city-dropdown element not found'); return; }
  var isOpen = dropdown.classList.contains('open');
  if (isOpen) {
    dropdown.classList.remove('open');
  } else {
    renderCityList();
    dropdown.classList.add('open');
    console.log('City dropdown opened');
  }
}

// 绑定城市点击事件（DOM 就绪后）
function bindCityPicker() {
  var cityEl = document.getElementById('weather-city');
  if (cityEl) {
    cityEl.addEventListener('click', toggleCityPicker);
    cityEl.style.cursor = 'pointer';
  }
}

// 点击其他地方关闭下拉
document.addEventListener('click', function(e) {
  var dropdown = document.getElementById('city-dropdown');
  var cityEl = document.getElementById('weather-city');
  if (!dropdown || !dropdown.classList.contains('open')) return;
  if (!dropdown.contains(e.target) && e.target !== cityEl) {
    dropdown.classList.remove('open');
  }
});

// 在 DOMContentLoaded 时绑定
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', bindCityPicker);
} else {
  bindCityPicker();
}

// 渲染城市列表
function renderCityList() {
  const list = document.getElementById('city-dropdown-list');
  if (!list) return;
  
  const currentCity = getSavedCity();
  
  list.innerHTML = CHINA_CITIES.map(c => {
    const isActive = c.name === currentCity.name;
    return '<div class="city-dropdown-item' + (isActive ? ' active' : '') + 
      '" onclick="selectCity(\'' + c.name + '\', ' + c.lat + ', ' + c.lng + ', \'' + c.province + '\')">' +
      c.name + ' <span style="font-size:11px;color:#9ca3af;margin-left:auto">' + c.province + '</span>' +
      '</div>';
  }).join('');
}

// 选择城市
function selectCity(name, lat, lng, province) {
  const city = { name, lat, lng, province };
  saveCity(city);
  document.getElementById('city-dropdown').classList.remove('open');
  // 更新显示的城市名
  var cityEl = document.getElementById('weather-city');
  if (cityEl) cityEl.textContent = '📍 ' + name;
  // 刷新天气
  weatherCity = city;
  fetchWeather();
}

// 从所选城市获取天气
let weatherCity = getSavedCity();

async function fetchWeather(retries = 0) {
  try {
    // 每次 fetch 前读取最新城市
    weatherCity = getSavedCity();
    const resp = await fetch(
      'https://api.open-meteo.com/v1/forecast?latitude=' + weatherCity.lat + 
      '&longitude=' + weatherCity.lng + 
      '&current=temperature_2m,relative_humidity_2m,weather_code,wind_speed_10m,apparent_temperature&timezone=Asia/Shanghai'
    );
    if (!resp.ok) throw new Error('API error ' + resp.status);
    const data = await resp.json();
    const c = data.current;
    if (!c || c.temperature_2m == null) throw new Error('No current data');

    const tempEl = document.getElementById('weather-temp');
    if (!tempEl) return; // DOM not ready

    document.getElementById('weather-icon').textContent = WEATHER_ICONS[c.weather_code] || '🌡️';
    tempEl.textContent = Math.round(c.temperature_2m) + '°';
    document.getElementById('weather-feels').textContent = Math.round(c.apparent_temperature) + '°';
    document.getElementById('weather-humidity').textContent = c.relative_humidity_2m + '%';
    document.getElementById('weather-wind').textContent = Math.round(c.wind_speed_10m) + ' km/h';
    document.getElementById('weather-desc').textContent = WEATHER_LABELS[c.weather_code] || '多云';
    document.getElementById('weather-update').textContent = new Date().toLocaleTimeString('zh-CN', {hour:'2-digit',minute:'2-digit'});
  } catch (e) {
    console.warn('Weather fetch error:', e.message);
    if (retries < 3) {
      setTimeout(() => fetchWeather(retries + 1), 3000);
    } else {
      const descEl = document.getElementById('weather-desc');
      if (descEl) descEl.textContent = '网络异常，稍后重试';
    }
  }
}

// 独立初始化天气
function initWeather() {
  // 初始化城市名显示
  weatherCity = getSavedCity();
  const cityEl = document.getElementById('weather-city');
  if (cityEl) cityEl.textContent = '📍 ' + weatherCity.name;
  fetchWeather();
  setInterval(fetchWeather, 30 * 60 * 1000);
}

function navigateCalendar(delta) {
  calendarViewMonth += delta;
  if (calendarViewMonth > 11) { calendarViewMonth = 0; calendarViewYear++; }
  if (calendarViewMonth < 0) { calendarViewMonth = 11; calendarViewYear--; }
  renderSeasonCalendar();
}

function goToToday() {
  const now = new Date();
  calendarViewYear = now.getFullYear();
  calendarViewMonth = now.getMonth();
  renderSeasonCalendar();
}

function renderSeasonCalendar() {
  const now = new Date();
  const todayYear = now.getFullYear();
  const todayMonth = now.getMonth();
  const todayDate = now.getDate();

  const year = calendarViewYear;
  const month = calendarViewMonth;

  // 恋爱纪念日
  const loveStart = getData('love_start', DEFAULT_LOVE_START);
  const loveDate = new Date(loveStart);
  const loveMonth = loveDate.getMonth();
  const loveDay = loveDate.getDate();

  // 月份标题
  const monthLabel = document.getElementById('cal-month-label');
  if (monthLabel) {
    monthLabel.textContent = `${year}年${month + 1}月`;
  }

  const container = document.getElementById('cal-days');
  if (!container) return;
  container.innerHTML = '';

  // 当月第一天是星期几（0=日）
  const firstDay = new Date(year, month, 1).getDay();
  // 当月总天数
  const totalDays = new Date(year, month + 1, 0).getDate();
  // 上月天数
  const prevMonthDays = new Date(year, month, 0).getDate();

  // 填上月尾部
  for (let i = firstDay - 1; i >= 0; i--) {
    const d = document.createElement('div');
    d.className = 'cal-day other-month';
    d.textContent = prevMonthDays - i;
    d.title = `${year}年${month}月${prevMonthDays - i}日`;
    d.style.animationDelay = '0s';
    container.appendChild(d);
  }

  // 当月天数
  for (let d = 1; d <= totalDays; d++) {
    const el = document.createElement('div');
    let cls = 'cal-day';
    if (year === todayYear && month === todayMonth && d === todayDate) {
      cls += ' today';
    }
    // 恋爱纪念日（每年同月同日）
    if (month === loveMonth && d === loveDay) {
      cls += ' anniversary';
    }
    el.className = cls;
    el.textContent = d;
    el.title = `${year}年${month + 1}月${d}日`;
    
    // 点击日期互动
    el.addEventListener('click', () => {
      onCalendarDayClick(year, month, d, el);
    });
    
    // 如果是今天且是当前月，加脉冲动画
    if (year === todayYear && month === todayMonth && d === todayDate) {
      el.style.animation = 'pulseToday 2s ease-in-out infinite, calendarReveal 0.3s ease-out backwards';
    }
    // 纪念日加心跳
    if (month === loveMonth && d === loveDay) {
      el.style.animation = 'heartbeat 1.5s ease-in-out infinite, calendarReveal 0.3s ease-out backwards';
    }
    
    container.appendChild(el);
  }

  // 补下月
  const totalCells = Math.ceil((firstDay + totalDays) / 7) * 7;
  const remaining = totalCells - (firstDay + totalDays);
  for (let d = 1; d <= remaining; d++) {
    const el = document.createElement('div');
    el.className = 'cal-day other-month';
    el.textContent = d;
    el.title = `${year}年${month + 2}月${d}日`;
    el.style.animationDelay = '0s';
    container.appendChild(el);
  }

}

function onCalendarDayClick(year, month, day, el) {
  // 点击涟漪效果
  const ripple = document.createElement('span');
  ripple.style.cssText = `
    position: absolute;
    width: 40px; height: 40px;
    border-radius: 50%;
    background: rgba(14,165,233,0.3);
    top: 50%; left: 50%;
    transform: translate(-50%, -50%) scale(0);
    animation: rippleOut 0.6s ease-out forwards;
    pointer-events: none;
  `;
  el.appendChild(ripple);
  setTimeout(() => ripple.remove(), 600);

  // 显示日期信息
  const season = getCurrentSeason();
  const emoji = { spring: '🌸', summer: '☀️', autumn: '🍂', winter: '❄️' }[season];
  const isToday = year === new Date().getFullYear() && month === new Date().getMonth() && day === new Date().getDate();
  const isLoveDay = month === new Date(DEFAULT_LOVE_START).getMonth() && day === new Date(DEFAULT_LOVE_START).getDate();
  
  let msg = `${emoji} ${year}年${month + 1}月${day}日`;
  if (isToday) msg += ' — 就是今天！';
  if (isLoveDay) msg += ' — 💕 恋爱纪念日！';
  
  showCalToast(msg);
}

function showCalToast(msg) {
  const existing = document.getElementById('cal-toast');
  if (existing) existing.remove();
  
  const toast = document.createElement('div');
  toast.id = 'cal-toast';
  toast.textContent = msg;
  toast.style.cssText = `
    position: fixed;
    bottom: 100px;
    left: 50%;
    transform: translateX(-50%);
    background: rgba(0,0,0,0.8);
    color: white;
    padding: 10px 24px;
    border-radius: 24px;
    font-size: 14px;
    z-index: 9999;
    animation: toastIn 0.3s ease-out, toastOut 0.3s ease-in 1.5s forwards;
    white-space: nowrap;
    pointer-events: none;
  `;
  document.body.appendChild(toast);
  setTimeout(() => toast.remove(), 2000);
}

// 等待 DOM 完全就绪后初始化（确保日历元素存在）
function safeInitCalendar() {
  const calDays = document.getElementById('cal-days');
  if (calDays) {
    initSeasonSystem();
    initWeather();
    return true;
  }
  return false;
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    initWeather(); // 不管日历怎样，天气先加载
    if (!safeInitCalendar()) {
      setTimeout(safeInitCalendar, 100);
    }
  });
} else {
  initWeather(); // 不管日历怎样，天气先加载
  if (!safeInitCalendar()) {
    setTimeout(safeInitCalendar, 100);
  }
}

// ==================== AI工具箱 ====================

// 工具箱开关
function toggleToolbox() {
  var panel = document.getElementById('toolbox-panel');
  var overlay = document.getElementById('toolbox-overlay');
  var isOpen = panel.classList.contains('show');
  if (isOpen) {
    closeToolbox();
  } else {
    panel.classList.add('show');
    overlay.classList.add('show');
    // 默认打开诊断页并渲染快速导航
    switchToolboxTab('diagnostic');
  }
}

function closeToolbox(e) {
  // 如果事件来自overlay内部元素冒泡,忽略
  if (e && e.target !== document.getElementById('toolbox-overlay')) return;
  var panel = document.getElementById('toolbox-panel');
  var overlay = document.getElementById('toolbox-overlay');
  panel.classList.remove('show');
  overlay.classList.remove('show');
}

function switchToolboxTab(tab) {
  document.querySelectorAll('.tb-tab').forEach(function(t) {
    t.classList.toggle('active', t.getAttribute('data-tb') === tab);
  });
  document.querySelectorAll('.tb-content').forEach(function(c) {
    c.classList.toggle('active', c.id === 'tb-' + tab);
  });
  // 导航已静态化，无需JS动态渲染
}

// 一键诊断
function runDiagnostic() {
  var btn = document.querySelector('.btn-diag-run');
  var result = document.getElementById('diag-result');
  btn.disabled = true;
  btn.textContent = '⏳ 诊断中...';
  result.innerHTML = '<p style="text-align:center;color:#9ca3af;">正在扫描系统状态...</p>';

  setTimeout(function() {
    var items = [];
    var passCount = 0;
    var warnCount = 0;
    var failCount = 0;

    // 1. localStorage 空间检测
    var usage = getStorageUsage();
    var usedMB = parseFloat(usage.usedMB);
    if (usedMB < 2) {
      items.push({ level: 'pass', icon: '✅', title: '存储空间', detail: '已用 ' + usage.usedMB + ' MB / ' + usage.limitMB + ' MB，充裕' });
      passCount++;
    } else if (usedMB < 4.2) {
      items.push({ level: 'warn', icon: '⚠️', title: '存储空间', detail: '已用 ' + usage.usedMB + ' MB / ' + usage.limitMB + ' MB，接近上限', fix: '建议清理旧照片和不需要的数据' });
      warnCount++;
    } else {
      items.push({ level: 'fail', icon: '❌', title: '存储空间不足', detail: '已用 ' + usage.usedMB + ' MB / ' + usage.limitMB + ' MB，即将耗尽', fix: '请立即清理照片或使用恢复出厂设置' });
      failCount++;
    }

    // 2. Service Worker 检测
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.getRegistration('/').then(function(reg) {
        if (reg) {
          var state = reg.active ? reg.active.state : reg.installing ? 'installing' : 'waiting';
          items.push({ level: 'pass', icon: '✅', title: 'Service Worker', detail: '已注册，状态：' + state });
          passCount++;
        } else {
          items.push({ level: 'warn', icon: '⚠️', title: 'Service Worker', detail: '未注册，离线缓存已自毁（正常）' });
          warnCount++;
        }
        renderDiagResult(items, passCount, warnCount, failCount);
      }).catch(function() {
        items.push({ level: 'warn', icon: '⚠️', title: 'Service Worker', detail: '获取注册状态失败' });
        warnCount++;
        renderDiagResult(items, passCount, warnCount, failCount);
      });
    } else {
      items.push({ level: 'warn', icon: '⚠️', title: 'Service Worker', detail: '浏览器不支持 SW（如果用的非 HTTPS 本地测试则正常）' });
      warnCount++;
      renderDiagResult(items, passCount, warnCount, failCount);
    }

    // 3. 核心数据完整性检测
    var keys = ['love_start', 'albums', 'messages', 'transactions', 'plans', 'countdowns', 'conventions', 'vouchers', 'wishlist'];
    var missing = [];
    keys.forEach(function(k) {
      try {
        var v = localStorage.getItem('lb_' + k);
        if (v === null) { missing.push(k); return; }
        JSON.parse(v); // 验证 JSON 格式
      } catch(e) {
        missing.push(k + '(格式损坏)');
      }
    });
    if (missing.length === 0) {
      items.push({ level: 'pass', icon: '✅', title: '核心数据', detail: '全部 ' + keys.length + ' 项数据完整无损' });
      passCount++;
    } else {
      items.push({ level: 'fail', icon: '❌', title: '核心数据异常', detail: missing.length + ' 项数据缺失/损坏：' + missing.join('、'), fix: '可尝试恢复出厂设置后重新使用' });
      failCount++;
    }

    // 4. 浏览器兼容性检测
    var compatIssues = [];
    if (typeof MediaRecorder === 'undefined') compatIssues.push('不支持录音');
    if (typeof SpeechRecognition === 'undefined' && typeof webkitSpeechRecognition === 'undefined') compatIssues.push('不支持语音识别');
    if (compatIssues.length === 0) {
      items.push({ level: 'pass', icon: '✅', title: '浏览器兼容', detail: '所有功能 API 均支持' });
      passCount++;
    } else {
      items.push({ level: 'warn', icon: '⚠️', title: '浏览器兼容', detail: compatIssues.join('；') + '——部分功能不可用' });
      warnCount++;
    }

    // 5. 相册数据大小检测
    var albums = getData('albums', []);
    var photoCount = 0;
    albums.forEach(function(a) { if (a.photos) photoCount += a.photos.length; });
    if (photoCount > 30) {
      items.push({ level: 'warn', icon: '⚠️', title: '相册照片', detail: photoCount + ' 张（较多），存储压力大', fix: '清理不需要的旧照片可释放空间' });
      warnCount++;
    } else if (photoCount > 0) {
      items.push({ level: 'pass', icon: '✅', title: '相册照片', detail: photoCount + ' 张，存储正常' });
      passCount++;
    } else {
      items.push({ level: 'pass', icon: '✅', title: '相册照片', detail: '暂无照片' });
      passCount++;
    }

    // 6. Cookie/Session 检测
    var hasCookie = document.cookie.length > 0;
    items.push({ level: hasCookie ? 'pass' : 'warn', icon: hasCookie ? '✅' : '⚠️', title: '会话状态', detail: hasCookie ? 'Cookie 正常' : '无 Cookie（可能影响登录状态）' });
    if (hasCookie) passCount++; else warnCount++;

    renderDiagResult(items, passCount, warnCount, failCount);
  }, 600);
}

function renderDiagResult(items, pass, warn, fail) {
  var btn = document.querySelector('.btn-diag-run');
  btn.disabled = false;
  btn.textContent = '🔍 重新诊断';

  var summary = '<div style="text-align:center;margin-bottom:12px;">' +
    '<span style="color:#22c55e;font-weight:700;">✅ ' + pass + '</span> &nbsp;' +
    '<span style="color:#f59e0b;font-weight:700;">⚠️ ' + warn + '</span> &nbsp;' +
    '<span style="color:#ef4444;font-weight:700;">❌ ' + fail + '</span>' +
    '</div>';

  var html = summary + items.map(function(item) {
    var fixBtn = item.fix ? '<button class="diag-fix" onclick="applyFix(\'' + item.title + '\')">' + item.fix + '</button>' : '';
    return '<div class="diag-item ' + item.level + '">' +
      '<span class="diag-icon">' + item.icon + '</span>' +
      '<div class="diag-text"><strong>' + item.title + '</strong><span>' + item.detail + '</span>' + fixBtn + '</div>' +
      '</div>';
  }).join('');

  document.getElementById('diag-result').innerHTML = html;
}

function applyFix(title) {
  if (title.indexOf('存储') !== -1 || title.indexOf('相册') !== -1) {
    switchToolboxTab('reset');
  }
}

// 恢复出厂设置：2次确认
function confirmFactoryReset() {
  showToast('⚠️ 请在 5 秒内再次点击「恢复出厂设置」以确认...');
  var btn = document.querySelector('.btn-reset-run');
  btn.textContent = '⚠️ 再次点击确认清空全部数据！';
  btn.style.background = 'linear-gradient(135deg, #991b1b, #7f1d1d)';
  btn.style.boxShadow = '0 4px 20px rgba(153,27,27,0.5)';
  btn.onclick = executeFactoryReset;

  // 5秒后自动恢复
  var countdown = 5;
  var timer = setInterval(function() {
    countdown--;
    if (countdown <= 0) {
      clearInterval(timer);
      btn.textContent = '🏭 恢复出厂设置';
      btn.style.background = 'linear-gradient(135deg, #ef4444, #dc2626)';
      btn.style.boxShadow = 'none';
      btn.onclick = confirmFactoryReset;
      showToast('已取消恢复出厂设置');
    } else {
      btn.textContent = '⚠️ 确认清空（' + countdown + 's 内有效）';
    }
  }, 1000);
}

function executeFactoryReset() {
  // 备份 love_start
  var loveStart = localStorage.getItem('lb_love_start');
  // 清空所有 lb_ 前缀数据
  var keysToRemove = [];
  for (var i = 0; i < localStorage.length; i++) {
    var k = localStorage.key(i);
    if (k && k.startsWith('lb_')) {
      keysToRemove.push(k);
    }
  }
  keysToRemove.forEach(function(k) { localStorage.removeItem(k); });

  // 恢复恋爱起始日
  if (loveStart) {
    localStorage.setItem('lb_love_start', loveStart);
  }

  // 重置按钮状态
  var btn = document.querySelector('.btn-reset-run');
  btn.textContent = '🏭 恢复出厂设置';
  btn.style.background = 'linear-gradient(135deg, #ef4444, #dc2626)';
  btn.style.boxShadow = 'none';
  btn.onclick = confirmFactoryReset;

  // 刷新页面
  showToast('✅ 已恢复出厂设置，3 秒后刷新...');
  setTimeout(function() {
    location.reload();
  }, 3000);
}

function quickJump(pageId) {
  if (typeof switchPage === 'function') {
    switchPage(pageId);
  } else {
    document.querySelectorAll('.page-section').forEach(function(s) { s.classList.remove('active'); });
    var target = document.getElementById('page-' + pageId);
    if (target) target.classList.add('active');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }
  closeToolbox();
  showToast('已跳转到对应页面 ✅');
}

// ==================== 数据仪表盘 ====================

function renderDashboard() {
  renderDashPie();
  renderDashHeatmap();
  renderDashMsgChart();
  renderDashMoodChart();
  renderDashStats();
}

// 消费分类饼图
function renderDashPie() {
  var canvas = document.getElementById('dash-pie');
  if (!canvas) return;
  var ctx = canvas.getContext('2d');
  var w = canvas.width, h = canvas.height;
  ctx.clearRect(0, 0, w, h);

  var transactions = getData('transactions', []);
  var expenses = transactions.filter(function(t) { return t.type === 'expense'; });
  if (expenses.length === 0) {
    ctx.fillStyle = '#9ca3af';
    ctx.font = '14px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('暂无消费数据', w/2, h/2);
    document.getElementById('dash-pie-legend').innerHTML = '<span style="color:#9ca3af;font-size:12px;">记录消费后显示</span>';
    return;
  }

  var categories = {};
  expenses.forEach(function(t) {
    var cat = t.category || '其他';
    categories[cat] = (categories[cat] || 0) + t.amount;
  });

  var colors = ['#3b82f6','#f59e0b','#1d4ed8','#22c55e','#3b82f6','#ef4444','#06b6d4','#f97316','#3b82f6','#14b8a6'];
  var total = Object.values(categories).reduce(function(a,b){return a+b;}, 0);
  var items = Object.entries(categories).sort(function(a,b){return b[1]-a[1];});

  var cx = w/2, cy = h/2, r = 110;
  var startAngle = -Math.PI / 2;

  items.forEach(function(item, i) {
    var sliceAngle = (item[1] / total) * Math.PI * 2;
    ctx.beginPath();
    ctx.moveTo(cx, cy);
    ctx.arc(cx, cy, r, startAngle, startAngle + sliceAngle);
    ctx.closePath();
    ctx.fillStyle = colors[i % colors.length];
    ctx.fill();

    // Label
    var midAngle = startAngle + sliceAngle / 2;
    var lx = cx + Math.cos(midAngle) * (r * 0.7);
    var ly = cy + Math.sin(midAngle) * (r * 0.7);
    var pct = Math.round(item[1] / total * 100);
    if (pct >= 5) {
      ctx.fillStyle = '#fff';
      ctx.font = 'bold 11px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(pct + '%', lx, ly + 4);
    }
    startAngle += sliceAngle;
  });

  // Center hole
  ctx.beginPath();
  ctx.arc(cx, cy, 55, 0, Math.PI*2);
  ctx.fillStyle = '#fff';
  ctx.fill();
  ctx.fillStyle = '#1f2937';
  ctx.font = 'bold 15px sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('¥' + Math.round(total), cx, cy + 5);

  // Legend
  var legendHtml = '';
  items.forEach(function(item, i) {
    legendHtml += '<div class="dash-legend-item"><span class="dash-legend-dot" style="background:' + colors[i%colors.length] + '"></span>' +
      item[0] + ' ¥' + Math.round(item[1]) + '</div>';
  });
  document.getElementById('dash-pie-legend').innerHTML = legendHtml;
}

// 本月打卡热力图
function renderDashHeatmap() {
  var el = document.getElementById('dash-heatmap');
  if (!el) return;
  var now = new Date();
  var year = now.getFullYear();
  var month = now.getMonth();
  var daysInMonth = new Date(year, month + 1, 0).getDate();
  var checkins = getData('daily_checkins', {});

  var html = '';
  for (var d = 1; d <= daysInMonth; d++) {
    var dateStr = year + '-' + String(month+1).padStart(2,'0') + '-' + String(d).padStart(2,'0');
    var dayCheckins = checkins[dateStr] || {};
    var count = Object.keys(dayCheckins).length;
    var intensity;
    if (count === 0) intensity = '#f3f4f6';
    else if (count <= 1) intensity = '#dbeafe';
    else if (count <= 2) intensity = '#93c5fd';
    else if (count <= 4) intensity = '#3b82f6';
    else intensity = '#1d4ed8';
    var textColor = count > 2 ? '#fff' : '#6b7280';
    html += '<div class="heatmap-day" style="background:' + intensity + ';color:' + textColor + '" title="' + dateStr + ': ' + count + '项打卡">' + d + '</div>';
  }
  el.innerHTML = html;
}

// 留言频率趋势（近30天折线图）
function renderDashMsgChart() {
  var canvas = document.getElementById('dash-msg-chart');
  if (!canvas) return;
  var ctx = canvas.getContext('2d');
  var w = canvas.width, h = canvas.height;
  ctx.clearRect(0, 0, w, h);

  var messages = JSON.parse(localStorage.getItem('lb_messages') || '[]');
  var counts = [];
  for (var i = 29; i >= 0; i--) {
    var d = new Date(); d.setDate(d.getDate() - i);
    var ds = d.toISOString().split('T')[0];
    var cnt = messages.filter(function(m) { return (m.time || '').startsWith(ds); }).length;
    counts.push(cnt);
  }

  if (counts.every(function(c) { return c === 0; })) {
    ctx.fillStyle = '#9ca3af';
    ctx.font = '13px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('暂无留言数据', w/2, h/2);
    return;
  }

  var padding = { top: 20, right: 10, bottom: 25, left: 30 };
  var pw = w - padding.left - padding.right;
  var ph = h - padding.top - padding.bottom;
  var maxVal = Math.max.apply(null, counts) || 1;

  // Grid lines
  ctx.strokeStyle = '#f3f4f6';
  ctx.lineWidth = 1;
  for (var g = 0; g <= 4; g++) {
    var gy = padding.top + (ph * g / 4);
    ctx.beginPath(); ctx.moveTo(padding.left, gy); ctx.lineTo(w - padding.right, gy); ctx.stroke();
    ctx.fillStyle = '#9ca3af';
    ctx.font = '10px sans-serif';
    ctx.textAlign = 'right';
    ctx.fillText(Math.round(maxVal * (4-g) / 4), padding.left - 4, gy + 4);
  }

  // Data line
  ctx.beginPath();
  ctx.strokeStyle = '#3b82f6';
  ctx.lineWidth = 2;
  var stepX = pw / (counts.length - 1 || 1);
  counts.forEach(function(c, i) {
    var x = padding.left + stepX * i;
    var y = padding.top + ph - (c / maxVal * ph);
    if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
  });
  ctx.stroke();

  // Dots
  counts.forEach(function(c, i) {
    if (c === 0) return;
    var x = padding.left + stepX * i;
    var y = padding.top + ph - (c / maxVal * ph);
    ctx.beginPath(); ctx.arc(x, y, 3, 0, Math.PI*2);
    ctx.fillStyle = '#3b82f6'; ctx.fill();
  });

  // X labels
  ctx.fillStyle = '#9ca3af';
  ctx.font = '9px sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('30天前', padding.left, h - 5);
  ctx.fillText('今天', w - padding.right, h - 5);
}

// 心情变化曲线
function renderDashMoodChart() {
  var canvas = document.getElementById('dash-mood-chart');
  if (!canvas) return;
  var ctx = canvas.getContext('2d');
  var w = canvas.width, h = canvas.height;
  ctx.clearRect(0, 0, w, h);

  var moodData = getMoodData();
  var history = moodData.history || {};
  var moodScore = { sunny: 5, love: 4, cloudy: 2, space: 1, storm: 0, sick: 1 };

  var dates = Object.keys(history).sort().slice(-30);
  if (dates.length === 0) {
    ctx.fillStyle = '#9ca3af';
    ctx.font = '13px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('暂无心情数据', w/2, h/2);
    return;
  }

  var padding = { top: 20, right: 10, bottom: 25, left: 30 };
  var pw = w - padding.left - padding.right;
  var ph = h - padding.top - padding.bottom;

  // Grid
  ctx.strokeStyle = '#f3f4f6';
  ctx.lineWidth = 1;
  for (var g = 0; g <= 4; g++) {
    var gy = padding.top + (ph * g / 4);
    ctx.beginPath(); ctx.moveTo(padding.left, gy); ctx.lineTo(w - padding.right, gy); ctx.stroke();
    ctx.fillStyle = '#9ca3af';
    ctx.font = '10px sans-serif';
    ctx.textAlign = 'right';
    var labels = ['😊', '', '😐', '', '😔'];
    ctx.fillText(labels[g] || '', padding.left - 4, gy + 4);
  }

  var stepX = pw / Math.max(dates.length - 1, 1);

  function drawLine(user, color) {
    ctx.beginPath();
    ctx.strokeStyle = color;
    ctx.lineWidth = 2;
    var hasData = false;
    dates.forEach(function(ds, i) {
      var day = history[ds] || {};
      var mood = day[user];
      if (mood) {
        var score = moodScore[mood] || 2;
        var x = padding.left + stepX * i;
        var y = padding.top + ph - (score / 5 * ph);
        if (!hasData) { ctx.moveTo(x, y); hasData = true; }
        else ctx.lineTo(x, y);
      }
    });
    if (hasData) ctx.stroke();

    // Dots
    dates.forEach(function(ds, i) {
      var day = history[ds] || {};
      var mood = day[user];
      if (mood) {
        var score = moodScore[mood] || 2;
        var x = padding.left + stepX * i;
        var y = padding.top + ph - (score / 5 * ph);
        ctx.beginPath(); ctx.arc(x, y, 3, 0, Math.PI*2);
        ctx.fillStyle = color; ctx.fill();
      }
    });
  }

  drawLine('shushu', '#3b82f6');
  drawLine('bibi', '#3b82f6');

  // Legend
  ctx.fillStyle = '#3b82f6';
  ctx.fillRect(10, 5, 8, 8);
  ctx.fillStyle = '#6b7280';
  ctx.font = '10px sans-serif';
  ctx.textAlign = 'left';
  ctx.fillText('鼠鼠', 22, 13);
  ctx.fillStyle = '#3b82f6';
  ctx.fillRect(60, 5, 8, 8);
  ctx.fillStyle = '#6b7280';
  ctx.fillText('笔笔', 72, 13);
}

// 数据摘要
function renderDashStats() {
  var el = document.getElementById('dash-stats');
  if (!el) return;

  var transactions = getData('transactions', []);
  var totalExpense = transactions.filter(function(t){return t.type==='expense';}).reduce(function(s,t){return s+t.amount;},0);
  var totalIncome = transactions.filter(function(t){return t.type==='income';}).reduce(function(s,t){return s+t.amount;},0);
  var messages = JSON.parse(localStorage.getItem('lb_messages') || '[]');
  var albums = getData('albums', []);
  var photoCount = albums.reduce(function(s,a){return s+(a.photos?a.photos.length:0);},0);
  var plans = getData('plans', []);
  var wishlist = getData('wishlist', []);
  var doneWishes = wishlist.filter(function(w){return w.done;}).length;

  el.innerHTML =
    '<div class="dash-stat"><div class="dash-stat-val">¥' + Math.round(totalExpense) + '</div><div class="dash-stat-label">累计支出</div></div>' +
    '<div class="dash-stat"><div class="dash-stat-val">¥' + Math.round(totalIncome) + '</div><div class="dash-stat-label">累计收入</div></div>' +
    '<div class="dash-stat"><div class="dash-stat-val">' + messages.length + '</div><div class="dash-stat-label">留言总数</div></div>' +
    '<div class="dash-stat"><div class="dash-stat-val">' + photoCount + '</div><div class="dash-stat-label">相册照片</div></div>' +
    '<div class="dash-stat"><div class="dash-stat-val">' + plans.length + '</div><div class="dash-stat-label">约会计划</div></div>' +
    '<div class="dash-stat"><div class="dash-stat-val">' + doneWishes + '</div><div class="dash-stat-label">完成心愿</div></div>';
}

// ==================== 恋爱日记本 ====================

function getDiaryData() {
  try { return JSON.parse(localStorage.getItem('lb_diary') || '[]'); } catch(e) { return []; }
}
function saveDiaryData(data) { safeSetData('lb_diary', data); }

// 安全写入（失败回滚）
function safeSetData(key, data) {
  var backup = localStorage.getItem(key);
  try {
    localStorage.setItem(key, JSON.stringify(data));
  } catch(e) {
    if (backup !== null) localStorage.setItem(key, backup);
    showToast('⚠️ 存储空间不足，请清理数据');
  }
}

function openDiaryEditor(entry) {
  var modal = document.getElementById('global-modal');
  var isEdit = !!entry;
  var html = '<div class="diary-editor"><h3>' + (isEdit ? '✏️ 编辑日记' : '✏️ 写日记') + '</h3>' +
    '<label>日期</label><input type="date" id="diary-date" value="' + (entry ? entry.date : new Date().toISOString().split('T')[0]) + '">' +
    '<label>标题</label><input type="text" id="diary-title" placeholder="今天发生了什么..." value="' + (entry ? escapeHtml(entry.title) : '') + '">' +
    '<label>心情</label><select id="diary-mood">' +
    '<option value="happy"' + (entry && entry.mood==='happy' ? ' selected' : '') + '>😊 开心</option>' +
    '<option value="love"' + (entry && entry.mood==='love' ? ' selected' : '') + '>🥰 甜蜜</option>' +
    '<option value="normal"' + (entry && entry.mood==='normal' ? ' selected' : '') + '>😐 日常</option>' +
    '<option value="sad"' + (entry && entry.mood==='sad' ? ' selected' : '') + '>😢 难过</option>' +
    '<option value="miss"' + (entry && entry.mood==='miss' ? ' selected' : '') + '>💭 想你</option>' +
    '</select>' +
    '<label>天气</label><select id="diary-weather">' +
    '<option value="sunny"' + (entry && entry.weather==='sunny' ? ' selected' : '') + '>☀️ 晴天</option>' +
    '<option value="cloudy"' + (entry && entry.weather==='cloudy' ? ' selected' : '') + '>☁️ 多云</option>' +
    '<option value="rain"' + (entry && entry.weather==='rain' ? ' selected' : '') + '>🌧️ 下雨</option>' +
    '<option value="snow"' + (entry && entry.weather==='snow' ? ' selected' : '') + '>❄️ 下雪</option>' +
    '<option value="wind"' + (entry && entry.weather==='wind' ? ' selected' : '') + '>💨 刮风</option>' +
    '</select>' +
    '<label>内容</label><textarea id="diary-body" placeholder="写下你想记住的一切...">' + (entry ? escapeHtml(entry.body) : '') + '</textarea>' +
    '<div class="diary-editor-btns">' +
    '<button class="btn-cancel" onclick="closeGlobalModal()">取消</button>' +
    '<button class="btn-save" onclick="saveDiary(' + (entry ? "'" + entry.id + "'" : 'null') + ')">' + (isEdit ? '保存修改' : '发布日记') + '</button>' +
    '</div></div>';

  document.getElementById('global-modal-content').innerHTML = html;
  document.getElementById('global-modal').classList.remove('hidden');
}

function escapeHtml(str) { return str.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;'); }

function saveDiary(editId) {
  var date = document.getElementById('diary-date').value;
  var title = document.getElementById('diary-title').value.trim();
  var mood = document.getElementById('diary-mood').value;
  var weather = document.getElementById('diary-weather').value;
  var body = document.getElementById('diary-body').value.trim();
  if (!title && !body) { showToast('请输入标题或内容 📝'); return; }

  var diaries = getDiaryData();
  if (editId) {
    var idx = diaries.findIndex(function(d) { return d.id === editId; });
    if (idx >= 0) {
      diaries[idx].date = date;
      diaries[idx].title = title || '无标题';
      diaries[idx].mood = mood;
      diaries[idx].weather = weather;
      diaries[idx].body = body;
      diaries[idx].updatedAt = new Date().toISOString();
    }
  } else {
    diaries.push({
      id: 'd_' + Date.now(),
      date: date,
      title: title || '无标题',
      mood: mood,
      weather: weather,
      body: body,
      createdAt: new Date().toISOString(),
      updatedAt: null
    });
  }
  saveDiaryData(diaries);
  closeGlobalModal();
  renderDiaryList();
  showToast(editId ? '日记已更新 ✅' : '日记已发布 ✅');
}

function deleteDiary(id) {
  if (!confirm('确定删除这篇日记吗？此操作不可撤销。')) return;
  var diaries = getDiaryData().filter(function(d) { return d.id !== id; });
  saveDiaryData(diaries);
  renderDiaryList();
  showToast('日记已删除 🗑️');
}

function renderDiaryList() {
  var el = document.getElementById('diary-list');
  if (!el) return;
  var diaryData = getDiaryData();
  var query = (document.getElementById('diary-search') || {}).value || '';

  var filtered = diaryData.filter(function(d) {
    if (!query) return true;
    var q = query.toLowerCase();
    return (d.title||'').toLowerCase().indexOf(q) >= 0 || (d.body||'').toLowerCase().indexOf(q) >= 0;
  });
  filtered.sort(function(a,b) { return b.date.localeCompare(a.date); });

  if (filtered.length === 0) {
    el.innerHTML = '<div class="diary-empty">' + (query ? '没有找到匹配的日记 🔍' : '还没有写过日记，点击上方按钮开始记录吧 ✏️') + '</div>';
    return;
  }

  var moodEmoji = { happy: '😊', love: '🥰', normal: '😐', sad: '😢', miss: '💭' };
  var weatherEmoji = { sunny: '☀️', cloudy: '☁️', rain: '🌧️', snow: '❄️', wind: '💨' };

  el.innerHTML = filtered.map(function(d) {
    return '<div class="diary-entry">' +
      '<div class="diary-entry-header">' +
      '<span class="diary-entry-date">' + (moodEmoji[d.mood]||'') + ' ' + d.date + '</span>' +
      '<span class="diary-entry-mood">' + (weatherEmoji[d.weather]||'') + '</span>' +
      '</div>' +
      '<div class="diary-entry-title">' + escapeHtml(d.title) + '</div>' +
      '<div class="diary-entry-body">' + (d.body.length > 200 ? escapeHtml(d.body.slice(0,200)) + '...' : escapeHtml(d.body)) + '</div>' +
      '<div class="diary-entry-actions">' +
      '<button onclick="openDiaryEditor(' + JSON.stringify(d).replace(/"/g, '&quot;') + ')">✏️ 编辑</button>' +
      '<button onclick="deleteDiary(\'' + d.id + '\')">🗑️ 删除</button>' +
      '</div>' +
      '</div>';
  }).join('');
}

// ==================== 纪念日通知 ====================

function initNotifications() {
  if (!('Notification' in window)) return;

  if (Notification.permission === 'granted') {
    checkAndNotify();
  } else if (Notification.permission !== 'denied') {
    // 首次访问稍后请求权限，不打扰
    setTimeout(function() {
      if (Notification.permission === 'default') {
        Notification.requestPermission().then(function(perm) {
          if (perm === 'granted') checkAndNotify();
        });
      }
    }, 10000);
  }

  // 每天检查一次
  var now = new Date();
  var lastCheck = localStorage.getItem('lb_notify_last_check');
  var today = now.toISOString().split('T')[0];
  if (lastCheck !== today) {
    if (Notification.permission === 'granted') {
      checkAndNotify();
    }
    localStorage.setItem('lb_notify_last_check', today);
  }
}

function checkAndNotify() {
  if (Notification.permission !== 'granted') return;
  var countdowns = getData('countdowns', []);
  if (!countdowns.length) return;

  var now = new Date();
  var start = getData('love_start', '2026-06-23');
  var startDate = new Date(start);

  // 检查恋爱纪念日
  var totalDays = Math.floor((now - startDate) / (1000*60*60*24));
  var milestones = [7,14,30,50,99,100,150,200,250,300,365,400,500,520,600,700,800,900,999,1000,1314];
  milestones.forEach(function(m) {
    if (totalDays + 1 === m) {
      showNotify('💕 恋爱里程碑', '明天是相恋第 ' + m + ' 天！别忘了庆祝~');
    }
  });

  // 检查自定义倒计时
  countdowns.forEach(function(c) {
    var target = new Date(c.date);
    var diff = Math.ceil((target - now) / (1000*60*60*24));
    if (diff === 1) {
      showNotify('⏳ ' + c.title, '明天就是 ' + c.title + ' 了！');
    }
  });

  // 检查纪念日（如每月纪念日）
  var monthDay = now.getDate();
  var tomorrow = new Date(now); tomorrow.setDate(tomorrow.getDate()+1);
  if (tomorrow.getDate() === monthDay + 1 || tomorrow.getDate() === 1) {
    var monthDiff = (now.getFullYear() - startDate.getFullYear()) * 12 + (now.getMonth() - startDate.getMonth());
    if (monthDiff > 0) {
      showNotify('💝 月度纪念日', '明天是相恋 ' + (monthDiff+1) + ' 个月纪念日！');
    }
  }
}

function showNotify(title, body) {
  if (Notification.permission !== 'granted') return;
  try {
    new Notification(title, {
      body: body,
      icon: '/assets/icon-192.png',
      badge: '/assets/icon-192.png',
      tag: 'love-notify-' + new Date().toISOString().split('T')[0],
      requireInteraction: false
    });
  } catch(e) {}
}

// ==================== 初始化四季皮肤系统（已禁用，使用固定天空蓝背景）====================
// (function initSeasonSystem() {
//   function applyCurrentSeason() {
//     var season = getCurrentSeason();
//     applySeason(season);
//     console.log('[SeasonSystem] ✅ 当前季节:', season);
//   }
//
//   if (document.readyState === 'loading') {
//     document.addEventListener('DOMContentLoaded', applyCurrentSeason);
//   } else {
//     applyCurrentSeason();
//   }
// })();
console.log('[SeasonSystem] ⚠️ 四季皮肤系统已禁用，使用固定天空蓝背景');
