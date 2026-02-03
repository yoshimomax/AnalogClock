import { useState, useEffect, useCallback } from 'react'
import Clock from './components/Clock'
import Settings from './components/Settings'
import { Settings as SettingsType, defaultSettings, loadSettings, saveSettings } from './utils/settings'

// Check if running in Tauri
const isTauri = '__TAURI__' in window

function App() {
  const [settings, setSettings] = useState<SettingsType>(defaultSettings)
  const [showSettings, setShowSettings] = useState(false)

  useEffect(() => {
    loadSettings().then(setSettings)
  }, [])

  const updateSettings = useCallback((newSettings: Partial<SettingsType>) => {
    setSettings(prev => {
      const updated = { ...prev, ...newSettings }
      saveSettings(updated)
      return updated
    })
  }, [])

  const handleMouseDown = useCallback(async (e: React.MouseEvent) => {
    if (e.button === 0 && !showSettings) {
      if (isTauri) {
        const { appWindow } = await import('@tauri-apps/api/window')
        appWindow.startDragging()
      }
    }
  }, [showSettings])

  const handleContextMenu = useCallback((e: React.MouseEvent) => {
    e.preventDefault()
    setShowSettings(true)
  }, [])

  const handleQuit = useCallback(async () => {
    if (isTauri) {
      const { appWindow } = await import('@tauri-apps/api/window')
      appWindow.close()
    } else {
      window.close()
    }
  }, [])

  return (
    <div
      className="app"
      onMouseDown={handleMouseDown}
      onContextMenu={handleContextMenu}
      style={{ opacity: settings.opacity }}
    >
      <Clock
        size={settings.size}
        faceColor={settings.faceColor}
        showSeconds={settings.showSeconds}
        targetEnabled={settings.targetEnabled}
        targetHour={settings.targetHour}
        targetMinute={settings.targetMinute}
      />

      {showSettings && (
        <Settings
          settings={settings}
          onUpdate={updateSettings}
          onClose={() => setShowSettings(false)}
          onQuit={handleQuit}
        />
      )}
    </div>
  )
}

export default App
