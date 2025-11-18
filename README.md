# SFCC サイト移行 DOM差分抽出ツール

Salesforce Commerce Cloud (SFCC) へのサイト移行時に、旧サイトと新サイトのDOM構造とComputedStyleの差分を自動的に抽出し、CSS修正パッチを生成するツールです。

## 機能

- **自動スタイル抽出**: Puppeteerを使用して、DOM要素のcomputedStyleを自動抽出
- **差分比較**: 旧サイトと新サイトのスタイルを比較し、差分を検出
- **CSS修正パッチ生成**: 検出された差分から、即座に適用可能なCSSパッチを自動生成
- **柔軟な設定**: URL/ローカルHTMLファイルの両方に対応、設定ファイルやCLI引数で柔軟に設定可能
- **詳細なレポート**: JSON形式の差分レポートと、わかりやすいログ出力

## 必要な環境

- Node.js v18.0.0 以上
- npm または yarn

## インストール

```bash
# リポジトリをクローン
git clone https://github.com/yuya0812/auto_tool.git
cd auto_tool

# 依存パッケージをインストール
npm install
```

初回インストール時、Puppeteerが約300MBのChromiumをダウンロードするため、時間がかかります。

## 使い方

### 基本的な使い方

```bash
node src/main.js --old <旧サイトのURL> --new <新サイトのURL>
```

#### 例：
```bash
node src/main.js \
  --old https://old-site.example.com \
  --new https://new-site-sfcc.example.com
```

### セレクタを指定して比較

特定の要素のみを比較したい場合：

```bash
node src/main.js \
  --old https://old-site.example.com \
  --new https://new-site-sfcc.example.com \
  --selectors ".header,.footer,.product-card,.button"
```

### 設定ファイルを使用

`config/selectors.example.yaml` を参考に設定ファイルを作成：

```bash
node src/main.js \
  --old https://old-site.example.com \
  --new https://new-site-sfcc.example.com \
  --config config/selectors.yaml
```

### ローカルHTMLファイルを比較

```bash
node src/main.js \
  --old ./old/index.html \
  --new ./new/index.html
```

### 詳細な CSS パッチを生成

コメント付きの詳細なCSSパッチを生成：

```bash
node src/main.js \
  --old https://old-site.example.com \
  --new https://new-site-sfcc.example.com \
  --detailed \
  --important
```

### 全オプション

```bash
オプション:
  --old <url|path>          旧サイトのURLまたはHTMLファイルパス（必須）
  --new <url|path>          新サイト(SFCC)のURLまたはHTMLファイルパス（必須）
  --output <dir>            出力先ディレクトリ（デフォルト: ./output）
  --selectors <list>        比較対象のCSSセレクタ（カンマ区切り）
  --config <path>           セレクタ設定ファイルのパス（JSON/YAML）
  --properties <list>       比較するCSSプロパティ（カンマ区切り）
  --important              生成CSSに !important を付与
  --no-important           !important を付与しない（デフォルト）
  --verbose                詳細ログを出力
  --timeout <ms>           タイムアウト時間（ミリ秒、デフォルト: 30000）
  --matching <strategy>    マッチング戦略: selector または similarity（デフォルト: selector）
  --detailed               詳細注釈付きのCSSパッチを生成
```

## 出力ファイル

実行後、指定した出力ディレクトリ（デフォルト: `./output`）に以下のファイルが生成されます：

### 1. `diff.json` - 差分レポート

```json
{
  "timestamp": "2025-11-18T10:00:00.000Z",
  "oldSite": "https://old-site.example.com",
  "newSite": "https://new-site-sfcc.example.com",
  "summary": {
    "totalElements": 120,
    "matchedElements": 115,
    "unmatchedElements": 5,
    "diffElements": 35,
    "diffProperties": 87
  },
  "differences": [...]
}
```

### 2. `patch.css` - CSS修正パッチ

即座に新サイトに適用できるCSS：

```css
/* Auto-generated CSS Patch */
/* Generated at: 2025-11-18T10:00:00.000Z */

.header-nav {
  width: 1200px;
  padding: 10px 20px;
}

.product-card .price {
  font-size: 18px;
  color: #e74c3c;
}
```

### 3. `log.txt` - 実行ログ

```
[2025-11-18 10:00:00] INFO: Starting SFCC DOM Diff Tool...
[2025-11-18 10:00:02] INFO: Old site loaded
[2025-11-18 10:00:05] INFO: Matched 115 elements
[2025-11-18 10:00:07] INFO: Found 35 elements with differences
[2025-11-18 10:00:11] SUCCESS: Process completed (11.2s)
```

## 設定

### デフォルト設定

`config/default.json` でデフォルト設定を変更できます：

