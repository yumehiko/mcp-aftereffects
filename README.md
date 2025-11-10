# MCP AfterEffects の使い方

## 前提環境
- macOS 上で Adobe After Effects 2024 以降がインストール済み。
- このリポジトリを任意のディレクトリ（例: `~/Repository/mcp-aftereffects`）に展開済み。
- `gemini` CLI がインストール済みで PATH から実行できる。
- Python 3.10+ と `uv`/`pip` など、`docs/gemini_setup.md` に記載の依存をインストールできる環境であること。

## 初回セットアップ
1. リポジトリのルートディレクトリで `gemini` CLI を起動し、最初の発話で **「初期化して」** と伝える。  
   - Gemini は `GEMINI.md` の指示に従い、必要な初期設定手順（FastMCP サーバー、CEP 配置など）を案内する。
2. 案内に従って初期設定を完了する。セットアップ手順の詳細は `docs/gemini_setup.md` を参照。
3. リポジトリ直下で以下を実行し、仮想環境と依存を用意する。  
   ```bash
   uv venv                       # もしくは python -m venv .venv
   uv pip install -r server/requirements.txt
   ```  
   - `.venv` を使いたくない場合は、任意の仮想環境/pyenv に `fastmcp` と `requests` をインストールし、`AE_FASTMCP_PYTHON` でパスを指定する。

## 通常の運用手順
1. After Effects を起動し、`LLM Video Agent` パネルが開いていることを確認する。  
   - パネルを開くと HTTP ブリッジ (127.0.0.1:8080) と FastMCP サーバー (デフォルト: 127.0.0.1:8000, HTTP トランスポート) が自動で起動し、両者のログがパネルに即時表示される。  
   - リポジトリ直下に `.venv/bin/python` があればそれを最優先で使用する。無い場合は `AE_FASTMCP_PYTHON` / `PYTHON_BIN` など環境変数、最後にシステムの `python3` を順に試す。
   - パネルを閉じると FastMCP サーバーも自動で停止する。
2. Gemini CLI を起動する。  
   - `launchers/AEGeminiLauncher.app` を開くとターミナルが立ち上がり、`scripts/launch_gemini_stack.sh` 経由でヘルスチェック後に `gemini --allowed-mcp-server-names ae-fastmcp` が実行される。  
   - もしくは任意のターミナルで同じコマンドを実行してもよい。FastMCP サーバーはパネル側で待機しているため、追加の起動は不要。
3. 表示されたターミナルで Gemini との対話が開始されるので、実行したい After Effects 操作を日本語で指示する。  
   - Gemini は MCP ツール（`get_layers`, `get_properties`, `get_selected_properties`, `set_expression` など）を用いて作業を補助する。  
   - `GEMINI.md` の方針どおり、応答は常に日本語になる点に注意。

## 補足
- 再セットアップや別端末での初期化が必要な場合は、再度「初期化して」と依頼するか、`docs/gemini_setup.md` を直接参照して手順を進めてください。
- 管理者権限が必要な操作やリポジトリ外の変更は、Gemini がコマンド例を提示し、ユーザーが実行する運用を想定しています。
