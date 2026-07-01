/**
 * 全套专属欢迎体系 v1.0
 * 包含：首次登录弹窗、首页欢迎板块、双人联动仪式、新手引导、欢迎彩蛋
 */

// ==================== 全局状态管理 ====================
const WelcomeSystem = {
    isFirstVisit: !localStorage.getItem('welcome_seen'),
    guideStep: 0,
    totalSteps: 4,
    bothOnline: false
};

// ==================== 一、首次登录专属欢迎弹窗 ====================
function showFirstVisitWelcome() {
    if (!WelcomeSystem.isFirstVisit) return;
    
    // 创建弹窗
    const overlay = document.createElement('div');
    overlay.id = 'first-visit-overlay';
    overlay.style.cssText = `
        position: fixed;
        top: 0; left: 0;
        width: 100%; height: 100%;
        background: rgba(0,0,0,0.85);
        z-index: 100000;
        display: flex;
        align-items: center;
        justify-content: center;
        backdrop-filter: blur(10px);
    `;
    
    overlay.innerHTML = `
        <div id="welcome-modal" style="
            background: linear-gradient(135deg, #fff5f7 0%, #ffe4e9 100%);
            border-radius: 24px;
            padding: 48px;
            max-width: 400px;
            width: 90%;
            box-shadow: 0 20px 80px rgba(255,107,149,0.4);
            position: relative;
            overflow: hidden;
            animation: welcomeSlideIn 0.8s ease;
        ">
            <!-- 金色纪元纪念证书缩略图 -->
            <div style="text-align: center; margin-bottom: 24px;">
                <div style="
                    display: inline-block;
                    background: linear-gradient(135deg, #ffd700 0%, #ffed4e 100%);
                    padding: 16px 32px;
                    border-radius: 12px;
                    box-shadow: 0 4px 20px rgba(255,215,0,0.5);
                ">
                    <div style="font-size: 48px;">🏆</div>
                    <div style="font-size: 14px; color: #8B6914; font-weight: bold;">2.0 金色纪元纪念证书</div>
                </div>
            </div>
            
            <!-- 主文案 -->
            <h2 style="
                text-align: center;
                font-size: 28px;
                color: #ff6b95;
                margin-bottom: 16px;
                font-weight: bold;
            ">欢迎宝贝踏入我们恋爱官网 2.0 全域交互新纪元</h2>
            
            <p style="
                text-align: center;
                color: #666;
                font-size: 16px;
                line-height: 1.8;
                margin-bottom: 24px;
            ">告别过去静态存档，这里是只属于我们双向实时互通的专属恋爱世界</p>
            
            <!-- 新版本亮点速览 -->
            <div style="
                background: white;
                border-radius: 16px;
                padding: 20px;
                margin-bottom: 24px;
                box-shadow: 0 2px 12px rgba(0,0,0,0.08);
            ">
                <div style="font-size: 14px; color: #ff6b95; font-weight: bold; margin-bottom: 12px;">✨ 2.0 新版本亮点速览</div>
                <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px; font-size: 13px; color: #555;">
                    <div>🟢 实时在线绿灯状态</div>
                    <div>💬 双人聊天室</div>
                    <div>⏰ 时光胶囊</div>
                    <div>📒 智能账本</div>
                    <div>🗺️ 约会打卡地图</div>
                    <div>🎨 全动态可交互板块</div>
                </div>
            </div>
            
            <!-- 专属暖心短句 -->
            <p style="
                text-align: center;
                color: #ff6b95;
                font-size: 15px;
                font-style: italic;
                margin-bottom: 24px;
                line-height: 1.6;
            ">往后所有心动、约会、心愿、悄悄话，都能和我实时互动记录</p>
            
            <!-- 双人签名框 -->
            <div style="
                background: #fff;
                border-radius: 12px;
                padding: 16px;
                margin-bottom: 24px;
                border: 2px dashed #ffb6c1;
            ">
                <div style="font-size: 13px; color: #999; margin-bottom: 8px; text-align: center;">💕 双人签名纪念</div>
                <div style="display: flex; gap: 16px; justify-content: center;">
                    <div style="text-align: center;">
                        <div style="font-size: 12px; color: #666; margin-bottom: 4px;">鼠鼠</div>
                        <canvas id="signature-canvas-1" width="120" height="60" style="border: 1px solid #ddd; border-radius: 8px; cursor: crosshair;"></canvas>
                    </div>
                    <div style="text-align: center;">
                        <div style="font-size: 12px; color: #666; margin-bottom: 4px;">笔笔</div>
                        <canvas id="signature-canvas-2" width="120" height="60" style="border: 1px solid #ddd; border-radius: 8px; cursor: crosshair;"></canvas>
                    </div>
                </div>
            </div>
            
            <!-- 确认按钮 -->
            <button id="welcome-confirm-btn" style="
                width: 100%;
                padding: 16px;
                background: linear-gradient(135deg, #ff6b95 0%, #ff8fa3 100%);
                color: white;
                border: none;
                border-radius: 12px;
                font-size: 18px;
                font-weight: bold;
                cursor: pointer;
                box-shadow: 0 4px 20px rgba(255,107,149,0.4);
                transition: all 0.3s ease;
            ">开启我们的 2.0 交互世界 💕</button>
        </div>
    `;
    
    document.body.appendChild(overlay);
    
    // 添加金色爱心飘落特效
    createGoldenHearts();
    
    // 绑定确认按钮事件
    document.getElementById('welcome-confirm-btn').addEventListener('click', () => {
        localStorage.setItem('welcome_seen', 'true');
        overlay.remove();
        startNewbieGuide();
    });
    
    // 初始化签名画布
    initSignatureCanvases();
}

