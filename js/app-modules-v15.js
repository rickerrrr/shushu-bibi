// ==================== v2.0 新模块 JS ====================
// 🎡 幸运转盘 · 🧩 照片拼图 · 📍 足迹地图
// 💞 爱情树 · 🎯 30天挑战 · 💌 情书设计 · 🎮 小游戏

// ============================================================
// 🎡 幸运转盘
// ============================================================
let wheelItems = ['火锅','川菜','日料','烤肉','家门口随便吃','外卖'];
let wheelAngle = 0, wheelSpinning = false, wheelHistory = [];

function initWheel() {
  renderWheelHistory();
  drawWheel();
}

function drawWheel() {
  const canvas = document.getElementById('wheel-canvas');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  const w = canvas.width, h = canvas.height, cx = w/2, cy = h/2, r = w/2 - 10;
  const n = wheelItems.length;
  const colors = ['#3b82f6','#60a5fa','#60a5fa','#a78bfa','#fb923c','#fbbf24','#34d399','#22d3ee'];
  ctx.clearRect(0,0,w,h);
  wheelItems.forEach((item, i) => {
    const start = (i/n)*Math.PI*2 + wheelAngle;
    const end = ((i+1)/n)*Math.PI*2 + wheelAngle;
    ctx.beginPath(); ctx.moveTo(cx,cy);
    ctx.arc(cx,cy,r,start,end);
    ctx.fillStyle = colors[i%colors.length]; ctx.fill();
    ctx.save(); ctx.translate(cx,cy); ctx.rotate(start+Math.PI/n);
    ctx.fillStyle = '#fff'; ctx.font = 'bold 14px sans-serif'; ctx.textAlign = 'center';
    ctx.fillText(item, r*0.6, 5); ctx.restore();
  });
  // 中心圆
  ctx.beginPath(); ctx.arc(cx,cy,20,0,Math.PI*2);
  ctx.fillStyle = '#1a1a2e'; ctx.fill();
  ctx.fillStyle = '#3b82f6'; ctx.font = 'bold 12px sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.fillText('LUCKY', cx, cy);
}

function setWheelPreset(type) {
  if (type==='food') wheelItems = ['火锅','川菜','日料','烤肉','家门口随便吃','外卖','西餐','小吃街'];
  else if (type==='place') wheelItems = ['电影院','公园','商场','咖啡馆','图书馆','电玩城','在家约会','逛夜市'];
  else if (type==='punish') wheelItems = ['洗碗','按摩10分钟','倒垃圾','做晚饭','打扫卫生','给对方买奶茶','说一句土味情话','主动道歉'];
  else if (type==='random') wheelItems = ['石头','剪刀','布','大冒险','真心话','再来一次','你决定','TA决定'];
  drawWheel();
}

function applyCustomWheel() {
  const input = document.getElementById('wheel-custom-input').value.trim();
  if (!input) return;
  wheelItems = input.split(/[,，、\s]+/).filter(Boolean);
  if (wheelItems.length < 2) { wheelItems = ['选项A','选项B']; alert('请至少输入2个选项！'); }
  drawWheel();
}

function spinWheel() {
  if (wheelSpinning || wheelItems.length < 2) return;
  wheelSpinning = true;
  document.getElementById('btn-spin-wheel').disabled = true;
  const canvas = document.getElementById('wheel-canvas');
  const n = wheelItems.length;
  const targetIdx = Math.floor(Math.random()*n);
  const targetAngle = Math.PI*2 - (targetIdx/n)*Math.PI*2 + Math.random()*(Math.PI*2/n)*0.6;
  const totalSpin = Math.PI*2*8 + targetAngle;
  let start = null, duration = 4000;
  function animate(ts) {
    if (!start) start = ts;
    let t = Math.min((ts-start)/duration, 1);
    t = 1 - Math.pow(1-t, 3); // easeOutCubic
    wheelAngle = totalSpin * t;
    drawWheel();
    if (t < 1) requestAnimationFrame(animate);
    else {
      wheelSpinning = false;
      document.getElementById('btn-spin-wheel').disabled = false;
      const result = wheelItems[targetIdx];
      const resultEl = document.getElementById('wheel-result');
      resultEl.classList.remove('hidden');
      resultEl.innerHTML = '🎉 结果是：<span style="font-size:28px">' + result + '</span> 🎉';
      wheelHistory.unshift({ result: result, time: new Date().toLocaleTimeString() });
      if (wheelHistory.length > 20) wheelHistory.pop();
      renderWheelHistory();
    }
  }
  requestAnimationFrame(animate);
}

function renderWheelHistory() {
  const el = document.getElementById('wheel-history-list');
  if (!el) return;
  el.innerHTML = wheelHistory.map(h => '<div class="wheel-history-item">🕐 ' + h.time + ' → <b>' + h.result + '</b></div>').join('');
}

// ============================================================
// 🧩 照片拼图
// ============================================================
let puzzleState = null, puzzleTimer = null, puzzleSec = 0, puzzleMoves = 0;

function initPuzzlePage() {
  const selectEl = document.getElementById('puzzle-photo-select');
  if (selectEl && getData('albums', []).length > 0) {
    selectEl.classList.remove('hidden');
    renderPuzzlePhotoGrid();
  }
}

function renderPuzzlePhotoGrid() {
  const grid = document.getElementById('puzzle-photo-grid');
  if (!grid) return;
  const albums = getData('albums', []);
  const photos = albums.length > 0 ? albums[0].photos || [] : [];
  // 收集所有照片
  let allPhotos = [];
  albums.forEach(a => (a.photos||[]).forEach(p => allPhotos.push(p)));
  if (allPhotos.length === 0) {
    grid.innerHTML = '<p style="color:rgba(255,255,255,0.4)">相册里还没有照片，先去上传吧～</p>';
    return;
  }
  grid.innerHTML = allPhotos.map(p => '<img src="' + p + '" onclick="startPuzzleWithPhoto(this.src)" title="选择这张照片">').join('');
}

