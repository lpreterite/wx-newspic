# Issue 工作流

> Issue Workflow

**所属目录**：`ai-engineering/guide/`
**文档状态**：正式
**当前版本**：v1.0
**发布日期**：2026-05-28
**来源仓库**：`lpreterite/ai-engineering`
**源文件路径**：`guide/issue-workflow.md`
> **Skill 引用**：Issue 全生命周期 → `skills/issue-lifecycle`；决策记录 → `skills/decision-record`

---

## 1. 概述

本文档定义项目中 Issue（工单）的完整生命周期管理规范。Issue 覆盖从打磨阶段到执行阶段的**全流程**，使用 **GitHub Issues** 作为持久化载体。

**核心设计原则**：

| 原则 | 说明 |
|------|------|
| **过程与结果分离** | Issue 记录讨论/决策过程，关键文档（PRD/Tech Spec/Design Spec）记录最终结论 |
| **双阶段覆盖** | 打磨阶段工单用于探索与决策，执行阶段工单用于开发与验证 |
| **文档是唯一依据** | Gate 2 后执行工单的拆解依据是关键文档，而非打磨工单 |
| **增量版本** | 每个版本的交付物是独立文档，新版本不修改旧版本 |

### 全过程 Issue 流转总图

```
时间线 → ──────────────────────────────────────────────────────────────→

打磨阶段（Gate 1 + Gate 2）                执行阶段（Gate 3 + Gate 4）
┌─────────────────────────────────────┐  ┌─────────────────────────────┐
│                                    │  │                             │
│  Decision ──→ discussing ──→ closed │  │  Feature ──→ 开发 ──→ 测试  │
│  Question ──→ discussing ──→ closed │  │  Task    ──→ 开发 ──→ 测试  │
│  Risk     ──→ assessing ──→ closed  │  │  Bug     ──→ 修复 ──→ 测试  │
│  Review   ──→ confirmed ──→ closed  │  │                             │
│           │                         │  │                             │
│     结论沉淀到关键文档                  │  拆解依据 = 关键文档           │
│     (PRD / Tech / Design)            │  (不是打磨工单)                │
└─────────────────────────────────────┘  └─────────────────────────────┘
                                     ▲
                       Gate 2 通过后，依据文档拆解执行工单
```

---

## 2. Issue 类型与标签

### 2.1 Issue 类型

使用 GitHub 原生 Issue Types。系统分为**打磨族**和**执行族**两大类型组：

| 族 | 类型 | 说明 | 使用场景 |
|----|------|------|----------|
| **打磨** | **Decision** | 关键决策记录 | 技术选型、方案取舍、设计决策 |
| **打磨** | **Question** | 待确认疑问 | 需讨论澄清的需求/技术/设计问题 |
| **打磨** | **Risk** | 风险项 | 已识别的项目风险，需评估与缓解 |
| **打磨** | **Review** | 审查发现 | Gate 1/Gate 2 验收中发现的改进项 |
| **执行** | **Bug** | 功能缺陷 | 现有功能不符合预期 |
| **执行** | **Feature** | 新功能或改进 | 新增能力或优化已有功能 |
| **执行** | **Task** | 工程任务 | 重构、文档、配置变更等非功能工作 |
| **跨阶段** | **Epic** | 大型工作分组 | 包含多个 Sub-issue 的复杂工作 |

> 注意：纯疑问或咨询类内容（非需跟踪的 Question Issue）应使用 GitHub Discussions。

### 2.2 优先级标签

| 标签 | 定义 | 响应要求 |
|------|------|----------|
| `P0` | 阻塞级：核心功能不可用或数据错误 | 立即修复，阻塞所有工作 |
| `P1` | 严重级：功能异常但有临时绕过方案 | 当前迭代内修复 |
| `P2` | 一般级：非核心功能异常或体验问题 | 排入后续迭代 |

### 2.3 状态标签

**打磨工单状态**（适用于 Decision / Question / Risk / Review）：

| 标签 | 说明 |
|------|------|
| `status/open` | 已创建，待开始讨论 |
| `status/discussing` | 正在讨论中（超过 3 轮讨论后 AI 可主动询问是否记录为 Decision） |
| `status/decided` | 已达成结论，待沉淀到关键文档 |
| `status/closed` | 已关闭（结论已记录到文档，或问题已解决） |

