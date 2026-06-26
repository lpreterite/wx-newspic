# PRD-v040: preview 文件浏览器面板

**Status**: Draft
**Author**: PO Agent
**Last Updated**: 2026-06-26
**Version**: v0.1
**Stakeholders**: Product Owner, Developer Agent, PM Agent

---

## 1. Problem Statement（问题陈述）

### 我们在解决什么具体问题？

`wx-newspic preview` 已提供分屏编辑器（EasyMDE + 即时预览 + 主题切换），是内容创作者预览 Wenyan 文章渲染效果的主要工具。但存在一个关键断层：

当前预览界面打开后，编辑器是空的。用户需要手动从文件管理器或编辑器中找到 `.md` 文件，**复制全部内容，粘贴到网页编辑器**，才能看到预览效果。

在以下场景中，这个断层尤其明显：

- **多文章切换预览**：需要在多篇文章之间快速对比渲染效果时，每次切换都是一次"复制→粘贴→等待渲染"的重复劳动
- **多主题对比**：想查看同一篇文章在不同主题下的效果，或交叉对比"文章×主题"矩阵时，操作繁琐
- **多项目工作**：文章分散在多个目录中，只能通过切换终端工作目录来切换项目

### 不解决的代价是什么？

- 每次预览切换耗时约 20-30 秒（手动操作），打断写作心流
- 预览工具本应加速工作流，反而成了中继站
- 内容创作者宁可放弃使用预览工具，直接盲发

**Evidence（证据）**:

- **User research**: 内容创作者每周产出多篇文章，发布前需要预览和调整主题效果，文件切换是高频操作
- **Behavioral data**: 现有 preview 在文件加载环节有断层，复制粘贴是唯一路径
- **Product signal**: 用户在使用 `wx-newspic` 时天然期望它具备"项目管理"能力，而非孤立的编辑器

---

## 2. Goals & Success Metrics（目标与成功指标）

| Goal（目标） | Metric（指标） | Current Baseline（当前基线） | Target（目标值） | Measurement Window（度量窗口） |
|---|---|---|---|---|
| 文件浏览可见性 | 用户能否在预览界面看到项目中的 .md 文件 | 文件不可见 | 侧栏显示完整目录树 | 首次预览加载 |
| 文件加载效率 | 从浏览到加载文章到编辑器的时间 | 手动操作约 30 秒/次 | < 2 秒/次（单次点击） | 首次端到端验证 |
| 多目录支持 | --watch-dir 同时管理的项目数 | 1 个（只能 cwd） | 多个（--watch-dir 支持多目录） | CLI 验收测试 |
| 主题对比效率 | 切换文件后主题选择是否保持 | 需重新选择 | 主题下拉菜单保持 | 首次验收 |
| 无回归 | 已有单元测试通过率 | 7/7 | 7/7 + 新增测试通过 | 每次测试运行 |

---

## 3. Non-Goals（不做的事）

- **不做文件编辑**：侧栏仅用于浏览和选择 .md 文件加载到编辑器。不含文件的创建、删除、重命名、移动操作
- **不做搜索/过滤**：无文件名搜索、标签过滤、排序功能
- **不做拖拽操作**：不支持拖拽文件到编辑器
- **不改变现有渲染管线**：`POST /render` 路由和 `renderArticle()` 函数保持不变
- **不做文件监视/热重载**：文件变更不会自动重新加载，需要用户手动点击切换

---

## 4. User Personas & Stories（用户画像与故事）

### Primary Persona（主要画像）

**Name**: 小帕 — 独立内容创作者

**描述**：小帕使用 Markdown 写作，通过 `wx-newspic preview` 预览文章在 Wenyan 主题下的渲染效果。他同时维护多个公众号文章项目，文章分布在不同的项目目录中。他习惯在编写和发布前反复对比预览效果，选择最合适的主题。

---

### Story 1: 文章快速浏览与加载预览