function startPuzzle() {
  const albums = getData('albums', []);
  let allPhotos = [];
  albums.forEach(a => (a.photos||[]).forEach(p => allPhotos.push(p)));
  if (allPhotos.length === 0) {
    alert('相册里还没有照片，先去上传吧～');
    return;
  }
  // 随机选一张
  const photo = allPhotos[Math.floor(Math.random()*allPhotos.length)];
  startPuzzleWithPhoto(photo);
}

function startPuzzleWithPhoto(photoDataUrl) {
  const n = parseInt(document.getElementById('puzzle-difficulty').value);
  const canvas = document.getElementById('puzzle-canvas');
  const boardWrap = document.getElementById('puzzle-board-wrap');
  const selectWrap = document.getElementById('puzzle-photo-select');
  const completeWrap = document.getElementById('puzzle-complete');
  if (selectWrap) selectWrap.classList.add('hidden');
  if (completeWrap) completeWrap.classList.add('hidden');
  boardWrap.classList.remove('hidden');

  // 加载图片
  const img = new Image();
  img.onload = function() {
    const size = Math.min(360, window.innerWidth - 40);
    canvas.width = size; canvas.height = size;
    const cellSize = size / n;
    // 创建拼图状态
    let grid = [];
    for (let i=0;i<n*n;i++) grid.push(i);
    // 打乱（确保有解）
    let solved = grid.slice();
    do { shuffle(grid); } while (!isSolvable(grid, n));
    puzzleState = { grid: grid, n: n, empty: grid.indexOf(n*n-1), size: size, cellSize: cellSize, img: img, solved: solved };
    puzzleSec = 0; puzzleMoves = 0;
    updatePuzzleInfo();
    drawPuzzleBoard();
    if (puzzleTimer) clearInterval(puzzleTimer);
    puzzleTimer = setInterval(() => { puzzleSec++; updatePuzzleInfo(); }, 1000);
    canvas.onclick = handlePuzzleClick;
  };
  img.src = photoDataUrl;
}

function shuffle(arr) {
  for (let i=arr.length-1;i>0;i--){ const j=Math.floor(Math.random()*(i+1)); [arr[i],arr[j]]=[arr[j],arr[i]]; }
}

function isSolvable(grid, n) {
  let inv = 0;
  const flat = grid.filter(x => x !== n*n-1);
  for (let i=0;i<flat.length;i++) for (let j=i+1;j<flat.length;j++) if (flat[i]>flat[j]) inv++;
  if (n%2===1) return inv%2===0;
  const emptyRow = Math.floor(grid.indexOf(n*n-1)/n);
  return (n-emptyRow)%2===1 ? inv%2===0 : inv%2===1;
}

function drawPuzzleBoard() {
  if (!puzzleState) return;
  const {grid, n, size, cellSize, img} = puzzleState;
  const canvas = document.getElementById('puzzle-canvas');
  const ctx = canvas.getContext('2d');
  ctx.clearRect(0,0,size,size);
  grid.forEach((val, idx) => {
    const x = (idx%n)*cellSize, y = Math.floor(idx/n)*cellSize;
    if (val === n*n-1) {
      ctx.fillStyle = 'rgba(255,255,255,0.05)'; ctx.fillRect(x,y,cellSize,cellSize);
      return;
    }
    const sx = (val%n)*img.width/n, sy = Math.floor(val/n)*img.height/n;
    ctx.drawImage(img, sx, sy, img.width/n, img.height/n, x, y, cellSize, cellSize);
    // 边框
    ctx.strokeStyle = 'rgba(255,255,255,0.3)'; ctx.lineWidth = 2; ctx.strokeRect(x,y,cellSize,cellSize);
  });
}

function handlePuzzleClick(e) {
  if (!puzzleState) return;
  const rect = e.target.getBoundingClientRect();
  const x = e.clientX - rect.left, y = e.clientY - rect.top;
  const c = Math.floor(x/puzzleState.cellSize), r = Math.floor(y/puzzleState.cellSize);
  const idx = r*puzzleState.n + c;
  // 检查是否与空位相邻
  const empty = puzzleState.empty;
  const er = Math.floor(empty/puzzleState.n), ec = empty%puzzleState.n;
  if ((Math.abs(r-er)+Math.abs(c-ec))===1) {
    [puzzleState.grid[idx], puzzleState.grid[empty]] = [puzzleState.grid[empty], puzzleState.grid[idx]];
    puzzleState.empty = idx;
    puzzleMoves++;
    drawPuzzleBoard();
    updatePuzzleInfo();
    if (puzzleState.grid.every((v,i) => v === puzzleState.solved[i])) puzzleComplete();
  }
}

function updatePuzzleInfo() {
  const timeEl = document.getElementById('puzzle-time');
  const movesEl = document.getElementById('puzzle-moves');
  if (timeEl) timeEl.textContent = String(Math.floor(puzzleSec/60)).padStart(2,'0')+':'+String(puzzleSec%60).padStart(2,'0');
  if (movesEl) movesEl.textContent = puzzleMoves;
}

function puzzleComplete() {
  if (puzzleTimer) clearInterval(puzzleTimer);
  document.getElementById('puzzle-board-wrap').classList.add('hidden');
  const complete = document.getElementById('puzzle-complete');
  complete.classList.remove('hidden');
  document.getElementById('puzzle-complete-info').textContent = '用时 ' + String(Math.floor(puzzleSec/60)).padStart(2,'0')+':'+String(puzzleSec%60).padStart(2,'0') + '，共 ' + puzzleMoves + ' 步';
}

function showPuzzlePreview() {
  if (!puzzleState) return;
  const {img, n, size} = puzzleState;
  const w = size || 300;
  const canvas = document.createElement('canvas');
  canvas.width = w; canvas.height = w;
  const ctx = canvas.getContext('2d');
  for (let i=0;i<n*n;i++) {
    const x = (i%n)*w/n, y = Math.floor(i/n)*w/n;
    ctx.drawImage(img, (i%n)*img.width/n, Math.floor(i/n)*img.height/n, img.width/n, img.height/n, x, y, w/n, w/n);
  }
  const win = window.open();
  win.document.write('<img src="'+canvas.toDataURL()+'" style="max-width:100%">');
}

