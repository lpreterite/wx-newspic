#!/usr/bin/env bash
# downstream-sync.sh — 下游仓库规范文件自动同步脚本
#
# 功能：
#   1. 版本比对：读取源 RELEASE.json vs 下游 MANIFEST.json → 过期清单
#   2. 自动备份：将当前规范文件备份到 .backups/{timestamp}/
#   3. 策略执行：
#      - 新增文件 → cp
#      - customized=false → cp 覆盖
#      - customized=true + 无冲突 → 自动三路合并
#      - customized=true + 有冲突 → 输出冲突报告，不动文件
#      - agent 文件 → 仅更新 MANIFEST 版本号
#   4. 更新 MANIFEST.json
#   5. 输出变更摘要
#
# 用法:
#   scripts/downstream-sync.sh \
#     --source <源仓库路径> \
#     --manifest <MANIFEST.json 路径> \
#     --target <目标目录> \
#     [--dry-run] \
#     [--verbose]
#
# 示例:
#   scripts/downstream-sync.sh \
#     --source vendor/ai-engineering \
#     --manifest docs/ai-engineering/MANIFEST.json \
#     --target docs/ai-engineering/
#
# 返回值:
#   0 — 全部成功（或 dry-run 完成）
#   1 — 有冲突需人工处理
#   2 — 参数错误

set -euo pipefail

# ============================================================
# 配置
# ============================================================
# 颜色
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# ============================================================
# 工具函数
# ============================================================
usage() {
  cat <<EOF
用法: $(basename "$0") --source <源仓库路径> --manifest <MANIFEST.json 路径> --target <目标目录> [--dry-run] [--verbose]

必需参数:
  --source    源仓库根目录（包含 RELEASE.json 和 guide/、agents/）
  --manifest  下游 MANIFEST.json 文件路径
  --target    规范文件目标目录（通常为 docs/ai-engineering/）

可选参数:
  --dry-run   仅预览，不做任何修改
  --verbose   输出详细日志
  -h, --help  显示此帮助信息

示例:
  $(basename "$0") --source vendor/ai-engineering --manifest docs/ai-engineering/MANIFEST.json --target docs/ai-engineering/
  $(basename "$0") --source vendor/ai-engineering --manifest docs/ai-engineering/MANIFEST.json --target docs/ai-engineering/ --dry-run
EOF
  exit 2
}

log_info()  { echo -e "${GREEN}[INFO]${NC}  $*"; }
log_warn()  { echo -e "${YELLOW}[WARN]${NC}  $*"; }
log_error() { echo -e "${RED}[ERROR]${NC} $*"; }
log_step()  { echo -e "${BLUE}[STEP]${NC}  $*"; }
log_verbose() { [ "$VERBOSE" = true ] && echo -e "  ${YELLOW}->${NC} $*"; }

# ============================================================
# 参数解析
# ============================================================
SOURCE_DIR=""
MANIFEST_FILE=""
TARGET_DIR=""
DRY_RUN=false
VERBOSE=false

while [ $# -gt 0 ]; do
  case "$1" in
    --source)    SOURCE_DIR="$2";    shift 2 ;;
    --manifest)  MANIFEST_FILE="$2"; shift 2 ;;
    --target)    TARGET_DIR="$2";    shift 2 ;;
    --dry-run)   DRY_RUN=true;       shift ;;
    --verbose)   VERBOSE=true;       shift ;;
    -h|--help)   usage ;;
    *)           log_error "未知参数: $1"; usage ;;
  esac
done

# 验证必需参数
if [ -z "$SOURCE_DIR" ] || [ -z "$MANIFEST_FILE" ] || [ -z "$TARGET_DIR" ]; then
  log_error "缺少必需参数"
  usage
fi

# 标准化路径（去掉末尾斜杠）
SOURCE_DIR="${SOURCE_DIR%/}"
TARGET_DIR="${TARGET_DIR%/}"

# ============================================================
# 前置检查
# ============================================================
log_step "前置检查"

if ! command -v python3 &>/dev/null; then
  log_error "需要 python3，请安装后重试"
  exit 2
