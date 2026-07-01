/* ================================================================
   漂流瓶系统 v2.1 — Supabase 双人联网版（国内可访问）
   依赖: @supabase/supabase-js CDN + supabase-core.js
   真正的实时同步 · PostgreSQL · 开源免费
   ================================================================ */
console.log('[Drift-V3] ✅ 这是新文件！drift-v3.js 已加载（共' + (document.currentScript ? '动态加载' : '静态') + '行）');

/* ================================================================
   常量 & 配置
   ================================================================ */

// 8大主题瓶配置
const BOTTLE_TYPES = [
  {
    id: 'confession',
    name: '心动告白瓶',
    icon: '💘',
    color: '#dbeafe',
    border: '#3b82f6',
    desc: '记录心动瞬间，难以开口的情话',
    templates: [
      '今天突然很想你，想让你知道...',
      '有一件事我一直想说...',
      '你知道吗，每次看到你我都会...',
      '心动是什么感觉？就是你这样的...'
    ]
  },
  {
    id: 'makeup',
    name: '台阶和解瓶',
    icon: '🕊️',
    color: '#e0f2fe',
    border: '#0ea5e9',
    desc: '吵架示弱、主动求和，避免当面尴尬',
    templates: [
      '我知道我刚才说错了，对不起...',
      '我不想再冷战了，我们和好吧...',
      '其实我心里一点都没生气，只是有点难受...',
      '你是不是也在等我先道歉？那我先说...'
    ]
  },
  {
    id: 'privilege',
    name: '特权兑换券',
    icon: '🎫',
    color: '#fef9c3',
    border: '#eab308',
    desc: '拥抱券、全天约会券、奶茶投喂券...',
    privileges: [
      { icon: '🤗', name: '拥抱券', desc: '随时兑换一个长达10秒的拥抱' },
      { icon: '☕', name: '奶茶投喂券', desc: '对方请你喝你最爱的奶茶' },
      { icon: '📱', name: '睡前语音券', desc: '今晚睡前通话直到睡着' },
      { icon: '🚶', name: '牵手散步券', desc: '今天约会全程牵着手' },
      { icon: '📸', name: '双人合照券', desc: '今天必须合拍一张' },
      { icon: '👑', name: '全天主导券', desc: '今天所有决定我来做' },
      { icon: '🍜', name: '点餐特权券', desc: '今天吃什么你说了算' },
      { icon: '💬', name: '三分钟情话券', desc: '对方要连续说3分钟情话' },
    ]
  },
  {
    id: 'date',
    name: '同城约会任务',
    icon: '📍',
    color: '#d1fae5',
    border: '#10b981',
    desc: '绑定地标，触发线下约会安排',
    templates: [
      '我们去江边散步吧，就今晚...',
      '今天出来吃夜市，我在等你...',
      '周末去看电影吗？我选好片子了...',
      '下午来找我，我们去那家甜品店...'
    ]
  },
  {
    id: 'capsule',
    name: '时空胶囊',
    icon: '⏰',
    color: '#ede9fe',
    border: '#1d4ed8',
    desc: '设定解锁时间，生日/纪念日自动浮出',
    special: true  // 需要设置解锁时间
  },
  {
    id: 'treasure',
    name: '寻宝线索瓶',
    icon: '🗺️',
    color: '#fed7aa',
    border: '#f97316',
    desc: '埋藏地标线索，另一方全城搜寻',
    templates: [
      '线索一：去我们第一次见面的地方...',
      '找到这里之后，还有一个线索...',
      '宝藏就藏在你最熟悉的那个地方...',
      '先去买两杯奶茶，再看下一条线索...'
    ]
  },
  {
    id: 'memory',
    name: '回忆锚点',
    icon: '📷',
    color: '#dbeafe',
    border: '#db2777',
    desc: '投放至约会旧址，存放合照与故事',
    templates: [
      '还记得我们在这里...',
      '这个地方对我来说很特别，因为...',
      '你知道吗，上次我们在这里...',
      '每次经过这里我都会想到你...'
    ]
  },
  {
    id: 'travel',
    name: '全域流浪瓶',
    icon: '✈️',
    color: '#dbeafe',
    border: '#3b82f6',
    desc: '漂往外省，记录旅行清单，点亮城市图鉴',
    templates: [
      '我想带你去的地方是...',
      '有一天我们一定要一起去...',
      '把这个城市加入我们的旅行清单...',
      '想象一下，我们在这个城市...'
    ]
  }
];

// 天气主题配置
const WEATHER_THEMES = {
  clear: {
    name: '晴天', skyColor1: '#60a5fa', skyColor2: '#0ea5e9',
    waveColor: 'rgba(255,255,255,0.2)',
    particles: ['☀️', '🌟', '✨'],
    bottleIcon: '☀️',
    headerText: '阳光灿烂的日子，心情也要明媚✨'
  },
  clouds: {
    name: '多云', skyColor1: '#94a3b8', skyColor2: '#64748b',
    waveColor: 'rgba(255,255,255,0.15)',
    particles: ['☁️', '🌥️'],
    bottleIcon: '☁️',
    headerText: '云朵悠悠，漂流瓶也跟着飘呢~'
  },
  rain: {
    name: '下雨', skyColor1: '#475569', skyColor2: '#334155',
    waveColor: 'rgba(255,255,255,0.1)',
    particles: ['🌧️', '💧'],
    bottleIcon: '🌧️',
    headerText: '下雨天最适合写一封漂流瓶了～',
    rainDrop: true
  },
  thunderstorm: {
    name: '雷雨', skyColor1: '#1e293b', skyColor2: '#0f172a',
    waveColor: 'rgba(255,255,255,0.08)',
    particles: ['⛈️', '⚡'],
    bottleIcon: '⛈️',
    headerText: '风雨中的漂流瓶，总会到达彼岸🌊',
    rainDrop: true
  },
  snow: {
    name: '下雪', skyColor1: '#e2e8f0', skyColor2: '#cbd5e1',
    waveColor: 'rgba(255,255,255,0.35)',
    particles: ['❄️', '🌨️', '⛄'],
    bottleIcon: '❄️',
    headerText: '初雪到来，把思念封存在雪中瓶里❄️'
  },
  drizzle: {
    name: '小雨', skyColor1: '#64748b', skyColor2: '#475569',
    waveColor: 'rgba(255,255,255,0.12)',
    particles: ['🌦️', '💧'],
    bottleIcon: '🌦️',
    headerText: '蒙蒙细雨，悄悄说一句我想你吧~'
  },
  mist: {
    name: '晨雾', skyColor1: '#9aa3af', skyColor2: '#6b7280',
    waveColor: 'rgba(255,255,255,0.18)',
    particles: ['🌫️'],
    bottleIcon: '🌫️',
    headerText: '薄雾弥漫，漂流瓶在雾中若隐若现~'
  }
};

// 深夜专属主题（22:00 - 02:00）
const NIGHT_THEME = {
  name: '深夜私密海域',
  skyColor1: '#0f0c29',
  skyColor2: '#302b63',
  waveColor: 'rgba(147,197,253,0.12)',
  particles: ['⭐', '🌙', '💫'],
  bottleIcon: '🌙',
  headerText: '深夜时分，悄悄送出一封心里话 🌙',
  isNight: true
};

