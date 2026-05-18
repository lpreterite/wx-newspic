# Agent 使用指南

> Agent Usage Guide for Target Projects

**所属目录**：`ai-engineering/guide/`
**文档状态**：草稿
**当前版本**：v0.3
**发布日期**：2026-04-04

---

## 1. 概述

本指南面向目标项目的 Agent，说明如何在项目中接入 AI 软件研发工程体系。

接入分两步：

```
步骤 1：部署研发规范 → 将 guide/ 规则文件复制到目标项目 docs/ 目录
步骤 2：安装 Agent 角色 → 将 agents/ 角色文件配置到 AI 编程工具
```

---

## 2. 步骤 1：部署研发规范

将 `guide/` 目录中的 6 个规范文件复制到目标项目的 `docs/ai-engineering/` 目录：

```bash
mkdir -p docs/ai-engineering
cp guide/01-principles.md          docs/ai-engineering/principles.md
cp guide/02-process.md             docs/ai-engineering/process.md
cp guide/03-collaboration.md       docs/ai-engineering/collaboration.md
cp guide/04-checklists.md          docs/ai-engineering/checklists.md
cp guide/05-deliverables.md        docs/ai-engineering/deliverables.md
cp guide/06-document-management.md docs/ai-engineering/document-management.md
```

部署后的目标项目结构：

```
target-project/
└── docs/
    └── ai-engineering/
        ├── principles.md          # 核心原则（必选）
        ├── process.md             # 研发流程（必选）
        ├── collaboration.md       # 协作协议（必选）
        ├── checklists.md          # 检查清单（可选）
        ├── deliverables.md        # 产出物要求（可选）
        └── document-management.md # 文档管理（可选）
```

> **最小部署**：至少复制前 3 个文件即可启用基本协作规范。

同时按照 `guide/07-repo-directory-guide.md` 初始化其他 `docs/` 子目录。

---

## 3. 步骤 2：安装 Agent 角色

Agent 角色定义保留在 `ai-engineering/agents/` 目录中，**不复制到目标项目**。AI 编程工具通过路径引用直接读取角色文件。

### 角色清单

| 角色 | 文件（ai-engineering/agents/） | 说明 |
|------|------|------|
| PM Agent | `pm-agent.md` | 项目协调中枢 |
| PO Agent | `po-agent.md` | 需求分析、PRD 起草 |
| UI/UX Agent | `uiux-agent.md` | 用户方案设计 |
| Developer Agent | `developer-agent.md` | 技术实施 |
| Tester Agent | `tester-agent.md` | 测试执行 |

### 安装方式（按工具选择）

根据目标项目使用的 AI 编程工具，参照对应的安装指南：

| 工具 | 安装指南 |
|------|----------|
| Claude Code | [setup/claude-code.md](../setup/claude-code.md) |
| OpenCode | [setup/opencode.md](../setup/opencode.md) |
| Codex CLI | [setup/codex.md](../setup/codex.md) |

---

## 4. 集成检查清单

完成部署后，确认以下事项：

```
□ docs/ai-engineering/ 目录已创建并包含规则文件（至少 principles、process、collaboration）
□ docs/STATUS.md 已写入初始内容
□ docs/README.md 已写入文档索引
□ 已按 07-repo-directory-guide.md 初始化 docs/ 子目录
□ 已选择目标 AI 编程工具并按对应 setup/ 指南完成配置
□ AI 工具能正确引用 ai-engineering/agents/ 中的角色文件
```

---

## 5. 常见问题

### Q：三种工具能否同时使用？

可以。`AGENTS.md` 和 `CLAUDE.md` 可以共存于同一项目。OpenCode 和 Codex 读取 `AGENTS.md`；Claude Code 读取 `CLAUDE.md`。

### Q：规范库更新后如何同步？

- **手动复制**：重新从 `guide/` 复制更新后的文件到 `docs/ai-engineering/`
- **Git Submodule**：`git submodule update --remote` 后，从 `vendor/ai-engineering/guide/` 重新复制
- **脚本自动化**：可编写部署脚本自动同步

### Q：如何为不同项目定制？

在指令文件（`CLAUDE.md` / `AGENTS.md`）中添加项目特定规则，这些规则优先于通用规范。例如：

```markdown
## 项目特定规则

- Developer Agent 在本项目额外负责 DevOps
- 跳过 Gate 2（本项目无设计阶段）
- 测试框架：Vitest（非默认 Jest）
```

---

## 附录：相关文档

| 文档 | 路径 |
|------|------|
| Repo 目录初始化指南 | [./07-repo-directory-guide.md](./07-repo-directory-guide.md) |
| Agent 角色总览 | [../agents/README.md](../agents/README.md) |
| Claude Code 安装指南 | [../setup/claude-code.md](../setup/claude-code.md) |
| OpenCode 安装指南 | [../setup/opencode.md](../setup/opencode.md) |
| Codex CLI 安装指南 | [../setup/codex.md](../setup/codex.md) |

---

## 修订记录

| 版本 | 日期 | 修订内容 |
|------|------|----------|
| v0.3 | 2026-04-04 | 修正规范来源目录为 guide/，FAQ 同步说明区分部署方式 |
| v0.2 | 2026-04-04 | 重写：定位为目标项目 Agent 使用指南，工具配置拆分到 setup/ |
| v0.1 | 2026-04-04 | 初始版本 |
