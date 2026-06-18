# wx-newspic 项目状态

> 最后更新：2026-06-18（用户文档迁移至 GitHub Wiki，#45 关闭，#46 创建）
> 项目总览：[README.md](../README.md)

---

## 当前阶段

**执行阶段** — M7 渲染管线完成，M8 长文发布完成，M9 预览服务完成。M6 实战发布待启动。

## 已知问题

- **BUG-001**: 中转服务器 TokenManager 缓存过期 token 不自刷新（[GitHub Issue #12](https://github.com/lpreterite/wx-newspic/issues/12)）
  - 触发条件：另一服务使用同一凭证刷新 token 后，wx-newspic relay 缓存失效
  - 影响范围：`upload-image` 和 `create-draft` 两个路由
  - 解决方向：40001 时触发强制刷新，或与 wenyan relay 共享 token 缓存

---

## 任务完成状态

### M1: 微信集成层 ✅ 完成

| 任务 | 状态 | 测试 | 说明 |
|------|------|------|------|
| T1.1 项目初始化 | ✅ 完成 | — | package.json, tsconfig, 目录结构 |
| T1.2 client.ts HTTP 客户端 | ✅ 完成 | 17/17 | 重试机制 + 错误码映射 |
| T1.3 token.ts access_token 管理 | ✅ 完成 | 9/9 | 缓存 + 自动续期 + 并发锁 |
| T1.4 material.ts 素材上传 | ✅ 完成 | 9/9 | 格式/大小/存在性校验 |
| T1.5 draft.ts 草稿创建 | ✅ 完成 | 8/8 | 支持 article_type + image_info |
| T1.6 config 配置文件 | ✅ 完成 | — | 凭证读取 + 服务端配置 |

### M2: 中转服务 ✅ 完成

| 任务 | 状态 | 测试 | 说明 |
|------|------|------|------|
| T2.1 Fastify 服务启动 | ✅ 完成 | — | 路由注册 + 优雅关闭 |
| T2.2 中间件 (auth/error) | ✅ 完成 | 9/9 | Bearer 认证 + 统一错误处理 |
| T2.3 API 路由 (4 个) | ✅ 完成 | 11/11 | token/upload/draft/drafts |
| T2.4 集成测试 | ✅ 完成 | 11/11 | 全路由覆盖 |

### M3: CLI 命令 ✅ 完成

| 任务 | 状态 | 测试 | 说明 |
|------|------|------|------|
| T3.1 bin/wx-newspic 入口 | ✅ 完成 | — | shebang + bin 配置 |
| T3.2 publish 命令 | ✅ 完成 | — | 参数校验 + 上传 → 草稿 |
| T3.3 serve 命令 | ✅ 完成 | — | 动态导入 Fastify |
| T3.4 credential 命令 | ✅ 完成 | — | show/set/check |
| T3.5 CLI 路由 | ✅ 完成 | — | Commander 集成 |
| T3.6 单元测试 | ✅ 完成 | 17/17 | 参数校验全覆盖 |
| T3.7 theme 子命令 | ✅ 完成 | — | theme add/remove/list 管理自定义主题 |

### M4: Skill 封装 ✅ 完成

| 任务 | 状态 | 说明 |
|------|------|------|
| T4.1 SKILL.md | ✅ 完成 | 输入/输出格式完整 |
| T4.2 publish.sh 脚本 | ✅ 完成 | 可执行，支持 glob + JSON 输出 |

### M5: 文档完善 ✅ 完成

| 任务 | 状态 | 说明 |
|------|------|------|
| T5.1 README 安装与使用说明 | ✅ 完成 | 环境要求、安装方式、命令参考、使用示例、故障排查 |
| T5.2 创建 .env.example | ✅ 完成 | 环境变量模板文件 |
| T5.3 修正 skills/wx-newspic/SKILL.md | ✅ 完成 | 安装命令改为源码构建流程，快速开始使用全局命令 |
| T5.4 用户文档迁移至 GitHub Wiki | ✅ 完成 | README 精简（469→82 行），13 个 Wiki 页面创建，_Sidebar 导航 |

### M6: 实战发布 ⏳ 待启动

| 任务 | 状态 | 前置条件 |
|------|------|---------|
| T6.1 配置中转服务器 | ⏳ 待启动 | 需要 VPS/云服务器（固定 IP） |
| T6.2 发布 HyperFrames 短文 | ⏳ 待启动 | 需要微信凭证 + 服务器 |

### M7: 渲染管线 ✅ 完成

| 任务 | 状态 | 测试 | 说明 |
|------|------|------|------|
| T7.1 @wenyan-md/core 集成 | ✅ 完成 | 8/8 | 渲染内核，HTML/纯文本双输出 |
| T7.2 主题管理 themes.ts | ✅ 完成 | 4/4 | 注册式主题机制，3 内置主题 |
| T7.3 图片提取 images.ts | ✅ 完成 | 13/13 | 纯函数提取，覆盖本地/远程/base64 |
| T7.4 render 命令 | ✅ 完成 | 7/7 | --output/--theme/--hl-theme/--open/--theme-file |

### M8: 长文发布 ✅ 完成

| 任务 | 状态 | 测试 | 说明 |
|------|------|------|------|
| T8.1 设计文档 tech-design-002 | ✅ 完成 | — | 架构设计 + API 定义 |
| T8.2 publish 命令 news 模式 | ✅ 完成 | 19/19 | --type/--md/--theme/--theme-file，渲染+提取+上传+发布 |
| T8.3 SKILL.md + publish.sh 更新 | ✅ 完成 | — | type/md/theme 参数透传，双模式支持 |

### S1: 样式定制技能 ✅ 完成

| 任务 | 状态 | 说明 |
|------|------|------|
| S1.1 Step 1: Skill 入口 + 助手脚本 | ✅ 完成 | SKILL.md + validate-theme.sh + fetch-article.mjs |
| S1.2 Step 2: 文章爬取 + 视觉提取 | ✅ 完成 | extract-visual.mjs 含阶段 2 行内强调色推断（boldAccent/italicAccent/linkColor），修复 textstyle 误匹配 |
| S1.3 Step 3: 质量门禁集成 (修正循环) | ✅ 完成 | apply-correction.mjs + save-theme.sh，支持 3 轮修正 |
| S1.4 Step 4: 存盘 + 渲染预览 | ✅ 完成 | preview-theme.sh 渲染 + 浏览器打开 |
| S1.5 Step 5: skill-optimizer 审计 | ✅ 完成 | 7 维审计 → 3 references 拆分 + 自由度标注 + 完成标准 |

### M9: 预览服务 ✅ 完成

| 任务 | 状态 | 说明 |
|------|------|------|
| T9.1 (#33) CLI 预览命令 + HTTP 骨架 | ✅ 完成 | `wx-newspic preview` 命令，`node:http` 服务器，3 个路由 |
| T9.2 (#34) 渲染 API + EasyMDE 编辑器 | ✅ 完成 | `POST /render` 调用 `renderArticle()`，编辑器 CDN 集成 |
| T9.3 (#36) 自定义主题集成 + 体验打磨 | ✅ 完成 | 主题扫描注册、防抖、loading、错误态、快捷键、响应式 |
| T9.4 (#37) 门禁验收 Step 1+2 | ✅ 完成 | CLI 命令 + 渲染交互 — 12/12 通过 |
| T9.5 (#38) 门禁验收 Step 3+4 | ✅ 完成 | 主题集成 + 体验打磨 — 12/12 通过 |
| T9.6 (#39) 交付准备 | ⏳ 待开始 | STATUS.md + CHANGELOG + Release |

#### M9 关键决策

| 决策 | 结论 |
|------|------|
| 编辑器选型 | **EasyMDE**（SimpleMDE fork）— CDN 加载，零服务端耦合，含 Markdown 工具栏 |
| 加载方式 | `cdn.jsdelivr.net/npm/easymde`（JS + CSS）+ `cdnjs.cloudflare.com Font Awesome 4.7`（图标） |
| 渲染引擎 | 复用 `renderArticle()` 管线，`node:http` 服务端零外部依赖 |
| 工单精简 | #35 与 #30 重叠 → 关闭 #35，合并至 #36，不再有独立 Step 3 |

---

## 测试总览

| 测试文件 | 用例数 | 状态 |
|---------|--------|------|
| wechat/client.test.ts | 17 | ✅ |
| wechat/token.test.ts | 9 | ✅ |
| wechat/material.test.ts | 9 | ✅ |
| wechat/draft.test.ts | 8 | ✅ |
| server/middleware/auth.test.ts | 4 | ✅ |
| server/middleware/error.test.ts | 5 | ✅ |
| server/integration/server.test.ts | 12 | ✅ |
| cli/publish.test.ts | 19 | ✅ |
| cli/render.test.ts | 7 | ✅ |
| renderer/index.test.ts | 8 | ✅ |
| renderer/themes.test.ts | 4 | ✅ |
| renderer/images.test.ts | 13 | ✅ |
| cli/publish.test.ts | 21 | ✅ |
| cli/credential.test.ts | 3 | ✅ |
| cli/serve.test.ts | 2 | ✅ |
| **总计** | **117** | **✅ 全部通过** |
## 已知问题（GitHub Issues）

| Issue | 标题 | 优先级 | 状态 |
|-------|------|--------|------|
| [#1](https://github.com/lpreterite/wx-newspic/issues/1) | BUG-001: .env.example 与代码读写键名不一致 | P0 | ✅ resolved |
| [#2](https://github.com/lpreterite/wx-newspic/issues/2) | BUG-002: .env 路径名 wechat-publisher 与项目名不一致 | P0 | ✅ resolved |
| [#3](https://github.com/lpreterite/wx-newspic/issues/3) | ENH-001: 环境变量两套前缀不一致 | P1 | ✅ resolved |
| [#4](https://github.com/lpreterite/wx-newspic/issues/4) | BUG-003: CLI 短选项 -i 语义冲突 | P1 | ✅ resolved |
| [#5](https://github.com/lpreterite/wx-newspic/issues/5) | BUG-004: 错误码未定义在 WECHAT_ERROR_MAP 中 | P1 | ✅ resolved |
| [#6](https://github.com/lpreterite/wx-newspic/issues/6) | DOCS-001: API 响应 expires_at 格式需文档化 | P2 | ✅ resolved |
| [#7](https://github.com/lpreterite/wx-newspic/issues/7) | DOCS-002: 注释描述的键名与实际代码不符 | P2 | ✅ resolved |
| [#8](https://github.com/lpreterite/wx-newspic/issues/8) | ENH-002: 提供 OpenClaw 自动安装手册 | P2 | ✅ verified |
| [#9](https://github.com/lpreterite/wx-newspic/issues/9) | BUG-005: article_type 未传递，草稿箱生成普通文章而非小绿书 | P0 | ✅ resolved |
| [#15](https://github.com/lpreterite/wx-newspic/issues/15) | 整合 wenyan 长文发布功能到 wx-newspic | P1 | ✅ closed |
| [#16](https://github.com/lpreterite/wx-newspic/issues/16) | TECH-DESIGN-002: 长文发布渲染管线设计文档 | P2 | ✅ resolved |
| [#24](https://github.com/lpreterite/wx-newspic/issues/24) | FEAT: publish 命令支持 --type news 长文发布 | P1 | ✅ resolved |
| [#25](https://github.com/lpreterite/wx-newspic/issues/25) | FEAT: SKILL.md + publish.sh 更新支持 news 模式 | P1 | ✅ resolved |
| [#27](https://github.com/lpreterite/wx-newspic/issues/27) | v2 端到端综合验收 | P1 | ✅ closed |
| [#30](https://github.com/lpreterite/wx-newspic/issues/30) | FEAT: --theme-file + theme 子命令 | P1 | ✅ closed |
| [#31](https://github.com/lpreterite/wx-newspic/issues/31) | FEAT: 本地样式预览服务 — markdown 编辑器 + 即时主题切换 | P1 | ✅ closed |
| [#33](https://github.com/lpreterite/wx-newspic/issues/33) | Step 1: CLI 预览命令 + HTTP 服务骨架 | P1 | ✅ closed |
| [#34](https://github.com/lpreterite/wx-newspic/issues/34) | Step 2: 渲染 API + 编辑/预览交互 | P1 | ✅ closed |
| [#35](https://github.com/lpreterite/wx-newspic/issues/35) | Step 3: 自定义主题集成 | P2 | ❌ closed（合并至 #36） |
| [#36](https://github.com/lpreterite/wx-newspic/issues/36) | Step 3+4: 自定义主题集成 + 预览体验打磨 | P1 | ✅ completed |
| [#37](https://github.com/lpreterite/wx-newspic/issues/37) | 门禁验收：Step 1+2 | P1 | ✅ closed |
| [#38](https://github.com/lpreterite/wx-newspic/issues/38) | 门禁验收：Step 3+4 | P2 | ✅ closed |
| [#39](https://github.com/lpreterite/wx-newspic/issues/39) | 交付：STATUS.md 更新 + CHANGELOG + Release | P2 | ✅ closed |
| [#41](https://github.com/lpreterite/wx-newspic/issues/41) | 内联样式丢失 — renderArticle() 容器缺 id="wenyan" | P2 | ✅ closed |
| [#42](https://github.com/lpreterite/wx-newspic/issues/42) | 公众号文章可读性质量门禁标准调研 | P2 | ✅ resolved |
| [#43](https://github.com/lpreterite/wx-newspic/issues/43) | 公众号文章样式定制技能 | P2 | ✅ closed |
| [#44](https://github.com/lpreterite/wx-newspic/issues/44) | 代码块语法高亮暴露 --hl-theme CLI 参数 | P2 | ✅ closed |
| [#45](https://github.com/lpreterite/wx-newspic/issues/45) | README 补充样式定制技能使用说明 | P2 | ✅ closed |
| [#46](https://github.com/lpreterite/wx-newspic/issues/46) | DOCS: 迁移用户文档到 GitHub Wiki | P2 | ✅ closed |

## 风险项

| 风险 | 等级 | 缓解措施 |
|------|------|---------|
| 中转服务器需要固定 IP 的 VPS | 中 | 暂不可绕行 |
| 微信凭证配置需用户手动设置 | 低 | 有清晰的 CLI 引导 |