/* ================================================================
   状态管理
   ================================================================ */

let driftBottlesCanvas = [];  // canvas动画瓶子列表
let driftAnimFrame = null;    // rAF handle
// _driftCurrentTab 已在 app-main-v9.js 中声明，此处仅赋值
_driftCurrentTab = _driftCurrentTab || 'my';
let _currentWeather = null;   // 当前天气数据
let _currentTheme = null;     // 当前海面主题
let _sbSubscriptionKey = null; // Supabase 实时订阅 key

// 后端就绪检查（使用 supabase-core.js 提供的函数）
function isBackendReady() { return typeof SB_READY === 'function' ? SB_READY() : false; }


/* ================================================================
   本地存储降级（Firebase不可用时）
   ================================================================ */

function getLocalBottles()      { return getData('drift_my_bottles_v2', []); }
function saveLocalBottles(arr)  { setData('drift_my_bottles_v2', arr); }
function getLocalCaught()       { return getData('drift_caught_v2', []); }
function saveLocalCaught(arr)   { setData('drift_caught_v2', arr); }
function getLocalAchievements() { return getData('drift_achievements', {}); }
function saveLocalAchievements(d) { setData('drift_achievements', d); }
function getLocalPoints()       { return parseInt(getData('drift_points', 0)); }
function addLocalPoints(n)      { setData('drift_points', getLocalPoints() + n); }

/* ================================================================
   天气获取（OpenWeatherMap 免费 API）
   城市：使用浏览器定位，或默认上海
   ================================================================ */

// 天气API key（OpenWeatherMap免费版，注册即得）
const WEATHER_API_KEY = "70318e3263385a91c01c6f71405e83df"; // OpenWeatherMap API Key

async function fetchWeather() {
  // 检查是否已有缓存（1小时内）
  const cached = getData('drift_weather_cache', null);
  if (cached && Date.now() - cached.fetchedAt < 60 * 60 * 1000) {
    return cached;
  }

  if (WEATHER_API_KEY === 'YOUR_OPENWEATHER_KEY') {
    // 未配置key时，根据时间段返回模拟天气
    const hour = new Date().getHours();
    const mock = hour >= 18 || hour < 6 ? 'clear' : 'clouds';
    return { condition: mock, temp: null, city: null };
  }

  try {
    // 先尝试获取定位
    const pos = await new Promise((res, rej) => {
      if (!navigator.geolocation) { rej('no geo'); return; }
      navigator.geolocation.getCurrentPosition(res, rej, { timeout: 5000 });
    }).catch(() => null);

    let url;
    if (pos) {
      url = `https://api.openweathermap.org/data/2.5/weather?lat=${pos.coords.latitude}&lon=${pos.coords.longitude}&appid=${WEATHER_API_KEY}&units=metric`;
    } else {
      // 默认上海
      url = `https://api.openweathermap.org/data/2.5/weather?q=Shanghai&appid=${WEATHER_API_KEY}&units=metric`;
    }

    const resp = await fetch(url);
    const data = await resp.json();
    const main = data.weather[0].main.toLowerCase();

    // 映射天气分类
    let condition = 'clear';
    if (main.includes('clear')) condition = 'clear';
    else if (main.includes('cloud')) condition = 'clouds';
    else if (main.includes('rain')) condition = 'rain';
    else if (main.includes('drizzle')) condition = 'drizzle';
    else if (main.includes('thunder')) condition = 'thunderstorm';
    else if (main.includes('snow')) condition = 'snow';
    else if (main.includes('mist') || main.includes('fog') || main.includes('haze')) condition = 'mist';

    const result = {
      condition,
      temp: Math.round(data.main.temp),
      city: data.name,
      desc: data.weather[0].description,
      fetchedAt: Date.now()
    };
    setData('drift_weather_cache', result);
    return result;
  } catch (e) {
    return { condition: 'clear', temp: null, city: null };
  }
}

// 获取当前海面主题（深夜 > 天气 > 默认晴天）
function getCurrentTheme(weather) {
  const hour = new Date().getHours();
  if (hour >= 22 || hour < 2) return NIGHT_THEME;
  const cond = (weather && weather.condition) || 'clear';
  return WEATHER_THEMES[cond] || WEATHER_THEMES.clear;
}

/* ================================================================
   渲染入口
   ================================================================ */

