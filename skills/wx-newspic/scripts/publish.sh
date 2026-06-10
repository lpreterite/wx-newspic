#!/usr/bin/env bash
# wx-newspic: 发布图片消息（小绿书）到微信公众号草稿箱
# Usage: ./publish.sh --title "标题" --content "正文" --images "path1.png,path2.png"
#
# 可选参数：
#   --author, -a    <string>    作者
#   --digest, -d    <string>    摘要
#   --server, -s    <url>       中转服务器地址（默认取自环境变量 WECHAT_SERVER_URL）
#   --api-key, -k   <string>    中转服务器 API Key（默认取自环境变量 WECHAT_API_KEY）
#   --json, -j                 以 JSON 格式输出结果
#   --help, -h                  查看帮助

set -euo pipefail

# ============================================================
# 配置
# ============================================================

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
NC='\033[0m'

JSON_MODE=false
SKILL_DIR="$(cd "$(dirname "$0")/.." && pwd)"

# ============================================================
# 辅助函数
# ============================================================

error() {
    local msg="$1"
    if [ "$JSON_MODE" = true ]; then
        echo "{\"success\":false,\"error\":{\"code\":\"SCRIPT_ERROR\",\"message\":\"$msg\"}}"
    else
        echo -e "${RED}❌ $msg${NC}" >&2
    fi
    exit 1
}

info() {
    if [ "$JSON_MODE" = false ]; then
        echo -e "$1"
    fi
}

json_success() {
    local media_id="$1"
    local created_at="$2"
    cat <<EOF
{
  "success": true,
  "media_id": "$media_id",
  "created_at": "$created_at"
}
EOF
}

# ============================================================
# 查找 wx-newspic CLI（仅检查全局安装）
# ============================================================

find_cli() {
    if command -v wx-newspic &>/dev/null; then
        echo "wx-newspic"
        return 0
    fi
    return 1
}

# ============================================================
# 参数解析
# ============================================================

parse_args() {
    TITLE=""
    CONTENT=""
    IMAGES=""
    AUTHOR=""
    DIGEST=""
    SERVER="${WECHAT_SERVER_URL:-${WX_NEWSPIC_SERVER:-}}"
    API_KEY="${WECHAT_API_KEY:-${WX_NEWSPIC_API_KEY:-}}"

    while [ $# -gt 0 ]; do
        case "$1" in
            --title|-t)
                shift; TITLE="$1" ;;
            --content|-c)
                shift; CONTENT="$1" ;;
            --images|-i)
                shift; IMAGES="$1" ;;
            --author|-a)
                shift; AUTHOR="$1" ;;
            --digest|-d)
                shift; DIGEST="$1" ;;
            --server|-s)
                shift; SERVER="$1" ;;
            --api-key|-k)
                shift; API_KEY="$1" ;;
            --json|-j)
                JSON_MODE=true ;;
            --help|-h)
                show_help; exit 0 ;;
            *)
                error "未知参数: $1。使用 --help 查看帮助。" ;;
        esac
        shift
    done
}

# ============================================================
# 参数校验
# ============================================================

