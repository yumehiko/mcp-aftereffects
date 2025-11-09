# FastMCP Bridge

FastMCPサーバーからAfterEffects CEP拡張（`client/main.js`）のHTTP APIを呼び出すためのPythonコードです。  
LLMクライアントは本サーバーを通じてMCPツールとしてレイヤー取得・プロパティ取得・エクスプレッション設定を利用できます。

## 必要条件
- Python 3.10以降
- `uv` もしくは `pip` が使用可能であること
- AfterEffects側のCEP拡張が起動済みで、`http://127.0.0.1:8080` でAPIが待ち受けていること

## セットアップ
```bash
cd server
uv pip install -r requirements.txt
# または
pip install -r requirements.txt
```

## 実行方法
### Codex（MCPクライアント）からのSTDIO起動（推奨）
Codexの `mcp_servers` 設定に以下のように記述すると、Codexが必要に応じて FastMCP サーバーを起動・終了します。
```toml
[mcp_servers.ae-fastmcp]
command = "python3"
args = ["-m", "server.fastmcp_server", "--bridge-url", "http://127.0.0.1:8080"]
```

この構成では iTerm 等でサーバーを個別に立ち上げる必要はなく、Codexの起動順序は「AfterEffects を起動 → LLM Video Agent パネルでCEP HTTP(8080)を確認 → Codex 起動」の3ステップで完結します。

### HTTPトランスポート（手動起動したい場合）
手動でFastMCPサーバーをホストし、HTTP経由で他クライアントから接続したい場合のみ次を使用します。
```bash
python -m server.fastmcp_server --transport http --port 8000
```
環境変数 `AE_BRIDGE_URL` もしくは `--bridge-url` オプションでCEPサーバーのURLを変更できます。  
`fastmcp run server.fastmcp_server:mcp --transport http --port 8000` も同等です。

## 提供ツール
| MCPツール名       | 処理内容                               |
| ----------------- | -------------------------------------- |
| `get_layers`      | アクティブコンポジションのレイヤー一覧 |
| `get_properties`  | 指定レイヤーのプロパティツリー取得     |
| `set_expression`  | プロパティへのエクスプレッション適用   |

いずれのツールもCEP HTTP APIのレスポンスをそのまま返し、エラー時はFastMCPの標準エラーとして伝搬します。