async function renderDriftBottle() {
  const canvas = document.getElementById('drift-ocean');
  if (!canvas) return;

  // 初始化Firebase（如果还没初始化）
  // Supabase init handled by supabase-core.js (called in index.html)

  // 获取天气（异步，先用默认主题渲染，天气加载后更新）
  fetchWeather().then(weather => {
    _currentWeather = weather;
    _currentTheme   = getCurrentTheme(weather);
    updateWeatherBanner(weather);
  });
  _currentTheme = _currentTheme || getCurrentTheme(null);

  // 设置canvas尺寸
  if (driftAnimFrame) { cancelAnimationFrame(driftAnimFrame); driftAnimFrame = null; }
  const wrap = canvas.parentElement;
  const dpr  = window.devicePixelRatio || 1;
  const W    = wrap.clientWidth  || 360;
  const H    = Math.min(W * 0.54, 320);
  canvas.width        = W * dpr;
  canvas.height       = H * dpr;
  canvas.style.width  = W + 'px';
  canvas.style.height = H + 'px';
  const ctx = canvas.getContext('2d');
  ctx.scale(dpr, dpr);

  // 加载瓶子数据
  await loadDriftBottlesForCanvas(W, H);

  // 更新UI
  updateDriftStats();
  renderDriftMyList();
  renderDriftCaughtList();
  renderAchievements();
  renderPoints();

  // 设置Firebase实时监听（如果可用）
  setupSupabaseListener(W, H);

  // 开始动画循环
  function drawFrame() {
    const theme = _currentTheme || WEATHER_THEMES.clear;
    const t     = Date.now() / 1000;

    ctx.clearRect(0, 0, W, H);

    // ── 背景渐变 ──
    const grad = ctx.createLinearGradient(0, 0, 0, H);
    grad.addColorStop(0,   theme.skyColor1);
    grad.addColorStop(0.5, theme.skyColor2 || theme.skyColor1);
    grad.addColorStop(1,   adjustColor(theme.skyColor2 || theme.skyColor1, -30));
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, W, H);

    // ── 星星（深夜模式）──
    if (theme.isNight) {
      for (let i = 0; i < 60; i++) {
        const sx = (Math.sin(i * 137.5) * 0.5 + 0.5) * W;
        const sy = (Math.cos(i * 97.3)  * 0.5 + 0.5) * H * 0.65;
        const a  = 0.4 + Math.abs(Math.sin(t * 0.8 + i)) * 0.5;
        ctx.fillStyle = `rgba(255,255,255,${a.toFixed(2)})`;
        ctx.beginPath();
        ctx.arc(sx, sy, 1 + Math.sin(i) * 0.5, 0, Math.PI * 2);
        ctx.fill();
      }
      // 月亮
      ctx.fillStyle = 'rgba(255,253,200,0.9)';
      ctx.beginPath();
      ctx.arc(W * 0.82, H * 0.15, 18, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = adjustColor(theme.skyColor1, -5);
      ctx.beginPath();
      ctx.arc(W * 0.86, H * 0.12, 15, 0, Math.PI * 2);
      ctx.fill();
    }

    // ── 雨滴（雨天模式）──
    if (theme.rainDrop) {
      ctx.strokeStyle = 'rgba(147,197,253,0.3)';
      ctx.lineWidth   = 1;
      for (let i = 0; i < 40; i++) {
        const rx = ((t * 80 + i * 47) % W);
        const ry = ((t * 200 + i * 111) % H);
        ctx.beginPath();
        ctx.moveTo(rx, ry);
        ctx.lineTo(rx - 2, ry + 8);
        ctx.stroke();
      }
    }

    // ── 阳光光斑（晴天）──
    if (!theme.isNight && !theme.rainDrop) {
      ctx.save();
      for (let i = 0; i < 20; i++) {
        const sx = (Math.sin(t * 0.4 + i * 11) * 0.5 + 0.5) * W;
        const sy = (Math.sin(t * 0.3 + i * 7)  * 0.5 + 0.5) * H * 0.45;
        const a  = 0.05 + Math.abs(Math.sin(t + i)) * 0.12;
        ctx.fillStyle = `rgba(255,255,255,${a.toFixed(2)})`;
        ctx.beginPath(); ctx.arc(sx, sy, 2, 0, Math.PI * 2); ctx.fill();
      }
      ctx.restore();
    }

    // ── 波浪层1 ──
    ctx.beginPath();
    ctx.moveTo(0, H * 0.52);
    for (let x = 0; x <= W; x += 3) {
      const y = H * 0.52 + Math.sin(x * 0.016 + t) * 10 + Math.sin(x * 0.042 + t * 1.3) * 5;
      ctx.lineTo(x, y);
    }
    ctx.lineTo(W, H); ctx.lineTo(0, H); ctx.closePath();
    ctx.fillStyle = theme.waveColor || 'rgba(255,255,255,0.18)';
    ctx.fill();

    // ── 波浪层2 ──
    ctx.beginPath();
    ctx.moveTo(0, H * 0.7);
    for (let x = 0; x <= W; x += 3) {
      const y = H * 0.7 + Math.sin(x * 0.022 + t * 0.85 + 1.2) * 7;
      ctx.lineTo(x, y);
    }
    ctx.lineTo(W, H); ctx.lineTo(0, H); ctx.closePath();
    ctx.fillStyle = 'rgba(255,255,255,0.09)';
    ctx.fill();

    // ── 海鸥（晴天/多云）──
    if (!theme.isNight && !theme.rainDrop) {
      for (let i = 0; i < 3; i++) {
        const gx = ((t * 25 + i * 170) % (W + 80)) - 40;
        const gy = 30 + Math.sin(t + i * 1.5) * 12 + i * 10;
        ctx.strokeStyle = 'rgba(255,255,255,0.5)';
        ctx.lineWidth   = 1.6;
        ctx.beginPath();
        ctx.moveTo(gx - 6, gy);
        ctx.quadraticCurveTo(gx - 3, gy - 4, gx, gy);
        ctx.quadraticCurveTo(gx + 3, gy - 4, gx + 6, gy);
        ctx.stroke();
      }
    }

    // ── 萤火虫（深夜）──
    if (theme.isNight) {
      for (let i = 0; i < 12; i++) {
        const fx = W * 0.1 + (Math.sin(t * 0.5 + i * 2.7) * 0.5 + 0.5) * W * 0.8;
        const fy = H * 0.1 + (Math.cos(t * 0.4 + i * 1.9) * 0.5 + 0.5) * H * 0.7;
        const a  = 0.3 + Math.abs(Math.sin(t * 1.2 + i)) * 0.6;
        ctx.fillStyle = `rgba(200,255,150,${a.toFixed(2)})`;
        ctx.beginPath(); ctx.arc(fx, fy, 2, 0, Math.PI * 2); ctx.fill();
      }
    }

    // ── 瓶子 ──
    driftBottlesCanvas.forEach(b => {
      b.x += b.speedX;
      b.y += b.speedY + Math.sin(t + b.bobPhase) * 0.1;
      if (b.x < 18 || b.x > W - 18) b.speedX *= -1;
      if (b.y < 18 || b.y > H - 22) b.speedY *= -1;
      b.x = Math.max(18, Math.min(W - 18, b.x));
      b.y = Math.max(18, Math.min(H - 22, b.y));

      ctx.save();
      ctx.translate(b.x, b.y);
      ctx.rotate(Math.sin(t * 0.75 + b.bobPhase) * 0.15);
      drawBottleShapeV2(ctx, b, t);
      ctx.restore();
    });

    // ── 底部提示文字 ──
    const textAlpha = theme.isNight ? 0.6 : 0.5;
    ctx.fillStyle = `rgba(255,255,255,${textAlpha})`;
    ctx.font      = 'bold 11px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('💝 点击瓶子捞取 · 点下方按钮随机捞爱心瓶', W / 2, H - 8);

    driftAnimFrame = requestAnimationFrame(drawFrame);
  }

  // 点击捞瓶
  canvas.onclick = function(e) {
    const r  = canvas.getBoundingClientRect();
    const cx = (e.clientX - r.left) * (W / r.width);
    const cy = (e.clientY - r.top)  * (H / r.height);
    for (let i = driftBottlesCanvas.length - 1; i >= 0; i--) {
      const b = driftBottlesCanvas[i];
      if (Math.hypot(cx - b.x, cy - b.y) < b.size * 1.8) {
        doCatchBottle(b);
        return;
      }
    }
    catchRandomBottleV2();
  };

  drawFrame();
}

/* ================================================================
   瓶子绘制 V2（支持8种类型视觉）
   ================================================================ */

