/**
 * 情侣打卡小游戏 v1.0
 * 每周1次双人小任务，完成解锁星光奖励
 */

// ==================== 游戏任务数据库 ====================
const GameTasks = {
    weekly: [
        {
            id: 'listen_music',
            title: '一起听歌',
            desc: '一起听一首喜欢的歌，分享彼此的心情',
            reward: 10,
            icon: '🎵'
        },
        {
            id: 'write_love',
            title: '写一句情话',
            desc: '互相写一句最动人的情话给对方',
            reward: 15,
            icon: '💌'
        },
        {
            id: 'take_photo',
            title: '合照打卡',
            desc: '拍一张合照，记录今天的美好',
            reward: 20,
            icon: '📸'
        },
        {
            id: 'cook_together',
            title: '一起做饭',
            desc: '一起下厨做一顿美味的晚餐',
            reward: 25,
            icon: '🍳'
        },
        {
            id: 'watch_movie',
            title: '一起看电影',
            desc: '一起看一部电影，聊聊观后感',
            reward: 20,
            icon: '🎬'
        },
        {
            id: 'walk_together',
            title: '一起散步',
            desc: '手牵手一起散步，聊聊天',
            reward: 15,
            icon: '🚶'
        },
        {
            id: 'make_wish',
            title: '一起许愿',
            desc: '各自许一个愿望，互相分享',
            reward: 10,
            icon: '⭐'
        },
        {
            id: 'read_book',
            title: '一起读书',
            desc: '一起读一本书，交流读后感',
            reward: 20,
            icon: '📚'
        }
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
    }
};

// ==================== 打卡游戏核心类 ====================
class CoupleGame {
    constructor() {
        this.starlight = this.loadStarlight();
        this.completedTasks = this.loadCompletedTasks();
        this.currentTask = null;
        this.init();
    }
    
    init() {
        this.createGameUI();
        this.bindEvents();
        this.checkWeeklyTask();
    }
    
    // 创建游戏UI
    createGameUI() {
        const targetElement = document.querySelector('main') || document.body;
        
        const gameSection = document.createElement('section');
        gameSection.id = 'couple-game-section';
        gameSection.style.cssText = `
            background: linear-gradient(135deg, #fff5f7 0%, #ffe4e9 100%);
            border-radius: 16px;
            padding: 24px;
            margin: 20px auto;
            max-width: 800px;
            box-shadow: 0 2px 12px rgba(255,107,149,0.2);
        `;
        
        gameSection.innerHTML = `
            <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 20px;">
                <div style="display: flex; align-items: center; gap: 8px;">
                    <span style="font-size: 24px;">🎮</span>
                    <h3 style="font-size: 18px; color: #333; margin: 0;">情侣打卡小游戏</h3>
                </div>
                <div id="starlight-display" style="
                    background: linear-gradient(135deg, #ffd700 0%, #ffed4e 100%);
                    padding: 6px 16px;
                    border-radius: 20px;
                    font-size: 14px;
                    font-weight: bold;
                    color: #8B6914;
                    box-shadow: 0 2px 8px rgba(255,215,0,0.4);
                ">✨ 星光: 0</div>
            </div>
            
            <!-- 本周任务 -->
            <div id="weekly-task-card" style="
                background: white;
                border-radius: 12px;
                padding: 20px;
                margin-bottom: 16px;
                box-shadow: 0 2px 8px rgba(0,0,0,0.08);
            ">
                <div style="text-align: center; padding: 20px;">
                    <div style="font-size: 14px; color: #999; margin-bottom: 8px;">本周任务加载中...</div>
                </div>
            </div>
            
            <!-- 完成任务按钮 -->
            <button id="complete-task-btn" style="
                width: 100%;
                padding: 14px;
                background: linear-gradient(135deg, #ff6b95 0%, #ff8fa3 100%);
                color: white;
                border: none;
                border-radius: 12px;
                font-size: 16px;
                font-weight: bold;
                cursor: pointer;
                box-shadow: 0 4px 20px rgba(255,107,149,0.4);
                transition: all 0.3s;
            ">完成任务，领取星光奖励 💕</button>
            
            <!-- 历史记录 -->
            <div style="margin-top: 20px;">
                <div style="font-size: 14px; color: #666; margin-bottom: 8px;">完成记录</div>
                <div id="game-history-list" style="
                    max-height: 200px;
                    overflow-y: auto;
                "></div>
            </div>
        `;
        
        targetElement.appendChild(gameSection);
    }
    
    // 绑定事件
    bindEvents() {
        document.getElementById('complete-task-btn').addEventListener('click', () => this.completeTask());
    }
    
    // 检查本周任务
    checkWeeklyTask() {
        this.currentTask = GameTasks.getWeeklyTask();
        this.renderWeeklyTask();
        this.renderStarlight();
        this.renderHistory();
    }
    