validate_args() {
    if [ -z "$TITLE" ]; then
        error "标题不能为空，请使用 --title 参数指定。"
    fi
    if [ ${#TITLE} -gt 32 ]; then
        error "标题不能超过 32 个字符，当前 ${#TITLE} 个字符。"
    fi
    if [ -z "$CONTENT" ]; then
        error "正文不能为空，请使用 --content 参数指定。"
    fi
    if [ -z "$IMAGES" ]; then
        error "图片路径不能为空，请使用 --images 参数指定。"
    fi
    if [ -z "$SERVER" ]; then
        error "未指定中转服务器地址。请通过 --server 参数或 WECHAT_SERVER_URL 环境变量指定。"
    fi
}

# ============================================================
# 显示帮助
# ============================================================

show_help() {
    cat <<EOF
用法: $(basename "$0") [选项]

发布图片消息（小绿书）到微信公众号草稿箱。

必填选项:
  --title, -t     <string>    标题（最长 32 字）
  --content, -c   <string>    正文内容（纯文本）
  --images, -i    <string>    图片路径列表，逗号分隔（最多 20 张）

可选选项:
  --author, -a    <string>    作者（最长 16 字）
  --digest, -d    <string>    摘要（最长 128 字）
  --server, -s    <url>       中转服务器地址（默认: \$WECHAT_SERVER_URL）
  --api-key, -k   <string>    中转服务器 API Key（默认: \$WECHAT_API_KEY）
  --json, -j                  以 JSON 格式输出结果
  --help, -h                  查看帮助

示例:
  $(basename "$0") --title "标题" --content "正文" --images "./output/slide-1.png,./output/slide-2.png"
  $(basename "$0") --title "标题" --content "正文" --images "./output/*.png" --author "叶帕奇"
  $(basename "$0") -t "标题" -c "正文" -i "./slides/*.png" --json

环境变量:
  WECHAT_SERVER_URL     中转服务器地址（旧名 WX_NEWSPIC_SERVER 仍兼容）
  WECHAT_API_KEY        中转服务器 API Key（旧名 WX_NEWSPIC_API_KEY 仍兼容）
EOF
}

# ============================================================
# 图片路径处理
# ============================================================

expand_images() {
    local input="$1"
    local sep=""
    local result=""

    case "$input" in
        *[\*\?\[]*)
            shopt -s nullglob
            local files=( $input )
            shopt -u nullglob

            if [ ${#files[@]} -eq 0 ]; then
                error "未找到匹配的图片: $input"
            fi

            for f in "${files[@]}"; do
                result="${result}${sep}${f}"
                sep=","
            done
            ;;
        *)
            IFS=',' read -ra paths <<< "$input"
            for p in "${paths[@]}"; do
                p="$(echo "$p" | xargs)"
                if [ ! -f "$p" ]; then
                    error "图片文件不存在: $p"
                fi
                result="${result}${sep}${p}"
                sep=","
            done
            ;;
    esac

    echo "$result"
}

# ============================================================
# JSON 解析（使用 node）
# ============================================================

parse_json_field() {
    local json="$1"
    local field="$2"
    node -e "
let d = '';
process.stdin.on('data', c => d += c);
process.stdin.on('end', () => {
  try { console.log(JSON.parse(d)[process.argv[1]] || ''); }
  catch(e) { console.log(''); }
});
" "$field" <<< "$json" 2>/dev/null || echo ""
}

# ============================================================
# 主流程
# ============================================================

main() {
    parse_args "$@"

    if [ -z "$TITLE" ] && [ -z "$CONTENT" ] && [ -z "$IMAGES" ]; then
        show_help
        exit 0
    fi

    info "${CYAN}📱 wx-newspic — 小绿书图片消息发布${NC}"
    info ""

    validate_args

    CLI=$(find_cli) || error "wx-newspic CLI 未安装。请执行: npm install -g @packy-tang/wx-newspic"
    info "${GREEN}✅ 使用 CLI: $CLI${NC}"

    info "🔍 解析图片路径..."
    EXPANDED_IMAGES=$(expand_images "$IMAGES")
    IFS=',' read -ra IMAGE_LIST <<< "$EXPANDED_IMAGES"
    local img_count=${#IMAGE_LIST[@]}
    info "   共找到 $img_count 张图片"

    if [ "$img_count" -gt 20 ]; then
        error "图片数量不能超过 20 张，当前 $img_count 张。"
    fi

    # 构建 CLI 参数（使用数组避免 eval）
    CLI_ARGS=()
    CLI_ARGS+=(publish)
    CLI_ARGS+=(--title "$TITLE")
    CLI_ARGS+=(--content "$CONTENT")

    local images_arg=""
    local img_sep=""
    for img in "${IMAGE_LIST[@]}"; do
        images_arg="${images_arg}${img_sep}$(echo "$img" | xargs)"
        img_sep=","
    done
    CLI_ARGS+=(--images "$images_arg")

    [ -n "$AUTHOR" ] && CLI_ARGS+=(--author "$AUTHOR")
    [ -n "$DIGEST" ] && CLI_ARGS+=(--digest "$DIGEST")
    [ -n "$SERVER" ] && CLI_ARGS+=(--server "$SERVER")
    [ -n "$API_KEY" ] && CLI_ARGS+=(--api-key "$API_KEY")

    info ""
    info "${YELLOW}📤 正在发布...${NC}"
    info "   标题: $TITLE"
    info "   图片: $img_count 张"
    [ -n "$AUTHOR" ] && info "   作者: $AUTHOR"
    info "   服务器: $SERVER"

    info ""
    local output
    if [ "$JSON_MODE" = true ]; then
        output=$("$CLI" "${CLI_ARGS[@]}" 2>&1) || {
            local exit_code=$?
            if echo "$output" | node -e "process.stdin.resume();let d='';process.stdin.on('data',c=>d+=c);process.stdin.on('end',()=>process.exit(d.trim().startsWith('{')?0:1))" 2>/dev/null; then
                echo "$output"
            else
                echo "{\"success\":false,\"error\":{\"code\":\"CLI_ERROR\",\"message\":\"${output:-CLI 执行失败（退出码: $exit_code）}\"}}"
            fi
            exit $exit_code
        }
        echo "$output"
    else
        output=$("$CLI" "${CLI_ARGS[@]}" 2>&1) || {
            local exit_code=$?
            echo ""
            error "${output:-CLI 执行失败（退出码: $exit_code）}"
        }

        local media_id
        local created_at
        media_id=$(parse_json_field "$output" "media_id")
        created_at=$(parse_json_field "$output" "created_at")

        if [ -n "$media_id" ]; then
            echo ""
            echo -e "${GREEN}✅ 发布成功！${NC}"
            echo -e "   ${CYAN}media_id:${NC}   $media_id"
            echo -e "   ${CYAN}创建时间:${NC}  $created_at"
            echo ""
            echo -e "${YELLOW}📱 请前往公众号后台草稿箱查看：${NC}"
            echo "   https://mp.weixin.qq.com/"
        else
            echo ""
            echo -e "${RED}❌ 发布失败！${NC}"
            echo -e "   ${output}"
            echo ""
            echo -e "${YELLOW}💡 常见问题：${NC}"
            echo "   1. 中转服务是否启动？→ wx-newspic serve --api-key \"sk-xxx\""
            echo "   2. 中转服务器地址是否正确？→ --server 参数"
            echo "   3. API Key 是否正确？→ --api-key 参数"
            echo "   4. 微信凭证是否正确？→ 检查 ~/.openclaw/skills/wechat-publisher/.env"
        fi
    fi
}

main "$@"
