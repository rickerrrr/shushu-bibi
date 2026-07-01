/**
 * 史诗级完善功能 v1.0
 * 爱情契约、回忆回声、年轮博物馆、交互体系补全
 */

// ============================================================
//  新增1：爱情指纹电子契约（终身不可修改）
// ============================================================
var LoveContract = {
  init: function() {
    console.log('[LoveContract] 初始化爱情契约系统');
    this.checkContractExists();
  },

  checkContractExists: function() {
    var contract = localStorage.getItem('love_contract_signed');
    if (contract) {
      console.log('[LoveContract] 契约已签署，不可修改');
      return true;
    }
    return false;
  },

  showContractModal: function() {
    if (this.checkContractExists()) {
      alert('⚠️ 爱情契约已签署，不可修改或删除！\n\n如需查看，请访问"史诗纪念入口"');
      return;
    }

    var html = '<div style="padding:30px;max-width:600px;">' +
      '<h2 style="text-align:center;margin-bottom:20px;color:#3b82f6;">💍 爱情指纹电子契约</h2>' +
      '<p style="text-align:center;color:#666;margin-bottom:30px;">此契约签署后永久锁定，不可修改或删除</p>' +
      '<div style="background:linear-gradient(135deg,#eff6ff,#dbeafe);padding:20px;border-radius:16px;margin-bottom:20px;">' +
      '  <h3 style="margin-bottom:15px;">💕 我们的爱情誓言</h3>' +
      '  <textarea id="contract-vows" placeholder="写下你们的爱情誓言..." style="width:100%;height:120px;padding:12px;border:2px solid #93c5fd;border-radius:12px;resize:vertical;box-sizing:border-box;"></textarea>' +
      '</div>' +
      '<div style="margin-bottom:20px;">' +
      '  <h3 style="margin-bottom:15px;">🎯 长期目标约定</h3>' +
      '  <label style="display:block;margin-bottom:10px;cursor:pointer;">' +
      '    <input type="checkbox" id="goal-cohabit"> 同居计划' +
      '  </label>' +
      '  <label style="display:block;margin-bottom:10px;cursor:pointer;">' +
      '    <input type="checkbox" id="goal-travel"> 一起旅行' +
      '  </label>' +
      '  <label style="display:block;margin-bottom:10px;cursor:pointer;">' +
      '    <input type="checkbox" id="goal-propose"> 求婚计划' +
      '  </label>' +
      '  <label style="display:block;margin-bottom:10px;cursor:pointer;">' +
      '    <input type="checkbox" id="goal-marry"> 结婚规划' +
      '  </label>' +
      '</div>' +
      '<div style="margin-bottom:20px;">' +
      '  <h3 style="margin-bottom:15px;">✍️ 电子签名</h3>' +
      '  <input type="text" id="signature-person1" placeholder="鼠鼠签名" style="width:48%;padding:12px;border:2px solid #a78bfa;border-radius:12px;margin-right:4%;box-sizing:border-box;">' +
      '  <input type="text" id="signature-person2" placeholder="笔笔签名" style="width:48%;padding:12px;border:2px solid #a78bfa;border-radius:12px;box-sizing:border-box;">' +
      '</div>' +
      '<button onclick="LoveContract.sign()" style="width:100%;padding:16px;background:linear-gradient(135deg,#3b82f6,#ef4444);color:white;border:none;border-radius:16px;font-size:18px;font-weight:bold;cursor:pointer;">💍 签署契约（不可撤回）</button>' +
      '</div>';

    if (typeof showGlobalModal === 'function') {
      showGlobalModal(html);
    }
  },

  sign: function() {
    var vows = document.getElementById('contract-vows').value.trim();
    var sig1 = document.getElementById('signature-person1').value.trim();
    var sig2 = document.getElementById('signature-person2').value.trim();

    if (!vows || !sig1 || !sig2) {
      alert('请填写完整信息！');
      return;
    }

    var contract = {
      id: 'contract_' + Date.now(),
      vows: vows,
      goals: {
        cohabit: document.getElementById('goal-cohabit').checked,
        travel: document.getElementById('goal-travel').checked,
        propose: document.getElementById('goal-propose').checked,
        marry: document.getElementById('goal-marry').checked
      },
      signatures: [sig1, sig2],
      signedAt: new Date().toISOString(),
      isLocked: true // 永久锁定
    };

    localStorage.setItem('love_contract_signed', JSON.stringify(contract));

    if (typeof closeGlobalModal === 'function') closeGlobalModal();

    alert('✅ 爱情契约已签署！\n\n此契约已永久锁定，不可修改或删除。\n解锁成就《终身缔约人》！');

    // 解锁成就
    if (typeof AchievementSystem !== 'undefined') {
      AchievementSystem.unlock('contract_signer');
    }

    console.log('[LoveContract] ✅ 契约已签署', contract);
  },

  viewContract: function() {
    var contract = JSON.parse(localStorage.getItem('love_contract_signed'));
    if (!contract) {
      alert('尚未签署爱情契约');
      return;
    }

    var html = '<div style="padding:30px;max-width:600px;text-align:center;">' +
      '<h2 style="color:#3b82f6;margin-bottom:30px;">💍 我们的爱情契约</h2>' +
      '<div style="background:linear-gradient(135deg,#eff6ff,#dbeafe);padding:30px;border-radius:16px;margin-bottom:20px;">' +
      '  <p style="font-size:18px;line-height:1.8;">' + contract.vows + '</p>' +
      '</div>' +
      '<div style="margin-bottom:20px;">' +
      '  <h3>🎯 约定目标</h3>' +
      '  <p>' + (contract.goals.cohabit ? '✅' : '⬜') + ' 同居计划</p>' +
      '  <p>' + (contract.goals.travel ? '✅' : '⬜') + ' 一起旅行</p>' +
      '  <p>' + (contract.goals.propose ? '✅' : '⬜') + ' 求婚计划</p>' +
      '  <p>' + (contract.goals.marry ? '✅' : '⬜') + ' 结婚规划</p>' +
      '</div>' +
      '<div style="margin-bottom:20px;">' +
      '  <h3>✍️ 电子签名</h3>' +
      '  <p style="font-size:20px;color:#3b82f6;">' + contract.signatures[0] + ' ❤️ ' + contract.signatures[1] + '</p>' +
      '</div>' +
      '<p style="color:#9ca3af;font-size:12px;">签署于 ' + new Date(contract.signedAt).toLocaleString() + '</p>' +
      '<p style="color:#ef4444;font-size:14px;margin-top:10px;">⚠️ 此契约已永久锁定，不可修改或删除</p>' +
      '</div>';

    if (typeof showGlobalModal === 'function') {
      showGlobalModal(html);
    }
  }
};

