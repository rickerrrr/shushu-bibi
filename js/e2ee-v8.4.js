/**
 * 端到端加密模块 v8.4
 * 使用 Web Crypto API 实现消息加密
 */

(function() {
  'use strict';

  const E2EE_ENABLED_KEY = 'e2ee_enabled';
  const E2EE_KEY_KEY = 'e2ee_key'; // 简化版本：预共享密钥

  let encryptionKey = null;

  // ========== 初始化 ==========

  async function initE2EE() {
    const enabled = localStorage.getItem(E2EE_ENABLED_KEY) === 'true';
    if (!enabled) return false;

    const storedKey = localStorage.getItem(E2EE_KEY_KEY);
    if (storedKey) {
      encryptionKey = await importKey(storedKey);
      return true;
    }

    return false;
  }

  // ========== 密钥管理 ==========

  async function generateKey() {
    const key = await window.crypto.subtle.generateKey(
      { name: 'AES-GCM', length: 256 },
      true,
      ['encrypt', 'decrypt']
    );
    encryptionKey = key;
    const exported = await window.crypto.subtle.exportKey('raw', key);
    const b64 = btoa(String.fromCharCode(...new Uint8Array(exported)));
    localStorage.setItem(E2EE_KEY_KEY, b64);
    return b64;
  }

  async function importKey(b64) {
    const raw = Uint8Array.from(atob(b64), c => c.charCodeAt(0));
    return await window.crypto.subtle.importKey(
      'raw',
      raw,
      { name: 'AES-GCM' },
      true,
      ['encrypt', 'decrypt']
    );
  }

  // ========== 加密/解密 ==========

  async function encrypt(text) {
    if (!encryptionKey) return text;

    const encoder = new TextEncoder();
    const data = encoder.encode(text);
    const iv = window.crypto.getRandomValues(new Uint8Array(12));

    const encrypted = await window.crypto.subtle.encrypt(
      { name: 'AES-GCM', iv: iv },
      encryptionKey,
      data
    );

    const combined = new Uint8Array(iv.length + encrypted.byteLength);
    combined.set(iv);
    combined.set(new Uint8Array(encrypted), iv.length);

    return btoa(String.fromCharCode(...combined));
  }

  async function decrypt(b64) {
    if (!encryptionKey) return b64;

    try {
      const combined = Uint8Array.from(atob(b64), c => c.charCodeAt(0));
      const iv = combined.slice(0, 12);
      const data = combined.slice(12);

      const decrypted = await window.crypto.subtle.decrypt(
        { name: 'AES-GCM', iv: iv },
        encryptionKey,
        data
      );

      const decoder = new TextDecoder();
      return decoder.decode(decrypted);
    } catch (e) {
      return '[解密失败]';
    }
  }

  // ========== 公开 API ==========

  window.E2EE = {
    async enable() {
      const key = await generateKey();
      localStorage.setItem(E2EE_ENABLED_KEY, 'true');
      console.log('🔐 E2EE 已启用');
      return key;
    },

    disable() {
      localStorage.setItem(E2EE_ENABLED_KEY, 'false');
      encryptionKey = null;
      console.log('🔓 E2EE 已关闭');
    },

    async encrypt(text) {
      return await encrypt(text);
    },

    async decrypt(b64) {
      return await decrypt(b64);
    },

    isEnabled() {
      return localStorage.getItem(E2EE_ENABLED_KEY) === 'true' && encryptionKey !== null;
    }
  };

  // 自动初始化
  initE2EE().then(enabled => {
    if (enabled) {
      console.log('🔐 E2EE 已加载');
    }
  });

})();
