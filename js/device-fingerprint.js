/* ================================================================
   设备指纹采集模块 v1.0
   DeviceFingerprint — 15+ 维度设备唯一标识

   ✅ Canvas 2D 指纹
   ✅ WebGL 指纹 (vendor + renderer)
   ✅ 音频指纹 (AudioContext)
   ✅ 屏幕信息 (分辨率 + 色深 + 像素比)
   ✅ 时区 + 语言 + 平台
   ✅ CPU 核心 + 设备内存
   ✅ 触摸支持 + 最大触点
   ✅ 浏览器特征 (UA + 插件 + 字体)
   ✅ 颜色色域 + HDR
   ✅ 网络连接类型
   ✅ SHA-256 哈希生成唯一设备 ID

   使用方式:
     const fp = await DeviceFingerprint.collect();
     fp.hash     → "a3f8b2c1d9e0..."  (64 字符 SHA-256)
     fp.rawData  → { canvas: "...", webgl: "...", ... }
     fp.summary  → { platform: "Win32", browser: "Chrome", ... }

   暴露到全局: window.DeviceFingerprint
   ================================================================ */

(function () {
  'use strict';

  // ── 工具: SHA-256 哈希 ──────────────────────────────────────
  async function sha256(text) {
    try {
      const encoder = new TextEncoder();
      const data = encoder.encode(text);
      const hashBuffer = await crypto.subtle.digest('SHA-256', data);
      const hashArray = Array.from(new Uint8Array(hashBuffer));
      return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
    } catch (e) {
      // 降级: 简单 hash (非加密级别，仅用于无法使用 SubtleCrypto 时)
      let hash = 0;
      for (let i = 0; i < text.length; i++) {
        const char = text.charCodeAt(i);
        hash = ((hash << 5) - hash) + char;
        hash = hash & hash;
      }
      return 'fallback_' + Math.abs(hash).toString(16).padStart(16, '0');
    }
  }

  // ── 1. Canvas 2D 指纹 ──────────────────────────────────────
  function getCanvasFingerprint() {
    try {
      const canvas = document.createElement('canvas');
      canvas.width = 280;
      canvas.height = 60;
      const ctx = canvas.getContext('2d');

      // 绘制复杂文字和图形（不同浏览器/系统渲染结果不同）
      ctx.textBaseline = 'top';
      ctx.font = '14px "Arial"';
      ctx.fillStyle = '#f60';
      ctx.fillRect(125, 1, 62, 20);

      ctx.fillStyle = '#069';
      ctx.fillText('shushu-bibi 🐹🐱 device-fp', 2, 15);

      ctx.fillStyle = 'rgba(102, 204, 0, 0.7)';
      ctx.fillText('shushu-bibi 🐹🐱 device-fp', 4, 17);

      // 绘制渐变圆
      const grad = ctx.createRadialGradient(50, 30, 1, 50, 30, 30);
      grad.addColorStop(0, 'rgba(255,0,0,0.5)');
      grad.addColorStop(1, 'rgba(0,0,255,0.5)');
      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.arc(50, 30, 25, 0, Math.PI * 2);
      ctx.fill();

      // 绘制贝塞尔曲线
      ctx.strokeStyle = 'rgba(0,100,200,0.8)';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(0, 50);
      ctx.bezierCurveTo(50, 10, 150, 50, 280, 10);
      ctx.stroke();

      return canvas.toDataURL();
    } catch (e) {
      return 'canvas_error:' + e.message;
    }
  }

  // ── 2. WebGL 指纹 ──────────────────────────────────────────
  function getWebGLFingerprint() {
    try {
      const canvas = document.createElement('canvas');
      const gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl');
      if (!gl) return 'webgl_unsupported';

      const debugInfo = gl.getExtension('WEBGL_debug_renderer_info');
      const vendor = debugInfo
        ? gl.getParameter(debugInfo.UNMASKED_VENDOR_WEBGL)
        : gl.getParameter(gl.VENDOR);
      const renderer = debugInfo
        ? gl.getParameter(debugInfo.UNMASKED_RENDERER_WEBGL)
        : gl.getParameter(gl.RENDERER);

      const version = gl.getParameter(gl.VERSION);
      const shadingLang = gl.getParameter(gl.SHADING_LANGUAGE_VERSION);
      const maxTexSize = gl.getParameter(gl.MAX_TEXTURE_SIZE);
      const maxViewport = gl.getParameter(gl.MAX_VIEWPORT_DIMS).join('x');
      const extensions = gl.getSupportedExtensions().join(',');

      return JSON.stringify({ vendor, renderer, version, shadingLang, maxTexSize, maxViewport, extensions });
    } catch (e) {
      return 'webgl_error:' + e.message;
    }
  }

  // ── 3. 音频指纹 ────────────────────────────────────────────
  async function getAudioFingerprint() {
    try {
      const AudioCtx = window.OfflineAudioContext || window.webkitOfflineAudioContext;
      if (!AudioCtx) return 'audio_unsupported';

      const ctx = new AudioCtx(1, 44100);
      const oscillator = ctx.createOscillator();
      oscillator.type = 'triangle';
      oscillator.frequency.setValueAtTime(10000, ctx.currentTime);

      const compressor = ctx.createDynamicsCompressor();
      compressor.threshold.setValueAtTime(-50, ctx.currentTime);
      compressor.knee.setValueAtTime(40, ctx.currentTime);
      compressor.ratio.setValueAtTime(12, ctx.currentTime);
      compressor.attack.setValueAtTime(0, ctx.currentTime);
      compressor.release.setValueAtTime(0.25, ctx.currentTime);

      oscillator.connect(compressor);
      compressor.connect(ctx.destination);
      oscillator.start(0);

      const buffer = await ctx.startRendering();
      const samples = buffer.getChannelData(0);

      // 取前 5000 个样本的哈希
      let sum = 0;
      for (let i = 4500; i < 5000; i++) {
        sum += Math.abs(samples[i]);
      }
      return sum.toString();
    } catch (e) {
      return 'audio_error:' + e.message;
    }
  }

  // ── 4. 屏幕信息 ────────────────────────────────────────────
  function getScreenInfo() {
    try {
      const s = window.screen;
      return JSON.stringify({
        width: s.width,
        height: s.height,
        availWidth: s.availWidth,
        availHeight: s.availHeight,
        colorDepth: s.colorDepth,
        pixelDepth: s.pixelDepth,
        devicePixelRatio: window.devicePixelRatio || 1,
        orientation: s.orientation ? s.orientation.type : 'unknown'
      });
    } catch (e) {
      return 'screen_error';
    }
  }

  // ── 5. 时区信息 ────────────────────────────────────────────
  function getTimezoneInfo() {
    try {
      const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
      const offset = new Date().getTimezoneOffset();
      return JSON.stringify({ timezone: tz, offset: offset });
    } catch (e) {
      return 'tz_error';
    }
  }

  // ── 6. 语言信息 ────────────────────────────────────────────
  function getLanguageInfo() {
    try {
      return JSON.stringify({
        language: navigator.language,
        languages: (navigator.languages || []).join(',')
      });
    } catch (e) {
      return 'lang_error';
    }
  }

  // ── 7. 平台与硬件 ──────────────────────────────────────────
  function getPlatformInfo() {
    try {
      return JSON.stringify({
        platform: navigator.platform || 'unknown',
        hardwareConcurrency: navigator.hardwareConcurrency || 0,
        deviceMemory: navigator.deviceMemory || 0,
        maxTouchPoints: navigator.maxTouchPoints || 0,
        userAgent: navigator.userAgent
      });
    } catch (e) {
      return 'platform_error';
    }
  }

  // ── 8. 浏览器特征 ──────────────────────────────────────────
  function getBrowserInfo() {
    try {
      const ua = navigator.userAgent;
      let browser = 'unknown';
      let version = 'unknown';

      if (/Chrome\/(\d+)/.test(ua) && !/Edg|OPR/.test(ua)) {
        browser = 'Chrome';
        version = RegExp.$1;
      } else if (/Firefox\/(\d+)/.test(ua)) {
        browser = 'Firefox';
        version = RegExp.$1;
      } else if (/Safari\/(\d+)/.test(ua) && !/Chrome/.test(ua)) {
        browser = 'Safari';
        version = RegExp.$1;
      } else if (/Edg\/(\d+)/.test(ua)) {
        browser = 'Edge';
        version = RegExp.$1;
      } else if (/OPR\/(\d+)/.test(ua)) {
        browser = 'Opera';
        version = RegExp.$1;
      }

      return JSON.stringify({
        browser: browser,
        version: version,
        cookieEnabled: navigator.cookieEnabled,
        doNotTrack: navigator.doNotTrack,
        pdfViewerEnabled: navigator.pdfViewerEnabled || false
      });
    } catch (e) {
      return 'browser_error';
    }
  }

  // ── 9. 插件信息 ────────────────────────────────────────────
  function getPluginInfo() {
    try {
      const plugins = [];
      if (navigator.plugins) {
        for (let i = 0; i < navigator.plugins.length; i++) {
          plugins.push(navigator.plugins[i].name);
        }
      }
      return plugins.join(',');
    } catch (e) {
      return 'plugins_error';
    }
  }

  // ── 10. 字体检测 ───────────────────────────────────────────
  function getFontInfo() {
    try {
      const testFonts = [
        'Arial', 'Arial Black', 'Arial Narrow', 'Calibri', 'Cambria',
        'Comic Sans MS', 'Consolas', 'Courier', 'Courier New',
        'Georgia', 'Helvetica', 'Impact', 'Lucida Console',
        'Lucida Sans Unicode', 'Microsoft YaHei', 'Microsoft Sans Serif',
        'Palatino Linotype', 'Segoe UI', 'SimHei', 'SimSun',
        'Tahoma', 'Times', 'Times New Roman', 'Trebuchet MS',
        'Verdana', 'Wingdings'
      ];
      const baseFonts = ['monospace', 'sans-serif', 'serif'];
      const testString = 'mmmmmmmmmmlli';
      const testSize = '72px';

      const span = document.createElement('span');
      span.style.fontSize = testSize;
      span.style.position = 'absolute';
      span.style.left = '-9999px';
      span.style.visibility = 'hidden';
      span.innerHTML = testString;

      const body = document.body;
      if (!body) return 'no_body';

      // 先测量基准字体宽度
      const baseWidths = {};
      const baseHeights = {};
      for (const base of baseFonts) {
        span.style.fontFamily = base;
        body.appendChild(span);
        baseWidths[base] = span.offsetWidth;
        baseHeights[base] = span.offsetHeight;
        body.removeChild(span);
      }

      // 检测哪些字体存在
      const detected = [];
      for (const font of testFonts) {
        let isDetected = false;
        for (const base of baseFonts) {
          span.style.fontFamily = "'" + font + "', " + base;
          body.appendChild(span);
          if (span.offsetWidth !== baseWidths[base] || span.offsetHeight !== baseHeights[base]) {
            isDetected = true;
          }
          body.removeChild(span);
        }
        if (isDetected) detected.push(font);
      }

      return detected.join(',');
    } catch (e) {
      return 'fonts_error';
    }
  }

  // ── 11. 颜色色域 / HDR ─────────────────────────────────────
  function getColorInfo() {
    try {
      const results = [];
      if (window.matchMedia) {
        if (window.matchMedia('(color-gamut: srgb)').matches) results.push('srgb');
        if (window.matchMedia('(color-gamut: p3)').matches) results.push('p3');
        if (window.matchMedia('(color-gamut: rec2020)').matches) results.push('rec2020');
        if (window.matchMedia('(dynamic-range: high)').matches) results.push('hdr');
      }
      return results.join(',') || 'unknown';
    } catch (e) {
      return 'color_error';
    }
  }

  // ── 12. 网络连接信息 ───────────────────────────────────────
  function getConnectionInfo() {
    try {
      const conn = navigator.connection || navigator.mozConnection || navigator.webkitConnection;
      if (!conn) return 'unknown';
      return JSON.stringify({
        effectiveType: conn.effectiveType || 'unknown',
        downlink: conn.downlink || 0,
        rtt: conn.rtt || 0,
        saveData: conn.saveData || false
      });
    } catch (e) {
      return 'conn_error';
    }
  }

  // ── 13. 触摸支持 ───────────────────────────────────────────
  function getTouchInfo() {
    try {
      return JSON.stringify({
        touchEnabled: 'ontouchstart' in window,
        maxTouchPoints: navigator.maxTouchPoints || 0,
        touchEvent: 'ontouchforcechange' in document
      });
    } catch (e) {
      return 'touch_error';
    }
  }

  // ── 14. 存储支持 ───────────────────────────────────────────
  function getStorageInfo() {
    try {
      return JSON.stringify({
        localStorage: !!window.localStorage,
        sessionStorage: !!window.sessionStorage,
        indexedDB: !!window.indexedDB,
        cookieEnabled: navigator.cookieEnabled
      });
    } catch (e) {
      return 'storage_error';
    }
  }

  // ── 15. WebRTC IP（仅用于内网 IP 段，不涉及公网隐私）──────
  function getWebRTCInfo() {
    try {
      // 检测是否支持 WebRTC，但不实际获取 IP（隐私安全）
      return JSON.stringify({
        rtcSupported: !!window.RTCPeerConnection,
        mediaDevices: !!(navigator.mediaDevices && navigator.mediaDevices.getUserMedia)
      });
    } catch (e) {
      return 'rtc_error';
    }
  }

  // ── 主采集函数 ─────────────────────────────────────────────
  async function collect() {
    console.log('[DeviceFP] 开始采集设备指纹...');

    // 同步采集（快速）
    const canvas = getCanvasFingerprint();
    const webgl = getWebGLFingerprint();
    const screen = getScreenInfo();
    const timezone = getTimezoneInfo();
    const language = getLanguageInfo();
    const platform = getPlatformInfo();
    const browser = getBrowserInfo();
    const plugins = getPluginInfo();
    const fonts = getFontInfo();
    const colorGamut = getColorInfo();
    const connection = getConnectionInfo();
    const touch = getTouchInfo();
    const storage = getStorageInfo();
    const webrtc = getWebRTCInfo();

    // 异步采集（音频指纹需要渲染）
    const audio = await getAudioFingerprint();

    // 组合所有维度
    const rawData = {
      canvas,
      webgl,
      audio,
      screen,
      timezone,
      language,
      platform,
      browser,
      plugins,
      fonts,
      colorGamut,
      connection,
      touch,
      storage,
      webrtc
    };

    // 生成组合字符串（用于哈希）
    const combined = [
      canvas, webgl, audio, screen, timezone, language,
      platform, browser, fonts, colorGamut, touch, storage
    ].join('|');

    // SHA-256 哈希 → 唯一设备 ID
    const hash = await sha256(combined);

    // 生成可读摘要
    const summary = parseSummary(rawData);

    console.log('[DeviceFP] 采集完成:', hash.substring(0, 16) + '...', summary);

    return {
      hash: hash,
      rawData: rawData,
      summary: summary,
      timestamp: Date.now()
    };
  }

  // ── 解析可读摘要 ───────────────────────────────────────────
  function parseSummary(raw) {
    let platform = 'unknown';
    let browser = 'unknown';
    let screen = 'unknown';
    let timezone = 'unknown';

    try { platform = JSON.parse(raw.platform); } catch (e) {}
    try { browser = JSON.parse(raw.browser); } catch (e) {}
    try { screen = JSON.parse(raw.screen); } catch (e) {}
    try { timezone = JSON.parse(raw.timezone); } catch (e) {}

    return {
      platform: platform.platform || 'unknown',
      browser: browser.browser || 'unknown',
      browserVersion: browser.version || 'unknown',
      screen: screen.width ? (screen.width + 'x' + screen.height) : 'unknown',
      timezone: timezone.timezone || 'unknown',
      cores: platform.hardwareConcurrency || 0,
      memory: platform.deviceMemory || 0,
      touchPoints: platform.maxTouchPoints || 0
    };
  }

  // ── 缓存机制（同设备不重复采集）────────────────────────────
  const CACHE_KEY = 'lb_device_fp_cache';
  const CACHE_TTL = 30 * 60 * 1000; // 30 分钟缓存

  async function getCached() {
    try {
      const cached = localStorage.getItem(CACHE_KEY);
      if (cached) {
        const data = JSON.parse(cached);
        if (Date.now() - data.timestamp < CACHE_TTL) {
          console.log('[DeviceFP] 使用缓存:', data.hash.substring(0, 16) + '...');
          return data;
        }
      }
    } catch (e) {}

    // 重新采集
    const result = await collect();
    try {
      localStorage.setItem(CACHE_KEY, JSON.stringify(result));
    } catch (e) {}
    return result;
  }

  // ── 清除缓存 ───────────────────────────────────────────────
  function clearCache() {
    try {
      localStorage.removeItem(CACHE_KEY);
      console.log('[DeviceFP] 缓存已清除');
    } catch (e) {}
  }

  // ── 获取设备名称（可读）────────────────────────────────────
  function getDeviceName(summary) {
    if (!summary) return 'Unknown Device';
    const parts = [];
    if (summary.platform && summary.platform !== 'unknown') {
      parts.push(summary.platform);
    }
    if (summary.browser && summary.browser !== 'unknown') {
      parts.push(summary.browser);
    }
    if (summary.screen && summary.screen !== 'unknown') {
      parts.push(summary.screen);
    }
    return parts.length > 0 ? parts.join(' / ') : 'Unknown Device';
  }

  // ── 导出 ───────────────────────────────────────────────────
  window.DeviceFingerprint = {
    collect: collect,
    getCached: getCached,
    clearCache: clearCache,
    getDeviceName: getDeviceName,
    sha256: sha256,
    _internal: {
      getCanvasFingerprint,
      getWebGLFingerprint,
      getAudioFingerprint,
      getScreenInfo,
      getTimezoneInfo,
      getLanguageInfo,
      getPlatformInfo,
      getBrowserInfo,
      getPluginInfo,
      getFontInfo,
      getColorInfo,
      getConnectionInfo,
      getTouchInfo,
      getStorageInfo,
      getWebRTCInfo
    }
  };

  console.log('[DeviceFingerprint] v1.0 已加载 — 15 维度采集器');
})();
