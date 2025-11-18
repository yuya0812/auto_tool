# SFCC サイト移行自動化ツール 要件定義書

## プロジェクト概要

### 目的
旧サイトからSalesforce Commerce Cloud（SFCC）への移行に伴い、DOM構造とComputedStyleの差分を自動抽出し、CSS修正パッチを生成することで、レイアウト再現作業を効率化する。

### 期待効果
- 差分調査の自動化による作業時間削減
- 手動でのDevTools確認作業の削減
- CSS修正箇所の特定精度向上
- 移行プロジェクト全体の納期短縮

---

## 機能要件

### 1. 入力仕様

| 項目 | 説明 | 必須/任意 | 形式 |
|------|------|----------|------|
| 旧サイトURL/パス | 比較元となる旧サイトのURL、またはHTMLファイルパス | 必須 | URL or File Path |
| 新サイトURL/パス | 比較先となるSFCC側のURL、またはHTMLファイルパス | 必須 | URL or File Path |
| セレクタ一覧 | 比較対象とするCSSセレクタのリスト | 任意 | 配列（JSON/YAML/CLI引数） |
| 出力先ディレクトリ | 結果ファイルの出力先 | 必須 | Directory Path |
| 比較プロパティリスト | 比較対象のComputedStyleプロパティ | 任意 | 配列 |
| !important フラグ | 生成CSSに!importantを付与するか | 任意 | Boolean |

#### セレクタ指定方法
- **設定ファイル方式**: JSON/YAML形式でセレクタリストを管理
- **CLI引数方式**: コマンド実行時にカンマ区切りで指定
- **自動検出方式**: セレクタ未指定時は全DOM要素を対象
- 複数方式のサポートを推奨

### 2. 出力仕様

#### (1) 差分レポート (`diff.json`)

```json
{
  "timestamp": "2025-11-18T10:00:00.000Z",
  "oldSite": "https://old-site.example.com",
  "newSite": "https://new-site-sfcc.example.com",
  "summary": {
    "totalElements": 120,
    "diffElements": 35,
    "diffProperties": 87
  },
  "differences": [
    {
      "selector": ".header-nav",
      "xpath": "/html/body/div[1]/header/nav",
      "properties": {
        "width": {
          "old": "1200px",
          "new": "100%",
          "sourceCSS": "main.css:45"
        },
        "padding": {
          "old": "10px 20px",
          "new": "15px 30px",
          "sourceCSS": "layout.css:102"
        }
      }
    }
  ]
}
```

**含まれる情報**:
- 差分がある要素のセレクタとXPath
- 差分が検出されたプロパティ名
- 旧サイト → 新サイトの値の変化
- 影響を与えているCSSファイル名と行番号（可能な限り）

#### (2) 修正パッチCSS (`patch.css`)

```css
/* Auto-generated CSS Patch */
/* Generated at: 2025-11-18T10:00:00.000Z */
/* Old Site: https://old-site.example.com */
/* New Site: https://new-site-sfcc.example.com */

.header-nav {
  width: 1200px !important;
  padding: 10px 20px !important;
}

.product-card .price {
  font-size: 18px !important;
  color: #e74c3c !important;
}
```

**特徴**:
- 差分から自動生成されたCSS
- !important フラグの有無を設定可能
- コメントにメタ情報を記載
- 即座に新サイトに適用可能な形式

#### (3) ログファイル (`log.txt`)

```
[2025-11-18 10:00:00] INFO: Starting comparison...
[2025-11-18 10:00:02] INFO: Old site loaded: https://old-site.example.com
[2025-11-18 10:00:05] INFO: New site loaded: https://new-site-sfcc.example.com
[2025-11-18 10:00:07] INFO: Extracting computed styles for 120 elements...
[2025-11-18 10:00:10] INFO: Comparison completed. Found 35 elements with differences.
[2025-11-18 10:00:11] INFO: Generated diff.json
[2025-11-18 10:00:11] INFO: Generated patch.css
[2025-11-18 10:00:11] SUCCESS: Process completed in 11.2 seconds
```