fi

if [ ! -d "$SOURCE_DIR" ]; then
  log_error "源仓库目录不存在: $SOURCE_DIR"
  exit 2
fi

if [ ! -f "$SOURCE_DIR/RELEASE.json" ]; then
  log_error "源仓库缺少 RELEASE.json: $SOURCE_DIR/RELEASE.json"
  exit 2
fi

if [ ! -f "$MANIFEST_FILE" ]; then
  log_error "MANIFEST 文件不存在: $MANIFEST_FILE"
  exit 2
fi

if [ ! -d "$TARGET_DIR" ]; then
  log_error "目标目录不存在: $TARGET_DIR"
  exit 2
fi

log_info "源仓库: $SOURCE_DIR"
log_info "MANIFEST: $MANIFEST_FILE"
log_info "目标目录: $TARGET_DIR"
[ "$DRY_RUN" = true ] && log_info "模式: DRY-RUN（仅预览，不做修改）"
echo ""

# ============================================================
# Step 1: 版本比对
# ============================================================
log_step "Step 1: 版本比对"

RELEASE_FILE="$SOURCE_DIR/RELEASE.json"

# 用 Python 做版本比对
PYTHON_SCRIPT=$(cat <<'PYEOF'
import json, sys, os

source_dir = sys.argv[1]
manifest_file = sys.argv[2]
dry_run = sys.argv[3] == 'true'

with open(os.path.join(source_dir, 'RELEASE.json')) as f:
    release = json.load(f)

with open(manifest_file) as f:
    manifest = json.load(f)

src_files = release.get('files', {})
dst_files = manifest.get('files', {})

stale_guide = []      # 过期的规范文件
stale_agent = []      # 过期的 agent 文件
new_files = []        # 新增文件
up_to_date = []       # 已最新
orphaned = []         # MANIFEST 有记录但文件在本地已删除
conflicts = []        # 标记为冲突的

release_version = release.get('release', 'N/A')

for fname, sver in src_files.items():
    # 从源路径推断本地文件名: guide/01-principles.md → 01-principles.md
    if fname.startswith('guide/'):
        lname = fname[len('guide/'):]
        cat = 'guide'
    elif fname.startswith('agents/'):
        lname = fname[len('agents/'):]
        cat = 'agent'
    else:
        continue

    entry = dst_files.get(lname)
    if entry is None:
        new_files.append({'name': lname, 'source': fname, 'version': sver, 'category': cat})
        continue

    dver = entry.get('version', 'N/A')
    customized = entry.get('customized', False)
    conflict = entry.get('conflict', False)

    if sver == dver:
        up_to_date.append(lname)
        continue

    if conflict:
        conflicts.append(lname)
        continue

    if cat == 'agent':
        stale_agent.append({'name': lname, 'source': fname, 'old_ver': dver, 'new_ver': sver})
    else:
        stale_guide.append({'name': lname, 'source': fname, 'old_ver': dver, 'new_ver': sver, 'customized': customized})

# 检查已删除文件
for lname, entry in dst_files.items():
    cat = entry.get('category', 'guide')
    src_key = f'{cat}/{lname}'
    if src_key not in src_files:
        orphaned.append(lname)

# 输出 JSON 供 shell 解析
result = {
    'release_version': release_version,
    'stale_guide': stale_guide,
    'stale_agent': stale_agent,
    'new_files': new_files,
    'up_to_date': up_to_date,
    'orphaned': orphaned,
    'conflicts': conflicts
}
print(json.dumps(result))
PYEOF
)

COMPARE_RESULT=$(python3 -c "$PYTHON_SCRIPT" "$SOURCE_DIR" "$MANIFEST_FILE" "$DRY_RUN")