```json
{
  "timeout": {
    "pageLoad": 30000,
    "styleExtraction": 10000
  },
  "defaultProperties": [
    "width", "height", "margin", "padding",
    "color", "background-color", "font-size"
  ],
  "css": {
    "useImportant": false
  },
  "puppeteer": {
    "headless": true,
    "defaultViewport": {
      "width": 1920,
      "height": 1080
    }
  }
}
```

### セレクタ設定ファイル

YAML形式でセレクタを管理：

```yaml
# config/selectors.yaml
selectors:
  # ヘッダー
  - '.header'
  - '.header-nav'
  - '.header-logo'

  # メインコンテンツ
  - '.main-content'
  - '.container'

  # 商品関連（ECサイト）
  - '.product-card'
  - '.product-list'
  - '.product-title'
  - '.product-price'

  # フッター
  - '.footer'
  - '.footer-nav'
```

## 仕組み

1. **Puppeteerを起動**: ヘッドレスChromeブラウザを起動
2. **ページ読み込み**: 旧サイトと新サイトのURLまたはHTMLを読み込み
3. **スタイル抽出**: `window.getComputedStyle()` でCSS値を取得
4. **要素マッチング**: セレクタまたは類似度でマッチング
5. **差分比較**: 正規化後のCSS値を比較
6. **出力生成**: JSONレポートとCSSパッチを生成

## 値の正規化

誤検知を防ぐため、以下の正規化を行います：

- **色**: `#fff` → `#ffffff`、`rgb(255,255,255)` → `#ffffff`
- **数値**: `10.0px` → `10px`、`1.50em` → `1.5em`
- **スペース**: `10px  20px` → `10px 20px`
- **短縮形**: `10px 10px 10px 10px` → `10px`

## マッチング戦略

### セレクタマッチング（デフォルト）
同一セレクタの要素を比較。高速で確実。

```bash
--matching selector
```

### 類似度マッチング
以下のスコアリングで類似要素を検出：
- ID一致: 100点
- クラス重複度: 最大50点
- タグ名一致: 10点
- DOM階層の類似度: 最大20点

```bash
--matching similarity
```

## 実行例

### ライブサイトの比較
```bash
node src/main.js \
  --old https://old.example.com \
  --new https://new.example.com \
  --output ./results
```

### ローカルファイルの比較
```bash
node src/main.js \
  --old ./test/old.html \
  --new ./test/new.html
```

### 詳細ログ付き
```bash
node src/main.js \
  --old https://old.example.com \
  --new https://new.example.com \
  --verbose
```

### !important付きパッチ生成
```bash
node src/main.js \
  --old https://old.example.com \
  --new https://new.example.com \
  --detailed \
  --important
```

## トラブルシューティング

### Puppeteerのインストールエラー

```bash
npm install puppeteer --unsafe-perm=true
```

### タイムアウトエラー

読み込みが遅いページの場合：

```bash
node src/main.js --old <url> --new <url> --timeout 60000
```

### 差分が見つからない

- セレクタが正しいか確認
- `--verbose` で詳細ログを確認
- ログファイルでページロード状況を確認

### メモリ不足

大きなページの場合：

```bash
node --max-old-space-size=4096 src/main.js --old <url> --new <url>
```

## プロジェクト構成

```
project/
├── src/                      # ソースコード
│   ├── main.js              # エントリーポイント
│   ├── compare.js           # 差分比較ロジック
│   ├── extractStyles.js     # スタイル抽出
│   ├── generateCssPatch.js  # CSS生成
│   ├── logger.js            # ロガー
│   ├── matcher.js           # 要素マッチング
│   └── utils/               # ユーティリティ
│       ├── normalize.js     # 値の正規化
│       └── fileHandler.js   # ファイルI/O
├── config/                   # 設定ファイル
│   ├── default.json         # デフォルト設定
│   └── selectors.example.yaml  # セレクタ設定例
├── output/                   # 出力先（自動生成）
│   ├── diff.json
│   ├── patch.css
│   └── log.txt
├── package.json
├── README.md                 # このファイル
└── CLAUDE.md                 # 詳細仕様書
```

## 今後の拡張予定

- スクリーンショット比較機能
- ビジュアル差分のハイライト表示
- Webダッシュボード
- CI/CD統合
- 複数ページの一括処理

## ライセンス

ISC

## 貢献

プルリクエスト歓迎します！

1. リポジトリをフォーク
2. フィーチャーブランチを作成
3. 変更をコミット
4. プルリクエストを送信

## サポート

問題が発生した場合：
- `output/log.txt` を確認
- `--verbose` フラグで詳細出力
- `CLAUDE.md` で詳細仕様を確認
- Issueを作成

---

**開発者**: yuya0812
**リポジトリ**: https://github.com/yuya0812/auto_tool