作为**内容创作者小帕**，我想要在预览界面侧栏中看到项目目录里的 .md 文件列表，点击即可加载到编辑器，以便在多篇文章之间快速切换预览，无需复制粘贴。

**Acceptance Criteria（验收标准）**:

- [ ] Given 我运行了 `wx-newspic preview`，When 侧栏加载完成，Then 我应该看到当前目录下所有 .md 文件的目录树，目录可展开/折叠，仅显示 .md 文件
- [ ] Given 侧栏显示了文件树，When 我点击某个 .md 文件，Then 该文件内容被加载到左侧 Editor 中，同时右侧 Preview 自动刷新显示渲染结果
- [ ] Given 我已经加载了文件A到编辑器，When 我点击侧栏中的文件B，Then Editor 内容替换为文件B的内容，Preview 同步刷新为文件B的渲染结果
- [ ] Given 目录包含非 .md 文件，When 侧栏加载完成，Then 非 .md 文件（如 .png, .json）不在文件树中显示

**Priority**: Must

---

### Story 2: 多主题对比审查

作为**排版负责人小帕**，我想要加载任意文章后切换主题时预览即时更新，且切换文章后主题选择保持不变，以便快速交叉对比不同文章在不同主题下的效果。

**Acceptance Criteria（验收标准）**:

- [ ] Given 我已从侧栏加载了一篇文章，并选择了 "Orange Heart" 主题，When 我点击侧栏中的另一篇文章，Then 新文章加载后，主题下拉菜单仍保持为 "Orange Heart"，预览使用该主题渲染

**Priority**: Must

---

### Story 3: 多项目目录支持

作为**多项目创作者小帕**，我想要通过 `--watch-dir` 指定多个目录，在侧栏中看到各自独立的目录区块，以便在一个预览窗口中跨项目浏览和切换文章。

**Acceptance Criteria（验收标准）**:

- [ ] Given 我运行了 `wx-newspic preview --watch-dir ./articles --watch-dir ./drafts`，When 预览页面加载完成，Then 侧栏中应显示两个独立的顶级目录区块，分别对应 `articles/` 和 `drafts/`
- [ ] Given 我运行 `wx-newspic preview` 不传 --watch-dir，When 预览页面加载完成，Then 侧栏应默认显示当前工作目录下的文件树
- [ ] Given 我运行 `wx-newspic preview --watch-dir ./nonexistent-path`，When CLI 执行参数校验，Then 应输出错误提示并退出

**Priority**: Must

---

### Story 4: 聚焦编辑模式

作为**深度写作用户小帕**，我想要点击按钮收起侧栏、需要时再展开，以便在需要大面积编辑时获得更大的编辑区域。

**Acceptance Criteria（验收标准）**:

- [ ] Given 侧栏处于展开状态，When 我点击收起按钮，Then 侧栏隐藏，编辑区域自动扩展填满左侧空间
- [ ] Given 侧栏处于收起状态，When 我点击展开按钮，Then 侧栏恢复显示，编辑区域恢复原有布局

**Priority**: Should

---

## 5. Solution Overview（方案概述）

### 整体架构

采用与 preview 现有架构一致的 **纯 inline 前端 + raw node:http 后端** 方案，不引入新框架。

#### 页面布局示意

```
┌──────────────────────────────────────────────────┐
│ [≡]  文章目录                          ↑ 主题下拉 │
├────────────────┬─────────────────────────────────┤
│  📁 articles/  │  编辑器 (EasyMDE)     预览区域   │
│   ├ 📁 drafts  │  ┌────────────────┐  ┌───────┐ │
│   │  └ 📄 a.md │  │                │  │       │ │
│   ├ 📄 b.md    │  │  Markdown      │  │ 渲染  │ │
│   └ 📄 c.md    │  │  编辑区域       │  │ 结果  │ │
│                │  │                │  │       │ │
│                │  └────────────────┘  └───────┘ │
└────────────────┴─────────────────────────────────┘
```

