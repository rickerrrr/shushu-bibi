/**
 * 纪念日倒数动态小组件 v1.0
 * 手机桌面可添加的独立页面
 * 显示：相恋天数、近期纪念日、对方在线状态
 */

// ==================== 小组件配置 ====================
const WidgetConfig = {
    startDate: '2024-01-01', // 相恋开始日期（可设置）
    anniversaries: [
        { name: '相恋100天', date: '2024-04-10', icon: '💕' },
        { name: '在一起6个月', date: '2024-07-01', icon: '🌙' },
        { name: '相恋200天', date: '2024-07-19', icon: '⭐' },
        { name: '在一起1年', date: '2025-01-01', icon: '🎂' },
        { name: '相恋500天', date: '2025-05-16', icon: '🎉' },
        { name: '在一起2年', date: '2026-01-01', icon: '💎' }
    ]
};

// ==================== 小组件核心类 ====================
class AnniversaryWidget {
    constructor() {
        this.startDate = new Date(localStorage.getItem('love_start_date') || WidgetConfig.startDate);
        this.anniversaries = this.loadAnniversaries();
        this.init();
    }
    
    init() {
        this.createWidgetPage();
        this.startAutoUpdate();
    }
    
    // 创建小组件页面
    createWidgetPage() {
        // 创建独立的小组件页面（可添加到手机桌面）
        const widgetPage = document.createElement('div');
        widgetPage.id = 'anniversary-widget-page';
        widgetPage.style.cssText = `
            position: fixed;
            top: 0; left: 0;
            width: 100%; height: 100%;
            background: linear-gradient(135deg, #fff5f7 0%, #ffe4e9 100%);
            z-index: 100100;
            display: none;
            flex-direction: column;
            padding: 20px;
            box-sizing: border-box;
            overflow-y: auto;
        `;
        
        widgetPage.innerHTML = `
            <!-- 顶部关闭按钮 -->
            <button id="widget-close-btn" style="
                position: absolute;
                top: 20px;
                right: 20px;
                background: rgba(255,255,255,0.8);
                border: none;
                border-radius: 50%;
                width: 40px;
                height: 40px;
                font-size: 20px;
                cursor: pointer;
                box-shadow: 0 2px 8px rgba(0,0,0,0.1);
                z-index: 10;
            ">✕</button>
            
            <!-- 相恋天数 -->
            <div style="
                text-align: center;
                padding: 40px 20px;
                background: white;
                border-radius: 20px;
                box-shadow: 0 4px 20px rgba(255,107,149,0.2);
                margin-bottom: 20px;
            ">
                <div style="font-size: 64px; margin-bottom: 16px;">💕</div>
                <div style="font-size: 16px; color: #999; margin-bottom: 8px;">我们已经相恋了</div>
                <div id="widget-days-count" style="
                    font-size: 56px;
                    font-weight: bold;
                    color: #ff6b95;
                    margin-bottom: 8px;
                ">0 天</div>
                <div style="font-size: 14px; color: #666;">自 ${this.startDate.toLocaleDateString('zh-CN')} 起</div>
            </div>
            
            <!-- 近期纪念日 -->
            <div style="
                background: white;
                border-radius: 20px;
                padding: 20px;
                box-shadow: 0 4px 20px rgba(255,107,149,0.2);
                margin-bottom: 20px;
            ">
                <h3 style="font-size: 18px; color: #333; margin-bottom: 16px; text-align: center;">📅 近期纪念日</h3>
                <div id="widget-upcoming-anniversaries" style="
                    max-height: 250px;
                    overflow-y: auto;
                ">
                    <div style="text-align: center; color: #999; font-size: 14px; padding: 20px;">加载中...</div>
                </div>
            </div>
            
            <!-- 对方在线状态 -->
            <div style="
                background: white;
                border-radius: 20px;
                padding: 20px;
                box-shadow: 0 4px 20px rgba(255,107,149,0.2);
                margin-bottom: 20px;
            ">
                <h3 style="font-size: 18px; color: #333; margin-bottom: 16px; text-align: center;">💬 对方状态</h3>
                <div id="widget-partner-status" style="
                    text-align: center;
                    padding: 20px;
                ">
                    <div style="font-size: 48px; margin-bottom: 8px;">⚫</div>
                    <div style="font-size: 16px; color: #999;">离线</div>
                </div>
            </div>
            
            <!-- 今日浪漫语 -->
            <div style="
                background: linear-gradient(135deg, #ff6b95 0%, #ff8fa3 100%);
                border-radius: 20px;
                padding: 24px;
                box-shadow: 0 4px 20px rgba(255,107,149,0.4);
                text-align: center;
                color: white;
            ">
                <div style="font-size: 32px; margin-bottom: 12px;">💌</div>
                <div id="widget-romantic-quote" style="
                    font-size: 16px;
                    line-height: 1.6;
                    font-style: italic;
                ">加载中...</div>
            </div>
            
            <!-- 设置按钮 -->
            <button id="widget-settings-btn" style="
                position: absolute;
                top: 20px;
                left: 20px;
                background: rgba(255,255,255,0.8);
                border: none;
                border-radius: 50%;
                width: 40px;
                height: 40px;
                font-size: 20px;
                cursor: pointer;
                box-shadow: 0 2px 8px rgba(0,0,0,0.1);
                z-index: 10;
            ">⚙️</button>
        `;
        
        document.body.appendChild(widgetPage);
        
        // 绑定事件
        this.bindWidgetEvents();
        
        // 渲染数据
        this.renderWidgetData();
    }
    
