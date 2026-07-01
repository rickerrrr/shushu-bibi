/**
 * 聊天室 v1.0 — 微信级实时聊天
 * 
 * 特性：
 * - 100% WebSocket 实时通信 (50-150ms)
 * - 已读/未读回执 (双向)
 * - 微信风格气泡 UI
 * - 消息持久化 localStorage
 * - 未读角标 + 桌面通知
 * - 输入中状态
 */

(function() {
  'use strict';

  const CHAT_KEY = 'chat_messages';
  const READ_KEY = 'chat_read_status';
  const TYPING_KEY = 'chat_typing';

  const state = {
    messages: [],
    currentUser: null,
    panelOpen: false,
    readMessages: {},
    typingTimer: null,
    lastReadUpdate: 0,
  };

  // ========== 初始化 ==========

  function init() {
    checkDependencies();
    detectUser();
    loadMessages();
    loadReadStatus();
    setupDOM();
    setupListeners();
    setupTypingIndicator();
    renderMessages();
    updateUnreadBadge();
    checkDesktopNotification();
    console.log('💬 聊天室 v1.0 已就绪');
  }

  function checkDependencies() {
    if (!window.setData || !window.getData || !window.sendChatMessage) {
      console.warn('聊天室: realtime-sync-v6 未加载，降级为本地模式');
    }
  }

  function detectUser() {
    const saved = localStorage.getItem('current_user');
    state.currentUser = saved || 'shushu';
  }

  function loadMessages() {
    try {
      const raw = localStorage.getItem(CHAT_KEY);
      state.messages = raw ? JSON.parse(raw) : [];
    } catch (e) {
      state.messages = [];
    }
  }

  function loadReadStatus() {
    try {
      const raw = localStorage.getItem(READ_KEY);
      state.readMessages = raw ? JSON.parse(raw) : {};
    } catch (e) {
      state.readMessages = {};
    }
  }

  function saveMessages() {
    localStorage.setItem(CHAT_KEY, JSON.stringify(state.messages));
  }

  function saveReadStatus() {
    localStorage.setItem(READ_KEY, JSON.stringify(state.readMessages));
  }

  // ========== DOM 构建 ==========

  function setupDOM() {
    if (document.getElementById('chatroom-overlay')) return;

    const html = `
    <div class="chatroom-overlay" id="chatroom-overlay">
      <div class="chatroom-panel" id="chatroom-panel">
        <!-- 头部 -->
        <div class="chatroom-header">
          <div class="chatroom-header-left">
            <span class="chatroom-back" onclick="window.ChatRoom.toggle()">←</span>
            <div class="chatroom-partner-info">
              <span class="chatroom-partner-avatar" id="chatroom-partner-avatar">🐱</span>
              <div>
                <div class="chatroom-partner-name" id="chatroom-partner-name">笔笔</div>
                <div class="chatroom-partner-status" id="chatroom-partner-status">在线</div>
              </div>
            </div>
          </div>
          <div class="chatroom-header-right">
            <button class="chatroom-header-btn" onclick="window.ChatRoom.toggleSearch()" title="搜索消息">🔍</button>
            <span class="chatroom-more" onclick="window.ChatRoom.clearAll()">🗑️</span>
          </div>
        </div>

        <!-- 消息列表 -->
        <div class="chatroom-messages" id="chatroom-messages">
          <div class="chatroom-empty" id="chatroom-empty">
            <span class="chatroom-empty-icon">💬</span>
            <p>还没有消息～</p>
            <p class="chatroom-empty-sub">发送第一条消息吧 ❤️</p>
          </div>
        </div>

        <!-- 输入中 -->
        <div class="chatroom-typing" id="chatroom-typing">
          <span class="typing-dots"><span></span><span></span><span></span></span>
          <span class="typing-text" id="typing-text">对方正在输入...</span>
        </div>

        <!-- 输入栏 -->
        <div class="chatroom-input-bar">
          <button class="chatroom-emoji-btn" onclick="window.ChatRoom.insertEmoji()">😊</button>
          <button class="chatroom-voice-btn" id="chatroom-voice-btn" onmousedown="window.ChatRoom.startVoiceRecord()" onmouseup="window.ChatRoom.stopVoiceRecord()" ontouchstart="window.ChatRoom.startVoiceRecord()" ontouchend="window.ChatRoom.stopVoiceRecord()">🎤</button>
          <input type="text" class="chatroom-input" id="chatroom-input" 
            placeholder="说点什么..."
            onkeydown="window.ChatRoom.onKeyDown(event)"
            oninput="window.ChatRoom.onTyping()"
            onfocus="window.ChatRoom.markAllRead()">
          <button class="chatroom-send-btn" id="chatroom-send-btn" onclick="window.ChatRoom.send()">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="white">
              <path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z"/>
            </svg>
          </button>
        </div>
      </div>
    </div>

    <!-- 聊天室入口按钮已移至顶部导航栏 #btn-chatroom -->
`;

    const container = document.createElement('div');
    container.innerHTML = html;
    document.body.appendChild(container.firstElementChild); // overlay
    document.body.appendChild(container.firstElementChild); // entry button

    // 初始化在线状态
    updatePartnerStatus();
    setInterval(updatePartnerStatus, 5000);
  }

  function updatePartnerStatus() {
    const partnerUser = state.currentUser === 'shushu' ? 'bibi' : 'shushu';
    const partnerKey = `online_status_${partnerUser}`;
    try {
      const raw = localStorage.getItem(partnerKey);
      if (raw) {
        const data = JSON.parse(raw);
        const diff = Date.now() - (data.lastSeen || 0);
        const online = diff < 35000;
        
        const avatar = document.getElementById('chatroom-partner-avatar');
        const name = document.getElementById('chatroom-partner-name');
        const status = document.getElementById('chatroom-partner-status');
        
        if (avatar) avatar.textContent = partnerUser === 'shushu' ? '🐹' : '🐱';
        if (name) name.textContent = partnerUser === 'shushu' ? '鼠鼠' : '笔笔';
        if (status) {
          status.textContent = online ? '🟢 在线' : '⚫ 离线';
          status.style.color = online ? '#4ecdc4' : '#999';
        }
      }
    } catch (e) {}
  }

  // ========== 监听 ==========

  function setupListeners() {
    // localStorage 变更监听（跨标签 + WebSocket 接收端）
    window.addEventListener('storage', function(e) {
      if (e.key === CHAT_KEY) {
        loadMessages();
        renderMessages();
        updateUnreadBadge();
      }
    });

    // WebSocket 消息监听（通过 BroadcastChannel）
    try {
      const bc = new BroadcastChannel('love_website_sync');
      bc.onmessage = function(e) {
        if (e.data && e.data.type === 'chat_message') {
          loadMessages();
          renderMessages();
          updateUnreadBadge();
          if (!state.panelOpen) {
            showDesktopNotification(e.data.message);
          }
        }
        if (e.data && e.data.type === 'chat_read') {
          handleReadReceipt(e.data);
        }
      };
    } catch (e) {}

    // 点击外部关闭
    document.addEventListener('click', function(e) {
      if (!state.panelOpen) return;
      const panel = document.getElementById('chatroom-panel');
      const entry = document.getElementById('chatroom-entry');
      if (panel && !panel.contains(e.target) && entry && !entry.contains(e.target)) {
        window.ChatRoom.close();
      }
    });

    // ESC 关闭
    document.addEventListener('keydown', function(e) {
      if (e.key === 'Escape' && state.panelOpen) {
        window.ChatRoom.close();
      }
    });
  }

    function setupTypingIndicator() {
    // v6 handleTypingIndicator 通过 WebSocket 直接更新 DOM
    // 无需本地轮询，此函数留空
    // 打字指示器 DOM 元素：chatroom-typing (由 v6 控制)
  }

  // ========== 渲染 ==========

  function renderMessages() {
    const container = document.getElementById('chatroom-messages');
    const empty = document.getElementById('chatroom-empty');
    if (!container) return;

    if (state.messages.length === 0) {
      container.innerHTML = '';
      container.appendChild(empty);
      return;
    }

    if (empty) empty.style.display = 'none';

    let html = '';
    let lastDate = '';

    for (const msg of state.messages) {
      const msgDate = new Date(msg.time).toLocaleDateString('zh-CN');
      if (msgDate !== lastDate) {
        html += `<div class="chatroom-date-divider"><span>${msgDate}</span></div>`;
        lastDate = msgDate;
      }

      const isMine = msg.from === state.currentUser;
      const time = new Date(msg.time).toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' });
      const readStatus = msg.read ? '✓✓ 已读' : '✓ 未读';

      html += `
        <div class="chatroom-msg ${isMine ? 'chatroom-msg-mine' : 'chatroom-msg-theirs'}" data-msg-id="${msg.id}" ondblclick="window.ChatRoom.onDoubleClickMsg('${msg.id}')" oncontextmenu="window.ChatRoom.showReactionPicker('${msg.id}'); return false;">
          ${!isMine ? `<span class="chatroom-msg-avatar">${msg.from === 'shushu' ? '🐹' : '🐱'}</span>` : ''}
          <div class="chatroom-msg-bubble">
            ${msg.type === 'voice' ? `
              <div class="chatroom-msg-voice" onclick="window.ChatRoom.playVoice('${msg.id}')">
                <span class="voice-play-icon">▶️</span>
                <span class="voice-duration">${msg.duration || 0}秒</span>
                <div class="voice-waveform">
                  <span></span><span></span><span></span><span></span><span></span>
                </div>
              </div>
            ` : `
              <div class="chatroom-msg-text">${formatMessageText(escapeHtml(msg.text))}</div>
            `}
            <div class="chatroom-msg-reactions" id="reactions-${msg.id}">
              ${renderReactions(msg.reactions, msg.id)}
            </div>
            <div class="chatroom-msg-meta">
              <span class="chatroom-msg-time">${time}</span>
              ${isMine ? `<span class="chatroom-msg-read">${readStatus}</span>` : ''}
            </div>
          </div>
          ${isMine ? `<span class="chatroom-msg-avatar">${state.currentUser === 'shushu' ? '🐹' : '🐱'}</span>` : ''}
        </div>`;
    }

    container.innerHTML = html;
    scrollToBottom();
  }

  function scrollToBottom() {
    const container = document.getElementById('chatroom-messages');
    if (container) {
      setTimeout(() => {
        container.scrollTop = container.scrollHeight;
      }, 100);
    }
  }

  function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }

  // ========== 消息反应功能 ==========

  function renderReactions(reactions, msgId) {
    if (!reactions || reactions.length === 0) return '';
    
    let html = '';
    for (const reaction of reactions) {
      const userReacted = reaction.users.includes(state.currentUser);
      html += `<span class="chatroom-msg-reaction ${userReacted ? 'active' : ''}" 
                   onclick="window.ChatRoom.toggleReaction('${reaction.emoji}', '${msgId}')">
                  ${reaction.emoji} ${reaction.users.length}
                </span>`;
    }
    return html;
  }

  window.ChatRoom.onDoubleClickMsg = function(msgId) {
    // 双击消息快速添加 ❤️ 反应
    window.ChatRoom.toggleReaction('❤️', msgId);
  };

  window.ChatRoom.showReactionPicker = function(msgId) {
    // 显示反应选择器
    const picker = document.getElementById('reaction-picker');
    if (picker) {
      picker.remove();
    }

    const emojis = ['❤️', '😊', '😘', '🥰', '😍', '💕', '😂', '🎉', '👍', '🔥'];
    
    const pickerHtml = `
      <div id="reaction-picker" class="reaction-picker">
        ${emojis.map(emoji => 
          `<button class="reaction-picker-btn" onclick="window.ChatRoom.addReaction('${msgId}', '${emoji}')">${emoji}</button>`
        ).join('')}
      </div>
    `;

    document.body.insertAdjacentHTML('beforeend', pickerHtml);

    // 点击其他地方关闭选择器
    setTimeout(() => {
      document.addEventListener('click', function closePicker() {
        const picker = document.getElementById('reaction-picker');
        if (picker) picker.remove();
        document.removeEventListener('click', closePicker);
      });
    }, 100);
  };

  window.ChatRoom.addReaction = function(msgId, emoji) {
    const msg = state.messages.find(m => m.id === msgId);
    if (!msg) return;

    if (!msg.reactions) msg.reactions = [];

    let reaction = msg.reactions.find(r => r.emoji === emoji);
    if (!reaction) {
      reaction = { emoji: emoji, msgId: msgId, users: [] };
      msg.reactions.push(reaction);
    }

    if (!reaction.users.includes(state.currentUser)) {
      reaction.users.push(state.currentUser);
    }

    saveMessages();
    renderMessages();

    // 通过 WebSocket 同步反应
    if (window.setData) {
      window.setData(CHAT_KEY, state.messages);
    }

    // 发送 reaction 消息通过 WebSocket
    if (window.sendWsMessage) {
      window.sendWsMessage({
        type: 'reaction',
        msgId: msgId,
        emoji: emoji,
        user: state.currentUser,
        _ts: Date.now()
      });
    }

    // 关闭选择器
    const picker = document.getElementById('reaction-picker');
    if (picker) picker.remove();
  };

  window.ChatRoom.removeReaction = function(msgId, emoji) {
    const msg = state.messages.find(m => m.id === msgId);
    if (!msg || !msg.reactions) return;

    const reaction = msg.reactions.find(r => r.emoji === emoji);
    if (!reaction) return;

    reaction.users = reaction.users.filter(u => u !== state.currentUser);

    if (reaction.users.length === 0) {
      msg.reactions = msg.reactions.filter(r => r.emoji !== emoji);
    }

    saveMessages();
    renderMessages();

    // 通过 WebSocket 同步
    if (window.setData) {
      window.setData(CHAT_KEY, state.messages);
    }
  };

  window.ChatRoom.toggleReaction = function(emoji, msgId) {
    const msg = state.messages.find(m => m.id === msgId);
    if (!msg) return;

    if (!msg.reactions) msg.reactions = [];

    const reaction = msg.reactions.find(r => r.emoji === emoji);
    if (reaction && reaction.users.includes(state.currentUser)) {
      // 已反应，移除
      window.ChatRoom.removeReaction(msgId, emoji);
    } else {
      // 未反应，添加
      window.ChatRoom.addReaction(msgId, emoji);
    }
  };

  // ========== 发送消息 ==========

  window.ChatRoom = window.ChatRoom || {};

  window.ChatRoom.send = function() {
    const input = document.getElementById('chatroom-input');
    if (!input) return;

    const text = input.value.trim();
    if (!text) return;

    input.value = '';
    input.focus();

    const msgObj = {
      id: Date.now().toString(36) + Math.random().toString(36).substr(2, 5),
      from: state.currentUser,
      text: text,
      time: new Date().toISOString(),
      type: 'text',
      read: false,
    };

    // 1. 乐观更新：立即加入本地消息列表并渲染
    state.messages.push(msgObj);
    saveMessages();  // 持久化到 localStorage

    // 2. 通过 WebSocket 推送（v6 sendChatMessage 接受预构建 msgObj，不会重复创建）
    if (window.sendChatMessage) {
      window.sendChatMessage(msgObj);
    }

    // 3. 停止输入状态
    clearTyping();

    // 4. 立即渲染（不需要等 WebSocket 回包）
    renderMessages();
    scrollToBottom();
  };

  window.ChatRoom.onKeyDown = function(e) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      window.ChatRoom.send();
    }
  };

  window.ChatRoom.onTyping = function() {
    const input = document.getElementById('chatroom-input');
    if (!input || !input.value.trim()) {
      clearTyping();
      if (window.sendTyping) window.sendTyping(false);
      return;
    }

    // 通过 WebSocket 发送（毫秒级，对方瞬间看到）
    if (window.sendTyping) {
      window.sendTyping(true);
    }

    // 防抖：1.5秒后自动清除
    clearTimeout(state.typingTimer);
    state.typingTimer = setTimeout(() => {
      clearTyping();
    }, 1500);
  };

  function clearTyping() {
    if (window.sendTyping) window.sendTyping(false);
    localStorage.removeItem(TYPING_KEY);
  }

  // ========== 已读回执 ==========

  window.ChatRoom.markAllRead = function() {
    let changed = false;
    const partner = state.currentUser === 'shushu' ? 'bibi' : 'shushu';

    for (const msg of state.messages) {
      if (msg.from === partner && !msg.read) {
        msg.read = true;
        changed = true;
      }
    }

    if (changed) {
      saveMessages();

      // 发送已读回执
      if (window.sendChatMessage) {
        // 通过 WebSocket 发已读确认
        const ws = getWs();
        if (ws && ws.readyState === WebSocket.OPEN) {
          try {
            ws.send(JSON.stringify({
              type: 'chat_read',
              from: state.currentUser,
              toUser: partner,
              readAt: Date.now(),
            }));
          } catch (e) {}
        }
      }

      // 更新本地数据通道
      if (window.setData) {
        window.setData(CHAT_KEY, state.messages);
      }

      renderMessages();
      updateUnreadBadge();
    }
  };

  function handleReadReceipt(data) {
    let changed = false;
    const now = Date.now();

    for (const msg of state.messages) {
      if (msg.from === state.currentUser && !msg.read) {
        msg.read = true;
        msg.readAt = now;
        changed = true;
      }
    }

    if (changed) {
      saveMessages();
      renderMessages();
    }
  }

  function getWs() {
    // 从 v6 模块获取 WebSocket
    if (window._realtimeSync && window._realtimeSync.ws) {
      return window._realtimeSync.ws;
    }
    return null;
  }

  // ========== UI 操作 ==========

  window.ChatRoom.toggle = function() {
    if (state.panelOpen) {
      window.ChatRoom.close();
    } else {
      window.ChatRoom.open();
    }
  };

  window.ChatRoom.open = function() {
    const overlay = document.getElementById('chatroom-overlay');
    if (overlay) overlay.classList.add('active');
    state.panelOpen = true;
    
    loadMessages();
    renderMessages();
    window.ChatRoom.markAllRead();
    updateUnreadBadge();

    // 聚焦输入框
    setTimeout(() => {
      const input = document.getElementById('chatroom-input');
      if (input) input.focus();
    }, 300);
  };

  window.ChatRoom.close = function() {
    const overlay = document.getElementById('chatroom-overlay');
    if (overlay) overlay.classList.remove('active');
    state.panelOpen = false;
    updateUnreadBadge();
  };

  window.ChatRoom.clearAll = function() {
    if (confirm('确定要清空所有聊天记录吗？此操作不可撤销。')) {
      state.messages = [];
      state.readMessages = {};
      saveMessages();
      saveReadStatus();
      if (window.setData) {
        window.setData(CHAT_KEY, []);
        window.setData(READ_KEY, {});
      }
      renderMessages();
      updateUnreadBadge();
    }
  };

  window.ChatRoom.insertEmoji = function() {
    const input = document.getElementById('chatroom-input');
    if (!input) return;
    
    const emojis = ['😊', '😂', '❤️', '😍', '🥰', '😘', '💕', '✨', '🎉', '🌟', 
      '💖', '🤗', '😭', '🥺', '😅', '🙈', '💋', '👋', '👍', '🔥'];
    const emoji = emojis[Math.floor(Math.random() * emojis.length)];
    
    const start = input.selectionStart;
    const end = input.selectionEnd;
    input.value = input.value.substring(0, start) + emoji + input.value.substring(end);
    input.selectionStart = input.selectionEnd = start + emoji.length;
    input.focus();
    window.ChatRoom.onTyping();
  };

  // ========== 未读角标 ==========

  function updateUnreadBadge() {
    const partner = state.currentUser === 'shushu' ? 'bibi' : 'shushu';
    const unread = state.messages.filter(m => m.from === partner && !m.read).length;

    // 浮动按钮角标（已隐藏，保留兼容）
    const badge = document.getElementById('chatroom-entry-badge');
    if (badge) {
      badge.textContent = unread;
      badge.style.display = unread > 0 ? 'flex' : 'none';
    }

    // 导航栏按钮角标
    const navBadge = document.getElementById('chatroom-nav-badge');
    if (navBadge) {
      navBadge.textContent = unread > 0 ? (unread > 99 ? '99+' : String(unread)) : '';
      navBadge.style.display = unread > 0 ? 'flex' : 'none';
    }

    // 更新页面标题
    if (unread > 0 && !state.panelOpen) {
      document.title = '(' + unread + ') 💬 新消息 - 鼠鼠和笔笔';
    } else {
      document.title = '🐹💕🐱 鼠鼠和笔笔';
    }
  }

  // ========== 桌面通知 ==========

  function checkDesktopNotification() {
    if ('Notification' in window && Notification.permission === 'default') {
      // 等用户交互后再请求
      document.addEventListener('click', function requestNotif() {
        Notification.requestPermission();
        document.removeEventListener('click', requestNotif);
      }, { once: true });
    }
  }

  function showDesktopNotification(msg) {
    if (!('Notification' in window) || Notification.permission !== 'granted') return;
    if (state.panelOpen) return;
    if (!msg || msg.from === state.currentUser) return;

    const sender = msg.from === 'shushu' ? '鼠鼠' : '笔笔';
    const notif = new Notification(`${sender} 发来消息 💌`, {
      body: msg.text || '[新消息]',
      icon: 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><text y=".9em" font-size="90">💬</text></svg>',
      tag: 'chat-message',
    });

    notif.onclick = function() {
      window.focus();
      window.ChatRoom.open();
      notif.close();
    };

    setTimeout(() => notif.close(), 5000);
  }

  // 暴露 refresh 接口（给 v6 模块调用）
  window.refreshChatMessages = function(messages) {
    if (messages && Array.isArray(messages)) {
      state.messages = messages;
      renderMessages();
      updateUnreadBadge();
    }
  };

  // ========== 语音消息功能 ==========
  
  let mediaRecorder = null;
  let audioChunks = [];
  let isRecording = false;
  let recordingTimer = null;
  let recordingDuration = 0;

  window.ChatRoom.startVoiceRecord = function() {
    if (isRecording) return;
    
    // 请求麦克风权限
    navigator.mediaDevices.getUserMedia({ audio: true })
      .then(stream => {
        mediaRecorder = new MediaRecorder(stream);
        audioChunks = [];
        
        mediaRecorder.ondataavailable = (event) => {
          if (event.data.size > 0) {
            audioChunks.push(event.data);
          }
        };
        
        mediaRecorder.onstop = () => {
          const audioBlob = new Blob(audioChunks, { type: 'audio/webm' });
          const reader = new FileReader();
          
          reader.onloadend = () => {
            const base64Audio = reader.result;
            
            // 发送语音消息
            const msgObj = {
              id: Date.now().toString(36) + Math.random().toString(36).substr(2, 5),
              from: state.currentUser,
              text: '[语音消息]',
              audio: base64Audio,
              duration: recordingDuration,
              time: new Date().toISOString(),
              type: 'voice',
            };
            
            state.messages.push(msgObj);
            saveMessages();
            renderMessages();
            
            // 通过 WebSocket 同步
            if (window.setData) {
              window.setData(CHAT_KEY, state.messages);
            }
            
            // 发送通知
            if (window.sendChatMessage) {
              window.sendChatMessage(msgObj);
            }
          };
          
          reader.readAsDataURL(audioBlob);
          
          // 停止所有音轨
          stream.getTracks().forEach(track => track.stop());
        };
        
        mediaRecorder.start();
        isRecording = true;
        recordingDuration = 0;
        
        // 更新按钮样式
        const voiceBtn = document.getElementById('chatroom-voice-btn');
        if (voiceBtn) {
          voiceBtn.style.background = '#ef4444';
          voiceBtn.style.color = 'white';
        }
        
        // 开始计时
        recordingTimer = setInterval(() => {
          recordingDuration++;
          if (recordingDuration >= 60) { // 最长60秒
            window.ChatRoom.stopVoiceRecord();
          }
        }, 1000);
        
        console.log('🎤 开始录音...');
      })
      .catch(err => {
        console.error('❌ 无法访问麦克风:', err);
        alert('无法访问麦克风，请检查权限设置');
      });
  };

  window.ChatRoom.stopVoiceRecord = function() {
    if (!isRecording || !mediaRecorder) return;
    
    mediaRecorder.stop();
    isRecording = false;
    
    // 清除计时器
    if (recordingTimer) {
      clearInterval(recordingTimer);
      recordingTimer = null;
    }
    
    // 恢复按钮样式
    const voiceBtn = document.getElementById('chatroom-voice-btn');
    if (voiceBtn) {
      voiceBtn.style.background = '';
      voiceBtn.style.color = '';
    }
    
    console.log('🎤 停止录音，时长:', recordingDuration, '秒');
  };

  // 播放语音消息
  window.ChatRoom.playVoice = function(msgId) {
    const msg = state.messages.find(m => m.id === msgId);
    if (!msg || !msg.audio) return;
    
    const audio = new Audio(msg.audio);
    audio.play().catch(err => {
      console.error('❌ 播放语音失败:', err);
    });
    
    console.log('🔊 播放语音消息:', msgId);
  };

  // ========== 启动 ==========
  
  // ========== 消息搜索功能 ==========
  
  let searchMode = false;
  let searchResults = [];
  
  window.ChatRoom.toggleSearch = function() {
    searchMode = !searchMode;
    const messagesContainer = document.getElementById('chatroom-messages');
    const searchInput = document.getElementById('chatroom-search-input');
    
    if (searchMode) {
      // 显示搜索输入框
      if (!searchInput) {
        const searchHtml = `
          <div class="chatroom-search" id="chatroom-search">
            <input type="text" id="chatroom-search-input" placeholder="搜索消息..." oninput="window.ChatRoom.performSearch(this.value)">
            <div class="chatroom-search-results" id="chatroom-search-results"></div>
          </div>
        `;
        messagesContainer.insertAdjacentHTML('beforebegin', searchHtml);
      } else {
        searchInput.parentElement.style.display = 'block';
        searchInput.focus();
      }
    } else {
      // 隐藏搜索
      const searchDiv = document.getElementById('chatroom-search');
      if (searchDiv) {
        searchDiv.style.display = 'none';
      }
      // 恢复显示所有消息
      renderMessages();
    }
  };
  
  window.ChatRoom.performSearch = function(keyword) {
    if (!keyword || keyword.trim() === '') {
      renderMessages();
      return;
    }
    
    keyword = keyword.toLowerCase();
    searchResults = state.messages.filter(msg => 
      msg.text && msg.text.toLowerCase().includes(keyword)
    );
    
    // 显示搜索结果
    const resultsContainer = document.getElementById('chatroom-search-results');
    if (resultsContainer) {
      if (searchResults.length === 0) {
        resultsContainer.innerHTML = '<div class="chatroom-search-no-results">未找到匹配的消息</div>';
      } else {
        let html = `<div class="chatroom-search-info">找到 ${searchResults.length} 条消息</div>`;
        for (const msg of searchResults) {
          const preview = msg.text.length > 50 ? msg.text.substring(0, 50) + '...' : msg.text;
          const highlightedPreview = preview.replace(
            new RegExp(keyword, 'gi'), 
            match => `<span class="chatroom-search-highlight">${match}</span>`
          );
          html += `
            <div class="chatroom-search-result" onclick="window.ChatRoom.jumpToMessage('${msg.id}')">
              <span class="chatroom-search-result-from">${msg.from === 'shushu' ? '🐹' : '🐱'}</span>
              <span class="chatroom-search-result-text">${highlightedPreview}</span>
            </div>
          `;
        }
        resultsContainer.innerHTML = html;
      }
    }
  };
  
  window.ChatRoom.jumpToMessage = function(msgId) {
    // 退出搜索模式
    searchMode = false;
    const searchDiv = document.getElementById('chatroom-search');
    if (searchDiv) {
      searchDiv.style.display = 'none';
    }
    
    // 渲染所有消息并高亮目标消息
    renderMessages();
    
    // 滚动到目标消息并高亮
    setTimeout(() => {
      const msgEl = document.querySelector(`[data-msg-id="${msgId}"]`);
      if (msgEl) {
        msgEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
        msgEl.classList.add('chatroom-msg-highlight');
        setTimeout(() => {
          msgEl.classList.remove('chatroom-msg-highlight');
        }, 2000);
      }
    }, 100);
  };
  
  // ========== 消息格式化功能 ==========
  
  function formatMessageText(text) {
    if (!text) return '';
    
    // 粗体：**text** -> <strong>text</strong>
    text = text.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
    
    // 斜体：*text* -> <em>text</em>
    text = text.replace(/\*(.*?)\*/g, '<em>$1</em>');
    
    // 下划线：__text__ -> <u>text</u>
    text = text.replace(/__(.*?)__/g, '<u>$1</u>');
    
    // 代码：`code` -> <code>code</code>
    text = text.replace(/`(.*?)`/g, '<code>$1</code>');
    
    // 链接：自动检测 URL 并转换为可点击链接
    text = text.replace(/(https?:\/\/[^\s]+)/g, '<a href="$1" target="_blank" class="chatroom-msg-link">$1</a>');
    
    return text;
  }
  
  // 修改 renderMessages 函数中的消息文本显示
  // 将 escapeHtml(msg.text) 改为 formatMessageText(msg.text)
  
  // ========== 启动 ==========
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

})();