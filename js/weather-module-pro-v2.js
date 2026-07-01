/**
 * 异地专属天气暖心卡片增强版 v2.0
 * 支持定位获取、暖心提示、氛围感优化
 */

// ==================== 天气配置增强 ====================
const WeatherConfigPro = {
    apiKey: '', // 可选：和风天气 API (https://dev.qweather.com/)
    updateInterval: 1800000, // 30分钟
    enableGeolocation: true,
    myCity: localStorage.getItem('weather_my_city') || '北京',
    partnerCity: localStorage.getItem('weather_partner_city') || '成都'
};

// ==================== 暖心提示数据库 ====================
const WarmTips = {
    // 温度提示
    temperature: {
        cold: [
            '天气好冷，多穿点衣服，别感冒了～',
            '降温了，记得添衣保暖，我会心疼的',
            '冷空气来了，记得喝热水暖暖身子',
            '今天温度低，出门记得戴口罩和围巾'
        ],
        hot: [
            '天气好热，多喝水，注意防暑～',
            '高温天气，尽量避免中午出门',
            '记得涂抹防晒霜，别晒伤了',
            '夏天容易中暑，随身带点藿香正气水'
        ],
        comfortable: [
            '今天天气不错，适合出去走走',
            '温度刚刚好，心情也会变好呢',
            '这样的天气，最适合一起散步了'
        ]
    },
    
    // 天气提示
    weather: {
        '晴': [
            '阳光明媚，记得戴太阳镜',
            '今天天气超好，适合拍照留念',
            '阳光正好，适合一起晒太阳'
        ],
        '多云': [
            '多云天气，不会太热也不会太冷',
            '云朵飘飘，心情也跟着变好',
            '今天适合户外活动哦'
        ],
        '阴': [
            '天气有点阴沉，但我的爱永远晴朗',
            '阴天容易心情低落，记得保持好心情',
            '虽然阴天，但你的笑容依然灿烂'
        ],
        '小雨': [
            '下雨了，记得带伞哦',
            '雨天路滑，小心行走',
            '雨声很好听，适合一起听雨',
            '下雨天，适合窝在家里聊天'
        ],
        '中雨': [
            '雨有点大，出门注意安全',
            '记得穿防水鞋，别淋湿了',
            '这么大的雨，我送你上班吧'
        ],
        '大雨': [
            '大雨天，尽量别出门',
            '如果必须出门，一定要注意安全',
            '我在家等你，雨停了再出门'
        ],
        '雷阵雨': [
            '打雷了，别在树下躲雨',
            '雷电天气，记得关闭电器',
            '雷雨天，适合一起看电影'
        ],
        '雪': [
            '下雪啦！好浪漫～',
            '雪天路滑，小心行走',
            '一起堆雪人吧！',
            '初雪的日子，特别值得纪念'
        ]
    },
    
    // 获取随机提示
    getRandomTip(type, key) {
        const tips = this[type][key];
        if (!tips || tips.length === 0) return '';
        return tips[Math.floor(Math.random() * tips.length)];
    },
    
    // 根据天气数据生成提示
    generateTip(weatherData) {
        let tip = '';
        
        // 温度提示
        if (weatherData.temp < 10) {
            tip = this.getRandomTip('temperature', 'cold');
        } else if (weatherData.temp > 30) {
            tip = this.getRandomTip('temperature', 'hot');
        } else {
            tip = this.getRandomTip('temperature', 'comfortable');
        }
        
        // 天气提示（追加）
        if (this.weather[weatherData.weather]) {
            const weatherTip = this.getRandomTip('weather', weatherData.weather);
            tip += '\n' + weatherTip;
        }
        
        return tip;
    }
};

// ==================== 天气模块增强版核心类 ====================
class WeatherModulePro {
    constructor() {
        this.myWeather = null;
        this.partnerWeather = null;
        this.init();
    }
    
    init() {
        this.createWeatherUIPro();
        this.bindEventsPro();
        this.detectLocation();
        this.updateWeatherPro();
        this.startAutoUpdate();
    }
    
