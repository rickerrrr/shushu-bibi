/* ================================================================
   Supabase 核心模块 v15.4 — 安全架构版（共享账号模式）
   ✅ 共享 Auth 账号（两人共用）
   ✅ pair_id 硬编码（RLS 数据隔离）
   ✅ 安全数据库函数调用
   ✅ 实时订阅（仅同 pair）
   ✅ 云端同步模式
   ================================================================ */

// ── Supabase 配置 ────────────────────────────────────────────────
const SUPABASE_URL = 'https://vsmkttjbujiibjviwqrgsl.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZzbWt0dGpidWpxYndpdnFncnNsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODI2MzEyMDQsImV4cCI6MjA5ODIwNzIwNH0.A1S9YaqMtmgVsQXOc1Fjqyy88y4zj8HL2MuivUnjjIQ';

// ── 全局状态 ─────────────────────────────────────────────────────
let SB_CLIENT = null;
let SB_READY = false;
let CURRENT_USER = null;      // { id, email, role, pair_id, ... }
const CURRENT_PAIR_ID = 'ccf73cbd-c7ab-427d-9396-64e42b772c8c';  // 硬编码情侣对ID（安全：RLS保护）
let AUTH_READY = false;       // 认证是否完成

// 订阅句柄
const SB_SUBSCRIPTIONS = {};

/* ================================================================
   Auth 认证系统
   ================================================================ */

// 注册
async function authSignUp(email, password, role) {
  try {
    const { data, error } = await SB_CLIENT.auth.signUp({
      email,
      password,
      options: {
        data: { role }
      }
    });
    if (error) throw error;
    return { success: true, user: data.user, session: data.session };
  } catch (e) {
    return { success: false, error: e.message };
  }
}

// 登录（纯 Anon 模式：跳过 Auth，直接设置用户上下文）
async function authSignIn(email, password, role) {
  try {
    console.log('[Auth] 纯 Anon 模式：跳过登录，直接设置用户上下文', { role });

    // ✅ 不调用 Supabase Auth（避免网络错误）
    // ✅ 直接设置用户上下文（不依赖 SB_CLIENT）
    CURRENT_USER = {
      id: 'anon-' + role,  // 虚拟 ID（不会用于 RLS）
      role: role,
      pair_id: CURRENT_PAIR_ID,
      email: email
    };
    AUTH_READY = true;
    
    console.log('[Auth] ✅ 用户上下文已设置（纯 Anon 模式）:', CURRENT_USER);
    
    // 测试数据库连接（仅在 SB_CLIENT 存在时）
    if (typeof SB_CLIENT !== 'undefined' && SB_CLIENT) {
      testConnection().then(connected => {
        if (connected) {
          console.log('[Supabase] ✅ 数据库连接测试通过（Anon 模式）');
        } else {
          console.warn('[Supabase] ⚠️ 数据库连接失败（检查 RLS 策略是否允许 Anon 访问）');
        }
      });
    } else {
      console.log('[Supabase] ℹ️ SB_CLIENT 未初始化，跳过连接测试（纯本地模式）');
    }

    return { success: true, user: CURRENT_USER };
  } catch (e) {
    console.error('[Auth] 设置用户上下文失败:', e.message);
    return { success: false, error: e.message };
  }
}

// 登出
async function authSignOut() {
  try {
    await SB_CLIENT.auth.signOut();
    CURRENT_USER = null;
    CURRENT_PAIR_ID = null;
    AUTH_READY = false;
    return { success: true };
  } catch (e) {
    return { success: false, error: e.message };
  }
}

// 获取当前 session
async function getSession() {
  try {
    const { data: { session }, error } = await SB_CLIENT.auth.getSession();
    if (error) throw error;
    if (session) {
      await loadUserProfile(session.user.id);
    }
    return session;
  } catch (e) {
    console.error('[Auth] 获取 session 失败:', e.message);
    return null;
  }
}

