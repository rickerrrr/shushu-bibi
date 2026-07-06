-- ================================================================
--  shushu-bibi.cn Supabase Migration v1.0
--  Supabase Realtime 架构完整建表脚本
--
--  执行位置: Supabase Dashboard → SQL Editor → New Query
--  执行顺序: 从上到下，一次性全部粘贴执行
--
--  架构说明:
--    - 放弃 Cloudflare (Durable Objects / WebSocket / Workers / KV / D1 / R2)
--    - 使用 Supabase Auth (真实密码登录 + JWT)
--    - 使用 Supabase Realtime (Presence + Broadcast + Postgres Changes)
--    - 使用 RLS (Row Level Security) 实现数据库级防篡改
--    - 使用设备指纹白名单替代 IP+UA 白名单
-- ================================================================

-- ── 扩展插件 ──────────────────────────────────────────────────
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ================================================================
--  1. pairs — 情侣对表
-- ================================================================
CREATE TABLE IF NOT EXISTS public.pairs (
  id           UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  pair_code    TEXT UNIQUE NOT NULL,
  user1_id     UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  user2_id     UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  user1_role   TEXT NOT NULL DEFAULT 'shushu',
  user2_role   TEXT,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ================================================================
--  2. profiles — 用户档案（扩展 auth.users）
-- ================================================================
CREATE TABLE IF NOT EXISTS public.profiles (
  id           UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  pair_id      UUID REFERENCES public.pairs(id) ON DELETE SET NULL,
  role         TEXT NOT NULL CHECK (role IN ('shushu', 'bibi')),
  display_name TEXT,
  avatar_emoji TEXT DEFAULT '🐹',
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ================================================================
--  3. user_devices — 设备白名单（指纹绑定）
-- ================================================================
CREATE TABLE IF NOT EXISTS public.user_devices (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id         UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  pair_id         UUID NOT NULL REFERENCES public.pairs(id) ON DELETE CASCADE,
  device_hash     TEXT NOT NULL,
  device_name     TEXT,
  platform        TEXT,
  browser         TEXT,
  screen_info     TEXT,
  timezone        TEXT,
  is_trusted      BOOLEAN NOT NULL DEFAULT true,
  first_seen      TIMESTAMPTZ NOT NULL DEFAULT now(),
  last_seen       TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ================================================================
--  4. messages — 实时聊天消息
-- ================================================================
CREATE TABLE IF NOT EXISTS public.messages (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  pair_id       UUID NOT NULL REFERENCES public.pairs(id) ON DELETE CASCADE,
  sender_id     UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  sender_role   TEXT NOT NULL CHECK (sender_role IN ('shushu', 'bibi')),
  content       TEXT,
  content_enc   TEXT,
  msg_type      TEXT NOT NULL DEFAULT 'text' CHECK (msg_type IN ('text', 'emoji', 'voice', 'image', 'system')),
  voice_url     TEXT,
  reply_to      UUID REFERENCES public.messages(id) ON DELETE SET NULL,
  is_edited     BOOLEAN NOT NULL DEFAULT false,
  edited_at     TIMESTAMPTZ,
  is_deleted    BOOLEAN NOT NULL DEFAULT false,
  deleted_at    TIMESTAMPTZ,
  read_at       TIMESTAMPTZ,
  reactions     JSONB DEFAULT '{}',
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ================================================================
--  5. bottles — 漂流瓶
-- ================================================================
CREATE TABLE IF NOT EXISTS public.bottles (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  pair_id         UUID NOT NULL REFERENCES public.pairs(id) ON DELETE CASCADE,
  sender_role     TEXT NOT NULL CHECK (sender_role IN ('shushu', 'bibi')),
  bottle_type     TEXT NOT NULL DEFAULT 'normal',
  content         TEXT NOT NULL,
  privilege_item  TEXT,
  unlock_at       TIMESTAMPTZ,
  city            TEXT,
  caught          BOOLEAN NOT NULL DEFAULT false,
  caught_by       TEXT,
  caught_at       TIMESTAMPTZ,
  is_deleted      BOOLEAN NOT NULL DEFAULT false,
  deleted_at      TIMESTAMPTZ,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ================================================================
--  6. paperplanes — 纸飞机留言墙
-- ================================================================
CREATE TABLE IF NOT EXISTS public.paperplanes (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  pair_id       UUID NOT NULL REFERENCES public.pairs(id) ON DELETE CASCADE,
  sender_role   TEXT NOT NULL CHECK (sender_role IN ('shushu', 'bibi')),
  content       TEXT NOT NULL,
  color         TEXT DEFAULT '#ff6b9d',
  is_pinned     BOOLEAN NOT NULL DEFAULT false,
  is_deleted    BOOLEAN NOT NULL DEFAULT false,
  deleted_at    TIMESTAMPTZ,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ================================================================
--  7. timecapsules — 时光胶囊
-- ================================================================
CREATE TABLE IF NOT EXISTS public.timecapsules (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  pair_id       UUID NOT NULL REFERENCES public.pairs(id) ON DELETE CASCADE,
  sender_role   TEXT NOT NULL CHECK (sender_role IN ('shushu', 'bibi')),
  title         TEXT NOT NULL,
  content       TEXT NOT NULL,
  unlock_at     TIMESTAMPTZ NOT NULL,
  is_unlocked   BOOLEAN NOT NULL DEFAULT false,
  opened_by     TEXT,
  opened_at     TIMESTAMPTZ,
  is_deleted    BOOLEAN NOT NULL DEFAULT false,
  deleted_at    TIMESTAMPTZ,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ================================================================
--  8. anniversaries — 纪念日
-- ================================================================
CREATE TABLE IF NOT EXISTS public.anniversaries (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  pair_id       UUID NOT NULL REFERENCES public.pairs(id) ON DELETE CASCADE,
  title         TEXT NOT NULL,
  description   TEXT,
  anniversary_date DATE NOT NULL,
  is_recurring  BOOLEAN NOT NULL DEFAULT true,
  icon          TEXT DEFAULT '💖',
  is_deleted    BOOLEAN NOT NULL DEFAULT false,
  deleted_at    TIMESTAMPTZ,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ================================================================
--  9. favorites — 收藏
-- ================================================================
CREATE TABLE IF NOT EXISTS public.favorites (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  pair_id       UUID NOT NULL REFERENCES public.pairs(id) ON DELETE CASCADE,
  user_role     TEXT NOT NULL CHECK (user_role IN ('shushu', 'bibi')),
  item_type     TEXT NOT NULL CHECK (item_type IN ('message', 'bottle', 'photo', 'moment')),
  item_id       UUID,
  content       TEXT,
  metadata      JSONB DEFAULT '{}',
  is_deleted    BOOLEAN NOT NULL DEFAULT false,
  deleted_at    TIMESTAMPTZ,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ================================================================
--  10. scores — 情侣游戏分数
-- ================================================================
CREATE TABLE IF NOT EXISTS public.scores (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  pair_id       UUID NOT NULL REFERENCES public.pairs(id) ON DELETE CASCADE,
  player_role   TEXT NOT NULL CHECK (player_role IN ('shushu', 'bibi')),
  game_type     TEXT NOT NULL,
  score         INTEGER NOT NULL DEFAULT 0,
  stars         INTEGER NOT NULL DEFAULT 0,
  proof_text    TEXT,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ================================================================
--  11. achievements — 成就徽章
-- ================================================================
CREATE TABLE IF NOT EXISTS public.achievements (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  pair_id       UUID NOT NULL REFERENCES public.pairs(id) ON DELETE CASCADE,
  achiever_role TEXT NOT NULL CHECK (achiever_role IN ('shushu', 'bibi')),
  achievement_id TEXT NOT NULL,
  achievement_name TEXT NOT NULL,
  achievement_icon TEXT,
  achievement_desc TEXT,
  unlocked_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ================================================================
--  12. user_config — 用户配置（KV 替代）
-- ================================================================
CREATE TABLE IF NOT EXISTS public.user_config (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  pair_id       UUID NOT NULL REFERENCES public.pairs(id) ON DELETE CASCADE,
  user_role     TEXT NOT NULL CHECK (user_role IN ('shushu', 'bibi')),
  config_key    TEXT NOT NULL,
  config_value  JSONB,
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(pair_id, user_role, config_key)
);

-- ================================================================
--  13. online_sessions — 在线会话记录（辅助 Presence）
-- ================================================================
CREATE TABLE IF NOT EXISTS public.online_sessions (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  pair_id       UUID NOT NULL REFERENCES public.pairs(id) ON DELETE CASCADE,
  user_role     TEXT NOT NULL CHECK (user_role IN ('shushu', 'bibi')),
  device_hash   TEXT,
  status        TEXT NOT NULL DEFAULT 'online' CHECK (status IN ('online', 'away', 'offline')),
  last_heartbeat TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ================================================================
--  索引
-- ================================================================
CREATE INDEX IF NOT EXISTS idx_profiles_pair_id ON public.profiles(pair_id);
CREATE INDEX IF NOT EXISTS idx_devices_user_id ON public.user_devices(user_id);
CREATE INDEX IF NOT EXISTS idx_devices_pair_id ON public.user_devices(pair_id);
CREATE INDEX IF NOT EXISTS idx_devices_hash ON public.user_devices(device_hash);
CREATE INDEX IF NOT EXISTS idx_messages_pair_id ON public.messages(pair_id);
CREATE INDEX IF NOT EXISTS idx_messages_created ON public.messages(pair_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_messages_sender ON public.messages(sender_id);
CREATE INDEX IF NOT EXISTS idx_bottles_pair ON public.bottles(pair_id, caught);
CREATE INDEX IF NOT EXISTS idx_paperplanes_pair ON public.paperplanes(pair_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_timecapsules_pair ON public.timecapsules(pair_id, unlock_at);
CREATE INDEX IF NOT EXISTS idx_anniversaries_pair ON public.anniversaries(pair_id, anniversary_date);
CREATE INDEX IF NOT EXISTS idx_favorites_pair ON public.favorites(pair_id, user_role);
CREATE INDEX IF NOT EXISTS idx_scores_pair ON public.scores(pair_id, game_type);
CREATE INDEX IF NOT EXISTS idx_achievements_pair ON public.achievements(pair_id, achiever_role);
CREATE INDEX IF NOT EXISTS idx_config_pair_key ON public.user_config(pair_id, user_role, config_key);
CREATE INDEX IF NOT EXISTS idx_sessions_pair ON public.online_sessions(pair_id, status);
CREATE INDEX IF NOT EXISTS idx_sessions_heartbeat ON public.online_sessions(last_heartbeat);

-- ================================================================
--  updated_at 自动更新触发器
-- ================================================================
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_pairs_updated ON public.pairs;
CREATE TRIGGER trg_pairs_updated BEFORE UPDATE ON public.pairs
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

DROP TRIGGER IF EXISTS trg_profiles_updated ON public.profiles;
CREATE TRIGGER trg_profiles_updated BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

DROP TRIGGER IF EXISTS trg_devices_updated ON public.user_devices;
CREATE TRIGGER trg_devices_updated BEFORE UPDATE ON public.user_devices
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

DROP TRIGGER IF EXISTS trg_config_updated ON public.user_config;
CREATE TRIGGER trg_config_updated BEFORE UPDATE ON public.user_config
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- ================================================================
--  新用户注册时自动创建 profile（trigger）
-- ================================================================
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, role, display_name, avatar_emoji)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'role', 'shushu'),
    COALESCE(NEW.raw_user_meta_data->>'display_name', ''),
    COALESCE(NEW.raw_user_meta_data->>'avatar_emoji', '🐹')
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ================================================================
--  数据库函数: throw_bottle (投瓶)
-- ================================================================
CREATE OR REPLACE FUNCTION public.throw_bottle(
  p_pair_id UUID,
  p_bottle_type TEXT DEFAULT 'normal',
  p_content TEXT,
  p_sender_role TEXT,
  p_privilege_item TEXT DEFAULT NULL,
  p_unlock_at TIMESTAMPTZ DEFAULT NULL,
  p_city TEXT DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
  v_bottle_id UUID;
BEGIN
  INSERT INTO public.bottles (pair_id, bottle_type, content, sender_role, privilege_item, unlock_at, city)
  VALUES (p_pair_id, p_bottle_type, p_content, p_sender_role, p_privilege_item, p_unlock_at, p_city)
  RETURNING id INTO v_bottle_id;
  RETURN v_bottle_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ================================================================
--  数据库函数: catch_bottle (捞瓶)
-- ================================================================
CREATE OR REPLACE FUNCTION public.catch_bottle(
  p_bottle_id UUID,
  p_catcher_role TEXT
)
RETURNS TABLE(success BOOLEAN, message TEXT, bottle_data JSONB) AS $$
DECLARE
  v_bottle RECORD;
BEGIN
  SELECT * INTO v_bottle FROM public.bottles WHERE id = p_bottle_id AND caught = false;
  IF NOT FOUND THEN
    RETURN QUERY SELECT false, '瓶子不存在或已被捞走', NULL::JSONB;
    RETURN;
  END IF;
  IF v_bottle.sender_role = p_catcher_role THEN
    RETURN QUERY SELECT false, '不能捞自己的瓶子', NULL::JSONB;
    RETURN;
  END IF;
  UPDATE public.bottles SET caught = true, caught_by = p_catcher_role, caught_at = now()
  WHERE id = p_bottle_id;
  RETURN QUERY SELECT true, '捞瓶成功', to_jsonb(v_bottle);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ================================================================
--  数据库函数: register_device (注册设备)
-- ================================================================
CREATE OR REPLACE FUNCTION public.register_device(
  p_pair_id UUID,
  p_device_hash TEXT,
  p_device_name TEXT DEFAULT NULL,
  p_platform TEXT DEFAULT NULL,
  p_browser TEXT DEFAULT NULL,
  p_screen_info TEXT DEFAULT NULL,
  p_timezone TEXT DEFAULT NULL
)
RETURNS TABLE(device_id UUID, is_new BOOLEAN) AS $$
DECLARE
  v_device_id UUID;
  v_is_new BOOLEAN := false;
  v_user_id UUID := auth.uid();
BEGIN
  SELECT id INTO v_device_id FROM public.user_devices
  WHERE user_id = v_user_id AND device_hash = p_device_hash LIMIT 1;

  IF FOUND THEN
    UPDATE public.user_devices SET last_seen = now() WHERE id = v_device_id;
  ELSE
    INSERT INTO public.user_devices (user_id, pair_id, device_hash, device_name, platform, browser, screen_info, timezone)
    VALUES (v_user_id, p_pair_id, p_device_hash, p_device_name, p_platform, p_browser, p_screen_info, p_timezone)
    RETURNING id INTO v_device_id;
    v_is_new := true;
  END IF;

  RETURN QUERY SELECT v_device_id, v_is_new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ================================================================
--  数据库函数: check_device_trusted (检查设备是否可信)
-- ================================================================
CREATE OR REPLACE FUNCTION public.check_device_trusted(
  p_device_hash TEXT
)
RETURNS TABLE(is_trusted BOOLEAN, pair_id UUID, role TEXT) AS $$
DECLARE
  v_user_id UUID := auth.uid();
BEGIN
  RETURN QUERY
  SELECT d.is_trusted, d.pair_id, p.role
  FROM public.user_devices d
  JOIN public.profiles p ON p.id = d.user_id
  WHERE d.user_id = v_user_id AND d.device_hash = p_device_hash
  LIMIT 1;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ================================================================
--  数据库函数: get_pair_id (获取当前用户的 pair_id)
-- ================================================================
CREATE OR REPLACE FUNCTION public.get_pair_id()
RETURNS UUID AS $$
DECLARE
  v_pair_id UUID;
BEGIN
  SELECT pair_id INTO v_pair_id FROM public.profiles WHERE id = auth.uid();
  RETURN v_pair_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ================================================================
--  RLS 策略 — profiles
-- ================================================================
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "profiles_select_own" ON public.profiles;
CREATE POLICY "profiles_select_own" ON public.profiles
  FOR SELECT USING (auth.uid() = id);

DROP POLICY IF EXISTS "profiles_select_pair" ON public.profiles;
CREATE POLICY "profiles_select_pair" ON public.profiles
  FOR SELECT USING (
    pair_id = (SELECT pair_id FROM public.profiles WHERE id = auth.uid())
  );

DROP POLICY IF EXISTS "profiles_update_own" ON public.profiles;
CREATE POLICY "profiles_update_own" ON public.profiles
  FOR UPDATE USING (auth.uid() = id);

DROP POLICY IF EXISTS "profiles_insert_own" ON public.profiles;
CREATE POLICY "profiles_insert_own" ON public.profiles
  FOR INSERT WITH CHECK (auth.uid() = id);

-- ================================================================
--  RLS 策略 — pairs
-- ================================================================
ALTER TABLE public.pairs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "pairs_select_member" ON public.pairs;
CREATE POLICY "pairs_select_member" ON public.pairs
  FOR SELECT USING (
    auth.uid() = user1_id OR auth.uid() = user2_id
  );

DROP POLICY IF EXISTS "pairs_update_member" ON public.pairs;
CREATE POLICY "pairs_update_member" ON public.pairs
  FOR UPDATE USING (
    auth.uid() = user1_id OR auth.uid() = user2_id
  );

DROP POLICY IF EXISTS "pairs_insert_member" ON public.pairs;
CREATE POLICY "pairs_insert_member" ON public.pairs
  FOR INSERT WITH CHECK (
    auth.uid() = user1_id OR auth.uid() = user2_id
  );

-- ================================================================
--  RLS 策略 — user_devices
-- ================================================================
ALTER TABLE public.user_devices ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "devices_select_own" ON public.user_devices;
CREATE POLICY "devices_select_own" ON public.user_devices
  FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "devices_select_pair" ON public.user_devices;
CREATE POLICY "devices_select_pair" ON public.user_devices
  FOR SELECT USING (
    pair_id = (SELECT pair_id FROM public.profiles WHERE id = auth.uid())
  );

DROP POLICY IF EXISTS "devices_insert_own" ON public.user_devices;
CREATE POLICY "devices_insert_own" ON public.user_devices
  FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "devices_update_own" ON public.user_devices;
CREATE POLICY "devices_update_own" ON public.user_devices
  FOR UPDATE USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "devices_delete_own" ON public.user_devices;
CREATE POLICY "devices_delete_own" ON public.user_devices
  FOR DELETE USING (auth.uid() = user_id);

-- ================================================================
--  RLS 策略 — messages (通用 pair 策略)
-- ================================================================
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "messages_select_pair" ON public.messages;
CREATE POLICY "messages_select_pair" ON public.messages
  FOR SELECT USING (
    pair_id = (SELECT pair_id FROM public.profiles WHERE id = auth.uid())
  );

DROP POLICY IF EXISTS "messages_insert_pair" ON public.messages;
CREATE POLICY "messages_insert_pair" ON public.messages
  FOR INSERT WITH CHECK (
    pair_id = (SELECT pair_id FROM public.profiles WHERE id = auth.uid())
    AND sender_id = auth.uid()
  );

DROP POLICY IF EXISTS "messages_update_pair" ON public.messages;
CREATE POLICY "messages_update_pair" ON public.messages
  FOR UPDATE USING (
    pair_id = (SELECT pair_id FROM public.profiles WHERE id = auth.uid())
    AND sender_id = auth.uid()
  );

DROP POLICY IF EXISTS "messages_delete_pair" ON public.messages;
CREATE POLICY "messages_delete_pair" ON public.messages
  FOR DELETE USING (
    pair_id = (SELECT pair_id FROM public.profiles WHERE id = auth.uid())
    AND sender_id = auth.uid()
  );

-- ================================================================
--  RLS 策略 — bottles
-- ================================================================
ALTER TABLE public.bottles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "bottles_select_pair" ON public.bottles;
CREATE POLICY "bottles_select_pair" ON public.bottles
  FOR SELECT USING (
    pair_id = (SELECT pair_id FROM public.profiles WHERE id = auth.uid())
  );

DROP POLICY IF EXISTS "bottles_insert_pair" ON public.bottles;
CREATE POLICY "bottles_insert_pair" ON public.bottles
  FOR INSERT WITH CHECK (
    pair_id = (SELECT pair_id FROM public.profiles WHERE id = auth.uid())
  );

DROP POLICY IF EXISTS "bottles_update_pair" ON public.bottles;
CREATE POLICY "bottles_update_pair" ON public.bottles
  FOR UPDATE USING (
    pair_id = (SELECT pair_id FROM public.profiles WHERE id = auth.uid())
  );

DROP POLICY IF EXISTS "bottles_delete_pair" ON public.bottles;
CREATE POLICY "bottles_delete_pair" ON public.bottles
  FOR DELETE USING (
    pair_id = (SELECT pair_id FROM public.profiles WHERE id = auth.uid())
  );

-- ================================================================
--  RLS 策略 — paperplanes
-- ================================================================
ALTER TABLE public.paperplanes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "planes_select_pair" ON public.paperplanes;
CREATE POLICY "planes_select_pair" ON public.paperplanes
  FOR SELECT USING (
    pair_id = (SELECT pair_id FROM public.profiles WHERE id = auth.uid())
  );

DROP POLICY IF EXISTS "planes_insert_pair" ON public.paperplanes;
CREATE POLICY "planes_insert_pair" ON public.paperplanes
  FOR INSERT WITH CHECK (
    pair_id = (SELECT pair_id FROM public.profiles WHERE id = auth.uid())
  );

DROP POLICY IF EXISTS "planes_update_pair" ON public.paperplanes;
CREATE POLICY "planes_update_pair" ON public.paperplanes
  FOR UPDATE USING (
    pair_id = (SELECT pair_id FROM public.profiles WHERE id = auth.uid())
  );

DROP POLICY IF EXISTS "planes_delete_pair" ON public.paperplanes;
CREATE POLICY "planes_delete_pair" ON public.paperplanes
  FOR DELETE USING (
    pair_id = (SELECT pair_id FROM public.profiles WHERE id = auth.uid())
  );

-- ================================================================
--  RLS 策略 — timecapsules
-- ================================================================
ALTER TABLE public.timecapsules ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "capsules_select_pair" ON public.timecapsules;
CREATE POLICY "capsules_select_pair" ON public.timecapsules
  FOR SELECT USING (
    pair_id = (SELECT pair_id FROM public.profiles WHERE id = auth.uid())
  );

DROP POLICY IF EXISTS "capsules_insert_pair" ON public.timecapsules;
CREATE POLICY "capsules_insert_pair" ON public.timecapsules
  FOR INSERT WITH CHECK (
    pair_id = (SELECT pair_id FROM public.profiles WHERE id = auth.uid())
  );

DROP POLICY IF EXISTS "capsules_update_pair" ON public.timecapsules;
CREATE POLICY "capsules_update_pair" ON public.timecapsules
  FOR UPDATE USING (
    pair_id = (SELECT pair_id FROM public.profiles WHERE id = auth.uid())
  );

DROP POLICY IF EXISTS "capsules_delete_pair" ON public.timecapsules;
CREATE POLICY "capsules_delete_pair" ON public.timecapsules
  FOR DELETE USING (
    pair_id = (SELECT pair_id FROM public.profiles WHERE id = auth.uid())
  );

-- ================================================================
--  RLS 策略 — anniversaries
-- ================================================================
ALTER TABLE public.anniversaries ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "anni_select_pair" ON public.anniversaries;
CREATE POLICY "anni_select_pair" ON public.anniversaries
  FOR SELECT USING (
    pair_id = (SELECT pair_id FROM public.profiles WHERE id = auth.uid())
  );

DROP POLICY IF EXISTS "anni_insert_pair" ON public.anniversaries;
CREATE POLICY "anni_insert_pair" ON public.anniversaries
  FOR INSERT WITH CHECK (
    pair_id = (SELECT pair_id FROM public.profiles WHERE id = auth.uid())
  );

DROP POLICY IF EXISTS "anni_update_pair" ON public.anniversaries;
CREATE POLICY "anni_update_pair" ON public.anniversaries
  FOR UPDATE USING (
    pair_id = (SELECT pair_id FROM public.profiles WHERE id = auth.uid())
  );

DROP POLICY IF EXISTS "anni_delete_pair" ON public.anniversaries;
CREATE POLICY "anni_delete_pair" ON public.anniversaries
  FOR DELETE USING (
    pair_id = (SELECT pair_id FROM public.profiles WHERE id = auth.uid())
  );

-- ================================================================
--  RLS 策略 — favorites
-- ================================================================
ALTER TABLE public.favorites ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "fav_select_pair" ON public.favorites;
CREATE POLICY "fav_select_pair" ON public.favorites
  FOR SELECT USING (
    pair_id = (SELECT pair_id FROM public.profiles WHERE id = auth.uid())
  );

DROP POLICY IF EXISTS "fav_insert_pair" ON public.favorites;
CREATE POLICY "fav_insert_pair" ON public.favorites
  FOR INSERT WITH CHECK (
    pair_id = (SELECT pair_id FROM public.profiles WHERE id = auth.uid())
  );

DROP POLICY IF EXISTS "fav_update_pair" ON public.favorites;
CREATE POLICY "fav_update_pair" ON public.favorites
  FOR UPDATE USING (
    pair_id = (SELECT pair_id FROM public.profiles WHERE id = auth.uid())
  );

DROP POLICY IF EXISTS "fav_delete_pair" ON public.favorites;
CREATE POLICY "fav_delete_pair" ON public.favorites
  FOR DELETE USING (
    pair_id = (SELECT pair_id FROM public.profiles WHERE id = auth.uid())
  );

-- ================================================================
--  RLS 策略 — scores
-- ================================================================
ALTER TABLE public.scores ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "scores_select_pair" ON public.scores;
CREATE POLICY "scores_select_pair" ON public.scores
  FOR SELECT USING (
    pair_id = (SELECT pair_id FROM public.profiles WHERE id = auth.uid())
  );

DROP POLICY IF EXISTS "scores_insert_pair" ON public.scores;
CREATE POLICY "scores_insert_pair" ON public.scores
  FOR INSERT WITH CHECK (
    pair_id = (SELECT pair_id FROM public.profiles WHERE id = auth.uid())
  );

DROP POLICY IF EXISTS "scores_delete_pair" ON public.scores;
CREATE POLICY "scores_delete_pair" ON public.scores
  FOR DELETE USING (
    pair_id = (SELECT pair_id FROM public.profiles WHERE id = auth.uid())
  );

-- ================================================================
--  RLS 策略 — achievements
-- ================================================================
ALTER TABLE public.achievements ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "ach_select_pair" ON public.achievements;
CREATE POLICY "ach_select_pair" ON public.achievements
  FOR SELECT USING (
    pair_id = (SELECT pair_id FROM public.profiles WHERE id = auth.uid())
  );

DROP POLICY IF EXISTS "ach_insert_pair" ON public.achievements;
CREATE POLICY "ach_insert_pair" ON public.achievements
  FOR INSERT WITH CHECK (
    pair_id = (SELECT pair_id FROM public.profiles WHERE id = auth.uid())
  );

-- ================================================================
--  RLS 策略 — user_config
-- ================================================================
ALTER TABLE public.user_config ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "config_select_pair" ON public.user_config;
CREATE POLICY "config_select_pair" ON public.user_config
  FOR SELECT USING (
    pair_id = (SELECT pair_id FROM public.profiles WHERE id = auth.uid())
  );

DROP POLICY IF EXISTS "config_insert_pair" ON public.user_config;
CREATE POLICY "config_insert_pair" ON public.user_config
  FOR INSERT WITH CHECK (
    pair_id = (SELECT pair_id FROM public.profiles WHERE id = auth.uid())
  );

DROP POLICY IF EXISTS "config_update_pair" ON public.user_config;
CREATE POLICY "config_update_pair" ON public.user_config
  FOR UPDATE USING (
    pair_id = (SELECT pair_id FROM public.profiles WHERE id = auth.uid())
  );

DROP POLICY IF EXISTS "config_delete_pair" ON public.user_config;
CREATE POLICY "config_delete_pair" ON public.user_config
  FOR DELETE USING (
    pair_id = (SELECT pair_id FROM public.profiles WHERE id = auth.uid())
  );

-- ================================================================
--  RLS 策略 — online_sessions
-- ================================================================
ALTER TABLE public.online_sessions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "session_select_pair" ON public.online_sessions;
CREATE POLICY "session_select_pair" ON public.online_sessions
  FOR SELECT USING (
    pair_id = (SELECT pair_id FROM public.profiles WHERE id = auth.uid())
  );

DROP POLICY IF EXISTS "session_insert_pair" ON public.online_sessions;
CREATE POLICY "session_insert_pair" ON public.online_sessions
  FOR INSERT WITH CHECK (
    pair_id = (SELECT pair_id FROM public.profiles WHERE id = auth.uid())
  );

DROP POLICY IF EXISTS "session_update_pair" ON public.online_sessions;
CREATE POLICY "session_update_pair" ON public.online_sessions
  FOR UPDATE USING (
    pair_id = (SELECT pair_id FROM public.profiles WHERE id = auth.uid())
  );

DROP POLICY IF EXISTS "session_delete_pair" ON public.online_sessions;
CREATE POLICY "session_delete_pair" ON public.online_sessions
  FOR DELETE USING (
    pair_id = (SELECT pair_id FROM public.profiles WHERE id = auth.uid())
  );

-- ================================================================
--  Realtime 发布（启用 Postgres Changes）
-- ================================================================
-- 将需要实时推送的表加入 supabase_realtime publication
ALTER PUBLICATION supabase_realtime ADD TABLE public.messages;
ALTER PUBLICATION supabase_realtime ADD TABLE public.bottles;
ALTER PUBLICATION supabase_realtime ADD TABLE public.paperplanes;
ALTER PUBLICATION supabase_realtime ADD TABLE public.timecapsules;
ALTER PUBLICATION supabase_realtime ADD TABLE public.anniversaries;
ALTER PUBLICATION supabase_realtime ADD TABLE public.favorites;
ALTER PUBLICATION supabase_realtime ADD TABLE public.scores;
ALTER PUBLICATION supabase_realtime ADD TABLE public.achievements;
ALTER PUBLICATION supabase_realtime ADD TABLE public.user_config;
ALTER PUBLICATION supabase_realtime ADD TABLE public.online_sessions;

-- ================================================================
--  初始数据 — 创建情侣对记录
--  注意: user1_id / user2_id 需要在创建 Auth 用户后手动填入
-- ================================================================
INSERT INTO public.pairs (id, pair_code, user1_role, user2_role)
VALUES (
  'ccf73cbd-c7ab-427d-9396-64e42b772c8c',
  'LOVE2026',
  'shushu',
  'bibi'
)
ON CONFLICT (id) DO NOTHING;

-- ================================================================
--  完成
--  接下来需要你在 Dashboard 中手动操作:
--  1. Authentication → Users → 创建两个用户
--  2. 更新 pairs 表的 user1_id / user2_id
--  3. 更新 profiles 表的 pair_id
--  (详见操作指南)
-- ================================================================
