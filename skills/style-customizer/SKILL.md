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

## 工作流程

```
输入（二选一）
  ├─ A: 逐步问答 → 收集偏好
  └─ B: 参考文章 URL → fetch HTML → 提取视觉参数
          ↓
[中自由度] LLM 生成主题 CSS → 参考 css-format.md
          ↓
[低自由度] 质量门禁验证 → 详见 quality-gate.md
  ├─ 通过 → 存为 ~/.wx-newspic/themes/{名称}.css
  └─ 不通过 → LLM 修正 → 再次验证（最多 3 轮）
          ↓
[低自由度] 存盘 + 预览 → 浏览器打开
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

## 主题 CSS 生成 [中自由度]

→ 此时加载 [references/css-format.md](references/css-format.md)

所有选择器必须以 `#wenyan` 为前缀。注意 wenyan-core 在标题内会生成 `<span>` 包裹文字，可用 `#wenyan h2 span` 等子元素选择器命中标题文字。

生成时参考提取输出的 `inlineAccents`：
- `boldAccent` → 对应 `#wenyan strong { color: <accent> }`（原文用 `<span style="font-weight:bold;color:#xxx">` 表示加粗）
- `italicAccent` → 对应 `#wenyan em { color: <accent> }`
- `linkColor` → 对应 `#wenyan a { color: <accent> }`

生成逻辑：AI 分析提取的视觉参数 → 对照内置主题格式 → 输出完整 CSS。

### 代码高亮主题匹配

根据提取的 `inlineAccents.isDarkBackground` 选择对应 hljs 主题。wenyan-core 内置 **9 个 hljs 主题**：

| 类型 | 推荐 | 备选 |
|------|------|------|
| 深色背景 | `--hl-theme atom-one-dark` | dracula, github-dark, monokai, solarized-dark |
| 浅色背景 | `--hl-theme atom-one-light` | github, solarized-light, xcode |

提取脚本输出的 `suggestedHlTheme.comment` 是与 `isDarkBackground` 匹配的 CSS 注释块，可直接复制到主题 CSS 文件头部：

```css
/* hljs-theme: atom-one-dark */
/* 深色背景文章推荐搭配 dark hljs 主题，可用 --hl-theme <名称> 指定 */
```

使用发布/渲染命令时，手动指定 `--hl-theme` 参数；如果保留默认，wenyan-core 使用内置的默认高亮主题。

## 质量门禁验证 [低自由度]
→ 此时加载 [references/quality-gate.md](references/quality-gate.md)

```bash
bash skills/style-customizer/scripts/save-theme.sh <名称> <path/to/css>
node skills/style-customizer/scripts/apply-correction.mjs <名称> <path/to/css>
```

## 存盘 + 预览 [低自由度]

⚠️ `--theme-file` 必须与 `--theme <名称>` 同时使用，缺一不可。

```bash
bash skills/style-customizer/scripts/preview-theme.sh <名称>
wx-newspic render --theme-file ~/.wx-newspic/themes/<名称>.css --theme <名称> --md article.md --open
wx-newspic publish --type news --theme-file ~/.wx-newspic/themes/<名称>.css --theme <名称> --md article.md
```

## 脚本一览

| 脚本 | 用途 |
|------|------|
| `fetch-article.mjs` | 爬取公众号文章 → JSON |
| `extract-visual.mjs` | 从 HTML 提取视觉参数 |
| `save-theme.sh` | 存盘 + 验证 |
| `apply-correction.mjs` | 修正循环（含建议） |
| `validate-theme.sh` | 质量门禁（单次） |
| `preview-theme.sh` | 渲染预览 |

## 完成标准

产出物：`~/.wx-newspic/themes/{名称}.css` + 预览 HTML 渲染成功 + 可通过 `wx-newspic publish --theme` 发布。

→ 回退时加载 [references/troubleshooting.md](references/troubleshooting.md)
