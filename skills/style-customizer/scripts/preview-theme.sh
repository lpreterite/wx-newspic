#!/bin/bash
# 用指定主题渲染并预览
# 用法: ./preview-theme.sh <theme-name> [test-markdown-file]
# 默认使用 test-article.md（渲染 + 打开浏览器）

THEME_NAME="$1"
TEST_MD="$2"
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
THEMES_DIR="$HOME/.wx-newspic/themes"
THEME_FILE="$THEMES_DIR/$THEME_NAME.css"

if [ -z "$THEME_NAME" ]; then
  echo "用法: ./preview-theme.sh <theme-name> [test-markdown-file]"
  echo ""
  echo "已安装主题:"
  ls -1 "$THEMES_DIR" 2>/dev/null | sed 's/\.css$//' || echo "  (无)"
  exit 1
fi

if [ ! -f "$THEME_FILE" ]; then
  echo "错误: 主题文件不存在: $THEME_FILE"
  echo "先用 save-theme.sh 存盘"
  exit 1
fi

# 默认使用测试文章
if [ -z "$TEST_MD" ]; then
  TEST_MD="/tmp/wenyan-test/preview-article.md"
  cat > "$TEST_MD" << 'ENDOFFILE'
# 标题一：公众号文章的排版艺术

这是一段正文内容。好的排版能让**读者**更愿意读完一整篇文章。

## 二级标题：引用的魅力

> 读书破万卷，下笔如有神。好的引用能为文章增色不少。

### 三级标题：代码与表格

行内代码 `const x = 1` 应该与正文区分。

```
function hello() {
  console.log("Hello World");
}
```

| 名称 | 数量 | 价格 |
|------|------|------|
| 苹果 | 3 | 9.00 |
| 香蕉 | 5 | 5.00 |
ENDOFFILE
fi

# 渲染
echo "渲染主题: $THEME_NAME"
echo "文章: $TEST_MD"
echo ""

wx-newspic render --theme-file "$THEME_FILE" --theme "$THEME_NAME" --md "$TEST_MD" --open --output /tmp/wenyan-test/preview-output.html

echo ""
echo "预览文件: /tmp/wenyan-test/preview-output.html"
