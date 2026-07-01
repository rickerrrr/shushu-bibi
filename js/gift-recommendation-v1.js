/**
 * 纪念日礼物智能推荐系统 v1.0
 * 根据过往送礼记录、对方喜好标签，自动生成礼物备选
 */

// ==================== 礼物数据库 ====================
const GiftDatabase = {
    // 礼物分类
    categories: {
        '美妆护肤': ['口红', '香水', '护肤套装', '面膜', '精华液', '防晒霜'],
        '服饰配饰': ['项链', '手链', '耳环', '包包', '围巾', '手套', '帽子'],
        '数码科技': ['耳机', '智能手表', '充电宝', '拍立得', '电动牙刷', '美容仪'],
        '浪漫惊喜': ['鲜花', '巧克力', '定制相册', '情书', '星星瓶', '音乐盒'],
        '美食体验': ['餐厅打卡', 'DIY蛋糕', '巧克力工坊', '下午茶', '火锅', '日料'],
        '文艺创意': ['手账本', '画笔套装', '香水定制', '陶艺体验', '油画体验', '手作蜡烛']
    },
    
    // 喜好标签
    preferences: [
        '甜美可爱', '简约大气', '复古文艺', '科技数码', '美妆达人',
        '美食爱好者', '文艺青年', '运动健身', '居家生活', '旅行探险'
    ],
    
    // 根据标签推荐礼物
    recommendByPreferences(prefs, occasion = 'normal') {
        let recommendations = [];
        
        prefs.forEach(pref => {
            switch(pref) {
                case '甜美可爱':
                    recommendations.push('定制玩偶', '糖果色配饰', '卡通联名', '粉色系礼物');
                    break;
                case '简约大气':
                    recommendations.push('简约项链', '皮质手账', '北欧风家居', '极简手表');
                    break;
                case '复古文艺':
                    recommendations.push('胶卷相机', '黑胶唱片', '复古项链', '文艺书店礼品卡');
                    break;
                case '科技数码':
                    recommendations.push('无线耳机', '智能手环', '拍立得', '蓝牙音箱');
                    break;
                case '美妆达人':
                    recommendations.push('限定口红', '护肤套装', '美容仪', '香氛蜡烛');
                    break;
                case '美食爱好者':
                    recommendations.push('DIY美食体验', '精致餐厅', '巧克力礼盒', '下午茶套餐');
                    break;
                case '文艺青年':
                    recommendations.push('手账套装', '艺术展门票', '书籍', '文创产品');
                    break;
                case '运动健身':
                    recommendations.push('运动手环', '瑜伽垫', '健身包', '运动耳机');
                    break;
                case '居家生活':
                    recommendations.push('香薰蜡烛', '居家服', '抱枕', '小家电');
                    break;
                case '旅行探险':
                    recommendations.push('旅行背包', '拍立得', '旅行日记本', '便携充电宝');
                    break;
            }
        });
        
        // 根据场合添加特殊推荐
        if (occasion === 'birthday') {
            recommendations.push('生日蛋糕', '定制生日礼物', '惊喜派对布置');
        } else if (occasion === 'anniversary') {
            recommendations.push('纪念相册', '刻字饰品', '回忆视频');
        } else if (occasion === 'valentine') {
            recommendations.push('玫瑰花', '巧克力', '情侣饰品', '情书');
        }
        
        // 去重
        return [...new Set(recommendations)];
    }
};

// ==================== 礼物推荐系统核心类 ====================
class GiftRecommendationSystem {
    constructor() {
        this.history = this.loadHistory();
        this.preferences = this.loadPreferences();
        this.init();
    }
    
    init() {
        this.createGiftUI();
        this.bindEvents();
    }
    