// ============================================================
//  新增2：回忆回声系统（跨时间双向对话）
// ============================================================
var MemoryEcho = {
  init: function() {
    console.log('[MemoryEcho] 初始化回忆回声系统');
  },

  addEcho: function(recordId, recordType) {
    var echoContent = prompt('写下对过去的感想（跨时空留言）：');
    if (!echoContent) return;

    var echo = {
      id: 'echo_' + Date.now(),
      recordId: recordId,
      recordType: recordType, // diary, date, letter
      content: echoContent,
      createdAt: new Date().toISOString(),
      era: TimeAnchor.getEra(new Date()) // 标记纪元
    };

    var echoes = JSON.parse(localStorage.getItem('memory_echoes') || '[]');
    echoes.push(echo);
    localStorage.setItem('memory_echoes', JSON.stringify(echoes));

    alert('✅ 跨时空留言已添加！');
    console.log('[MemoryEcho] 回声已添加', echo);
  },

  viewEchos: function(recordId) {
    var echoes = JSON.parse(localStorage.getItem('memory_echoes') || '[]');
    var recordEchos = echoes.filter(function(e) { return e.recordId === recordId; });

    if (recordEchos.length === 0) {
      return '<p style="color:#9ca3af;text-align:center;">还没有跨时空留言</p>';
    }

    var html = '<div style="margin-top:20px;padding:20px;background:#f9fafb;border-radius:12px;">' +
      '<h4 style="margin-bottom:15px;color:#1d4ed8;">💭 跨时空留言</h4>';

    recordEchos.forEach(function(echo) {
      html += '<div style="padding:12px;background:white;border-radius:8px;margin-bottom:10px;border-left:4px solid #1d4ed8;">' +
        '<p style="font-size:14px;color:#1f2937;">' + echo.content + '</p>' +
        '<p style="font-size:12px;color:#9ca3af;margin-top:8px;">' + echo.era + ' · ' + new Date(echo.createdAt).toLocaleString() + '</p>' +
        '</div>';
    });

    html += '</div>';
    return html;
  }
};

