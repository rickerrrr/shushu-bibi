/**
 * 聊天室特效增强 v8.3
 * - 心动特效（发送爱心词汇触发）
 * - 在线状态优化
 * - 浪漫动画
 */

(function() {
  'use strict';

  // ========== 心动特效 ==========

  const HEART_TRIGGERS = ['我爱你', '想你', '爱你', '么么哒', '亲亲', '抱抱', '❤️', '💕', '💖', '😘', '喜欢你'];

  function checkHeartTrigger(text) {
    return HEART_TRIGGERS.some(trigger => text.includes(trigger));
  }

  window.ChatRoom.triggerHeartEffect = function() {
    const overlay = document.createElement('div');
    overlay.style.cssText = `
      position: fixed;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      pointer-events: none;
      z-index: 99999;
    `;
    document.body.appendChild(overlay);

    // 创建多个爱心
    for (let i = 0; i < 20; i++) {
      setTimeout(() => {
        const heart = document.createElement('div');
        heart.textContent = ['❤️', '💕', '💖', '😘', '💗', '💝'][Math.floor(Math.random() * 6)];
        heart.style.cssText = `
          position: absolute;
          font-size: ${30 + Math.random() * 30}px;
          left: ${Math.random() * 100}%;
          top: 100%;
          animation: heartFloat ${3 + Math.random() * 2}s ease-out forwards;
          opacity: 0;
        `;
        overlay.appendChild(heart);
      }, i * 80);
    }

    // 3秒后移除
    setTimeout(() => overlay.remove(), 6000);
  };

  // 添加爱心漂浮动画
  if (!document.getElementById('heart-float-style')) {
    const style = document.createElement('style');
    style.id = 'heart-float-style';
    style.textContent = `
      @keyframes heartFloat {
        0% {
          transform: translateY(0) scale(0) rotate(0deg);
          opacity: 0;
        }
        10% {
          opacity: 1;
          transform: scale(1.2);
        }
        50% {
          opacity: 1;
          transform: scale(1) rotate(180deg);
        }
        100% {
          transform: translateY(-100vh) scale(0.5) rotate(360deg);
          opacity: 0;
        }
      }

      @keyframes pulseHeart {
        0%, 100% { transform: scale(1); }
        50% { transform: scale(1.3); }
      }
    `;
    document.head.appendChild(style);
  }

  // 拦截发送消息，检查触发词
  const originalSend = window.ChatRoom.send;
  if (originalSend) {
    window.ChatRoom.send = function() {
      const input = document.getElementById('chatroom-input');
      if (input && checkHeartTrigger(input.value)) {
        setTimeout(() => window.ChatRoom.triggerHeartEffect(), 100);
      }
      return originalSend.apply(this, arguments);
    };
  }

  // ========== 在线状态优化 ==========

  window.ChatRoom.updateOnlineStatus = function(isOnline, lastSeen) {
    const statusEl = document.getElementById('chatroom-partner-status');
    if (!statusEl) return;

    if (isOnline) {
      statusEl.textContent = '在线';
      statusEl.style.color = '#4ecdc4';
    } else if (lastSeen) {
      const diff = Date.now() - lastSeen;
      if (diff < 60000) {
        statusEl.textContent = '刚刚在线';
      } else if (diff < 3600000) {
        statusEl.textContent = `${Math.floor(diff / 60000)}分钟前在线`;
      } else {
        statusEl.textContent = `${Math.floor(diff / 3600000)}小时前在线`;
      }
      statusEl.style.color = '#999';
    } else {
      statusEl.textContent = '离线';
      statusEl.style.color = '#999';
    }
  };

  // 监听在线状态变化
  window.addEventListener('onlineStatusChange', function(e) {
    window.ChatRoom.updateOnlineStatus(e.detail.online, e.detail.lastSeen);
  });

  console.log('💖 聊天室特效增强 v8.3 已加载');

})();
