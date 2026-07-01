/**
 * 简洁欢迎弹窗 v1.0
 * - 只显示一次（localStorage 标记）
 * - 有手动关闭按钮
 * - 5秒后自动关闭
 * - 不阻塞页面，半透明遮罩
 */

(function() {
  'use strict';

  const STORAGE_KEY = 'shushu_simple_welcome_v2';

  // 已经显示过就不再显示
  if (localStorage.getItem(STORAGE_KEY)) return;

  function showWelcome() {
    // 创建遮罩
    const overlay = document.createElement('div');
    overlay.id = 'simple-welcome-overlay';
    overlay.style.cssText = `
      position: fixed;
      top: 0; left: 0;
      width: 100%; height: 100%;
      background: rgba(0,0,0,0.35);
      z-index: 99999;
      display: flex;
      align-items: center;
      justify-content: center;
      animation: fadeInWelcome 0.5s ease;
    `;

    overlay.innerHTML = `
      <div id="simple-welcome-card" style="
        background: rgba(255,255,255,0.92);
        backdrop-filter: blur(16px);
        -webkit-backdrop-filter: blur(16px);
        border-radius: 20px;
        padding: 32px 36px;
        max-width: 360px;
        width: 88%;
        box-shadow: 0 12px 48px rgba(79,172,254,0.25);
        border: 1.5px solid rgba(79,172,254,0.18);
        text-align: center;
        position: relative;
        animation: popInWelcome 0.5s ease;
      ">
        <!-- 关闭按钮 -->
        <button id="simple-welcome-close" style="
          position: absolute;
          top: 12px; right: 14px;
          width: 30px; height: 30px;
          border-radius: 50%;
          border: none;
          background: rgba(0,0,0,0.08);
          color: #999;
          font-size: 16px;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          transition: all 0.2s;
        " onmouseover="this.style.background='rgba(0,0,0,0.15)';this.style.color='#333'"
           onmouseout="this.style.background='rgba(0,0,0,0.08)';this.style.color='#999'"
        >✕</button>

        <div style="font-size: 44px; margin-bottom: 12px;">💕</div>
        <h2 style="
          font-size: 20px;
          color: #4facfe;
          margin-bottom: 10px;
          font-weight: 700;
        ">欢迎来到我们的恋爱官网</h2>
        <p style="
          font-size: 13.5px;
          color: #555;
          line-height: 1.7;
          margin-bottom: 18px;
        ">在这里，每一次心动都会被永久珍藏 ✨<br>祝你浏览愉快～</p>

        <!-- 进度条（自动关闭倒计时） -->
        <div id="welcome-progress-bar" style="
          width: 100%;
          height: 3.5px;
          background: rgba(79,172,254,0.15);
          border-radius: 4px;
          overflow: hidden;
          margin-top: 8px;
        ">
          <div id="welcome-progress-fill" style="
            width: 100%;
            height: 100%;
            background: linear-gradient(90deg, #4facfe, #00f2fe);
            border-radius: 4px;
            transition: width 5s linear;
          "></div>
        </div>
        <div style="font-size: 11px; color: #aaa; margin-top: 8px;">5秒后自动关闭</div>
      </div>
    `;

    document.body.appendChild(overlay);

    // 标记已显示
    localStorage.setItem(STORAGE_KEY, 'true');

    // 关闭函数
    function closeWelcome() {
      const el = document.getElementById('simple-welcome-overlay');
      if (el) {
        el.style.opacity = '0';
        el.style.transition = 'opacity 0.35s ease';
        setTimeout(() => el.remove(), 350);
      }
      if (autoCloseTimer) clearTimeout(autoCloseTimer);
    }

    // 绑定关闭按钮
    document.getElementById('simple-welcome-close').addEventListener('click', closeWelcome);

    // 点击遮罩背景也关闭
    overlay.addEventListener('click', function(e) {
      if (e.target === overlay) closeWelcome();
    });

    // 进度条动画
    requestAnimationFrame(() => {
      const fill = document.getElementById('welcome-progress-fill');
      if (fill) fill.style.width = '0%';
    });

    // 5秒自动关闭
    const autoCloseTimer = setTimeout(closeWelcome, 5000);
  }

  // 添加动画样式
  if (!document.getElementById('simple-welcome-style')) {
    const style = document.createElement('style');
    style.id = 'simple-welcome-style';
    style.textContent = `
      @keyframes fadeInWelcome {
        0% { opacity: 0; }
        100% { opacity: 1; }
      }
      @keyframes popInWelcome {
        0% { transform: scale(0.88); opacity: 0; }
        100% { transform: scale(1); opacity: 1; }
      }
    `;
    document.head.appendChild(style);
  }

  // DOM ready 后显示
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => setTimeout(showWelcome, 600));
  } else {
    setTimeout(showWelcome, 600);
  }

  console.log('[简洁欢迎弹窗] v1.0 已加载');
})();