#### 系统架构
│ 浏览器 (template.ts)                                         │
│  ┌──────────────┐  ┌──────────────┐  ┌────────────────────┐ │
│  │ 文件浏览器侧栏  │  │ EasyMDE      │  │ iframe Preview     │ │
│  │ (可折叠)       │  │ Editor       │  │ (srcdoc)           │ │
│  │ 目录树         │  │              │  │                    │ │
│  │ 文件列表       │  │              │  │                    │ │
│  └──────┬───────┘  └──────┬───────┘  └────────┬───────────┘ │
└─────────┼─────────────────┼──────────────────┼──────────────┘
          │ GET /files      │ POST /render     │
          │ GET /file       │                  │
          ▼                 ▼                  │
┌──────────────────────────────────────────────┘
│ preview HTTP Server (raw node:http)
│  ├── GET  /files      → 目录树 JSON（2层深度 + 按需加载）
│  ├── GET  /file       → .md 文件内容
│  ├── POST /render     → 渲染 HTML（已有）
│  ├── GET  /           → 页面模板（已有，扩展后含侧栏）
│  ├── GET  /themes     → 主题列表（已有）
│  └── GET  /hl-themes  → 高亮主题列表（已有）
└──────────────────────┬─────────────────────────────────────┘
                       │
                       ▼
                 renderArticle()
```

### CLI 命令变更

| 命令 | 说明 | 变更 |
|------|------|------|
| `wx-newspic preview` | 启动预览服务 | 新增 `--watch-dir` 参数 |
| `wx-newspic preview --watch-dir <paths...>` | 指定一个或多个监视目录 | 新增 |

**选项说明**：

```
  -w, --watch-dir <paths...>  监视目录（支持多个，默认当前工作目录）
```

**用法示例**：

```bash
# 无参数，默认当前目录
wx-newspic preview

# 指定单个目录
wx-newspic preview -w ./articles

# 指定多个目录（多次传参）
wx-newspic preview -w ./articles -w ./drafts

