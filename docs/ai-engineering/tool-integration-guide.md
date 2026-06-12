# Agent 使用指南

> Agent Usage Guide for Target Projects

**所属目录**：`ai-engineering/guide/`
**文档状态**：草稿
**当前版本**：v0.7
**发布日期**：2026-05-27
**来源仓库**：`lpreterite/ai-engineering`
**源文件路径**：`guide/08-tool-integration-guide.md`
> **Skill 引用**：非破坏性更新 → `skills/non-destructive-update`

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
| Orchestrator Agent | `orchestrator-agent.md` | 编排中枢 |
| PO Agent | `po-agent.md` | 需求分析、PRD 起草 |
| UI/UX Agent | `uiux-agent.md` | 用户方案设计 |
| Full-stack Developer Agent | `fullstack-developer.md` | 全栈技术实施（前端/后端/数据库/DevOps） |
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

参阅 **[下游同步指南](./09-downstream-sync-guide.md)**，包含完整的手动操作流程和自动化脚本。

### Q：如何为不同项目定制？

在指令文件（`CLAUDE.md` / `AGENTS.md`）中添加项目特定规则，这些规则优先于通用规范。例如：

```markdown
## 项目特定规则

- Full-stack Developer Agent 在本项目默认覆盖 DevOps（含容器化、CI/CD 配置）
- 跳过 Gate 2（本项目无设计阶段）
- 测试框架：Vitest（非默认 Jest）
```

---

## 6. 非破坏性更新机制

当规范库发布新版本时，下游项目可通过本机制实现增量升级，避免覆盖定制内容。

> **下游维护者**：推荐阅读 **[下游同步指南](./09-downstream-sync-guide.md)**，其中包含面向人工操作的逐步流程和自动化脚本。

### 6.1 架构概览

```
三层体系：
┌───────────────────────────────────────────────────────┐
│ 第一层：源文件 HEADER 元信息                           │
│  每个 guide/*.md 和 agents/*.md 标注来源仓库和文件路径 │
│  AI 据此反查来源版本                                   │
├───────────────────────────────────────────────────────┤
│ 第二层：MANIFEST 注册表                                │
│  下游 docs/ai-engineering/MANIFEST.json                │
│  记录所有已部署文件 + agent 角色文件的版本快照          │
├───────────────────────────────────────────────────────┤
│ 第三层：AI 四步更新协议                                │
│  版本比对 → 策略选择 → 三路合并 → 验证（含 agent）     │
└───────────────────────────────────────────────────────┘
```

更新范围包括：
- **规范文件**（`guide/*.md`）→ 物理复制到 `docs/ai-engineering/`
- **Agent 角色文件**（`agents/*.md`）→ 不复制，但记录版本，通知重新加载

### 6.2 MANIFEST 注册表

下游目标项目的 `docs/ai-engineering/MANIFEST.json` 记录部署状态：

```json
{
  "manifest_version": "1.0",
  "source": {
    "repository": "lpreterite/ai-engineering",
    "deployed_at": "2026-05-24T00:00:00Z"
  },
  "files": {
    "principles.md": {
      "source": "guide/01-principles.md",
      "version": "v0.7",
      "customized": false,
      "previous_version": null
    },
    "collaboration.md": {
      "source": "guide/03-collaboration.md",
      "version": "v0.2",
      "customized": true,
      "previous_version": "v0.1",
      "category": "guide"
    },
    "orchestrator-agent.md": {
      "source": "agents/orchestrator-agent.md",
      "version": "v0.5",
      "customized": false,
      "previous_version": null,
      "category": "agent"
    },
    "tester-agent.md": {
      "source": "agents/tester-agent.md",
      "version": "v0.3",
      "customized": false,
      "previous_version": null,
      "category": "agent"
    }
  }
}
```

#### 字段说明

| 字段 | 说明 |
|------|------|
| `manifest_version` | MANIFEST 格式版本，用于兼容性判断 |
| `source.repository` | 源仓库标识 |
| `source.deployed_at` | 部署/最近更新时间（ISO 8601） |
| `files.<name>.source` | 对应的源文件路径，用于版本比对 |
| `files.<name>.version` | 当前部署版本号 |
| `files.<name>.customized` | 下游是否定制过此文件 |
| `files.<name>.previous_version` | 更新前的版本号，用于回滚 |
| `files.<name>.category` | 文件分类：`guide`（规范文件）或 `agent`（角色定义，不物理复制） |

