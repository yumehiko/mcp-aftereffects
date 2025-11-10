#!/usr/bin/env bash

set -u

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"

BRIDGE_URL="${AE_BRIDGE_URL:-http://127.0.0.1:8080}"
FASTMCP_PORT="${FASTMCP_PORT:-8000}"
GEMINI_COMMAND="${GEMINI_COMMAND:-gemini}"
MCP_SERVER_NAME="${MCP_SERVER_NAME:-ae-fastmcp}"
PYTHON_BIN="${PYTHON_BIN:-python3}"

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

cleanup() {
    if [[ -n "${SERVER_PID:-}" ]]; then
        if kill -0 "$SERVER_PID" >/dev/null 2>&1; then
            echo
            info "FastMCPサーバーを停止しています (PID: $SERVER_PID)。"
            kill "$SERVER_PID" >/dev/null 2>&1 || true
            wait "$SERVER_PID" 2>/dev/null || true
        fi
    fi
}

trap cleanup EXIT INT TERM

require_command "$PYTHON_BIN"
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

info "FastMCPサーバーをHTTPモードで起動します (port: $FASTMCP_PORT)..."
cd "$REPO_ROOT"
"$PYTHON_BIN" -m server.fastmcp_server \
    --transport http \
    --port "$FASTMCP_PORT" \
    --bridge-url "$BRIDGE_URL" &
SERVER_PID=$!

sleep 1
if ! kill -0 "$SERVER_PID" >/dev/null 2>&1; then
    error "FastMCPサーバーの起動に失敗しました。ターミナル出力を確認してください。"
fi

info "FastMCPサーバー起動済み (PID: $SERVER_PID)。Gemini CLI を起動します。"
echo "[INFO] Gemini CLI を終了すると FastMCP サーバーも自動停止します。"
echo

if ! "$GEMINI_COMMAND" --allowed-mcp-server-names "$MCP_SERVER_NAME"; then
    warn "Gemini CLI がエラー終了しました。上記ログを確認してください。"
    exit 1
fi