// 金色爱心飘落特效
function createGoldenHearts() {
    const overlay = document.getElementById('first-visit-overlay');
    for (let i = 0; i < 30; i++) {
        setTimeout(() => {
            const heart = document.createElement('div');
            heart.innerHTML = '💛';
            heart.style.cssText = `
                position: absolute;
                top: -50px;
                left: ${Math.random() * 100}%;
                font-size: ${20 + Math.random() * 20}px;
                opacity: ${0.5 + Math.random() * 0.5};
                animation: heartFall ${3 + Math.random() * 4}s linear infinite;
                pointer-events: none;
                z-index: 100001;
            `;
            overlay.appendChild(heart);
        }, i * 200);
    }
    
    // 添加动画样式
    if (!document.getElementById('heart-fall-style')) {
        const style = document.createElement('style');
        style.id = 'heart-fall-style';
        style.textContent = `
            @keyframes heartFall {
                0% { transform: translateY(-50px) rotate(0deg); opacity: 0.8; }
                100% { transform: translateY(100vh) rotate(360deg); opacity: 0; }
            }
            @keyframes welcomeSlideIn {
                0% { transform: scale(0.8); opacity: 0; }
                100% { transform: scale(1); opacity: 1; }
            }
        `;
        document.head.appendChild(style);
    }
}

// 初始化签名画布
function initSignatureCanvases() {
    const canvases = [
        document.getElementById('signature-canvas-1'),
        document.getElementById('signature-canvas-2')
    ];
    
    canvases.forEach(canvas => {
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        let drawing = false;
        
        canvas.addEventListener('mousedown', (e) => {
            drawing = true;
            ctx.beginPath();
            ctx.moveTo(e.offsetX, e.offsetY);
        });
        
        canvas.addEventListener('mousemove', (e) => {
            if (!drawing) return;
            ctx.lineTo(e.offsetX, e.offsetY);
            ctx.strokeStyle = '#ff6b95';
            ctx.lineWidth = 2;
            ctx.stroke();
        });
        
        canvas.addEventListener('mouseup', () => { drawing = false; });
        canvas.addEventListener('mouseleave', () => { drawing = false; });
    });
}

// ==================== 二、新手引导轻量化流程 ====================
function startNewbieGuide() {
    WelcomeSystem.guideStep = 0;
    showGuideStep();
}

