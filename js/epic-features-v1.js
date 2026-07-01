/**
 * 史诗级王炸功能 v1.1 - 支持手动编辑+添加
 * 功能：典藏册、时间锚点、长线胶囊、人生画卷、契约、回声、年轮博物馆、快速互动
 * 更新：删除虚假时间线、支持手动编辑、添加+号按钮、统一白底蓝边框样式
 */

// 统一样式常量
var EPIC_STYLE = {
  card: 'background:rgba(255,255,255,0.95);border-radius:16px;padding:20px;box-shadow:0 4px 20px rgba(0,0,0,0.1);border:2px solid #bfdbfe;',
  cardSmall: 'background:rgba(255,255,255,0.95);border-radius:12px;padding:14px;margin-bottom:10px;box-shadow:0 2px 8px rgba(0,0,0,0.08);border:1px solid #bfdbfe;',
  btnPrimary: 'padding:10px 20px;background:linear-gradient(135deg,#3b82f6,#1d4ed8);color:white;border:none;border-radius:10px;font-size:14px;font-weight:600;cursor:pointer;box-shadow:0 4px 12px rgba(59,130,246,0.3);',
  btnSuccess: 'padding:10px 20px;background:linear-gradient(135deg,#10b981,#059669);color:white;border:none;border-radius:10px;font-size:14px;font-weight:600;cursor:pointer;box-shadow:0 4px 12px rgba(16,185,129,0.3);',
  btnDanger: 'padding:8px 14px;background:linear-gradient(135deg,#ef4444,#dc2626);color:white;border:none;border-radius:8px;font-size:13px;cursor:pointer;',
  input: 'width:100%;padding:10px 14px;border:2px solid #93c5fd;border-radius:10px;background:rgba(255,255,255,0.95);color:#1a1a1a;font-size:14px;box-sizing:border-box;',
  textarea: 'width:100%;padding:10px 14px;border:2px solid #93c5fd;border-radius:10px;background:rgba(255,255,255,0.95);color:#1a1a1a;font-size:14px;box-sizing:border-box;resize:vertical;',
  select: 'width:100%;padding:10px 14px;border:2px solid #93c5fd;border-radius:10px;background:rgba(255,255,255,0.95);color:#1a1a1a;font-size:14px;',
  label: 'display:block;font-size:13px;font-weight:600;margin-bottom:6px;color:#1e40af;',
  title: 'color:#1d4ed8;margin-bottom:16px;font-size:20px;font-weight:bold;',
  subtext: 'color:#94a3b8;font-size:13px;',
};

// ============================================================
//  王炸1：爱情永久实体化数字典藏册
// ============================================================
var LoveArchive = {
  init: function() {
    console.log('[LoveArchive] 初始化永久数字典藏册系统');
    this.loadArchives();
  },

  loadArchives: function() {
    return JSON.parse(localStorage.getItem('love_archives') || '[]');
  },

  saveArchives: function(archives) {
    localStorage.setItem('love_archives', JSON.stringify(archives));
    window.setData && window.setData('love_archives', archives);
  },

  showArchiveModal: function() {
    var archives = this.loadArchives();
    var html = '<div style="padding:24px;max-width:650px;">' +
      '<h3 style="' + EPIC_STYLE.title + '">📕 爱情永久典藏册</h3>' +
      '<button onclick="LoveArchive.showCreateForm()" style="' + EPIC_STYLE.btnPrimary + 'margin-bottom:16px;width:100%;">+ 创建新典藏册</button>' +
      '<div id="archive-list">';

    if (archives.length === 0) {
      html += '<p style="text-align:center;color:#94a3b8;padding:30px;">还没有典藏册，点击上方按钮创建吧～</p>';
    } else {
      archives.forEach(function(a, idx) {
        html += '<div style="' + EPIC_STYLE.cardSmall + '">' +
          '<div style="display:flex;justify-content:space-between;align-items:center;">' +
          '<div>' +
          '<p style="color:#1e40af;font-weight:bold;font-size:15px;">📕 ' + a.version + '</p>' +
          '<p style="' + EPIC_STYLE.subtext + 'margin-top:4px;">生成于 ' + new Date(a.generatedAt).toLocaleString() + '</p>' +
          '</div>' +
          '<div style="display:flex;gap:8px;">' +
          (a.isLocked ? '<span style="background:#fef3c7;color:#92400e;padding:4px 10px;border-radius:6px;font-size:12px;">🔒 已锁定</span>' : '') +
          '<button onclick="LoveArchive.editArchive(' + idx + ')" style="padding:6px 12px;background:#3b82f6;color:white;border:none;border-radius:6px;font-size:12px;cursor:pointer;">编辑</button>' +
          '<button onclick="LoveArchive.deleteArchive(' + idx + ')" style="' + EPIC_STYLE.btnDanger + 'font-size:12px;padding:6px 12px;">删除</button>' +
          '</div></div></div>';
      });
    }

    html += '</div></div>';
    if (typeof showGlobalModal === 'function') showGlobalModal(html);
  },

  showCreateForm: function() {
    var html = '<div style="padding:24px;max-width:550px;">' +
      '<h3 style="' + EPIC_STYLE.title + '">创建典藏册</h3>' +
      '<div style="margin-bottom:14px;">' +
      '  <label style="' + EPIC_STYLE.label + '">典藏册名称</label>' +
      '  <input type="text" id="archive-version" placeholder="如：v1.0 初版纪念册" style="' + EPIC_STYLE.input + '">' +
      '</div>' +
      '<div style="margin-bottom:14px;">' +
      '  <label style="' + EPIC_STYLE.label + '">描述</label>' +
      '  <textarea id="archive-desc" placeholder="这本典藏册记录什么..." style="' + EPIC_STYLE.textarea + 'height:80px;"></textarea>' +
      '</div>' +
      '<div style="display:flex;gap:10px;">' +
      '  <button onclick="LoveArchive.doCreate()" style="' + EPIC_STYLE.btnPrimary + 'flex:1;">✅ 创建</button>' +
      '  <button onclick="LoveArchive.showArchiveModal()" style="padding:10px 20px;background:#e5e7eb;color:#374151;border:none;border-radius:10px;font-size:14px;cursor:pointer;">取消</button>' +
      '</div></div>';

    if (typeof showGlobalModal === 'function') showGlobalModal(html);
  },

  doCreate: function() {
    var version = document.getElementById('archive-version').value;
    if (!version) { alert('请填写典藏册名称！'); return; }

    var archives = this.loadArchives();
    archives.push({
      version: version,
      desc: document.getElementById('archive-desc').value,
      generatedAt: new Date().toISOString(),
      isLocked: false,
      id: 'archive_' + Date.now(),
      entries: []
    });
    this.saveArchives(archives);
    alert('📕 典藏册已创建！');
    this.showArchiveModal();
  },

  editArchive: function(idx) {
    var archives = this.loadArchives();
    var a = archives[idx];
    if (a.isLocked) { alert('此典藏册已锁定，不可修改！'); return; }

    var entriesHtml = '';
    (a.entries || []).forEach(function(e, eidx) {
      entriesHtml += '<div style="' + EPIC_STYLE.cardSmall + '">' +
        '<p style="color:#1e40af;font-weight:600;font-size:14px;">' + (e.title || '无标题') + '</p>' +
        '<p style="' + EPIC_STYLE.subtext + 'margin-top:4px;">' + (e.content || '') + '</p>' +
        '<button onclick="LoveArchive.deleteEntry(' + idx + ',' + eidx + ')" style="' + EPIC_STYLE.btnDanger + 'margin-top:8px;font-size:12px;">删除条目</button>' +
        '</div>';
    });

    var html = '<div style="padding:24px;max-width:600px;">' +
      '<h3 style="' + EPIC_STYLE.title + '">编辑典藏册：' + a.version + '</h3>' +
      '<button onclick="LoveArchive.showAddEntryForm(' + idx + ')" style="' + EPIC_STYLE.btnSuccess + 'margin-bottom:16px;width:100%;">+ 添加条目</button>' +
      '<div id="archive-entries">' + (entriesHtml || '<p style="text-align:center;color:#94a3b8;padding:20px;">还没有条目</p>') + '</div>' +
      '<div style="display:flex;gap:10px;margin-top:16px;">' +
      '  <button onclick="LoveArchive.lockArchive(' + idx + ')" style="' + EPIC_STYLE.btnPrimary + 'flex:1;">🔒 锁定典藏册（不可修改）</button>' +
      '  <button onclick="LoveArchive.showArchiveModal()" style="padding:10px 20px;background:#e5e7eb;color:#374151;border:none;border-radius:10px;font-size:14px;cursor:pointer;">返回</button>' +
      '</div></div>';

    if (typeof showGlobalModal === 'function') showGlobalModal(html);
  },

  showAddEntryForm: function(archiveIdx) {
    var html = '<div style="padding:24px;max-width:500px;">' +
      '<h3 style="' + EPIC_STYLE.title + '">添加典藏条目</h3>' +
      '<div style="margin-bottom:14px;">' +
      '  <label style="' + EPIC_STYLE.label + '">标题</label>' +
      '  <input type="text" id="entry-title" placeholder="条目标题" style="' + EPIC_STYLE.input + '">' +
      '</div>' +
      '<div style="margin-bottom:14px;">' +
      '  <label style="' + EPIC_STYLE.label + '">内容</label>' +
      '  <textarea id="entry-content" placeholder="记录这一刻..." style="' + EPIC_STYLE.textarea + 'height:100px;"></textarea>' +
      '</div>' +
      '<div style="margin-bottom:14px;">' +
      '  <label style="' + EPIC_STYLE.label + '">日期</label>' +
      '  <input type="date" id="entry-date" value="' + new Date().toISOString().split('T')[0] + '" style="' + EPIC_STYLE.input + '">' +
      '</div>' +
      '<div style="display:flex;gap:10px;">' +
      '  <button onclick="LoveArchive.doAddEntry(' + archiveIdx + ')" style="' + EPIC_STYLE.btnPrimary + 'flex:1;">✅ 添加</button>' +
      '  <button onclick="LoveArchive.editArchive(' + archiveIdx + ')" style="padding:10px 20px;background:#e5e7eb;color:#374151;border:none;border-radius:10px;font-size:14px;cursor:pointer;">取消</button>' +
      '</div></div>';

    if (typeof showGlobalModal === 'function') showGlobalModal(html);
  },

  doAddEntry: function(archiveIdx) {
    var title = document.getElementById('entry-title').value;
    if (!title) { alert('请填写标题！'); return; }

    var archives = this.loadArchives();
    if (!archives[archiveIdx].entries) archives[archiveIdx].entries = [];
    archives[archiveIdx].entries.push({
      title: title,
      content: document.getElementById('entry-content').value,
      date: document.getElementById('entry-date').value,
      addedAt: new Date().toISOString()
    });
    this.saveArchives(archives);
    alert('✅ 条目已添加！');
    this.editArchive(archiveIdx);
  },

  deleteEntry: function(archiveIdx, entryIdx) {
    if (!confirm('确定删除此条目？')) return;
    var archives = this.loadArchives();
    archives[archiveIdx].entries.splice(entryIdx, 1);
    this.saveArchives(archives);
    this.editArchive(archiveIdx);
  },

  lockArchive: function(idx) {
    if (!confirm('锁定后不可修改或删除，确定锁定？')) return;
    var archives = this.loadArchives();
    archives[idx].isLocked = true;
    this.saveArchives(archives);
    alert('🔒 典藏册已锁定！');
    this.showArchiveModal();
  },

  deleteArchive: function(idx) {
    var archives = this.loadArchives();
    if (archives[idx].isLocked) { alert('已锁定的典藏册不可删除！'); return; }
    if (!confirm('确定删除此典藏册？')) return;
    archives.splice(idx, 1);
    this.saveArchives(archives);
    this.showArchiveModal();
  }
};