function drawBottleShapeV2(ctx, b, t) {
  const bh = b.size * 2.3;
  const bw = b.size * 0.78;
  const br = bw * 0.36;
  const typeConf = BOTTLE_TYPES.find(tp => tp.id === b.type) || BOTTLE_TYPES[0];

  // 瓶身颜色
  const bodyFill   = typeConf.color + 'ee';
  const strokeCol  = typeConf.border;

  ctx.fillStyle   = bodyFill;
  ctx.strokeStyle = strokeCol;
  ctx.lineWidth   = 1.5;

  // 绘制圆角矩形瓶身
  ctx.beginPath();
  ctx.moveTo(-bw/2 + br, -bh/2);
  ctx.lineTo( bw/2 - br, -bh/2);
  ctx.arcTo( bw/2, -bh/2,  bw/2, -bh/2 + br, br);
  ctx.lineTo( bw/2,  bh/2 - br);
  ctx.arcTo( bw/2,  bh/2,  bw/2 - br,  bh/2, br);
  ctx.lineTo(-bw/2 + br,  bh/2);
  ctx.arcTo(-bw/2,  bh/2, -bw/2,  bh/2 - br, br);
  ctx.lineTo(-bw/2, -bh/2 + br);
  ctx.arcTo(-bw/2, -bh/2, -bw/2 + br, -bh/2, br);
  ctx.closePath();
  ctx.fill(); ctx.stroke();

  // 瓶颈
  ctx.fillStyle = typeConf.border + '88';
  ctx.fillRect(-bw*0.22, -bh/2 - 7, bw*0.44, 8);

  // 软木塞
  ctx.fillStyle = '#d4a574';
  ctx.beginPath();
  if (ctx.roundRect) {
    ctx.roundRect(-bw*0.18, -bh/2 - 12, bw*0.36, 6, 2);
  } else {
    ctx.rect(-bw*0.18, -bh/2 - 12, bw*0.36, 6);
  }
  ctx.fill();

  // 信纸底色
  ctx.fillStyle = 'rgba(255,251,235,0.95)';
  ctx.fillRect(-bw*0.27, -bh*0.2, bw*0.54, bh*0.32);

  // 中心图标
  ctx.font         = (b.size * 0.58) + 'px sans-serif';
  ctx.textAlign    = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(typeConf.icon, 0, bh * 0.04);
  ctx.textBaseline = 'alphabetic';

  // Firebase同步的瓶子（对方发来的）加特殊光晕
  if (b.isRemote) {
    ctx.save();
    ctx.globalAlpha = 0.25 + Math.abs(Math.sin(t * 1.1 + b.bobPhase)) * 0.3;
    ctx.strokeStyle = typeConf.border;
    ctx.lineWidth   = 2.5;
    ctx.beginPath();
    ctx.arc(0, 0, b.size * 1.4, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();
  }

  // 胶囊瓶（定时未解锁）显示锁
  if (b.type === 'capsule' && b.unlockAt && Date.now() < b.unlockAt) {
    ctx.font         = (b.size * 0.4) + 'px sans-serif';
    ctx.textAlign    = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('🔒', 0, bh * 0.04);
    ctx.textBaseline = 'alphabetic';
  }
}

/* ================================================================
   加载瓶子到Canvas
   ================================================================ */

async function loadDriftBottlesForCanvas(W, H) {
  driftBottlesCanvas = [];

  // 1. 本地自己的瓶子（未被捞）
  const myList = getLocalBottles().filter(b => !b.caught);
  myList.forEach(b => {
    driftBottlesCanvas.push(makeCanvasBottle(b.id, b.type || 'confession', b.from, b.msg, W, H, false, false));
  });

  // 2. Firebase对方的瓶子
  if (isBackendReady()) {
    try {
      const fbBottles = await sbSelect('bottles', { filter: { caught: false }, order: { column: 'created_at', ascending: false }, limit: 50 });
      if (fbBottles) {
        const currentUser = localStorage.getItem('lb_user') || 'shushu';
        Object.entries(fbBottles).forEach(([key, b]) => {
          // 只显示对方投的、未被捞的瓶子
          if (b.from !== currentUser && !b.caught) {
            driftBottlesCanvas.push(makeCanvasBottle(key, b.type || 'confession', b.from, b.msg, W, H, false, true));
          }
        });
      }
    } catch (e) { /* 降级 */ }
  }

  // 3. 填充系统示例瓶子（保证海面不空）
  const sysCount = Math.max(0, 5 - driftBottlesCanvas.length);
  const sysMessages = [
    { type: 'confession', from: 'shushu', msg: '笔笔，今天看到一只猫咪特别像你💕' },
    { type: 'date',       from: 'bibi',   msg: '鼠鼠，今晚一起去江边散步好吗？' },
    { type: 'privilege',  from: 'shushu', msg: '🎫 奶茶投喂券 × 1，有效期7天' },
    { type: 'memory',     from: 'bibi',   msg: '还记得我们第一次见面吗？那天我好紧张...' },
    { type: 'travel',     from: 'shushu', msg: '有一天我要带你去大理，在洱海边看落日' },
  ];
  for (let i = 0; i < sysCount; i++) {
    const s = sysMessages[i];
    driftBottlesCanvas.push(makeCanvasBottle('sys_' + i, s.type, s.from, s.msg, W, H, true, false));
  }
}

function makeCanvasBottle(id, type, from, msg, W, H, isSystem, isRemote) {
  return {
    id, type, from, msg, isSystem, isRemote,
    x:        50 + Math.random() * (W - 100),
    y:        35 + Math.random() * (H - 70),
    speedX:   (Math.random() - 0.5) * 0.42,
    speedY:   (Math.random() - 0.5) * 0.28,
    bobPhase: Math.random() * Math.PI * 2,
    size:     13 + Math.random() * 6,
  };
}

/* ================================================================
   Supabase 实时监听（替代旧版 Firebase）
   ================================================================ */

let realtimeSubscription = null;

function setupSupabaseListener(W, H) {
  if (!isBackendReady() || !SB_CLIENT) return;

  const currentUser = localStorage.getItem('lb_user') || 'shushu';

  // 取消旧订阅
  if (realtimeSubscription) {
    SB_CLIENT.removeChannel(realtimeSubscription);
    realtimeSubscription = null;
  }

  // 使用 Supabase Realtime 订阅瓶子表
  realtimeSubscription = SB_CLIENT
    .channel('bottles-realtime')
    .on(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'bottles' },
      (payload) => {
        console.log('[Drift] 收到实时更新:', payload.eventType);
        // 重新加载瓶子列表
        loadBottlesFromSupabase(W, H);
      }
    )
    .subscribe((status) => {
      if (status === 'SUBSCRIBED') {
        console.log('[Drift] ✅ 已订阅实时更新');
        loadBottlesFromSupabase(W, H);
      } else if (status === 'CHANNEL_ERROR') {
        console.warn('[Drift] ⚠️ 实时订阅失败，使用本地模式');
      }
    });
}

// 从 Supabase 加载瓶子到 canvas
async function loadBottlesFromSupabase(W, H) {
  try {
    const currentUser = localStorage.getItem('lb_user') || 'shushu';
    const { data, error } = await sbSelect('bottles', '*');

    if (error) throw error;
    if (!data || data.length === 0) return;

    // 同步对方的瓶子到canvas
    const existingIds = new Set(driftBottlesCanvas.map(b => b.id));
    data.forEach((b) => {
      if (b.sender_role !== currentUser && !b.caught && !existingIds.has(b.id)) {
        driftBottlesCanvas.push(makeCanvasBottle(
          b.id, b.bottle_type || 'confession', b.sender_role,
          b.content, W, H, false, true
        ));
        existingIds.add(b.id); // 防止重复添加
      }
    });

    updateDriftStats();
  } catch (e) {
    console.error('[Drift] 加载瓶子失败:', e.message);
  }
}

/* ================================================================
   投放漂流瓶（主入口）
   ================================================================ */

