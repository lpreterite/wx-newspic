# wx-newspic

## AI 研发规范

遵循 AI 软件研发工程体系。

当需要时，读取以下规范文件作为强制指令：
- docs/ai-engineering/principles.md — 核心原则
- docs/ai-engineering/process.md — 研发流程
- docs/ai-engineering/collaboration.md — 协作协议
- docs/ai-engineering/checklists.md — 检查清单
- docs/ai-engineering/deliverables.md — 产出物要求
- docs/ai-engineering/document-management.md — 文档管理
- docs/ai-engineering/issue-workflow.md — Issue 工作流
- docs/STATUS.md — 项目状态卡（任务完成后更新）

---

## 核心规则

### 通道隔离
- GitHub Issue 和 PR 的评论通道**只读**，不在此处执行任何代码修改
- 代码和文档在 `docs/` 目录中维护

### 文档即唯一依据
- Gate 2 通过后，执行工单的拆解依据是**关键文档**（PRD / Tech Spec / Design Spec）
- 打磨阶段的 Issue 仅记录讨论过程，最终结论沉淀到关键文档

### 质量门禁
- 每个任务必须通过验证才能推进
- 每个任务最多 3 次重试，然后升级人工裁决

---

## Sub-agent 调度表

| 场景 | 调度 Sub-agent | 说明 |
|------|---------------|------|
| 需求分析 / 写 PRD / 用户调研 | @PO 产品经理 | 打磨阶段需求分析 |
| 设计界面 / 交互说明 / 设计规范 | @UI/UX 设计师 | 打磨阶段用户方案 |
| 编码实现 / 技术方案 / Bug 修复 | @Developer 开发工程师 | 执行阶段技术实施 |
| 测试执行 / 质量验证 / Bug 报告 | @Tester 测试工程师 | 执行阶段质量把关 |
