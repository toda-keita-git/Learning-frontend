# 学習記録アプリ（フロントエンド）

自分が学んだことを「タイトル・説明・理解度・参考URL・カテゴリ・タグ」で記録し、
GitHub 上のソースコードと紐づけて振り返れる、学習ログ管理アプリの **フロントエンド** です。

> 🔗 バックエンド（Java / Spring Boot）：https://github.com/toda-keita-git/Learning-backend

<!-- 👇 デプロイ済みのデモがあれば、ここにURLとスクリーンショットを貼ると効果的です
🌐 デモ: https://learning-frontend-x5jf.onrender.com
![アプリのスクリーンショット](./docs/screenshot.png)
-->

---

## 📌 このアプリでできること

- **学習記録の登録・編集・削除**（CRUD）
- **カテゴリ／タグによる分類**と、キーワード検索での絞り込み
- **理解度**を記録して、あとから復習の優先度を判断
- **GitHub 連携**：OAuth ログインし、自分のリポジトリのファイル／フォルダを選んで学習記録に添付。コードとメモをセットで残せる
- **コードのシンタックスハイライト表示**、スプレッドシート形式での表示

## 🛠 使用技術

| 分類 | 技術 |
|---|---|
| 言語 | TypeScript |
| フレームワーク | React 19 |
| ビルドツール | Vite |
| UI | MUI（Material UI） |
| ルーティング | React Router |
| API 通信 | axios |
| GitHub 連携 | @octokit/rest（GitHub API）＋ OAuth |
| その他 | react-syntax-highlighter, react-spreadsheet, xlsx |

## 🏗 アーキテクチャ

```
[ブラウザ / React(この repo)]
        │  ① GitHub OAuth ログイン
        ▼
[GitHub]  ──認可コード──▶  [バックエンド / Spring Boot]
        │                        │ ② コード→アクセストークン交換
        │                        │ ③ 学習データを DB(PostgreSQL) に保存
        ◀───────学習データ────────┘
```

- 認可コードからアクセストークンへの交換は、**Client Secret を漏らさないためにバックエンド側で実施**しています。
- 学習データ本体は Spring Boot 経由で PostgreSQL に永続化します。

## 🚀 ローカルでの起動

```bash
# 1. 依存インストール
npm install

# 2. 環境変数を用意（.env.example をコピーして値を設定）
cp .env.example .env

# 3. 開発サーバ起動
npm run dev
```

必要な環境変数は [`.env.example`](./.env.example) を参照してください。

## 📁 主なディレクトリ構成

```
src/
├── App.tsx               … ルーティング定義
├── Context.tsx           … 認証状態の管理（Context API）
├── Home.tsx              … トップ画面
├── LearningContent.tsx   … 学習記録の一覧・編集画面
├── FileSearch.tsx        … GitHub ファイル検索・閲覧
└── component/            … ダイアログ・ツールバー等の UI 部品
```

## 💡 制作の背景

学んだ内容が断片的なメモに散らばってしまう課題を解決するために制作しました。
「学習メモ」と「実際に書いたコード（GitHub）」を一箇所で結びつけて振り返れることを重視し、
OAuth を用いた外部サービス連携・状態管理・REST API 連携を、フロントからバックまで一貫して実装しています。
