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
新しいマシン上で以下を実行し、FastMCP ブリッジの依存を導入する。
```bash
cd ~/Repository/mcp-aftereffects/server
uv pip install -r requirements.txt
# uv が無ければ
# pip install -r requirements.txt
```
`fastmcp` と `requests` がインストールされていれば OK。

## 4. FastMCP HTTP ブリッジを起動
Gemini から接続できるよう HTTP トランスポートでサーバーを常駐させる（このコマンドはユーザーに実行してもらう）。
```bash
cd ~/Repository/mcp-aftereffects
python -m server.fastmcp_server \
  --transport http \
  --port 8000 \
  --bridge-url http://127.0.0.1:8080
```
- `--bridge-url` は CEP 拡張の HTTP API を指す。ポート変更時は合わせて修正。
- 8000 が使用中なら空いているポートへ変更し、次章の Gemini 設定も同じ値にそろえる。
- 起動が成功したら、まず `get_layers` を呼び出して疎通確認する（パネル側でログが追えないため、ツール実行で確認するのが確実）。

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
2. **FastMCP:** ユーザーに別ターミナルで
   ```bash
   python -m server.fastmcp_server --transport http --port 8000 --bridge-url http://127.0.0.1:8080
   ```
   を実行し、サーバーを常駐させる（ポート競合時は番号を変更）。
3. **Gemini:** 新しいターミナルで `gemini --allowed-mcp-server-names ae-fastmcp` を起動し、最初のプロンプトで「`get_layers` ツールを実行して結果を表示してください」と指示する（GUI でも会話で同じ依頼を行う）。`get_layers` が成功すれば疎通完了。
4. **追加ツール:** `get_properties` や `set_expression` など、必要な操作を順次指示して作業を進める。

> NOTE: セットアップ専用で起動した Gemini セッションは手順5終了時点で閉じ、本番作業用セッションを改めて立ち上げる想定。

## 7. よくあるトラブルのヒント
- **ポート競合**: `lsof -i :8080` / `lsof -i :8000` で使用状況を確認。CEP と FastMCP が同じポートを使わないよう注意。
- **Gemini 接続が失敗する**: サーバー起動コマンドに `--transport http` を付け忘れていないか確認。Codex と違い、Gemini は STDIO ではなく HTTP を利用する。
- **set_expression が 500 になる**: プロパティパスのスペルミスやレイヤーIDの誤りが多い。`get_properties` でパスを確認してから再試行する。

これらの手順を踏めば、別の Mac でも Gemini エージェント経由で After Effects を操作できるようになる。