// ============================================================
//  王炸2：爱情时间锚点
// ============================================================
var TimeAnchor = {
  ANCHOR_DATE: '2026-06-28',

  init: function() {
    console.log('[TimeAnchor] 初始化时间锚点系统');
    this.loadBadges();
  },

  loadBadges: function() {
    return JSON.parse(localStorage.getItem('couple_badges') || '[]');
  },

  saveBadges: function(badges) {
    localStorage.setItem('couple_badges', JSON.stringify(badges));
    window.setData && window.setData('couple_badges', badges);
  },

  showAnchorModal: function() {
    var badges = this.loadBadges();
    var anchorBadge = badges.find(function(b) { return b.id === 'epoch_anchor'; });

    var html = '<div style="padding:24px;max-width:550px;">' +
      '<h3 style="' + EPIC_STYLE.title + '">⚓ 爱情时间锚点</h3>' +
      '<div style="' + EPIC_STYLE.card + 'text-align:center;">' +
      '  <p style="font-size:64px;margin-bottom:12px;">⚓</p>' +
      '  <p style="color:#1d4ed8;font-size:24px;font-weight:bold;margin-bottom:8px;">2.0纪元</p>' +
      '  <p style="color:#374151;margin-bottom:4px;">锚点日期：<strong>' + this.ANCHOR_DATE + '</strong></p>' +
      '  <p style="' + EPIC_STYLE.subtext + 'margin-bottom:16px;">从此日期起，所有内容自动标记"2.0纪元后"</p>' +
      '  <div style="background:linear-gradient(135deg,#3b82f6,#1d4ed8);color:white;padding:12px;border-radius:10px;font-size:14px;">' +
      '    📌 你们的爱情从此分为两个纪元：<br>1.0纪元（初见→成长）→ 2.0纪元（新纪元→余生）</div>' +
      '</div>' +
      '<hr style="margin:20px 0;border:none;border-top:1px solid #e5e7eb;">' +
      '<h4 style="color:#1d4ed8;margin-bottom:12px;font-size:15px;">限定徽章</h4>';

    if (anchorBadge) {
      html += '<div style="' + EPIC_STYLE.cardSmall + '">' +
        '<p style="font-size:32px;">' + anchorBadge.icon + '</p>' +
        '<p style="color:#1e40af;font-weight:bold;">' + anchorBadge.name + '</p>' +
        '<p style="' + EPIC_STYLE.subtext + 'margin-top:4px;">' + anchorBadge.description + '</p>' +
        '<p style="' + EPIC_STYLE.subtext + 'margin-top:4px;">解锁于 ' + new Date(anchorBadge.unlockedAt).toLocaleString() + '</p>' +
        '</div>';
    } else {
      html += '<button onclick="TimeAnchor.unlockAnchorBadge()" style="' + EPIC_STYLE.btnPrimary + 'width:100%;">⚓ 解锁纪元锚定者徽章</button>';
    }

    html += '<div style="margin-top:16px;">' +
      '<h4 style="color:#1d4ed8;margin-bottom:12px;font-size:15px;">自定义锚点</h4>' +
      '<div style="display:flex;gap:10px;align-items:center;">' +
      '  <input type="date" id="custom-anchor-date" value="' + this.ANCHOR_DATE + '" style="' + EPIC_STYLE.input + 'flex:1;">' +
      '  <button onclick="TimeAnchor.setCustomAnchor()" style="' + EPIC_STYLE.btnPrimary + '">设置</button>' +
      '</div></div></div>';

    if (typeof showGlobalModal === 'function') showGlobalModal(html);
  },

  unlockAnchorBadge: function() {
    var badges = this.loadBadges();
    badges.push({
      id: 'epoch_anchor',
      name: '纪元锚定者',
      description: '2.0纪元上线日登录，永久标记爱情锚点',
      icon: '⚓',
      unlockedAt: new Date().toISOString(),
      isLimited: true
    });
    this.saveBadges(badges);
    alert('🏅 徽章已解锁：纪元锚定者');
    this.showAnchorModal();
  },

  setCustomAnchor: function() {
    var date = document.getElementById('custom-anchor-date').value;
    if (!date) { alert('请选择日期！'); return; }
    this.ANCHOR_DATE = date;
    localStorage.setItem('time_anchor_date', date);
    window.setData && window.setData('time_anchor_date', date);
    alert('⚓ 锚点日期已更新为：' + date);
    this.showAnchorModal();
  }
};

