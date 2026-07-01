/**
 * 鼠鼠和笔笔 · 通知推送系统 v1.1
 * 双通道: WebSocket 实时 + Service Worker 离线兜底
 * 免打扰时段: 23:00-07:00
 */
(function() {
  'use strict';

  const API = 'https://ws.shushu-bibi.cn/api';
  const VAPID_PUBLIC_KEY = 'BMdLkPQENJhGqPmXHwSXBFJ8qWNrYHxGKPQyLDZKdXNmcZR_hHGVhL8mXQJXnJpTRVdQKjPKYhLKQFPNnMjXMcE';

  const state = {
    swRegistered: false,
    pushSubscribed: false,
    pushSubscription: null,
    notificationEnabled: true,
    quietHours: { start: '23:00', end: '07:00' },
    lastNotificationTime: 0,
    NOTIFICATION_COOLDOWN: 3000,
  };

  // === Init ===
  async function init() {
    console.log('通知系统初始化...');
    await loadConfig();
    await registerServiceWorker();
    if (state.swRegistered && state.notificationEnabled) {
      await subscribePush();
    }
    setupMessageListener();
    console.log('通知系统就绪 (SW:', state.swRegistered, 'Push:', state.pushSubscribed, ')');
  }

  // === Load user config ===
  async function loadConfig() {
    try {
      const userId = localStorage.getItem('currentUser') || 'shushu';
      const resp = await fetch(`${API}/user-config?user_id=${userId}`);
      const data = await resp.json();
      if (data.success && data.config) {
        state.notificationEnabled = data.config.notification_enabled === 1;
        state.quietHours = {
          start: data.config.quiet_hours_start || '23:00',
          end: data.config.quiet_hours_end || '07:00',
        };
      }
    } catch (e) {
      console.log('加载通知配置失败，使用默认值');
    }
  }

  // === Register Service Worker ===
  async function registerServiceWorker() {
    if (!('serviceWorker' in navigator)) {
      console.warn('浏览器不支持 Service Worker，离线推送不可用');
      return;
    }

    try {
      const registration = await navigator.serviceWorker.register('/sw.js?v=10.0');
      console.log('Service Worker 注册成功:', registration.scope);
      state.swRegistered = true;

      registration.addEventListener('updatefound', () => {
        const newWorker = registration.installing;
        if (newWorker) {
          newWorker.addEventListener('statechange', () => {
            if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
              console.log('新版本 SW 已安装，刷新后生效');
            }
          });
        }
      });
    } catch (e) {
      console.error('Service Worker 注册失败:', e.message);
      state.swRegistered = false;
    }
  }

  // === Subscribe Push ===
  async function subscribePush() {
    if (!('PushManager' in window)) {
      console.warn('浏览器不支持 Push API');
      return;
    }

    try {
      const registration = await navigator.serviceWorker.ready;
      const permission = await Notification.requestPermission();

      if (permission !== 'granted') {
        console.log('用户未授权通知权限');
        showPermissionHint();
        return;
      }

      let subscription = await registration.pushManager.getSubscription();
      if (!subscription) {
        subscription = await registration.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY),
        });
      }

      state.pushSubscribed = true;
      state.pushSubscription = subscription;

      // 发送订阅信息到后端
      try {
        const userId = localStorage.getItem('currentUser') || 'shushu';
        const rawKey = subscription.getKey('p256dh');
        const rawAuth = subscription.getKey('auth');
        await fetch(`${API}/push/subscribe`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            user_id: userId,
            endpoint: subscription.endpoint,
            p256dh_key: rawKey ? btoa(String.fromCharCode(...new Uint8Array(rawKey))) : '',
            auth_key: rawAuth ? btoa(String.fromCharCode(...new Uint8Array(rawAuth))) : '',
            device_name: navigator.userAgent.slice(0, 100),
          }),
        });
        console.log('Push 订阅已同步到后端');
      } catch (e) {
        console.error('Push 订阅同步失败:', e.message);
      }
    } catch (e) {
      console.error('Push 订阅失败:', e.message);
    }
  }

  // === Listen for WebSocket notifications (from realtime-sync) ===
  function setupMessageListener() {
    window.addEventListener('shushu-notification', (event) => {
      const { type, title, body, payload } = event.detail || {};
      showLocalNotification(type, title, body, payload);
    });

    // Hook into WebSocket message handler
    const originalHandler = window.onWsNotification;
    window.onWsNotification = function(data) {
      if (originalHandler) originalHandler(data);

      if (data.type === 'chat_message' && data._from !== (localStorage.getItem('currentUser') || 'shushu')) {
        const nick = data._from === 'shushu' ? '鼠鼠' : '笔笔';
        if (data.type === 'voice') {
          showLocalNotification('voice', `${nick} 发来语音`, '点击收听语音消息', { msgId: data.id });
        } else {
          const preview = (data.text || '').slice(0, 50);
          showLocalNotification('message', `${nick}: ${preview}`, '点击查看消息', { msgId: data.id });
        }
      }

      if (data.type === 'online_status' && data.user !== (localStorage.getItem('currentUser') || 'shushu')) {
        if (data.online && data.state === 'online') {
          const nick = data.user === 'shushu' ? '鼠鼠' : '笔笔';
          showLocalNotification('status', `${nick} 上线了！`, '✨ 现在可以开始聊天啦', {});
        }
      }

      if (data.type === 'timecapsule_unlock') {
        showLocalNotification('capsule', '🔮 时光胶囊已解锁！', data.title || '有一封新胶囊等待查看', {});
      }

      if (data.type === 'anniversary_reminder') {
        showLocalNotification('anniversary', '💕 纪念日提醒', data.title || '今天是个特别的日子', {});
      }
    };
  }

  // === Show Local Notification (in-page toast) ===
  function showLocalNotification(type, title, body, payload) {
    const now = Date.now();
    if (now - state.lastNotificationTime < state.NOTIFICATION_COOLDOWN && type === 'message') return;
    state.lastNotificationTime = now;

    // 免打扰检查
    if (isInQuietHours()) {
      console.log('免打扰时段，静默处理');
      return;
    }

    // In-page toast
    showToast(title, body, type);

    // System notification (via Service Worker)
    if (state.pushSubscribed && state.notificationEnabled && document.hidden) {
      // Already handled by push channel
      return;
    }
  }

  function showToast(title, body, type) {
    let container = document.getElementById('notification-toast-container');
    if (!container) {
      container = document.createElement('div');
      container.id = 'notification-toast-container';
      container.style.cssText = 'position:fixed;top:70px;right:20px;z-index:99999;display:flex;flex-direction:column;gap:8px;pointer-events:none;';
      document.body.appendChild(container);
    }

    const toast = document.createElement('div');
    const icons = { message: '💬', voice: '🎤', status: '💚', capsule: '🔮', anniversary: '💕' };
    const icon = icons[type] || '🔔';
    toast.style.cssText = `
      background: rgba(255,255,255,0.95); backdrop-filter: blur(10px);
      border-radius: 12px; padding: 12px 16px; box-shadow: 0 4px 20px rgba(0,0,0,0.15);
      display: flex; align-items: center; gap: 10px; font-size: 14px;
      max-width: 320px; animation: toastSlideIn 0.3s ease; pointer-events: auto;
      cursor: pointer; border-left: 3px solid #ff6b9d;
    `;
    toast.innerHTML = `<span style="font-size:20px">${icon}</span><div><div style="font-weight:600;color:#333">${escapeHtml(title)}</div><div style="color:#888;font-size:12px;margin-top:2px">${escapeHtml(body)}</div></div>`;
    toast.onclick = () => {
      toast.remove();
      window.focus();
    };

    container.appendChild(toast);
    setTimeout(() => {
      toast.style.opacity = '0';
      toast.style.transform = 'translateX(100px)';
      toast.style.transition = 'all 0.3s ease';
      setTimeout(() => toast.remove(), 300);
    }, 4000);
  }

  function showPermissionHint() {
    const hint = document.createElement('div');
    hint.id = 'notification-permission-hint';
    hint.style.cssText = `
      position: fixed; bottom: 80px; left: 50%; transform: translateX(-50%);
      background: rgba(0,0,0,0.85); color: #fff; padding: 10px 20px;
      border-radius: 20px; font-size: 13px; z-index: 9999;
      animation: toastSlideIn 0.3s ease; cursor: pointer;
    `;
    hint.textContent = '开启通知，实时接收所有消息';
    hint.onclick = () => {
      subscribePush();
      hint.remove();
    };
    document.body.appendChild(hint);
    setTimeout(() => hint.remove(), 8000);
  }

  function isInQuietHours() {
    const now = new Date();
    const hours = now.getHours();
    const minutes = now.getMinutes();
    const current = hours * 60 + minutes;

    const [sh, sm] = state.quietHours.start.split(':').map(Number);
    const [eh, em] = state.quietHours.end.split(':').map(Number);
    const start = sh * 60 + sm;
    const end = eh * 60 + em;

    if (start <= end) {
      return current >= start && current < end;
    } else {
      // Crosses midnight
      return current >= start || current < end;
    }
  }

  // === Update quiet hours ===
  window.updateQuietHours = function(start, end) {
    state.quietHours = { start, end };
  };

  // === Manual subscribe ===
  window.subscribeNotifications = subscribePush;

  // === Helper ===
  function urlBase64ToUint8Array(base64String) {
    const padding = '='.repeat((4 - base64String.length % 4) % 4);
    const base64 = (base64String + padding).replace(/\-/g, '+').replace(/_/g, '/');
    const rawData = atob(base64);
    const outputArray = new Uint8Array(rawData.length);
    for (let i = 0; i < rawData.length; ++i) {
      outputArray[i] = rawData.charCodeAt(i);
    }
    return outputArray;
  }

  function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }

  // === Auto-init ===
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