**含まれる情報**:
- 処理の各ステップの実行状況
- 成功/失敗の結果
- エラー情報（発生時）
- 実行時間の記録

### 3. コア機能

#### 3.1 DOM取得機能
- **使用技術**: Puppeteer
- **対応形式**: URL、ローカルHTMLファイル
- **待機処理**: ページロード完了まで待機
- **JavaScript実行**: SPA対応のため、DOM構築完了を検知

#### 3.2 ComputedStyle抽出機能
- `window.getComputedStyle()` を使用
- 指定セレクタに一致する全要素のスタイルを取得
- 比較対象プロパティのフィルタリング機能

**デフォルト比較プロパティ（レイアウト関連）**:
```javascript
[
  'width', 'height', 'min-width', 'max-width', 'min-height', 'max-height',
  'margin', 'margin-top', 'margin-right', 'margin-bottom', 'margin-left',
  'padding', 'padding-top', 'padding-right', 'padding-bottom', 'padding-left',
  'display', 'position', 'top', 'right', 'bottom', 'left',
  'flex', 'flex-direction', 'justify-content', 'align-items',
  'grid-template-columns', 'grid-template-rows', 'gap',
  'font-size', 'line-height', 'color', 'background-color',
  'border', 'border-radius', 'box-shadow'
]
```

#### 3.3 差分比較機能
- プロパティ単位での値比較
- 数値の正規化（例: `10px` vs `10.0px`）
- 色コード正規化（例: `#fff` vs `#ffffff` vs `rgb(255,255,255)`）
- 差分がある要素のみ抽出

#### 3.4 CSS自動生成機能
- 差分から有効なCSSルールを生成
- セレクタの優先度を考慮
- !important の自動付与オプション
- 見やすいフォーマット（インデント、改行）

#### 3.5 要素マッチング機能
- **基本**: 同一セレクタで自動マッチング
- **拡張**: 類似DOM構造の検出（将来実装）
  - XPathベースのマッチング
  - クラス名の部分一致
  - 構造的な類似度計算

#### 3.6 CSS特定機能
- Puppeteer CSS Coverage API を利用
- 適用されているCSSファイルと行番号を特定
- `getMatchedCSSRules()` による詳細取得（可能な環境のみ）

---

## 非機能要件

### 実行環境
- **Node.js**: v18.0.0 以上
- **対応OS**: Windows 10/11, macOS 12+, Linux (Ubuntu 20.04+)
- **必要メモリ**: 最低 2GB RAM（推奨 4GB以上）
- **ディスク容量**: 500MB以上（依存パッケージ含む）

### パフォーマンス
- **処理速度**: 1ページあたり5秒以内（目安）
- **同時処理**: 複数ページの並列処理に対応（オプション）
- **タイムアウト**: ページロード30秒、スタイル抽出10秒

### ログとエラーハンドリング
- 全ての処理ステップでログ出力必須
- エラー発生時も部分的な結果を出力
- スタックトレースの記録

### セキュリティ
- Basic認証対応（オプション）
- Cookie/セッション管理（将来対応）
- 認証情報は環境変数または設定ファイルで管理

---

## 技術スタック

### 主要技術
| 技術 | バージョン | 用途 |
|------|----------|------|
| Node.js | v18+ | 実行環境 |
| Puppeteer | latest | ブラウザ自動化、DOM取得 |
| fs-extra | latest | ファイル操作（出力） |
| css | latest | CSS解析・生成 |
| chalk | latest | ログの色付け（オプション） |
| commander | latest | CLI引数パース |
| js-yaml | latest | YAML設定ファイル対応 |

### 開発・テスト
- **Linter**: ESLint
- **Formatter**: Prettier
- **Test**: Jest
- **Type Checking**: TypeScript（オプション）