# 指定多个目录（逗号分隔）
wx-newspic preview -w ./articles,./drafts
```

### 组件设计

#### CLI 层（`src/cli/preview.ts`）
- 新增 `--watch-dir` 参数解析
- 支持数组值（Commander 原生支持）
- 逗号分隔展开
- 目录存在性校验
- 解析结果传递到 `createPreviewServer()`

#### 后端层（`src/preview/server.ts`）
- 新增 `PreviewServerOptions.watchDirs` 字段
- `GET /files?dir=<path>`：扫描指定目录，返回最大 2 层深度的目录树 JSON
  - 格式：`{ name, path, type: "dir"|"file", children?, hasMore? }`
  - 过滤非 .md 文件
  - `hasMore` 标记更深层子目录（供前端按需加载）
  - 路径安全性校验（限制在 watchDirs 范围内）
- `GET /file?path=<path>`：读取 .md 文件内容
  - 返回 `{ content, name }`
  - 路径安全性校验
  - 文件不存在返回 404

#### 前端层（`src/preview/template.ts`）
- 侧栏 HTML 结构：`<aside class="file-sidebar">`（默认展开，宽度 260px）
- CSS：侧栏样式、目录树缩进、展开/折叠图标、选中态、响应式
- JS 交互：
  - `fetch('/files?dir=...')` 获取目录树
  - 递归渲染文件树 DOM
  - 点击目录展开/折叠（预加载下一层，无等待）
  - 点击 .md 文件 → `fetch('/file?path=...')` → `editor.value(content)` → `render()`
  - 侧栏收起/展开按钮（localStorage 记忆状态）
  - 首次加载自动选中第一个 .md 文件
  - 多 watch-dir 时分区块展示

**Key Design Decisions（关键设计决策）**:

- **Decision 1**: 后端返回 2 层深度 + 按需加载。第 1 层可见，第 2 层预加载（展开无等待），更深层点击时按需 fetch。取舍：初始加载更快，避免大目录全量返回的性能问题。
- **Decision 2**: 前端全 inline（template.ts），不引入 React/Vue 等框架。取舍：保持零外部 JS 依赖，与现有架构一致，但复杂交互的代码组织不如框架优雅。
- **Decision 3**: 侧栏默认展开。取舍：首次用户立即感知新功能，但会缩小编辑区域。可通过收起按钮临时隐藏。

---

## 6. Technical Considerations（技术考量）

### Dependencies（依赖）

| 依赖 | 用途 | Timeline Risk |
|------|------|---------------|
| `playwright`（新增 devDep） | E2E 浏览器自动化测试 | Low — 标准测试工具 |
| `font-awesome`（已有） | 侧栏收起/展开图标 | Low — 已加载 |
| `globby`（已有） | 文件路径解析 | Low — 当前仅 publish 使用 |
| `node:fs` / `node:path`（内置） | 目录扫描、文件读取 | Low — Node.js 内置 |

### Known Risks（已知风险）

| Risk（风险） | Likelihood（可能性） | Impact（影响） | Mitigation（缓解措施） |
|---|---|---|---|
| 深层目录（>5 层）展开时性能不佳 | Low | Med — 交互卡顿 | 按需加载 + 前端防抖，避免频繁 fetch |
| 路径遍历攻击（../ 越权访问） | Med | High — 可读取任意文件 | 服务端对请求路径做 resolve + 前缀校验，限制在 watchDir 范围内 |
| CI 环境无 Chromium 浏览器 | Med | High — E2E 测试失败 | 安装 playwright 时自动下载 browser，或跳过 E2E 设置 condition |
| 文件内容编码非 UTF-8 | Low | Low — 部分字符乱码 | 读取时指定 utf-8 编码，非 UTF-8 文件提示转换 |

### Open Questions（待解决问题）

- [ ] 侧栏宽度是否可拖拽调整？暂定固定 260px，后续视反馈增加
  - Owner: Product Owner — Deadline: 首次验收后
- [ ] 空目录应显示什么提示文案？暂定"此目录下无 Markdown 文件"
  - Owner: Developer Agent — Deadline: 实施阶段
- [ ] E2E 测试是否加入 CI？暂定本地可运行，CI 集成视 infra 情况
  - Owner: Developer Agent — Deadline: 测试阶段

---

## 7. Launch Plan（发布计划）

| Phase（阶段） | Date | Audience（受众） | Success Gate（通过标准） |
|---|---|---|---|
| **Phase 1: CLI 参数 + 后端 API** | TBD | Developer 自测 | #58, #59 测试通过 |
| **Phase 2: 前端侧栏 + 文件加载** | TBD | Developer 自测 | #60 手动交互验证通过 |
| **Phase 3: 测试 + E2E** | TBD | Developer 自测 | #61, #62 测试全部通过 |
| **Phase 4: 验收** | TBD | Product Owner 验收 | US-1~US-4 验收通过，Gate 3 门禁通过 |

**Rollback Criteria（回滚标准）**：如果任一 Phase 发现文件浏览功能与现有预览体验冲突（如侧栏导致页面布局崩溃、文件加载后渲染异常），回退方案为：移除侧栏相关前端代码，保留 CLI 参数和后端路由（以备下次迭代），回到纯 Editor + Preview 的现有布局。

---

## 8. Appendix（附录）

### 参考资料

- [PRD-001: wx-newspic — 小绿书图片消息发布工具](./PRD-001-wx-newspic.md)
- [Issue #56: preview 文件浏览器面板](https://github.com/lpreterite/wx-newspic/issues/56)

### 相关文档

| 文档 | 路径 |
|------|------|
| PRD-001 主 PRD | `./PRD-001-wx-newspic.md` |
| 技术方案 | `docs/engineering/`（待产出） |
| 项目状态卡 | `docs/STATUS.md` |
| 检查清单 | `docs/ai-engineering/checklists.md` |

---

## 修订记录

| 版本 | 日期 | 修订内容 |
|------|------|----------|
| v0.1 | 2026-06-26 | 初始版本，基于 #56 讨论输出 |
