#!/usr/bin/env bash
# wechat-newspic: 发布图片消息（小绿书）到微信公众号草稿箱
# Usage: ./publish.sh --title "标题" --content "正文" --images "path1.png,path2.png"
#
# 可选参数：
#   --author, -a    <string>    作者
#   --digest, -d    <string>    摘要
#   --server, -s    <url>       中转服务器地址（默认取自环境变量 WX_NEWSPIC_SERVER）
#   --api-key, -k   <string>    中转服务器 API Key（默认取自环境变量 WX_NEWSPIC_API_KEY）
#   --json, -j                 以 JSON 格式输出结果
#   --help, -h                  查看帮助

set -e

# ============================================================
# 配置
# ============================================================

# 颜色定义（仅非 JSON 模式使用）
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

# 默认值
JSON_MODE=false

# 本项目目录（脚本所在目录的上级）
SKILL_DIR="$(cd "$(dirname "$0")/.." && pwd)"
PROJECT_DIR="$(cd "$SKILL_DIR/.." && pwd)"

# ============================================================
# 辅助函数
# ============================================================

# 输出错误信息
error() {
    local msg="$1"
    if [ "$JSON_MODE" = true ]; then
        echo "{\"success\":false,\"error\":{\"code\":\"SCRIPT_ERROR\",\"message\":\"$msg\"}}"
    else
        echo -e "${RED}❌ $msg${NC}" >&2
    fi
    exit 1
}

# 输出信息（仅非 JSON 模式）
info() {
    if [ "$JSON_MODE" = false ]; then
        echo -e "$1"
    fi
}

# JSON 格式输出成功
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

# JSON 格式输出失败
json_fail() {
    local code="$1"
    local message="$2"
    cat <<EOF
{
  "success": false,
  "error": {
    "code": "$code",
    "message": "$message"
  }
}
EOF
}

# ============================================================
# 查找 wx-newspic CLI
# ============================================================

find_cli() {
    # 优先级 1: 项目内 node_modules/.bin/wx-newspic
    local local_bin="$PROJECT_DIR/node_modules/.bin/wx-newspic"
    if [ -x "$local_bin" ]; then
        echo "$local_bin"
        return 0
    fi

    # 优先级 2: 全局安装的 wx-newspic
    if command -v wx-newspic &>/dev/null; then
        echo "wx-newspic"
        return 0
    fi

    # 优先级 3: 检查 bin/ 下的入口
    local bin_entry="$PROJECT_DIR/bin/wx-newspic"
    if [ -f "$bin_entry" ]; then
        echo "$bin_entry"
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
    SERVER="${WX_NEWSPIC_SERVER:-}"
    API_KEY="${WX_NEWSPIC_API_KEY:-}"

    while [ $# -gt 0 ]; do
        case "$1" in
            --title|-t)
                shift
                TITLE="$1"
                ;;
            --content|-c)
                shift
                CONTENT="$1"
                ;;
            --images|-i)
                shift
                IMAGES="$1"
                ;;
            --author|-a)
                shift
                AUTHOR="$1"
                ;;
            --digest|-d)
                shift
                DIGEST="$1"
                ;;
            --server|-s)
                shift
                SERVER="$1"
                ;;
            --api-key|-k)
                shift
                API_KEY="$1"
                ;;
            --json|-j)
                JSON_MODE=true
                ;;
            --help|-h)
                show_help
                exit 0
                ;;
            *)
                error "未知参数: $1。使用 --help 查看帮助。"
                ;;
        esac
        shift
    done
}

# ============================================================
# 参数校验
# ============================================================

