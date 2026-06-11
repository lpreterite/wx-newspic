# 选择器映射参考

> 步骤 2「加载映射」时加载。Agent 需在转换前理解此表。

## 根作用域

| Typora | Wenyan | 说明 |
|--------|--------|------|
| `#write` | `#wenyan` | 编辑区根容器 |
| `:root` | `:root` | CSS 变量定义（保留） |

## 内容元素

所有 `h1`–`h6` 及 `p`, `blockquote`, `pre`, `code`, `table`, `th`, `td`, `img`, `a`, `ul`, `ol`, `li`, `strong`, `em`, `hr` 均加 `#wenyan` 前缀。

## Typora 特有 → 标准 HTML

| Typora | Wenyan | 说明 |
|--------|--------|------|
| `.md-fences` | `#wenyan pre` | 代码围栏 |
| `.cm-s-inner` | `#wenyan pre code` | CodeMirror 代码块内部 |
| `tt` | `code` | 等宽字体（已废弃 HTML 标签） |
| `.md-image` | 删除（黑名单） | 图片包装器（img 元素保留） |

## 编辑器 UI 黑名单（全部删除）

```
侧栏:       .sidebar-tabs, .sidebar-tab
文件树:     .file-node-content, .file-node-title, .file-node-icon
            .file-tree-node, .file-tree
菜单:       .megamenu-menu, .megamenu-menu-header, .megamenu-menu-list
            .megamenu-content, .megamenu-opened
大纲:       .outline-item, .outline-expander, .outline-label
            .outline-content, .outline
偏好设置:   .ty-preferences
快速打开:   #typora-quick-open, #typora-quick-open-item
专注模式:   .on-focus-mode
编辑交互:   .md-focus, .md-expand, .mac-selected
CodeMirror: .CodeMirror, .CodeMirror-gutters, .CodeMirror-linenumber
            .CodeMirror-lines, .cm-s-inner, .sourceLine, .code-tooltip
编辑节点:   .md-toc, .md-toc-item, .md-toc-content, .md-tag, .md-lang
            .md-mathjax-midline, .md-mathjax-preview, .md-meta-block
            .mathjax-block, .md-rawblock, .md-rawblock-control
            .md-image, .md-meta, .md-end-block-tag
            .md-diagram-panel, .md-diagram, .md-clipboard
            .md-pair-
菜单/对话框: .context-menu, .dropdown-menu, .menu-item-container
            .menu-style-btn
导出:       .typora-export
```

## At-rule 处理

| at-rule | 处理 | 说明 |
|---------|------|------|
| `@import` | 删除 | 微信不支持外部资源加载 |
| `@include-when-export` | 删除 | Typora 特有导出指令 |
| `@media` | 保留 | 响应式样式保留 |
| `@font-face` | 保留 | 字体声明保留（注意微信限制） |
| `@keyframes` | 保留 | 保留（微信不支持 animation） |
