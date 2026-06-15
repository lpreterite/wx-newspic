#!/bin/bash
# 存盘 + 质量门禁验证
# 用法: ./save-theme.sh <主题名称> <path/to/theme.css>
# 返回: JSON { pass, file, errors }

set -e

NAME="$1"
CSS_FILE="$2"
THEMES_DIR="$HOME/.wx-newspic/themes"

if [ -z "$NAME" ] || [ -z "$CSS_FILE" ]; then
  echo "用法: ./save-theme.sh <主题名称> <path/to/theme.css>"
  exit 1
fi

if [ ! -f "$CSS_FILE" ]; then
  echo "{\"pass\":false,\"error\":\"CSS 文件不存在: $CSS_FILE\"}"
  exit 1
fi

mkdir -p "$THEMES_DIR"
DEST="$THEMES_DIR/$NAME.css"
cp "$CSS_FILE" "$DEST"

# 运行质量门禁
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
VALIDATE_OUTPUT=$(bash "$SCRIPT_DIR/validate-theme.sh" "$DEST")
PASS=$(echo "$VALIDATE_OUTPUT" | python3 -c "import json,sys;d=json.load(sys.stdin);print('true' if d['pass'] else 'false')")

if [ "$PASS" = "true" ]; then
  echo "$VALIDATE_OUTPUT" | python3 -c "
import json,sys
d=json.load(sys.stdin)
d['file']='$DEST'
print(json.dumps(d, ensure_ascii=False))
"
else
  echo "$VALIDATE_OUTPUT" | python3 -c "
import json,sys
d=json.load(sys.stdin)
d['file']='$DEST'
d['hint']='质量门禁未通过。请根据失败的 check 项修正 CSS，然后重新运行 save-theme.sh'
print(json.dumps(d, ensure_ascii=False, indent=2))
"
  exit 1
fi
