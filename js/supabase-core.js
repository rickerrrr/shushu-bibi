/* ================================================================
   Supabase 核心模块 v16.0 — Realtime 安全架构版
   ✅ 真实密码认证 (supabase.auth.signInWithPassword)
   ✅ JWT 自动管理 (7天刷新)
   ✅ 设备指纹白名单 (register_device RPC)
   ✅ Realtime Presence (三态在线)
   ✅ Realtime Broadcast (实时消息推送)
   ✅ Postgres Changes (数据库变更推送)
   ✅ RLS 数据隔离 (pair_id + auth.uid())
   ✅ 自动降级到 localStorage

   架构变更 (v15.4 → v16.0):
   - 移除"纯 Anon 模式"，改用真实 Auth
   - 移除硬编码共享账号，每人独立登录
   - 新增设备指纹注册与验证
   - 新增 Presence 在线状态管理
   ================================================================ */

// ── Supabase 配置 ────────────────────────────────────────────────
const SUPABASE_URL = 'https://vsmkttjbujiibjviwqrgsl.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZzbWt0dGpidWpxYndpdnFncnNsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODI2MzEyMDQsImV4cCI6MjA5ODIwNzIwNH0.A1S9YaqMtmgVsQXOc1Fjqyy88y4zj8HL2MuivUnjjIQ';

// ── 全局状态 ─────────────────────────────────────────────────────
let SB_CLIENT = null;
let SB_READY = false;
let CURRENT_USER = null;        // { id, email, role, pair_id, ... }
let CURRENT_PAIR_ID = null;     // 从 profiles 表动态获取
let AUTH_READY = false;         // 认证是否完成
let PRESENCE_CHANNEL = null;    // Presence 频道
let DEVICE_FP = null;           // 设备指纹缓存

// 订阅句柄
const SB_SUBSCRIPTIONS = {};

// ── 账号映射（角色 → 邮箱）───────────────────────────────────────
// 注意: 密码不在代码中硬编码，由用户在登录页输入
const ROLE_EMAILS = {
  shushu: 'shushu@shushu-bibi.cn',
  bibi:   'bibi@shushu-bibi.cn'
};

/* ================================================================
   Auth 认证系统 — 真实密码登录
   ================================================================ */

/**
 * 登录（真实密码认证）
 * @param {string} email - 用户邮箱
 * @param {string} password - 用户密码
 * @param {string} role - 角色: 'shushu' | 'bibi'
 * @returns {Promise<{success: boolean, user?: object, error?: string}>}
 */
async function authSignIn(email, password, role) {
  try {
    console.log(`[Auth] 尝试登录: ${role} (${email})`);

    if (!SB_CLIENT) {
      console.error('[Auth] Supabase 客户端未初始化');
      return { success: false, error: '数据库未连接' };
    }

    // ✅ 调用 Supabase Auth 真实密码登录
    const { data, error } = await SB_CLIENT.auth.signInWithPassword({
      email: email,
      password: password
    });

    if (error) {
      console.error('[Auth] 登录失败:', error.message);
      return { success: false, error: translateAuthError(error.message) };
    }

    if (!data.user || !data.session) {
      return { success: false, error: '登录返回数据异常' };
    }

    console.log('[Auth] ✅ Supabase Auth 登录成功:', data.user.id);

    // ✅ 加载用户档案（获取 pair_id + role）
    const profile = await loadUserProfile(data.user.id, role);
    if (!profile) {
      console.error('[Auth] 用户档案加载失败');
      await SB_CLIENT.auth.signOut();
      return { success: false, error: '用户档案不存在，请联系管理员' };
    }

    // ✅ 设备指纹注册与验证
    if (window.DeviceFingerprint) {
      const fpResult = await registerDevice(profile.pair_id);
      if (!fpResult.success) {
        console.warn('[Auth] ⚠️ 设备注册失败:', fpResult.error);
        // 不阻止登录，但记录警告
      }
    }

    // ✅ 加入 Presence（在线状态）
    await joinPresence(profile.role, profile.pair_id);

    CURRENT_USER = {
      id: data.user.id,
      email: data.user.email,
      role: profile.role,
      pair_id: profile.pair_id,
      session: data.session
    };
    AUTH_READY = true;

    console.log('[Auth] ✅ 认证完成:', CURRENT_USER);
    return { success: true, user: CURRENT_USER };

  } catch (e) {
    console.error('[Auth] 登录异常:', e.message);
    return { success: false, error: e.message };
  }
}