---

## ディレクトリ構成

```
project/
├── src/
│   ├── main.js                 # エントリーポイント
│   ├── compare.js              # 差分比較ロジック
│   ├── extractStyles.js        # ComputedStyle抽出
│   ├── generateCssPatch.js     # CSS生成
│   ├── logger.js               # ログ出力
│   ├── matcher.js              # 要素マッチング
│   └── utils/
│       ├── normalize.js        # 値の正規化
│       └── fileHandler.js      # ファイル入出力
├── config/
│   ├── default.json            # デフォルト設定
│   └── selectors.example.yaml  # セレクタ設定例
├── output/
│   ├── diff.json               # 差分レポート
│   ├── patch.css               # 修正パッチ
│   └── log.txt                 # ログファイル
├── test/
│   ├── fixtures/               # テスト用HTML
│   └── *.test.js               # ユニットテスト
├── package.json
├── README.md
└── CLAUDE.md                   # 本ドキュメント
```

---

## 使用方法

### インストール
```bash
npm install
```

### 基本的な使い方
```bash
node src/main.js \
  --old https://old-site.example.com \
  --new https://new-site-sfcc.example.com \
  --output ./output
```

### セレクタ指定
```bash
# CLI引数で指定
node src/main.js --old <url> --new <url> --selectors ".header,.footer,.product-card"

# 設定ファイルで指定
node src/main.js --old <url> --new <url> --config config/selectors.yaml
```

### オプション
```bash
--old <url|path>          # 旧サイトURL/パス（必須）
--new <url|path>          # 新サイトURL/パス（必須）
--output <dir>            # 出力先ディレクトリ（デフォルト: ./output）
--selectors <list>        # セレクタのカンマ区切りリスト
--config <path>           # 設定ファイルパス
--properties <list>       # 比較プロパティリスト
--important              # !important を付与
--no-important           # !important を付与しない（デフォルト）
--verbose                # 詳細ログ出力
--timeout <ms>           # タイムアウト（ミリ秒）
```

---

## 将来の拡張予定

### Phase 2: ビジュアル比較
- スクリーンショット自動撮影
- ピクセル単位での差分検出
- ビジュアル差分のハイライト表示

### Phase 3: 高度なマッチング
- 類似DOM自動マッチング精度向上
- AIベースの要素対応付け
- セマンティック解析による構造比較

### Phase 4: ダッシュボード
- Web UIでの差分可視化
- インタラクティブな修正提案
- 修正履歴の管理
- チームでの共有機能

### Phase 5: CI/CD統合
- GitHub Actions連携
- 定期実行とレポート自動送信
- リグレッション検知

---

## 制約事項と注意点

### 制約事項
- JavaScript実行後のDOM状態を比較（静的HTMLとは異なる場合あり）
- 動的に変化する要素（アニメーション中など）は正確に取得できない可能性
- 外部リソース（画像、フォントなど）のロード失敗は差分に影響
- iframeやShadow DOMは別途対応が必要

### 注意点
- 初回実行時はChromiumのダウンロードが発生（約300MB）
- 大量のセレクタ指定時は処理時間が増加
- ページロード時間は含まれるため、サーバー速度に依存
- 生成されたCSSは手動レビュー推奨（機械的な差分のため）

---

## サポート・問い合わせ

### トラブルシューティング
1. ログファイル（`output/log.txt`）を確認
2. `--verbose` オプションで詳細ログを出力
3. Puppeteerのヘッドレスモードをオフにして動作確認

### 開発者向け情報
- デバッグモード: `DEBUG=true node src/main.js`
- テスト実行: `npm test`
- Lintチェック: `npm run lint`

---

## 変更履歴

| バージョン | 日付 | 変更内容 |
|----------|------|----------|
| 1.0.0 | 2025-11-18 | 初版作成 |

---

## ライセンス

TBD（プロジェクトに応じて設定）