**执行工单状态**（适用于 Bug / Feature / Task）：

| 标签 | 说明 |
|------|------|
| `status/open` | 已创建，待 triage |
| `status/triaged` | 已确认，待分配 |
| `status/in-progress` | 正在处理 |
| `status/resolved` | 已修复，开发者自测通过 |
| `status/ready-for-test` | 已移交待测试，开发者不可再修改 |
| `status/testing` | Tester 正在执行测试 |
| `status/verified` | 已验证通过 |
| `status/closed` | 已关闭 |

---

## 3. Issue 生命周期

### 3.1 打磨工单生命周期

适用于 Decision / Question / Risk / Review：

```
open → discussing → decided → closed
  ↑         ↓
   └── reopened（有新信息时）
```

| 阶段 | 操作者 | 说明 |
|------|--------|------|
| **open** | 创建者 / AI | 记录问题/决策/疑问的初始描述 |
| **discussing** | 所有人 | 在 Issue 评论区或通过 Agent 工具交流讨论 |
| **decided** | AI / 人类 | 达成结论，记录最终结论和依据；人类确认后关闭 |
| **closed** | 人类 / AI | 结论已沉淀到关键文档，关闭归档 |

### 3.2 执行工单生命周期

适用于 Bug / Feature / Task：

```
open → triaged → in_progress → resolved → ready-for-test → testing → verified → closed
```

| 阶段 | 操作者 | 说明 |
|------|--------|------|
| **open** | 创建者 | 提交 Issue，自动设置 Issue Type |
| **triaged** | Orchestrator Agent | 确认问题有效，设置优先级和负责人。复杂 Issue 在此阶段拆分为 Sub-issues |
| **in_progress** | Developer Agent | 开始处理，关联分支或 commit |
| **resolved** | Developer Agent | 提交修复，PR 关联 Issue，自测通过 |
| **ready-for-test** | Developer Agent | 移交 Tester，不可再修改代码 |
| **testing** | Tester Agent | 在隔离上下文中独立执行集成/E2E/回归测试 |
| **verified** | Tester Agent | 测试通过，回归无新问题 |
| **closed** | Orchestrator Agent | 验证通过后关闭，在 STATUS.md 中同步 |

---

## 4. Sub-issues

复杂 Issue 应拆分为 Sub-issues，实现进度可视化和任务并行。

### 4.1 拆解触发条件

满足以下任一条件时，Orchestrator Agent 应在 triage 阶段拆解：

| 条件 | 说明 |
|------|------|
| 3+ 个独立子任务 | Issue 可自然拆分为多个步骤 |
| 涉及多人协作 | 不同子任务需分配给不同角色 |
| 跨仓库 | 子任务分布在不同仓库中 |
| 预估工时 > 2 天 | 单个任务过大，需要拆分跟踪 |

### 4.2 创建方式

Orchestrator Agent 在 triage 阶段操作：

```
1. 父 Issue 类型设为 Epic（如果涉及多处改动）或 Feature
2. 为每个子任务创建 Sub-issue，类型设为 Bug / Feature / Task
3. 按需设置 Sub-issue 的优先级、负责人、里程碑
4. 在父 Issue 的「Sub-issues」面板中查看聚合进度
```

### 4.3 进度聚合

GitHub 自动在父 Issue 中显示完成进度：`□ 3/5 completed`。

Orchestrator Agent 通过聚合进度判断整体是否就绪：
- 所有 Sub-issues 的 `verified` → 父 Issue 自动设为 `resolved`
- 部分 Sub-issues 阻塞 → 明确阻塞点，决定是否拆分延期

> 注意：Sub-issues 机制主要适用于执行阶段的 Feature/Task/Epic。打磨阶段的 Issue（Decision/Question 等）通常不拆 Sub-issues。

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
| 标记时机 | Orchestrator Agent 在 triage 时识别并标记依赖 |
| P0 阻塞 | P0 Issue 必须无 blocked by 依赖才能进入 in_progress |
| 阻塞链 | Orchestrator Agent 每日检查 blocked issues，超 24h 升级 |
| 循环依赖 | 禁止 Issue 间形成循环依赖，发现立即上报 Orchestrator Agent 仲裁 |

