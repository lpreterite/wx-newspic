# CSS 格式规范（步骤「主题 CSS 生成」时加载）

## 格式要求

生成的 CSS 必须符合 wenyan-core 主题格式，所有选择器以 `#wenyan` 为前缀：

```css
#wenyan {
    line-height: 1.75;
    font-size: 16px;
}
#wenyan h1 { ... }
#wenyan h2 { ... }
#wenyan h3, #wenyan h4 { ... }
#wenyan p { ... }
#wenyan blockquote { ... }
#wenyan p code { ... }
#wenyan pre { ... }
#wenyan img { ... }
#wenyan table { ... }
#wenyan table th, #wenyan table td { ... }
#wenyan > ul, #wenyan > ol { ... }
```

## 内置主题参考

| 主题 | 风格 | 特点 |
|------|------|------|
| `default` | 简约居中 | 最小化装饰，适合头条号等常规阅读 |
| `github` | 极简阅读 | 类 GitHub markdown 渲染，通用性强 |
| `orange-heart` | 装饰型 | 带色块标题、圆角引用，适合生活类账号 |

## wenyan-core DOM 结构注意

wenyan-core 渲染器在标题（h1-h6）内会自动生成 `<span>` 包裹文字。因此 `#wenyan h2 span` 等子元素选择器可以命中标题文字——**不要因 markdown 源码不可见 `<span>` 就放弃子元素选择器**。

典型应用：实现标题行内背景缠绕换行效果（类似 `box-decoration-break: clone`），直接使用 `#wenyan h2 span` 即可，无需外包装布局 hack。

查看完整 CSS：`node_modules/@wenyan-md/core/dist/core.js` 中 `__vite_glob_0_*` 常量。
