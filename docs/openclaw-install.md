# OpenClaw 安装引导：wx-newspic Skill

> 本文档供 OpenClaw AI 读取，引导完成 wx-newspic skill 的本地安装。
> 涉及服务器部署、IP 白名单等操作，由 AI 引导人类用户完成，AI 不直接执行。

**所属目录**：`docs/`
**当前版本**：v0.2
**发布日期**：2026-05-19

---

## 概览

| 项目 | 值 |
|------|-----|
| CLI 命令 | `wx-newspic` |
| 版本 | 0.1.0 |
| 语言 | Node.js >= 20 / TypeScript |
| 仓库 | `https://github.com/lpreterite/wx-newspic.git` |
| Skill 目录 | `~/.config/opencode/skills/dw/wx-newspic/` |
| 凭证路径 | `~/.openclaw/skills/wx-newspic/.env` |

---

## 角色分工

| 操作 | 执行者 | 说明 |
|------|--------|------|
| 安装 Node.js 和 Git | 人类用户 | 如环境未满足，引导用户安装 |
| 克隆、构建、注册 CLI | **AI 执行** | 以下 Step 1 |
| 提供微信 AppId 和 AppSecret | 人类用户提供 | AI 引导用户在微信公众平台获取 |
| 配置凭证 | **AI 执行** | 以下 Step 2 |
| 复制 Skill 文件 | **AI 执行** | 以下 Step 3 |
| 部署中转服务器（可选） | 人类用户 | AI 提供指引和命令 |
| 配置 IP 白名单（可选） | 人类用户 | AI 提供指引 |
| 验证安装 | **AI 执行** | 以下 Step 4 |

---

## Step 1：AI 安装 CLI

AI 在本地机器上执行以下命令：

```bash
git clone https://github.com/lpreterite/wx-newspic.git
cd wx-newspic
npm install
npm run build
npm link
```

验证：

```bash
wx-newspic --version
```

期望输出 `0.1.0`（或对应版本）。

> ⚠️ 如果 `npm link` 因权限失败，引导用户执行 `sudo npm link`。

### 向人类用户获取

安装完成后，AI 向用户询问以下信息：

```
1. 服务器中转地址是什么？(如 https://your-server.com:4849)
2. 中转服务器的 API Key 是什么？
3. 微信公众平台的 AppId 和 AppSecret 是什么？
```

---

## Step 2：AI 配置凭证

AI 根据用户提供的 AppId 和 AppSecret 执行：

```bash
wx-newspic credential set --app-id "用户提供的AppId" --app-secret "用户提供的AppSecret"
```

验证凭证是否有效（可选，依赖中转服务连通性）：

```bash
wx-newspic credential check
```

如果 `credential check` 失败但已确认凭证正确，说明中转服务尚未启动，引导用户参考 Step 5。

---

## Step 3：AI 安装 Skill 文件

AI 将项目中的 skill 定义文件安装到 OpenClaw 的技能目录：

```bash
mkdir -p ~/.config/opencode/skills/dw/wx-newspic
cp /path/to/wx-newspic/skill/SKILL.md \
   ~/.config/opencode/skills/dw/wx-newspic/SKILL.md
```

验证：

```bash
ls -la ~/.config/opencode/skills/dw/wx-newspic/SKILL.md
```

---

## Step 4：AI 验证安装

```bash
wx-newspic --version          # 应输出版本号
wx-newspic credential show    # 应显示 APP_ID
wx-newspic --help             # 应包含 publish/serve/credential
```

---

## Step 5：人类用户部署中转服务

本步骤由 AI **提供命令指引**，人类用户在服务器上执行。

### 5.1 引导用户准备服务器

AI 告知用户需要准备一台有固定公网 IP 的 Linux 服务器（VPS）。

### 5.2 引导用户安装 Node.js

告知用户在服务器上执行：

```bash
curl -fsSL https://deb.nodesource.com/setup_22.x | sudo bash - && sudo apt-get install -y nodejs
node --version  # 确认 >= 20
```

### 5.3 引导用户启动中转服务

告知用户依次执行：

```bash
git clone https://github.com/lpreterite/wx-newspic.git
cd wx-newspic
npm install
npm run build
npm link
```

配置凭证：

```bash
wx-newspic credential set --app-id "用户提供的AppId" --app-secret "用户提供的AppSecret"
```

启动服务：

```bash
wx-newspic serve --api-key "用户提供的API Key" --port 4849
```

### 5.4 引导用户验证服务正常运行

告知用户在服务器上验证：

```bash
# 本地健康检查（服务器上执行）
curl -s http://localhost:4849/api/health
```

期望输出：`{"status":"ok"}`

再从本地开发机验证远端可达性（将 `your-server-ip` 替换为实际 IP）：

```bash
# 远程健康检查（本地开发机执行）
curl -s http://your-server-ip:4849/api/health
```

期望输出：`{"status":"ok"}`

如果连接失败，引导用户检查：
1. 服务器防火墙是否开放了端口
2. 云服务商安全组是否允许入站流量
3. systemd 服务是否正常启动

### 5.5 引导用户配置开机自启

告知用户创建 systemd 服务文件，内容按需调整路径和密钥。

### 5.6 引导用户配置 IP 白名单

告知用户：

```bash
curl -s ifconfig.me
```

将输出的 IP 添加到微信公众平台 → 设置与开发 → 基本配置 → IP 白名单。

---

## 完成清单

**AI 负责的部分：**
- [ ] CLI 已安装（`wx-newspic --version` 返回版本号）
- [ ] 凭证已配置（`credential show` 显示 APP_ID）
- [ ] Skill 文件已安装（`docs/openclaw-install.md` 文件存在）

**人类用户负责的部分：**
- [ ] 中转服务器已启动
- [ ] 服务器 IP 已加入微信白名单
- [ ] 已告知 AI 服务器地址、API Key、微信凭证

---

## Skill 输入输出

安装完成后，AI 可调用 wx-newspic skill。输入字段见 `skill/SKILL.md`：

| 字段 | 必填 | 说明 |
|------|------|------|
| `title` | 是 | 标题，最长 32 字 |
| `content` | 是 | 正文（纯文本） |
| `images` | 是 | 图片路径列表，最多 20 张 |
| `author` | 否 | 作者 |
| `digest` | 否 | 摘要 |

调用方式：通过 `wx-newspic publish` 命令，配合 `--server` 和 `--api-key` 参数（使用用户提供的信息）。

---

## 修订记录

| 版本 | 日期 | 修订内容 |
|------|------|----------|
| v0.2 | 2026-05-19 | 重构为 AI 引导文档：区分 AI 执行与人类操作，AI 只做本地安装，服务器操作引导用户执行 |
| v0.1 | 2026-05-19 | 初始版本 |
