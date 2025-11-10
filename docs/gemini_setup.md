# Gemini向けセットアップガイド

別の macOS マシンで Gemini エージェントから After Effects を操作できるようにするための手順です。  
Codex で確認済みの構成を、HTTP トランスポート + Gemini クライアントで再現します。

## 1. 前提条件
- macOS 上で Adobe After Effects 2024 以降が動作していること。
- 管理者権限で `~/Library/Application Support/Adobe/CEP/extensions` 以下にファイルを配置できること。
- Python 3.10 以上（pyenv など任意）が利用可能であること。
- `uv` もしくは `pip` を使用して Python 依存をインストールできること。
- Gemini CLI もしくは Gemini エージェント環境がローカル FastMCP HTTP サーバーへ接続できること。

### 1.1 ツール確認
Gemini でセットアップを開始する前に、以下のコマンドを実行できるか確認する。見つからない場合はユーザーにインストールを依頼する。
```bash
pyenv --version
uv --version   # 未導入なら pip を使用
python3 --version
```

## 2. After Effects / CEP 拡張のセットアップ
1. 本リポジトリをクローンまたはコピーする（例: `~/Repository/mcp-aftereffects`）。
2. `CEP extensions` ディレクトリへシンボリックリンクまたはコピーを作成する。  
   ```bash
   USER_CEP="$HOME/Library/Application Support/Adobe/CEP/extensions"
   GLOBAL_CEP="/Library/Application Support/Adobe/CEP/extensions"
   if [ -d "$GLOBAL_CEP" ]; then CEP_EXT_DIR="$GLOBAL_CEP"; else CEP_EXT_DIR="$USER_CEP"; fi
   echo "Using CEP dir: $CEP_EXT_DIR"
   mkdir -p "$CEP_EXT_DIR"
   ln -s ~/Repository/mcp-aftereffects "$CEP_EXT_DIR/llm-video-agent"
   ```
   ※ 既に同名ディレクトリがある場合は削除または別名に調整する。  
   ※ `/Library/...` 側を使用する場合は `sudo` が必要になるので、ユーザーに実行してもらう。Gemini はコマンド例と確認のみを行う。
3. After Effects を起動し、`ウィンドウ > 機能拡張 (ベータ) > LLM Video Agent` を開く。
4. パネル右側のログに  
   ```
   Server listening on http://127.0.0.1:8080
   main.js loaded.
   ```  
   が表示されていれば CEP 内部の HTTP ブリッジが稼働している。

## 3. Python/FastMCP 依存のインストール
推奨: リポジトリ直下に専用の仮想環境 `.venv` を作り、その中に依存を入れる。
```bash
cd ~/Repository/mcp-aftereffects
uv venv                              # もしくは python -m venv .venv
source .venv/bin/activate            # Windows の場合は .venv\Scripts\activate
uv pip install -r server/requirements.txt
```
`fastmcp` と `requests` がインストールされていれば OK。  
`.venv/bin/python` はパネル側で自動検出され、特別な環境変数を設定しなくても FastMCP の実行に使われる。別の環境を使いたい場合のみ `AE_FASTMCP_PYTHON` などで明示指定する。

## 4. FastMCP HTTP ブリッジを起動
After Effects パネル（LLM Video Agent）は起動時に自動で FastMCP サーバーを立ち上げ、パネルを閉じるとサーバーも停止する。  
デフォルトでは HTTP トランスポート / ポート 8000 を使用し、ログはすべてパネルに流れる。

> 手動デバッグ用途で FastMCP を単体起動したい場合は、以下のコマンドでも従来どおり起動できる。
> ```bash
> cd ~/Repository/mcp-aftereffects
> python -m server.fastmcp_server \
>   --transport http \
>   --port 8000 \
>   --bridge-url http://127.0.0.1:8080
> ```
> その際は `--bridge-url` とポート番号を環境に合わせて変更し、Gemini 側の設定も同じ値にそろえる。