function throwBottle() {
  const loggedUser = localStorage.getItem('lb_user') || 'shushu';

  // 生成瓶子类型选择界面
  const typeButtons = BOTTLE_TYPES.map(tp => `
    <button class="bottle-type-btn" data-type="${tp.id}" onclick="selectBottleType('${tp.id}')"
      style="background:${tp.color};border:2px solid transparent;border-radius:14px;padding:10px 8px;cursor:pointer;text-align:center;transition:all .2s;">
      <div style="font-size:24px;">${tp.icon}</div>
      <div style="font-size:11px;font-weight:700;margin-top:4px;">${tp.name}</div>
      <div style="font-size:9px;color:#6b7280;margin-top:2px;line-height:1.3;">${tp.desc}</div>
    </button>
  `).join('');

  const html = `
    <div style="text-align:center;margin-bottom:14px;">
      <div style="font-size:40px;">🍾</div>
      <h3 style="margin:6px 0 2px;">选择瓶子类型</h3>
      <p style="color:#9ca3af;font-size:12px;">选一个最能表达心情的瓶子 💌</p>
    </div>
    <div style="display:grid;grid-template-columns:repeat(4,1fr);gap:8px;margin-bottom:16px;" id="bottle-type-grid">
      ${typeButtons}
    </div>
    <div id="bottle-form-area" style="display:none;"></div>
    <div class="form-actions" id="bottle-type-actions">
      <button class="btn-secondary" onclick="closeGlobalModal()">取消</button>
    </div>
  `;
  showGlobalModal(html);
}

function selectBottleType(typeId) {
  // 高亮选中
  document.querySelectorAll('.bottle-type-btn').forEach(btn => {
    const isSelected = btn.dataset.type === typeId;
    btn.style.border = isSelected ? '2px solid #3b82f6' : '2px solid transparent';
    btn.style.transform = isSelected ? 'scale(1.05)' : 'scale(1)';
  });

  const typeConf = BOTTLE_TYPES.find(t => t.id === typeId);
  if (!typeConf) return;

  let formHtml = '';

  if (typeId === 'privilege') {
    // 特权券：选择一种特权
    const privButtons = typeConf.privileges.map(p => `
      <button class="priv-btn" data-priv="${p.name}" onclick="selectPrivilege(this,'${p.name}','${p.desc}')"
        style="background:#fef9c3;border:1.5px solid #fbbf24;border-radius:10px;padding:8px;cursor:pointer;text-align:center;width:100%;">
        <span style="font-size:18px;">${p.icon}</span>
        <div style="font-size:11px;font-weight:700;">${p.name}</div>
        <div style="font-size:9px;color:#6b7280;">${p.desc}</div>
      </button>
    `).join('');
    formHtml = `
      <div style="margin-bottom:10px;">
        <label style="font-size:12px;color:#6b7280;">选择特权类型：</label>
        <div style="display:grid;grid-template-columns:repeat(4,1fr);gap:6px;margin-top:6px;">${privButtons}</div>
      </div>
      <div class="form-group" style="display:none;" id="priv-custom-wrap">
        <label>补充说明（可选）：</label>
        <input id="priv-msg" type="text" placeholder="例如：下次见面时兑换" maxlength="60">
      </div>
      <input type="hidden" id="selected-priv" value="">
    `;
  } else if (typeId === 'capsule') {
    // 时空胶囊：选择解锁时间
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const minDate = tomorrow.toISOString().slice(0, 16);
    formHtml = `
      <div class="form-group">
        <label>解锁时间：</label>
        <input id="capsule-unlock" type="datetime-local" min="${minDate}" style="width:100%;padding:8px;border:1.5px solid #e5e7eb;border-radius:8px;">
        <div style="font-size:11px;color:#9ca3af;margin-top:4px;">到这个时间才能打开 ⏰</div>
      </div>
      <div class="form-group">
        <label>想在那个时刻说的话：</label>
        <textarea id="bottle-msg" rows="3" placeholder="写下想在未来某刻送出的话..." maxlength="300"></textarea>
      </div>
    `;
  } else {
    // 普通文字瓶
    const templates = typeConf.templates || [];
    const templateHtml = templates.length ? `
      <div style="margin-bottom:8px;">
        <label style="font-size:11px;color:#9ca3af;">快捷模板：</label>
        <div style="display:flex;flex-wrap:wrap;gap:4px;margin-top:4px;">
          ${templates.map(t => `<button onclick="useTemplate(this)" data-tpl="${escapeHtmlAttr(t)}"
            style="font-size:10px;background:#f3f4f6;border:none;border-radius:12px;padding:3px 8px;cursor:pointer;">${t}</button>`).join('')}
        </div>
      </div>
    ` : '';
    formHtml = `
      ${templateHtml}
      <div class="form-group">
        <label>标题（可选）：</label>
        <input id="bottle-title" type="text" placeholder="给这封信起个名字..." maxlength="30">
      </div>
      <div class="form-group">
        <label>信的内容：</label>
        <textarea id="bottle-msg" rows="4" placeholder="写下你最想说的话..." maxlength="300"></textarea>
        <div style="text-align:right;font-size:11px;color:#9ca3af;margin-top:2px;">最多300字</div>
      </div>
    `;
  }

  const formArea = document.getElementById('bottle-form-area');
  const actArea  = document.getElementById('bottle-type-actions');
  if (formArea) {
    formArea.style.display = 'block';
    formArea.innerHTML = formHtml;
  }
  if (actArea) {
    actArea.innerHTML = `
      <button class="btn-secondary" onclick="closeGlobalModal()">取消</button>
      <button class="btn-primary" onclick="doThrowBottleV2('${typeId}')">
        ${typeConf.icon} 投入大海
      </button>
    `;
  }
}

function selectPrivilege(btn, name, desc) {
  document.querySelectorAll('.priv-btn').forEach(b => b.style.border = '1.5px solid #fbbf24');
  btn.style.border = '2px solid #3b82f6';
  document.getElementById('selected-priv').value = name;
  document.getElementById('priv-custom-wrap').style.display = '';
}

function useTemplate(btn) {
  const msgEl = document.getElementById('bottle-msg');
  if (msgEl) msgEl.value = btn.dataset.tpl;
}

async function doThrowBottleV2(typeId) {
  const typeConf   = BOTTLE_TYPES.find(t => t.id === typeId);
  const loggedUser = localStorage.getItem('lb_user') || 'shushu';
  const avatar     = loggedUser === 'shushu' ? '🐹' : '🐱';

  let msg = '', title = '', extra = {};

  if (typeId === 'privilege') {
    const priv = document.getElementById('selected-priv').value;
    if (!priv) { showToast('请选择一种特权类型 🎫'); return; }
    const extraMsg = (document.getElementById('priv-msg').value || '').trim();
    msg   = `🎫 ${priv}${extraMsg ? ' — ' + extraMsg : ''}`;
    title = priv;
  } else if (typeId === 'capsule') {
    const unlockInput = document.getElementById('capsule-unlock');
    msg = (document.getElementById('bottle-msg').value || '').trim();
    if (!msg)          { showToast('写点什么再投吧 ⏰'); return; }
    if (!unlockInput.value) { showToast('请设置解锁时间 ⏰'); return; }
    extra.unlockAt = new Date(unlockInput.value).getTime();
    title = '时空胶囊';
  } else {
    msg   = (document.getElementById('bottle-msg').value  || '').trim();
    title = (document.getElementById('bottle-title') ? document.getElementById('bottle-title').value || '' : '').trim();
    if (!msg) { showToast('写点什么再投吧 🍾'); return; }
  }

  const bottle = {
    id:        'drift_' + Date.now(),
    type: typeId,
    from_user: loggedUser,
    avatar,
    msg,
    title,
    thrownAt:  new Date().toISOString(),
    caught:    false,
    caughtAt:  null,
    ...extra
  };

  // 存本地
  const localList = getLocalBottles();
  localList.push(bottle);
  saveLocalBottles(localList);

  // 同步到Firebase
  if (isBackendReady()) {
    // Save to Supabase
    const saved = await sbInsert('bottles', {
      type: typeId,
      from_user: loggedUser,
      msg,
      title,
      thrownAt:  bottle.thrownAt,
      caught:    false,
      unlockAt:  extra.unlockAt || null,
    });
  }

  // 加入canvas动画
  const canvas = document.getElementById('drift-ocean');
  const W = canvas ? canvas.offsetWidth  || 360 : 360;
  const H = canvas ? canvas.offsetHeight || 200 : 200;
  driftBottlesCanvas.push(makeCanvasBottle(bottle.id, typeId, loggedUser, msg, W, H, false, false));

  // 积分奖励
  const pts = typeId === 'travel' ? 5 : (typeId === 'capsule' ? 8 : 5);
  addLocalPoints(pts);
  checkAndUnlockAchievements();

  closeGlobalModal();
  updateDriftStats();
  renderDriftMyList();
  switchDriftTabV2('my');
  showBottleThrowAnimV2(typeConf.icon);
  showToast(`${typeConf.icon} 已投入大海！+${pts}积分`);
}

