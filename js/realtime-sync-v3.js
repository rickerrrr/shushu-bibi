/**
 * 统一实时同步模块 v3.2 (容错增强版)
 * 替换 getData/setData，让所有功能自动实时化
 * 使用 Cloudflare Worker + KV 存储
 * 
 * ⚠️ 必须在 app-main-v9.js 之后加载！
 * 
 * v3.2 更新：
 * - 容错增强：Worker 不可用时静默降级到本地模式，不再报错崩溃
 * - 延迟启动：等页面完全初始化后再开始同步
 * - 智能检测：自动检测 Worker 版本和可用性
 */

const WORKER_URL = 'https://shushu-bibii-online-status.2813721763.workers.dev';
let _workerReady = false;  // Worker 是否可用
let _workerChecked = false; // 是否已检测过

// 保存原始函数引用
const _originalGetData = typeof window.getData === 'function' ? window.getData : null;
const _originalSetData = typeof window.setData === 'function' ? window.setData : null;

// 实时同步管理器（容错版）
class RealtimeSync {
  constructor() {
    this.user = localStorage.getItem('lb_user') || 'shushu';
    this.syncInterval = 5000; // 5秒同步一次
    this.isOnline = navigator.onLine;
    this.pendingWrites = new Map();
    this.pollTimer = null;
    this.isSyncing = {};
    this.enabled = true; // 总开关
    
    // 监听网络状态
    window.addEventListener('online', () => {
      this.isOnline = true;
      this.flushPendingWrites();
      // 重新检查 Worker 可用性
      _workerChecked = false;
      this.checkWorkerReady().then(ok => {
        if (ok && !this.pollTimer) this.startPolling();
      });
    });
    
    window.addEventListener('offline', () => {
      this.isOnline = false;
      this.stopPolling();
    });
    
    // 延迟启动：等页面初始化完成
    if (this.isOnline && this.enabled) {
      setTimeout(() => {
        this.checkWorkerReady().then(ok => {
          if (ok) {
            this.startPolling();
            console.log('☁️ 实时同步已连接 Cloudflare Worker');
          } else {
            console.log('⚠️ Cloudflare Worker 未响应，使用本地存储模式');
          }
        });
      }, 3000); // 等3秒让页面完全初始化
    }
  }
  