---

## 6. 谁在什么时机创建 Issue

### 6.1 打磨阶段

| 角色 | 时机 | 创建类型 |
|------|------|----------|
| **人类 / AI** | 讨论中产生决策点（3 轮以上） | Decision |
| **人类 / AI** | 涉及待确认事项 | Question |
| **PO Agent** | 需求分析中发现风险 | Risk |
| **Orchestrator Agent** | Gate 1/Gate 2 审查发现问题 | Review |

### 6.2 执行阶段

| 角色 | 时机 | 创建类型 |
|------|------|----------|
| **Orchestrator Agent** | Gate 2 通过后，依据关键文档拆解 | Feature / Task / Epic |
| **Tester Agent** | 测试发现缺陷（由 Orchestrator Agent 代为创建） | Bug |
| **人类** | 验收发现问题、用户反馈 | Bug / Feature |
| **Developer Agent** | 开发中发现预想不到的问题 | Bug / Feature / Task |

### 6.3 验收发现 → Issue 映射规则

Tester 完成验收发现问题后，Orchestrator Agent 执行以下操作：

1. 每个独立问题创建一个 Bug Issue
2. Issue 标题使用 `BUG-NNN: 简短描述` 格式（BUG-001, BUG-002...）
3. 验收报告中对应的 BUG-ID 在 Issue 正文中引用
4. 设置正确的 Issue Type 和优先级标签
5. 分配对应 Developer Agent
6. 在验收报告中注明对应的 Issue 编号

---

## 7. Issue Forms 规范

Issue 内容模板使用 GitHub YAML Forms 定义，存放在项目 `.github/ISSUE_TEMPLATE/` 目录下。YAML Forms 提供结构化字段验证，减少信息缺失。

### 7.1 YAML Forms 的双重用途

| 使用者 | 使用方式 |
|--------|----------|
| **人类** | 在 GitHub UI 中看到渲染好的表单，填入信息创建 Issue |
| **AI** | 读取 `.yml` 文件解析字段定义（label / description / validations），按结构生成 Issue body，通过 `gh issue create` 创建 |

AI 创建 Issue 时：

```
1. 读取 .github/ISSUE_TEMPLATE/{type}.yml
2. 解析 body 字段定义：
   - label → 字段标题
   - description → 字段说明
   - validations.required → 必填标记
   - placeholder → 内容格式参考
3. 按字段结构构造 Issue body（Markdown）
4. 执行 gh issue create --body-file 或 API 创建
```

### 7.2 Bug Report

文件：`.github/ISSUE_TEMPLATE/1-bug.yml`

```yaml
name: Bug Report
description: File a bug/issue
title: "[Bug]: "
labels: ["bug"]
type: Bug
body:
  - type: checkboxes
    id: existing
    attributes:
      label: Is there an existing issue for this?
      description: Please search to see if an issue already exists for the bug you encountered.
      options:
        - label: I have searched the existing issues
          required: true
  - type: textarea
    id: description
    attributes:
      label: Problem Description
    validations:
      required: true
  - type: textarea
    id: steps
    attributes:
      label: Steps To Reproduce
    validations:
      required: true
  - type: textarea
    id: expected
    attributes:
      label: Expected Behavior
    validations:
      required: true
  - type: textarea
    id: actual
    attributes:
      label: Actual Behavior
    validations:
      required: true
  - type: input
    id: environment
    attributes:
      label: Environment
  - type: textarea
    id: evidence
    attributes:
      label: Evidence
  - type: input
    id: bug-id
    attributes:
      label: Related BUG-ID
```

### 7.3 Feature Request

文件：`.github/ISSUE_TEMPLATE/2-feature.yml`

```yaml
name: Feature Request
description: Suggest a new feature or improvement
title: "[Feature]: "
labels: ["feature"]
type: Feature
body:
  - type: textarea
    id: motivation
    attributes:
      label: Motivation
    validations:
      required: true
  - type: textarea
    id: solution
    attributes:
      label: Proposed Solution
    validations:
      required: true
  - type: textarea
    id: alternatives
    attributes:
      label: Alternatives Considered
  - type: textarea
    id: acceptance
    attributes:
      label: Acceptance Criteria
    validations:
      required: true
  - type: input
    id: related-docs
    attributes:
      label: Related Documents
```

