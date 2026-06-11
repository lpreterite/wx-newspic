# Tech Design 002: 长文发布渲染管线（wenyan-core 集成）

**版本**：v0.1
**状态**：草稿
**创建日期**：2026-06-10
**作者**：Developer Agent
**来源**：[Issue #15](../docs/综合文档.md#) — 整合 wenyan 长文发布功能到 wx-newspic

---

## 目录

1. [背景](#1-背景)
2. [增量概述](#2-增量概述)
3. [wenyan-core 集成设计](#3-wenyan-core-集成设计)
4. [新增 src/renderer/ 模块](#4-新增-srcrenderer-模块)
5. [CLI 扩展](#5-cli-扩展)
6. [draft.ts 变更点](#6-draftts-变更点)
7. [中转服务层扩展](#7-中转服务层扩展)
8. [向后兼容策略](#8-向后兼容策略)
9. [修订记录](#9-修订记录)

---

## 1. 背景

### 1.1 为什么需要 v2

wx-newspic v1（tech-design-001.md）只支持**图片消息**（`article_type: wx-newspic`），内容为纯文本 + 图片列表。但用户同时有发布长文（图文消息）的需求，原由 `wenyan-cli` 覆盖，存在两套工具割裂的问题。

Issue #15 将 wx-newspic 定位为统一发布工具，同时支持两种格式。

### 1.2 技术选型决策过程

| 问题 | 调研结果 |
|------|----------|
| wenyan-cli 的模板从哪来？ | 来自 [Typora](https://typora.io) 主题生态——Typora 是一款所见即所得 Markdown 编辑器，社区贡献了大量 CSS 主题 |
| 哪些 Typora 主题被适配？ | Orange Heart、Rainbow、Lapis、Pie、Maize、Purple、物理猫-薄荷 共 7 套 |
| 谁做了适配工作？ | `caol64/wenyan` 项目将 Typora CSS 主题适配为公众号 HTML 格式，封装在 `@wenyan-md/core`（wenyan-core）中 |
| 为什么选 `@wenyan-md/core`？ | ① 0 工作量获得 11 套主题（含持续更新）② 渲染管线（marked + highlight.js）与需求一致 ③ Apache-2.0 许可证，可闭源商业化 ④ 上游已有 30 个 release，成熟稳定 |

> 详细调研见 [Issue #15 评论](https://github.com/lpreterite/wx-newspic/issues/15#issuecomment-xxx)。

### 1.3 与 v1 的关系

本设计是 v1 的**增量补充**。v1 的图片消息发布能力完全保留，本文档只描述新增的图文消息渲染管线。

| 维度 | v1（tech-design-001） | v2（本文档） |
|------|----------------------|-------------|
| 文章类型 | `newspic`（图片消息） | `news`（图文消息） |
| 内容格式 | 纯文本 | Markdown → HTML（wenyan-core 渲染） |
| 图片处理 | image_list 独立上传 | 嵌入 Markdown 中，自动提取上传 |
| 主题系统 | 无 | 基于 Typora CSS 主题的 11 套主题 |

---

## 2. 增量概述

相比 v1，本版本新增以下能力：

| 新增项 | 说明 |
|--------|------|
| `@wenyan-md/core` 依赖 | 替代手动集成 marked + highlight.js |
| `jsdom` 依赖 | wenyan-core Node 渲染所需的 DOM 模拟 |
| `src/renderer/` 模块 | wenyan-core 的封装层 |
| CLI `--type news` | 图文消息发布模式 |
| CLI `--md` | Markdown 文件输入 |
| CLI `--theme` | 主题选择 |
| 服务端 news 支持 | 中转服务接收 news 格式请求 |

---

## 3. wenyan-core 集成设计

### 3.1 依赖安装

```bash
npm install @wenyan-md/core
npm install jsdom  # peer dependency，Node 端渲染需要
```

### 3.2 wenyan-core 核心 API

本方案主要使用 wenyan-core 的以下两函数：

#### `prepareRenderContext()`（推荐）

```ts
async function prepareRenderContext(
  inputContent: string | undefined,
  options: RenderOptions,
  getInputContent: GetInputContentFn
): Promise<RenderContext>
```

处理流程：

```
Markdown 文件
  ↓
读取内容
  ↓
handleFrontMatter 解析（title, cover, author, image_list, type）
  ↓
判断类型
  ├── type: image → 提取图片列表，跳过主题渲染 ← 用于 newspic
  └── 其他       → 应用主题样式，输出 HTML  ← 用于 news
  ↓
返回 StyledContent { content, title, cover, description, image_list, type }
```

#### `renderStyledContent()`（底层 API）

当不需要 frontmatter 解析和自动分支逻辑时，直接调用：

```ts
const html = await renderStyledContent(markdown, {
  themeId: "default",
  hlThemeId: "solarized-light",
});
```

### 3.3 我们的渲染流程

```
Markdown 输入
    │
    ▼
wx-newspic renderer（src/renderer/）
    │
    ├── prepareRenderContext(markdown, { theme })
    │       │
    │       ▼
    │   StyledContent
    │   {
    │     content: "<html>...CSS injected...</html>",
    │     title: "文章标题",
    │     cover: "/path/to/cover.jpg",
    │     image_list: ["img1.jpg", "img2.jpg"]
    │   }
    │
    ├─ news 路径 ──────────────────────────────────────────
    │   1. 从 content 提取所有 <img src>
    │   2. 逐张上传到微信素材库 → 获得 media_id
    │   3. 替换 content 中的 src 为 media_id 引用
    │   4. 调用 draft.ts createDraft(article_type: news)
    │
    └─ newspic 路径（同 v1）──────────────────────────────
        1. 直接使用 image_list
        2. 逐张上传到微信素材库 → 获得 media_id
        3. content 为纯文本（或 frontmatter 中的描述）
        4. 调用 draft.ts createDraft(article_type: wx-newspic)
```

### 3.4 主题系统

wenyan-core 内置以下主题目录下：
- `src/assets/themes/` — 7 套 Typora 衍生主题（CSS 文件）
- `src/assets/highlight/styles/` — 代码高亮主题
- 平台默认样式（zhihu_default、juejin_default、toutiao_default、medium_default）

通过 `wenyan theme --list` 可查看全部可用主题。

---

## 4. 新增 src/renderer/ 模块

### 4.1 目录结构

```
src/
├── renderer/                    # 新增：渲染管线
│   ├── index.ts                 # 公共入口，导出 renderNews()
│   ├── types.ts                 # 渲染选项类型
│   └── themes.ts                # 主题管理（列出可用主题等）
│
├── wechat/                      # 已有，微调
│   └── draft.ts                 # 新增 news 分支
```

### 4.2 模块职责

#### `src/renderer/types.ts`

```ts
export interface RenderOptions {
  /** 文章类型: 'news' | 'newspic'（默认 'newspic'） */
  type?: 'news' | 'newspic';
  /** 主题 ID（news 模式生效，默认 'default'） */
  theme?: string;
  /** 代码高亮主题 ID（可选，默认跟随主题） */
  hlTheme?: string;
  /** Markdown 文件路径（与 content 二选一） */
  md?: string;
  /** 直接传入 Markdown 内容（与 md 二选一） */
  content?: string;
}

export interface RenderedArticle {
  /** HTML 正文（news）/ 纯文本正文（newspic） */
  content: string;
  /** 文章标题 */
  title: string;
  /** 封面路径 */
  cover?: string;
  /** 作者 */
  author?: string;
  /** 摘要 */
  digest?: string;
  /** 图片路径列表（newspic 用） */
  image_list?: string[];
}
```

#### `src/renderer/index.ts`

```ts
import { prepareRenderContext } from "@wenyan-md/core/node";

export async function renderArticle(options: RenderOptions): Promise<RenderedArticle> {
  if (options.type === 'newspic') {
    return renderNewspic(options);
  }
  return renderNews(options);
}

async function renderNews(options: RenderOptions): Promise<RenderedArticle> {
  const { gzhContent } = await prepareRenderContext(
    options.content,   // 或读取文件
    {
      theme: options.theme ?? 'default',
      hlTheme: options.hlTheme,
      footnote: true,
    },
    getInputContent,   // 内容获取函数
  );

  return {
    content: gzhContent.content,    // 完整的 HTML（含主题 CSS）
    title: gzhContent.title ?? '',
    cover: gzhContent.cover,
    author: gzhContent.description,
  };
}
```

### 4.3 wenyan-core 与现有 DraftArticle 的数据映射

```
prepareRenderContext 输出       DraftArticle 字段
──────────────────────         ─────────────────
gzhContent.title        ──→   title
gzhContent.content      ──→   content（HTML 全文）
gzhContent.cover        ──→   thumb_media_id（处理后）
—                       ──→   article_type: 'news'
—                       ──→   need_open_comment: 1
```

---

## 5. CLI 扩展

### 5.1 publish 命令增量参数

v1 现有参数保持不变，新增以下参数：

```
新增选项:
  --type, -T    <choice>   文章类型（可选: news | newspic，默认: newspic）
  --md, -m      <path>     Markdown 文件路径（news 模式，与 --content 二选一）
  --theme       <string>   排版主题（news 模式，默认: default）

示例:
  # 发布图文消息（读取 Markdown 文件）
  wx-newspic publish \
    --type news \
    --md ./article.md \
    --theme orangeheart \
    --author "叶帕奇"

  # 发布图文消息（直接传 Markdown 内容）
  wx-newspic publish \
    --type news \
    --content "# 标题\n正文内容..." \
    --theme default

  # 发布图片消息（完全向后兼容）
  wx-newspic publish \
    --title "标题" \
    --content "正文" \
    --images ./slides/*.png
```

### 5.2 参数校验规则

| 场景 | 必填 | 可选 |
|------|------|------|
| `--type news` + `--md` | `--title` 或 frontmatter 中有 title | `--theme`, `--author` |
| `--type news` + `--content` | Markdown 字符串非空 | `--title`, `--theme`, `--author` |
| `--type newspic`（默认） | `--images`, `--title`, `--content` | `--author`, `--digest` |

#### 执行流程对比

**v1（newspic）流程**：
```
参数校验 → 凭证读取 → 图片上传(N次) → 创建草稿(article_type: wx-newspic) → 输出
```

**v2（news）流程**：
```
参数校验 → 凭证读取 → 渲染 Markdown(frontmatter解析 + 主题+CSS注入)
         → 从 HTML 提取图片路径 → 图片上传(N次)
         → 替换 <img src> 为微信 media_id
         → 创建草稿(article_type: news) → 输出
```

### 5.3 `render` 命令（本地预览）

新增独立 `render` 命令，用于本地预览渲染效果，**不调用微信 API**。

```
用法:
  wx-newspic render --md <path> [options]

选项:
  --md, -m      <path>     Markdown 文件路径（必填）
  --theme       <string>   排版主题（默认: default）
  --output, -o  <path>     输出 HTML 路径（默认: ./{输入文件名}.html）
  --open, -O              渲染后自动用默认浏览器打开

示例:
  # 渲染为 HTML 文件
  wx-newspic render --md ./article.md --theme orangeheart

  # 渲染并自动打开浏览器预览
  wx-newspic render --md ./article.md --theme orangeheart --open

  # 指定输出路径
  wx-newspic render --md ./article.md --theme rainbow -o ./preview.html
```

**执行流程**：

```
Markdown 文件
  ↓
prepareRenderContext(options)    ← 与 publish 共用渲染管线
  ↓
StyledContent { content, title, ... }
  ↓
写入本地 .html 文件（完整自包含，CSS 已 inline）
  ↓
--open 时: child_process.open() → 系统默认浏览器
```

**与 `publish` 的关系**：

| 维度 | `render` | `publish --type news` |
|------|----------|----------------------|
| 渲染管线 | 同一套 | 同一套 |
| 调用微信 API | ❌ | ✅ |
| 上传图片 | ❌ | ✅（上传图床 + 替换 media_id） |
| 创建草稿 | ❌ | ✅ |
| 适用场景 | 本地迭代调试 | 最终发布 |

**开发调试闭环**：

```bash
# 迭代循环
wx-newspic render --md article.md --theme orangeheart --open   # 看效果
# 编辑 article.md → 再次渲染
wx-newspic render --md article.md --theme orangeheart --open   # 再看

# 满意后发布
wx-newspic publish --type news --md article.md --theme orangeheart
```

---

## 6. draft.ts 变更点

### 6.1 DraftArticle 接口

现有 `DraftArticle` 接口已经预留了 `content`、`need_open_comment`、`only_fans_can_comment` 等字段，无需接口层改动。只需调整构建请求体的业务逻辑：

```ts
// 构建微信 API body
if (type === 'newspic') {
  return {
    articles: [{
      title,
      content,              // 纯文本
      article_type: 'wx-newspic',
      image_info: { image_list: images.map(id => ({ image_media_id: id })) },
      author,
      digest,
    }],
  };
} else {
  return {
    articles: [{
      title,
      content: htmlContent, // 渲染后的 HTML
      thumb_media_id,       // 封面（从 frontmatter 或首图提取）
      author,
      need_open_comment: 1,
      only_fans_can_comment: 0,
    }],
  };
}
```

### 6.2 图片处理差异

| 步骤 | newpics（v1） | news（v2） |
|------|---------------|------------|
| 图片来源 | `--images` 参数指定 | Markdown 中的 `![](...)` 标签 |
| 提取方式 | glob 匹配路径 | 从渲染后 HTML 提取所有 `<img src>` |
| 上传方式 | 逐张上传 → 获得 media_id | 逐张上传 → 获得 media_id |
| 内容替换 | 无（图片在 image_info 中） | 替换 `<img src>` 为微信 media_id 格式 |
| cover 处理 | 自动取 image_list[0] | 优先 frontmatter 中的 cover，否则 extract 首图 |

---

## 7. 中转服务层扩展

### 7.1 现有 API 适配

`POST /api/wechat/create-draft` 已接收通用 articles 结构，服务端无需新增路由。只需：

1. 在请求体中添加 `type: 'news' | 'newspic'` 字段
2. 服务端根据 type 走不同的处理分支
3. news 分支增加 Markdown 渲染步骤（如果未在客户端预渲染）

### 7.2 服务端 vs 客户端渲染决策

| 渲染位置 | 适用场景 | 优/缺 |
|----------|----------|-------|
| 客户端（CLI 本地） | CLI 模式 | 不消耗服务端资源，适合 CI |
| 服务端 | Server 模式（远程中转） | Client 无需安装渲染依赖 |

**策略**：
- CLI 模式：客户端渲染，服务端只负责 API 代理
- Server 模式：服务端收到 Markdown 原文后执行渲染（通过 `--server` 模式自动切换）

---

## 8. 向后兼容策略

| 使用场景 | 行为 | 说明 |
|----------|------|------|
| 不加任何新参数 | 完全同 v1 | `--type` 默认 `newspic` |
| 只加 `--type news` | 新增行为 | 不加其他参数会报参数校验错误 |
| `--type news --md file.md` | 新增行为 | 新能力，不干扰 v1 |
| `--images` + `--type news` | 可组合 | 手动指定图片列表 + Markdown 渲染的混合模式 |

---

## 9. 修订记录

| 版本 | 日期 | 修订内容 |
|------|------|----------|
| v0.2 | 2026-06-10 | 新增 `render` 命令（本地预览），开发调试闭环 |
| v0.1 | 2026-06-10 | 初始版本，定义 wenyan-core 集成方案、renderer 模块、CLI 扩展、draft 变更 |
