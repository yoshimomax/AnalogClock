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
  const { emit } = await import('@tauri-apps/api/event')
  await emit('snap-to-corner', { corner, margin })
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
            <input type="checkbox" checked={settings.showDate}
              onChange={e => onUpdate({ showDate: e.target.checked })} />
            Date display
          </label>
          <label className="check-label">
            <input type="checkbox" checked={settings.showNumbers}
              onChange={e => onUpdate({ showNumbers: e.target.checked })} />
            Numbers
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
          <>
            <div className="time-inputs">
              <input
                type="number" min="1" max="12" value={settings.targetHour}
                onChange={e => {
                  if (e.target.value === '') return
                  const v = +e.target.value
                  if (v > 12) onUpdate({ targetHour: 1 })
                  else if (v < 1) onUpdate({ targetHour: 12 })
                  else onUpdate({ targetHour: v })
                }}
              />
              <span>時</span>
              <input
                type="number" min="0" max="59" value={settings.targetMinute}
                onChange={e => {
                  if (e.target.value === '') return
                  const v = +e.target.value
                  if (v > 59) onUpdate({ targetMinute: 0 })
                  else if (v < 0) onUpdate({ targetMinute: 59 })
                  else onUpdate({ targetMinute: v })
                }}
              />
              <span>分</span>
              <input type="color" value={settings.targetColor}
                onChange={e => onUpdate({ targetColor: e.target.value })}
                style={{ width: 28, height: 28, padding: 1, border: '1.5px solid #d0d8e8', borderRadius: 6, cursor: 'pointer', background: 'none' }}
                title="針の色" />
            </div>
            <label className="check-label" style={{ marginTop: 4 }}>
              <input type="checkbox" checked={settings.targetAlarmEnabled}
                onChange={e => onUpdate({ targetAlarmEnabled: e.target.checked })} />
              Alarm (opacity flash)
            </label>
          </>
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