// ============================================================
//  王炸3：长线时光胶囊馆
// ============================================================
var LongTermCapsule = {
  init: function() {
    console.log('[LongTermCapsule] 初始化长线时光胶囊馆');
    this.checkAndNotify();
  },

  checkAndNotify: function() {
    var capsules = this.loadCapsules();
    var now = new Date();
    capsules.forEach(function(c) {
      if (c.unlockDate && new Date(c.unlockDate) <= now && !c.notified) {
        alert('💊 时光胶囊已解锁：' + c.title);
        c.notified = true;
      }
    });
    this.saveCapsules(capsules);
  },

  loadCapsules: function() {
    return JSON.parse(localStorage.getItem('long_term_capsules') || '[]');
  },

  saveCapsules: function(capsules) {
    localStorage.setItem('long_term_capsules', JSON.stringify(capsules));
    window.setData && window.setData('long_term_capsules', capsules);
  },

  showCapsuleModal: function() {
    var capsules = this.loadCapsules();
    var html = '<div style="padding:24px;max-width:600px;">' +
      '<h3 style="' + EPIC_STYLE.title + '">⏰ 长线时光胶囊馆</h3>' +
      '<button onclick="LongTermCapsule.showCreateForm()" style="' + EPIC_STYLE.btnPrimary + 'margin-bottom:16px;width:100%;">+ 创建新胶囊</button>' +
      '<div id="capsule-list">';

    if (capsules.length === 0) {
      html += '<p style="text-align:center;color:#94a3b8;padding:30px;">还没有胶囊，点击上方按钮创建吧～</p>';
    } else {
      capsules.forEach(function(c, idx) {
        var unlocked = new Date(c.unlockDate) <= new Date();
        html += '<div style="' + EPIC_STYLE.cardSmall + '">' +
          '<div style="display:flex;justify-content:space-between;align-items:flex-start;">' +
          '<div style="flex:1;">' +
          '<p style="color:#1e40af;font-weight:bold;font-size:15px;">' + c.title + '</p>' +
          '<p style="' + EPIC_STYLE.subtext + 'margin-top:4px;">解锁日期：' + c.unlockDate + '</p>' +
          '<p style="color:#374151;font-size:13px;margin-top:8px;white-space:pre-wrap;">' + (c.content || '（无内容）') + '</p>' +
          (unlocked ? '<p style="color:#10b981;font-size:13px;margin-top:8px;">✅ 已解锁</p>' : '<p style="color:#3b82f6;font-size:13px;margin-top:8px;">🔒 未解锁（创建后不可修改）</p>') +
          '</div>' +
          '<div style="display:flex;flex-direction:column;gap:6px;margin-left:10px;">' +
          (unlocked ? '<button onclick="LongTermCapsule.editCapsule(' + idx + ')" style="padding:6px 12px;background:#3b82f6;color:white;border:none;border-radius:6px;font-size:12px;cursor:pointer;">查看</button>' : '') +
          (c.isLocked ? '' : '<button onclick="LongTermCapsule.deleteCapsule(' + idx + ')" style="' + EPIC_STYLE.btnDanger + 'font-size:12px;padding:6px 12px;">删除</button>') +
          '</div></div></div>';
      });
    }

    html += '</div></div>';
    if (typeof showGlobalModal === 'function') showGlobalModal(html);
  },

  showCreateForm: function() {
    var html = '<div style="padding:24px;max-width:550px;">' +
      '<h3 style="' + EPIC_STYLE.title + '">创建时光胶囊</h3>' +
      '<div style="margin-bottom:14px;">' +
      '  <label style="' + EPIC_STYLE.label + '">胶囊标题</label>' +
      '  <input type="text" id="capsule-title" placeholder="如：给5年后的我们" style="' + EPIC_STYLE.input + '">' +
      '</div>' +
      '<div style="margin-bottom:14px;">' +
      '  <label style="' + EPIC_STYLE.label + '">写给未来的信</label>' +
      '  <textarea id="capsule-content" placeholder="写下你想对未来的TA说的话..." style="' + EPIC_STYLE.textarea + 'height:120px;"></textarea>' +
      '</div>' +
      '<div style="margin-bottom:16px;">' +
      '  <label style="' + EPIC_STYLE.label + '">解锁日期</label>' +
      '  <select id="capsule-unlock" style="' + EPIC_STYLE.select + '">' +
      '    <option value="' + new Date(new Date().setFullYear(new Date().getFullYear() + 1)).toISOString().split('T')[0] + '">1年后</option>' +
      '    <option value="' + new Date(new Date().setFullYear(new Date().getFullYear() + 3)).toISOString().split('T')[0] + '">3年后</option>' +
      '    <option value="' + new Date(new Date().setFullYear(new Date().getFullYear() + 5)).toISOString().split('T')[0] + '">5年后</option>' +
      '    <option value="' + new Date(new Date().setFullYear(new Date().getFullYear() + 10)).toISOString().split('T')[0] + '">10年后</option>' +
      '    <option value="custom">自定义日期...</option>' +
      '  </select>' +
      '</div>' +
      '<div id="custom-date-container" style="display:none;margin-bottom:16px;">' +
      '  <input type="date" id="capsule-custom-date" style="' + EPIC_STYLE.input + '">' +
      '</div>' +
      '<div style="display:flex;gap:10px;">' +
      '  <button onclick="LongTermCapsule.doCreate()" style="' + EPIC_STYLE.btnPrimary + 'flex:1;">✅ 创建胶囊（不可修改）</button>' +
      '  <button onclick="LongTermCapsule.showCapsuleModal()" style="padding:10px 20px;background:#e5e7eb;color:#374151;border:none;border-radius:10px;font-size:14px;cursor:pointer;">取消</button>' +
      '</div></div>';

    if (typeof showGlobalModal === 'function') {
      showGlobalModal(html);
      setTimeout(function() {
        var sel = document.getElementById('capsule-unlock');
        if (sel) {
          sel.addEventListener('change', function() {
            var container = document.getElementById('custom-date-container');
            if (container) container.style.display = this.value === 'custom' ? 'block' : 'none';
          });
        }
      }, 100);
    }
  },

  doCreate: function() {
    var title = document.getElementById('capsule-title').value;
    var content = document.getElementById('capsule-content').value;
    var unlockSel = document.getElementById('capsule-unlock').value;
    var unlockDate = unlockSel === 'custom' ? document.getElementById('capsule-custom-date').value : unlockSel;

    if (!title || !content) { alert('请填写标题和内容！'); return; }
    if (!unlockDate) { alert('请选择解锁日期！'); return; }

    var capsules = this.loadCapsules();
    capsules.push({
      id: 'capsule_' + Date.now(),
      title: title,
      content: content,
      createdAt: new Date().toISOString(),
      unlockDate: unlockDate,
      isLocked: true,
      notified: false
    });
    this.saveCapsules(capsules);
    alert('💊 时光胶囊已创建！将在 ' + unlockDate + ' 解锁');
    this.showCapsuleModal();
  },

  editCapsule: function(idx) {
    var capsules = this.loadCapsules();
    var c = capsules[idx];
    alert('💊 ' + c.title + '\n\n' + c.content + '\n\n创建于：' + new Date(c.createdAt).toLocaleString());
  },

  deleteCapsule: function(idx) {
    if (!confirm('确定删除此胶囊？')) return;
    var capsules = this.loadCapsules();
    capsules.splice(idx, 1);
    this.saveCapsules(capsules);
    this.showCapsuleModal();
  }
};

