# PRD-001: wechat-newspic — 小绿书图片消息发布工具

**Status**: Draft
**Author**: PO Agent **Last Updated**: 2026-05-18 **Version**: v0.1
**Stakeholders**: Product Owner, Developer Agent, PM Agent

---

## 1. Problem Statement（问题陈述）

### 我们在解决什么具体问题？

内容创作者使用 `html-ppt` 将短文（短内容）渲染为竖屏幻灯片（slide）截图后，目前只能以**图文消息（news）**格式发布到微信公众号。但图文消息对 PPT 风格的图片内容展示体验不佳——读者需要逐张点击查看大图，缺乏连贯的浏览感受。

微信公众号自 2023 年起升级了**图片消息（wx-newspic）**格式，提供类似小红书的横滑浏览体验（3:4 比例），天然适合 PPT 配图式短文的展示。然而现有工具链存在断层：

- `wechat-publisher` Skill 和其底层 `wenyan-cli` 只支持 `article_type: news`，不支持 `wx-newspic`
- `wenyan-cli` 的 Markdown→HTML 渲染管线对纯文本+图片的场景来说过于复杂
- 微信 API 的 IP 白名单限制导致本地开发机无法直接调用 API

### 不解决的代价是什么？

如果不做，每次发布图片消息都需要：
1. 手动登录公众号后台
2. 逐张上传图片素材
3. 手动填写标题、正文
4. 无法将 `html-ppt` → 发布串联成自动化流水线

**Evidence（证据）:**

- **User research（用户研究）**: 创作者每周产出 3–5 篇 PPT 风格短文，全部需要手动发布到公众号
- **Behavioral data（行为数据）**: `html-ppt` Skill 已产出稳定的 slide 截图，但发布环节需要手动操作，形成流水线断点
- **Support signal（客服信号）**: wenyan-cli 的 issue 中多次提及对图片消息的支持需求
- **Competitive signal（竞争信号）**: 小红书/小绿书的图片流阅读体验已成为用户习惯，图文消息在此场景下体验落后

---

## 2. Goals & Success Metrics（目标与成功指标）

| Goal（目标） | Metric（指标） | Current Baseline（当前基线） | Target（目标值） | Measurement Window（度量窗口） |
|---|---|---|---|---|
| 实现图片消息发布流水线 | 从 slide 截图到草稿创建的端到端耗时 | 手动操作约 15 分钟/篇 | < 30 秒/篇 | 首次发布验证 |
| 支持批量图片上传 | 单次发布支持的最大图片数 | 不支持（手工逐张上传） | ≥ 20 张（API 上限） | 首次集成测试 |
| 凭证复用 | 复用 `wechat-publisher` 凭证的能力 | 两套独立凭证 | 零额外配置，自动读取 | 首次端到端测试 |
| 中转服务可用性 | 中转服务请求成功率 | 无现有服务 | ≥ 99%（微信 API 层面） | 稳定运行 7 天 |
| Skill 一键调用 | OpenClaw Skill 调用成功率 | 无 Skill 封装 | 首次调用成功率 100% | 首次验收测试 |

---

## 3. Non-Goals（不做的事）

明确说明本次迭代**不会涉及**的内容：

- **不发布图文消息（news）**：`article_type: news` 不在本次范围内，继续由 `wechat-publisher` / `wenyan-cli` 覆盖
- **不做 Markdown 渲染**：图片消息的 `content` 字段仅支持纯文本 + 部分特殊标签，不需要（也不支持）HTML 富文本渲染
- **不提供 Web UI 管理界面**：本次仅提供 CLI + Skill 调用，没有浏览器管理后台
- **不实现正式发布（freepublish/submit）**：仅创建草稿到草稿箱（`draft/add`），不执行草稿→对外可见的提交发布操作。正式发布由用户在微信后台手动确认
- **不实现草稿编辑/删除功能**：首次迭代仅支持创建草稿，编辑和删除后续视需求增加
- **不做多公众号管理**：每次仅操作一个公众号，不实现多账号切换

---

## 4. User Personas & Stories（用户画像与故事）

### Primary Persona（主要画像）

