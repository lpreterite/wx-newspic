---
name: typora2wenyan
description: 将 Typora CSS 转换为 Wenyan 公众号图文格式。触发：Typora主题转换、wenyan主题制作、自定义主题导入、主题移植
license: MIT
compatibility: wx-newspic >= 0.2.0 | Node.js >= 20
author: AI 辅助生成
version: 0.1.0
---

# Typora → Wenyan 主题转换

## 前置条件

- Node.js >= 20（wx-newspic 环境已有）
- wx-newspic >= 0.2.0（含 `--theme-file` 能力）
- `css-tree`（已在 @wenyan-md/core 依赖树中）

## 技能目录

```
skills/typora2wenyan/
├── SKILL.md                       ← 本文件
├── scripts/convert.js             ← 转换 + 审查脚本
├── references/
│   ├── mapping.md                 ← 选择器映射表 + 黑名单 + at-rule 处理
│   └── quality-gate.md            ← 双质量门流程 + 检查清单 + 已知限制
└── test/
    ├── markdown/full-test.md      ← 标准测试文章（覆盖全元素）
    └── themes/                    ← Typora 主题文件存放处
```

## 基本使用 [自由度：中]

```bash
# 转换
node skills/typora2wenyan/scripts/convert.js input.css output.css

# 转换 + 代码审查
node skills/typora2wenyan/scripts/convert.js input.css -o output.css --validate

# 添加自定义主题
wx-newspic theme add <name> output.css

# 渲染测试
wx-newspic render --md skills/typora2wenyan/test/markdown/full-test.md \
  --theme <name> --theme-file ~/.wx-newspic/themes/<name>.css -o preview.html
```

## 工作流

### 步骤 1：选择主题 [自由度：高]
在 [theme.typora.io](https://theme.typora.io) 或 GitHub 选择目标主题并下载 `.css` 文件。

### 步骤 2：转换 [自由度：低]
→ 此时加载 [references/mapping.md](references/mapping.md) 理解选择器映射规则。

```bash
node skills/typora2wenyan/scripts/convert.js <typora-theme.css> <output.css>
```

### 步骤 3：质量门 [自由度：低]
→ 此时加载 [references/quality-gate.md](references/quality-gate.md) 按流程验证。

1. **门1 代码审查**：`--validate` 模式自动化检查语法 + 黑名单 + #write 残留
2. **门2 视觉审计**：Agent 提取 Token → 渲染截图 → 视觉模型验证

### 步骤 4：交付 [自由度：中]

- 门2 PASS/CONDITIONAL → `wx-newspic theme add <name> output.css` 完成交付
- 每个 CONDITIONAL 主题需在主题说明中记录已知限制

## 完成标准

交付物: `{theme}.wenyan.css` + 门1 PASS + 门2 PASS/CONDITIONAL（对应记录限制）

## 回退路径

- **门1 FAIL** → 修复映射 → 重转换 → 重校验（最多 3 轮）
- **门2 FAIL** → 调整映射规则 → 回到步骤 2
- **脚本错误** → 检查 css-tree 兼容性 → 检查输入 CSS 语法

## 参考资料

- [选择器映射表](references/mapping.md) — 步骤 2 时加载
- [双质量门规范](references/quality-gate.md) — 步骤 3 时加载
- [Typora 主题商店](https://theme.typora.io)
- [@wenyan-md/core 文档](https://github.com/lpreterite/wenyan-md)