## 5. Gemini クライアントの MCP 設定
Gemini CLI の例:
```bash
gemini mcp add ae-fastmcp http://127.0.0.1:8000/mcp \
  --transport http \
  --description "After Effects FastMCP bridge"
```
Gemini CLI には `enable` サブコマンドが無いため、追加後は CLI を終了し、以降の作業では新しい Gemini セッションを起動して利用する。GUI ベースの Gemini エージェントでも同様に HTTP エンドポイント `http://127.0.0.1:8000/mcp` を登録し、トランスポートもHTTPに設定する。

## 6. セットアップ後の運用手順
セットアップ完了後は、以下の順番で本番作業を行う。順序が入れ替わると接続に失敗する場合があるため、この流れを守る。

1. **After Effects:** ユーザーに AE を起動してもらい、`ウィンドウ > 機能拡張 (ベータ) > LLM Video Agent` パネルで `Server listening on http://127.0.0.1:8080` が表示されているか確認してもらう（Gemini はこの依頼と確認待ちのみを行う）。  
   - パネルが開かれると HTTP ブリッジと FastMCP サーバー (HTTP トランスポート, デフォルトポート 8000) が自動で起動し、両方のログがパネル内に流れる。
2. **FastMCP:** FastMCP サーバーはパネルが開いている間のみ稼働する。必要に応じてポートを変更したい場合は AE 起動前に `FASTMCP_PORT`（および `AE_BRIDGE_URL`）環境変数を設定し、パネルを再読み込みする。ログに `FastMCPサーバーが起動しました` が出ていれば準備完了。
3. **Gemini:** 新しいターミナルで `gemini --allowed-mcp-server-names ae-fastmcp` を起動し、最初のプロンプトで「`get_layers` ツールを実行して結果を表示してください」と指示する（GUI でも会話で同じ依頼を行う）。`get_layers` が成功すれば疎通完了。
4. **追加ツール:** `get_properties` や `set_expression` など、必要な操作を順次指示して作業を進める。

> NOTE: セットアップ専用で起動した Gemini セッションは手順5終了時点で閉じ、本番作業用セッションを改めて立ち上げる想定。

## 7. よくあるトラブルのヒント
- **ポート競合**: `lsof -i :8080` / `lsof -i :8000` で使用状況を確認。CEP と FastMCP が同じポートを使わないよう注意。
- **Gemini 接続が失敗する**: サーバー起動コマンドに `--transport http` を付け忘れていないか確認。Codex と違い、Gemini は STDIO ではなく HTTP を利用する。
- **set_expression が 500 になる**: プロパティパスのスペルミスやレイヤーIDの誤りが多い。`get_properties` でパスを確認してから再試行する。

これらの手順を踏めば、別の Mac でも Gemini エージェント経由で After Effects を操作できるようになる。

## 8. AE Gemini Launcher (.app) での簡易起動
- `launchers/AEGeminiLauncher.app` をダブルクリックすると、ターミナルが開き `scripts/launch_gemini_stack.sh` が実行されます。
- このスクリプトは以下を自動化します。
-  1. `curl http://127.0.0.1:8080/health` で After Effects パネルの稼働を確認し、未起動ならエラーで終了。
-  2. パネル側で FastMCP が待機している前提で、`gemini --allowed-mcp-server-names ae-fastmcp` を前面ターミナルで実行。
- FastMCP サーバーはパネルが開いている間だけ自動起動・停止するため、`.app` の役割は「Gemini CLI を素早く立ち上げる」ことに集約されました。
- 依存コマンド (`gemini`, `curl`) が PATH にあることが前提です。初回のみ `gemini mcp add ae-fastmcp http://127.0.0.1:8000/mcp --transport http` を手動で登録してください。
- `.app` はリポジトリ内 (例: `mcp-aftereffects/launchers`) に置く必要があります。外へ移動すると `server/fastmcp_server.py` が見つからず起動できません。
- ポートや URL を変更したい場合は After Effects/CEP が起動する前に `AE_BRIDGE_URL` や `FASTMCP_PORT` を環境変数として設定し、その状態でパネルを再読み込みしてください（`scripts/launch_gemini_stack.sh` を直接実行する場合も同じ値でヘルスチェックが行われます）。
