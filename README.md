# Analog Clock for Windows

Windowsデスクトップに表示する透明背景のアナログ時計アプリケーションです。

## 特徴

- **透明背景** - 時計の外側は完全に透明（Windows専用機能）
- **文字盤の色選択** - 10種類のプリセットカラー + カスタムカラー
- **不透明度調整** - 時計全体の不透明度を30%〜100%で調整
- **サイズ調整** - 150px〜600pxでサイズを自由に変更
- **ドラッグ＆ドロップ** - 時計をドラッグしてデスクトップ上の好きな位置に移動
- **目標時刻表示** - 設定した目標時刻を緑の破線で表示
- **設定の自動保存** - 位置、サイズ、色などの設定を自動保存

## 動作環境

- **Windows 10/11** （透明背景機能はWindows専用）
- Python 3.6以上（ソースから実行する場合）

## 操作方法

| 操作 | 機能 |
|------|------|
| 左クリック＆ドラッグ | 時計を移動 |
| 右クリック | 設定パネルを開く |

## インストール方法

### 方法1: 実行ファイルを使用（推奨）

1. Windowsで `build.py` を実行して実行ファイルを作成：
   ```cmd
   python build.py
   ```

2. `dist/AnalogClock.exe` を好きな場所にコピー

3. ダブルクリックで起動

### 方法2: Pythonで直接実行

```cmd
python analog_clock.py
```

#### 必要条件

- Python 3.6以上
- tkinter（通常Pythonに標準で含まれています）

## 設定パネルの機能

右クリックで設定パネルが開きます：

- **Opacity** - 時計全体の不透明度
- **Size** - 時計のサイズ（150px〜600px）
- **Face Color** - 文字盤の色（10種類のプリセット + カスタム）
- **Target Time** - 目標時刻の表示（緑の破線）
- **Always on top** - 常に最前面に表示
- **Show second hand** - 秒針の表示/非表示

## 設定ファイル

設定は `clock_config.json` に自動保存されます（実行ファイルと同じフォルダ）：

```json
{
  "size": 300,
  "opacity": 1.0,
  "position_x": 100,
  "position_y": 100,
  "face_color": "#FFFFFF",
  "target_enabled": false,
  "target_hour": 12,
  "target_minute": 0,
  "always_on_top": true,
  "show_seconds": true
}
```

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
