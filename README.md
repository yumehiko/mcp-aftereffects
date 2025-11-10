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

## 通常の運用手順
1. After Effects を起動し、`LLM Video Agent` パネルが開いていることを確認する。
2. `launchers/AEGeminiLauncher.app` を開くと、以下の処理が自動で実行される。  
   - AE パネルのヘルスチェック  
   - FastMCP ブリッジ（HTTP）の起動  
   - `gemini --allowed-mcp-server-names ae-fastmcp` の起動
3. 表示されたターミナルで Gemini との対話が開始されるので、実行したい After Effects 操作を日本語で指示する。  
   - Gemini は MCP ツール（`get_layers`, `get_properties`, `set_expression` など）を用いて作業を補助する。  
   - `GEMINI.md` の方針どおり、応答は常に日本語になる点に注意。

## 補足
- 再セットアップや別端末での初期化が必要な場合は、再度「初期化して」と依頼するか、`docs/gemini_setup.md` を直接参照して手順を進めてください。
- 管理者権限が必要な操作やリポジトリ外の変更は、Gemini がコマンド例を提示し、ユーザーが実行する運用を想定しています。
