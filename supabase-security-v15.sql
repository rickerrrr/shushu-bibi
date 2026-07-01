-- ================================================================
-- 恋爱官网 v15.1 安全架构完整 SQL
-- 执行前：先删除之前测试的数据（如有）
-- 执行后：所有数据自动隔离，仅本情侣可见
-- ================================================================

-- ================================================================
-- 0. 清理旧表（如果是全新安装可跳过）
-- ================================================================
/*
DROP TABLE IF EXISTS public.achievements CASCADE;
DROP TABLE IF EXISTS public.points CASCADE;
DROP TABLE IF EXISTS public.checkins CASCADE;
DROP TABLE IF EXISTS public.finance CASCADE;
DROP TABLE IF EXISTS public.calendar_events CASCADE;
DROP TABLE IF EXISTS public.notes CASCADE;
DROP TABLE IF EXISTS public.bottles CASCADE;
DROP TABLE IF EXISTS public.pairs CASCADE;
DROP TABLE IF EXISTS public.profiles CASCADE;
*/

-- ================================================================
-- 1. 用户档案表（扩展 Supabase Auth）
-- ================================================================
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID REFERENCES auth.users(id) PRIMARY KEY,
  username TEXT UNIQUE NOT NULL,
  role TEXT CHECK (role IN ('shushu','bibi')) NOT NULL,
  avatar_emoji TEXT DEFAULT '🐹',
  pair_id UUID,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 启用 RLS
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- 用户可读取所有档案（用于配对），但只能更新自己的
CREATE POLICY "profiles_select" ON public.profiles 
  FOR SELECT USING (true);

CREATE POLICY "profiles_update" ON public.profiles 
  FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "profiles_insert" ON public.profiles 
  FOR INSERT WITH (auth.uid() = id);

-- ================================================================
-- 2. 情侣绑定表（核心安全锚点）
-- ================================================================
CREATE TABLE IF NOT EXISTS public.pairs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  pair_code TEXT UNIQUE NOT NULL,  -- 绑定码（如 "LOVE2026"）
  user1_id UUID REFERENCES public.profiles(id),
  user2_id UUID REFERENCES public.profiles(id),
  status TEXT DEFAULT 'active' CHECK (status IN ('active','archived')),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.pairs ENABLE ROW LEVEL SECURITY;

-- 仅绑定的两人可查看自己的 pair
CREATE POLICY "pairs_select" ON public.pairs 
  FOR SELECT USING (
    auth.uid() = user1_id OR auth.uid() = user2_id
  );

