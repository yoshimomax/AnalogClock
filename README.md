# Analog Clock

デスクトップに表示するシンプルなアナログ時計アプリケーションです。

## 特徴

- クラシックなアナログ時計デザイン
- 時針、分針、秒針の表示
- 軽量でシンプル

## 必要条件

- Python 3.6以上
- tkinter（通常Pythonに標準で含まれています）

### tkinterのインストール（必要な場合）

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

## 使い方

```bash
python3 analog_clock.py
```

## カスタマイズ

`analog_clock.py`の`main()`関数内のコメントを外すことで、以下のカスタマイズが可能です：

- **常に最前面に表示**: `root.attributes('-topmost', True)`
- **ウィンドウ枠なし**: `root.overrideredirect(True)`