    // 绑定小组件事件
    bindWidgetEvents() {
        // 关闭按钮
        document.getElementById('widget-close-btn').addEventListener('click', () => {
            document.getElementById('anniversary-widget-page').style.display = 'none';
        });
        
        // 设置按钮
        document.getElementById('widget-settings-btn').addEventListener('click', () => {
            this.showWidgetSettings();
        });
    }
    
    // 渲染小组件数据
    renderWidgetData() {
        // 相恋天数
        const today = new Date();
        const diffTime = Math.abs(today - this.startDate);
        const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
        
        document.getElementById('widget-days-count').textContent = `${diffDays} 天`;
        
        // 近期纪念日
        this.renderUpcomingAnniversaries();
        
        // 对方在线状态
        this.renderPartnerStatus();
        
        // 今日浪漫语
        this.renderRomanticQuote();
    }
    
    // 渲染近期纪念日
    renderUpcomingAnniversaries() {
        const container = document.getElementById('widget-upcoming-anniversaries');
        const today = new Date();
        
        // 计算未来的纪念日
        const upcoming = this.anniversaries
            .map(ann => {
                const annDate = new Date(ann.date);
                const diff = Math.ceil((annDate - today) / (1000 * 60 * 60 * 24));
                return { ...ann, daysLeft: diff };
            })
            .filter(ann => ann.daysLeft >= 0)
            .sort((a, b) => a.daysLeft - b.daysLeft)
            .slice(0, 3);
        
        if (upcoming.length === 0) {
            container.innerHTML = '<div style="text-align: center; color: #999; font-size: 14px; padding: 20px;">暂无即将到来的纪念日</div>';
            return;
        }
        
        container.innerHTML = upcoming.map(ann => `
            <div style="
                background: #f8f9fa;
                border-radius: 12px;
                padding: 12px 16px;
                margin-bottom: 10px;
                display: flex;
                align-items: center;
                gap: 12px;
            ">
                <div style="font-size: 28px;">${ann.icon}</div>
                <div style="flex: 1;">
                    <div style="font-weight: bold; color: #333; font-size: 14px;">${ann.name}</div>
                    <div style="color: #999; font-size: 12px;">${ann.date}</div>
                </div>
                <div style="
                    background: linear-gradient(135deg, #ff6b95 0%, #ff8fa3 100%);
                    color: white;
                    padding: 6px 12px;
                    border-radius: 20px;
                    font-size: 13px;
                    font-weight: bold;
                ">${ann.daysLeft}天后</div>
            </div>
        `).join('');
    }
    
