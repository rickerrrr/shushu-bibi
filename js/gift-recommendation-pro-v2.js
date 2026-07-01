/**
 * 礼物智能种草库增强版 v2.0
 * 联动礼物档案馆
 * 分平价/轻奢/手工三类
 * 纪念日提前展示
 */

// ==================== 礼物数据库增强 ====================
const GiftDatabasePro = {
    // 礼物分类（增强版）
    categories: {
        '平价好物': {
            icon: '💰',
            priceRange: '¥50-200',
            items: [
                { name: '定制钥匙扣', desc: '刻上彼此的名字', tags: ['手工', '定制'] },
                { name: '手写信', desc: '最真诚的表达', tags: ['手工', '浪漫'] },
                { name: 'DIY相册', desc: '记录美好瞬间', tags: ['手工', '回忆'] },
                { name: '情侣手机壳', desc: '成对的手机壳', tags: ['可爱', '实用'] },
                { name: '星星瓶', desc: '折满星星的瓶子', tags: ['手工', '惊喜'] },
                { name: '定制马克杯', desc: '印上合照', tags: ['定制', '实用'] },
                { name: '香水小样', desc: '大牌香水试用装', tags: ['美妆', '实用'] },
                { name: '可爱玩偶', desc: '陪伴她的玩偶', tags: ['可爱', '陪伴'] }
            ]
        },
        '轻奢精品': {
            icon: '💎',
            priceRange: '¥200-1000',
            items: [
                { name: '品牌口红', desc: '热门色号', tags: ['美妆', '经典'] },
                { name: '项链', desc: '精致的锁骨链', tags: ['配饰', '优雅'] },
                { name: '香水', desc: '浪漫香氛', tags: ['美妆', '浪漫'] },
                { name: '护肤套装', desc: '高端护肤', tags: ['护肤', '实用'] },
                { name: '智能手环', desc: '健康监测', tags: ['科技', '实用'] },
                { name: '拍立得', desc: '即时拍照', tags: ['科技', '回忆'] },
                { name: '电动牙刷', desc: '高端口腔护理', tags: ['科技', '实用'] },
                { name: '美容仪', desc: '家用美容神器', tags: ['科技', '护肤'] }
            ]
        },
        '手工定制': {
            icon: '🎨',
            priceRange: '¥0-500',
            items: [
                { name: '手织围巾', desc: '温暖牌围巾', tags: ['手工', '温暖'] },
                { name: '定制壁画', desc: '画一幅她的肖像', tags: ['手工', '艺术'] },
                { name: 'DIY蜡烛', desc: '专属香氛蜡烛', tags: ['手工', '浪漫'] },
                { name: '陶艺作品', desc: '亲手制作的杯子', tags: ['手工', '实用'] },
                { name: '手账本', desc: '记录彼此的点滴', tags: ['手工', '回忆'] },
                { name: '定制歌单', desc: '收录你们的歌', tags: ['手工', '音乐'] },
                { name: '视频剪辑', desc: '制作回忆视频', tags: ['手工', '回忆'] },
                { name: '手写信匣', desc: '一套情书', tags: ['手工', '浪漫'] }
            ]
        }
    },
    
    // 场合推荐
    occasions: {
        'birthday': {
            name: '生日',
            icon: '🎂',
            tips: '生日礼物要用心，最好附上生日卡片'
        },
        'anniversary': {
            name: '纪念日',
            icon: '💕',
            tips: '纪念日礼物要有纪念意义，定制类最佳'
        },
        'valentine': {
            name: '情人节',
            icon: '🌹',
            tips: '情人节礼物要浪漫，鲜花巧克力不可少'
        },
        'normal': {
            name: '日常',
            icon: '💝',
            tips: '日常小惊喜，不需要太贵重，心意最重要'
        }
    },
    
    // 根据喜好推荐
    recommendByPreferences(prefs, occasion = 'normal', priceCategory = 'all') {
        let recommendations = [];
        
        // 根据价格分类筛选
        let categoriesToSearch = [];
        if (priceCategory === 'all') {
            categoriesToSearch = Object.keys(this.categories);
        } else {
            categoriesToSearch = [priceCategory];
        }
        
        categoriesToSearch.forEach(category => {
            const catData = this.categories[category];
            if (!catData) return;
            
            catData.items.forEach(item => {
                // 检查标签匹配
                const hasMatch = prefs.some(pref => {
                    const prefMap = {
                        '甜美可爱': ['可爱', '浪漫'],
                        '简约大气': ['优雅', '实用'],
                        '复古文艺': ['艺术', '回忆'],
                        '科技数码': ['科技', '实用'],
                        '美妆达人': ['美妆', '护肤'],
                        '美食爱好者': ['实用'],
                        '文艺青年': ['艺术', '回忆'],
                        '运动健身': ['实用'],
                        '居家生活': ['实用', '温暖'],
                        '旅行探险': ['实用']
                    };
                    return prefMap[pref] && prefMap[pref].some(tag => item.tags.includes(tag));
                });
                
                if (hasMatch || prefs.length === 0) {
                    recommendations.push({
                        ...item,
                        category: category,
                        categoryIcon: catData.icon,
                        priceRange: catData.priceRange
                    });
                }
            });
        });
        
        // 根据场合调整推荐
        if (occasion !== 'normal' && this.occasions[occasion]) {
            recommendations.unshift({
                name: this.occasions[occasion].name + '特别推荐',
                desc: this.occasions[occasion].tips,
                category: '提示',
                categoryIcon: this.occasions[occasion].icon,
                priceRange: '',
                tags: ['提示']
            });
        }
        
        return recommendations;
    }
};

