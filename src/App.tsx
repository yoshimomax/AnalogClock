import { useState, useEffect, useCallback, useRef } from 'react'
import { invoke } from '@tauri-apps/api/tauri'
import Clock from './components/Clock'
import { Settings as SettingsType, defaultSettings, loadSettings, saveSettings } from './utils/settings'

const isTauri = '__TAURI__' in window

const SETTINGS_W    = 310
const SETTINGS_H    = 560

function App() {
  const [settings, setSettings] = useState<SettingsType>(defaultSettings)
  const [hoverState, setHoverState] = useState<'none' | 'hover' | 'wake'>('none')

  const settingsRef     = useRef(settings)
  settingsRef.current   = settings
  const hoverStateRef   = useRef<'none' | 'hover' | 'wake'>('none')
  const isDraggingRef   = useRef(false)
  const settingsOpenRef = useRef(false)  // true while the settings window exists

  const [alarmActive, setAlarmActive]   = useState(false)
  const alarmTriggeredRef = useRef('')   // 'H:MM' of the last triggered alarm minute
  const alarmTimerRef     = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => { setSettings(loadSettings()) }, [])

  const updateSettings = useCallback((patch: Partial<SettingsType>) => {
    setSettings(prev => {
      const next = { ...prev, ...patch }
      saveSettings(next)
      if (isTauri) {
        import('@tauri-apps/api/event').then(({ emit }) => emit('settings-update', next))
      }
      return next
    })
  }, [])

  // Target time alarm: flash opacity for 60 s when clock reaches target hour:minute
  useEffect(() => {
    if (!settings.targetEnabled || !settings.targetAlarmEnabled) {
      setAlarmActive(false)
      return
    }
    const interval = setInterval(() => {
      const now = new Date()
      const h = now.getHours() % 12 || 12   // 1-12
      const m = now.getMinutes()
      const key = `${h}:${m}`
      if (h === settings.targetHour && m === settings.targetMinute) {
        if (alarmTriggeredRef.current !== key) {
          alarmTriggeredRef.current = key
          setAlarmActive(true)
          if (alarmTimerRef.current) clearTimeout(alarmTimerRef.current)
          alarmTimerRef.current = setTimeout(() => setAlarmActive(false), 60_000)
        }
      }
    }, 1000)
    return () => {
      clearInterval(interval)
      if (alarmTimerRef.current) clearTimeout(alarmTimerRef.current)
      setAlarmActive(false)
    }
  }, [settings.targetEnabled, settings.targetAlarmEnabled, settings.targetHour, settings.targetMinute])

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

  // Recover window to primary monitor top-right.
  // When onlyIfOffscreen=true (auto-detect), skip if the window center is already on any monitor.
  const recoverPosition = useCallback(async (onlyIfOffscreen = false) => {
    if (!isTauri) return
    try {
      const { appWindow, LogicalPosition, primaryMonitor, availableMonitors } = await import('@tauri-apps/api/window')
      const [primary, sc, pos] = await Promise.all([
        primaryMonitor(),
        appWindow.scaleFactor(),
        appWindow.outerPosition(),
      ])
      if (!primary) return

      if (onlyIfOffscreen) {
        const monitors = await availableMonitors()
        const s = settingsRef.current.size
        const cx = pos.x + (s * sc) / 2
        const cy = pos.y + (s * sc) / 2
        const visible = monitors.some(m =>
          cx >= m.position.x && cx < m.position.x + m.size.width &&
          cy >= m.position.y && cy < m.position.y + m.size.height
        )
        if (visible) return
      }

      const psc    = primary.scaleFactor
      const s      = settingsRef.current.size
      const margin = settingsRef.current.snapMargin
      await appWindow.show()
      await appWindow.setPosition(new LogicalPosition(
        primary.position.x / psc + primary.size.width  / psc - s - margin,
        primary.position.y / psc + margin,
      ))
    } catch { /* ignore */ }
  }, [])

  // Auto-recover when the window gains focus (e.g. after sleep/wake or monitor change)
  useEffect(() => {
    if (!isTauri) return
    let unlisten: (() => void) | null = null
    import('@tauri-apps/api/window').then(({ appWindow }) => {
      appWindow.listen('tauri://focus', () => recoverPosition(true))
        .then(fn => { unlisten = fn })
    })
    return () => { unlisten?.() }
  }, [recoverPosition])

  // Tray "位置を復元": always snap to primary top-right
  useEffect(() => {
    if (!isTauri) return
    let unlisten: (() => void) | null = null
    import('@tauri-apps/api/event').then(({ listen }) => {
      listen('tray-recover-position', () => recoverPosition(false))
        .then(fn => { unlisten = fn })
    })
    return () => { unlisten?.() }
  }, [recoverPosition])

  // On startup: position clock at top-right of primary monitor, then reveal it
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
      await appWindow.show()
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
      await Promise.all([existing.show(), existing.setFocus()])
      return
    }

    // Position to the left of the clock; clamp to monitor bounds (fetched in parallel)
    const [sc, pos, monitor] = await Promise.all([
      appWindow.scaleFactor(),
      appWindow.outerPosition(),
      currentMonitor(),
    ])
    let x = pos.x / sc - SETTINGS_W - 12
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
      visible: false,
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
          const inGear   = Math.hypot(cx - cCX, cy - gearCY) <= 28 * sc

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
  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    if (e.button !== 0 || !isTauri) return
    // Click-through mode: outside gear zone means clicks should fall through — don't start drag
    if (settingsRef.current.clickThrough && hoverStateRef.current !== 'wake') return
    const startX = e.screenX, startY = e.screenY
    const isGear = (e.target as Element).closest('.wake-gear') !== null

    let dragged = false, pending = false
    // Lazily fetched on first actual drag movement so we don't block listener registration
    let initWX = 0, initWY = 0
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let winRef: { appWindow: any; LogicalPosition: any } | null = null
    let posReady = false

    const onMove = async (ev: MouseEvent) => {
      const dx = ev.screenX - startX, dy = ev.screenY - startY
      if (!dragged && Math.hypot(dx, dy) > 4) {
        dragged = true
        isDraggingRef.current = true
        // Fetch window position lazily, at the moment dragging starts
        const { appWindow, LogicalPosition } = await import('@tauri-apps/api/window')
        const scale   = await appWindow.scaleFactor()
        const initPos = await appWindow.outerPosition()
        initWX = initPos.x / scale
        initWY = initPos.y / scale
        winRef = { appWindow, LogicalPosition }
        posReady = true
      }
      if (!dragged || pending || !posReady || !winRef) return
      pending = true
      const { appWindow, LogicalPosition } = winRef
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

    // Register listeners synchronously before any async work
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
        className={`app${alarmActive ? ' alarm-active' : ''}`}
        style={{ width: settings.size, height: settings.size, opacity: alarmActive ? undefined : clockOpacity }}
        onMouseDown={handleMouseDown}
        onDoubleClick={handleDoubleClick}
        onContextMenu={handleContextMenu}
      >
        <Clock
          size={settings.size}
          faceColor={settings.faceColor}
          showSeconds={settings.showSeconds}
          showDate={settings.showDate}
          showNumbers={settings.showNumbers}
          targetEnabled={settings.targetEnabled}
          targetHour={settings.targetHour}
          targetMinute={settings.targetMinute}
          targetColor={settings.targetColor}
          targetMode={settings.targetMode}
          targetOffsetMinutes={settings.targetOffsetMinutes}
        />
        {alarmActive && (
          <button
            className="alarm-stop-btn"
            onMouseDown={e => e.stopPropagation()}
            onClick={e => {
              e.stopPropagation()
              setAlarmActive(false)
              if (alarmTimerRef.current) { clearTimeout(alarmTimerRef.current); alarmTimerRef.current = null }
              updateSettings({ targetAlarmEnabled: false })
            }}
            title="アラームを止める"
          >Stop Alarm</button>
        )}
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