### 7.4 Task

文件：`.github/ISSUE_TEMPLATE/3-task.yml`

```yaml
name: Task
description: Engineering task, documentation, or configuration work
title: "[Task]: "
labels: ["task"]
type: Task
body:
  - type: textarea
    id: description
    attributes:
      label: Task Description
    validations:
      required: true
  - type: textarea
    id: acceptance
    attributes:
      label: Acceptance Criteria
    validations:
      required: true
  - type: dropdown
    id: category
    attributes:
      label: Category
      options:
        - Refactoring
        - Documentation
        - Configuration
        - Infrastructure
        - CI/CD
        - Testing
        - Other
    validations:
      required: true
  - type: input
    id: related-docs
    attributes:
      label: Related Documents
```

### 7.5 Decision（打磨族）

文件：`.github/ISSUE_TEMPLATE/4-decision.yml`

```yaml
name: Decision
description: Record a key design or technical decision
title: "[Decision]: "
labels: ["decision"]
type: Decision
body:
  - type: markdown
    attributes:
      value: |
        ## Decision Record
        This Issue records a key decision made during the polishing phase.
        It captures the context, options considered, and final conclusion.
        The decision outcome is documented in the project's key deliverables.
  - type: textarea
    id: context
    attributes:
      label: Context
    validations:
      required: true
  - type: textarea
    id: options
    attributes:
      label: Options Considered
    validations:
      required: true
  - type: textarea
    id: conclusion
    attributes:
      label: Decision
    validations:
      required: true
  - type: textarea
    id: rationale
    attributes:
      label: Rationale
  - type: textarea
    id: impact
    attributes:
      label: Impact Scope
  - type: input
    id: related-docs
    attributes:
      label: Documented In
```

### 7.6 Question（打磨族）

文件：`.github/ISSUE_TEMPLATE/5-question.yml`

```yaml
name: Question
description: A pending question or discussion point to be clarified
title: "[Question]: "
labels: ["question"]
type: Question
body:
  - type: markdown
    attributes:
      value: |
        ## Question Record
        This Issue tracks a question from the polishing phase.
        Once clarified, the outcome should be reflected in the project's deliverables.
  - type: textarea
    id: question
    attributes:
      label: Question
    validations:
      required: true
  - type: dropdown
    id: scope
    attributes:
      label: Scope
      options:
        - Requirement
        - Technical Design
        - UI/UX Design
        - Project Management
        - Other
    validations:
      required: true
  - type: input
    id: deadline
    attributes:
      label: Decision Deadline
  - type: textarea
    id: proposed
    attributes:
      label: Initial Thoughts
  - type: input
    id: related-docs
    attributes:
      label: Related Documents
```

### 7.7 Risk（打磨族）

文件：`.github/ISSUE_TEMPLATE/6-risk.yml`

```yaml
name: Risk
description: Track an identified risk during the polishing phase
title: "[Risk]: "
labels: ["risk"]
type: Risk
body:
  - type: textarea
    id: description
    attributes:
      label: Risk Description
    validations:
      required: true
  - type: dropdown
    id: likelihood
    attributes:
      label: Likelihood
      options:
        - High
        - Medium
        - Low
    validations:
      required: true
  - type: dropdown
    id: impact
    attributes:
      label: Impact
      options:
        - Critical
        - Major
        - Minor
    validations:
      required: true
  - type: textarea
    id: mitigation
    attributes:
      label: Mitigation Plan
  - type: dropdown
    id: status
    attributes:
      label: Current Status
      options:
        - Identifying
        - Assessing
        - Mitigated
        - Accepted
        - Closed
  - type: input
    id: owner
    attributes:
      label: Owner
```

### 7.8 Review Finding（打磨族）

文件：`.github/ISSUE_TEMPLATE/7-review.yml`

```yaml
name: Review Finding
description: An improvement item identified during Gate review
title: "[Review]: "
labels: ["review"]
type: Review
body:
  - type: input
    id: gate
    attributes:
      label: Review Stage
    validations:
      required: true
  - type: textarea
    id: finding
    attributes:
      label: Finding Description
    validations:
      required: true
  - type: dropdown
    id: severity
    attributes:
      label: Severity
      options:
        - P0: Blocker
        - P1: Major
        - P2: Minor
    validations:
      required: true
  - type: textarea
    id: suggestion
    attributes:
      label: Suggested Fix
    validations:
      required: true
  - type: input
    id: related-docs
    attributes:
      label: Related Deliverable
```

