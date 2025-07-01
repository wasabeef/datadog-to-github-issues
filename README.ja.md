# Datadog to GitHub Issues

[![GitHub release](https://img.shields.io/github/release/wasabeef/datadog-to-github-issues.svg)](https://github.com/wasabeef/datadog-to-github-issues/releases)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

<p align="center">
  <a href="README.md">English</a>
</p>

Datadog RUM エラーやモニターアラートから GitHub Issue を作成する GitHub Actions。

- **RUM Action**: Datadog RUM（Real User Monitoring）エラーから Issue を作成
- **Monitor Action**: Datadog Monitor アラートから Issue を作成（準備中）

## 機能

- **自動エラー検出**: Datadog RUM エラーから GitHub Issue を自動作成
- **スマートグループ化と更新**: 類似エラーをグループ化し、再発時に Issue を更新
- **豊富なコンテキスト**: スタックトレース、ユーザー影響、ブラウザ分布、セッションリプレイリンク
- **セキュリティとプライバシー**: 機密データ（メール、IP、トークン）を自動マスキング
- **柔軟な設定**: カスタマイズ可能なラベル、複数言語（EN/JP）、条件付きラベル

## 動機

フロントエンドエラーはユーザーが苦情を言うまで気づかないことがよくあります。この GitHub Action は、Datadog RUM エラーから自動的に GitHub Issue を作成し、GitHub ワークフロー内で積極的なエラー管理を可能にします。

## 前提条件

- RUM が有効化された Datadog アカウント
- RUM 読み取り権限を持つ API キーとアプリケーションキー
- GitHub Actions が有効なリポジトリ

## セットアップ

### ステップ 1: Datadog API キーの作成

1. [Datadog 組織設定](https://app.datadoghq.com/organization-settings/api-keys) にアクセス
2. 新しい **API キー** を作成
3. 新しい **アプリケーションキー** を作成
4. アプリケーションキーに `rum_read` 権限があることを確認
5. **重要**: これらのキーは安全に保管してください - GitHub Secrets で使用します

### ステップ 2: GitHub リポジトリの設定

1. GitHub リポジトリに移動
2. **Settings** → **Secrets and variables** → **Actions** に移動
3. **New repository secret** をクリック
4. 以下のシークレットを追加:
   - **Name**: `DATADOG_API_KEY`
   - **Value**: ステップ 1 の Datadog API キー
   - **Name**: `DATADOG_APP_KEY`
   - **Value**: ステップ 1 の Datadog アプリケーションキー

**セキュリティ**: これらのキーを直接リポジトリにコミットしないでください。常に GitHub Secrets を使用してください。

### ステップ 3: ワークフローファイルの作成

#### RUM エラー監視の場合

リポジトリに `.github/workflows/datadog-rum-errors.yml` を作成:

```yaml
name: Sync Datadog Errors

on:
  schedule:
    - cron: '0 0 * * *' # 毎日午前0時（UTC）

jobs:
  sync-errors:
    runs-on: ubuntu-latest
    permissions:
      issues: write # Issue の作成/更新に必要
      contents: read # ワークフローの読み取りに必要

    steps:
      - uses: actions/checkout@v4

      - uses: wasabeef/datadog-to-github-issues/rum@v1
        with:
          datadog-api-key: ${{ secrets.DATADOG_API_KEY }}
          datadog-app-key: ${{ secrets.DATADOG_APP_KEY }}
          github-token: ${{ secrets.GITHUB_TOKEN }}
          service: 'your-service-name'
```

## 使用方法

セットアップが完了すると、アクションは自動的に以下を実行します：

1. **Datadog RUM をクエリ** 設定に基づいてエラーを取得
2. **類似エラーをグループ化** フィンガープリンティングを使用
3. **GitHub Issue を作成** 新しいエラーに対して
4. **既存の Issue を更新** 新しい発生に対して
5. **クローズされた Issue を再オープン** エラーが再発した場合

### 設定例

**基本設定:**

```yaml
- uses: wasabeef/datadog-to-github-issues/rum@v1
  with:
    datadog-api-key: ${{ secrets.DATADOG_API_KEY }}
    datadog-app-key: ${{ secrets.DATADOG_APP_KEY }}
    github-token: ${{ secrets.GITHUB_TOKEN }}
    service: 'your-service-name'
```

**高度な設定:**

```yaml
- uses: wasabeef/datadog-to-github-issues/rum@v1
  with:
    datadog-api-key: ${{ secrets.DATADOG_API_KEY }}
    datadog-app-key: ${{ secrets.DATADOG_APP_KEY }}
    github-token: ${{ secrets.GITHUB_TOKEN }}
    service: 'frontend-app'
    language: 'ja' # または 'en'（デフォルト）
    labels: 'datadog'
    fatal-labels: 'critical'
    title-prefix: '[DD]'
```

### 生成される Issue の例

<details>
<summary>Issue 例の全文を見る</summary>

```markdown
TypeError: Cannot read property 'user' of undefined

## 🚨 エラー概要

**エラータイプ:** TypeError | **発生回数:** 45 | **影響を受けたユーザー:** 12
**初回検出:** 2025-01-15 23:23:45 JST | **最終検出:** 2025-01-16 03:45:12 JST

## 📊 エラー詳細

**スタックトレース:**
```

TypeError: Cannot read property 'user' of undefined
at UserProfile (app.bundle.js:4567:23)
at renderWithHooks (vendor.bundle.js:12345:18)

```

**主要ブラウザ:** Chrome (78%), Safari (18%), Firefox (4%)
**環境:** Windows (56%), macOS (33%), iOS (11%)

**[Datadog RUM で表示](https://app.datadoghq.com/rum/explorer)** | **[セッションリプレイ](https://app.datadoghq.com/rum/replay)**
```

</details>

## 設定

### 必須パラメータ

| 入力              | 説明                         | デフォルト            |
| ----------------- | ---------------------------- | --------------------- |
| `datadog-api-key` | Datadog API キー             | -                     |
| `datadog-app-key` | Datadog アプリケーションキー | -                     |
| `github-token`    | GitHub トークン              | `${{ github.token }}` |

### 一般的なオプション

| 入力           | 説明                                   | デフォルト |
| -------------- | -------------------------------------- | ---------- |
| `service`      | フィルターする RUM サービス名          | (全部)     |
| `language`     | Issue の言語 (`en` または `ja`)        | `en`       |
| `labels`       | カンマ区切りのラベル                   | (なし)     |
| `fatal-labels` | クラッシュエラー用ラベル               | (なし)     |
| `title-prefix` | Issue タイトルのカスタムプレフィックス | (なし)     |

<details>
<summary>すべての設定オプションを表示</summary>

| 入力                 | 説明                                              | デフォルト                  |
| -------------------- | ------------------------------------------------- | --------------------------- |
| `datadog-site`       | Datadog サイト (datadoghq.com, datadoghq.eu など) | `datadoghq.com`             |
| `datadog-web-url`    | Datadog Web UI URL                                | `https://app.datadoghq.com` |
| `date-from`          | 開始日 (例: `now-24h`)                            | `now-24h`                   |
| `date-to`            | 終了日                                            | `now`                       |
| `error-handling`     | フィルター: `all`, `handled`, `unhandled`         | `unhandled`                 |
| `error-source`       | フィルター: `source`, `network`, `console`        | (全部)                      |
| `exclude-noise`      | 一般的なノイズエラーを除外                        | `true`                      |
| `max-issues-per-run` | 実行ごとの最大 Issue 作成数                       | `10`                        |
| `update-existing`    | 既存 Issue の更新                                 | `true`                      |
| `reopen-closed`      | エラー再発時の Issue 再オープン                   | `true`                      |
| `non-fatal-labels`   | 非致命的エラー用ラベル                            | (なし)                      |

</details>

- 複数言語対応: `language: 'ja'` で日本語 + JST タイムスタンプ
- スマートラベリング: クラッシュ用 (`fatal-labels`) と通常エラー用 (`non-fatal-labels`) で異なるラベル
- ノイズフィルタリング: ChunkLoadError などの一般的ノイズエラーを自動除外

## トラブルシューティング

### よくある問題

1. **「RUM イベントの取得に失敗しました」**

   - API キーとアプリケーションキーが正しいことを確認
   - アプリケーションキーに `rum_read` 権限があることを確認
   - Datadog サイトが正しいことを確認（例：EU の場合は `datadoghq.eu`）

2. **「エラーが見つかりません」**

   - 時間範囲（`date-from` と `date-to`）を確認
   - サービス名が RUM 設定と一致することを確認
   - 処理済みエラーを含めるために `error-handling` を `all` に設定してみる

3. **「権限が不十分です」**
   - GitHub Actions に `issues: write` 権限があることを確認
   - ブランチ保護ルールがアクションをブロックしていないか確認

## セキュリティとプライバシー

このアクションは GitHub Issue 内の機密情報を自動的にマスクします：

### 自動的にマスクされるデータ

**個人情報:**

- **メールアドレス**: `john.doe@example.com` → `joh***@example.com`
- **電話番号**: `090-1234-5678` → `0**-****-****`（様々な形式に対応）
- **名前**: JSON コンテキストで検出され `[NAME_REDACTED]` としてマスク
- **住所**: 住所コンテキストで見つかった郵便番号

**認証・シークレット:**

- JWT トークン → `eyJ***.[REDACTED].***`
- API キーとシークレット → `[REDACTED]`
- パスワードと認証トークン → `[REDACTED]`

**金融情報:**

- クレジットカード番号 → `****-****-****-****`
- 社会保障番号 → `XXX-XX-XXXX`

### 保持される技術データ

デバッグ機能を維持するため、以下は**マスクされません**：

- IP アドレス（技術的なデバッグ用）
- UUID と技術的な ID
- エラースタックトレース（内部の機密値はマスク）
- システム情報とブラウザ詳細

### セキュリティのベストプラクティス

1. **API キー**: Datadog API 認証情報には必ず GitHub Secrets を使用
2. **権限**: GitHub トークンは最小限必要な権限のみ使用
3. **レビュー**: 生成された Issue を定期的にレビューし、マスクされていない機密データがないか確認
4. **更新**: 最新のセキュリティ改善のため、アクションを定期的に更新

セキュリティに関する懸念や脆弱性を報告する場合は、[SECURITY.md](SECURITY.md) を参照してください。

## ライセンス

このプロジェクトは MIT ライセンスの下でライセンスされています - 詳細は [LICENSE](LICENSE) ファイルを参照してください。

## 貢献

貢献を歓迎します！開発セットアップ、テストガイドライン、貢献プロセスの詳細については [CONTRIBUTING.md](CONTRIBUTING.md) を参照してください。

## 問題とサポート

問題が発生した場合や質問がある場合：

1. [Issues](https://github.com/wasabeef/datadog-to-github-issues/issues) ページを確認
2. 詳細情報を含む新しい Issue を作成
3. 関連するログと設定を含める

## 謝辞

- [Datadog RUM](https://www.datadoghq.com/product/real-user-monitoring/) エラー監視
- GitHub Actions コミュニティ