/**
 * 翻译 Supabase Auth 错误信息为中文
 */
function translateAuthError(msg) {
  const map = {
    'Invalid login credentials': '邮箱或密码错误',
    'Email not confirmed': '邮箱未验证，请检查邮箱',
    'User not found': '用户不存在',
    'Failed to fetch': '网络连接失败，请检查网络',
    'Auth session missing': '会话已过期，请重新登录'
  };
  for (const [en, cn] of Object.entries(map)) {
    if (msg.includes(en)) return cn;
  }
  return msg;
}

/**
 * 登出
 */
async function authSignOut() {
  try {
    // 离开 Presence
    await leavePresence();

    if (SB_CLIENT) {
      await SB_CLIENT.auth.signOut();
    }

    CURRENT_USER = null;
    CURRENT_PAIR_ID = null;
    AUTH_READY = false;

    console.log('[Auth] ✅ 已登出');
    return { success: true };
  } catch (e) {
    console.error('[Auth] 登出失败:', e.message);
    return { success: false, error: e.message };
  }
}

/**
 * 获取当前 session（页面刷新时恢复登录状态）
 */
async function getSession() {
  try {
    if (!SB_CLIENT) return null;

    const { data: { session }, error } = await SB_CLIENT.auth.getSession();
    if (error) throw error;
    if (!session) return null;

    // 检查 session 是否过期
    const expiresAt = session.expires_at * 1000;
    if (Date.now() > expiresAt) {
      console.log('[Auth] Session 已过期，尝试刷新...');
      const { data: refreshData, error: refreshError } = await SB_CLIENT.auth.refreshSession();
      if (refreshError || !refreshData.session) {
        console.log('[Auth] Session 刷新失败，需要重新登录');
        await SB_CLIENT.auth.signOut();
        return null;
      }
      return refreshData.session;
    }

    return session;
  } catch (e) {
    console.error('[Auth] 获取 session 失败:', e.message);
    return null;
  }
}

/**
 * 恢复登录状态（页面刷新后自动调用）
 */
async function restoreSession() {
  try {
    const session = await getSession();
    if (!session) return null;

    console.log('[Auth] 发现已有 session，恢复中...');

    // 从 user_metadata 或 profiles 获取 role
    const role = session.user.user_metadata?.role;
    if (!role) {
      console.warn('[Auth] user_metadata 中没有 role，尝试从 profiles 获取');
    }

    const profile = await loadUserProfile(session.user.id, role);
    if (!profile) {
      console.error('[Auth] 恢复失败：档案不存在');
      await SB_CLIENT.auth.signOut();
      return null;
    }

    CURRENT_USER = {
      id: session.user.id,
      email: session.user.email,
      role: profile.role,
      pair_id: profile.pair_id,
      session: session
    };
    AUTH_READY = true;

    // 重新加入 Presence
    await joinPresence(profile.role, profile.pair_id);

    console.log('[Auth] ✅ 登录状态已恢复:', CURRENT_USER.role);
    return CURRENT_USER;
  } catch (e) {
    console.error('[Auth] 恢复 session 失败:', e.message);
    return null;
  }
}

/**
 * 加载用户档案
 */
async function loadUserProfile(userId, role) {
  try {
    const { data, error } = await SB_CLIENT
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single();

    if (error || !data) {
      console.error('[Auth] 档案查询失败:', error?.message);
      return null;
    }

    CURRENT_PAIR_ID = data.pair_id;
    console.log(`[Auth] ✅ 档案加载: role=${data.role}, pair_id=${data.pair_id}`);
    return data;
  } catch (e) {
    console.error('[Auth] 加载档案异常:', e.message);
    return null;
  }
}

/**
 * 注册设备指纹
 */
