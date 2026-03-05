import { useState, useEffect, useCallback, useRef } from 'react'
import { invoke } from '@tauri-apps/api/tauri'
import Clock from './components/Clock'
import Settings from './components/Settings'
import { Settings as SettingsType, defaultSettings, loadSettings, saveSettings } from './utils/settings'

const isTauri = '__TAURI__' in window

const LONG_PRESS_MS = 400
const SETTINGS_W    = 310
const SETTINGS_H    = 522
const SETTINGS_GAP  = 12   // transparent gap between clock and settings panel
const POS_KEY = 'clock-window-position'

function App() {
  const [settings, setSettings] = useState<SettingsType>(defaultSettings)
  const [showSettings, setShowSettings] = useState(false)
  // Single state avoids the two-render gap that caused the opacity flicker
  const [hoverState, setHoverState] = useState<'none' | 'hover' | 'wake'>('none')

  const showSettingsRef = useRef(showSettings)
  showSettingsRef.current = showSettings
  const settingsRef = useRef(settings)
  settingsRef.current = settings
  const hoverStateRef = useRef<'none' | 'hover' | 'wake'>('none')
  const isDraggingRef = useRef(false)

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

  // Resize window whenever clock size or settings-open state changes
  useEffect(() => {
    if (!isTauri) return
    const s = settings.size
    const w = showSettings ? s + SETTINGS_GAP + SETTINGS_W : s
    const h = showSettings ? Math.max(s, SETTINGS_H) : s
    import('@tauri-apps/api/window').then(({ appWindow, LogicalSize }) => {
      appWindow.setSize(new LogicalSize(w, h))
    })
  }, [settings.size, showSettings])

  const openSettings = useCallback(async () => {
    if (isTauri) {
      const { appWindow, LogicalSize, LogicalPosition, currentMonitor } = await import('@tauri-apps/api/window')
      await appWindow.setIgnoreCursorEvents(false)

      const sc      = await appWindow.scaleFactor()
      const pos     = await appWindow.outerPosition()
      const monitor = await currentMonitor()
      const s       = settingsRef.current.size
      const totalW  = s + SETTINGS_GAP + SETTINGS_W
      const totalH  = Math.max(s, SETTINGS_H)

      // Keep clock in place; slide left only if right edge would go off-screen
      let wx = pos.x / sc
      let wy = pos.y / sc
      if (monitor) {
        const mX = monitor.position.x / sc
        const mY = monitor.position.y / sc
        const mW = monitor.size.width  / sc
        const mH = monitor.size.height / sc
        wx = Math.min(wx, mX + mW - totalW)
        wx = Math.max(wx, mX)
        wy = Math.min(wy, mY + mH - totalH)
        wy = Math.max(wy, mY)
        await appWindow.setPosition(new LogicalPosition(wx, wy))
      }
      await appWindow.setSize(new LogicalSize(totalW, totalH))
    }
    setShowSettings(true)
  }, [])

  // Open settings when triggered from the system tray menu
  useEffect(() => {
    if (!isTauri) return
    let unlisten: (() => void) | null = null
    import('@tauri-apps/api/event').then(({ listen }) => {
      listen('tray-open-settings', () => { openSettings() }).then(fn => { unlisten = fn })
    })
    return () => { unlisten?.() }
  }, [openSettings])

  // Click-through mode with cursor polling.
  // When enabled:
  //   - setIgnoreCursorEvents(true) → OS-level passthrough
  //   - cursor over clock face      → clock fades to nearly invisible
  //   - cursor over wake-gear icon  → interaction restored so user can open settings
  useEffect(() => {
    if (!isTauri) return

    if (!settings.clickThrough) {
      import('@tauri-apps/api/window').then(({ appWindow }) => {
        appWindow.setIgnoreCursorEvents(false)
      })
      if (hoverStateRef.current !== 'none') { hoverStateRef.current = 'none'; setHoverState('none') }
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
          if (hoverStateRef.current !== 'none') { hoverStateRef.current = 'none'; setHoverState('none') }
          continue
        }

        try {
          const { appWindow } = await import('@tauri-apps/api/window')
          const [cx, cy] = await invoke<[number, number]>('get_cursor_pos')
          const pos = await appWindow.outerPosition()
          const sc  = await appWindow.scaleFactor()

          // Clock geometry in physical pixels
          const clockPx = settingsRef.current.size * sc
          const cCX     = pos.x + clockPx * 0.5
          const cCY     = pos.y + clockPx * 0.5
          const clockR  = clockPx * 0.45

          // Hovering: cursor within (or just outside) the clock face circle
          const inWindow = Math.hypot(cx - cCX, cy - cCY) <= clockR + 5 * sc

          // Wake-gear zone: 20 logical px radius circle at 6-o'clock inner position
          const gearCY = pos.y + clockPx * 0.79
          const inGear  = Math.hypot(cx - cCX, cy - gearCY) <= 20 * sc

          // Single setState to avoid two-render flicker during transition
          const next = inGear ? 'wake' : inWindow ? 'hover' : 'none'
          if (next !== hoverStateRef.current) {
            hoverStateRef.current = next
            setHoverState(next)
          }

          if (inGear) {
            // Wake zone: always cancel pending passthrough timer and go interactive
            if (inactiveTimer) { clearTimeout(inactiveTimer); inactiveTimer = null }
            if (!interactive) await setPassthrough(false)
          } else if (interactive && !showSettingsRef.current && !isDraggingRef.current) {
            // Outside wake zone: schedule passthrough after inactivity
            if (!inactiveTimer) {
              inactiveTimer = window.setTimeout(async () => {
                inactiveTimer = null
                if (!showSettingsRef.current && !isDraggingRef.current) await setPassthrough(true)
              }, 1500)
            }
          } else if (isDraggingRef.current) {
            // Dragging: keep interactive, cancel any pending passthrough timer
            if (inactiveTimer) { clearTimeout(inactiveTimer); inactiveTimer = null }
          }
        } catch { /* ignore */ }
      }
    }

    poll()

    return () => {
      active = false
      if (inactiveTimer) clearTimeout(inactiveTimer)
      hoverStateRef.current = 'none'
      setHoverState('none')
      import('@tauri-apps/api/window').then(({ appWindow }) => {
        appWindow.setIgnoreCursorEvents(false)
      }).catch(() => {})
    }
  }, [settings.clickThrough])

  // Long-press (400 ms) to start drag
  const handleMouseDown = useCallback(async (e: React.MouseEvent) => {
    if (e.button !== 0 || showSettingsRef.current || !isTauri) return
    const startX = e.screenX, startY = e.screenY

    // Guard against early mouse release during async setup
    let released = false
    const earlyUp = () => { released = true }
    window.addEventListener('mouseup', earlyUp, { once: true })

    const { appWindow, LogicalPosition } = await import('@tauri-apps/api/window')
    const scale = await appWindow.scaleFactor()
    const initPos = await appWindow.outerPosition()
    const initWX = initPos.x / scale, initWY = initPos.y / scale

    if (released) return  // button was released before async setup finished

    let dragging = false, pending = false

    const startDrag = () => {
      dragging = true
      isDraggingRef.current = true
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
        isDraggingRef.current = false
        window.removeEventListener('mousemove', onMove)
        window.removeEventListener('mouseup', onUp)
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
  }, [])

  const closeSettings = useCallback(async () => {
    setShowSettings(false)
    // Window resize is handled by the size/showSettings effect above
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

  // Click-through opacity (single-state, no intermediate render):
  //   wake gear zone                 → 1      (fully opaque)
  //   hovering over clock face       → 0.06   (nearly invisible)
  //   not hovering                   → settings.opacity
  const clockOpacity = settings.clickThrough
    ? hoverState === 'wake' ? 1 : hoverState === 'hover' ? 0.06 : settings.opacity
    : settings.opacity

  return (
    <div style={{ display: 'flex', alignItems: 'center', height: '100%' }}>
      <div
        className="app"
        style={{ width: settings.size, height: settings.size, opacity: clockOpacity }}
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
        {/* Wake-gear: visual marker + click target for the wake zone */}
        <div
          className="wake-gear"
          onClick={openSettings}
          onMouseDown={e => e.stopPropagation()}
          onDoubleClick={e => e.stopPropagation()}
          onContextMenu={e => e.stopPropagation()}
          title="Open Settings"
        >⚙</div>
      </div>

      {showSettings && (
        <div style={{ marginLeft: SETTINGS_GAP, alignSelf: 'center' }}>
          <Settings
            settings={settings}
            onUpdate={updateSettings}
            onClose={closeSettings}
            onQuit={handleQuit}
          />
        </div>
      )}
    </div>
  )
}

export default App