// ============================================================
//  王炸4：爱情人生画卷（删除虚假时间线，支持手动添加）
// ============================================================
var LoveCanvas = {
  init: function() {
    console.log('[LoveCanvas] 初始化爱情人生画卷');
  },

  loadEvents: function() {
    return JSON.parse(localStorage.getItem('love_canvas_events') || '[]');
  },

  saveEvents: function(events) {
    localStorage.setItem('love_canvas_events', JSON.stringify(events));
    window.setData && window.setData('love_canvas_events', events);
  },

  open: function() {
    this.render();
  },

  render: function() {
    var container = document.getElementById('love-canvas-container');
    if (!container) {
      container = document.createElement('div');
      container.id = 'love-canvas-container';
      container.style.cssText = 'position:fixed;top:0;left:0;width:100%;height:100%;background:rgba(0,0,0,0.85);z-index:99999;overflow:auto;display:none;';
      document.body.appendChild(container);
    }

    var events = this.loadEvents();
    var html = '<div style="padding:40px;max-width:800px;margin:0 auto;min-height:100vh;">' +
      '<div style="text-align:center;margin-bottom:40px;">' +
      '  <h2 style="color:#ffd700;font-size:36px;">🎨 爱情人生画卷</h2>' +
      '  <p style="color:#93c5fd;font-size:16px;">从初见到余生，每一步都值得铭记</p>' +
      '  <button onclick="LoveCanvas.showAddEventForm()" style="' + EPIC_STYLE.btnSuccess + 'margin-top:16px;">+ 添加时间线事件</button>' +
      '</div>';

    if (events.length === 0) {
      // 没有事件时显示提示，不显示虚假数据
      html += '<div style="background:rgba(255,255,255,0.95);border-radius:20px;padding:40px;text-align:center;box-shadow:0 4px 20px rgba(0,0,0,0.1);">' +
        '<p style="font-size:64px;margin-bottom:16px;">🎨</p>' +
        '<p style="color:#374151;font-size:18px;margin-bottom:8px;">画卷还是空白的</p>' +
        '<p style="' + EPIC_STYLE.subtext + 'margin-bottom:20px;">点击上方"+ 添加时间线事件"按钮，开始记录你们的爱情编年史</p>' +
        '</div>';
    } else {
      // 按日期排序显示
      events.sort(function(a, b) { return new Date(a.date) - new Date(b.date); });
      events.forEach(function(ev, idx) {
        var isEpoch = ev.date === '2026-06-28';
        html += '<div style="' + (isEpoch ? 'background:linear-gradient(135deg,rgba(255,215,0,0.15),rgba(59,130,246,0.15));border-radius:20px;padding:30px;margin-bottom:30px;box-shadow:0 4px 30px rgba(255,215,0,0.2);border:3px solid #ffd700;position:relative;' : EPIC_STYLE.card + 'border-left:6px solid ' + (ev.color || '#3b82f6') + ';') + '">' +
          (isEpoch ? '<div style="position:absolute;top:-18px;left:50%;transform:translateX(-50%);background:#ffd700;color:#000;padding:8px 24px;border-radius:20px;font-weight:bold;font-size:14px;">⭐ 2.0 新纪元 ⭐</div>' : '') +
          '<div style="display:flex;justify-content:space-between;align-items:flex-start;">' +
          '<div style="flex:1;">' +
          '<h3 style="color:#1d4ed8;font-size:' + (isEpoch ? '28px' : '20px') + ';margin-bottom:8px;">' + (ev.icon || '📌') + ' ' + ev.title + '</h3>' +
          '<p style="color:#94a3b8;font-size:13px;margin-bottom:8px;">📅 ' + ev.date + '</p>' +
          '<p style="color:#374151;line-height:1.8;">' + ev.description + '</p>' +
          '</div>' +
          '<div style="display:flex;gap:6px;margin-left:10px;">' +
          '  <button onclick="LoveCanvas.editEvent(' + idx + ')" style="padding:6px 12px;background:#3b82f6;color:white;border:none;border-radius:6px;font-size:12px;cursor:pointer;">编辑</button>' +
          '  <button onclick="LoveCanvas.deleteEvent(' + idx + ')" style="' + EPIC_STYLE.btnDanger + 'font-size:12px;padding:6px 12px;">删除</button>' +
          '</div></div></div>';
      });
    }

    html += '<div style="text-align:center;margin-top:40px;padding-bottom:40px;">' +
      '<button onclick="LoveCanvas.close()" style="' + EPIC_STYLE.btnPrimary + '">关闭画卷</button>' +
      '</div></div>';

    container.innerHTML = html;
    container.style.display = 'block';
  },

  showAddEventForm: function() {
    var html = '<div style="padding:24px;max-width:550px;">' +
      '<h3 style="' + EPIC_STYLE.title + '">添加时间线事件</h3>' +
      '<div style="margin-bottom:14px;">' +
      '  <label style="' + EPIC_STYLE.label + '">事件标题</label>' +
      '  <input type="text" id="event-title" placeholder="如：第一次约会" style="' + EPIC_STYLE.input + '">' +
      '</div>' +
      '<div style="margin-bottom:14px;">' +
      '  <label style="' + EPIC_STYLE.label + '">日期</label>' +
      '  <input type="date" id="event-date" value="' + new Date().toISOString().split('T')[0] + '" style="' + EPIC_STYLE.input + '">' +
      '</div>' +
      '<div style="margin-bottom:14px;">' +
      '  <label style="' + EPIC_STYLE.label + '">描述</label>' +
      '  <textarea id="event-desc" placeholder="记录这一刻..." style="' + EPIC_STYLE.textarea + 'height:100px;"></textarea>' +
      '</div>' +
      '<div style="margin-bottom:14px;">' +
      '  <label style="' + EPIC_STYLE.label + '">图标</label>' +
      '  <input type="text" id="event-icon" placeholder="📌（输入emoji）" style="' + EPIC_STYLE.input + '">' +
      '</div>' +
      '<div style="margin-bottom:16px;">' +
      '  <label style="' + EPIC_STYLE.label + '">标记颜色</label>' +
      '  <input type="color" id="event-color" value="#3b82f6" style="width:100%;height:40px;border:2px solid #93c5fd;border-radius:10px;cursor:pointer;">' +
      '</div>' +
      '<div style="display:flex;gap:10px;">' +
      '  <button onclick="LoveCanvas.doAddEvent()" style="' + EPIC_STYLE.btnPrimary + 'flex:1;">✅ 添加</button>' +
      '  <button onclick="LoveCanvas.render();if(typeof showGlobalModal===\'function\'){LoveCanvas.close();setTimeout(function(){LoveCanvas.open();},100);}" style="padding:10px 20px;background:#e5e7eb;color:#374151;border:none;border-radius:10px;font-size:14px;cursor:pointer;">取消</button>' +
      '</div></div>';

    if (typeof showGlobalModal === 'function') showGlobalModal(html);
  },

  doAddEvent: function() {
    var title = document.getElementById('event-title').value;
    if (!title) { alert('请填写事件标题！'); return; }

    var events = this.loadEvents();
    events.push({
      title: title,
      date: document.getElementById('event-date').value,
      description: document.getElementById('event-desc').value,
      icon: document.getElementById('event-icon').value || '📌',
      color: document.getElementById('event-color').value,
      addedAt: new Date().toISOString()
    });
    this.saveEvents(events);
    alert('🎨 事件已添加到画卷！');
    this.close();
    setTimeout(function() { LoveCanvas.open(); }, 100);
  },

  editEvent: function(idx) {
    var events = this.loadEvents();
    var ev = events[idx];

    var html = '<div style="padding:24px;max-width:550px;">' +
      '<h3 style="' + EPIC_STYLE.title + '">编辑时间线事件</h3>' +
      '<div style="margin-bottom:14px;">' +
      '  <label style="' + EPIC_STYLE.label + '">事件标题</label>' +
      '  <input type="text" id="event-title-edit" value="' + (ev.title || '') + '" style="' + EPIC_STYLE.input + '">' +
      '</div>' +
      '<div style="margin-bottom:14px;">' +
      '  <label style="' + EPIC_STYLE.label + '">日期</label>' +
      '  <input type="date" id="event-date-edit" value="' + (ev.date || '') + '" style="' + EPIC_STYLE.input + '">' +
      '</div>' +
      '<div style="margin-bottom:14px;">' +
      '  <label style="' + EPIC_STYLE.label + '">描述</label>' +
      '  <textarea id="event-desc-edit" style="' + EPIC_STYLE.textarea + 'height:100px;">' + (ev.description || '') + '</textarea>' +
      '</div>' +
      '<div style="display:flex;gap:10px;">' +
      '  <button onclick="LoveCanvas.doEditEvent(' + idx + ')" style="' + EPIC_STYLE.btnPrimary + 'flex:1;">✅ 保存</button>' +
      '  <button onclick="LoveCanvas.render();setTimeout(function(){LoveCanvas.open();},100);" style="padding:10px 20px;background:#e5e7eb;color:#374151;border:none;border-radius:10px;font-size:14px;cursor:pointer;">取消</button>' +
      '</div></div>';

    if (typeof showGlobalModal === 'function') showGlobalModal(html);
  },

  doEditEvent: function(idx) {
    var events = this.loadEvents();
    events[idx].title = document.getElementById('event-title-edit').value;
    events[idx].date = document.getElementById('event-date-edit').value;
    events[idx].description = document.getElementById('event-desc-edit').value;
    this.saveEvents(events);
    alert('✅ 事件已更新！');
    this.close();
    setTimeout(function() { LoveCanvas.open(); }, 100);
  },

  deleteEvent: function(idx) {
    if (!confirm('确定删除此事件？')) return;
    var events = this.loadEvents();
    events.splice(idx, 1);
    this.saveEvents(events);
    this.close();
    setTimeout(function() { LoveCanvas.open(); }, 100);
  },

  close: function() {
    var container = document.getElementById('love-canvas-container');
    if (container) container.style.display = 'none';
  }
};

