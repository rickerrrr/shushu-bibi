/**
 * 每周双人甜蜜任务系统增强版 v2.0
 * 新增：合拍照片、情话、约会、歌单
 * 奖励：星光 + 纪念头像框
 */

// ==================== 任务数据库增强 ====================
const GameTasksPro = {
    weekly: [
        {
            id: 'take_photo',
            title: '合拍一张照片',
            desc: '一起拍一张合照，记录今天的美好瞬间',
            reward: 20,
            icon: '📸',
            proofType: 'photo'
        },
        {
            id: 'write_love',
            title: '互写一段情话',
            desc: '各自写一段最动人的情话发给对方',
            reward: 15,
            icon: '💌',
            proofType: 'text'
        },
        {
            id: 'date_together',
            title: '共同完成一次约会',
            desc: '一起出去约会，可以是吃饭、看电影、散步',
            reward: 25,
            icon: '💑',
            proofType: 'photo'
        },
        {
            id: 'listen_music',
            title: '一起听专属歌单',
            desc: '一起听我们的专属歌单，分享彼此的心情',
            reward: 15,
            icon: '🎵',
            proofType: 'text'
        },
        {
            id: 'cook_together',
            title: '一起做饭',
            desc: '一起下厨做一顿美味的晚餐',
            reward: 25,
            icon: '🍳',
            proofType: 'photo'
        },
        {
            id: 'watch_movie',
            title: '一起看电影',
            desc: '一起看一部电影，聊聊观后感',
            reward: 20,
            icon: '🎬',
            proofType: 'text'
        },
        {
            id: 'walk_together',
            title: '一起散步',
            desc: '手牵手一起散步，聊聊天',
            reward: 15,
            icon: '🚶',
            proofType: 'photo'
        },
        {
            id: 'make_wish',
            title: '一起许愿',
            desc: '各自许一个愿望，互相分享',
            reward: 10,
            icon: '⭐',
            proofType: 'text'
        },
        {
            id: 'read_book',
            title: '一起读书',
            desc: '一起读一本书，交流读后感',
            reward: 20,
            icon: '📚',
            proofType: 'text'
        },
        {
            id: 'exercise_together',
            title: '一起运动',
            desc: '一起去跑步、健身或做任何运动',
            reward: 20,
            icon: '🏃',
            proofType: 'photo'
        }
    ],
    
    // 纪念头像框
    avatarFrames: [
        { id: 'frame_1', name: '初心者', icon: '🌟', requiredStarlight: 50 },
        { id: 'frame_2', name: '甜蜜达人', icon: '💕', requiredStarlight: 100 },
        { id: 'frame_3', name: '浪漫专家', icon: '🌹', requiredStarlight: 200 },
        { id: 'frame_4', name: '挚爱永恒', icon: '💎', requiredStarlight: 500 },
        { id: 'frame_5', name: '传奇恋人', icon: '👑', requiredStarlight: 1000 }
    ],
    
    // 获取本周任务
    getWeeklyTask() {
        const weekNum = this.getWeekNumber();
        const index = weekNum % this.weekly.length;
        return this.weekly[index];
    },
    
    // 获取本周序号
    getWeekNumber() {
        const now = new Date();
        const start = new Date(now.getFullYear(), 0, 1);
        const diff = now - start;
        const oneWeek = 1000 * 60 * 60 * 24 * 7;
        return Math.floor(diff / oneWeek);
    },
    
    // 检查头像框解锁
    checkAvatarFrames(totalStarlight) {
        const unlocked = [];
        this.avatarFrames.forEach(frame => {
            if (totalStarlight >= frame.requiredStarlight) {
                unlocked.push(frame);
            }
        });
        return unlocked;
    }
};

// ==================== 打卡游戏增强版核心类 ====================
class CoupleGamePro {
    constructor() {
        this.starlight = this.loadStarlight();
        this.completedTasks = this.loadCompletedTasks();
        this.unlockedFrames = this.loadUnlockedFrames();
        this.currentTask = null;
        this.init();
    }
    
    init() {
        this.createGameUIPro();
        this.bindEventsPro();
        this.checkWeeklyTask();
    }
    
