# Tech Design 001: wx-newspic 技术设计文档

**版本**：v0.1
**状态**：草稿
**创建日期**：2026-05-18
**作者**：Developer Agent
**来源**：PRD-001-wx-newspic + 综合文档 v0.1

---

## 目录

1. [项目目录结构设计](#1-项目目录结构设计)
2. [CLI 命令设计](#2-cli-命令设计)
3. [中转服务器 API 路由](#3-中转服务器-api-路由)
4. [微信 API 集成层设计](#4-微信-api-集成层设计)
5. [技术选型](#5-技术选型)
6. [与现有项目的关系](#6-与现有项目的关系)
7. [附录：错误码与处理](#7-附录错误码与处理)

---

## 1. 项目目录结构设计

采用 Monorepo 结构，CLI 与 Server 共享核心微信 API 集成层代码。

```
wx-newspic/
│
├── package.json                  # 项目根配置（monorepo workspaces）
├── tsconfig.json                 # TypeScript 全局配置
├── .env.example                  # 环境变量模板
├── .gitignore
├── README.md
│
├── bin/                          # CLI 入口
│   └── wx-newspic                   # 可执行入口（#!/usr/bin/env node）
│
├── src/                          # 核心源码
│   │
│   ├── cli/                      # CLI 命令层
│   │   ├── index.ts              # 命令路由（commander/yargs）
│   │   ├── publish.ts            # `wx-newspic publish` 实现
│   │   ├── serve.ts              # `wx-newspic serve` 实现
│   │   └── credential.ts         # `wx-newspic credential` 实现
│   │
│   ├── server/                   # 中转服务器
│   │   ├── index.ts              # Fastify 服务启动
│   │   ├── routes/               # API 路由
│   │   │   ├── token.ts          # POST /api/wechat/token
│   │   │   ├── upload.ts         # POST /api/wechat/upload-image
│   │   │   ├── draft.ts          # POST /api/wechat/create-draft
│   │   │   ├── publish.ts        # POST /api/wechat/publish
│   │   │   └── drafts.ts         # GET  /api/wechat/drafts
│   │   ├── middleware/           # 中间件
│   │   │   ├── auth.ts           # API Key 认证
│   │   │   └── error.ts          # 统一错误处理
│   │   └── schemas/              # 请求/响应 schema 定义
│   │       ├── token.schema.ts
│   │       ├── upload.schema.ts
│   │       └── draft.schema.ts
│   │
│   ├── wechat/                   # 微信 API 集成层（CLI & Server 共用）
│   │   ├── client.ts             # 微信 API HTTP 客户端
│   │   ├── token.ts              # access_token 管理（获取 + 缓存 + 自动续期）
│   │   ├── material.ts           # 永久素材上传
│   │   └── draft.ts              # 草稿创建（wx-newspic）
│   │
│   ├── config/                   # 配置管理
│   │   ├── credential.ts         # 凭证读取（自动 + CLI 参数 + .env）
│   │   └── server.ts             # 服务端配置结构
│   │
│   └── utils/                    # 通用工具
│       ├── errors.ts             # 自定义错误类型
│       ├── validation.ts         # 输入校验（图片尺寸、数量等）
│       └── logger.ts             # 结构化日志
│
├── test/                         # 测试
│   ├── unit/                     # 单元测试
│   │   ├── config/
│   │   ├── wechat/
│   │   └── cli/
│   ├── integration/              # 集成测试
│   │   ├── server/
│   │   └── cli/
│   └── fixtures/                 # 测试用图片等
│       └── test-image.png
│
├── skills/wx-newspic/             # Agent Skill 定义
│   ├── SKILL.md                  # Skill 说明文档
│   └── scripts/                  # Skill 内部脚本
│       └── publish.sh
│
├── deploy/                       # 部署配置
│   ├── Dockerfile                # 中转服务容器化
│   ├── docker-compose.yml        # 本地开发用
│   └── nginx.conf                # 反向代理（可选）
│
├── Dockerfile.test               # Docker 测试镜像（构建一次、多次复用）
├── entrypoint-test.sh            # 测试入口脚本（DRY_RUN / SERVER / CUSTOM）
├── docker-compose.yml            # 测试服务编排（test-dryrun / test-server）
│
└── docs/                         # 文档
    ├── engineering/
    │   └── tech-design-001.md    # 本文档
    ├── product/
    │   └── PRD-001-wx-newspic.md
    └── 综合文档.md
```

### 目录设计原则

| 原则 | 说明 |
|------|------|
| **共享核心** | `src/wechat/` 为 CLI 和 Server 共享，避免重复实现 |
| **分层清晰** | CLI 命令层 ↔ 微信 API 集成层 ↔ HTTP 传输层，职责分离 |
| **可测试** | 微信 API 集成层接口化设计，方便 mock 测试 |
| **单入口** | `bin/wx-newspic` 作为唯一 CLI 入口，子命令通过参数路由 |

---

## 2. CLI 命令设计

### 2.1 命令概览

遵循 wenyan-cli 的 CLI 设计风格（全局命令 + 子命令 + 短/长参数）：

```
wx-newspic <command> [options]

Commands:
  publish      发布图片消息到公众号草稿箱
  serve        启动中转 HTTP 服务（固定 IP 代理微信 API）
  credential   管理微信凭证（APP_ID / APP_SECRET）
  help         查看帮助信息

Options:
  --version    查看版本号
  --help       查看帮助
```

### 2.2 命令详情

#### `wx-newspic publish`

发布图片消息到公众号草稿箱。

```
用法:
  wx-newspic publish --title <标题> --content <正文> --images <图片路径...>

选项:
  --title, -t     <string>    标题（必填，最长 32 字）
  --content, -c   <string>    正文内容（必填，纯文本）
  --images, -i    <path...>   图片路径列表（必填，支持 glob 通配，最多 20 张）
  --author, -a    <string>    作者（可选，最长 16 字）
  --digest, -d    <string>    摘要（可选，最长 128 字）
  --server, -s    <url>       中转服务器地址（可选，默认从配置读取）
  --app-id        <string>    微信 APP_ID（可选，默认从凭证配置读取）
  --app-secret    <string>    微信 APP_SECRET（可选，默认从凭证配置读取）
  --api-key       <string>    中转服务器 API Key（可选，默认从配置读取）
  --dry-run                   验证模式：处理但不实际调用微信 API（可选，用于本地/Docker 隔离验证）

示例:
  # 基础用法：发布 3 张 slide 截图
  wx-newspic publish \
    --title "HyperFrames: 用HTML写AI Agent" \
    --content "本文介绍如何用 HTML 构建 AI Agent 的视频生成框架..." \
    --images ./slides/slide-1.png ./slides/slide-2.png ./slides/slide-3.png \
    --author "叶帕奇"

  # 使用 glob 匹配图片 + 指定中转服务器
  wx-newspic publish \
    --title "标题" \
    --content "正文" \
    --images "./output/*.png" \
    --server "https://your-server.com"

  # 直接指定凭证（覆盖自动读取）
  wx-newspic publish \
    --title "标题" \
    --content "正文" \
    --images ./slides/*.png \
    --app-id "wx_xxx" \
    --app-secret "secret_xxx"

  # 验证模式（无需微信凭证和服务器）
  wx-newspic publish \
    --title "测试" \
    --content "正文" \
    --images ./slides/*.png \
    --dry-run
```

**参数优先级**（凭证相关）：

```
命令行 --app-id / --app-secret     ← 最高优先级
环境变量 WECHAT_APP_ID / ...       ← 次优先
~/.openclaw/skills/wechat-publisher/.env  ← 默认自动读取
```

**图片路径处理规则**：

- 支持 glob 通配符（`./slides/*.png`）
- 支持多个路径参数（`--images a.png b.png c.png`）
- 支持目录路径（`--images ./slides/` 自动扫描目录下图片）
- 图片格式校验：仅接受 PNG / JPEG / JPG / GIF
- 自动过滤非图片文件

**命令执行流程**：

```
1. 解析和校验参数
   ├── 标题长度 ≤ 32
   ├── 正文非空
   ├── 图片数量 1~20
   ├── 每张图片 ≤ 10MB
   └── 格式校验

2. 读取凭证（--dry-run 时跳过）

3. 图片处理
   ├── safeBasename() → 消除 FormData filename 中的非 ASCII 字符
   ├── readFileSync → Buffer → Blob
   └── --dry-run: 仅读取并打印日志，跳过上传

4. 与中转服务器通信（--dry-run 时跳过，返回 mock DraftResult）
   ├── POST /api/wechat/upload-image  × N 张
   └── POST /api/wechat/create-draft

5. 输出结果
   ├── 成功: { media_id, status: "draft_created" }
   ├── dry-run: { media_id: "dry-run", success: true }
   └── 失败: { error, code, detail }
```

### 2.3 中文路径与文件上传

#### 问题背景

Node.js 的 FormData `append(name, blob, filename)` 要求 `filename` 仅含 ASCII 字符。当文件路径包含中文（如 `OpenClaw梦境/cover.png`）时，直接传入 `basename(path)` 可能导致 `ByteString` 校验错误（value 值 > 255），在某些 Node 22 minor 版本上触发 `DOMException`。

此外，wenyan-md 渲染的 `<img src>` 采用 percent-encoding 编码非 ASCII 字符（如 `梦境` → `%E6%A2%A6%E5%A2%83`），直接 `statSync(src)` 会因路径含 `%xx` 而失败。

#### 解决方案

**`decodeURIComponent`（仅 `executeNewsPublish`）**：

```
用户 Markdown 中的 <img src="OpenClaw%E6%A2%A6%E5%A2%83/cover.png">
   ↓
extractImageSrcs → 提取出 src = "OpenClaw%E6%A2%A6%E5%A2%83/cover.png"
   ↓
decodeURIComponent(src) → "OpenClaw梦境/cover.png"
   ↓
try statSync(decodedSrc) → 成功读取
   ↓
fallback statSync(src)     → 纯 ASCII 路径的向后兼容
```

**`safeBasename(path)`（全局）**：

```
function safeBasename(filePath: string): string {
  const ext = extname(filePath);         // 保留原始扩展名
  const hash = createHash('md5')         // MD5(绝对路径) 前 8 位 hex
    .update(filePath)
    .digest('hex')
    .slice(0, 8);
  return `img-${hash}${ext}`;           // 例: img-aabbccdd.png
}
```

`safeBasename` 在所有 3 处 `formData.append('image', blob, filename)` 调用中替换原始 `basename(path)`，确保：
- FormData filename 始终为纯 ASCII（`img-xxxx.png`）
- 单项目内路径冲突概率极低（8 hex 位 → 4B 组合）
- 保留原始扩展名（微信图片校验依赖扩展名）

---

#### `wx-newspic serve`

启动中转 HTTP 服务。

```
用法:
  wx-newspic serve [options]

选项:
  --port, -p      <number>    监听端口（可选，默认 3000）
  --api-key, -k   <string>    API Key 认证密钥（必填，建议生成强随机串）
  --app-id        <string>    微信 APP_ID（可选，默认从凭证配置读取）
  --app-secret    <string>    微信 APP_SECRET（可选，默认从凭证配置读取）
  --host          <string>    监听地址（可选，默认 0.0.0.0）
  --log-level     <string>    日志级别（可选，默认 info）

示例:
  # 基本启动
  wx-newspic serve --api-key "sk-xxxx"

  # 指定端口 + 指定凭证
  wx-newspic serve \
    --port 8080 \
    --api-key "sk-xxxx" \
    --app-id "wx_xxx" \
    --app-secret "secret_xxx"

  # 生产模式启动（后台运行建议用 systemd / pm2 / docker）
  nohup wx-newspic serve --api-key "sk-xxxx" --port 3000 > server.log 2>&1 &
```

**服务行为**：

1. 服务启动后自动获取 access_token 并开始 2h 缓存周期
2. 定时任务在 token 过期前 5 分钟自动刷新
3. 所有 `/api/wechat/*` 路由需要 `Authorization: Bearer <api-key>` 认证
4. 404 / 错误路由统一返回 JSON 格式错误

---

#### `wx-newspic credential`

管理微信凭证。

```
用法:
  wx-newspic credential [command] [options]

子命令:
  show        显示当前凭证状态（隐藏 SECRET 字段）
  set         设置凭证
  check       检查凭证是否有效（尝试获取 access_token）

选项:
  --app-id, -i    <string>    微信 APP_ID
  --app-secret, -s <string>   微信 APP_SECRET
  --file, -f      <path>      从 .env 文件导入

示例:
  # 查看当前凭证
  wx-newspic credential show

  # 手动设置凭证
  wx-newspic credential set --app-id "wx_xxx" --app-secret "secret_xxx"

  # 检查凭证有效性
  wx-newspic credential check

  # 从 .env 文件导入
  wx-newspic credential set --file ./config/.env
```

**凭证存储位置**：

```
~/.openclaw/skills/wechat-publisher/.env
```

**文件格式**（兼容 wenyan-cli 的 dotenv 格式）：

```env
WECHAT_APP_ID=wx_xxxxxxxxxxxxxxxx
WECHAT_APP_SECRET=xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
```

### 2.3 帮助信息风格

所有 `--help` 输出风格保持一致，参考 wenyan-cli：

```
wx-newspic publish --help

发布图片消息到公众号草稿箱

用法: wx-newspic publish [options]

选项:
  --title, -t     <string>    标题（必填）                              [必填]
  --content, -c   <string>    正文内容（纯文本）                         [必填]
  --images, -i    <path...>   图片路径列表（支持 glob）                  [必填]
  --author, -a    <string>    作者                                      [可选]
  --digest, -d    <string>    摘要                                      [可选]
  --server, -s    <url>       中转服务器地址                            [可选]
  --app-id        <string>    微信 APP_ID                               [可选]
  --app-secret    <string>    微信 APP_SECRET                           [可选]
  --api-key       <string>    中转服务器 API Key                        [可选]
  --help, -h      [boolean]   查看帮助                                  [boolean]

示例:
  wx-newspic publish --title "标题" --content "正文" --images ./slides/*.png

📖 文档: https://github.com/lpreterite/wx-newspic
```

---

## 3. 中转服务器 API 路由

### 3.1 基础信息

| 属性 | 值 |
|------|------|
| 基础路径 | `/api/wechat` |
| 端口 | 3000（默认，可通过 `--port` 修改） |
| 认证方式 | `Authorization: Bearer <api-key>` |
| 响应格式 | 统一 JSON |
| 字符编码 | UTF-8 |

### 3.2 路由详情

#### `POST /api/wechat/token`

获取或刷新 access_token。

**请求**：

```json
// 空 body 即可，凭证在服务端配置中读取
{}
```

**成功响应 `200`**：

```json
{
  "success": true,
  "data": {
    "access_token": "72_xxxxxxxxxxxxxxxxxxxx",
    "expires_in": 7200,
    "expires_at": "2026-05-18T12:00:00Z"
  }
}
```

**错误响应 `401`**：

```json
{
  "success": false,
  "error": {
    "code": "AUTH_FAILED",
    "message": "API Key 认证失败"
  }
}
```

**错误响应 `502`**：

```json
{
  "success": false,
  "error": {
    "code": "WECHAT_API_ERROR",
    "message": "微信 API 调用失败",
    "detail": {
      "errcode": 40013,
      "errmsg": "invalid appid"
    }
  }
}
```

---

#### `POST /api/wechat/upload-image`

上传图片为永久素材，返回 `image_media_id`。

**请求**：`multipart/form-data`

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `image` | file | 是 | 图片文件（PNG/JPEG/JPG/GIF，≤10MB） |

**成功响应 `200`**：

```json
{
  "success": true,
  "data": {
    "image_media_id": "MkFrOVhDZ3hCQUFBQVFDQUFBQlFBQUFBTUFRQUFJQUFBQUFCd0FB",
    "url": "https://mmbiz.qpic.cn/..."
  }
}
```

**错误响应 `400`**：

```json
{
  "success": false,
  "error": {
    "code": "INVALID_IMAGE",
    "message": "图片格式不支持，仅支持 PNG/JPEG/JPG/GIF"
  }
}
```

---

#### `POST /api/wechat/create-draft`

创建草稿（支持 `article_type: wx-newspic`）。

**请求**：

```json
{
  "article_type": "wx-newspic",
  "title": "HyperFrames: 用HTML写AI Agent",
  "author": "叶帕奇",
  "content": "本文介绍如何使用 HTML 构建 AI Agent...",
  "digest": "用 HTML 构建 AI Agent 的实践经验分享",
  "image_list": [
    { "image_media_id": "MkFrOVhDZ3hCQUFBQVFDQUFBQlFBQUFBTUFRQUFJQUFBQUFCd0FB" },
    { "image_media_id": "NkFyOVhDZ3hCQUFBQVFDQUFBQlFBQUFBTUFRQUFJQUFBQUFCd0FB" }
  ],
  "need_open_comment": 0,
  "only_fans_can_comment": 0
}
```

**成功响应 `200`**：

```json
{
  "success": true,
  "data": {
    "media_id": "MkFrOVhDZ3hCQUFBQVFDQUFBQlFBQUFBTUFRQUFJQUFBQUFCd0FB",
    "article_type": "wx-newspic",
    "status": "draft_created",
    "created_at": "2026-05-18T10:30:00+08:00"
  }
}
```

**错误响应 `400`**：

```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "标题不能超过 32 个字符"
  }
}
```

---

#### `GET /api/wechat/drafts`

查询草稿列表。

**Query 参数**：

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `offset` | number | 否 | 偏移量（默认 0） |
| `count` | number | 否 | 每页数量（默认 20，最大 20） |
| `no_content` | number | 否 | 是否不返回正文（默认 0） |

**成功响应 `200`**：

```json
{
  "success": true,
  "data": {
    "total_count": 5,
    "item_count": 2,
    "items": [
      {
        "media_id": "MkFrOVhDZ3hCQUFBQVFDQUFBQlFBQUFBTUFRQUFJQUFBQUFCd0FB",
        "content": {
          "articles": [
            {
              "title": "HyperFrames",
              "article_type": "wx-newspic",
              "create_time": "2026-05-18T10:00:00Z",
              "update_time": "2026-05-18T10:00:00Z"
            }
          ]
        }
      }
    ]
  }
}
```

### 3.3 统一响应格式

**成功响应**：

```json
{
  "success": true,
  "data": { ... }
}
```

**错误响应**：

```json
{
  "success": false,
  "error": {
    "code": "ERROR_CODE",
    "message": "人类可读的错误描述",
    "detail": { ... }
  }
}
```

### 3.4 HTTP 状态码使用

| 状态码 | 含义 | 场景 |
|--------|------|------|
| 200 | 成功 | 所有正常响应 |
| 400 | 请求参数错误 | 校验失败、图片格式不对 |
| 401 | 认证失败 | API Key 错误或缺失 |
| 413 | 请求体过大 | 图片总大小超标 |
| 502 | 上游错误 | 微信 API 返回错误或不可达 |
| 503 | 服务不可用 | access_token 获取失败等 |

---

## 4. 微信 API 集成层设计

### 4.1 架构概览

```
┌─────────────────────────────────────────────┐
│            src/wechat/                        │
│                                               │
│  ┌──────────┐  ┌──────────┐  ┌───────────┐  │
│  │ token.ts │  │material.ts│  │ draft.ts  │  │
│  │          │  │          │  │           │  │
│  │ 获取+缓存 │  │ 上传永久  │  │ 创建草稿   │  │
│  │ 自动续期  │  │ 素材     │  │ 发布草稿   │  │
│  └────┬─────┘  └────┬─────┘  └─────┬─────┘  │
│       │              │              │         │
│       └──────────────┴──────────────┘         │
│                        │                      │
│              ┌─────────▼─────────┐            │
│              │   client.ts       │            │
│              │   微信 API HTTP 客户端  │       │
│              │   自动重试 + 错误转换  │        │
│              └───────────────────┘            │
└─────────────────────────────────────────────┘
```

### 4.2 access_token 管理（`src/wechat/token.ts`）

#### 核心逻辑

```typescript
interface TokenStore {
  access_token: string;
  expires_at: number;       // Unix timestamp (秒)
  expires_in: number;       // 原始有效期 7200 秒
}

class TokenManager {
  private store: TokenStore | null = null;
  private refreshTimer: NodeJS.Timeout | null = null;
  private readonly appId: string;
  private readonly appSecret: string;

  // 获取 token（优先返回缓存，缓存过期或即将过期时刷新）
  async getToken(): Promise<string>;

  // 强制刷新 token
  async refreshToken(): Promise<string>;

  // 启动自动续期定时器（在 expires_at - 300s 时触发刷新）
  startAutoRefresh(): void;

  // 停止定时器
  stopAutoRefresh(): void;
}
```

#### 缓存策略

| 行为 | 条件 |
|------|------|
| 返回缓存 | 当前时间 < expires_at - 300（剩余 > 5 分钟） |
| 同步刷新 | 当前时间 >= expires_at - 300（剩余 ≤ 5 分钟） |
| 强制刷新 | 微信 API 返回 `40001`（invalid credential） |
| 定时刷新 | 服务启动后设置定时器，在过期前 5 分钟自动刷新 |

#### 并发安全

- 同时有多个请求等待 token 时，仅发起一次刷新请求，其余请求等待结果
- 使用 Promise 锁模式（类似单例 Promise）：

```typescript
private pendingRefresh: Promise<string> | null = null;

async refreshToken(): Promise<string> {
  if (this.pendingRefresh) {
    return this.pendingRefresh;  // 复用进行中的刷新
  }
  this.pendingRefresh = this._doRefresh();
  try {
    return await this.pendingRefresh;
  } finally {
    this.pendingRefresh = null;
  }
}
```

#### 微信 API 调用

```
GET https://api.weixin.qq.com/cgi-bin/token
  ?grant_type=client_credential
  &appid=APPID
  &secret=APPSECRET
```

**响应**：

```json
{
  "access_token": "72_xxxxxxxx",
  "expires_in": 7200
}
```

### 4.3 图片上传为永久素材（`src/wechat/material.ts`）

#### 核心逻辑

```typescript
interface UploadResult {
  image_media_id: string;
  url: string;              // 微信图片 URL（如 mmbiz.qpic.cn）
}

class MaterialManager {
  constructor(private client: WechatClient) {}

  // 上传单张图片为永久素材
  async uploadImage(imagePath: string): Promise<UploadResult>;

  // 批量上传（顺序上传，全部成功或全部失败）
  async uploadImages(imagePaths: string[]): Promise<UploadResult[]>;
}
```

#### 微信 API 调用

```
POST https://api.weixin.qq.com/cgi-bin/material/add_material
  ?access_token=TOKEN
  &type=image
```

- 请求体：`multipart/form-data`
- 字段 `media`：图片文件二进制内容
- 注意：每张图片需要**单独调用一次此接口**

#### 图片校验（上传前）

| 校验 | 规则 | 响应 |
|------|------|------|
| 格式 | PNG / JPEG / JPG / GIF | 否则返回 `INVALID_IMAGE_FORMAT` |
| 大小 | ≤ 10MB | 否则返回 `IMAGE_TOO_LARGE` |
| 存在性 | 文件可读 | 否则返回 `FILE_NOT_FOUND` |
| 数量 | ≤ 20 张 | 否则返回 `TOO_MANY_IMAGES` |

### 4.4 创建图片消息草稿（`src/wechat/draft.ts`）

#### 核心逻辑

```typescript
interface DraftArticle {
  article_type: 'wx-newspic';
  title: string;
  author?: string;
  content: string;
  digest?: string;
  image_list: Array<{ image_media_id: string }>;
  need_open_comment?: 0 | 1;
  only_fans_can_comment?: 0 | 1;
}

interface DraftResult {
  media_id: string;
  created_at: string;
}

class DraftManager {
  constructor(private client: WechatClient) {}

  // 创建草稿
  async createDraft(article: DraftArticle): Promise<DraftResult>;
}
```

#### 微信 API 调用

```
POST https://api.weixin.qq.com/cgi-bin/draft/add?access_token=TOKEN

Body:
{
  "articles": [{
    "article_type": "wx-newspic",
    "title": "...",
    "author": "...",
    "content": "...",
    "digest": "...",
    "image_info": {
      "image_list": [
        { "image_media_id": "..." },
        { "image_media_id": "..." }
      ]
    }
  }]
}
```

### 4.5 错误转换层（`src/wechat/client.ts`）

微信 API 返回的错误码统一转换为结构化错误：

| 微信 errcode | 含义 | 转换后错误码 | 处理策略 |
|---|---|---|---|
| `-1` | 系统繁忙 | `WECHAT_SYSTEM_BUSY` | 重试最多 3 次 |
| `0` | 成功 | — | — |
| `40001` | access_token 无效/过期 | `TOKEN_INVALID` | 强制刷新 token 后重试 |
| `40005` | 不合法的文件类型 | `INVALID_IMAGE_FORMAT` | 返回给用户 |
| `40009` | 图片尺寸/大小超出限制 | `IMAGE_TOO_LARGE` | 返回给用户 |
| `40013` | 不合法的 APPID | `INVALID_APP_ID` | 提示凭证错误 |
| `41005` | 缺少 media 数据 | `MISSING_MEDIA_DATA` | 返回给用户 |
| `45001` | 多媒体文件数量超过限制 | `TOO_MANY_IMAGES` | 返回给用户 |
| `45009` | API 调用频率限制 | `RATE_LIMITED` | 等待后重试 |

---

## 5. 技术选型

### 5.1 运行时：Node.js (Fastify) ✅ 推荐

| 维度 | Node.js (Fastify) | Go (Gin/Echo) |
|------|-------------------|----------------|
| **生态一致性** | ✅ 与 wenyan-cli 同生态，凭证读取逻辑可复用 | ❌ 需要重新实现凭证解析 |
| **CLI 实现** | ✅ `commander` / `yargs` 成熟，`pkg` 可打包单文件 | ✅ `cobra` 成熟，编译为单二进制 |
| **HTTP 性能** | Fastify ~30k req/s（足够） | Go ~100k req/s（过剩） |
| **部署复杂度** | ❌ 需要 Node.js 运行时 或 `pkg` 打包 | ✅ 单二进制 |
| **团队熟悉度** | ✅ 当前项目已是 Node.js 生态 | ❌ 需要额外引入 |
| **文件上传处理** | ✅ `@fastify/multipart` 成熟 | ✅ `multipart` 标准库支持 |
| **包体积** | ❌ node_modules ~50MB | ✅ ~10MB 单文件 |

**核心决策依据**：

1. **生态一致性**：wenyan-cli 是 Node.js 项目，凭证格式（`.env` / JSON）解析逻辑天然兼容。复用而非重写。
2. **CLI 工具圈**：Node.js 的 `commander` 提供了与 wenyan-cli 一致的命令风格实现，降低认知成本。
3. **性能需求匹配**：中转服务是轻量级代理，Fastify 的性能完全满足（微信 API 本身有频率限制，高并发无意义）。
4. **团队技能**：现有代码库（wechat-publisher skill、html-ppt 等）均为 Node.js 生态。

**不使用 Go 的理由**：Go 的优势（极致性能、单二进制）与当前场景不匹配——瓶颈在微信 API（≤ 10 req/s），而非服务端处理能力。引入 Go 会增加项目复杂度而非解决问题。

### 5.2 关键依赖

| 依赖 | 版本 | 用途 |
|------|------|------|
| `fastify` | ^5.x | HTTP 服务器框架 |
| `@fastify/multipart` | ^9.x | 文件上传处理 |
| `@fastify/cors` | ^10.x | CORS 支持 |
| `commander` | ^13.x | CLI 命令解析 |
| `dotenv` | ^16.x | .env 文件解析 |
| `globby` | ^14.x | glob 图片路径匹配 |
| `node-fetch` / `undici` | — | HTTP 请求（微信 API） |
| `pino` | — | 结构化日志（Fastify 内置） |

**开发依赖**：

| 依赖 | 用途 |
|------|------|
| `typescript` | 类型检查 |
| `vitest` | 测试框架 |
| `tsx` | 开发时运行 TypeScript |
| `pkg` / `esbuild` | 打包为单文件 CLI |

### 5.3 中转服务器部署方案

#### 方案一：VPS 裸部署（推荐）

```
服务器: 轻量云服务器（固定公网 IP）
规格: 1C 1G (最低，足够)
系统: Ubuntu 22.04 / Debian 11
运行时: Node.js 20 LTS
进程管理: systemd (自动重启)
```

**部署步骤**：

```bash
# 1. 安装 Node.js
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo bash -
sudo apt-get install -y nodejs

# 2. 安装 wx-newspic
npm install -g @packy-tang/wx-newspic

# 3. 配置凭证
wx-newspic credential set --app-id "wx_xxx" --app-secret "secret_xxx"

# 4. 创建 systemd 服务
sudo tee /etc/systemd/system/wx-newspic.service << 'EOF'
[Unit]
Description=wx-newspic Middleware Server
After=network.target

[Service]
Type=simple
ExecStart=/usr/bin/wx-newspic serve --api-key "sk-xxxx" --port 3000
Restart=always
RestartSec=10
Environment=NODE_ENV=production

[Install]
WantedBy=multi-user.target
EOF

sudo systemctl enable --now wx-newspic
```

#### 方案二：Docker 部署

```dockerfile
# deploy/Dockerfile
FROM node:20-alpine

WORKDIR /app
COPY package*.json ./
RUN npm ci --production --ignore-scripts
COPY . .
RUN npm run build

EXPOSE 3000

ENTRYPOINT ["node", "dist/bin/wx-newspic"]
CMD ["serve", "--port", "3000"]
```

#### 方案三：云函数（备用）

若 VPS 不可用，可使用支持固定出口 IP 的云函数平台：
- 阿里云函数计算（FC）+ 固定公网 IP（NAT 网关）
- AWS Lambda + VPC + NAT Gateway

#### IP 白名单验证流程

```bash
# 部署后验证服务器出口 IP
curl -s ifconfig.me
# → 显示服务器公网 IP

# 确认 IP 已在微信后台白名单中
# 开发 → 基本配置 → IP 白名单
```

### 5.4 图片处理方案

| 操作 | 处理策略 | 说明 |
|------|----------|------|
| **格式校验** | 读取文件头（magic bytes） | 不依赖后缀名，防止伪造 |
| **大小校验** | `fs.stat()` 获取 size | ≤ 10MB |
| **格式转换** | 不做转换 | 微信 API 原生支持 PNG/JPEG/GIF |
| **压缩** | 不做压缩 | 图片已由 html-ppt 产出，质量可控 |
| **上传** | multipart/form-data 直接转发 | 图片不经服务端落地（CLI 直接发送） |

对于 CLI → 中转服务器的图片传输，采用**直接上传模式**（而非 URL 下载模式）：

```
CLI 端: 读取本地文件 → multipart 上传到中转服务器
中转服务器: multipart 接收 → 转发到微信 API
```

**选择理由**：
- 图片已经在本地（html-ppt 产出的 slide 截图）
- 省去先上传到图床再传 URL 的额外步骤
- 减少对第三方存储服务的依赖
- 端到端延迟最低

---

## 6. 与现有项目的关系

### 6.1 凭证复用方案

#### 自动读取流程

```
wx-newspic credential show / wx-newspic serve / wx-newspic publish
         │
         ▼
  ┌─── 检查命令行 --app-id / --app-secret ──── 有 ──→ 使用命令行参数
  │
  无
  │
  ▼
  ┌─── 检查环境变量 WECHAT_APP_ID / WECHAT_APP_SECRET ── 有 ──→ 使用环境变量
  │
  无
  │
  ▼
  ┌─── 读取 ~/.openclaw/skills/wechat-publisher/.env ──── 有 ──→ 使用凭证文件
  │
  无
  │
  ▼
  提示 "未找到有效凭证"
```

#### 凭证文件格式

```env
# ~/.openclaw/skills/wechat-publisher/.env
WECHAT_APP_ID=wx_xxxxxxxxxxxxxxxx
WECHAT_APP_SECRET=xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
```

#### 凭证优先级（从高到低）

1. **CLI 参数** `--app-id` / `--app-secret`
2. **环境变量** `WECHAT_APP_ID` / `WECHAT_APP_SECRET`
3. **现有 Skill 配置** `~/.openclaw/skills/wechat-publisher/.env`

`wx-newspic credential set` 命令自动将凭证写入 `~/.openclaw/skills/wechat-publisher/.env`，确保与 `wechat-publisher` 共享同一份配置。

### 6.2 与 html-ppt 截图的对接方式

#### 输入对接

`html-ppt` 产出的 slide 截图路径通过 `--images` 参数传入：

```bash
# html-ppt 输出的截图通常在 output/ 目录
wx-newspic publish \
  --title "标题" \
  --content "正文" \
  --images "/path/to/html-ppt/output/slide-*.png"
```

#### Skill 层面的自动对接

在 `wx-newspic` Skill 中，自动检测 `html-ppt` 项目的工作区截图路径：

```yaml
# skills/wx-newspic/SKILL.md 中的输入规范
images:
  description: "图片路径列表，支持 glob。自动检测 html-ppt 产出目录"
  auto_detect:
    - "./output/slide-*.png"
    - "./slides/*.png"
    - "./*.png"
```

#### 文件命名规范兼容

`html-ppt` 默认输出格式：`slide-{n}.png`（如 `slide-01.png` → `slide-09.png`）

```
html-ppt 输出                wx-newspic 输入
─────────────────            ─────────────────────
output/slide-01.png  ──→  --images "output/slide-*.png"
output/slide-02.png  ──→  ↑ glob 自动匹配
output/slide-03.png  ──→  ↑ 按文件名排序
```

### 6.3 与 wechat-publisher / wenyan-cli 的对比

| 能力 | wenyan-cli | wx-newspic |
|------|-----------|----------------|
| 目标格式 | 图文消息 (`article_type: news`) | 图片消息 (`article_type: wx-newspic`) |
| 内容格式 | Markdown → HTML 渲染 | 纯文本 |
| 图片处理 | 内嵌在 Markdown 中，自动上传图床 | 独立图片列表，上传为永久素材 |
| 凭证读取 | `.env` / 环境变量 | 复用 `.env` / 环境变量 / CLI 参数 |
| 中转服务 | `wenyan serve` | `wx-newspic serve` |
| 依赖 | `@wenyan-md/cli` | 无（独立实现） |

---

## 7. 附录：错误码与处理

### 7.1 全局错误码

| 错误码 | HTTP 状态码 | 含义 | 用户提示 |
|--------|------------|------|---------|
| `AUTH_FAILED` | 401 | API Key 认证失败 | API Key 不正确，请检查 --api-key 参数 |
| `CREDENTIAL_NOT_FOUND` | 400 | 未找到微信凭证 | 未找到有效凭证，请通过 --app-id/--app-secret 指定或配置 .env |
| `INVALID_TITLE` | 400 | 标题不合规 | 标题不能为空且不超过 32 个字符 |
| `INVALID_CONTENT` | 400 | 正文不合规 | 正文不能为空 |
| `INVALID_IMAGE_FORMAT` | 400 | 不支持的图片格式 | 图片格式不支持，仅支持 PNG/JPEG/JPG/GIF |
| `IMAGE_TOO_LARGE` | 413 | 单张图片超过 10MB | 单张图片不能超过 10MB |
| `TOO_MANY_IMAGES` | 400 | 图片超过 20 张 | 图片数量不能超过 20 张 |
| `FILE_NOT_FOUND` | 400 | 图片文件不存在 | 图片文件不存在，请检查路径 |
| `TOKEN_INVALID` | 502 | access_token 无效 | 微信凭证异常，尝试重新获取 |
| `WECHAT_API_ERROR` | 502 | 微信 API 返回错误 | 微信接口调用失败：{错误详情} |
| `SERVER_UNAVAILABLE` | 503 | 中转服务不可用 | 服务暂时不可用，请稍后重试 |
| `SERVER_UNREACHABLE` | 502 | 无法连接中转服务 | 无法连接到中转服务，请检查服务状态 |

### 7.2 重试策略

| 场景 | 重试次数 | 间隔 | 条件 |
|------|---------|------|------|
| access_token 过期（40001） | 1 次 | 立即 | 强制刷新 token 后重试 |
| 微信系统繁忙（-1） | 3 次 | 指数退避（1s, 2s, 4s） | — |
| 频率限制（45009） | 2 次 | 60s + 120s | — |
| 网络超时/断开 | 2 次 | 1s, 3s | — |
| 参数错误（4xxxx） | 不重试 | — | 返回给用户 |

### 7.3 日志规范

服务器日志格式（JSON Line）：

```json
{"level":"info","time":"2026-05-18T10:00:00Z","reqId":"req-001","method":"POST","url":"/api/wechat/upload-image","status":200,"durationMs":1234}
{"level":"error","time":"2026-05-18T10:00:01Z","reqId":"req-002","error":{"code":"WECHAT_API_ERROR","errcode":40001},"msg":"access_token expired, refreshing"}
{"level":"warn","time":"2026-05-18T10:00:02Z","msg":"token will expire in 5 minutes, scheduling refresh"}
```

---

## 修订记录

| 版本 | 日期 | 修订内容 |
|------|------|----------|
| v0.1 | 2026-05-18 | 初始版本，基于 PRD-001 和综合文档输出 |

## 相关文档

| 文档 | 路径 |
|------|------|
| 综合文档 | [../综合文档.md](../综合文档.md) |
| PRD | [../product/PRD-001-wx-newspic.md](../product/PRD-001-wx-newspic.md) |
| 里程碑规划（待产出） | ../../project-management/milestones.md |
