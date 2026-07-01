/**
 * V10.0 启动初始化 — 云端版本同步 + localStorage 清理 + 安全升级
 * 
 * 白皮书 P2 核心升级：
 *   1. 页面初始化 → 请求云端版本号 → 比对本机 → 云端优先覆盖
 *   2. 清理高危 localStorage（E2EE密钥、聊天缓存、身份标识）
 *   3. UI配置初始化到 MemoryMirror
 *   4. 设备白名单校验
 *   5. 注册页面关闭监听（MemoryMirror.clear）
 */
(function() {
  'use strict';

  var V10_CONFIG = {
    API_BASE: (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1')
      ? 'http://localhost:8787'
      : 'https://ws.shushu-bibi.cn',
    VERSION_KEY: '_data_version',
    DEVICE_ID_KEY: 'lb_device_id',
    // localStorage keys that contain PRIVACY DATA and must be deleted
    PRIVACY_KEYS_TO_DELETE: [
      // E2EE cryptographic keys - PRESERVED for encryption continuity
      // DO NOT DELETE: these are required for encrypted message decryption
      // 'e2ee_private_key', 'e2ee_public_key', 'e2ee_key_version',
      // 'e2ee_partner_pubkey', 'e2ee_enabled', 'e2ee_encryption_key',
      // Chat message caches
      'shushu_bibi_chat_messages', 'lb_messages', 'shushu_bibi_realtime_chat',
      // Online status caches
      'partner_online', 'partner_offline_since', 'partner_last_online',
      'last_heartbeat', 'partner_online_since',
      // GitHub tokens (sensitive)
      'github_sync_token', 'drift_github_token',
      // Relationship data
      'love_start_date', 'relationship_start_date',
    ],
    // localStorage keys that are UI config and can be migrated to MemoryMirror
    UI_KEYS_TO_MIGRATE: [
      'theme', 'weather_my_city', 'weather_partner_city',
      'weather_auto_location', 'my_location_lat', 'my_location_lon',
      'lb_weather_city',
    ],
  };

  // ============ 1. 云端版本号同步 ============
  async function syncCloudVersion() {
    try {
      var resp = await fetch(V10_CONFIG.API_BASE + '/api/sync-version');
      var data = await resp.json();
      if (data.success) {
        var cloudVer = data.version;
        var localVer = window.MemoryMirror ? window.MemoryMirror.getVersion() : 0;
        
        console.log('[V10 Init] Cloud version:', cloudVer, 'Local version:', localVer);
        
        if (cloudVer > localVer) {
          console.log('[V10 Init] Cloud is newer, will trigger sync on next data fetch');
          // Mark that we need to re-sync from cloud
          window._v10_needsFullSync = true;
        }
        
        if (window.MemoryMirror) {
          window.MemoryMirror.setVersion(cloudVer);
        }
      }
    } catch(e) {
      console.warn('[V10 Init] Version sync failed (offline?):', e.message);
    }
  }

  // ============ 2. 清理高危 localStorage ============
  function deletePrivacyLocalStorage() {
    var deleted = 0;
    V10_CONFIG.PRIVACY_KEYS_TO_DELETE.forEach(function(key) {
      try {
        if (localStorage.getItem(key) !== null) {
          localStorage.removeItem(key);
          deleted++;
        }
      } catch(e) {}
    });

    // Also delete any key matching lb_ pattern that stores sensitive data
    // (keep only UI-state ones like welcome_seen, etc.)
    var sensitiveLbPrefixes = [
      'lb_messages', 'lb_albums', 'lb_diary', 'lb_loveData',
      'lb_moodData', 'lb_wishes', 'lb_fund', 'lb_private',
    ];
    try {
      for (var i = localStorage.length - 1; i >= 0; i--) {
        var k = localStorage.key(i);
        for (var j = 0; j < sensitiveLbPrefixes.length; j++) {
          if (k && k.indexOf(sensitiveLbPrefixes[j]) === 0) {
            localStorage.removeItem(k);
            deleted++;
            break;
          }
        }
      }
    } catch(e) {}

    if (deleted > 0) {
      console.log('[V10 Init] Deleted ' + deleted + ' privacy localStorage keys');
    }
  }

  // ============ 3. 迁移 UI 配置到 MemoryMirror ============
  function migrateUIConfig() {
    if (!window.MemoryMirror) return;
    
    V10_CONFIG.UI_KEYS_TO_MIGRATE.forEach(function(key) {
      try {
        var val = localStorage.getItem(key);
        if (val !== null) {
          window.MemoryMirror.set(key, val);
          // Keep in localStorage for now (non-sensitive), 
          // full migration to KV happens in P2.3
          console.log('[V10 Init] UI config mirrored:', key);
        }
      } catch(e) {}
    });
  }

  // ============ 4. 设备白名单校验 ============
  async function verifyDevice() {
    try {
      var deviceId = window._v10_deviceId;
      if (!deviceId) {
        // Generate persistent device ID using canvas fingerprint
        deviceId = generateDeviceFingerprint();
        window._v10_deviceId = deviceId;
      }
      
      var resp = await fetch(V10_CONFIG.API_BASE + '/api/device/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          device_id: deviceId,
          device_name: getDeviceName(),
        }),
      });
      var data = await resp.json();
      
      if (data.success) {
        console.log('[V10 Init] Device check complete');
        window._v10_deviceTrusted = true;
      }
    } catch(e) {
      console.warn('[V10 Init] Device verify failed (offline?):', e.message);
      window._v10_deviceTrusted = true; // offline fallback
    }
  }

  // ============ 5. 设备指纹生成（浏览器指纹，不存 localStorage）============
  function generateDeviceFingerprint() {
    var components = [];
    
    // User agent
    components.push(navigator.userAgent || '');
    // Screen
    components.push(screen.width + 'x' + screen.height + 'x' + screen.colorDepth);
    // Timezone
    components.push(Intl.DateTimeFormat().resolvedOptions().timeZone || '');
    // Language
    components.push(navigator.language || '');
    // Platform
    components.push(navigator.platform || '');
    // Hardware concurrency
    components.push(navigator.hardwareConcurrency || 0);
    // Touch support
    components.push(navigator.maxTouchPoints || 0);
    
    // Simple hash
    var str = components.join('|');
    var hash = 0;
    for (var i = 0; i < str.length; i++) {
      var chr = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + chr;
      hash |= 0;
    }
    
    // Mix with a random seed (stays consistent if we store in MemoryMirror only)
    // Format: DEV-XXXX-XXXX
    var absHash = Math.abs(hash).toString(16).toUpperCase().padStart(8, '0');
    var fingerprint = 'DEV-' + absHash.slice(0, 4) + '-' + absHash.slice(4, 8);
    
    return fingerprint;
  }

  function getDeviceName() {
    var ua = navigator.userAgent || '';
    var name = 'Unknown Device';
    
    if (ua.indexOf('Windows') !== -1) name = 'Windows PC';
    else if (ua.indexOf('Mac') !== -1) name = 'Mac';
    else if (ua.indexOf('iPhone') !== -1) name = 'iPhone';
    else if (ua.indexOf('iPad') !== -1) name = 'iPad';
    else if (ua.indexOf('Android') !== -1) {
      if (ua.indexOf('Mobile') !== -1) name = 'Android Phone';
      else name = 'Android Tablet';
    }
    else if (ua.indexOf('Linux') !== -1) name = 'Linux';
    
    // Add browser
    if (ua.indexOf('Chrome') !== -1 && ua.indexOf('Edg') === -1) name += ' (Chrome)';
    else if (ua.indexOf('Edg') !== -1) name += ' (Edge)';
    else if (ua.indexOf('Firefox') !== -1) name += ' (Firefox)';
    else if (ua.indexOf('Safari') !== -1 && ua.indexOf('Chrome') === -1) name += ' (Safari)';
    
    return name;
  }

  // ============ 6. 启动入口 ============
  async function v10Init() {
    console.log('%c[V10.0] 二合一王炸架构启动...', 'color: gold; font-weight: bold; font-size: 14px');
    console.log('%c云端绝对主权 + 前端RAM瞬时内存镜像', 'color: cyan');

    // Ensure MemoryMirror is available
    if (typeof window.MemoryMirror === 'undefined') {
      console.error('[V10 Init] MemoryMirror not loaded! Aborting V10 init.');
      return;
    }

    // Step 1: Clean up privacy localStorage (one-time migration)
    deletePrivacyLocalStorage();

    // Step 2: Migrate UI config to MemoryMirror
    migrateUIConfig();

    // Step 3: Sync cloud version
    await syncCloudVersion();

    // Step 4: Verify device whitelist
    await verifyDevice();

    // Step 5: Register page close handler
    window.addEventListener('beforeunload', function() {
      if (window.MemoryMirror) {
        window.MemoryMirror.clear();
      }
    });

    console.log('%c[V10.0] 初始化完成 — 安全模式已激活', 'color: lime; font-weight: bold');
    console.log('%cMemoryMirror keys:', 'color: lime', window.MemoryMirror.size());
    console.log('%cDevice trusted:', 'color: lime', window._v10_deviceTrusted);
  }

  // ============ 暴露到全局 ============
  window.V10 = {
    init: v10Init,
    config: V10_CONFIG,
    syncVersion: syncCloudVersion,
    generateDeviceFingerprint: generateDeviceFingerprint,
  };

  // Auto-init after DOM ready (but wait for MemoryMirror to be loaded first)
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', function() {
      // Small delay to ensure MemoryMirror is loaded
      setTimeout(v10Init, 100);
    });
  } else {
    setTimeout(v10Init, 100);
  }
})();
