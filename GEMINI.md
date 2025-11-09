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
ls "$HOME/Library/Application Support/Adobe/CEP/extensions/llm-video-agent"
python3 -m server.fastmcp_server --help >/dev/null
```
- CEP拡張のリンク/コピーが存在すれば After Effects 側の配置は完了している。
- `python3 -m server.fastmcp_server --help` が成功すれば `server/requirements.txt` の依存も導入済み。

### 3. Not installed yet?
- `ls` が失敗する、または `python3 -m server.fastmcp_server --help` がモジュール未検出になる場合は、まずセットアップを実施する。
- 手順は `docs/gemini_setup.md` にまとまっている。プロジェクト外に触れる操作（CEPディレクトリ作成など）は必ずユーザーに実行してもらい、Gemini はコマンド例と確認だけを行う。

### 4. Already installed? Quick run checklist
1. After Effects を起動し、`ウィンドウ > 機能拡張 (ベータ) > LLM Video Agent` パネルで `Server listening on http://127.0.0.1:8080` を確認。
2. 別ターミナルで `python -m server.fastmcp_server --transport http --port 8000 --bridge-url http://127.0.0.1:8080` を起動（GeminiはHTTPで接続）。
3. Gemini CLI / Agent で `ae-fastmcp` MCP エンドポイント（`http://127.0.0.1:8000/mcp`）を有効化。
4. `get_layers → get_properties → set_expression` を呼び出し、動作確認チェックリストどおりにレスポンスが返るか検証。

## Workflow Rules

- **Task Completion:** A task is only considered complete after yumehiko approves it.
- **Status Update:** Once approved, update the corresponding card in Vibe-Kanban.
- **Committing Changes:** Commit all related changes (docs/code) before handing off. Use descriptive commit messages.
