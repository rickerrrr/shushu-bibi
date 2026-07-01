<!-- 里程碑时间轴 v2.0 - 完整功能 -->
<script>
// 里程碑数据（从localStorage加载，无虚假数据）
var MILESTONES = [];

// 加载里程碑
function loadMilestones() {
  try {
    var saved = localStorage.getItem('love_milestones');
    if (saved) {
      MILESTONES = JSON.parse(saved);
    }
  } catch(e) {
    console.error('[Milestone] 加载失败:', e);
    MILESTONES = [];
  }
}

// 保存里程碑
function saveMilestones() {
  try {
    localStorage.setItem('love_milestones', JSON.stringify(MILESTONES));
  } catch(e) {
    console.error('[Milestone] 保存失败:', e);
  }
}

// 渲染里程碑时间轴
function renderMilestones() {
  loadMilestones();
  
  var timeline = document.getElementById('milestone-timeline');
  if (!timeline) return;
  
  if (MILESTONES.length === 0) {
    timeline.innerHTML = '<div style="text-align:center;padding:40px;color:var(--text-light);">' +
      '<div style="font-size:48px;margin-bottom:15px;">🏆</div>' +
      '<p>还没有里程碑，点击 + 按钮添加你们的第一个里程碑吧！</p>' +
      '</div>';
    return;
  }
  
  // 按日期排序（新的在前）
  MILESTONES.sort(function(a, b) {
    return new Date(b.date) - new Date(a.date);
  });
  
  var html = '';
  MILESTONES.forEach(function(m, index) {
    var isFuture = new Date(m.date) > new Date();
    html += '<div class="milestone-card" style="' +
      'background:var(--card-bg);' +
      'border-radius:16px;' +
      'padding:20px;' +
      'margin-bottom:20px;' +
      'box-shadow:var(--card-shadow);' +
      'border-left:4px solid ' + (isFuture ? '#f59e0b' : '#10b981') + ';' +
      'position:relative;' +
      'animation:fadeInUp 0.5s ease ' + (index * 0.1) + 's both;' +
      '">' +
      '<div class="milestone-header" style="display:flex;justify-content:space-between;align-items:center;margin-bottom:10px;">' +
      '<div class="milestone-icon" style="font-size:32px;">' + (m.icon || '🏆') + '</div>' +
      '<div class="milestone-actions" style="display:flex;gap:8px;">' +
      '<button onclick="editMilestone(' + index + ')" style="background:rgba(59,130,246,0.1);border:none;padding:6px 10px;border-radius:8px;cursor:pointer;font-size:14px;" title="编辑">✏️</button>' +
      '<button onclick="deleteMilestone(' + index + ')" style="background:rgba(239,68,68,0.1);border:none;padding:6px 10px;border-radius:8px;cursor:pointer;font-size:14px;" title="删除">🗑️</button>' +
      '</div>' +
      '</div>' +
      '<div class="milestone-title" style="font-size:18px;font-weight:bold;color:var(--text-color);margin-bottom:8px;">' + escapeHtml(m.title) + '</div>' +
      '<div class="milestone-date" style="font-size:13px;color:var(--text-light);margin-bottom:8px;">' + (isFuture ? '📅 预计: ' : '📅 ') + m.date + '</div>' +
      '<div class="milestone-desc" style="font-size:14px;color:var(--text-color);line-height:1.6;">' + escapeHtml(m.desc || '') + '</div>' +
      (isFuture ? '<div class="milestone-badge" style="position:absolute;top:10px;right:10px;background:#f59e0b;color:white;padding:4px 10px;border-radius:12px;font-size:11px;font-weight:600;">待达成</div>' : '') +
      '</div>';
  });
  
  timeline.innerHTML = html;
}

// 添加里程碑（+号按钮）
function addMilestone() {
  var icon = prompt('选择图标（输入emoji，如：🏆💑💍🎉）：', '🏆');
  if (!icon) return;
  
  var title = prompt('里程碑标题：', '');
  if (!title) return;
  
  var date = prompt('日期（YYYY-MM-DD）：', new Date().toISOString().slice(0, 10));
  if (!date) return;
  
  var desc = prompt('描述（可选）：', '');
  
  MILESTONES.push({
    icon: icon,
    title: title,
    date: date,
    desc: desc,
    createdAt: new Date().toISOString()
  });
  
  saveMilestones();
  renderMilestones();
  
  alert('✅ 里程碑已添加！');
}

// 编辑里程碑
function editMilestone(index) {
  var m = MILESTONES[index];
  if (!m) return;
  
  var icon = prompt('图标（emoji）：', m.icon || '🏆');
  var title = prompt('标题：', m.title);
  var date = prompt('日期（YYYY-MM-DD）：', m.date);
  var desc = prompt('描述：', m.desc || '');
  
  if (title && date) {
    MILESTONES[index] = {
      icon: icon,
      title: title,
      date: date,
      desc: desc,
      updatedAt: new Date().toISOString()
    };
    
    saveMilestones();
    renderMilestones();
    
    alert('✅ 里程碑已更新！');
  }
}

// 删除里程碑
function deleteMilestone(index) {
  if (!confirm('确定要删除这个里程碑吗？')) return;
  
  MILESTONES.splice(index, 1);
  saveMilestones();
  renderMilestones();
  
  alert('✅ 里程碑已删除！');
}

// HTML转义
function escapeHtml(text) {
  var div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

// 初始化
document.addEventListener('DOMContentLoaded', function() {
  loadMilestones();
  renderMilestones();
  
  // 添加+号按钮到section-header
  var header = document.querySelector('#milestone-section .section-header');
  if (header && !header.querySelector('.add-btn')) {
    var addBtn = document.createElement('button');
    addBtn.className = 'add-btn';
    addBtn.innerHTML = '+';
    addBtn.style.cssText = 'background:linear-gradient(135deg,#10b981,#059669);color:white;border:none;padding:8px 16px;border-radius:10px;font-size:18px;font-weight:bold;cursor:pointer;margin-left:10px;';
    addBtn.onclick = addMilestone;
    addBtn.title = '添加里程碑';
    header.appendChild(addBtn);
  }
});

console.log('[Milestone] ✅ 里程碑时间轴已加载（支持人工编辑）');
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

.milestone-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 8px 24px rgba(0,0,0,0.12);
  transition: all 0.3s ease;
}

.add-btn:hover {
  transform: scale(1.1);
  box-shadow: 0 4px 12px rgba(16, 185, 129, 0.4);
  transition: all 0.3s ease;
}
</style>
