import { useState, useEffect, useCallback } from 'react'
import { invoke } from '@tauri-apps/api/tauri'
import Settings from './components/Settings'
import { Settings as SettingsType, defaultSettings, loadSettings, saveSettings } from './utils/settings'

const isTauri = '__TAURI__' in window

export default function SettingsApp() {
  const [settings, setSettings] = useState<SettingsType>(defaultSettings)

  useEffect(() => { loadSettings().then(setSettings) }, [])

  const updateSettings = useCallback((patch: Partial<SettingsType>) => {
    setSettings(prev => {
      const updated = { ...prev, ...patch }
      saveSettings(updated)
      // Notify the clock window in real time
      if (isTauri) {
        import('@tauri-apps/api/event').then(({ emit }) => {
          emit('settings-update', updated)
        })
      }
      return updated
    })
  }, [])

  const closeSettings = useCallback(async () => {
    if (isTauri) {
      const { appWindow } = await import('@tauri-apps/api/window')
      await appWindow.close()
    }
  }, [])

  const handleQuit = useCallback(async () => {
    if (isTauri) await invoke('quit_app')
  }, [])

  return (
    <div className="settings-standalone">
      <Settings
        settings={settings}
        onUpdate={updateSettings}
        onClose={closeSettings}
        onQuit={handleQuit}
      />
    </div>
  )
}
