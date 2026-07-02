/**
 * 海岛椰风·海洋粒子系统 v1.0
 * - 动态气泡粒子（Canvas）
 * - 光斑散景效果
 * - 鼠标涟漪波纹
 * - 椰风浮动光影
 */
(function() {
  'use strict';

  // ==================== 配置 ====================
  const CONFIG = {
    bubbles: { count: 30, minSize: 3, maxSize: 12, minSpeed: 0.3, maxSpeed: 1.2, opacityRange: [0.15, 0.5] },
    bokeh:   { count: 15, minSize: 20, maxSize: 60, minSpeed: 0.1, maxSpeed: 0.4, opacityRange: [0.03, 0.1] },
    ripple:  { maxRadius: 120, duration: 1200, color: 'rgba(255,255,255,0.3)' },
  };

  let canvas, ctx, particles = [], animId, mouseX = -100, mouseY = -100, ripples = [];
  let isRunning = false;

  // ==================== 粒子类 ====================
  class Bubble {
    constructor() {
      this.reset();
      this.y = Math.random() * canvas.height;
    }
    reset() {
      const cfg = CONFIG.bubbles;
      this.x = Math.random() * canvas.width;
      this.y = canvas.height + 20;
      this.size = cfg.minSize + Math.random() * (cfg.maxSize - cfg.minSize);
      this.speed = cfg.minSpeed + Math.random() * (cfg.maxSpeed - cfg.minSpeed);
      this.opacity = cfg.opacityRange[0] + Math.random() * (cfg.opacityRange[1] - cfg.opacityRange[0]);
      this.wobble = Math.random() * Math.PI * 2;
      this.wobbleSpeed = (Math.random() - 0.5) * 0.02;
      this.wobbleAmp = 15 + Math.random() * 30;
    }
    update() {
      this.y -= this.speed;
      this.wobble += this.wobbleSpeed;
      this.x += Math.sin(this.wobble) * 0.3;

      if (this.y < -20) this.reset();
    }
    draw() {
      const grd = ctx.createRadialGradient(this.x, this.y, 0, this.x, this.y, this.size);
      grd.addColorStop(0, 'rgba(255,255,255,' + (this.opacity + 0.15) + ')');
      grd.addColorStop(0.5, 'rgba(168,230,207,' + this.opacity + ')');
      grd.addColorStop(1, 'rgba(91,192,222,0)');
      ctx.beginPath();
      ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
      ctx.fillStyle = grd;
      ctx.fill();

      // 高光点
      ctx.beginPath();
      ctx.arc(this.x - this.size * 0.25, this.y - this.size * 0.25, this.size * 0.2, 0, Math.PI * 2);
      ctx.fillStyle = 'rgba(255,255,255,' + (this.opacity + 0.2) + ')';
      ctx.fill();
    }
  }

  class Bokeh {
    constructor() {
      this.reset();
      this.y = Math.random() * canvas.height;
    }
    reset() {
      const cfg = CONFIG.bokeh;
      this.x = Math.random() * canvas.width;
      this.y = canvas.height + 50;
      this.size = cfg.minSize + Math.random() * (cfg.maxSize - cfg.minSize);
      this.speed = cfg.minSpeed + Math.random() * (cfg.maxSpeed - cfg.minSpeed);
      this.opacity = cfg.opacityRange[0] + Math.random() * (cfg.opacityRange[1] - cfg.opacityRange[0]);
      this.drift = (Math.random() - 0.5) * 0.5;
    }
    update() {
      this.y -= this.speed;
      this.x += this.drift;
      this.opacity += (Math.random() - 0.5) * 0.002;
      this.opacity = Math.max(0.01, Math.min(0.12, this.opacity));
      if (this.y < -80) this.reset();
    }
    draw() {
      const grd = ctx.createRadialGradient(this.x, this.y, 0, this.x, this.y, this.size);
      grd.addColorStop(0, 'rgba(255,255,255,' + (this.opacity * 2) + ')');
      grd.addColorStop(0.4, 'rgba(168,230,207,' + this.opacity + ')');
      grd.addColorStop(1, 'rgba(91,192,222,0)');
      ctx.beginPath();
      ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
      ctx.fillStyle = grd;
      ctx.fill();
    }
  }

  class Ripple {
    constructor(x, y) {
      this.x = x;
      this.y = y;
      this.radius = 0;
      this.maxRadius = CONFIG.ripple.maxRadius;
      this.startTime = performance.now();
      this.duration = CONFIG.ripple.duration;
      this.alive = true;
    }
    update() {
      const elapsed = performance.now() - this.startTime;
      const progress = elapsed / this.duration;
      if (progress >= 1) { this.alive = false; return; }
      this.radius = this.maxRadius * progress;
      this.opacity = 1 - progress;
      // Ease-out
      this.opacity = this.opacity * this.opacity;
    }
    draw() {
      ctx.beginPath();
      ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
      ctx.strokeStyle = CONFIG.ripple.color.replace('0.3', (this.opacity * 0.3).toFixed(2));
      ctx.lineWidth = 2 * (1 - this.opacity) + 0.5;
      ctx.stroke();
    }
  }

  // ==================== 初始化 ====================
  function init() {
    canvas = document.createElement('canvas');
    canvas.id = 'ocean-particles-canvas';
    canvas.style.cssText = 'position:fixed;top:0;left:0;width:100%;height:100%;pointer-events:none;z-index:0;';
    document.body.appendChild(canvas);
    ctx = canvas.getContext('2d');
    resize();
    window.addEventListener('resize', resize);

    // 创建粒子
    for (let i = 0; i < CONFIG.bubbles.count; i++) particles.push(new Bubble());
    for (let i = 0; i < CONFIG.bokeh.count; i++) particles.push(new Bokeh());

    // 鼠标涟漪
    document.addEventListener('click', onMouseClick);
    document.addEventListener('mousemove', onMouseMove);

    isRunning = true;
    animate();
  }

  function resize() {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
  }

  function onMouseClick(e) {
    ripples.push(new Ripple(e.clientX, e.clientY));
  }

  function onMouseMove(e) {
    mouseX = e.clientX;
    mouseY = e.clientY;
    // 鼠标附近微气泡
    if (Math.random() < 0.15) {
      const bubble = new Bubble();
      bubble.x = mouseX + (Math.random() - 0.5) * 40;
      bubble.y = mouseY + (Math.random() - 0.5) * 40;
      bubble.size = 2 + Math.random() * 4;
      bubble.speed = 0.5 + Math.random() * 1;
      bubble.opacity = 0.2 + Math.random() * 0.3;
      particles.push(bubble);
      // 限制粒子总数
      if (particles.length > 80) particles.splice(0, 5);
    }
  }

  // ==================== 动画循环 ====================
  function animate() {
    if (!isRunning) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // 更新涟漪
    for (let i = ripples.length - 1; i >= 0; i--) {
      ripples[i].update();
      ripples[i].draw();
      if (!ripples[i].alive) ripples.splice(i, 1);
    }

    // 更新粒子
    for (let i = particles.length - 1; i >= 0; i--) {
      particles[i].update();
      particles[i].draw();
    }

    // 清理离屏气泡（mouseMove产生的临时粒子）
    for (let i = particles.length - 1; i >= CONFIG.bubbles.count + CONFIG.bokeh.count; i--) {
      const p = particles[i];
      if (p.y < -30 || p.y > canvas.height + 30) {
        particles.splice(i, 1);
      }
    }

    animId = requestAnimationFrame(animate);
  }

  // ==================== 启动/停止 ====================
  function start() {
    if (!isRunning) {
      if (!canvas) init();
      else {
        isRunning = true;
        animate();
      }
    }
  }

  function stop() {
    isRunning = false;
    if (animId) { cancelAnimationFrame(animId); animId = null; }
  }

  function destroy() {
    stop();
    if (canvas && canvas.parentNode) canvas.parentNode.removeChild(canvas);
    canvas = null;
    ctx = null;
    particles = [];
    ripples = [];
    document.removeEventListener('click', onMouseClick);
    document.removeEventListener('mousemove', onMouseMove);
    window.removeEventListener('resize', resize);
  }

  // ==================== 暴露API ====================
  window.OceanParticles = { init, start, stop, destroy, resize };

  // 自动启动（仅夏季）
  if (document.body.classList.contains('season-summer')) {
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', init);
    } else {
      init();
    }
  }

  console.log('[海洋粒子] 海岛椰风粒子系统已加载');
})();