/* ================================================================
   捞取瓶子
   ================================================================ */

function catchRandomBottleV2() {
  // 优先捞对方的瓶子（isRemote=true），再捞系统的
  let pool = driftBottlesCanvas.filter(b => b.isRemote && !b.isSystem);
  if (pool.length === 0) pool = driftBottlesCanvas.filter(b => b.isSystem);
  if (pool.length === 0) pool = driftBottlesCanvas;
  if (pool.length === 0) {
    showToast('海面上还没有瓶子，先投一封吧 🌊');
    return;
  }
  const b = pool[Math.floor(Math.random() * pool.length)];
  doCatchBottle(b);
}

async function doCatchBottle(bottle) {
  // 检查胶囊是否到期
  if (bottle.type === 'capsule' && bottle.unlockAt && Date.now() < bottle.unlockAt) {
    const unlockDate = new Date(bottle.unlockAt).toLocaleDateString('zh-CN', { year:'numeric', month:'long', day:'numeric', hour:'2-digit', minute:'2-digit' });
    showToast(`⏰ 这是时空胶囊，${unlockDate}才能打开`);
    return;
  }

  // 从canvas移除
  const idx = driftBottlesCanvas.findIndex(b => b.id === bottle.id);
  if (idx !== -1) driftBottlesCanvas.splice(idx, 1);

  const now = new Date().toISOString();

  if (!bottle.isSystem) {
    // 标记本地瓶子为已捞
    const myList = getLocalBottles();
    const found  = myList.find(b => b.id === bottle.id);
    if (found) {
      found.caught   = true;
      found.caughtAt = now;
      saveLocalBottles(myList);
    }

    // 同步Firebase：标记已捞
    if (isBackendReady()) {
      await sbUpdate('bottles', bottle.id, { caught: true });
      await sbUpdate('bottles', bottle.id, { caught_at: now, caught_by: CURRENT_USER() });
    }

    // 加入捞到记录
    const caughtList = getLocalCaught();
    caughtList.unshift({ ...bottle, caughtAt: now });
    saveLocalCaught(caughtList);

    // 积分
    addLocalPoints(3);
  }

  checkAndUnlockAchievements();
  updateDriftStats();
  renderDriftMyList();
  renderDriftCaughtList();
  renderPoints();

  showBottleCatchModalV2(bottle);
}

/* ================================================================
   捞瓶弹窗（带爱心粒子）
   ================================================================ */

function showBottleCatchModalV2(bottle) {
  const typeConf = BOTTLE_TYPES.find(t => t.id === bottle.type) || BOTTLE_TYPES[0];
  const fromName = bottle.from === 'shushu' ? '🐹 鼠鼠' : '🐱 笔笔';
  const titleHtml = bottle.title ? `<div style="font-size:14px;color:#6b7280;margin-bottom:8px;">"${escapeHtml(bottle.title)}"</div>` : '';
  const sourceTag = bottle.isSystem
    ? '' : bottle.isRemote
    ? '<span style="font-size:10px;background:#dbeafe;color:#3b82f6;padding:2px 8px;border-radius:10px;margin-left:6px;">💌 TA写的</span>'
    : '<span style="font-size:10px;background:#e0f2fe;color:#0ea5e9;padding:2px 8px;border-radius:10px;margin-left:6px;">📖 自己的</span>';

  const html = `
    <div class="bottle-catch-reveal" style="text-align:center;position:relative;">
      <div id="bottle-catch-hearts" style="position:absolute;top:0;left:0;width:100%;height:80px;overflow:hidden;pointer-events:none;"></div>
      <div style="font-size:52px;margin-bottom:8px;animation:bottlePop 0.7s cubic-bezier(0.175,0.885,0.32,1.275);">${typeConf.icon}</div>
      <h3 style="margin:0 0 4px;">捞到了！${sourceTag}</h3>
      <div style="font-size:12px;color:#9ca3af;margin-bottom:14px;">${typeConf.name}</div>
      ${titleHtml}
      <div style="background:${typeConf.color};border:1.5px solid ${typeConf.border}33;border-radius:16px;padding:16px 18px;font-size:15px;line-height:1.8;color:#374151;min-height:60px;">
        "${escapeHtml(bottle.msg)}"
      </div>
      ${!bottle.isSystem ? `<div style="margin-top:10px;font-size:12px;color:#6b7280;">—— 来自 ${fromName}</div>` : ''}
      <button class="btn-primary" style="margin-top:16px;width:100%;" onclick="closeGlobalModal()">💗 好开心！收到了</button>
    </div>
  `;
  showGlobalModal(html);

  // 爱心粒子
  setTimeout(() => {
    const container = document.getElementById('bottle-catch-hearts');
    if (!container) return;
    const emojis = [typeConf.icon, '💝', '💖', '✨', '🌸', '💫', '🎉'];
    for (let i = 0; i < 20; i++) {
      const el = document.createElement('span');
      el.className = 'bottle-heart-particle';
      el.textContent = emojis[Math.floor(Math.random() * emojis.length)];
      el.style.cssText = `left:${5+Math.random()*90}%;animation-delay:${Math.random()*1.2}s;font-size:${12+Math.random()*14}px;`;
      container.appendChild(el);
    }
  }, 100);
}

/* ================================================================
   投瓶飞出动画
   ================================================================ */

function showBottleThrowAnimV2(icon) {
  const el = document.createElement('div');
  el.style.cssText = `position:fixed;top:50%;left:50%;transform:translate(-50%,-50%);font-size:56px;
    pointer-events:none;z-index:9999;animation:bottleThrow 1.3s ease-out forwards;`;
  el.textContent = icon;
  document.body.appendChild(el);
  setTimeout(() => el.remove(), 1400);
}

/* ================================================================
   统计 & UI更新
   ================================================================ */