// ============================================================
//  完善功能1：爱情指纹电子契约
// ============================================================
var LoveContract = {
  init: function() {
    console.log('[LoveContract] 初始化爱情指纹契约系统');
  },

  showContractModal: function() {
    var existing = localStorage.getItem('love_contract_signed');
    if (existing) {
      var contract = JSON.parse(existing);
      var html = '<div style="padding:24px;max-width:550px;text-align:center;">' +
        '<h3 style="' + EPIC_STYLE.title + '">💍 爱情指纹契约</h3>' +
        '<div style="' + EPIC_STYLE.card + '">' +
        '  <p style="font-size:48px;margin-bottom:12px;">🔒</p>' +
        '  <p style="color:#374151;margin-bottom:8px;text-align:left;"><strong>誓言：</strong></p>' +
        '  <p style="color:#374151;text-align:left;background:#f8fafc;padding:12px;border-radius:8px;margin-bottom:12px;">' + contract.vow + '</p>' +
        '  <p style="color:#374151;margin-bottom:8px;text-align:left;"><strong>目标：</strong>' + contract.goal + '</p>' +
        '  <p style="' + EPIC_STYLE.subtext + 'margin-top:12px;text-align:left;">签署于 ' + new Date(contract.signedAt).toLocaleString() + '</p>' +
        '  <p style="color:#6b7280;font-size:13px;margin-top:6px;text-align:left;">签署人：' + contract.signatures.join(' & ') + '</p>' +
        '  <div style="background:#fef3c7;padding:10px;border-radius:8px;color:#92400e;font-size:13px;margin-top:12px;">🔒 契约已锁定，不可修改或删除</div>' +
        '</div></div>';
      if (typeof showGlobalModal === 'function') showGlobalModal(html);
      return;
    }

    // 未签署，显示签署表单
    var html = '<div style="padding:24px;max-width:550px;">' +
      '<h3 style="' + EPIC_STYLE.title + '">💍 签署爱情指纹契约</h3>' +
      '<p style="' + EPIC_STYLE.subtext + 'margin-bottom:16px;">契约签署后将永久锁定，请慎重填写</p>' +
      '<div style="margin-bottom:14px;">' +
      '  <label style="' + EPIC_STYLE.label + '">爱情誓言</label>' +
      '  <textarea id="contract-vow" placeholder="写下你们的爱情誓言..." style="' + EPIC_STYLE.textarea + 'height:100px;"></textarea>' +
      '</div>' +
      '<div style="margin-bottom:14px;">' +
      '  <label style="' + EPIC_STYLE.label + '">共同目标</label>' +
      '  <input type="text" id="contract-goal" placeholder="如：一起去看极光" style="' + EPIC_STYLE.input + '">' +
      '</div>' +
      '<div style="display:flex;gap:10px;margin-bottom:16px;">' +
      '  <div style="flex:1;">' +
      '    <label style="' + EPIC_STYLE.label + '">鼠鼠签名</label>' +
      '    <input type="text" id="contract-sign1" placeholder="签名" style="' + EPIC_STYLE.input + '">' +
      '  </div>' +
      '  <div style="flex:1;">' +
      '    <label style="' + EPIC_STYLE.label + '">笔笔签名</label>' +
      '    <input type="text" id="contract-sign2" placeholder="签名" style="' + EPIC_STYLE.input + '">' +
      '  </div>' +
      '</div>' +
      '<label style="display:flex;align-items:center;gap:8px;margin-bottom:16px;cursor:pointer;">' +
      '  <input type="checkbox" id="contract-confirm" style="width:18px;height:18px;">' +
      '  <span style="color:#374151;font-size:13px;">我已阅读并同意此契约，知晓签署后不可修改</span>' +
      '</label>' +
      '<button onclick="LoveContract.doSign()" style="' + EPIC_STYLE.btnPrimary + 'width:100%;">💍 签署契约（不可修改）</button>' +
      '</div>';

    if (typeof showGlobalModal === 'function') showGlobalModal(html);
  },

  doSign: function() {
    var vow = document.getElementById('contract-vow').value;
    var sign1 = document.getElementById('contract-sign1').value;
    var sign2 = document.getElementById('contract-sign2').value;
    var confirm = document.getElementById('contract-confirm').checked;

    if (!vow || !sign1 || !sign2) { alert('请填写完整信息！'); return; }
    if (!confirm) { alert('请先勾选确认！'); return; }

    var contract = {
      vow: vow,
      goal: document.getElementById('contract-goal').value,
      signatures: [sign1, sign2],
      signedAt: new Date().toISOString(),
      locked: true
    };

    localStorage.setItem('love_contract_signed', JSON.stringify(contract));
    window.setData && window.setData('love_contract_signed', contract);
    alert('💍 契约已签署并永久锁定！');
    this.showContractModal();
  }
};