# 解析 JSON 结果
STALE_GUIDE_COUNT=$(echo "$COMPARE_RESULT" | python3 -c "import json,sys; d=json.load(sys.stdin); print(len(d['stale_guide']))")
STALE_AGENT_COUNT=$(echo "$COMPARE_RESULT" | python3 -c "import json,sys; d=json.load(sys.stdin); print(len(d['stale_agent']))")
NEW_FILES_COUNT=$(echo "$COMPARE_RESULT" | python3 -c "import json,sys; d=json.load(sys.stdin); print(len(d['new_files']))")
UP_TO_DATE_COUNT=$(echo "$COMPARE_RESULT" | python3 -c "import json,sys; d=json.load(sys.stdin); print(len(d['up_to_date']))")
ORPHANED_COUNT=$(echo "$COMPARE_RESULT" | python3 -c "import json,sys; d=json.load(sys.stdin); print(len(d['orphaned']))")
CONFLICTS_COUNT=$(echo "$COMPARE_RESULT" | python3 -c "import json,sys; d=json.load(sys.stdin); print(len(d['conflicts']))")
RELEASE_VER=$(echo "$COMPARE_RESULT" | python3 -c "import json,sys; d=json.load(sys.stdin); print(d['release_version'])")

echo "RELEASE.json 版本: $RELEASE_VER"
echo ""
echo "文件状态汇总:"
echo "  ✅  已最新:       $UP_TO_DATE_COUNT 个"
echo "  📦 需更新(guide): $STALE_GUIDE_COUNT 个"
echo "  🤖 需更新(agent): $STALE_AGENT_COUNT 个"
echo "  🆕 新增文件:     $NEW_FILES_COUNT 个"
echo "  ⚠️  已孤立:       $ORPHANED_COUNT 个"
echo "  🔴 冲突待处理:   $CONFLICTS_COUNT 个"
echo ""

# 输出过期详情
if [ "$STALE_GUIDE_COUNT" -gt 0 ] || [ "$NEW_FILES_COUNT" -gt 0 ]; then
  echo "过期规范文件详情:"
  echo "$COMPARE_RESULT" | python3 -c "