**Name**: 小帕 — 独立内容创作者

**描述**：小帕每周产出 3–5 篇 PPT 风格的短文（阅读型内容），使用 `html-ppt` 将 Markdown 短文渲染为竖屏 slide 截图。他有一个公众号，希望把 slide 截图以"小绿书"图片消息的形式发布，让读者获得更好的横滑浏览体验。他习惯 CLI 工具，但更偏爱从 AI 辅助工具中一键完成。

---

### Story 1: CLI 发布图片消息

作为**内容创作者小帕**，我想要通过一条 CLI 命令将 slide 截图以图片消息格式发布到公众号草稿箱，以便快速完成发布流程、减少手动操作。

**Acceptance Criteria（验收标准）**:

- [ ] Given 本地有 `html-ppt` 产出的 slide 截图文件（PNG/JPEG），when 执行 `wx-newspic publish --title "标题" --content "正文" --images ./slides/*.png`，then 返回草稿 `media_id`
- [ ] Given 图片数量超过 20 张，when 执行发布命令，then 返回错误提示"图片数量不能超过 20 张"
- [ ] Given 单张图片超过 10MB，when 执行发布命令，then 返回错误提示"单张图片不能超过 10MB"
- [ ] Given 标题超过 32 个字，when 执行发布命令，then 返回错误提示"标题不能超过 32 个字符"
- [ ] Given 中转服务不可达，when 执行发布命令，then 返回清晰错误"无法连接到中转服务，请检查服务状态"
- [ ] Given 所有输入合法且服务正常，when 执行发布命令，then 草稿成功创建并在终端输出 `{ media_id, created_at, success: true }`

**Priority**: Must

---

### Story 2: 中转服务

作为**开发者**（维护中转服务），我想要一个轻量的 HTTP 中转服务，它在固定 IP 的服务器上运行，代理本地 CLI 对微信 API 的调用，以便解决 IP 白名单问题并统一管理 access_token。

**Acceptance Criteria（验收标准）**:

- [ ] Given 服务启动时，when 执行 `wx-newspic serve --port 3000 --api-key "sk-xxx"`，then 服务监听在 3000 端口，输出"服务已启动"
- [ ] Given 请求不带 API Key 或 Key 错误，when 调用任意 `/api/wechat/*` 接口，then 返回 `401 Unauthorized`
- [ ] Given 请求携带正确的 API Key，when 调用 `POST /api/wechat/token`，then 返回 access_token（首次获取或返回缓存）
- [ ] Given 有效的 access_token，when 调用 `POST /api/wechat/upload-image` 上传图片文件，then 返回 `{ image_media_id: "..." }`
- [ ] Given 多张图片已上传为永久素材，when 调用 `POST /api/wechat/create-draft` 传入 `article_type: "wx-newspic"` + 图片列表，then 返回 `{ media_id: "..." }`
- [ ] Given access_token 即将过期（< 5 分钟），when 再次需要 access_token，then 自动刷新而不是复用过期 token
- [ ] Given 微信 API 返回错误码（如 40001），when 中转服务接收响应，then 统一转换为中文错误信息返回给 CLI

**Priority**: Must

---

### Story 3: 凭证复用

作为**内容创作者小帕**，我不想要再配置一套微信凭证。我希望 `wechat-newspic` 自动读取 `wechat-publisher` 已有的 APP_ID / APP_SECRET 配置，以便零额外配置即可使用。

**Acceptance Criteria（验收标准）**:

- [ ] Given `~/.openclaw/skills/wechat-publisher/` 中存在凭证配置（APP_ID / APP_SECRET），when 首次运行 `wx-newspic publish` or `wx-newspic serve`，then 自动读取凭证，无需额外 `--app-id` 参数
- [ ] Given 自动读取的凭证为空或无效，when 执行命令，then 提示"未找到有效凭证，请通过 --app-id 和 --app-secret 指定或配置 .env 文件"
- [ ] Given 用户通过 `--app-id` 显式传入凭证，when 执行命令，then 优先使用命令行参数而非自动读取
- [ ] Given 凭证配置目录不存在，when 执行命令，then 输出清晰提示告知配置方式

