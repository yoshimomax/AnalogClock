# Analog Clock for Windows

Windowsデスクトップに表示するスタイリッシュなアナログ時計アプリケーションです。

![Analog Clock](https://img.shields.io/badge/platform-Windows-blue)
![Build](https://github.com/yoshimomax/AnalogClock/actions/workflows/build.yml/badge.svg)

## 特徴

- **透明背景** - 時計の外側は完全に透明
- **スタイリッシュなデザイン** - SVGベースの美しい描画、グラデーション、ガラス風エフェクト
- **文字盤の色選択** - 10種類のプリセットカラー + カスタムカラー
- **不透明度調整** - 時計全体の不透明度を調整可能
- **サイズ調整** - 150px〜500pxでサイズを自由に変更
- **ドラッグ＆ドロップ** - 時計をドラッグしてデスクトップ上の好きな位置に移動
- **目標時刻表示** - 設定した目標時刻を緑の破線で表示
- **設定の自動保存** - 位置、サイズ、色などの設定を自動保存
- **軽量** - Tauri使用で実行ファイルが小さい（約5-10MB）

## インストール方法

### 方法1: リリースからダウンロード（推奨）

1. [Releases](../../releases) ページから最新版をダウンロード
2. `AnalogClock_x64-setup.exe` を実行してインストール
3. スタートメニューまたはデスクトップから起動

### 方法2: 自分でビルド

ローカルでビルドする場合は以下が必要です：
- Node.js 18+
- Rust
- Visual Studio Build Tools

```bash
# 依存関係のインストール
npm install

# 開発モードで実行（ブラウザでプレビュー）
npm run dev

# アプリをビルド
npm run tauri build
```

## 操作方法

| 操作 | 機能 |
|------|------|
| 左クリック＆ドラッグ | 時計を移動 |
| 右クリック | 設定パネルを開く |

## 設定パネル

右クリックで設定パネルが開きます：

- **Opacity** - 時計全体の不透明度
- **Size** - 時計のサイズ（150px〜500px）
- **Face Color** - 文字盤の色（10種類のプリセット + カスタム）
- **Target Time** - 目標時刻の表示（緑の破線）
- **Always on Top** - 常に最前面に表示
- **Show Second Hand** - 秒針の表示/非表示

## プリセットカラー

| 色 | 名前 |
|----|------|
| #FFFFFF | White |
| #F0F0F0 | Light Gray |
| #E8E8E8 | Silver |
| #FFFACD | Lemon |
| #E6F3FF | Light Blue |
| #E8FFE8 | Light Green |
| #FFE8E8 | Light Pink |
| #FFF0E0 | Peach |
| #2C2C2C | Dark Gray |
| #1A1A2E | Dark Blue |

暗い色を選択すると、文字と針の色が自動的に白に変更されます。

## 技術スタック

- **Frontend**: React + TypeScript + Vite
- **Backend**: Tauri (Rust)
- **Styling**: CSS3 with gradients and effects
- **Build**: GitHub Actions

## 開発

```bash
# 依存関係のインストール
npm install

# 開発サーバー起動（ブラウザでUIプレビュー）
npm run dev

# Tauriアプリとして起動（Rust環境が必要）
npm run tauri dev
```

## ライセンス

MIT License