#### .gitignore 策略

建议将 `.backups/` 目录加入 `.gitignore`，避免备份文件污染仓库：

```gitignore
docs/ai-engineering/.backups/
```

MANIFEST.json **应纳入版本管理**，确保所有开发者共享一致的版本记录。

### 6.3 AI 四步更新协议

更新范围包括两类文件：

| 分类 | 源路径 | 目标位置 | 操作方式 |
|------|--------|----------|----------|
| 规范文件 | `guide/*.md` | `docs/ai-engineering/` | 物理复制，支持三路合并 |
| Agent 角色 | `agents/*.md` | 不复制（`{file:...}` 引用） | 仅版本比对 + 通知重新加载 |

```
步骤 1：版本比对
  ├─ 读取源仓库 RELEASE.json，获取所有文件最新版本号（一次读取）
  ├─ 读取下游 MANIFEST.json，获取当前部署版本快照
  ├─ 逐文件比对 RELEASE.json vs MANIFEST.json 版本号
  │  ├─ category: "guide" → 后续走完整更新流程
  │  └─ category: "agent" → 仅标记过期，通知重新加载
  └─ 标记过期文件清单（含 agent 过期清单）

步骤 2：策略选择（逐文件判定）
  ├─ 文件未在 MANIFEST 中记录（新增）→ 直接复制
  ├─ 未定制（customized: false）→ 覆盖源新版
  ├─ 已定制（customized: true）→ 三路合并
  ├─ category: "agent" → 跳过合并，仅记录版本
  └─ 已删除（MANIFEST 有记录但文件不存在）→ 跳过，标记异常

步骤 3：三路合并（仅 category: "guide" 且 customized: true 的文件）
  ├─ 输入：源旧版（Base）/ 源新版（Theirs）/ 下游定制版（Ours）
  ├─ AI 自动合并
  └─ 冲突无法自动解决 → 标记冲突行，挂起等待人工裁决

步骤 4：验证
  ├─ 结构完整性检查（标题层级、列表闭合）
  ├─ 引用有效检查（文档间交叉引用路径）
  ├─ MANIFEST 更新：version → 新版号，previous_version → 旧版号
  ├─ Agent 版本更新：更新 MANIFEST 中 category: "agent" 条目版本号
  ├─ 输出 Agent 变更摘要，提示用户重新初始化 subagent（退出会话重新调用）
  └─ 输出更新摘要
```

### 6.4 三路合并细则

#### 合并规则

| Base | Theirs（源新版） | Ours（下游定制） | 结果 |
|------|-----------------|-----------------|------|
| A | A | A | A（无冲突） |
| A | B | A | B（源升级） |
| A | A | B | B（保留定制） |
| A | B | C | ⚠️ 冲突，标记人工裁决 |
| A | B | B | B（双方一致） |

#### 冲突检测

以下情况判定为冲突：
- **行级冲突**：同一行 Base 不同、Theirs 和 Ours 也不同
- **结构冲突**：一方增删了章节，另一方修改了同章节内容
- **引用冲突**：交叉引用的目标文件被重命名或删除

#### 冲突升级路径

```
AI 自动合并
  ├─ 无冲突 → 直接写入
  ├─ 低风险冲突（格式/措辞微调）→ AI 裁决，MANIFEST 记录 auto_resolved
  └─ 高风险冲突（结构变更/逻辑矛盾）→ 挂起，在文件中标记 >>>CONFLICT<<<
      → 升级人类处理
      → 人工处理后更新 MANIFEST customized 状态
```

#### 批量更新执行顺序

```
1. 新增文件（未在 MANIFEST 中）→ 复制，无需合并
2. 未定制文件（customized: false）→ 覆盖，风险最低
3. 已定制文件（customized: true）→ 三路合并，逐个处理
4. 已删除文件 → 跳过并记录
5. 最后更新 MANIFEST.json
```

### 6.5 回滚机制

每次更新前，AI 自动执行：

```
1. 将要被覆盖或合并的文件备份到 docs/ai-engineering/.backups/{timestamp}/
2. 更新 MANIFEST 时保留 previous_version
3. 回滚命令：
   cp .backups/{timestamp}/<file>  ../<file>
   并将 MANIFEST 中该文件 version 恢复为 previous_version
```

