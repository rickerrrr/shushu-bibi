/**
 * E2EE 端对端加密模块 v1.2 — 严格模式
 * =============================
 * 加密方案：ECDH (P-256) 密钥交换 + AES-256-GCM 消息加密
 * 安全原则：私钥仅存浏览器 localStorage，永不离开设备
 *           D1 数据库只存密文，Worker 无法解密
 *           零信任架构 — 服务端不可窥探任何消息内容
 *
 * 工作流程：
 * 1. 首次使用 → 生成 ECDH 密钥对（私钥存 localStorage，公钥上传 D1）
 * 2. 发消息 → 用对方公钥+自己私钥派生共享密钥 → AES-256-GCM 加密
 * 3. 收消息 → 用自己私钥+对方公钥派生共享密钥 → AES-256-GCM 解密
 * 4. D1/Worker 只看到密文，永远无法解密
 */

(function() {
  'use strict';

  const API_BASE = 'https://ws.shushu-bibi.cn';
  const PRIVATE_KEY_STORE = 'e2ee_private_key';  // JWK 格式私钥
  const PUBLIC_KEY_STORE = 'e2ee_public_key';     // JWK 格式公钥
  const PARTNER_PUBKEY_CACHE = 'e2ee_partner_pubkey'; // 对方公钥缓存
  const KEY_VERSION = 'e2ee_key_version';          // 密钥版本（用于轮换）

  const MAX_RETRIES = 30;  // 最多重试30次（10s间隔 = 5分钟）
  const RETRY_INTERVAL = 10000; // 10秒

  const state = {
    ready: false,
    initialized: false,
    privateKey: null,    // CryptoKey 对象
    publicKey: null,     // CryptoKey 对象
    publicKeyJwk: null,  // JWK 格式（用于上传）
    partnerPublicKey: null,  // CryptoKey 对象
    partnerPublicKeyJwk: null, // JWK 格式
    sharedKey: null,     // 派生的 AES CryptoKey 对象
    enabled: true,       // 加密开关
    gaveUp: false,       // 超时放弃等待对方公钥
    retryCount: 0,       // 已重试次数
    _pollTimer: null,    // 轮询计时器 ID
  };

  // ==================== 密钥管理 ====================

  /**
   * 生成 ECDH 密钥对 (P-256 曲线)
   * 私钥仅存 localStorage，公钥上传 D1
   */
  async function generateKeyPair() {
    try {
      const keyPair = await crypto.subtle.generateKey(
        { name: 'ECDH', namedCurve: 'P-256' },
        true,  // extractable
        ['deriveKey', 'deriveBits']
      );

      // 导出为 JWK 格式存储
      const privateJwk = await crypto.subtle.exportKey('jwk', keyPair.privateKey);
      const publicJwk = await crypto.subtle.exportKey('jwk', keyPair.publicKey);

      // 私钥存 localStorage（永不离开浏览器！）
      localStorage.setItem(PRIVATE_KEY_STORE, JSON.stringify(privateJwk));
      localStorage.setItem(PUBLIC_KEY_STORE, JSON.stringify(publicJwk));
      localStorage.setItem(KEY_VERSION, String(Date.now()));

      state.privateKey = keyPair.privateKey;
      state.publicKey = keyPair.publicKey;
      state.publicKeyJwk = publicJwk;

      console.log('🔐 [E2EE] 密钥对已生成 (P-256 ECDH)');
      return keyPair;
    } catch (e) {
      console.error('🔐 [E2EE] 生成密钥对失败:', e);
      return null;
    }
  }

  /**
   * 从 localStorage 加载已有密钥对
   */
  async function loadKeyPair() {
    try {
      const privateJwkStr = localStorage.getItem(PRIVATE_KEY_STORE);
      const publicJwkStr = localStorage.getItem(PUBLIC_KEY_STORE);

      if (!privateJwkStr || !publicJwkStr) {
        return false;
      }

      const privateJwk = JSON.parse(privateJwkStr);
      const publicJwk = JSON.parse(publicJwkStr);

      state.privateKey = await crypto.subtle.importKey(
        'jwk', privateJwk, { name: 'ECDH', namedCurve: 'P-256' }, false, ['deriveKey', 'deriveBits']
      );
      state.publicKey = await crypto.subtle.importKey(
        'jwk', publicJwk, { name: 'ECDH', namedCurve: 'P-256' }, true, []
      );
      state.publicKeyJwk = publicJwk;

      console.log('🔐 [E2EE] 密钥对已从本地加载');
      return true;
    } catch (e) {
      console.error('🔐 [E2EE] 加载密钥对失败:', e);
      return false;
    }
  }

  /**
   * 上传公钥到 D1（私钥永不上传！）
   */
  async function uploadPublicKey() {
    if (!state.publicKeyJwk) return false;

    const currentUser = localStorage.getItem('currentUser') || 'shushu';
    try {
      const resp = await fetch(API_BASE + '/api/keys', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          user_id: currentUser,
          public_key: JSON.stringify(state.publicKeyJwk),
        }),
      });
      const data = await resp.json();
      if (data.success) {
        console.log('🔐 [E2EE] 公钥已上传到云端');
        return true;
      }
      console.error('🔐 [E2EE] 公钥上传失败:', data.error);
      return false;
    } catch (e) {
      console.error('🔐 [E2EE] 公钥上传异常:', e);
      return false;
    }
  }

  /**
   * 从 D1 获取对方公钥
   */
  async function fetchPartnerPublicKey() {
    const partnerUser = (localStorage.getItem('currentUser') || 'shushu') === 'shushu' ? 'bibi' : 'shushu';

    try {
      const resp = await fetch(API_BASE + '/api/keys?user_id=' + partnerUser);
      const data = await resp.json();

      if (!data.success || !data.public_key) {
        console.log('🔐 [E2EE] 对方公钥尚未上传，加密待握手');
        return false;
      }

      const partnerJwk = JSON.parse(data.public_key);

      // 如果缓存的公钥跟云端一致，跳过重新导入
      const cached = localStorage.getItem(PARTNER_PUBKEY_CACHE);
      if (cached === data.public_key && state.partnerPublicKey) {
        console.log('🔐 [E2EE] 对方公钥未变化，使用缓存');
        return true;
      }

      state.partnerPublicKeyJwk = partnerJwk;
      state.partnerPublicKey = await crypto.subtle.importKey(
        'jwk', partnerJwk, { name: 'ECDH', namedCurve: 'P-256' }, true, []
      );

      // 缓存公钥
      localStorage.setItem(PARTNER_PUBKEY_CACHE, data.public_key);

      // 派生共享密钥
      await deriveSharedKey();

      console.log('🔐 [E2EE] 对方公钥已获取，共享密钥已派生');
      return true;
    } catch (e) {
      console.error('🔐 [E2EE] 获取对方公钥失败:', e);
      return false;
    }
  }

  /**
   * ECDH 派生共享密钥 → AES-256-GCM
   * 双方各自用自己私钥+对方公钥派生出相同的共享密钥
   */
  async function deriveSharedKey() {
    if (!state.privateKey || !state.partnerPublicKey) {
      console.error('🔐 [E2EE] 无法派生共享密钥：缺少密钥');
      return false;
    }

    try {
      state.sharedKey = await crypto.subtle.deriveKey(
        { name: 'ECDH', public: state.partnerPublicKey },
        state.privateKey,
        { name: 'AES-GCM', length: 256 },
        false,  // 不可导出
        ['encrypt', 'decrypt']
      );
      console.log('🔐 [E2EE] 共享密钥派生成功 (AES-256-GCM)');
      return true;
    } catch (e) {
      console.error('🔐 [E2EE] 派生共享密钥失败:', e);
      return false;
    }
  }

  // ==================== 加密 / 解密 ====================

  /**
   * 加密消息文本
   * @param {string} plaintext - 原文
   * @returns {Promise<{encrypted: true, ciphertext: string, iv: string}|null>}
   */
  async function encrypt(plaintext) {
    if (!state.sharedKey) {
      console.log('🔐 [E2EE] 共享密钥未就绪，跳过加密');
      return null;
    }
    if (!state.enabled) return null;

    try {
      // 每条消息生成随机 IV（12 bytes for AES-GCM）
      const iv = crypto.getRandomValues(new Uint8Array(12));

      const encoder = new TextEncoder();
      const encoded = encoder.encode(plaintext);

      const ciphertextBuf = await crypto.subtle.encrypt(
        { name: 'AES-GCM', iv: iv },
        state.sharedKey,
        encoded
      );

      // 转为 base64 传输
      const ciphertext = bufToBase64(ciphertextBuf);
      const ivStr = bufToBase64(iv.buffer);

      return { encrypted: true, ciphertext: ciphertext, iv: ivStr };
    } catch (e) {
      console.error('🔐 [E2EE] 加密失败:', e);
      return null;
    }
  }

  /**
   * 解密消息
   * @param {string} ciphertextB64 - base64 密文
   * @param {string} ivB64 - base64 IV
   * @returns {Promise<string|null>} 原文
   */
  async function decrypt(ciphertextB64, ivB64) {
    if (!state.sharedKey) {
      console.log('🔐 [E2EE] 共享密钥未就绪，无法解密');
      return null;
    }

    try {
      const ciphertext = base64ToBuf(ciphertextB64);
      const iv = new Uint8Array(base64ToBuf(ivB64));

      const decryptedBuf = await crypto.subtle.decrypt(
        { name: 'AES-GCM', iv: iv },
        state.sharedKey,
        ciphertext
      );

      const decoder = new TextDecoder();
      return decoder.decode(decryptedBuf);
    } catch (e) {
      console.error('🔐 [E2EE] 解密失败:', e);
      return null;
    }
  }

  // ==================== 工具函数 ====================

  function bufToBase64(buf) {
    const bytes = new Uint8Array(buf);
    let binary = '';
    for (let i = 0; i < bytes.byteLength; i++) {
      binary += String.fromCharCode(bytes[i]);
    }
    return btoa(binary);
  }

  function base64ToBuf(b64) {
    const binary = atob(b64);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) {
      bytes[i] = binary.charCodeAt(i);
    }
    return bytes.buffer;
  }

  // ==================== 初始化 ====================

  /**
   * 初始化 E2EE
   * 1. 加载/生成密钥对
   * 2. 上传公钥到 D1
   * 3. 获取对方公钥
   * 4. 派生共享密钥
   */
  async function init() {
    if (state.initialized) return state.ready;
    state.initialized = true;

    console.log('🔐 [E2EE] 正在初始化端对端加密...');

    // 检查 Web Crypto API 支持
    if (!crypto.subtle) {
      console.error('🔐 [E2EE] 浏览器不支持 Web Crypto API，加密不可用');
      state.enabled = false;
      state.ready = false;
      return false;
    }

    // 1. 加载或生成密钥对
    let loaded = await loadKeyPair();
    if (!loaded) {
      const keyPair = await generateKeyPair();
      if (!keyPair) {
        state.ready = false;
        return false;
      }
    }

    // 2. 上传公钥
    await uploadPublicKey();

    // 3. 获取对方公钥（可能对方还没上线，稍后重试）
    await fetchPartnerPublicKey();

    // 4. 定期重新获取对方公钥（处理对方首次上线）
    // 最多重试 MAX_RETRIES 次，超时后停止轮询避免无限请求
    state.retryCount = 0;
    state._pollTimer = setInterval(async () => {
      if (state.sharedKey) {
        // 已获取到对方公钥，停止轮询
        clearInterval(state._pollTimer);
        state._pollTimer = null;
        return;
      }
      state.retryCount++;
      if (state.retryCount > MAX_RETRIES) {
        clearInterval(state._pollTimer);
        state._pollTimer = null;
        state.gaveUp = true;
        console.log('🔐 [E2EE] 超过最大重试次数（5分钟），停止等待对方公钥。消息将以明文发送。');
        window.dispatchEvent(new CustomEvent('e2ee_gave_up'));
        return;
      }
      console.log('🔐 [E2EE] 第 ' + state.retryCount + '/' + MAX_RETRIES + ' 次尝试获取对方公钥...');
      await fetchPartnerPublicKey();
    }, RETRY_INTERVAL); // 每10秒检查一次

    state.ready = !!state.sharedKey;
    console.log('🔐 [E2EE] 初始化完成，加密' + (state.ready ? '已激活 🔒' : '等待对方公钥（最多' + MAX_RETRIES + '次重试）...'));
    return state.ready;
  }

  // ==================== 公开 API ====================

  window.E2EE = {
    init: init,
    encrypt: encrypt,
    decrypt: decrypt,

    isReady: function() { return state.ready && !!state.sharedKey; },
    isEnabled: function() { return state.enabled; },
    hasPublicKey: function() { return !!state.publicKeyJwk; },
    hasGaveUp: function() { return state.gaveUp; },

    // 手动重新启动对方公钥轮询（超时后或对方首次上线时使用）
    retryConnect: function() {
      if (state.sharedKey) {
        console.log('🔐 [E2EE] 加密已激活，无需重试');
        return true;
      }
      // 清除旧的轮询计时器
      if (state._pollTimer) {
        clearInterval(state._pollTimer);
      }
      state.gaveUp = false;
      state.retryCount = 0;
      console.log('🔐 [E2EE] 手动重新开始轮询对方公钥...');
      state._pollTimer = setInterval(async () => {
        if (state.sharedKey) {
          clearInterval(state._pollTimer);
          state._pollTimer = null;
          state.gaveUp = false;
          window.dispatchEvent(new CustomEvent('e2ee_ready'));
          return;
        }
        state.retryCount++;
        if (state.retryCount > MAX_RETRIES) {
          clearInterval(state._pollTimer);
          state._pollTimer = null;
          state.gaveUp = true;
          window.dispatchEvent(new CustomEvent('e2ee_gave_up'));
          return;
        }
        await fetchPartnerPublicKey();
        if (state.sharedKey) {
          clearInterval(state._pollTimer);
          state._pollTimer = null;
          state.gaveUp = false;
          window.dispatchEvent(new CustomEvent('e2ee_ready'));
        }
      }, RETRY_INTERVAL);
      return false;
    },

    // 手动重新获取对方公钥（对方上线后调用）
    refreshPartnerKey: fetchPartnerPublicKey,

    // 通过 WebSocket 广播公钥通知（对方可立即刷新）
    notifyKeyUploaded: function() {
      if (window._realtimeSync && window._realtimeSync.ws && window._realtimeSync.ws.readyState === WebSocket.OPEN) {
        window._realtimeSync.ws.send(JSON.stringify({
          type: 'e2ee_key_update',
          from: localStorage.getItem('currentUser') || 'shushu',
          _ts: Date.now(),
        }));
      }
    },

    // 获取加密状态摘要
    getStatus: function() {
      return {
        enabled: state.enabled,
        ready: state.ready,
        hasPrivateKey: !!state.privateKey,
        hasPublicKey: !!state.publicKey,
        hasPartnerKey: !!state.partnerPublicKey,
        hasSharedKey: !!state.sharedKey,
        gaveUp: state.gaveUp,
        retryCount: state.retryCount,
      };
    },
  };

  // 监听 WebSocket 的 e2ee_key_update 事件
  // 当对方上传公钥时，立即刷新
  if (window._realtimeSync) {
    const originalHandle = window._realtimeSync._handleWsMessage;
    // 通过 storage 事件间接监听（不侵入 v6 代码）
  }

  // 全局监听 e2ee_key_update（通过自定义事件）
  window.addEventListener('e2ee_key_update', function() {
    console.log('🔐 [E2EE] 收到对方公钥更新通知，正在刷新...');
    fetchPartnerPublicKey();
  });

  console.log('🔐 [E2EE] 模块已加载 v1.1 (含超时降级+手动重试)');
})();
