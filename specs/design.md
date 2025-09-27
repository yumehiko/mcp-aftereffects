# 設計書: AfterEffects - LLM連携ツール

## 1. はじめに

### 1.1. 目的
本ドキュメントは、要件定義書に基づき、自然言語指示によるAfterEffectsの動画編集作業を支援するLLMエージェントの実現に向けた、より詳細なシステム設計を定義するものである。

### 1.2. スコープ
- **スコープ内:**
    - Gemini CLIを介したユーザーとの対話
    - LLMエージェントによる指示解釈とツール実行
    - AfterEffects連携バックエンド（CEP拡張）のAPI設計と実装方針
    - レイヤー情報取得、プロパティ情報取得、エクスプレッション適用の3機能の実装
    - 動作ログを表示するためのシンプルなUIパネルをAfterEffects内に提供する。
- **スコープ外:**
    - キーフレーム操作やエフェクト適用など、要件定義書にない高度な編集機能

## 2. システムアーキテクチャ

### 2.1. 全体構成図

```mermaid
graph TD
    subgraph User Environment
        A[Gemini CLI]
    end

    subgraph Cloud
        B[LLM Agent]
    end

    subgraph Local Machine
        subgraph Adobe AfterEffects
            C[CEP Extension]
            D[ExtendScript (.jsx)]
        end
        E[Local Server (Node.js)]
    end

    A -- Natural Language --> B
    B -- API Call (HTTP) --> E
    E -- Function Call --> C
    C -- Executes Script --> D
    D -- Manipulates AE --> Adobe AfterEffects
    Adobe AfterEffects -- Returns Result --> D
    D -- Returns Result --> C
    C -- Returns Result --> E
    E -- API Response --> B
    B -- Response --> A
```

### 2.2. コンポーネント詳細
- **対話インターフェース (Gemini CLI):**
    - ユーザーからの自然言語入力を受け付け、LLMエージェントに送信する。
    - エージェントからの応答（テキスト、実行結果）をユーザーに表示する。
- **LLMエージェント:**
    - ユーザーの指示を解釈し、タスクを具体的なAPIコールに分解する。
    - AfterEffectsを操作するための専用ツール（関数群）を保持・実行する。
    - APIの実行結果を評価し、必要に応じて追加の質問を生成したり、スクリプトを修正したりする。
- **AfterEffects連携バックエンド:**
    - AfterEffects内で動作するCEP拡張機能として実装。
    - 外部からのAPIリクエストを受け付けるローカルサーバー（Node.js）と、実際にAfterEffectsを操作するExtendScript（.jsxファイル）で構成される。

## 3. 連携インターフェース設計

### 3.1. 通信プロトコル
- **プロトコル:** HTTP
- **ホスト:** `localhost`
- **ポート:** `8080` (変更可能)
- **データフォーマット:** JSON (UTF-8)

### 3.2. APIエンドポイント定義

#### 3.2.1. レイヤー情報取得
- **エンドポイント:** `GET /layers`
- **説明:** 現在アクティブなコンポジション内の全レイヤーのリストを取得する。
- **リクエストボディ:** なし
- **レスポンスボディ (成功時):**
    ```json
    {
      "status": "success",
      "data": [
        {
          "id": 1,
          "name": "テキストレイヤー 1",
          "type": "Text"
        },
        {
          "id": 2,
          "name": "シェイプレイヤー 1",
          "type": "Shape"
        }
      ]
    }
    ```
- **レスポンスボディ (失敗時):**
    ```json
    {
      "status": "error",
      "message": "アクティブなコンポジションが見つかりません。"
    }
    ```

#### 3.2.2. プロパティ情報取得
- **エンドポイント:** `GET /properties`
- **説明:** 指定したレイヤーが持つ、操作可能なプロパティのツリー構造を取得する。
- **クエリパラメータ:**
    - `layerId` (number, 必須): 対象レイヤーのID。
- **レスポンスボディ (成功時):**
    ```json
    {
      "status": "success",
      "data": {
        "layerId": 1,
        "properties": [
          {
            "name": "位置",
            "path": "transform.position",
            "value": [960, 540],
            "hasExpression": false
          },
          {
            "name": "スケール",
            "path": "transform.scale",
            "value": [100, 100],
            "hasExpression": true
          }
        ]
      }
    }
    ```

#### 3.2.3. スクリプト（エクスプレッション）の適用
- **エンドポイント:** `POST /expression`
- **説明:** 指定したレイヤーのプロパティにエクスプレッションを設定する。
- **リクエストボディ:**
    ```json
    {
      "layerId": 1,
      "propertyPath": "transform.opacity",
      "expression": "time * 10"
    }
    ```
