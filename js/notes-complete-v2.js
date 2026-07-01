<!-- 小纸条/情书/时光胶囊 - 完整功能 v2.0 -->
<script>
// ============================================================
//  小纸条模块 - 完整功能
//  支持：发件箱/收件箱/编辑/删除/+号添加
// ============================================================

var NOTES_KEY = 'couple_notes';
var currentNotesTab = 'inbox';

// 获取所有纸条
function getNotes() {
  try {
    return JSON.parse(localStorage.getItem(NOTES_KEY) || '[]');
  } catch(e) {
    return [];
  }
}

// 保存纸条
function saveNotes(notes) {
  try {
    localStorage.setItem(NOTES_KEY, JSON.stringify(notes));
  } catch(e) {
    console.error('[Notes] 保存失败:', e);
  }
}

// 切换标签页
function switchNotesTab(tab) {
  currentNotesTab = tab;
  var inboxBtn = document.getElementById('notes-tab-inbox');
  var outboxBtn = document.getElementById('notes-tab-outbox');
  
  if (tab === 'inbox') {
    inboxBtn.style.background = 'linear-gradient(135deg,#3b82f6,#ef4444)';
    inboxBtn.style.color = 'white';
    outboxBtn.style.background = 'white';
    outboxBtn.style.color = '#3b82f6';
  } else {
    outboxBtn.style.background = 'linear-gradient(135deg,#3b82f6,#ef4444)';
    outboxBtn.style.color = 'white';
    inboxBtn.style.background = 'white';
    inboxBtn.style.color = '#3b82f6';
  }
  
  renderNotes();
}

// 显示添加纸条弹窗
function showAddNoteModal() {
  var emoji = prompt('选择表情（输入emoji）：', '💌');
  if (!emoji) return;
  
  var content = prompt('写下你的小纸条内容：', '');
  if (!content) return;
  
  var sender = prompt('发送者名称：', '我');
  if (!sender) return;
  
  var note = {
    id: Date.now(),
    emoji: emoji,
    content: content,
    sender: sender,
    receiver: '对方',
    createdAt: new Date().toISOString(),
    isRead: false
  };
  
  var notes = getNotes();
  notes.push(note);
  saveNotes(notes);
  
  alert('✅ 小纸条已发送！');
  renderNotes();
}

// 编辑纸条
function editNote(id) {
  var notes = getNotes();
  var note = notes.find(function(n) { return n.id === id; });
  if (!note) return;
  
  var content = prompt('编辑内容：', note.content);
  if (content === null) return;
  
  var emoji = prompt('编辑表情：', note.emoji);
  if (emoji === null) return;
  
  note.content = content;
  note.emoji = emoji;
  note.updatedAt = new Date().toISOString();
  
  saveNotes(notes);
  renderNotes();
  
  alert('✅ 小纸条已更新！');
}

// 删除纸条
function deleteNote(id) {
  if (!confirm('确定要删除这张小纸条吗？')) return;
  
  var notes = getNotes();
  notes = notes.filter(function(n) { return n.id !== id; });
  saveNotes(notes);
  
  renderNotes();
  
  alert('✅ 小纸条已删除！');
}

// 渲染纸条列表
function renderNotes() {
  var notes = getNotes();
  var content = document.getElementById('notes-content');
  if (!content) return;
  
  var filteredNotes;
  if (currentNotesTab === 'inbox') {
    filteredNotes = notes.filter(function(n) { return n.receiver === '我' || n.receiver === '对方'; });
  } else {
    filteredNotes = notes.filter(function(n) { return n.sender === '我'; });
  }
  
  if (filteredNotes.length === 0) {
    content.innerHTML = '<div style="text-align:center;padding:40px;color:#9ca3af;">' +
      '<div style="font-size:48px;margin-bottom:15px;">📝</div>' +
      '<p>' + (currentNotesTab === 'inbox' ? '收件箱为空' : '发件箱为空') + '</p>' +
      '</div>';
    return;
  }
  
  // 按时间倒序
  filteredNotes.sort(function(a, b) {
    return new Date(b.createdAt) - new Date(a.createdAt);
  });
  
  var html = '';
  filteredNotes.forEach(function(note) {
    var isUnread = !note.isRead && currentNotesTab === 'inbox';
    html += '<div class="note-card" style="' +
      'background:white;' +
      'border-radius:16px;' +
      'padding:20px;' +
      'margin-bottom:15px;' +
      'box-shadow:0 2px 8px rgba(0,0,0,0.1);' +
      'border-left:4px solid ' + (isUnread ? '#3b82f6' : '#e5e7eb') + ';' +
      'animation:fadeInUp 0.5s ease;' +
      '">' +
      '<div class="note-header" style="display:flex;justify-content:space-between;align-items:center;margin-bottom:10px;">' +
      '<div class="note-emoji" style="font-size:32px;">' + note.emoji + '</div>' +
      '<div class="note-actions" style="display:flex;gap:8px;">' +
      '<button onclick="editNote(' + note.id + ')" style="background:rgba(59,130,246,0.1);border:none;padding:6px 10px;border-radius:8px;cursor:pointer;font-size:14px;" title="编辑">✏️</button>' +
      '<button onclick="deleteNote(' + note.id + ')" style="background:rgba(239,68,68,0.1);border:none;padding:6px 10px;border-radius:8px;cursor:pointer;font-size:14px;" title="删除">🗑️</button>' +
      '</div>' +
      '</div>' +
      '<div class="note-content" style="font-size:15px;line-height:1.6;color:#1f2937;margin-bottom:10px;">' + escapeHtml(note.content) + '</div>' +
      '<div class="note-meta" style="display:flex;justify-content:space-between;align-items:center;font-size:12px;color:#9ca3af;">' +
      '<span class="note-sender">来自：' + escapeHtml(note.sender) + '</span>' +
      '<span class="note-time">' + new Date(note.createdAt).toLocaleString('zh-CN') + '</span>' +
      '</div>' +
      (isUnread ? '<div class="note-unread-badge" style="background:#3b82f6;color:white;padding:4px 10px;border-radius:12px;font-size:11px;font-weight:600;margin-top:10px;display:inline-block;">未读</div>' : '') +
      '</div>';
  });
  
  content.innerHTML = html;
  
  // 标记已读
  if (currentNotesTab === 'inbox') {
    notes.forEach(function(note) {
      if (!note.isRead) {
        note.isRead = true;
      }
    });
    saveNotes(notes);
  }
}

// HTML转义
function escapeHtml(text) {
  var div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

// 初始化
document.addEventListener('DOMContentLoaded', function() {
  renderNotes();
  
  // 添加+号按钮
  var header = document.querySelector('#notes-section .section-header');
  if (header && !header.querySelector('.add-btn')) {
    var addBtn = document.createElement('button');
    addBtn.className = 'add-btn';
    addBtn.innerHTML = '+';
    addBtn.style.cssText = 'background:linear-gradient(135deg,#3b82f6,#ef4444);color:white;border:none;padding:8px 16px;border-radius:10px;font-size:18px;font-weight:bold;cursor:pointer;margin-left:10px;';
    addBtn.onclick = showAddNoteModal;
    addBtn.title = '写小纸条';
    header.appendChild(addBtn);
  }
});

console.log('[Notes] ✅ 小纸条模块已加载（完整功能）');
</script>

<style>
@keyframes fadeInUp {
  from {
    opacity: 0;
    transform: translateY(20px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.note-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 8px 24px rgba(236, 72, 153, 0.15);
  transition: all 0.3s ease;
}
</style>
