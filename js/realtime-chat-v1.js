/**
 * 实时消息推送系统 v1.0
 * 支持双人实时聊天、消息推送、在线状态同步
 * 优先使用 localStorage 模拟，可升级到 WebSocket
 */

// ==================== 全局配置 ====================
const ChatConfig = {
    storageKey: 'realtime_messages',
    onlineKey: 'online_status',
    heartbeatInterval: 3000, // 3秒心跳
    simulatePartner: true // 模拟伴侣在线（测试用）
};

// ==================== 聊天室核心类 ====================
class RealtimeChat {
    constructor() {
        this.messages = this.loadMessages();
        this.isOpen = false;
        this.isOnline = false;
        this.init();
    }
    
    init() {
        this.createChatUI();
        this.bindEvents();
        this.startHeartbeat();
        this.simulatePartnerOnline();
    }
    
    // 创建聊天室UI
    createChatUI() {
        // 聊天悬浮按钮已移到顶部导航栏（.btn-chat），不再创建固定定位的大按钮
        // 原来的 60x60px 粉色按钮已移除，改用顶部的 30x30px 小按钮

        // 未读消息气泡
        const badge = document.createElement('div');
        badge.id = 'chat-unread-badge';
        badge.style.cssText = `
            position: absolute;
            top: -5px;
            right: -5px;
            background: #ff4444;
            color: white;
            border-radius: 50%;
            width: 20px;
            height: 20px;
            font-size: 12px;
            display: none;
            align-items: center;
            justify-content: center;
            font-weight: bold;
        `;
        // 未读消息气泡挂载到顶部导航栏的 .btn-chat 按钮
        const topChatBtn = document.querySelector('.btn-chat');
        if (topChatBtn) {
            topChatBtn.style.position = 'relative';
            topChatBtn.appendChild(badge);
        }
        
        // 聊天室面板
        const chatPanel = document.createElement('div');
        chatPanel.id = 'chat-panel';
        chatPanel.style.cssText = `
            position: fixed;
            bottom: 100px;
            right: 30px;
            width: 280px;
            height: 380px;
            background: white;
            border-radius: 20px;
            box-shadow: 0 8px 40px rgba(0,0,0,0.2);
            z-index: 9999;
            display: none;
            flex-direction: column;
            overflow: hidden;
            animation: chatPanelSlideIn 0.3s ease;
        `;
        
        chatPanel.innerHTML = `
            <!-- 聊天室头部 -->
            <div id="chat-header" style="
                background: linear-gradient(135deg, #ff6b95 0%, #ff8fa3 100%);
                color: white;
                padding: 16px 20px;
                display: flex;
                align-items: center;
                justify-content: space-between;
            ">
                <div style="display: flex; align-items: center; gap: 10px;">
                    <div id="chat-avatar" style="
                        width: 40px;
                        height: 40px;
                        border-radius: 50%;
                        background: white;
                        display: flex;
                        align-items: center;
                        justify-content: center;
                        font-size: 24px;
                    ">🐹</div>
                    <div>
                        <div style="font-weight: bold; font-size: 16px;">双人聊天室</div>
                        <div id="chat-status" style="font-size: 12px; opacity: 0.9;">在线</div>
                    </div>
                </div>
                <button id="chat-close-btn" style="
                    background: none;
                    border: none;
                    color: white;
                    font-size: 20px;
                    cursor: pointer;
                    width: 32px;
                    height: 32px;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    border-radius: 50%;
                    transition: background 0.3s;
                ">✕</button>
            </div>
            
            <!-- 消息区域 -->
            <div id="chat-messages" style="
                flex: 1;
                padding: 16px;
                overflow-y: auto;
                background: #f8f9fa;
            "></div>
            
            <!-- 输入区域 -->
            <div id="chat-input-area" style="
                padding: 12px 16px;
                background: white;
                border-top: 1px solid #f0f0f0;
                display: flex;
                align-items: center;
                gap: 8px;
            ">
                <button id="chat-voice-btn" style="
                    background: none;
                    border: none;
                    font-size: 20px;
                    cursor: pointer;
                    padding: 4px;
                " title="语音留言">🎤</button>
                <input type="text" id="chat-input" placeholder="输入消息..." style="
                    flex: 1;
                    padding: 10px 16px;
                    border: 2px solid #f0f0f0;
                    border-radius: 20px;
                    outline: none;
                    font-size: 14px;
                    transition: border-color 0.3s;
                ">
                <button id="chat-send-btn" style="
                    background: linear-gradient(135deg, #ff6b95 0%, #ff8fa3 100%);
                    color: white;
                    border: none;
                    border-radius: 50%;
                    width: 40px;
                    height: 40px;
                    cursor: pointer;
                    font-size: 18px;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    transition: transform 0.2s;
                ">➤</button>
            </div>
        `;
        
        document.body.appendChild(chatPanel);
        
        // 添加动画样式
        if (!document.getElementById('chat-animations')) {
            const style = document.createElement('style');
            style.id = 'chat-animations';
            style.textContent = `
                @keyframes chatBtnPulse {
                    0%, 100% { transform: scale(1); box-shadow: 0 4px 20px rgba(255,107,149,0.5); }
                    50% { transform: scale(1.05); box-shadow: 0 6px 30px rgba(255,107,149,0.7); }
                }
                @keyframes chatPanelSlideIn {
                    0% { transform: translateY(20px); opacity: 0; }
                    100% { transform: translateY(0); opacity: 1; }
                }
            `;
            document.head.appendChild(style);
        }
    }
    