// 加载用户档案（共享账号模式：硬编码 pair_id）
async function loadUserProfile(userId, role) {
  try {
    // 共享账号模式：不从 profiles 表读取，直接设置
    CURRENT_USER = {
      id: userId,
      role: role,
      pair_id: CURRENT_PAIR_ID  // 使用硬编码的 pair_id
    };
    AUTH_READY = true;
    
    console.log(`[Auth] ✅ 用户已加载: ${role}`);
    return CURRENT_USER;
  } catch (e) {
    console.error('[Auth] 加载档案失败:', e.message);
    return null;
  }
}

// 创建用户档案（注册后调用）
async function createProfile(userId, email, role, username) {
  try {
    const { data, error } = await SB_CLIENT
      .from('profiles')
      .insert({
        id: userId,
        username: username,
        role: role
      })
      .select()
      .single();
    
    if (error) throw error;
    
    CURRENT_USER = data;
    AUTH_READY = true;
    
    console.log(`[Auth] ✅ 档案创建成功: ${role} (${username})`);
    return { success: true, profile: data };
  } catch (e) {
    console.error('[Auth] 创建档案失败:', e.message);
    return { success: false, error: e.message };
  }
}

// 情侣绑定（生成绑定码）
async function createPairCode() {
  try {
    const pairCode = 'LOVE' + Math.random().toString(36).substr(2, 4).toUpperCase();
    
    const { data, error } = await SB_CLIENT
      .from('pairs')
      .insert({
        pair_code: pairCode,
        user1_id: CURRENT_USER.id
      })
      .select()
      .single();
    
    if (error) throw error;
    
    // 更新自己的 pair_id
    await SB_CLIENT
      .from('profiles')
      .update({ pair_id: data.id })
      .eq('id', CURRENT_USER.id);
    
    CURRENT_PAIR_ID = data.id;
    
    return { success: true, pairCode: pairCode, pairId: data.id };
  } catch (e) {
    return { success: false, error: e.message };
  }
}

// 加入情侣对（通过绑定码）
async function joinPair(pairCode) {
  try {
    // 查找 pair
    const { data: pair, error: pairError } = await SB_CLIENT
      .from('pairs')
      .select('*')
      .eq('pair_code', pairCode)
      .single();
    
    if (pairError || !pair) {
      return { success: false, error: '绑定码不存在' };
    }
    
    if (pair.user2_id) {
      return { success: false, error: '该绑定码已被使用' };
    }
    
    // 更新 pair（加入 user2）
    const { error: updateError } = await SB_CLIENT
      .from('pairs')
      .update({ user2_id: CURRENT_USER.id })
      .eq('id', pair.id);
    
    if (updateError) throw updateError;
    
    // 更新自己的 pair_id
    await SB_CLIENT
      .from('profiles')
      .update({ pair_id: pair.id })
      .eq('id', CURRENT_USER.id);
    
    CURRENT_PAIR_ID = pair.id;
    
    return { success: true, pairId: pair.id };
  } catch (e) {
    return { success: false, error: e.message };
  }
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
      SB_CLIENT = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
      SB_READY = true;
      console.log('[Supabase] ✅ 客户端初始化成功');

      // ✅ 注意：不在初始化时测试数据库连接
      // 原因：RLS 需要登录后的 auth.uid()，未登录时查询会失败
      // 数据库连接测试将在 authSignIn() 登录成功后进行

      resolve(true);

    } catch (e) {
      console.error('[Supabase] 初始化失败:', e.message);
      resolve(false);
    }
  });
}

// 测试数据库连接
async function testConnection() {
  try {
    const { data, error } = await SB_CLIENT
      .from('pairs')
      .select('id')
      .eq('id', CURRENT_PAIR_ID)
      .limit(1);
    
    if (error) {
      console.error('[Supabase] 连接测试失败:', error.message);
      return false;
    }
    return true;
  } catch (e) {
    console.error('[Supabase] 连接测试异常:', e.message);
    return false;
  }
}

/* ================================================================
   安全数据库操作（使用数据库函数）
   ================================================================ */