    // 创建礼物推荐UI
    createGiftUI() {
        // 在首页或礼物档案馆旁边添加入口
        const targetElement = document.querySelector('#gift-archive') || document.querySelector('main') || document.body;
        
        const giftSection = document.createElement('section');
        giftSection.id = 'gift-recommendation-section';
        giftSection.style.cssText = `
            background: white;
            border-radius: 16px;
            padding: 24px;
            margin: 20px auto;
            max-width: 800px;
            box-shadow: 0 2px 12px rgba(0,0,0,0.08);
        `;
        
        giftSection.innerHTML = `
            <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 20px;">
                <span style="font-size: 24px;">🎁</span>
                <h3 style="font-size: 18px; color: #333; margin: 0;">礼物智能推荐</h3>
            </div>
            
            <!-- 喜好标签设置 -->
            <div style="margin-bottom: 20px;">
                <div style="font-size: 14px; color: #666; margin-bottom: 8px;">她的喜好标签（点击选择）</div>
                <div id="preferences-tags" style="display: flex; flex-wrap: wrap; gap: 8px;">
                    ${GiftDatabase.preferences.map(pref => `
                        <span class="pref-tag" data-pref="${pref}" style="
                            padding: 6px 12px;
                            background: #f0f0f0;
                            border-radius: 20px;
                            font-size: 13px;
                            color: #666;
                            cursor: pointer;
                            transition: all 0.3s;
                        ">${pref}</span>
                    `).join('')}
                </div>
            </div>
            
            <!-- 场合选择 -->
            <div style="margin-bottom: 20px;">
                <div style="font-size: 14px; color: #666; margin-bottom: 8px;">选择场合</div>
                <div style="display: flex; gap: 8px;">
                    <button class="occasion-btn" data-occasion="normal" style="
                        padding: 8px 16px;
                        background: linear-gradient(135deg, #ff6b95 0%, #ff8fa3 100%);
                        color: white;
                        border: none;
                        border-radius: 8px;
                        cursor: pointer;
                        font-size: 13px;
                    ">日常</button>
                    <button class="occasion-btn" data-occasion="birthday" style="
                        padding: 8px 16px;
                        background: #f0f0f0;
                        color: #666;
                        border: none;
                        border-radius: 8px;
                        cursor: pointer;
                        font-size: 13px;
                    ">生日</button>
                    <button class="occasion-btn" data-occasion="anniversary" style="
                        padding: 8px 16px;
                        background: #f0f0f0;
                        color: #666;
                        border: none;
                        border-radius: 8px;
                        cursor: pointer;
                        font-size: 13px;
                    ">纪念日</button>
                    <button class="occasion-btn" data-occasion="valentine" style="
                        padding: 8px 16px;
                        background: #f0f0f0;
                        color: #666;
                        border: none;
                        border-radius: 8px;
                        cursor: pointer;
                        font-size: 13px;
                    ">情人节</button>
                </div>
            </div>
            
            <!-- 推荐结果 -->
            <div id="gift-recommendations" style="
                background: #f8f9fa;
                border-radius: 12px;
                padding: 16px;
                min-height: 100px;
            ">
                <div style="text-align: center; color: #999; font-size: 14px; padding: 20px;">
                    选择喜好标签和场合，获取智能推荐 🎁
                </div>
            </div>
            
            <!-- 送礼记录 -->
            <div style="margin-top: 20px;">
                <div style="font-size: 14px; color: #666; margin-bottom: 8px;">送礼记录（帮助系统更懂她）</div>
                <button id="add-gift-record-btn" style="
                    padding: 8px 16px;
                    background: #f0f0f0;
                    border: none;
                    border-radius: 8px;
                    font-size: 13px;
                    color: #666;
                    cursor: pointer;
                ">+ 添加送礼记录</button>
                <div id="gift-history-list" style="margin-top: 12px;"></div>
            </div>
        `;
        
        // 插入到页面
        targetElement.appendChild(giftSection);
        
        // 绑定事件
        this.bindGiftEvents();
        
        // 渲染历史记录
        this.renderHistory();
    }
    
    // 绑定礼物推荐事件
    bindGiftEvents() {
        // 喜好标签点击
        document.querySelectorAll('.pref-tag').forEach(tag => {
            tag.addEventListener('click', () => {
                const pref = tag.dataset.pref;
                tag.classList.toggle('selected');
                
                if (tag.classList.contains('selected')) {
                    tag.style.background = 'linear-gradient(135deg, #ff6b95 0%, #ff8fa3 100%)';
                    tag.style.color = 'white';
                    if (!this.preferences.includes(pref)) this.preferences.push(pref);
                } else {
                    tag.style.background = '#f0f0f0';
                    tag.style.color = '#666';
                    this.preferences = this.preferences.filter(p => p !== pref);
                }
                
                this.savePreferences();
                this.generateRecommendations();
            });
        });
        
        // 场合按钮点击
        document.querySelectorAll('.occasion-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                document.querySelectorAll('.occasion-btn').forEach(b => {
                    b.style.background = '#f0f0f0';
                    b.style.color = '#666';
                });
                btn.style.background = 'linear-gradient(135deg, #ff6b95 0%, #ff8fa3 100%)';
                btn.style.color = 'white';
                
