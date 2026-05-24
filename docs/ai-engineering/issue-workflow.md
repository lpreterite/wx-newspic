# Issue 工作流

> Issue Workflow

**所属目录**：`ai-engineering/`
**文档状态**：草稿
**当前版本**：v0.2
**发布日期**：2026-05-24
**来源仓库**：`lpreterite/ai-engineering`
**源文件路径**：`guide/issue-workflow.md`

---

## 1. 概述

本文档定义项目中 Issue（工单）的完整生命周期管理规范，覆盖创建、分配、跟踪、关闭全流程。Issue 系统使用 **GitHub Issues** 作为持久化载体，与 `docs/STATUS.md` 的内部任务跟踪互补。

**核心原则**：每个需要追踪的问题只有一个记录来源——GitHub Issue。

---

## 2. Issue 类型与标签

### 2.1 Issue 类型

使用 GitHub 原生 Issue Types（需在组织级别启用），不依赖 Label 模拟。

| 类型 | 说明 | 使用场景 |
|------|------|----------|
| **Bug** | 功能缺陷或行为异常 | 现有功能不符合预期 |
| **Feature** | 新功能或功能改进 | 新增能力或优化已有功能 |
| **Task** | 工程任务或文档工作 | 重构、文档、配置变更等非功能工作 |
| **Epic** | 大型工作的顶层分组 | 包含多个 Sub-issue 的复杂工作 |

> 注意：「Question」类不归为 Issue，应使用 GitHub Discussions 进行。

### 2.2 优先级标签

| 标签 | 定义 | 响应要求 |
|------|------|----------|
| `P0` | 阻塞级：核心功能不可用或数据错误 | 立即修复，阻塞所有工作 |
| `P1` | 严重级：功能异常但有临时绕过方案 | 当前迭代内修复 |
| `P2` | 一般级：非核心功能异常或体验问题 | 排入后续迭代 |

### 2.3 状态标签

| 标签 | 说明 |
|------|------|
| `status/triaged` | 已确认，待分配 |
| `status/in-progress` | 正在处理 |
| `status/resolved` | 已修复待验证 |
| `status/verified` | 已验证通过 |
| `status/closed` | 已关闭（不修复或已下线） |

---

## 3. Issue 生命周期

```
open → triaged → in_progress → resolved → verified → closed
```

| 阶段 | 操作者 | 说明 |
|------|--------|------|
| **open** | 创建者 | 提交 Issue，自动设置 Issue Type |
| **triaged** | PM Agent | 确认问题有效，设置优先级和负责人。复杂 Issue 在此阶段拆分为 Sub-issues |
| **in_progress** | Developer | 开始处理，关联分支或 commit |
| **resolved** | Developer | 提交修复，PR 关联 Issue，等待验证 |
| **verified** | Tester Agent | 验证修复有效，回归无新问题 |
| **closed** | PM Agent | 验证通过后关闭，在 STATUS.md 中同步 |

---

## 4. Sub-issues

复杂 Issue 应拆分为 Sub-issues，实现进度可视化和任务并行。

### 4.1 拆解触发条件

满足以下任一条件时，PM Agent 应在 triage 阶段拆解：

| 条件 | 说明 |
|------|------|
| 3+ 个独立子任务 | Issue 可自然拆分为多个步骤 |
| 涉及多人协作 | 不同子任务需分配给不同角色 |
| 跨仓库 | 子任务分布在不同仓库中 |
| 预估工时 > 2天 | 单个任务过大，需要拆分跟踪 |

### 4.2 创建方式

PM Agent 在 triage 阶段操作：

```
1. 父 Issue 类型设为 Epic（如果涉及多处改动）或 Feature
2. 为每个子任务创建 Sub-issue，类型设为 Bug / Feature / Task
3. 按需设置 Sub-issue 的优先级、负责人、里程碑
4. 在父 Issue 的「Sub-issues」面板中查看聚合进度
```

### 4.3 进度聚合

GitHub 自动在父 Issue 中显示完成进度：`□ 3/5 completed`。

PM Agent 通过聚合进度判断整体是否就绪：
- 所有 Sub-issues 的 `verified` → 父 Issue 自动设为 `resolved`
- 部分 Sub-issues 阻塞 → 明确阻塞点，决定是否拆分延期

### 4.4 与 tasklist.md 的关系

| 维度 | Sub-issue | tasklist.md 条目 |
|------|-----------|------------------|
| **定位** | 父 Issue 的子任务 | 周任务拆分 |
| **粒度** | 一个独立可完成的工作 | 一个原子操作步骤 |
| **生命周期** | 与父 Issue 同步 | 按周独立管理 |
| **更新方式** | GitHub Issues UI | PM Agent 手动 |

原则上一个大粒度 Sub-issue 可能对应多个 tasklist 条目，不做严格一对一映射。

---

## 5. Issue Dependencies

Issue 之间存在依赖关系时，应使用 GitHub 原生依赖管理（`blocks` / `blocked by`）。

### 5.1 依赖类型

