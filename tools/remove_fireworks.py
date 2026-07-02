#!/usr/bin/env python3
"""Remove all fireworks/gold/烟花 effects from app-main-v9.js"""
import sys

with open('js/app-main-v9.js', 'r', encoding='utf-8') as f:
    content = f.read()

original_len = len(content)

# 1. Remove avatar-golden + spawnAvatarFireworks setTimeout block
old1 = (
    '\n'
    '      // 0.6秒后金边+头像烟花\n'
    '      setTimeout(() => {\n'
    '        const avatar = document.querySelector(\'.login-avatar[data-user="\' + currentUser + \'"]\');\n'
    '        if (avatar) avatar.classList.add(\'avatar-golden\');\n'
    '        spawnAvatarFireworks(currentUser);\n'
    '      }, 600);\n'
)
content = content.replace(old1, '\n      // 头像选中态已标记\n')

print(f"Step 1: {'' if old1 in content else 'OK'}")

# 2. Remove 2.5s fireworks wrapper, keep direct entry
old2 = (
    '      // 2.5秒后全屏烟花 + 进入大厅\n'
    '      setTimeout(() => {\n'
    '        spawnFireworksAllScreen();\n'
    '\n'
    '        setTimeout(() => {\n'
    '          const loginPage = document.getElementById(\'login-page\');\n'
    '          if (loginPage) loginPage.classList.add(\'hidden\');\n'
    '          const app = document.getElementById(\'app\');\n'
    '          if (app) app.classList.remove(\'hidden\');\n'
    '          // \U0001f525 关键：给 body 添加 logged-in 类，触发内联 CSS 页面切换\n'
    '          document.body.classList.add(\'logged-in\');\n'
    '          // 启动海洋粒子系统（登录后才显示）\n'
    '          if (window.OceanParticles && !window.OceanParticles.canvas) window.OceanParticles.init();\n'
    '          // 同时显示顶部栏和底部导航\n'
    '          const topBar = document.querySelector(\'.top-bar\');\n'
    '          if (topBar) topBar.style.display = \'\';\n'
    '          const bottomNav = document.querySelector(\'.bottom-nav\');\n'
    '          if (bottomNav) bottomNav.style.display = \'\';\n'
    '          initApp();\n'
    '          showToast(\'欢迎回来，\' + myName + \'！\U0001f495\');\n'
    '          window._loginInProgress = false;\n'
    '        }, 1200);\n'
    '      }, 2500);'
)

new2 = (
    '      // 2.5秒后进入大厅\n'
    '      setTimeout(() => {\n'
    '        const loginPage = document.getElementById(\'login-page\');\n'
    '        if (loginPage) loginPage.classList.add(\'hidden\');\n'
    '        const app = document.getElementById(\'app\');\n'
    '        if (app) app.classList.remove(\'hidden\');\n'
    '        document.body.classList.add(\'logged-in\');\n'
    '        if (window.OceanParticles && !window.OceanParticles.canvas) window.OceanParticles.init();\n'
    '        const topBar = document.querySelector(\'.top-bar\');\n'
    '        if (topBar) topBar.style.display = \'\';\n'
    '        const bottomNav = document.querySelector(\'.bottom-nav\');\n'
    '        if (bottomNav) bottomNav.style.display = \'\';\n'
    '        initApp();\n'
    '        showToast(\'欢迎回来，\' + myName + \'！\U0001f495\');\n'
    '        window._loginInProgress = false;\n'
    '      }, 2500);'
)
content = content.replace(old2, new2)
print(f"Step 2: {'OK' if old2 not in content else 'FAILED'}")

# 3. Remove spawnFireworksAllScreen function
marker3_start = '\n// ==================== 全屏烟花粒子 ====================\nfunction spawnFireworksAllScreen() {'
marker3_after = '\n\n// 头像周围烟花\nfunction spawnAvatarFireworks('
idx_start = content.find(marker3_start)
idx_after = content.find(marker3_after, idx_start)
if idx_start >= 0 and idx_after >= 0:
    content = content[:idx_start] + content[idx_after + len('\n\n// 头像周围烟花'):]
    print("Step 3: OK")
else:
    print(f"Step 3: FAILED (start={idx_start}, after={idx_after})")

# 4. Remove spawnAvatarFireworks function
marker4_start = '\nfunction spawnAvatarFireworks('
marker4_end = '\n// ==================== 心形灰飞烟灭粒子'
idx4_start = content.find(marker4_start)
idx4_end = content.find(marker4_end, idx4_start)
if idx4_start >= 0 and idx4_end >= 0:
    content = content[:idx4_start] + content[idx4_end:]
    print("Step 4: OK")
else:
    print(f"Step 4: FAILED (start={idx4_start}, end={idx4_end})")

# 5. Remove spawnHeartDust function
marker5_start = '\n// ==================== 心形灰飞烟灭粒子（灭霸效果） ===================='
marker5_end = '\n// ==================== 全屏烟花系统 ===================='
idx5_start = content.find(marker5_start)
idx5_end = content.find(marker5_end, idx5_start)
if idx5_start >= 0 and idx5_end >= 0:
    content = content[:idx5_start] + content[idx5_end:]
    print("Step 5: OK")
else:
    print(f"Step 5: FAILED (start={idx5_start}, end={idx5_end})")

# 6. Remove spawnFullscreenFireworks + spawnSingleBurst
marker6_start = '\n// ==================== 全屏烟花系统 ====================\nfunction spawnFullscreenFireworks() {'
marker6_end = '\n\nfunction doLogout() {'
idx6_start = content.find(marker6_start)
idx6_end = content.find(marker6_end, idx6_start)
if idx6_start >= 0 and idx6_end >= 0:
    content = content[:idx6_start] + content[idx6_end:]
    print("Step 6: OK")
else:
    print(f"Step 6: FAILED (start={idx6_start}, end={idx6_end})")

with open('js/app-main-v9.js', 'w', encoding='utf-8', newline='\n') as f:
    f.write(content)

removed = original_len - len(content)
print(f"\nDone! Removed {removed} chars. Final: {len(content)} chars")