    // 创建增强版UI
    createGameUIPro() {
        const targetElement = document.querySelector('#couple-game-section') || document.querySelector('main') || document.body;
        
        // 如果已存在，则替换
        const existing = document.getElementById('couple-game-section');
        if (existing) {
            existing.remove();
        }
        
        const gameSection = document.createElement('section');
        gameSection.id = 'couple-game-section-pro';
        gameSection.style.cssText = `
            background: rgba(255,255,255,0.75);
            backdrop-filter: blur(12px);
            -webkit-backdrop-filter: blur(12px);
            border-radius: 14px;
            padding: 10px;
            margin: 8px auto;
            max-width: 100%;
            box-shadow: 0 2px 12px rgba(0,0,0,0.06);
            border: 1px solid rgba(255,255,255,0.5);
        `;

        gameSection.innerHTML = `
            <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 12px;">
                <div style="display: flex; align-items: center; gap: 8px;">
                    <span style="font-size: 18px;">🎮</span>
                    <h3 style="font-size: 14px; color: #333; margin: 0;">每周双人甜蜜任务</h3>
                </div>
                <div id="starlight-display-pro" style="
                    background: linear-gradient(135deg, #ffd700 0%, #ffed4e 100%);
                    padding: 4px 12px;
                    border-radius: 16px;
                    font-size: 11px;
                    font-weight: bold;
                    color: #8B6914;
                    box-shadow: 0 2px 8px rgba(255,215,0,0.4);
                    display: flex;
                    align-items: center;
                    gap: 4px;
                ">✨ 星光: 0</div>
            </div>

            <!-- 本周任务 -->
            <div id="weekly-task-card-pro" style="
                background: rgba(255,255,255,0.9);
                border-radius: 12px;
                padding: 14px;
                margin-bottom: 12px;
                box-shadow: 0 2px 8px rgba(0,0,0,0.05);
            ">
                <div style="text-align: center; padding: 12px;">
                    <div style="font-size: 14px; color: #999; margin-bottom: 8px;">本周任务加载中...</div>
                </div>
            </div>
            
            <!-- 完成任务按钮 -->
            <button id="complete-task-btn-pro" style="
                width: 100%;
                padding: 10px;
                background: linear-gradient(135deg, #ff6b95 0%, #ff8fa3 100%);
                color: white;
                border: none;
                border-radius: 10px;
                font-size: 13px;
                font-weight: bold;
                cursor: pointer;
                box-shadow: 0 3px 12px rgba(255,107,149,0.4);
                transition: all 0.3s;
            " onmouseover="this.style.transform='translateY(-1px)'; this.style.boxShadow='0 5px 16px rgba(255,107,149,0.6)'" 
               onmouseout="this.style.transform='translateY(0)'; this.style.boxShadow='0 3px 12px rgba(255,107,149,0.4)'">完成任务，领取星光奖励 💕</button>

            <!-- 纪念头像框展示 -->
            <div style="margin-top: 14px;">
                <div style="font-size: 12px; color: #333; font-weight: bold; margin-bottom: 8px;">🏆 纪念头像框</div>
                <div id="avatar-frames-list" style="
                    display: grid;
                    grid-template-columns: repeat(auto-fill, minmax(70px, 1fr));
                    gap: 8px;
                "></div>
            </div>

            <!-- 历史记录 -->
            <div style="margin-top: 14px;">
                <div style="font-size: 12px; color: #333; font-weight: bold; margin-bottom: 8px;">完成记录</div>
                <div id="game-history-list-pro" style="
                    max-height: 150px;
                    overflow-y: auto;
                "></div>
            </div>
        `;
        
        targetElement.appendChild(gameSection);
    }
    
    // 绑定增强版事件
    bindEventsPro() {
        document.getElementById('complete-task-btn-pro').addEventListener('click', () => this.completeTaskPro());
    }
    
    // 检查本周任务
    checkWeeklyTask() {
        this.currentTask = GameTasksPro.getWeeklyTask();
        this.renderWeeklyTaskPro();
        this.renderStarlightPro();
        this.renderAvatarFrames();
        this.renderHistoryPro();
    }
    
