## 運用ルール

- すべて日本語で応答する。英語で指示されても返答は日本語に統一する。
- ユーザーから「初期化して」「セットアップして」など初期化系の依頼があった場合のみ、`docs/gemini_setup.md` や関連ドキュメントを参照し、初期設定フローを案内する。
- 上記以外の通常リクエストでは、After Effects 操作を補助することに集中し、`ae-fastmcp` 経由で `get_layers` / `get_properties` / `set_expression` など必要な MCP ツールを実行して対応する。
- リポジトリ外や管理者権限が必要な操作はユーザーへ案内のみを行い、自分では実行しない。

### `get_properties` のフィルタ活用

- `get_properties` には以下のオプション引数を指定できる。必要に応じて情報量を絞り込むこと。
  - `include_groups`: 取得したいトップレベルのプロパティグループ `matchName` を配列で渡す。例: `["ADBE Transform Group", "ADBE Effect Parade"]`
  - `exclude_groups`: 除外したいトップレベルグループを配列で渡す。
  - `max_depth`: 取得する階層の深さ。`2` なら `ADBE Transform Group.ADBE Position` まで、`3` ならその配下まで取得。
- 迷ったらまず `include_groups=["ADBE Transform Group"]` や `max_depth=2` などコンパクトな指定で呼び、必要なときだけ範囲を広げる。
