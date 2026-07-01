/* ============================================================
   主题切换控制器 v2.0
   ============================================================ */

(function() {
  'use strict';

  // 主题配置
  const THEMES = {
    blue: {
      name: '清新蓝色',
      icon: '🌊',
      preview: 'blue'
    },
    minimal: {
      name: '简约治愈',
      icon: '🍃',
      preview: 'minimal'
    },
    dark: {
      name: '星光夜景',
      icon: '🌙',
      preview: 'dark'
    }
  };

  const DEFAULT_THEME = 'blue';
  const STORAGE_KEY = 'love_site_theme';

  // 获取当前主题
  function getCurrentTheme() {
    return localStorage.getItem(STORAGE_KEY) || DEFAULT_THEME;
  }

  // 设置主题
  function setTheme(themeName) {
    if (!THEMES[themeName]) {
      console.error('[Theme] 未知主题:', themeName);
      return;
    }

    // 保存到localStorage
    localStorage.setItem(STORAGE_KEY, themeName);
  window.setData && window.setData('love_site_theme', themeName);

    // 应用到body
    document.body.setAttribute('data-theme', themeName);

    // 更新按钮状态
    updateThemeButtons(themeName);

    console.log('[Theme] 已切换到主题:', THEMES[themeName].name);
  }

  // 更新按钮状态
  function updateThemeButtons(activeTheme) {
    var buttons = document.querySelectorAll('.theme-option-btn');
    buttons.forEach(function(btn) {
      if (btn.dataset.theme === activeTheme) {
        btn.classList.add('active');
      } else {
        btn.classList.remove('active');
      }
    });

    // 更新主按钮图标
    var toggleBtn = document.getElementById('theme-toggle-btn');
    if (toggleBtn && THEMES[activeTheme]) {
      toggleBtn.textContent = THEMES[activeTheme].icon;
    }
  }

  // 切换主题选项显示/隐藏
  function toggleThemeOptions() {
    var options = document.getElementById('theme-options');
    if (options) {
      options.classList.toggle('show');
    }
  }

  // 初始化主题系统（已禁用皮肤选择面板）
  function initTheme() {
    // 不再创建皮肤选择UI，不再自动初始化
    console.log('[Theme] 皮肤选择面板已禁用');
  }

  // 创建主题切换器UI（已禁用 - 用户要求取消皮肤按钮）
  function createThemeSwitcher() {
    // 不再创建任何皮肤选择UI
    return;
  }

  // 暴露到全局
  window.setTheme = setTheme;
  window.toggleThemeOptions = toggleThemeOptions;

  // DOM加载完成后初始化
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initTheme);
  } else {
    initTheme();
  }

})();
