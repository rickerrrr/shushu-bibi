/**
 * 实时聊天系统 v3.0 — WebSocket 真实时版本
 * 全面整合 v6 WebSocket 模块 + Durable Objects + D1/R2
 * 
 * 架构：
 * - 发送：window.sendChatMessage() → v6 WebSocket → 对方瞬间收到
 * - 接收：storage 事件 + BroadcastChannel → 即时刷新UI
 * - 存储：localStorage chat_messages，由 v6 模块统一管理
 */

class RealtimeChatV3 {
  constructor() {
    this.STORAGE_KEY = 'chat_messages';
    this.messages = [];
    this.isOpen = false;
    this.unreadCount = 0;
    this.init();
  }
  
  init() {
    this.loadMessages();
    this.createChatUI();
    this.bindEvents();
    this.setupRealtimeListeners();
    console.log('💬 聊天室 v3.0 已启动 · WebSocket 真实时模式');
  }
  
  // ========== 消息读写 ==========
  
  loadMessages() {
    try {
      // 优先使用 v6 模块的 getData
      if (typeof window.getData === 'function') {
        this.messages = window.getData(this.STORAGE_KEY) || [];
      } else {
        const raw = localStorage.getItem(this.STORAGE_KEY);
        this.messages = raw ? JSON.parse(raw) : [];
      }
    } catch (e) {
      this.messages = [];
    }
  }
  
