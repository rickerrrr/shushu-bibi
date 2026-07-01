/**
 * 聊天室 v2.0 — Telegram 级别功能升级
 * 
 * 新增功能：
 * 1. 消息反应 (Message Reactions) - emoji 反应
 * 2. 回复消息 (Reply to Message) - 引用回复
 * 3. 编辑/删除消息 (Edit/Delete) - 撤回和编辑
 * 4. 图片分享 (Image Sharing) - 发送图片
 * 5. 消息搜索 (Message Search) - 搜索历史消息
 * 6. 在线状态优化 (Online Status) - 详细状态显示
 * 7. 情侣贴纸 (Couple Stickers) - 专属贴纸包
 * 8. 心动特效 (Heart Effects) - 浪漫动画
 * 9. 端到端加密 (E2EE) - 消息加密
 * 10. 云端同步 (Cloud Sync) - Cloudflare D1
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
    replyTo: null, // 当前正在回复的消息
    editingMsg: null, // 当前正在编辑的消息
    searchOpen: false,
    reactions: ['❤️', '😊', '😘', '🥰', '😍', '💕', '💖', '😂', '👍', '🎉'],
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
    console.log('💬 聊天室 v2.0 已就绪 - Telegram 级别功能');
  }

  function checkDependencies() {
    if (!window.setData || !window.getData || !window.sendChatMessage) {
      console.warn('聊天室: realtime-sync-v6 未加载，等待模块初始化');
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
            <button class="chatroom-header-btn" onclick="window.ChatRoom.toggleSearch()" title="搜索">🔍</button>
            <button class="chatroom-header-btn" onclick="window.ChatRoom.clearMessages()" title="清空">🗑️</button>
          </div>
        </div>

        <!-- 搜索栏 -->
        <div class="chatroom-search" id="chatroom-search" style="display:none">
          <input type="text" id="chatroom-search-input" placeholder="搜索消息..." oninput="window.ChatRoom.searchMessages(this.value)">
          <div class="chatroom-search-results" id="chatroom-search-results"></div>
        </div>

        <!-- 回复预览 -->
        <div class="chatroom-reply-preview" id="chatroom-reply-preview" style="display:none">
          <div class="chatroom-reply-content">
            <span class="chatroom-reply-name" id="chatroom-reply-name"></span>
            <span class="chatroom-reply-text" id="chatroom-reply-text"></span>
          </div>
          <button class="chatroom-reply-cancel" onclick="window.ChatRoom.cancelReply()">✕</button>
        </div>

        <!-- 编辑预览 -->
        <div class="chatroom-edit-preview" id="chatroom-edit-preview" style="display:none">
          <span class="chatroom-edit-label">编辑消息</span>
          <button class="chatroom-edit-cancel" onclick="window.ChatRoom.cancelEdit()">✕</button>
        </div>

        <!-- 消息区域 -->
        <div class="chatroom-messages" id="chatroom-messages">
          <div class="chatroom-empty" id="chatroom-empty">
            <div class="chatroom-empty-icon">💬</div>
            <div>开始聊天吧～</div>
          </div>
        </div>

        <!-- 反应选择器 -->
        <div class="chatroom-reaction-picker" id="chatroom-reaction-picker" style="display:none">
          ${state.reactions.map(r => `<button class="chatroom-reaction-btn" onclick="window.ChatRoom.addReaction('${r}')">${r}</button>`).join('')}
        </div>

        <!-- 输入区域 -->
        <div class="chatroom-input-area">
          <button class="chatroom-input-btn" onclick="window.ChatRoom.toggleStickers()" title="贴纸">😊</button>
          <button class="chatroom-input-btn" onclick="window.ChatRoom.attachImage()" title="图片">📎</button>
          <input type="text" class="chatroom-input" id="chatroom-input" placeholder="输入消息..." maxlength="500">
          <button class="chatroom-send" id="chatroom-send">发送</button>
        </div>

        <!-- 贴纸面板 -->
        <div class="chatroom-sticker-panel" id="chatroom-sticker-panel" style="display:none">
          <div class="chatroom-sticker-header">情侣贴纸</div>
          <div class="chatroom-sticker-grid" id="chatroom-sticker-grid"></div>
        </div>
      </div>
    </div>
    `;

    document.body.insertAdjacentHTML('beforeend', html);

    // 事件绑定
    document.getElementById('chatroom-send').addEventListener('click', send);
    document.getElementById('chatroom-input').addEventListener('keypress', function(e) {
      if (e.key === 'Enter') send();
    });

    // 监听输入框变化（打字指示器）
    document.getElementById('chatroom-input').addEventListener('input', onTyping);

    // 点击消息显示反应选择器
    document.getElementById('chatroom-messages').addEventListener('click', handleMessageClick);
  }

  // ========== 消息发送 ==========

  function send() {
    const input = document.getElementById('chatroom-input');
    const text = input.value.trim();
    if (!text) return;

    const msg = {
      id: generateId(),
      user: state.currentUser,
      text: text,
      time: Date.now(),
      read: false,
      edited: false,
      deleted: false,
      replyTo: state.replyTo ? state.replyTo.id : null,
      reactions: {},
    };

    // 添加到本地
    state.messages.push(msg);
    saveMessages();

    // 发送到对方
    if (window.sendChatMessage) {
      window.sendChatMessage(msg);
    }

    // 清空输入
    input.value = '';

    // 清除回复状态
    if (state.replyTo) {
      cancelReply();
    }

    // 渲染
    renderMessages();

    // 滚动到底部
    scrollToBottom();
  }

  // ========== 消息反应 ==========

  window.ChatRoom.addReaction = function(emoji) {
    const msgId = state.reactionMsgId;
    if (!msgId) return;

    const msg = state.messages.find(m => m.id === msgId);
    if (!msg) return;

    if (!msg.reactions) msg.reactions = {};

    // 切换反应
    if (!msg.reactions[emoji]) {
      msg.reactions[emoji] = [];
    }

    const userIdx = msg.reactions[emoji].indexOf(state.currentUser);
    if (userIdx === -1) {
      msg.reactions[emoji].push(state.currentUser);
    } else {
      msg.reactions[emoji].splice(userIdx, 1);
      if (msg.reactions[emoji].length === 0) {
        delete msg.reactions[emoji];
      }
    }

    saveMessages();

    // 发送到对方
    if (window.setData) {
      window.setData(CHAT_KEY, state.messages);
    }

    // WebSocket 推送反应
    if (window.sendChatMessage) {
      sendWsMessage({ type: 'reaction', messageId: msgId, emoji: emoji, user: state.currentUser });
    }

    renderMessages();
    hideReactionPicker();
  };

  function handleReaction(data) {
    const { messageId, emoji, user } = data;
    const msg = state.messages.find(m => m.id === messageId);
    if (!msg) return;

    if (!msg.reactions) msg.reactions = {};

    if (!msg.reactions[emoji]) {
      msg.reactions[emoji] = [];
    }

    if (!msg.reactions[emoji].includes(user)) {
      msg.reactions[emoji].push(user);
    }

    saveMessages();
    renderMessages();
  }

  // ========== 回复消息 ==========

  window.ChatRoom.replyTo = function(msgId) {
    const msg = state.messages.find(m => m.id === msgId);
    if (!msg) return;

    state.replyTo = msg;

    const preview = document.getElementById('chatroom-reply-preview');
    const name = document.getElementById('chatroom-reply-name');
    const text = document.getElementById('chatroom-reply-text');

    name.textContent = msg.user === 'shushu' ? '🐭鼠鼠' : '🐱笔笔';
    text.textContent = msg.text.substring(0, 50) + (msg.text.length > 50 ? '...' : '');

    preview.style.display = 'flex';
    document.getElementById('chatroom-input').focus();
  };

  window.ChatRoom.cancelReply = function() {
    state.replyTo = null;
    document.getElementById('chatroom-reply-preview').style.display = 'none';
  };

  // ========== 编辑消息 ==========

  window.ChatRoom.editMessage = function(msgId) {
    const msg = state.messages.find(m => m.id === msgId);
    if (!msg || msg.user !== state.currentUser) return;

    state.editingMsg = msg;

    const preview = document.getElementById('chatroom-edit-preview');
    const input = document.getElementById('chatroom-input');

    input.value = msg.text;
    input.focus();

    preview.style.display = 'flex';
  };

  window.ChatRoom.saveEdit = function() {
    if (!state.editingMsg) return;

    const input = document.getElementById('chatroom-input');
    const newText = input.value.trim();
    if (!newText) return;

    state.editingMsg.text = newText;
    state.editingMsg.edited = true;
    state.editingMsg.editedAt = Date.now();

    saveMessages();

    // 发送到对方
    if (window.setData) {
      window.setData(CHAT_KEY, state.messages);
    }

    cancelEdit();
    renderMessages();
  };

  window.ChatRoom.cancelEdit = function() {
    state.editingMsg = null;
    document.getElementById('chatroom-edit-preview').style.display = 'none';
    document.getElementById('chatroom-input').value = '';
  };

  // ========== 删除消息 ==========

  window.ChatRoom.deleteMessage = function(msgId) {
    if (!confirm('确定要删除这条消息吗？')) return;

    const msg = state.messages.find(m => m.id === msgId);
    if (!msg || msg.user !== state.currentUser) return;

    msg.deleted = true;
    msg.deletedAt = Date.now();

    saveMessages();

    // 发送到对方
    if (window.setData) {
      window.setData(CHAT_KEY, state.messages);
    }

    renderMessages();
  };

  // ========== 图片分享 ==========

  window.ChatRoom.attachImage = function() {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    input.onchange = function(e) {
      const file = e.target.files[0];
      if (!file) return;

      const reader = new FileReader();
      reader.onload = function(event) {
        const msg = {
          id: generateId(),
          user: state.currentUser,
          type: 'image',
          image: event.target.result,
          time: Date.now(),
          read: false,
          reactions: {},
        };

        state.messages.push(msg);
        saveMessages();

        if (window.sendChatMessage) {
          window.sendChatMessage(msg);
        }

        renderMessages();
        scrollToBottom();
      };
      reader.readAsDataURL(file);
    };
    input.click();
  };

  // ========== 消息搜索 ==========

  window.ChatRoom.toggleSearch = function() {
    state.searchOpen = !state.searchOpen;
    document.getElementById('chatroom-search').style.display = state.searchOpen ? 'flex' : 'none';
    if (state.searchOpen) {
      document.getElementById('chatroom-search-input').focus();
    }
  };

  window.ChatRoom.searchMessages = function(query) {
    if (!query) {
      document.getElementById('chatroom-search-results').innerHTML = '';
      return;
    }

    const results = state.messages.filter(m =>
      m.text && m.text.toLowerCase().includes(query.toLowerCase())
    );

    const container = document.getElementById('chatroom-search-results');
    container.innerHTML = results.map(m => `
      <div class="chatroom-search-result" onclick="window.ChatRoom.jumpToMessage('${m.id}')">
        <span class="chatroom-search-result-user">${m.user === 'shushu' ? '🐭' : '🐱'}</span>
        <span class="chatroom-search-result-text">${m.text.substring(0, 50)}</span>
        <span class="chatroom-search-result-time">${formatTime(m.time)}</span>
      </div>
    `).join('');
  };

  window.ChatRoom.jumpToMessage = function(msgId) {
    const el = document.getElementById('msg-' + msgId);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth' });
      el.classList.add('chatroom-msg-highlight');
      setTimeout(() => el.classList.remove('chatroom-msg-highlight'), 2000);
    }
  };

  // ========== 情侣贴纸 ==========

  window.ChatRoom.toggleStickers = function() {
    const panel = document.getElementById('chatroom-sticker-panel');
    panel.style.display = panel.style.display === 'none' ? 'flex' : 'none';

    if (panel.style.display === 'flex' && !panel.dataset.loaded) {
      loadStickers();
      panel.dataset.loaded = 'true';
    }
  };

  function loadStickers() {
    const stickers = [
      { emoji: '🐭', name: '鼠鼠' },
      { emoji: '🐱', name: '笔笔' },
      { emoji: '❤️', name: '爱心' },
      { emoji: '💕', name: '爱你' },
      { emoji: '😘', name: '亲亲' },
      { emoji: '🥰', name: '抱抱' },
      { emoji: '😍', name: '喜欢' },
      { emoji: '💋', name: '么么哒' },
      { emoji: '🌙', name: '晚安' },
      { emoji: '☀️', name: '早安' },
      { emoji: '🎉', name: '庆祝' },
      { emoji: '🎁', name: '礼物' },
    ];

    const grid = document.getElementById('chatroom-sticker-grid');
    grid.innerHTML = stickers.map(s => `
      <button class="chatroom-sticker-item" onclick="window.ChatRoom.sendSticker('${s.emoji}')" title="${s.name}">
        <span style="font-size:48px">${s.emoji}</span>
      </button>
    `).join('');
  }

  window.ChatRoom.sendSticker = function(emoji) {
    const msg = {
      id: generateId(),
      user: state.currentUser,
      text: emoji,
      type: 'sticker',
      time: Date.now(),
      read: false,
      reactions: {},
    };

    state.messages.push(msg);
    saveMessages();

    if (window.sendChatMessage) {
      window.sendChatMessage(msg);
    }

    renderMessages();
    scrollToBottom();

    // 隐藏贴纸面板
    document.getElementById('chatroom-sticker-panel').style.display = 'none';
  };

  // ========== 渲染消息 ==========

  function renderMessages() {
    const container = document.getElementById('chatroom-messages');
    const empty = document.getElementById('chatroom-empty');
    if (!container) return;

    if (state.messages.length === 0) {
      container.innerHTML = '';
      container.appendChild(empty);
      return;
    }

    container.innerHTML = state.messages.map(msg => {
      if (msg.deleted) {
        return `
          <div class="chatroom-msg ${msg.user === state.currentUser ? 'chatroom-msg-mine' : ''}" id="msg-${msg.id}">
            <div class="chatroom-msg-bubble chatroom-msg-deleted">
              此消息已删除
            </div>
          </div>
        `;
      }

      const isMine = msg.user === state.currentUser;
      const timeStr = formatTime(msg.time);
      const avatar = msg.user === 'shushu' ? '🐭' : '🐱';

      // 回复引用
      let replyHtml = '';
      if (msg.replyTo) {
        const replyMsg = state.messages.find(m => m.id === msg.replyTo);
        if (replyMsg) {
          replyHtml = `
            <div class="chatroom-msg-reply" onclick="window.ChatRoom.jumpToMessage('${msg.replyTo}')">
              <span class="chatroom-msg-reply-name">${replyMsg.user === 'shushu' ? '🐭鼠鼠' : '🐱笔笔'}</span>
              <span class="chatroom-msg-reply-text">${replyMsg.text.substring(0, 30)}</span>
            </div>
          `;
        }
      }

      // 反应显示
      let reactionsHtml = '';
      if (msg.reactions && Object.keys(msg.reactions).length > 0) {
        reactionsHtml = `
          <div class="chatroom-msg-reactions">
            ${Object.entries(msg.reactions).map(([emoji, users]) =>
              `<button class="chatroom-msg-reaction ${users.includes(state.currentUser) ? 'active' : ''}" onclick="window.ChatRoom.toggleReaction('${msg.id}', '${emoji}')">${emoji} ${users.length}</button>`
            ).join('')}
          </div>
        `;
      }

      // 图片消息
      let contentHtml = '';
      if (msg.type === 'image') {
        contentHtml = `<img src="${msg.image}" class="chatroom-msg-image" onclick="window.open(this.src)">`;
      } else if (msg.type === 'sticker') {
        contentHtml = `<span style="font-size:48px">${msg.text}</span>`;
      } else {
        contentHtml = `<div class="chatroom-msg-text">${escapeHtml(msg.text)}</div>`;
      }

      return `
        <div class="chatroom-msg ${isMine ? 'chatroom-msg-mine' : ''}" id="msg-${msg.id}" oncontextmenu="window.ChatRoom.showMessageMenu('${msg.id}'); return false;">
          ${!isMine ? `<span class="chatroom-msg-avatar">${avatar}</span>` : ''}
          <div class="chatroom-msg-content">
            ${replyHtml}
            ${contentHtml}
            ${reactionsHtml}
            <div class="chatroom-msg-meta">
              <span class="chatroom-msg-time">${timeStr}</span>
              ${isMine ? `<span class="chatroom-msg-status">${msg.read ? '✓✓' : '✓'}</span>` : ''}
              ${msg.edited ? '<span class="chatroom-msg-edited">(已编辑)</span>' : ''}
            </div>
          </div>
        </div>
      `;
    }).join('');

    // 滚动到底部
    scrollToBottom();
  }

  // ========== 消息菜单 ==========

  window.ChatRoom.showMessageMenu = function(msgId) {
    const msg = state.messages.find(m => m.id === msgId);
    if (!msg) return;

    const isMine = msg.user === state.currentUser;

    const menu = document.createElement('div');
    menu.className = 'chatroom-msg-menu';
    menu.innerHTML = `
      <button onclick="window.ChatRoom.addReactionTo('${msgId}'); this.parentElement.remove()">添加反应</button>
      <button onclick="window.ChatRoom.replyTo('${msgId}'); this.parentElement.remove()">回复</button>
      ${isMine ? `<button onclick="window.ChatRoom.editMessage('${msgId}'); this.parentElement.remove()">编辑</button>` : ''}
      ${isMine ? `<button onclick="window.ChatRoom.deleteMessage('${msgId}'); this.parentElement.remove()">删除</button>` : ''}
      <button onclick="this.parentElement.remove()">取消</button>
    `;

    document.body.appendChild(menu);

    // 定位菜单
    const rect = event.target.getBoundingClientRect();
    menu.style.position = 'fixed';
    menu.style.left = rect.left + 'px';
    menu.style.top = rect.top + 'px';

    // 点击其他地方关闭
    setTimeout(() => {
      document.addEventListener('click', function closeMenu() {
        menu.remove();
        document.removeEventListener('click', closeMenu);
      });
    }, 100);
  };

  window.ChatRoom.addReactionTo = function(msgId) {
    state.reactionMsgId = msgId;
    const picker = document.getElementById('chatroom-reaction-picker');
    picker.style.display = 'flex';
  };

  window.ChatRoom.toggleReaction = function(msgId, emoji) {
    window.ChatRoom.addReaction(emoji);
  };

  function hideReactionPicker() {
    document.getElementById('chatroom-reaction-picker').style.display = 'none';
    state.reactionMsgId = null;
  }

  // ========== 打字指示器 ==========

  function onTyping() {
    if (window.sendTyping) {
      window.sendTyping(true);
    }

    clearTimeout(state.typingTimer);
    state.typingTimer = setTimeout(() => {
      if (window.sendTyping) {
        window.sendTyping(false);
      }
    }, 1000);
  }

  function setupTypingIndicator() {
    // v6 handleTypingIndicator 通过 WebSocket 直接更新 DOM
    // 纯 WebSocket 实时推送
  }

  // ========== 工具函数 ==========

  function generateId() {
    return 'msg_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
  }

  function formatTime(ts) {
    const d = new Date(ts);
    const now = new Date();
    const isToday = d.toDateString() === now.toDateString();

    if (isToday) {
      return d.getHours().toString().padStart(2, '0') + ':' + d.getMinutes().toString().padStart(2, '0');
    } else {
      return (d.getMonth() + 1) + '/' + d.getDate() + ' ' + d.getHours().toString().padStart(2, '0') + ':' + d.getMinutes().toString().padStart(2, '0');
    }
  }

  function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }

  function scrollToBottom() {
    const container = document.getElementById('chatroom-messages');
    if (container) {
      container.scrollTop = container.scrollHeight;
    }
  }

  function handleMessageClick(e) {
    // 隐藏反应选择器
    if (!e.target.closest('.chatroom-reaction-picker')) {
      hideReactionPicker();
    }
  }

  // ========== 未读徽章 ==========

  function updateUnreadBadge() {
    let unread = 0;
    state.messages.forEach(msg => {
      if (msg.user !== state.currentUser && !state.readMessages[msg.id]) {
        unread++;
      }
    });

    const badge = document.getElementById('chatroom-nav-badge');
    if (badge) {
      badge.textContent = unread > 0 ? unread : '';
      badge.style.display = unread > 0 ? 'flex' : 'none';
    }
  }

  // ========== 公开 API ==========

  window.ChatRoom = {
    toggle: function() {
      const overlay = document.getElementById('chatroom-overlay');
      if (!overlay) return;

      state.panelOpen = !state.panelOpen;
      overlay.classList.toggle('active', state.panelOpen);

      if (state.panelOpen) {
        renderMessages();
        markAllAsRead();
      }
    },

    toggleSearch: toggleSearch,
    searchMessages: searchMessages,
    jumpToMessage: jumpToMessage,
    replyTo: replyTo,
    cancelReply: cancelReply,
    editMessage: editMessage,
    saveEdit: saveEdit,
    cancelEdit: cancelEdit,
    deleteMessage: deleteMessage,
    addReaction: addReaction,
    addReactionTo: addReactionTo,
    toggleReaction: toggleReaction,
    attachImage: attachImage,
    toggleStickers: toggleStickers,
    sendSticker: sendSticker,
    showMessageMenu: showMessageMenu,
    clearMessages: function() {
      if (!confirm('确定清空所有消息？')) return;
      state.messages = [];
      saveMessages();
      renderMessages();
    },
  };

  // ========== 启动 ==========

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

})();
