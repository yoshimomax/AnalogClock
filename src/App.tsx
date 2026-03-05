import { useState, useEffect, useCallback, useRef } from 'react'
import { invoke } from '@tauri-apps/api/tauri'
import Clock from './components/Clock'
import Settings from './components/Settings'
import { Settings as SettingsType, defaultSettings, loadSettings, saveSettings } from './utils/settings'

const isTauri = '__TAURI__' in window

const LONG_PRESS_MS = 400
const CORNER_SNAP_PX = 80
const SETTINGS_W = 310
const SETTINGS_H = 490
const POS_KEY = 'clock-window-position'

function App() {
  const [settings, setSettings] = useState<SettingsType>(defaultSettings)
  const [showSettings, setShowSettings] = useState(false)
  const [hovering, setHovering] = useState(false)
  const [inWakeZone, setInWakeZone] = useState(false)

  const showSettingsRef = useRef(showSettings)
  showSettingsRef.current = showSettings
  const settingsRef = useRef(settings)
  settingsRef.current = settings
  const hoveringRef = useRef(false)
  const inWakeZoneRef = useRef(false)

  useEffect(() => { loadSettings().then(setSettings) }, [])

  // Restore last window position on startup
  useEffect(() => {
    if (!isTauri) return
    const saved = localStorage.getItem(POS_KEY)
    if (!saved) return
    try {
      const { x, y } = JSON.parse(saved)
      import('@tauri-apps/api/window').then(({ appWindow, LogicalPosition }) => {
        appWindow.setPosition(new LogicalPosition(x, y))
      })
    } catch { /* ignore malformed data */ }
  }, [])

  // Save window position whenever it moves (debounced)
  useEffect(() => {
    if (!isTauri) return
    let unlisten: (() => void) | null = null
    let timer: number | null = null

    import('@tauri-apps/api/window').then(async ({ appWindow }) => {
      unlisten = await appWindow.listen('tauri://move', async () => {
        if (timer) clearTimeout(timer)
        timer = window.setTimeout(async () => {
          const pos = await appWindow.outerPosition()
          const sc = await appWindow.scaleFactor()
          localStorage.setItem(POS_KEY, JSON.stringify({ x: pos.x / sc, y: pos.y / sc }))
        }, 500)
      })
    })

    return () => {
      if (unlisten) unlisten()
      if (timer) clearTimeout(timer)
    }
  }, [])

  const updateSettings = useCallback((patch: Partial<SettingsType>) => {
    setSettings(prev => {
      const updated = { ...prev, ...patch }
      saveSettings(updated)
      return updated
    })
  }, [])

  // Sync alwaysOnTop
  useEffect(() => {
    if (!isTauri) return
    import('@tauri-apps/api/window').then(({ appWindow }) => {
      appWindow.setAlwaysOnTop(settings.alwaysOnTop)
    })
  }, [settings.alwaysOnTop])

  // Resize window when clock size changes (skip while settings panel is open)
  useEffect(() => {
    if (!isTauri || showSettings) return
    const s = settings.size + 50
    import('@tauri-apps/api/window').then(({ appWindow, LogicalSize }) => {
      appWindow.setSize(new LogicalSize(s, s))
    })
  }, [settings.size, showSettings])

  // Click-through mode with cursor polling.
  // When enabled:
  //   - setIgnoreCursorEvents(true) → OS-level passthrough
  //   - cursor over window         → clock fades to nearly invisible
  //   - cursor in bottom-right zone (gear area) → interaction briefly restored
  useEffect(() => {
    if (!isTauri) return

    if (!settings.clickThrough) {
      // Ensure passthrough is off when feature is disabled
      import('@tauri-apps/api/window').then(({ appWindow }) => {
        appWindow.setIgnoreCursorEvents(false)
      })
      if (hoveringRef.current) { hoveringRef.current = false; setHovering(false) }
      return
    }

    let active = true
    let interactive = true
    let inactiveTimer: number | null = null

    const setPassthrough = async (pass: boolean) => {
      try {
        const { appWindow } = await import('@tauri-apps/api/window')
        await appWindow.setIgnoreCursorEvents(pass)
        interactive = !pass
      } catch { /* ignore */ }
    }

    const poll = async () => {
      await setPassthrough(true)

      while (active) {
        await new Promise(r => setTimeout(r, 150))
        if (!active) break

        // Settings open → keep interactive, no hover fade
        if (showSettingsRef.current) {
          if (!interactive) await setPassthrough(false)
          if (hoveringRef.current) { hoveringRef.current = false; setHovering(false) }
          continue
        }

        try {
          const { appWindow } = await import('@tauri-apps/api/window')
          const [cx, cy] = await invoke<[number, number]>('get_cursor_pos')
          const pos = await appWindow.outerPosition()
          const sz  = await appWindow.outerSize()
          const sc  = await appWindow.scaleFactor()

          // Is cursor inside the window bounds?
          const inWindow = cx >= pos.x && cy >= pos.y
            && cx <= pos.x + sz.width && cy <= pos.y + sz.height

          // Bottom-right 64 px zone: wake up interaction so user can
          // double-click / right-click to open settings
          const zone = 64 * sc
          const inGear = inWindow
            && cx >= pos.x + sz.width - zone
            && cy >= pos.y + sz.height - zone

          // hovering (fade): in window but outside wake zone → 0.06
          const shouldFade = inWindow && !inGear
          if (shouldFade !== hoveringRef.current) {
            hoveringRef.current = shouldFade
            setHovering(shouldFade)
          }
          // inWakeZone: fully transparent (opacity 0)
          if (inGear !== inWakeZoneRef.current) {
            inWakeZoneRef.current = inGear
            setInWakeZone(inGear)
          }

          if (inGear && !interactive) {
            if (inactiveTimer) { clearTimeout(inactiveTimer); inactiveTimer = null }
            await setPassthrough(false)
          } else if (!inGear && interactive && !showSettingsRef.current) {
            if (!inactiveTimer) {
              inactiveTimer = window.setTimeout(async () => {
                inactiveTimer = null
                if (!showSettingsRef.current) await setPassthrough(true)
              }, 1500)
            }
          }
        } catch { /* ignore */ }
      }
    }

    poll()

    return () => {
      active = false
      if (inactiveTimer) clearTimeout(inactiveTimer)
      hoveringRef.current = false
      setHovering(false)
      inWakeZoneRef.current = false
      setInWakeZone(false)
      import('@tauri-apps/api/window').then(({ appWindow }) => {
        appWindow.setIgnoreCursorEvents(false)
      }).catch(() => {})
    }
  }, [settings.clickThrough])

  // Auto corner-snap
  const trySnapCorner = useCallback(async () => {
    if (!isTauri) return
    const { appWindow, LogicalPosition, currentMonitor } = await import('@tauri-apps/api/window')
    const monitor = await currentMonitor()
    if (!monitor) return
    const sc = monitor.scaleFactor
    const mX = monitor.position.x / sc, mY = monitor.position.y / sc
    const mW = monitor.size.width / sc,  mH = monitor.size.height / sc
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

  // Long-press (400 ms) to start drag
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

  const openSettings = useCallback(async () => {
    if (isTauri) {
      const { appWindow, LogicalSize, LogicalPosition, currentMonitor } = await import('@tauri-apps/api/window')
      await appWindow.setIgnoreCursorEvents(false)

      // Compute a position that keeps the settings window fully on-screen
      const monitor = await currentMonitor()
      const sc = await appWindow.scaleFactor()
      const pos = await appWindow.outerPosition()
      let wx = pos.x / sc
      let wy = pos.y / sc

      if (monitor) {
        const mX = monitor.position.x / sc
        const mY = monitor.position.y / sc
        const mW = monitor.size.width / sc
        const mH = monitor.size.height / sc
        wx = Math.min(wx, mX + mW - SETTINGS_W)
        wy = Math.min(wy, mY + mH - SETTINGS_H)
        wx = Math.max(wx, mX)
        wy = Math.max(wy, mY)
        await appWindow.setPosition(new LogicalPosition(wx, wy))
      }

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

  // Click-through opacity:
  //   wake zone (bottom-right corner) → 0      (fully invisible)
  //   hovering elsewhere over window  → 0.06   (nearly invisible)
  //   not hovering                    → settings.opacity
  const clockOpacity = settings.clickThrough
    ? inWakeZone ? 1 : hovering ? 0.06 : settings.opacity
    : settings.opacity

  return (
    <>
      <div
        className="app"
        style={{ opacity: clockOpacity }}
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
