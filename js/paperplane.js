/**
 * 纸飞机模块 v2.0
 * 替换漂流瓶功能 - 基于 localStorage 实时通信
 */

(function() {
  'use strict';

  const STORAGE_KEY_SENT = 'paperplanes_sent';
  const STORAGE_KEY_RECEIVED = 'paperplanes_received';

  // 获取已发送的纸飞机
  function getSentPlanes() {
    var data = localStorage.getItem(STORAGE_KEY_SENT);
    return data ? JSON.parse(data) : [];
  }

  // 获取收到的纸飞机
  function getReceivedPlanes() {
    var data = localStorage.getItem(STORAGE_KEY_RECEIVED);
    return data ? JSON.parse(data) : [];
  }

  // 保存已发送的纸飞机
  function saveSentPlanes(planes) {
    localStorage.setItem(STORAGE_KEY_SENT, JSON.stringify(planes));
  window.setData && window.setData(STORAGE_KEY_SENT, planes);
    // 推送到 D1 云端
    if (planes.length > 0 && window.CloudSync) {
      window.CloudSync.savePaperplane(planes[0]);
    }
  }

  // 保存收到的的纸飞机
  function saveReceivedPlanes(planes) {
    localStorage.setItem(STORAGE_KEY_RECEIVED, JSON.stringify(planes));
  window.setData && window.setData(STORAGE_KEY_RECEIVED, planes);
    // 触发storage事件，实现实时同步
    window.dispatchEvent(new StorageEvent('storage', {
      key: STORAGE_KEY_RECEIVED
    }));
  }

  // 发送纸飞机
  window.sendPaperPlane = function() {
    console.log('[PaperPlane] ✈️ 放飞按钮被点击！');
    var msgEl = document.getElementById('paperplane-msg');
    if (!msgEl) {
      console.error('[PaperPlane] 找不到 paperplane-msg 输入框');
      alert('系统错误：找不到输入框！');
      return;
    }

    var msg = msgEl.value.trim();

    if (!msg) {
      alert('请写下你想说的话～');
      return;
    }

    // 创建纸飞机对象
    var plane = {
      id: Date.now(),
      msg: msg,
      sender: '我',
      senderIcon: '🐹',
      time: new Date().toLocaleString('zh-CN'),
      timestamp: Date.now(),
      read: false
    };

    // 保存到已发送
    var sentPlanes = getSentPlanes();
    sentPlanes.unshift(plane);
    saveSentPlanes(sentPlanes);

    // 模拟发送到对方（演示用，实际应该保存到共享存储）
    setTimeout(function() {
      var receivedPlanes = getReceivedPlanes();
      receivedPlanes.unshift({
        id: Date.now(),
        msg: msg,
        sender: '我',
        senderIcon: '🐹',
        time: new Date().toLocaleString('zh-CN'),
        timestamp: Date.now(),
        read: false
      });
      saveReceivedPlanes(receivedPlanes);

      // 显示通知
      showNotification('✈️ 纸飞机已送达！');
    }, 1000);

    // 播放飞行动画
    playPaperPlaneAnimation();

    // 清空输入框
    msgEl.value = '';

    // 重新渲染
    renderPaperPlanes();

    alert('✈️ 纸飞机已放飞！');
  };

  // 播放纸飞机飞行动画
  function playPaperPlaneAnimation() {
    var plane = document.createElement('div');
    plane.className = 'paperplane-flying';
    plane.textContent = '✈️';
    document.body.appendChild(plane);

    setTimeout(function() {
      plane.remove();
    }, 2000);
  }

  // 显示通知
  function showNotification(text) {
    var notification = document.createElement('div');
    notification.style.cssText = 'position:fixed;top:20px;right:20px;background:#10b981;color:white;padding:15px 25px;border-radius:10px;box-shadow:0 4px 15px rgba(0,0,0,0.3);z-index:10001;animation:slideInRight 0.3s ease;';
    notification.textContent = text;
    document.body.appendChild(notification);

    setTimeout(function() {
      notification.style.animation = 'slideOutRight 0.3s ease';
      setTimeout(function() {
        notification.remove();
      }, 300);
    }, 3000);
  }

  // 回复纸飞机
  window.replyPaperPlane = function(id) {
    var reply = prompt('回复这条纸飞机：');
    if (!reply) return;

    alert('✅ 回复已发送！（演示功能）');
  };

  // 删除纸飞机
  window.deletePaperPlane = function(id, type) {
    if (!confirm('确定删除这只纸飞机？')) return;

    if (type === 'sent') {
      var sentPlanes = getSentPlanes();
      sentPlanes = sentPlanes.filter(function(p) { return p.id !== id; });
      saveSentPlanes(sentPlanes);
    } else {
      var receivedPlanes = getReceivedPlanes();
      receivedPlanes = receivedPlanes.filter(function(p) { return p.id !== id; });
      saveReceivedPlanes(receivedPlanes);
    }

    renderPaperPlanes();
  };

  // 渲染纸飞机
  window.renderPaperPlanes = function() {
    renderSentPlanes();
    renderReceivedPlanes();
  };

  // 渲染已发送的纸飞机
  function renderSentPlanes() {
    var planes = getSentPlanes();
    var container = document.getElementById('sent-planes');

    if (!container) return;

    if (planes.length === 0) {
      container.innerHTML = '<div style="text-align: center; color: var(--text-light); padding: 30px;">还没有放飞纸飞机～</div>';
      return;
    }

    container.innerHTML = planes.map(function(plane) {
      return `
        <div class="paperplane-card">
          <div class="paperplane-meta">
            <span class="paperplane-sender">✈️ 我</span>
            <span class="paperplane-time">${plane.time}</span>
          </div>
          <div class="paperplane-content">${plane.msg}</div>
          <div class="paperplane-actions">
            <button class="paperplane-btn delete" onclick="deletePaperPlane(${plane.id}, 'sent')">🗑️ 删除</button>
          </div>
        </div>
      `;
    }).join('');
  }

  // 渲染收到的纸飞机
  function renderReceivedPlanes() {
    var planes = getReceivedPlanes();
    var container = document.getElementById('received-planes');

    if (!container) return;

    if (planes.length === 0) {
      container.innerHTML = '<div style="text-align: center; color: var(--text-light); padding: 30px;">还没有收到纸飞机～</div>';
      return;
    }

    container.innerHTML = planes.map(function(plane) {
      return `
        <div class="paperplane-card" style="border-left: 4px solid var(--primary-color);">
          <div class="paperplane-meta">
            <span class="paperplane-sender">${plane.senderIcon} ${plane.sender}</span>
            <span class="paperplane-time">${plane.time}</span>
          </div>
          <div class="paperplane-content">${plane.msg}</div>
          <div class="paperplane-actions">
            <button class="paperplane-btn reply" onclick="replyPaperPlane(${plane.id})">💬 回复</button>
            <button class="paperplane-btn delete" onclick="deletePaperPlane(${plane.id}, 'received')">🗑️ 删除</button>
          </div>
        </div>
      `;
    }).join('');
  }

  // 加载纸飞机
  window.loadPaperPlanes = function() {
    renderPaperPlanes();
  };

  // 实时轮询新纸飞机
  function startPolling() {
    setInterval(function() {
      renderReceivedPlanes();
    }, 3000);
  }

  // 监听storage事件
  window.addEventListener('storage', function(e) {
    if (e.key === STORAGE_KEY_RECEIVED) {
      renderReceivedPlanes();
      showNotification('✈️ 收到新的纸飞机！');
    }
  });

  // 初始化
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', function() {
      renderPaperPlanes();
      startPolling();
    });
  } else {
    setTimeout(function() {
      renderPaperPlanes();
      startPolling();
    }, 500);
  }

  console.log('[PaperPlane] ✅ 纸飞机功能已加载');

})();
