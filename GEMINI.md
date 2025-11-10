## Project Overview

- **Objective:** Develop an LLM agent that assists with video editing tasks in Adobe AfterEffects through natural language instructions.
- **Key Documents:** Requirements / design specs live under `specs/`. Check `specs/requirement.md` and `specs/design.md` before coding.
- **Task Management:** Tasks are tracked in Vibe-Kanban (integrated via MCP). Always update task status there when work finishes.

## Communication & Permission Rules
- すべての応答・確認は日本語で行うこと。
- `pyenv` / `uv` などの前提ツールが無い場合は、必ずユーザーにインストール依頼する（自前で `curl` / `brew` などを実行しない）。
- プロジェクトフォルダ外の操作（例: `~/Library/Application Support/Adobe/CEP/extensions` への書き込み、`/usr/local` の編集など）は、コマンド例を提示した上でユーザーに実行してもらう。Gemini 自身では権限を前提にしない。

## Daily Run Checklist
セットアップ手順の詳細は `docs/gemini_setup.md` に集約しました。ここでは、すでにセットアップ済みの環境で通常運用するときの流れのみを示します。

1. **Repository update (必要に応じて)**  
   ```bash
   git status -sb
   git pull --ff-only
   ```  
   ローカル変更がある場合やリモートとの差分が大きい場合は yumehiko と相談。

2. **After Effects パネル起動（人間の作業）**  
   - AE を起動し、`LLM Video Agent` パネルのログに `Server listening on http://127.0.0.1:8080` が出ているか確認してもらう。

3. **FastMCP HTTP サーバー起動（ユーザーに依頼）**  
   - ユーザーへ上記コマンドの実行を依頼し、完了したら次の手順へ進む。  
   - ポート競合が起きた場合はユーザーと相談して別ポートを指定する。

4. **Gemini CLI / Agent 起動**  
   - 新しいターミナルで `gemini --allowed-mcp-server-names ae-fastmcp` を実行する（GUI の場合は MCP 設定で `ae-fastmcp` を選択）。
   - 最初のプロンプトで「`get_layers` ツールを実行して結果を表示してください」と依頼し、疎通を確認する。

5. **本番操作**  
   - 必要に応じて `get_properties` や `set_expression` を実行。  
   - エラーが出た場合は AE パネルログと FastMCP サーバーの標準出力を照合する。

> NOTE: セットアップ直後に作業していた Gemini セッションは一度閉じ、上記4の本番セッションに切り替える想定。

## Workflow Rules

- **Task Completion:** A task is only considered complete after yumehiko approves it.
- **Status Update:** Once approved, update the corresponding card in Vibe-Kanban.
- **Committing Changes:** Commit all related changes (docs/code) before handing off. Use descriptive commit messages.