**Priority**: Must

---

### Story 4: Skill 一键调用

作为**内容创作者小帕**，我希望在 AI 对话中通过一句指令将 slide 截图发布为图片消息，以便在写作流程中一气呵成、无须切换终端。

**Acceptance Criteria（验收标准）**:

- [ ] Given 当前正在 `html-ppt` 项目中编写短文，when 调用 `wechat-newspic` Skill，then 自动获取当前工作区的 slide 截图路径
- [ ] Given Skill 调用传入标题、正文和图片路径，when 执行发布，then 返回草稿 `media_id` 和预览链接
- [ ] Given 草稿创建成功，when Skill 返回结果，then 包含 `{ media_id, created_at, success: true }`
- [ ] Given 中转服务未启动，when 调用 Skill，then 返回清晰错误提示及启动指南
- [ ] Given 发布成功，when Skill 输出结果，then 输出格式为结构化的 JSON 方便下游使用

**Priority**: Must

---

### 用户线路图（User Journey）

```
┌──────────────┐     ┌──────────────┐     ┌──────────────┐     ┌──────────────┐     ┌─────────────────┐
│ 编写短文      │ ──▶ │ html-ppt     │ ──▶ │ wechat-newspic│ ──▶ │ 中转服务      │ ──▶ │ 微信 API        │
│ (Markdown)    │     │ 渲染为 slide  │     │ Skill / CLI   │     │ (固定 IP)     │     │ 创建图片消息草稿  │
└──────────────┘     └──────────────┘     └──────────────┘     └──────────────┘     └─────────────────┘
                                                   │
                                                   ▼
                                            ┌──────────────┐
                                            │ 公众号后台     │
                                            │ 手动确认发布   │
                                            └──────────────┘
```

---

## 5. Solution Overview（方案概述）

### 整体架构

采用与 `wenyan-cli` 相同的**本地 CLI → 远程中转服务 → 微信 API** 三层架构：

```
┌──────────────────────┐     ┌──────────────────────────┐     ┌──────────────────────┐
│ 本地端 (CLI / Skill)  │     │ 中转服务器 (固定 IP)      │     │ 微信 API              │
│                       │     │                          │     │                      │
│ newspapers publish    │────▶│ POST /api/wechat/*       │────▶│ api.weixin.qq.com    │
│   --title "标题"       │     │                          │     │                      │
│   --content "正文"     │     │ • access_token 缓存      │     │ • 素材上传            │
│   --images *.png      │     │ • 图片中转上传            │     │ • 草稿创建            │
│                       │     │ • 统一错误处理            │     │                      │
└──────────────────────┘     └──────────────────────────┘     └──────────────────────┘
```

### CLI 命令设计

借鉴 `wenyan-cli` 的命令结构，保持一致的用户体验：

| 命令 | 说明 |
|------|------|
| `wx-newspic publish` | 发布图片消息到草稿箱 |
| `wx-newspic serve` | 启动中转 HTTP 服务 |
| `wx-newspic credential` | 管理微信凭证（复用 wechat-publisher） |
| `wx-newspic --help` | 查看帮助 |

### 凭证复用策略

1. 运行时自动读取 `~/.openclaw/skills/wechat-publisher/` 下的凭证配置
2. 支持 `.env` 文件覆盖（`WECHAT_APP_ID`, `WECHAT_APP_SECRET`）
3. 支持 CLI `--app-id` / `--app-secret` 参数（优先级最高）
4. 中转服务运行时传入凭证，在服务端统一管理 access_token

**Key Design Decisions（关键设计决策）:**

- **Decision 1**: 选择 Node.js (Express/Fastify) 实现中转服务，复用 `wenyan-cli` 的凭证读取逻辑。取舍：引入 Node.js 运行时依赖，但能与 wechat-publisher 复用凭证配置文件格式（JSON/`.env`）。
- **Decision 2**: 中转服务增加 API Key 认证（`--api-key`），防止未授权访问。取舍：增加配置步骤，但确保白名单 IP 之外的调用方安全。
- **Decision 3**: CLI 仅创建草稿到草稿箱，不执行正式发布（freepublish/submit），每次创建结果记录 `{ media_id, created_at, success }` 到终端和本地日志。

