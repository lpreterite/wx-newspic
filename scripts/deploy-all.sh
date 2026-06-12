#!/bin/bash
# deploy-all.sh — 全量部署 AI 研发工程体系到下游项目
# 用法: ./deploy-all.sh <目标项目路径> [--tool opencode|claude-code] [--update]
#
# 部署内容:
#   1. guide/*.md          -> docs/ai-engineering/
#   2. skills/*             -> .opencode/skills/ 或 .claude/skills/
#   3. AGENTS.md.example    -> 项目根
#   4. agents/*.md          -> 生成 Agent 角色配置
#   5. .github/ISSUE_TEMPLATE/*.yml -> .github/ISSUE_TEMPLATE/

set -euo pipefail

SRC_DIR="$(cd "$(dirname "$0")/.." && pwd)"
TARGET="${1:?用法: $0 <目标项目路径> [--tool opencode|claude-code] [--update]}"
TARGET="$(cd "$TARGET" 2>/dev/null && pwd || echo "$TARGET")"
TOOL="opencode"
UPDATE=false

shift
while [[ $# -gt 0 ]]; do
  case "$1" in
    --tool) TOOL="$2"; shift 2 ;;
    --update) UPDATE=true; shift ;;
    *) echo "未知参数: $1"; exit 1 ;;
  esac
done

if [ "$TOOL" != "opencode" ] && [ "$TOOL" != "claude-code" ]; then
  echo "不支持 tool: $TOOL（仅 opencode / claude-code）"
  exit 1
fi

echo "部署 AI 研发工程体系到: $TARGET (tool: $TOOL)"
echo ""

# ─── 步骤 1: 规范文件 ─────────────────────────────────────────
echo "[1/5] 规范文件 -> docs/ai-engineering/"
mkdir -p "$TARGET/docs/ai-engineering"
for f in "$SRC_DIR/guide/"*.md; do
  name=$(basename "$f")
  dst="$TARGET/docs/ai-engineering/$name"
  if [ "$UPDATE" = true ] && [ -f "$dst" ]; then
    echo "   已存在: docs/ai-engineering/$name"
  else
    cp "$f" "$dst"
    echo "   + docs/ai-engineering/$name"
  fi
done

# ─── 步骤 2: 技能文件（版本感知）─────────────────────────────
SKILL_DST="$TARGET/.opencode/skills"
SKILL_SRC="$SRC_DIR/skills"
if [ "$TOOL" = "claude-code" ]; then
  SKILL_DST="$TARGET/.claude/skills"
fi

echo ""
echo "[2/5] 技能文件 -> $SKILL_DST"
mkdir -p "$SKILL_DST"

MANIFEST_FILE="$TARGET/MANIFEST.json"
UPSTREAM_COMMIT=$(cd "$SRC_DIR" && git rev-parse --short HEAD 2>/dev/null || echo "unknown")

