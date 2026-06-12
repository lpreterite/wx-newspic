export const DEFAULT_MARKDOWN = `# 一级标题

这是一段普通段落，包含**加粗**、*斜体*、\`行内代码\`和[链接](https://example.com)。

## 二级标题

> 这是一段引用文本。
>
> > 这是嵌套引用。

### 三级标题

1. 有序列表第一项
2. 有序列表第二项
   - 嵌套无序
   - 嵌套无序
3. 有序列表第三项

#### 四级标题

- 无序列表项
- 无序列表项（包含**加粗**）
- 无序列表项

##### 五级标题

\`\`\`typescript
function greet(name: string): string {
  return \`Hello, \${name}!\`;
}

const result = greet('Wenyan');
console.log(result);
\`\`\`

###### 六级标题

| 左对齐 | 居中对齐 | 右对齐 |
| :----- | :------: | -----: |
| 单元格 | 单元格   | 单元格 |
| 单元格 | 单元格   | 单元格 |

---

这是一段包含 ![示例图片](https://via.placeholder.com/400x200?text=Image) 的内联图片段落。

独立图片：

![](https://via.placeholder.com/400x200?text=Preview+Image)

代码块（无语言标记）：

\`\`\`
纯文本代码块
仅用于展示
\`\`\`

结尾段落。
`;