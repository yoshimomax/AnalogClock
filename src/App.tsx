import { useState, useEffect, useCallback, useRef } from 'react'
import Clock from './components/Clock'
import Settings from './components/Settings'
import { Settings as SettingsType, defaultSettings, loadSettings, saveSettings } from './utils/settings'

// Check if running in Tauri
const isTauri = '__TAURI__' in window

function App() {
  const [settings, setSettings] = useState<SettingsType>(defaultSettings)
  const [showSettings, setShowSettings] = useState(false)
  const showSettingsRef = useRef(showSettings)
  showSettingsRef.current = showSettings

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
    if (e.button !== 0 || showSettingsRef.current || !isTauri) return

    const startX = e.screenX
    const startY = e.screenY

    const { appWindow, LogicalPosition } = await import('@tauri-apps/api/window')
    const scaleFactor = await appWindow.scaleFactor()
    const physPos = await appWindow.outerPosition()
    const startWinX = physPos.x / scaleFactor
    const startWinY = physPos.y / scaleFactor

    let pending = false

    const onMouseMove = async (moveE: MouseEvent) => {
      if (pending) return
      pending = true
      const dx = moveE.screenX - startX
      const dy = moveE.screenY - startY
      await appWindow.setPosition(new LogicalPosition(startWinX + dx, startWinY + dy))
      pending = false
    }

    const onMouseUp = () => {
      window.removeEventListener('mousemove', onMouseMove)
      window.removeEventListener('mouseup', onMouseUp)
    }

    window.addEventListener('mousemove', onMouseMove)
    window.addEventListener('mouseup', onMouseUp)
  }, [])

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