function updateDriftStats() {
  const myList  = getLocalBottles();
  const caught  = getLocalCaught();
  const drifting = myList.filter(b => !b.caught).length + driftBottlesCanvas.filter(b => b.isSystem).length;
  const el1 = document.getElementById('drifting-count');
  const el2 = document.getElementById('thrown-count');
  const el3 = document.getElementById('caught-count');
  if (el1) el1.textContent = drifting;
  if (el2) el2.textContent = myList.length;
  if (el3) el3.textContent = caught.length;
}

function switchDriftTabV2(tab) {
  _driftCurrentTab = tab;
  const tabs = ['my', 'caught', 'capsules', 'achievements'];
  tabs.forEach(t => {
    const btn = document.getElementById('tab-drift-' + t);
    const pnl = document.getElementById('drift-panel-' + t);
    if (btn) btn.classList.toggle('active', t === tab);
    if (pnl) pnl.style.display = t === tab ? '' : 'none';
  });
}

// 兼容旧接口
function switchDriftTab(tab) { switchDriftTabV2(tab); }

function renderDriftMyList() {
  const container = document.getElementById('drift-my-list');
  if (!container) return;
  const list = getLocalBottles();
  if (list.length === 0) {
    container.innerHTML = `<div class="drift-empty">还没有投过瓶子，点击右下角 <b>+</b> 写第一封信吧 💌</div>`;
    return;
  }
  container.innerHTML = list.slice().reverse().map(b => {
    const tc = BOTTLE_TYPES.find(t => t.id === b.type) || BOTTLE_TYPES[0];
    const statusIcon = b.caught ? '🎣' : (b.type === 'capsule' && b.unlockAt && Date.now() < b.unlockAt ? '🔒' : '🌊');
    const statusText = b.caught ? '已被捞' : (b.type === 'capsule' && b.unlockAt && Date.now() < b.unlockAt ? '等待解锁' : '漂流中');
    return `
    <div class="drift-list-item ${b.caught ? 'caught' : 'drifting'}" style="border-left:3px solid ${tc.border};">
      <div class="dli-left">
        <span class="dli-avatar" style="background:${tc.color};">${tc.icon}</span>
        <span class="dli-status">${statusIcon} ${statusText}</span>
      </div>
      <div class="dli-body">
        ${b.title ? `<div class="dli-title">${escapeHtml(b.title)}</div>` : `<div class="dli-title">${tc.name}</div>`}
        <div class="dli-msg">${escapeHtml(b.msg)}</div>
        <div class="dli-time">${b.caught ? '捞取 ' + formatDateTime(b.caughtAt) : '投入 ' + formatDateTime(b.thrownAt)}</div>
      </div>
      ${!b.caught ? `<button class="dli-delete" onclick="deleteDriftBottleV2('${b.id}')">🗑️</button>` : ''}
    </div>`;
  }).join('');
}

function renderDriftCaughtList() {
  const container = document.getElementById('drift-caught-list');
  if (!container) return;
  const list = getLocalCaught();
  if (list.length === 0) {
    container.innerHTML = `<div class="drift-empty">还没有捞到瓶子，去随机捞取一个吧 🎣</div>`;
    return;
  }
  container.innerHTML = list.map(b => {
    const tc = BOTTLE_TYPES.find(t => t.id === b.type) || BOTTLE_TYPES[0];
    return `
    <div class="drift-list-item caught" style="border-left:3px solid ${tc.border};">
      <div class="dli-left">
        <span class="dli-avatar" style="background:${tc.color};">${tc.icon}</span>
        <span class="dli-status">🎣 已捞到</span>
      </div>
      <div class="dli-body">
        ${b.title ? `<div class="dli-title">${escapeHtml(b.title)}</div>` : `<div class="dli-title">${tc.name}</div>`}
        <div class="dli-msg">${escapeHtml(b.msg)}</div>
        <div class="dli-time">捞取于 ${formatDateTime(b.caughtAt)}</div>
      </div>
    </div>`;
  }).join('');
}

// 渲染定时胶囊面板
function renderCapsulesPanel() {
  const container = document.getElementById('drift-panel-capsules');
  if (!container) return;
  const capsules = getLocalBottles().filter(b => b.type === 'capsule');
  if (capsules.length === 0) {
    container.innerHTML = `<div class="drift-empty">还没有时空胶囊，投一个定时惊喜吧 ⏰</div>`;
    return;
  }
  container.innerHTML = capsules.slice().reverse().map(b => {
    const now = Date.now();
    const unlocked = !b.unlockAt || now >= b.unlockAt;
    const unlockDate = b.unlockAt ? new Date(b.unlockAt).toLocaleDateString('zh-CN', { year:'numeric',month:'long',day:'numeric',hour:'2-digit',minute:'2-digit' }) : '';
    return `
    <div class="drift-list-item" style="border-left:3px solid #1d4ed8;background:${unlocked?'#ede9fe11':'#ede9fe33'};">
      <div class="dli-left">
        <span class="dli-avatar" style="background:#ede9fe;">${unlocked?'⏰':'🔒'}</span>
        <span class="dli-status">${unlocked?'🟢 可打开':'🔒 待解锁'}</span>
      </div>
      <div class="dli-body">
        <div class="dli-title">${unlocked ? '时空胶囊 · 已解锁' : `解锁时间：${unlockDate}`}</div>
        <div class="dli-msg">${unlocked ? escapeHtml(b.msg) : '🔒 胶囊封存中...'}</div>
        <div class="dli-time">投入于 ${formatDateTime(b.thrownAt)}</div>
      </div>
    </div>`;
  }).join('');
}

/* ================================================================
   天气Banner更新
   ================================================================ */

function updateWeatherBanner(weather) {
  const banner = document.getElementById('drift-weather-banner');
  if (!banner) return;
  const theme = getCurrentTheme(weather);
  _currentTheme = theme;

  const cityText = weather && weather.city ? ` · ${weather.city}` : '';
  const tempText = weather && weather.temp !== null ? ` ${weather.temp}°C` : '';
  banner.innerHTML = `
    <span style="font-size:18px;">${theme.bottleIcon || '🌊'}</span>
    <span style="margin-left:6px;">${theme.headerText}${cityText}${tempText}</span>
  `;
  banner.style.background = theme.isNight
    ? 'linear-gradient(135deg,#1e1b4b,#312e81)'
    : `linear-gradient(135deg,${theme.skyColor1}cc,${theme.skyColor2 || theme.skyColor1}cc)`;
  banner.style.color = theme.isNight ? '#e0e7ff' : '#fff';
}

/* ================================================================
   成就系统
   ================================================================ */

const ACHIEVEMENTS = [
  { id: 'first_bottle',  icon: '🍾', name: '初次漂流', desc: '投出第一只漂流瓶',    check: () => getLocalBottles().length >= 1 },
  { id: 'first_catch',   icon: '🎣', name: '幸运捞瓶', desc: '第一次捞到漂流瓶',    check: () => getLocalCaught().length >= 1 },
  { id: 'ten_bottles',   icon: '🏆', name: '漂流达人', desc: '累计投出10只瓶子',     check: () => getLocalBottles().length >= 10 },
  { id: 'confession',    icon: '💘', name: '告白专家', desc: '投出3只心动告白瓶',   check: () => getLocalBottles().filter(b=>b.type==='confession').length >= 3 },
  { id: 'capsule_maker', icon: '⏰', name: '时光守护', desc: '创建一个时空胶囊',     check: () => getLocalBottles().some(b=>b.type==='capsule') },
  { id: 'traveler',      icon: '✈️', name: '旅行梦想家', desc: '投出3只全域流浪瓶', check: () => getLocalBottles().filter(b=>b.type==='travel').length >= 3 },
  { id: 'privilege_giver',icon:'🎫', name: '贴心礼物家', desc: '送出5张特权券',     check: () => getLocalBottles().filter(b=>b.type==='privilege').length >= 5 },
  { id: 'collector',     icon: '📚', name: '集邮大师', desc: '8种瓶子各投一次',     check: () => new Set(getLocalBottles().map(b=>b.type)).size >= 8 },
];