    // 创建增强版UI
    createWeatherUIPro() {
        const targetElement = document.querySelector('#weather-section') || document.querySelector('main') || document.body;
        
        // 如果已存在天气模块，则替换
        const existing = document.getElementById('weather-section');
        if (existing) {
            existing.remove();
        }
        
        const weatherSection = document.createElement('section');
        weatherSection.id = 'weather-section-pro';
        weatherSection.style.cssText = `
            background: white;
            border-radius: 10px;
            padding: 8px;
            margin: 6px auto;
            max-width: 100%;
            box-shadow: 0 2px 10px rgba(0,0,0,0.08);
            position: relative;
            overflow: hidden;
        `;
        
        // 添加背景装饰
        weatherSection.innerHTML = `
            <div style="
                position: absolute;
                top: -50%;
                right: -20%;
                width: 140px;
                height: 140px;
                background: radial-gradient(circle, rgba(255,107,149,0.05) 0%, transparent 70%);
                pointer-events: none;
            "></div>
            
            <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 6px; position: relative; z-index: 1;">
                <div style="display: flex; align-items: center; gap: 4px;">
                    <span style="font-size: 16px;">🌤️</span>
                    <h3 style="font-size: 12px; color: #333; margin: 0;">异地天气 · 暖心卡片</h3>
                </div>
                <button id="weather-location-btn" style="
                    padding: 4px 10px;
                    background: linear-gradient(135deg, #ff6b95 0%, #ff8fa3 100%);
                    color: white;
                    border: none;
                    border-radius: 6px;
                    font-size: 11px;
                    cursor: pointer;
                    box-shadow: 0 1px 4px rgba(255,107,149,0.3);
                ">📍 定位</button>
            </div>
            
            <!-- 双城天气卡片 -->
            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 6px; position: relative; z-index: 1;">
                <!-- 我的天气 -->
                <div id="my-weather-card-pro" style="
                    background: linear-gradient(135deg, #e3f2fd 0%, #bbdefb 100%);
                    border-radius: 8px;
                    padding: 6px;
                    position: relative;
                    overflow: hidden;
                    transition: all 0.3s ease;
                    cursor: pointer;
                " onmouseover="this.style.transform='translateY(-1px)'; this.style.boxShadow='0 2px 8px rgba(0,0,0,0.08)'" 
                   onmouseout="this.style.transform='translateY(0)'; this.style.boxShadow='none'">
                    <div style="position: absolute; top: -5px; right: -5px; font-size: 30px; opacity: 0.08;">💙</div>
                    
                    <div style="position: relative; z-index: 1;">
                        <div style="display: flex; align-items: center; gap: 3px; margin-bottom: 4px;">
                            <span style="font-size: 10px;">🐹</span>
                            <span style="font-size: 10px; color: #1976d2; font-weight: bold;">鼠鼠</span>
                        </div>
                        
                        <div id="my-weather-icon-pro" style="font-size: 24px; text-align: center; margin-bottom: 4px;">☀️</div>
                        
                        <div id="my-weather-temp-pro" style="
                            font-size: 18px;
                            font-weight: bold;
                            color: #1976d2;
                            text-align: center;
                            margin-bottom: 2px;
                        ">--°C</div>
                        
                        <div id="my-weather-desc-pro" style="
                            text-align: center;
                            font-size: 11px;
                            color: #555;
                            margin-bottom: 4px;
                        ">--</div>
                        
                        <div id="my-weather-detail-pro" style="
                            font-size: 10px;
                            color: #666;
                            display: flex;
                            justify-content: space-around;
                            margin-bottom: 4px;
                        ">
                            <span>💧 --%</span>
                            <span>💨 --</span>
                        </div>
                        
                        <div id="my-weather-tip-pro" style="
                            background: rgba(255,255,255,0.8);
                            border-radius: 6px;
                            padding: 6px;
                            font-size: 11px;
                            color: #555;
                            line-height: 1.4;
                            font-style: italic;
                        ">加载中...</div>
                    </div>
                </div>
                
                <!-- 伴侣天气 -->
                <div id="partner-weather-card-pro" style="
                    background: linear-gradient(135deg, #fce4ec 0%, #f8bbd0 100%);
                    border-radius: 8px;
                    padding: 6px;
                    position: relative;
                    overflow: hidden;
                    transition: all 0.3s ease;
                    cursor: pointer;
                " onmouseover="this.style.transform='translateY(-1px)'; this.style.boxShadow='0 2px 8px rgba(0,0,0,0.08)'" 
                   onmouseout="this.style.transform='translateY(0)'; this.style.boxShadow='none'">
                    <div style="position: absolute; top: -5px; right: -5px; font-size: 30px; opacity: 0.08;">💗</div>
                    
                    <div style="position: relative; z-index: 1;">
                        <div style="display: flex; align-items: center; gap: 3px; margin-bottom: 4px;">
                            <span style="font-size: 10px;">🐱</span>
                            <span style="font-size: 10px; color: #c2185b; font-weight: bold;">笔笔</span>
                        </div>
                        
                        <div id="partner-weather-icon-pro" style="font-size: 24px; text-align: center; margin-bottom: 4px;">☀️</div>
                        
                        <div id="partner-weather-temp-pro" style="
                            font-size: 18px;
                            font-weight: bold;
                            color: #c2185b;
                            text-align: center;
                            margin-bottom: 2px;
                        ">--°C</div>
                        
                        <div id="partner-weather-desc-pro" style="
                            text-align: center;
                            font-size: 11px;
                            color: #555;
                            margin-bottom: 4px;
                        ">--</div>
                        
                        <div id="partner-weather-detail-pro" style="
                            font-size: 10px;
                            color: #666;
                            display: flex;
                            justify-content: space-around;
                            margin-bottom: 4px;
                        ">
                            <span>💧 --%</span>
                            <span>💨 --</span>
                        </div>
                        
                        <div id="partner-weather-tip-pro" style="
                            background: rgba(255,255,255,0.8);
                            border-radius: 6px;
                            padding: 6px;
                            font-size: 11px;
                            color: #555;
                            line-height: 1.4;
                            font-style: italic;
                        ">加载中...</div>
                    </div>
                </div>
            </div>
            
            <!-- 异地情侣专属提示 -->
            <div id="long-distance-tip" style="
                margin-top: 6px;
                padding: 6px;
                background: linear-gradient(135deg, #fff5f7 0%, #ffe4e9 100%);
                border-radius: 6px;
                text-align: center;
                font-size: 10px;
                color: #ff6b95;
                position: relative;
                z-index: 1;
            ">
                <span style="font-size: 10px;">💕</span> 虽然我们相隔千里，但我的心和你在一起 <span style="font-size: 10px;">💕</span>
            </div>
            
            <!-- 设置城市 -->
            <div style="margin-top: 4px; text-align: center; position: relative; z-index: 1;">
                <button id="weather-settings-btn-pro" style="
                    padding: 3px 8px;
                    background: #f0f0f0;
                    border: none;
                    border-radius: 4px;
                    font-size: 10px;
                    color: #666;
                    cursor: pointer;
                    transition: all 0.3s;
                " onmouseover="this.style.background='#e0e0e0'" 
                   onmouseout="this.style.background='#f0f0f0'">⚙️ 城市</button>
            </div>
        `;
        
        // 插入到首页
        const permanentWelcome = document.getElementById('permanent-welcome');
        if (permanentWelcome && permanentWelcome.parentNode) {
            permanentWelcome.parentNode.insertBefore(weatherSection, permanentWelcome.nextSibling);
        } else {
            targetElement.appendChild(weatherSection);
        }
    }
    
