#!/usr/bin/env python3
"""v5.1 增强动画: 云朵全方位 + 头像浮动 + 海浪边框"""
import os

BASE = r'C:\Users\A2813\WorkBuddy\2026-06-23-14-34-26'

# ─── Read CSS ───
css_path = os.path.join(BASE, 'css', 'style.css')
with open(css_path, 'r', encoding='utf-8') as f:
    css = f.read()

changes = 0

# === 1. Enhance cloud wrapper animation ===
old = '.login-cloud-wrapper {\n  position: relative;\n  width: 280px;\n  height: 155px;\n  margin: 0 auto 6px;\n  z-index: 2;\n  animation: cloudFloat6s 6s ease-in-out infinite;\n}'
new = '''.login-cloud-wrapper {
  position: relative;
  width: 280px;
  height: 155px;
  margin: 0 auto 6px;
  z-index: 2;
  animation: cloudFloat6s 6s ease-in-out infinite,
             cloudSway 7s ease-in-out infinite,
             cloudScaleBreathe 5s ease-in-out infinite;
  transform-origin: center center;
}'''
if old in css:
    css = css.replace(old, new)
    changes += 1
    print('  [1] Cloud wrapper multi-animation OK')

# === 2. Avatar base - add float animation ===
old_av = '''.login-avatar {
  cursor: pointer;
  padding: 22px 38px;
  border-radius: 22px;
  background: rgba(255, 255, 255, 0.12);
  backdrop-filter: blur(6px);
  -webkit-backdrop-filter: blur(6px);
  border: 1px solid rgba(160, 215, 240, 0.45);
  box-shadow: 0 0 12px rgba(160, 215, 240, 0.15);
  position: relative;
  transition: background 0.4s ease, border-color 0.4s ease, box-shadow 0.4s ease, transform 0.4s ease;
}'''
new_av = '''.login-avatar {
  cursor: pointer;
  padding: 22px 38px;
  border-radius: 22px;
  background: rgba(255, 255, 255, 0.12);
  backdrop-filter: blur(6px);
  -webkit-backdrop-filter: blur(6px);
  border: 1px solid rgba(160, 215, 240, 0.45);
  box-shadow: 0 0 12px rgba(160, 215, 240, 0.15);
  position: relative;
  overflow: visible;
  transition: background 0.4s ease, border-color 0.4s ease, box-shadow 0.4s ease;
  animation: avatarSeaFloat 4s ease-in-out infinite;
}
.login-avatar:nth-child(2) {
  animation-name: avatarSeaFloat2;
  animation-duration: 4.7s;
  animation-delay: -1.5s;
}'''
if old_av in css:
    css = css.replace(old_av, new_av)
    changes += 1
    print('  [2] Avatar base with sea-float OK')

# === 3. Hover state ===
old_hov = '''.login-avatar:hover {
  background: rgba(255, 255, 255, 0.22);
  border-color: rgba(160, 215, 240, 0.7);
  box-shadow: 0 0 20px rgba(160, 215, 240, 0.35), 0 0 40px rgba(160, 215, 240, 0.12);
  transform: translateY(-3px);
}'''
new_hov = '''.login-avatar:hover {
  background: rgba(255, 255, 255, 0.25);
  border-color: rgba(100, 200, 255, 0.85);
  box-shadow: 0 0 25px rgba(100, 200, 255, 0.45), 0 0 50px rgba(100, 200, 255, 0.18);
  animation-play-state: paused;
}
.login-avatar:hover .avatar-wave-ring {
  animation-duration: 1.5s;
  opacity: 1;
}
.login-avatar:hover .avatar-wave-ring-2 {
  animation-duration: 2s;
  opacity: 0.9;
}'''
if old_hov in css:
    css = css.replace(old_hov, new_hov)
    changes += 1
    print('  [3] Hover state OK')