// ============================================================
//  完善功能2：回忆回声系统
// ============================================================
var MemoryEcho = {
  init: function() {
    console.log('[MemoryEcho] 初始化回忆回声系统');
  },

  loadEchoes: function() {
    return JSON.parse(localStorage.getItem('memory_echoes') || '[]');
  },

  saveEchoes: function(echoes) {
    localStorage.setItem('memory_echoes', JSON.stringify(echoes));
    window.setData && window.setData('memory_echoes', echoes);
  },

  showEchoModal: function() {
    var echoes = this.loadEchoes();
    var html = '<div style="padding:24px;max-width:600px;">' +
      '<h3 style="' + EPIC_STYLE.title + '">💭 回忆回声</h3>' +
      '<p style="' + EPIC_STYLE.subtext + 'margin-bottom:16px;">给过去或未来的彼此写一封信，时间会传递这个答案</p>' +
      '<button onclick="MemoryEcho.showSendForm()" style="' + EPIC_STYLE.btnPrimary + 'margin-bottom:16px;width:100%;">+ 发送回声</button>' +
      '<div id="echo-list">';

    if (echoes.length === 0) {
      html += '<p style="text-align:center;color:#94a3b8;padding:30px;">还没有回声，点击上方按钮发送吧～</p>';
    } else {
      echoes.reverse().forEach(function(e, idx) {
        var targetIcon = { past: '⏪', future: '⏩', now: '💫' }[e.target] || '💫';
        var targetText = { past: '给过去的TA', future: '给未来的TA', now: '给现在的TA' }[e.target] || e.target;
        html += '<div style="' + EPIC_STYLE.cardSmall + '">' +
          '<p style="font-size:20px;margin-bottom:6px;">' + targetIcon + ' ' + targetText + '</p>' +
          '<p style="color:#374151;font-size:14px;line-height:1.6;white-space:pre-wrap;">' + e.content + '</p>' +
          '<p style="' + EPIC_STYLE.subtext + 'margin-top:8px;">发送于 ' + new Date(e.sentAt).toLocaleString() + '</p>' +
          '</div>';
      });
    }

    html += '</div></div>';
    if (typeof showGlobalModal === 'function') showGlobalModal(html);
  },

  showSendForm: function() {
    var html = '<div style="padding:24px;max-width:500px;">' +
      '<h3 style="' + EPIC_STYLE.title + '">发送回忆回声</h3>' +
      '<div style="margin-bottom:14px;">' +
      '  <label style="' + EPIC_STYLE.label + '">发送给</label>' +
      '  <select id="echo-target" style="' + EPIC_STYLE.select + '">' +
      '    <option value="past">⏪ 给过去的TA</option>' +
      '    <option value="future">⏩ 给未来的TA</option>' +
      '    <option value="now" selected>💫 给现在的TA</option>' +
      '  </select>' +
      '</div>' +
      '<div style="margin-bottom:16px;">' +
      '  <label style="' + EPIC_STYLE.label + '">你想说...</label>' +
      '  <textarea id="echo-content" placeholder="写下你想对TA说的话，时间会传递这个答案..." style="' + EPIC_STYLE.textarea + 'height:120px;"></textarea>' +
      '</div>' +
      '<div style="display:flex;gap:10px;">' +
      '  <button onclick="MemoryEcho.doSend()" style="' + EPIC_STYLE.btnPrimary + 'flex:1;">💭 发送回声</button>' +
      '  <button onclick="MemoryEcho.showEchoModal()" style="padding:10px 20px;background:#e5e7eb;color:#374151;border:none;border-radius:10px;font-size:14px;cursor:pointer;">取消</button>' +
      '</div></div>';

    if (typeof showGlobalModal === 'function') showGlobalModal(html);
  },

  doSend: function() {
    var content = document.getElementById('echo-content').value;
    if (!content) { alert('请填写内容！'); return; }

    var echoes = this.loadEchoes();
    echoes.push({
      target: document.getElementById('echo-target').value,
      content: content,
      sentAt: new Date().toISOString()
    });
    this.saveEchoes(echoes);
    alert('💭 回声已发送！');
    this.showEchoModal();
  }
};