function onPuzzleDifficultyChange() {
  if (puzzleState) startPuzzleWithPhoto(puzzleState.img.src);
}

// ============================================================
// 📍 我们的足迹地图
// ============================================================
const FOOTPRINT_KEY = 'lb_footprint';
const FOOTPRINT_WISH_KEY = 'lb_footprint_wish';

function getFootprintData() { return getData(FOOTPRINT_KEY, []); }
function saveFootprintData(d) { setData(FOOTPRINT_KEY, d); }
function getFootprintWishData() { return getData(FOOTPRINT_WISH_KEY, []); }
function saveFootprintWishData(d) { setData(FOOTPRINT_WISH_KEY, d); }

// 中国主要城市
const CHINA_FOOTPRINT_CITIES = [
  '北京','上海','广州','深圳','成都','重庆','杭州','南京','武汉','西安',
  '长沙','青岛','大连','厦门','昆明','天津','郑州','苏州','珠海','三亚',
  '拉萨','乌鲁木齐','呼和浩特','哈尔滨','长春','沈阳','济南','太原','石家庄','福州',
  '南宁','贵阳','海口','香港','澳门'
];

function initFootprint() {
  renderFootprintMap();
  renderFootprintList();
  renderFootprintWishList();
}

function renderFootprintMap() {
  const mapEl = document.getElementById('footprint-china-map');
  if (!mapEl) return;
  const visited = getFootprintData();
  // 用网格展示
  mapEl.innerHTML = CHINA_FOOTPRINT_CITIES.map(c => {
    const isVisited = visited.some(v => v.city === c);
    return '<div class="fp-city-dot' + (isVisited?' visited':'') + '" title="' + c + '" onclick="toggleFootprintCity(\'' + c + '\')">' + c + '</div>';
  }).join('');
  // 统计
  const provinces = new Set(visited.map(v => v.province || '未知'));
  document.getElementById('fp-city-count').textContent = visited.length;
  document.getElementById('fp-province-count').textContent = provinces.size;
}

function toggleFootprintCity(city) {
  let visited = getFootprintData();
  const idx = visited.findIndex(v => v.city === city);
  if (idx >= 0) {
    visited.splice(idx, 1);
  } else {
    const date = prompt('什么时候去的？（如：2024-06-15）', new Date().toISOString().split('T')[0]);
    visited.push({ city: city, date: date || '未知', province: '' });
  }
  saveFootprintData(visited);
  renderFootprintMap();
  renderFootprintList();
}

function renderFootprintList() {
  const el = document.getElementById('footprint-list');
  if (!el) return;
  const visited = getFootprintData();
  if (visited.length === 0) { el.innerHTML = '<p style="color:rgba(255,255,255,0.4)">还没有足迹，点击地图上的城市添加吧～</p>'; return; }
  el.innerHTML = visited.sort((a,b) => b.date > a.date ? 1 : -1).map((v,i) =>
    '<div class="fp-item"><span class="fp-city-name">📍 ' + v.city + '</span><span class="fp-date">' + v.date + '</span><button onclick="removeFootprint(' + i + ')" title="删除">✕</button></div>'
  ).join('');
}

function removeFootprint(idx) {
  let visited = getFootprintData();
  visited.splice(idx, 1);
  saveFootprintData(visited);
  renderFootprintMap();
  renderFootprintList();
}

function openFootprintEditor() {
  const city = prompt('输入城市名称：');
  if (!city) return;
  const date = prompt('什么时候去的？（如：2024-06-15）', new Date().toISOString().split('T')[0]);
  let visited = getFootprintData();
  visited.push({ city: city, date: date || '未知', province: '' });
  saveFootprintData(visited);
  renderFootprintMap();
  renderFootprintList();
}

function openFootprintWishEditor() {
  const city = prompt('输入想去的城市：');
  if (!city) return;
  let wish = getFootprintWishData();
  wish.push({ city: city, added: new Date().toISOString().split('T')[0] });
  saveFootprintWishData(wish);
  renderFootprintWishList();
}

function renderFootprintWishList() {
  const el = document.getElementById('footprint-wishlist');
  if (!el) return;
  const wish = getFootprintWishData();
  if (wish.length === 0) { el.innerHTML = '<p style="color:rgba(255,255,255,0.4)">还没有愿望清单，点击添加吧～</p>'; return; }
  el.innerHTML = wish.map((w,i) =>
    '<div class="fp-item"><span class="fp-city-name">🎯 ' + w.city + '</span><span class="fp-date">添加于 ' + w.added + '</span><button onclick="removeFootprintWish(' + i + ')" title="删除">✕</button></div>'
  ).join('');
}

function removeFootprintWish(idx) {
  let wish = getFootprintWishData();
  wish.splice(idx, 1);
  saveFootprintWishData(wish);
  renderFootprintWishList();
}

// ============================================================
// 💞 爱情树
// ============================================================
const LOVE_TREE_KEY = 'lb_love_tree';

function getLoveTreeData() {
  return getData(LOVE_TREE_KEY, { level: 0, exp: 0, lastWater: '', log: [] });
}

function saveLoveTreeData(d) { setData(LOVE_TREE_KEY, d); }

function getTreeStage(exp) {
  if (exp < 10) return { emoji: '🌱', name: '爱情的种子', level: 'Lv.1 种子期', stage: 0 };
  if (exp < 30) return { emoji: '🌿', name: '嫩绿的新芽', level: 'Lv.2 发芽期', stage: 1 };
  if (exp < 60) return { emoji: '🌱🌿', name: '茁壮成长', level: 'Lv.3 成长期', stage: 2 };
  if (exp < 100) return { emoji: '🌳', name: '茂密大树', level: 'Lv.4 大树期', stage: 3 };
  if (exp < 200) return { emoji: '🌸🌳', name: '花开满树', level: 'Lv.5 开花期', stage: 4 };
  return { emoji: '💝🌸🌳', name: '爱情之树常青', level: 'Lv.MAX 永恒期', stage: 5 };
}

