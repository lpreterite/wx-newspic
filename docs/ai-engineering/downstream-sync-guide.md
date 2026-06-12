# 下游同步指南

> Downstream Sync Guide

**所属目录**：`ai-engineering/guide/`
**文档状态**：草稿
**当前版本**：v0.3
**发布日期**：2026-05-30
**来源仓库**：`lpreterite/ai-engineering`
**源文件路径**：`guide/09-downstream-sync-guide.md`
> **Skill 引用**：下游同步 → `skills/downstream-sync`

---

## 1. 概述

本指南面向**下游仓库维护者**，说明当上游规范库（`lpreterite/ai-engineering`）发布新版本时，如何无破坏性地同步更新，在获取上游改进的同时保留下游的定制内容。

### 解决的问题

| 场景 | 问题 | 本指南的解法 |
|------|------|-------------|
| 上游更新了规范内容 | 直接覆盖会丢失下游定制 | 三路合并 + 定制标记 |
| 下游修改了规范文件 | 升级后定制内容被冲掉 | `customized` 标记保护 |
| 多个下游项目各自有定制 | 同步操作易出错 | 自动化脚本 + MANIFEST 版本追踪 |
| Agent 文件变更 | 下游不知情导致版本滞后 | 版本比对 + 自动通知 |

> **不同工具的完整同步流程**：参见对应工具的安装指南中「同步更新」章节
> - OpenCode → `setup/opencode.md §10`
> - Claude Code → `setup/claude-code.md §8`
> - Codex CLI → `setup/codex.md §9`

---

## 2. 定制最佳实践（冲突预防）

在开始同步之前，遵循以下最佳实践可以显著减少未来的合并冲突。

### 2.1 使用定制标记包围自定义内容

在下游修改规范文件时，用 `DOWNSTREAM-BEGIN` / `DOWNSTREAM-END` 标记标注定制区域：

```markdown
## 2. 研发流程

<!-- DOWNSTREAM-BEGIN: 本项目增加了 Code Review 阶段 -->
### 2.5 Code Review

本项目要求所有 PR 必须经过至少一名维护者 Review 后方可合并。
<!-- DOWNSTREAM-END -->
```

上游更新时，AI 能自动识别标记区间，避免在这些区域内覆盖。

### 2.2 上游核心域尽量不改

`HEADER` 元信息区块（文档状态、版本号、来源仓库等）是**上游核心域**，尽量不要修改。如需标记，请在 HEADER 之后追加定制行：

```markdown
**来源仓库**：`lpreterite/ai-engineering`
**源文件路径**：`guide/02-process.md`
<!-- 下游定制：本项目的节点负责人列表 -->
**下游定制说明**：详见 MANIFEST.customized_reason
```

### 2.3 定制内容放在独立小节

尽量通过**新增章节**而非**修改上游章节**的方式定制：

| 推荐做法 | 避免做法 |
|----------|----------|
| 新增 `## 8. 本项目特定规则` | 修改 `## 2. 研发流程` 中的内容 |
| 在末尾追加附录 | 删除上游定义的阶段 |
| 用补充说明扩展上游定义 | 改写上游的核心定义段落 |

### 2.4 记录定制原因

在 `MANIFEST.json` 中，为 `customized: true` 的文件添加 `customized_reason` 字段：

```json
{
  "collaboration.md": {
    "source": "guide/03-collaboration.md",
    "version": "v0.2",
    "customized": true,
    "customized_reason": "增加了微信通知集成章节",
    "previous_version": "v0.1",
    "category": "guide"
  }
}
```

---

## 3. 更新触发时机

下游仓库可以选择以下方式获知上游更新：

| 方式 | 说明 |
|------|------|
| **GitHub Watch** | Watch 源仓库，选择「Releases only」接收发版通知 |
| **定期检查 STATUS.md** | 查看上游 [STATUS.md](../STATUS.md) 了解最新版本 |
| **CI 自动检测** | 在 CI 中定期运行 `downstream-sync.sh --dry-run` |
| **Git Submodule** | 配合 `git submodule update --remote` 感知变化 |

