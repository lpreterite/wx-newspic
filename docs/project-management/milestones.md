# 里程碑规划

**版本**：v0.1
**状态**：已定稿
**创建日期**：2026-05-18

---

## 总览

| 里程碑 | 内容 | 前置依赖 | 验收标准 |
|--------|------|---------|---------|
| **M1: 微信集成层** | token管理 + 素材上传 + 草稿创建 | 无 | 单元测试通过 |
| **M2: 中转服务** | Fastify 服务 + 5 个 API 路由 | M1 | 集成测试通过 |
| **M3: CLI 命令** | publish / serve / credential | M1 + M2 | 端到端测试通过 |
| **M4: Skill 封装** | OpenClaw Skill 定义 | M3 | 一键调用成功 |
| **M5: 实战发布** | 发布 HyperFrames 短文 | M4 | 公众号草稿箱可见 |

## M1: 微信集成层

**任务清单**：

| 任务 | 描述 | 验收标准 |
|------|------|---------|
| T1.1 | 项目初始化（package.json, tsconfig, 目录结构） | `npm run build` 通过 |
| T1.2 | `client.ts` — 微信 API HTTP 客户端（自动重试 + 错误转换） | 单元测试覆盖 5 个错误码映射 |
| T1.3 | `token.ts` — access_token 管理（获取 + 缓存 + 自动续期 + 并发锁） | token 过期前自动刷新，并发不重复请求 |
| T1.4 | `material.ts` — 永久素材上传 | 单图上传返回 `image_media_id`，校验格式/大小 |
| T1.5 | `draft.ts` — 创建图片消息草稿 | 返回 `{ media_id, created_at }` |

## M2: 中转服务

**任务清单**：

| 任务 | 描述 | 验收标准 |
|------|------|---------|
| T2.1 | Fastify 服务启动 + 中间件（auth, error handler） | 服务监听指定端口，API Key 认证生效 |
| T2.2 | `POST /api/wechat/token` | 返回 access_token |
| T2.3 | `POST /api/wechat/upload-image` | mulitpart 接收 + 转发微信 |
| T2.4 | `POST /api/wechat/create-draft` | 构造请求 + 转发微信 |
| T2.5 | `GET /api/wechat/drafts` | 查询草稿列表 |
| T2.6 | 日志 + 监控 + 健康检查 | 结构化日志输出 |

## M3: CLI 命令

**任务清单**：

| 任务 | 描述 | 验收标准 |
|------|------|---------|
| T3.1 | `wx-newspic publish` 命令 | 参数校验 → 上传图片 → 创建草稿 → 输出结果 |
| T3.2 | `wx-newspic serve` 命令 | 启动中转服务，转发 CLI 参数 |
| T3.3 | `wx-newspic credential` 命令 | show / set / check 子命令 |
| T3.4 | 凭证配置层（自动读取 + CLI 参数 + .env） | 优先级正确，路径兼容 |

## M4: Skill 封装

| 任务 | 描述 | 验收标准 |
|------|------|---------|
| T4.1 | `SKILL.md` 定义 | 输入/输出格式完整 |
| T4.2 | 发布脚本 | 调用 CLI 发布，返回结构化结果 |

## M5: 实战发布

| 任务 | 描述 | 验收标准 |
|------|------|---------|
| T5.1 | 配置中转服务器 | 服务器部署 + IP 白名单 |
| T5.2 | 发布 HyperFrames 短文 | 公众号草稿箱可见 |