// ============================================================
//  完善功能3：爱情年轮数据博物馆
// ============================================================
var DataMuseum = {
  init: function() {
    console.log('[DataMuseum] 初始化爱情年轮数据博物馆');
  },

  showMuseumModal: function() {
    var stats = {
      diaries: JSON.parse(localStorage.getItem('couple_diaries') || '[]').length,
      dates: JSON.parse(localStorage.getItem('couple_dates') || '[]').length,
      gifts: JSON.parse(localStorage.getItem('couple_gifts') || '[]').length,
      letters: JSON.parse(localStorage.getItem('couple_love_letters') || '[]').length,
      photos: JSON.parse(localStorage.getItem('couple_photos') || '[]').length,
      expenses: JSON.parse(localStorage.getItem('couple_expenses') || '[]').length,
      timeCapsules: JSON.parse(localStorage.getItem('long_term_capsules') || '[]').length,
      archives: JSON.parse(localStorage.getItem('love_archives') || '[]').length,
    };

    var html = '<div style="padding:24px;max-width:650px;">' +
      '<h3 style="' + EPIC_STYLE.title + 'text-align:center;">🏛️ 爱情年轮数据博物馆</h3>' +
      '<p style="' + EPIC_STYLE.subtext + 'text-align:center;margin-bottom:20px;">数据会持续累积，记录你们爱情的每一个年轮 🌳</p>' +
      '<div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:12px;">' +

      '<div style="' + EPIC_STYLE.card + 'text-align:center;padding:20px;">' +
      '  <p style="font-size:36px;color:#3b82f6;font-weight:bold;margin-bottom:4px;">' + stats.diaries + '</p>' +
      '  <p style="color:#94a3b8;font-size:13px;">📝 日记</p>' +
      '</div>' +

      '<div style="' + EPIC_STYLE.card + 'text-align:center;padding:20px;">' +
      '  <p style="font-size:36px;color:#3b82f6;font-weight:bold;margin-bottom:4px;">' + stats.dates + '</p>' +
      '  <p style="color:#94a3b8;font-size:13px;">📅 约会</p>' +
      '</div>' +

      '<div style="' + EPIC_STYLE.card + 'text-align:center;padding:20px;">' +
      '  <p style="font-size:36px;color:#3b82f6;font-weight:bold;margin-bottom:4px;">' + stats.gifts + '</p>' +
      '  <p style="color:#94a3b8;font-size:13px;">🎁 礼物</p>' +
      '</div>' +

      '<div style="' + EPIC_STYLE.card + 'text-align:center;padding:20px;">' +
      '  <p style="font-size:36px;color:#3b82f6;font-weight:bold;margin-bottom:4px;">' + stats.letters + '</p>' +
      '  <p style="color:#94a3b8;font-size:13px;">💌 情书</p>' +
      '</div>' +

      '<div style="' + EPIC_STYLE.card + 'text-align:center;padding:20px;">' +
      '  <p style="font-size:36px;color:#3b82f6;font-weight:bold;margin-bottom:4px;">' + stats.photos + '</p>' +
      '  <p style="color:#94a3b8;font-size:13px;">📷 照片</p>' +
      '</div>' +

      '<div style="' + EPIC_STYLE.card + 'text-align:center;padding:20px;">' +
      '  <p style="font-size:36px;color:#3b82f6;font-weight:bold;margin-bottom:4px;">' + stats.expenses + '</p>' +
      '  <p style="color:#94a3b8;font-size:13px;">💰 账单</p>' +
      '</div>' +

      '<div style="' + EPIC_STYLE.card + 'text-align:center;padding:20px;">' +
      '  <p style="font-size:36px;color:#3b82f6;font-weight:bold;margin-bottom:4px;">' + stats.timeCapsules + '</p>' +
      '  <p style="color:#94a3b8;font-size:13px;">💊 胶囊</p>' +
      '</div>' +

      '<div style="' + EPIC_STYLE.card + 'text-align:center;padding:20px;">' +
      '  <p style="font-size:36px;color:#3b82f6;font-weight:bold;margin-bottom:4px;">' + stats.archives + '</p>' +
      '  <p style="color:#94a3b8;font-size:13px;">📕 典藏</p>' +
      '</div>' +

      '</div></div>';

    if (typeof showGlobalModal === 'function') showGlobalModal(html);
  }
};

// ============================================================
//  完善功能4：快速互动动作
// ============================================================
var QuickInteraction = {
  init: function() {
    console.log('[QuickInteraction] 初始化快速互动系统');
  },

  sendNotification: function(action, message) {
    var notifications = JSON.parse(localStorage.getItem('couple_notifications') || '[]');
    notifications.push({
      type: 'interaction',
      action: action,
      from: '鼠鼠',
      message: message,
      sentAt: new Date().toISOString(),
      read: false
    });
    localStorage.setItem('couple_notifications', JSON.stringify(notifications));
    window.setData && window.setData('couple_notifications', notifications);
  },

  showInteractionPanel: function() {
    var html = '<div style="padding:24px;text-align:center;max-width:400px;">' +
      '<h3 style="' + EPIC_STYLE.title + '">💕 快速互动</h3>' +
      '<p style="' + EPIC_STYLE.subtext + 'margin-bottom:20px;">点击发送虚拟互动，对方下次登录时会收到通知 🔔</p>' +
      '<div style="display:flex;gap:16px;justify-content:center;flex-wrap:wrap;">' +

      '<button onclick="QuickInteraction.sendHug()" style="width:100px;height:100px;border-radius:20px;background:linear-gradient(135deg,#3b82f6,#1d4ed8);color:white;font-size:40px;border:none;cursor:pointer;box-shadow:0 4px 12px rgba(59,130,246,0.3);transition:transform 0.2s;">🤗</button>' +

      '<button onclick="QuickInteraction.sendHeadpat()" style="width:100px;height:100px;border-radius:20px;background:linear-gradient(135deg,#3b82f6,#1d4ed8);color:white;font-size:40px;border:none;cursor:pointer;box-shadow:0 4px 12px rgba(59,130,246,0.3);">😊</button>' +

      '<button onclick="QuickInteraction.sendHeart()" style="width:100px;height:100px;border-radius:20px;background:linear-gradient(135deg,#3b82f6,#1d4ed8);color:white;font-size:40px;border:none;cursor:pointer;box-shadow:0 4px 12px rgba(59,130,246,0.3);">💕</button>' +

      '</div>' +
      '<div style="margin-top:20px;">' +
      '  <button onclick="QuickInteraction.showCustomInteraction()" style="' + EPIC_STYLE.btnPrimary + 'width:100%;">💬 自定义互动消息</button>' +
      '</div>' +
      '<p style="color:#94a3b8;font-size:12px;margin-top:16px;">点击发送虚拟互动，对方下次登录时会收到通知 🔔</p>' +
      '</div>';

    if (typeof showGlobalModal === 'function') showGlobalModal(html);
  },

  sendHug: function() {
    this.sendNotification('hug', '🤗 给你一个虚拟拥抱！');
    alert('🤗 虚拟拥抱已发送！');
  },

  sendHeadpat: function() {
    this.sendNotification('headpat', '😊 摸摸头～');
    alert('😊 摸头已发送！');
  },

  sendHeart: function() {
    this.sendNotification('heart', '💕 比个大心心！');
    alert('💕 比心已发送！');
  },

  showCustomInteraction: function() {
    var html = '<div style="padding:24px;max-width:400px;">' +
      '<h3 style="' + EPIC_STYLE.title + '">自定义互动消息</h3>' +
      '<div style="margin-bottom:16px;">' +
      '  <label style="' + EPIC_STYLE.label + '">消息内容</label>' +
      '  <input type="text" id="custom-interaction-msg" placeholder="如：想你了 🥺" style="' + EPIC_STYLE.input + '">' +
      '</div>' +
      '<button onclick="QuickInteraction.doSendCustom()" style="' + EPIC_STYLE.btnPrimary + 'width:100%;">💬 发送</button>' +
      '</div>';

    if (typeof showGlobalModal === 'function') showGlobalModal(html);
  },

  doSendCustom: function() {
    var msg = document.getElementById('custom-interaction-msg').value;
    if (!msg) { alert('请填写消息内容！'); return; }
    this.sendNotification('custom', msg);
    alert('💬 互动消息已发送！');
    this.showInteractionPanel();
  }
};

