/**
 * 新手引导系统 v1.0
 * 4步引导，可手动触发，只显示一次
 */

const QuickGuide = {
  currentStep: 0,
  totalSteps: 4,
  overlay: null,
  seenKey: 'shushu_guide_seen_v1',

  // 引导步骤内容
  steps: [
    {
      title: '🎉 欢迎来到鼠鼠和笔笔的恋爱官网！',
      content: '这里是专属于我们的浪漫空间，记录每一个甜蜜瞬间~',
      icon: '💕'
    },
    {
      title: '📸 顶部导航栏',
      content: '相册、日历、便签、天气等功能都在这里，点击探索吧！',
      icon: '🧭'
    },
    {
      title: '📋 更多功能菜单',
      content: '点击底部"更多"按钮，发现异地天气、礼物推荐、情侣打卡等惊喜功能！',
      icon: '✨'
    },
    {
      title: '💪 开始你的浪漫之旅！',
      content: '现在你已经了解了基本功能，去创造更多美好回忆吧！',
      icon: '🚀'
    }
  ],

  // 开始引导
  start() {
    // 如果已经看过，询问是否重新查看
    if (localStorage.getItem(this.seenKey)) {
      if (!confirm('您已经看过新手引导了，是否重新查看？')) {
        return;
      }
    }

    this.currentStep = 0;
    this.createOverlay();
    this.showStep();
  },

  // 创建遮罩层
  createOverlay() {
    // 如果已存在，先移除
    const oldOverlay = document.getElementById('quick-guide-overlay');
    if (oldOverlay) {
      oldOverlay.remove();
    }

    this.overlay = document.createElement('div');
    this.overlay.id = 'quick-guide-overlay';
    this.overlay.style.cssText = `
      position: fixed;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      background: rgba(0, 0, 0, 0.5);
      backdrop-filter: blur(4px);
      z-index: 99999;
      display: flex;
      align-items: center;
      justify-content: center;
      animation: fadeIn 0.3s ease;
    `;

    document.body.appendChild(this.overlay);

    // 点击遮罩关闭
    this.overlay.addEventListener('click', (e) => {
      if (e.target === this.overlay) {
        this.close();
      }
    });
  },

  // 显示当前步骤
  showStep() {
    const step = this.steps[this.currentStep];
    const isFirst = this.currentStep === 0;
    const isLast = this.currentStep === this.totalSteps - 1;

    this.overlay.innerHTML = `
      <div style="
        background: white;
        border-radius: 20px;
        padding: 32px;
        max-width: 420px;
        width: 90%;
        box-shadow: 0 20px 60px rgba(0,0,0,0.3);
        animation: slideUp 0.4s ease;
        position: relative;
      ">
        <!-- 关闭按钮 -->
        <button onclick="QuickGuide.close()" style="
          position: absolute;
          top: 12px;
          right: 12px;
          width: 32px;
          height: 32px;
          border-radius: 50%;
          border: none;
          background: #f0f0f0;
          color: #666;
          font-size: 18px;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          transition: all 0.2s;
        " onmouseover="this.style.background='#e0e0e0'" onmouseout="this.style.background='#f0f0f0'">✕</button>

        <!-- 图标 -->
        <div style="font-size: 64px; text-align: center; margin-bottom: 16px;">${step.icon}</div>

        <!-- 标题 -->
        <h3 style="font-size: 20px; color: #333; margin-bottom: 12px; text-align: center;">${step.title}</h3>

        <!-- 内容 -->
        <p style="font-size: 15px; color: #666; line-height: 1.6; text-align: center; margin-bottom: 24px;">${step.content}</p>

        <!-- 进度指示器 -->
        <div style="display: flex; justify-content: center; gap: 8px; margin-bottom: 24px;">
          ${this.steps.map((_, i) => `
            <div style="
              width: ${i === this.currentStep ? '24px' : '8px'};
              height: 8px;
              border-radius: 4px;
              background: ${i === this.currentStep ? 'linear-gradient(135deg, #ff6b95, #ff8fa3)' : '#e0e0e0'};
              transition: all 0.3s;
            "></div>
          `).join('')}
        </div>

        <!-- 按钮 -->
        <div style="display: flex; gap: 12px; justify-content: center;">
          ${!isFirst ? `
            <button onclick="QuickGuide.prevStep()" style="
              padding: 10px 24px;
              border: 2px solid #e0e0e0;
              border-radius: 12px;
              background: white;
              color: #666;
              font-size: 14px;
              cursor: pointer;
              transition: all 0.2s;
            " onmouseover="this.style.borderColor='#ff6b95'" onmouseout="this.style.borderColor='#e0e0e0'">上一步</button>
          ` : ''}
          <button onclick="QuickGuide.${isLast ? 'finish()' : 'nextStep()'}" style="
            padding: 10px 32px;
            border: none;
            border-radius: 12px;
            background: linear-gradient(135deg, #ff6b95, #ff8fa3);
            color: white;
            font-size: 14px;
            font-weight: bold;
            cursor: pointer;
            box-shadow: 0 4px 15px rgba(255,107,149,0.4);
            transition: all 0.2s;
          " onmouseover="this.style.transform='translateY(-2px)'; this.style.boxShadow='0 6px 20px rgba(255,107,149,0.6)'" onmouseout="this.style.transform='translateY(0)'; this.style.boxShadow='0 4px 15px rgba(255,107,149,0.4)'">
            ${isLast ? '开始探索 🚀' : '下一步'}
          </button>
        </div>
      </div>
    `;
  },

  // 下一步
  nextStep() {
    if (this.currentStep < this.totalSteps - 1) {
      this.currentStep++;
      this.showStep();
    }
  },

  // 上一步
  prevStep() {
    if (this.currentStep > 0) {
      this.currentStep--;
      this.showStep();
    }
  },

  // 完成
  finish() {
    localStorage.setItem(this.seenKey, 'true');
    this.close();
    alert('🎉 引导完成！\n\n现在开始探索你们的浪漫空间吧~');
  },

  // 关闭
  close() {
    if (this.overlay) {
      this.overlay.style.animation = 'fadeOut 0.3s ease';
      setTimeout(() => {
        this.overlay.remove();
        this.overlay = null;
      }, 300);
    }
  }
};

// 添加动画CSS
const style = document.createElement('style');
style.textContent = `
  @keyframes fadeIn {
    from { opacity: 0; }
    to { opacity: 1; }
  }
  @keyframes fadeOut {
    from { opacity: 1; }
    to { opacity: 0; }
  }
  @keyframes slideUp {
    from { transform: translateY(30px); opacity: 0; }
    to { transform: translateY(0); opacity: 1; }
  }
`;
document.head.appendChild(style);

// 导出
window.QuickGuide = QuickGuide;