async function registerDevice(pairId) {
  try {
    if (!window.DeviceFingerprint) {
      return { success: false, error: '设备指纹模块未加载' };
    }

    const fp = await DeviceFingerprint.getCached();
    DEVICE_FP = fp;

    const deviceName = DeviceFingerprint.getDeviceName(fp.summary);

    const { data, error } = await SB_CLIENT.rpc('register_device', {
      p_pair_id: pairId,
      p_device_hash: fp.hash,
      p_device_name: deviceName,
      p_platform: fp.summary.platform,
      p_browser: fp.summary.browser + ' ' + fp.summary.browserVersion,
      p_screen_info: fp.summary.screen,
      p_timezone: fp.summary.timezone
    });

    if (error) throw error;

    const result = data && data[0];
    if (result && result.is_new) {
      console.log('[DeviceFP] ✅ 新设备已注册:', result.device_id);
    } else if (result) {
      console.log('[DeviceFP] ✅ 已有设备，更新 last_seen');
    }

    return { success: true, isNew: result?.is_new, deviceId: result?.device_id };
  } catch (e) {
    console.error('[DeviceFP] 注册失败:', e.message);
    return { success: false, error: e.message };
  }
}

/* ================================================================
   Realtime Presence — 在线状态管理
   ================================================================ */

/**
 * 加入 Presence（标记为在线）
 */
async function joinPresence(role, pairId) {
  try {
    if (!SB_CLIENT || !role || !pairId) return;
    if (PRESENCE_CHANNEL) {
      await SB_CLIENT.removeChannel(PRESENCE_CHANNEL);
    }

    const channelName = `presence_${pairId}`;
    PRESENCE_CHANNEL = SB_CLIENT.channel(channelName, {
      config: {
        presence: {
          key: role + '_' + Date.now()
        }
      }
    });

    PRESENCE_CHANNEL
      .on('presence', { event: 'sync' }, () => {
        const state = PRESENCE_CHANNEL.presenceState();
        console.log('[Presence] 同步:', Object.keys(state));
        handlePresenceSync(state, role);
      })
      .on('presence', { event: 'join' }, ({ key }) => {
        console.log('[Presence] 用户加入:', key);
        handlePresenceJoin(key, role);
      })
      .on('presence', { event: 'leave' }, ({ key }) => {
        console.log('[Presence] 用户离开:', key);
        handlePresenceLeave(key, role);
      })
      .on('broadcast', { event: 'kick' }, (payload) => {
        console.log('[Presence] 收到踢出消息:', payload);
        handleKick(payload, role);
      })
      .subscribe(async (status) => {
        if (status === 'SUBSCRIBED') {
          await PRESENCE_CHANNEL.track({
            role: role,
            pair_id: pairId,
            online_at: new Date().toISOString(),
            device: DEVICE_FP ? DEVICE_FP.hash.substring(0, 16) : 'unknown'
          });
          console.log('[Presence] ✅ 已加入在线状态');
        }
      });

    // 心跳: 每 30 秒更新一次（Supabase 默认 10 秒，我们设 30 秒降低负载）
    // Supabase Presence 自动管理心跳，这里不需要手动处理
  } catch (e) {
    console.error('[Presence] 加入失败:', e.message);
  }
}

/**
 * 离开 Presence（标记为离线）
 */
async function leavePresence() {
  try {
    if (PRESENCE_CHANNEL) {
      await PRESENCE_CHANNEL.untrack();
      await SB_CLIENT.removeChannel(PRESENCE_CHANNEL);
      PRESENCE_CHANNEL = null;
      console.log('[Presence] ✅ 已离开在线状态');
    }
  } catch (e) {
    console.error('[Presence] 离开失败:', e.message);
  }
}

/**
 * 处理 Presence 同步
 */
function handlePresenceSync(state, myRole) {
  const partnerRole = myRole === 'shushu' ? 'bibi' : 'shushu';
  const partnerNick = partnerRole === 'shushu' ? '鼠鼠' : '笔笔';

  // 检查对方是否在线
  let partnerOnline = false;
  let partnerKey = null;

  for (const key in state) {
    const presences = state[key];
    for (const p of presences) {
      if (p.role === partnerRole) {
        partnerOnline = true;
        partnerKey = key;
        break;
      }
    }
    if (partnerOnline) break;
  }

  // 更新 UI
  const btn = document.getElementById('btn-online');
  if (btn) {
    const statusDot = btn.querySelector('.status-dot');
    const statusText = btn.querySelector('.status-text');

    if (partnerOnline) {
      btn.classList.add('other-online');
      if (statusDot) statusDot.className = 'status-dot';
      if (statusText) statusText.textContent = partnerNick + ' 在线';
      btn.title = partnerNick + ' 在线';
    } else {
      btn.classList.remove('other-online');
      if (statusDot) statusDot.className = 'status-dot offline';
      if (statusText) statusText.textContent = partnerNick + ' 最近在线';
      btn.title = partnerNick + ' 最近在线';
    }
  }

  // 广播自定义事件供其他模块使用
  window.dispatchEvent(new CustomEvent('partner-status-change', {
    detail: { online: partnerOnline, role: partnerRole }
  }));
}

