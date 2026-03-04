import { useState, useEffect, useCallback, useRef } from 'react'
import { invoke } from '@tauri-apps/api/tauri'
import Clock from './components/Clock'
import Settings from './components/Settings'
import { Settings as SettingsType, defaultSettings, loadSettings, saveSettings } from './utils/settings'

const isTauri = '__TAURI__' in window

// How long (ms) to hold before drag starts instead of a regular click
const LONG_PRESS_MS = 400
// Distance (logical px) from screen edge to trigger auto corner-snap
const CORNER_SNAP_PX = 80
// Settings window size
const SETTINGS_W = 310
const SETTINGS_H = 490

function App() {
  const [settings, setSettings] = useState<SettingsType>(defaultSettings)
  const [showSettings, setShowSettings] = useState(false)

  // Refs so event callbacks always see latest values without re-subscription
  const showSettingsRef = useRef(showSettings)
  showSettingsRef.current = showSettings
  const settingsRef = useRef(settings)
  settingsRef.current = settings

  useEffect(() => { loadSettings().then(setSettings) }, [])

  const updateSettings = useCallback((patch: Partial<SettingsType>) => {
    setSettings(prev => {
      const updated = { ...prev, ...patch }
      saveSettings(updated)
      return updated
    })
  }, [])

  // --- Window property sync ---
  useEffect(() => {
    if (!isTauri) return
    import('@tauri-apps/api/window').then(({ appWindow }) => {
      appWindow.setAlwaysOnTop(settings.alwaysOnTop)
    })
  }, [settings.alwaysOnTop])

  // Resize window to fit clock whenever size changes (skip while settings is open)
  useEffect(() => {
    if (!isTauri || showSettings) return
    const s = settings.size + 50
    import('@tauri-apps/api/window').then(({ appWindow, LogicalSize }) => {
      appWindow.setSize(new LogicalSize(s, s))
    })
  }, [settings.size, showSettings])

  // --- Click-through mode ---
  // When enabled, cursor events are ignored (OS-level passthrough).
  // A polling loop watches the cursor position; when it enters the gear-button
  // zone (bottom-right 64×64 px of the window), interaction is briefly restored
  // so the user can double-click or right-click to open settings.
  useEffect(() => {
    if (!isTauri) return

    let active = true
    let interactive = true          // current state
    let inactiveTimer: number | null = null

    const setPassthrough = async (pass: boolean) => {
      try {
        const { appWindow } = await import('@tauri-apps/api/window')
        await appWindow.setIgnoreCursorEvents(pass)
        interactive = !pass
      } catch { /* ignore */ }
    }

    const poll = async () => {
      while (active) {
        await new Promise(r => setTimeout(r, 150))
        if (!active) break

        // Always keep interactive while settings panel is open
        if (showSettingsRef.current) {
          if (!interactive) await setPassthrough(false)
          continue
        }

        if (!settingsRef.current.clickThrough) {
          if (!interactive) await setPassthrough(false)
          continue
        }

        try {
          const { appWindow } = await import('@tauri-apps/api/window')
          const [cx, cy] = await invoke<[number, number]>('get_cursor_pos')
          const pos = await appWindow.outerPosition()
          const size = await appWindow.outerSize()
          const scale = await appWindow.scaleFactor()

          // Gear-button zone: bottom-right 64×64 px (logical) of the window
          const zoneSize = 64 * scale
          const inZone = cx >= pos.x + size.width - zoneSize
            && cy >= pos.y + size.height - zoneSize
            && cx <= pos.x + size.width
            && cy <= pos.y + size.height

          if (inZone && !interactive) {
            if (inactiveTimer) { clearTimeout(inactiveTimer); inactiveTimer = null }
            await setPassthrough(false)
          } else if (!inZone && interactive) {
            if (!inactiveTimer) {
              inactiveTimer = window.setTimeout(async () => {
                inactiveTimer = null
                if (settingsRef.current.clickThrough && !showSettingsRef.current) {
                  await setPassthrough(true)
                }
              }, 1500)
            }
          }
        } catch { /* ignore */ }
      }
    }

    // Kick off: start passthrough if enabled, then begin polling
    const start = async () => {
      if (settingsRef.current.clickThrough) await setPassthrough(true)
      poll()
    }
    start()

    return () => {
      active = false
      if (inactiveTimer) clearTimeout(inactiveTimer)
      // Ensure passthrough is off when effect unmounts
      import('@tauri-apps/api/window').then(({ appWindow }) => {
        appWindow.setIgnoreCursorEvents(false)
      }).catch(() => {})
    }
  }, [settings.clickThrough])

  // --- Auto corner-snap ---
  const trySnapCorner = useCallback(async () => {
    if (!isTauri) return
    const { appWindow, LogicalPosition, currentMonitor } = await import('@tauri-apps/api/window')
    const monitor = await currentMonitor()
    if (!monitor) return
    const sc = monitor.scaleFactor
    const mX = monitor.position.x / sc, mY = monitor.position.y / sc
    const mW = monitor.size.width / sc, mH = monitor.size.height / sc
    const winSize = await appWindow.outerSize()
    const wW = winSize.width / sc, wH = winSize.height / sc
    const pos = await appWindow.outerPosition()
    const wx = pos.x / sc, wy = pos.y / sc
    const nearL = wx - mX < CORNER_SNAP_PX
    const nearR = mX + mW - wx - wW < CORNER_SNAP_PX
    const nearT = wy - mY < CORNER_SNAP_PX
    const nearB = mY + mH - wy - wH < CORNER_SNAP_PX
    if ((nearL || nearR) && (nearT || nearB)) {
      await appWindow.setPosition(new LogicalPosition(
        nearL ? mX : mX + mW - wW,
        nearT ? mY : mY + mH - wH,
      ))
    }
  }, [])

  // --- Drag: long-press (400 ms hold) to start ---
  const handleMouseDown = useCallback(async (e: React.MouseEvent) => {
    if (e.button !== 0 || showSettingsRef.current || !isTauri) return

    const startX = e.screenX, startY = e.screenY
    let dragging = false, pending = false

    const { appWindow, LogicalPosition } = await import('@tauri-apps/api/window')
    const scale = await appWindow.scaleFactor()
    const initPos = await appWindow.outerPosition()
    const initWX = initPos.x / scale, initWY = initPos.y / scale

    const startDrag = () => {
      dragging = true
      const onMove = async (ev: MouseEvent) => {
        if (pending) return
        pending = true
        await appWindow.setPosition(new LogicalPosition(
          initWX + ev.screenX - startX,
          initWY + ev.screenY - startY,
        ))
        pending = false
      }
      const onUp = () => {
        window.removeEventListener('mousemove', onMove)
        window.removeEventListener('mouseup', onUp)
        trySnapCorner()
      }
      window.addEventListener('mousemove', onMove)
      window.addEventListener('mouseup', onUp)
    }

    const timer = window.setTimeout(startDrag, LONG_PRESS_MS)
    const onUp = () => {
      window.removeEventListener('mouseup', onUp)
      if (!dragging) clearTimeout(timer)
    }
    window.addEventListener('mouseup', onUp)
  }, [trySnapCorner])

  // --- Open / close settings (resize window) ---
  const openSettings = useCallback(async () => {
    if (isTauri) {
      const { appWindow, LogicalSize } = await import('@tauri-apps/api/window')
      await appWindow.setIgnoreCursorEvents(false)       // disable passthrough
      await appWindow.setSize(new LogicalSize(SETTINGS_W, SETTINGS_H))
    }
    setShowSettings(true)
  }, [])

  const closeSettings = useCallback(async () => {
    setShowSettings(false)
    if (isTauri) {
      const s = settingsRef.current.size + 50
      const { appWindow, LogicalSize } = await import('@tauri-apps/api/window')
      await appWindow.setSize(new LogicalSize(s, s))
    }
  }, [])

  const handleDoubleClick = useCallback((e: React.MouseEvent) => {
    e.stopPropagation()
    openSettings()
  }, [openSettings])

  const handleContextMenu = useCallback((e: React.MouseEvent) => {
    e.preventDefault()
    openSettings()
  }, [openSettings])

  const handleQuit = useCallback(async () => {
    if (isTauri) {
      const { appWindow } = await import('@tauri-apps/api/window')
      appWindow.close()
    }
  }, [])

  return (
    <>
      {/* Clock rendered at configured opacity; settings overlay is outside this div
          so it's always fully opaque regardless of the clock opacity setting. */}
      <div
        className="app"
        style={{ opacity: settings.opacity }}
        onMouseDown={handleMouseDown}
        onDoubleClick={handleDoubleClick}
        onContextMenu={handleContextMenu}
      >
        <Clock
          size={settings.size}
          faceColor={settings.faceColor}
          showSeconds={settings.showSeconds}
          targetEnabled={settings.targetEnabled}
          targetHour={settings.targetHour}
          targetMinute={settings.targetMinute}
        />
      </div>

      {/* Gear button: always full-opacity, fixed to bottom-right corner.
          In click-through mode this corner acts as the "wake zone" —
          hovering here temporarily restores mouse interaction. */}
      {!showSettings && (
        <button
          className="gear-btn"
          onClick={openSettings}
          title="Settings (or double-click / right-click the clock)"
        >
          ⚙
        </button>
      )}

      {showSettings && (
        <Settings
          settings={settings}
          onUpdate={updateSettings}
          onClose={closeSettings}
          onQuit={handleQuit}
        />
      )}
    </>
  )
}

export default App
