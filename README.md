# Analog Clock

デスクトップに表示するカスタマイズ可能なアナログ時計アプリケーションです。

## 特徴

- **透明度調整** - ウィンドウの透明度を20%〜100%で調整可能
- **サイズ調整** - 150px〜600pxでサイズを自由に変更
- **ドラッグ＆ドロップ** - 時計をドラッグしてデスクトップ上の好きな位置に移動
- **目標時刻表示** - 現在時刻とは別に、設定した目標時刻を緑の破線で表示
- **設定の自動保存** - 位置、サイズ、透明度などの設定を自動保存

## 操作方法

- **左クリック＆ドラッグ** - 時計を移動
- **右クリック** - 設定パネルを開く

## 設定パネルの機能

- 透明度スライダー
- サイズスライダー
- 目標時刻の設定（時・分）
- 常に最前面に表示（オン/オフ）
- 秒針の表示（オン/オフ）
- アプリの終了

## インストール方法

### 方法1: Pythonで実行

```bash
# 必要条件
# - Python 3.6以上
# - tkinter（通常Pythonに標準で含まれています）

python3 analog_clock.py
```

#### tkinterのインストール（必要な場合）

**Ubuntu/Debian:**
```bash
sudo apt-get install python3-tk
```

**Fedora:**
```bash
sudo dnf install python3-tkinter
```

**macOS:**
```bash
brew install python-tk
```

**Windows:**
Pythonインストール時に自動的にインストールされます。

### 方法2: 実行ファイルをビルド

PyInstallerを使用して、単一の実行ファイルを作成できます。

```bash
# ビルドの実行
python3 build.py
```

ビルドが完了すると、`dist/`フォルダに実行ファイルが作成されます：
- **Windows**: `dist/AnalogClock.exe`
- **macOS**: `dist/AnalogClock.app`
- **Linux**: `dist/AnalogClock`

## 設定ファイル

設定は `clock_config.json` に自動保存されます。実行ファイルと同じフォルダに保存されます。

```json
{
  "size": 300,
  "transparency": 1.0,
  "position_x": 100,
  "position_y": 100,
  "target_enabled": false,
  "target_hour": 12,
  "target_minute": 0,
  "always_on_top": true,
  "show_seconds": true
}
```

## スクリーンショット

起動すると、デスクトップ上にアナログ時計が表示されます。右クリックで設定を変更できます。
