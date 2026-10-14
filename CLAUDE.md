# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## 概要

れよんサーバー（Minecraft サーバー）と個人ページの静的サイト。**GitHub Pages で `https://reyonjp.github.io/` として公開している**。`main` に push した内容がそのまま公開されるため、push は公開と同じ扱いになる。

- ビルド・パッケージ管理・テスト・リンターはない。HTML/CSS/JS を直接編集する。
- サーバー処理は使えない。`mypage/.htaccess` などは以前のホスティング（cloudfree）の名残で、GitHub Pages では効かない。
- 内部リンクは拡張子なしで書かれている（例：`../stats/ForgeWars`）。GitHub Pages が `.html` を補って配信する。
- `_config.yml` がないので GitHub Pages の既定の Jekyll 処理が通る。`.` や `_` で始まるファイルは公開されない。
- すべての push・PR・コメントは `.github/workflows/discord-notify.yml` で Discord に通知される。
- コミットメッセージは日本語の短い一文（例：「統計サイト改善」「ForgeWars wiki 最新情報」）。
- 各ページに Google Analytics タグ（`G-SR1ZM40WZ5`）が入っている。新しいページにも入れる。

## 構成

- `index.html` … `mypage/` へリダイレクトするだけ。
- `mypage/` … 個人ページ（ホーム・製作物・ゲーム一覧）。共通ヘッダーは `mypage/header.js` が `document.write` で出力する。ナビ（ホーム／製作物／Wiki／試合統計）はここで管理している。
- `mypage/BrowserGame/*/` … Unity の WebGL ビルド成果物。手で編集しない。
- `wiki/` … ミニゲームごとの Wiki（`wiki/<ゲーム名>/index.html`。ForgeWars と GemHunter には `kit.html` もある）。全ページで `wiki/main.css` と `wiki/header.js` を共有する。ヘッダーは各ページに置いた `<div class="wiki-header" data-brand="..." data-nav='[...]'>` を `header.js` が置き換える。リンク先と active 状態はページごとに data 属性で指定する。
- `wiki/ForgeWars/kit.html` は、ゲームの Java ソースを正として更新する。手順はプロジェクトスキル `update-forgewars-kit`（`.claude/skills/`）にある。
- `stats/ForgeWars.html` … ForgeWars の試合統計サイト。下記参照。

## stats/ForgeWars.html（試合統計サイト）

CSS・HTML・JS をすべて含んだ1ファイル構成。外部依存は cdnjs の Chart.js と chartjs-plugin-datalabels、Google Fonts だけ。JS はファイル冒頭のコメントにある 1〜8 の節（設定 → 状態 → ユーティリティ → データ派生 → チャート → 描画 → 名前解決 → 起動）で並んでいる。

**データ**
- AWS Lambda（ap-northeast-1 の `ForgeWarsAnalyze`、Node.js。コードはこのリポジトリにない）の関数 URL（`LAMBDA_URL`）に GET すると `{ matches, players, damage, items, names }` が返る。元データはゲームが書き込む Google スプレッドシートの `Matches` / `MatchPlayers` / `DamageLog` / `ForgeWarsItem` シート。プレイヤー名の解決は同じ URL への POST `{ uuids }` で、Lambda 経由で Mojang に問い合わせる。
- `buildTables` が次の3つを作る。
  - `matches`：試合 ID → 試合のメタ情報
  - `picks`：出場（試合×プレイヤー）。ダメージ0の出場も含む
  - `rows`：ダメージ記録（試合×プレイヤー×アビリティ）
- **出場に関わる数（ピック数・勝率・試合数・毎分ダメージの分母）は必ず `picks` から数える。** `rows` にはダメージ0の出場が現れないため。
- 毎分ダメージは、ピックごとの平均ではなく `perMin` ヘルパーで「合計ダメージ ÷ 合計試合時間」として出す。
- 購入履歴は GET の `items`（`{ matchId, playerId, time(試合開始からの秒), item(表示名) }` の配列）。2026/10/10 以降の試合にしかなく、`buildTables` で `state.all.purchases`（pickKey → 時刻順の配列）にする。試合タブの「購入アイテム」（数直線）では期間で絞らずに使い、アイテムタブ（`derive.itemStats`）では期間内の出場のうち購入記録のある試合だけを母数にする。キット専用アイテム（アップグレードとサーマルアーマー）は定数 `KIT_ITEMS` で判断する。
- `kills` / `deaths` は 2026/09/26 以降の試合にしかない（それ以前は `null`）。記録のない試合は「記録なし」と表示する。
- 統合版（Bedrock）プレイヤーの UUID は `00000000` で始まり、Mojang API では名前を引けない。そのため「統合版プレイヤー①」のような名前を割り当てる。

**統計期間とデータの持ち方**
- `state.all` に全期間のデータを持つ。統計期間スライダーで選んだ期間に絞ったものが `state.matches/picks/rows` で、集計（`kitStats` など）はこちらから `applyPeriod()` で作り直す。
- 次のものは期間によらず全期間で持つ。
  - `state.allKits`：期間内にピックがないキットもキット表に 0% で並べるため
  - `kitColors`
  - `kitUseNth`：「そのキットを何回目に使ったか」
- 期間の変更はすべて `changePeriod()` を通す。期間外になった選択の切り替え、URL の更新、再描画をここでまとめて行う。

**表示状態**
- 表示状態は URL の `#` 以降に `history.replaceState` で保存する（`saveHash` / `readHash` / `applyHash`）。
- 書くのは今のタブで選んでいるもの1つだけで、タブはキーから判断する（例：`#match=19e63642`、`#kit=カルティスト`、`#item=金のリンゴ`）。タブはキット → アイテム → 試合 → プレイヤーの順。統計期間が全期間でなければ `&from=…&to=…` を足す。
- 読むときは `?match=…` のようなクエリ形式や `#tab=match` だけでも受け付ける。
- 新しい選択状態を足すときは、`saveHash` と `readHash` の両方に追加する。

**キット**
- キットの色は `KIT_COLOR` で定義する。新しいキットを追加したときはここにも足す。足さない場合は `FALLBACK_KIT_COLORS` の色が使われる。
- キット専用アイテム（キット → 表示名）は `KIT_ITEMS` に持つ。ゲームのソース（`ForgeWarsManager/Kit/*` の `EnchantUpgradeAbility` / `EnchantUpgradeUltimateAbility` / `EnchantType.KIT_ONLY`）が正で、アップグレード名は「アビリティ名 + " アップグレード"」。キットやアップグレードが変わったらここも直す。一覧にない「◯◯ アップグレード」は、いちばん多く買ったキットのものとして扱う。

## 動作確認

テストはない。ブラウザで `stats/ForgeWars.html` を直接開けば、本番の Lambda からデータを読んで動く（file:// でも動く）。

自動で確認するときはヘッドレスの Edge を使う。ページの末尾に検証用の `<script>` を足したコピーを作り、`state.all` が読み込まれるまで待ってから結果を DOM に書き出し、`--dump-dom` で取り出す。

```bash
"/c/Program Files (x86)/Microsoft/Edge/Application/msedge.exe" --headless=new --disable-gpu \
  --user-data-dir="<作業用ディレクトリ>/edge-profile" --virtual-time-budget=15000 \
  --dump-dom "file:///<検証用コピー>.html"
```

- `--user-data-dir` を分けないと、ユーザーが Edge を開いているときに失敗する。
- ヘッドレスでは `--window-size` を 390 にしても実際は幅 492px 前後で描画される。スマホ幅の確認には向かない。
- 古い Node（`??` を解釈できない）しか入っていないため、`node --check` では構文チェックできない。
