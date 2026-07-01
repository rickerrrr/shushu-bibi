/**
 * MemoryMirror v10.0 — 前端 RAM 瞬时内存镜像层
 * 
 * 白皮书核心：真实数据永不落地本地，页面关闭彻底蒸发
 * 
 * 规则：
 *   - 完全不等于 localStorage/SessionStorage
 *   - 仅存浏览器运行时内存 RAM（Map 结构）
 *   - 不写入硬盘、不持久、不残留
 *   - 页面打开 → 拉取云端 → 存 RAM → 页面关闭清零
 *   - 多标签通过 BroadcastChannel 共享内存镜像
 *   
 * 使用方式：
 *   MemoryMirror.set('theme', 'dark')       // 仅存内存，不落盘
 *   MemoryMirror.get('theme')                // 从内存读取
 *   MemoryMirror.sync('config', cloudValue)  // 云端同步到内存
 *   MemoryMirror.clear()                     // 页面关闭时调用，全部清零
 */
(function() {
  'use strict';

  // ============ 内存数据仓库（纯 RAM，永不落盘）============
  const _store = new Map();
  
  // ============ BroadcastChannel 多标签页共享 ============
  let _channel = null;
  let _channelName = 'shushu-bibi-mirror';
  
  try {
    if (typeof BroadcastChannel !== 'undefined') {
      _channel = new BroadcastChannel(_channelName);
      _channel.onmessage = function(ev) {
        if (ev.data && ev.data.type === 'mirror-sync') {
          const { key, value } = ev.data;
          if (value === undefined) {
            _store.delete(key);
          } else {
            _store.set(key, value);
          }
          console.log('[MemoryMirror] Broadcast sync:', key, typeof value === 'object' ? 'object' : value);
        }
        if (ev.data && ev.data.type === 'mirror-broadcast') {
          // Multi-tab: new tab gets existing memory state
          if (ev.data.store && Array.isArray(ev.data.store)) {
            ev.data.store.forEach(function(item) {
              if (item[1] === undefined) {
                _store.delete(item[0]);
              } else {
                _store.set(item[0], item[1]);
              }
            });
            console.log('[MemoryMirror] Initialized from existing tab, keys:', _store.size);
          }
        }
      };
      // Request existing state from other tabs
      _channel.postMessage({ type: 'mirror-broadcast', store: [] });
    }
  } catch(e) {
    console.warn('[MemoryMirror] BroadcastChannel not available:', e.message);
  }

  // ============ 公开 API ============
  window.MemoryMirror = {
    /**
     * 从云端拉取数据并存入内存镜像
     * @param {string} key - 数据键名
     * @param {*} cloudValue - 云端真值
     */
    sync: function(key, cloudValue) {
      _store.set(key, cloudValue);
      if (_channel) {
        try { _channel.postMessage({ type: 'mirror-sync', key: key, value: cloudValue }); } catch(e) {}
      }
      return cloudValue;
    },

    /**
     * 读取内存镜像（绝不读 localStorage）
     * @param {string} key
     * @param {*} defaultValue
     */
    get: function(key, defaultValue) {
      if (_store.has(key)) return _store.get(key);
      return defaultValue !== undefined ? defaultValue : null;
    },

    /**
     * 写入内存镜像（绝不写 localStorage）
     * @param {string} key
     * @param {*} value
     */
    set: function(key, value) {
      _store.set(key, value);
      if (_channel) {
        try { _channel.postMessage({ type: 'mirror-sync', key: key, value: value }); } catch(e) {}
      }
    },

    /**
     * 删除内存镜像中的某个键
     */
    remove: function(key) {
      _store.delete(key);
      if (_channel) {
        try { _channel.postMessage({ type: 'mirror-sync', key: key, value: undefined }); } catch(e) {}
      }
    },

    /**
     * 检查键是否存在
     */
    has: function(key) {
      return _store.has(key);
    },

    /**
     * 获取所有键名
     */
    keys: function() {
      return Array.from(_store.keys());
    },

    /**
     * 获取内存镜像大小（键数量）
     */
    size: function() {
      return _store.size;
    },

    /**
     * 导出当前内存镜像快照（调试用）
     */
    dump: function() {
      var obj = {};
      _store.forEach(function(v, k) { obj[k] = v; });
      return obj;
    },

    /**
     * 页面关闭时调用：彻底清空内存镜像
     * 不残留任何数据在 RAM 中
     */
    clear: function() {
      var count = _store.size;
      _store.clear();
      if (_channel) {
        try { _channel.close(); } catch(e) {}
        _channel = null;
      }
      console.log('[MemoryMirror] Cleared ' + count + ' keys, page closing');
    },

    /**
     * 从 localStorage 迁移到内存镜像（一次性迁移，之后删除 localStorage）
     * @param {string} key - localStorage key
     * @param {function} transform - 可选转换函数
     */
    migrate: function(key, transform) {
      try {
        var raw = localStorage.getItem(key);
        if (raw === null) return null;
        var value = raw;
        try { value = JSON.parse(raw); } catch(e) { /* keep as string */ }
        if (typeof transform === 'function') value = transform(value);
        _store.set(key, value);
        localStorage.removeItem(key);
        console.log('[MemoryMirror] Migrated from localStorage:', key);
        return value;
      } catch(e) {
        console.warn('[MemoryMirror] Migration failed for', key, e.message);
        return null;
      }
    },

    /**
     * 获取当前版本号（从内存）
     */
    getVersion: function() {
      return _store.get('_data_version') || 0;
    },

    /**
     * 更新版本号
     */
    setVersion: function(ver) {
      _store.set('_data_version', ver);
    }
  };

  // ============ 页面关闭自动清理（安全保证）============
  function _onPageClose() {
    // 在 beforeunload 中做最终清理
    if (window.MemoryMirror) {
      window.MemoryMirror.clear();
    }
  }

  // beforeunload: 页面刷新/关闭前清理
  window.addEventListener('beforeunload', _onPageClose);

  // pagehide: iOS Safari 切后台/关闭时也会触发
  window.addEventListener('pagehide', _onPageClose);

  // visibilitychange: Safari 切后台时不清理（允许恢复），仅在 hidden 时暂存
  window.addEventListener('visibilitychange', function() {
    if (document.hidden) {
      // Safari 可能回收内存，暂不做清理，避免丢失
      // 只在 pagehide/beforeunload 时才真正清理
      console.log('[MemoryMirror] Page hidden, keeping memory alive');
    } else {
      // 恢复时，检查是否需要从其他标签同步
      console.log('[MemoryMirror] Page visible, keys in memory:', _store.size);
    }
  });

  console.log('[MemoryMirror] v10.0 initialized — RAM-only, no localStorage persistence');
})();
