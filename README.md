# pdfpper

画像フォルダやzipファイルをPDFに変換するツールです。webpファイルが含まれている場合は自動でjpgに変換してからPDF化します。

## 機能

- 指定したディレクトリ内の画像ファイルをPDFに変換します。
- zipファイルを指定した場合、zip内に画像ファイルが含まれていれば展開してPDF化します。画像ファイルが含まれていない場合は展開しません。
- webpファイルをjpgに変換してからPDF生成を行います。
- 出力ファイル名を指定可能。指定しない場合はディレクトリ名.pdfになります。
- PDF生成後に元のディレクトリを削除するオプションがあります。
- ログファイルに処理内容を自動記録。ログレベルに応じて出力内容を切り分けます。

## インストール

```bash
npm install
```

## 使用方法

### 基本的な使用

```bash
node index.js -d {画像ディレクトリ}
```

### zipファイルの使用

```bash
node index.js -d {zipファイル}
```

### リストファイルを使用

```bash
node index.js --lists {画像ディレクトリリストファイル}
```

### `find.js` を使ったファイル名・フォルダ名検索

```bash
node find.js -d {検索対象ディレクトリ} --find {検索文字列} --out-list {出力ファイル}
```

## オプション

- `-d, --dir <string>`: 画像格納フォルダまたはzipファイルを指定する。
- `-o, --output <string>`: 出力PDFファイルパスを指定する。指定しない場合は自動生成。
- `-e, --ext <string>`: 対象画像拡張子。autoを指定すると統一されている拡張子を自動判別（デフォルト: auto）。
- `-h, --help`: ヘルプを表示。
- `--del`: PDF生成後にディレクトリを削除。
- `--lists <string>`: ディレクトリパスのリストファイル（1行に1パス）を指定。

## find.js: 検索機能

`find.js` を使うと、指定フォルダ内のファイル名・フォルダ名を検索し、結果を新規ファイルに書き出せます。再帰検索は行いません。

- `-d, --dir <string>`: 検索対象ディレクトリを指定する。
- `--find <string>`: ファイル名またはフォルダ名に含まれる検索文字列を指定する。
- `--out-list <string>`: 一致したパスを書き出す新規ファイルパスを指定する。既存ファイルが存在する場合はエラーになります。

## 対応画像形式

- jpg, jpeg, png, gif, webp, tiff, bmp

## 例

```bash
# ディレクトリ内の画像をPDFに変換
node index.js -d /path/to/images -o output.pdf

# zipファイルを展開してPDF化
node index.js -d archive.zip -o result.pdf

# リストファイルを使用して複数のディレクトリを処理
node index.js --lists dirs.txt --del
```

## ログ

このツールは自動的にログファイルを生成します。

### ログファイルの場所

`./logs/` ディレクトリに以下のファイルが生成されます：

- `combined.log`: すべてのログ（error, warn, info, debug）
- `error.log`: エラーログのみ

### ログレベル

ログレベルは以下の通りです：

- `error`: エラー情報
- `warn`: 警告情報（入力値不正など）
- `info`: 通常の処理情報（ファイル展開、削除完了など）
- `debug`: 詳細情報（webp変換処理など）

デフォルトは `info` レベルです。より詳細なログが必要な場合は、`logger.js` の `createLogger()` 呼び出し時のレベルを変更してください。

```javascript
const logger = createLogger("debug"); // debugレベルに変更
```