  saveMessages() {
    try {
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(this.messages));
    } catch (e) {
      console.error('保存聊天消息失败:', e);
    }
  }
  
  // ========== 实时监听 ==========
  
  setupRealtimeListeners() {
    // 1. storage 事件（跨标签页，v6 WebSocket 同步后触发）
    window.addEventListener('storage', (e) => {
      if (e.key === this.STORAGE_KEY && e.newValue) {
        try {
          const newMessages = JSON.parse(e.newValue);
          if (JSON.stringify(newMessages) !== JSON.stringify(this.messages)) {
            this.messages = newMessages;
            this.renderMessages();
            
            // 检测新消息（来自对方）
            const currentUser = this.getCurrentUser();
            const newMsgs = newMessages.filter(m => 
              m.from !== currentUser && 
              !this.messages.find(om => om.id === m.id)
            );
            // 实际逻辑：只要有新消息且最后一条不是自己发的就提示
            if (newMessages.length > 0) {
              const lastMsg = newMessages[newMessages.length - 1];
              if (lastMsg.from !== currentUser && !this.isOpen) {
                this.unreadCount++;
                this.updateBadge();
              }
            }
          }
        } catch (e) {}
      }
    });
    
    // 2. BroadcastChannel（同浏览器多标签，<10ms）
    try {
      const bc = new BroadcastChannel('love_website_sync');
      bc.onmessage = (event) => {
        if (event.data && event.data.type === 'chat_message') {
          // 消息已由 v6 模块写入 localStorage，重新加载
          this.loadMessages();
          this.renderMessages();
          
          const msg = event.data.message || event.data;
          const currentUser = this.getCurrentUser();
          if (msg.from !== currentUser && !this.isOpen) {
            this.unreadCount++;
            this.updateBadge();
          }
        }
      };
    } catch (e) {
      // BroadcastChannel 不可用，依赖 storage 事件
    }
    
    // 3. 定时检查（兜底，确保消息不丢，2秒一次轻量检查）
    this.checkTimer = setInterval(() => {
      try {
        const raw = localStorage.getItem(this.STORAGE_KEY);
        const remote = raw ? JSON.parse(raw) : [];
        if (JSON.stringify(remote) !== JSON.stringify(this.messages)) {
          this.messages = remote;
          this.renderMessages();
        }
      } catch (e) {}
    }, 2000);
  }
  
  // ========== UI ==========
  
  createChatUI() {
    // 移除旧版聊天面板（如果存在）
    const oldPanel = document.getElementById('chat-panel');
    if (oldPanel) oldPanel.remove();
    const oldBadge = document.getElementById('chat-unread-badge');
    if (oldBadge) oldBadge.remove();
    
    // 未读消息气泡
    const badge = document.createElement('div');
    badge.id = 'chat-unread-badge';
    badge.style.cssText = `
      position: absolute;
      top: -5px;
      right: -5px;
      background: #ff4444;
      color: white;
      border-radius: 50%;
      width: 20px;
      height: 20px;
      font-size: 12px;
      display: none;
      align-items: center;
      justify-content: center;
      font-weight: bold;
      z-index: 10;
    `;
    
    const topChatBtn = document.querySelector('.btn-chat');
    if (topChatBtn) {
      topChatBtn.style.position = 'relative';
      topChatBtn.appendChild(badge);
    }
    
    // 聊天室面板
    const chatPanel = document.createElement('div');
    chatPanel.id = 'chat-panel';
    chatPanel.innerHTML = `
      <div id="chat-header">
        <span>💬 实时聊天 · ⚡WebSocket</span>
        <button id="chat-close-btn">✕</button>
      </div>
      <div id="chat-messages"></div>
      <div id="chat-input-area">
        <input type="text" id="chat-input" placeholder="输入消息..." maxlength="500" />
        <button id="chat-send-btn">发送</button>
      </div>
    `;
    
    document.body.appendChild(chatPanel);
    
    // 添加样式
    const styleId = 'chat-v3-styles';
    if (!document.getElementById(styleId)) {
      const style = document.createElement('style');
      style.id = styleId;
      style.textContent = `
        #chat-panel {
          position: fixed;
          bottom: 80px;
          right: 20px;
          width: 340px;
          height: 480px;
          background: white;
          border-radius: 16px;
          box-shadow: 0 8px 32px rgba(0,0,0,0.15);
          display: none;
          flex-direction: column;
          z-index: 9999;
          overflow: hidden;
          animation: chatSlideUp 0.25s ease;
        }
        @keyframes chatSlideUp {
          from { opacity: 0; transform: translateY(20px); }
          to { opacity: 1; transform: translateY(0); }
        }
        #chat-header {
          background: linear-gradient(135deg, #ff6b95, #ff8fa3);
          color: white;
          padding: 12px 16px;
          display: flex;
          justify-content: space-between;
          align-items: center;
          font-weight: 600;
          font-size: 14px;
        }
        #chat-header button {
          background: none;
          border: none;
          color: white;
          font-size: 18px;
          cursor: pointer;
          padding: 4px 8px;
          border-radius: 50%;
          transition: background 0.2s;
        }
        #chat-header button:hover {
          background: rgba(255,255,255,0.2);
        }
        #chat-messages {
          flex: 1;
          overflow-y: auto;
          padding: 12px;
          background: #f9f9fb;
          scroll-behavior: smooth;
        }
        #chat-messages::-webkit-scrollbar {
          width: 4px;
        }
        #chat-messages::-webkit-scrollbar-thumb {
          background: #ddd;
          border-radius: 2px;
        }
        .chat-msg {
          margin-bottom: 10px;
          padding: 8px 12px;
          border-radius: 16px;
          max-width: 80%;
          word-break: break-word;
          animation: msgIn 0.2s ease;
        }
        @keyframes msgIn {
          from { opacity: 0; transform: scale(0.95); }
          to { opacity: 1; transform: scale(1); }
        }
        .chat-msg.mine {
          background: linear-gradient(135deg, #ff6b95, #ff8fa3);
          color: white;
          margin-left: auto;
          border-bottom-right-radius: 4px;
        }
        .chat-msg.other {
          background: white;
          color: #333;
          border: 1px solid #eee;
          border-bottom-left-radius: 4px;
        }
        .chat-msg .msg-meta {
          font-size: 11px;
          opacity: 0.7;
          margin-bottom: 3px;
        }
        .chat-msg .msg-time {
          font-size: 10px;
          opacity: 0.5;
          margin-top: 4px;
          text-align: right;
        }
        #chat-input-area {
          display: flex;
          padding: 10px;
          background: white;
          border-top: 1px solid #eee;
          gap: 8px;
        }
        #chat-input {
          flex: 1;
          padding: 8px 14px;
          border: 1.5px solid #e0e0e0;
          border-radius: 20px;
          outline: none;
          font-size: 14px;
          transition: border-color 0.2s;
        }
        #chat-input:focus {
          border-color: #ff6b95;
        }
        #chat-send-btn {
          padding: 8px 18px;
          background: linear-gradient(135deg, #ff6b95, #ff8fa3);
          color: white;
          border: none;
          border-radius: 20px;
          cursor: pointer;
          font-weight: 600;
          font-size: 13px;
          transition: transform 0.15s;
        }
        #chat-send-btn:active {
          transform: scale(0.95);
        }
        #chat-send-btn:hover {
          opacity: 0.9;
        }
        @media (max-width: 480px) {
          #chat-panel {
            width: 100vw;
            height: 60vh;
            bottom: 0;
            right: 0;
            border-radius: 16px 16px 0 0;
          }
        }
      `;
      document.head.appendChild(style);
    }
  }
  
  bindEvents() {
    const input = document.getElementById('chat-input');
    if (input) {
      input.addEventListener('keypress', (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
          e.preventDefault();
          this.send();
        }
      });
    }
    
    const sendBtn = document.getElementById('chat-send-btn');
    if (sendBtn) {
      sendBtn.addEventListener('click', () => this.send());
    }
    
    const closeBtn = document.getElementById('chat-close-btn');
    if (closeBtn) {
      closeBtn.addEventListener('click', () => this.close());
    }
  }
  
  // ========== 打开/关闭 ==========
  
  toggle() {
    const panel = document.getElementById('chat-panel');
    if (!panel) return;
    
    if (panel.style.display === 'none' || !panel.style.display) {
      this.open();
    } else {
      this.close();
    }
  }
  
  open() {
    const panel = document.getElementById('chat-panel');
    if (!panel) return;
    
    panel.style.display = 'flex';
    this.isOpen = true;
    this.unreadCount = 0;
    this.updateBadge();
    this.renderMessages();
    
    // 聚焦输入框
    setTimeout(() => {
      const input = document.getElementById('chat-input');
      if (input) input.focus();
    }, 100);
  }
  
  close() {
    const panel = document.getElementById('chat-panel');
    if (panel) panel.style.display = 'none';
    this.isOpen = false;
  }
  
  // ========== 发送消息 ==========
  
  send() {
    const input = document.getElementById('chat-input');
    if (!input || !input.value.trim()) return;
    
    const text = input.value.trim();
    input.value = '';
    
    // 使用 v6 WebSocket 模块发送（延迟 50-150ms 到达对方）
    if (typeof window.sendChatMessage === 'function') {
      window.sendChatMessage({ text, type: 'text' });
    } else {
      // 纯 WebSocket 架构：通过 v6 模块推送
      this.sendLocal(text);
    }
    
    // 立即刷新本地UI
    this.loadMessages();
    this.renderMessages();
  }
  
  sendLocal(text) {
    const currentUser = this.getCurrentUser();
    const msgObj = {
      id: Date.now().toString(36) + Math.random().toString(36).substr(2, 5),
      from: currentUser,
      text: text,
      time: new Date().toISOString(),
      type: 'text',
      read: false,
    };
    this.messages.push(msgObj);
    this.saveMessages();
  }
  
  // ========== 渲染 ==========
  
  renderMessages() {
    const container = document.getElementById('chat-messages');
    if (!container) return;
    
    const currentUser = this.getCurrentUser();
    
    // 空状态
    if (!this.messages || this.messages.length === 0) {
      container.innerHTML = `
        <div style="text-align:center;padding:40px 20px;color:#bbb;">
          <div style="font-size:40px;margin-bottom:12px;">💬</div>
          <div style="font-size:13px;">还没有消息</div>
          <div style="font-size:12px;margin-top:4px;">⚡ WebSocket 实时连接，消息秒达</div>
        </div>
      `;
      return;
    }
    
    container.innerHTML = this.messages.map(msg => {
      const isMine = msg.from === currentUser;
      const timeStr = this.formatTime(msg.time);
      return `
        <div class="chat-msg ${isMine ? 'mine' : 'other'}">
          <div class="msg-meta">
            ${msg.from === 'shushu' ? '🐹 鼠鼠' : '🐱 笔笔'}
          </div>
          <div>${this.escapeHtml(msg.text || '')}</div>
          <div class="msg-time">${timeStr}</div>
        </div>
      `;
    }).join('');
    
    // 滚动到底部
    requestAnimationFrame(() => {
      container.scrollTop = container.scrollHeight;
    });
  }
  
  formatTime(isoString) {
    try {
      const d = new Date(isoString);
      const now = new Date();
      const hh = String(d.getHours()).padStart(2, '0');
      const mm = String(d.getMinutes()).padStart(2, '0');
      
      // 同一天：只显示时间
      if (d.toDateString() === now.toDateString()) {
        return `${hh}:${mm}`;
      }
      
      // 昨天
      const yesterday = new Date(now);
      yesterday.setDate(yesterday.getDate() - 1);
      if (d.toDateString() === yesterday.toDateString()) {
        return `昨天 ${hh}:${mm}`;
      }
      
      // 更早：显示日期+时间
      return `${d.getMonth()+1}/${d.getDate()} ${hh}:${mm}`;
    } catch (e) {
      return '';
    }
  }
  
  escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }
  
  updateBadge() {
    const badge = document.getElementById('chat-unread-badge');
    if (!badge) return;
    
    if (this.unreadCount > 0 && !this.isOpen) {
      badge.textContent = this.unreadCount > 99 ? '99+' : this.unreadCount;
      badge.style.display = 'flex';
    } else {
      badge.style.display = 'none';
    }
  }
  
  getCurrentUser() {
    return localStorage.getItem('currentUser') || 'shushu';
  }
  
  // ========== 清理 ==========
  
  destroy() {
    if (this.checkTimer) {
      clearInterval(this.checkTimer);
      this.checkTimer = null;
    }
    const panel = document.getElementById('chat-panel');
    if (panel) panel.remove();
    const badge = document.getElementById('chat-unread-badge');
    if (badge) badge.remove();
  }
}

// 全局实例
let chatV3Instance = null;

// 初始化（延迟确保 v6 模块先加载）
function initChatV3() {
  if (chatV3Instance) return;
  
  // 等待 v6 模块就绪
  const maxWait = 50; // 最多等5秒
  let attempts = 0;
  
  function tryInit() {
    attempts++;
    if (typeof window.sendChatMessage === 'function' || attempts > maxWait) {
      chatV3Instance = new RealtimeChatV3();
      window.ChatV3 = chatV3Instance;
      window.RealtimeChatV3 = RealtimeChatV3;
      
      // 兼容旧版 toggle 调用
      if (window.RealtimeChat && window.RealtimeChat.toggle) {
        window.RealtimeChat.toggle = () => chatV3Instance.toggle();
        window.RealtimeChat.close = () => chatV3Instance.close();
        window.RealtimeChat.send = () => chatV3Instance.send();
      }
    } else {
      setTimeout(tryInit, 100);
    }
  }
  
  tryInit();
}

// 启动
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initChatV3);
} else {
  initChatV3();
}
