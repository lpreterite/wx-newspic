---
name: wx-newspic
description: "发布图片消息（小绿书）或图文消息（长文）到微信公众号草稿箱。基于 wx-newspic CLI，支持多图上传、纯文本正文、Markdown 渲染、多款样式主题。适用于幻灯片截图配文发布、Markdown 长文发布为公众号图文草稿的场景。"
license: MIT
compatibility: |
  需要 Node.js >= 20，wx-newspic CLI（npm install -g @packy-tang/wx-newspic）。
  可选：中转服务器（固定 IP，用于微信 API IP 白名单代理）。
metadata:
  author: lpreterite
  version: "0.2.0"
  openclaw:
    emoji: "📱"
---

# wx-newspic

**发布图片消息（小绿书）或图文消息（长文）到微信公众号草稿箱**

基于 [wx-newspic](https://github.com/lpreterite/wx-newspic) CLI 封装的 Agent Skill。

## 功能

### 📱 图片消息（小绿书）模式 (`newspic`，默认)
- ✅ 以「图片消息」格式发布到公众号草稿箱
- ✅ 支持最多 20 张图片（3:4 竖屏比例，与 html-ppt 截图完美匹配）
- ✅ 纯文本正文

### 📄 图文消息（长文）模式 (`news`)
- ✅ 以「图文消息」格式发布到公众号草稿箱
- ✅ 支持 Markdown 渲染为富文本 HTML（通过 `--content` 或 `--md` 文件）
- ✅ 自动提取 Markdown 中的图片并上传为永久素材
- ✅ 覆盖图自动提取（Markdown 首张图片）
- ✅ 多款样式主题可选

### 通用
- ✅ 自动复用 `wechat-publisher` 的微信凭证（零额外配置）
- ✅ 通过中转服务器（固定 IP）解决 IP 白名单问题
- ✅ 图片自动上传为永久素材

## 输入字段

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `title` | string | 是 | 标题，最长 32 字（news 模式最长 64 字） |
| `content` | string | 是 | 正文内容。newspic 模式：纯文本；news 模式：Markdown 格式 |
| `images` | string[] | news 模式否 / newspic 模式是 | 图片路径列表（支持 glob 通配），最多 20 张，PNG/JPEG/JPG/GIF。news 模式下自动从 Markdown 提取 |
| `type` | string | 否 | 发布类型：`newspic`（默认，图片消息）或 `news`（图文消息） |
| `md` | string | 否 | Markdown 文件路径（仅 news 模式）。指定后将读取文件内容作为正文，与 `content` 互斥 |
| `theme` | string | 否 | 样式主题（仅 news 模式）。可选值见 `wx-newspic publish --help` |
| `author` | string | 否 | 作者，最长 16 字 |
| `digest` | string | 否 | 摘要，最长 128 字 |

## 输出

| 字段 | 类型 | 说明 |
|------|------|------|
| `media_id` | string | 草稿 ID，可用于后续发布 |
| `created_at` | string | 草稿创建时间（ISO 8601） |
| `type` | string | 发布类型：`newspic` 或 `news` |
| `success` | boolean | 是否成功 |
| `error` | object | 错误信息（如有），包含 `code` 和 `message` |

### 成功响应示例 (newspic)

```json
{
  "media_id": "MkFrOVhDZ3hCQUFBQVFDQUFBQlFBQUFBTUFRQUFJQUFBQUFCd0FB",
  "created_at": "2026-05-18T10:30:00+08:00",
  "type": "newspic",
  "success": true
}
```

### 成功响应示例 (news)

```json
{
  "media_id": "MkFrOVhDZ3hCQUFBQVFDQUFBQlFBQUFBTUFRQUFJQUFBQUFCd0FB",
  "created_at": "2026-06-11T14:00:00+08:00",
  "type": "news",
  "success": true
}
```

### 错误响应示例

```json
{
  "success": false,
  "error": {
    "code": "TOO_MANY_IMAGES",
    "message": "图片数量不能超过 20 张"
  }
}
```

## 前置依赖

### 1. 安装 wx-newspic CLI

```bash
# 方式一：npm 全局安装（推荐）
npm install -g @packy-tang/wx-newspic

# 方式二：源码构建
git clone https://github.com/lpreterite/wx-newspic.git
cd wx-newspic
npm install
npm run build
npm link

# 验证安装
wx-newspic --help
```

### 2. 安装此 Skill

```bash
SKILL_BASE_URL=https://github.com/lpreterite/wx-newspic/tree/main npx skill skills/wx-newspic
```

### 3. 启动中转服务（固定 IP 服务器）

```bash
# 在中转服务器上运行
wx-newspic serve --api-key "sk-xxxx" --port 3000
```

中转服务负责：
- 微信 API 请求转发（解决 IP 白名单问题）
- access_token 自动缓存和续期
- 图片上传中转
- 统一错误处理

### 4. 配置微信凭证

凭证自动从 `~/.openclaw/skills/wechat-publisher/.env` 读取。
如需要手动指定：

```bash
# 通过环境变量
export WECHAT_APP_ID=your_app_id
export WECHAT_APP_SECRET=your_app_secret

# 或通过 CLI 参数
wx-newspic publish --app-id "wx_xxx" --app-secret "secret_xxx"
```

## 快速开始

### 从 html-ppt 项目发布（图片消息）

```bash
cd /path/to/html-ppt/project

# 发布 slide 截图（自动匹配 output/slide-*.png）
wx-newspic publish \
  --title "HyperFrames: 用HTML写AI Agent" \
  --content "本文介绍如何用 HTML 构建 AI Agent 的视频生成框架..." \
  --images "./output/slide-*.png" \
  --author "叶帕奇"
```

### 从 Markdown 发布（图文消息）

```bash
# 直接指定 Markdown 内容
wx-newspic publish \
  --type news \
  --title "用 AI 辅助写作" \
  --content "# 用 AI 辅助写作\n\n这是一篇关于 **AI 辅助写作** 的文章..." \
  --theme "github"

# 或指定 Markdown 文件
wx-newspic publish \
  --type news \
  --title "用 AI 辅助写作" \
  --md ./articles/ai-writing.md \
  --theme "newsprint"
```

### 直接使用 CLI（图片消息）

```bash
wx-newspic publish \
  --title "标题" \
  --content "正文描述" \
  --images ./slides/slide-1.png ./slides/slide-2.png \
  --server "https://your-server.com" \
  --api-key "sk-xxx"
```

### 在 Agent 中使用

**图片消息（默认）：**
```
"请将 output/ 目录下的 slide 截图以小绿书形式发布到公众号，标题为 'ABC'，正文为 'DEF'"
```

**图文消息：**
```
"请将以下 Markdown 内容以长文形式发布到公众号，标题为 'AI 写作指南'，主题用 github：
# AI 写作指南

## 为什么选择 AI 写作

AI 写作工具..."
```

## 工作流程

```
┌─ 图片消息（小绿书）─────────────┐
│ 编写短文 (Markdown)              │
│       ↓                          │
│ html-ppt 渲染为 slide 截图       │
│       ↓                          │
│  wx-newspic --images             │
└──────────────────────────────────┘

┌─ 图文消息（长文）─────────────────┐
│ 编写/准备 Markdown 文件           │
│  (含 ![] 图片引用)                 │
│       ↓                           │
│  wx-newspic --type news           │
│       ↓                           │
│  渲染 Markdown → HTML             │
│  提取图片 → 上传 → 替换 src       │
│  首张图片作为 cover               │
└───────────────────────────────────┘
               ↓
   中转服务器 (固定 IP)
               ↓
   微信 API → 公众号草稿箱
               ↓
   返回 { media_id, created_at, type, success }
               ↓
   用户在后台手动确认发布
```

## 故障排查

### 1. 无法连接到中转服务

**错误信息：** `SERVER_UNREACHABLE`

**解决方法：**
1. 确认中转服务正在运行：`ps aux | grep wx-newspic`
2. 确认服务器地址正确：`--server https://your-server.com`
3. 确认 API Key 正确：`--api-key "sk-xxx"`
4. 确认服务器防火墙已开放端口

### 2. 微信凭证未找到

**错误信息：** `CREDENTIAL_NOT_FOUND`

**解决方法：**
1. 检查 `~/.openclaw/skills/wechat-publisher/.env` 是否存在
2. 如果不存在，手动创建并填入凭证
3. 或通过 `--app-id` / `--app-secret` 参数临时指定

### 3. 图片上传失败

**错误信息：** `UPLOAD_FAILED`

**解决方法：**
1. 确认图片格式为 PNG/JPEG/JPG/GIF
2. 确认单张图片 ≤ 10MB
3. 确认图片路径正确、文件可读

### 4. IP 白名单问题

**解决方法：**
1. 获取服务器出口 IP：`curl ifconfig.me`
2. 登录微信公众号后台 → 开发 → 基本配置 → IP 白名单
3. 添加服务器 IP 到白名单

## 与现有 Skill 的关系

| Skill | 关系 |
|-------|------|
| `wechat-publisher` | 复用其微信凭证配置，但发布格式不同（news vs newspic） |
| `html-ppt` | 消费其 slide 截图产出作为图片输入 |
| `wechat-short-ppt` | 复用其短文内容结构 |

## 参考资料

- [微信公众号草稿箱 API 文档](https://developers.weixin.qq.com/doc/subscription/api/draftbox/draftmanage/api_draft_add.html)
- [wx-newspic 项目文档](../../docs/综合文档.md)
- [技术设计文档](../../docs/engineering/tech-design-001.md)
- [PRD-001: 小绿书图片消息发布工具](../../docs/product/PRD-001-wx-newspic.md)
- [技术设计文档 002: 长文多主题发布支持](../../docs/engineering/tech-design-002.md)

## 修订记录

| 版本 | 日期 | 修订内容 |
|------|------|----------|
| v0.1 | 2026-05-18 | 初始版本，基于综合文档和 PRD-001 输出 |
| v0.1.1 | 2026-06-10 | 迁移到 Agent Skills 标准目录结构，补充 frontmatter 字段 |
| v0.2.0 | 2026-06-11 | 新增图文消息（news）模式，支持 Markdown 渲染、多主题、自动图片提取 |
