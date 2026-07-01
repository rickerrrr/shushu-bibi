/**
 * E2EE 聊天室集成 v8.4
 * 自动加密/解密消息
 */

(function() {
  'use strict';

  // 等待依赖加载
  function waitForDependencies() {
    if (!window.E2EE || !window.ChatRoom) {
      setTimeout(waitForDependencies, 100);
      return;
    }

    integrateE2EE();
  }

  function integrateE2EE() {
    // 拦截发送消息，加密文本
    const originalSend = window.ChatRoom.send;
    if (originalSend) {
      window.ChatRoom.send = async function(msg) {
        if (window.E2EE.isEnabled() && msg.text) {
          msg.text = await window.E2EE.encrypt(msg.text);
          msg.encrypted = true;
        }
        return originalSend.call(this, msg);
      };
    }

    // 拦截渲染消息，解密文本
    const originalRender = window.ChatRoom.renderMessages;
    if (originalRender) {
      window.ChatRoom.renderMessages = async function() {
        const messages = this.messages || [];
        for (const msg of messages) {
          if (msg.encrypted && msg.text) {
            msg.decryptedText = await window.E2EE.decrypt(msg.text);
          }
        }
        return originalRender.call(this);
      };
    }

    console.log('🔐 E2EE 集成完成');
  }

  // 启动
  waitForDependencies();

})();