    // 渲染本周任务（增强版）
    renderWeeklyTaskPro() {
        if (!this.currentTask) return;
        
        const card = document.getElementById('weekly-task-card-pro');
        const isCompleted = this.isTaskCompletedThisWeek();
        
        let proofInput = '';
        if (this.currentTask.proofType === 'photo') {
            proofInput = `
                <div style="margin-top: 10px;">
                    <label style="font-size: 11px; color: #666; display: block; margin-bottom: 4px;">上传合照证明</label>
                    <input type="file" accept="image/*" id="task-proof-photo" style="
                        width: 100%;
                        padding: 5px;
                        border: 1.5px dashed #ff6b95;
                        border-radius: 6px;
                        cursor: pointer;
                    ">
                </div>
            `;
        } else {
            proofInput = `
                <div style="margin-top: 10px;">
                    <label style="font-size: 11px; color: #666; display: block; margin-bottom: 4px;">输入完成证明</label>
                    <textarea id="task-proof-text" placeholder="例如：一起听了《XXX》这首歌，好感动..." style="
                        width: 100%;
                        padding: 8px;
                        border: 1.5px solid #f0f0f0;
                        border-radius: 6px;
                        font-size: 12px;
                        outline: none;
                        resize: vertical;
                        min-height: 50px;
                    "></textarea>
                </div>
            `;
        }

        card.innerHTML = `
            <div style="text-align: center;">
                <div style="font-size: 48px; margin-bottom: 8px;">${this.currentTask.icon}</div>
                <h4 style="font-size: 15px; color: #ff6b95; margin-bottom: 6px;">${this.currentTask.title}</h4>
                <p style="font-size: 12px; color: #666; line-height: 1.5; margin-bottom: 10px;">${this.currentTask.desc}</p>
                <div style="
                    display: inline-block;
                    background: linear-gradient(135deg, #ffd700 0%, #ffed4e 100%);
                    padding: 4px 14px;
                    border-radius: 14px;
                    font-size: 11px;
                    font-weight: bold;
                    color: #8B6914;
                    box-shadow: 0 2px 8px rgba(255,215,0,0.4);
                ">奖励: ${this.currentTask.reward} 星光 ✨</div>

                ${proofInput}

                ${isCompleted ? '<div style="margin-top: 10px; color: #4caf50; font-size: 13px; font-weight: bold;">✅ 本周任务已完成</div>' : ''}
            </div>`;
        
        // 更新按钮状态
        const btn = document.getElementById('complete-task-btn-pro');
        if (isCompleted) {
            btn.disabled = true;
            btn.style.opacity = '0.5';
            btn.textContent = '本周任务已完成 🎉';
        } else {
            btn.disabled = false;
            btn.style.opacity = '1';
            btn.textContent = '完成任务，领取星光奖励 💕';
        }
    }
    
    // 完成任务（增强版）
    completeTaskPro() {
        if (!this.currentTask) return;
        
        let proof = '';
        
        // 根据任务类型获取证明
        if (this.currentTask.proofType === 'photo') {
            const fileInput = document.getElementById('task-proof-photo');
            if (!fileInput || !fileInput.files[0]) {
                alert('请上传合照作为证明');
                return;
            }
            proof = fileInput.files[0].name;
            // 实际应该上传到服务器，这里简化为文件名
        } else {
            const textInput = document.getElementById('task-proof-text');
            if (!textInput || !textInput.value.trim()) {
                alert('请输入完成证明');
                return;
            }
            proof = textInput.value.trim();
        }
        
        // 记录完成
        const record = {
            id: Date.now(),
            taskId: this.currentTask.id,
            taskTitle: this.currentTask.title,
            proof: proof,
            proofType: this.currentTask.proofType,
            reward: this.currentTask.reward,
            completedAt: new Date().toISOString(),
            week: GameTasksPro.getWeekNumber()
        };
        
        this.completedTasks.push(record);
        this.starlight += this.currentTask.reward;
        
        this.saveCompletedTasks();
        this.saveStarlight();
        
        // 检查头像框解锁
        this.checkAndUnlockFrames();
        
        // 显示奖励动画
        this.showRewardAnimationPro(this.currentTask.reward);
        
        // 重新渲染
        this.renderWeeklyTaskPro();
        this.renderStarlightPro();
        this.renderAvatarFrames();
        this.renderHistoryPro();
    }
    
    // 检查并解锁头像框
    checkAndUnlockFrames() {
        const availableFrames = GameTasksPro.checkAvatarFrames(this.starlight);
        const newFrames = availableFrames.filter(f => !this.unlockedFrames.includes(f.id));
        
        if (newFrames.length > 0) {
            newFrames.forEach(frame => {
                this.unlockedFrames.push(frame.id);
                this.showFrameUnlockAnimation(frame);
            });
            
            this.saveUnlockedFrames();
        }
    }
    
