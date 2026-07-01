/**
 * 配置文件模板
 * 
 * 使用方法：
 * 1. 复制这个文件为 config.js
 * 2. 填入你的 GitHub Token
 * 3. 保存
 * 
 * ⚠️ 注意：config.js 不要提交到 GitHub（已加入 .gitignore）
 */

const SYNC_CONFIG = {
  // GitHub 仓库信息（通常不需要改）
  OWNER: 'rickerrrr',
  REPO: 'shushu-bibi',
  BRANCH: 'main',
  
  // ↓↓↓ 在这里填入你的 GitHub Token ↓↓↓
  GITHUB_TOKEN: 'YOUR_GITHUB_TOKEN_HERE',
  
  // 数据文件路径（通常不需要改）
  DATA_PATH: 'data',
  
  // 同步间隔（通常不需要改）
  SYNC_INTERVAL: 5000,
  HEARTBEAT_INTERVAL: 5000,
};

window.SYNC_CONFIG = SYNC_CONFIG;