    // 绑定事件
    bindEvents() {
        const toggleBtn = document.querySelector('.btn-chat');
        const closeBtn = document.getElementById('chat-close-btn');
        const sendBtn = document.getElementById('chat-send-btn');
        const input = document.getElementById('chat-input');
        const voiceBtn = document.getElementById('chat-voice-btn');
        
        if (toggleBtn) toggleBtn.addEventListener('click', () => this.toggleChat());
        closeBtn.addEventListener('click', () => this.closeChat());
        sendBtn.addEventListener('click', () => this.sendMessage());
        voiceBtn.addEventListener('click', () => this.startVoiceRecording());
        
        input.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') this.sendMessage();
        });
        
        // 点击聊天室外部关闭
        document.addEventListener('click', (e) => {
            const panel = document.getElementById('chat-panel');
            const btn = document.querySelector('.btn-chat');
            if (this.isOpen && !panel.contains(e.target) && btn && !btn.contains(e.target)) {
                this.closeChat();
            }
        });
    }
    
    // 切换聊天室
    toggleChat() {
        if (this.isOpen) {
            this.closeChat();
        } else {
            this.openChat();
        }
    }
    
    // 打开聊天室
    openChat() {
        const panel = document.getElementById('chat-panel');
        panel.style.display = 'flex';
        this.isOpen = true;
        this.clearUnreadBadge();
        this.scrollToBottom();
    }
    
    // 关闭聊天室
    closeChat() {
        const panel = document.getElementById('chat-panel');
        panel.style.display = 'none';
        this.isOpen = false;
    }
    
    // 发送消息
    sendMessage() {
        const input = document.getElementById('chat-input');
        const text = input.value.trim();
        if (!text) return;
        
        const message = {
            id: Date.now(),
            sender: 'me',
            text: text,
            time: new Date().toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' }),
            timestamp: Date.now()
        };
        
        this.messages.push(message);
        this.saveMessages();
        this.renderMessage(message);
        input.value = '';
        this.scrollToBottom();
        
        // 模拟对方回复
        if (ChatConfig.simulatePartner) {
            setTimeout(() => this.simulatePartnerReply(text), 1000 + Math.random() * 2000);
        }
    }
    
    // 渲染消息
    renderMessage(msg) {
        const container = document.getElementById('chat-messages');
        const msgDiv = document.createElement('div');
        msgDiv.style.cssText = `
            margin-bottom: 12px;
            display: flex;
            ${msg.sender === 'me' ? 'justify-content: flex-end;' : 'justify-content: flex-start;'}
        `;
        
        const bubble = document.createElement('div');
        bubble.style.cssText = `
            max-width: 70%;
            padding: 10px 16px;
            border-radius: 18px;
            font-size: 14px;
            line-height: 1.4;
            ${msg.sender === 'me' ? 
                'background: linear-gradient(135deg, #ff6b95 0%, #ff8fa3 100%); color: white; border-bottom-right-radius: 4px;' :
                'background: white; color: #333; border-bottom-left-radius: 4px; box-shadow: 0 1px 4px rgba(0,0,0,0.1);'
            }
        `;
        
        if (msg.type === 'voice') {
            bubble.innerHTML = `🎤 <span style="font-size: 12px;">语音消息 (${msg.duration}秒)</span>`;
            bubble.style.cursor = 'pointer';
            bubble.addEventListener('click', () => this.playVoice(msg));
        } else {
            bubble.textContent = msg.text;
        }
        
        const timeDiv = document.createElement('div');
        timeDiv.style.cssText = `
            font-size: 11px;
            color: #999;
            margin-top: 4px;
            text-align: ${msg.sender === 'me' ? 'right' : 'left'};
        `;
        timeDiv.textContent = msg.time;
        
        msgDiv.appendChild(bubble);
        container.appendChild(msgDiv);
        container.appendChild(timeDiv);
    }
    
    // 加载消息
    loadMessages() {
        const stored = localStorage.getItem(ChatConfig.storageKey);
        return stored ? JSON.parse(stored) : [];
    }
    
    // 保存消息
    saveMessages() {
        localStorage.setItem(ChatConfig.storageKey, JSON.stringify(this.messages));
        // 触发storage事件，实现跨标签页同步
        window.dispatchEvent(new Event('storage'));
    }
    
    // 滚动到底部
    scrollToBottom() {
        const container = document.getElementById('chat-messages');
        setTimeout(() => {
            container.scrollTop = container.scrollHeight;
        }, 100);
    }
    
    // 清除未读标记
    clearUnreadBadge() {
        const badge = document.getElementById('chat-unread-badge');
        badge.style.display = 'none';
        badge.textContent = '0';
    }
    
    // 显示未读标记
    showUnreadBadge(count) {
        const badge = document.getElementById('chat-unread-badge');
        badge.style.display = 'flex';
        badge.textContent = count > 99 ? '99+' : count;
    }
    
    // 开始心跳检测
    startHeartbeat() {
        this.isOnline = true;
        localStorage.setItem(ChatConfig.onlineKey, 'online');
        
        setInterval(() => {
            localStorage.setItem(ChatConfig.onlineKey, 'online');
            localStorage.setItem('last_heartbeat', Date.now().toString());
        }, ChatConfig.heartbeatInterval);
        
        // 监听跨标签页消息
        window.addEventListener('storage', (e) => {
            if (e.key === ChatConfig.storageKey) {
                this.loadNewMessages();
            }
        });
    }
    
    // 加载新消息
    loadNewMessages() {
        const newMessages = this.loadMessages();
        const currentIds = this.messages.map(m => m.id);
        const added = newMessages.filter(m => !currentIds.includes(m.id));
        
        added.forEach(msg => {
            if (msg.sender !== 'me') {
                this.renderMessage(msg);
                if (!this.isOpen) {
                    const badge = document.getElementById('chat-unread-badge');
                    const count = parseInt(badge.textContent) || 0;
                    this.showUnreadBadge(count + 1);
                }
            }
        });
        
        this.messages = newMessages;
        this.scrollToBottom();
    }
    
    // 模拟伴侣回复
    simulatePartnerReply(userMsg) {
        const replies = [
            '嗯嗯，我在呢～',
            '宝贝在干嘛呀？',
            '想你啦 💕',
            '哈哈哈好有趣',
            '一会儿一起去吃点好吃的吧？',
            '今天天气不错呢',
            '你今天开心吗？',
            '爱你哟 ❤️'
        ];
        
        const reply = replies[Math.floor(Math.random() * replies.length)];
        
        const message = {
            id: Date.now(),
            sender: 'partner',
            text: reply,
            time: new Date().toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' }),
            timestamp: Date.now()
        };
        
        this.messages.push(message);
        this.saveMessages();
        this.renderMessage(message);
        this.scrollToBottom();
        
        if (!this.isOpen) {
            const badge = document.getElementById('chat-unread-badge');
            const count = parseInt(badge.textContent) || 0;
            this.showUnreadBadge(count + 1);
        }
    }
    
    // 模拟伴侣在线
    simulatePartnerOnline() {
        if (ChatConfig.simulatePartner) {
            localStorage.setItem('partner_online', 'online');
        }
    }
    
    // 开始语音录制
    startVoiceRecording() {
        if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
            alert('您的浏览器不支持语音录制');
            return;
        }
        
        navigator.mediaDevices.getUserMedia({ audio: true })
            .then(stream => {
                const mediaRecorder = new MediaRecorder(stream);
                const chunks = [];
                
                mediaRecorder.ondataavailable = (e) => {
                    chunks.push(e.data);
                };
                
                mediaRecorder.onstop = () => {
                    const blob = new Blob(chunks, { type: 'audio/webm' });
                    this.sendVoiceMessage(blob);
                    stream.getTracks().forEach(track => track.stop());
                };
                
                mediaRecorder.start();
                alert('正在录制... 点击确定结束录制');
                setTimeout(() => mediaRecorder.stop(), 3000); // 3秒后自动停止
            })
            .catch(err => {
                console.error('语音录制失败:', err);
                alert('语音录制失败，请检查麦克风权限');
            });
    }
    
    // 发送语音消息
    sendVoiceMessage(blob) {
        const message = {
            id: Date.now(),
            sender: 'me',
            type: 'voice',
            audioBlob: URL.createObjectURL(blob),
            duration: 3, // 简化：固定3秒
            time: new Date().toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' }),
            timestamp: Date.now()
        };
        
        this.messages.push(message);
        this.saveMessages();
        this.renderMessage(message);
        this.scrollToBottom();
    }
    
    // 播放语音
    playVoice(msg) {
        const audio = new Audio(msg.audioBlob);
        audio.play();
    }
}

// ==================== 初始化聊天室 ====================
let realtimeChat = null;

function initRealtimeChat() {
    if (realtimeChat) return;
    realtimeChat = new RealtimeChat();
    window.realtimeChat = realtimeChat;
    console.log('[实时聊天] v1.0 加载完成');
}

// 页面加载后初始化
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initRealtimeChat);
} else {
    initRealtimeChat();
}

// 导出
window.RealtimeChat = RealtimeChat;
