/**
 * 实时同步模块 v6.0 — WebSocket 真实时 + 多通道降级
 * 
 * 🚀 v6 升级：Cloudflare Workers WebSocket = QQ/微信级别实时同步
 * 
 * 三通道架构：
 * 通道1（WebSocket）：Cloudflare Worker 推送，50-150ms 延迟，主通道
 * 通道2（BroadcastChannel）：同浏览器多标签，<10ms，本地通道
 * 通道3（GitHub 轮询）：WebSocket 断开时降级，3-8s，备用通道
 * 
 * 你发消息 → Worker 收到 → 瞬间推送给对方浏览器 → 马上弹出！
 */

(function() {
  'use strict';
  
  // ========== 配置 ==========
  const CONFIG = {
    OWNER: 'rickerrrr',
    REPO: 'shushu-bibi',
    BRANCH: 'main',
    DATA_PATH: 'data',
    
    // WebSocket 配置（Cloudflare Worker 后端）
    WS_URL: 'wss://love-cloud-do.2813721763.workers.dev',
    
    // 降级参数
    POLL_INTERVAL: 15000,       // WebSocket断开后才用轮询，间隔放长
    HEARTBEAT_INTERVAL: 30000,  // WebSocket 心跳间隔
    
    RAW_BASE: 'https://raw.githubusercontent.com',
    
    DATA_KEYS: [
      'chat_messages', 'messages', 'loveLetters', 'checkins',
      'notes', 'finances', 'albums',
      'online_status_shushu', 'online_status_bibi',
      // Weather
      'weather_my_city', 'weather_partner_city', 'weather_auto_location',
      'my_location_lat', 'my_location_lon',
      // Paperplane
      'paperplanes_sent', 'paperplanes_received',
      // Gift
      'gift_history_pro', 'gift_preferences_pro',
      // Couple Game
      'game_starlight_pro', 'game_completed_tasks_pro', 'unlocked_avatar_frames',
      // Theme
      'love_site_theme',
      // Voice
      'voice_collection',
      // Epic features
      'love_archives', 'couple_badges', 'time_anchor_date',
      'long_term_capsules', 'love_canvas_events', 'love_contract_signed',
      'memory_echoes', 'couple_notifications',
    ],
    
    // WebSocket 重连参数
    WS_RECONNECT_BASE: 1000,    // 初始重连延迟
    WS_RECONNECT_MAX: 30000,    // 最大重连延迟
    WS_PING_INTERVAL: 25000,    // 心跳间隔
  };
  
  // ========== Token ==========
  const TOKEN_STORAGE_KEY = 'github_sync_token';
  
  function getToken() {
    const localToken = localStorage.getItem('github_sync_token');
    if (localToken && localToken.length > 10) return localToken;
    if (window.CONFIG && window.CONFIG.GITHUB_TOKEN && window.CONFIG.GITHUB_TOKEN.length > 10) {
      localStorage.setItem('github_sync_token', window.CONFIG.GITHUB_TOKEN);
      return window.CONFIG.GITHUB_TOKEN;
    }
    return null;
  }
  
  let hasToken = !!getToken();
  
  // ========== WebSocket URL 持久化 ==========
  function getWsUrl() {
    const saved = localStorage.getItem('ws_url');
    // 仅清理旧的 shushu-bibii-online-status Worker URL（已废弃）
    if (saved && saved.includes('shushu-bibii-online-status')) {
      localStorage.removeItem('ws_url');
      console.log('Cleaned old Worker URL, using current default');
      return CONFIG.WS_URL;
    }
    if (saved) return saved;
    return CONFIG.WS_URL;
  }
  
  function setWsUrl(url) {
    localStorage.setItem('ws_url', url);
  }
  
  // ========== 状态管理 ==========
  const state = {
    mode: 'local',
    currentUser: null,
    lastPollTime: {},
    
    // WebSocket
    ws: null,
    wsConnected: false,
    wsReconnectAttempts: 0,
    wsReconnectTimer: null,
    wsPingTimer: null,
    
    // BroadcastChannel
    channel: null,
    
    // 降级
    pollTimer: null,
    heartbeatTimer: null,
    
    isOnline: false,
    partnerOnline: false,
    partnerLastSeen: 0,
  };
  
  // ========== 初始化 ==========
  function init() {
    console.log('%c💕 实时同步模块 v6.0 启动中...', 'color: #ff6b9d; font-size: 14px; font-weight: bold');
    console.log('%c🚀 新特性：WebSocket 真实时！延迟 50-150ms', 'color: #4ecdc4; font-weight: bold');
    
    state.currentUser = detectCurrentUser();
    
    // 检测 WebSocket URL 是否已配置
    const wsUrl = getWsUrl();
    const isConfigured = wsUrl && !wsUrl.includes('YOUR_SUBDOMAIN');
    
    if (isConfigured) {
      state.mode = 'websocket';
      console.log('%c🔌 模式：WebSocket 真实时（QQ/微信级别）', 'color: #4ecdc4');
    } else if (hasToken) {
      state.mode = 'full';
      console.log('%c🌍 模式：云端同步（无 WebSocket，使用 GitHub）', 'color: #ffe66d');
    } else {
      state.mode = 'poll';
      console.log('%c📡 模式：智能轮询（无 Token）', 'color: #ffe66d');
    }
    
    setupBroadcastChannel();
    setupStorageListener();
    
    if (isConfigured) {
      connectWebSocket();
    } else {
      console.log('%c⚙️ WebSocket 未配置，使用降级模式。部署 Worker 后会自动升级', 'color: #ffe66d');
      startPolling();
    }
    
    startHeartbeat();
    overrideDataFunctions();
    showSyncStatus();
    
    if (!hasToken && !isConfigured) {
      setTimeout(showTokenModal, 3500);
    }
    
    console.log('%c✅ 实时同步已启动！模式：' + state.mode, 'color: #95e1d3');
  }
  
  function detectCurrentUser() {
    const saved = localStorage.getItem('currentUser');
    if (saved) return saved;
    const minute = new Date().getMinutes();
    return minute % 2 === 0 ? 'bibi' : 'shushu';
  }
  
  // ==================== WebSocket 核心 ====================
  
  function connectWebSocket() {
    const wsUrl = getWsUrl();
    if (!wsUrl || wsUrl.includes('YOUR_SUBDOMAIN')) {
      console.log('⚠️ WebSocket URL 未配置');
      return;
    }
    
    // 清理旧连接
    if (state.ws) {
      try { state.ws.close(); } catch (e) {}
    }
    
    if (state.wsReconnectTimer) {
      clearTimeout(state.wsReconnectTimer);
      state.wsReconnectTimer = null;
    }
    
    const fullUrl = `${wsUrl}/ws?user=${state.currentUser}`;
    console.log(`🔌 连接 WebSocket: ${fullUrl}`);
    
    try {
      state.ws = new WebSocket(fullUrl);
      
      state.ws.onopen = function() {
        console.log('%c✅ WebSocket 已连接！延迟 50-150ms', 'color: #4ecdc4; font-weight: bold');
        state.wsConnected = true;
        state.wsReconnectAttempts = 0;
        
        // 更新UI
        updateWsIndicator(true);
        showToast('⚡ 实时连接已建立 · 消息瞬间到达');
        
        // 发送在线状态
        sendWsMessage({
          type: 'heartbeat',
          user: state.currentUser,
          online: true,
        });
        
        // 停止轮询（WebSocket 接管）
        stopPolling();
        
        // 开始 WebSocket 心跳
        startWsPing();
      };
      
      state.ws.onmessage = function(event) {
        try {
          const data = JSON.parse(event.data);
          handleWsMessage(data);
        } catch (e) {
          console.error('WebSocket 消息解析失败:', e);
        }
      };
      
      state.ws.onclose = function(event) {
        if (window._realtimeSync) window._realtimeSync.ws = null;
        console.log(`🔌 WebSocket 断开 (code: ${event.code})`);
        state.wsConnected = false;
        state.ws = null;
        updateWsIndicator(false);
        
        // 降级到轮询
        console.log('📡 降级到 GitHub 轮询模式');
        startPolling();
        
        // 自动重连
        scheduleReconnect();
      };
      
      state.ws.onerror = function(err) {
        console.error('⚠️ WebSocket 连接错误');
        state.wsConnected = false;
        updateWsIndicator(false);
      };
      
    } catch (e) {
      console.error('WebSocket 创建失败:', e.message);
      startPolling();
    }
  }
  
  function scheduleReconnect() {
    if (state.wsReconnectTimer) return;
    
    const delay = Math.min(
      CONFIG.WS_RECONNECT_BASE * Math.pow(2, state.wsReconnectAttempts),
      CONFIG.WS_RECONNECT_MAX
    );
    
    state.wsReconnectAttempts++;
    
    console.log(`⏳ ${delay/1000}s 后尝试重连...(第${state.wsReconnectAttempts}次)`);
    
    state.wsReconnectTimer = setTimeout(() => {
      state.wsReconnectTimer = null;
      connectWebSocket();
    }, delay);
  }
  
  function startWsPing() {
    if (state.wsPingTimer) clearInterval(state.wsPingTimer);
    
    state.wsPingTimer = setInterval(() => {
      if (state.ws && state.ws.readyState === WebSocket.OPEN) {
        sendWsMessage({ type: 'ping' });
      }
    }, CONFIG.WS_PING_INTERVAL);
  }
  
  function sendWsMessage(data) {
    if (state.ws && state.ws.readyState === WebSocket.OPEN) {
      try {
        state.ws.send(JSON.stringify(data));
        return true;
      } catch (e) {
        console.error('WebSocket 发送失败:', e.message);
      }
    }
    return false;
  }
  
  function handleWsMessage(data) {
    if (!data || !data.type) return;
    
    const fromUser = data._from;
    const isFromPartner = fromUser && fromUser !== state.currentUser;
    
    switch (data.type) {
      case 'pong':
        // 心跳响应，什么都不做
        break;
        
      case 'chat_read':
        // 已读回执：对方读了我们的消息
        if (isFromPartner) {
          handleReadReceiptWs(data);
        }
        break;

      case 'typing':
        // 对方正在输入
        if (isFromPartner) {
          handleTypingIndicator(data);
        }
        break;

      case 'reaction':
        // 消息反应（emoji reaction）
        if (isFromPartner) {
          handleReaction(data);
        }
        break;

      case 'online_status':
        // 对方在线状态变更（WebSocket 直接推送）
        if (data.user !== state.currentUser) {
          state.partnerOnline = data.online;
          state.partnerLastSeen = data.online ? Date.now() : (data.timestamp || Date.now());
          
          // 更新本地存储（兼容其他标签）
          const partnerKey = `online_status_${data.user}`;
          localStorage.setItem(partnerKey, JSON.stringify({
            user: data.user,
            online: data.online,
            lastSeen: data.online ? Date.now() : (data.timestamp || Date.now()),
          }));
          
          updateOnlineIndicator(state.partnerOnline);
          broadcast('heartbeat', { user: data.user });
          
          if (data.online && state.isOnline) {
            showToast(`${data.user === 'shushu' ? '🐭鼠鼠' : '🐱笔笔'} 上线了！💕`);
          }
        }
        break;
        
      case 'chat_message':
        // 新聊天消息（瞬间到达！）
        if (isFromPartner) {
          handleNewChatMessage(data);
          playNotificationSound();
          showToast(`💌 ${fromUser === 'shushu' ? '🐭鼠鼠' : '🐱笔笔'} 发来消息！`);
        }
        break;
        
      case 'wall_message':
        if (isFromPartner) {
          handleNewWallMessage(data);
          playNotificationSound();
          showToast(`📝 ${fromUser === 'shushu' ? '鼠鼠' : '笔笔'} 在留言墙留言了！`);
        }
        break;
        
      case 'data_update':
        if (isFromPartner && data.key) {
          console.log(`⚡ [WebSocket] 收到远程数据更新: ${data.key} (延迟约${Date.now() - data._ts}ms)`);
          handleRemoteDataUpdate(data.key, data.value);
          
          // 更新本地存储
          if (data.value !== undefined) {
            localStorage.setItem(data.key, JSON.stringify(data.value));
          }
        }
        break;
        
      case 'heartbeat':
        if (isFromPartner) {
          state.partnerOnline = true;
          updateOnlineIndicator(true);
        }
        break;
        
      default:
        // 其他消息类型，尝试作为 data_update 处理
        if (isFromPartner && data.key && data.value !== undefined) {
          handleRemoteDataUpdate(data.key, data.value);
        }
    }
  }
  
  function updateWsIndicator(connected) {
    const bar = document.getElementById('sync-status-bar');
    if (!bar) return;
    
    const dot = bar.querySelector('span:first-child');
    const text = bar.querySelector('span:nth-child(2)');
    
    if (dot) {
      dot.style.background = connected ? '#4ecdc4' : '#ffa726';
      dot.style.animation = connected ? 'pulse 2s infinite' : 'none';
    }
    if (text) {
      text.textContent = connected
        ? '⚡ WebSocket 实时连接 · 50-150ms'
        : '📡 降级轮询模式 · 3-8s';
    }
  }
  
  // ==================== BroadcastChannel ====================
  
  function setupBroadcastChannel() {
    try {
      state.channel = new BroadcastChannel('love_website_sync');
      
      state.channel.onmessage = function(event) {
        const data = event.data;
        if (!data || !data.type) return;
        
        switch (data.type) {
          case 'data_update':
            handleRemoteDataUpdate(data.key, data.value);
            break;
          case 'heartbeat':
            handlePartnerHeartbeat(data.user);
            break;
          case 'chat_message':
            handleNewChatMessage(data.message);
            break;
          case 'message_wall':
            handleNewWallMessage(data.message);
            break;
        }
      };
      
      console.log('📻 BroadcastChannel 已建立');
    } catch (e) {
      console.log('⚠️ BroadcastChannel 不支持');
    }
  }
  
  function broadcast(type, data) {
    if (state.channel) {
      try {
        state.channel.postMessage({ type, ...data, timestamp: Date.now() });
      } catch (e) {}
    }
  }
  
  // ==================== Storage Event ====================
  
  function setupStorageListener() {
    window.addEventListener('storage', function(event) {
      if (!event.key) return;
      
      if (CONFIG.DATA_KEYS.some(k => event.key.startsWith(k.replace(/_shushu|_bibi/, ''))) ||
          event.key.startsWith('lb_')) {
        try {
          const newValue = event.newValue ? JSON.parse(event.newValue) : null;
          if (typeof window.refreshUI === 'function') {
            window.refreshUI(event.key, newValue);
          }
          showDataNotification(event.key);
        } catch (e) {}
      }
    });
    console.log('👂 Storage 监听器已设置');
  }
  
  // ==================== 降级轮询 ====================
  
  function startPolling() {
    stopPolling();
    pollAllData();
    state.pollTimer = setInterval(pollAllData, CONFIG.POLL_INTERVAL);
    console.log(`⏱️ 降级轮询已启动，每 ${CONFIG.POLL_INTERVAL/1000}s`);
  }
  
  function stopPolling() {
    if (state.pollTimer) {
      clearInterval(state.pollTimer);
      state.pollTimer = null;
    }
  }
  
  async function pollAllData() {
    for (const key of CONFIG.DATA_KEYS) {
      await pollSingleData(key);
    }
  }
  
  async function pollSingleData(key) {
    try {
      const url = `${CONFIG.RAW_BASE}/${CONFIG.OWNER}/${CONFIG.REPO}/${CONFIG.BRANCH}/${CONFIG.DATA_PATH}/${key}.json?t=${Date.now()}`;
      const response = await fetch(url, {
        method: 'GET', cache: 'no-cache',
        headers: { 'Accept': 'application/json' },
      });
      
      if (response.ok) {
        const remoteData = await response.json();
        const localDataStr = localStorage.getItem(key);
        const localData = localDataStr ? JSON.parse(localDataStr) : null;
        const remoteStr = JSON.stringify(remoteData);
        const localStr = localData ? JSON.stringify(localData) : '';
        
        if (remoteStr !== localStr && remoteData && Object.keys(remoteData).length > 0) {
          localStorage.setItem(key, JSON.stringify(remoteData));
          state.lastPollTime[key] = Date.now();
          broadcast('data_update', { key, value: remoteData });
          triggerUIUpdate(key, remoteData);
          console.log(`📥 [${key}] 降级轮询发现更新`);
        }
      }
    } catch (err) {}
  }
  
  // ==================== 心跳 / 在线状态 ====================
  
  function startHeartbeat() {
    updateOnlineStatus();
    // 升级：心跳间隔从 30s 改为 5s，实现更精确的在线检测
    state.heartbeatTimer = setInterval(updateOnlineStatus, 5000);
  }
  
  function updateOnlineStatus() {
    const statusKey = `online_status_${state.currentUser}`;
    const statusData = {
      user: state.currentUser,
      online: true,
      lastSeen: Date.now(),
      lastSeenISO: new Date().toISOString(),
    };
    
    localStorage.setItem(statusKey, JSON.stringify(statusData));
    broadcast('heartbeat', { user: state.currentUser });
    state.isOnline = true;
    
    // WebSocket 模式：通过 WebSocket 发送心跳（更频繁，每3秒）
    if (state.wsConnected) {
      if (!state.wsHeartbeatTimer) {
        state.wsHeartbeatTimer = setInterval(() => {
          sendWsMessage({
            type: 'heartbeat',
            user: state.currentUser,
            online: true,
            timestamp: Date.now(),
            precise: true, // 标记为主要心跳
          });
        }, 3000); // WebSocket 心跳每3秒
      }
    } else {
      // WebSocket 断开时清除定时器
      if (state.wsHeartbeatTimer) {
        clearInterval(state.wsHeartbeatTimer);
        state.wsHeartbeatTimer = null;
      }
    }
    
    // 有 Token 且 WebSocket 断开时推送到 GitHub（降级，每15秒）
    if (hasToken && !state.wsConnected) {
      pushToCloud(statusKey, statusData);
    }
    
    // 检测对方在线（更精确的算法）
    checkPartnerOnlineAdvanced();
  }
  
  function checkPartnerOnlineAdvanced() {
    const partnerUser = state.currentUser === 'shushu' ? 'bibi' : 'shushu';
    const partnerKey = `online_status_${partnerUser}`;
    const partnerData = localStorage.getItem(partnerKey);
    
    if (partnerData) {
      try {
        const parsed = JSON.parse(partnerData);
        const diff = Date.now() - (parsed.lastSeen || 0);
        
        // 升级：更智能的在线检测
        // WebSocket 模式：5秒内算在线
        // 降级模式：15秒内算在线
        const onlineThreshold = state.wsConnected ? 5000 : 15000;
        state.partnerOnline = diff < onlineThreshold;
        
        // 计算最后上线时间（人类可读格式）
        if (!state.partnerOnline) {
          state.partnerLastSeen = formatLastSeen(diff);
        } else {
          state.partnerLastSeen = '在线';
        }
        
        updateOnlineIndicatorAdvanced(state.partnerOnline, state.partnerLastSeen);
      } catch (e) {}
    }
  }
  
  function formatLastSeen(diffMs) {
    const seconds = Math.floor(diffMs / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);
    
    if (seconds < 60) return '刚刚在线';
    if (minutes < 60) return `${minutes}分钟前在线`;
    if (hours < 24) return `${hours}小时前在线`;
    return `${days}天前在线`;
  }
  
  function updateOnlineIndicatorAdvanced(online, lastSeenText) {
    // 更新顶部指示灯
    const partnerLight = document.getElementById('partner-online-light');
    if (partnerLight) {
      partnerLight.className = online ? 'status-light green pulse' : 'status-light gray';
      const partnerNick = state.currentUser === 'shushu' ? '笔笔' : '鼠鼠';
      partnerLight.title = online ? `${partnerNick} 在线 ❤️` : `${partnerNick} ${lastSeenText}`;
    }
    
    // 更新聊天室中的在线状态显示
    const statusEl = document.getElementById('chatroom-partner-status');
    if (statusEl) {
      if (online) {
        statusEl.textContent = '在线';
        statusEl.style.color = '#10b981'; // 绿色
      } else {
        statusEl.textContent = lastSeenText;
        statusEl.style.color = '#9ca3af'; // 灰色
      }
    }
    
    if (online && state.isOnline && typeof window.triggerBothOnline === 'function') {
      window.triggerBothOnline();
    }
  }
  
  // ==================== 数据函数覆盖 ====================
  
  function overrideDataFunctions() {
    window.getData = function(key, defaultVal) {
      const local = localStorage.getItem(key);
      if (local) {
        try { return JSON.parse(local); }
        catch (e) { return local; }
      }
      return (defaultVal !== undefined) ? defaultVal : null;
    };
    
    window.setData = function(key, value) {
      // 1. 本地存储
      localStorage.setItem(key, JSON.stringify(value));
      
      // 2. BroadcastChannel 广播
      broadcast('data_update', { key, value });
      
      // 3. WebSocket 实时推送（主通道）
      if (state.wsConnected) {
        sendWsMessage({
          type: 'data_update',
          key: key,
          value: value,
          _ts: Date.now(),
        });
      }
      
      // 4. GitHub 云端推送（降级）
      if (hasToken && !state.wsConnected) {
        pushToCloud(key, value);
      }
      
      // 5. UI 更新
      triggerUIUpdate(key, value);
      
      return value;
    };
    
    // 发送聊天消息（接受预构建的 msgObj，不重复创建）
    window.sendChatMessage = function(msgObj) {
      const key = 'chat_messages';
      const messages = window.getData(key) || [];
      // 防止重复：按 ID 检查
      if (!messages.find(m => m.id === msgObj.id)) {
        messages.push(msgObj);
      }
      window.setData(key, messages);
      
      // WebSocket 实时推送
      sendWsMessage({
        type: 'chat_message',
        ...msgObj,
        _ts: Date.now(),
      });
      
      broadcast('chat_message', { message: msgObj });
      showChatNotification(msgObj);
      return msgObj;
    };
    
    // 仅通过 WebSocket 发送（不写 localStorage，用于聊天室乐观更新）
    window.sendChatWs = function(msgObj) {
      sendWsMessage({
        type: 'chat_message',
        ...msgObj,
        _ts: Date.now(),
      });
    };
    
    // 发送输入中状态
    window.sendTyping = function(isTyping) {
      sendWsMessage({
        type: 'typing',
        user: state.currentUser,
        typing: isTyping,
        _ts: Date.now(),
      });
    };
    
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
      
      walls.unshift(wallObj);
      window.setData(key, walls);
      
      sendWsMessage({
        type: 'wall_message',
        ...wallObj,
        _ts: Date.now(),
      });
      
      broadcast('message_wall', { message: wallObj });
      showWallNotification(wallObj);
      
      return wallObj;
    };
    
    console.log('✅ 数据函数已增强 (v6: WebSocket + BroadcastChannel + GitHub)');
  }
  
  // ==================== 云端推送 ====================
  
  async function pushToCloud(key, data) {
    if (!hasToken) return;
    try {
      const token = getToken();
      const url = `https://api.github.com/repos/${CONFIG.OWNER}/${CONFIG.REPO}/contents/${CONFIG.DATA_PATH}/${key}.json`;
      
      let sha = null;
      try {
        const checkResp = await fetch(url, { headers: { 'Authorization': `token ${token}` } });
        if (checkResp.ok) { const fd = await checkResp.json(); sha = fd.sha; }
      } catch (e) {}
      
      const content = btoa(unescape(encodeURIComponent(JSON.stringify(data, null, 2))));
      const body = {
        message: `sync ${key} - ${new Date().toISOString()}`,
        content: content, branch: CONFIG.BRANCH,
      };
      if (sha) body.sha = sha;
      
      await fetch(url, {
        method: 'PUT',
        headers: { 'Authorization': `token ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
    } catch (err) {}
  }
  
  // ==================== UI 更新 ====================
  
  function triggerUIUpdate(key, value) {
    if (typeof window.refreshUI === 'function') {
      window.refreshUI(key, value);
    }
    switch (key) {
      case 'chat_messages':
        if (typeof window.refreshChatMessages === 'function') window.refreshChatMessages(value);
        break;
      case 'messages':
        if (typeof window.refreshMessageWall === 'function') window.refreshMessageWall(value);
        break;
      case 'loveLetters':
        if (typeof window.refreshLoveLetters === 'function') window.refreshLoveLetters(value);
        break;
    }
  }
  
  
  // ==================== 打字指示器 ====================
  
  function handleTypingIndicator(data) {
    if (data.user === state.currentUser) return;  // 忽略自己
    const typingEl = document.getElementById('chatroom-typing');
    if (!typingEl) return;
    
    if (data.typing) {
      typingEl.classList.add('active');
      const partner = state.currentUser === 'shushu' ? '笔笔' : '鼠鼠';
      const textEl = document.getElementById('typing-text');
      if (textEl) textEl.textContent = partner + ' 正在输入...';
    } else {
      typingEl.classList.remove('active');
    }
  }
  
  function handleReadReceiptWs(data) {
    // 收到对方的已读回执，更新本地消息状态
    try {
      const key = 'chat_messages';
      const messages = window.getData(key) || [];
      let changed = false;
      for (const msg of messages) {
        if (msg.from === state.currentUser && !msg.read) {
          msg.read = true;
          msg.readAt = data.readAt || Date.now();
          changed = true;
        }
      }
      if (changed) {
        localStorage.setItem(key, JSON.stringify(messages));
        if (typeof window.refreshChatMessages === 'function') {
          window.refreshChatMessages(messages);
        }
      }
    } catch (e) {}
  }

  function handleReaction(data) {
    // 收到消息反应，更新本地消息
    try {
      const { messageId, emoji, user } = data;
      const key = 'chat_messages';
      const messages = window.getData(key) || [];
      const msg = messages.find(m => m.id === messageId);
      
      if (msg) {
        if (!msg.reactions) msg.reactions = {};
        if (!msg.reactions[emoji]) msg.reactions[emoji] = [];
        
        if (!msg.reactions[emoji].includes(user)) {
          msg.reactions[emoji].push(user);
        }
        
        localStorage.setItem(key, JSON.stringify(messages));
        
        // 触发聊天室更新
        if (window.ChatRoom && window.ChatRoom.renderMessages) {
          window.ChatRoom.renderMessages();
        }
      }
    } catch (e) {}
  }

    function handleRemoteDataUpdate(key, value) {
    console.log(`📨 收到 [${key}] 更新`);
    triggerUIUpdate(key, value);
  }
  
  function handlePartnerHeartbeat(user) {
    state.partnerOnline = true;
    updateOnlineIndicator(true);
  }
  
  function handleNewChatMessage(msg) {
    if (msg.from !== state.currentUser) {
      playNotificationSound();
      updateUnreadBadge('chat', 1);
      
      // 存入 localStorage，触发 storage 事件 → chat-v3 即时渲染
      try {
        const key = 'chat_messages';
        const existingRaw = localStorage.getItem(key);
        const existing = existingRaw ? JSON.parse(existingRaw) : [];
        const newMsg = {
          id: msg.id || (Date.now().toString(36) + Math.random().toString(36).substr(2, 5)),
          from: msg.from,
          text: msg.text,
          time: msg.time || new Date().toISOString(),
          type: msg.type || 'text',
          read: false,
        };
        existing.push(newMsg);
        localStorage.setItem(key, JSON.stringify(existing));
        broadcast('chat_message', { message: newMsg });
        console.log('💌 消息已存入 localStorage，对方立即可见');
      } catch (e) {
        console.error('保存接收消息失败:', e);
      }
    }
  }
  
  function handleNewWallMessage(msg) {
    if (msg.from !== state.currentUser) {
      playNotificationSound();
      updateUnreadBadge('wall', 1);
    }
  }

  function handleReadReceipt(data) {
    const key = 'chat_messages';
    try {
      const raw = localStorage.getItem(key);
      if (!raw) return;
      const messages = JSON.parse(raw);
      let changed = false;
      for (const msg of messages) {
        if (msg.from === state.currentUser && !msg.read) {
          msg.read = true;
          msg.readAt = data.readAt || Date.now();
          changed = true;
        }
      }
      if (changed) {
        localStorage.setItem(key, JSON.stringify(messages));
        broadcast('chat_read', { from: data.from, readAt: data.readAt });
        console.log('已读回执：对方已阅读消息');
      }
    } catch (e) {}
  }
  
  // ==================== 通知系统 ====================
  
  function showToast(text) {
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
    setTimeout(() => toast.remove(), 3500);
  }
  
  function showSyncNotification(key) {}
  function showDataNotification(key) {}
  function showChatNotification(msg) {}
  function showWallNotification(msg) {}
  
  function updateUnreadBadge(type, count) {
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
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      osc.connect(gain); gain.connect(audioCtx.destination);
      osc.frequency.value = 800; osc.type = 'sine';
      gain.gain.value = 0.3;
      osc.start(audioCtx.currentTime);
      osc.stop(audioCtx.currentTime + 0.15);
    } catch (e) {}
  }
  
  // ==================== Token 弹框 ====================
  
  function showTokenModal() {
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
          width: 460px; max-width: 92vw;
          box-shadow: 0 20px 60px rgba(0,0,0,0.5), 0 0 80px rgba(255,107,157,0.15);
          animation: tokenSlideUp 0.35s cubic-bezier(0.175, 0.885, 0.32, 1.275);
        }
        @keyframes tokenSlideUp { from{transform:translateY(30px);opacity:0} to{transform:translateY(0);opacity:1} }
        .token-modal h3 { color: #fff; font-size: 20px; margin: 0 0 6px; text-align: center; font-weight: 600; }
        .token-modal .subtitle { color: rgba(255,255,255,0.5); font-size: 12px; text-align: center; margin-bottom: 20px; }
        .token-modal .hint { color: rgba(255,255,255,0.5); font-size: 11px; margin: 8px 0 0; line-height: 1.6; }
        .token-modal .hint a { color: #ff6b9d; text-decoration: none; }
        .token-modal label { color: rgba(255,255,255,0.7); font-size: 12px; display: block; margin-bottom: 6px; font-weight: 500; }
        .token-modal input {
          width: 100%; box-sizing: border-box;
          padding: 11px 14px; border-radius: 10px;
          border: 1px solid rgba(255,255,255,0.2);
          background: rgba(255,255,255,0.07);
          color: #fff; font-size: 13px;
          font-family: 'Consolas', 'Courier New', monospace;
          transition: border-color 0.2s; outline: none;
        }
        .token-modal input:focus { border-color: #ff6b9d; box-shadow: 0 0 0 3px rgba(255,107,157,0.15); }
        .token-modal .section-divider {
          border-top: 1px solid rgba(255,255,255,0.1);
          margin: 16px 0; padding-top: 12px;
        }
        .token-modal .section-title {
          color: rgba(255,255,255,0.4); font-size: 10px;
          text-transform: uppercase; letter-spacing: 1px;
          margin-bottom: 8px;
        }
        .token-modal .btns { display: flex; gap: 10px; margin-top: 20px; }
        .token-modal .btn {
          flex: 1; padding: 11px; border-radius: 10px;
          border: none; font-size: 14px; font-weight: 600;
          cursor: pointer; transition: all 0.2s;
        }
        .token-modal .btn-primary {
          background: linear-gradient(135deg, #ff6b9d, #ff8a80);
          color: #fff;
        }
        .token-modal .btn-primary:hover { transform: translateY(-1px); box-shadow: 0 6px 20px rgba(255,107,157,0.4); }
        .token-modal .btn-ghost {
          background: rgba(255,255,255,0.08);
          color: rgba(255,255,255,0.6);
        }
        .token-modal .btn-ghost:hover { color: #fff; background: rgba(255,255,255,0.14); }
        .token-modal .error-msg { color: #ff6b6b; font-size: 11px; margin-top: 6px; display: none; }
        .token-modal .status-ok { display: none; color: #4ecdc4; font-size: 12px; text-align: center; margin-top: 8px; }
        .token-modal .icon-row { text-align: center; font-size: 36px; margin-bottom: 8px; }
        @keyframes slideIn { from{transform:translateX(100%);opacity:0} to{transform:translateX(0);opacity:1} }
        @keyframes fadeOut { from{opacity:1} to{opacity:0} }
        @keyframes pulse { 0%,100%{opacity:1} 50%{opacity:0.4} }
      </style>
      <div class="token-modal">
        <div class="icon-row">⚡</div>
        <h3>配置实时同步</h3>
        <p class="subtitle">支持 WebSocket 真实时 + GitHub 云端双通道</p>

        <div class="section-title">🚀 WebSocket 地址（QQ/微信级实时 · 推荐）</div>
        <label for="ws-url-input">Cloudflare Worker URL</label>
        <input type="text" id="ws-url-input" placeholder="wss://ws.shushu-bibi.cn/ws" autocomplete="off">
        <p class="error-msg" id="ws-error"></p>

        <div class="section-divider"></div>
        <div class="section-title">📡 GitHub Token（降级/云端存储）</div>
        <label for="token-input">GitHub Personal Access Token</label>
        <input type="password" id="token-input" placeholder="ghp_xxxxxxxxxxxxxxxxxxxx" autocomplete="off">
        <p class="error-msg" id="token-error"></p>
        <p class="status-ok" id="token-ok"></p>

        <div class="btns">
          <button class="btn btn-ghost" id="token-skip">📡 先用降级模式</button>
          <button class="btn btn-primary" id="token-save">💾 保存配置</button>
        </div>
        <p class="hint">
          💡 WebSocket 部署教程：在 backend 目录运行 <b>npx wrangler deploy（已部署到 ws.shushu-bibi.cn）</b><br>
          部署后在 Cloudflare Dashboard 复制 Worker URL 粘贴到上方
        </p>
      </div>
    `;

    document.body.appendChild(overlay);

    const wsInput = document.getElementById('ws-url-input');
    const tokenInput = document.getElementById('token-input');
    const wsErr = document.getElementById('ws-error');
    const tokenErr = document.getElementById('token-error');
    const okEl = document.getElementById('token-ok');

    // 预填现有配置
    const savedWs = getWsUrl();
    if (savedWs && !savedWs.includes('YOUR_SUBDOMAIN')) {
      wsInput.value = savedWs;
    }
    
    const existingToken = getToken();
    if (existingToken) {
      tokenInput.value = existingToken;
      tokenInput.type = 'text';
    }

    document.getElementById('token-save').onclick = async function() {
      const wsUrl = wsInput.value.trim();
      const token = tokenInput.value.trim();
      
      let hasChange = false;
      
      // 保存 WebSocket URL
      if (wsUrl && wsUrl.startsWith('wss://')) {
        setWsUrl(wsUrl);
        wsErr.style.display = 'none';
        hasChange = true;
      } else if (wsUrl && !wsUrl.startsWith('wss://')) {
        wsErr.textContent = 'WebSocket URL 应以 wss:// 开头';
        wsErr.style.display = 'block';
      }
      
      // 保存 Token
      if (token && token.length > 10) {
        if (token.startsWith('ghp_') || token.startsWith('github_pat_')) {
          try {
            const resp = await fetch('https://api.github.com/user', {
              headers: { 'Authorization': `token ${token}` },
            });
            if (resp.ok) {
              localStorage.setItem('github_sync_token', token);
              hasToken = true;
              tokenErr.style.display = 'none';
              hasChange = true;
            } else {
              tokenErr.textContent = 'Token 无效，请检查';
              tokenErr.style.display = 'block';
            }
          } catch (e) {}
        } else {
          tokenErr.textContent = 'Token 应以 ghp_ 或 github_pat_ 开头';
          tokenErr.style.display = 'block';
        }
      }
      
      if (hasChange) {
        okEl.textContent = '✅ 配置已保存！正在启用实时同步...';
        okEl.style.display = 'block';
        
        setTimeout(() => {
          overlay.remove();
          // 重新连接
          if (wsUrl && wsUrl.startsWith('wss://')) {
            connectWebSocket();
          }
          if (token) {
            updateOnlineStatus();
          }
          showToast('⚡ 实时同步已启用！');
        }, 1500);
      } else if (!wsUrl && !token) {
        okEl.textContent = '请至少填写一项配置';
        okEl.style.color = '#ffa726';
        okEl.style.display = 'block';
      }
    };

    document.getElementById('token-skip').onclick = function() {
      overlay.remove();
    };

    overlay.addEventListener('click', function(e) {
      if (e.target === overlay) overlay.remove();
    });

    setTimeout(() => { wsInput.focus(); }, 400);
  }
  
  // ==================== 状态栏 ====================
  
  function showSyncStatus() {
    const existing = document.getElementById('sync-status-bar');
    if (existing) existing.remove();
    
    const isWs = state.wsConnected;
    
    const statusEl = document.createElement('div');
    statusEl.id = 'sync-status-bar';
    statusEl.innerHTML = `
      <div style="
        position: fixed; bottom: 10px; left: 50%; transform: translateX(-50%);
        padding: 4px 16px; border-radius: 20px;
        background: rgba(255,255,255,0.85); backdrop-filter: blur(10px);
        font-size: 11px; z-index: 99998;
        display: flex; align-items: center; gap: 6px;
        box-shadow: 0 2px 8px rgba(0,0,0,0.08);
      ">
        <span style="width:6px;height:6px;border-radius:50%;background:${isWs ? '#4ecdc4' : '#ffa726'};animation:${isWs ? 'pulse 2s infinite' : 'none'};display:inline-block;"></span>
        <span style="color:#666">${isWs ? '实时同步已开启 · ' : '实时同步已开启 · '}${isWs ? '⚡ WebSocket' : (hasToken ? '☁️ 云端' : '📡 智能')}</span>
        <span id="sync-settings-btn" title="配置同步" style="cursor:pointer;font-size:13px;opacity:0.6;margin-left:2px;transition:opacity 0.2s" onmouseover="this.style.opacity='1'" onmouseout="this.style.opacity='0.6'">⚙️</span>
      </div>
    `;
    document.body.appendChild(statusEl);
    
    setTimeout(function() {
      const btn = document.getElementById('sync-settings-btn');
      if (btn) btn.onclick = showTokenModal;
    }, 100);
  }
  
  // ==================== 公开 API ====================
  
  window.forceSyncAll = function() {
    showToast('🔄 正在同步...');
    pollAllData().then(() => showToast('✅ 同步完成！'));
  };
  
  window.switchUser = function(user) {
    if (user === 'shushu' || user === 'bibi') {
      localStorage.setItem('currentUser', user);
      state.currentUser = user;
      showToast(`🔑 切换为：${user === 'shushu' ? '🐭鼠鼠' : '🐱笔笔'}`);
      updateOnlineStatus();
      // 重连 WebSocket 以切换身份
      if (state.wsConnected) {
        connectWebSocket();
      }
    }
  };
  
  window.getSyncState = function() {
    return {
      mode: state.mode,
      wsConnected: state.wsConnected,
      currentUser: state.currentUser,
      partnerOnline: state.partnerOnline,
      hasToken: hasToken,
    };
  };
  
  // ==================== 启动 ====================
  
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => setTimeout(init, 1500));
  } else {
    setTimeout(init, 1500);
  }
  
  // 导出
  window.RealtimeSync = {
    getState: () => state,
    getSyncState: window.getSyncState,
    forceSync: window.forceSyncAll,
    switchUser: window.switchUser,
    sendMessage: window.sendChatMessage,
    sendWall: window.sendWallMessage,
    connectWs: connectWebSocket,
  };
  
})();
