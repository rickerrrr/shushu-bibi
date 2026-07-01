/**
 * 情侣电影院 v1.0
 * 功能：一起看电影、观影记录、电影推荐、弹幕评论、专属片单
 * 作者：鼠鼠
 * 日期：2026-06-28
 */

const CoupleCinema = {
  version: '1.0',
  inited: false, // 添加初始化标志
  
  // 电影数据库
  movieDatabase: [
    {
      id: 1,
      title: '泰坦尼克号',
      year: 1997,
      genre: ['爱情', '剧情'],
      duration: 194,
      rating: 9.4,
      poster: '🚢',
      description: '永恒的爱情经典，Jack和Rose的爱情故事',
      tags: ['经典', '感人', '必看'],
      watchStatus: 'none' // none, watched, watching, wishlist
    },
    {
      id: 2,
      title: '你的名字。',
      year: 2016,
      genre: ['动画', '爱情', '奇幻'],
      duration: 106,
      rating: 8.4,
      poster: '🌟',
      description: '跨越时空的爱情，新海诚的巅峰之作',
      tags: ['动画', '唯美', '推荐'],
      watchStatus: 'none'
    },
    {
      id: 3,
      title: '怦然心动',
      year: 2010,
      genre: ['爱情', '剧情'],
      duration: 90,
      rating: 9.1,
      poster: '🌸',
      description: '初恋的美好，让你想起心动的感觉',
      tags: ['初恋', '清新', '治愈'],
      watchStatus: 'none'
    },
    {
      id: 4,
      title: '盗梦空间',
      year: 2010,
      genre: ['科幻', '悬疑', '动作'],
      duration: 148,
      rating: 9.3,
      poster: '🌀',
      description: '梦境与现实交织，诺兰的神作',
      tags: ['烧脑', '科幻', '经典'],
      watchStatus: 'none'
    },
    {
      id: 5,
      title: '机器人总动员',
      year: 2008,
      genre: ['动画', '科幻', '爱情'],
      duration: 98,
      rating: 9.3,
      poster: '🤖',
      description: '瓦力和伊芙的星际爱情，皮克斯巅峰',
      tags: ['动画', '治愈', '感人'],
      watchStatus: 'none'
    },
    {
      id: 6,
      title: '大话西游之大圣娶亲',
      year: 1995,
      genre: ['喜剧', '爱情', '奇幻'],
      duration: 95,
      rating: 9.2,
      poster: '💫',
      description: '那个人好像一条狗啊，经典永流传',
      tags: ['经典', '搞笑', '感人'],
      watchStatus: 'none'
    },
    {
      id: 7,
      title: '情人节',
      year: 2010,
      genre: ['爱情', '喜剧'],
      duration: 125,
      rating: 7.2,
      poster: '💝',
      description: '多个爱情故事交织，情人节必看',
      tags: ['节日', '轻松', '多线叙事'],
      watchStatus: 'none'
    },
    {
      id: 8,
      title: '时空恋旅人',
      year: 2013,
      genre: ['爱情', '奇幻', '喜剧'],
      duration: 123,
      rating: 8.8,
      poster: '⏰',
      description: '穿越时空去恋爱，温暖治愈',
      tags: ['穿越', '治愈', '推荐'],
      watchStatus: 'none'
    }
  ],
  
  // 观影记录
  watchRecords: [],
  
  // 弹幕列表
  danmuList: [],
  
  // 当前播放的电影
  currentMovie: null,
  
  // 初始化
  init() {
    console.log('🎬 情侣电影院 v1.0 初始化...');
    this.loadData();
    this.createCinemaUI();
    this.bindEvents();
    console.log('✅ 情侣电影院初始化完成');
  },
  
  // 加载数据
  loadData() {
    const savedRecords = localStorage.getItem('cinema_watchRecords');
    if (savedRecords) {
      this.watchRecords = JSON.parse(savedRecords);
    }
    
    const savedDanmu = localStorage.getItem('cinema_danmuList');
    if (savedDanmu) {
      this.danmuList = JSON.parse(savedDanmu);
    }
    
    // 同步观影记录到数字典藏册
    this.syncToCollection();
  },
  
  // 保存数据
  saveData() {
    localStorage.setItem('cinema_watchRecords', JSON.stringify(this.watchRecords));
    localStorage.setItem('cinema_danmuList', JSON.stringify(this.danmuList));
  },
  
  // 同步到数字典藏册
  syncToCollection() {
    if (typeof DigitalCollection !== 'undefined') {
      const cinemaCollection = {
        type: 'cinema',
        title: '情侣电影院观影记录',
        count: this.watchRecords.length,
        records: this.watchRecords,
        lastUpdate: new Date().toISOString()
      };
      DigitalCollection.addItem('cinema', cinemaCollection);
    }
  },
  
  // 创建电影院UI
  createCinemaUI() {
    // 创建电影院主界面
    const cinemaHTML = `
      <div id="couple-cinema" class="cinema-container" style="display:none;">
        <div class="cinema-header">
          <h2>🎬 情侣电影院</h2>
          <button class="cinema-close" onclick="CoupleCinema.close()">✕</button>
        </div>
        
        <div class="cinema-tabs">
          <button class="tab-btn active" data-tab="movie-list">📽️ 电影片库</button>
          <button class="tab-btn" data-tab="watch-records">📝 观影记录</button>
          <button class="tab-btn" data-tab="my-list">❤️ 我的片单</button>
          <button class="tab-btn" data-tab="now-playing">▶️ 正在播放</button>
        </div>
        
        <div class="cinema-content">
          <!-- 电影片库 -->
          <div class="tab-content active" id="tab-movie-list">
            <div class="movie-filters">
              <select id="filter-genre" onchange="CoupleCinema.filterMovies()">
                <option value="all">全部类型</option>
                <option value="爱情">爱情</option>
                <option value="动画">动画</option>
                <option value="科幻">科幻</option>
                <option value="喜剧">喜剧</option>
                <option value="剧情">剧情</option>
              </select>
              <select id="filter-status" onchange="CoupleCinema.filterMovies()">
                <option value="all">全部状态</option>
                <option value="none">未观看</option>
                <option value="wishlist">想看</option>
                <option value="watching">正在看</option>
                <option value="watched">已看完</option>
              </select>
            </div>
            <div class="movie-grid" id="movie-grid">
              ${this.renderMovieGrid()}
            </div>
          </div>
          
          <!-- 观影记录 -->
          <div class="tab-content" id="tab-watch-records">
            <div class="records-list" id="records-list">
              ${this.renderWatchRecords()}
            </div>
          </div>
          
          <!-- 我的片单 -->
          <div class="tab-content" id="tab-my-list">
            <div class="wishlist-container" id="wishlist-container">
              ${this.renderWishlist()}
            </div>
          </div>
          
          <!-- 正在播放 -->
          <div class="tab-content" id="tab-now-playing">
            <div class="player-container" id="player-container">
              ${this.renderPlayer()}
            </div>
          </div>
        </div>
        
        <!-- 弹幕输入 -->
        <div class="danmu-input-container">
          <input type="text" id="danmu-input" placeholder="发个弹幕吧~" maxlength="50">
          <button onclick="CoupleCinema.sendDanmu()">发送</button>
        </div>
        
        <!-- 弹幕显示区 -->
        <div class="danmu-display" id="danmu-display"></div>
      </div>
    `;
    
    document.body.insertAdjacentHTML('beforeend', cinemaHTML);
    this.addCinemaStyles();
  },
  
  // 渲染电影网格
  renderMovieGrid() {
    const filteredMovies = this.getFilteredMovies();
    
    if (filteredMovies.length === 0) {
      return '<div class="no-movies">暂无电影，去添加吧~</div>';
    }
    
    return filteredMovies.map(movie => `
      <div class="movie-card" data-id="${movie.id}">
        <div class="movie-poster">${movie.poster}</div>
        <div class="movie-info">
          <h3>${movie.title}</h3>
          <p class="movie-year">${movie.year}</p>
          <p class="movie-rating">⭐ ${movie.rating}</p>
          <p class="movie-genre">${movie.genre.join(' / ')}</p>
          <p class="movie-desc">${movie.description}</p>
          <div class="movie-tags">
            ${movie.tags.map(tag => `<span class="tag">${tag}</span>`).join('')}
          </div>
          <div class="movie-actions">
            ${this.getWatchStatusButtons(movie)}
          </div>
        </div>
      </div>
    `).join('');
  },
  
  // 获取过滤后的电影
  getFilteredMovies() {
    const genreFilter = document.getElementById('filter-genre')?.value || 'all';
    const statusFilter = document.getElementById('filter-status')?.value || 'all';
    
    return this.movieDatabase.filter(movie => {
      let genreMatch = genreFilter === 'all' || movie.genre.includes(genreFilter);
      let statusMatch = statusFilter === 'all' || movie.watchStatus === statusFilter;
      return genreMatch && statusMatch;
    });
  },
  
  // 过滤电影
  filterMovies() {
    const movieGrid = document.getElementById('movie-grid');
    if (movieGrid) {
      movieGrid.innerHTML = this.renderMovieGrid();
      this.bindMovieEvents();
    }
  },
  
  // 获取观看状态按钮
  getWatchStatusButtons(movie) {
    const status = movie.watchStatus;
    
    let buttons = '';
    
    if (status === 'none' || status === 'wishlist') {
      buttons += `<button class="btn-wishlist" onclick="CoupleCinema.addToWishlist(${movie.id})">❤️ 想看</button>`;
    }
    
    if (status === 'none' || status === 'wishlist' || status === 'watching') {
      buttons += `<button class="btn-watching" onclick="CoupleCinema.markAsWatching(${movie.id})">▶️ 在看</button>`;
    }
    
    if (status === 'watching' || status === 'watched') {
      buttons += `<button class="btn-watched" onclick="CoupleCinema.markAsWatched(${movie.id})">✅ 看完</button>`;
    }
    
    if (status === 'watched') {
      buttons += `<button class="btn-review" onclick="CoupleCinema.writeReview(${movie.id})">✍️ 写影评</button>`;
    }
    
    buttons += `<button class="btn-play" onclick="CoupleCinema.playMovie(${movie.id})">🎬 播放</button>`;
    
    return buttons;
  },
  
  // 添加到想看片单
  addToWishlist(movieId) {
    const movie = this.movieDatabase.find(m => m.id === movieId);
    if (movie) {
      movie.watchStatus = 'wishlist';
      this.saveData();
      this.filterMovies();
      this.showNotification(`✅ 已添加到想看片单：${movie.title}`);
    }
  },
  
  // 标记为正在看
  markAsWatching(movieId) {
    const movie = this.movieDatabase.find(m => m.id === movieId);
    if (movie) {
      movie.watchStatus = 'watching';
      
      // 添加观影记录
      this.watchRecords.unshift({
        movieId: movie.id,
        movieTitle: movie.title,
        status: 'watching',
        startTime: new Date().toISOString(),
        endTime: null,
        review: '',
        rating: 0
      });
      
      this.saveData();
      this.filterMovies();
      this.showNotification(`▶️ 开始观看：${movie.title}`);
    }
  },
  
  // 标记为已看完
  markAsWatched(movieId) {
    const movie = this.movieDatabase.find(m => m.id === movieId);
    if (movie) {
      movie.watchStatus = 'watched';
      
      // 更新观影记录
      const record = this.watchRecords.find(r => r.movieId === movieId && !r.endTime);
      if (record) {
        record.endTime = new Date().toISOString();
      } else {
        this.watchRecords.unshift({
          movieId: movie.id,
          movieTitle: movie.title,
          status: 'watched',
          startTime: new Date().toISOString(),
          endTime: new Date().toISOString(),
          review: '',
          rating: 0
        });
      }
      
      this.saveData();
      this.filterMovies();
      this.syncToCollection();
      this.showNotification(`🎉 恭喜看完：${movie.title}`);
    }
  },
  
  // 写影评
  writeReview(movieId) {
    const movie = this.movieDatabase.find(m => m.id === movieId);
    if (!movie) return;
    
    const review = prompt(`写影评：${movie.title}`);
    const rating = prompt('打分（1-10）', '8');
    
    if (review !== null) {
      const record = this.watchRecords.find(r => r.movieId === movieId);
      if (record) {
        record.review = review;
        record.rating = parseInt(rating) || 8;
      }
      
      this.saveData();
      this.showNotification(`✍️ 影评已保存：${movie.title}`);
    }
  },
  
  // 播放电影
  playMovie(movieId) {
    const movie = this.movieDatabase.find(m => m.id === movieId);
    if (!movie) return;
    
    this.currentMovie = movie;
    
    // 切换到播放标签
    this.switchTab('now-playing');
    
    // 更新播放器
    const playerContainer = document.getElementById('player-container');
    if (playerContainer) {
      playerContainer.innerHTML = this.renderPlayer();
    }
    
    // 开始弹幕
    this.startDanmu();
    
    this.showNotification(`🎬 正在播放：${movie.title}`);
  },
  
  // 渲染播放器
  renderPlayer() {
    if (!this.currentMovie) {
      return '<div class="no-player">请选择一部电影播放~</div>';
    }
    
    const movie = this.currentMovie;
    
    return `
      <div class="player-wrapper">
        <div class="player-screen">
          <div class="movie-placeholder">
            <div class="big-poster">${movie.poster}</div>
            <h2>${movie.title}</h2>
            <p>${movie.year} · ${movie.genre.join(' / ')} · ${movie.duration}分钟</p>
            <p class="movie-desc">${movie.description}</p>
            <div class="play-animation">▶️</div>
          </div>
        </div>
        <div class="player-info">
          <h3>正在播放：${movie.title}</h3>
          <p>⭐ 评分：${movie.rating}</p>
          <p>📝 简介：${movie.description}</p>
        </div>
      </div>
    `;
  },
  
  // 发送弹幕
  sendDanmu() {
    const input = document.getElementById('danmu-input');
    if (!input || !input.value.trim()) return;
    
    const danmu = {
      id: Date.now(),
      movieId: this.currentMovie?.id,
      movieTitle: this.currentMovie?.title,
      text: input.value.trim(),
      sender: '我',
      time: new Date().toISOString(),
      color: this.getRandomColor()
    };
    
    this.danmuList.push(danmu);
    this.saveData();
    this.displayDanmu(danmu);
    
    input.value = '';
  },
  
  // 显示弹幕
  displayDanmu(danmu) {
    const display = document.getElementById('danmu-display');
    if (!display) return;
    
    const danmuEl = document.createElement('div');
    danmuEl.className = 'danmu-item';
    danmuEl.style.color = danmu.color;
    danmuEl.textContent = `${danmu.sender}：${danmu.text}`;
    
    display.appendChild(danmuEl);
    
    // 动画：从右到左
    setTimeout(() => {
      danmuEl.style.transform = 'translateX(-100%)';
      danmuEl.style.opacity = '0';
    }, 100);
    
    // 移除
    setTimeout(() => {
      danmuEl.remove();
    }, 5000);
  },
  
  // 开始弹幕
  startDanmu() {
    // 显示历史弹幕
    const movieDanmu = this.danmuList.filter(d => d.movieId === this.currentMovie?.id);
    movieDanmu.forEach(danmu => {
      setTimeout(() => this.displayDanmu(danmu), Math.random() * 3000);
    });
  },
  
  // 获取随机颜色
  getRandomColor() {
    const colors = ['#ff6b9d', '#ffa64d', '#4da6ff', '#4dff4d', '#ff4dff', '#ffffff'];
    return colors[Math.floor(Math.random() * colors.length)];
  },
  
  // 渲染观影记录
  renderWatchRecords() {
    if (this.watchRecords.length === 0) {
      return '<div class="no-records">暂无观影记录，快去看电影吧~</div>';
    }
    
    return this.watchRecords.map(record => {
      const movie = this.movieDatabase.find(m => m.id === record.movieId);
      const poster = movie ? movie.poster : '🎬';
      
      return `
        <div class="record-card">
          <div class="record-poster">${poster}</div>
          <div class="record-info">
            <h3>${record.movieTitle}</h3>
            <p>状态：${record.status === 'watched' ? '✅ 已看完' : '▶️ 观看中'}</p>
            <p>开始时间：${new Date(record.startTime).toLocaleDateString()}</p>
            ${record.endTime ? `<p>完成时间：${new Date(record.endTime).toLocaleDateString()}</p>` : ''}
            ${record.rating ? `<p>评分：${'⭐'.repeat(record.rating)}</p>` : ''}
            ${record.review ? `<p class="review">影评：${record.review}</p>` : ''}
          </div>
        </div>
      `;
    }).join('');
  },
  
  // 渲染想看片单
  renderWishlist() {
    const wishlist = this.movieDatabase.filter(m => m.watchStatus === 'wishlist' || m.watchStatus === 'watching');
    
    if (wishlist.length === 0) {
      return '<div class="no-wishlist">暂无片单，去电影片库添加吧~</div>';
    }
    
    return `
      <h3>❤️ 想看/在看片单</h3>
      <div class="wishlist-grid">
        ${wishlist.map(movie => `
          <div class="wishlist-item">
            <div class="item-poster">${movie.poster}</div>
            <div class="item-info">
              <h4>${movie.title}</h4>
              <p>${movie.watchStatus === 'wishlist' ? '❤️ 想看' : '▶️ 在看'}</p>
            </div>
            <button onclick="CoupleCinema.playMovie(${movie.id})">播放</button>
          </div>
        `).join('')}
      </div>
    `;
  },
  
  // 切换标签
  switchTab(tabId) {
    // 更新标签按钮
    document.querySelectorAll('.cinema-tabs .tab-btn').forEach(btn => {
      btn.classList.toggle('active', btn.dataset.tab === tabId);
    });
    
    // 更新内容
    document.querySelectorAll('.cinema-content .tab-content').forEach(content => {
      content.classList.toggle('active', content.id === `tab-${tabId}`);
    });
  },
  
  // 绑定事件
  bindEvents() {
    // 标签切换
    document.querySelectorAll('.cinema-tabs .tab-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        this.switchTab(btn.dataset.tab);
      });
    });
    
    // 弹幕输入回车
    const danmuInput = document.getElementById('danmu-input');
    if (danmuInput) {
      danmuInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
          this.sendDanmu();
        }
      });
    }
  },
  
  // 绑定电影卡片事件
  bindMovieEvents() {
    // 已在内联onclick中处理
  },
  
  // 打开电影院
  open() {
    const cinema = document.getElementById('couple-cinema');
    if (cinema) {
      cinema.style.display = 'flex';
      document.body.style.overflow = 'hidden';
    }
  },
  
  // 关闭电影院
  close() {
    const cinema = document.getElementById('couple-cinema');
    if (cinema) {
      cinema.style.display = 'none';
      document.body.style.overflow = '';
    }
  },
  
  // 显示通知
  showNotification(message) {
    if (typeof WelcomeSystem !== 'undefined' && WelcomeSystem.showNotification) {
      WelcomeSystem.showNotification(message);
    } else {
      alert(message);
    }
  },
  
  // 添加样式
  addCinemaStyles() {
    if (document.getElementById('cinema-styles')) return;
    
    const styles = `
      <style id="cinema-styles">
        .cinema-container {
          position: fixed;
          top: 0;
          left: 0;
          width: 100%;
          height: 100%;
          background: linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%);
          z-index: 10001;
          display: flex;
          flex-direction: column;
          color: white;
        }
        
        .cinema-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 20px 30px;
          background: rgba(0,0,0,0.3);
        }
        
        .cinema-header h2 {
          margin: 0;
          font-size: 28px;
        }
        
        .cinema-close {
          background: rgba(255,255,255,0.2);
          border: none;
          color: white;
          width: 40px;
          height: 40px;
          border-radius: 50%;
          font-size: 20px;
          cursor: pointer;
          transition: all 0.3s;
        }
        
        .cinema-close:hover {
          background: rgba(255,255,255,0.3);
          transform: rotate(90deg);
        }
        
        .cinema-tabs {
          display: flex;
          gap: 10px;
          padding: 15px 30px;
          background: rgba(0,0,0,0.2);
        }
        
        .cinema-tabs .tab-btn {
          padding: 10px 20px;
          border: none;
          background: rgba(255,255,255,0.1);
          color: white;
          border-radius: 20px;
          cursor: pointer;
          transition: all 0.3s;
        }
        
        .cinema-tabs .tab-btn.active,
        .cinema-tabs .tab-btn:hover {
          background: rgba(255,255,255,0.3);
        }
        
        .cinema-content {
          flex: 1;
          overflow-y: auto;
          padding: 30px;
        }
        
        .tab-content {
          display: none;
        }
        
        .tab-content.active {
          display: block;
        }
        
        .movie-filters {
          display: flex;
          gap: 15px;
          margin-bottom: 20px;
        }
        
        .movie-filters select {
          padding: 10px 15px;
          border: none;
          border-radius: 10px;
          background: rgba(255,255,255,0.9);
          font-size: 14px;
        }
        
        .movie-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
          gap: 20px;
        }
        
        .movie-card {
          background: rgba(255,255,255,0.1);
          border-radius: 15px;
          padding: 20px;
          backdrop-filter: blur(10px);
          transition: all 0.3s;
        }
        
        .movie-card:hover {
          transform: translateY(-5px);
          background: rgba(255,255,255,0.15);
        }
        
        .movie-poster {
          font-size: 60px;
          text-align: center;
          margin-bottom: 15px;
        }
        
        .movie-info h3 {
          margin: 0 0 10px 0;
          font-size: 18px;
        }
        
        .movie-year,
        .movie-rating,
        .movie-genre {
          margin: 5px 0;
          font-size: 14px;
          opacity: 0.9;
        }
        
        .movie-desc {
          font-size: 13px;
          opacity: 0.8;
          margin: 10px 0;
          line-height: 1.4;
        }
        
        .movie-tags {
          display: flex;
          flex-wrap: wrap;
          gap: 5px;
          margin: 10px 0;
        }
        
        .movie-tags .tag {
          padding: 3px 10px;
          background: rgba(255,255,255,0.2);
          border-radius: 10px;
          font-size: 12px;
        }
        
        .movie-actions {
          display: flex;
          flex-wrap: wrap;
          gap: 8px;
          margin-top: 15px;
        }
        
        .movie-actions button {
          padding: 8px 15px;
          border: none;
          border-radius: 15px;
          background: rgba(255,255,255,0.2);
          color: white;
          cursor: pointer;
          font-size: 13px;
          transition: all 0.3s;
        }
        
        .movie-actions button:hover {
          background: rgba(255,255,255,0.3);
        }
        
        .danmu-input-container {
          display: flex;
          gap: 10px;
          padding: 15px 30px;
          background: rgba(0,0,0,0.3);
        }
        
        .danmu-input-container input {
          flex: 1;
          padding: 10px 15px;
          border: none;
          border-radius: 20px;
          font-size: 14px;
        }
        
        .danmu-input-container button {
          padding: 10px 25px;
          border: none;
          border-radius: 20px;
          background: linear-gradient(45deg, #ff6b9d, #ffa64d);
          color: white;
          cursor: pointer;
          font-weight: bold;
        }
        
        .danmu-display {
          position: absolute;
          top: 100px;
          right: 30px;
          width: 300px;
          height: 400px;
          pointer-events: none;
          overflow: hidden;
        }
        
        .danmu-item {
          position: absolute;
          right: -300px;
          white-space: nowrap;
          font-size: 16px;
          font-weight: bold;
          text-shadow: 2px 2px 4px rgba(0,0,0,0.5);
          transition: all 5s linear;
          margin: 10px 0;
        }
        
        .records-list,
        .wishlist-container {
          display: flex;
          flex-direction: column;
          gap: 15px;
        }
        
        .record-card,
        .wishlist-item {
          display: flex;
          gap: 15px;
          background: rgba(255,255,255,0.1);
          border-radius: 15px;
          padding: 15px;
          backdrop-filter: blur(10px);
        }
        
        .record-poster,
        .item-poster {
          font-size: 40px;
          width: 60px;
          text-align: center;
        }
        
        .record-info,
        .item-info {
          flex: 1;
        }
        
        .record-info h3,
        .item-info h4 {
          margin: 0 0 10px 0;
        }
        
        .record-info p,
        .item-info p {
          margin: 5px 0;
          font-size: 14px;
          opacity: 0.9;
        }
        
        .review {
          font-style: italic;
          opacity: 0.8;
        }
        
        .player-container {
          display: flex;
          justify-content: center;
          align-items: center;
          min-height: 500px;
        }
        
        .player-wrapper {
          background: rgba(0,0,0,0.5);
          border-radius: 20px;
          padding: 30px;
          max-width: 800px;
          width: 100%;
        }
        
        .player-screen {
          background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%);
          border-radius: 15px;
          padding: 50px;
          margin-bottom: 20px;
        }
        
        .movie-placeholder {
          text-align: center;
        }
        
        .big-poster {
          font-size: 100px;
          margin-bottom: 20px;
        }
        
        .movie-placeholder h2 {
          font-size: 32px;
          margin: 10px 0;
        }
        
        .movie-placeholder p {
          font-size: 16px;
          opacity: 0.8;
          margin: 5px 0;
        }
        
        .play-animation {
          font-size: 60px;
          margin-top: 30px;
          animation: pulse 2s ease-in-out infinite;
        }
        
        @keyframes pulse {
          0%, 100% { transform: scale(1); opacity: 0.7; }
          50% { transform: scale(1.2); opacity: 1; }
        }
        
        .no-movies,
        .no-records,
        .no-wishlist,
        .no-player {
          text-align: center;
          padding: 50px;
          font-size: 18px;
          opacity: 0.7;
        }
      </style>
    `;
    
    document.head.insertAdjacentHTML('beforeend', styles);
  }
};

// 页面加载后初始化（已禁用 - 改为手动触发）
// 这些模块不再自动显示在主页，只在用户点击"更多"菜单时才显示
/*
document.addEventListener('DOMContentLoaded', () => {
  setTimeout(() => {
    CoupleCinema.init();
  }, 2000);
});
*/

// 手动触发函数（供"更多"菜单调用）
window.initCoupleCinemaManual = function() {
    if (!CoupleCinema.inited) {
        CoupleCinema.init();
    } else {
        console.log('[情侣电影院] 已经初始化');
    }
};

// 导出
window.CoupleCinema = CoupleCinema;
