/**
 * 基于 GitHub API 的实时同步模块 v4.0
 * 替代 Cloudflare Worker，使用 GitHub 仓库存储实时数据
 * 
 * 工作原理：
 * 1. 数据存储在 GitHub 仓库的 data/ 文件夹
 * 2. 前端通过 GitHub API 读写 JSON 文件
 * 3. 每5秒自动拉取最新数据
 * 4. 数据变更时自动推送到 GitHub
 * 
 * 设置方法：
 * 1. 复制 js/config.template.js 为 js/config.js
 * 2. 在 config.js 中填入你的 GitHub Token
 * 3. 部署即可（config.js 已加入 .gitignore，不会泄露）
 */

const SYNC_CONFIG = window.SYNC_CONFIG || {
  OWNER: 'rickerrrr',
  REPO: 'shushu-bibi',
  BRANCH: 'main',
  GITHUB_TOKEN: '',
  DATA_PATH: 'data',
  SYNC_INTERVAL: 5000,
  HEARTBEAT_INTERVAL: 5000,
};

/**
 * GitHub API 实时同步管理器
 */
class GitHubRealtimeSync {
  constructor() {
    this.owner = SYNC_CONFIG.OWNER;
    this.repo = SYNC_CONFIG.REPO;
    this.branch = SYNC_CONFIG.BRANCH;
    this.token = SYNC_CONFIG.GITHUB_TOKEN;
    this.dataPath = SYNC_CONFIG.DATA_PATH;
    
    this.syncTimer = null;
    this.heartbeatTimer = null;
    this.lastSyncTimestamp = {};
    
    this.init();
  }
  
  init() {
    console.log('🚀 GitHub 实时同步模块初始化...');
    
    // 等待页面完全加载
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', () => {
        setTimeout(() => this.start(), 3000);
      });
    } else {
      setTimeout(() => this.start(), 3000);
    }
  }
  
  /**
   * 启动同步
   */
  start() {
    console.log('✅ GitHub 实时同步模块已启动！');
    console.log('📡 数据将每5秒自动同步到 GitHub 仓库');
    
    // 立即同步一次
    this.syncAll();
    
    // 定时同步
    this.syncTimer = setInterval(() => {
      this.syncAll();
    }, SYNC_CONFIG.SYNC_INTERVAL);
    
    // 心跳（在线状态）
    this.startHeartbeat();
  }
  
  /**
   * 同步所有数据
   */
  async syncAll() {
    const dataKeys = [
      'chat_messages',
      'messages',
      'loveLetters',
      'checkins',
      'notes',
      'finances',
      'albums'
    ];
    
    for (const key of dataKeys) {
      try {
        await this.pullData(key);
      } catch (err) {
        // 静默失败，不影响其他数据同步
      }
    }
  }
  
  /**
   * 从 GitHub 拉取数据
   */
  async pullData(key) {
    try {
      const url = `${SYNC_CONFIG.API_BASE}/repos/${this.owner}/${this.repo}/contents/${this.dataPath}/${key}.json`;
      
      const response = await fetch(url, {
        headers: {
          'Authorization': `token ${this.token}`,
          'Accept': 'application/vnd.github.v3+json',
        },
      });
      
      if (response.status === 404) {
        // 文件不存在，跳过
        return;
      }
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }
      
      const fileData = await response.json();
      const content = JSON.parse(atob(fileData.content));
      const remoteTimestamp = fileData.sha; // 用 SHA 作为版本标识
      
      // 检查是否有更新
      if (this.lastSyncTimestamp[key] !== remoteTimestamp) {
        // 更新本地数据
        localStorage.setItem(key, JSON.stringify(content));
        this.lastSyncTimestamp[key] = remoteTimestamp;
        
        console.log(`📥 拉取数据: ${key}`);
      }
    } catch (err) {
      // 静默失败
    }
  }
  
  /**
   * 推送数据到 GitHub
   */
  async pushData(key, data) {
    try {
      const url = `${SYNC_CONFIG.API_BASE}/repos/${this.owner}/${this.repo}/contents/${this.dataPath}/${key}.json`;
      
      // 先获取文件的 SHA（如果存在）
      let sha = null;
      try {
        const checkResp = await fetch(url, {
          headers: {
            'Authorization': `token ${this.token}`,
            'Accept': 'application/vnd.github.v3+json',
          },
        });
        if (checkResp.ok) {
          const fileData = await checkResp.json();
          sha = fileData.sha;
        }
      } catch (e) {
        // 文件不存在
      }
      
      const content = btoa(JSON.stringify(data, null, 2));
      const body = {
        message: `同步 ${key} - ${new Date().toISOString()}`,
        content: content,
        branch: this.branch,
      };
      
      if (sha) {
        body.sha = sha;
      }
      
      const response = await fetch(url, {
        method: 'PUT',
        headers: {
          'Authorization': `token ${this.token}`,
          'Accept': 'application/vnd.github.v3+json',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(body),
      });
      
      if (response.ok) {
        const result = await response.json();
        this.lastSyncTimestamp[key] = result.content.sha;
        console.log(`📤 推送数据: ${key}`);
      } else {
        throw new Error(`HTTP ${response.status}`);
      }
    } catch (err) {
      console.warn(`⚠️ 推送失败: ${key}`, err);
    }
  }
  
  /**
   * 心跳（在线状态）
   */
  startHeartbeat() {
    const user = localStorage.getItem('currentUser') || 'shushu';
    
    const updateStatus = async () => {
      try {
        await this.pushData(`online_status_${user}`, {
          online: true,
          lastSeen: Date.now(),
        });
      } catch (err) {
        // 忽略错误
      }
    };
    
    // 立即更新一次
    updateStatus();
    
    // 定时更新
    this.heartbeatTimer = setInterval(updateStatus, SYNC_CONFIG.HEARTBEAT_INTERVAL);
  }
  
  /**
   * 覆盖全局 getData/setData 函数
   */
  overrideDataFunctions() {
    const self = this;
    
    // 保存原始函数
    if (typeof window.getData === 'function' && !window._originalGetData) {
      window._originalGetData = window.getData;
    }
    
    // 覆盖 getData
    window.getData = function(key) {
      // 先从 localStorage 读取（最快）
      const localData = localStorage.getItem(key);
      return localData ? JSON.parse(localData) : null;
    };
    
    // 覆盖 setData
    const originalSetData = window.setData;
    window.setData = function(key, value) {
      // 先保存到 localStorage
      localStorage.setItem(key, JSON.stringify(value));
      
      // 异步推送到 GitHub
      self.pushData(key, value);
    };
    
    console.log('✅ 已覆盖 getData/setData，所有数据将自动同步到 GitHub！');
  }
}

// 导出
window.GitHubRealtimeSync = GitHubRealtimeSync;

// 自动初始化
(function() {
  const sync = new GitHubRealtimeSync();
  window._githubSync = sync;
  
  // 覆盖数据函数
  setTimeout(() => {
    sync.overrideDataFunctions();
  }, 5000);
})();