| 关系 | 含义 | 示例 |
|------|------|------|
| **blocked by** | 当前 Issue 被阻塞，等待另一个 Issue 完成 | API 开发完成才能写前端 |
| **blocks** | 当前 Issue 阻塞其他 Issue | 基础库未完成，所有功能阻塞 |

### 5.2 管理规则

| 规则 | 说明 |
|------|------|
| 标记时机 | PM Agent 在 triage 时识别并标记依赖 |
| P0 阻塞 | P0 Issue 必须无 blocked by 依赖才能进入 in_progress |
| 阻塞链 | PM Agent 每日检查 blocked issues，超 24h 升级 |
| 循环依赖 | 禁止 Issue 间形成循环依赖，发现立即上报 PM Agent 仲裁 |

### 5.3 PM Agent 监控

PM Agent 在「发布前检查」中执行：

```
□ 列出所有 open 的 blocked by 关系
□ 识别阻塞链顶端的 P0 Issue，确认其状态
□ 超过 24h 未解决的阻塞 → 升级人工 PM
```

---

## 6. 谁在什么时机创建 Issue

| 角色 | 时机 | 创建类型 |
|------|------|----------|
| **Tester Agent** | 测试发现缺陷，在 `bug_reported` 消息中上报给 PM | 由 PM 代为创建 Bug Issue |
| **PM Agent** | 收到 Tester 上报、验收发现问题、用户反馈 | Bug / Feature |
| **PO Agent** | 需求分析中识别出新功能或改进点 | Feature / Epic |
| **Developer** | 开发过程中发现预想不到的问题或改进机会 | Bug / Feature / Task |
| **用户** | 通过 GitHub Issues 提交 | Bug / Feature |
| **用户（疑问类）** | 使用疑问或咨询 | 走 GitHub Discussions |

### 6.1 验收发现→Issue 映射规则

Tester 完成验收发现问题后，PM Agent 执行以下操作：

1. 每个独立问题创建一个 Issue
2. Issue 标题使用 `BUG-NNN: 简短描述` 格式（BUG-001, BUG-002...）
3. 验收报告中对应的 BUG-ID 在 Issue 正文中引用
4. 设置正确的 Issue Type 和优先级标签
5. 分配对应 Developer
6. 在验收报告中注明对应的 Issue 编号

---

## 7. Issue Forms 规范

Issue 内容模板使用 GitHub YAML Forms 定义，存放在项目 `.github/ISSUE_TEMPLATE/` 目录下。YAML Forms 提供结构化字段验证，减少信息缺失。

### 7.1 Bug Report 表单规范

```yaml
name: Bug Report
description: 报告一个功能缺陷
labels: ["Bug"]
body:
  - type: textarea
    id: description
    attributes:
      label: 问题描述
      description: 一句话描述问题
      placeholder: 点击登录按钮后页面无响应
    validations:
      required: true
  - type: textarea
    id: steps
    attributes:
      label: 复现步骤
      placeholder: |
        1. 打开页面
        2. 点击登录按钮
        3. 页面卡住
    validations:
      required: true
  - type: textarea
    id: expected
    attributes:
      label: 预期行为
      placeholder: 应弹出登录弹窗
  - type: textarea
    id: actual
    attributes:
      label: 实际行为
      placeholder: 页面无响应，控制台抛出 TypeError
  - type: input
    id: environment
    attributes:
      label: 环境信息
      placeholder: "OS: macOS 14, Browser: Chrome 124"
  - type: textarea
    id: evidence
    attributes:
      label: 证据
      description: 日志、截图等（粘贴链接或拖拽上传）
  - type: input
    id: bug-id
    attributes:
      label: 对应验收 BUG-ID
      description: 若来自验收报告，填写对应的 BUG-NNN
      placeholder: "BUG-001"
```

### 7.2 Feature Request 表单规范

```yaml
name: Feature Request
description: 建议一个新功能或改进
labels: ["Feature"]
body:
  - type: textarea
    id: motivation
    attributes:
      label: 动机
      description: 为什么需要这个功能？解决了什么痛点？
      placeholder: 目前用户每次都要手动刷新数据...
    validations:
      required: true
  - type: textarea
    id: solution
    attributes:
      label: 方案描述
      description: 建议怎么做
      placeholder: 添加一个自动刷新开关，每 30s 拉取最新数据
    validations:
      required: true
  - type: textarea
    id: alternatives
    attributes:
      label: 替代方案
      description: 其他考虑过的方案
      placeholder: 也可以使用 WebSocket 推送，但实现成本更高
  - type: checkboxes
    id: acceptance
    attributes:
      label: 验收标准
      description: 满足哪些条件代表这个功能完成了
      options:
        - label: 标准 1（请替换为具体描述）
        - label: 标准 2（请替换为具体描述）
```

---

## 8. GitHub Projects 集成

Issue 应与 GitHub Projects 关联，实现可视化管理和自动化流转。

### 8.1 关联规则

| 场景 | 操作 |
|------|------|
| 新 Issue 创建 | 自动或手动加入 Project（使用 GitHub Projects 的自动化规则） |
| 状态变更 | Issue 状态标签变化 → Project 列自动移动 |
| Sub-issue 完成 | 子 Issue 关闭 → 父 Issue 进度字段自动更新 |

