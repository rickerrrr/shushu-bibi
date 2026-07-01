/**
 * 实时聊天系统 v2.0 - 全实时化版本
 * 使用 Cloudflare Worker 实现真正的跨设备实时聊天
 */

class RealtimeChat {
  constructor() {
    this.WORKER_URL = 'https://shushu-bibii-online-status.2813721763.workers.dev';
    this.messages = [];
    this.isOpen = false;
    this.pollTimer = null;
    this.init();
  }
  
  init() {
    this.createChatUI();
    this.bindEvents();
    this.startPolling();
  }
  
  // 创建聊天室UI
  createChatUI() {
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
        <span>💬 实时聊天</span>
        <button onclick="RealtimeChat.close()">✕</button>
      </div>
      <div id="chat-messages"></div>
      <div id="chat-input-area">
        <input type="text" id="chat-input" placeholder="输入消息..." />
        <button onclick="RealtimeChat.send()">发送</button>
      </div>
    `;
    
    document.body.appendChild(chatPanel);
    
    // 添加样式
    const style = document.createElement('style');
    style.textContent = `
      #chat-panel {
        position: fixed;
        bottom: 80px;
        right: 20px;
        width: 320px;
        height: 450px;
        background: white;
        border-radius: 16px;
        box-shadow: 0 8px 32px rgba(0,0,0,0.15);
        display: none;
        flex-direction: column;
        z-index: 9999;
        overflow: hidden;
      }
      
      #chat-header {
        background: linear-gradient(135deg, #ff6b95, #ff8fa3);
        color: white;
        padding: 12px 16px;
        display: flex;
        justify-content: space-between;
        align-items: center;
        font-weight: 600;
      }
      
      #chat-header button {
        background: none;
        border: none;
        color: white;
        font-size: 18px;
        cursor: pointer;
      }
      
      #chat-messages {
        flex: 1;
        overflow-y: auto;
        padding: 12px;
        background: #f9f9f9;
      }
      
      .chat-msg {
        margin-bottom: 8px;
        padding: 8px 12px;
        border-radius: 12px;
        max-width: 80%;
        word-break: break-word;
      }
      
      .chat-msg.mine {
        background: linear-gradient(135deg, #ff6b95, #ff8fa3);
        color: white;
        margin-left: auto;
      }
      
      .chat-msg.other {
        background: white;
        color: #333;
        border: 1px solid #eee;
      }
      
      #chat-input-area {
        display: flex;
        padding: 8px;
        background: white;
        border-top: 1px solid #eee;
      }
      
      #chat-input {
        flex: 1;
        padding: 8px 12px;
        border: 1px solid #ddd;
        border-radius: 20px;
        outline: none;
      }
      
      #chat-input-area button {
        margin-left: 8px;
        padding: 8px 16px;
        background: linear-gradient(135deg, #ff6b95, #ff8fa3);
        color: white;
        border: none;
        border-radius: 20px;
        cursor: pointer;
      }
    `;
    document.head.appendChild(style);
  }
  
  // 绑定事件
  bindEvents() {
    const input = document.getElementById('chat-input');
    if (input) {
      input.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') this.send();
      });
    }
  }
  
  // 打开聊天室
  static toggle() {
    const panel = document.getElementById('chat-panel');
    if (!panel) return;
    
    if (panel.style.display === 'none' || !panel.style.display) {
      panel.style.display = 'flex';
      // 标记为已读
      const badge = document.getElementById('chat-unread-badge');
      if (badge) badge.style.display = 'none';
    } else {
      panel.style.display = 'none';
    }
  }
  
  static close() {
    const panel = document.getElementById('chat-panel');
    if (panel) panel.style.display = 'none';
  }
  
  // 发送消息
  static async send() {
    const input = document.getElementById('chat-input');
    if (!input || !input.value.trim()) return;
    
    const user = localStorage.getItem('currentUser') || 'shushu';
    const text = input.value.trim();
    input.value = '';
    
    try {
      await fetch('https://shushu-bibii-online-status.2813721763.workers.dev/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ user, text })
      });
      
      // 重新拉取消息
      const instance = window._chatInstance || new RealtimeChat();
      await instance.fetchMessages();
    } catch (err) {
      console.error('发送失败:', err);
    }
  }
  
  // 拉取消息
  async fetchMessages() {
    try {
      const res = await fetch(this.WORKER_URL + '/chat');
      const messages = await res.json();
      
      this.messages = messages;
      this.renderMessages();
    } catch (err) {
      console.error('拉取失败:', err);
    }
  }
  
  // 渲染消息
  renderMessages() {
    const container = document.getElementById('chat-messages');
    if (!container) return;
    
    const currentUser = localStorage.getItem('currentUser') || 'shushu';
    
    container.innerHTML = this.messages.map(msg => {
      const isMine = msg.user === currentUser;
      return `
        <div class="chat-msg ${isMine ? 'mine' : 'other'}">
          <div style="font-size: 12px; opacity: 0.7; margin-bottom: 4px;">
            ${msg.user === 'shushu' ? '🐹 鼠鼠' : '🐱 笔笔'}
          </div>
          <div>${msg.text}</div>
        </div>
      `;
    }).join('');
    
    // 滚动到底部
    container.scrollTop = container.scrollHeight;
  }
  
  // 开始轮询
  startPolling() {
    if (this.pollTimer) clearInterval(this.pollTimer);
    
    this.fetchMessages();
    
    this.pollTimer = setInterval(() => {
      this.fetchMessages();
    }, 3000); // 3秒轮询一次
  }
}

// 初始化
window.addEventListener('DOMContentLoaded', () => {
  window._chatInstance = new RealtimeChat();
});

window.RealtimeChat = RealtimeChat;
