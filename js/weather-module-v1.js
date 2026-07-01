/**
 * 天气联动小模块 v1.0
 * 展示双方所在地天气，搭配暖心文案
 */

// ==================== 天气配置 ====================
const WeatherConfig = {
    apiKey: '', // 可选：注册 openweathermap.org 获取免费API Key
    myCity: '北京',
    partnerCity: '上海',
    updateInterval: 1800000 // 30分钟更新一次
};

// ==================== 天气数据（模拟） ====================
const WeatherData = {
    // 模拟天气数据
    mockWeather: [
        { city: '北京', temp: 28, weather: '晴', icon: '☀️', humidity: 45, wind: 12 },
        { city: '上海', temp: 30, weather: '多云', icon: '⛅', humidity: 70, wind: 8 },
        { city: '广州', temp: 32, weather: '雷阵雨', icon: '⛈️', humidity: 85, wind: 15 },
        { city: '深圳', temp: 31, weather: '晴', icon: '☀️', humidity: 75, wind: 10 },
        { city: '成都', temp: 26, weather: '阴', icon: '☁️', humidity: 60, wind: 6 }
    ],
    
    // 获取暖心文案
    getWarmMessage(weather) {
        const messages = {
            '晴': '今天阳光真好，记得多喝水哦～',
            '多云': '天气不错，适合出去走走呢！',
            '阴': '天气有点阴沉，记得保持好心情～',
            '小雨': '下雨了，记得带伞哦！',
            '中雨': '雨有点大，出门注意安全～',
            '大雨': '大雨天，尽量别出门啦',
            '雷阵雨': '打雷了，注意安全，别在树下躲雨！',
            '雪': '下雪啦！好浪漫～',
            '雾': '雾天能见度低，出门小心'
        };
        
        // 温度提醒
        let tempMsg = '';
        if (weather.temp < 10) {
            tempMsg = ' 天气有点冷，多穿点衣服！';
        } else if (weather.temp > 30) {
            tempMsg = ' 天气好热，注意防暑降温～';
        }
        
        return (messages[weather.weather] || '今天天气不错～') + tempMsg;
    },
    
    // 获取模拟天气
    getMockWeather(city) {
        let data = this.mockWeather.find(w => w.city === city);
        if (!data) {
            // 随机生成
            const weathers = ['晴', '多云', '阴', '小雨', '中雨'];
            const icons = ['☀️', '⛅', '☁️', '🌧️', '🌧️'];
            const idx = Math.floor(Math.random() * weathers.length);
            data = {
                city: city,
                temp: 20 + Math.floor(Math.random() * 15),
                weather: weathers[idx],
                icon: icons[idx],
                humidity: 40 + Math.floor(Math.random() * 40),
                wind: 5 + Math.floor(Math.random() * 15)
            };
        }
        return data;
    }
};

// ==================== 天气模块核心类 ====================
class WeatherModule {
    constructor() {
        this.myWeather = null;
        this.partnerWeather = null;
        this.init();
    }
    
    init() {
        this.createWeatherUI();
        this.updateWeather();
        this.startAutoUpdate();
    }
    
    // 创建天气UI
    createWeatherUI() {
        // 在首页侧边或顶部添加天气展示
        const targetElement = document.querySelector('.hero') || document.querySelector('main') || document.body;
        
        const weatherSection = document.createElement('section');
        weatherSection.id = 'weather-section';
        weatherSection.style.cssText = `
            background: white;
            border-radius: 16px;
            padding: 20px;
            margin: 20px auto;
            max-width: 800px;
            box-shadow: 0 2px 12px rgba(0,0,0,0.08);
        `;
        
        weatherSection.innerHTML = `
            <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 16px;">
                <span style="font-size: 20px;">🌤️</span>
                <h3 style="font-size: 16px; color: #333; margin: 0;">天气联动</h3>
            </div>
            
            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 16px;">
                <!-- 我的天气 -->
                <div id="my-weather-card" style="
                    background: linear-gradient(135deg, #e3f2fd 0%, #bbdefb 100%);
                    border-radius: 12px;
                    padding: 16px;
                    text-align: center;
                ">
                    <div style="font-size: 12px; color: #1976d2; margin-bottom: 8px;">🐹 鼠鼠所在地</div>
                    <div id="my-weather-icon" style="font-size: 48px; margin-bottom: 8px;">☀️</div>
                    <div id="my-weather-temp" style="font-size: 32px; font-weight: bold; color: #1976d2;">--°C</div>
                    <div id="my-weather-desc" style="font-size: 14px; color: #555; margin-top: 4px;">--</div>
                    <div id="my-weather-msg" style="font-size: 12px; color: #666; margin-top: 8px; line-height: 1.4;">加载中...</div>
                </div>
                
                <!-- 伴侣天气 -->
                <div id="partner-weather-card" style="
                    background: linear-gradient(135deg, #fce4ec 0%, #f8bbd0 100%);
                    border-radius: 12px;
                    padding: 16px;
                    text-align: center;
                ">
                    <div style="font-size: 12px; color: #c2185b; margin-bottom: 8px;">🐱 笔笔所在地</div>
                    <div id="partner-weather-icon" style="font-size: 48px; margin-bottom: 8px;">☀️</div>
                    <div id="partner-weather-temp" style="font-size: 32px; font-weight: bold; color: #c2185b;">--°C</div>
                    <div id="partner-weather-desc" style="font-size: 14px; color: #555; margin-top: 4px;">--</div>
                    <div id="partner-weather-msg" style="font-size: 12px; color: #666; margin-top: 8px; line-height: 1.4;">加载中...</div>
                </div>
            </div>
            
            <!-- 设置城市 -->
            <div style="margin-top: 12px; text-align: center;">
                <button id="weather-settings-btn" style="
                    padding: 6px 16px;
                    background: #f0f0f0;
                    border: none;
                    border-radius: 6px;
                    font-size: 12px;
                    color: #666;
                    cursor: pointer;
                ">设置城市</button>
            </div>
        `;
        
        // 插入到首页
        const permanentWelcome = document.getElementById('permanent-welcome');
        if (permanentWelcome && permanentWelcome.parentNode) {
            permanentWelcome.parentNode.insertBefore(weatherSection, permanentWelcome.nextSibling);
        } else {
            targetElement.insertBefore(weatherSection, targetElement.firstChild);
        }
        
        // 绑定设置按钮
        document.getElementById('weather-settings-btn').addEventListener('click', () => this.showSettings());
    }
    