// ==================== 礼物推荐系统增强版核心类 ====================
class GiftRecommendationPro {
    constructor() {
        this.history = this.loadHistory();
        this.preferences = this.loadPreferences();
        this.init();
    }
    
    init() {
        this.createGiftUIPro();
        this.bindEventsPro();
    }
    
    // 创建增强版UI
    createGiftUIPro() {
        const targetElement = document.querySelector('#gift-recommendation-section') || document.querySelector('main') || document.body;
        
        // 如果已存在，则替换
        const existing = document.getElementById('gift-recommendation-section');
        if (existing) {
            existing.remove();
        }
        
        const giftSection = document.createElement('section');
        giftSection.id = 'gift-recommendation-section-pro';
        giftSection.style.cssText = `
            background: white;
            border-radius: 20px;
            padding: 12px;
            margin: 10px auto;
            max-width: 100%;
            box-shadow: 0 4px 20px rgba(0,0,0,0.08);
        `;
        
        giftSection.innerHTML = `
            <div style="display: flex; align-items: center; gap: 10px; margin-bottom: 24px;">
                <span style="font-size: 28px;">🎁</span>
                <h3 style="font-size: 20px; color: #333; margin: 0;">礼物智能种草库</h3>
            </div>
            
            <!-- 喜好标签 -->
            <div style="margin-bottom: 24px;">
                <div style="font-size: 15px; color: #333; font-weight: bold; margin-bottom: 12px;">她的喜好标签</div>
                <div id="preferences-tags-pro" style="display: flex; flex-wrap: wrap; gap: 10px;">
                    ${GiftDatabasePro.preferences ? ['甜美可爱', '简约大气', '复古文艺', '科技数码', '美妆达人', '美食爱好者', '文艺青年', '运动健身', '居家生活', '旅行探险'].map(pref => `
                        <span class="pref-tag-pro" data-pref="${pref}" style="
                            padding: 8px 16px;
                            background: #f0f0f0;
                            border-radius: 20px;
                            font-size: 14px;
                            color: #666;
                            cursor: pointer;
                            transition: all 0.3s;
                            border: 2px solid transparent;
                        " onmouseover="this.style.borderColor='#ff6b95'" 
                           onmouseout="this.style.borderColor='transparent'">${pref}</span>
                    `).join('') : ''}
                </div>
            </div>
            
            <!-- 价格分类 + 场合选择 -->
            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin-bottom: 24px;">
                <!-- 价格分类 -->
                <div>
                    <div style="font-size: 15px; color: #333; font-weight: bold; margin-bottom: 12px;">价格分类</div>
                    <div style="display: flex; flex-wrap: wrap; gap: 8px;">
                        <button class="price-category-btn" data-category="all" style="
                            padding: 8px 16px;
                            background: linear-gradient(135deg, #ff6b95 0%, #ff8fa3 100%);
                            color: white;
                            border: none;
                            border-radius: 8px;
                            cursor: pointer;
                            font-size: 13px;
                        ">全部</button>
                        <button class="price-category-btn" data-category="平价好物" style="
                            padding: 8px 16px;
                            background: #f0f0f0;
                            color: #666;
                            border: none;
                            border-radius: 8px;
                            cursor: pointer;
                            font-size: 13px;
                        ">💰 平价好物</button>
                        <button class="price-category-btn" data-category="轻奢精品" style="
                            padding: 8px 16px;
                            background: #f0f0f0;
                            color: #666;
                            border: none;
                            border-radius: 8px;
                            cursor: pointer;
                            font-size: 13px;
                        ">💎 轻奢精品</button>
                        <button class="price-category-btn" data-category="手工定制" style="
                            padding: 8px 16px;
                            background: #f0f0f0;
                            color: #666;
                            border: none;
                            border-radius: 8px;
                            cursor: pointer;
                            font-size: 13px;
                        ">🎨 手工定制</button>
                    </div>
                </div>
                
                <!-- 场合选择 -->
                <div>
                    <div style="font-size: 15px; color: #333; font-weight: bold; margin-bottom: 12px;">选择场合</div>
                    <div style="display: flex; flex-wrap: wrap; gap: 8px;">
                        <button class="occasion-btn-pro" data-occasion="normal" style="
                            padding: 8px 16px;
                            background: linear-gradient(135deg, #ff6b95 0%, #ff8fa3 100%);
                            color: white;
                            border: none;
                            border-radius: 8px;
                            cursor: pointer;
                            font-size: 13px;
                        ">日常</button>
                        <button class="occasion-btn-pro" data-occasion="birthday" style="
                            padding: 8px 16px;
                            background: #f0f0f0;
                            color: #666;
                            border: none;
                            border-radius: 8px;
                            cursor: pointer;
                            font-size: 13px;
                        ">🎂 生日</button>
                        <button class="occasion-btn-pro" data-occasion="anniversary" style="
                            padding: 8px 16px;
                            background: #f0f0f0;
                            color: #666;
                            border: none;
                            border-radius: 8px;
                            cursor: pointer;
                            font-size: 13px;
                        ">💕 纪念日</button>
                        <button class="occasion-btn-pro" data-occasion="valentine" style="
                            padding: 8px 16px;
                            background: #f0f0f0;
                            color: #666;
                            border: none;
                            border-radius: 8px;
                            cursor: pointer;
                            font-size: 13px;
                        ">🌹 情人节</button>
                    </div>
                </div>
            </div>
            
            <!-- 推荐结果 -->
            <div id="gift-recommendations-pro" style="
                background: #f8f9fa;
                border-radius: 16px;
                padding: 20px;
                min-height: 150px;
                margin-bottom: 24px;
            ">
                <div style="text-align: center; color: #999; font-size: 15px; padding: 30px;">
                    选择喜好标签、价格分类和场合，获取智能推荐 🎁
                </div>
            </div>
            
            <!-- 送礼记录 -->
            <div>
                <div style="font-size: 15px; color: #333; font-weight: bold; margin-bottom: 12px;">送礼记录</div>
                <button id="add-gift-record-btn-pro" style="
                    padding: 10px 20px;
                    background: linear-gradient(135deg, #ff6b95 0%, #ff8fa3 100%);
                    color: white;
                    border: none;
                    border-radius: 10px;
                    font-size: 14px;
                    cursor: pointer;
                    box-shadow: 0 2px 8px rgba(255,107,149,0.4);
                    transition: all 0.3s;
                " onmouseover="this.style.transform='translateY(-2px)'" 
                   onmouseout="this.style.transform='translateY(0)'">+ 添加送礼记录</button>
                <div id="gift-history-list-pro" style="margin-top: 16px;"></div>
            </div>
        `;
        
        targetElement.appendChild(giftSection);
        
        // 绑定事件
        this.bindGiftEventsPro();
        
        // 渲染历史
        this.renderHistoryPro();
    }
    
