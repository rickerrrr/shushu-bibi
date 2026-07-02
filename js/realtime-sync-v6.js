/**
 * 数据层 — 纯 localStorage 模式 (WebSocket 已移除)
 * 等待后端重部署后恢复 WebSocket
 */

(function() {
  'use strict';

  // ========== 状态管理 ==========
  const state = {
    currentUser: null,
    channel: null,
  };

  // ========== 初始化 ==========
  function init() {
    console.log('%c�' 数据层启动 — localStorage 模式', 'color: #ffe66d; font-size: 14px; font-weight: bold');
    console.log('%c💡 WebSocket 后端未部署，当前仅支持同浏览器多标签实时同步', 'color: #95e1d3');

    state.currentUser = detectCurrentUser();
    setupBroadcastChannel();
    setupStorageListener();
    overrideDataFunctions();

    console.log('%c✅ 纯 localStorage 模式已就绪', 'color: #95e1d3');
  }

  function detectCurrentUser() {
    const saved = localStorage.getItem('currentUser');
    if (saved) return saved;
    const minute = new Date().getMinutes();
    return minute % 2 === 0 ? 'bibi' : 'shushu';
  }

  // ==================== BroadcastChannel (同浏览器多标签) ====================

  function setupBroadcastChannel() {
    try {
      state.channel = new BroadcastChannel('love_website_sync');

      state.channel.onmessage = function(event) {
        const data = event.data;
        if (!data || !data.type) return;

        switch (data.type) {
          case 'data_update':
            if (data.key && data.value !== undefined) {
              localStorage.setItem(data.key, JSON.stringify(data.value));
              if (typeof window.refreshUI === 'function') {
                window.refreshUI(data.key, data.value);
              }
            }
            break;
          case 'chat_message':
            // 其他标签收到聊天消息
            break;
          case 'message_wall':
            // 其他标签收到留言
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
      try {
        const newValue = event.newValue ? JSON.parse(event.newValue) : null;
        if (typeof window.refreshUI === 'function') {
          window.refreshUI(event.key, newValue);
        }
      } catch (e) {}
    });
    console.log('👂 Storage 监听器已设置');
  }

  // ==================== 数据函数 ====================

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
      localStorage.setItem(key, JSON.stringify(value));
      broadcast('data_update', { key, value });
      return value;
    };

    // 发送聊天消息
    window.sendChatMessage = function(msgObj) {
      const key = 'chat_messages';
      const messages = window.getData(key) || [];
      if (!messages.find(m => m.id === msgObj.id)) {
        messages.push(msgObj);
      }
      window.setData(key, messages);
      broadcast('chat_message', { message: msgObj });
      return msgObj;
    };

    // 发送留言墙消息
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
      broadcast('message_wall', { message: wallObj });

      return wallObj;
    };

    console.log('✅ 数据函数已就绪');
  }

  // ==================== 公开 API ====================

  window.switchUser = function(user) {
    if (user === 'shushu' || user === 'bibi') {
      localStorage.setItem('currentUser', user);
      state.currentUser = user;
      console.log('切换用户：', user === 'shushu' ? '鼠鼠' : '笔笔');
    }
  };

  window.getSyncState = function() {
    return {
      mode: 'local',
      currentUser: state.currentUser,
    };
  };

  // ==================== 启动 ====================

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', function() { setTimeout(init, 500); });
  } else {
    setTimeout(init, 500);
  }

  window.RealtimeSync = {
    getState: function() { return state; },
    getSyncState: window.getSyncState,
    switchUser: window.switchUser,
    sendMessage: window.sendChatMessage,
    sendWall: window.sendWallMessage,
  };

})();
