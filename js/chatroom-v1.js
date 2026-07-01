/**
 * 聊天室 v11.0 — 极简版：历史消息 + 实时接收 + E2EE + R2语音
 * 笔笔是主人，鼠鼠是对方
 */

try {
(function() {
  'use strict';

  const CHAT_KEY = 'chat_messages';
  
  const state = {
    messages: [],
    currentUser: 'bibi',     // 笔笔，永远不变
    partnerUser: 'shushu',   // 鼠鼠
    panelOpen: false,
  };

  // ========== 初始化 ==========

  function init() {
    detectUser();
    loadMessages();
    setupDOM();
    setupListeners();
    updatePartnerStatus();
    renderMessages();
    loadCloudHistory();
    initE2EE();
    console.log('\ud83d\udcac 聊天室 v11.0 — 极简版已就绪 (WS + D1 + E2EE + R2)');
  }

  function detectUser() {
    localStorage.setItem('currentUser', 'bibi');
    localStorage.setItem('current_user', 'bibi');
    state.currentUser = 'bibi';
  }

  function loadMessages() {
    try {
      const raw = localStorage.getItem(CHAT_KEY);
      state.messages = raw ? JSON.parse(raw) : [];
    } catch (e) { state.messages = []; }
  }

  function saveMessages() {
    localStorage.setItem(CHAT_KEY, JSON.stringify(state.messages));
  }

  // ========== E2EE ==========

  async function initE2EE() {
    if (!window.E2EE) return;
    await window.E2EE.init();
    updateE2EEIndicator();
    window.addEventListener('e2ee_ready', updateE2EEIndicator);
    window.addEventListener('e2ee_key_update', function() {
      if (window.E2EE && typeof window.E2EE.refreshPartnerKey === 'function') {
        window.E2EE.refreshPartnerKey().then(updateE2EEIndicator);
      }
    });
  }

  function updateE2EEIndicator() {
    var el = document.getElementById('chatroom-e2ee-status');
    if (!el) return;
    if (window.E2EE && window.E2EE.isReady()) {
      el.textContent = '\ud83d\udd12';
      el.title = '端对端加密已激活';
      el.style.opacity = '1';
      el.style.color = '#10b981';
    } else {
      el.textContent = '\ud83d\udd13';
      el.title = '等待加密握手';
      el.style.opacity = '0.5';
      el.style.color = '#f59e0b';
    }
  }

  // ========== D1 云端历史 ==========

  async function loadCloudHistory() {
    try {
      var resp = await fetch('https://ws.shushu-bibi.cn/api/messages?limit=200');
      if (!resp.ok) return;
      var data = await resp.json();
      if (!data.success || !data.messages || !data.messages.length) return;

      var cloudIds = new Set(data.messages.map(function(m) { return m.id; }));
      var localOnly = state.messages.filter(function(m) { return !cloudIds.has(m.id); });

      var cloudMsgs = [];
      for (var i = 0; i < data.messages.length; i++) {
        var m = data.messages[i];
        var displayText = m.text || '';
        if (m.iv && window.E2EE && window.E2EE.isReady()) {
          var decrypted = await window.E2EE.decrypt(m.text, m.iv);
          displayText = decrypted !== null ? decrypted : '\ud83d\udd12 [加密消息]';
        }
        cloudMsgs.push({
          id: m.id,
          from: m.from_user,
          text: displayText,
          time: new Date(m.timestamp).toISOString(),
          type: m.type || 'text',
          voiceData: m.voice_data,
          duration: m.duration,
          encrypted: !!m.iv,
        });
      }

      state.messages = cloudMsgs.concat(localOnly);
      var seen = new Set();
      state.messages = state.messages.filter(function(m) {
        if (seen.has(m.id)) return false;
        seen.add(m.id);
        return true;
      }).sort(function(a, b) { return new Date(a.time) - new Date(b.time); });

      saveMessages();
      renderMessages();
      scrollToBottom();
      console.log('[D1] 加载 ' + cloudMsgs.length + ' 条历史消息');
    } catch (e) {
      console.log('[D1] 云端加载失败:', e.message);
    }
  }

  // ========== DOM ==========

  function setupDOM() {
    if (document.getElementById('chatroom-overlay')) return;

    var partnerName = '\ud83d\udc39\u9f20\u9f20';
    var html = '<div class="chatroom-overlay" id="chatroom-overlay">' +
      '<div class="chatroom-panel" id="chatroom-panel">' +
        '<div class="chatroom-header">' +
          '<div style="display:flex;align-items:center;gap:10px;color:#fff;">' +
            '<span onclick="window.ChatRoom.toggle()" style="cursor:pointer;font-size:18px">\u2190</span>' +
            '<span style="font-size:17px;font-weight:600">' + partnerName + '</span>' +
            '<span id="chatroom-partner-status" style="font-size:12px;opacity:0.8">\u2022 \u79bb\u7ebf</span>' +
          '</div>' +
          '<span id="chatroom-e2ee-status" style="font-size:16px;opacity:0.5;cursor:help">\ud83d\udd13</span>' +
        '</div>' +
        '<div class="chatroom-messages" id="chatroom-messages">' +
          '<div class="chatroom-empty" id="chatroom-empty">' +
            '<div style="font-size:48px;margin-bottom:12px">\ud83d\udcac</div>' +
            '<div style="color:#999">\u8fd8\u6ca1\u6709\u6d88\u606f~</div>' +
          '</div>' +
        '</div>' +
        '<div class="chatroom-input-bar">' +
          '<button class="chatroom-voice-btn" id="chatroom-voice-btn" onmousedown="window.ChatRoom.startVoiceRecord()" onmouseup="window.ChatRoom.stopVoiceRecord()" ontouchstart="window.ChatRoom.startVoiceRecord()" ontouchend="window.ChatRoom.stopVoiceRecord()">\ud83c\udfa4</button>' +
          '<input type="text" class="chatroom-input" id="chatroom-input" placeholder="\u8bf4\u70b9\u4ec0\u4e48..." onkeydown="window.ChatRoom.onKeyDown(event)">' +
          '<button class="chatroom-send-btn" onclick="window.ChatRoom.send()">\u2191</button>' +
        '</div>' +
      '</div></div>';

    var container = document.createElement('div');
    container.innerHTML = html;
    document.body.appendChild(container.firstElementChild);

    // Start periodic online status updates
    setInterval(updatePartnerStatus, 5000);
  }

  // ========== 在线状态 ==========

  function updatePartnerStatus() {
    var el = document.getElementById('chatroom-partner-status');
    if (!el) return;
    try {
      var raw = localStorage.getItem('online_status_shushu');
      if (raw) {
        var data = JSON.parse(raw);
        var diff = Date.now() - (data.lastSeen || 0);
        var online = diff < 35000;
        el.textContent = online ? '\ud83d\udfe2 \u5728\u7ebf' : '\u26ab \u79bb\u7ebf';
        el.style.color = online ? '#4ecdc4' : '#999';
      } else {
        el.textContent = '\u26ab \u79bb\u7ebf';
        el.style.color = '#999';
      }
    } catch(e) {
      el.textContent = '\u26ab \u79bb\u7ebf';
      el.style.color = '#999';
    }
  }

  // ========== 监听 ==========

  function setupListeners() {
    // localStorage 跨标签同步
    window.addEventListener('storage', function(e) {
      if (e.key === CHAT_KEY) {
        loadMessages();
        renderMessages();
      }
    });

    // WebSocket 消息监听 (BroadcastChannel)
    try {
      var bc = new BroadcastChannel('love_website_sync');
      bc.onmessage = function(e) {
        if (e.data && e.data.type === 'chat_message') {
          loadMessages();
          renderMessages();
        }
      };
    } catch(e) {}
  }

  // ========== 渲染 ==========

  function renderMessages() {
    var container = document.getElementById('chatroom-messages');
    var empty = document.getElementById('chatroom-empty');
    if (!container) return;

    if (state.messages.length === 0) {
      container.innerHTML = '';
      if (empty) container.appendChild(empty);
      return;
    }

    if (empty) empty.style.display = 'none';

    var html = '';
    for (var i = 0; i < state.messages.length; i++) {
      var msg = state.messages[i];
      var isMine = msg.from === state.currentUser;
      var time = new Date(msg.time).toLocaleTimeString('zh-CN', {hour: '2-digit', minute: '2-digit'});
      var safeText = (msg.text || '').replace(/</g, '&lt;').replace(/>/g, '&gt;');

      html += '<div class="chatroom-msg ' + (isMine ? 'chatroom-msg-mine' : 'chatroom-msg-theirs') + '">';

      if (msg.type === 'voice') {
        html += '<div class="chatroom-msg-bubble">';
        html += '<div class="chatroom-msg-voice" onclick="window.ChatRoom.playVoice(\'' + msg.id + '\')">';
        html += '<span class="voice-play-icon">\u25b6\ufe0f</span>';
        html += '<span class="voice-duration">' + (msg.duration || 0) + '\u79d2</span>';
        html += '</div>';
        html += '<div class="chatroom-msg-meta"><span class="chatroom-msg-time">' + time + '</span></div>';
        html += '</div>';
      } else {
        html += '<div class="chatroom-msg-bubble">';
        html += '<div class="chatroom-msg-text">' + safeText + '</div>';
        html += '<div class="chatroom-msg-meta"><span class="chatroom-msg-time">' + time + '</span></div>';
        html += '</div>';
      }

      html += '</div>';
    }

    container.innerHTML = html;
    scrollToBottom();
  }

  function scrollToBottom() {
    var container = document.getElementById('chatroom-messages');
    if (container) {
      setTimeout(function() { container.scrollTop = container.scrollHeight; }, 100);
    }
  }

  // ========== 发送 ==========

  window.ChatRoom = window.ChatRoom || {};

  window.ChatRoom.send = async function() {
    var input = document.getElementById('chatroom-input');
    if (!input) return;
    var text = input.value.trim();
    if (!text) return;

    var e2eeReady = window.E2EE && window.E2EE.isReady();

    input.value = '';
    input.focus();

    var msgObj = {
      id: Date.now().toString(36) + Math.random().toString(36).substr(2, 5),
      from: state.currentUser,
      text: text,
      time: new Date().toISOString(),
      type: 'text',
    };

    // E2EE encrypt
    var encrypted = null;
    if (e2eeReady) {
      try { encrypted = await window.E2EE.encrypt(text); } catch(e) { encrypted = null; }
    }
    var wsMsgObj = encrypted ? {
      id: msgObj.id,
      from: msgObj.from,
      text: encrypted.ciphertext,
      iv: encrypted.iv,
      time: msgObj.time,
      type: 'text',
      encrypted: true,
    } : msgObj;

    // Local save
    state.messages.push(msgObj);
    saveMessages();
    renderMessages();
    scrollToBottom();

    // WebSocket send
    if (window.sendChatMessage) {
      window.sendChatMessage(wsMsgObj);
    }
  };

  window.ChatRoom.onKeyDown = function(e) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      window.ChatRoom.send();
    }
  };

  // ========== 开关 ==========

  window.ChatRoom.toggle = function() {
    if (state.panelOpen) {
      window.ChatRoom.close();
    } else {
      window.ChatRoom.open();
    }
  };

  window.ChatRoom.open = function() {
    var overlay = document.getElementById('chatroom-overlay');
    if (!overlay) { setupDOM(); overlay = document.getElementById('chatroom-overlay'); }
    if (!overlay) return;

    overlay.style.zIndex = '999999';
    overlay.classList.add('active');
    overlay.style.display = 'flex';
    overlay.style.opacity = '1';
    state.panelOpen = true;

    loadMessages();
    loadCloudHistory();
    renderMessages();
    updatePartnerStatus();

    setTimeout(function() {
      var input = document.getElementById('chatroom-input');
      if (input) input.focus();
    }, 300);
  };

  window.ChatRoom.close = function() {
    var overlay = document.getElementById('chatroom-overlay');
    if (overlay) {
      overlay.classList.remove('active');
      overlay.style.display = 'none';
      overlay.style.opacity = '0';
    }
    state.panelOpen = false;
  };

  // ========== 语音 (R2 纯净版，无 base64 降级) ==========

  var mediaRecorder = null;
  var audioChunks = [];
  var isRecording = false;
  var recordingTimer = null;
  var recordingDuration = 0;

  window.ChatRoom.startVoiceRecord = function() {
    if (isRecording) return;
    navigator.mediaDevices.getUserMedia({ audio: true })
      .then(function(stream) {
        mediaRecorder = new MediaRecorder(stream);
        audioChunks = [];

        mediaRecorder.ondataavailable = function(event) {
          if (event.data.size > 0) audioChunks.push(event.data);
        };

        mediaRecorder.onstop = async function() {
          var audioBlob = new Blob(audioChunks, { type: 'audio/webm' });
          stream.getTracks().forEach(function(track) { track.stop(); });

          // R2 上传 — 无降级
          var voiceId = null;
          try {
            var resp = await fetch('https://ws.shushu-bibi.cn/api/voice/upload', {
              method: 'POST',
              headers: { 'Content-Type': 'audio/webm' },
              body: audioBlob,
            });
            var data = await resp.json();
            if (data.success) {
              voiceId = data.voice_id;
              console.log('[R2] voice uploaded:', voiceId);
            } else {
              console.error('[R2] upload failed:', data.error);
              alert('\u8bed\u97f3\u4e0a\u4f20\u5931\u8d25\uff0c\u8bf7\u91cd\u8bd5');
              return;
            }
          } catch (e) {
            console.error('[R2] upload error:', e.message);
            alert('\u8bed\u97f3\u4e0a\u4f20\u5931\u8d25\uff0c\u8bf7\u91cd\u8bd5');
            return;
          }

          var msgObj = {
            id: Date.now().toString(36) + Math.random().toString(36).substr(2, 5),
            from: state.currentUser,
            text: '[\u8bed\u97f3\u6d88\u606f]',
            voiceData: voiceId,
            duration: recordingDuration,
            time: new Date().toISOString(),
            type: 'voice',
          };

          state.messages.push(msgObj);
          saveMessages();
          renderMessages();

          if (window.sendChatMessage) {
            window.sendChatMessage(msgObj);
          }
        };

        mediaRecorder.start();
        isRecording = true;
        recordingDuration = 0;

        var btn = document.getElementById('chatroom-voice-btn');
        if (btn) { btn.style.background = '#ef4444'; btn.style.color = 'white'; }

        recordingTimer = setInterval(function() {
          recordingDuration++;
          if (recordingDuration >= 60) window.ChatRoom.stopVoiceRecord();
        }, 1000);

        console.log('\ud83c\udfa4 \u5f55\u97f3\u4e2d...');
      })
      .catch(function(err) {
        console.error('\u65e0\u6cd5\u8bbf\u95ee\u9ea6\u514b\u98ce:', err);
        alert('\u65e0\u6cd5\u8bbf\u95ee\u9ea6\u514b\u98ce\uff0c\u8bf7\u68c0\u67e5\u6743\u9650\u8bbe\u7f6e');
      });
  };

  window.ChatRoom.stopVoiceRecord = function() {
    if (!isRecording || !mediaRecorder) return;
    mediaRecorder.stop();
    isRecording = false;

    if (recordingTimer) { clearInterval(recordingTimer); recordingTimer = null; }

    var btn = document.getElementById('chatroom-voice-btn');
    if (btn) { btn.style.background = ''; btn.style.color = ''; }

    console.log('\ud83c\udfa4 \u505c\u6b62\u5f55\u97f3\uff0c\u65f6\u957f:', recordingDuration, '\u79d2');
  };

  window.ChatRoom.playVoice = async function(msgId) {
    var msg = state.messages.find(function(m) { return m.id === msgId; });
    if (!msg) return;

    var audioUrl = msg.audio;
    if (!audioUrl && msg.voiceData) {
      try {
        var resp = await fetch('https://ws.shushu-bibi.cn/api/voice/signed/' + encodeURIComponent(msg.voiceData));
        var data = await resp.json();
        if (data.success && data.url) {
          audioUrl = data.url;
        } else {
          console.error('[R2] signed URL failed:', data.error);
          return;
        }
      } catch (e) {
        console.error('[R2] signed URL error:', e);
        return;
      }
    }

    if (!audioUrl) return;
    var audio = new Audio(audioUrl);
    audio.play().catch(function(err) { console.error('\u64ad\u653e\u5931\u8d25:', err); });
  };

  // ========== 启动 ==========

  try {
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', init);
    } else {
      init();
    }
  } catch(e) {
    console.error('[ChatRoom] init error:', e);
    try { setupDOM(); } catch(e2) {}
  }

})();
} catch(initErr) {
  console.error('[ChatRoom FATAL]', initErr.message);
}