    // 渲染对方在线状态
    renderPartnerStatus() {
        const container = document.getElementById('widget-partner-status');
        const isOnline = localStorage.getItem('partner_online') === 'online';
        
        if (isOnline) {
            container.innerHTML = `
                <div style="font-size: 48px; margin-bottom: 8px;">🟢</div>
                <div style="font-size: 18px; color: #4caf50; font-weight: bold;">在线</div>
                <div style="font-size: 13px; color: #999; margin-top: 4px;">对方现在可以聊天</div>
            `;
        } else {
            const lastOnline = localStorage.getItem('partner_last_online') || '未知';
            container.innerHTML = `
                <div style="font-size: 48px; margin-bottom: 8px;">⚫</div>
                <div style="font-size: 18px; color: #999;">离线</div>
                <div style="font-size: 13px; color: #999; margin-top: 4px;">上次在线：${lastOnline}</div>
            `;
        }
    }
    
    // 渲染今日浪漫语
    renderRomanticQuote() {
        const quotes = [
            '每一天都想你，每一刻都爱你。',
            '你是我今生最美的相遇。',
            '无论多远，我的心和你在一起。',
            '往后余生，都是你。',
            '你是我唯一的偏爱和例外。',
            '遇见你，是我这辈子最大的幸运。',
            '想和你一起慢慢变老。',
            '你是我的阳光，我的全部。'
        ];
        
        const quote = quotes[Math.floor(Math.random() * quotes.length)];
        document.getElementById('widget-romantic-quote').textContent = `"${quote}"`;
    }
    
    // 显示设置
    showWidgetSettings() {
        const overlay = document.createElement('div');
        overlay.style.cssText = `
            position: fixed;
            top: 0; left: 0;
            width: 100%; height: 100%;
            background: rgba(0,0,0,0.6);
            z-index: 100110;
            display: flex;
            align-items: center;
            justify-content: center;
        `;
        
        overlay.innerHTML = `
            <div style="
                background: white;
                border-radius: 20px;
                padding: 36px;
                max-width: 450px;
                width: 90%;
            ">
                <h3 style="font-size: 20px; color: #333; margin-bottom: 24px; text-align: center;">⚙️ 小组件设置</h3>
                
                <div style="margin-bottom: 20px;">
                    <label style="font-size: 14px; color: #666; display: block; margin-bottom: 8px;">相恋开始日期</label>
                    <input type="date" id="widget-start-date" value="${this.startDate.toISOString().split('T')[0]}" style="
                        width: 100%;
                        padding: 12px;
                        border: 2px solid #f0f0f0;
                        border-radius: 10px;
                        font-size: 14px;
                        outline: none;
                    ">
                </div>
                
                <div style="margin-bottom: 24px;">
                    <label style="font-size: 14px; color: #666; display: block; margin-bottom: 8px;">添加纪念日</label>
                    <button id="widget-add-anniversary-btn" style="
                        width: 100%;
                        padding: 12px;
                        background: #f0f0f0;
                        border: none;
                        border-radius: 10px;
                        font-size: 14px;
                        color: #666;
                        cursor: pointer;
                    ">+ 添加纪念日</button>
                    <div id="widget-anniversaries-list" style="margin-top: 12px; max-height: 150px; overflow-y: auto;"></div>
                </div>
                
                <div style="display: flex; gap: 12px;">
                    <button id="widget-settings-cancel" style="
                        flex: 1;
                        padding: 12px;
                        background: #f0f0f0;
                        border: none;
                        border-radius: 10px;
                        cursor: pointer;
                        font-size: 15px;
                    ">取消</button>
                    <button id="widget-settings-save" style="
                        flex: 1;
                        padding: 12px;
                        background: linear-gradient(135deg, #ff6b95 0%, #ff8fa3 100%);
                        color: white;
                        border: none;
                        border-radius: 10px;
                        cursor: pointer;
                        font-size: 15px;
                        font-weight: bold;
                    ">保存</button>
                </div>
            </div>
        `;
        
        document.body.appendChild(overlay);
        
        // 渲染纪念日列表
        this.renderAnniversariesList(overlay);
        
        // 绑定事件
        document.getElementById('widget-settings-cancel').addEventListener('click', () => overlay.remove());
        document.getElementById('widget-settings-save').addEventListener('click', () => {
            const newStartDate = document.getElementById('widget-start-date').value;
            if (newStartDate) {
                this.startDate = new Date(newStartDate);
                localStorage.setItem('love_start_date', newStartDate);
            }
            
            this.saveAnniversaries();
            this.renderWidgetData();
            overlay.remove();
            
            alert('设置已保存！');
        });
        
        document.getElementById('widget-add-anniversary-btn').addEventListener('click', () => {
            this.showAddAnniversaryModal(overlay);
        });
    }
    