---

## 4. 冲突场景与处理

以下是在实践中可能遇到的五种场景及处理方式。

### 场景 A：上游新增文件

**特征**：源仓库增加了新的规范文件，MANIFEST 中无记录。  
**处理**：直接复制到目标目录，在 MANIFEST 中新增条目。  
**风险**：低。

### 场景 B：上游修改了你未改的文件

**特征**：文件版本号变化，但 `customized: false`。  
**处理**：直接覆盖。  
**风险**：低。

### 场景 C：上游修改了你改过的文件

**特征**：`customized: true` 且版本号变化。  
**处理**：三路合并（见下文）。  
**风险**：中。行级无冲突可自动合并；同行冲突需人工裁决。

**真实示例**（process.md 定制冲突）：

```
上游新版（Theirs）：
## 2.3 开发阶段
- 编码完成后需运行单元测试
- 通过测试后提交 PR

下游定制版（Ours）：
## 2.3 开发阶段
- 编码完成后需运行单元测试
- 测试覆盖率需 ≥ 80%
- 通过测试后提交 PR
- 需通过 SonarQube 质量门禁

三路合并结果（自动合并成功）：
## 2.3 开发阶段
- 编码完成后需运行单元测试
- 测试覆盖率需 ≥ 80%          （保留定制）
- 通过测试后提交 PR
- 需通过 SonarQube 质量门禁    （保留定制）
```

### 场景 D：上游删除了你改过的文件

**特征**：MANIFEST 有记录且 `customized: true`，但上游已删除源文件。  
**处理**：跳过更新，标记为孤立异常，人工决策：

| 选项 | 操作 |
|------|------|
| 保留下游版本 | 继续使用当前版本，在 MANIFEST 中标记 `orphaned: true` |
| 跟随删除 | 删除文件，从 MANIFEST 移除条目 |
| 替换为其他上游文件 | 手动调整引用关系 |

### 场景 E：Agent 角色文件变更

**特征**：`category: "agent"` 的文件版本号变化。  
**处理**：不物理复制文件，仅更新 MANIFEST 中的版本号，通知使用者重新初始化 subagent 会话。

```
📢 Agent 文件已更新，请退出当前会话后重新调用 @agent 名称 以加载新定义
```

---

## 5. 逐步操作流程

### 前置条件

- [ ] 下游项目已部署 `docs/ai-engineering/MANIFEST.json`
- [ ] 能访问源仓库（直接 clone、submodule 或本地路径）
- [ ] 已安装 `diff3` 命令（用于三路合并，macOS/Linux 默认包含）

### 更新步骤

```
Step 0：确定同步范围
  ├─ 识别目标工具（OpenCode / Claude Code / Codex CLI）
  ├─ 读取对应工具的 setup 文档「同步更新」章节获取全量范围
  ├─ 检查 MANIFEST.json 是否存在且格式正确
  ├─ 确保 git 工作区干净（无未提交修改）
  └─ 确认源仓库代码最新

Step 1：版本比对
  ├─ 读取源仓库 RELEASE.json
  ├─ 与 MANIFEST.json 逐文件比对
  ├─ 标记过期 guide 文件 → 待更新
  ├─ 标记过期 agent 文件 → 仅版本记录
  └─ 输出过期摘要

Step 2：备份
  ├─ mkdir -p docs/ai-engineering/.backups/{timestamp}/
  └─ 备份当前所有规范文件 + MANIFEST.json

Step 3：按策略更新
  ├─ 新增文件 → 直接复制
  ├─ customized=false → 直接覆盖
  ├─ customized=true → 三路合并
  │  ├─ Base  = 源仓库旧版本（从 git tag 或备份获取）
  │  ├─ Theirs = 源仓库新版本
  │  └─ Ours = 下游当前版本
  ├─ 冲突标记 → 跳过，输出冲突报告
  └─ agent 文件 → 跳过文件操作

Step 4：更新 MANIFEST.json
  ├─ 更新 version → 新版本号
  ├─ 更新 previous_version → 旧版本号
  ├─ 冲突文件标记 conflict: true
  └─ 更新 deployed_at 时间戳

Step 5：验证
  ├─ 结构完整性检查（标题层级、列表闭合）
  ├─ 引用有效检查（文档间交叉引用路径）
  └─ 输出更新摘要

Step 6：提交
  ├─ git add docs/ai-engineering/
  └─ git commit -m "chore: 更新 AI 研发规范至 v<版本号>"
```