    // 绑定增强版事件
    bindEventsPro() {
        // 自动定位按钮
        document.getElementById('weather-location-btn').addEventListener('click', () => this.detectLocation());
        
        // 设置按钮
        document.getElementById('weather-settings-btn-pro').addEventListener('click', () => this.showSettingsPro());
        
        // 点击天气卡片显示详情
        document.getElementById('my-weather-card-pro').addEventListener('click', () => this.showWeatherDetail('my'));
        document.getElementById('partner-weather-card-pro').addEventListener('click', () => this.showWeatherDetail('partner'));
    }
    
    // 检测定位
    detectLocation() {
        if (!WeatherConfigPro.enableGeolocation) return;
        
        if (!navigator.geolocation) {
            alert('您的浏览器不支持地理定位');
            return;
        }
        
        navigator.geolocation.getCurrentPosition(
            (position) => {
                const lat = position.coords.latitude;
                const lon = position.coords.longitude;
                
                console.log('[天气增强版] 定位成功:', lat, lon);
                
                // 这里可以调用逆地理编码 API 获取城市名称
                // 为简化，使用模拟数据
                this.reverseGeocode(lat, lon);
            },
            (error) => {
                console.warn('[天气增强版] 定位失败:', error);
                // 使用默认城市
                this.updateWeatherPro();
            }
        );
    }
    
