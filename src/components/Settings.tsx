import { useRef } from 'react'
import { Settings as SettingsType, PRESET_COLORS } from '../utils/settings'

const isTauri = '__TAURI__' in window

interface Props {
  settings: SettingsType
  onUpdate: (s: Partial<SettingsType>) => void
  onClose: () => void
  onQuit: () => void
}

type Corner = 'tl' | 'tr' | 'bl' | 'br'

async function snapToCorner(corner: Corner, margin: number) {
  if (!isTauri) return
  const { appWindow, LogicalPosition, currentMonitor } = await import('@tauri-apps/api/window')
  const monitor = await currentMonitor()
  if (!monitor) return
  const sc = monitor.scaleFactor
  const mX = monitor.position.x / sc, mY = monitor.position.y / sc
  const mW = monitor.size.width / sc, mH = monitor.size.height / sc
  const winSize = await appWindow.outerSize()
  const wW = winSize.width / sc, wH = winSize.height / sc
  const x = (corner === 'tr' || corner === 'br') ? mX + mW - wW - margin : mX + margin
  const y = (corner === 'bl' || corner === 'br') ? mY + mH - wH - margin : mY + margin
  await appWindow.setPosition(new LogicalPosition(x, y))
}

export default function Settings({ settings, onUpdate, onClose, onQuit }: Props) {
  const colorInputRef = useRef<HTMLInputElement>(null)

  return (
    <div className="settings-panel">

        <h2>⚙ Settings</h2>

        {/* Sliders */}
        <div className="slider-row">
          <span className="slider-label">Opacity</span>
          <input type="range" min="30" max="100"
            value={Math.round(settings.opacity * 100)}
            onChange={e => onUpdate({ opacity: parseInt(e.target.value) / 100 })} />
          <span className="slider-val">{Math.round(settings.opacity * 100)}%</span>
        </div>

        <div className="slider-row">
          <span className="slider-label">Size</span>
          <input type="range" min="150" max="500"
            value={settings.size}
            onChange={e => onUpdate({ size: parseInt(e.target.value) })} />
          <span className="slider-val">{settings.size}</span>
        </div>

        {/* Color presets */}
        <div className="color-presets">
          {PRESET_COLORS.map(({ color, name }) => (
            <button key={color}
              className={`color-preset${settings.faceColor === color ? ' active' : ''}`}
              style={{ backgroundColor: color }}
              onClick={() => onUpdate({ faceColor: color })}
              title={name} />
          ))}
        </div>
        <button className="custom-color-btn" onClick={() => colorInputRef.current?.click()}>
          Custom Color…
        </button>
        <input ref={colorInputRef} type="color" className="color-input-hidden"
          value={settings.faceColor}
          onChange={e => onUpdate({ faceColor: e.target.value })} />

        {/* Checkboxes – two per row */}
        <div className="checks-grid">
          <label className="check-label">
            <input type="checkbox" checked={settings.showSeconds}
              onChange={e => onUpdate({ showSeconds: e.target.checked })} />
            Seconds
          </label>
          <label className="check-label">
            <input type="checkbox" checked={settings.alwaysOnTop}
              onChange={e => onUpdate({ alwaysOnTop: e.target.checked })} />
            Always on top
          </label>
          <label className="check-label">
            <input type="checkbox" checked={settings.clickThrough}
              onChange={e => onUpdate({ clickThrough: e.target.checked })} />
            Click-through
          </label>
          <label className="check-label">
            <input type="checkbox" checked={settings.targetEnabled}
              onChange={e => onUpdate({ targetEnabled: e.target.checked })} />
            Target time
          </label>
        </div>

        {/* Target time inputs (conditional) */}
        {settings.targetEnabled && (
          <div className="time-inputs">
            <input type="number" min="0" max="23" value={settings.targetHour}
              onChange={e => onUpdate({ targetHour: Math.max(0, Math.min(23, +e.target.value || 0)) })} />
            <span>時</span>
            <input type="number" min="0" max="59" value={settings.targetMinute}
              onChange={e => onUpdate({ targetMinute: Math.max(0, Math.min(59, +e.target.value || 0)) })} />
            <span>分</span>
          </div>
        )}

        {/* Corner snap */}
        {isTauri && (
          <>
            <div className="slider-row">
              <span className="slider-label">Corner margin</span>
              <input type="range" min="0" max="100"
                value={settings.snapMargin}
                onChange={e => onUpdate({ snapMargin: parseInt(e.target.value) })} />
              <span className="slider-val">{settings.snapMargin}px</span>
            </div>
            <div className="corner-snap-grid">
              <button className="corner-btn" onClick={() => snapToCorner('tl', settings.snapMargin)} title="Top-left">↖</button>
              <button className="corner-btn" onClick={() => snapToCorner('tr', settings.snapMargin)} title="Top-right">↗</button>
              <button className="corner-btn" onClick={() => snapToCorner('bl', settings.snapMargin)} title="Bottom-left">↙</button>
              <button className="corner-btn" onClick={() => snapToCorner('br', settings.snapMargin)} title="Bottom-right">↘</button>
            </div>
          </>
        )}

        {/* Action buttons */}
        <div className="settings-buttons">
          <button className="btn btn-danger" onClick={onQuit}>Quit</button>
          <button className="btn btn-primary" onClick={onClose}>Close</button>
        </div>

    </div>
  )
}
