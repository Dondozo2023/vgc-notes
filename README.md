# 海外大会ノート

Hugoで生成する、日本語のポケモンVGC個人ブログです。Esports Chartsの雰囲気を参考に、黒に近い背景・緑のアクセント・統計表を中心にしたダークテーマを用意しています。

## 収録内容

- Victory Roadの終了済みM-C 8大会、マスター掲載718件と他部門の掲載結果
- Pokedataの公式4大会・マスター全2,759件、完全な6匹2,744構築、技・持ち物・特性・性格・ラウンド履歴
- 新旧一覧の重複大会を統合し、旧JSONも保存。取得範囲・欠損・件数差を収録状況ページで確認
- AND検索、大会・順位・構築欠損の条件、構築のブラウザ内保存、全件JSONダウンロード
- 上位8人の構築一覧と、優勝者の6匹・技・持ち物
- 公開チーム情報からの考察（選手本人の解説とは区別）
- 公式4大会・上位32構築の採用率と、9月24→10月8構築の比較。従来の9月の記事も維持
- 大会・選手・ポケモン名による記事検索、種類の絞り込み
- 大会日で整理するアーカイブ、公開日と更新日の個別表示
- 42種類のポケモン詳細：種族値、タイプ相性、形態の切り替え
- 大会上位構築での技・持ち物・特性・性格、同時採用と採用構築一覧
- ランクバトルM-6の公開採用データ（大会データと切り替え、集計元を明示）
- 大会別の絞り込み、名前検索、採用率・すばやさ・名前での並べ替え

情報源はVictory Road、Pokedata、Limitless VGCです。出典と確認日は各記事に記載しています。主催者との個別照合は未実施です。新しい固有名詞の日本語表記が確認できていない場合は英語名を残しています。

## 読む

公開URL: https://dondozo2023.github.io/vgc-notes/

ブログ用の保存先: https://github.com/Dondozo2023/vgc-notes

作業中のプレビューは http://localhost:1313/vgc-notes/ です。このPCでプレビュー用の処理を起動している間だけ開けます。

後から再開する場合は、AIに「海外大会ノートのプレビューを開いて」と伝えてください。AIは `scripts/preview.ps1` を起動できます。

## AIに更新を頼む

「この大会URLを追加して」「9月と10月を比較して」「この構築の説明を詳しくして」のように指示できます。取得方法と編集規則は `AGENTS.md` に記載しています。

本文は `content/`、大会データは `data/`、レイアウトは `layouts/`、見た目は `assets/css/main.css` と `assets/css/dark.css` に分けています。

`scripts/import-tournament.mjs` は、指定したLimitless VGC大会の上位8構築を取得し、追加記事を下書きとして作成します。認証や有料APIは不要です。構築の戦い方はAIが根拠を確認して補います。

これは指定した大会を追加する半自動運用の土台です。新大会の定期巡回・AIによる無人執筆は、まだ設定していません。

## 公開

GitHubの無料アカウントと公開リポジトリでGitHub Pagesに公開する構成です。追加サービスの登録・独自ドメイン・有料サーバーは不要です。

公開リポジトリへ `main` ブランチを送ると、設定済みのGitHub Actionsがデータ確認とブログ生成を行います。Pagesの公開元はGitHub Actionsを指定します。公開後は記事更新を送るたびに再生成されます。

GitHub Actionsは記事を生成する処理です。大会の収集やAI執筆を実行する処理とは別です。

## 検証

Hugo 0.167.0を使用。表示・ビルドは外部テーマや追加ブラウザライブラリに依存しません。公開ソースの取り込み用PythonだけBeautifulSoup 4.14.3を使用します。Node.jsで `node scripts/validate.mjs` を実行すると、6匹・4技の整合性、出典、画像、採用率を確認できます。

`node scripts/build-pokemon-data.mjs` は保存したデータからポケモン統計とページを生成します。ランク採用データはM-6の取得時点の記録で、外部サイトの変更をリアルタイムで反映するものではありません。

## 出典・画像

- https://limitlessvgc.com/tournaments/443
- https://limitlessvgc.com/tournaments/442
- https://limitlessvgc.com/tournaments/441
- https://champs.pokedb.tokyo/pokemon/list?season=6&rule=1

ポケモン基本情報・ランク採用率はバトルデータベース チャンピオンズ（M-6・ダブル）を出典にしています。各詳細ページに個別の出典を掲載。LabMausとSilph Scopeは関連データへの参照リンクを設けています。Global Challenge Iは掲載順位・最終レート・構築リンク・レンタルコードを収録。選手の通算マッチ成績・OMW/OOMWと、ポケモン単体の勝率は区別しています。能力ポイントは取得対象に含めていません。

ポケモン画像は各公開チームで使われている画像を保存して使用しています。ポケモンに関する名称・画像の権利は各権利者に帰属します。このサイトは非公式です。

## M-Cの一括収録（AI用）

ユーザーに作業させず、AIが取得・検証・公開を実施します。2026/10/8時点の監査済み8大会が対象です。新大会を追加する前にVRカレンダーとPokedata新旧一覧を再確認してください。

1. `node scripts/collect-mc-sources.mjs` で公開ソースを `.cache/mc-sources` に保存。
2. `python scripts/import-mc-snapshot.py` で部門・ルール・母数を確認して取り込む。必要なPython依存は `scripts/requirements.txt`。
3. 新しい画像は元の公開チーム表示でURLを確認して取得。フォーム画像を番号の推測だけで補完しない。
4. `node scripts/build-library.mjs` と `node scripts/build-pokemon-data.mjs` を実行。初期本文の上書きに注意し、編集済み記事との差分を確認。
5. `node scripts/validate.mjs`、Hugoの本番ビルド、`node scripts/verify-build.mjs <ビルド先>`、ブラウザで検索・詳細・スマホの表示を確認。
6. このリポジトリのmainへ送って既存Pages workflowの成功を確認。収集を定期実行する設定はありません。

全データの保存先は `static/data/`。検索用軽量JSONと出典の全フィールドを残したダウンロード用JSONを分けています。VRの元記事本文を転載せず、結果・構築・使用率の事実を独自の日本語表示に整理しています。名称辞書には[PokeAPI](https://github.com/PokeAPI/pokeapi/tree/master/data/v2/csv)を追加利用しています。
