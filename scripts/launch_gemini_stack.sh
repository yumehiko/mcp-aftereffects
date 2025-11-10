#!/usr/bin/env bash

set -u

BRIDGE_URL="${AE_BRIDGE_URL:-http://127.0.0.1:8080}"
FASTMCP_PORT="${FASTMCP_PORT:-8000}"
GEMINI_COMMAND="${GEMINI_COMMAND:-gemini}"
MCP_SERVER_NAME="${MCP_SERVER_NAME:-ae-fastmcp}"

info() {
    echo "[INFO] $*"
}

warn() {
    echo "[WARN] $*"
}

error() {
    echo "[ERROR] $*" >&2
    exit 1
}

require_command() {
    if ! command -v "$1" >/dev/null 2>&1; then
        error "必須コマンド '$1' が見つかりません。パスを確認してください。"
    fi
}

require_command "$GEMINI_COMMAND"
require_command curl

info "After Effects パネル (HTTP bridge) の疎通を確認しています..."
if ! curl --silent --fail --max-time 2 "$BRIDGE_URL/health" >/dev/null 2>&1; then
    cat <<'MSG'
[ERROR] After Effects 側のHTTPブリッジに接続できませんでした。
 - AEで「LLM Video Agent」パネルを開いているか確認してください。
 - パネル右側のログに "Server listening on http://127.0.0.1:8080" が出ている必要があります。
 - ポートを変更している場合は AE_BRIDGE_URL 環境変数で正しいURLを指定してください。
MSG
    exit 1
fi

info "FastMCPサーバーはパネル起動時にバックグラウンドで待機します (port: $FASTMCP_PORT)。"
info "Gemini CLI を起動します。"
echo

if ! "$GEMINI_COMMAND" --allowed-mcp-server-names "$MCP_SERVER_NAME"; then
    warn "Gemini CLI がエラー終了しました。上記ログを確認してください。"
    exit 1
fi
