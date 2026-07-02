/**
 * 登录页 Canvas 粒子系统 v5.0
 * 120fps 低负载 | 仅白气泡 + 浅蓝空心爱心 | 无金光/烟花
 */
(function () {
  'use strict';

  var canvas = document.getElementById('login-particles-canvas');
  if (!canvas) return;

  var ctx = canvas.getContext('2d');
  var W, H;
  var particles = [];
  var ripples = [];
  var mouseX = -100, mouseY = -100;
  var mouseGlowAlpha = 0;
  var lastTime = 0;
  var targetFPS = 120;
  var frameInterval = 1000 / targetFPS;

  // ──── 粒子池 ────
  var BUBBLE_MAX = 35;
  var HEART_MAX = 12;

  function resize() {
    W = canvas.width = canvas.parentElement.clientWidth;
    H = canvas.height = canvas.parentElement.clientHeight;
  }

  // ──── 海水气泡 ────
  function spawnBubble() {
    this.x = Math.random() * W;
    this.y = H + 10;
    this.r = 4 + Math.random() * 16;
    this.speed = 0.3 + Math.random() * 0.7;
    this.wobble = Math.random() * 0.3;
    this.wobbleSpeed = 0.005 + Math.random() * 0.01;
    this.wobbleOffset = Math.random() * Math.PI * 2;
    this.alpha = 0.15 + Math.random() * 0.25;
    this.twinkle = Math.random() * Math.PI * 2;
    this.twinkleSpeed = 0.02 + Math.random() * 0.04;
  }
  spawnBubble.prototype.update = function (dt) {
    this.y -= this.speed * dt;
    this.x += Math.sin(this.wobbleOffset + this.y * this.wobbleSpeed) * this.wobble * dt;
    this.twinkle += this.twinkleSpeed * dt;
    if (this.y < -20) {
      this.y = H + 10;
      this.x = Math.random() * W;
      this.twinkle = Math.random() * Math.PI * 2;
    }
  };
  spawnBubble.prototype.draw = function (ctx) {
    var twinkleAlpha = this.alpha + Math.sin(this.twinkle) * 0.06;
    var grad = ctx.createRadialGradient(this.x - this.r * 0.25, this.y - this.r * 0.3, this.r * 0.05, this.x, this.y, this.r);
    grad.addColorStop(0, 'rgba(255,255,255,' + (twinkleAlpha + 0.25) + ')');
    grad.addColorStop(0.4, 'rgba(220,240,255,' + (twinkleAlpha + 0.08) + ')');
    grad.addColorStop(1, 'rgba(200,230,255,0)');
    ctx.beginPath();
    ctx.arc(this.x, this.y, this.r, 0, Math.PI * 2);
    ctx.fillStyle = grad;
    ctx.fill();

    // 高光点
    ctx.beginPath();
    ctx.arc(this.x - this.r * 0.25, this.y - this.r * 0.35, this.r * 0.18, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(255,255,255,' + (twinkleAlpha + 0.4) + ')';
    ctx.fill();
  };

  // ──── 浅蓝空心爱心 ────
  function spawnHeart() {
    this.x = Math.random() * W;
    this.y = H + 10;
    this.size = 3 + Math.random() * 7;
    this.speed = 0.4 + Math.random() * 0.8;
    this.wobble = Math.random() * 0.4;
    this.wobbleSpeed = 0.006 + Math.random() * 0.012;
    this.wobbleOffset = Math.random() * Math.PI * 2;
    this.alpha = 0.18 + Math.random() * 0.28;
    this.twinkle = Math.random() * Math.PI * 2;
    this.twinkleSpeed = 0.03 + Math.random() * 0.05;
    this.rotation = Math.random() * Math.PI * 2;
  }
  spawnHeart.prototype.update = function (dt) {
    this.y -= this.speed * dt;
    this.x += Math.sin(this.wobbleOffset + this.y * this.wobbleSpeed) * this.wobble * dt;
    this.twinkle += this.twinkleSpeed * dt;
    if (this.y < -20) {
      this.y = H + 10;
      this.x = Math.random() * W;
      this.twinkle = Math.random() * Math.PI * 2;
    }
  };
  spawnHeart.prototype.drawHeartPath = function (ctx, x, y, s) {
    ctx.beginPath();
    ctx.moveTo(x, y + s * 0.35);
    ctx.bezierCurveTo(x, y, x - s, y, x - s, y - s * 0.35);
    ctx.bezierCurveTo(x - s, y - s * 0.7, x, y - s * 0.9, x, y - s * 1.1);
    ctx.bezierCurveTo(x, y - s * 0.9, x + s, y - s * 0.7, x + s, y - s * 0.35);
    ctx.bezierCurveTo(x + s, y, x, y, x, y + s * 0.35);
    ctx.closePath();
  };
  spawnHeart.prototype.draw = function (ctx) {
    var twinkleAlpha = this.alpha + Math.sin(this.twinkle) * 0.08;
    ctx.save();
    ctx.translate(this.x, this.y);
    ctx.rotate(this.rotation);
    // 空心描边
    this.drawHeartPath(ctx, 0, 0, this.size);
    ctx.strokeStyle = 'rgba(140,210,240,' + twinkleAlpha + ')';
    ctx.lineWidth = 1;
    ctx.stroke();
    // 微填充
    this.drawHeartPath(ctx, 0, 0, this.size);
    ctx.fillStyle = 'rgba(180,225,250,' + (twinkleAlpha * 0.4) + ')';
    ctx.fill();
    ctx.restore();
  };

  // ──── 鼠标点击弹出小气泡 ────
  function spawnClickBubbles(cx, cy) {
    var count = 3 + Math.floor(Math.random() * 3); // 3-5
    for (var i = 0; i < count; i++) {
      particles.push({
        type: 'clickBubble',
        x: cx + (Math.random() - 0.5) * 30,
        y: cy + (Math.random() - 0.5) * 30,
        r: 2 + Math.random() * 5,
        vx: (Math.random() - 0.5) * 0.6,
        vy: -(0.6 + Math.random() * 1.2),
        life: 1,
        decay: 0.008 + Math.random() * 0.015,
        alpha: 0.4 + Math.random() * 0.3
      });
    }
  }

  // ──── 头像框hover水波纹 ────
  function spawnRipple(cx, cy) {
    ripples.push({
      x: cx,
      y: cy,
      radius: 5,
      maxRadius: 60 + Math.random() * 40,
      life: 1,
      decay: 0.012
    });
  }

  // ──── 初始化 ────
  function init() {
    resize();
    particles = [];
    ripples = [];
    mouseGlowAlpha = 0;
    // 气泡
    for (var i = 0; i < BUBBLE_MAX; i++) {
      var b = new spawnBubble();
      b.y = Math.random() * H;
      particles.push(b);
    }
    // 爱心
    for (var j = 0; j < HEART_MAX; j++) {
      var h = new spawnHeart();
      h.y = Math.random() * H;
      particles.push(h);
    }
  }

  // ──── 渲染循环 ────
  function loop(timestamp) {
    requestAnimationFrame(loop);

    if (!lastTime) lastTime = timestamp;
    var dt = timestamp - lastTime;
    if (dt < frameInterval * 0.5) return; // 128ms min → ~8fps max, actually we want 120fps
    // 限速到 targetFPS
    if (dt > 50) dt = 50; // cap at 20fps equivalent to avoid huge jumps

    lastTime = timestamp;
    var dtNorm = dt / 16.667; // normalize to 60fps baseline

    ctx.clearRect(0, 0, W, H);

    // ── 鼠标跟随虚化光圈 ──
    if (mouseX > 0 && mouseY > 0) {
      mouseGlowAlpha += (1 - mouseGlowAlpha) * 0.06;
      var glowGrad = ctx.createRadialGradient(mouseX, mouseY, 0, mouseX, mouseY, 80);
      glowGrad.addColorStop(0, 'rgba(160,220,245,' + (0.18 * mouseGlowAlpha) + ')');
      glowGrad.addColorStop(0.5, 'rgba(140,210,240,' + (0.06 * mouseGlowAlpha) + ')');
      glowGrad.addColorStop(1, 'rgba(120,200,235,0)');
      ctx.beginPath();
      ctx.arc(mouseX, mouseY, 80, 0, Math.PI * 2);
      ctx.fillStyle = glowGrad;
      ctx.fill();
    } else {
      mouseGlowAlpha += (0 - mouseGlowAlpha) * 0.06;
    }

    // ── 更新/绘制粒子 ──
    for (var i = particles.length - 1; i >= 0; i--) {
      var p = particles[i];
      if (p.type === 'clickBubble') {
        p.x += p.vx * dtNorm;
        p.y += p.vy * dtNorm;
        p.life -= p.decay * dtNorm;
        if (p.life <= 0) { particles.splice(i, 1); continue; }
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(220,240,255,' + (p.alpha * p.life) + ')';
        ctx.fill();
      } else {
        p.update(dtNorm);
        p.draw(ctx);
      }
    }

    // ── 水波纹 ──
    for (var j = ripples.length - 1; j >= 0; j--) {
      var r = ripples[j];
      r.radius += 1.4 * dtNorm;
      r.life -= r.decay * dtNorm;
      if (r.life <= 0) { ripples.splice(j, 1); continue; }
      ctx.beginPath();
      ctx.arc(r.x, r.y, r.radius, 0, Math.PI * 2);
      ctx.strokeStyle = 'rgba(255,255,255,' + (r.life * 0.5) + ')';
      ctx.lineWidth = 1.5;
      ctx.stroke();
    }
  }

  // ──── 事件监听 ────
  window.addEventListener('resize', resize);

  canvas.style.pointerEvents = 'none';
  var lp = document.getElementById('login-page');
  if (lp) {
    lp.addEventListener('mousemove', function (e) {
      var rect = lp.getBoundingClientRect();
      mouseX = e.clientX - rect.left;
      mouseY = e.clientY - rect.top;
    });
    lp.addEventListener('mouseleave', function () {
      mouseX = -100;
      mouseY = -100;
    });
    lp.addEventListener('click', function (e) {
      var rect = lp.getBoundingClientRect();
      var cx = e.clientX - rect.left;
      var cy = e.clientY - rect.top;
      spawnClickBubbles(cx, cy);
    });
  }

  // 头像框hover水波纹
  var avatars = document.querySelectorAll('.login-avatar');
  avatars.forEach(function (av) {
    av.addEventListener('mouseenter', function (e) {
      var rect = av.getBoundingClientRect();
      var lpRect = lp.getBoundingClientRect();
      var cx = rect.left + rect.width / 2 - lpRect.left;
      var cy = rect.top + rect.height / 2 - lpRect.top;
      spawnRipple(cx, cy);
    });
  });

  // ──── 启动 ────
  init();
  requestAnimationFrame(loop);

  console.log('[LoginParticles v5.0] 120fps | bubbles + hearts | no gold/fireworks');
})();
