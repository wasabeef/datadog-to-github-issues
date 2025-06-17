# Datadog to GitHub Issues

[![GitHub release](https://img.shields.io/github/release/wasabeef/datadog-to-github-issues.svg)](https://github.com/wasabeef/datadog-to-github-issues/releases)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

<p align="center">
  <a href="README.md">English</a>
</p>

Datadog RUM（Real User Monitoring）で検出されたエラーから自動的に GitHub Issue を作成する GitHub Action です。Datadog で検出されたフロントエンドエラーをチームの GitHub ワークフロー内で直接追跡・管理できます。

## 🚀 機能

- **自動エラー検出**: Datadog RUM API からエラーを取得
- **スマートグループ化**: フィンガープリンティングによる類似エラーのグループ化
- **豊富なエラーコンテキスト**: スタックトレース、ユーザー影響、ブラウザ情報など
- **Issue 更新**: エラーが再発した際の既存 Issue 更新
- **自動再オープン**: クローズされた Issue のエラーが再発した場合の自動再オープン
- **セキュリティ**: 機密データ（メール、IP、トークン）のマスキング
- **セッションリプレイリンク**: Datadog セッションリプレイへの直接リンク
- **柔軟なラベリング**: 組織に合わせたカスタマイズ可能なラベル

## 💡 目的

フロントエンドエラーはいつでも発生する可能性があり、ユーザーが苦情を言うまで気づかないことがよくあります。この GitHub Action は、Datadog RUM エラーから自動的に GitHub Issue を作成することで、エラー監視と課題追跡の間のギャップを埋めます。

**主な利点:**

- **積極的なエラー管理**: ユーザーが報告する前にエラーをキャッチ
- **統一されたワークフロー**: GitHub 内でエラー追跡を維持
- **豊富なコンテキスト**: すべてのエラー詳細を一箇所に
- **チーム協力**: 他の課題と同様にエラーについて議論・割り当て

## 📋 前提条件

- Datadog アカウントと RUM が有効化されたアプリケーション
- Datadog API キーとアプリケーションキー
- GitHub Actions が有効なリポジトリ

## 🛠️ セットアップ

### ステップ 1: Datadog API 認証情報の取得

1. [Datadog API キー設定](https://app.datadoghq.com/organization-settings/api-keys) にアクセス
2. API キーを作成またはコピー
3. [Datadog アプリケーションキー設定](https://app.datadoghq.com/organization-settings/application-keys) にアクセス
4. アプリケーションキーを作成またはコピー

### ステップ 2: GitHub Secrets の設定

リポジトリの設定で以下のシークレットを追加：

- `DATADOG_API_KEY`: Datadog API キー
- `DATADOG_APP_KEY`: Datadog アプリケーションキー

### ステップ 3: GitHub Action の設定

`.github/workflows/datadog-errors.yml` ファイルを作成：

```yaml
name: Datadog Error Tracking

on:
  schedule:
    # 毎時実行
    - cron: '0 * * * *'
  workflow_dispatch:

jobs:
  track-errors:
    runs-on: ubuntu-latest
    steps:
      - uses: wasabeef/datadog-to-github-issues@v1
        with:
          datadog-api-key: ${{ secrets.DATADOG_API_KEY }}
          datadog-app-key: ${{ secrets.DATADOG_APP_KEY }}
          github-token: ${{ secrets.GITHUB_TOKEN }}
          datadog-site: 'datadoghq.com' # オプション: us5.datadoghq.com など
          query: '@type:error @service:frontend-app'
          date-from: 'now-1h'
          date-to: 'now'
          labels: 'error,frontend,monitoring' # オプション
```

## 📖 設定オプション

| パラメータ        | 必須 | デフォルト      | 説明                                     |
| ----------------- | ---- | --------------- | ---------------------------------------- |
| `datadog-api-key` | ✅   | -               | Datadog API キー                         |
| `datadog-app-key` | ✅   | -               | Datadog アプリケーションキー             |
| `github-token`    | ✅   | -               | GitHub トークン                          |
| `datadog-site`    | ❌   | `datadoghq.com` | Datadog サイト（us5.datadoghq.com など） |
| `query`           | ❌   | `@type:error`   | Datadog クエリフィルター                 |
| `date-from`       | ❌   | `now-1h`        | 開始日時                                 |
| `date-to`         | ❌   | `now`           | 終了日時                                 |
| `labels`          | ❌   | `datadog-error` | Issue に追加するラベル（カンマ区切り）   |

## 🔍 クエリ例

### 基本的な例

```yaml
# 全てのエラー
query: '@type:error'

# 特定のサービス
query: '@type:error @service:frontend-app'

# 未処理エラーのみ
query: '@type:error @error.handling:unhandled'

# 本番環境のエラー
query: '@type:error @env:production'
```

### 高度な例

```yaml
# 複数条件の組み合わせ
query: '@type:error @service:frontend-app @env:production @error.handling:unhandled'

# 特定のエラーソースを除外
query: '@type:error -@error.message:"ChunkLoadError"'

# セッションリプレイありのエラーのみ
query: '@type:error @session.has_replay:true'
```

## 🏷️ 生成される Issue

### Issue タイトル例

```
[Frontend] TypeError: Cannot read property 'value' of null
```

### Issue 内容

- エラーハッシュ（重複検出用）
- エラー詳細情報
- 影響を受けたユーザー数
- ブラウザ分布
- セッションリプレイリンク（利用可能な場合）
- エラー発生時刻と頻度

## 🔒 セキュリティ

このアクションは以下の情報を自動的にマスキングします：

- メールアドレス
- IP アドレス
- UUID
- JWT トークン
- API キーとシークレット

## 📚 トラブルシューティング

### よくある問題

**1. API 認証エラー**

- API キーとアプリケーションキーが正しく設定されているか確認
- Datadog サイトが正しく指定されているか確認

**2. エラーが見つからない**

- クエリパラメータを確認
- 日時範囲を調整
- Datadog でエラーが実際に発生しているか確認

**3. Issue が重複して作成される**

- エラーフィンガープリンティングが正常に動作しているか確認
- 既存の Issue のラベルやタイトルが変更されていないか確認

## 🤝 コントリビューション

プルリクエストや Issue の報告を歓迎します！

1. このリポジトリをフォーク
2. フィーチャーブランチを作成 (`git checkout -b feature/awesome-feature`)
3. 変更をコミット (`git commit -m 'Add awesome feature'`)
4. ブランチにプッシュ (`git push origin feature/awesome-feature`)
5. プルリクエストを作成

## 📄 ライセンス

このプロジェクトは MIT ライセンスの下で公開されています。詳細は [LICENSE](LICENSE) ファイルを参照してください。

## 👤 作者

**Daichi Furiya**

- GitHub: [@wasabeef](https://github.com/wasabeef)
- Website: https://github.com/wasabeef