    // 显示头像框解锁动画
    showFrameUnlockAnimation(frame) {
        const overlay = document.createElement('div');
        overlay.style.cssText = `
            position: fixed;
            top: 0; left: 0;
            width: 100%; height: 100%;
            background: rgba(0,0,0,0.8);
            z-index: 100040;
            display: flex;
            align-items: center;
            justify-content: center;
            animation: fadeIn 0.5s ease;
        `;
        
        overlay.innerHTML = `
            <div style="text-align: center; color: white;">
                <div style="
                    font-size: 100px;
                    animation: frameUnlockBounce 0.8s ease;
                    margin-bottom: 20px;
                ">${frame.icon}</div>
                <h2 style="
                    font-size: 36px;
                    color: #ffd700;
                    font-weight: bold;
                    margin-bottom: 12px;
                ">纪念头像框解锁！</h2>
                <p style="font-size: 20px; margin-bottom: 8px;">🏆 ${frame.name}</p>
                <p style="font-size: 16px; color: #ccc; margin-bottom: 32px;">累计星光达到 ${frame.requiredStarlight}，解锁专属头像框</p>
                <button id="frame-unlock-close-btn" style="
                    padding: 14px 40px;
                    background: white;
                    color: #ff6b95;
                    border: none;
                    border-radius: 12px;
                    font-size: 18px;
                    font-weight: bold;
                    cursor: pointer;
                    box-shadow: 0 4px 20px rgba(255,255,255,0.4);
                ">太棒了！💕</button>
            </div>
        `;
        
        document.body.appendChild(overlay);
        
        document.getElementById('frame-unlock-close-btn').addEventListener('click', () => overlay.remove());
        
        // 添加动画样式
        if (!document.getElementById('frame-unlock-style')) {
            const style = document.createElement('style');
            style.id = 'frame-unlock-style';
            style.textContent = `
                @keyframes fadeIn {
                    0% { opacity: 0; }
                    100% { opacity: 1; }
                }
                @keyframes frameUnlockBounce {
                    0% { transform: scale(0.3) rotate(0deg); opacity: 0; }
                    50% { transform: scale(1.3) rotate(180deg); }
                    100% { transform: scale(1) rotate(360deg); opacity: 1; }
                }
            `;
            document.head.appendChild(style);
        }
    }
    
    // 显示奖励动画（增强版）
    showRewardAnimationPro(amount) {
        const overlay = document.createElement('div');
        overlay.style.cssText = `
            position: fixed;
            top: 0; left: 0;
            width: 100%; height: 100%;
            background: rgba(0,0,0,0.7);
            z-index: 100030;
            display: flex;
            align-items: center;
            justify-content: center;
            animation: fadeIn 0.3s ease;
        `;
        
        overlay.innerHTML = `
            <div style="text-align: center; color: white;">
                <div style="
                    font-size: 100px;
                    animation: rewardBounce 0.6s ease;
                    margin-bottom: 20px;
                ">🎉</div>
                <h2 style="
                    font-size: 40px;
                    color: #ffd700;
                    font-weight: bold;
                    margin-bottom: 12px;
                ">+${amount} 星光 ✨</h2>
                <p style="font-size: 20px; margin-bottom: 32px;">任务完成！你真棒～</p>
                <button id="reward-close-btn-pro" style="
                    padding: 14px 40px;
                    background: white;
                    color: #ff6b95;
                    border: none;
                    border-radius: 12px;
                    font-size: 18px;
                    font-weight: bold;
                    cursor: pointer;
                    box-shadow: 0 4px 20px rgba(255,255,255,0.4);
                ">继续加油 💪</button>
            </div>
        `;
        
        document.body.appendChild(overlay);
        
        document.getElementById('reward-close-btn-pro').addEventListener('click', () => overlay.remove());
    }
    
    // 检查本周是否已完成
    isTaskCompletedThisWeek() {
        const weekNum = GameTasksPro.getWeekNumber();
        return this.completedTasks.some(task => task.week === weekNum);
    }
    
    // 渲染星光（增强版）
    renderStarlightPro() {
        const display = document.getElementById('starlight-display-pro');
        display.textContent = `✨ 星光: ${this.starlight}`;
    }
    