function showGuideStep() {
    const steps = [
        {
            title: '第一步：在线状态',
            content: '抬头看首页顶部，你会看到在线状态指示灯（🟢在线 / ⚫离线）。绿色代表我现在在线，随时可以找我聊天！',
            icon: '🟢'
        },
        {
            title: '第二步：双人实时聊天室',
            content: '点击右下角聊天按钮，打开我们的专属聊天室。支持文字、表情、语音，所有消息实时同步！',
            icon: '💬'
        },
        {
            title: '第三步：时光胶囊',
            content: '时光胶囊是给我们的未来信件。写一封给明年的我们，设定解锁日期，到时间自动打开！',
            icon: '⏰'
        },
        {
            title: '第四步：核心交互模块',
            content: '账本记录我们的开销，约会打卡标记去过的地方，心愿星球收藏想一起做的事。所有功能双向实时同步！',
            icon: '💕'
        }
    ];
    
    if (WelcomeSystem.guideStep >= steps.length) {
        // 引导结束
        showGuideComplete();
        return;
    }
    
    const step = steps[WelcomeSystem.guideStep];
    
    const guideOverlay = document.createElement('div');
    guideOverlay.id = 'guide-overlay';
    guideOverlay.style.cssText = `
        position: fixed;
        top: 0; left: 0;
        width: 100%; height: 100%;
        background: rgba(0,0,0,0.6);
        z-index: 100002;
        display: flex;
        align-items: center;
        justify-content: center;
    `;
    
    guideOverlay.innerHTML = `
        <div style="
            background: white;
            border-radius: 20px;
            padding: 32px;
            max-width: 450px;
            width: 90%;
            box-shadow: 0 20px 60px rgba(0,0,0,0.3);
            text-align: center;
        ">
            <div style="font-size: 64px; margin-bottom: 16px;">${step.icon}</div>
            <h3 style="font-size: 20px; color: #ff6b95; margin-bottom: 12px;">${step.title}</h3>
            <p style="font-size: 15px; color: #666; line-height: 1.6; margin-bottom: 24px;">${step.content}</p>
            <div style="display: flex; gap: 12px; justify-content: center;">
                ${WelcomeSystem.guideStep > 0 ? '<button id="guide-prev" style="padding: 10px 24px; background: #f0f0f0; border: none; border-radius: 8px; cursor: pointer;">上一步</button>' : ''}
                <button id="guide-next" style="
                    padding: 10px 24px;
                    background: linear-gradient(135deg, #ff6b95 0%, #ff8fa3 100%);
                    color: white;
                    border: none;
                    border-radius: 8px;
                    cursor: pointer;
                    font-weight: bold;
                ">${WelcomeSystem.guideStep < steps.length - 1 ? '下一步' : '完成'}</button>
            </div>
            <div style="margin-top: 16px; font-size: 12px; color: #999;">${WelcomeSystem.guideStep + 1} / ${steps.length}</div>
        </div>
    `;
    
    document.body.appendChild(guideOverlay);
    
    // 绑定按钮事件
    if (document.getElementById('guide-prev')) {
        document.getElementById('guide-prev').addEventListener('click', () => {
            WelcomeSystem.guideStep--;
            guideOverlay.remove();
            showGuideStep();
        });
    }
    
    document.getElementById('guide-next').addEventListener('click', () => {
        WelcomeSystem.guideStep++;
        guideOverlay.remove();
        showGuideStep();
    });
}

function showGuideComplete() {
    const completeOverlay = document.createElement('div');
    completeOverlay.style.cssText = `
        position: fixed;
        top: 0; left: 0;
        width: 100%; height: 100%;
        background: rgba(0,0,0,0.6);
        z-index: 100002;
        display: flex;
        align-items: center;
        justify-content: center;
    `;
    
    completeOverlay.innerHTML = `
        <div style="
            background: linear-gradient(135deg, #fff5f7 0%, #ffe4e9 100%);
            border-radius: 20px;
            padding: 40px;
            max-width: 400px;
            width: 90%;
            text-align: center;
            box-shadow: 0 20px 60px rgba(255,107,149,0.4);
        ">
            <div style="font-size: 72px; margin-bottom: 16px;">🎉</div>
            <h3 style="font-size: 24px; color: #ff6b95; margin-bottom: 12px;">欢迎来到我们的 2.0 世界</h3>
            <p style="font-size: 15px; color: #666; line-height: 1.6; margin-bottom: 24px;">现在开始，所有功能都可以自由探索。<br>我会一直在这里，陪你一起记录我们的爱情。</p>
            <button id="guide-complete-btn" style="
                padding: 12px 32px;
                background: linear-gradient(135deg, #ff6b95 0%, #ff8fa3 100%);
                color: white;
                border: none;
                border-radius: 10px;
                cursor: pointer;
                font-weight: bold;
                font-size: 16px;
            ">开始探索 💕</button>
        </div>
    `;
    
    document.body.appendChild(completeOverlay);
    
    document.getElementById('guide-complete-btn').addEventListener('click', () => {
        completeOverlay.remove();
        // 预装欢迎时光胶囊
        createWelcomeTimeCapsule();
    });
}