  // 检测 Worker 是否可用
  async checkWorkerReady() {
    if (_workerChecked) return _workerReady;
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000); // 5秒超时
      const resp = await fetch(WORKER_URL + '/', { signal: controller.signal });
      clearTimeout(timeoutId);
      const data = await resp.json();
      _workerReady = data.status === 'ok' && data.version === 'v8';
      if (!_workerReady) {
        console.warn('⚠️ Worker 版本不匹配:', data.version, '(需要 v8)');
      }
    } catch(e) {
      console.warn('⚠️ Worker 连接失败:', e.message);
      _workerReady = false;
    }
    _workerChecked = true;
    return _workerReady;
  }
  
  startPolling() {
    if (this.pollTimer) return;
    this.pollTimer = setInterval(() => {
      if (_workerReady) this.syncAll();
    }, this.syncInterval);
    setTimeout(() => this.syncAll(), 1000);
  }
  
  stopPolling() {
    if (this.pollTimer) {
      clearInterval(this.pollTimer);
      this.pollTimer = null;
    }
  }
  
  // 同步所有数据
  async syncAll() {
    if (!this.isOnline || !_workerReady || !this.enabled) return;
    
    const keys = [
      'messages', 'loveLetters', 'checkins',
      'notes', 'finance', 'albums',
      'dates', 'wishes', 'anniversaries'
    ];
    
    for (const key of keys) {
      try {
        await this.syncKey(key);
      } catch (e) {
        // 静默处理，不影响其他功能
        console.debug(`[sync] ${key} 跳过`);
      }
    }
  }
  
  // 同步单个key（容错版）
  async syncKey(key) {
    if (!this.isOnline || !_workerReady) return;
    if (this.isSyncing[key]) return;
    this.isSyncing[key] = true;
    
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 3000); // 3秒超时
      
      const response = await fetch(`${WORKER_URL}/data/${key}`, { signal: controller.signal });
      clearTimeout(timeoutId);
      
      if (!response.ok) {
        this.isSyncing[key] = false;
        return;
      }
      
      const result = await response.json();
      
      if (result.success && result.data !== undefined && result.data !== null) {
        const localData = this.getLocal(key);
        
        try {
          if (JSON.stringify(localData) !== JSON.stringify(result.data)) {
            localStorage.setItem('lb_' + key, JSON.stringify(result.data));
            window.dispatchEvent(new CustomEvent('dataSync', { detail: { key, data: result.data } }));
          }
        } catch(ie) {
          // localStorage 可能满了，忽略
        }
      }
    } catch (e) {
      // 静默处理网络错误
      if (e.name === 'AbortError') {
        // 超时，Worker 可能没更新到 v8
        _workerChecked = false;
        _workerReady = false;
      }
    } finally {
      this.isSyncing[key] = false;
    }
  }
  
  getLocal(key) {
    try {
      const v = localStorage.getItem('lb_' + key);
      return v ? JSON.parse(v) : null;
    } catch (e) {
      return null;
    }
  }
  
  async getData(key, defaultValue = null) {
    const localData = this.getLocal(key);
    
    // 后台同步（异步，不阻塞返回值）
    if (this.isOnline && _workerReady) {
      this.syncKey(key).catch(() => {});
    }
    
    return localData !== null ? localData : defaultValue;
  }
  
  async setData(key, value) {
    // 先写本地（必须成功）
    try {
      localStorage.setItem('lb_' + key, JSON.stringify(value));
    } catch (e) {
      console.warn('[sync] localStorage 写入失败:', key);
    }
    
    // 再同步到远程（异步，失败也不影响本地）
    if (this.isOnline && _workerReady) {
      this.syncToRemote(key, value).catch(() => {
        this.pendingWrites.set(key, value);
      });
    } else if (!this.isOnline) {
      this.pendingWrites.set(key, value);
    }
    
    return true;
  }
  
  async syncToRemote(key, value) {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 3000);
    
    try {
      const response = await fetch(`${WORKER_URL}/data/${key}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          user: this.user,
          data: value,
          timestamp: Date.now()
        }),
        signal: controller.signal
      });
      clearTimeout(timeoutId);
      return response.ok;
    } catch(e) {
      clearTimeout(timeoutId);
      throw e;
    }
  }
  
  async flushPendingWrites() {
    for (const [key, value] of this.pendingWrites) {
      try {
        await this.syncToRemote(key, value);
        this.pendingWrites.delete(key);
      } catch (e) {}
    }
  }
}

// 创建全局实例
const realtimeSync = new RealtimeSync();

// 覆盖全局函数（容错版：即使原始函数不存在也不会崩溃）
window.getData = function(key, defaultValue = null) {
  try {
    const localData = _originalGetData ? _originalGetData(key, defaultValue) : null;
    if (localData !== undefined && localData !== null) return localData;
  } catch(e) {}
  
  // 回退到直接读取 localStorage
  try {
    const v = localStorage.getItem('lb_' + key);
    return v ? JSON.parse(v) : defaultValue;
  } catch(e) {
    return defaultValue;
  }
};

window.setData = function(key, value) {
  // 写入本地
  try {
    if (_originalSetData) {
      _originalSetData(key, value);
    } else {
      localStorage.setItem('lb_' + key, JSON.stringify(value));
    }
  } catch(e) {}
  
  // 异步同步远程
  if (realtimeSync.isOnline && _workerReady) {
    realtimeSync.syncToRemote(key, value).catch(() => {});
  }
  
  return true;
};

// 监听数据同步事件
window.addEventListener('dataSync', (e) => {
  const { key, data } = e.detail;
  
  switch (key) {
    case 'messages':
      if (typeof renderMessages === 'function') renderMessages(); break;
    case 'loveLetters':
      if (typeof renderLoveLetters === 'function') renderLoveLetters(); break;
    case 'checkins':
      if (typeof renderCheckins === 'function') renderCheckins(); break;
    case 'notes':
      if (typeof renderNotes === 'function') renderNotes(); break;
    case 'finance':
      if (typeof renderFinance === 'function') renderFinance(); break;
    case 'albums':
      if (typeof renderAlbums === 'function') renderAlbums(); break;
  }
});

console.log('✅ 统一实时同步模块 v3.2 已加载！');
console.log('🔄 正在检测 Cloudflare Worker...');