### 6.6 集成检查清单补充

```
□ docs/ai-engineering/MANIFEST.json 已创建并记录所有文件（含 guide + agent）
□ .gitignore 已添加 docs/ai-engineering/.backups/
□ MANIFEST 中 category: "agent" 条目版本号与 RELEASE.json 一致
□ 过期 agent 清单已通知维护者，用户已重新初始化 subagent 会话
```

### 6.7 实战操作手册 — 下游仓库更新规范

以下步骤供下游项目 Orchestrator Agent 或维护者执行规范文件升级。

#### 前置条件

- 下游项目已部署 `docs/ai-engineering/MANIFEST.json`（初始部署见 [setup.md](../setup.md)）
- 能访问源仓库（直接 clone、submodule 或本地路径）

#### 更新步骤

```
Step 0：确认当前状态
  ├─ 检查 docs/ai-engineering/MANIFEST.json 是否存在且格式正确
  └─ 确认源仓库代码最新：git pull 或 git submodule update --remote

Step 1：获取源端版本快照
  ├─ 读取源仓库 RELEASE.json（一次获取所有文件最新版本）
  ├─ 与下游 MANIFEST.json 逐文件比对，生成过期清单
  │  ├─ category: "guide" → 标记待更新
  │  └─ category: "agent" → 标记过期，输出 Agent 变更摘要
  └─ 输出过期摘要（含 guide + agent）

Step 2：备份
  ├─ mkdir -p docs/ai-engineering/.backups/$(date +%Y%m%d%H%M%S)
  └─ 将 docs/ai-engineering/ 中所有 .md 文件备份到该目录

Step 3：按策略更新（逐文件）
  ├─ 未在 MANIFEST 中的文件 → cp 源新版文件到 docs/ai-engineering/
  ├─ customized=false → cp 源新版文件直接覆盖
  ├─ customized=true  → 三路合并（见下文合并操作）
  ├─ category: "agent" → 跳过文件操作，仅记录版本
  └─ MANIFEST 有记录但本地已删除 → 跳过，标记异常

Step 4：三路合并操作（仅 category: "guide" 且 customized=true 的文件）
  ├─ Base = MANIFEST 中 previous_version 对应的源旧版
  │   （需从 git history 或备份中获取旧版）
  ├─ Theirs = 源新版文件（当前 guide/ 中的版本）
  ├─ Ours = 下游当前文件（docs/ai-engineering/ 中的版本）
  └─ AI 执行合并：
       ├─ Base=Theirs=Ours → 不变
       ├─ Base≠Theirs, Base=Ours → 取 Theirs（源升级）
       ├─ Base=Theirs, Base≠Ours → 取 Ours（保留定制）
       ├─ Base≠Theirs≠Ours 且不同行 → 智能合并
       └─ Base≠Theirs≠Ours 且同行 → 标记 >>>CONFLICT<<< 挂起人工

Step 5：验证
  ├─ 检查文件结构完整（标题层级、列表闭合）
  ├─ 检查交叉引用有效（相对路径不断裂）
  ├─ 更新 MANIFEST.json：
  │  ├─ category: "guide" → version→新版号，previous_version→旧版号
  │  └─ category: "agent" → version→新版号（文件操作跳过）
  ├─ 输出 Agent 变更摘要（过期清单 + 变化内容简介）
  └─ 通知 Orchestrator Agent 确认无异常，并提示用户重新初始化 subagent

Step 6：提交 + 通知
  ├─ git add docs/ai-engineering/ && git commit -m "chore: 更新 AI 研发规范至 v<版本号>"
  └─ 向用户输出 subagent 更新提示：
     「agents/ 目录角色文件已更新，请退出当前会话后重新调用 @agent 名称 以加载新定义」
```

#### 冲突处理流程

当 `>>>CONFLICT<<<` 标记出现时：

```
1. AI 在 MANIFEST 中记录冲突文件清单
2. AI 在验收报告或 Issue 中通知人类
3. 人类处理冲突：
   ├─ 打开冲突文件，搜索 >>>CONFLICT
   ├─ 审阅 Base / Theirs / Ours 三方差异
   ├─ 手动编辑保留正确内容，移除冲突标记
   └─ 提交修复
4. 人工处理后，AI 更新 MANIFEST 中 conflicted 标记为 false
```