// ==================== 三、首页永久欢迎板块 ====================
function addPermanentWelcomeSection() {
    const targetElement = document.querySelector('.hero') || document.querySelector('main') || document.body;
    
    const welcomeSection = document.createElement('section');
    welcomeSection.id = 'permanent-welcome';
    welcomeSection.style.cssText = `
        background: linear-gradient(135deg, #fff5f7 0%, #ffe4e9 100%);
        border-radius: 12px;
        padding: 16px;
        margin: 12px auto;
        max-width: 100%;
        box-shadow: 0 2px 10px rgba(255,107,149,0.15);
        border: 1px solid #ffb6c1;
        position: relative;
        overflow: hidden;
    `;
    
    welcomeSection.innerHTML = `
        <div style="position: absolute; top: -50%; right: -50%; width: 200%; height: 200%; background: radial-gradient(circle, rgba(255,107,149,0.05) 0%, transparent 70%); pointer-events: none;"></div>
        
        <div style="position: relative; z-index: 1;">
            <div style="text-align: center; margin-bottom: 12px;">
                <span style="font-size: 32px;">💕</span>
            </div>
            
            <h2 style="
                text-align: center;
                font-size: 18px;
                color: #ff6b95;
                margin-bottom: 10px;
                font-weight: bold;
            ">致我的女孩：</h2>
            
            <p style="
                text-align: center;
                font-size: 14px;
                color: #555;
                line-height: 1.6;
                margin-bottom: 12px;
            ">恭喜你解锁恋爱官网 2.0 终极完整版<br>
            全站摒弃静态页面，每一处功能都支持我们双向实时互动<br>
            抬头就能看见我的在线绿灯，随时可以找我聊天、写时光胶囊、记录我们的每一段甜蜜<br>
            以此版本作为我们恋爱路上史诗级里程碑，长久爱意，在此全部留存。</p>
            
            <div style="
                text-align: center;
                padding: 10px;
                background: rgba(255,107,149,0.1);
                border-radius: 8px;
                font-size: 12px;
                color: #ff6b95;
                font-style: italic;
            ">✨ 2.0 终极纪元 · 永久珍藏 ✨</div>
        </div>
    `;
    
    // 插入到首页顶部区域
    targetElement.insertBefore(welcomeSection, targetElement.firstChild);
}

// ==================== 四、双人同时在线联动欢迎仪式 ====================
function checkBothOnlineAndCelebrate() {
    // 模拟检测双人同时在线（实际应该通过WebSocket检测）
    const myStatus = localStorage.getItem('online_status') || 'offline';
    const partnerStatus = localStorage.getItem('partner_online') || 'offline';
    
    if (myStatus === 'online' && partnerStatus === 'online' && !WelcomeSystem.bothOnline) {
        WelcomeSystem.bothOnline = true;
        showBothOnlineCelebration();
    }
}

