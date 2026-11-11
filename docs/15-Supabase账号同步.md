# Supabase 账号密码同步

PWA（GitHub Pages）与 APK 共用同一 Supabase 项目：**纯账号 + 密码**登录（不要邮箱），进度 JSON 存云端，换机/双端互通。

> 说明：Supabase Auth 底层字段仍叫 email。应用会把账号 `zhangsan` 映射为内部地址 `zhangsan@fangji.local`，用户界面只看见「账号」，不会要求真实邮箱。

## 1. 控制台一次性配置

1. 打开 [Supabase](https://supabase.com) 新建免费项目。
2. **Authentication → Providers → Email**：开启 Email；**关闭 Confirm email**（否则假邮箱无法点确认）。
3. **SQL Editor** 执行：

```sql
create table public.user_progress (
  user_id uuid primary key references auth.users (id) on delete cascade,
  data jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

alter table public.user_progress enable row level security;

create policy "users_own_progress"
  on public.user_progress
  for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);
```

4. **Project Settings → API** 复制 `Project URL` 与 `anon public` key。
5. Site URL 可设为：`https://sun0430-yuhao.github.io/fangji-app/`。

## 2. 本地环境变量

```bash
cp .env.example .env
# 填写 VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY
```

未配置时应用仍可纯本地使用，「我的」里会提示未开启云同步。

## 3. GitHub Pages 部署密钥

仓库 **Settings → Secrets and variables → Actions** 增加：

- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`

`deploy-pages.yml` 会在 `build:pwa` 时注入。APK 用本机 `.env` 再 `npm run build:cap`。

## 4. 同学怎么用

1. 打开 PWA 或 APK → **我的** → 填**账号**（3–32 位字母/数字/下划线）和**密码** → **注册** / **登录**
2. 学习过程中会自动上传（防抖约 1 秒）
3. 换设备登录同一账号 → 自动同步或点 **立即同步**
4. 两端都有不同进度时会询问「使用云端 / 使用本机」

## 5. 自测清单

- [ ] 用账号（非邮箱）注册登录成功
- [ ] 学几条后另一浏览器/无痕同账号能拉到
- [ ] APK 同账号与 PWA 一致
- [ ] 未配置 `.env` 时仍可离线学
- [ ] 导出 / 导入备份仍可用