    // 渲染本周任务
    renderWeeklyTask() {
        if (!this.currentTask) return;
        
        const card = document.getElementById('weekly-task-card');
        const isCompleted = this.isTaskCompletedThisWeek();
        
        card.innerHTML = `
            <div style="text-align: center;">
                <div style="font-size: 64px; margin-bottom: 12px;">${this.currentTask.icon}</div>
                <h4 style="font-size: 20px; color: #ff6b95; margin-bottom: 8px;">${this.currentTask.title}</h4>
                <p style="font-size: 14px; color: #666; line-height: 1.6; margin-bottom: 16px;">${this.currentTask.desc}</p>
                <div style="
                    display: inline-block;
                    background: linear-gradient(135deg, #ffd700 0%, #ffed4e 100%);
                    padding: 6px 16px;
                    border-radius: 20px;
                    font-size: 13px;
                    font-weight: bold;
                    color: #8B6914;
                ">奖励: ${this.currentTask.reward} 星光 ✨</div>
                
                ${isCompleted ? '<div style="margin-top: 12px; color: #4caf50; font-size: 14px;">✅ 本周任务已完成</div>' : ''}
            </div>
        `;
        
        // 更新按钮状态
        const btn = document.getElementById('complete-task-btn');
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
    
    // 完成任务
    completeTask() {
        if (!this.currentTask) return;
        
        const proof = prompt(`完成「${this.currentTask.title}」任务后，输入一句证明（例如：一起听了《XXX》这首歌）`);
        if (!proof) return;
        
        // 记录完成
        const record = {
            id: Date.now(),
            taskId: this.currentTask.id,
            taskTitle: this.currentTask.title,
            proof: proof,
            reward: this.currentTask.reward,
            completedAt: new Date().toISOString(),
            week: GameTasks.getWeekNumber()
        };
        
        this.completedTasks.push(record);
        this.starlight += this.currentTask.reward;
        
        this.saveCompletedTasks();
        this.saveStarlight();
        
        // 显示奖励动画
        this.showRewardAnimation(this.currentTask.reward);
        
        // 重新渲染
        this.renderWeeklyTask();
        this.renderStarlight();
        this.renderHistory();
    }
    
    // 显示奖励动画
    showRewardAnimation(amount) {
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
                    font-size: 80px;
                    animation: rewardBounce 0.6s ease;
                    margin-bottom: 16px;
                ">🎉</div>
                <h2 style="
                    font-size: 32px;
                    color: #ffd700;
                    font-weight: bold;
                    margin-bottom: 12px;
                ">+${amount} 星光 ✨</h2>
                <p style="font-size: 18px; margin-bottom: 24px;">任务完成！你真棒～</p>
                <button id="reward-close-btn" style="
                    padding: 12px 32px;
                    background: white;
                    color: #ff6b95;
                    border: none;
                    border-radius: 10px;
                    font-size: 16px;
                    font-weight: bold;
                    cursor: pointer;
                ">继续加油 💪</button>
            </div>
        `;
        
        document.body.appendChild(overlay);
        
        document.getElementById('reward-close-btn').addEventListener('click', () => overlay.remove());
        
        // 添加动画样式
        if (!document.getElementById('reward-animation-style')) {
            const style = document.createElement('style');
            style.id = 'reward-animation-style';
            style.textContent = `
                @keyframes fadeIn {
                    0% { opacity: 0; }
                    100% { opacity: 1; }
                }
                @keyframes rewardBounce {
                    0% { transform: scale(0.5); opacity: 0; }
                    50% { transform: scale(1.2); }
                    100% { transform: scale(1); opacity: 1; }
                }
            `;
            document.head.appendChild(style);
        }
    }
    
    // 检查本周是否已完成任务
    isTaskCompletedThisWeek() {
        const weekNum = GameTasks.getWeekNumber();
        return this.completedTasks.some(task => task.week === weekNum);
    }
    
    // 渲染星光
    renderStarlight() {
        const display = document.getElementById('starlight-display');
        display.textContent = `✨ 星光: ${this.starlight}`;
    }
    
    // 渲染历史
    renderHistory() {
        const container = document.getElementById('game-history-list');
        if (!container) return;
        
        if (this.completedTasks.length === 0) {
            container.innerHTML = '<div style="text-align: center; color: #999; font-size: 13px; padding: 12px;">暂无完成记录</div>';
            return;
        }
        
        const recentTasks = this.completedTasks.slice(-5).reverse();
        
        container.innerHTML = recentTasks.map(record => `
            <div style="
                background: white;
                border-radius: 8px;
                padding: 10px 12px;
                margin-bottom: 8px;
                font-size: 13px;
                box-shadow: 0 1px 4px rgba(0,0,0,0.08);
            ">
                <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 4px;">
                    <span style="font-weight: bold; color: #ff6b95;">${record.taskTitle}</span>
                    <span style="color: #ffd700; font-weight: bold;">+${record.reward} ✨</span>
                </div>
                <div style="color: #999; font-size: 12px;">${record.proof}</div>
            </div>
        `).join('');
    }
    
    // 加载星光
    loadStarlight() {
        const stored = localStorage.getItem('game_starlight');
        return stored ? parseInt(stored) : 0;
    }
    
    // 保存星光
    saveStarlight() {
        localStorage.setItem('game_starlight', this.starlight.toString());
    }
    
    // 加载完成任务
    loadCompletedTasks() {
        const stored = localStorage.getItem('game_completed_tasks');
        return stored ? JSON.parse(stored) : [];
    }
    
    // 保存完成任务
    saveCompletedTasks() {
        localStorage.setItem('game_completed_tasks', JSON.stringify(this.completedTasks));
    }
}

// ==================== 初始化打卡游戏 ====================
let coupleGame = null;

function initCoupleGame() {
    if (coupleGame) return;
    coupleGame = new CoupleGame();
    window.coupleGame = coupleGame;
    console.log('[情侣打卡] v1.0 加载完成');
}

// 页面加载后初始化
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initCoupleGame);
} else {
    initCoupleGame();
}

// 导出
window.CoupleGame = CoupleGame;
