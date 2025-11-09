## Project Overview

- **Objective:** Develop an LLM agent that assists with video editing tasks in Adobe AfterEffects through natural language instructions.
- **Key Documents:** Requirements / design specs live under `specs/`. Check `specs/requirement.md` and `specs/design.md` before coding.
- **Task Management:** Tasks are tracked in Vibe-Kanban (integrated via MCP). Always update task status there when work finishes.

## Communication & Permission Rules
- すべての応答・確認は日本語で行うこと。
- `pyenv` / `uv` などの前提ツールが無い場合は、必ずユーザーにインストール依頼する（自前で `curl` / `brew` などを実行しない）。
- プロジェクトフォルダ外の操作（例: `~/Library/Application Support/Adobe/CEP/extensions` への書き込み、`/usr/local` の編集など）は、コマンド例を提示した上でユーザーに実行してもらう。Gemini 自身では権限を前提にしない。

## Setup Checklist for Gemini Agents
Run these steps right after cloning the repository and launching Gemini CLI in this folder.

### 0. 前提ツールの確認
```bash
pyenv --version
uv --version
python3 --version
```
- いずれかが未インストール / PATH未設定の場合は、その旨をユーザーに伝えて導入を依頼する。

### 1. Update the repository
```bash
git status -sb
git remote update
git status -sb   # 確認
git pull --ff-only   # 追従が必要なら
```
- 作業前にローカル変更がないか確認し、`git pull --ff-only` で最新化する。
- `git status -sb` で `## main` 以外の行があれば yumehiko に確認してから進める。

### 2. Check whether the local installation already exists
```bash
USER_CEP="$HOME/Library/Application Support/Adobe/CEP/extensions/llm-video-agent"
GLOBAL_CEP="/Library/Application Support/Adobe/CEP/extensions/llm-video-agent"
if [ -e "$USER_CEP" ]; then ls "$USER_CEP" ; elif [ -e "$GLOBAL_CEP" ]; then ls "$GLOBAL_CEP" ; else echo "CEP extension not found"; fi
python3 -m server.fastmcp_server --help >/dev/null
```
- CEP拡張が `~/Library/...` なのか `/Library/...` なのかは環境で異なる。上記スクリプトで存在場所を確認し、以降のコマンドも同じパスに統一する。
- どちらにも存在しなければ未インストール状態。
- `python3 -m server.fastmcp_server --help` が成功すれば `server/requirements.txt` の依存も導入済み。

### 3. Not installed yet?
- `ls` が失敗する、または `python3 -m server.fastmcp_server --help` がモジュール未検出になる場合は、まずセットアップを実施する。
- 手順は `docs/gemini_setup.md` にまとまっている。プロジェクト外に触れる操作（CEPディレクトリ作成など）は必ずユーザーに実行してもらい、Gemini はコマンド例と確認だけを行う。`/Library/...` を使う場合は `sudo` が必要になる点も事前に共有する。

### 4. Already installed? Quick run checklist
1. ユーザーに After Effects を起動してもらい、`ウィンドウ > 機能拡張 (ベータ) > LLM Video Agent` パネルで `Server listening on http://127.0.0.1:8080` を確認してもらう（確認が取れるまで待つ）。
2. パネル稼働確認後、Gemini が次のコマンドをワークスペース内で実行して FastMCP HTTP サーバーを起動する。  
   ```bash
   python -m server.fastmcp_server --transport http --port 8000 --bridge-url http://127.0.0.1:8080
   ```
   ※ ポート競合で失敗した場合は、ユーザーと相談のうえポート番号を変更して再実行する。
3. サーバー起動後に `get_layers` を一度呼び出し、レスポンスが返ることを確認する（これが最も簡単な疎通テストになる）。
3. Gemini CLI / Agent で `ae-fastmcp` MCP エンドポイント（`http://127.0.0.1:8000/mcp`）を有効化。
4. `get_layers → get_properties → set_expression` を呼び出し、動作確認チェックリストどおりにレスポンスが返るか検証。

## Workflow Rules

- **Task Completion:** A task is only considered complete after yumehiko approves it.
- **Status Update:** Once approved, update the corresponding card in Vibe-Kanban.
- **Committing Changes:** Commit all related changes (docs/code) before handing off. Use descriptive commit messages.
