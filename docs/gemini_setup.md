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
Gemini から接続できるよう HTTP トランスポートでサーバーを常駐させる。
```bash
cd ~/Repository/mcp-aftereffects
python -m server.fastmcp_server \
  --transport http \
  --port 8000 \
  --bridge-url http://127.0.0.1:8080
```
- `--bridge-url` は CEP 拡張の HTTP API を指す。ポート変更時は合わせて修正。
- 8000 が使用中なら空いているポートへ変更し、次章の Gemini 設定も同じ値にそろえる。

## 5. Gemini クライアントの MCP 設定
Gemini CLI の例:
```bash
gemini mcp add ae-fastmcp http \
  --url http://127.0.0.1:8000/mcp \
  --description "After Effects FastMCP bridge"
```
Gemini CLI には `enable` サブコマンドが無いため、追加後は CLI を再起動すると自動的に接続試行される。GUI ベースの Gemini エージェントでも同様に HTTP エンドポイント `http://127.0.0.1:8000/mcp` を登録する。

## 6. 動作確認チェックリスト
1. Gemini から `get_layers` を呼び出し、レイヤー一覧が取得できるか。
2. 任意のレイヤー ID を指定して `get_properties` を実行し、プロパティ情報が返るか。
3. `set_expression` で以下のような wiggle を適用し、After Effects 側で動きを確認する。
   ```json
   {
     "layer_id": 2,
     "property_path": "ADBE Transform Group.ADBE Position",
     "expression": "freq = 2; amp = 50; wiggle(freq, amp);"
   }
   ```
   失敗した場合はパネルログ（CEP）と FastMCP サーバーログを確認する。

## 7. よくあるトラブルのヒント
- **ポート競合**: `lsof -i :8080` / `lsof -i :8000` で使用状況を確認。CEP と FastMCP が同じポートを使わないよう注意。
- **Gemini 接続が失敗する**: サーバー起動コマンドに `--transport http` を付け忘れていないか確認。Codex と違い、Gemini は STDIO ではなく HTTP を利用する。
- **set_expression が 500 になる**: プロパティパスのスペルミスやレイヤーIDの誤りが多い。`get_properties` でパスを確認してから再試行する。

これらの手順を踏めば、別の Mac でも Gemini エージェント経由で After Effects を操作できるようになる。
