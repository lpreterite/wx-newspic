#!/bin/bash
# 公众号文章可读性质量门禁 — 主题 CSS 验证脚本
# 用法: ./validate-theme.sh <path/to/theme.css>
# 返回: JSON { pass, total, pass_count, checks }

CSS_FILE="$1"
if [ ! -f "$CSS_FILE" ]; then
  echo '{"pass":false,"error":"文件不存在"}'
  exit 1
fi

css=$(cat "$CSS_FILE")
# 拍平 CSS 块，使跨行属性匹配
flat_css=$(echo "$css" | awk 'BEGIN{RS="}";ORS="}\n"} {gsub(/\n/," ",$0); print $0}')

results=()
PASS=0
FAIL=0

check() {
  local name="$1"
  local ok="$2"
  local detail="$3"
  if [ "$ok" = "true" ]; then ((++PASS)); else ((++FAIL)); fi
  local n=$(echo -n "$name" | python3 -c "import json,sys;print(json.dumps(sys.stdin.read().strip()))")
  local d=$(echo -n "$detail" | python3 -c "import json,sys;print(json.dumps(sys.stdin.read().strip()))")
  results+=("{\"name\":$n,\"pass\":$ok,\"detail\":$d}")
}

# === 维度 A：微信兼容性 ===

if echo "$css" | grep -qE '<(style|script|iframe)[^>]*>'; then
  check "无禁用标签" false "包含被微信过滤的标签"
else
  check "无禁用标签" true ""
fi

if echo "$flat_css" | grep -qiE 'position\s*:\s*(absolute|fixed|relative)'; then
  check "无 position 定位" false "position 属性会被微信过滤"
else
  check "无 position 定位" true ""
fi

if echo "$css" | grep -qE '@(media|keyframes)'; then
  check "无媒体查询/动画" false "包含 @media 或 @keyframes，微信不支持"
else
  check "无媒体查询/动画" true ""
fi

if echo "$css" | grep -qE '#wenyan\b'; then
  check "选择器前缀 #wenyan" true ""
else
  check "选择器前缀 #wenyan" false "CSS 选择器必须使用 #wenyan 前缀"
fi

# === 维度 B：可读性基准 ===

if echo "$flat_css" | grep -qE '#wenyan\s*\{[^}]*line-height\s*:\s*1\.75'; then
  check "根 line-height 1.75" true ""
else
  check "根 line-height 1.75" false "建议 #wenyan { line-height: 1.75 }"
fi

if echo "$flat_css" | grep -qE '#wenyan\s*\{[^}]*font-size\s*:\s*16px'; then
  check "根 font-size 16px" true ""
else
  check "根 font-size 16px" false "建议 #wenyan { font-size: 16px }"
fi

if echo "$flat_css" | grep -qE '#wenyan\s+img\s*\{[^}]*max-width\s*:\s*100%'; then
  check "图片 max-width 100%" true ""
else
  check "图片 max-width 100%" false "img 应设置 max-width: 100%"
fi

if echo "$flat_css" | grep -qE '#wenyan\s+table\s*\{[^}]*border-collapse\s*:\s*collapse'; then
  check "表格 border-collapse" true ""
else
  check "表格 border-collapse" false "table 应设置 border-collapse: collapse"
fi

if echo "$flat_css" | grep -qE '#wenyan\s+blockquote\s*\{[^}]*border-left'; then
  check "引用块左边框" true ""
else
  check "引用块左边框" false "blockquote 应有左侧色条/边框标识"
fi

if echo "$flat_css" | grep -qE '#wenyan\s+p\s+code\s*\{'; then
  check "内联代码区分" true ""
else
  check "内联代码区分" false "p code 应设置区分底色和文字色"
fi

h1c=$(echo "$flat_css" | grep -cE '#wenyan\s+h1[[:space:],{]')
h2c=$(echo "$flat_css" | grep -cE '#wenyan\s+h2[[:space:],{]')
if [ "$h1c" -gt 0 ] && [ "$h2c" -gt 0 ]; then
  check "标题层级区分" true ""
else
  check "标题层级区分" false "缺少 h1 或 h2 的样式定义"
fi

# === 维度 C：移动端中文阅读 ===

if echo "$flat_css" | grep -qiE 'color\s*:\s*#000\b|color\s*:\s*#000000\b'; then
  check "正文避免纯黑" false "正文使用纯黑 #000 在手机端刺眼，建议 #3f3f3f"
else
  check "正文避免纯黑" true ""
fi

# 输出 JSON
echo -n '{"pass":'
[ "$FAIL" -eq 0 ] && echo -n 'true' || echo -n 'false'
echo -n ",\"total\":${#results[@]},\"pass_count\":$PASS,\"fail_count\":$FAIL,\"checks\":["
sep=""
for r in "${results[@]}"; do
  echo -n "$sep$r"
  sep=","
done
echo ']}'