// ============================================================
//  史诗纪念殿堂入口（整合所有功能）
// ============================================================
function openEpicEntrance() {
  var html = '<div style="padding:24px;max-width:650px;">' +
    '<h3 style="color:#1d4ed8;margin-bottom:8px;text-align:center;font-size:24px;">🏆 史诗纪念殿堂</h3>' +
    '<p style="color:#94a3b8;text-align:center;font-size:13px;margin-bottom:20px;">四大王炸功能 + 完善功能，永久纪念你们的爱情</p>' +

    '<div style="' + EPIC_STYLE.card + 'margin-bottom:12px;border-left:4px solid #3b82f6;">' +
    '  <div style="display:flex;justify-content:space-between;align-items:center;">' +
    '    <div><h4 style="color:#1d4ed8;margin-bottom:4px;">📕 爱情永久典藏册</h4><p style="' + EPIC_STYLE.subtext + '">生成不可篡改的终身纪念册，收录所有爱情数据</p></div>' +
    '    <button onclick="LoveArchive.showArchiveModal()" style="padding:8px 16px;background:linear-gradient(135deg,#3b82f6,#1d4ed8);color:white;border:none;border-radius:8px;font-size:13px;cursor:pointer;box-shadow:0 2px 8px rgba(59,130,246,0.3);">打开</button>' +
    '  </div></div>' +

    '<div style="' + EPIC_STYLE.card + 'margin-bottom:12px;border-left:4px solid #3b82f6;">' +
    '  <div style="display:flex;justify-content:space-between;align-items:center;">' +
    '    <div><h4 style="color:#1d4ed8;margin-bottom:4px;">⚓ 爱情时间锚点</h4><p style="' + EPIC_STYLE.subtext + '">2.0纪元永久坐标，贯穿全站标记纪元</p></div>' +
    '    <button onclick="TimeAnchor.showAnchorModal()" style="padding:8px 16px;background:linear-gradient(135deg,#3b82f6,#1d4ed8);color:white;border:none;border-radius:8px;font-size:13px;cursor:pointer;box-shadow:0 2px 8px rgba(59,130,246,0.3);">打开</button>' +
    '  </div></div>' +

    '<div style="' + EPIC_STYLE.card + 'margin-bottom:12px;border-left:4px solid #3b82f6;">' +
    '  <div style="display:flex;justify-content:space-between;align-items:center;">' +
    '    <div><h4 style="color:#1d4ed8;margin-bottom:4px;">⏰ 长线时光胶囊馆</h4><p style="' + EPIC_STYLE.subtext + '">写给1年、3年、5年、10年后的彼此，创建后不可修改</p></div>' +
    '    <button onclick="LongTermCapsule.showCapsuleModal()" style="padding:8px 16px;background:linear-gradient(135deg,#3b82f6,#1d4ed8);color:white;border:none;border-radius:8px;font-size:13px;cursor:pointer;box-shadow:0 2px 8px rgba(59,130,246,0.3);">打开</button>' +
    '  </div></div>' +

    '<div style="' + EPIC_STYLE.card + 'margin-bottom:12px;border-left:4px solid #3b82f6;">' +
    '  <div style="display:flex;justify-content:space-between;align-items:center;">' +
    '    <div><h4 style="color:#1d4ed8;margin-bottom:4px;">🎨 爱情人生画卷</h4><p style="' + EPIC_STYLE.subtext + '">可视化终身爱情编年史，支持手动添加时间线事件</p></div>' +
    '    <button onclick="LoveCanvas.open()" style="padding:8px 16px;background:linear-gradient(135deg,#3b82f6,#1d4ed8);color:white;border:none;border-radius:8px;font-size:13px;cursor:pointer;box-shadow:0 2px 8px rgba(59,130,246,0.3);">展开画卷</button>' +
    '  </div></div>' +

    '<hr style="margin:20px 0;border:none;border-top:1px solid #e5e7eb;">' +
    '<h4 style="color:#1d4ed8;margin-bottom:12px;font-size:15px;">完善功能</h4>' +

    '<div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;">' +
    '  <button onclick="LoveContract.showContractModal()" style="padding:14px;background:rgba(255,255,255,0.95);border:2px solid #93c5fd;border-radius:12px;cursor:pointer;text-align:left;box-shadow:0 2px 6px rgba(0,0,0,0.06);transition:all 0.2s;"><span style="font-size:24px;">💍</span><br><span style="color:#1d4ed8;font-size:14px;font-weight:600;">爱情契约</span><br><span style="' + EPIC_STYLE.subtext + 'font-size:11px;">电子指纹契约</span></button>' +
    '  <button onclick="MemoryEcho.showEchoModal()" style="padding:14px;background:rgba(255,255,255,0.95);border:2px solid #93c5fd;border-radius:12px;cursor:pointer;text-align:left;box-shadow:0 2px 6px rgba(0,0,0,0.06);transition:all 0.2s;"><span style="font-size:24px;">💭</span><br><span style="color:#1d4ed8;font-size:14px;font-weight:600;">回忆回声</span><br><span style="' + EPIC_STYLE.subtext + 'font-size:11px;">跨时间对话</span></button>' +
    '  <button onclick="DataMuseum.showMuseumModal()" style="padding:14px;background:rgba(255,255,255,0.95);border:2px solid #93c5fd;border-radius:12px;cursor:pointer;text-align:left;box-shadow:0 2px 6px rgba(0,0,0,0.06);transition:all 0.2s;"><span style="font-size:24px;">🏛️</span><br><span style="color:#1d4ed8;font-size:14px;font-weight:600;">年轮博物馆</span><br><span style="' + EPIC_STYLE.subtext + 'font-size:11px;">数据统计</span></button>' +
    '  <button onclick="QuickInteraction.showInteractionPanel()" style="padding:14px;background:rgba(255,255,255,0.95);border:2px solid #93c5fd;border-radius:12px;cursor:pointer;text-align:left;box-shadow:0 2px 6px rgba(0,0,0,0.06);transition:all 0.2s;"><span style="font-size:24px;">💕</span><br><span style="color:#1d4ed8;font-size:14px;font-weight:600;">快速互动</span><br><span style="' + EPIC_STYLE.subtext + 'font-size:11px;">虚拟互动</span></button>' +
    '</div></div>';

  if (typeof showGlobalModal === 'function') {
    showGlobalModal(html);
  } else {
    alert('请刷新页面后重试');
  }
}

// 页面加载时初始化所有史诗功能
(function() {
  // 导出到全局作用域，供 index.html 中的 openEpicEntrance() 调用
  window.EpicFeatures = {
    openEntrance: openEpicEntrance,
    LoveArchive: LoveArchive,
    TimeAnchor: TimeAnchor,
    LongTermCapsule: LongTermCapsule,
    LoveCanvas: LoveCanvas,
    LoveContract: LoveContract,
    MemoryEcho: MemoryEcho,
    DataMuseum: DataMuseum,
    QuickInteraction: QuickInteraction
  };

  function initAll() {
    if (typeof LoveArchive !== 'undefined') LoveArchive.init();
    if (typeof TimeAnchor !== 'undefined') TimeAnchor.init();
    if (typeof LongTermCapsule !== 'undefined') LongTermCapsule.init();
    if (typeof LoveCanvas !== 'undefined') LoveCanvas.init();
    if (typeof LoveContract !== 'undefined') LoveContract.init();
    if (typeof MemoryEcho !== 'undefined') MemoryEcho.init();
    if (typeof DataMuseum !== 'undefined') DataMuseum.init();
    if (typeof QuickInteraction !== 'undefined') QuickInteraction.init();
    console.log('[EpicFeatures] ✅ 全部史诗功能已加载（v1.1 支持手动编辑+添加）');
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initAll);
  } else {
    initAll();
  }
})();