                this.currentOccasion = btn.dataset.occasion;
                this.generateRecommendations();
            });
        });
        
        // 添加送礼记录
        document.getElementById('add-gift-record-btn').addEventListener('click', () => this.showAddRecordModal());
    }
    
    // 生成推荐
    generateRecommendations() {
        if (this.preferences.length === 0) return;
        
        const recommendations = GiftDatabase.recommendByPreferences(
            this.preferences, 
            this.currentOccasion || 'normal'
        );
        
        const container = document.getElementById('gift-recommendations');
        container.innerHTML = `
            <div style="font-size: 14px; color: #ff6b95; font-weight: bold; margin-bottom: 12px;">
                根据她的喜好，为你推荐：
            </div>
            <div style="display: grid; grid-template-columns: repeat(auto-fill, minmax(150px, 1fr)); gap: 10px;">
                ${recommendations.map(gift => `
                    <div style="
                        background: white;
                        border-radius: 8px;
                        padding: 12px;
                        text-align: center;
                        font-size: 13px;
                        color: #555;
                        box-shadow: 0 1px 4px rgba(0,0,0,0.08);
                        cursor: pointer;
                        transition: all 0.3s;
                    " onmouseover="this.style.transform='translateY(-2px)'; this.style.boxShadow='0 4px 12px rgba(0,0,0,0.15)';" onmouseout="this.style.transform='translateY(0)'; this.style.boxShadow='0 1px 4px rgba(0,0,0,0.08)';">
                        ${gift}
                    </div>
                `).join('')}
            </div>
        `;
    }
    
    // 显示添加记录模态框
    showAddRecordModal() {
        const overlay = document.createElement('div');
        overlay.style.cssText = `
            position: fixed;
            top: 0; left: 0;
            width: 100%; height: 100%;
            background: rgba(0,0,0,0.6);
            z-index: 100020;
            display: flex;
            align-items: center;
            justify-content: center;
        `;
        
        overlay.innerHTML = `
            <div style="
                background: white;
                border-radius: 16px;
                padding: 32px;
                max-width: 400px;
                width: 90%;
            ">
                <h3 style="font-size: 18px; color: #333; margin-bottom: 20px; text-align: center;">添加送礼记录</h3>
                
                <div style="margin-bottom: 16px;">
                    <label style="font-size: 14px; color: #666; display: block; margin-bottom: 8px;">礼物名称</label>
                    <input type="text" id="record-gift-name" placeholder="例如：口红" style="
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
                    <input type="date" id="record-gift-date" style="
                        width: 100%;
                        padding: 10px;
                        border: 2px solid #f0f0f0;
                        border-radius: 8px;
                        font-size: 14px;
                        outline: none;
                    ">
                </div>
                
                <div style="margin-bottom: 24px;">
                    <label style="font-size: 14px; color: #666; display: block; margin-bottom: 8px;">她的反应</label>
                    <select id="record-gift-reaction" style="
                        width: 100%;
                        padding: 10px;
                        border: 2px solid #f0f0f0;
                        border-radius: 8px;
                        font-size: 14px;
                        outline: none;
                    ">
                        <option value="love">超喜欢！</option>
                        <option value="like">喜欢</option>
                        <option value="ok">还可以</option>
                        <option value="dislike">不太喜欢</option>
                    </select>
                </div>
                
                <div style="display: flex; gap: 12px;">
                    <button id="record-cancel" style="
                        flex: 1;
                        padding: 10px;
                        background: #f0f0f0;
                        border: none;
                        border-radius: 8px;
                        cursor: pointer;
                        font-size: 14px;
                    ">取消</button>
                    <button id="record-save" style="
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
        
        // 绑定事件
        document.getElementById('record-cancel').addEventListener('click', () => overlay.remove());
        document.getElementById('record-save').addEventListener('click', () => {
            const name = document.getElementById('record-gift-name').value.trim();
            const date = document.getElementById('record-gift-date').value;
            const reaction = document.getElementById('record-gift-reaction').value;
            
            if (!name) {
                alert('请输入礼物名称');
                return;
            }
            
            this.history.push({
                id: Date.now(),
                name: name,
                date: date,
                reaction: reaction
            });
            
            this.saveHistory();
            this.renderHistory();
            overlay.remove();
            
            alert('送礼记录已保存！系统会更懂她的喜好～');
        });
    }
    
    // 渲染历史记录
    renderHistory() {
        const container = document.getElementById('gift-history-list');
        if (!container) return;
        
        if (this.history.length === 0) {
            container.innerHTML = '<div style="text-align: center; color: #999; font-size: 13px; padding: 12px;">暂无记录</div>';
            return;
        }
        
        container.innerHTML = this.history.map(record => `
            <div style="
                background: #f8f9fa;
                border-radius: 8px;
                padding: 10px 12px;
                margin-bottom: 8px;
                font-size: 13px;
                display: flex;
                align-items: center;
                justify-content: space-between;
            ">
                <div>
                    <span style="font-weight: bold; color: #333;">${record.name}</span>
                    <span style="color: #999; margin-left: 8px;">${record.date}</span>
                </div>
                <div>
                    ${record.reaction === 'love' ? '❤️' : record.reaction === 'like' ? '💙' : record.reaction === 'ok' ? '💛' : '💔'}
                </div>
            </div>
        `).join('');
    }
    
    // 加载历史
    loadHistory() {
        const stored = localStorage.getItem('gift_history');
        return stored ? JSON.parse(stored) : [];
    }
    
    // 保存历史
    saveHistory() {
        localStorage.setItem('gift_history', JSON.stringify(this.history));
    }
    
    // 加载喜好
    loadPreferences() {
        const stored = localStorage.getItem('gift_preferences');
        return stored ? JSON.parse(stored) : [];
    }
    
    // 保存喜好
    savePreferences() {
        localStorage.setItem('gift_preferences', JSON.stringify(this.preferences));
    }
}

// ==================== 初始化礼物推荐系统 ====================
let giftRecommendationSystem = null;

function initGiftRecommendationSystem() {
    if (giftRecommendationSystem) return;
    giftRecommendationSystem = new GiftRecommendationSystem();
    window.giftRecommendationSystem = giftRecommendationSystem;
    console.log('[礼物推荐] v1.0 加载完成');
}

// 页面加载后初始化
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initGiftRecommendationSystem);
} else {
    initGiftRecommendationSystem();
}

// 导出
window.GiftRecommendationSystem = GiftRecommendationSystem;
