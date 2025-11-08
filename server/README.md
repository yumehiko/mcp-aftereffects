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
### stdioトランスポート（ローカルCLI連携向け）
```bash
python -m server.fastmcp_server
```

### HTTPトランスポート（Gemini CLIなどHTTPクライアント接続向け）
```bash
python -m server.fastmcp_server --transport http --port 8000
```

環境変数 `AE_BRIDGE_URL` もしくは `--bridge-url` オプションでCEPサーバーのURLを変更できます。

### fastmcp CLIがある場合
```bash
fastmcp run server.fastmcp_server:mcp --transport http --port 8000
```

## 提供ツール
| MCPツール名       | 処理内容                               |
| ----------------- | -------------------------------------- |
| `get_layers`      | アクティブコンポジションのレイヤー一覧 |
| `get_properties`  | 指定レイヤーのプロパティツリー取得     |
| `set_expression`  | プロパティへのエクスプレッション適用   |

いずれのツールもCEP HTTP APIのレスポンスをそのまま返し、エラー時はFastMCPの標準エラーとして伝搬します。
