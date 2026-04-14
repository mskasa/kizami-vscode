# kizami-vscode — CLAUDE.md（日本語版）

## プロジェクト概要

[kizami](https://github.com/mskasa/kizami) 向けの VS Code 拡張機能。ソースファイルを開いたときに、関連する ADR や設計ドキュメントをサイドバーパネルに表示します。

拡張機能はサブプロセスとして `kizami blame <file>` を呼び出し、結果をクリック可能な TreeView として表示します。ドキュメントアイテムをクリックすると、Markdown プレビューで開きます。

**関連リポジトリ:** [mskasa/kizami](https://github.com/mskasa/kizami) — この拡張機能が依存する Go CLI。

---

## ディレクトリ構成

```
kizami-vscode/
├── src/
│   ├── extension.ts        # アクティベーション、コマンド登録、エディタ変更リスナー
│   └── kizamiProvider.ts   # TreeDataProvider — `kizami blame` の呼び出しと出力パース
├── media/
│   └── kizami.svg          # アクティビティバーアイコン
├── .vscode/
│   ├── launch.json         # F5 / 実行 → デバッグ開始 → 拡張機能開発ホスト
│   └── tasks.json          # デフォルトビルドタスク（tsc コンパイル）
├── out/                    # コンパイル済み JS（gitignore 対象）
├── package.json            # 拡張機能マニフェスト
└── tsconfig.json
```

---

## 技術スタック

| 用途           | ツール                      |
| -------------- | --------------------------- |
| 言語           | TypeScript                  |
| 拡張機能 API   | VS Code Extension API 1.85+ |
| ビルド         | tsc（バンドラーなし）        |
| サブプロセス   | Node.js `child_process.exec` |

---

## 開発環境セットアップ

```bash
cd ~/Documents/github/mskasa/kizami-vscode
npm install
npm run compile     # ワンショットビルド
npm run watch       # インクリメンタルリビルド
```

### 拡張機能の実行

このフォルダーを VS Code で開き、以下のいずれかを実行します:
- `F5` を押す
- または: **実行 → デバッグの開始**

**拡張機能開発ホスト** ウィンドウが起動します。拡張機能を有効にするには、`kizami.toml` を含むワークスペース（例: `kizami` リポジトリ）を開いてください。

### kizami バイナリの更新

拡張機能は `kizami` にシェルアウトします。メインの kizami リポジトリに変更を加えた後は、バイナリを再ビルドしてください:

```bash
cd ~/Documents/github/mskasa/kizami
go build -o ~/go/bin/kizami .
```

---

## 動作の仕組み

1. **アクティベーション** — ワークスペースに `kizami.toml` が存在するときにトリガーされます（`activationEvents`）
2. **エディタ変更リスナー** — `onDidChangeActiveTextEditor` が `KizamiDocumentsProvider.refresh(filePath)` を呼び出します
3. **ツリーデータ** — `getChildren()` が `cp.exec` 経由で `kizami blame <relative-path>` を呼び出します
4. **出力パース** — `kizamiProvider.ts` 内の `parseBlameOutput()` が以下の複数行フォーマットをパースします:
   ```
   Found N decision(s) mentioning "...":

   [0000] YYYY-MM-DD | Status
   Title: ...
   Path: /absolute/path/to/doc.md

   ```
5. **クリックアクション** — VS Code 組み込みの Markdown プレビューでドキュメントを開きます（`markdown.showPreview`）

### 主要ファイル

- `src/kizamiProvider.ts` — データ取得とパースのロジックがすべてここに集約されています
- `src/extension.ts` — プロバイダーとコマンドを結びつける薄いグルーコード

---

## 設定

| 設定項目             | デフォルト | 説明                                                     |
| -------------------- | ---------- | -------------------------------------------------------- |
| `kizami.binaryPath`  | `"kizami"` | PATH が通っていない場合の kizami バイナリへのパス         |

---

## 現在の状態（プロトタイプ）

### 実装済み
- [x] アクティブなファイルの関連ドキュメントを表示するサイドバー TreeView
- [x] サブプロセスとして `kizami blame <file>` を呼び出す
- [x] 複数行出力のパース、タイトル・ステータス・日付を表示
- [x] ドキュメントのクリックで Markdown プレビューを開く
- [x] `kizami.toml` を含むワークスペースでのみアクティベート
- [x] サブディレクトリ内ファイルからワークスペースルートを見つけるウォークアップロジック
- [x] `kizami.binaryPath` 設定項目

### 既知の制限事項
- サブプロセス実行中のローディングインジケーターなし
- `kizami` バイナリが見つからない場合にエラーが表示されない（汎用エラーメッセージのみ）

---

## バックログ

### 優先度：高
- [x] `kizami` バイナリが見つからない場合の明確なエラー表示とインストール案内リンク
- [x] ファイルの右クリックコンテキストメニュー: "Find related kizami documents"

### 優先度：中
- [ ] TreeView タイトルバーの更新ボタン
- [ ] 現在のファイルの関連ドキュメント数を表示するステータスバーアイテム
- [ ] `kizami list` ビュー — ワークスペース内の全ドキュメントを一覧する 2 つ目の TreeView タブ
- [ ] `en` または `ja` ドキュメントを優先する `kizami.language` 設定

### 優先度：低
- [ ] VS Code Marketplace へのパッケージングと公開
- [ ] CI ワークフロー（プッシュ時の lint + コンパイルチェック）

---

## ブランチ & PR ワークフロー

メインの kizami リポジトリと同じ規約:
- 機能ごとに 1 ブランチ: `feature/xxx`、`fix/xxx`
- Claude が実装・コミット・プッシュ・PR 作成を担当
- オーナーが GitHub UI でレビュー・マージ
- **スカッシュマージ** を使用

---

## kizami との関係

この拡張機能は薄いシェルです: kizami の内部実装に関する知識は持ちません。
ドキュメントの探索とパースはすべて `kizami` CLI バイナリに委譲されています。

将来 `kizami blame` の出力フォーマットが変わった場合、更新が必要なのは `kizamiProvider.ts` 内の `parseBlameOutput()` のみです。