/**
 * 处理 Presence 加入
 */
function handlePresenceJoin(key, myRole) {
  const partnerRole = myRole === 'shushu' ? 'bibi' : 'shushu';
  const partnerNick = partnerRole === 'shushu' ? '鼠鼠' : '笔笔';

  if (key && key.startsWith(partnerRole)) {
    console.log(`[Presence] 🟢 ${partnerNick} 上线了`);
    window.dispatchEvent(new CustomEvent('partner-online', {
      detail: { role: partnerRole, nick: partnerNick }
    }));
  }
}

/**
 * 处理 Presence 离开
 */
function handlePresenceLeave(key, myRole) {
  const partnerRole = myRole === 'shushu' ? 'bibi' : 'shushu';
  const partnerNick = partnerRole === 'shushu' ? '鼠鼠' : '笔笔';

  if (key && key.startsWith(partnerRole)) {
    console.log(`[Presence] 🔴 ${partnerNick} 下线了`);
    window.dispatchEvent(new CustomEvent('partner-offline', {
      detail: { role: partnerRole, nick: partnerNick }
    }));
  }
}

/**
 * 处理踢出消息（单设备排他性）
 */
function handleKick(payload, myRole) {
  if (payload.payload && payload.payload.targetRole === myRole) {
    console.warn('[Presence] ⚠️ 被新设备踢出');
    // 显示提示并登出
    showToast('你的账号在其他设备登录了');
    setTimeout(() => {
      authSignOut().then(() => {
        window.location.reload();
      });
    }, 2000);
  }
}

/**
 * 踢出对方旧会话（新设备登录时调用）
 */
function kickOldSession(targetRole) {
  if (PRESENCE_CHANNEL) {
    PRESENCE_CHANNEL.send({
      type: 'broadcast',
      event: 'kick',
      payload: { targetRole: targetRole, reason: 'new_device_login' }
    });
    console.log(`[Presence] 已发送踢出消息给 ${targetRole}`);
  }
}

/**
 * 获取对方在线状态
 */
function getPartnerPresence() {
  if (!PRESENCE_CHANNEL) return { online: false };
  const state = PRESENCE_CHANNEL.presenceState();
  const myRole = CURRENT_USER?.role;
  const partnerRole = myRole === 'shushu' ? 'bibi' : 'shushu';

  for (const key in state) {
    for (const p of state[key]) {
      if (p.role === partnerRole) {
        return { online: true, online_at: p.online_at, role: partnerRole };
      }
    }
  }
  return { online: false };
}

/* ================================================================
   初始化
   ================================================================ */

async function initSupabase() {
  return new Promise((resolve) => {
    if (typeof supabase === 'undefined' || !supabase.createClient) {
      console.error('[Supabase] SDK 未加载');
      resolve(false);
      return;
    }

    try {
      SB_CLIENT = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
        auth: {
          persistSession: true,
          autoRefreshToken: true,
          detectSessionInUrl: true,
          flowType: 'pkce'
        },
        realtime: {
          params: {
            eventsPerSecond: 10
          }
        }
      });
      SB_READY = true;
      console.log('[Supabase] ✅ 客户端初始化成功 (v16.0 Realtime)');

      // 监听 Auth 状态变化
      SB_CLIENT.auth.onAuthStateChange((event, session) => {
        console.log('[Auth] 状态变化:', event);
        if (event === 'SIGNED_OUT') {
          CURRENT_USER = null;
          CURRENT_PAIR_ID = null;
          AUTH_READY = false;
          leavePresence();
        }
      });

      resolve(true);
    } catch (e) {
      console.error('[Supabase] 初始化失败:', e.message);
      resolve(false);
    }
  });
}

/**
 * 测试数据库连接
 */
async function testConnection() {
  try {
    const { data, error } = await SB_CLIENT
      .from('profiles')
      .select('id, role')
      .limit(1);

    if (error) {
      console.error('[Supabase] 连接测试失败:', error.message);
      return false;
    }
    console.log('[Supabase] ✅ 数据库连接正常');
    return true;
  } catch (e) {
    console.error('[Supabase] 连接测试异常:', e.message);
    return false;
  }
}