    // 逆地理编码（简化版）
    reverseGeocode(lat, lon) {
        // 实际应该调用 API，这里使用模拟
        console.log('[天气增强版] 逆地理编码:', lat, lon);
        // 保存坐标
        localStorage.setItem('my_location_lat', lat.toString());
        window.setData && window.setData('my_location_lat', lat);
        localStorage.setItem('my_location_lon', lon.toString());
        window.setData && window.setData('my_location_lon', lon);
    }
    
    // 更新天气（增强版）
    updateWeatherPro() {
        // 使用模拟数据（实际应调用API）
        this.myWeather = this.getMockWeatherPro(WeatherConfigPro.myCity);
        this.partnerWeather = this.getMockWeatherPro(WeatherConfigPro.partnerCity);
        
        // 渲染
        this.renderWeatherPro();
    }
    
    // 获取模拟天气（增强版）
    getMockWeatherPro(city) {
        // 更丰富的模拟数据
        const weathers = [
            { weather: '晴', icon: '☀️', tempRange: [20, 35] },
            { weather: '多云', icon: '⛅', tempRange: [18, 30] },
            { weather: '阴', icon: '☁️', tempRange: [15, 28] },
            { weather: '小雨', icon: '🌧️', tempRange: [12, 25] },
            { weather: '中雨', icon: '🌧️', tempRange: [10, 22] },
            { weather: '雷阵雨', icon: '⛈️', tempRange: [8, 20] },
            { weather: '雪', icon: '❄️', tempRange: [-5, 5] }
        ];
        
        const randomWeather = weathers[Math.floor(Math.random() * weathers.length)];
        
        return {
            city: city,
            temp: randomWeather.tempRange[0] + Math.floor(Math.random() * (randomWeather.tempRange[1] - randomWeather.tempRange[0])),
            weather: randomWeather.weather,
            icon: randomWeather.icon,
            humidity: 40 + Math.floor(Math.random() * 50),
            wind: 5 + Math.floor(Math.random() * 20),
            pm25: 30 + Math.floor(Math.random() * 100),
            uvIndex: 1 + Math.floor(Math.random() * 10)
        };
    }
    