---

## 6. Technical Considerations（技术考量）

### Dependencies（依赖）

| 依赖 | 用途 | Timeline Risk |
|------|------|---------------|
| `wechat-publisher` Skill 凭证文件 | 读取 APP_ID / APP_SECRET | Low — 已存在 |
| 微信公众号 API（draft/add） | 创建图片消息草稿 | Low — 已确认支持 |
| Node.js (Express/Fastify) | 中转服务实现 | Low |
| 固定 IP 的 VPS / 云服务器 | 中转服务部署 | **Med** — 需要获取和配置服务器 |
| `html-ppt` 截图产出 | 作为图片输入 | Low — 已集成 |

### Known Risks（已知风险）

| Risk（风险） | Likelihood（可能性） | Impact（影响） | Mitigation（缓解措施） |
|---|---|---|---|
| 服务器固定 IP 与微信后台白名单 IP 不一致 | Low | 高 — API 调用全部失败 | 部署后立即验证 IP 一致性，使用 `curl ifconfig.me` 确认 |
| access_token 过期导致并发请求失败 | Med | Med — 部分请求失败 | 增加 token 过期前 5 分钟自动刷新 + 请求失败后重试一次 |
| 图片上传为临时素材而非永久素材 | Med | 高 — 草稿创建失败 | 严格使用 `material/add_material`（type=image）接口 |
| 微信 API 接口变更 / 废弃 | Low | High | 监控微信官方更新公告，保持接口版本追踪 |
| 创建草稿记录不完整 | Low | Med — 无法追踪推送历史 | 每次创建草稿记录 `{ media_id, created_at, success }` 到终端和本地日志 |

### Open Questions（待解决问题）

- [ ] 中转服务的 API Key 如何安全地传递给 CLI？是作为命令行参数还是环境变量？
  - Owner: Developer Agent — Deadline: PRD 定稿后
- [ ] 图片上传是 CLI 直接发送到中转服务，还是 CLI 传 URL 由中转服务下载？
  - Owner: Developer Agent — Deadline: 技术方案阶段

---

## 7. Launch Plan（发布计划）

| Phase（阶段） | Date | Audience（受众） | Success Gate（通过标准） |
|---|---|---|---|
| **Phase 1: CLI + 中转服务核心** | TBD | Developer 自测 | 单张图片发布到草稿箱完成端到端验证 |
| **Phase 2: 多图支持 + 凭证复用** | TBD | Developer 自测 | 5 张图片 + 自动读取凭证完成发布 |
| **Phase 3: Skill 封装** | TBD | Product Owner 验收 | OpenClaw 中一键调用成功 |
| **Phase 4: 首次实战发布** | TBD | 真实内容（HyperFrames 短文） | HyperFrames 短文以图片消息形式发布到公众号 |

**Rollback Criteria（回滚标准）**: 如果任一 Phase 的测试发现微信 API 的图片消息功能存在未预料的限制（如 content 字段对特殊标签的支持范围不符、图片素材的 MediaID 有效期问题），则回退到手动发布方案，并记录问题到下一迭代。

---

## 8. Appendix（附录）

### 参考资料

- [微信公众号草稿箱 API 文档](https://developers.weixin.qq.com/doc/subscription/api/draftbox/draftmanage/api_draft_add.html)
- [wenyan-cli 命令参考](./docs/综合文档.md#六参考资料)
- [wechat-publisher Skill 配置](./docs/综合文档.md#现有-wechat-publisher-skill-位置)
- [HTML-PPT 截图产出规范](./docs/综合文档.md#23-图片要求)

### 相关文档

| 文档 | 路径 |
|------|------|
| 项目综合文档 | [../综合文档.md](../综合文档.md) |
| 技术方案（待产出） | `docs/engineering/` |
| 里程碑规划（待产出） | `docs/project-management/milestones.md` |

---

## 修订记录

| 版本 | 日期 | 修订内容 |
|------|------|----------|
| v0.1 | 2026-05-18 | 初始版本，基于综合文档输出 PRD |