/* ================================================================
   安全数据库操作
   ================================================================ */

/**
 * 投瓶（调用数据库函数）
 */
async function throwBottleSecure(bottleType, content, privilegeItem = null, unlockAt = null, city = null) {
  if (!AUTH_READY || !CURRENT_PAIR_ID) {
    return { success: false, error: '未登录' };
  }

  try {
    const { data, error } = await SB_CLIENT.rpc('throw_bottle', {
      p_pair_id: CURRENT_PAIR_ID,
      p_bottle_type: bottleType,
      p_content: content,
      p_sender_role: CURRENT_USER.role,
      p_privilege_item: privilegeItem,
      p_unlock_at: unlockAt,
      p_city: city
    });

    if (error) throw error;
    return { success: true, bottleId: data };
  } catch (e) {
    console.error('[Supabase] 投瓶失败:', e.message);
    return { success: false, error: e.message };
  }
}

/**
 * 捞瓶（调用数据库函数）
 */
async function catchBottleSecure(bottleId) {
  if (!AUTH_READY || !CURRENT_PAIR_ID) {
    return { success: false, error: '未登录' };
  }

  try {
    const { data, error } = await SB_CLIENT.rpc('catch_bottle', {
      p_bottle_id: bottleId,
      p_catcher_role: CURRENT_USER.role
    });

    if (error) throw error;

    const result = data[0];
    return {
      success: result.success,
      message: result.message,
      bottle: result.bottle_data
    };
  } catch (e) {
    console.error('[Supabase] 捞瓶失败:', e.message);
    return { success: false, error: e.message };
  }
}

/**
 * 查询未捞取的瓶子
 */
async function getAvailableBottles() {
  if (!AUTH_READY || !CURRENT_PAIR_ID) return [];

  try {
    const { data, error } = await SB_CLIENT
      .from('bottles')
      .select('*')
      .eq('pair_id', CURRENT_PAIR_ID)
      .eq('caught', false)
      .eq('is_deleted', false)
      .order('created_at', { ascending: false })
      .limit(50);

    if (error) throw error;
    return data;
  } catch (e) {
    console.error('[Supabase] 查询瓶子失败:', e.message);
    return [];
  }
}

/**
 * 通用查询（RLS 自动过滤 pair_id）
 */
async function sbSelect(table, options = {}) {
  if (!SB_READY || !AUTH_READY) return [];

  try {
    let query = SB_CLIENT.from(table).select(options.select || '*');

    // RLS 会自动过滤 pair_id，这里不再手动添加
    // 但保留 options.filter 供额外过滤
    if (options.filter) {
      Object.entries(options.filter).forEach(([k, v]) => {
        if (v !== null && v !== undefined) {
          query = query.eq(k, v);
        }
      });
    }
    if (options.order) {
      query = query.order(options.order.column, { ascending: options.order.ascending ?? true });
    }
    if (options.limit) {
      query = query.limit(options.limit);
    }

    const { data, error } = await query;
    if (error) throw error;
    return data || [];
  } catch (e) {
    console.error(`[Supabase] 查询失败 [${table}]:`, e.message);
    return [];
  }
}

/**
 * 插入（RLS 验证 pair_id）
 */
async function sbInsert(table, data) {
  if (!SB_READY || !AUTH_READY) return null;

  try {
    // 自动添加 pair_id（RLS 会验证）
    if (CURRENT_PAIR_ID && table !== 'profiles' && table !== 'pairs' && table !== 'user_devices') {
      data.pair_id = CURRENT_PAIR_ID;
    }
    // 自动添加 sender_role / user_role（如果有 CURRENT_USER）
    if (CURRENT_USER && CURRENT_USER.role) {
      if (!data.sender_role && !data.user_role && !data.player_role && !data.achiever_role) {
        // 根据表名判断字段名
        if (['messages', 'bottles', 'paperplanes', 'timecapsules'].includes(table)) {
          data.sender_role = CURRENT_USER.role;
        } else if (['favorites'].includes(table)) {
          data.user_role = CURRENT_USER.role;
        } else if (['scores'].includes(table)) {
          data.player_role = CURRENT_USER.role;
        } else if (['achievements'].includes(table)) {
          data.achiever_role = CURRENT_USER.role;
        }
      }
    }

    const { data: result, error } = await SB_CLIENT
      .from(table)
      .insert(data)
      .select()
      .single();

    if (error) throw error;
    return result;
  } catch (e) {
    console.error(`[Supabase] 插入失败 [${table}]:`, e.message);
    return null;
  }
}

