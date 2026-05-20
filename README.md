# wx-newspic

[![npm version](https://img.shields.io/npm/v/@packy-tang/wx-newspic.svg)](https://www.npmjs.com/package/@packy-tang/wx-newspic)
[![License](https://img.shields.io/npm/l/@packy-tang/wx-newspic.svg)](https://github.com/lpreterite/wx-newspic/blob/main/LICENSE)
[![Node](https://img.shields.io/node/v/@packy-tang/wx-newspic.svg)](https://nodejs.org/)

微信公众号「图片消息」（小绿书）自动化发布工具。支持多图上传、纯文本正文、中转服务器代理 IP 白名单。

## 环境要求

- **Node.js** >= 20（查看：`node --version`）
- **npm** 或 **pnpm**（推荐 pnpm）

## 安装

### 方式一：npm 全局安装（推荐）

```bash
npm install -g @packy-tang/wx-newspic
```

### 方式二：源码构建

```bash
# 克隆仓库
git clone https://github.com/lpreterite/wx-newspic.git
cd wx-newspic

# 安装依赖
npm install

# 编译 TypeScript
npm run build

# 注册到全局（可直接使用 wx-newspic 命令）
npm link
```

验证安装：

```bash
wx-newspic --version
wx-newspic --help
```

## 配置

### 微信凭证

优先级：CLI 参数 > 环境变量 > `.env` 文件。

**方式一：CLI 参数（每次执行时指定）**

```bash
wx-newspic publish --app-id "wx_xxx" --app-secret "secret_xxx" ...
```

**方式二：环境变量**

```bash
export WECHAT_APP_ID=your_app_id
export WECHAT_APP_SECRET=your_app_secret
```

**方式三：使用 credential 命令持久化**

```bash
wx-newspic credential set --app-id "wx_xxx" --app-secret "secret_xxx"
```

凭证会自动写入 `~/.openclaw/skills/wechat-publisher/.env`，后续无需重复配置。

验证凭证是否有效：

```bash
wx-newspic credential check
```

### 中转服务器设置

如需解决微信 API IP 白名单限制，需要一台固定 IP 的 VPS 运行中转服务：

```bash
# 在中转服务器上启动服务
wx-newspic serve --api-key "sk-your-key" --port 3000
```

参数说明：

| 参数 | 必填 | 默认值 | 说明 |
|------|------|--------|------|
| `--api-key, -k` | 是 | — | API Key 认证密钥 |
| `--port, -p` | 否 | 3000 | 监听端口 |
| `--host` | 否 | 0.0.0.0 | 监听地址 |
| `--log-level` | 否 | info | 日志级别（debug/info/warn/error） |

服务器启动后，将服务器 IP 添加到微信公众号后台 → 开发 → 基本配置 → IP 白名单。

### 服务持久化

中转服务需长期运行，推荐以下方式保持后台运行：

**方式一：systemd（推荐）**

创建 systemd 服务文件 `/etc/systemd/system/wx-newspic.service`：

```ini
[Unit]
Description=wx-newspic Relay Server
After=network.target

[Service]
Type=simple
ExecStart=/usr/bin/env wx-newspic serve --api-key "sk-your-key" --port 3000
Restart=always
RestartSec=5
User=your-user
Environment=WECHAT_APP_ID=your_app_id
Environment=WECHAT_APP_SECRET=your_app_secret

[Install]
WantedBy=multi-user.target
```

启用并启动：

```bash
sudo systemctl daemon-reload
sudo systemctl enable wx-newspic
sudo systemctl start wx-newspic
sudo systemctl status wx-newspic
```

**方式二：pm2（Node.js 进程管理器）**

```bash
npm install -g pm2
pm2 start wx-newspic -- serve --api-key "sk-your-key" --port 3000
pm2 save
pm2 startup
```

**方式三：screen/tmux**

```bash
screen -S wx-newspic
wx-newspic serve --api-key "sk-your-key" --port 3000
# Ctrl+A D 脱离会话，服务持续运行
# screen -r wx-newspic 重新连接
```

## 使用

### 命令概览

| 命令 | 说明 |
|------|------|
| `wx-newspic publish` | 发布图片消息到公众号草稿箱 |
| `wx-newspic serve` | 启动中转 HTTP 服务 |
| `wx-newspic credential` | 管理微信凭证 |

### wx-newspic publish

发布图片消息。

```bash
wx-newspic publish \
  --title "标题" \
  --content "正文内容" \
  --images "./slides/slide-*.png"
```

参数说明：

| 参数 | 必填 | 说明 |
|------|------|------|
| `--title, -t` | 是 | 标题，最长 32 字 |
| `--content, -c` | 是 | 正文内容（纯文本） |
| `--images, -i` | 是 | 图片路径列表，支持 glob 通配，最多 20 张，PNG/JPEG/JPG/GIF |
| `--author, -a` | 否 | 作者，最长 16 字 |
| `--digest, -d` | 否 | 摘要，最长 128 字 |
| `--server, -s` | 否 | 中转服务器地址 |
| `--api-key` | 否 | 中转服务器 API Key |
| `--app-id` | 否 | 微信 APP_ID |
| `--app-secret` | 否 | 微信 APP_SECRET |

服务器地址和 API Key 也可通过环境变量指定：

```bash
export WECHAT_SERVER_URL=https://your-server.com
export WECHAT_API_KEY=sk-your-key
```

> 旧名称 `WX_NEWSPIC_SERVER` / `WX_NEWSPIC_API_KEY` 仍兼容。

成功输出示例：

```json
{
  "media_id": "MkFrOVhDZ3hCQUFBQVFDQUFBQlFBQUFBTUFRQUFJQUFBQUFCd0FB",
  "created_at": "2026-05-19T10:30:00+08:00",
  "success": true
}
```

### wx-newspic serve

启动中转 HTTP 服务（固定 IP 代理微信 API）。

```bash
wx-newspic serve --api-key "sk-your-key" --port 3000
```

中转服务负责：
- 微信 API 请求转发（解决 IP 白名单问题）
- access_token 自动缓存和续期
- 图片上传中转
- 统一错误处理

### wx-newspic credential

管理微信凭证。

```bash
# 查看当前凭证（SECRET 脱敏显示）
wx-newspic credential show

# 设置凭证
wx-newspic credential set --app-id "wx_xxx" --app-secret "secret_xxx"

# 从 .env 文件导入
wx-newspic credential set --file ./path/to/.env

# 检查凭证是否有效
wx-newspic credential check
```

## 使用示例

### 本地直接发布

```bash
wx-newspic publish \
  --title "今日推荐" \
  --content "这是一个示例正文内容..." \
  --images ./photos/*.png \
  --author "小编"
```

### 通过中转服务发布

```bash
wx-newspic publish \
  --title "通过中转服务发布" \
  --content "本文通过中转服务器发布到公众号" \
  --images ./output/slide-*.png \
  --server "https://your-server.com" \
  --api-key "sk-xxx"
```

### 从 html-ppt 项目集成

配合 [html-ppt](https://github.com/your-repo/html-ppt) 使用：

```bash
# 先生成 slide 截图
# ... html-ppt build ...

# 发布 slide 截图
wx-newspic publish \
  --title "HyperFrames: 用HTML写AI Agent" \
  --content "本文介绍如何用 HTML 构建 AI Agent 的视频生成框架..." \
  --images "./output/slide-*.png" \
  --author "叶帕奇"
```

## 完整链路

```
html-ppt 截图 → wx-newspic publish → 中转服务器（固定IP） → 微信公众号 API → 小绿书草稿
```

## 项目组成

| 组件 | 目录 | 说明 |
|------|------|------|
| 文档 | `docs/` | 需求、API 方案、架构设计、Skill 设计 |
| Skill | `skill/` | OpenClaw Skill，封装发布链路 |
| CLI | `cli/` | 命令行工具（命令发布 + 中转服务） |
| 参考 | `reference/` | 现有 wechat-publisher Skill 与 wenyan-cli 命令结构参考 |

## 故障排查

### 无法连接到中转服务

**错误：** `SERVER_UNREACHABLE`

**解决：**
1. 确认服务正在运行：`ps aux | grep wx-newspic`
2. 确认服务器地址正确：`--server https://your-server.com`
3. 确认 API Key 正确：`--api-key "sk-xxx"`
4. 确认服务器防火墙已开放端口

### 微信凭证未找到

**错误：** `CREDENTIAL_NOT_FOUND`

**解决：**
1. 运行 `wx-newspic credential show` 查看当前状态
2. 使用 `wx-newspic credential set` 配置凭证
3. 或通过 `--app-id` / `--app-secret` 参数临时指定

### 图片上传失败

**错误：** `UPLOAD_FAILED`

**解决：**
1. 确认图片格式为 PNG/JPEG/JPG/GIF
2. 确认单张图片 ≤ 10MB
3. 确认图片路径正确、文件可读

### IP 白名单问题

**解决：**
1. 获取服务器出口 IP：`curl ifconfig.me`
2. 登录微信公众号后台 → 开发 → 基本配置 → IP 白名单
3. 添加服务器 IP 到白名单
