#!/bin/sh
set -e

RUN_MODE=${RUN_MODE:-DRY_RUN}

case "$RUN_MODE" in
  DRY_RUN)
    echo "=== [dry-run] 1. news mode with Chinese markdown ==="
    wx-newspic publish \
      --type news \
      --title "梦境测试" \
      --md /tmp/test-fixtures/梦境文章.md \
      --dry-run
    echo ""

    echo "=== [dry-run] 2. news mode with percent-encoded Chinese image path ==="
    wx-newspic publish \
      --type news \
      --title "梦境图片测试" \
      --content '<p>正文</p><img src="/tmp/test-fixtures/OpenClaw%E6%A2%A6%E5%A2%83/cover.png">' \
      --dry-run
    echo ""

    echo "=== [dry-run] 3. newspic mode with Chinese directory glob ==="
    wx-newspic publish \
      --type newspic \
      --title "梦境文章" \
      --content "测试正文" \
      --images "/tmp/test-fixtures/OpenClaw梦境/*.png" \
      --dry-run
    echo ""

    echo "=== ALL DRY-RUN TESTS PASSED ==="
    ;;

  SERVER)
    exec wx-newspic server --port "${PORT:-3000}" --host "${HOST:-0.0.0.0}"
    ;;

  CUSTOM)
    if [ -z "$CLI_ARGS" ]; then
      echo "RUN_MODE=CUSTOM requires CLI_ARGS environment variable"
      exit 1
    fi
    eval set -- "$CLI_ARGS"
    exec "$@"
    ;;

  # MOCK_SERVER: 暂未实现。如需在 Docker 中运行 mock WeChat API server，
  # 可使用内置 proxy server（SERVER 模式）配合环境变量实现。
  *)
    echo "Unknown RUN_MODE: $RUN_MODE"
    echo "Valid modes: DRY_RUN, SERVER, CUSTOM"
    exit 1
    ;;
esac
