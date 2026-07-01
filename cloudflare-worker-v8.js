/**
 * Cloudflare Worker - 完整实时同步版 v8
 * 支持：在线状态 + 聊天 + 所有数据同步
 */

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const path = url.pathname;
    const method = request.method;

    // CORS headers
    const corsHeaders = {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    };

    if (method === 'OPTIONS') {
      return new Response(null, { headers: corsHeaders });
    }

    // ==================== 在线状态 ====================
    if (path === '/online' || path.startsWith('/online')) {
      const ONLINE_KV = env.ONLINE_STATUS;
      if (!ONLINE_KV) {
        return new Response(JSON.stringify({ error: 'KV not bound' }), {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }

      if (method === 'POST') {
        const body = await request.json();
        const user = body.user || 'unknown';
        const timestamp = Date.now();

        await ONLINE_KV.put(user, JSON.stringify({ online: true, lastSeen: timestamp }));

        // 15秒后自动离线
        await ONLINE_KV.put(user + '_timeout', 'pending', {
          expirationTtl: 15
        });

        return new Response(JSON.stringify({ success: true }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }

      if (method === 'GET') {
        const shushu = await ONLINE_KV.get('shushu');
        const bibi = await ONLINE_KV.get('bibi');

        const now = Date.now();
        const timeout = 15000;

        const shushuData = shushu ? JSON.parse(shushu) : null;
        const bibiData = bibi ? JSON.parse(bibi) : null;

        const result = {
          shushu: shushuData && (now - shushuData.lastSeen < timeout),
          bibi: bibiData && (now - bibiData.lastSeen < timeout),
          shushuLastSeen: shushuData ? shushuData.lastSeen : null,
          bibiLastSeen: bibiData ? bibiData.lastSeen : null,
        };

        return new Response(JSON.stringify(result), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }
    }

    // ==================== 聊天 ====================
    if (path === '/chat') {
      const DATA_KV = env.DATA_STORE;
      if (!DATA_KV) {
        return new Response(JSON.stringify({ error: 'KV not bound' }), {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }

      if (method === 'GET') {
        const messages = await DATA_KV.get('chat_messages');
        const parsed = messages ? JSON.parse(messages) : [];
        return new Response(JSON.stringify({ success: true, messages: parsed }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }

      if (method === 'POST') {
        const body = await request.json();
        const newMessage = body.message;

        const messages = await DATA_KV.get('chat_messages');
        const parsed = messages ? JSON.parse(messages) : [];

        parsed.push(newMessage);

        // 只保留最近100条
        if (parsed.length > 100) {
          parsed.splice(0, parsed.length - 100);
        }

        await DATA_KV.put('chat_messages', JSON.stringify(parsed));

        return new Response(JSON.stringify({ success: true }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }
    }

    // ==================== 通用数据同步 ====================
    if (path.startsWith('/data/')) {
      const DATA_KV = env.DATA_STORE;
      if (!DATA_KV) {
        return new Response(JSON.stringify({ error: 'KV not bound' }), {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }

      // 提取key
      const key = path.replace('/data/', '').replace(/^\//, '');

      if (method === 'GET') {
        // 获取数据
        const data = await DATA_KV.get(key);
        const parsed = data ? JSON.parse(data) : null;

        return new Response(JSON.stringify({ success: true, data: parsed }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }

      if (method === 'POST') {
        // 保存数据
        const body = await request.json();
        const incomingData = body.data;
        const timestamp = body.timestamp || Date.now();

        // 简单策略：保存数据（可以后续改进为智能合并）
        await DATA_KV.put(key, JSON.stringify(incomingData));

        // 保存时间戳
        await DATA_KV.put(key + '_timestamp', timestamp.toString());

        return new Response(JSON.stringify({ success: true }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }
    }

    // ==================== 留言墙 ====================
    if (path === '/messages') {
      const DATA_KV = env.DATA_STORE;
      if (!DATA_KV) {
        return new Response(JSON.stringify({ error: 'KV not bound' }), {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }

      if (method === 'GET') {
        const messages = await DATA_KV.get('messages');
        const parsed = messages ? JSON.parse(messages) : [];
        return new Response(JSON.stringify({ success: true, messages: parsed }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }

      if (method === 'POST') {
        const body = await request.json();
        const newMessage = body.message;

        const messages = await DATA_KV.get('messages');
        const parsed = messages ? JSON.parse(messages) : [];

        parsed.unshift(newMessage);

        // 只保留最近200条
        if (parsed.length > 200) {
          parsed.splice(200);
        }

        await DATA_KV.put('messages', JSON.stringify(parsed));

        return new Response(JSON.stringify({ success: true }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }
    }

    // ==================== 情书 ====================
    if (path === '/love-letters') {
      const DATA_KV = env.DATA_STORE;
      if (!DATA_KV) {
        return new Response(JSON.stringify({ error: 'KV not bound' }), {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }

      if (method === 'GET') {
        const letters = await DATA_KV.get('loveLetters');
        const parsed = letters ? JSON.parse(letters) : [];
        return new Response(JSON.stringify({ success: true, letters: parsed }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }

      if (method === 'POST') {
        const body = await request.json();
        const newLetter = body.letter;

        const letters = await DATA_KV.get('loveLetters');
        const parsed = letters ? JSON.parse(letters) : [];

        parsed.unshift(newLetter);

        await DATA_KV.put('loveLetters', JSON.stringify(parsed));

        return new Response(JSON.stringify({ success: true }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }
    }

    // ==================== 健康检查 ====================
    if (path === '/') {
      return new Response(JSON.stringify({
        status: 'ok',
        version: 'v8',
        features: ['online', 'chat', 'data-sync', 'messages', 'love-letters'],
        timestamp: Date.now()
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    return new Response(JSON.stringify({ error: 'Not found' }), {
      status: 404,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
};
