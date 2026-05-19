# Issue 工作流

> Issue Workflow

**所属目录**：`ai-engineering/`
**文档状态**：草稿
**当前版本**：v0.1
**发布日期**：2026-05-19

---

## 1. 概述

本文档定义项目中 Issue（工单）的完整生命周期管理规范，覆盖创建、分配、跟踪、关闭全流程。Issue 系统使用 **GitHub Issues** 作为持久化载体，与 `docs/STATUS.md` 的内部任务跟踪互补。

**核心原则**：每个需要追踪的问题只有一个记录来源——GitHub Issue。

---

## 2. Issue 类型与标签

### 2.1 类型

| 类型 | 说明 | GitHub Label |
|------|------|-------------|
| **Bug** | 功能缺陷或行为异常 | `bug` |
| **Enhancement** | 功能改进或新需求 | `enhancement` |
| **Docs** | 文档缺失或错误 | `docs` |
| **Question** | 使用疑问或咨询 | `question` |

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
| **open** | 创建者 | 提交 Issue，自动打类型标签 |
| **triaged** | PM Agent | 确认问题有效，设置优先级和标签，分配负责人 |
| **in_progress** | Developer | 开始处理，关联分支或 commit |
| **resolved** | Developer | 提交修复，PR 关联 Issue，等待验证 |
| **verified** | Tester Agent | 验证修复有效，回归无新问题 |
| **closed** | PM Agent | 验证通过后关闭，在 STATUS.md 中同步 |

---

## 4. 谁在什么时机创建 Issue

| 角色 | 时机 | 创建类型 |
|------|------|----------|
| **Tester Agent** | 测试发现缺陷，在 `bug_reported` 消息中上报给 PM | 由 PM 代为创建 Bug Issue |
| **PM Agent** | 收到 Tester 上报、验收发现问题、用户反馈 | Bug / Enhancement |
| **PO Agent** | 需求分析中识别出新功能或改进点 | Enhancement |
| **Developer** | 开发过程中发现预想不到的问题或改进机会 | Bug / Enhancement |
| **用户** | 直接通过 GitHub Issues 提交 | 自动创建 |

### 4.1 验收发现→Issue 映射规则

Tester 完成验收发现问题后，PM Agent 执行以下操作：

1. 每个独立问题创建一个 Issue
2. Issue 标题使用 `BUG-NNN: 简短描述` 格式（BUG-001, BUG-002...）
3. 验收报告中对应的 BUG-ID 在 Issue 正文中引用
4. 设置正确的类型标签和优先级标签
5. 分配对应 Developer
6. 在验收报告中注明对应的 Issue 编号

---

## 5. Issue 内容模板

### 5.1 Bug Report

```markdown
### 问题描述
[一句话描述问题]

### 复现步骤
1. [操作步骤 1]
2. [操作步骤 2]
3. [操作步骤 3]

### 预期行为
[应该发生什么]

### 实际行为
[实际发生了什么]

### 环境信息
- OS: [操作系统]
- Node.js: [版本]
- 版本: [项目版本]

### 证据
- 日志: [如有]
- 截图: [如有]

### 对应验收项
- BUG-ID: BUG-NNN
- 发现时间: [timestamp]
```

### 5.2 Enhancement / Feature Request

```markdown
### 动机
[为什么需要这个功能？解决了什么痛点？]

### 方案描述
[建议怎么做]

### 替代方案
[其他考虑过的方案]

### 验收标准
- [ ] [标准 1]
- [ ] [标准 2]
```

---

## 6. Commit 引用规范

所有代码变更必须在 commit message 中引用关联的 Issue 编号：

| 变更类型 | Commit 格式 | 示例 |
|----------|------------|------|
| 修复 Bug | `fix: 描述 (#N)` | `fix: 统一 .env 键名 APP_ID/APP_SECRET (#1)` |
| 新功能 | `feat: 描述 (#N)` | `feat: 添加批量发布功能 (#5)` |
| 文档 | `docs: 描述 (#N)` | `docs: 更新安装说明 (#3)` |
| 重构 | `refactor: 描述 (#N)` | `refactor: 提取通用错误码 (#4)` |

关闭 Issue 使用 `close #N` 或 `fix #N` 关键词。

---

## 7. PM Agent 操作清单

在项目执行过程中，PM Agent 按以下清单管理 Issue：

### 7.1 日常管理

```
□ 检查新创建的 Issue，进行 triage（确认、标记、分配）
□ 跟踪 in_progress Issue 的进展
□ 确保 resolved Issue 已被验证
□ 关闭已验证的 Issue
□ 每周同步 Issue 状态到 STATUS.md
```

### 7.2 验收后处理

```
□ 收集 Tester 的全部验收发现
□ 每个问题创建独立 Issue（BUG-001, BUG-002...）
□ 设置标签和优先级
□ 分配对应 Developer
□ 在验收报告中记录 Issue 编号映射
□ 跟踪修复进度
□ 修复后安排 Tester 回归验证
□ 验证通过后关闭 Issue
```

### 7.3 发布前检查

```
□ 所有 P0/P1 Issue 均已关闭或已验证
□ P2 Issue 已记录已知问题清单
□ STATUS.md 与 Issue 状态一致
□ 发布说明（Release Notes）包含 Issue 列表
```

---

## 8. 与 STATUS.md 的关系

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
| v0.1 | 2026-05-19 | 初始版本：定义 Issue 类型、生命周期、创建规则、commit 规范、PM 操作清单 |