-- ================================================================
-- 3. 漂流瓶表（添加 pair_id）
-- ================================================================
CREATE TABLE IF NOT EXISTS public.bottles (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  pair_id UUID REFERENCES public.pairs(id) NOT NULL,
  bottle_type TEXT NOT NULL,
  content TEXT NOT NULL,
  sender_role TEXT NOT NULL CHECK (sender_role IN ('shushu','bibi')),
  caught BOOLEAN DEFAULT FALSE,
  caught_by_role TEXT CHECK (caught_by_role IN ('shushu','bibi')),
  caught_at TIMESTAMPTZ,
  privilege_item JSONB,
  unlock_at BIGINT,
  city TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.bottles ENABLE ROW LEVEL SECURITY;

-- RLS：仅同 pair 可操作
CREATE POLICY "bottles_all" ON public.bottles 
  FOR ALL USING (
    pair_id IN (
      SELECT id FROM public.pairs 
      WHERE user1_id = auth.uid() OR user2_id = auth.uid()
    )
  ) WITH CHECK (
    pair_id IN (
      SELECT id FROM public.pairs 
      WHERE user1_id = auth.uid() OR user2_id = auth.uid()
    )
  );

-- ================================================================
-- 4. 便签表（添加 pair_id）
-- ================================================================
CREATE TABLE IF NOT EXISTS public.notes (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  pair_id UUID REFERENCES public.pairs(id) NOT NULL,
  content TEXT NOT NULL,
  author_role TEXT NOT NULL CHECK (author_role IN ('shushu','bibi')),
  pinned BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.notes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "notes_all" ON public.notes 
  FOR ALL USING (
    pair_id IN (
      SELECT id FROM public.pairs 
      WHERE user1_id = auth.uid() OR user2_id = auth.uid()
    )
  ) WITH CHECK (
    pair_id IN (
      SELECT id FROM public.pairs 
      WHERE user1_id = auth.uid() OR user2_id = auth.uid()
    )
  );

-- ================================================================
-- 5. 日历事件表（添加 pair_id）
-- ================================================================
CREATE TABLE IF NOT EXISTS public.calendar_events (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  pair_id UUID REFERENCES public.pairs(id) NOT NULL,
  title TEXT NOT NULL,
  date TEXT NOT NULL,
  type TEXT DEFAULT 'normal',
  created_by_role TEXT NOT NULL CHECK (created_by_role IN ('shushu','bibi')),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.calendar_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "calendar_all" ON public.calendar_events 
  FOR ALL USING (
    pair_id IN (
      SELECT id FROM public.pairs 
      WHERE user1_id = auth.uid() OR user2_id = auth.uid()
    )
  ) WITH CHECK (
    pair_id IN (
      SELECT id FROM public.pairs 
      WHERE user1_id = auth.uid() OR user2_id = auth.uid()
    )
  );

-- ================================================================
-- 6. 财务记录表（添加 pair_id）
-- ================================================================
CREATE TABLE IF NOT EXISTS public.finance (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  pair_id UUID REFERENCES public.pairs(id) NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('expense','income','transfer')),
  amount NUMERIC NOT NULL,
  category TEXT,
  note TEXT,
  date TEXT NOT NULL,
  created_by_role TEXT NOT NULL CHECK (created_by_role IN ('shushu','bibi')),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.finance ENABLE ROW LEVEL SECURITY;

CREATE POLICY "finance_all" ON public.finance 
  FOR ALL USING (
    pair_id IN (
      SELECT id FROM public.pairs 
      WHERE user1_id = auth.uid() OR user2_id = auth.uid()
    )
  ) WITH CHECK (
    pair_id IN (
      SELECT id FROM public.pairs 
      WHERE user1_id = auth.uid() OR user2_id = auth.uid()
    )
  );

-- ================================================================
-- 7. 成长打卡表（添加 pair_id）
-- ================================================================
CREATE TABLE IF NOT EXISTS public.checkins (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  pair_id UUID REFERENCES public.pairs(id) NOT NULL,
  habit TEXT NOT NULL,
  note TEXT,
  author_role TEXT NOT NULL CHECK (author_role IN ('shushu','bibi')),
  date TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.checkins ENABLE ROW LEVEL SECURITY;

CREATE POLICY "checkins_all" ON public.checkins 
  FOR ALL USING (
    pair_id IN (
      SELECT id FROM public.pairs 
      WHERE user1_id = auth.uid() OR user2_id = auth.uid()
    )
  ) WITH CHECK (
    pair_id IN (
      SELECT id FROM public.pairs 
      WHERE user1_id = auth.uid() OR user2_id = auth.uid()
    )
  );

-- ================================================================
-- 8. 积分记录表（添加 pair_id）
-- ================================================================
CREATE TABLE IF NOT EXISTS public.points (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  pair_id UUID REFERENCES public.pairs(id) NOT NULL,
  user_role TEXT NOT NULL CHECK (user_role IN ('shushu','bibi')),
  points INTEGER NOT NULL,
  reason TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.points ENABLE ROW LEVEL SECURITY;

CREATE POLICY "points_all" ON public.points 
  FOR ALL USING (
    pair_id IN (
      SELECT id FROM public.pairs 
      WHERE user1_id = auth.uid() OR user2_id = auth.uid()
    )
  ) WITH CHECK (
    pair_id IN (
      SELECT id FROM public.pairs 
      WHERE user1_id = auth.uid() OR user2_id = auth.uid()
    )
  );

-- ================================================================
-- 9. 成就记录表（添加 pair_id）
-- ================================================================
CREATE TABLE IF NOT EXISTS public.achievements (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  pair_id UUID REFERENCES public.pairs(id) NOT NULL,
  user_role TEXT NOT NULL CHECK (user_role IN ('shushu','bibi')),
  achievement_id TEXT NOT NULL,
  unlocked_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.achievements ENABLE ROW LEVEL SECURITY;

CREATE POLICY "achievements_all" ON public.achievements 
  FOR ALL USING (
    pair_id IN (
      SELECT id FROM public.pairs 
      WHERE user1_id = auth.uid() OR user2_id = auth.uid()
    )
  ) WITH CHECK (
    pair_id IN (
      SELECT id FROM public.pairs 
      WHERE user1_id = auth.uid() OR user2_id = auth.uid()
    )
  );

-- ================================================================
-- 10. 登录日志表（安全审计）
-- ================================================================
CREATE TABLE IF NOT EXISTS public.login_logs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES public.profiles(id),
  user_role TEXT,
  ip_address TEXT,
  user_agent TEXT,
  device_info TEXT,
  logged_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.login_logs ENABLE ROW LEVEL SECURITY;

-- 仅本人可查看自己的登录日志
CREATE POLICY "login_logs_select" ON public.login_logs 
  FOR SELECT USING (user_id = auth.uid());

-- ================================================================
-- 11. PostgreSQL 安全函数（防篡改核心）
-- ================================================================

-- 函数1：投瓶（积分+5，写入瓶子）
CREATE OR REPLACE FUNCTION public.throw_bottle(
  p_pair_id UUID,
  p_bottle_type TEXT,
  p_content TEXT,
  p_sender_role TEXT,
  p_privilege_item JSONB DEFAULT NULL,
  p_unlock_at BIGINT DEFAULT NULL,
  p_city TEXT DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql SECURITY DEFINER
AS $$
DECLARE
  v_bottle_id UUID;
BEGIN
  -- 验证调用者是该 pair 的成员
  IF NOT EXISTS (
    SELECT 1 FROM public.pairs 
    WHERE id = p_pair_id 
    AND (user1_id = auth.uid() OR user2_id = auth.uid())
  ) THEN
    RAISE EXCEPTION '无权操作此情侣对';
  END IF;

  -- 插入瓶子
  INSERT INTO public.bottles (pair_id, bottle_type, content, sender_role, privilege_item, unlock_at, city)
  VALUES (p_pair_id, p_bottle_type, p_content, p_sender_role, p_privilege_item, p_unlock_at, p_city)
  RETURNING id INTO v_bottle_id;

  -- 增加积分（+5）
  INSERT INTO public.points (pair_id, user_role, points, reason)
  VALUES (p_pair_id, p_sender_role, 5, '投瓶奖励');

  RETURN v_bottle_id;
END;
$$;

-- 函数2：捞瓶（积分+3，标记已捞）
CREATE OR REPLACE FUNCTION public.catch_bottle(
  p_bottle_id UUID,
  p_catcher_role TEXT
)
RETURNS TABLE(
  success BOOLEAN,
  message TEXT,
  bottle_data JSONB
)
LANGUAGE plpgsql SECURITY DEFINER
AS $$
DECLARE
  v_pair_id UUID;
  v_caught BOOLEAN;
BEGIN
  -- 获取瓶子信息
  SELECT pair_id, caught INTO v_pair_id, v_caught
  FROM public.bottles
  WHERE id = p_bottle_id;

  IF v_pair_id IS NULL THEN
    RETURN QUERY SELECT FALSE, '瓶子不存在'::TEXT, NULL::JSONB;
    RETURN;
  END IF;

  -- 验证调用者是该 pair 的成员
  IF NOT EXISTS (
    SELECT 1 FROM public.pairs 
    WHERE id = v_pair_id 
    AND (user1_id = auth.uid() OR user2_id = auth.uid())
  ) THEN
    RETURN QUERY SELECT FALSE, '无权操作'::TEXT, NULL::JSONB;
    RETURN;
  END IF;

  -- 检查是否已捞
  IF v_caught THEN
    RETURN QUERY SELECT FALSE, '瓶子已被捞走'::TEXT, NULL::JSONB;
    RETURN;
  END IF;

  -- 更新瓶子为已捞
  UPDATE public.bottles
  SET caught = TRUE, caught_by_role = p_catcher_role, caught_at = NOW()
  WHERE id = p_bottle_id;

  -- 增加积分（+3）
  INSERT INTO public.points (pair_id, user_role, points, reason)
  VALUES (v_pair_id, p_catcher_role, 3, '捞瓶奖励');

  -- 返回瓶子数据
  RETURN QUERY
  SELECT TRUE, '捞到了！'::TEXT, 
    jsonb_build_object(
      'id', b.id,
      'bottle_type', b.bottle_type,
      'content', b.content,
      'sender_role', b.sender_role,
      'privilege_item', b.privilege_item,
      'unlock_at', b.unlock_at
    )
  FROM public.bottles b
  WHERE b.id = p_bottle_id;
END;
$$;

-- 函数3：获取当前用户积分总和
CREATE OR REPLACE FUNCTION public.get_my_points(p_pair_id UUID)
RETURNS INTEGER
LANGUAGE plpgsql SECURITY DEFINER
AS $$
DECLARE
  v_role TEXT;
  v_total INTEGER;
BEGIN
  -- 获取当前用户角色
  SELECT role INTO v_role FROM public.profiles WHERE id = auth.uid();

  -- 计算总分
  SELECT COALESCE(SUM(points), 0) INTO v_total
  FROM public.points
  WHERE pair_id = p_pair_id AND user_role = v_role;

  RETURN v_total;
END;
$$;

-- ================================================================
-- 12. Realtime 配置（仅推送同 pair 数据）
-- ================================================================

-- 启用 Realtime（仅对认证用户）
ALTER PUBLICATION supabase_realtime ADD TABLE public.bottles;
ALTER PUBLICATION supabase_realtime ADD TABLE public.notes;
ALTER PUBLICATION supabase_realtime ADD TABLE public.calendar_events;

-- 注意：Realtime 的 RLS 过滤需要在前端订阅时指定 pair_id 过滤
-- Supabase Realtime v2 支持在订阅时传参数过滤

-- ================================================================
-- 13. Storage 存储桶（私密文件）
-- ================================================================

-- 创建存储桶（在 Supabase 控制台手动创建，或使用 SQL）
-- 名称：couple-files
-- 公开访问：关闭

-- RLS 策略（通过 Supabase 控制台设置 Storage 策略）：
-- 1. 仅认证用户可上传
-- 2. 仅同 pair 用户可读取
-- 3. 文件名为 {pair_id}/{type}/{filename}

-- ================================================================
-- 14. 禁用匿名登录（在 Supabase Auth 设置中操作）
-- ================================================================
-- 进入 Supabase 控制台 → Authentication → Settings
-- 关闭 "Enable anonymous sign-ins"

-- ================================================================
-- 完成提示
-- ================================================================
SELECT '✅ 安全架构部署完成！' AS status,
       '所有表已添加 pair_id + RLS' AS rls,
       '积分/投瓶/捞瓶逻辑已迁移到数据库函数' AS functions,
       '请在 Supabase Auth 设置中关闭匿名登录' AS auth_tip;