---

## 8. GitHub Projects 集成

### 8.1 双看板设计

创建一个 GitHub Project，配置两个独立视图：

| 视图名称 | 筛选规则 | 状态列 |
|---------|---------|--------|
| **打磨看板** | `type:Decision,Question,Risk,Review` | 待讨论(Todo) → 讨论中(Discussing) → 已决策(Decided) → 已关闭(Closed) |
| **执行看板** | `type:Feature,Bug,Task` | 待办(Todo) → 进行中(In Progress) → 待验收(Ready for Test) → 测试中(Testing) → 已验证(Verified) → 已完成(Done) |

### 8.2 推荐视图

| 视图 | 布局 | 用途 |
|------|------|------|
| **打磨看板** | Board（按状态分组） | 打磨阶段日常跟踪 |
| **执行看板** | Board（按状态分组） | 执行阶段日常跟踪 |
| **时间线** | Roadmap（按里程碑） | 交付节奏可视化 |
| **全局表格** | Table（全部字段） | 批量操作与跨阶段筛选 |

### 8.3 自动化规则

| 触发条件 | 自动动作 |
|---------|---------|
| Issue 类型为 Decision/Question/Risk/Review | 自动加入「打磨看板」视图 |
| Issue 类型为 Feature/Bug/Task | 自动加入「执行看板」视图 |
| 标签变更为 `status/discussing` | 打磨看板移入「讨论中」列 |
| 标签变更为 `status/decided` | 打磨看板移入「已决策」列 |
| 标签变更为 `status/in-progress` | 执行看板移入「进行中」列 |
| 标签变更为 `status/resolved` | 执行看板移入「待验收」列 |
| 标签变更为 `status/ready-for-test` | 执行看板移入「待验收」列 |
| 标签变更为 `status/testing` | 执行看板移入「测试中」列 |
| 标签变更为 `status/verified` | 执行看板移入「已验证」列 |
| 标签变更为 `status/closed` | 对应看板移入「已关闭」列 |

---

## 9. AI 决策记录协议

打磨阶段中，AI 与人类的讨论可能产生关键决策。以下协议定义 AI 如何识别决策点并将决策记录为 Issue。

### 9.1 决策识别信号

当对话中出现以下信号时，AI 应判断是否达到决策点：

| 信号 | 示例 |
|------|------|
| 人类表达明确选择倾向 | "选 X"、"用 Y"、"倾向于方案 A" |
| 讨论多个方案并排除其一 | "B 不行，成本太高" |
| 确认了技术选型或设计方向 | "那就用 PostgreSQL" |
| 需要外部确认的疑问 | "这个问题需要确认一下" |

### 9.2 触发门槛

超过 **3 轮有效讨论** 后，AI 可主动询问：

> "这个讨论已经涉及到关键决策了，需要我创建一个 Decision Issue 记录吗？"

人类确认后，AI 执行以下流程：

```
1. 读取 .github/ISSUE_TEMPLATE/4-decision.yml
2. 按字段结构提取本次讨论中的决策要素
3. 构造 Issue body（Markdown 格式）
4. 执行 gh issue create
5. 回复人类："已创建 Decision #N"
```

### 9.3 Issue 内容结构示例

AI 创建 Decision Issue 时，body 内容如下：

```
## Decision Record

**Context**:
用户表需要支持多租户隔离

**Options Considered**:
- MySQL + 应用层隔离（方案 A）
- PostgreSQL + Schema 隔离（方案 B）← 已选
- CockroachDB（方案 C，成本过高淘汰）

**Decision**:
采用 PostgreSQL + Schema 隔离方案

**Rationale**:
- PostgreSQL 原生支持 Schema 隔离
- 团队已有 PostgreSQL 经验
- 较 CockroachDB 运维成本更低

**Impact Scope**:
影响数据层架构、PRD 第 3.2 节、里程碑 M1
```

### 9.4 创建后的处理

- Issue 保持 `open` 状态，人类确认结论已沉淀到文档后手动关闭
- Issue 中通过 `related-docs` 字段关联最终结果文档