UPSTREAM_RELEASE=$(SRC_DIR="$SRC_DIR" python3 -c "
import json, os
try:
    print(json.load(open(os.environ['SRC_DIR'] + '/RELEASE.json')).get('release',''))
except: pass
" 2>/dev/null)

# 读取上游 release 中的 skill 版本
UP_SKILLS=$(SRC_DIR="$SRC_DIR" python3 -c "
import json, os
try:
    data = json.load(open(os.environ['SRC_DIR'] + '/RELEASE.json'))
    for path, ver in data.get('files', {}).items():
        if '/SKILL.md' in path:
            print(path.split('/')[-2] + ':' + ver)
except: pass
" 2>/dev/null)

# 读取下游 MANIFEST（如果有）
DN_SKILLS=$(MANIFEST_FILE="$MANIFEST_FILE" python3 -c "
import json, os
try:
    data = json.load(open(os.environ['MANIFEST_FILE']))
    for name, info in data.get('skills', {}).items():
        print(name + ':' + info.get('version','') + ':' + str(info.get('customized',False)).lower())
except: pass
" 2>/dev/null)

# 查找版本号：从 UP_SKILLS 找
find_up_ver() {
  echo "$UP_SKILLS" | while IFS=: read -r n v; do
    [ "$n" = "$1" ] && echo "$v" && break
  done
}

# 查找下游版本和定制状态
find_dn_info() {
  echo "$DN_SKILLS" | while IFS=: read -r n v c; do
    if [ "$n" = "$1" ]; then
      echo "$v|$c"
      break
    fi
  done
}

for skill_dir in "$SKILL_SRC"/*/; do
  skill_name=$(basename "$skill_dir")
  dst_dir="$SKILL_DST/$skill_name"
  up_ver=$(find_up_ver "$skill_name")
  [ -z "$up_ver" ] && up_ver="?"
  dn_info=$(find_dn_info "$skill_name")
  dn_ver=$(echo "$dn_info" | cut -d'|' -f1)
  customized=$(echo "$dn_info" | cut -d'|' -f2)
  [ -z "$customized" ] && customized="false"

  if [ ! -d "$dst_dir" ] || [ "$UPDATE" != true ]; then
    cp -r "$skill_dir" "$dst_dir"
    echo "   + $skill_name ($up_ver)"
    continue
  fi

  if [ "$customized" = "true" ]; then
    echo "   定制跳过 $skill_name（上游 v$up_ver，不覆盖）"
    continue
  fi
  if [ "$dn_ver" = "$up_ver" ]; then
    echo "   一致 $skill_name (v$dn_ver)"
    continue
  fi
  cp -r "$skill_dir" "$dst_dir"
  echo "   ~ $skill_name (v$dn_ver -> v$up_ver)"
done

export TARGET SKILL_DST UPSTREAM_RELEASE UPSTREAM_COMMIT TOOL
# 写入下游 MANIFEST.json
python3 << 'PYEOF'
import json, os
urel = os.environ.get('UPSTREAM_RELEASE','')
ucom = os.environ.get('UPSTREAM_COMMIT','')

skill_dst = os.environ.get('SKILL_DST','')
manifest_file = os.path.join(os.environ.get('TARGET',''), 'MANIFEST.json')

mf = {}
try:
    with open(manifest_file) as f:
        mf = json.load(f)
except:
    pass

from datetime import date
mf['deployed'] = date.today().isoformat()
mf['upstream_release'] = urel
mf['upstream_commit'] = ucom
if 'skills' not in mf:
    mf['skills'] = {}

for entry in os.listdir(skill_dst):
    sp = os.path.join(skill_dst, entry)
    if not os.path.isdir(sp):
        continue
    sk = os.path.join(sp, 'SKILL.md')
    version = ''
    if os.path.isfile(sk):
        with open(sk) as f:
            content = f.read()
        parts = content.split('---', 2)
        if len(parts) >= 3:
            for line in parts[1].split('\n'):
                line = line.strip()
                if line.startswith('version:'):
                    version = line.split(':', 1)[1].strip().strip("'\"").strip("'\"")
                    break
    customized = mf['skills'].get(entry, {}).get('customized', False)
    mf['skills'][entry] = {'version': version, 'customized': customized}

with open(manifest_file, 'w') as f:
    json.dump(mf, f, indent=2, ensure_ascii=False)
print('   下游 MANIFEST.json 已更新')
PYEOF

# ─── 步骤 3: 主指令文件 ─────────────────────────────────────
echo ""
echo "[3/5] 主指令文件 -> ./"

MAIN_FILE=""
EXAMPLE_SRC=""
case "$TOOL" in
  opencode) MAIN_FILE="AGENTS.md"; EXAMPLE_SRC="$SRC_DIR/reference/templates/AGENTS.md.example" ;;
  claude-code) MAIN_FILE="CLAUDE.md"; EXAMPLE_SRC="$SRC_DIR/reference/templates/CLAUDE.md.example" ;;
esac

if [ -n "$MAIN_FILE" ] && [ -f "$EXAMPLE_SRC" ]; then
  if [ "$UPDATE" = true ] && [ -f "$TARGET/$MAIN_FILE" ]; then
    echo "   已存在: $MAIN_FILE"
  else
    cp "$EXAMPLE_SRC" "$TARGET/$MAIN_FILE"
    echo "   + $MAIN_FILE"
  fi
fi

# ─── 步骤 4: Agent 角色配置 ──────────────────────────────────
echo ""
echo "[4/5] Agent 角色配置"

AGENTS_SRC="$SRC_DIR/agents"
AGENTS_DST="$TARGET/.opencode/agents"
if [ "$TOOL" = "claude-code" ]; then
  AGENTS_DST="$TARGET/.claude/agents"
fi

for key in orchestrator po uiux developer tester; do
  src="$AGENTS_SRC/${key}-agent.md"
  [ "$key" = "developer" ] && src="$AGENTS_SRC/fullstack-developer.md"
  dst="$AGENTS_DST/${key}.md"
  [ ! -f "$src" ] && echo "   跳过 $key" && continue

  if [ "$UPDATE" = true ] && [ -f "$dst" ]; then
    echo "   已存在: $key"
  else
    mkdir -p "$(dirname "$dst")"
    cat > "$dst" << EOF
---
name: $key
mode: subagent
---

EOF
    cat "$src" >> "$dst"
    echo "   + $key"
  fi
done

# ─── 步骤 5: Issue 模板 ──────────────────────────────────────
echo ""
echo "[5/5] Issue 模板 -> .github/ISSUE_TEMPLATE/"
mkdir -p "$TARGET/.github/ISSUE_TEMPLATE"
for f in "$SRC_DIR/.github/ISSUE_TEMPLATE/"*.yml; do
  name=$(basename "$f")
  dst="$TARGET/.github/ISSUE_TEMPLATE/$name"
  if [ "$UPDATE" = true ] && [ -f "$dst" ]; then
    echo "   已存在: .github/ISSUE_TEMPLATE/$name"
  else
    cp "$f" "$dst"
    echo "   + .github/ISSUE_TEMPLATE/$name"
  fi
done

echo ""
echo "完成: $TARGET"
echo "   MANIFEST.json / docs/ / $SKILL_DST / $AGENTS_DST / .github/ISSUE_TEMPLATE/"