validate_args() {
    # 校验标题
    if [ -z "$TITLE" ]; then
        error "标题不能为空，请使用 --title 参数指定。"
    fi
    if [ ${#TITLE} -gt 32 ]; then
        error "标题不能超过 32 个字符，当前 ${#TITLE} 个字符。"
    fi

    # 校验正文
    if [ -z "$CONTENT" ]; then
        error "正文不能为空，请使用 --content 参数指定。"
    fi

    # 校验图片
    if [ -z "$IMAGES" ]; then
        error "图片路径不能为空，请使用 --images 参数指定。"
    fi

    # 校验中转服务器
    if [ -z "$SERVER" ]; then
        error "未指定中转服务器地址。请通过 --server 参数或 WX_NEWSPIC_SERVER 环境变量指定。"
    fi
}

# ============================================================
# 显示帮助
# ============================================================

show_help() {
    cat <<EOF
用法: $0 [选项]

发布图片消息（小绿书）到微信公众号草稿箱。

必填选项:
  --title, -t     <string>    标题（最长 32 字）
  --content, -c   <string>    正文内容（纯文本）
  --images, -i    <string>    图片路径列表，逗号分隔（最多 20 张）

可选选项:
  --author, -a    <string>    作者（最长 16 字）
  --digest, -d    <string>    摘要（最长 128 字）
  --server, -s    <url>       中转服务器地址（默认: \$WX_NEWSPIC_SERVER）
  --api-key, -k   <string>    中转服务器 API Key（默认: \$WX_NEWSPIC_API_KEY）
  --json, -j                  以 JSON 格式输出结果
  --help, -h                  查看帮助

示例:
  $0 --title "标题" --content "正文" --images "./output/slide-1.png,./output/slide-2.png"
  $0 --title "标题" --content "正文" --images "./output/*.png" --author "叶帕奇"
  $0 -t "标题" -c "正文" -i "./slides/*.png" --json

环境变量:
  WX_NEWSPIC_SERVER     中转服务器地址（如 https://your-server.com）
  WX_NEWSPIC_API_KEY    中转服务器 API Key
EOF
}

# ============================================================
# 图片路径处理
# ============================================================

expand_images() {
    local input="$1"
    local sep=""
    local result=""

    # 如果输入包含 glob 字符（*?[]），用 shell 展开
    case "$input" in
        *[\*\?\[]*)
            # shell 展开 glob（关闭 nullglob 避免空结果出错）
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
            # 逗号分隔列表，逐个校验文件存在性
            IFS=',' read -ra paths <<< "$input"
            for p in "${paths[@]}"; do
                p="$(echo "$p" | xargs)"  # trim
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
# 主流程
# ============================================================

main() {
    # 解析参数
    parse_args "$@"

    # 如果没参数，显示帮助
    if [ -z "$TITLE" ] && [ -z "$CONTENT" ] && [ -z "$IMAGES" ]; then
        show_help
        exit 0
    fi

    info "${CYAN}📱 wechat-newspic — 小绿书图片消息发布${NC}"
    info ""

    # 校验参数
    validate_args

    # 查找 wx-newspic CLI
    CLI=$(find_cli) || error "wx-newspic CLI 未找到。请确保已安装：npm install -g wechat-newspic"
    info "${GREEN}✅ 使用 CLI: $CLI${NC}"

    # 展开图片路径
    info "🔍 解析图片路径..."
    EXPANDED_IMAGES=$(expand_images "$IMAGES")
    IFS=',' read -ra IMAGE_LIST <<< "$EXPANDED_IMAGES"
    local img_count=${#IMAGE_LIST[@]}
    info "   共找到 $img_count 张图片"

    # 检查图片数量
    if [ "$img_count" -gt 20 ]; then
        error "图片数量不能超过 20 张，当前 $img_count 张。"
    fi

    # 构建 CLI 参数
    CLI_ARGS="publish"
    CLI_ARGS="$CLI_ARGS --title \"$TITLE\""
    CLI_ARGS="$CLI_ARGS --content \"$CONTENT\""

    # 图片参数
    local images_arg=""
    local img_sep=""
    for img in "${IMAGE_LIST[@]}"; do
        images_arg="${images_arg}${img_sep}$(echo "$img" | xargs)"
        img_sep=","
    done
    CLI_ARGS="$CLI_ARGS --images $images_arg"

    [ -n "$AUTHOR" ] && CLI_ARGS="$CLI_ARGS --author \"$AUTHOR\""
    [ -n "$DIGEST" ] && CLI_ARGS="$CLI_ARGS --digest \"$DIGEST\""
    [ -n "$SERVER" ] && CLI_ARGS="$CLI_ARGS --server \"$SERVER\""
    [ -n "$API_KEY" ] && CLI_ARGS="$CLI_ARGS --api-key \"$API_KEY\""

    info ""
    info "${YELLOW}📤 正在发布...${NC}"
    info "   标题: $TITLE"
    info "   图片: $img_count 张"
    [ -n "$AUTHOR" ] && info "   作者: $AUTHOR"
    info "   服务器: $SERVER"

    # 调用 CLI
    info ""
    local output
    # 使用 eval 执行（确保引号正确处理）
    if [ "$JSON_MODE" = true ]; then
        output=$(eval "$CLI $CLI_ARGS" 2>&1) || {
            local exit_code=$?
            if echo "$output" | grep -q "^{"; then
                # CLI 已经输出 JSON（可能是错误 JSON）
                echo "$output"
            else
                json_fail "CLI_ERROR" "${output:-"CLI 执行失败（退出码: $exit_code）"}"
            fi
            exit $exit_code
        }
        # 直接输出 CLI 的 JSON 结果
        echo "$output"
    else
        output=$(eval "$CLI $CLI_ARGS" 2>&1) || {
            local exit_code=$?
            echo ""
            error "${output:-"CLI 执行失败（退出码: $exit_code）"}"
        }
        # 尝试解析 JSON 输出
        local media_id
        local created_at
        media_id=$(echo "$output" | python3 -c "import sys,json; print(json.load(sys.stdin).get('media_id',''))" 2>/dev/null || echo "")
        created_at=$(echo "$output" | python3 -c "import sys,json; print(json.load(sys.stdin).get('created_at',''))" 2>/dev/null || echo "")

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

# ============================================================
# 运行
# ============================================================
main "$@"