- **レスポンスボディ (成功時):**
    ```json
    {
      "status": "success",
      "message": "エクスプレッションが正常に適用されました。"
    }
    ```
- **レスポンスボディ (失敗時):**
    ```json
    {
      "status": "error",
      "message": "エクスプレッションの適用に失敗しました: 無効なプロパティパスです。"
    }
    ```

## 4. AfterEffects連携バックエンド詳細設計

### 4.1. CEP拡張機能の構成
- `CSXS/manifest.xml`: 拡張機能の定義ファイル。
- `index.html`: CEPパネルのフロントエンド（本プロジェクトではUI不要だがファイルは必要）。
- `js/main.js`: Node.jsサーバーを起動し、ExtendScriptとの連携を担う。
- `jsx/hostscript.jsx`: ExtendScript本体。AfterEffectsのオブジェクトモデルを操作する関数群を定義。

### 4.2. ExtendScript (hostscript.jsx) の役割
AfterEffectsのアプリケーション空間で動作するJavaScript。`main.js`から呼び出され、具体的な操作を実行する。

- `getLayers()`: アクティブコンポジションのレイヤー情報を収集し、JSONシリアライズ可能な形式で返す。
- `getProperties(layerId)`: 指定されたレイヤーのプロパティを走査し、情報を収集して返す。
- `setExpression(layerId, propertyPath, expression)`: 指定されたプロパティにエクスプレッションを適用する。`try-catch`構文でエラーを捕捉し、結果を返す。

### 4.3. サーバー実装 (main.js)
Node.jsの`http`モジュールまたは`Express`フレームワークを用いて軽量なサーバーを構築する。

- APIエンドポイントごとにルーティングを設定。
- リクエストを受け取ると、`CSInterface`ライブラリを通じて`hostscript.jsx`内の対応する関数を呼び出す。
- ExtendScriptからの戻り値をJSONレスポンスとしてクライアント（LLMエージェント）に返す。

### 4.4. パネルUI (index.html)
CEP拡張機能のフロントエンド部分。本プロジェクトではユーザーが直接操作するUIは不要だが、デバッグとステータスの可視化を目的として、動作ログを表示する簡易的なパネルを実装する。

- **目的:** 開発者およびユーザーが、バックグラウンドでの処理状況をリアルタイムで把握できるようにする。
- **表示内容:**
    - ローカルサーバーへのAPI呼び出し（タイムスタンプ、エンドポイント、パラメータ）
    - ExtendScriptの実行開始・終了
    - 処理結果（成功メッセージまたはエラーメッセージ）
- **実装:**
    - `index.html`にログを表示するためのDOM要素（例: `<div id="log"></div>`）を配置。
    - `js/main.js`は、サーバーへのリクエスト受信時やExtendScriptからのコールバック受信時に、ログメッセージを生成し、`index.html`のDOMに追記する処理を実装する。

## 5. LLMエージェントのツール設計
LLMエージェントは、以下のJavaScript/TypeScript風のシグネチャを持つツール（関数）として、上記APIを呼び出す。

- `async function getLayerList(): Promise<Layer[]>`
- `async function getPropertyTree(layerId: number): Promise<Property[]>`
- `async function setExpression(layerId: number, propertyPath: string, expression: string): Promise<{success: boolean, message: string}>`

これらのツールは内部でHTTPクライアントとして動作し、ローカルサーバーのAPIを叩く。

## 6. 開発ステップ
1.  **CEP拡張の雛形作成:** `manifest.xml`や基本的なファイル構造をセットアップする。
2.  **ExtendScript実装:** `hostscript.jsx`に3つのコア機能（レイヤー取得、プロパティ取得、エクスプレッション適用）を実装し、AfterEffects上で直接テストする。
3.  **ローカルサーバー実装:** Node.jsでHTTPサーバーを立て、各エンドポイントからExtendScriptの関数を呼び出す仕組みを実装する。
4.  **LLMエージェントのツール実装:** 3つのツールを定義し、ローカルサーバーへのAPIコールを実装する。
5.  **統合テスト:** Gemini CLIから自然言語で指示を出し、AfterEffectsに反映されるまでの一連の流れをテストする。

## 7. 非機能要件
- **パフォーマンス:** 各APIコールの応答時間は、ローカル環境での実行であるため、2秒以内を目指す。
- **セキュリティ:** サーバーは`localhost`からの接続のみを受け付けるようにバインドする。
- **拡張性:** `hostscript.jsx`と`main.js`に関数を追加することで、新しいツールを容易に拡張できる設計とする。