function initLoveTree() {
  const data = getLoveTreeData();
  const stage = getTreeStage(data.exp);
  document.getElementById('love-tree-stage').textContent = stage.emoji;
  document.getElementById('love-tree-name').textContent = stage.name;
  document.getElementById('love-tree-level-text').textContent = stage.level;
  const maxExp = [10,30,60,100,200,500][stage.stage] || 500;
  const prevExp = [0,10,30,60,100,200][stage.stage] || 200;
  const pct = Math.min(100, ((data.exp-prevExp)/(maxExp-prevExp))*100);
  document.getElementById('love-tree-progress-bar').style.width = pct + '%';
  // 检查今天是否已浇水
  const today = new Date().toISOString().split('T')[0];
  document.getElementById('btn-tree-water').disabled = (data.lastWater === today);
  renderLoveTreeLog();
}

function waterLoveTree() {
  const today = new Date().toISOString().split('T')[0];
  const data = getLoveTreeData();
  if (data.lastWater === today) { alert('今天已经浇过水啦～明天再来吧！'); return; }
  data.exp += 1;
  data.lastWater = today;
  data.log.unshift({ action: '💧 浇水', time: today, exp: data.exp });
  if (data.log.length > 50) data.log.pop();
  saveLoveTreeData(data);
  initLoveTree(); // 重新渲染
  // 检查升级
  const stage = getTreeStage(data.exp);
  const prevStage = getTreeStage(data.exp - 1);
  if (stage.stage > prevStage.stage) {
    alert('🎉 爱情树升级了！\n' + prevStage.emoji + ' → ' + stage.emoji + '\n' + stage.name);
  }
}

function viewLoveTreeLog() {
  const el = document.getElementById('love-tree-log');
  if (!el) return;
  if (!el.classList.contains('hidden')) { el.classList.add('hidden'); return; }
  el.classList.remove('hidden');
  renderLoveTreeLog();
}

function renderLoveTreeLog() {
  const el = document.getElementById('love-tree-log');
  if (!el) return;
  const data = getLoveTreeData();
  el.innerHTML = '<h4>📜 成长记录</h4>' + (data.log.length === 0 ? '<p style="color:rgba(255,255,255,0.4)">还没有记录</p>' : data.log.map(l => '<div class="love-tree-log-item">' + l.time + ' ' + l.action + '（总经验：' + l.exp + '）</div>').join(''));
}

// 外部调用：其他操作也可以给爱情树加经验
function addLoveTreeExp(amount, action) {
  const data = getLoveTreeData();
  data.exp += amount;
  data.log.unshift({ action: action, time: new Date().toISOString().split('T')[0], exp: data.exp });
  if (data.log.length > 50) data.log.pop();
  saveLoveTreeData(data);
}

// ============================================================
// 🎯 30天情侣挑战
// ============================================================
const CHALLENGE_KEY = 'lb_challenge';

const CHALLENGE_TASKS = [
  '一起看一部电影', '牵手散步30分钟', '一起做一顿饭', '不玩手机1小时深度聊天',
  '互相按摩10分钟', '一起拍一张合照', '写一封手写信', '一起看日出或日落',
  '去一个新的地方探险', '一起做运动', '互相说3个优点', '一起听音乐1小时',
  '一起打扫房间', '为对方做一件小事', '一起玩桌游或卡牌', '一起购物买菜',
  '一起看星星', '一起喝一杯奶茶', '说一句"我爱你"', '一起计划一次旅行',
  '交换手机壁纸', '一起穿情侣装', '一起学一首歌', '一起画画',
  '一起去图书馆', '一起做志愿者', '一起戒掉一个坏习惯', '互相道歉并拥抱',
  '一起回顾第一次见面', '一起写下1年后的愿望'
];

function getChallengeData() {
  const d = getData(CHALLENGE_KEY, null);
  if (!d || !d.tasks) return { tasks: CHALLENGE_TASKS.map(t => ({text:t, done:false})), completed: 0 };
  return d;
}

function saveChallengeData(d) { setData(CHALLENGE_KEY, d); }

function initChallenge() {
  const data = getChallengeData();
  renderChallengeGrid(data);
  updateChallengeProgress(data);
}

function renderChallengeGrid(data) {
  const grid = document.getElementById('challenge-grid');
  if (!grid) return;
  grid.innerHTML = data.tasks.map((t, i) =>
    '<div class="challenge-item' + (t.done?' done':'') + '" onclick="toggleChallengeItem(' + i + ')">' +
    '<div class="ch-num">' + (i+1) + '</div>' +
    '<div class="ch-text">' + t.text + '</div>' +
    '<div class="ch-check">' + (t.done?'✅':'☐') + '</div>' +
    '</div>'
  ).join('');
  // 检查是否全部完成
  const allDone = data.tasks.every(t => t.done);
  const reward = document.getElementById('challenge-reward');
  if (allDone && data.completed < 30) {
    data.completed = 30;
    saveChallengeData(data);
    if (reward) reward.classList.remove('hidden');
  }
}

function toggleChallengeItem(idx) {
  const data = getChallengeData();
  data.tasks[idx].done = !data.tasks[idx].done;
  saveChallengeData(data);
  renderChallengeGrid(data);
  updateChallengeProgress(data);
}

function updateChallengeProgress(data) {
  const done = data.tasks.filter(t => t.done).length;
  const fill = document.getElementById('challenge-progress-fill');
  const text = document.getElementById('challenge-progress-text');
  if (fill) fill.style.width = (done/30*100)+'%';
  if (text) text.textContent = done + '/30';
}

// ============================================================
// 💌 情书设计器
// ============================================================
const LOVE_LETTER_KEY = 'lb_love_letters';

function getLoveLetters() { return getData(LOVE_LETTER_KEY, []); }
function saveLoveLetters(d) { setData(LOVE_LETTER_KEY, d); }

function initLoveLetter() {
  renderLoveLetterList();
}