function checkAndUnlockAchievements() {
  const achieved = getLocalAchievements();
  let newUnlock = false;
  ACHIEVEMENTS.forEach(ach => {
    if (!achieved[ach.id] && ach.check()) {
      achieved[ach.id] = { unlockedAt: new Date().toISOString() };
      newUnlock = true;
      // 延迟显示成就弹窗
      setTimeout(() => showAchievementToast(ach), 1500);
    }
  });
  if (newUnlock) saveLocalAchievements(achieved);
}

function showAchievementToast(ach) {
  const el = document.createElement('div');
  el.style.cssText = `position:fixed;top:80px;left:50%;transform:translateX(-50%);
    background:linear-gradient(135deg,#fef3c7,#fde68a);border:1.5px solid #f59e0b;
    border-radius:16px;padding:12px 20px;z-index:9998;display:flex;align-items:center;gap:10px;
    box-shadow:0 4px 20px rgba(0,0,0,0.15);animation:driftFadeIn 0.4s ease;font-family:sans-serif;`;
  el.innerHTML = `<span style="font-size:24px;">${ach.icon}</span>
    <div><div style="font-size:11px;color:#92400e;font-weight:700;">🏅 成就解锁！</div>
    <div style="font-size:13px;color:#78350f;">${ach.name}</div>
    <div style="font-size:10px;color:#a16207;">${ach.desc}</div></div>`;
  document.body.appendChild(el);
  setTimeout(() => { el.style.transition = 'opacity 0.5s'; el.style.opacity = '0'; }, 3000);
  setTimeout(() => el.remove(), 3600);
}

function renderAchievements() {
  const container = document.getElementById('drift-panel-achievements');
  if (!container) return;
  const achieved = getLocalAchievements();
  container.innerHTML = ACHIEVEMENTS.map(ach => {
    const unlocked = !!achieved[ach.id];
    const date = unlocked ? new Date(achieved[ach.id].unlockedAt).toLocaleDateString('zh-CN') : '';
    return `
    <div class="drift-ach-item ${unlocked ? 'unlocked' : 'locked'}">
      <span class="ach-icon" style="font-size:24px;opacity:${unlocked?1:0.3};">${ach.icon}</span>
      <div class="ach-body">
        <div class="ach-name" style="color:${unlocked?'#374151':'#9ca3af'};">${ach.name}</div>
        <div class="ach-desc">${ach.desc}</div>
        ${unlocked ? `<div class="ach-date">解锁于 ${date}</div>` : ''}
      </div>
      ${unlocked ? '<span style="color:#f59e0b;font-size:16px;">★</span>' : '<span style="color:#d1d5db;font-size:16px;">☆</span>'}
    </div>`;
  }).join('');
}

function renderPoints() {
  const el = document.getElementById('drift-points');
  if (el) el.textContent = getLocalPoints();
}

/* ================================================================
   删除瓶子
   ================================================================ */

async function deleteDriftBottleV2(id) {
  const list = getLocalBottles().filter(b => b.id !== id);
  saveLocalBottles(list);
  const idx = driftBottlesCanvas.findIndex(b => b.id === id);
  if (idx !== -1) driftBottlesCanvas.splice(idx, 1);
  if (isBackendReady()) { await sbDelete('bottles', id).catch(()=>{}); }
  updateDriftStats();
  renderDriftMyList();
  showToast('瓶子已回收 🌊');
}

// 兼容旧接口
function deleteDriftBottle(id) { deleteDriftBottleV2(id); }

/* ================================================================
   旧接口兼容（已由 index.html 的 window.throwBottle 覆盖）
   注意：这里不能重新定义 throwBottle，否则会导致无限递归！
   ================================================================ */

// 这些旧接口由 index.html 和底部的 window.* 导出处理
// 此处不再重复定义，避免递归崩溃

/* ================================================================
   工具函数
   ================================================================ */

function adjustColor(hex, amount) {
  // 简单调亮/调暗一个颜色
  try {
    const num = parseInt(hex.replace('#',''), 16);
    const r = Math.max(0, Math.min(255, (num >> 16) + amount));
    const g = Math.max(0, Math.min(255, ((num >> 8) & 0xff) + amount));
    const b = Math.max(0, Math.min(255, (num & 0xff) + amount));
    return `#${((r<<16)|(g<<8)|b).toString(16).padStart(6,'0')}`;
  } catch { return hex; }
}

function escapeHtmlAttr(str) {
  return String(str).replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}

// 调用父页面的 escapeHtml（在 app-main-v9.js 里定义）
// 如果不存在则提供后备
if (typeof escapeHtml === 'undefined') {
  window.escapeHtml = function(str) {
    const d = document.createElement('div');
    d.textContent = str;
    return d.innerHTML;
  };
}

/* ================================================================
   全局覆盖 - 让路由系统 (switchPage) 能正确调用新版
   ================================================================ */

// 覆盖 app-main-v9.js 里的旧版函数
window.renderDriftBottle = renderDriftBottle;
window.throwBottle       = throwBottle;
window.catchRandomBottle = catchRandomBottleV2;
window.deleteDriftBottle = deleteDriftBottleV2;
window.switchDriftTab    = switchDriftTabV2;
window.updateDriftStats  = updateDriftStats;
window.renderDriftMyList = function() {
  renderDriftMyList();
  window._driftV2RenderMyList    = renderDriftMyList;
  window._driftV2RenderCaughtList = renderDriftCaughtList;
};

// 让成就渲染函数全局可用（index.html onclick里直接调用）
window.renderAchievements  = renderAchievements;
window.renderCapsulesPanel = renderCapsulesPanel;
window.switchDriftTabV2    = switchDriftTabV2;
window.catchRandomBottleV2 = catchRandomBottleV2;
window.selectBottleType    = selectBottleType;
window.selectPrivilege     = selectPrivilege;
window.useTemplate         = useTemplate;
window.doThrowBottleV2     = doThrowBottleV2;
window.deleteDriftBottleV2 = deleteDriftBottleV2;

// 路由进入漂流瓶时自动初始化
document.addEventListener('DOMContentLoaded', function() {
  if (typeof initSupabase === 'function') {
    initSupabase();
  }
  // 暴露给渲染列表
  window._driftV2RenderMyList     = renderDriftMyList;
  window._driftV2RenderCaughtList = renderDriftCaughtList;
  window._driftV2Render           = renderDriftBottle;
});

console.log('[Drift] ✅ drift-v2.js 加载完成，所有函数已导出');