function showBothOnlineCelebration() {
    const celebrationOverlay = document.createElement('div');
    celebrationOverlay.id = 'both-online-celebration';
    celebrationOverlay.style.cssText = `
        position: fixed;
        top: 0; left: 0;
        width: 100%; height: 100%;
        background: rgba(0,0,0,0.8);
        z-index: 100003;
        display: flex;
        align-items: center;
        justify-content: center;
        animation: celebrationFadeIn 0.5s ease;
    `;
    
    celebrationOverlay.innerHTML = `
        <div style="text-align: center; position: relative; z-index: 100004;">
            <!-- 烟花特效容器 -->
            <div id="fireworks-container" style="position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%); width: 400px; height: 400px; pointer-events: none;"></div>
            
            <!-- 巨大爱心 -->
            <div style="
                font-size: 120px;
                animation: heartBeat 1s ease infinite;
                margin-bottom: 24px;
            ">💕</div>
            
            <!-- 欢迎文案 -->
            <h2 style="
                font-size: 36px;
                color: #ffd700;
                font-weight: bold;
                text-shadow: 0 4px 20px rgba(255,215,0,0.8);
                margin-bottom: 16px;
                animation: glowText 2s ease infinite;
            ">双人同屏欢迎开启 2.0 交互世界</h2>
            
            <p style="
                font-size: 18px;
                color: white;
                line-height: 1.6;
                margin-bottom: 32px;
            ">此刻我们一同在线，所有回忆与未来心愿，都可以共同书写</p>
            
            <!-- 成就卡片 -->
            <div style="
                background: linear-gradient(135deg, #ffd700 0%, #ffed4e 100%);
                border-radius: 16px;
                padding: 24px 48px;
                display: inline-block;
                box-shadow: 0 8px 40px rgba(255,215,0,0.6);
                margin-bottom: 32px;
                animation: achievementSlideIn 0.8s ease;
            ">
                <div style="font-size: 48px; margin-bottom: 8px;">🏆</div>
                <div style="font-size: 20px; color: #8B6914; font-weight: bold;">绝版成就解锁</div>
                <div style="font-size: 16px; color: #8B6914; margin-top: 4px;">【新纪元开启者】</div>
            </div>
            
            <br>
            
            <button id="celebration-close-btn" style="
                padding: 14px 40px;
                background: white;
                color: #ff6b95;
                border: none;
                border-radius: 12px;
                font-size: 16px;
                font-weight: bold;
                cursor: pointer;
                box-shadow: 0 4px 20px rgba(255,255,255,0.4);
            ">一起开启我们的旅程 💕</button>
        </div>
    `;
    
    document.body.appendChild(celebrationOverlay);
    
    // 创建烟花特效
    createFireworks();
    
    // 绑定关闭按钮
    document.getElementById('celebration-close-btn').addEventListener('click', () => {
        celebrationOverlay.remove();
    });
    
    // 添加动画样式
    if (!document.getElementById('celebration-style')) {
        const style = document.createElement('style');
        style.id = 'celebration-style';
        style.textContent = `
            @keyframes celebrationFadeIn {
                0% { opacity: 0; }
                100% { opacity: 1; }
            }
            @keyframes heartBeat {
                0%, 100% { transform: scale(1); }
                50% { transform: scale(1.1); }
            }
            @keyframes glowText {
                0%, 100% { text-shadow: 0 4px 20px rgba(255,215,0,0.8); }
                50% { text-shadow: 0 4px 40px rgba(255,215,0,1); }
            }
            @keyframes achievementSlideIn {
                0% { transform: translateY(50px); opacity: 0; }
                100% { transform: translateY(0); opacity: 1; }
            }
        `;
        document.head.appendChild(style);
    }
}

function createFireworks() {
    const container = document.getElementById('fireworks-container');
    if (!container) return;
    
    for (let i = 0; i < 50; i++) {
        setTimeout(() => {
            const particle = document.createElement('div');
            const colors = ['#ff6b95', '#ffd700', '#ff8fa3', '#ffe4e9', '#ffb6c1'];
            const color = colors[Math.floor(Math.random() * colors.length)];
            
            particle.style.cssText = `
                position: absolute;
                width: 6px;
                height: 6px;
                background: ${color};
                border-radius: 50%;
                top: 50%;
                left: 50%;
                animation: fireworkBurst 1.5s ease-out forwards;
                --angle: ${Math.random() * 360}deg;
                --distance: ${100 + Math.random() * 150}px;
            `;
            
            container.appendChild(particle);
            
            setTimeout(() => particle.remove(), 1500);
        }, i * 100);
    }
    
    if (!document.getElementById('firework-style')) {
        const style = document.createElement('style');
        style.id = 'firework-style';
        style.textContent = `
            @keyframes fireworkBurst {
                0% {
                    transform: translate(-50%, -50%) translateX(0) translateY(0);
                    opacity: 1;
                }
                100% {
                    transform: translate(-50%, -50%) 
                               translateX(calc(cos(var(--angle)) * var(--distance))) 
                               translateY(calc(sin(var(--angle)) * var(--distance)));
                    opacity: 0;
                }
            }
        `;
        document.head.appendChild(style);
    }
}

