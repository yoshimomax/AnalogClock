interface Props {
  onBack: () => void
}

export default function HelpPanel({ onBack }: Props) {
  return (
    <div className="help-panel">
      <div className="help-header">
        <button className="help-back-btn" onClick={onBack}>← 戻る</button>
        <h2>操作ガイド</h2>
      </div>

      <div className="help-body">

        {/* ── 基本操作 ── */}
        <section>
          <h3>基本操作</h3>
          <table className="help-table">
            <tbody>
              <tr><td>移動</td><td>文字盤の中央 ○ または任意の場所をドラッグ</td></tr>
              <tr><td>設定を開く</td><td>⚙ アイコンをクリック、ダブルクリック、または右クリック</td></tr>
              <tr><td>アラーム停止</td><td>点滅中に表示される "Stop Alarm" をクリック</td></tr>
            </tbody>
          </table>
        </section>

        {/* ── 表示設定 ── */}
        <section>
          <h3>表示</h3>
          <table className="help-table">
            <tbody>
              <tr><td>Opacity</td><td>時計全体の不透明度（30〜100%）</td></tr>
              <tr><td>Size</td><td>時計の直径（80〜500 px）</td></tr>
              <tr><td>Seconds</td><td>秒針を表示する</td></tr>
              <tr><td>Date display</td><td>3時位置に今日の日付を表示する</td></tr>
              <tr><td>Numbers</td><td>文字盤に時刻数字（1〜12）を表示する</td></tr>
              <tr>
                <td style={{ whiteSpace: 'nowrap' }}>文字盤の色</td>
                <td>プリセット10色から選ぶか、"Custom Color…" でカスタム色を指定する</td>
              </tr>
            </tbody>
          </table>
        </section>

        {/* ── ウィンドウ設定 ── */}
        <section>
          <h3>ウィンドウ</h3>
          <table className="help-table">
            <tbody>
              <tr><td>Always on top</td><td>他のウィンドウより常に前面に表示する</td></tr>
              <tr><td>Click-through</td><td>操作ゾーン以外のクリックを背面のウィンドウへ透過させる（→ 詳細は下記）</td></tr>
              <tr><td>Corner margin</td><td>Corner Snap 時の画面端からの余白（px）</td></tr>
            </tbody>
          </table>
        </section>

        {/* ── Target time ── */}
        <section>
          <h3>Target time（目標時刻）</h3>
          <p className="help-p">"Target time" をオンにすると、文字盤に破線の針が追加されます。</p>
          <table className="help-table">
            <tbody>
              <tr><td>Fixed Time</td><td>時・分を直接入力して固定</td></tr>
              <tr>
                <td>From Now</td>
                <td>
                  現在時刻から N 分後を指定。針はリアルタイムで進み続ける。<br />
                  "Set" ボタンを押すと、その瞬間の時刻で Fixed Time として確定される
                </td>
              </tr>
              <tr>
                <td style={{ whiteSpace: 'nowrap' }}>Alarm<br />(opacity flash)</td>
                <td>目標時刻に達すると60秒間点滅。"Stop Alarm" で手動停止</td>
              </tr>
            </tbody>
          </table>
        </section>

        {/* ── Click-through ── */}
        <section>
          <h3>Click-through モード</h3>
          <p className="help-p">
            カーソルが操作ゾーン外にある間、クリックは時計を透過して背面のウィンドウに届きます。
            操作ゾーンに入ると自動的に操作可能になり、1.5秒間ゾーン外に出ると再び透過に戻ります。
          </p>
          <table className="help-table">
            <thead>
              <tr><th>ゾーン</th><th>位置</th><th>操作</th></tr>
            </thead>
            <tbody>
              <tr>
                <td>⚙ ギア</td>
                <td>6時位置の内側</td>
                <td>設定を開く・ドラッグ移動</td>
              </tr>
              <tr>
                <td>中央 ○</td>
                <td>文字盤の中心</td>
                <td>ドラッグ移動のみ</td>
              </tr>
            </tbody>
          </table>
        </section>

        {/* ── Corner Snap ── */}
        <section>
          <h3>Corner Snap（角スナップ）</h3>
          <p className="help-p">
            設定画面の ↖ ↗ ↙ ↘ ボタンで、時計を現在のモニターの四隅へ即座に移動します。<br />
            隙間のサイズは Corner margin で調整できます。
          </p>
          <p className="help-p">
            オフスクリーンになった場合は、トレイメニューの "位置を復元" でプライマリモニター右上に戻せます。
          </p>
        </section>

      </div>
    </div>
  )
}