    // 渲染头像框
    renderAvatarFrames() {
        const container = document.getElementById('avatar-frames-list');
        if (!container) return;
        
        container.innerHTML = GameTasksPro.avatarFrames.map(frame => {
            const isUnlocked = this.unlockedFrames.includes(frame.id);
            return `
                <div style="
                    text-align: center;
                    padding: 12px;
                    background: ${isUnlocked ? 'linear-gradient(135deg, #ffd700 0%, #ffed4e 100%)' : '#f0f0f0'};
                    border-radius: 12px;
                    box-shadow: ${isUnlocked ? '0 4px 15px rgba(255,215,0,0.5)' : 'none'};
                    opacity: ${isUnlocked ? 1 : 0.5};
                    transition: all 0.3s;
                " title="${isUnlocked ? frame.name : '需要 ' + frame.requiredStarlight + ' 星光'}" onmouseover="this.style.transform='translateY(-2px)'" onmouseout="this.style.transform='translateY(0)'">
                    <div style="font-size: 32px; margin-bottom: 4px;">${isUnlocked ? frame.icon : '🔒'}</div>
                    <div style="font-size: 11px; color: ${isUnlocked ? '#8B6914' : '#999'}; font-weight: ${isUnlocked ? 'bold' : 'normal'}">${isUnlocked ? frame.name : frame.requiredStarlight + '✨'}</div>
                </div>
            `;
        }).join('');
    }
    
    // 渲染历史（增强版）
    renderHistoryPro() {
        const container = document.getElementById('game-history-list-pro');
        if (!container) return;
        
        if (this.completedTasks.length === 0) {
            container.innerHTML = '<div style="text-align: center; color: #999; font-size: 14px; padding: 16px;">暂无完成记录</div>';
            return;
        }
        
        const recentTasks = this.completedTasks.slice(-8).reverse();
        
        container.innerHTML = recentTasks.map(record => `
            <div style="
                background: white;
                border-radius: 10px;
                padding: 12px 16px;
                margin-bottom: 10px;
                font-size: 14px;
                box-shadow: 0 2px 8px rgba(0,0,0,0.08);
                display: flex;
                align-items: center;
                gap: 12px;
            ">
                <div style="font-size: 24px;">${GameTasksPro.weekly.find(t => t.id === record.taskId)?.icon || '🎮'}</div>
                <div style="flex: 1;">
                    <div style="font-weight: bold; color: #ff6b95; margin-bottom: 2px;">${record.taskTitle}</div>
                    <div style="color: #999; font-size: 12px;">${record.proof}</div>
                </div>
                <div style="color: #ffd700; font-weight: bold; font-size: 14px;">+${record.reward} ✨</div>
            </div>
        `).join('');
    }
    
    // 加载星光
    loadStarlight() {
        const stored = localStorage.getItem('game_starlight_pro');
        return stored ? parseInt(stored) : 0;
    }
    
    // 保存星光
    saveStarlight() {
        localStorage.setItem('game_starlight_pro', this.starlight.toString());
        window.setData && window.setData('game_starlight_pro', this.starlight);
    }
    
    // 加载完成任务
    loadCompletedTasks() {
        const stored = localStorage.getItem('game_completed_tasks_pro');
        return stored ? JSON.parse(stored) : [];
    }
    
    // 保存完成任务
    saveCompletedTasks() {
        localStorage.setItem('game_completed_tasks_pro', JSON.stringify(this.completedTasks));
        window.setData && window.setData('game_completed_tasks_pro', this.completedTasks);
    }
    
    // 加载解锁的头像框
    loadUnlockedFrames() {
        const stored = localStorage.getItem('unlocked_avatar_frames');
        return stored ? JSON.parse(stored) : [];
    }
    
    // 保存解锁的头像框
    saveUnlockedFrames() {
        localStorage.setItem('unlocked_avatar_frames', JSON.stringify(this.unlockedFrames));
        window.setData && window.setData('unlocked_avatar_frames', this.unlockedFrames);
    }
}

// ==================== 初始化打卡游戏增强版 ====================
let coupleGamePro = null;

function initCoupleGamePro() {
    if (coupleGamePro) return;
    coupleGamePro = new CoupleGamePro();
    window.coupleGamePro = coupleGamePro;
    console.log('[情侣打卡增强版] v2.0 加载完成');
}

// 页面加载后初始化（已禁用 - 改为手动触发）
// 这些模块不再自动显示在主页，只在用户点击"更多"菜单时才显示
/*
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initCoupleGamePro);
} else {
    initCoupleGamePro();
}
*/

// 手动触发函数（供"更多"菜单调用）
window.initCoupleGameProManual = function() {
    if (!window.coupleGamePro) {
        initCoupleGamePro();
    } else {
        console.log('[情侣打卡] 已经初始化');
    }
};

// 导出
window.CoupleGamePro = CoupleGamePro;
