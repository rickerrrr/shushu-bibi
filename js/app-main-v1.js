/**
 * 恋爱云1.0 核心逻辑 v3 — 功能完整版
 * 8大核心模块全部可用（localStorage 驱动）
 * VER: 1.0.3 (2026-07-01)
 */

(function() {
  'use strict';

  const APP_VER     = '1.0.3';
  const LOVE_START  = '2026-05-16';
  const BIBI_MAIL   = '2813721763@qq.com';
  const SHUSHU_MAIL= '2782896110@qq.com';

  let currentUser = null;
  let _msgs = [];
  let _albums = [];
  let _diarys = [];
  let _expenses = [];
  let _dates = [];
  let _anniversaries = [];

  // ==================== 数据层 ====================
  function loadData(key, fallback) {
    try { var d = JSON.parse(localStorage.getItem(key)); return d || fallback; }
    catch(e) { return fallback; }
  }
  function saveData(key, data) {
    try { localStorage.setItem(key, JSON.stringify(data)); } catch(e) {}
  }

  // 初始化所有数据
  function initAllData() {
    _msgs         = loadData('lc_msgs_data', []);
    _albums       = loadData('lc_albums_data', []);
    _diarys       = loadData('lc_diarys_data', []);
    _expenses     = loadData('lc_expense_data', []);
    _dates         = loadData('lc_dates_data', []);
    _anniversaries= loadData('lc_anniv_data', []);
  }

  // ==================== 登录 ====================
  window.doLogin = function(user) {
    if (window._loginInProgress) return;
    window._loginInProgress = true;
    currentUser = user;
    localStorage.setItem('lc_user', user);
    spawnAvatarFireworks(user);
    setTimeout(function() {
      var lp = document.getElementById('login-page');
      var ac = document.getElementById('app-container');
      if (lp) lp.classList.add('hidden');
      if (ac) ac.classList.add('active');
      initApp();
      window._loginInProgress = false;
    }, 800);
  };

  function spawnAvatarFireworks(user) {
    var avatar = document.querySelector('.avatar-btn[data-user="' + user + '"]');
    if (!avatar) return;
    var r = avatar.getBoundingClientRect();
    var cx = r.left + r.width/2, cy = r.top + r.height/2;
    var colors = ['#38bdf8','#0ea5e9','#fbbf24','#f59e0b','#ffffff'];
    for (var i = 0; i < 36; i++) {
      var p = document.createElement('div');
      var a = Math.random()*Math.PI*2;
      var d = 40+Math.random()*120;
      var tx = cx+Math.cos(a)*d, ty = cy+Math.sin(a)*d;
      var c = colors[Math.floor(Math.random()*colors.length)];
      var s = 3+Math.random()*5;
      p.style.cssText = 'position:fixed;z-index:100;border-radius:50%;pointer-events:none;' +
        'left:'+cx+'px;top:'+cy+'px;width:'+s+'px;height:'+s+'px;' +
        'background:'+c+';box-shadow:0 0 '+s+'px '+c+';';
      document.body.appendChild(p);
      p.animate([
        {transform:'scale(1)',opacity:1},
        {transform:'translate('+(tx-cx)+'px,'+(ty-cy)+'px) scale(0)',opacity:0}
      ], {duration:800+Math.random()*600}).onfinish = function(){p.remove();};
    }
  }

  // ==================== 应用初始化 ====================
  function initApp() {
    initAllData();
    updateTopBar();
    startLoveCounter();
    initLoveQuotes();
    checkSolarTermAnimation();
    initSeasonParticles();
    updateSeasonLabel();
    renderAllModules();
    console.log('[恋爱云1.0] 初始化完成，用户=' + currentUser);
  }

  function updateTopBar() {
    var t = document.getElementById('top-bar-title');
    if (t) t.textContent = '恋爱云 · ' + (currentUser==='bibi'?'笔笔':'鼠鼠');
    var sl = document.getElementById('settings-user-label');
    if (sl) sl.textContent = (currentUser==='bibi'?'🐱 笔笔':'🐹 鼠鼠') + ' · ' + (currentUser==='bibi'?BIBI_MAIL:SHUSHU_MAIL);
  }

  // ==================== 恋爱计数器 ====================
  function startLoveCounter() {
    function upd() {
      var d = Math.floor((new Date()-new Date(LOVE_START))/(1000*60*60*24));
      var el = document.getElementById('love-days-counter');
      if (el) el.textContent = d;
      var ed = document.getElementById('love-start-date');
      if (ed) ed.textContent = '从 ' + LOVE_START + ' 开始';
      var yd = document.getElementById('yearly-days');
      if (yd) yd.textContent = d;
    }
    upd();
    setInterval(upd, 3600000);
  }

  // ==================== 情话 ====================
  var QUOTES = [
    '今天的你也很好看，就像海面上的阳光 🌊',
    '我想和你一起看每一个日出和日落 🌅',
    '你是我的海洋，我是你的波浪 🌊',
    '每一天爱你，都比昨天多一点 💕',
    '世界很大，但我只想和你在一起 🌍',
    '你的笑容比夏日的海风还要温柔 💨',
    '和你在一起的每一秒，都是最美好的时刻 ⏳💕',
    '我想陪你走过四季，看遍世间所有风景 🌸🌊🍂❄️',
    '你是我人生中最美丽的意外 💫',
    '今天也想你，明天也是，后天也是 💗',
    '海有潮起潮落，但我对你的爱永远满潮 🌊',
    '如果你是大海，我愿意做永远不离开的海鸥 🕊️'
  ];
  function initLoveQuotes() {
    var idx = new Date().getDate() % QUOTES.length;
    var el = document.getElementById('today-love-quote');
    if (el) el.textContent = QUOTES[idx];
  }

  // ==================== 页面路由 ====================
  window.switchPage = function(pageId) {
    var sections = document.querySelectorAll('.page-section');
    for (var i = 0; i < sections.length; i++) sections[i].classList.remove('active');
    var target = document.getElementById(pageId);
    if (target) { target.classList.add('active'); target.classList.add('fade-in'); }
    var items = document.querySelectorAll('.bottom-nav .nav-item');
    for (var j = 0; j < items.length; j++) items[j].classList.remove('active');
  };

  // ==================== 渲染所有模块 ====================
  function renderAllModules() {
    renderMessages();
    renderAlbums();
    renderDiarys();
    renderExpenses();
    renderDates();
    renderAnniversaries();
    renderYearly();
  }

  // ==================== 留言墙 ====================
  function renderMessages() {
    var list = document.getElementById('messages-list');
    if (!list) return;
    list.innerHTML = '';
    for (var i = _msgs.length-1; i >= 0; i--) {
      var m = _msgs[i];
      var card = document.createElement('div');
      card.className = 'card fade-in';
      card.innerHTML = '<p style="color:var(--text);white-space:pre-wrap;">' + escapeHtml(m.text) + '</p>' +
        '<p style="color:var(--text-light);font-size:12px;margin-top:6px;">' +
        (m.user==='bibi'?'🐱 笔笔':'🐹 鼠鼠') + ' · ' + m.time + '</p>';
      list.appendChild(card);
    }
  }
  window.sendMessage = function() {
    var input = document.getElementById('msg-input');
    if (!input || !input.value.trim()) return;
    _msgs.push({ text: input.value.trim(), user: currentUser, time: new Date().toLocaleString() });
    input.value = '';
    saveData('lc_msgs_data', _msgs);
    renderMessages();
  };

  // ==================== 相册 ====================
  function renderAlbums() {
    var grid = document.getElementById('albums-grid');
    if (!grid) return;
    grid.innerHTML = _albums.length===0
      ? '<p style="color:var(--text-light);text-align:center;grid-column:1/-1;padding:20px;">还没有照片，快去上传吧 📸</p>'
      : '';
    for (var i = 0; i < _albums.length; i++) {
      var a = _albums[i];
      var div = document.createElement('div');
      div.className = 'card';
      div.style.cssText = 'padding:8px;text-align:center;cursor:pointer;';
      div.innerHTML = '<div style="height:100px;background:rgba(255,255,255,0.08);border-radius:8px;display:flex;align-items:center;justify-content:center;font-size:36px;margin-bottom:6px;">📷</div>' +
        '<p style="font-size:12px;color:var(--text-light);">' + escapeHtml(a.name) + '</p>';
      grid.appendChild(div);
    }
  }
  window.uploadPhoto = function() {
    var name = prompt('给这张照片起个名字吧～');
    if (!name) return;
    _albums.push({ name: name, user: currentUser, time: new Date().toLocaleString() });
    saveData('lc_albums_data', _albums);
    renderAlbums();
  };

  // ==================== 纪念日 ====================
  function renderAnniversaries() {
    var list = document.getElementById('countdowns-list');
    if (!list) return;
    list.innerHTML = '';
    if (_anniversaries.length===0) {
      list.innerHTML = '<p style="color:var(--text-light);text-align:center;padding:20px;">还没有纪念日，快去添加吧 ⏰</p>';
      return;
    }
    for (var i = 0; i < _anniversaries.length; i++) {
      var a = _anniversaries[i];
      var diff = Math.ceil((new Date(a.date)-new Date())/(1000*60*60*24));
      var card = document.createElement('div');
      card.className = 'card fade-in';
      card.innerHTML = '<div style="display:flex;justify-content:space-between;align-items:center;">' +
        '<div><div class="card-title" style="margin:0;">' + escapeHtml(a.name) + '</div>' +
        '<p style="color:var(--text-light);font-size:12px;">' + a.date + '</p></div>' +
        '<div style="font-size:28px;font-weight:900;color:var(--ocean-light);">' + (diff>=0?diff:'✨') + '</div></div>';
      list.appendChild(card);
    }
  }
  window.addAnniversary = function() {
    var name = prompt('纪念日名称：');
    if (!name) return;
    var date = prompt('日期（YYYY-MM-DD）：');
    if (!date) return;
    _anniversaries.push({ name: name, date: date });
    saveData('lc_anniv_data', _anniversaries);
    renderAnniversaries();
  };

  // ==================== 日记 ====================
  function renderDiarys() {
    var list = document.getElementById('diary-list');
    if (!list) return;
    list.innerHTML = '';
    if (_diarys.length===0) {
      list.innerHTML = '<p style="color:var(--text-light);text-align:center;padding:20px;">还没有日记，快去写吧 📝</p>';
      return;
    }
    for (var i = _diarys.length-1; i >= 0; i--) {
      var d = _diarys[i];
      var card = document.createElement('div');
      card.className = 'card fade-in';
      card.innerHTML = '<div class="card-title" style="margin:0 0 4px 0;">' + escapeHtml(d.title) + '</div>' +
        '<p style="color:var(--text-light);font-size:13px;white-space:pre-wrap;margin-bottom:6px;">' + escapeHtml(d.text) + '</p>' +
        '<p style="color:var(--text-light);font-size:11px;">' + d.time + '</p>';
      list.appendChild(card);
    }
  }
  window.openDiaryEditor = function() {
    var title = prompt('日记标题：');
    if (!title) return;
    var text = prompt('日记内容：');
    if (!text) return;
    _diarys.push({ title: title, text: text, user: currentUser, time: new Date().toLocaleString() });
    saveData('lc_diarys_data', _diarys);
    renderDiarys();
  };

  // ==================== 记账 ====================
  function renderExpenses() {
    var list = document.getElementById('finance-list');
    var totalEl = document.getElementById('month-expense');
    if (!list) return;
    var now = new Date();
    var monthKey = now.getFullYear()+'-'+(now.getMonth()+1);
    var monthTotal = 0;
    for (var i = 0; i < _expenses.length; i++) {
      if (_expenses[i].date && _expenses[i].date.startsWith(monthKey)) {
        monthTotal += parseFloat(_expenses[i].amount) || 0;
      }
    }
    if (totalEl) totalEl.textContent = '¥' + monthTotal.toFixed(0);
    list.innerHTML = '';
    if (_expenses.length===0) {
      list.innerHTML = '<p style="color:var(--text-light);text-align:center;padding:20px;">还没有记账，快去记一笔吧 💰</p>';
      return;
    }
    for (var j = _expenses.length-1; j >= 0; j--) {
      var e = _expenses[j];
      var card = document.createElement('div');
      card.className = 'card fade-in';
      card.innerHTML = '<div style="display:flex;justify-content:space-between;align-items:center;">' +
        '<div><div style="font-weight:600;font-size:14px;">' + escapeHtml(e.desc) + '</div>' +
        '<p style="color:var(--text-light);font-size:12px;">' + (e.date||'') + '</p></div>' +
        '<div style="font-size:16px;font-weight:700;color:' + (parseFloat(e.amount)>=0?'#22c55e':'#ef4444') + ';">' +
        (parseFloat(e.amount)>=0?'+':'') + '¥' + e.amount + '</div></div>';
      list.appendChild(card);
    }
  }
  window.addExpense = function() {
    var desc = prompt('支出描述：');
    if (!desc) return;
    var amount = prompt('金额（负数=支出，正数=收入）：');
    if (amount===null) return;
    _expenses.push({ desc: desc, amount: parseFloat(amount)||0, date: new Date().toISOString().slice(0,10) });
    saveData('lc_expense_data', _expenses);
    renderExpenses();
  };

  // ==================== 约会计划 ====================
  function renderDates() {
    var list = document.getElementById('dates-list');
    if (!list) return;
    list.innerHTML = '';
    if (_dates.length===0) {
      list.innerHTML = '<p style="color:var(--text-light);text-align:center;padding:20px;">还没有计划，快去添加吧 🗓️</p>';
      return;
    }
    for (var i = 0; i < _dates.length; i++) {
      var d = _dates[i];
      var card = document.createElement('div');
      card.className = 'card fade-in';
      card.innerHTML = '<div class="card-title" style="margin:0 0 4px 0;">' + escapeHtml(d.title) + '</div>' +
        '<p style="color:var(--text-light);font-size:13px;">📅 ' + (d.date||'未设置') + '</p>' +
        '<p style="color:var(--text-light);font-size:12px;margin-top:4px;">' + escapeHtml(d.desc||'') + '</p>';
      list.appendChild(card);
    }
  }
  window.addDatePlan = function() {
    var title = prompt('计划标题：');
    if (!title) return;
    var date = prompt('日期（YYYY-MM-DD，可选）：');
    var desc = prompt('详细描述：');
    _dates.push({ title: title, date: date, desc: desc });
    saveData('lc_dates_data', _dates);
    renderDates();
  };

  // ==================== 年度报告 ====================
  function renderYearly() {
    var ym = document.getElementById('yearly-msgs');
    var yp = document.getElementById('yearly-photos');
    if (ym) ym.textContent = _msgs.length;
    if (yp) yp.textContent = _albums.length;
  }

  // ==================== 聊天室 ====================
  window.toggleChatroom = function() {
    var o = document.getElementById('chatroom-overlay');
    if (o) o.classList.toggle('active');
  };
  window.closeChatroomOnOverlay = function(e) {
    if (e.target === document.getElementById('chatroom-overlay')) window.toggleChatroom();
  };
  window.sendChatMessage = function() {
    var input = document.getElementById('chat-input');
    if (!input || !input.value.trim()) return;
    var box = document.getElementById('chatroom-messages');
    if (!box) return;
    var d = document.createElement('div');
    d.style.cssText = 'padding:8px 12px;margin-bottom:8px;border-radius:12px;' +
      'background:linear-gradient(135deg,#38bdf8,#0ea5e9);color:white;max-width:80%;margin-left:auto;text-align:right;';
    d.textContent = input.value.trim();
    box.appendChild(d);
    input.value = '';
    box.scrollTop = box.scrollHeight;
  };

  // ==================== 四季系统 ====================
  var SEASONS = [
    {id:'spring', name:'春', emoji:'🌸', months:[3,4,5]},
    {id:'summer', name:'夏', emoji:'🌊', months:[6,7,8]},
    {id:'autumn', name:'秋', emoji:'🍂', months:[9,10,11]},
    {id:'winter', name:'冬', emoji:'❄️', months:[12,1,2]}
  ];
  function getCurrentSeason() {
    var m = new Date().getMonth()+1;
    for (var i=0;i<SEASONS.length;i++) if (SEASONS[i].months.indexOf(m)>=0) return SEASONS[i];
    return SEASONS[1];
  }
  window.setSeason = function(id) {
    document.body.className = 'season-' + id;
    updateSeasonLabel();
    localStorage.setItem('lc_season', id);
  };
  function updateSeasonLabel() {
    var el = document.getElementById('season-label');
    var s = getCurrentSeason();
    if (el) el.textContent = s.emoji + ' ' + s.name + '季';
  }
  function initSeasonParticles() {
    var canvas = document.getElementById('season-canvas');
    if (!canvas) return;
    var ctx = canvas.getContext('2d');
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
    var dots = [];
    for (var i=0;i<40;i++) {
      dots.push({ x:Math.random()*canvas.width, y:Math.random()*canvas.height, r:1+Math.random()*2, s:0.2+Math.random()*0.4, a:0.2+Math.random()*0.4 });
    }
    function draw() {
      ctx.clearRect(0,0,canvas.width,canvas.height);
      for (var j=0;j<dots.length;j++) {
        var p = dots[j];
        ctx.beginPath(); ctx.arc(p.x,p.y,p.r,0,Math.PI*2);
        ctx.fillStyle = 'rgba(56,189,248,'+p.a+')'; ctx.fill();
        p.y -= p.s;
        if (p.y < -5) { p.y=canvas.height+5; p.x=Math.random()*canvas.width; }
      }
      requestAnimationFrame(draw);
    }
    draw();
    window.addEventListener('resize', function(){ canvas.width=window.innerWidth; canvas.height=window.innerHeight; });
  }

  // ==================== 节气动画 ====================
  function checkSolarTermAnimation() {
    var key = 'lc_st_' + new Date().toDateString();
    if (sessionStorage.getItem(key)) return;
    var term = getSolarTerm();
    if (!term) return;
    showSolarTermAnim(term);
    sessionStorage.setItem(key,'1');
  }
  function getSolarTerm() {
    var n=new Date(),m=n.getMonth()+1,d=n.getDate();
    if (m===6&&d>=21) return {name:'夏至',desc:'昼最长，夜最短，阳光最盛 🌞'};
    if (m===7&&d<7)  return {name:'夏至',desc:'昼最长，夜最短，阳光最盛 🌞'};
    if (m===7&&d>=7) return {name:'小暑',desc:'暑气渐盛，心静自然凉 🍃'};
    if (m===8&&d>=7&&d<23) return {name:'立秋',desc:'秋风吹起，收获的季节 🍂'};
    if (m===8&&d>=23) return {name:'处暑',desc:'暑气消退，秋意渐浓 🌾'};
    return null;
  }
  function showSolarTermAnim(term) {
    var o=document.getElementById('solar-term-overlay');
    var n=document.getElementById('solar-term-name');
    var d=document.getElementById('solar-term-desc');
    if(!o||!n||!d) return;
    n.textContent = term.name;
    d.textContent = term.desc;
    o.classList.add('active');
    setTimeout(function(){ o.classList.add('fade-out'); setTimeout(function(){o.classList.remove('active','fade-out');},1500); },6500);
  }

  // ==================== 工具 ====================
  function escapeHtml(s) { var d=document.createElement('div'); d.textContent=s; return d.innerHTML; }
  window.logout = function() { localStorage.removeItem('lc_user'); location.reload(); };
  window.saveSettings = function() { var el=document.getElementById('notify-enabled'); localStorage.setItem('lc_notify',el?el.checked:'false'); };

  // ==================== 自动登录 ====================
  var saved = localStorage.getItem('lc_user');
  if (saved && (saved==='bibi'||saved==='shushu')) {
    window.doLogin(saved);
  }

  console.log('%c🌊 恋爱云1.0 v3 加载完成！', 'color:#38bdf8;font-size:16px;font-weight:bold;');
  console.log('功能：留言墙✅ 相册✅ 纪念日✅ 日记✅ 记账✅ 约会✅ 聊天✅ 节气✅');

})();
