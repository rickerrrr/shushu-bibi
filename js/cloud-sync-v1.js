/**
 * 云端同步模块 v1.0
 * 从 Cloudflare D1 数据库加载历史数据到 localStorage
 * 覆盖: 纸飞机、情侣打卡、成就徽章
 * 聊天消息的云端同步已在 chatroom-v1.js 中处理
 */

(function() {
  'use strict';

  const API_BASE = 'https://ws.shushu-bibi.cn';

  // ========== 初始化 ==========

  async function init() {
    console.log('[CloudSync] v1.0 开始云端同步...');
    await Promise.all([
      syncPaperplanes(),
      syncScores(),
      syncAchievements(),
    ]);
    console.log('[CloudSync] 云端同步完成');
  }

  // ========== 纸飞机同步 ==========

  async function syncPaperplanes() {
    try {
      const resp = await fetch(API_BASE + '/api/paperplanes?limit=100');
      if (!resp.ok) return;
      const data = await resp.json();
      if (!data.success || !data.paperplanes) return;

      // 合并到 localStorage 的两个 key
      const cloudPlanes = data.paperplanes.map(p => ({
        id: p.id,
        msg: p.message,
        sender: p.from_user === 'shushu' ? '我' : '笔笔',
        senderIcon: p.from_user === 'shushu' ? '🐹' : '🐱',
        time: new Date(p.created_at).toLocaleString('zh-CN'),
        timestamp: p.created_at,
        read: false,
      }));

      const existingSent = JSON.parse(localStorage.getItem('paperplanes_sent') || '[]');
      const existingRecv = JSON.parse(localStorage.getItem('paperplanes_received') || '[]');
      const existingIds = new Set([...existingSent, ...existingRecv].map(p => p.id));

      const newPlanes = cloudPlanes.filter(p => !existingIds.has(p.id));
      if (!newPlanes.length) return;

      // 分配：自己发的→sent，对方发的→received
      const sent = [...existingSent];
      const recv = [...existingRecv];
      for (const p of newPlanes) {
        if (p.sender === '我') sent.unshift(p);
        else recv.unshift(p);
      }

      localStorage.setItem('paperplanes_sent', JSON.stringify(sent));
      localStorage.setItem('paperplanes_received', JSON.stringify(recv));

      // 触发渲染
      window.dispatchEvent(new StorageEvent('storage', { key: 'paperplanes_received' }));

      console.log('[CloudSync] 纸飞机: 加载了 ' + newPlanes.length + ' 条云端记录');
    } catch (e) {
      console.log('[CloudSync] 纸飞机同步失败:', e.message);
    }
  }

  // ========== 情侣打卡同步 ==========

  async function syncScores() {
    try {
      const resp = await fetch(API_BASE + '/api/scores?limit=50');
      if (!resp.ok) return;
      const data = await resp.json();
      if (!data.success || !data.scores) return;

      const cloudScores = data.scores.map(s => ({
        taskId: s.task_name,
        taskName: s.task_name,
        proof: s.proof,
        stars: s.stars,
        completedAt: new Date(s.completed_at).toISOString(),
        completedBy: s.created_by,
      }));

      // 合并到 localStorage
      const existing = JSON.parse(localStorage.getItem('game_completed_tasks') || '[]');
      const existingKeys = new Set(existing.map(t => t.taskId + '_' + t.completedAt));

      const newScores = cloudScores.filter(s => !existingKeys.has(s.taskId + '_' + s.completedAt));
      if (!newScores.length) return;

      localStorage.setItem('game_completed_tasks', JSON.stringify([...newScores, ...existing]));
      console.log('[CloudSync] 情侣打卡: 加载了 ' + newScores.length + ' 条云端记录');
    } catch (e) {
      console.log('[CloudSync] 打卡同步失败:', e.message);
    }
  }

  // ========== 成就徽章同步 ==========

  async function syncAchievements() {
    try {
      const resp = await fetch(API_BASE + '/api/achievements');
      if (!resp.ok) return;
      const data = await resp.json();
      if (!data.success || !data.achievements) return;

      const cloudBadges = data.achievements.map(a => ({
        id: a.id,
        name: a.name,
        description: a.description,
        icon: a.icon || '🏆',
        unlockedAt: new Date(a.unlocked_at).toISOString(),
      }));

      // 合并到 localStorage
      const existing = JSON.parse(localStorage.getItem('couple_badges') || '[]');
      const existingIds = new Set(existing.map(b => b.id));
      const newBadges = cloudBadges.filter(b => !existingIds.has(b.id));

      if (!newBadges.length) return;

      localStorage.setItem('couple_badges', JSON.stringify([...newBadges, ...existing]));
      console.log('[CloudSync] 成就徽章: 加载了 ' + newBadges.length + ' 个云端徽章');
    } catch (e) {
      console.log('[CloudSync] 成就同步失败:', e.message);
    }
  }

  // ========== 导出 API ==========
  // 各模块在保存数据时调用这些函数，同步推送到 D1

  window.CloudSync = {
    // 保存纸飞机到 D1
    savePaperplane: async function(plane) {
      try {
        await fetch(API_BASE + '/api/paperplanes', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            id: String(plane.id),
            from_user: plane.sender === '我' ? (localStorage.getItem('current_user') || 'shushu') : 'bibi',
            message: plane.msg,
            color: '#ff6b9d',
            position_x: Math.random() * 80 + 10,
            position_y: Math.random() * 60 + 10,
            created_at: plane.timestamp || Date.now(),
          }),
        });
      } catch (e) {
        console.log('[CloudSync] 纸飞机推送失败:', e.message);
      }
    },

    // 保存打卡到 D1
    saveScore: async function(task) {
      try {
        await fetch(API_BASE + '/api/scores', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            task_name: task.taskName || task.taskId || '未知',
            proof: task.proof || '',
            stars: task.stars || 0,
            completed_at: task.completedAt ? new Date(task.completedAt).getTime() : Date.now(),
            created_by: localStorage.getItem('current_user') || 'shushu',
          }),
        });
      } catch (e) {
        console.log('[CloudSync] 打卡推送失败:', e.message);
      }
    },

    // 保存成就到 D1
    saveAchievement: async function(badge) {
      try {
        await fetch(API_BASE + '/api/achievements', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            id: badge.id,
            name: badge.name,
            description: badge.description || '',
            icon: badge.icon || '🏆',
            unlocked_at: badge.unlockedAt ? new Date(badge.unlockedAt).getTime() : Date.now(),
          }),
        });
      } catch (e) {
        console.log('[CloudSync] 成就推送失败:', e.message);
      }
    },

    // 手动触发全部同步
    syncAll: async function() {
      await Promise.all([syncPaperplanes(), syncScores(), syncAchievements()]);
    },
  };

  // ========== 启动 ==========

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

})();