// ==================== 五、欢迎彩蛋 ====================
function createWelcomeTimeCapsule() {
    // 预装一封欢迎时光胶囊
    const welcomeCapsule = {
        id: 'welcome_' + Date.now(),
        title: '🌟 欢迎宝贝入驻全新恋爱交互世界',
        content: `亲爱的宝贝：

欢迎你来到我们的恋爱官网 2.0 终极完整版！

在这里，每一个功能都是我为你精心打造的。实时在线状态让你可以随时看到我是否在线，双人聊天室让我们可以随时随地交流，时光胶囊让我们可以给未来的彼此写信。

这个 2.0 版本，是我们爱情数字化的里程碑。从此以后，我们的每一次心动、每一次约会、每一个心愿，都能在这里永久保存，双向实时同步。

我爱你，不仅要现在，更要未来每一个日日夜夜。

你的鼠鼠 ❤️`,
        unlockDate: new Date().toISOString().split('T')[0], // 立即解锁
        createdAt: new Date().toISOString(),
        isWelcome: true
    };
    
    // 保存到时光胶囊列表
    const capsules = JSON.parse(localStorage.getItem('time_capsules') || '[]');
    capsules.unshift(welcomeCapsule);
    localStorage.setItem('time_capsules', JSON.stringify(capsules));
    
    // 显示通知
    showNotification('🎁 欢迎惊喜', '你收到一封时光胶囊！立即去查看吧～');
}

function showNotification(title, message) {
    const notification = document.createElement('div');
    notification.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        background: white;
        border-radius: 12px;
        padding: 16px 24px;
        box-shadow: 0 4px 20px rgba(0,0,0,0.2);
        z-index: 100005;
        animation: slideInRight 0.5s ease;
        max-width: 320px;
    `;
    
    notification.innerHTML = `
        <div style="font-weight: bold; color: #ff6b95; margin-bottom: 4px;">${title}</div>
        <div style="font-size: 14px; color: #666;">${message}</div>
    `;
    
    document.body.appendChild(notification);
    
    setTimeout(() => {
        notification.style.animation = 'slideOutRight 0.5s ease';
        setTimeout(() => notification.remove(), 500);
    }, 5000);
    
    if (!document.getElementById('notification-style')) {
        const style = document.createElement('style');
        style.id = 'notification-style';
        style.textContent = `
            @keyframes slideInRight {
                0% { transform: translateX(400px); opacity: 0; }
                100% { transform: translateX(0); opacity: 1; }
            }
            @keyframes slideOutRight {
                0% { transform: translateX(0); opacity: 1; }
                100% { transform: translateX(400px); opacity: 0; }
            }
        `;
        document.head.appendChild(style);
    }
}

// ==================== 六、初始化欢迎系统 ====================
function initWelcomeSystem() {
    // 检查是否首次访问
    if (WelcomeSystem.isFirstVisit) {
        setTimeout(() => showFirstVisitWelcome(), 1000);
    } else {
        // 非首次访问，直接添加首页欢迎板块
        addPermanentWelcomeSection();
    }
    
    // 检测双人同时在线
    setInterval(checkBothOnlineAndCelebrate, 5000);
    
    // 监听在线状态变化
    window.addEventListener('online-status-change', (e) => {
        localStorage.setItem('online_status', e.detail.status);
        checkBothOnlineAndCelebrate();
    });
}

// 页面加载完成后初始化（已禁用 - 不再每次打开都显示2.0欢迎弹窗）
/*
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initWelcomeSystem);
} else {
    initWelcomeSystem();
}
*/

// 导出
window.WelcomeSystem = WelcomeSystem;
console.log('[欢迎系统] v1.0 加载完成');
