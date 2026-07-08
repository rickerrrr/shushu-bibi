/* ================================================================
   身份管理系统 v1.0 — 统一身份 + 在线状态 + UI 主题

   功能：
   1. 身份持久化 (localStorage currentUser)
   2. 多次登录同身份无 BUG（强制覆盖，禁止错乱）
   3. 在线状态显示：bibi→右上角"笔笔在线"淡黄；shushu→无自标识
   4. 顶部仅展示对方在线/离线（bibi只显鼠鼠、shushu只显笔笔）
   5. 每3分钟自动同步对方在线状态 + 本地缓存
   6. 同身份单设备在线（新登录挤下线旧会话）
   7. 全局 UI 主题：bibi→猫咪素材+配色；shushu→老鼠素材+配色
   ================================================================ */

(function() {
  'use strict';

  // ── 常量 ─────────────────────────────────────────────────────
  const STORAGE_KEY_USER = 'currentUser';          // 身份持久化
  const SYNC_INTERVAL = 3 * 60 * 1000;             // 3分钟同步
  const HEARTBEAT_INTERVAL = 30 * 1000;            // 30秒心跳
  const OFFLINE_TIMEOUT = 90 * 1000;               // 90秒无心跳=离线
  const BROADCAST_CHANNEL = 'shushu-bibi-identity';
  const SESSION_ID = 'session_' + Date.now() + '_' + Math.random().toString(36).slice(2, 8);

  // ── 状态 ─────────────────────────────────────────────────────
  let currentUser = null;
  let syncTimer = null;
  let heartbeatTimer = null;
  let bcChannel = null;

  // ── 身份数据 ─────────────────────────────────────────────────
  const IDENTITIES = {
    shushu: {
      emoji: '🐹', name: '鼠鼠', nickColor: '#0284c7',
      cssClass: 'user-shushu',
      bgTint: 'rgba(2,132,199,0.04)', accentColor: '#0284c7'
    },
    bibi: {
      emoji: '🐱', name: '笔笔', nickColor: '#e8d44d',
      cssClass: 'user-bibi',
      bgTint: 'rgba(232,212,77,0.04)', accentColor: '#e8d44d'
    }
  };

  // ── 公开 API ─────────────────────────────────────────────────

  /**
   * 获取当前身份
   */
  function getIdentity() {
    if (!currentUser) {
      currentUser = localStorage.getItem(STORAGE_KEY_USER);
    }
    return currentUser || null;
  }

  /**
   * 设置身份（登录时调用）
   * 强制覆盖，禁止身份错乱
   */
  function setIdentity(user) {
    if (user !== 'shushu' && user !== 'bibi') {
      console.error('[Identity] 非法身份:', user);
      return false;
    }
    currentUser = user;
    localStorage.setItem(STORAGE_KEY_USER, user);
    console.log('[Identity] 身份设置:', user, IDENTITIES[user].name);

    // 写入设备心跳
    writeHeartbeat();

    // 广播身份变更（用于挤下线旧会话）
    broadcastIdentity();

    // 应用 UI 主题
    applyTheme();

    // 更新在线状态显示
    updatePartnerStatus();

    return true;
  }

  /**
   * 清除身份（登出时调用）
   */
  function clearIdentity() {
    currentUser = null;
    localStorage.removeItem(STORAGE_KEY_USER);
    clearHeartbeat();

    // 广播登出
    if (bcChannel) {
      bcChannel.postMessage({ type: 'logout', session: SESSION_ID, user: getIdentity() });
    }

    // 清除 UI 主题
    document.body.classList.remove('user-shushu', 'user-bibi');

    console.log('[Identity] 身份已清除');
  }

  // ── 在线状态 ─────────────────────────────────────────────────

  /**
   * 写入本机心跳
   */
  function writeHeartbeat() {
    if (!currentUser) return;
    const key = 'online_status_' + currentUser;
    const partner = currentUser === 'shushu' ? 'bibi' : 'shushu';
    const partnerKey = 'online_status_' + partner;

    // 更新自己的心跳
    localStorage.setItem(key, JSON.stringify({
      user: currentUser,
      online: true,
      lastSeen: Date.now(),
      session: SESSION_ID
    }));

    // 清除自己的旧心跳键（清理）
    localStorage.setItem('partner_last_seen', JSON.stringify({
      user: currentUser,
      time: Date.now()
    }));

    // 通过 BroadcastChannel 广播
    if (bcChannel) {
      bcChannel.postMessage({
        type: 'heartbeat',
        user: currentUser,
        session: SESSION_ID,
        timestamp: Date.now()
      });
    }
  }

  /**
   * 清除本机心跳
   */
  function clearHeartbeat() {
    if (!currentUser) return;
    const key = 'online_status_' + currentUser;
    localStorage.setItem(key, JSON.stringify({
      user: currentUser,
      online: false,
      lastSeen: Date.now(),
      session: SESSION_ID
    }));
  }

  // 页面关闭/隐藏时清除本机在线状态（90秒后对方显示离线）
  function setupVisibilityHandler() {
    document.addEventListener('visibilitychange', () => {
      if (document.hidden) {
        clearHeartbeat();
      } else {
        writeHeartbeat();
      }
    });
    window.addEventListener('beforeunload', () => {
      clearHeartbeat();
    });
    window.addEventListener('pagehide', () => {
      clearHeartbeat();
    });
  }

  /**
   * 获取对方在线状态
   */
  function getPartnerStatus() {
    const user = getIdentity();
    if (!user) return null;

    const partner = user === 'shushu' ? 'bibi' : 'shushu';
    const key = 'online_status_' + partner;
    const name = IDENTITIES[partner].name;
    const emoji = IDENTITIES[partner].emoji;

    try {
      const raw = localStorage.getItem(key);
      if (!raw) return { user: partner, emoji, name, status: 'offline', lastSeen: 0 };

      const data = JSON.parse(raw);
      const now = Date.now();
      const elapsed = now - data.lastSeen;

      if (!data.online) {
        return { user: partner, emoji, name, status: 'offline', lastSeen: data.lastSeen };
      }

      if (elapsed < OFFLINE_TIMEOUT) {
        return { user: partner, emoji, name, status: 'online', lastSeen: data.lastSeen };
      } else {
        return { user: partner, emoji, name, status: 'offline', lastSeen: data.lastSeen };
      }
    } catch (e) {
      return { user: partner, emoji, name, status: 'offline', lastSeen: 0 };
    }
  }

  /**
   * 更新页面上的对方在线状态显示
   * （btn-online 已从 top-bar 移除，保留状态缓存逻辑）
   */
  function updatePartnerStatus() {
    const user = getIdentity();
    if (!user) return;

    const status = getPartnerStatus();
    if (!status) return;

    // 保存到本地缓存（减少闪烁）
    try {
      localStorage.setItem('partner_status_cache', JSON.stringify({
        user: status.user,
        status: status.status,
        lastSeen: status.lastSeen,
        cachedAt: Date.now()
      }));
    } catch (e) {}
  }

  // ── UI 主题 ──────────────────────────────────────────────────

  /**
   * 应用身份专属 UI 主题
   */
  function applyTheme() {
    const user = getIdentity();
    if (!user) return;

    const identity = IDENTITIES[user];

    // 移除旧主题，添加新主题
    document.body.classList.remove('user-shushu', 'user-bibi');
    document.body.classList.add(identity.cssClass);

    // 设置 CSS 变量（专属配色）
    const root = document.documentElement;
    if (identity.accentColor) {
      root.style.setProperty('--identity-accent', identity.accentColor);
    }
    if (identity.bgTint) {
      root.style.setProperty('--identity-bg-tint', identity.bgTint);
    }

    // 更新问候语、昵称等
    updateIdentityUI();

    console.log('[Identity] 主题应用:', identity.name, identity.cssClass);
  }

  /**
   * 更新页面中所有身份相关 UI 元素
   */
  function updateIdentityUI() {
    const user = getIdentity();
    if (!user) return;

    const identity = IDENTITIES[user];

    // 问候语
    const greetingUser = document.getElementById('greeting-user');
    if (greetingUser) {
      greetingUser.textContent = identity.emoji + ' ' + identity.name;
    }

    // 更新昵称高亮
    const nickShushu = document.querySelector('.nick-shushu');
    const nickBibi = document.querySelector('.nick-bibi');
    if (user === 'shushu') {
      if (nickShushu) nickShushu.style.fontWeight = '800';
      if (nickBibi) nickBibi.style.fontWeight = '400';
    } else {
      if (nickShushu) nickShushu.style.fontWeight = '400';
      if (nickBibi) nickBibi.style.fontWeight = '800';
    }
  }

  // ── BroadcastChannel 通信 ────────────────────────────────────

  /**
   * 初始化 BroadcastChannel
   */
  function initBC() {
    try {
      bcChannel = new BroadcastChannel(BROADCAST_CHANNEL);
    } catch (e) {
      console.warn('[Identity] BroadcastChannel 不可用');
      return;
    }

    bcChannel.onmessage = function(e) {
      const msg = e.data;
      if (!msg || !msg.type) return;

      switch (msg.type) {
        case 'heartbeat':
          // 其他标签页的心跳 — 如果同身份同设备，忽略
          if (msg.user === getIdentity() && msg.session === SESSION_ID) return;

          // 更新对方状态缓存
          if (msg.user !== getIdentity()) {
            updatePartnerStatus();
          }

          // 同身份不同 session（另一设备）— 被挤下线
          if (msg.user === getIdentity() && msg.session !== SESSION_ID) {
            handleKickOut(msg);
          }
          break;

        case 'identity_change':
          // 身份变更广播
          if (msg.user !== getIdentity()) {
            updatePartnerStatus();
          }
          break;

        case 'logout':
          // 对方登出
          if (msg.user !== getIdentity()) {
            updatePartnerStatus();
          }
          break;

        case 'kick':
          // 被明确踢下线
          if (msg.targetSession === SESSION_ID) {
            console.warn('[Identity] 被踢下线 — 同身份在其他设备登录');
            window.IdentitySystem.handleKick();
          }
          break;
      }
    };
  }

  /**
   * 广播本机身份
   */
  function broadcastIdentity() {
    if (!bcChannel || !currentUser) return;
    bcChannel.postMessage({
      type: 'identity_change',
      user: currentUser,
      session: SESSION_ID,
      timestamp: Date.now()
    });
  }

  /**
   * 同身份多设备 — 向旧会话发送踢下线消息
   */
  function handleKickOut(msg) {
    if (!bcChannel) return;
    // 新设备向旧设备发踢下线通知
    bcChannel.postMessage({
      type: 'kick',
      user: getIdentity(),
      session: SESSION_ID,
      targetSession: msg.session,
      timestamp: Date.now(),
      reason: '同身份仅限单设备在线'
    });
  }

  // ── 定时同步 ─────────────────────────────────────────────────

  /**
   * 启动定时同步
   */
  function startSync() {
    stopSync();

    // 立即执行一次
    updatePartnerStatus();
    writeHeartbeat();

    // 每3分钟同步对方状态
    syncTimer = setInterval(() => {
      updatePartnerStatus();
    }, SYNC_INTERVAL);

    // 每30秒写入心跳
    heartbeatTimer = setInterval(() => {
      writeHeartbeat();
    }, HEARTBEAT_INTERVAL);

    console.log('[Identity] 同步已启动 (对方状态=' + (SYNC_INTERVAL/60000) + 'min, 心跳=' + (HEARTBEAT_INTERVAL/1000) + 's)');
  }

  /**
   * 停止定时同步
   */
  function stopSync() {
    if (syncTimer) { clearInterval(syncTimer); syncTimer = null; }
    if (heartbeatTimer) { clearInterval(heartbeatTimer); heartbeatTimer = null; }
  }

  // ── 被踢下线处理 ─────────────────────────────────────────────

  function handleKick() {
    stopSync();
    clearIdentity();

    // 显示提示
    if (typeof showToast === 'function') {
      showToast('⚠️ 该账号已在其他设备登录，当前会话已下线');
    }

    // 返回登录页：移除 pre-logged-in 让 CSS 默认显示登录页
    document.documentElement.classList.remove('pre-logged-in');
    document.body.classList.remove('logged-in');
  }

  // ── 初始化 ──────────────────────────────────────────────────

  function init() {
    // 读取已保存的身份
    const saved = localStorage.getItem(STORAGE_KEY_USER);
    if (saved && (saved === 'shushu' || saved === 'bibi')) {
      currentUser = saved;
      console.log('[Identity] 从缓存恢复身份:', currentUser, IDENTITIES[currentUser].name);
    }

    // 初始化 BroadcastChannel
    initBC();

    // 设置页面可见性监听（90秒离线）
    setupVisibilityHandler();

    // 如果已登录，启动同步 + 主题
    if (currentUser) {
      applyTheme();
      updatePartnerStatus();
      startSync();
    }

    console.log('[Identity] v2.0 初始化完成, 当前身份:', currentUser || '未登录');
  }

  // ── 暴露 API ─────────────────────────────────────────────────

  window.IdentitySystem = {
    init,
    getIdentity,
    setIdentity,
    clearIdentity,
    getPartnerStatus,
    updatePartnerStatus,
    applyTheme,
    startSync,
    stopSync,
    handleKick,
    writeHeartbeat
  };

  // DOM 加载后初始化
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

})();