# === 4. Replace ::after block with full wave system ===
marker_start = '.login-avatar::after {\n  display: none;\n}'
wave_css = '''

/* ====== 头像海面浮动动画 ====== */
@keyframes avatarSeaFloat {
  0%, 100% { transform: translateY(0) rotate(0deg); }
  25% { transform: translateY(-7px) rotate(0.8deg); }
  50% { transform: translateY(-3px) rotate(-0.3deg); }
  75% { transform: translateY(-8px) rotate(-0.6deg); }
}
@keyframes avatarSeaFloat2 {
  0%, 100% { transform: translateY(0) rotate(0deg); }
  20% { transform: translateY(-5px) rotate(-0.7deg); }
  50% { transform: translateY(-9px) rotate(0.5deg); }
  80% { transform: translateY(-4px) rotate(0.3deg); }
}

/* ====== 海浪环绕边框特效 ====== */
.avatar-wave-ring {
  position: absolute;
  inset: -3px;
  border-radius: 25px;
  z-index: -1;
  pointer-events: none;
  opacity: 0.85;
  background: conic-gradient(
    from var(--wave-a, 0deg),
    transparent 0%,
    rgba(64, 180, 255, 0.5) 15%,
    rgba(100, 210, 255, 0.85) 30%,
    rgba(180, 240, 255, 0.95) 50%,
    rgba(255, 255, 255, 0.8) 65%,
    rgba(180, 240, 255, 0.9) 80%,
    rgba(80, 190, 255, 0.7) 95%,
    transparent 100%
  );
  -webkit-mask:
    linear-gradient(#fff 0 0) content-box,
    linear-gradient(#fff 0 0);
  -webkit-mask-composite: xor;
  mask:
    linear-gradient(#fff 0 0) content-box,
    linear-gradient(#fff 0 0);
  mask-composite: exclude;
  padding: 3px;
  animation: waveSpinFwd 3.5s linear infinite;
  filter: blur(0.3px);
}
.avatar-wave-ring-2 {
  position: absolute;
  inset: -5px;
  border-radius: 27px;
  z-index: -2;
  pointer-events: none;
  opacity: 0.5;
  background: conic-gradient(
    from var(--wave-b, 120deg),
    transparent 0%,
    rgba(40, 150, 230, 0.3) 20%,
    rgba(80, 190, 255, 0.55) 45%,
    rgba(140, 220, 255, 0.65) 70%,
    transparent 100%
  );
  -webkit-mask:
    linear-gradient(#fff 0 0) content-box,
    linear-gradient(#fff 0 0);
  -webkit-mask-composite: xor;
  mask:
    linear-gradient(#fff 0 0) content-box,
    linear-gradient(#fff 0 0);
  mask-composite: exclude;
  padding: 4px;
  animation: waveSpinRev 5s linear infinite;
  filter: blur(0.8px);
}

@keyframes waveSpinFwd {
  0%   { --wave-a: 0deg; }
  100% { --wave-a: 360deg; }
}
@keyframes waveSpinRev {
  0%   { --wave-b: 120deg; }
  100% { --wave-b: -240deg; }
}

/* Emoji表情微弹跳 */
.login-avatar .avatar-face {
  display: block;
  filter: drop-shadow(0 2px 4px rgba(0,0,0,0.06));
  font-size: 56px;
  animation: emojiBobble 2.5s ease-in-out infinite;
}
.login-avatar:nth-child(2) .avatar-face {
  animation-delay: -1s;
  animation-duration: 3s;
}
@keyframes emojiBobble {
  0%, 100% { transform: scale(1) translateY(0); }
  50%      { transform: scale(1.08) translateY(-3px); }
}
'''
if marker_start in css:
    css = css.replace(marker_start, marker_start + wave_css)
    changes += 1
    print('  [4] Wave border CSS OK')

# === 5. Golden/selected state ===
old_gold = '''.login-avatar.avatar-golden {
  background: rgba(255, 255, 255, 0.18) !important;
  border-color: rgba(160, 215, 240, 0.55) !important;
  transform: scale(1.04);
  box-shadow: 0 0 18px rgba(160, 215, 240, 0.3);
}'''
new_gold = '''.login-avatar.avatar-golden {
  background: rgba(255, 255, 255, 0.22) !important;
  border-color: rgba(100, 200, 255, 0.75) !important;
  transform: scale(1.05);
  box-shadow: 0 0 25px rgba(100, 200, 255, 0.4), 0 0 50px rgba(100, 200, 255, 0.15);
  animation-play-state: paused;
}
.login-avatar.avatar-golden .avatar-wave-ring,
.login-avatar.avatar-golden .avatar-wave-ring-2 {
  opacity: 1;
  animation-duration: 2s;
}'''
if old_gold in css:
    css = css.replace(old_gold, new_gold)
    changes += 1
    print('  [5] Golden state OK')

# === 6. Fix span style (remove old, avatar-face handles it now) ===
# Keep existing span rule but it will be overridden by .avatar-face

# ─── Write ───
with open(css_path, 'w', encoding='utf-8', newline='\n') as f:
    f.write(css)

print(f'\nTotal CSS changes: {changes}')
print('CSS saved.')