// ============================================================
//  新增3：爱情年轮数据博物馆
// ============================================================
var LoveDataMuseum = {
  init: function() {
    console.log('[LoveDataMuseum] 初始化爱情年轮博物馆');
  },

  calculateAllData: function() {
    var diaries = JSON.parse(localStorage.getItem('couple_diaries') || '[]');
    var dates = JSON.parse(localStorage.getItem('couple_dates') || '[]');
    var gifts = JSON.parse(localStorage.getItem('couple_gifts') || '[]');
    var letters = JSON.parse(localStorage.getItem('couple_love_letters') || '[]');
    var expenses = JSON.parse(localStorage.getItem('couple_expenses') || '[]');
    var milestones = JSON.parse(localStorage.getItem('couple_milestones') || '[]');

    return {
      basic: {
        totalDays: Math.floor((new Date() - new Date(localStorage.getItem('relationship_start_date') || '2024-01-01')) / (1000 * 60 * 60 * 24)),
        totalDiaries: diaries.length,
        totalDates: dates.length,
        totalGifts: gifts.length,
        totalLetters: letters.length,
        totalMilestones: milestones.length
      },
      finance: {
        totalExpenses: expenses.reduce(function(sum, e) { return sum + (parseFloat(e.amount) || 0); }, 0),
        averageMonthly: 0 // 需要按月份计算
      },
      interaction: {
        totalMessages: JSON.parse(localStorage.getItem('couple_notes') || '[]').length,
        totalCapsules: JSON.parse(localStorage.getItem('couple_time_capsules') || '[]').length,
        reconciliations: JSON.parse(localStorage.getItem('couple_reconciliations') || '[]').length
      }
    };
  },

  renderMuseum: function() {
    var data = this.calculateAllData();

    var html = '<div style="padding:30px;">' +
      '<h2 style="text-align:center;margin-bottom:30px;color:#3b82f6;">🏛️ 爱情年轮数据博物馆</h2>' +

      '<div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(250px,1fr));gap:20px;margin-bottom:30px;">' +

      '<div style="padding:20px;background:linear-gradient(135deg,#eff6ff,#dbeafe);border-radius:16px;text-align:center;">' +
      '  <p style="font-size:48px;margin-bottom:10px;">📅</p>' +
      '  <p style="font-size:36px;font-weight:bold;color:#3b82f6;">' + data.basic.totalDays + '</p>' +
      '  <p style="color:#1e40af;">相恋总天数</p>' +
      '</div>' +

      '<div style="padding:20px;background:linear-gradient(135deg,#eff6ff,#dbeafe);border-radius:16px;text-align:center;">' +
      '  <p style="font-size:48px;margin-bottom:10px;">📝</p>' +
      '  <p style="font-size:36px;font-weight:bold;color:#3b82f6;">' + data.basic.totalDiaries + '</p>' +
      '  <p style="color:#831843;">日记篇数</p>' +
      '</div>' +

      '<div style="padding:20px;background:linear-gradient(135deg,#f0fdf4,#dcfce7);border-radius:16px;text-align:center;">' +
      '  <p style="font-size:48px;margin-bottom:10px;">🎁</p>' +
      '  <p style="font-size:36px;font-weight:bold;color:#10b981;">' + data.basic.totalGifts + '</p>' +
      '  <p style="color:#065f46;">互赠礼物</p>' +
      '</div>' +

      '<div style="padding:20px;background:linear-gradient(135deg,#fef3c7,#fde68a);border-radius:16px;text-align:center;">' +
      '  <p style="font-size:48px;margin-bottom:10px;">🏆</p>' +
      '  <p style="font-size:36px;font-weight:bold;color:#f59e0b;">' + data.basic.totalMilestones + '</p>' +
      '  <p style="color:#92400e;">里程碑</p>' +
      '</div>' +

      '</div>' +

      '<div style="padding:20px;background:white;border-radius:16px;box-shadow:0 4px 12px rgba(0,0,0,0.1);">' +
      '  <h3 style="margin-bottom:15px;color:#4b5563;">💰 财务数据</h3>' +
      '  <p>恋爱总开销：<strong>¥' + data.finance.totalExpenses.toFixed(2) + '</strong></p>' +
      '  <p style="margin-top:10px;color:#9ca3af;">（数据来自情侣账本）</p>' +
      '</div>' +

      '</div>';

    if (typeof showGlobalModal === 'function') {
      showGlobalModal(html);
    }

    console.log('[LoveDataMuseum] 博物馆已渲染', data);
  }
};