import json, sys
d = json.load(sys.stdin)
for f in d['stale_guide']:
    icon = '🖊️' if f['customized'] else '📄'
    print(f\"  {icon} {f['name']}: {f['old_ver']} → {f['new_ver']} (customized={f['customized']})\")
for f in d['new_files']:
    print(f\"  🆕 {f['name']}: (新增) → {f['version']}\")
"
fi

if [ "$STALE_AGENT_COUNT" -gt 0 ]; then
  echo "过期 Agent 文件详情:"
  echo "$COMPARE_RESULT" | python3 -c "
import json, sys
d = json.load(sys.stdin)
for f in d['stale_agent']:
    print(f\"  🤖 {f['name']}: {f['old_ver']} → {f['new_ver']}\")
"
fi

# 如果有孤立文件
if [ "$ORPHANED_COUNT" -gt 0 ]; then
  echo "孤立文件（MANIFEST 有记录但上游已删除）:"
  echo "$COMPARE_RESULT" | python3 -c "
import json, sys
d = json.load(sys.stdin)
for name in d['orphaned']:
    print(f\"  ⚠️  {name}\")
"
fi

# 如果有冲突
if [ "$CONFLICTS_COUNT" -gt 0 ]; then
  log_warn "存在 $CONFLICTS_COUNT 个冲突标记文件，请先处理后再运行同步"
  echo "$COMPARE_RESULT" | python3 -c "
import json, sys
d = json.load(sys.stdin)
for name in d['conflicts']:
    print(f\"  🔴 {name}\")
"
  echo ""
  echo "处理方式：手动编辑对应文件，移除 >>>>>>> / <<<<<<< 冲突标记后，将 MANIFEST 中 conflict 字段设为 false 后重试"
  exit 1
fi

# dry-run 模式下到这里就结束
if [ "$DRY_RUN" = true ]; then
  log_info "DRY-RUN 完成，未做任何修改"
  exit 0
fi

# 无变更直接退出
if [ "$STALE_GUIDE_COUNT" -eq 0 ] && [ "$STALE_AGENT_COUNT" -eq 0 ] && [ "$NEW_FILES_COUNT" -eq 0 ]; then
  log_info "全部已最新，无需更新"
  exit 0
fi

# ============================================================
# Step 2: 备份
# ============================================================
log_step "Step 2: 备份当前规范文件"

TIMESTAMP=$(date +%Y%m%d%H%M%S)
BACKUP_DIR="$TARGET_DIR/.backups/$TIMESTAMP"

mkdir -p "$BACKUP_DIR"
# 备份当前所有 .md 和 MANIFEST.json
for f in "$TARGET_DIR"/*.md; do
  [ -f "$f" ] && cp "$f" "$BACKUP_DIR/" && log_verbose "备份: $(basename "$f")"
done
if [ -f "$MANIFEST_FILE" ]; then
  cp "$MANIFEST_FILE" "$BACKUP_DIR/MANIFEST.json"
  log_verbose "备份: MANIFEST.json"
fi

log_info "备份完成: $BACKUP_DIR ($(ls "$BACKUP_DIR" | wc -l) 个文件)"
echo ""

# ============================================================
# Step 3: 按策略更新
# ============================================================
log_step "Step 3: 按策略更新文件"

HAS_CONFLICT=false

# 用 Python 执行更新逻辑
PYTHON_UPDATE=$(cat <<'PYEOF'
import json, sys, os, shutil, subprocess, tempfile

source_dir = sys.argv[1]
manifest_file = sys.argv[2]
target_dir = sys.argv[3]
timestamp = sys.argv[4]

with open(os.path.join(source_dir, 'RELEASE.json')) as f:
    release = json.load(f)

with open(manifest_file) as f:
    manifest = json.load(f)

src_files = release.get('files', {})
dst_files = manifest.get('files', {})

result = {
    'updated': [],
    'skipped': [],
    'conflicts': [],
    'agent_updated': []
}

# Helper: 三路合并
def three_way_merge(base_path, theirs_path, ours_path, name='unknown'):
    """使用 diff3 进行三路合并，返回 (success, output_path)"""
    merged_path = ours_path + '.merged'
    try:
        # 使用 diff3 命令进行三路合并
        cmd = ['diff3', '-m', '-L', 'Ours (下游定制)', '-L', 'Base (源旧版)', '-L', 'Theirs (源新版)',
               ours_path, base_path, theirs_path]
        proc = subprocess.run(cmd, capture_output=True, text=True, timeout=30)
        if proc.returncode == 0:
            # 无冲突
            with open(merged_path, 'w') as f:
                f.write(proc.stdout)
            return True, merged_path
        elif proc.returncode == 1:
            # 有冲突（diff3 返回 1 表示有冲突）
            with open(merged_path, 'w') as f:
                f.write(proc.stdout)
            # 检测是否真的包含冲突标记
            if '>>>>>>>' in proc.stdout or '<<<<<<<' in proc.stdout:
                return False, merged_path
            return True, merged_path
        else:
            return False, None
    except FileNotFoundError:
        print(f"  ⚠️  {name}: diff3 未安装，跳过合并", file=sys.stderr)
        return False, None
    except subprocess.TimeoutExpired:
        print(f"  ⚠️  {name}: diff3 超时，跳过合并", file=sys.stderr)
        return False, None

# 处理过期规范文件
for f_info in json.loads(sys.argv[5]):
    name = f_info['name']
    source = f_info['source']
    new_ver = f_info['new_ver']
    customized = f_info.get('customized', False)

    src_path = os.path.join(source_dir, source)
    dst_path = os.path.join(target_dir, name)

    if customized:
        # 已定制文件 → 尝试三路合并
        # 需要在源仓库中找 Base 版本（当前 MANIFEST 记录的版本）
        # 通过 git show 或备份来获取
        old_ver = f_info['old_ver']

        # 尝试从 git 获取旧版
        base_content = None
        try:
            git_cmd = ['git', '-C', source_dir, 'show', f'refs/tags/{old_ver}:{source}']
            proc = subprocess.run(git_cmd, capture_output=True, text=True, timeout=15)
            if proc.returncode == 0:
                base_content = proc.stdout
        except:
            pass

        if base_content is None:
            # 尝试从 backup 中获取旧版
            backup_base = os.path.join(target_dir, '.backups', timestamp, name)
            if os.path.exists(backup_base):
                with open(backup_base) as f:
                    base_content = f.read()

        if base_content is None and os.path.exists(dst_path):
            log_msg = f"  ⚠️  {name}: 无法获取旧版 Base，跳过合并（保留当前版本）"
            result['skipped'].append({'name': name, 'reason': '无法获取 Base 版本'})
            print(log_msg)
            continue

        # 将 Base 内容写入临时文件
        if base_content is not None:
            tmp_dir = tempfile.mkdtemp()
            base_file = os.path.join(tmp_dir, 'base')
            with open(base_file, 'w') as f:
                f.write(base_content)

            success, merged = three_way_merge(base_file, src_path, dst_path, name)
            shutil.rmtree(tmp_dir, ignore_errors=True)

            if success:
                shutil.copy2(merged, dst_path)
                os.remove(merged)
                log_msg = f"  ✅ {name}: 三路合并成功 ({old_ver} → {new_ver})"
                result['updated'].append({'name': name, 'version': new_ver, 'method': 'merge'})
            else:
                # 有冲突，写入冲突文件
                if merged and os.path.exists(merged):
                    shutil.copy2(merged, dst_path)
                    os.remove(merged)
                result['conflicts'].append({'name': name, 'old_ver': old_ver, 'new_ver': new_ver})
                log_msg = f"  🔴 {name}: 三路合并冲突，标记待人工处理"
        else:
            log_msg = f"  ⚠️  {name}: 备份不可用，跳过（保留当前版本）"
            result['skipped'].append({'name': name, 'reason': '备份不可用'})

        print(log_msg)
    else:
        # 未定制文件 → 直接覆盖
        shutil.copy2(src_path, dst_path)
        log_msg = f"  ✅ {name}: 直接覆盖 ({new_ver})"
        result['updated'].append({'name': name, 'version': new_ver, 'method': 'overwrite'})
        print(log_msg)

# 处理新增文件
for f_info in json.loads(sys.argv[6]):
    name = f_info['name']
    source = f_info['source']
    new_ver = f_info['version']

    src_path = os.path.join(source_dir, source)
    dst_path = os.path.join(target_dir, name)
    shutil.copy2(src_path, dst_path)
    log_msg = f"  🆕 {name}: 新增 ({new_ver})"
    result['updated'].append({'name': name, 'version': new_ver, 'method': 'new', 'category': f_info.get('category', 'guide'), 'source': source})
    print(log_msg)

# 处理 agent 文件（仅记录版本）
for f_info in json.loads(sys.argv[7]):
    name = f_info['name']
    new_ver = f_info['new_ver']
    log_msg = f"  🤖 {name}: 版本已记录 ({f_info['old_ver']} → {new_ver})"
    result['agent_updated'].append({'name': name, 'old_ver': f_info['old_ver'], 'new_ver': new_ver})
    print(log_msg)

# 输出结果 JSON
print('__RESULT__')
print(json.dumps(result))
PYEOF
)

# 准备 JSON 参数
STALE_GUIDE_JSON=$(echo "$COMPARE_RESULT" | python3 -c "import json,sys; print(json.dumps(json.load(sys.stdin)['stale_guide']))")
NEW_FILES_JSON=$(echo "$COMPARE_RESULT" | python3 -c "import json,sys; print(json.dumps(json.load(sys.stdin)['new_files']))")
STALE_AGENT_JSON=$(echo "$COMPARE_RESULT" | python3 -c "import json,sys; print(json.dumps(json.load(sys.stdin)['stale_agent']))")

UPDATE_OUTPUT=$(python3 -c "$PYTHON_UPDATE" "$SOURCE_DIR" "$MANIFEST_FILE" "$TARGET_DIR" "$TIMESTAMP" \
  "$STALE_GUIDE_JSON" "$NEW_FILES_JSON" "$STALE_AGENT_JSON" 2>&1)

# 分离日志输出和结果 JSON
UPDATE_RESULT=$(echo "$UPDATE_OUTPUT" | sed -n '/^__RESULT__$/, $ p' | tail -n +2)
echo "$UPDATE_OUTPUT" | sed -n '/^__RESULT__$/q; p'

echo ""

# 检查是否有冲突
CONFLICT_COUNT=$(echo "$UPDATE_RESULT" | python3 -c "import json,sys; d=json.load(sys.stdin); print(len(d.get('conflicts', [])))")
if [ "$CONFLICT_COUNT" -gt 0 ]; then
  HAS_CONFLICT=true
  log_warn "存在 $CONFLICT_COUNT 个合并冲突"
  echo "$UPDATE_RESULT" | python3 -c "
import json, sys
d = json.load(sys.stdin)
for c in d.get('conflicts', []):
    print(f\"  🔴 {c['name']}: {c['old_ver']} → {c['new_ver']}\")
"
  echo ""
  echo "请在文件中搜索 >>>>>>> / <<<<<<< 冲突标记，手动解决冲突后再提交"
fi

# ============================================================
# Step 4: 更新 MANIFEST.json
# ============================================================
log_step "Step 4: 更新 MANIFEST.json"

python3 -c "
import json, sys

manifest_file = sys.argv[1]
update_result = json.loads(sys.argv[2])

with open(manifest_file) as f:
    manifest = json.load(f)

# 更新已更新文件的版本号
for item in update_result.get('updated', []):
    name = item['name']
    if name in manifest['files']:
        entry = manifest['files'][name]
        entry['previous_version'] = entry['version']
        entry['version'] = item['version']
    else:
        # 新增文件，添加条目
        cat = item.get('category', 'guide')
        src = item.get('source', f'{cat}/{name}')
        manifest['files'][name] = {
            'source': src,
            'version': item['version'],
            'customized': False,
            'previous_version': None,
            'category': cat
        }

# 更新 agent 版本号
for item in update_result.get('agent_updated', []):
    name = item['name']
    if name in manifest['files']:
        entry = manifest['files'][name]
        entry['previous_version'] = entry['version']
        entry['version'] = item['new_ver']

# 标记冲突文件
for item in update_result.get('conflicts', []):
    name = item['name']
    if name in manifest['files']:
        manifest['files'][name]['conflict'] = True

# 记录更新时间
manifest['source']['deployed_at'] = '$TIMESTAMP'

with open(manifest_file, 'w') as f:
    json.dump(manifest, f, indent=2, ensure_ascii=False)
    f.write('\n')

updated_count = len(update_result.get('updated', []))
agent_count = len(update_result.get('agent_updated', []))
conflict_count = len(update_result.get('conflicts', []))
print(f'MANIFEST 已更新: {updated_count} 个规范文件, {agent_count} 个 agent 文件, {conflict_count} 个冲突')
" "$MANIFEST_FILE" "$UPDATE_RESULT"

echo ""

# ============================================================
# Step 5: 输出变更摘要
# ============================================================
log_step "Step 5: 变更摘要"

UPDATED_COUNT=$(echo "$UPDATE_RESULT" | python3 -c "import json,sys; d=json.load(sys.stdin); print(len(d.get('updated', [])))")
AGENT_COUNT=$(echo "$UPDATE_RESULT" | python3 -c "import json,sys; d=json.load(sys.stdin); print(len(d.get('agent_updated', [])))")

echo ""
echo "========================================"
echo "  同步完成"
echo "========================================"
echo "  源仓库版本:   $RELEASE_VER"
echo "  备份路径:     $BACKUP_DIR"
echo "  更新的文件:   $UPDATED_COUNT"
echo "  Agent 更新:   $AGENT_COUNT (需重新初始化 subagent)"
echo ""

if [ "$AGENT_COUNT" -gt 0 ]; then
  echo "📢 Agent 文件已更新，请退出当前会话后重新调用 @agent 名称 以加载新定义"
fi

if [ "$HAS_CONFLICT" = true ]; then
  echo "🔴 存在合并冲突，请手动解决后提交"
  exit 1
fi

log_info "更新完成"
exit 0