#### 完整命令速查

```bash
# 1. 更新源仓库代码（submodule 方式）
git submodule update --remote vendor/ai-engineering

# 2. 备份当前规范文件
BACKUP_DIR="docs/ai-engineering/.backups/$(date +%Y%m%d%H%M%S)"
mkdir -p "$BACKUP_DIR"
cp docs/ai-engineering/*.md "$BACKUP_DIR/"

# 3. 查看过期清单（含 guide + agent）
python3 -c "
import json
with open('vendor/ai-engineering/RELEASE.json') as s, \\
     open('docs/ai-engineering/MANIFEST.json') as d:
    src = json.load(s)
    dst = json.load(d)
for fname, sver in src['files'].items():
    lname = fname.replace('guide/', '').replace('agents/', '')
    entry = dst['files'].get(lname, {})
    dver = entry.get('version', 'N/A')
    cat = entry.get('category', 'unknown')
    if sver != dver:
        icon = '🤖' if cat == 'agent' else '📦'
        print(f'{icon} [{cat}] {lname}: {dver} → {sver}')
        if cat == 'agent':
            print(f'   → 提示：agent 文件不物理复制，更新 MANIFEST 版本后需重新初始化 subagent')
"

# 4. 覆盖未定制文件
python3 -c "
import json
with open('docs/ai-engineering/MANIFEST.json') as f:
    m = json.load(f)
for name, info in m['files'].items():
    if not info['customized']:
        print(f'cp vendor/ai-engineering/{info[\"source\"]} docs/ai-engineering/{name}')
"

# 5. 更新 MANIFEST 版本号（含 guide + agent）
python3 -c "
import json
with open('vendor/ai-engineering/RELEASE.json') as s, \\
     open('docs/ai-engineering/MANIFEST.json') as f:
    src = json.load(s)
    dst = json.load(f)
for fname, sver in src['files'].items():
    lname = fname.replace('guide/', '').replace('agents/', '')
    if lname in dst['files'] and not dst['files'][lname].get('conflict'):
        dst['files'][lname]['previous_version'] = dst['files'][lname]['version']
        dst['files'][lname]['version'] = sver
with open('docs/ai-engineering/MANIFEST.json', 'w') as f:
    json.dump(dst, f, indent=2)
    f.write('\n')
print('MANIFEST 更新完成。如有 agent 版本变更，请重新初始化 subagent 会话。')
"
```

---

## 附录：相关文档

| 文档 | 路径 |
|------|------|
| Repo 目录初始化指南 | [./07-repo-directory-guide.md](./07-repo-directory-guide.md) |
| 下游同步指南 | [./09-downstream-sync-guide.md](./09-downstream-sync-guide.md) |
| Agent 角色总览 | [../agents/README.md](../agents/README.md) |
| Claude Code 安装指南 | [../setup/claude-code.md](../setup/claude-code.md) |
| OpenCode 安装指南 | [../setup/opencode.md](../setup/opencode.md) |
| Codex CLI 安装指南 | [../setup/codex.md](../setup/codex.md) |

---

## 修订记录

| 版本 | 日期 | 修订内容 |
|------|------|----------|
| v0.7 | 2026-05-27 | §6 扩展更新范围至 subagent：MANIFEST 新增 category 字段和 agent 示例，四步协议增加 agent 分支处理，实战手册增加 agent 版本比对和重新初始化引导 |
| v0.6 | 2026-05-24 | §6.7 新增实战操作手册，含步骤详解、冲突处理流程和命令速查 |
| v0.5 | 2026-05-24 | §6.3 协议步骤 1 改为 RELEASE.json 优先比对 |
| v0.4 | 2026-05-24 | 新增第 6 章「非破坏性更新机制」：MANIFEST 注册表、AI 四步更新协议、三路合并细则、回滚机制 |
| v0.3 | 2026-04-04 | 修正规范来源目录为 guide/，FAQ 同步说明区分部署方式 |
| v0.2 | 2026-04-04 | 重写：定位为目标项目 Agent 使用指南，工具配置拆分到 setup/ |
| v0.1 | 2026-04-04 | 初始版本 |
