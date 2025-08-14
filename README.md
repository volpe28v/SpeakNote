# SpeakNote - 英語学習アプリ

小学生向けの英語学習アプリです。英語の文章を入力しながら、発音を確認し、日本語訳を学べます。

## 機能

- **発音機能**: スペースキーやエンターキーで英語を自動発音
- **翻訳機能**: Google翻訳APIを使用した高精度な翻訳
- **保存機能**: 学習した文章を最大20件まで保存
- **ノート風UI**: 左に英語、右に日本語訳を表示

## Google翻訳APIの設定方法

SpeakNoteで本格的な翻訳機能を使用するには、Google Apps Scriptを使用して翻訳APIを設定する必要があります。

### 手順

1. **Google Apps Scriptプロジェクトの作成**
   - [script.google.com](https://script.google.com) にアクセス
   - Googleアカウントでログイン
   - 「新しいプロジェクト」をクリック

2. **コードの実装**
   以下のコードをコピーして貼り付けます：

   ```javascript
   function doGet(e) {
     // CORSヘッダーを設定
     const output = ContentService.createTextOutput()
     output.setMimeType(ContentService.MimeType.JSON)

     const text = e.parameter.text || ''
     const source = e.parameter.source || 'en'
     const target = e.parameter.target || 'ja'

     try {
       const translated = LanguageApp.translate(text, source, target)
       return output.setContent(
         JSON.stringify({
           success: true,
           text: translated,
           source: source,
           target: target,
         })
       )
     } catch (error) {
       return output.setContent(
         JSON.stringify({
           success: false,
           error: error.toString(),
         })
       )
     }
   }
   ```

3. **デプロイ**
   - メニューから「デプロイ」→「新しいデプロイ」を選択
   - 種類：「ウェブアプリ」を選択
   - 設定：
     - 説明：「SpeakNote Translation API」
     - 実行ユーザー：「自分」
     - アクセスできるユーザー：「全員」
   - 「デプロイ」ボタンをクリック

4. **初回承認**
   - 初回のみGoogleの承認画面が表示されます
   - 「詳細」→「安全でないページに移動」→「許可」

5. **URLの取得とSpeakNoteへの設定**
   - デプロイ完了後、表示されるURLをコピー
   - `script.js`ファイルの2行目にある `GAS_TRANSLATE_URL` にURLを設定：
   ```javascript
   const GAS_TRANSLATE_URL = 'https://script.google.com/macros/s/YOUR_SCRIPT_ID/exec'
   ```

## 使い方

1. 英語を入力欄に入力
2. スペースキーで単語を発音、エンターキーで文章を発音
3. 「翻訳」ボタンで日本語訳を表示
4. 「保存」ボタンで学習内容を保存

## 注意事項

- Google Apps Scriptの翻訳APIは無料で使用できます
- 1日あたり20,000リクエストまで可能です
- 個人利用を想定しています
