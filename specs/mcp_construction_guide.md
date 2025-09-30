# MCPサーバー構築ガイド

このドキュメントは、Model Context Protocol (MCP) に準拠した自作サーバーを構築するための情報をまとめたものです。

## 関連ドキュメントID

自作MCPの構築に役立つ主要なドキュメントのContext7ライブラリIDです。`get_library_docs`ツールで詳細な情報を取得できます。

*   `/websites/mcp-framework`: MCPサーバーを構築・管理するためのフレームワーク。
*   `/websites/claude_en`: プロトコル自体の概要や仕様。
*   `/mcp-use/mcp-use`: 任意のLLMとMCPサーバーを接続するためのオープンソースソリューション。
*   `/la-rebelion/mcp-docs`: AIサーバーをデプロイ・管理するためのエコシステム。

---

## MCP Frameworkを利用した基本的な構築手順

`MCP Framework` (`/websites/mcp-framework`) を利用することで、独自のMCPサーバーを効率的に開発できます。

### ステップ1: 環境構築

まず、コマンドラインツール（CLI）をインストールし、新しいプロジェクトを作成します。

```shell
# 1. CLIをグローバルにインストール
npm install -g mcp-framework

# 2. 新しいMCPサーバープロジェクトを作成
mcp create my-mcp-server

# 3. プロジェクトディレクトリに移動
cd my-mcp-server
```

### ステップ2: ツールの作成

次に、AIアシスタントに提供したい独自のツールを作成します。例えば `weather` というツールを作るには、以下のコマンドを実行します。

```shell
mcp add tool weather
```

これにより、`src/tools/WeatherTool.ts` というファイルが生成されるので、その中にツールの具体的な処理を記述します。入力として何を受け取り（`schema`）、どのような処理を実行して（`execute`）、何を返すかを定義します。

```typescript
import { MCPTool } from "mcp-framework";
import { z } from "zod";

// (中略)

class WeatherTool extends MCPTool<WeatherInput> {
  name = "weather";
  description = "Get weather information for a city";

  // 入力値の定義
  schema = {
    city: {
      type: z.string(),
      description: "City name to get weather for",
    },
  };

  // ツールの本体処理
  async execute({ city }: WeatherInput) {
    // ここで外部の天気APIを呼び出すなどの処理を実装
    return {
      city,
      temperature: 22,
      condition: "Sunny",
    };
  }
}
```

### ステップ3: サーバーの起動

最後に、サーバーのエントリーポイントである `src/index.ts` で通信方法（HTTPやSTDIOなど）を設定し、サーバーを起動します。

```shell
# TypeScriptをビルド
npm run build

# サーバーを起動
npm start
```
