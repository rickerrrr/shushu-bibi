/**
 * 在线状态 v5.7 - 基于 WebSocket 的实时在线检测
 * v5.7: 移除旧 workers.dev 轮询，改为读取 v6 WebSocket 模块更新的 localStorage
 */

(function() {
  'use strict';
  
  const CHECK_INTERVAL = 2000;   // 每2秒检查 localStorage
  const TIMEOUT = 15000;          // 15秒无心跳=离线
  
  let currentUser = null;
  let checkTimer = null;
  
  // 获取当前用户
  function getCurrentUser() {
    return localStorage.getItem('currentUser') || 'shushu';
  }
  
  // 读取对方在线状态（由 realtime-sync-v6 WebSocket/轮询 更新）
  function getPartnerStatus() {
    currentUser = getCurrentUser();
    const partner = currentUser === 'shushu' ? 'bibi' : 'shushu';
    const key = 'online_status_' + partner;
    
    try {
      const raw = localStorage.getItem(key);
      if (!raw) return null;
      return JSON.parse(raw);
    } catch (e) {
      return null;
    }
  }
  
  // 更新UI
  function updateUI() {
    const btn = document.getElementById('btn-online');
    if (!btn) return;
    
    const statusDot = btn.querySelector('.status-dot');
    const statusText = btn.querySelector('.status-text');
    if (!statusDot || !statusText) return;
    
    currentUser = getCurrentUser();
    const partner = currentUser === 'shushu' ? 'bibi' : 'shushu';
    const partnerNick = partner === 'shushu' ? '鼠鼠' : '笔笔';
    
    const data = getPartnerStatus();
    const now = Date.now();
    let isOnline = false;
    
    if (data) {
      // WebSocket/v6 直接提供了 online 字段
      if (typeof data.online === 'boolean') {
        isOnline = data.online;
      } else {
        // 降级：通过 lastSeen 时间判断
        const lastSeen = data.lastSeen || data.timestamp || 0;
        isOnline = (now - lastSeen) < TIMEOUT;
      }
    }
    
    if (isOnline) {
      btn.classList.add('other-online');
      statusDot.className = 'status-dot';
      statusText.textContent = partnerNick + ' 在线';
      btn.title = partnerNick + ' 在线';
    } else {
      btn.classList.remove('other-online');
      statusDot.className = 'status-dot offline';
      statusText.textContent = partnerNick + ' 最近在线';
      btn.title = partnerNick + ' 最近在线';
    }
  }
  
  // 监听 BroadcastChannel（v6 模块通过此通道广播在线状态变更）
  function listenForUpdates() {
    try {
      const channel = new BroadcastChannel('shushu-bibi-sync');
      channel.onmessage = function(event) {
        if (event.data && (event.data.type === 'heartbeat' || event.data.type === 'online_status')) {
          // 对方状态变了，立即刷新
          updateUI();
        }
      };
    } catch (e) {
      // BroadcastChannel 不支持（老旧浏览器），只用定时器
    }
  }
  
  // 启动
  function start() {
    updateUI();
    listenForUpdates();
    
    if (checkTimer) clearInterval(checkTimer);
    checkTimer = setInterval(updateUI, CHECK_INTERVAL);
  }
  
  // 页面加载时启动
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', start);
  } else {
    start();
  }
  
  console.log('[在线状态] v5.7 WebSocket 联动模式已加载');
})();
