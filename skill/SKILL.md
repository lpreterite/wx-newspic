---
name: wechat-newspic
description: "发布图片消息（小绿书）到微信公众号草稿箱。基于 wx-newspic CLI，支持多图上传、纯文本正文、凭证复用 wechat-publisher。"
metadata:
  {
    "openclaw":
      {
        "emoji": "🖼️",
      },
  }
---

# wechat-newspic

**发布图片消息（小绿书）到微信公众号草稿箱**

基于 [wx-newspic](https://github.com/lpreterite/wechat-newspic) CLI 封装的 OpenClaw skill。

## 功能

- ✅ 以「图片消息」（小绿书）格式发布到公众号草稿箱
- ✅ 支持最多 20 张图片（3:4 竖屏比例，与 html-ppt 截图完美匹配）
- ✅ 纯文本正文（图片消息不支持 HTML 富文本）
- ✅ 自动复用 `wechat-publisher` 的微信凭证（零额外配置）
- ✅ 通过中转服务器（固定 IP）解决 IP 白名单问题
- ✅ 图片自动上传为永久素材

## 输入字段

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `title` | string | 是 | 标题，最长 32 字 |
| `content` | string | 是 | 正文内容，纯文本，< 2 万字符 |
| `images` | string[] | 是 | 图片路径列表（支持 glob 通配），最多 20 张，PNG/JPEG/JPG/GIF |
| `author` | string | 否 | 作者，最长 16 字 |
| `digest` | string | 否 | 摘要，最长 128 字 |

## 输出

| 字段 | 类型 | 说明 |
|------|------|------|
| `media_id` | string | 草稿 ID，可用于后续发布 |
| `created_at` | string | 草稿创建时间（ISO 8601） |
| `success` | boolean | 是否成功 |
| `error` | object | 错误信息（如有），包含 `code` 和 `message` |

### 成功响应示例

```json
{
  "media_id": "MkFrOVhDZ3hCQUFBQVFDQUFBQlFBQUFBTUFRQUFJQUFBQUFCd0FB",
  "created_at": "2026-05-18T10:30:00+08:00",
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
# 克隆并构建
git clone https://github.com/lpreterite/wechat-newspic.git
cd wechat-newspic
npm install
npm run build
npm link

# 验证安装
wx-newspic --help
```

### 2. 启动中转服务（固定 IP 服务器）

```bash
# 在中转服务器上运行
wx-newspic serve --api-key "sk-xxxx" --port 3000
```

中转服务负责：
- 微信 API 请求转发（解决 IP 白名单问题）
- access_token 自动缓存和续期
- 图片上传中转
- 统一错误处理

### 3. 配置微信凭证

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

### 从 html-ppt 项目发布

```bash
cd /path/to/html-ppt/project

# 发布 slide 截图（自动匹配 output/slide-*.png）
wx-newspic publish \
  --title "HyperFrames: 用HTML写AI Agent" \
  --content "本文介绍如何用 HTML 构建 AI Agent 的视频生成框架..." \
  --images "./output/slide-*.png" \
  --author "叶帕奇"
```

### 直接使用 CLI

```bash
wx-newspic publish \
  --title "标题" \
  --content "正文描述" \
  --images ./slides/slide-1.png ./slides/slide-2.png \
  --server "https://your-server.com" \
  --api-key "sk-xxx"
```

### 在 OpenClaw 中使用

```
"请将 output/ 目录下的 slide 截图以小绿书形式发布到公众号，标题为 'ABC'，正文为 'DEF'"
```

## 工作流程

```
编写短文 (Markdown) → html-ppt 渲染为 slide 截图
              ↓
  wechat-newspic Skill/CLI
              ↓
  中转服务器 (固定 IP)
              ↓
  微信 API → 公众号草稿箱
              ↓
  返回 { media_id, created_at, success }
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
- [wx-newspic 项目文档](../docs/综合文档.md)
- [技术设计文档](../docs/engineering/tech-design-001.md)
- [PRD-001: 小绿书图片消息发布工具](../docs/product/PRD-001-wechat-newspic.md)

## 修订记录

| 版本 | 日期 | 修订内容 |
|------|------|----------|
| v0.1 | 2026-05-18 | 初始版本，基于综合文档和 PRD-001 输出 |