function applyLetterTemplate() {
  const t = document.getElementById('letter-template').value;
  const body = document.getElementById('letter-body');
  if (t==='classic') body.value = '亲爱的，\n\n遇见你是我这辈子最幸运的事。\n每一个和你在一起的瞬间，都值得被珍藏。\n\n愿我们一起走过无数个春夏秋冬。';
  else if (t==='cute') body.value = '嗨～我的小可爱！\n\n想你想你想你！\n今天你吃饭了吗？记得多喝水哦～\n你是世界上最可爱的人！💕';
  else if (t==='poem') body.value = '山有木兮木有枝，\n心悦君兮君不知。\n\n愿得一人心，\n白首不相离。\n\n——致我最爱的你';
  else if (t==='modern') body.value = 'Hey，\n\n和你在一起的每一天，都是我想要的明天。\n\nThanks for being you. 💫';
}

function addStickerToLetter(sticker) {
  const body = document.getElementById('letter-body');
  body.value += ' ' + sticker + ' ';
  body.focus();
}

function previewLoveLetter() {
  const to = document.getElementById('letter-to').value || '亲爱的';
  const from = document.getElementById('letter-from').value || '爱你的人';
  const body = document.getElementById('letter-body').value || '...';
  const preview = document.getElementById('love-letter-preview');
  const paper = document.getElementById('love-letter-paper');
  preview.classList.remove('hidden');
  paper.querySelector('.letter-content').innerHTML =
    '<div class="letter-header">💌 致 ' + escHtml(to) + '</div>' +
    '<div class="letter-body-text">' + escHtml(body).replace(/\n/g,'<br>') + '</div>' +
    '<div class="letter-footer">—— ' + escHtml(from) + '<br><small>' + new Date().toLocaleDateString('zh-CN') + '</small></div>';
}

function saveLoveLetter() {
  previewLoveLetter();
  const paper = document.getElementById('love-letter-paper');
  // 用 html2canvas 的思路：把内容画到 canvas 然后下载
  // 简化版：直接保存为文字记录
  const to = document.getElementById('letter-to').value;
  const from = document.getElementById('letter-from').value;
  const body = document.getElementById('letter-body').value;
  const letters = getLoveLetters();
  letters.unshift({ to: to, from: from, body: body, time: new Date().toISOString() });
  saveLoveLetters(letters);
  renderLoveLetterList();
  alert('💌 情书已保存！可以去"已保存的情书"查看～');
}

function renderLoveLetterList() {
  const el = document.getElementById('love-letter-list');
  if (!el) return;
  const letters = getLoveLetters();
  if (letters.length === 0) { el.innerHTML = '<p style="color:rgba(255,255,255,0.4)">还没有保存的情书</p>'; return; }
  el.innerHTML = letters.map((l,i) =>
    '<div class="letter-saved-item" style="margin-bottom:10px;padding:14px;background:rgba(255,255,255,0.95);border:2px solid #93c5fd;border-radius:12px;box-shadow:0 2px 8px rgba(0,0,0,0.08);">' +
    '<span class="letter-preview-text">💌 致 ' + escHtml(l.to) + '：' + escHtml(l.body.substring(0,40)) + '...</span>' +
    '<small style="color:#666;display:block;margin-top:4px;">📅 ' + new Date(l.time).toLocaleDateString('zh-CN') + ' ' + new Date(l.time).toLocaleTimeString('zh-CN',{hour:'2-digit',minute:'2-digit'}) + '</small>' +
    '<div style="margin-top:8px;display:flex;gap:8px;">' +
    '<button onclick="viewLoveLetter(' + i + ')" title="查看情书" style="flex:1;padding:8px;background:linear-gradient(135deg,#3b82f6,#1d4ed8);color:white;border:none;border-radius:8px;cursor:pointer;font-size:13px;">👁️ 查看</button>' +
    '<button onclick="deleteLoveLetter(' + i + ')" title="删除" style="padding:8px 16px;background:linear-gradient(135deg,#ef4444,#dc2626);color:white;border:none;border-radius:8px;cursor:pointer;font-size:13px;">🗑️ 删除</button>' +
    '</div></div>'
  ).join('');
}

function viewLoveLetter(idx) {
  const letters = getLoveLetters();
  if (!letters[idx]) return;
  const l = letters[idx];
  const html =
    '<div style="padding:20px;max-width:500px;">' +
    '<h3 style="margin-bottom:15px;color:#1e40af;">💌 情书详情</h3>' +
    '<div style="background:linear-gradient(135deg,#eff6ff,#dbeafe);border:2px solid #93c5fd;border-radius:12px;padding:20px;margin-bottom:15px;box-shadow:0 2px 8px rgba(59,130,246,0.15);">' +
    '<div style="font-size:18px;font-weight:700;color:#1e40af;margin-bottom:12px;">致 ' + escHtml(l.to) + '</div>' +
    '<div style="white-space:pre-wrap;line-height:1.8;font-size:15px;color:#1a1a1a;">' + escHtml(l.body) + '</div>' +
    '<div style="text-align:right;margin-top:16px;color:#3b82f6;font-weight:600;">—— ' + escHtml(l.from || '爱你的人') + '</div>' +
    '</div>' +
    '<div style="font-size:13px;color:#888;text-align:center;">📅 ' + new Date(l.time).toLocaleString('zh-CN') + '</div>' +
    '</div>';
  if (typeof showGlobalModal === 'function') showGlobalModal(html);
}

function deleteLoveLetter(idx) {
  if (!confirm('确定删除这封情书？')) return;
  const letters = getLoveLetters();
  letters.splice(idx, 1);
  saveLoveLetters(letters);
  renderLoveLetterList();
}

