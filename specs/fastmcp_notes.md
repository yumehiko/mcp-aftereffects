# FastMCP連携ノート

## 背景と目的
- 本プロジェクトの最終目標は、LLMエージェントからAfterEffectsを自然言語操作することにある（`specs/requirement.md:1`）。
- 現状はCEP拡張＋ローカルHTTPサーバーという構成でレイヤー列挙・プロパティ取得・エクスプレッション適用を実現している（`specs/design.md:29`）。  
  これらの機能をMCP（Model Context Protocol）準拠サーバーとして公開することで、Geminiなどのマルチエージェント環境から標準手順で呼び出せるようにする。

## MCPについての整理
- MCPはLLMと外部ツール/データソースを接続するための新しいプロトコルで、ツール定義・リソース共有・イベントストリームなどを規定する。
- 当リポジトリには `specs/mcp_construction_guide.md:1` があり、Context7ライブラリの参照IDが記載されている。`get_library_docs` ツール経由で一次情報を取得する想定。
- MCPサーバーを組み立てる際は以下を定義する必要がある。
  1. **Transport**: HTTP / WebSocket / stdio のいずれか。
  2. **Tools**: LLMが呼び出す関数群と、その入出力スキーマ。
  3. **Resources**: 共有する静的ドキュメント（省略可）。
  4. **権限管理**: ローカルAEを操作するので、接続元を制限する。

## FastMCP概要と現状整理
- Context7ライブラリ `/jlowin/fastmcp` に公式ドキュメントが公開されている。Python製フレームワークで、MCPサーバー/クライアント双方を実装できる。
- **インストールと実行**
  - 推奨は `uv`（Pythonパッケージマネージャ）で依存関係を導入する: `uv pip install fastmcp` またはリポジトリへの `uv pip install -e .`
  - サーバーは `fastmcp run my_server.py:mcp` もしくは `python my_server.py` で起動可能。`mcp.run()` がデフォルトでstdioトランスポート、`mcp.run(transport="http", port=8000)` でHTTP鞘。
  - ASGIアプリとして `mcp.http_app()` を `uvicorn` などでホストするパターンもある。
- **最小サーバー構成**
  ```python
  from fastmcp import FastMCP

  mcp = FastMCP("AE Bridge")

  @mcp.tool
  def greet(name: str) -> str:
      return f"Hello, {name}!"

  if __name__ == "__main__":
      mcp.run()
  ```
  ツールはデコレータで登録。HTTP経由で利用する際はクライアントから `Client("http://localhost:8000/mcp")` のように接続し `await client.call_tool("greet", {"name": "Codex"})` で呼べる。
- **構成機能**
  - ツール、リソース、プロンプトの登録APIをサポート。
  - OpenAPIや別サーバーの取り込み (`import_server`) による合成が可能。
  - 認証 (`AuthProvider` の `get_well_known_routes` 等) やHTTP/stdio双方のトランスポート。
- **現時点での不明点/調査対象**
  - 当プロジェクトで必要なモジュール構成（単一PythonサーバーにAfterEffects HTTPクライアントを内包するか）。
  - ローカル環境（macOS + AfterEffects）でのPythonランタイム整備とFastMCPプロセス常駐手順。

## 既存機能とのマッピング案
| MCPツール名 (案) | 既存実装 | 役割 |
| --- | --- | --- |
| `get_layers` | `agent/tools.js#getLayerList` & `/layers` API | アクティブコンポジションのレイヤー一覧を返す |
| `get_properties` | `agent/tools.js#getPropertyTree` & `/properties` API | 指定レイヤーのプロパティツリー取得 |
| `set_expression` | `agent/tools.js#setExpression` & `/expression` API | プロパティにエクスプレッションを適用 |

- FastMCP上では、これらツールの入出力スキーマをMCP仕様に沿って宣言する必要がある。  
- 現行HTTPサーバーをFastMCPサーバーへ置き換えるか、もしくはFastMCPから既存HTTP APIをコールするラッパーツールとして実装するか、方針を決める（後者の方が段階的移行が容易）。

## FastMCPブリッジ実装状況
- Pythonクライアント `server/ae_client.py:1` がCEP HTTP APIを叩くラッパーとして追加済み。エラーは `AEBridgeError` として正規化。
- FastMCPサーバー定義は `server/fastmcp_server.py:1`。`get_layers` / `get_properties` / `set_expression` の3ツールをエクスポートし、`fastmcp run server.fastmcp_server:mcp` で利用可能。
- 依存関係は `server/requirements.txt:1` に `fastmcp` と `requests` を定義。
- 起動手順やトランスポート切り替え方法は `server/README.md:1` に記載。
- `AE_BRIDGE_URL` 環境変数または `--bridge-url` オプションでCEPサーバーのURLを変更できる。

## 当面のアクションアイテム
1. **情報補完**  
   - `/jlowin/fastmcp` ドキュメントを読み進め、認証・デプロイ・OpenAPI連携あたりの実装要点を追記する（特にHTTPサーバーとして公開する場合の推奨構成）。
2. **PoC設計**  
   - トランスポートはまずHTTP（localhost限定）を想定。FastMCPツール内部で既存CEP HTTP API (`http://127.0.0.1:8080`) を叩くラッパーを実装し、MCPインターフェースを提供する。
   - アプリ構成案:
     ```text
     fastmcp_server/
       server.py        # FastMCP定義。tools: get_layers / get_properties / set_expression
       ae_client.py     # 既存agent/tools.jsと同等のHTTPクライアントをPython化
     ```
3. **接続手順ドキュメント**  
   - 「AfterEffects CEPサーバー起動 → FastMCPサーバー起動 → Gemini CLIからMCPエンドポイント接続」という手順を README or docs に追記。（`server/README.md:1` に初期版あり。必要に応じてルートREADMEへも転載する。）
4. **運用設計**  
   - ログ取得、エラー伝搬（AfterEffectsスクリプト失敗時のメッセージ返却）をMCPレスポンス規約に沿って整理。

## 未解決事項
- FastMCP自体の正確な仕様・CLI構文。
- ランタイム要件（Node版かPython版か等）。
- セキュリティモデル（APIキー、ローカル限定など）。
- MCPクライアント（Gemini CLIなど）とFastMCPサーバーをどう接続するかの実例。

今後、これらの情報を入手でき次第、本ファイルを最新版に更新する。