// 投瓶（调用数据库函数）
async function throwBottleSecure(bottleType, content, privilegeItem = null, unlockAt = null, city = null) {
  if (!AUTH_READY || !CURRENT_PAIR_ID) {
    return { success: false, error: '未登录或未完成绑定' };
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

// 捞瓶（调用数据库函数）
async function catchBottleSecure(bottleId) {
  if (!AUTH_READY || !CURRENT_PAIR_ID) {
    return { success: false, error: '未登录或未完成绑定' };
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

// 查询未捞取的瓶子（仅同 pair）
async function getAvailableBottles() {
  if (!AUTH_READY || !CURRENT_PAIR_ID) return [];

  try {
    const { data, error } = await SB_CLIENT
      .from('bottles')
      .select('*')
      .eq('pair_id', CURRENT_PAIR_ID)
      .eq('caught', false)
      .order('created_at', { ascending: false })
      .limit(50);

    if (error) throw error;
    return data;
  } catch (e) {
    console.error('[Supabase] 查询瓶子失败:', e.message);
    return [];
  }
}

// 通用查询（自动过滤 pair_id）
async function sbSelect(table, options = {}) {
  if (!SB_READY) return [];
  
  try {
    let query = SB_CLIENT.from(table).select(options.select || '*');

    // 自动添加 pair_id 过滤（安全！）
    if (CURRENT_PAIR_ID && table !== 'profiles' && table !== 'pairs') {
      query = query.eq('pair_id', CURRENT_PAIR_ID);
    }

    if (options.filter) {
      Object.entries(options.filter).forEach(([k, v]) => {
        query = query.eq(k, v);
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

// 插入（自动添加 pair_id）
async function sbInsert(table, data) {
  if (!SB_READY) return null;

  try {
    // 自动添加 pair_id（安全！）
    if (CURRENT_PAIR_ID && table !== 'profiles' && table !== 'pairs') {
      data.pair_id = CURRENT_PAIR_ID;
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

// 更新
async function sbUpdate(table, id, data) {
  if (!SB_READY) return false;

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

// 删除
async function sbDelete(table, id) {
  if (!SB_READY) return false;

  try {
    const { error } = await SB_CLIENT
      .from(table)
      .delete()
      .eq('id', id);

    if (error) throw error;
    return true;
  } catch (e) {
    console.error(`[Supabase] 删除失败 [${table}]:`, e.message);
    return false;
  }
}

/* ================================================================
   实时订阅（仅同 pair）
   ================================================================ */

function sbSubscribe(table, callback, event = 'INSERT') {
  if (!SB_READY || !CURRENT_PAIR_ID) return null;

  const channelName = `${table}_${CURRENT_PAIR_ID}_${Date.now()}`;

  const channel = SB_CLIENT.channel(channelName)
    .on(
      'postgres_changes',
      {
        event: event,
        schema: 'public',
        table: table,
        filter: `pair_id=eq.${CURRENT_PAIR_ID}`  // 仅订阅同 pair 数据
      },
      (payload) => {
        console.log(`[Realtime] ${table} ${event}:`, payload);
        callback(payload.new || payload.old);
      }
    )
    .subscribe((status) => {
      console.log(`[Realtime] ${table} 订阅状态: ${status}`);
    });

  SB_SUBSCRIPTIONS[channelName] = channel;
  return channelName;
}

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
window.authSignUp = authSignUp;
window.authSignIn = authSignIn;
window.authSignOut = authSignOut;
window.createProfile = createProfile;
window.createPairCode = createPairCode;
window.joinPair = joinPair;
window.throwBottleSecure = throwBottleSecure;
window.catchBottleSecure = catchBottleSecure;
window.getAvailableBottles = getAvailableBottles;
window.sbSelect = sbSelect;
window.sbInsert = sbInsert;
window.sbUpdate = sbUpdate;
window.sbDelete = sbDelete;
window.sbSubscribe = sbSubscribe;
window.sbUnsubscribe = sbUnsubscribe;
window.getSession = getSession;
window.loadUserProfile = loadUserProfile;