function escHtml(s) {
  return (s||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

// ============================================================
// 🎮 双人小游戏
// ============================================================
let currentGame = null, gameState = null;

function initGames() {
  const board = document.getElementById('game-board-wrap');
  if (board) board.classList.add('hidden');
  const menu = document.querySelector('.games-menu');
  if (menu) menu.style.display = '';
}

function startGame(type) {
  const menu = document.querySelector('.games-menu');
  if (menu) menu.style.display = 'none';
  const board = document.getElementById('game-board-wrap');
  board.classList.remove('hidden');
  currentGame = type;
  if (type === 'tictactoe') initTicTacToe();
  else if (type === 'gomoku') initGomoku();
  else if (type === 'memory') initMemoryGame();
}

// 获取响应式Canvas尺寸
function getGameCanvasSize(defaultSize, maxSize) {
  var container = document.querySelector('.games-container');
  var maxW = Math.min(container ? container.clientWidth - 32 : 360, defaultSize);
  var maxH = window.innerHeight - 280;
  var size = Math.min(maxW, maxH, maxSize || defaultSize);
  // 确保是整数
  if (currentGame === 'tictactoe') size = Math.floor(size / 3) * 3;
  else if (currentGame === 'gomoku') size = Math.floor(size / 9) * 9;
  else if (currentGame === 'memory') {
    var cols = 4;
    size = Math.floor(size / cols) * cols;
    size = Math.floor(size / 3) * 3; // rows
    size = Math.min(size, Math.floor(size / cols) * cols);
  }
  return Math.max(150, size);
}

// 庆祝动画
function celebrateGameWin() {
  var emojis = ['🎉','🎊','✨','💖','💕','🥳','💝','🌟','🎈','💗'];
  var overlay = document.createElement('div');
  overlay.className = 'game-win-overlay';
  overlay.id = 'game-win-overlay';
  for (var i = 0; i < 30; i++) {
    var p = document.createElement('span');
    p.className = 'game-win-particle';
    p.textContent = emojis[Math.floor(Math.random() * emojis.length)];
    p.style.left = (10 + Math.random() * 80) + '%';
    p.style.top = (20 + Math.random() * 60) + '%';
    p.style.setProperty('--tx', (Math.random() - 0.5) * 200 + 'px');
    p.style.setProperty('--ty', (Math.random() - 0.5) * 200 + 'px');
    p.style.setProperty('--tr', (Math.random() - 0.5) * 360 + 'deg');
    p.style.animationDuration = (1 + Math.random() * 1.5) + 's';
    p.style.animationDelay = Math.random() * 0.5 + 's';
    overlay.appendChild(p);
  }
  document.body.appendChild(overlay);
  setTimeout(function() { overlay.remove(); }, 2500);
}

// --- 井字棋 ---
function initTicTacToe() {
  var size = 3;
  gameState = { board: Array(size*size).fill(''), current: '🐹', size: size };
  document.getElementById('game-status').textContent = '🐹 先手（X）';
  drawTicTacToe();
  var canvas = document.getElementById('game-canvas');
  canvas.onclick = handleTicTacToeClick;
  // 触控支持
  canvas.ontouchend = function(e) { e.preventDefault(); handleTicTacToeClick(e.changedTouches[0]); };
}

function drawTicTacToe() {
  var canvas = document.getElementById('game-canvas');
  var s = getGameCanvasSize(300);
  canvas.width = s; canvas.height = s;
  canvas.style.width = s + 'px';
  canvas.style.height = s + 'px';
  var ctx = canvas.getContext('2d');
  var cell = s/3;
  // 背景
  ctx.fillStyle = '#1a1a2e'; ctx.fillRect(0,0,s,s);
  // 网格线
  ctx.strokeStyle = 'rgba(59,130,246,0.5)'; ctx.lineWidth = 2;
  for (var i=1;i<3;i++) {
    ctx.beginPath(); ctx.moveTo(i*cell,0); ctx.lineTo(i*cell,s); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(0,i*cell); ctx.lineTo(s,i*cell); ctx.stroke();
  }
  // 绘制棋子
  var fontSize = cell*0.5;
  gameState.board.forEach(function(v, i) {
    if (!v) return;
    var x = (i%3)*cell+cell/2, y = Math.floor(i/3)*cell+cell/2;
    ctx.fillStyle = v==='🐹'?'#3b82f6':'#1d4ed8';
    ctx.font = 'bold '+fontSize+'px sans-serif';
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText(v==='🐹'?'🐹':'🐱', x, y);
    // 光晕
    ctx.shadowColor = v==='🐹'?'rgba(59,130,246,0.5)':'rgba(139,92,246,0.5)';
    ctx.shadowBlur = 10;
    ctx.fillText(v==='🐹'?'🐹':'🐱', x, y);
    ctx.shadowBlur = 0;
  });
}

function handleTicTacToeClick(e) {
  if (!gameState || gameState.winner) return;
  var canvas = document.getElementById('game-canvas');
  var rect = canvas.getBoundingClientRect();
  var x = (e.clientX || e.pageX) - rect.left;
  var y = (e.clientY || e.pageY) - rect.top;
  var cell = canvas.offsetWidth / 3;
  var col = Math.floor(x/cell), row = Math.floor(y/cell);
  var idx = row*3+col;
  if (idx < 0 || idx > 8 || gameState.board[idx]) return;
  gameState.board[idx] = gameState.current;
  var win = checkTicTacToeWin();
  if (win) {
    gameState.winner = gameState.current;
    document.getElementById('game-status').textContent = (gameState.current==='🐹'?'🐹':'🐱') + ' 获胜！🎉';
    drawTicTacToe();
    celebrateGameWin();
    return;
  }
  if (gameState.board.every(function(c){return c;})) {
    document.getElementById('game-status').textContent = '平局！🤝';
    drawTicTacToe();
    return;
  }
  gameState.current = gameState.current==='🐹'?'🐱':'🐹';
  document.getElementById('game-status').textContent = (gameState.current==='🐹'?'🐹':'🐱') + ' 的回合';
  drawTicTacToe();
}

function checkTicTacToeWin() {
  var b = gameState.board, s = 3;
  for (var i=0;i<s;i++) {
    if(b[i*s]&&b[i*s]===b[i*s+1]&&b[i*s]===b[i*s+2]) return true;
    if(b[i]&&b[i]===b[i+s]&&b[i]===b[i+s*2]) return true;
  }
  if(b[0]&&b[0]===b[4]&&b[0]===b[8]) return true;
  if(b[2]&&b[2]===b[4]&&b[2]===b[6]) return true;
  return false;
}

// --- 五子棋（9×9）---
function initGomoku() {
  var size = 9;
  gameState = { board: Array(size*size).fill(0), current: 1, size: size };
  document.getElementById('game-status').textContent = '🐹 先手（黑）';
  drawGomoku();
  var canvas = document.getElementById('game-canvas');
  canvas.onclick = handleGomokuClick;
  canvas.ontouchend = function(e) { e.preventDefault(); handleGomokuClick(e.changedTouches[0]); };
}

function drawGomoku() {
  var canvas = document.getElementById('game-canvas');
  var s = getGameCanvasSize(360, 450);
  canvas.width = s; canvas.height = s;
  canvas.style.width = s + 'px';
  canvas.style.height = s + 'px';
  var ctx = canvas.getContext('2d');
  var cell = s/gameState.size;
  // 棋盘
  ctx.fillStyle = '#DEB887'; ctx.fillRect(0,0,s,s);
  // 网格
  ctx.strokeStyle = '#8B4513'; ctx.lineWidth = 1;
  for (var i=0;i<gameState.size;i++) {
    ctx.beginPath(); ctx.moveTo(i*cell+cell/2,cell/2); ctx.lineTo(i*cell+cell/2,s-cell/2); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(cell/2,i*cell+cell/2); ctx.lineTo(s-cell/2,i*cell+cell/2); ctx.stroke();
  }
  // 星位
  var starPts = [[2,2],[2,6],[4,4],[6,2],[6,6]];
  ctx.fillStyle = '#8B4513';
  starPts.forEach(function(pt) {
    ctx.beginPath(); ctx.arc(pt[0]*cell+cell/2, pt[1]*cell+cell/2, 3, 0, Math.PI*2); ctx.fill();
  });
  // 棋子
  gameState.board.forEach(function(v,i) {
    if (!v) return;
    var cx = (i%gameState.size)*cell+cell/2, cy = Math.floor(i/gameState.size)*cell+cell/2;
    var r = cell/2.5;
    ctx.beginPath(); ctx.arc(cx,cy,r,0,Math.PI*2);
    ctx.fillStyle = v===1?'#222':'#fff';
    ctx.fill();
    ctx.strokeStyle = '#888'; ctx.lineWidth = 1; ctx.stroke();
    // 光泽
    var grad = ctx.createRadialGradient(cx-r*0.3,cy-r*0.3,r*0.1,cx,cy,r);
    grad.addColorStop(0, 'rgba(255,255,255,0.4)');
    grad.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = grad;
    ctx.fill();
  });
}

function handleGomokuClick(e) {
  if (!gameState || gameState.winner) return;
  var canvas = document.getElementById('game-canvas');
  var rect = canvas.getBoundingClientRect();
  var x = (e.clientX || e.pageX) - rect.left;
  var y = (e.clientY || e.pageY) - rect.top;
  var s = canvas.offsetWidth;
  var cell = s/gameState.size;
  var col = Math.round((x-cell/2)/cell), row = Math.round((y-cell/2)/cell);
  var idx = row*gameState.size+col;
  if (row<0||row>=gameState.size||col<0||col>=gameState.size||gameState.board[idx]) return;
  gameState.board[idx] = gameState.current;
  if (checkGomokuWin(row, col, gameState.current)) {
    gameState.winner = gameState.current;
    document.getElementById('game-status').textContent = (gameState.current===1?'🐹':'🐱') + ' 五子连珠！🎉';
    drawGomoku();
    celebrateGameWin();
    return;
  }
  gameState.current = gameState.current===1?2:1;
  document.getElementById('game-status').textContent = (gameState.current===1?'🐹（黑）':'🐱（白）') + ' 的回合';
  drawGomoku();
}

function checkGomokuWin(row, col, p) {
  var s = gameState.size;
  var dirs = [[0,1],[1,0],[1,1],[1,-1]];
  for (var d=0; d<dirs.length; d++) {
    var dr=dirs[d][0], dc=dirs[d][1];
    var count = 1;
    for (var i=1;i<5;i++) { var r=row+dr*i,c=col+dc*i; if(r<0||r>=s||c<0||c>=s||gameState.board[r*s+c]!==p) break; count++; }
    for (var i=1;i<5;i++) { var r=row-dr*i,c=col-dc*i; if(r<0||r>=s||c<0||c>=s||gameState.board[r*s+c]!==p) break; count++; }
    if (count>=5) return true;
  }
  return false;
}

// --- 翻翻乐（记忆卡片）---
function initMemoryGame() {
  var icons = ['💕','🌹','🐹','🐱','💖','🌟','🎀','😘','🦋','🌈','🍦','🎵'];
  var cards = icons.slice(0,6);
  var pairs = cards.concat(cards);
  shuffle(pairs);
  gameState = { cards: pairs, flipped: [], matched: [], moves: 0 };
  document.getElementById('game-status').textContent = '翻牌找相同！点击两张卡片';
  drawMemoryGame();
  var canvas = document.getElementById('game-canvas');
  canvas.onclick = handleMemoryClick;
  canvas.ontouchend = function(e) { e.preventDefault(); handleMemoryClick(e.changedTouches[0]); };
}

function drawMemoryGame() {
  var canvas = document.getElementById('game-canvas');
  var cols = 4, rows = 3;
  var s = getGameCanvasSize(320);
  canvas.width = s; canvas.height = s;
  canvas.style.width = s + 'px';
  canvas.style.height = s + 'px';
  var ctx = canvas.getContext('2d');
  var cellW = s/cols, cellH = s/rows;
  var fontSize = cellH*0.45;
  ctx.fillStyle = '#1a1a2e'; ctx.fillRect(0,0,s,s);
  gameState.cards.forEach(function(card, i) {
    var x = (i%cols)*cellW, y = Math.floor(i/cols)*cellH;
    var isFlipped = gameState.flipped.indexOf(i) !== -1 || gameState.matched.indexOf(i) !== -1;
    if (isFlipped) {
      ctx.fillStyle = gameState.matched.indexOf(i) !== -1
        ? 'rgba(16,185,129,0.15)' : 'rgba(59,130,246,0.15)';
      ctx.fillRect(x+4,y+4,cellW-8,cellH-8);
      ctx.strokeStyle = gameState.matched.indexOf(i) !== -1 ? '#10b981' : '#3b82f6';
      ctx.lineWidth = 2; ctx.strokeRect(x+4,y+4,cellW-8,cellH-8);
      ctx.font = 'bold ' + fontSize + 'px sans-serif';
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.fillText(card, x+cellW/2, y+cellH/2);
    } else {
      ctx.fillStyle = 'rgba(255,255,255,0.08)';
      ctx.beginPath();
      if (ctx.roundRect) ctx.roundRect(x+4,y+4,cellW-8,cellH-8,8);
      else ctx.rect(x+4,y+4,cellW-8,cellH-8);
      ctx.fill();
      ctx.strokeStyle = 'rgba(255,255,255,0.2)'; ctx.lineWidth = 1;
      ctx.strokeRect(x+4,y+4,cellW-8,cellH-8);
      ctx.fillStyle = 'rgba(255,255,255,0.35)';
      ctx.font = 'bold ' + fontSize + 'px sans-serif';
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.fillText('?', x+cellW/2, y+cellH/2);
    }
  });
  var matched = gameState.matched.length/2;
  document.getElementById('game-status').textContent = '步数：' + gameState.moves + ' | 配对：' + matched + '/6';
  if (gameState.matched.length === gameState.cards.length) {
    document.getElementById('game-status').textContent = '全部完成！共 ' + gameState.moves + ' 步 🎉';
    setTimeout(function() { celebrateGameWin(); }, 500);
  }
}

function handleMemoryClick(e) {
  if (!gameState || gameState.matched.length === gameState.cards.length) return;
  if (gameState.flipped.length >= 2) return;
  var canvas = document.getElementById('game-canvas');
  var rect = canvas.getBoundingClientRect();
  var x = (e.clientX || e.pageX) - rect.left;
  var y = (e.clientY || e.pageY) - rect.top;
  var s = canvas.offsetWidth;
  var cols = 4, rows = 3;
  var col = Math.floor(x/(s/cols)), row = Math.floor(y/(s/rows));
  var idx = row*cols + col;
  if (idx < 0 || idx >= 12) return;
  if (gameState.flipped.indexOf(idx) !== -1 || gameState.matched.indexOf(idx) !== -1) return;
  gameState.flipped.push(idx);
  drawMemoryGame();
  if (gameState.flipped.length === 2) {
    gameState.moves++;
    var a = gameState.flipped[0], b = gameState.flipped[1];
    if (gameState.cards[a] === gameState.cards[b]) {
      gameState.matched.push(a,b);
      gameState.flipped = [];
      setTimeout(function() { drawMemoryGame(); }, 300);
    } else {
      setTimeout(function() { gameState.flipped = []; drawMemoryGame(); }, 800);
    }
  }
}

function resetGame() {
  if (currentGame) startGame(currentGame);
  else initGames();
}

function exitGame() {
  currentGame = null;
  var board = document.getElementById('game-board-wrap');
  if (board) board.classList.add('hidden');
  var menu = document.querySelector('.games-menu');
  if (menu) menu.style.display = '';
}

// ============================================================
// 🔄 强制升级 + 📢 更新公告
// ============================================================

const CURRENT_VERSION = 'v2.0';
const CURRENT_VERSION_CODE = 200;

function checkShowUpgradeBtn() {
  const lastSeen = parseInt(localStorage.getItem('lb_last_seen_version') || '0');
  const btnUpgrade = document.getElementById('btn-upgrade');
  const btnChangelog = document.getElementById('btn-changelog');
  if (btnUpgrade && lastSeen < CURRENT_VERSION_CODE) {
    btnUpgrade.classList.add('show');
    btnUpgrade.title = '发现新版本 ' + CURRENT_VERSION + '！点击立即升级 ✨';
  }
  if (btnChangelog) btnChangelog.classList.add('show');
}

function forceUpgrade() {
  if (!confirm('🔄 立即升级到 ' + CURRENT_VERSION + '？\n\n将清除缓存并重新加载页面。')) return;
  // 清除所有缓存
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.getRegistrations().then(function(regs) {
      regs.forEach(function(reg) { reg.unregister(); });
    });
  }
  if ('caches' in window) {
    caches.keys().then(function(names) { names.forEach(function(n) { caches.delete(n); }); });
  }
  // 标记已看过此版本
  localStorage.setItem('lb_last_seen_version', String(CURRENT_VERSION_CODE));
  // 强制重载，跳过缓存
  location.reload(true);
}

function showChangelog() {
  const overlay = document.getElementById('changelog-overlay');
  if (overlay) overlay.classList.remove('hidden');
  // 标记已看过此版本
  localStorage.setItem('lb_last_seen_version', String(CURRENT_VERSION_CODE));
  // 隐藏升级按钮
  const btnUpgrade = document.getElementById('btn-upgrade');
  if (btnUpgrade) btnUpgrade.classList.remove('show');
}

function closeChangelog(e) {
  if (e && e.target !== document.getElementById('changelog-overlay')) return;
  const overlay = document.getElementById('changelog-overlay');
  if (overlay) overlay.classList.add('hidden');
}

// 登录后检查是否显示升级按钮
const _origOnLoginV14 = window.onLogin || function(){};
window.onLogin = function() {
  _origOnLoginV14();
  setTimeout(checkShowUpgradeBtn, 500);
};

// DOM ready 后也检查（已登录状态）
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', function() {
    setTimeout(checkShowUpgradeBtn, 800);
  });
} else {
  setTimeout(checkShowUpgradeBtn, 800);
}

console.log('%c [v2.0] 新模块加载完成 🎡🧩📍💞🎯💌🎮', 'color:#22d3ee;font-weight:bold');