---

## 6. 自动化脚本使用说明

建议使用 `scripts/downstream-sync.sh` 自动化上述流程。

### 安装

将脚本复制到下游项目的 `scripts/` 目录，或通过 submodule 直接引用：

```bash
cp vendor/ai-engineering/scripts/downstream-sync.sh scripts/
chmod +x scripts/downstream-sync.sh
```

### 用法

```bash
scripts/downstream-sync.sh \
  --source vendor/ai-engineering \
  --manifest docs/ai-engineering/MANIFEST.json \
  --target docs/ai-engineering/
```

### 参数说明

| 参数 | 必需 | 说明 |
|------|------|------|
| `--source` | 是 | 源仓库根目录（包含 `RELEASE.json` 和 `guide/`、`agents/`） |
| `--manifest` | 是 | 下游 `MANIFEST.json` 文件路径 |
| `--target` | 是 | 规范文件目标目录（通常为 `docs/ai-engineering/`） |
| `--dry-run` | 否 | 仅预览变更，不做任何修改 |
| `--verbose` | 否 | 输出详细日志 |

### 示例

```bash
# 预览即将发生的变更
scripts/downstream-sync.sh \
  --source vendor/ai-engineering \
  --manifest docs/ai-engineering/MANIFEST.json \
  --target docs/ai-engineering/ \
  --dry-run

# 执行同步
scripts/downstream-sync.sh \
  --source vendor/ai-engineering \
  --manifest docs/ai-engineering/MANIFEST.json \
  --target docs/ai-engineering/
```

### 在 CI 中集成

```yaml
# .github/workflows/sync-ai-engineering.yml
name: Sync AI Engineering Specs
on:
  schedule:
    - cron: '0 6 * * 1'  # 每周一早上 6 点
  workflow_dispatch:

jobs:
  sync:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
        with:
          submodules: recursive
      - name: Dry-run sync
        run: |
          scripts/downstream-sync.sh \
            --source vendor/ai-engineering \
            --manifest docs/ai-engineering/MANIFEST.json \
            --target docs/ai-engineering/ \
            --dry-run
      - name: Create sync PR
        uses: peter-evans/create-pull-request@v6
        with:
          title: 'chore: 同步 AI 研发规范'
          body: '自动检测到上游规范有更新，请 Review 后合并。'
```

---

## 7. 附录

### 环境要求

| 工具 | 用途 | 默认可用 |
|------|------|----------|
| `bash` 4+ | 脚本运行 | macOS/Linux 默认 |
| `python3` | JSON 处理和版本比对 | 需安装 |
| `diff3` | 三路合并 | macOS/Linux 默认 |
| `git` | 获取 Base 版本 | 需安装 |

### 目录结构参考

```
target-project/
├── vendor/
│   └── ai-engineering/         # 源仓库（submodule 或 clone）
│       ├── RELEASE.json
│       ├── guide/
│       └── agents/
├── docs/
│   └── ai-engineering/
│       ├── MANIFEST.json        # 版本注册表（纳入版本管理）
│       ├── .backups/            # 自动备份（加入 .gitignore）
│       ├── principles.md
│       ├── process.md
│       └── ...
└── scripts/
    └── downstream-sync.sh       # 同步脚本
```

