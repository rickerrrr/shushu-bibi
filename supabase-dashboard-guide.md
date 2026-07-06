# Supabase Dashboard 操作指南

## 鼠鼠&笔笔恋爱官网 — Supabase Realtime 架构配置

> **前提条件**: 已有 Supabase 项目 `vsmkttjbujiibjviwqrgsl`
> **执行时间**: 约 15-20 分钟

---

## Step 1: 执行 SQL 建表脚本

1. 打开 Supabase Dashboard: https://supabase.com/dashboard
2. 选择项目 `shushu-bibi` (vsmkttjbujiibjviwqrgsl)
3. 左侧菜单 → **SQL Editor**
4. 点击 **New Query**
5. 打开项目根目录下的 `supabase-migration-v1.sql` 文件
6. 复制全部内容，粘贴到 SQL Editor 中
7. 点击 **Run** (或按 Ctrl+Enter)
8. 等待执行完成，确认底部显示 `Success. No rows returned.`
9. 如果有错误，截图保存后告诉我

**验证**: 左侧菜单 → **Table Editor**，应该能看到以下 13 张表:
- pairs, profiles, user_devices, messages, bottles, paperplanes
- timecapsules, anniversaries, favorites, scores, achievements
- user_config, online_sessions

---

## Step 2: 创建两个 Auth 用户

目前你们用的是共享账号 `couple@shushu-bibi.cn`，现在需要改成两个独立账号。

### 2.1 创建鼠鼠的账号

1. 左侧菜单 → **Authentication** → **Users**
2. 点击 **Add user** → **Create new user**
3. 填写:
   - Email: `shushu@shushu-bibi.cn`
   - Password: `ShushuBibi2026!` (或你想要的新密码)
   - **Auto Confirm User**: ✅ 勾选（跳过邮箱验证，直接可用）
4. 点击 **Create user**
5. **复制 User ID** (类似 `a1b2c3d4-...` 格式)，记下来

### 2.2 创建笔笔的账号

1. 再次点击 **Add user** → **Create new user**
2. 填写:
   - Email: `bibi@shushu-bibi.cn`
   - Password: `ShushuBibi2026!` (或你想要的新密码)
   - **Auto Confirm User**: ✅ 勾选
3. 点击 **Create user**
4. **复制 User ID**，记下来

> ⚠️ 现在你应该有两个 User ID:
> - 鼠鼠 User ID: `____________________`
> - 笔笔 User ID: `____________________`

---

## Step 3: 更新 pairs 表和 profiles 表

### 3.1 获取已有的 pair ID

pair 记录已经在 SQL 脚本中自动创建，ID 是: `ccf73cbd-c7ab-427d-9396-64e42b772c8c`

### 3.2 更新 pairs 表 — 填入两个用户 ID

1. 左侧菜单 → **Table Editor** → **pairs**
2. 找到 `pair_code = LOVE2026` 的那一行
3. 双击 `user1_id` 列，粘贴 **鼠鼠的 User ID**
4. 双击 `user2_id` 列，粘贴 **笔笔的 User ID**
5. 点击 **Save**

### 3.3 更新 profiles 表

SQL 脚本中的 trigger 会在用户创建时自动生成 profile 记录，但 `pair_id` 需要手动更新。

1. 左侧菜单 → **Table Editor** → **profiles**
2. 应该能看到两行记录（鼠鼠和笔笔）
3. 双击鼠鼠那行的 `pair_id` 列，粘贴: `ccf73cbd-c7ab-427d-9396-64e42b772c8c`
4. 双击鼠鼠那行的 `role` 列，确认是 `shushu`
5. 双击鼠鼠那行的 `display_name` 列，填入 `鼠鼠`
6. 双击鼠鼠那行的 `avatar_emoji` 列，填入 `🐹`
7. 对笔笔那行重复操作:
   - `pair_id`: `ccf73cbd-c7ab-427d-9396-64e42b772c8c`
   - `role`: `bibi`
   - `display_name`: `笔笔`
   - `avatar_emoji`: `🐱`
8. 点击 **Save**

---

## Step 4: 验证 RLS 策略

1. 左侧菜单 → **Authentication** → **Policies**
2. 确认每张表旁边都显示 `RLS Enabled`
3. 展开各表，确认有对应的 policy（如 `messages_select_pair`, `messages_insert_pair` 等）
4. 如果某张表显示 `RLS Disabled`，点击该表 → 开启 RLS 开关

---

## Step 5: 配置 Realtime

1. 左侧菜单 → **Database** → **Replication**
2. 找到 `supabase_realtime` publication
3. 确认以下表已勾选（SQL 脚本已自动添加，这里做验证）:
   - ✅ messages
   - ✅ bottles
   - ✅ paperplanes
   - ✅ timecapsules
   - ✅ anniversaries
   - ✅ favorites
   - ✅ scores
   - ✅ achievements
   - ✅ user_config
   - ✅ online_sessions
4. 如果有未勾选的表，手动勾选

---

## Step 6: 配置 Auth 设置

### 6.1 禁用邮箱注册（只有两人使用，不需要公开注册）

1. 左侧菜单 → **Authentication** → **Providers**
2. 点击 **Email**
3. 关闭 **Allow new users to sign up** (关闭公开注册)
4. 点击 **Save**

### 6.2 设置 Session 有效期

1. 左侧菜单 → **Authentication** → **URLs**
2. **Site URL**: `https://shushu-bibi.cn`
3. **Redirect URLs**: 添加 `https://shushu-bibi.cn`
4. 左侧菜单 → **Authentication** → **Sessions**
5. **Session lifetime**: `604800` (7天 = 604800秒)
6. **Refresh token lifetime**: `604800` (7天)

---

## Step 7: 首次设备注册（部署后执行）

> ⚠️ 这一步需要在前端代码部署完成后进行

1. 打开 https://shushu-bibi.cn
2. 点击鼠鼠头像 → 输入密码登录
3. 系统会自动采集设备指纹并调用 `register_device` 函数
4. 在 Dashboard → **Table Editor** → **user_devices** 中确认鼠鼠的设备已注册
5. 退出登录 → 点击笔笔头像 → 输入密码登录
6. 确认笔笔的设备也已注册
7. 之后每次登录都会自动更新 `last_seen` 时间

---

## 完成确认清单

- [ ] SQL 建表脚本执行成功（13 张表）
- [ ] 创建了两个 Auth 用户（shushu + bibi）
- [ ] pairs 表已填入两个 user_id
- [ ] profiles 表已更新 pair_id + role + display_name
- [ ] RLS 策略全部启用
- [ ] Realtime 发布已配置（10 张表）
- [ ] Auth 设置（关闭公开注册 + Session 7天）
- [ ] 前端部署后首次设备注册成功

---

## 常见问题

### Q: SQL 执行报错怎么办？
A: 截图发给我，常见原因是表已存在。可以在脚本开头加 `DROP TABLE IF EXISTS ... CASCADE;`（但这会删除已有数据）

### Q: 忘记复制 User ID 了怎么办？
A: Dashboard → Authentication → Users，列表中可以看到每个用户的 UID

### Q: RLS 导致查询不到数据怎么办？
A: 确认 profiles 表中 pair_id 已正确填写。RLS 策略依赖 `profiles.pair_id` 来判断数据归属

### Q: Realtime 没有推送怎么办？
A: 确认 Database → Replication 中对应表已加入 publication。前端代码中使用 `supabase.channel()` 订阅