    // 渲染纪念日列表
    renderAnniversariesList(container) {
        const listContainer = container.querySelector('#widget-anniversaries-list');
        if (!listContainer) return;
        
        listContainer.innerHTML = this.anniversaries.map((ann, idx) => `
            <div style="
                background: #f8f9fa;
                border-radius: 8px;
                padding: 8px 12px;
                margin-bottom: 6px;
                font-size: 13px;
                display: flex;
                align-items: center;
                justify-content: space-between;
            ">
                <span>${ann.icon} ${ann.name} (${ann.date})</span>
                <button onclick="window.anniversaryWidget.deleteAnniversary(${idx})" style="
                    background: none;
                    border: none;
                    color: #ff6b95;
                    cursor: pointer;
                    font-size: 16px;
                ">🗑️</button>
            </div>
        `).join('');
    }
    
    // 显示添加纪念日模态框
    showAddAnniversaryModal(parentOverlay) {
        const overlay = document.createElement('div');
        overlay.style.cssText = `
            position: fixed;
            top: 0; left: 0;
            width: 100%; height: 100%;
            background: rgba(0,0,0,0.8);
            z-index: 100120;
            display: flex;
            align-items: center;
            justify-content: center;
        `;
        
        overlay.innerHTML = `
            <div style="
                background: white;
                border-radius: 20px;
                padding: 36px;
                max-width: 400px;
                width: 90%;
            ">
                <h3 style="font-size: 18px; color: #333; margin-bottom: 20px; text-align: center;">添加纪念日</h3>
                
                <div style="margin-bottom: 16px;">
                    <label style="font-size: 14px; color: #666; display: block; margin-bottom: 8px;">名称</label>
                    <input type="text" id="new-ann-name" placeholder="例如：相恋500天" style="
                        width: 100%;
                        padding: 10px;
                        border: 2px solid #f0f0f0;
                        border-radius: 8px;
                        font-size: 14px;
                        outline: none;
                    ">
                </div>
                
                <div style="margin-bottom: 16px;">
                    <label style="font-size: 14px; color: #666; display: block; margin-bottom: 8px;">日期</label>
                    <input type="date" id="new-ann-date" style="
                        width: 100%;
                        padding: 10px;
                        border: 2px solid #f0f0f0;
                        border-radius: 8px;
                        font-size: 14px;
                        outline: none;
                    ">
                </div>
                
                <div style="margin-bottom: 20px;">
                    <label style="font-size: 14px; color: #666; display: block; margin-bottom: 8px;">图标</label>
                    <input type="text" id="new-ann-icon" placeholder="例如：🎉" value="🎉" style="
                        width: 100%;
                        padding: 10px;
                        border: 2px solid #f0f0f0;
                        border-radius: 8px;
                        font-size: 14px;
                        outline: none;
                    ">
                </div>
                
                <div style="display: flex; gap: 12px;">
                    <button id="new-ann-cancel" style="
                        flex: 1;
                        padding: 10px;
                        background: #f0f0f0;
                        border: none;
                        border-radius: 8px;
                        cursor: pointer;
                        font-size: 14px;
                    ">取消</button>
                    <button id="new-ann-save" style="
                        flex: 1;
                        padding: 10px;
                        background: linear-gradient(135deg, #ff6b95 0%, #ff8fa3 100%);
                        color: white;
                        border: none;
                        border-radius: 8px;
                        cursor: pointer;
                        font-size: 14px;
                        font-weight: bold;
                    ">保存</button>
                </div>
            </div>
        `;
        
        document.body.appendChild(overlay);
        
        document.getElementById('new-ann-cancel').addEventListener('click', () => overlay.remove());
        document.getElementById('new-ann-save').addEventListener('click', () => {
            const name = document.getElementById('new-ann-name').value.trim();
            const date = document.getElementById('new-ann-date').value;
            const icon = document.getElementById('new-ann-icon').value.trim() || '🎉';
            
            if (!name || !date) {
                alert('请填写完整信息');
                return;
            }
            
            this.anniversaries.push({ name, date, icon });
            this.saveAnniversaries();
            
            // 重新渲染父级列表
            this.renderAnniversariesList(parentOverlay);
            
            overlay.remove();
        });
    }
    