// ============================================================
//  新增4：实时交互体系补全（绿灯在线配套）
// ============================================================
var EnhancedInteraction = {
  init: function() {
    console.log('[EnhancedInteraction] 初始化增强交互系统');
    this.setupQuickActions();
    this.setupUrgentMessage();
  },

  setupQuickActions: function() {
    // 快速发送虚拟动作
    window.sendQuickAction = function(action) {
      var actions = {
        hug: { icon: '🤗', text: '给你一个拥抱', animation: 'hug' },
        pat: { icon: '😊', text: '摸摸头', animation: 'pat' },
        heart: { icon: '💕', text: '比心', animation: 'heart' },
        hold: { icon: '🤝', text: '牵手', animation: 'hold' }
      };

      var selected = actions[action];
      if (!selected) return;

      // 保存到消息列表
      var messages = JSON.parse(localStorage.getItem('couple_quick_actions') || '[]');
      messages.push({
        action: action,
        icon: selected.icon,
        text: selected.text,
        from: '我',
        time: new Date().toISOString()
      });
      localStorage.setItem('couple_quick_actions', JSON.stringify(messages));

      // 触发动画
      this.triggerActionAnimation(selected.animation);

      console.log('[EnhancedInteraction] 快速动作已发送', selected);
    };
  },

  triggerActionAnimation: function(type) {
    var overlay = document.createElement('div');
    overlay.style.cssText = 'position:fixed;top:0;left:0;width:100%;height:100%;pointer-events:none;z-index:99998;';

    var emoji = '';
    switch(type) {
      case 'hug': emoji = '🤗'; break;
      case 'pat': emoji = '😊'; break;
      case 'heart': emoji = '💕'; break;
      case 'hold': emoji = '🤝'; break;
    }

    overlay.innerHTML = '<div style="position:absolute;top:50%;left:50%;transform:translate(-50%,-50%);font-size:120px;animation:bounceIn 1s ease-out;">' + emoji + '</div>';

    document.body.appendChild(overlay);

    var style = document.createElement('style');
    style.textContent = '@keyframes bounceIn { 0% { opacity:0; transform:translate(-50%,-50%) scale(0.5); } 50% { transform:translate(-50%,-50%) scale(1.2); } 100% { opacity:1; transform:translate(-50%,-50%) scale(1); } }';
    document.head.appendChild(style);

    setTimeout(function() {
      overlay.remove();
      style.remove();
    }, 2000);

    console.log('[EnhancedInteraction] 动作动画已触发', type);
  },

  setupUrgentMessage: function() {
    // 离线留言加急机制
    window.sendUrgentMessage = function(content) {
      var message = {
        id: 'urgent_' + Date.now(),
        content: content,
        isUrgent: true,
        from: '我',
        createdAt: new Date().toISOString()
      };

      var urgentMessages = JSON.parse(localStorage.getItem('couple_urgent_messages') || '[]');
      urgentMessages.push(message);
      localStorage.setItem('couple_urgent_messages', JSON.stringify(urgentMessages));

      alert('🚨 加急留言已发送！\n对方上线后将第一时间看到');
      console.log('[EnhancedInteraction] 加急留言已发送', message);
    };
  }
};

// 初始化所有完善功能
(function() {
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', function() {
      LoveContract.init();
      MemoryEcho.init();
      LoveDataMuseum.init();
      EnhancedInteraction.init();
    });
  } else {
    LoveContract.init();
    MemoryEcho.init();
    LoveDataMuseum.init();
    EnhancedInteraction.init();
  }

  console.log('[EnhancedFeatures] ✅ 史诗级完善功能已加载');
})();
