# OpenClaw 安装手册：wechat-newspic Skill

> 本文档供 OpenClaw 直接读取，按步骤自动完成 wechat-newspic skill 的安装。

**所属目录**：`docs/`
**当前版本**：v0.1
**发布日期**：2026-05-19

---

## 概览

| 项目 | 值 |
|------|-----|
| CLI 命令 | `wx-newspic` |
| 版本 | 0.1.0 |
| 语言 | Node.js >= 20 / TypeScript |
| 仓库 | `https://github.com/lpreterite/wechat-newspic.git` |
| Skill 目录 | `~/.config/opencode/skills/dw/wechat-newspic/` |
| 凭证路径 | `~/.openclaw/skills/wechat-newspic/.env` |
| 兼容凭证 | `~/.openclaw/skills/wechat-publisher/.env`（旧路径，自动兼容） |

---

## 步骤 1：安装 CLI

### 1.1 克隆仓库

```bash
git clone https://github.com/lpreterite/wechat-newspic.git
cd wechat-newspic
```

### 1.2 安装依赖并构建

```bash
npm install
npm run build
```

编译输出在 `dist/` 目录。

### 1.3 注册全局命令

```bash
npm link
```

将 `bin/wx-newspic` 注册为全局可用的 `wx-newspic` 命令。

---

## 步骤 2：配置凭证

微信凭证用于调用微信公众号 API。支持三种方式，优先级由高到低：

### 方式 A：credential set（推荐，持久化）

```bash
wx-newspic credential set --app-id "wx_你的APP_ID" --app-secret "你的APP_SECRET"
```

凭证写入 `~/.openclaw/skills/wechat-newspic/.env`。

### 方式 B：环境变量

```bash
export WECHAT_APP_ID=wx_你的APP_ID
export WECHAT_APP_SECRET=你的APP_SECRET
```

### 方式 C：从文件导入

```bash
wx-newspic credential set --file /path/to/.env
```

### 凭证兼容说明

如果已在旧路径 `~/.openclaw/skills/wechat-publisher/.env` 配置过凭证（来自 `wechat-publisher`），wechat-newspic 会自动兼容读取，无需重复配置。

`.env` 文件支持以下键名（自动兼容新旧两套前缀）：
- `APP_ID` 或 `WECHAT_APP_ID`
- `APP_SECRET` 或 `WECHAT_APP_SECRET`

---

## 步骤 3：安装 Skill 文件

将项目中的 skill 定义文件安装到 OpenClaw 的技能目录。

### 3.1 创建目标目录

```bash
mkdir -p ~/.config/opencode/skills/dw/wechat-newspic
```

### 3.2 复制 Skill 文件

```bash
cp /path/to/wechat-newspic/skill/SKILL.md \
   ~/.config/opencode/skills/dw/wechat-newspic/SKILL.md
```

> `/path/to/wechat-newspic` 替换为实际的克隆路径。

如希望与项目同步更新，也可使用符号链接：

```bash
ln -sf /path/to/wechat-newspic/skill/SKILL.md \
   ~/.config/opencode/skills/dw/wechat-newspic/SKILL.md
```

### 3.3 验证文件就位

```bash
ls -la ~/.config/opencode/skills/dw/wechat-newspic/SKILL.md
```

---

## 步骤 4：验证安装

### 4.1 验证 CLI 版本

```bash
wx-newspic --version
```

期望输出：`0.1.0`（或对应版本号）

### 4.2 验证凭证状态

```bash
wx-newspic credential show
```

期望输出显示 APP_ID（SECRET 脱敏），例如：

```
当前微信凭证：
  APP_ID:    wx_xxxxx
  APP_SECRET: wxxx****x0x
  来源: .env 文件 (.../.openclaw/skills/wechat-newspic/.env)
```

### 4.3 验证凭证有效性（可选，需联网）

```bash
wx-newspic credential check
```

期望输出：

```
正在验证凭证...
  APP_ID: wx_xxxxx
✅ 凭证有效
  access_token: xxxxxxxxxx...
  expires_in: 7200秒
```

### 4.4 验证帮助信息

```bash
wx-newspic --help
```

应输出包含 `publish`、`serve`、`credential` 三个子命令。

---

## 完成清单

- [ ] CLI 已安装（`wx-newspic --version` 返回版本号）
- [ ] 凭证已配置（`credential show` 显示 APP_ID）
- [ ] Skill 文件已安装（`~/.config/opencode/skills/dw/wechat-newspic/SKILL.md` 存在）
- [ ] 中转服务器已启动并运行（如需固定 IP 代理）
- [ ] 服务器 IP 已加入微信白名单（如需）

---

## 后续使用

安装完成后，在 OpenClaw 对话中可直接引用 wechat-newspic skill。
Skill 的输入字段见 `skill/SKILL.md`，包括 `title`、`content`、`images`、`author`、`digest`。

---

## 修订记录

| 版本 | 日期 | 修订内容 |
|------|------|----------|
| v0.1 | 2026-05-19 | 初始版本 |