    // 删除纪念日
    deleteAnniversary(idx) {
        if (!confirm('确定删除这个纪念日？')) return;
        this.anniversaries.splice(idx, 1);
        this.saveAnniversaries();
        this.renderWidgetData();
    }
    
    // 加载纪念日
    loadAnniversaries() {
        const stored = localStorage.getItem('anniversaries_list');
        return stored ? JSON.parse(stored) : WidgetConfig.anniversaries;
    }
    
    // 保存纪念日
    saveAnniversaries() {
        localStorage.setItem('anniversaries_list', JSON.stringify(this.anniversaries));
    }
    
    // 开始自动更新
    startAutoUpdate() {
        // 每分钟更新一次
        setInterval(() => {
            if (document.getElementById('anniversary-widget-page').style.display === 'flex') {
                this.renderWidgetData();
            }
        }, 60000);
    }
    
    // 打开小组件
    openWidget() {
        const page = document.getElementById('anniversary-widget-page');
        page.style.display = 'flex';
        this.renderWidgetData();
    }
}

// ==================== 添加小组件入口按钮 ====================
function addWidgetEntryButton() {
    const btn = document.createElement('button');
    btn.id = 'widget-entry-btn';
    btn.innerHTML = '📱';
    btn.title = '打开纪念日小组件';
    btn.style.cssText = `
        position: fixed;
        bottom: 100px;
        left: 20px;
        width: 50px;
        height: 50px;
        background: linear-gradient(135deg, #ff6b95 0%, #ff8fa3 100%);
        border-radius: 50%;
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 24px;
        cursor: pointer;
        box-shadow: 0 4px 20px rgba(255,107,149,0.5);
        z-index: 9997;
        transition: all 0.3s;
        border: none;
    `;
    btn.onmouseover = () => btn.style.transform = 'scale(1.1)';
    btn.onmouseout = () => btn.style.transform = 'scale(1)';
    
    btn.addEventListener('click', () => {
        if (window.anniversaryWidget) {
            window.anniversaryWidget.openWidget();
        }
    });
    
    document.body.appendChild(btn);
}

// ==================== 初始化小组件 ====================
let anniversaryWidget = null;

function initAnniversaryWidget() {
    if (anniversaryWidget) return;
    
    anniversaryWidget = new AnniversaryWidget();
    window.anniversaryWidget = anniversaryWidget;
    
    // 添加入口按钮
    addWidgetEntryButton();
    
    console.log('[纪念日小组件] v1.0 加载完成');
}

// 页面加载后初始化
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initAnniversaryWidget);
} else {
    initAnniversaryWidget();
}

// 导出
window.AnniversaryWidget = AnniversaryWidget;
console.log('[纪念日小组件] 模块已加载');
