// ============================================================
//  漂流瓶功能 v22 - 完全重写干净版本
//  使用 GitHub Gist 实现跨设备同步
// ============================================================

(function() {
  'use strict';

  console.log('[Drift-v22] 加载中...');

  // ── 配置 ──
  var GIST_ID = '99209ca3820afd640983188245d1a7ac';

  // ── Token 管理 ──
  function getToken() {
    return localStorage.getItem('drift_github_token') || '';
  }

  function saveToken(token) {
    localStorage.setItem('drift_github_token', token.trim());
    console.log('[Drift-v22] ✅ Token 已保存');
  }

  function hasToken() {
    var t = getToken();
    return t && t.length > 0;
  }

  // ── 从 Gist 加载瓶子 ──
  async function loadBottles() {
    console.log('[Drift-v22] 开始加载瓶子...');
    var token = getToken();
    var headers = {};
    if (token) {
      headers['Authorization'] = 'token ' + token;
    }

    var res = await fetch('https://api.github.com/gists/' + GIST_ID, { headers: headers });
    console.log('[Drift-v22] Gist 响应状态:', res.status);

    if (!res.ok) {
      throw new Error('加载失败: HTTP ' + res.status);
    }

    var data = await res.json();
    var content = data.files['driftbottles.json'].content;
    var json = JSON.parse(content);
    console.log('[Drift-v22] 加载到', json.bottles ? json.bottles.length : 0, '个瓶子');
    return json.bottles || [];
  }

  // ── 保存瓶子到 Gist ──
  async function saveBottles(bottles) {
    console.log('[Drift-v22] 开始保存', bottles.length, '个瓶子...');
    var token = getToken();
    if (!token) {
      throw new Error('未配置 GitHub Token！');
    }

    var content = JSON.stringify({ bottles: bottles, updatedAt: new Date().toISOString() }, null, 2);

    var res = await fetch('https://api.github.com/gists/' + GIST_ID, {
      method: 'PATCH',
      headers: {
        'Authorization': 'token ' + token,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        files: {
          'driftbottles.json': { content: content }
        }
      })
    });

    console.log('[Drift-v22] 保存响应状态:', res.status);
    if (!res.ok) {
      var errText = await res.text();
      throw new Error('保存失败: ' + res.status + ' - ' + errText);
    }

    console.log('[Drift-v22] ✅ 保存成功');
    return true;
  }

  // ── 投瓶 ──
  window.throwDriftBottle = async function() {
    console.log('[Drift-v22] 投瓶函数被调用');

    if (!hasToken()) {
      alert('请先配置 GitHub Token！');
      if (typeof showTokenConfig === 'function') showTokenConfig();
      return;
    }

    var msg = document.getElementById('drift-message');
    if (!msg) {
      alert('错误：找不到输入框！');
      return;
    }

    var text = msg.value.trim();
    if (!text) {
      alert('请输入要发送的消息！');
      return;
    }

    try {
      var bottles = await loadBottles();

      bottles.push({
        id: 'bottle_' + Date.now(),
        message: text,
        author: '匿名',
        createdAt: new Date().toISOString(),
        status: 'drifting'
      });

      await saveBottles(bottles);

      alert('✅ 投瓶成功！');
      msg.value = '';

      if (typeof updateDriftStats === 'function') updateDriftStats();

    } catch (e) {
      console.error('[Drift-v22] 投瓶失败:', e);
      alert('❌ 投瓶失败！\n' + e.message);
    }
  };

  // ── 捞瓶 ──
  window.catchDriftBottle = async function() {
    console.log('[Drift-v22] 捞瓶函数被调用');

    if (!hasToken()) {
      alert('请先配置 GitHub Token！');
      if (typeof showTokenConfig === 'function') showTokenConfig();
      return;
    }

    try {
      var bottles = await loadBottles();
      var drifting = bottles.filter(function(b) { return b.status === 'drifting'; });

      if (drifting.length === 0) {
        alert('🌊 暂时没有漂流瓶...');
        return;
      }

      var bottle = drifting[Math.floor(Math.random() * drifting.length)];
      bottle.status = 'caught';
      bottle.caughtAt = new Date().toISOString();

      await saveBottles(bottles);

      alert('🎉 捞到漂流瓶了！\n\n消息: ' + bottle.message);

      if (typeof updateDriftStats === 'function') updateDriftStats();

    } catch (e) {
      console.error('[Drift-v22] 捞瓶失败:', e);
      alert('❌ 捞瓶失败！\n' + e.message);
    }
  };

  // ── 更新统计 ──
  window.updateDriftStats = async function() {
    try {
      var bottles = await loadBottles();
      var drifting = bottles.filter(function(b) { return b.status === 'drifting'; }).length;
      var caught = bottles.filter(function(b) { return b.status === 'caught'; }).length;

      var driftingEl = document.getElementById('drifting-count');
      var caughtEl = document.getElementById('caught-count');

      if (driftingEl) driftingEl.textContent = drifting;
      if (caughtEl) caughtEl.textContent = caught;

      console.log('[Drift-v22] 统计更新: 漂流中=' + drifting + ', 已捞=' + caught);
    } catch (e) {
      console.error('[Drift-v22] 更新统计失败:', e);
    }
  };

  // ── 显示 Token 配置 ──
  window.showTokenConfig = function() {
    console.log('[Drift-v22] 显示Token配置');
    var html =
      '<div style="text-align:center;padding:20px;">' +
      '<h3>配置 GitHub Token</h3>' +
      '<input type="password" id="github-token-input" placeholder="粘贴 GitHub Token..." style="width:100%;padding:12px;margin:10px 0;">' +
      '<button onclick="window.driftSaveToken()" style="background:#3b82f6;color:white;padding:10px 24px;border:none;border-radius:12px;cursor:pointer;">保存</button>' +
      '<p style="margin-top:15px;font-size:11px;color:#999;">Token 需要 gist 权限</p>' +
      '</div>';

    if (typeof showGlobalModal === 'function') {
      showGlobalModal(html);
    } else {
      alert('请刷新页面后重试！');
    }
  };

  // ── 保存 Token ──
  window.driftSaveToken = function() {
    var input = document.getElementById('github-token-input');
    if (!input) return;

    var token = input.value.trim();
    if (!token) {
      alert('请输入 Token！');
      return;
    }

    saveToken(token);
    if (typeof closeGlobalModal === 'function') closeGlobalModal();
    alert('✅ Token 已保存！');

    loadBottles().then(function() {
      alert('✅ 连接测试成功！');
    }).catch(function(e) {
      alert('⚠️ 连接测试失败: ' + e.message);
    });
  };

  console.log('[Drift-v22] ✅ 漂流瓶功能已加载');

})();
