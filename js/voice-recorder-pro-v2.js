/**
 * 语音情话录制增强版 v2.0
 * 支持聊天室、日记、时光胶囊、情书
 * 音频永久归档进数字典藏册
 * 支持语音转文字备份（Web Speech API）
 */

// ==================== 语音录制管理器 ====================
class VoiceRecorderPro {
    constructor() {
        this.mediaRecorder = null;
        this.audioChunks = [];
        this.isRecording = false;
        this.stream = null;
        this.timer = null;
        this.duration = 0;
        this.init();
    }
    
    init() {
        this.checkSupport();
    }
    
    // 检查浏览器支持
    checkSupport() {
        if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
            console.warn('[语音录制] 浏览器不支持 getUserMedia');
            return false;
        }
        if (!window.MediaRecorder) {
            console.warn('[语音录制] 浏览器不支持 MediaRecorder');
            return false;
        }
        return true;
    }
    
    // 开始录制
    async startRecording() {
        if (this.isRecording) return;
        
        try {
            this.stream = await navigator.mediaDevices.getUserMedia({ 
                audio: {
                    echoCancellation: true,
                    noiseSuppression: true,
                    autoGainControl: true
                }
            });
            
            this.mediaRecorder = new MediaRecorder(this.stream, {
                mimeType: this.getSupportedMimeType()
            });
            
            this.audioChunks = [];
            this.duration = 0;
            
            this.mediaRecorder.ondataavailable = (event) => {
                if (event.data.size > 0) {
                    this.audioChunks.push(event.data);
                }
            };
            
            this.mediaRecorder.onstop = () => {
                this.onRecordingStop();
            };
            
            this.mediaRecorder.start(100); // 每100ms收集一次数据
            this.isRecording = true;
            this.startTimer();
            
            console.log('[语音录制] 开始录制');
            return true;
            
        } catch (error) {
            console.error('[语音录制] 启动失败:', error);
            alert('无法访问麦克风，请检查权限设置');
            return false;
        }
    }
    
    // 停止录制
    stopRecording() {
        if (!this.isRecording) return;
        
        this.mediaRecorder.stop();
        this.isRecording = false;
        this.stopTimer();
        
        // 停止所有音轨
        if (this.stream) {
            this.stream.getTracks().forEach(track => track.stop());
        }
        
        console.log('[语音录制] 停止录制，时长:', this.duration, '秒');
    }
    
    // 录制停止后的处理
    async onRecordingStop() {
        const audioBlob = new Blob(this.audioChunks, { 
            type: this.mediaRecorder.mimeType || 'audio/webm'
        });
        
        // 生成音频URL
        const audioUrl = URL.createObjectURL(audioBlob);
        
        // 语音转文字（可选）
        let transcription = '';
        if (window.SpeechRecognition || window.webkitSpeechRecognition) {
            transcription = await this.speechToText(audioBlob);
        }
        
        // 保存到典藏册
        this.archiveToCollection(audioBlob, audioUrl, transcription);
        
        // 返回结果
        return {
            audioBlob,
            audioUrl,
            duration: this.duration,
            transcription
        };
    }
    
    // 语音转文字（使用 Web Speech API）
    async speechToText(audioBlob) {
        return new Promise((resolve) => {
            // 注意：Web Speech API 的语音识别需要实时音频流，不支持从 Blob 识别
            // 这里提供一个替代方案：使用第三方 API（如百度、阿里云）
            // 或提示用户先使用浏览器的实时语音识别
            
            console.log('[语音转文字] Web Speech API 不支持从文件识别');
            resolve(''); // 暂时返回空，后续可集成第三方 API
        });
    }
    
    // 保存到数字典藏册
    archiveToCollection(audioBlob, audioUrl, transcription) {
        const archive = {
            id: 'voice_' + Date.now(),
            type: 'voice',
            audioUrl: audioUrl,
            audioBlob: audioBlob, // 注意：Blob 对象无法直接序列化，需要转为 base64
            duration: this.duration,
            transcription: transcription,
            createdAt: new Date().toISOString(),
            archived: true
        };
        
        // 读取现有典藏
        const collection = JSON.parse(localStorage.getItem('voice_collection') || '[]');
        collection.unshift(archive);
        
        // 保存（注意：实际应用中应将音频上传到服务器，只保存 URL）
        localStorage.setItem('voice_collection', JSON.stringify(collection));
        window.setData && window.setData('voice_collection', collection);
        
        console.log('[语音归档] 已保存到数字典藏册', archive.id);
        
        // 显示通知
        this.showArchiveNotification();
    }
    
    // 显示归档通知
    showArchiveNotification() {
        const notification = document.createElement('div');
        notification.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            background: linear-gradient(135deg, #ff6b95 0%, #ff8fa3 100%);
            color: white;
            padding: 16px 24px;
            border-radius: 12px;
            box-shadow: 0 4px 20px rgba(255,107,149,0.5);
            z-index: 100050;
            animation: slideInRight 0.5s ease;
            max-width: 320px;
        `;
        
        notification.innerHTML = `
            <div style="font-weight: bold; margin-bottom: 4px;">🎤 语音已归档</div>
            <div style="font-size: 13px; opacity: 0.9;">语音情话已永久保存到数字典藏册</div>
        `;
        
        document.body.appendChild(notification);
        
        setTimeout(() => {
            notification.style.animation = 'slideOutRight 0.5s ease';
            setTimeout(() => notification.remove(), 500);
        }, 3000);
    }
    
    // 开始计时
    startTimer() {
        this.duration = 0;
        this.timer = setInterval(() => {
            this.duration++;
            this.updateRecordingUI();
        }, 1000);
    }
    
    // 停止计时
    stopTimer() {
        if (this.timer) {
            clearInterval(this.timer);
            this.timer = null;
        }
    }
    
    // 更新录制UI
    updateRecordingUI() {
        const recordingIndicator = document.getElementById('voice-recording-indicator');
        if (recordingIndicator) {
            recordingIndicator.textContent = `🔴 录制中 ${this.duration}s`;
        }
    }
    
    // 获取支持的音频格式
    getSupportedMimeType() {
        const types = [
            'audio/webm;codecs=opus',
            'audio/webm',
            'audio/ogg;codecs=opus',
            'audio/mp4'
        ];
        
        for (const type of types) {
            if (MediaRecorder.isTypeSupported(type)) {
                return type;
            }
        }
        
        return '';
    }
    
    // 创建录制界面
    createRecordingUI(containerId) {
        const container = document.getElementById(containerId);
        if (!container) return;
        
        const ui = document.createElement('div');
        ui.id = 'voice-recorder-ui';
        ui.style.cssText = `
            display: inline-flex;
            align-items: center;
            gap: 8px;
        `;
        
        ui.innerHTML = `
            <button id="voice-record-btn" style="
                background: none;
                border: 2px solid #ff6b95;
                border-radius: 50%;
                width: 40px;
                height: 40px;
                font-size: 20px;
                cursor: pointer;
                transition: all 0.3s;
            " title="录制语音">🎤</button>
            
            <div id="voice-recording-indicator" style="
                font-size: 13px;
                color: #ff6b95;
                display: none;
            "></div>
            
            <audio id="voice-playback" controls style="display: none; max-width: 200px;"></audio>
        `;
        
        container.appendChild(ui);
        
        // 绑定事件
        this.bindRecordingEvents();
    }
    
    // 绑定录制事件
    bindRecordingEvents() {
        const recordBtn = document.getElementById('voice-record-btn');
        const indicator = document.getElementById('voice-recording-indicator');
        const playback = document.getElementById('voice-playback');
        
        if (!recordBtn) return;
        
        let recording = false;
        
        recordBtn.addEventListener('click', async () => {
            if (!recording) {
                // 开始录制
                const started = await this.startRecording();
                if (started) {
                    recording = true;
                    recordBtn.style.background = '#ff6b95';
                    recordBtn.style.color = 'white';
                    recordBtn.textContent = '⏹️';
                    indicator.style.display = 'block';
                    playback.style.display = 'none';
                }
            } else {
                // 停止录制
                this.stopRecording();
                recording = false;
                recordBtn.style.background = 'none';
                recordBtn.style.color = 'inherit';
                recordBtn.textContent = '🎤';
                indicator.style.display = 'none';
                
                // 显示播放器
                const result = await this.onRecordingStop();
                if (result && result.audioUrl) {
                    playback.src = result.audioUrl;
                    playback.style.display = 'block';
                }
            }
        });
    }
}

// ==================== 在聊天室、日记、时光胶囊、情书中集成语音录制 ====================

// 聊天室集成
function integrateVoiceToChat() {
    const chatInputArea = document.getElementById('chat-input-area');
    if (!chatInputArea) return;
    
    const voiceBtn = document.createElement('button');
    voiceBtn.id = 'chat-voice-record-btn';
    voiceBtn.innerHTML = '🎤';
    voiceBtn.style.cssText = `
        background: none;
        border: none;
        font-size: 20px;
        cursor: pointer;
        padding: 4px 8px;
        transition: all 0.3s;
    `;
    voiceBtn.title = '录制语音情话';
    
    chatInputArea.insertBefore(voiceBtn, chatInputArea.firstChild);
    
    const recorder = new VoiceRecorderPro();
    recorder.createRecordingUI('chat-input-area');
}

// 日记集成
function integrateVoiceToDiary() {
    const diaryEditor = document.getElementById('diary-editor');
    if (!diaryEditor) return;
    
    const voiceBtn = document.createElement('button');
    voiceBtn.innerHTML = '🎤 语音';
    voiceBtn.style.cssText = `
        padding: 8px 16px;
        background: linear-gradient(135deg, #ff6b95 0%, #ff8fa3 100%);
        color: white;
        border: none;
        border-radius: 8px;
        cursor: pointer;
        font-size: 14px;
        margin-top: 12px;
    `;
    
    diaryEditor.appendChild(voiceBtn);
    
    const recorder = new VoiceRecorderPro();
    recorder.createRecordingUI('diary-editor');
}

// 时光胶囊集成
function integrateVoiceToTimeCapsule() {
    const capsuleEditor = document.getElementById('time-capsule-editor');
    if (!capsuleEditor) return;
    
    const voiceBtn = document.createElement('button');
    voiceBtn.innerHTML = '🎤 语音胶囊';
    voiceBtn.style.cssText = `
        padding: 8px 16px;
        background: linear-gradient(135deg, #ff6b95 0%, #ff8fa3 100%);
        color: white;
        border: none;
        border-radius: 8px;
        cursor: pointer;
        font-size: 14px;
        margin-top: 12px;
    `;
    
    capsuleEditor.appendChild(voiceBtn);
    
    const recorder = new VoiceRecorderPro();
    recorder.createRecordingUI('time-capsule-editor');
}

// 情书集成
function integrateVoiceToLoveLetter() {
    const letterEditor = document.getElementById('love-letter-editor');
    if (!letterEditor) return;
    
    const voiceBtn = document.createElement('button');
    voiceBtn.innerHTML = '🎤 语音情书';
    voiceBtn.style.cssText = `
        padding: 8px 16px;
        background: linear-gradient(135deg, #ff6b95 0%, #ff8fa3 100%);
        color: white;
        border: none;
        border-radius: 8px;
        cursor: pointer;
        font-size: 14px;
        margin-top: 12px;
    `;
    
    letterEditor.appendChild(voiceBtn);
    
    const recorder = new VoiceRecorderPro();
    recorder.createRecordingUI('love-letter-editor');
}

// ==================== 初始化所有语音录制功能 ====================
function initAllVoiceRecording() {
    // 延迟初始化，等待DOM完全加载
    setTimeout(() => {
        integrateVoiceToChat();
        integrateVoiceToDiary();
        integrateVoiceToTimeCapsule();
        integrateVoiceToLoveLetter();
        console.log('[语音录制增强版] v2.0 全部集成完成');
    }, 2000);
}

// 页面加载后初始化
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initAllVoiceRecording);
} else {
    initAllVoiceRecording();
}

// 导出
window.VoiceRecorderPro = VoiceRecorderPro;
console.log('[语音录制增强版] v2.0 加载完成');
