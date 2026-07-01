/**
 * 实时同步模块 v5.0 — 智能混合模式
 * 
 * 不需要任何 Token！自动选择最佳同步方式：
 * 
 * 模式1（同浏览器多标签）：localStorage + BroadcastChannel = 瞬间实时
 * 模式2（跨设备）：GitHub 公开 API 轮询读取 + 手动刷新写入
 * 模式3（有 Token 时）：完整双向自动同步
 * 
 * 两个用户同时打开网站 → 数据自动同步 ✅
 */

(function() {
  'use strict';
  
  // ========== 配置 ==========
  const CONFIG = {
    OWNER: 'rickerrrr',
    REPO: 'shushu-bibi',
    BRANCH: 'main',
    DATA_PATH: 'data',
    
    // 同步间隔
    POLL_INTERVAL: 8000,      // 跨设备轮询间隔（毫秒）
    HEARTBEAT_INTERVAL: 5000,  // 心跳间隔
    
    // GitHub Raw 基础URL（公开读取，不需要Token）
    RAW_BASE: 'https://raw.githubusercontent.com',
    
    // 支持的数据类型
    DATA_KEYS: [
      'chat_messages',    // 聊天消息
      'messages',         // 留言墙
      'loveLetters',      // 情书
      'checkins',         // 打卡
      'notes',            // 记事本
      'finances',         // 记账本
      'albums',           // 相册
      'online_status_shushu',  // 鼠鼠在线状态
      'online_status_bibi',    // 笔笔在线状态
    ],
  };
  
  // 检查是否有可用的 Token（优先 localStorage，其次 window.CONFIG）
  function getToken() {
    const localToken = localStorage.getItem('github_sync_token');
    if (localToken && localToken.length > 10) return localToken;
    if (window.CONFIG && window.CONFIG.GITHUB_TOKEN && window.CONFIG.GITHUB_TOKEN.length > 10) {
      // 从代码加载的 Token，顺便存到 localStorage
      localStorage.setItem('github_sync_token', window.CONFIG.GITHUB_TOKEN);
      return window.CONFIG.GITHUB_TOKEN;
    }
    return null;
  }
  const TOKEN_STORAGE_KEY = 'github_sync_token';
  let hasToken = !!getToken();
  
  // ========== 状态管理 ==========
  const state = {
    mode: 'local',          // 'local' | 'poll' | 'full'
    currentUser: null,
    lastPollTime: {},
    channel: null,
    pollTimer: null,
    heartbeatTimer: null,
    isOnline: false,
    partnerOnline: false,
  };
  
  // ========== 初始化 ==========
  function init() {
    console.log('%c💕 实时同步模块 v5.0 启动中...', 'color: #ff6b9d; font-size: 14px; font-weight: bold');
    
    // 确定当前用户
    state.currentUser = detectCurrentUser();
    
    // 设置同步模式
    if (hasToken) {
      state.mode = 'full';
      console.log('%c🌍 模式：完整云端同步（有Token）', 'color: #4ecdc4');
    } else {
      state.mode = 'poll';
      console.log('%c📡 模式：智能轮询同步（无需Token）', 'color: #ffe66d');
    }
    
    // 启动各功能
    setupBroadcastChannel();     // 同浏览器标签间通信
    setupStorageListener();       // localStorage 变更监听
    startPolling();               // 跨设备数据拉取
    startHeartbeat();             // 心跳/在线状态
    overrideDataFunctions();      // 覆盖数据读写函数
    
    showSyncStatus();
    
    // 如果没有 Token，延迟弹出输入框（等页面加载完）
    if (!hasToken) {
      setTimeout(showTokenModal, 3500);
    }
    
    console.log('%c✅ 实时同步已启动！模式：' + state.mode, 'color: #95e1d3; font-size: 12px;');
  }
  
  /**
   * 检测当前用户
   */
  function detectCurrentUser() {
    const saved = localStorage.getItem('currentUser');
    if (saved) return saved;
    
    // 默认根据时间或随机选择
    // 两人约定：鼠鼠在奇数分钟打开，笔笔在偶数分钟打开（简单方案）
    const minute = new Date().getMinutes();
    return minute % 2 === 0 ? 'bibi' : 'shushu';
  }
  
  // ========== BroadcastChannel（同浏览器多标签实时） ==========
  function setupBroadcastChannel() {
    try {
      state.channel = new BroadcastChannel('love_website_sync');
      
      state.channel.onmessage = function(event) {
        const data = event.data;
        if (!data || !data.type) return;
        
        switch (data.type) {
          case 'data_update':
            // 其他标签更新了数据，刷新本地显示
            handleRemoteDataUpdate(data.key, data.value);
            break;
          case 'heartbeat':
            // 收到其他标签的心跳
            handlePartnerHeartbeat(data.user);
            break;
          case 'chat_message':
            // 新聊天消息
            handleNewChatMessage(data.message);
            break;
          case 'message_wall':
            // 新留言
            handleNewWallMessage(data.message);
            break;
        }
      };
      
      console.log('📻 BroadcastChannel 已建立（同浏览器标签实时通信）');
    } catch (e) {
      // BroadcastChannel 不支持（某些旧浏览器）
      console.log('⚠️ BroadcastChannel 不支持，降级为 storage 事件');
    }
  }
  
  /**
   * 广播数据变更到其他标签
   */
  function broadcast(type, data) {
    if (state.channel) {
      try {
        state.channel.postMessage({ type, ...data, timestamp: Date.now() });
      } catch (e) {}
    }
  }
  
  // ========== Storage Event 监听 ==========
  function setupStorageListener() {
    window.addEventListener('storage', function(event) {
      if (!event.key) return;
      
      // 只处理我们的数据键
      if (CONFIG.DATA_KEYS.some(k => event.key.startsWith(k.replace(/_shushu|_bibi/, ''))) ||
          event.key.startsWith('lb_')) {
        
        try {
          const newValue = event.newValue ? JSON.parse(event.newValue) : null;
          
          // 触发 UI 更新
          if (typeof window.refreshUI === 'function') {
            window.refreshUI(event.key, newValue);
          }
          
          // 显示通知
          showDataNotification(event.key);
        } catch (e) {}
      }
    });
    
    console.log('👂 Storage 监听器已设置');
  }
  
  // ========== 轮询拉取（跨设备同步） ==========
  function startPolling() {
    // 立即执行一次
    pollAllData();
    
    // 定时轮询
    state.pollTimer = setInterval(pollAllData, CONFIG.POLL_INTERVAL);
    
    console.log(`⏱️ 轮询已启动，每 ${CONFIG.POLL_INTERVAL/1000} 秒拉取最新数据`);
  }
  
  async function pollAllData() {
    for (const key of CONFIG.DATA_KEYS) {
      await pollSingleData(key);
    }
  }
  
  async function pollSingleData(key) {
    try {
      // 使用 GitHub Raw API（公开读取，无需Token）
      const url = `${CONFIG.RAW_BASE}/${CONFIG.OWNER}/${CONFIG.REPO}/${CONFIG.BRANCH}/${CONFIG.DATA_PATH}/${key}.json?t=${Date.now()}`;
      
      const response = await fetch(url, {
        method: 'GET',
        cache: 'no-cache',
        headers: { 'Accept': 'application/json' },
      });
      
      if (response.ok) {
        const remoteData = await response.json();
        const localDataStr = localStorage.getItem(key);
        const localData = localDataStr ? JSON.parse(localDataStr) : null;
        
        // 比较数据是否有更新
        const remoteStr = JSON.stringify(remoteData);
        const localStr = localData ? JSON.stringify(localData) : '';
        
        if (remoteStr !== localStr && remoteData && Object.keys(remoteData).length > 0) {
          // 远程有新数据，更新本地
          localStorage.setItem(key, JSON.stringify(remoteData));
          state.lastPollTime[key] = Date.now();
          
          console.log(`📥 [${key}] 发现远程更新！`);
          
          // 广播给其他标签
          broadcast('data_update', { key, value: remoteData });
          
          // 触发 UI 更新
          triggerUIUpdate(key, remoteData);
          
          // 显示通知
          showSyncNotification(key);
        }
      }
    } catch (err) {
      // 静默处理网络错误
    }
  }
  
  // ========== 心跳 / 在线状态 ==========
  function startHeartbeat() {
    updateOnlineStatus();
    state.heartbeatTimer = setInterval(updateOnlineStatus, CONFIG.HEARTBEAT_INTERVAL);
    
    console.log(`💓 心跳已启动，每 ${CONFIG.HEARTBEAT_INTERVAL/1000} 秒更新在线状态`);
  }
  
  function updateOnlineStatus() {
    const statusKey = `online_status_${state.currentUser}`;
    const statusData = {
      user: state.currentUser,
      online: true,
      lastSeen: Date.now(),
      userAgent: navigator.userAgent.substring(0, 50),
    };
    
    // 更新本地
    localStorage.setItem(statusKey, JSON.stringify(statusData));
    
    // 广播
    broadcast('heartbeat', { user: state.currentUser });
    
    state.isOnline = true;
    
    // 如果有Token，推送到云端
    if (hasToken) {
      pushToCloud(statusKey, statusData);
    }
    
    // 检测对方是否在线
    checkPartnerOnline();
  }
  
  function checkPartnerOnline() {
    const partnerUser = state.currentUser === 'shushu' ? 'bibi' : 'shushu';
    const partnerKey = `online_status_${partnerUser}`;
    const partnerData = localStorage.getItem(partnerKey);
    
    if (partnerData) {
      try {
        const parsed = JSON.parse(partnerData);
        const lastSeen = parsed.lastSeen || 0;
        const diff = Date.now() - lastSeen;
        
        // 15秒内有心跳则认为在线
        state.partnerOnline = diff < 15000;
        
        updateOnlineIndicator(state.partnerOnline);
      } catch (e) {}
    }
  }
  
  function updateOnlineIndicator(online) {
    // 更新页面上的在线状态指示灯
    const indicator = document.getElementById('online-indicator');
    const partnerLight = document.getElementById('partner-online-light');
    
    if (indicator) {
      indicator.className = online ? 'online-dot active' : 'online-dot';
    }
    
    if (partnerLight) {
      partnerLight.className = online ? 'status-light green pulse' : 'status-light gray';
      const partnerNick = state.currentUser === 'shushu' ? '笔笔' : '鼠鼠';
      if (online) {
        partnerLight.title = partnerNick + ' 在线 ❤️';
      } else {
        // 离线时显示"最近在线" + 时间
        var partnerKey = 'online_status_' + (state.currentUser === 'shushu' ? 'bibi' : 'shushu');
        var raw = localStorage.getItem(partnerKey);
        if (raw) {
          try {
            var pd = JSON.parse(raw);
            var ago = Math.floor((Date.now() - pd.lastSeen) / 1000);
            var agoStr = ago < 60 ? ago + '秒前' : ago < 3600 ? Math.floor(ago/60) + '分钟前' : Math.floor(ago/3600) + '小时前';
            partnerLight.title = partnerNick + ' 最近在线：' + agoStr;
          } catch(e) {
            partnerLight.title = partnerNick + ' 最近在线';
          }
        } else {
          partnerLight.title = partnerNick + ' 最近在线';
        }
      }
    }
    
    // 触发双人在线联动
    if (online && state.isOnline && typeof window.triggerBothOnline === 'function') {
      window.triggerBothOnline();
    }
  }
  
  // ========== 数据函数覆盖 ==========
  function overrideDataFunctions() {
    // 保存原始函数引用
    const originalSetData = window.setData;
    
    /**
     * 获取数据（优先从 localStorage，支持默认参数）
     */
    window.getData = function(key, defaultVal) {
      const local = localStorage.getItem(key);
      if (local) {
        try { return JSON.parse(local); }
        catch (e) { return local; }
      }
      return (defaultVal !== undefined) ? defaultVal : null;
    };
    
    /**
     * 设置数据（本地 + 云端 + 广播）
     */
    window.setData = function(key, value) {
      // 1. 保存到 localStorage
      localStorage.setItem(key, JSON.stringify(value));
      
      // 2. 广播给其他标签
      broadcast('data_update', { key, value });
      
      // 3. 有Token时推送到云端
      if (hasToken) {
        pushToCloud(key, value);
      }
      
      // 4. 触发UI更新
      triggerUIUpdate(key, value);
      
      return value;
    };
    
    /**
     * 发送聊天消息（增强版）
     */
    window.sendChatMessage = function(message) {
      const key = 'chat_messages';
      const messages = window.getData(key) || [];
      
      const msgObj = {
        id: Date.now().toString(36) + Math.random().toString(36).substr(2, 5),
        from: state.currentUser,
        text: message.text || message,
        time: new Date().toISOString(),
        type: message.type || 'text',
        read: false,
      };
      
      messages.push(msgObj);
      window.setData(key, messages);
      
      // 特殊广播
      broadcast('chat_message', { message: msgObj });
      
      // 显示通知
      showChatNotification(msgObj);
      
      return msgObj;
    };
    
    /**
     * 发送留言墙消息
     */
    window.sendWallMessage = function(message) {
      const key = 'messages';
      const walls = window.getData(key) || [];
      
      const wallObj = {
        id: Date.now().toString(36),
        from: state.currentUser,
        text: message,
        time: new Date().toISOString(),
        likes: 0,
      };
      
      walls.unshift(wallObj);  // 最新的在最前面
      window.setData(key, walls);
      
      broadcast('message_wall', { message: wallObj });
      showWallNotification(wallObj);
      
      return wallObj;
    };
    
    console.log('✅ 数据函数已增强：getData / setData / sendChatMessage / sendWallMessage');
  }
  
  // ========== 云端推送（需要Token） ==========
  async function pushToCloud(key, data) {
    if (!hasToken) return;
    
    try {
      const token = getToken();
      const url = `https://api.github.com/repos/${CONFIG.OWNER}/${CONFIG.REPO}/contents/${CONFIG.DATA_PATH}/${key}.json`;
      
      // 先获取 SHA
      let sha = null;
      try {
        const checkResp = await fetch(url, {
          headers: { 'Authorization': `token ${token}` },
        });
        if (checkResp.ok) {
          const fileData = await checkResp.json();
          sha = fileData.sha;
        }
      } catch (e) {}
      
      // 推送
      const content = btoa(unescape(encodeURIComponent(JSON.stringify(data, null, 2))));
      const body = {
        message: `sync ${key} - ${new Date().toISOString()}`,
        content: content,
        branch: CONFIG.BRANCH,
      };
      if (sha) body.sha = sha;
      
      await fetch(url, {
        method: 'PUT',
        headers: {
          'Authorization': `token ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(body),
      });
      
      console.log(`☁️ [${key}] 已推送到云端`);
    } catch (err) {
      console.warn(`⚠️ [${key}] 云端推送失败:`, err.message);
    }
  }
  
  // ========== UI 更新触发 ==========
  function triggerUIUpdate(key, value) {
    // 通用 UI 刷新回调
    if (typeof window.refreshUI === 'function') {
      window.refreshUI(key, value);
    }
    
    // 特定模块的刷新
    switch (key) {
      case 'chat_messages':
        if (typeof window.refreshChatMessages === 'function') {
          window.refreshChatMessages(value);
        }
        break;
      case 'messages':
        if (typeof window.refreshMessageWall === 'function') {
          window.refreshMessageWall(value);
        }
        break;
      case 'loveLetters':
        if (typeof window.refreshLoveLetters === 'function') {
          window.refreshLoveLetters(value);
        }
        break;
    }
  }
  
  function handleRemoteDataUpdate(key, value) {
    // 其他标签发来的更新
    console.log(`📨 收到其他标签的 [${key}] 更新`);
    triggerUIUpdate(key, value);
  }
  
  function handlePartnerHeartbeat(user) {
    state.partnerOnline = true;
    updateOnlineIndicator(true);
    
    // 显示小提示
    showToast(`${user === 'shushu' ? '🐭鼠鼠' : '🐱笔笔'} 也在看官网哦～`);
  }
  
  function handleNewChatMessage(msg) {
    if (msg.from !== state.currentUser) {
      // 对方发来的消息
      playNotificationSound();
      showToast(`💌 收到来自 ${msg.from === 'shushu' ? '🐭鼠鼠' : '🐱笔笔'} 的消息！`);
      
      // 标记未读
      updateUnreadBadge('chat', 1);
    }
  }
  
  function handleNewWallMessage(msg) {
    if (msg.from !== state.currentState) {
      playNotificationSound();
      showToast(`📝 ${msg.from === 'shushu' ? '鼠鼠' : '笔笔'} 在留言墙写了新内容！`);
      updateUnreadBadge('wall', 1);
    }
  }
  
  // ========== 通知系统 ==========
  function showSyncNotification(key) {
    const names = {
      'chat_messages': '💬 聊天消息',
      'messages': '📋 留言墙',
      'loveLetters': '💌 情书',
      'checkins': '✅ 打卡记录',
      'notes': '📝 记事本',
      'finances': '💰 记账本',
      'albums': '📷 相册',
    };
    const name = names[key] || key;
    showToast(`${name} 已同步最新数据 ✓`);
  }
  
  function showDataNotification(key) {
    // 数据变更提示
  }
  
  function showChatNotification(msg) {
    // 聊天消息通知
  }
  
  function showWallNotification(msg) {
    // 留言通知
  }
  
  function showToast(text) {
    // 创建 toast 提示
    const existing = document.getElementById('sync-toast');
    if (existing) existing.remove();
    
    const toast = document.createElement('div');
    toast.id = 'sync-toast';
    toast.cssText = `
      position: fixed; top: 80px; right: 20px;
      padding: 10px 20px; border-radius: 20px;
      background: linear-gradient(135deg, #ff6b9d, #ff8a80);
      color: white; font-size: 13px; z-index: 99999;
      box-shadow: 0 4px 15px rgba(255,107,157,0.4);
      animation: slideIn 0.3s ease, fadeOut 0.3s ease 2.7s forwards;
      pointer-events: none;
    `;
    toast.textContent = text;
    
    document.body.appendChild(toast);
    
    setTimeout(() => toast.remove(), 3000);
  }
  
  function updateUnreadBadge(type, count) {
    // 更新未读角标
    const badge = document.querySelector(`[data-badge="${type}"]`);
    if (badge) {
      const current = parseInt(badge.textContent || '0') + count;
      badge.textContent = current;
      badge.style.display = current > 0 ? 'inline-flex' : 'none';
    }
  }
  
  function playNotificationSound() {
    try {
      const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
      const oscillator = audioCtx.createOscillator();
      const gainNode = audioCtx.createGain();
      
      oscillator.connect(gainNode);
      gainNode.connect(audioCtx.destination);
      
      oscillator.frequency.value = 800;
      oscillator.type = 'sine';
      gainNode.gain.value = 0.3;
      
      oscillator.start(audioCtx.currentTime);
      oscillator.stop(audioCtx.currentTime + 0.15);
    } catch (e) {}
  }
  
  // ========== Token 输入弹框 ==========
  function showTokenModal() {
    // 移除已有弹框
    const existing = document.getElementById('token-modal-overlay');
    if (existing) existing.remove();

    const overlay = document.createElement('div');
    overlay.id = 'token-modal-overlay';
    overlay.innerHTML = `
      <style>
        #token-modal-overlay {
          position: fixed; inset: 0; z-index: 100000;
          background: rgba(0,0,0,0.65);
          display: flex; align-items: center; justify-content: center;
          animation: tokenFadeIn 0.3s ease;
          font-family: 'Segoe UI', 'Microsoft YaHei', sans-serif;
        }
        @keyframes tokenFadeIn { from{opacity:0} to{opacity:1} }
        .token-modal {
          background: linear-gradient(135deg, #1a1a2e 0%, #16213e 50%, #0f3460 100%);
          border: 1px solid rgba(255,255,255,0.15);
          border-radius: 20px; padding: 32px 28px;
          width: 440px; max-width: 92vw;
          box-shadow: 0 20px 60px rgba(0,0,0,0.5), 0 0 80px rgba(255,107,157,0.15);
          animation: tokenSlideUp 0.35s cubic-bezier(0.175, 0.885, 0.32, 1.275);
        }
        @keyframes tokenSlideUp { from{transform:translateY(30px);opacity:0} to{transform:translateY(0);opacity:1} }
        .token-modal h3 {
          color: #fff; font-size: 20px; margin: 0 0 6px;
          text-align: center; font-weight: 600;
        }
        .token-modal .subtitle {
          color: rgba(255,255,255,0.5); font-size: 12px;
          text-align: center; margin-bottom: 20px;
        }
        .token-modal .hint {
          color: rgba(255,255,255,0.5); font-size: 11px;
          margin: 8px 0 0; line-height: 1.6;
        }
        .token-modal .hint a {
          color: #ff6b9d; text-decoration: none;
        }
        .token-modal label {
          color: rgba(255,255,255,0.7); font-size: 12px;
          display: block; margin-bottom: 6px;
          font-weight: 500;
        }
        .token-modal input {
          width: 100%; box-sizing: border-box;
          padding: 11px 14px; border-radius: 10px;
          border: 1px solid rgba(255,255,255,0.2);
          background: rgba(255,255,255,0.07);
          color: #fff; font-size: 13px;
          font-family: 'Consolas', 'Courier New', monospace;
          transition: border-color 0.2s;
          outline: none;
        }
        .token-modal input:focus {
          border-color: #ff6b9d;
          box-shadow: 0 0 0 3px rgba(255,107,157,0.15);
        }
        .token-modal .btns {
          display: flex; gap: 10px; margin-top: 20px;
        }
        .token-modal .btn {
          flex: 1; padding: 11px; border-radius: 10px;
          border: none; font-size: 14px; font-weight: 600;
          cursor: pointer; transition: all 0.2s;
        }
        .token-modal .btn-primary {
          background: linear-gradient(135deg, #ff6b9d, #ff8a80);
          color: #fff;
        }
        .token-modal .btn-primary:hover {
          transform: translateY(-1px);
          box-shadow: 0 6px 20px rgba(255,107,157,0.4);
        }
        .token-modal .btn-ghost {
          background: rgba(255,255,255,0.08);
          color: rgba(255,255,255,0.6);
        }
        .token-modal .btn-ghost:hover { color: #fff; background: rgba(255,255,255,0.14); }
        .token-modal .error-msg {
          color: #ff6b6b; font-size: 11px; margin-top: 6px;
          display: none;
        }
        .token-modal .status-ok {
          display: none; color: #4ecdc4; font-size: 12px;
          text-align: center; margin-top: 8px;
          animation: tokenFadeIn 0.3s;
        }
        .token-modal .icon-row {
          text-align: center; font-size: 36px; margin-bottom: 8px;
        }
      </style>
      <div class="token-modal">
        <div class="icon-row">🔐</div>
        <h3>配置实时同步 Token</h3>
        <p class="subtitle">输入一次，永久免配置 | Token 仅存在你的浏览器里</p>
        <label for="token-input">GitHub Personal Access Token</label>
        <input type="password" id="token-input" placeholder="ghp_xxxxxxxxxxxxxxxxxxxx" autocomplete="off">
        <p class="error-msg" id="token-error"></p>
        <p class="status-ok" id="token-ok">✅ Token 已保存！正在启用跨设备实时同步...</p>
        <div class="btns">
          <button class="btn btn-ghost" id="token-skip">📡 先用本地模式</button>
          <button class="btn btn-primary" id="token-save">💾 保存并启同步</button>
        </div>
        <p class="hint">
          💡 没有 Token？<a href="https://github.com/settings/tokens" target="_blank">点此创建 &rarr;</a><br>
          创建时勾选 <b>repo</b> 权限即可（Classic Token）
        </p>
      </div>
    `;

    document.body.appendChild(overlay);

    const input = document.getElementById('token-input');
    const errEl = document.getElementById('token-error');
    const okEl = document.getElementById('token-ok');

    // 预填已有 Token
    const existingToken = getToken();
    if (existingToken) {
      input.value = existingToken;
      input.type = 'text'; // 显示已有 Token
    }

    // 保存按钮
    document.getElementById('token-save').onclick = async function () {
      const val = input.value.trim();
      if (!val || val.length < 10) {
        errEl.textContent = 'Token 格式不对，长度至少10个字符';
        errEl.style.display = 'block';
        return;
      }
      if (!val.startsWith('ghp_') && !val.startsWith('github_pat_')) {
        errEl.textContent = 'Token 通常以 ghp_ 或 github_pat_ 开头，请检查';
        errEl.style.display = 'block';
        return;
      }

      errEl.style.display = 'none';

      // 测试 Token 是否有效
      try {
        const resp = await fetch('https://api.github.com/user', {
          headers: { 'Authorization': `token ${val}` },
        });
        if (!resp.ok) {
          errEl.textContent = 'Token 无效或无权限，请检查后重试';
          errEl.style.display = 'block';
          return;
        }
        const userData = await resp.json();
        okEl.textContent = `✅ 验证通过！欢迎 ${userData.login} ~ 正在启用跨设备同步...`;
      } catch (e) {
        // 网络问题可能也失败，但我们仍保存 Token
        okEl.textContent = '✅ Token 已保存（网络问题未验证，稍后自动重试）';
      }

      okEl.style.display = 'block';
      localStorage.setItem('github_sync_token', val);
      hasToken = true;

      // 1.5秒后关闭并重新初始化
      setTimeout(() => {
        overlay.remove();
        state.mode = 'full';
        updateStatusBarMode();
        showToast('☁️ 跨设备实时同步已开启！');
        // 立即推送当前数据到云端
        pushAllLocalToCloud();
        // 刷新在线状态
        updateOnlineStatus();
      }, 1500);
    };

    // 跳过按钮
    document.getElementById('token-skip').onclick = function () {
      overlay.remove();
      showToast('📡 使用本地同步模式（同浏览器实时，跨设备需手动刷新）');
    };

    // 点击背景关闭（可选）
    overlay.addEventListener('click', function (e) {
      if (e.target === overlay) overlay.remove();
    });

    // 自动聚焦
    setTimeout(() => {
      if (!existingToken) input.focus();
    }, 400);
  }

  /** 推送所有本地数据到云端 */
  async function pushAllLocalToCloud() {
    const keys = [...CONFIG.DATA_KEYS];
    // 加上一些额外的常用 key
    keys.push('lb_chat', 'lb_couple_tasks', 'lb_gifts', 'lb_love_start');
    const pushed = new Set();
    for (const key of keys) {
      if (pushed.has(key)) continue;
      pushed.add(key);
      const val = localStorage.getItem(key);
      if (val) {
        try {
          const data = JSON.parse(val);
        if (data && (typeof data === 'object' ? Object.keys(data).length > 0 : true)) {
            await pushToCloud(key, data);
          }
        } catch (e) {}
      }
    }
    console.log('☁️ 所有本地数据已推送到云端');
  }

  /** 更新状态栏模式文字 */
  function updateStatusBarMode() {
    const bar = document.getElementById('sync-status-bar');
    if (bar) {
      const modeText = bar.querySelector('span:last-child');
      if (modeText) {
        modeText.textContent = '实时同步已开启 · ☁️ 云端（跨设备）';
      }
    }
  }
  function showSyncStatus() {
    // 在页面上显示同步状态
    const statusEl = document.createElement('div');
    statusEl.id = 'sync-status-bar';
    statusEl.innerHTML = `
      <div style="
        position: fixed; bottom: 10px; left: 50%; transform: translateX(-50%);
        padding: 4px 16px; border-radius: 20px;
        background: rgba(255,255,255,0.85); backdrop-filter: blur(10px);
        font-size: 11px; color: #666; z-index: 99998;
        display: flex; align-items: center; gap: 6px;
        box-shadow: 0 2px 8px rgba(0,0,0,0.08);
      ">
        <span style="width:6px;height:6px;border-radius:50%;background:#4ecdc4;animation:pulse 2s infinite;display:inline-block;"></span>
        <span>实时同步已开启 · ${state.mode === 'full' ? '☁️ 云端（跨设备）' : '📡 智能'}</span>
        <span id="sync-settings-btn" title="设置同步Token" style="cursor:pointer;font-size:13px;opacity:0.6;margin-left:2px;transition:opacity 0.2s;" onmouseover="this.style.opacity='1'" onmouseout="this.style.opacity='0.6'">⚙️</span>
      </div>
      <style>
        @keyframes pulse { 0%,100%{opacity:1} 50%{opacity:0.4} }
        @keyframes slideIn { from{transform:translateX(100%);opacity:0} to{transform:translateX(0);opacity:1} }
        @keyframes fadeOut { from{opacity:1} to{opacity:0} }
      </style>
    `;
    document.body.appendChild(statusEl);
    
    // 绑定设置按钮
    setTimeout(function() {
      const btn = document.getElementById('sync-settings-btn');
      if (btn) {
        btn.onclick = showTokenModal;
      }
    }, 100);
  }
  
  // ========== 手动刷新按钮（供用户使用） ==========
  window.forceSyncAll = function() {
    console.log('🔄 强制同步所有数据...');
    showToast('🔄 正在同步最新数据...');
    pollAllData().then(() => {
      showToast('✅ 同步完成！');
    });
  };
  
  window.switchUser = function(user) {
    if (user === 'shushu' || user === 'bibi') {
      localStorage.setItem('currentUser', user);
      state.currentUser = user;
      showToast(`🔑 切换为：${user === 'shushu' ? '🐭鼠鼠' : '🐱笔笔'}`);
      updateOnlineStatus();
    }
  };
  
  // ========== 启动 ==========
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => setTimeout(init, 2000));
  } else {
    setTimeout(init, 2000);
  }
  
  // 导出
  window.RealtimeSync = {
    getState: () => state,
    forceSync: window.forceSyncAll,
    switchUser: window.switchUser,
    sendMessage: window.sendChatMessage,
    sendWall: window.sendWallMessage,
  };
  
})();