### 最佳实践速查

| 场景 | 建议 |
|------|------|
| 定制范式 | 新增章节而非修改上游内容 |
| 冲突预防 | 使用 `DOWNSTREAM-BEGIN/END` 标记 |
| 版本追踪 | 始终将 MANIFEST.json 纳入版本管理 |
| 备份策略 | `.backups/` 加入 `.gitignore` |
| Agent 更新 | 版本变更后重新初始化 subagent |
| CI 集成 | 使用 `--dry-run` 做周期性检查 |

---

---

## 8. GitHub 配置同步

除了规范文件（`guide/`）和 Agent 定义（`agents/`），下游项目还应同步 GitHub Issues 的模板文件（`.github/ISSUE_TEMPLATE/`）到自己的仓库中。

### 8.1 同步内容

| 源路径 | 目标路径 | 说明 | 定制策略 |
|--------|----------|------|----------|
| `.github/ISSUE_TEMPLATE/config.yml` | `.github/ISSUE_TEMPLATE/config.yml` | 模板选择器配置 | 可修改 `contact_links` 中的 url 和 about 为下游项目信息 |
| `.github/ISSUE_TEMPLATE/1-bug.yml` | `.github/ISSUE_TEMPLATE/1-bug.yml` | Bug Report | 可新增 `labels` 或修改 `body` 中的字段 |
| `.github/ISSUE_TEMPLATE/2-feature.yml` | `.github/ISSUE_TEMPLATE/2-feature.yml` | Feature Request | 同上 |
| `.github/ISSUE_TEMPLATE/3-task.yml` | `.github/ISSUE_TEMPLATE/3-task.yml` | Task | 同上 |
| `.github/ISSUE_TEMPLATE/4-decision.yml` | `.github/ISSUE_TEMPLATE/4-decision.yml` | Decision | 同上 |
| `.github/ISSUE_TEMPLATE/5-question.yml` | `.github/ISSUE_TEMPLATE/5-question.yml` | Question | 同上 |
| `.github/ISSUE_TEMPLATE/6-risk.yml` | `.github/ISSUE_TEMPLATE/6-risk.yml` | Risk | 同上 |
| `.github/ISSUE_TEMPLATE/7-review.yml` | `.github/ISSUE_TEMPLATE/7-review.yml` | Review Finding | 同上 |

### 8.2 定制策略

下游项目可根据自身需要修改 YAML 模板中的以下内容：

| 可定制项 | 示例 |
|---------|------|
| `contact_links` 中的 `url` | 指向下游项目自己的 Discussions 页面 |
| `labels` 中的组织级标签 | 增加下游项目特有的标签 |
| `body` 中的 `placeholder` 文本 | 适配下游项目语言环境 |
| `validations` 设置 | 按需调整必填项 |

### 8.3 同步方式

下游项目适用于 `09-downstream-sync-guide.md` 中定义的同步流程（Step 1~Step 6）：

| 场景 | 处理方式 |
|------|----------|
| 上游新增/修改模板 | 直接复制到目标 `.github/ISSUE_TEMPLATE/` 目录 |
| 下游定制了模板 | 参照 §2 定制最佳实践，使用 `DOWNSTREAM-BEGIN/END` 标记标注定制区域 |
| 上游删除模板 | 人工决策是否跟随删除 |

## 修订记录

| 版本 | 日期 | 修订内容 |
|------|------|----------|
| v0.3 | 2026-05-30 | §1/§5 Step 0 增加工具级同步入口引用（OpenCode §10 / Claude Code §8 / Codex CLI §9） |
| v0.2 | 2026-05-28 | 新增 §8 GitHub 配置同步章节，定义 `.github/ISSUE_TEMPLATE/` 的同步策略和定制规则 |
| v0.1 | 2026-05-28 | 初始版本 |