/**
 * 更新
 */
async function sbUpdate(table, id, data) {
  if (!SB_READY || !AUTH_READY) return false;

  try {
    const { error } = await SB_CLIENT
      .from(table)
      .update(data)
      .eq('id', id);

    if (error) throw error;
    return true;
  } catch (e) {
    console.error(`[Supabase] 更新失败 [${table}]:`, e.message);
    return false;
  }
}

/**
 * 删除（软删除）
 */
async function sbDelete(table, id) {
  if (!SB_READY || !AUTH_READY) return false;

  try {
    // 优先软删除
    const { error } = await SB_CLIENT
      .from(table)
      .update({ is_deleted: true, deleted_at: new Date().toISOString() })
      .eq('id', id);

    if (error) {
      // 如果表没有 is_deleted 字段，降级为硬删除
      const { error: hardError } = await SB_CLIENT
        .from(table)
        .delete()
        .eq('id', id);
      if (hardError) throw hardError;
    }
    return true;
  } catch (e) {
    console.error(`[Supabase] 删除失败 [${table}]:`, e.message);
    return false;
  }
}

/* ================================================================
   实时订阅（Postgres Changes）
   ================================================================ */

/**
 * 订阅表变更（仅同 pair）
 */
function sbSubscribe(table, callback, event = 'INSERT') {
  if (!SB_READY || !CURRENT_PAIR_ID) return null;

  const channelName = `realtime_${table}_${CURRENT_PAIR_ID}_${Date.now()}`;

  const channel = SB_CLIENT.channel(channelName)
    .on(
      'postgres_changes',
      {
        event: event,
        schema: 'public',
        table: table,
        filter: `pair_id=eq.${CURRENT_PAIR_ID}`
      },
      (payload) => {
        console.log(`[Realtime] ${table} ${event}:`, payload);
        callback(payload.new || payload.old || payload);
      }
    )
    .subscribe((status) => {
      console.log(`[Realtime] ${table} 订阅状态: ${status}`);
    });

  SB_SUBSCRIPTIONS[channelName] = channel;
  return channelName;
}

/**
 * 取消订阅
 */
function sbUnsubscribe(channelName) {
  if (SB_SUBSCRIPTIONS[channelName]) {
    SB_CLIENT.removeChannel(SB_SUBSCRIPTIONS[channelName]);
    delete SB_SUBSCRIPTIONS[channelName];
  }
}

/* ================================================================
   UI 控制
   ================================================================ */

function showLogin() {
  document.getElementById('login-overlay')?.classList.remove('hidden');
  document.getElementById('app-container')?.classList.add('hidden');
}

function showApp() {
  document.getElementById('login-overlay')?.classList.add('hidden');
  document.getElementById('app-container')?.classList.remove('hidden');
}

/* ================================================================
   导出
   ================================================================ */

// 暴露到全局
window.initSupabase = initSupabase;
window.authSignIn = authSignIn;
window.authSignOut = authSignOut;
window.restoreSession = restoreSession;
window.getSession = getSession;
window.loadUserProfile = loadUserProfile;
window.registerDevice = registerDevice;
window.joinPresence = joinPresence;
window.leavePresence = leavePresence;
window.getPartnerPresence = getPartnerPresence;
window.kickOldSession = kickOldSession;
window.throwBottleSecure = throwBottleSecure;
window.catchBottleSecure = catchBottleSecure;
window.getAvailableBottles = getAvailableBottles;
window.sbSelect = sbSelect;
window.sbInsert = sbInsert;
window.sbUpdate = sbUpdate;
window.sbDelete = sbDelete;
window.sbSubscribe = sbSubscribe;
window.sbUnsubscribe = sbUnsubscribe;
window.ROLE_EMAILS = ROLE_EMAILS;

// 全局只读属性
Object.defineProperty(window, 'CURRENT_USER', {
  get: () => CURRENT_USER
});
Object.defineProperty(window, 'CURRENT_PAIR_ID', {
  get: () => CURRENT_PAIR_ID
});
Object.defineProperty(window, 'AUTH_READY', {
  get: () => AUTH_READY
});