    // 渲染天气（增强版）
    renderWeatherPro() {
        if (this.myWeather) {
            document.getElementById('my-weather-icon-pro').textContent = this.myWeather.icon;
            document.getElementById('my-weather-temp-pro').textContent = `${this.myWeather.temp}°C`;
            document.getElementById('my-weather-desc-pro').textContent = `${WeatherConfigPro.myCity} · ${this.myWeather.weather}`;
            document.getElementById('my-weather-detail-pro').innerHTML = `
                <span>💧 ${this.myWeather.humidity}%</span>
                <span>💨 ${this.myWeather.wind}km/h</span>
                <span>🌫️ PM2.5: ${this.myWeather.pm25}</span>
            `;
            document.getElementById('my-weather-tip-pro').textContent = WarmTips.generateTip(this.myWeather);
        }
        
        if (this.partnerWeather) {
            document.getElementById('partner-weather-icon-pro').textContent = this.partnerWeather.icon;
            document.getElementById('partner-weather-temp-pro').textContent = `${this.partnerWeather.temp}°C`;
            document.getElementById('partner-weather-desc-pro').textContent = `${WeatherConfigPro.partnerCity} · ${this.partnerWeather.weather}`;
            document.getElementById('partner-weather-detail-pro').innerHTML = `
                <span>💧 ${this.partnerWeather.humidity}%</span>
                <span>💨 ${this.partnerWeather.wind}km/h</span>
                <span>🌫️ PM2.5: ${this.partnerWeather.pm25}</span>
            `;
            document.getElementById('partner-weather-tip-pro').textContent = WarmTips.generateTip(this.partnerWeather);
        }
        
        // 更新异地专属提示
        this.updateLongDistanceTip();
    }
    
    // 更新异地提示
    updateLongDistanceTip() {
        if (!this.myWeather || !this.partnerWeather) return;
        
        const tipElement = document.getElementById('long-distance-tip');
        let tip = '';
        
        // 根据双方天气生成提示
        if (this.myWeather.weather === '雨' || this.partnerWeather.weather === '雨') {
            tip = '🌧️ 今天有雨，记得带伞，我会为你担心';
        } else if (this.myWeather.temp < 10 || this.partnerWeather.temp < 10) {
            tip = '❄️ 天气寒冷，多穿点衣服，别让我心疼';
        } else if (this.myWeather.temp > 30 || this.partnerWeather.temp > 30) {
            tip = '☀️ 天气炎热，多喝水，注意防暑';
        } else {
            const tips = [
                '💕 虽然我们相隔千里，但我的心和你在一起',
                '🌙 无论多远，我们看着同一片天空',
                '⭐ 每一个好天气，都是我想你的日子',
                '🌈 雨后总会有彩虹，就像我们总会见面'
            ];
            tip = tips[Math.floor(Math.random() * tips.length)];
        }
        
        tipElement.innerHTML = tip;
    }
    
    // 显示天气详情
    showWeatherDetail(who) {
        const weather = who === 'my' ? this.myWeather : this.partnerWeather;
        if (!weather) return;
        
        alert(`${who === 'my' ? '🐹 我的' : '🐱 伴侣的'}天气详情：\n\n城市：${weather.city}\n温度：${weather.temp}°C\n天气：${weather.weather}\n湿度：${weather.humidity}%\n风速：${weather.wind}km/h\nPM2.5：${weather.pm25}\n紫外线指数：${weather.uvIndex}`);
    }
    