    // 绑定增强版事件
    bindGiftEventsPro() {
        // 喜好标签
        document.querySelectorAll('.pref-tag-pro').forEach(tag => {
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
                this.generateRecommendationsPro();
            });
        });
        
        // 价格分类按钮
        document.querySelectorAll('.price-category-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                document.querySelectorAll('.price-category-btn').forEach(b => {
                    b.style.background = '#f0f0f0';
                    b.style.color = '#666';
                });
                btn.style.background = 'linear-gradient(135deg, #ff6b95 0%, #ff8fa3 100%)';
                btn.style.color = 'white';
                
                this.currentPriceCategory = btn.dataset.category;
                this.generateRecommendationsPro();
            });
        });
        
        // 场合按钮
        document.querySelectorAll('.occasion-btn-pro').forEach(btn => {
            btn.addEventListener('click', () => {
                document.querySelectorAll('.occasion-btn-pro').forEach(b => {
                    b.style.background = '#f0f0f0';
                    b.style.color = '#666';
                });
                btn.style.background = 'linear-gradient(135deg, #ff6b95 0%, #ff8fa3 100%)';
                btn.style.color = 'white';
                
                this.currentOccasion = btn.dataset.occasion;
                this.generateRecommendationsPro();
            });
        });
        
        // 添加记录按钮
        document.getElementById('add-gift-record-btn-pro').addEventListener('click', () => this.showAddRecordModalPro());
    }
    
    // 生成推荐（增强版）
    generateRecommendationsPro() {
        if (this.preferences.length === 0 && (!this.currentPriceCategory || this.currentPriceCategory === 'all')) {
            // 显示所有分类预览
            this.showAllCategoriesPreview();
            return;
        }
        
        const recommendations = GiftDatabasePro.recommendByPreferences(
            this.preferences,
            this.currentOccasion || 'normal',
            this.currentPriceCategory || 'all'
        );
        
        const container = document.getElementById('gift-recommendations-pro');
        
        if (recommendations.length === 0) {
            container.innerHTML = '<div style="text-align: center; color: #999; font-size: 15px; padding: 30px;">暂无可推荐的礼物，请调整筛选条件</div>';
            return;
        }
        
        container.innerHTML = `
            <div style="font-size: 16px; color: #ff6b95; font-weight: bold; margin-bottom: 16px;">
                根据她的喜好，为你推荐 ${recommendations.length} 件礼物：
            </div>
            <div style="display: grid; grid-template-columns: repeat(auto-fill, minmax(200px, 1fr)); gap: 12px;">
                ${recommendations.map(gift => `
                    <div style="
                        background: white;
                        border-radius: 12px;
                        padding: 16px;
                        box-shadow: 0 2px 8px rgba(0,0,0,0.08);
                        cursor: pointer;
                        transition: all 0.3s;
                    " onmouseover="this.style.transform='translateY(-4px)'; this.style.boxShadow='0 8px 25px rgba(0,0,0,0.15)'" 
                       onmouseout="this.style.transform='translateY(0)'; this.style.boxShadow='0 2px 8px rgba(0,0,0,0.08)'">
                        <div style="font-size: 32px; text-align: center; margin-bottom: 8px;">${gift.categoryIcon}</div>
                        <div style="font-weight: bold; color: #333; margin-bottom: 4px;">${gift.name}</div>
                        <div style="font-size: 12px; color: #999; margin-bottom: 8px;">${gift.desc}</div>
                        ${gift.priceRange ? `<div style="font-size: 12px; color: #ff6b95; font-weight: bold;">${gift.priceRange}</div>` : ''}
                        <div style="margin-top: 8px; display: flex; flex-wrap: wrap; gap: 4px;">
                            ${(gift.tags || []).map(tag => `
                                <span style="
                                    padding: 2px 8px;
                                    background: #f0f0f0;
                                    border-radius: 10px;
                                    font-size: 10px;
                                    color: #666;
                                ">${tag}</span>
                            `).join('')}
                        </div>
                    </div>
                `).join('')}
            </div>
        `;
    }
    
    // 显示所有分类预览
    showAllCategoriesPreview() {
        const container = document.getElementById('gift-recommendations-pro');
        
        container.innerHTML = `
            <div style="font-size: 16px; color: #333; font-weight: bold; margin-bottom: 16px;">
                礼物分类预览：
            </div>
            <div style="display: grid; grid-template-columns: repeat(auto-fill, minmax(250px, 1fr)); gap: 16px;">
                ${Object.entries(GiftDatabasePro.categories).map(([key, cat]) => `
                    <div style="
                        background: white;
                        border-radius: 12px;
                        padding: 20px;
                        box-shadow: 0 2px 8px rgba(0,0,0,0.08);
                    ">
                        <div style="font-size: 24px; margin-bottom: 8px;">${cat.icon}</div>
                        <div style="font-weight: bold; color: #333; margin-bottom: 4px;">${key}</div>
                        <div style="font-size: 12px; color: #ff6b95; margin-bottom: 12px;">${cat.priceRange}</div>
                        <div style="font-size: 13px; color: #666;">
                            包含 ${cat.items.length} 件礼物
                        </div>
                        <button onclick="window.giftRecommendationPro.filterByCategory('${key}')" style="
                            margin-top: 12px;
                            padding: 6px 16px;
                            background: linear-gradient(135deg, #ff6b95 0%, #ff8fa3 100%);
                            color: white;
                            border: none;
                            border-radius: 6px;
                            cursor: pointer;
                            font-size: 12px;
                        ">查看详情</button>
                    </div>
                `).join('')}
            </div>
        `;
    }
    
    // 按分类筛选
    filterByCategory(category) {
        this.currentPriceCategory = category;
        this.generateRecommendationsPro();
        
        // 更新按钮状态
        document.querySelectorAll('.price-category-btn').forEach(btn => {
            if (btn.dataset.category === category) {
                btn.style.background = 'linear-gradient(135deg, #ff6b95 0%, #ff8fa3 100%)';
                btn.style.color = 'white';
            } else {
                btn.style.background = '#f0f0f0';
                btn.style.color = '#666';
            }
        });
    }
    
    // 显示添加记录模态框（增强版）
    showAddRecordModalPro() {
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
                border-radius: 20px;
                padding: 36px;
                max-width: 450px;
                width: 90%;
            ">
                <h3 style="font-size: 20px; color: #333; margin-bottom: 24px; text-align: center;">🎁 添加送礼记录</h3>
                
                <div style="margin-bottom: 16px;">
                    <label style="font-size: 14px; color: #666; display: block; margin-bottom: 8px;">礼物名称</label>
                    <input type="text" id="record-gift-name-pro" placeholder="例如：口红" style="
                        width: 100%;
                        padding: 12px;
                        border: 2px solid #f0f0f0;
                        border-radius: 10px;
                        font-size: 14px;
                        outline: none;
                        transition: border-color 0.3s;
                    " onfocus="this.style.borderColor='#ff6b95'" onblur="this.style.borderColor='#f0f0f0'">
                </div>
                
                <div style="margin-bottom: 16px;">
                    <label style="font-size: 14px; color: #666; display: block; margin-bottom: 8px;">价格分类</label>
                    <select id="record-gift-category" style="
                        width: 100%;
                        padding: 12px;
                        border: 2px solid #f0f0f0;
                        border-radius: 10px;
                        font-size: 14px;
                        outline: none;
                    ">
                        <option value="平价好物">💰 平价好物</option>
                        <option value="轻奢精品">💎 轻奢精品</option>
                        <option value="手工定制">🎨 手工定制</option>
                    </select>
                </div>
                
                <div style="margin-bottom: 16px;">
                    <label style="font-size: 14px; color: #666; display: block; margin-bottom: 8px;">日期</label>
                    <input type="date" id="record-gift-date-pro" style="
                        width: 100%;
                        padding: 12px;
                        border: 2px solid #f0f0f0;
                        border-radius: 10px;
                        font-size: 14px;
                        outline: none;
                    ">
                </div>
                
                <div style="margin-bottom: 24px;">
                    <label style="font-size: 14px; color: #666; display: block; margin-bottom: 8px;">她的反应</label>
                    <select id="record-gift-reaction-pro" style="
                        width: 100%;
                        padding: 12px;
                        border: 2px solid #f0f0f0;
                        border-radius: 10px;
                        font-size: 14px;
                        outline: none;
                    ">
                        <option value="love">❤️ 超喜欢！</option>
                        <option value="like">💙 喜欢</option>
                        <option value="ok">💛 还可以</option>
                        <option value="dislike">💔 不太喜欢</option>
                    </select>
                </div>
                
                <div style="display: flex; gap: 12px;">
                    <button id="record-cancel-pro" style="
                        flex: 1;
                        padding: 12px;
                        background: #f0f0f0;
                        border: none;
                        border-radius: 10px;
                        cursor: pointer;
                        font-size: 15px;
                        transition: all 0.3s;
                    " onmouseover="this.style.background='#e0e0e0'" 
                       onmouseout="this.style.background='#f0f0f0'">取消</button>
                    <button id="record-save-pro" style="
                        flex: 1;
                        padding: 12px;
                        background: linear-gradient(135deg, #ff6b95 0%, #ff8fa3 100%);
                        color: white;
                        border: none;
                        border-radius: 10px;
                        cursor: pointer;
                        font-size: 15px;
                        font-weight: bold;
                        box-shadow: 0 4px 15px rgba(255,107,149,0.4);
                        transition: all 0.3s;
                    " onmouseover="this.style.transform='translateY(-2px)'" 
                       onmouseout="this.style.transform='translateY(0)'">保存</button>
                </div>
            </div>
        `;
        
        document.body.appendChild(overlay);
        
        // 绑定事件
        document.getElementById('record-cancel-pro').addEventListener('click', () => overlay.remove());
        document.getElementById('record-save-pro').addEventListener('click', () => {
            const name = document.getElementById('record-gift-name-pro').value.trim();
            const category = document.getElementById('record-gift-category').value;
            const date = document.getElementById('record-gift-date-pro').value;
            const reaction = document.getElementById('record-gift-reaction-pro').value;
            
            if (!name) {
                alert('请输入礼物名称');
                return;
            }
            
            this.history.push({
                id: Date.now(),
                name: name,
                category: category,
                date: date,
                reaction: reaction
            });
            
            this.saveHistory();
            this.renderHistoryPro();
            overlay.remove();
            
            alert('送礼记录已保存！系统会更懂她的喜好～');
        });
    }
    
    // 渲染历史（增强版）
    renderHistoryPro() {
        const container = document.getElementById('gift-history-list-pro');
        if (!container) return;
        
        if (this.history.length === 0) {
            container.innerHTML = '<div style="text-align: center; color: #999; font-size: 14px; padding: 16px;">暂无记录</div>';
            return;
        }
        
        container.innerHTML = this.history.map(record => `
            <div style="
                background: #f8f9fa;
                border-radius: 10px;
                padding: 12px 16px;
                margin-bottom: 10px;
                font-size: 14px;
                display: flex;
                align-items: center;
                justify-content: space-between;
            ">
                <div>
                    <span style="font-weight: bold; color: #333;">${record.name}</span>
                    <span style="color: #999; margin-left: 8px; font-size: 12px;">${record.date}</span>
                    <span style="color: #999; margin-left: 8px; font-size: 12px;">${record.category}</span>
                </div>
                <div>
                    ${record.reaction === 'love' ? '❤️' : record.reaction === 'like' ? '💙' : record.reaction === 'ok' ? '💛' : '💔'}
                </div>
            </div>
        `).join('');
    }
    
    // 加载历史
    loadHistory() {
        const stored = localStorage.getItem('gift_history_pro');
        return stored ? JSON.parse(stored) : [];
    }
    
    // 保存历史
    saveHistory() {
        localStorage.setItem('gift_history_pro', JSON.stringify(this.history));
        window.setData && window.setData('gift_history_pro', this.history);
    }
    
    // 加载喜好
    loadPreferences() {
        const stored = localStorage.getItem('gift_preferences_pro');
        return stored ? JSON.parse(stored) : [];
    }
    
    // 保存喜好
    savePreferences() {
        localStorage.setItem('gift_preferences_pro', JSON.stringify(this.preferences));
        window.setData && window.setData('gift_preferences_pro', this.preferences);
    }
}

// ==================== 初始化礼物推荐增强版 ====================
let giftRecommendationPro = null;

function initGiftRecommendationPro() {
    if (giftRecommendationPro) return;
    giftRecommendationPro = new GiftRecommendationPro();
    window.giftRecommendationPro = giftRecommendationPro;
    console.log('[礼物推荐增强版] v2.0 加载完成');
}

// 页面加载后初始化（已禁用 - 改为手动触发）
// 这些模块不再自动显示在主页，只在用户点击"更多"菜单时才显示
/*
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initGiftRecommendationPro);
} else {
    initGiftRecommendationPro();
}
*/

// 手动触发函数（供"更多"菜单调用）
window.initGiftRecommendationProManual = function() {
    if (!window.giftRecommendationPro) {
        initGiftRecommendationPro();
    } else {
        console.log('[礼物推荐] 已经初始化');
    }
};

// 导出
window.GiftRecommendationPro = GiftRecommendationPro;