    // 更新天气
    updateWeather() {
        // 使用模拟数据（实际应该调用API）
        this.myWeather = WeatherData.getMockWeather(WeatherConfig.myCity);
        this.partnerWeather = WeatherData.getMockWeather(WeatherConfig.partnerCity);
        
        // 更新UI
        this.renderWeather();
    }
    
    // 渲染天气
    renderWeather() {
        if (this.myWeather) {
            document.getElementById('my-weather-icon').textContent = this.myWeather.icon;
            document.getElementById('my-weather-temp').textContent = `${this.myWeather.temp}°C`;
            document.getElementById('my-weather-desc').textContent = `${WeatherConfig.myCity} · ${this.myWeather.weather}`;
            document.getElementById('my-weather-msg').textContent = WeatherData.getWarmMessage(this.myWeather);
        }
        
        if (this.partnerWeather) {
            document.getElementById('partner-weather-icon').textContent = this.partnerWeather.icon;
            document.getElementById('partner-weather-temp').textContent = `${this.partnerWeather.temp}°C`;
            document.getElementById('partner-weather-desc').textContent = `${WeatherConfig.partnerCity} · ${this.partnerWeather.weather}`;
            document.getElementById('partner-weather-msg').textContent = WeatherData.getWarmMessage(this.partnerWeather);
        }
    }
    
    // 显示设置
    showSettings() {
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
                border-radius: 16px;
                padding: 32px;
                max-width: 400px;
                width: 90%;
            ">
                <h3 style="font-size: 18px; color: #333; margin-bottom: 20px; text-align: center;">设置城市</h3>
                
                <div style="margin-bottom: 16px;">
                    <label style="font-size: 14px; color: #666; display: block; margin-bottom: 8px;">🐹 我的城市</label>
                    <input type="text" id="settings-my-city" value="${WeatherConfig.myCity}" style="
                        width: 100%;
                        padding: 10px;
                        border: 2px solid #f0f0f0;
                        border-radius: 8px;
                        font-size: 14px;
                        outline: none;
                    ">
                </div>
                
                <div style="margin-bottom: 24px;">
                    <label style="font-size: 14px; color: #666; display: block; margin-bottom: 8px;">🐱 伴侣城市</label>
                    <input type="text" id="settings-partner-city" value="${WeatherConfig.partnerCity}" style="
                        width: 100%;
                        padding: 10px;
                        border: 2px solid #f0f0f0;
                        border-radius: 8px;
                        font-size: 14px;
                        outline: none;
                    ">
                </div>
                
                <div style="display: flex; gap: 12px;">
                    <button id="weather-settings-cancel" style="
                        flex: 1;
                        padding: 10px;
                        background: #f0f0f0;
                        border: none;
                        border-radius: 8px;
                        cursor: pointer;
                        font-size: 14px;
                    ">取消</button>
                    <button id="weather-settings-save" style="
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
        document.getElementById('weather-settings-cancel').addEventListener('click', () => overlay.remove());
        document.getElementById('weather-settings-save').addEventListener('click', () => {
            const myCity = document.getElementById('settings-my-city').value.trim();
            const partnerCity = document.getElementById('settings-partner-city').value.trim();
            
            if (myCity) WeatherConfig.myCity = myCity;
            if (partnerCity) WeatherConfig.partnerCity = partnerCity;
            
            localStorage.setItem('weather_my_city', WeatherConfig.myCity);
            localStorage.setItem('weather_partner_city', WeatherConfig.partnerCity);
            
            this.updateWeather();
            overlay.remove();
            
            alert('城市设置已保存！');
        });
    }
    
    // 开始自动更新
    startAutoUpdate() {
        setInterval(() => {
            this.updateWeather();
        }, WeatherConfig.updateInterval);
    }
}

// ==================== 初始化天气模块 ====================
let weatherModule = null;

function initWeatherModule() {
    if (weatherModule) return;
    
    // 读取保存的城市
    const savedMyCity = localStorage.getItem('weather_my_city');
    const savedPartnerCity = localStorage.getItem('weather_partner_city');
    if (savedMyCity) WeatherConfig.myCity = savedMyCity;
    if (savedPartnerCity) WeatherConfig.partnerCity = savedPartnerCity;
    
    weatherModule = new WeatherModule();
    window.weatherModule = weatherModule;
    console.log('[天气模块] v1.0 加载完成');
}

// 页面加载后初始化
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initWeatherModule);
} else {
    initWeatherModule();
}

// 导出
window.WeatherModule = WeatherModule;
