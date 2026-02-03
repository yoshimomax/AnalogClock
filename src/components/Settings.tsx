import { useRef } from 'react'
import { Settings as SettingsType, PRESET_COLORS } from '../utils/settings'

interface SettingsProps {
  settings: SettingsType
  onUpdate: (settings: Partial<SettingsType>) => void
  onClose: () => void
  onQuit: () => void
}

export default function Settings({ settings, onUpdate, onClose, onQuit }: SettingsProps) {
  const colorInputRef = useRef<HTMLInputElement>(null)

  const handleOverlayClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      onClose()
    }
  }

  return (
    <div className="settings-overlay" onClick={handleOverlayClick}>
      <div className="settings-panel" onClick={e => e.stopPropagation()}>
        <h2>Settings</h2>

        {/* Opacity */}
        <div className="settings-section">
          <label>Opacity</label>
          <input
            type="range"
            min="30"
            max="100"
            value={settings.opacity * 100}
            onChange={e => onUpdate({ opacity: parseInt(e.target.value) / 100 })}
          />
          <div className="slider-value">{Math.round(settings.opacity * 100)}%</div>
        </div>

        {/* Size */}
        <div className="settings-section">
          <label>Size</label>
          <input
            type="range"
            min="150"
            max="500"
            value={settings.size}
            onChange={e => onUpdate({ size: parseInt(e.target.value) })}
          />
          <div className="slider-value">{settings.size}px</div>
        </div>

        {/* Face Color */}
        <div className="settings-section">
          <label>Face Color</label>
          <div className="color-presets">
            {PRESET_COLORS.map(({ color, name }) => (
              <button
                key={color}
                className={`color-preset ${settings.faceColor === color ? 'active' : ''}`}
                style={{ backgroundColor: color }}
                onClick={() => onUpdate({ faceColor: color })}
                title={name}
              />
            ))}
          </div>
          <button
            className="custom-color-btn"
            onClick={() => colorInputRef.current?.click()}
          >
            Custom Color...
          </button>
          <input
            ref={colorInputRef}
            type="color"
            className="color-input-hidden"
            value={settings.faceColor}
            onChange={e => onUpdate({ faceColor: e.target.value })}
          />
        </div>

        {/* Target Time */}
        <div className="settings-section">
          <label className="checkbox-label">
            <input
              type="checkbox"
              checked={settings.targetEnabled}
              onChange={e => onUpdate({ targetEnabled: e.target.checked })}
            />
            Show Target Time
          </label>
          {settings.targetEnabled && (
            <div className="time-inputs">
              <div className="time-input-group">
                <input
                  type="number"
                  min="0"
                  max="23"
                  value={settings.targetHour}
                  onChange={e => onUpdate({ targetHour: Math.max(0, Math.min(23, parseInt(e.target.value) || 0)) })}
                />
                <span>時</span>
              </div>
              <div className="time-input-group">
                <input
                  type="number"
                  min="0"
                  max="59"
                  value={settings.targetMinute}
                  onChange={e => onUpdate({ targetMinute: Math.max(0, Math.min(59, parseInt(e.target.value) || 0)) })}
                />
                <span>分</span>
              </div>
            </div>
          )}
        </div>

        {/* Options */}
        <div className="settings-section">
          <label className="checkbox-label">
            <input
              type="checkbox"
              checked={settings.alwaysOnTop}
              onChange={e => onUpdate({ alwaysOnTop: e.target.checked })}
            />
            Always on Top
          </label>
          <label className="checkbox-label">
            <input
              type="checkbox"
              checked={settings.showSeconds}
              onChange={e => onUpdate({ showSeconds: e.target.checked })}
            />
            Show Second Hand
          </label>
        </div>

        {/* Buttons */}
        <div className="settings-buttons">
          <button className="btn btn-danger" onClick={onQuit}>
            Quit
          </button>
          <button className="btn btn-primary" onClick={onClose}>
            Close
          </button>
        </div>
      </div>
    </div>
  )
}
