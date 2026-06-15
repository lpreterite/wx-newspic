---
name: style-customizer
description: "为公众号文章生成自定义主题 CSS。触发：帮我定制样式、换个排版风格、参考这个文章样式、生成主题、美化排版。通过质量门禁后存盘，可被 wx-newspic publish --theme 复用。"
license: MIT
compatibility: |
  Node.js >= 20，wx-newspic CLI（npm install -g @packy-tang/wx-newspic）。
metadata:
  author: lpreterite
  version: "0.2.0"
  openclaw:
    emoji: "🎨"
---

# 公众号文章样式定制技能

## 前置确认

- `node --version` >= 20
- `wx-newspic --version` 可用
- 模式 B：目标文章可访问（非付费/非删除）

## 工作流程

```
输入（二选一）
  ├─ A: 逐步问答
  └─ B: 参考文章 → fetch HTML → 提取视觉参数
          ↓
[中] LLM 生成主题 CSS → 参考 css-format.md
          ↓
[低] 质量门禁 → 通过则存盘，不通过则修正（最多 3 轮）
          ↓
[低] 存盘 + 预览 → 浏览器打开
```

## 输入模式

### A：逐步问答 [高自由度]
按顺序逐项询问，每项确认后再进入下一项：风格名称 → 正文 → h1 → h2 → 引用 → 行内代码 → 代码块 → 文首模块 → 文尾模块。用户可跳过（用默认值）。

### B：参考文章 [中自由度]
```bash
node skills/style-customizer/scripts/fetch-article.mjs <url> > /tmp/article-data.json
node skills/style-customizer/scripts/extract-visual.mjs /tmp/article-data.json
```
AI 分析返回的视觉参数 JSON（font-size、color、line-height 等），按参数生成主题 CSS。

**失败回退**：fetch 失败（付费/删除/反爬）→ 降级到模式 A；extract 结果为空 → AI 按语义推断视觉层级，跳过具体数值分析。

## 主题 CSS 生成 [中自由度]

→ 此时加载 [references/css-format.md](references/css-format.md)

- 所有选择器必须以 `#wenyan` 为前缀。标题内 `<span>` 可用子元素选择器
- `inlineAccents`: `boldAccent` → `#wenyan strong`；`italicAccent` → `#wenyan em`；`linkColor` → `#wenyan a`
- hljs 主题 → quality-gate.md「维度 D」

## 质量门禁验证 [低自由度]
→ 此时加载 [references/quality-gate.md](references/quality-gate.md)

```bash
bash skills/style-customizer/scripts/save-theme.sh <名称> <path/to/css>
node skills/style-customizer/scripts/apply-correction.mjs <名称> <path/to/css>
```

## 存盘 + 预览 [低自由度]

⚠️ `--theme-file` 必须与 `--theme <名称>` 同时使用。

```bash
bash skills/style-customizer/scripts/preview-theme.sh <名称>
wx-newspic render --theme-file ~/.wx-newspic/themes/<名称>.css --theme <名称> --md article.md --open
# publish: wx-newspic publish --type news [render 参数]
```

## 完成标准

产出物：`~/.wx-newspic/themes/{名称}.css`，验证通过，预览渲染成功。

→ 回退时加载 [references/troubleshooting.md](references/troubleshooting.md)