---

## 10. 打磨→执行转换规则

### 10.1 核心原则

| 原则 | 说明 |
|------|------|
| **文档是拆解依据** | Gate 2 通过后，执行工单的拆解依据是**关键文档**（PRD / Tech Spec / Design Spec），而非打磨工单 |
| **Issue 只做追溯** | 执行工单的 body 中可引用相关 Decision Issue 的编号（`Refs: #N`）作为背景参考，但不影响拆解逻辑 |
| **过程与结果分离** | 打磨工单记录"过程"（讨论了什么、考虑了哪些方案），关键文档记录"结果"（最终结论） |

### 10.2 Gate 2 后的拆解流程

```
Gate 2 通过
    │
    ├─ 1. 确认关键文档已定稿（PRD-v1.0 / TECH-v1.0 / DESIGN-v1.0）
    │
    ├─ 2. Orchestrator Agent 读取关键文档
    │
    ├─ 3. 依据文档中的里程碑划分、用户故事、验收标准
    │     拆解为 Feature / Task / Bug 执行工单
    │
    └─ 4. 可选：在执行工单中引用相关的 Decision Issue #N
         作为背景参考（非拆解依据）
```

### 10.3 可追溯性

执行工单创建后，双向引用确保可追溯：

```
Decision #5: 选择 PostgreSQL 作为主数据库
    ↓ 执行工单（body 中标注 Refs: #5）
    Feature #8: 实现用户表数据模型
    Feature #9: 实现数据库连接池
```

---

## 11. 文档版本管理规范

### 11.1 增量版本原则

每个版本的交付物是**独立的增量文档**，新版本不修改旧版本内容。

```
docs/
├── product/
│   ├── PRD-v1.0.md        ← v1.0 产品需求文档
│   ├── PRD-v1.1.md        ← v1.1 增量版本（独立文件）
│   └── PRD-v2.0.md        ← v2.0 大版本
├── engineering/
│   ├── ARCHITECTURE-v1.0.md
│   └── ARCHITECTURE-v1.1.md
└── design/
    ├── DESIGN-v1.0.md
    └── DESIGN-v1.1.md
```

### 11.2 版本迭代中的 Issue 对应关系

| 迭代 | 打磨阶段 Issue | 关键文档 | 执行阶段 Issue |
|------|---------------|---------|---------------|
| v1.0 | Decision/Question/Risk/Review（讨论 v1.0） | PRD-v1.0.md, TECH-v1.0.md | Feature/Task/Bug（实现 v1.0） |
| v1.1 | Decision/Question/Risk/Review（讨论 v1.1 增量） | PRD-v1.1.md（不修改 v1.0） | Feature/Task/Bug（实现 v1.1） |

### 11.3 每次迭代的完整流程

```
v1.0 打磨 → 工单 → 决策产出 → PRD-v1.0.md
→ Gate 2 通过
→ 依据 PRD-v1.0.md 拆解执行工单
→ 开发/测试/交付

v1.1 新需求 → 新打磨 → 新工单 → 新决策产出 → PRD-v1.1.md（增量）
→ Gate 2 通过
→ 依据 PRD-v1.1.md 拆解执行工单
→ 开发/测试/交付
```

---

## 12. Commit 规范

### 12.1 提交前验收核验

在提交并推送变更之前，执行以下核验流程：

1. **读取验收标准**：通过 `gh issue view <N> --json body` 获取 Issue 的验收标准，确认所有验收项已列出
2. **逐一核验**：对照验收标准的每一项，确认代码或文档改动已覆盖；未满足的项不得关闭 Issue
3. **勾选验收标准**：通过 `gh issue edit <N> --body-file <(echo "updated body")` 将 Issue 正文中的 `- [ ]` 更新为 `- [x]`
4. **确认闭环**：所有验收标准已勾选后，提交并推送

### 12.2 引用格式

所有代码变更必须在 commit message 中引用关联的 Issue 编号：