    // 显示设置（增强版）
    showSettingsPro() {
        const overlay = document.createElement('div');
        overlay.style.cssText = `
            position: fixed;
            top: 0; left: 0;
            width: 100%; height: 100%;
            background: rgba(0,0,0,0.6);
            z-index: 100010;
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
                <h3 style="font-size: 20px; color: #333; margin-bottom: 24px; text-align: center;">🌤️ 天气设置</h3>
                
                <div style="margin-bottom: 20px;">
                    <label style="font-size: 14px; color: #666; display: block; margin-bottom: 8px;">🐹 我的城市</label>
                    <input type="text" id="settings-my-city-pro" value="${WeatherConfigPro.myCity}" style="
                        width: 100%;
                        padding: 12px;
                        border: 2px solid #f0f0f0;
                        border-radius: 10px;
                        font-size: 14px;
                        outline: none;
                        transition: border-color 0.3s;
                    " onfocus="this.style.borderColor='#ff6b95'" onblur="this.style.borderColor='#f0f0f0'">
                </div>
                
                <div style="margin-bottom: 20px;">
                    <label style="font-size: 14px; color: #666; display: block; margin-bottom: 8px;">🐱 伴侣城市</label>
                    <input type="text" id="settings-partner-city-pro" value="${WeatherConfigPro.partnerCity}" style="
                        width: 100%;
                        padding: 12px;
                        border: 2px solid #f0f0f0;
                        border-radius: 10px;
                        font-size: 14px;
                        outline: none;
                        transition: border-color 0.3s;
                    " onfocus="this.style.borderColor='#ff6b95'" onblur="this.style.borderColor='#f0f0f0'">
                </div>
                
                <div style="margin-bottom: 24px;">
                    <label style="display: flex; align-items: center; gap: 8px; font-size: 14px; color: #666; cursor: pointer;">
                        <input type="checkbox" id="settings-auto-location" ${WeatherConfigPro.enableGeolocation ? 'checked' : ''} style="width: 18px; height: 18px;">
                        <span>📍 自动定位我的位置</span>
                    </label>
                </div>
                
                <div style="display: flex; gap: 12px;">
                    <button id="weather-settings-cancel-pro" style="
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
                    <button id="weather-settings-save-pro" style="
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
        document.getElementById('weather-settings-cancel-pro').addEventListener('click', () => overlay.remove());
        document.getElementById('weather-settings-save-pro').addEventListener('click', () => {
            const myCity = document.getElementById('settings-my-city-pro').value.trim();
            const partnerCity = document.getElementById('settings-partner-city-pro').value.trim();
            const autoLocation = document.getElementById('settings-auto-location').checked;
            
            if (myCity) {
                WeatherConfigPro.myCity = myCity;
                localStorage.setItem('weather_my_city', myCity);
                window.setData && window.setData('weather_my_city', myCity);
            }
            if (partnerCity) {
                WeatherConfigPro.partnerCity = partnerCity;
                localStorage.setItem('weather_partner_city', partnerCity);
                window.setData && window.setData('weather_partner_city', partnerCity);
            }
            
            WeatherConfigPro.enableGeolocation = autoLocation;
            localStorage.setItem('weather_auto_location', autoLocation.toString());
            window.setData && window.setData('weather_auto_location', autoLocation);
            
            this.updateWeatherPro();
            overlay.remove();
            
            // 显示成功提示
            this.showSaveSuccess();
        });
    }
    
    // 显示保存成功
    showSaveSuccess() {
        const toast = document.createElement('div');
        toast.style.cssText = `
            position: fixed;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            background: rgba(0,0,0,0.8);
            color: white;
            padding: 16px 32px;
            border-radius: 12px;
            font-size: 16px;
            z-index: 100060;
            animation: fadeInOut 2s ease;
        `;
        toast.textContent = '✅ 设置已保存';
        
        document.body.appendChild(toast);
        
        setTimeout(() => toast.remove(), 2000);
    }
    
    // 开始自动更新
    startAutoUpdate() {
        setInterval(() => {
            this.updateWeatherPro();
        }, WeatherConfigPro.updateInterval);
    }
}

// ==================== 初始化天气增强版 ====================
let weatherModulePro = null;

function initWeatherModulePro() {
    if (weatherModulePro) return;
    
    // 读取保存的设置
    const savedAutoLocation = localStorage.getItem('weather_auto_location');
    if (savedAutoLocation !== null) {
        WeatherConfigPro.enableGeolocation = savedAutoLocation === 'true';
    }
    
    weatherModulePro = new WeatherModulePro();
    window.weatherModulePro = weatherModulePro;
    console.log('[天气增强版] v2.0 加载完成');
}

// 页面加载后初始化（已禁用 - 改为手动触发）
// 这些模块不再自动显示在主页，只在用户点击"更多"菜单时才显示
/*
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initWeatherModulePro);
} else {
    initWeatherModulePro();
}
*/

// 手动触发函数（供"更多"菜单调用）
window.initWeatherModuleProManual = function() {
    if (!window.weatherModulePro) {
        initWeatherModulePro();
    } else {
        console.log('[天气模块] 已经初始化');
    }
};

// 导出
window.WeatherModulePro = WeatherModulePro;
