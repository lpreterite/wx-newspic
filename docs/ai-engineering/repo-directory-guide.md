# Repo 目录初始化指南

> Repository Directory Initialization Guide for Agents

**所属目录**：`ai-engineering/guide/`
**文档状态**：草稿
**当前版本**：v0.1
**发布日期**：2026-04-04

---

## 1. 概述

本文档指导 Agent 在接手新项目时，按照 AI 软件研发工程体系的规范初始化 Repo 目录结构。Agent 应将本规范写入目标 Repo 的 `docs/` 目录中，作为项目文档管理的执行依据。

---

## 2. 初始化流程

### 2.1 前置条件

在执行目录初始化前，Agent 应确认：

```
□ 已了解项目类型（Web 应用 / 移动端 / API 服务 / 其他）
□ 已获得 Product Owner 确认的项目名称
□ 已确认技术栈（影响工程文档目录结构）
```

### 2.2 执行步骤

```
步骤 1：创建顶层 docs/ 目录
步骤 2：创建各子目录
步骤 3：写入 STATUS.md
步骤 4：写入 README.md（文档索引）
步骤 5：创建占位文件（确保目录结构可被 Git 追踪）
步骤 6：验证目录结构完整性
```

---

## 3. 标准目录结构

### 3.1 完整结构

```
docs/
├── STATUS.md                      # 项目状态卡（PM Agent 核心输入/输出）
├── README.md                      # 项目文档索引
│
├── product/                       # 产品相关文档
│   ├── PRD.md                     # 产品需求文档
│   └── user-stories.md           # 用户故事
│
├── engineering/                   # 工程实现文档
│   ├── technical-spec.md          # 技术规格
│   └── architecture.md            # 架构设计
│
├── design/                        # 设计文档
│   ├── design-system.md           # 设计系统
│   ├── page-design.md            # 页面设计
│   └── files/                    # 设计资源文件
│
├── project-management/            # 项目管理文档
│   ├── project-plan.md           # 项目计划
│   ├── milestones.md             # 里程碑规划
│   └── risk-management.md        # 风险管理
│
└── project-tasks/                 # 任务跟踪（按周组织）
    └── README.md                  # 任务目录索引
```

### 3.2 目录用途说明

| 目录 | 用途 | 维护者 | 创建时机 |
|------|------|--------|----------|
| `docs/` | 所有文档的根目录 | PM Agent | 项目初始化时 |
| `docs/product/` | PRD、用户故事等需求文档 | PO Agent | 打磨阶段开始时 |
| `docs/engineering/` | 技术规格、架构设计 | Developer Agent | Gate 1 通过后 |
| `docs/design/` | 设计系统、页面设计、资源文件 | UI/UX Agent | Gate 1 通过后 |
| `docs/project-management/` | 项目计划、里程碑、风险管理 | PM Agent | 项目初始化时 |
| `docs/project-tasks/` | 按周组织的任务和问题跟踪 | PM Agent | 执行阶段开始时 |

---

## 4. 各文件初始化内容

### 4.1 STATUS.md

```markdown
# {项目名称}｜状态卡

> **Last Updated**：{YYYY-MM-DD}

---

## 概览

**{项目名称}** — {一句话描述}

**当前阶段**：{打磨阶段 / 执行阶段 / 交付阶段}

---

## 里程碑

- [ ] {里程碑 1}
- [ ] {里程碑 2}

---

## 阻塞项

暂无

---

## 最近更新

```
{YYYY-MM-DD} 项目初始化
```
```

### 4.2 README.md

```markdown
# {项目名称} 文档

## 文档索引

| 文档 | 路径 | 说明 |
|------|------|------|
| 项目状态卡 | [STATUS.md](./STATUS.md) | 当前状态、里程碑、阻塞项 |
| PRD | [product/PRD.md](./product/PRD.md) | 产品需求文档 |
| 技术规格 | [engineering/technical-spec.md](./engineering/technical-spec.md) | 技术实现方案 |
| 架构设计 | [engineering/architecture.md](./engineering/architecture.md) | 系统架构 |
| 设计系统 | [design/design-system.md](./design/design-system.md) | UI 设计规范 |
| 里程碑 | [project-management/milestones.md](./project-management/milestones.md) | 阶段规划 |
```

### 4.3 project-tasks/README.md

```markdown
# 任务跟踪

按周组织，每周创建一个 `W{nn}/` 目录。

## 命名规则

- 目录名：`W{nn}`（如 W01、W02、W10）
- 合并周：`W06-W07`

## 每周目录结构

```
W{nn}/
├── STATUS.md         # 周状态
├── tasklist.md       # 任务清单
├── review.md         # 验收报告
└── problems/         # 问题记录
```
```

---

## 5. 命名规范

### 5.1 目录命名

| 规则 | 示例 |
|------|------|
| 使用 kebab-case | `project-tasks/`, `risk-management/` |
| 禁止使用空格和中文 | ✗ `项目文档/` ✗ `project tasks/` |

### 5.2 文件命名

| 规则 | 示例 |
|------|------|
| 使用 kebab-case | `task-list.md`, `risk-management.md` |
| 大写用于特殊文件 | `STATUS.md`, `README.md`, `PRD.md` |
| 周目录使用 W 前缀 | `W01/`, `W06-W07/` |

### 5.3 资源文件命名

| 规则 | 示例 |
|------|------|
| 使用 kebab-case | `logo-dark.png`, `icon-home.svg` |
| 图片放 `files/` 或 `assets/` | `design/files/`, `assets/images/` |

---

## 6. 目录维护规则

### 6.1 触发条件

| 事件 | 操作 | 执行者 |
|------|------|--------|
| 项目初始化 | 创建完整 `docs/` 目录结构 | PM Agent |
| 进入打磨阶段 | 创建 `product/PRD.md` | PO Agent |
| Gate 1 通过 | 创建 `engineering/` 和 `design/` 目录内容 | Developer Agent / UI/UX Agent |
| 进入执行阶段 | 创建 `project-tasks/W{nn}/` | PM Agent |
| 每周开始 | 创建新的 `W{nn}/` 目录 | PM Agent |
| 里程碑完成 | 更新 `STATUS.md` | PM Agent |

### 6.2 禁止操作

| 禁止 | 原因 |
|------|------|
| 删除 `STATUS.md` | 项目核心状态文件 |
| 修改目录命名规范 | 影响所有 Agent 的路径引用 |
| 在 `docs/` 外创建文档目录 | 保持文档集中管理 |

---

## 7. 验证检查清单

Agent 完成目录初始化后，应执行以下检查：

```
□ docs/ 目录已创建
□ docs/STATUS.md 已写入初始内容
□ docs/README.md 已写入文档索引
□ docs/product/ 目录已创建
□ docs/engineering/ 目录已创建
□ docs/design/ 目录已创建
□ docs/design/files/ 目录已创建
□ docs/project-management/ 目录已创建
□ docs/project-tasks/ 目录已创建
□ docs/project-tasks/README.md 已写入
□ 所有空目录已添加 .gitkeep 或占位文件
□ 目录命名符合 kebab-case 规范
```

---

## 附录：相关文档

| 文档 | 路径 |
|------|------|
| 文档目录结构（参考） | [../reference/directory.md](../reference/directory.md) |
| 文档管理规范 | [./06-document-management.md](./06-document-management.md) |
| 关键文档说明 | [./05-deliverables.md](./05-deliverables.md) |

---

## 修订记录

| 版本 | 日期 | 修订内容 |
|------|------|----------|
| v0.1 | 2026-04-04 | 初始版本 |