| 变更类型 | Commit 格式 | 示例 |
|----------|------------|------|
| 修复 Bug | `fix: 描述 (#N)` | `fix: 统一 .env 键名 APP_ID/APP_SECRET (#1)` |
| 新功能 | `feat: 描述 (#N)` | `feat: 添加批量发布功能 (#5)` |
| 文档 | `docs: 描述 (#N)` | `docs: 更新安装说明 (#3)` |
| 重构 | `refactor: 描述 (#N)` | `refactor: 提取通用错误码 (#4)` |

### 12.3 关闭关键词

commit 推送后 GitHub 自动关闭关联 Issue，无需手动执行 `gh issue close`：

| 关键词 | 使用场景 | 示例 |
|--------|----------|------|
| `Close #N` | 通用关闭 | `Close #4` |
| `Fixes #N` | Bug 修复 | `Fixes #4` |
| `Resolves #N` | 功能/任务完成 | `Resolves #5` |

多条同时关闭：`Close #1, Close #4, Resolves #5`

> 注意：仅当 commit 合并到默认分支（`main`）时自动生效。

---

## 13. Orchestrator Agent 操作清单

### 13.1 打磨阶段

```
□ 监控打磨讨论中的决策信号
□ 确认 AI 创建的 Decision / Question / Risk Issue 质量
□ 确认结论已沉淀到关键文档后，关闭对应打磨工单
□ Gate 1 / Gate 2 审查时创建 Review Issue
□ 确保所有打磨工单在 Gate 2 通过前关闭
```

### 13.2 执行阶段日常管理

```
□ 检查新创建的 Issue，进行 triage（确认 Issue Type、标记依赖、分配）
□ 复杂 Issue 拆分为 Sub-issues，设置进度跟踪
□ 跟踪 in_progress Issue 的进展
□ 检查 blocked issues，超 24h 升级
□ 确保 resolved Issue 已被验证
□ 关闭已验证的 Issue
□ 每周同步 Issue 状态到 STATUS.md
```

### 13.3 验收后处理

```
□ 收集 Tester 的全部验收发现
□ 每个问题创建独立 Bug Issue（BUG-001, BUG-002...）
□ 设置 Issue Type 和优先级
□ 分配对应 Developer Agent
□ 在验收报告中记录 Issue 编号映射
□ 跟踪修复进度
□ 修复后安排 Tester 回归验证
□ 验证通过后关闭 Issue
```

### 13.4 发布前检查

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

## 14. 与 STATUS.md 的关系

| 维度 | GitHub Issues | STATUS.md |
|------|---------------|-----------|
| **定位** | 外部问题跟踪 | 内部项目总览 |
| **粒度** | 单个问题级别 | 里程碑/任务级别 |
| **受众** | 项目贡献者、用户 | Orchestrator Agent、开发者 |
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
| 关键文档说明 | [./05-deliverables.md](./05-deliverables.md) |
| 阶段门控清单 | [./04-checklists.md](./04-checklists.md) |
| AI 软件研发流程 | [./02-process.md](./02-process.md) |
| 下游同步指南 | [./09-downstream-sync-guide.md](./09-downstream-sync-guide.md) |

---

## 修订记录

| 版本 | 日期 | 修订内容 |
|------|------|----------|
| **v1.0** | 2026-05-28 | 重构为**双阶段Issue体系**：新增打磨族类型（Decision/Question/Risk/Review）和执行族类型（Feature/Bug/Task）；双生命周期模型；双看板设计（打磨看板+执行看板）；新增4个YAML Forms模板；新增AI决策记录协议（3轮门槛主动询问）；新增打磨→执行转换规则（文档为拆解依据，Issue只做追溯）；新增增量文档版本管理规范；补充AGENTS.md指令 |
| v0.4 | 2026-05-25 | §9 重构为 Commit 规范，新增 §9.1 提交前验收核验（读取→核验→勾选→闭环四步），原内容分拆为 §9.2 引用格式和 §9.3 关闭关键词 |
| v0.3 | 2026-05-25 | §5.2 任务完成检查新增自动触发机制、确认模式演进；§6 周检查清单调整 |
| v0.2 | 2026-05-24 | 升级 Issue 类型为原生 Bug/Feature/Task/Epic；新增 Sub-issues、Dependencies、Projects 集成章节；模板升级为 YAML Forms 规范；补充发布前检查 |
| v0.1 | 2026-05-24 | 初始版本：定义 Issue 类型、生命周期、创建规则、commit 规范、PM 操作清单 |
