/**
 * 实时同步模块 v6.0 — 纯 WebSocket 毫秒级实时同步
 * 
 * 🚀 Cloudflare Workers WebSocket + Durable Objects = Telegram 级别实时同步
 * 
 * 双通道架构（零降级，纯 WebSocket）：
 * 通道1（WebSocket）：Cloudflare Durable Object 推送，50-150ms，唯一主通道
 * 通道2（BroadcastChannel）：同浏览器多标签，<10ms，本地辅助通道
 * 
 * 你发消息 → Worker 收到 → DO 瞬间推送给对方浏览器 → 马上弹出！
 * WebSocket 断开 → 阶梯重连 1s/3s/5s → 恢复连接 → 绝不降级
 */

(function() {
  'use strict';
  
  // ========== 配置 ==========
  const CONFIG = {
    OWNER: 'rickerrrr',
    REPO: 'shushu-bibi',
    BRANCH: 'main',
    DATA_PATH: 'data',
    
    // WebSocket 配置（部署后替换为你的 Worker URL）
    // 部署后在 Cloudflare Dashboard → Workers & Pages → shushu-bibi-sync 找到域名
    WS_URL: 'wss://ws.shushu-bibi.cn',
    
    HEARTBEAT_INTERVAL: 30000,  // 心跳间隔
    
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
    
    // WebSocket 重连参数 (阶梯式)
    WS_RECONNECT_STEPS: [1000, 3000, 5000],  // 1s → 3s → 5s
    WS_RECONNECT_STEADY: 5000,               // 稳定后每 5s 重试
    WS_PING_INTERVAL: 25000,                  // 心跳间隔
  };
  
  // ========== WebSocket URL 持久化 ==========
  function getWsUrl() {
    const saved = localStorage.getItem('ws_url');
    if (saved && saved.includes('workers.dev')) {
      localStorage.removeItem('ws_url');
      console.log('Cleaned old workers.dev URL, using new custom domain');
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
    
    // WebSocket
    ws: null,
    wsConnected: false,
    wsReconnectAttempts: 0,
    wsReconnectTimer: null,
    wsPingTimer: null,
    
    // BroadcastChannel
    channel: null,
    
    heartbeatTimer: null,
    
    isOnline: false,
    partnerOnline: false,
    partnerLastSeen: 0,
    partnerOnlineSince: 0,   // 毫秒级：对方上线时间戳
    partnerOfflineSince: 0,  // 毫秒级：对方离线时间戳
    offlineDebounceTimer: null,  // 防抖：延迟离线判定
    lastOnlineState: null,        // 上次在线状态（防抖用）
    partnerState: 'offline',      // 对方当前状态: online/idle/offline
    myOnlineSince: 0,              // 自身上线时间戳
    // v4.0 双头像在线状态
    myUid: null,                   // 当前登录账号 UID
    partnerUid: null,              // 伴侣账号 UID  
    flashLock: false,              // 防抖锁：防止重复闪烁弹窗
    coupleId: null,               // 情侣房间 ID
    deviceId: null,               // 本设备唯一 ID
  };
  
  // ========== 初始化 ==========
  function init() {
    console.log('%c💕 实时同步模块 v6.0 启动中...', 'color: #ff6b9d; font-size: 14px; font-weight: bold');
    console.log('%c🚀 纯 WebSocket 毫秒级实时同步 · 零降级 · Telegram 级别', 'color: #4ecdc4; font-weight: bold');
    
    state.currentUser = detectCurrentUser();
    state.coupleId = localStorage.getItem('couple_id') || 'shushu-bibi';
    state.deviceId = localStorage.getItem('device_id') || generateDeviceId();
    localStorage.setItem('device_id', state.deviceId);
    
    state.mode = 'websocket';
    console.log('%c🔌 模式：纯 WebSocket 实时同步（Telegram 级别 · 零降级）', 'color: #4ecdc4');
    
    setupBroadcastChannel();
    setupStorageListener();
    
    setupOnlineIdentity();
    
    connectWebSocket();
    
    startHeartbeat();
    overrideDataFunctions();
    showSyncStatus();
    setupMobileLifecycle();
    
    console.log('%c✅ 实时同步已启动！纯 WebSocket 毫秒级 · 零降级', 'color: #95e1d3');
  }
  
  function detectCurrentUser() {
    const saved = localStorage.getItem('currentUser');
    if (saved) return saved;
    const minute = new Date().getMinutes();
    return minute % 2 === 0 ? 'bibi' : 'shushu';
  }

  function generateDeviceId() {
    const id = 'dev-' + Math.random().toString(36).substr(2, 9) + '-' + Date.now().toString(36);
    return id;
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
    
    const fullUrl = `${wsUrl}/ws?user=${encodeURIComponent(state.currentUser)}&couple=${encodeURIComponent(state.coupleId)}&device=${encodeURIComponent(state.deviceId)}`;
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
        
        // 初始化双头像状态：自己=绿灯在线，伴侣=灰灯待定
        setupOnlineIdentity();
        state.myOnlineSince = Date.now();
        renderDualStatus(state.myUid, 'online');
        renderDualStatus(state.partnerUid, false, '离线');
        
        // 发送在线状态
        sendWsMessage({
          type: 'heartbeat',
          user: state.currentUser,
          online: true,
        });
        
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
        
        // v4.0: DO 会在 90s 后自动推送离线广播
        
        // 自动重连（阶梯式 1s/3s/5s，不降级）
        scheduleReconnect();
      };
      
      state.ws.onerror = function(err) {
        console.error('⚠️ WebSocket 连接错误 · 将自动重连');
        state.wsConnected = false;
        updateWsIndicator(false);
      };
      
    } catch (e) {
      console.error('WebSocket 创建失败:', e.message);
      scheduleReconnect();
    }
  }
  
  function scheduleReconnect() {
    if (state.wsReconnectTimer) return;
    
    const steps = CONFIG.WS_RECONNECT_STEPS;
    let delay;
    if (state.wsReconnectAttempts < steps.length) {
      delay = steps[state.wsReconnectAttempts];
    } else {
      delay = CONFIG.WS_RECONNECT_STEADY;
    }
    
    state.wsReconnectAttempts++;
    
    console.log(`⏳ ${delay/1000}s 后尝试重连...(第${state.wsReconnectAttempts}次 阶梯模式)`);
    
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
        // v4.0 双头像在线状态 — 云端唯一真值，前端仅渲染
        // DO 后端广播格式: { user, targetUid, state('online'|'idle'|'offline') }
        var uid = data.targetUid || data.user;
        if (!uid) break;
        
        // 三态路由
        var docState;
        if (data.state === 'online' && data.online !== false) {
          docState = 'online';
        } else if (data.state === 'idle') {
          docState = 'idle';
        } else {
          docState = 'offline';
        }
        
        // 精准渲染对应UID的指示灯
        renderDualStatus(uid, docState);
        
        // 核心判断：仅伴侣上线才闪烁+弹窗，自身上线仅变绿灯无动画
        if (uid === state.partnerUid && (data.state === 'online') && data.online !== false) {
          if (state.flashLock) break;
          state.flashLock = true;
          
          // 清空全部闪烁，杜绝双头像同步闪烁
          var allStatus = document.querySelectorAll('.user-status');
          for (var i = 0; i < allStatus.length; i++) {
            allStatus[i].classList.remove('flash');
          }
          
          // 精准选中伴侣容器闪烁
          var partnerWrap = document.querySelector('.user-status[data-bind-uid="' + state.partnerUid + '"]');
          if (partnerWrap) {
            partnerWrap.classList.add('flash');
            var nick = data.nickname || (state.partnerUid === 'shushu' ? '鼠鼠' : '笔笔');
            showToast(nick + ' 刚刚上线啦！💕');
          }
          
          setTimeout(function() {
            if (partnerWrap) partnerWrap.classList.remove('flash');
            state.flashLock = false;
          }, 3000);
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
        // DO 推送心跳 — 表示对方 DO 驻留活跃，确认真实在线
        if (isFromPartner) {
          if (state.partnerState !== 'online') {
            // 状态跃迁：idle/offline → online
            state.partnerOnline = true;
            state.partnerState = 'online';
            state.partnerOnlineSince = Date.now();
            state.partnerOfflineSince = 0;
            renderDualStatus(state.partnerUid, 'online');
          } else {
            // 持续在线，仅更新时间戳
            state.partnerOnlineSince = state.partnerOnlineSince || Date.now();
          }
        }
        break;

      case 'e2ee_key_update':
        // 对方上传了 E2EE 公钥，通知刷新
        if (isFromPartner) {
          console.log('🔐 [E2EE] 收到对方公钥更新通知');
          window.dispatchEvent(new CustomEvent('e2ee_key_update'));
        }
        break;

      case 'message_edit':
        if (isFromPartner) {
          handleMessageEdit(data);
        }
        break;

      case 'message_delete':
        if (isFromPartner) {
          handleMessageDelete(data);
        }
        break;

      case 'message_batch':
        // 断线重连后补发的批量消息 (DO 缓冲)
        if (data.messages && data.messages.length > 0) {
          console.log(`[↻] 收到 ${data.messages.length} 条补发消息 (共漏 ${data.count || data.messages.length} 条)`);
          // 按时间戳排序
          data.messages.sort((a, b) => (a._ts || 0) - (b._ts || 0));
          for (const msg of data.messages) {
            if (msg.type === 'chat_message' && msg._from !== state.currentUser) {
              handleNewChatMessage(msg);
            } else if (msg.type === 'message_edit' && msg._from !== state.currentUser) {
              handleMessageEdit(msg);
            } else if (msg.type === 'message_delete' && msg._from !== state.currentUser) {
              handleMessageDelete(msg);
            }
          }
          showToast(`📬 已补发 ${data.messages.length} 条遗漏消息`);
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
        : '⏳ WebSocket 断开 · 自动重连中';
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
  
  // ==================== 心跳 / 在线状态 v4.0 双头像系统 ====================
  
  // UID 常量
  var UID_SHUSHU = 'shushu';
  var UID_BIBI = 'bibi';
  
  // 初始化双头像身份：识别当前登录账号和伴侣
  function setupOnlineIdentity() {
    state.myUid = state.currentUser;
    state.partnerUid = state.currentUser === UID_SHUSHU ? UID_BIBI : UID_SHUSHU;
    console.log('[OnlineStatus v4.0] My:', state.myUid, 'Partner:', state.partnerUid);
  }
  
  // === 核心渲染函数：精准更新单个大圆球 ===
  function renderDualStatus(targetUid, stateClass, extraInfo) {
    // stateClass: 'online' | 'idle' | 'offline'
    var wrap = document.querySelector('.user-status[data-bind-uid="' + targetUid + '"]');
    var infoEl = document.getElementById('info-' + targetUid);
    var circle = null;
    
    if (wrap) {
      circle = wrap.querySelector('.big-status-circle');
    }
    if (!circle) {
      circle = document.getElementById('circle-' + targetUid);
    }
    
    // 更新大圆球颜色 + 动画
    if (circle) {
      circle.className = 'big-status-circle ' + stateClass;
    }
    
    // 更新信息文本（在线时长/最近上线）
    if (infoEl) {
      if (stateClass === 'online') {
        infoEl.textContent = extraInfo || formatDuration(state, targetUid);
      } else if (stateClass === 'idle') {
        infoEl.textContent = extraInfo || '⚠ 休眠中';
      } else {
        infoEl.textContent = extraInfo || formatLastSeen(state, targetUid);
      }
    }
    
    // 更新内存状态
    var isOnline = (stateClass === 'online' || stateClass === 'idle');
    if (targetUid === state.partnerUid) {
      if (stateClass === 'online') {
        state.partnerOnline = true;
        state.partnerState = 'online';
        if (!state.partnerOnlineSince) {
          state.partnerOnlineSince = Date.now();
        }
        state.partnerOfflineSince = 0;
      } else if (stateClass === 'idle') {
        state.partnerOnline = true;
        state.partnerState = 'idle';
      } else {
        state.partnerOnline = false;
        state.partnerState = 'offline';
        if (!state.partnerOfflineSince) {
          state.partnerOfflineSince = Date.now();
        }
        state.partnerOnlineSince = 0;
      }
    }
    if (targetUid === state.myUid) {
      state.isOnline = isOnline;
    }
  }
  
  function formatDuration(st, uid) {
    var since;
    if (uid === st.myUid) {
      since = st.myOnlineSince;
    } else if (uid === st.partnerUid) {
      since = st.partnerOnlineSince;
    }
    if (!since) return '在线';
    var secs = Math.floor((Date.now() - since) / 1000);
    if (secs < 60) return '在线 ' + secs + '秒';
    var mins = Math.floor(secs / 60);
    if (mins < 60) return '在线 ' + mins + '分钟';
    var hours = Math.floor(mins / 60);
    if (hours < 24) return '在线 ' + hours + '小时' + (mins % 60) + '分';
    var days = Math.floor(hours / 24);
    return '在线 ' + days + '天' + (hours % 24) + '时';
  }
  
  function formatLastSeen(st, uid) {
    var since;
    if (uid === st.partnerUid) {
      since = st.partnerOfflineSince || st.partnerLastSeen;
    }
    if (!since) return '离线';
    var secs = Math.floor((Date.now() - since) / 1000);
    if (secs < 60) return '刚刚离线';
    var mins = Math.floor(secs / 60);
    if (mins < 60) return mins + '分钟前';
    var hours = Math.floor(mins / 60);
    if (hours < 24) return hours + '小时前';
    var days = Math.floor(hours / 24);
    return days + '天前';
  }
  
  // --- 手机切后台/前台处理 ---
  function setupMobileLifecycle() {
    var wasHidden = false;

    function onVisible() {
      if (document.hidden) {
        if (!wasHidden) {
          console.log('[v4.0] App entered background');
          wasHidden = true;
          sendWsMessage({ type: 'state_change', state: 'idle', user: state.currentUser, timestamp: Date.now() });
          renderDualStatus(state.myUid, 'idle');
          if (state.heartbeatTimer) {
            clearInterval(state.heartbeatTimer);
            state.heartbeatTimer = setInterval(updateOnlineStatus, 5000);
          }
        }
      } else {
        if (wasHidden) {
          console.log('[v4.0] App back to foreground');
          wasHidden = false;
          sendWsMessage({ type: 'state_change', state: 'online', user: state.currentUser, timestamp: Date.now() });
          renderDualStatus(state.myUid, 'online');
          updateOnlineStatus();
          if (!state.wsConnected) connectWebSocket();
          if (state.heartbeatTimer) {
            clearInterval(state.heartbeatTimer);
            state.heartbeatTimer = setInterval(updateOnlineStatus, 1000);
          }
        }
      }
    }

    document.addEventListener('visibilitychange', onVisible);
    window.addEventListener('pagehide', function() {
      sendWsMessage({ type: 'heartbeat', user: state.currentUser, online: true, timestamp: Date.now() });
    });
    window.addEventListener('pageshow', onVisible);
    console.log('[v4.0] Mobile lifecycle handler installed');
  }
  
  // --- 心跳：仅通过 WebSocket，不写 localStorage ---
  function startHeartbeat() {
    updateOnlineStatus();
    state.heartbeatTimer = setInterval(updateOnlineStatus, 1000);
  }
  
  // --- 定时更新在线时长显示 ---
  var _lastDurationUpdate = 0;
  function updateDurationDisplay() {
    var now = Date.now();
    if (now - _lastDurationUpdate < 2000) return; // 每2秒更新一次
    _lastDurationUpdate = now;
    
    // 自身
    if (state.isOnline && state.myOnlineSince) {
      var infoEl = document.getElementById('info-' + state.myUid);
      if (infoEl && infoEl.textContent.indexOf('在线') === 0) {
        infoEl.textContent = formatDuration(state, state.myUid);
      }
    }
    // 伴侣（如果在在线状态）
    if (state.partnerOnline && state.partnerOnlineSince) {
      var pInfoEl = document.getElementById('info-' + state.partnerUid);
      if (pInfoEl) {
        pInfoEl.textContent = formatDuration(state, state.partnerUid);
      }
    }
  }
  
  function updateOnlineStatus() {
    // 自身在线状态仅通过 WebSocket 上报，不写 localStorage
    state.isOnline = true;
    
    if (state.wsConnected) {
      sendWsMessage({
        type: 'heartbeat',
        user: state.currentUser,
        online: true,
        timestamp: Date.now(),
        precise: true,
      });
    }
    
    // 同浏览器多标签广播
    broadcast('heartbeat', { user: state.currentUser });
    
    // 更新自身状态指示灯
    if (!state.myOnlineSince) {
      state.myOnlineSince = Date.now();
    }
    renderDualStatus(state.myUid, 'online');
    
    // 更新时长显示
    updateDurationDisplay();
  }
  
  // --- 暴露 API 给其他模块 ---
  window._onlineStatus = {
    get partnerOnline() { return state.partnerOnline; },
    get partnerOnlineSince() { return state.partnerOnlineSince; },
    get partnerOfflineSince() { return state.partnerOfflineSince; },
    get isOnline() { return state.isOnline; },
  };

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
      
      // 4. UI 更新
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
    
    // Expose sendWsMessage for chatroom to send edit/delete
    window.sendWsMessage = sendWsMessage;

    console.log('✅ 数据函数已增强 (v6: 纯 WebSocket + BroadcastChannel · 零降级)');
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
      const { msgId: messageId, emoji, user } = data;
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
    renderDualStatus(user, true, '');
  }
  
  async function handleNewChatMessage(msg) {
    if (msg.from !== state.currentUser) {
      playNotificationSound();
      updateUnreadBadge('chat', 1);

      try {
        const key = 'chat_messages';
        const existingRaw = localStorage.getItem(key);
        const existing = existingRaw ? JSON.parse(existingRaw) : [];

        // E2EE decrypt
        let displayText = msg.text;
        if (msg.encrypted && msg.iv && window.E2EE && window.E2EE.isReady()) {
          const decrypted = await window.E2EE.decrypt(msg.text, msg.iv);
          if (decrypted !== null) {
            displayText = decrypted;
          } else {
            displayText = '🔒 [加密消息 - 解密失败]';
          }
        } else if (msg.encrypted && msg.iv) {
          displayText = '🔒 [加密消息 - 等待密钥]';
        }

        const newMsg = {
          id: msg.id || (Date.now().toString(36) + Math.random().toString(36).substr(2, 5)),
          from: msg.from,
          text: displayText,
          time: msg.time || new Date().toISOString(),
          type: msg.type || 'text',
          read: false,
          encrypted: !!msg.encrypted,
          replyTo: msg.replyTo || null,
          voiceData: msg.voiceData || msg.voiceId || null,
          audio: (() => {
            const vd = msg.voiceData || msg.voiceId;
            if (!vd) return msg.audio || null;
            return vd.startsWith('voice/') ? ('https://ws.shushu-bibi.cn/api/voice/' + vd) : vd;
          })(),
          duration: msg.duration || null,
          edited: !!msg.edited,
          deleted: !!msg.deleted,
        };
        existing.push(newMsg);
        localStorage.setItem(key, JSON.stringify(existing));
        broadcast('chat_message', { message: newMsg });
        console.log('💌 消息已存入 localStorage' + (msg.encrypted ? ' (已解密)' : ''));
      } catch (e) {
        console.error('保存接收消息失败:', e);
      }
    }
  }

  // --- Message edit handler ---
  function handleMessageEdit(data) {
    try {
      const key = 'chat_messages';
      const raw = localStorage.getItem(key);
      if (!raw) return;
      const messages = JSON.parse(raw);
      const msg = messages.find(m => m.id === data.id);
      if (!msg) return;

      // Decrypt if needed
      let newText = data.text;
      if (data.iv && window.E2EE && window.E2EE.isReady()) {
        const dec = window.E2EE.decrypt(data.text, data.iv);
        if (dec !== null) newText = dec;
      }

      // 保存编辑历史
      const oldText = msg.text || '';
      if (!msg.editHistory) msg.editHistory = [];
      msg.editHistory.push({ oldText: oldText, newText: newText, editedAt: Date.now() });
      msg.text = newText;
      msg.edited = true;
      msg.editCount = (msg.editCount || 0) + 1;
      localStorage.setItem(key, JSON.stringify(messages));

      if (window.ChatRoom && window.ChatRoom.renderMessages) {
        window.ChatRoom.renderMessages();
      }
      console.log('✏️ 消息已编辑:', data.id);
    } catch (e) {
      console.error('处理消息编辑失败:', e);
    }
  }

  // --- Message delete handler (撤回) ---
  function handleMessageDelete(data) {
    try {
      const key = 'chat_messages';
      const raw = localStorage.getItem(key);
      if (!raw) return;
      const messages = JSON.parse(raw);
      const msg = messages.find(m => m.id === data.id);
      if (!msg) return;

      // 标记撤回，不直接删除（保留占位）
      msg.recalled = true;
      msg.recalledAt = Date.now();
      msg.originalText = msg.text;
      msg.text = '';
      localStorage.setItem(key, JSON.stringify(messages));

      if (window.ChatRoom && window.ChatRoom.renderMessages) {
        window.ChatRoom.renderMessages();
      }
      console.log('⤺ 消息已撤回:', data.id);
    } catch (e) {
      console.error('处理消息撤回失败:', e);
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
  
  function showWsConfigModal() {
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
          box-shadow: 0 20px 60px rgba(0,0,0,0.5), 0 0 80px rgba(78,205,196,0.15);
          animation: tokenSlideUp 0.35s cubic-bezier(0.175, 0.885, 0.32, 1.275);
        }
        @keyframes tokenSlideUp { from{transform:translateY(30px);opacity:0} to{transform:translateY(0);opacity:1} }
        .token-modal h3 { color: #fff; font-size: 20px; margin: 0 0 6px; text-align: center; font-weight: 600; }
        .token-modal .subtitle { color: rgba(255,255,255,0.5); font-size: 12px; text-align: center; margin-bottom: 20px; }
        .token-modal .hint { color: rgba(255,255,255,0.5); font-size: 11px; margin: 8px 0 0; line-height: 1.6; }
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
        .token-modal input:focus { border-color: #4ecdc4; box-shadow: 0 0 0 3px rgba(78,205,196,0.15); }
        .token-modal .btns { display: flex; gap: 10px; margin-top: 20px; }
        .token-modal .btn {
          flex: 1; padding: 11px; border-radius: 10px;
          border: none; font-size: 14px; font-weight: 600;
          cursor: pointer; transition: all 0.2s;
        }
        .token-modal .btn-primary {
          background: linear-gradient(135deg, #4ecdc4, #44b5ad);
          color: #fff;
        }
        .token-modal .btn-primary:hover { transform: translateY(-1px); box-shadow: 0 6px 20px rgba(78,205,196,0.4); }
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
        <h3>WebSocket 实时同步配置</h3>
        <p class="subtitle">Cloudflare Durable Object · Telegram 级别 · 零降级</p>

        <label for="ws-url-input">WebSocket 地址</label>
        <input type="text" id="ws-url-input" placeholder="wss://ws.shushu-bibi.cn" autocomplete="off">
        <p class="error-msg" id="ws-error"></p>

        <div class="btns">
          <button class="btn btn-ghost" id="token-skip">取消</button>
          <button class="btn btn-primary" id="token-save">💾 保存并重连</button>
        </div>
        <p class="hint">
          💡 当前已部署：<b>ws.shushu-bibi.cn</b>（Cloudflare Durable Object）<br>
          修改后会自动断开并重连到新地址
        </p>
      </div>
    `;

    document.body.appendChild(overlay);

    const wsInput = document.getElementById('ws-url-input');
    const wsErr = document.getElementById('ws-error');

    const savedWs = getWsUrl();
    if (savedWs && !savedWs.includes('YOUR_SUBDOMAIN')) {
      wsInput.value = savedWs;
    }

    document.getElementById('token-save').onclick = function() {
      const wsUrl = wsInput.value.trim();
      
      if (wsUrl && wsUrl.startsWith('wss://')) {
        setWsUrl(wsUrl);
        wsErr.style.display = 'none';
        
        const okEl = document.getElementById('token-ok');
        if (okEl) {
          okEl.textContent = '✅ 已保存！正在重连...';
          okEl.style.display = 'block';
        }
        
        setTimeout(() => {
          overlay.remove();
          connectWebSocket();
          showToast('⚡ WebSocket 已重连！');
        }, 1200);
      } else if (wsUrl && !wsUrl.startsWith('wss://')) {
        wsErr.textContent = 'WebSocket URL 必须以 wss:// 开头';
        wsErr.style.display = 'block';
      } else {
        overlay.remove();
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
        <span style="color:#666">${isWs ? '⚡ WebSocket 实时连接 · 50-150ms' : '⏳ WebSocket 重连中...'}</span>
        <span id="sync-settings-btn" title="WebSocket 设置" style="cursor:pointer;font-size:13px;opacity:0.6;margin-left:2px;transition:opacity 0.2s" onmouseover="this.style.opacity='1'" onmouseout="this.style.opacity='0.6'">⚙️</span>
      </div>
    `;
    document.body.appendChild(statusEl);
    
    setTimeout(function() {
      const btn = document.getElementById('sync-settings-btn');
      if (btn) btn.onclick = showWsConfigModal;
    }, 100);
  }
  
  // ==================== 公开 API ====================
  
  window.forceSyncAll = function() {
    showToast('✅ 纯 WebSocket 模式 · 无需手动同步 · 消息实时到达');
  };
  
  window.switchUser = function(user) {
    if (user === 'shushu' || user === 'bibi') {
      localStorage.setItem('currentUser', user);
      state.currentUser = user;
      // 🔥 立即更新 myUid/partnerUid，不等待 WS 重连
      setupOnlineIdentity();
      // 🔥 立即渲染正确的指示灯（自己=绿，伴侣=灰）
      renderDualStatus(state.myUid, 'online');
      renderDualStatus(state.partnerUid, 'offline', '离线');
      if (state.myOnlineSince) {
        var inf = document.getElementById('info-' + state.myUid);
        if (inf) inf.textContent = formatDuration(state, state.myUid);
      }
      showToast(`🔑 切换为：${user === 'shushu' ? '🐹鼠鼠' : '🐱笔笔'}`);
      updateOnlineStatus();
      // 重连 WebSocket 以切换身份
      if (state.wsConnected) {
        if (state.ws) { try { state.ws.close(); } catch(e) {} }
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
      partnerOnlineSince: state.partnerOnlineSince,
      partnerOfflineSince: state.partnerOfflineSince,
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