### 8.2 推荐视图

| 视图 | 布局 | 用途 |
|------|------|------|
| **看板** | Board（按状态分组） | 日常跟踪 Issue 流转 |
| **时间线** | Roadmap（按里程碑） | 交付节奏可视化 |
| **表格** | Table（全部字段） | PM Agent 批量操作与筛选 |

### 8.3 内置自动化

PM Agent 在 Project 中配置以下自动化规则：

```
□ Issue 类型设为 Bug → 自动加入「Bug 跟踪」视图
□ Issue 状态设为 in_progress → 自动移入「进行中」列
□ Issue 状态设为 resolved → 自动移入「待验证」列
□ Issue 状态设为 closed → 自动移入「已完成」列
□ Sub-issue 全部关闭 → 自动更新父 Issue 进度字段
```

---

## 9. Commit 引用规范

所有代码变更必须在 commit message 中引用关联的 Issue 编号：

| 变更类型 | Commit 格式 | 示例 |
|----------|------------|------|
| 修复 Bug | `fix: 描述 (#N)` | `fix: 统一 .env 键名 APP_ID/APP_SECRET (#1)` |
| 新功能 | `feat: 描述 (#N)` | `feat: 添加批量发布功能 (#5)` |
| 文档 | `docs: 描述 (#N)` | `docs: 更新安装说明 (#3)` |
| 重构 | `refactor: 描述 (#N)` | `refactor: 提取通用错误码 (#4)` |

### 关闭关键词

commit 推送后 GitHub 自动关闭关联 Issue，无需手动执行 `gh issue close`：

| 关键词 | 使用场景 | 示例 |
|--------|----------|------|
| `Close #N` | 通用关闭 | `Close #4` |
| `Fixes #N` | Bug 修复 | `Fixes #4` |
| `Resolves #N` | 功能/任务完成 | `Resolves #5` |

多条同时关闭：`Close #1, Close #4, Resolves #5`

> 注意：仅当 commit 合并到默认分支（`main`）时自动生效。

---

## 10. PM Agent 操作清单

在项目执行过程中，PM Agent 按以下清单管理 Issue：

### 10.1 日常管理

```
□ 检查新创建的 Issue，进行 triage（确认 Issue Type、标记依赖、分配）
□ 复杂 Issue 拆分为 Sub-issues，设置进度跟踪
□ 跟踪 in_progress Issue 的进展
□ 检查 blocked issues，超 24h 升级
□ 确保 resolved Issue 已被验证
□ 关闭已验证的 Issue
□ 每周同步 Issue 状态到 STATUS.md
```

### 10.2 验收后处理

```
□ 收集 Tester 的全部验收发现
□ 每个问题创建独立 Issue（BUG-001, BUG-002...）
□ 设置 Issue Type 和优先级
□ 识别并标记依赖关系
□ 分配对应 Developer
□ 在验收报告中记录 Issue 编号映射
□ 跟踪修复进度
□ 修复后安排 Tester 回归验证
□ 验证通过后关闭 Issue
```

### 10.3 发布前检查

```
□ 所有 P0/P1 Issue 均已关闭或已验证
□ 所有 Sub-issues 均已关闭（父 Issue 进度 100%）
□ 无 unresolved 的依赖关系（blocked by 全部解决或降级）
□ P2 Issue 已记录已知问题清单
□ STATUS.md 与 Issue 状态一致
□ Project 视图中的 Issue 状态与实际一致
□ 发布说明（Release Notes）包含 Issue 列表
```

---

## 11. 与 STATUS.md 的关系

| 维度 | GitHub Issues | STATUS.md |
|------|---------------|-----------|
| **定位** | 外部问题跟踪 | 内部项目总览 |
| **粒度** | 单个问题级别 | 里程碑/任务级别 |
| **受众** | 项目贡献者、用户 | PM Agent、开发者 |
| **生命周期** | open → closed | 更新最新快照 |
| **更新方式** | 手动 + gh CLI | 自动 + 手动 |

**同步规则**：
- STATUS.md 的「阻塞项」应链接到对应的 GitHub Issue
- Issue 关闭后，STATUS.md 对应条目更新为已解决
- 每次交付节点前，确保 STATUS.md 与 Issue 状态一致

---

## 附录：相关文档

| 文档 | 路径 |
|------|------|
| 项目状态卡 | [../STATUS.md](../STATUS.md) |
| 关键文档说明 | [./deliverables.md](./deliverables.md) |
| 阶段门控清单 | [./checklists.md](./checklists.md) |
| AI软件研发流程 | [./process.md](./process.md) |

---

## 修订记录

| 版本 | 日期 | 修订内容 |
|------|------|----------|
| v0.2 | 2026-05-24 | 升级 Issue 类型为原生 Bug/Feature/Task/Epic；新增 Sub-issues、Dependencies、Projects 集成章节；模板升级为 YAML Forms 规范；补充发布前检查 |
| v0.1 | 2026-05-19 | 初始版本：定义 Issue 类型、生命周期、创建规则、commit 规范、PM 操作清单 |
