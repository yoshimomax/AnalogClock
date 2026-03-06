import { useState, useEffect, useCallback, useRef } from 'react'
import { invoke } from '@tauri-apps/api/tauri'
import Clock from './components/Clock'
import { Settings as SettingsType, defaultSettings, loadSettings } from './utils/settings'

const isTauri = '__TAURI__' in window

const SETTINGS_W    = 310
const SETTINGS_H    = 522

function App() {
  const [settings, setSettings] = useState<SettingsType>(defaultSettings)
  const [hoverState, setHoverState] = useState<'none' | 'hover' | 'wake'>('none')

  const settingsRef     = useRef(settings)
  settingsRef.current   = settings
  const hoverStateRef   = useRef<'none' | 'hover' | 'wake'>('none')
  const isDraggingRef   = useRef(false)
  const settingsOpenRef = useRef(false)  // true while the settings window exists

  useEffect(() => { loadSettings().then(setSettings) }, [])

  // Receive live settings updates from the settings window
  useEffect(() => {
    if (!isTauri) return
    let unlisten: (() => void) | null = null
    import('@tauri-apps/api/event').then(({ listen }) => {
      listen<SettingsType>('settings-update', e => setSettings(e.payload))
        .then(fn => { unlisten = fn })
    })
    return () => { unlisten?.() }
  }, [])

  // Snap the clock to a corner when the settings window requests it
  useEffect(() => {
    if (!isTauri) return
    let unlisten: (() => void) | null = null
    import('@tauri-apps/api/event').then(({ listen }) => {
      listen<{ corner: string; margin: number }>('snap-to-corner', async e => {
        const { corner, margin } = e.payload
        const { appWindow, LogicalPosition, currentMonitor } = await import('@tauri-apps/api/window')
        const monitor = await currentMonitor()
        if (!monitor) return
        const sc = monitor.scaleFactor
        const mX = monitor.position.x / sc, mY = monitor.position.y / sc
        const mW = monitor.size.width  / sc, mH = monitor.size.height / sc
        const s  = settingsRef.current.size
        const x  = (corner === 'tr' || corner === 'br') ? mX + mW - s - margin : mX + margin
        const y  = (corner === 'bl' || corner === 'br') ? mY + mH - s - margin : mY + margin
        await appWindow.setPosition(new LogicalPosition(x, y))
      }).then(fn => { unlisten = fn })
    })
    return () => { unlisten?.() }
  }, [])

  // On startup: always place clock at top-right of primary monitor
  useEffect(() => {
    if (!isTauri) return
    import('@tauri-apps/api/window').then(async ({ appWindow, LogicalPosition, primaryMonitor }) => {
      const monitor = await primaryMonitor()
      if (!monitor) return
      const sc     = monitor.scaleFactor
      const mX     = monitor.position.x / sc
      const mY     = monitor.position.y / sc
      const mW     = monitor.size.width  / sc
      const s      = settingsRef.current.size
      const margin = settingsRef.current.snapMargin
      await appWindow.setPosition(new LogicalPosition(mX + mW - s - margin, mY + margin))
    })
  }, [])

  // Sync alwaysOnTop
  useEffect(() => {
    if (!isTauri) return
    import('@tauri-apps/api/window').then(({ appWindow }) => {
      appWindow.setAlwaysOnTop(settings.alwaysOnTop)
    })
  }, [settings.alwaysOnTop])

  // Resize clock window when size changes
  useEffect(() => {
    if (!isTauri) return
    const s = settings.size
    import('@tauri-apps/api/window').then(({ appWindow, LogicalSize }) => {
      appWindow.setSize(new LogicalSize(s, s))
    })
  }, [settings.size])

  // Open settings as an independent OS window positioned beside the clock
  const openSettings = useCallback(async () => {
    if (!isTauri) return
    const { WebviewWindow, appWindow, currentMonitor } = await import('@tauri-apps/api/window')

    // If the settings window is already open, just focus it
    const existing = WebviewWindow.getByLabel('settings-panel')
    if (existing) {
      await existing.show()
      await existing.setFocus()
      return
    }

    // Position to the right of the clock; clamp to monitor bounds
    const sc      = await appWindow.scaleFactor()
    const pos     = await appWindow.outerPosition()
    const monitor = await currentMonitor()
    const s       = settingsRef.current.size
    let x = pos.x / sc + s + 12
    let y = pos.y / sc
    if (monitor) {
      const mX = monitor.position.x / sc, mY = monitor.position.y / sc
      const mW = monitor.size.width  / sc, mH = monitor.size.height / sc
      x = Math.min(x, mX + mW - SETTINGS_W)
      x = Math.max(x, mX)
      y = Math.min(y, mY + mH - SETTINGS_H)
      y = Math.max(y, mY)
    }

    const url = window.location.href.split('?')[0] + '?view=settings'
    const win = new WebviewWindow('settings-panel', {
      url,
      title: 'Clock Settings',
      width: SETTINGS_W,
      height: SETTINGS_H,
      resizable: false,
      decorations: true,
      transparent: false,
      alwaysOnTop: true,
      x,
      y,
    })
    settingsOpenRef.current = true
    win.listen('tauri://destroyed', () => {
      settingsOpenRef.current = false
    }).catch(() => {})
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

  // Click-through mode with cursor polling
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

        if (settingsOpenRef.current) {
          if (!interactive) await setPassthrough(false)
          if (hoverStateRef.current !== 'none') { hoverStateRef.current = 'none'; setHoverState('none') }
          continue
        }

        try {
          const { appWindow } = await import('@tauri-apps/api/window')
          const [cx, cy] = await invoke<[number, number]>('get_cursor_pos')
          const pos = await appWindow.outerPosition()
          const sc  = await appWindow.scaleFactor()

          const clockPx = settingsRef.current.size * sc
          const cCX     = pos.x + clockPx * 0.5
          const cCY     = pos.y + clockPx * 0.5
          const clockR  = clockPx * 0.45

          const inWindow = Math.hypot(cx - cCX, cy - cCY) <= clockR + 5 * sc
          const gearCY   = pos.y + clockPx * 0.645
          const inGear   = Math.hypot(cx - cCX, cy - gearCY) <= 20 * sc

          const next = inGear ? 'wake' : inWindow ? 'hover' : 'none'
          if (next !== hoverStateRef.current) {
            hoverStateRef.current = next
            setHoverState(next)
          }

          if (inGear) {
            if (inactiveTimer) { clearTimeout(inactiveTimer); inactiveTimer = null }
            if (!interactive) await setPassthrough(false)
          } else if (interactive && !settingsOpenRef.current && !isDraggingRef.current) {
            if (!inactiveTimer) {
              inactiveTimer = window.setTimeout(async () => {
                inactiveTimer = null
                if (!settingsOpenRef.current && !isDraggingRef.current) await setPassthrough(true)
              }, 1500)
            }
          } else if (isDraggingRef.current) {
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

  // Immediate drag: click+drag anywhere on clock face moves the window.
  // If mouse is released without dragging and the click was on the gear icon, open settings.
  // In click-through mode, dragging is only allowed from the gear zone (hoverState === 'wake').
  const handleMouseDown = useCallback(async (e: React.MouseEvent) => {
    if (e.button !== 0 || !isTauri) return
    // Click-through mode: outside gear zone means clicks should fall through — don't start drag
    if (settingsRef.current.clickThrough && hoverStateRef.current !== 'wake') return
    const startX = e.screenX, startY = e.screenY
    const isGear = (e.target as Element).closest('.wake-gear') !== null

    const { appWindow, LogicalPosition } = await import('@tauri-apps/api/window')
    const scale   = await appWindow.scaleFactor()
    const initPos = await appWindow.outerPosition()
    const initWX  = initPos.x / scale, initWY = initPos.y / scale

    let dragged = false, pending = false

    const onMove = async (ev: MouseEvent) => {
      const dx = ev.screenX - startX, dy = ev.screenY - startY
      if (!dragged && Math.hypot(dx, dy) > 4) {
        dragged = true
        isDraggingRef.current = true
      }
      if (!dragged || pending) return
      pending = true
      await appWindow.setPosition(new LogicalPosition(initWX + dx, initWY + dy))
      pending = false
    }

    const onUp = () => {
      isDraggingRef.current = false
      window.removeEventListener('mousemove', onMove)
      window.removeEventListener('mouseup', onUp)
      // Treat as click if didn't drag: gear → open settings
      if (!dragged && isGear) openSettings()
    }

    window.addEventListener('mousemove', onMove)
    window.addEventListener('mouseup', onUp)
  }, [openSettings])

  const handleDoubleClick = useCallback((e: React.MouseEvent) => {
    e.stopPropagation()
    openSettings()
  }, [openSettings])

  const handleContextMenu = useCallback((e: React.MouseEvent) => {
    e.preventDefault()
    openSettings()
  }, [openSettings])

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
          showDate={settings.showDate}
          targetEnabled={settings.targetEnabled}
          targetHour={settings.targetHour}
          targetMinute={settings.targetMinute}
        />
        <div
          className="wake-gear"
          onDoubleClick={e => e.stopPropagation()}
          onContextMenu={e => e.stopPropagation()}
          title="設定を開く / Open Settings"
        >⚙</div>
      </div>
    </div>
  )
}

export default App
