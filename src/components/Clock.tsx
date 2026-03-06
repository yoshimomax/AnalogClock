import { useState, useEffect, useMemo } from 'react'

interface ClockProps {
  size: number
  faceColor: string
  showSeconds: boolean
  showDate: boolean
  showNumbers: boolean
  targetEnabled: boolean
  targetHour: number
  targetMinute: number
  targetColor: string
  targetMode?: 'absolute' | 'offset'
  targetOffsetMinutes?: number
}

function getLuminance(hex: string): number {
  const r = parseInt(hex.slice(1, 3), 16)
  const g = parseInt(hex.slice(3, 5), 16)
  const b = parseInt(hex.slice(5, 7), 16)
  return (0.299 * r + 0.587 * g + 0.114 * b) / 255
}

export default function Clock({
  size,
  faceColor,
  showSeconds,
  showDate,
  showNumbers,
  targetEnabled,
  targetHour,
  targetMinute,
  targetColor,
  targetMode = 'absolute',
  targetOffsetMinutes = 30,
}: ClockProps) {
  const [time, setTime] = useState(new Date())

  useEffect(() => {
    const timer = setInterval(() => setTime(new Date()), 1000)
    return () => clearInterval(timer)
  }, [])

  const isDark = getLuminance(faceColor) < 0.5
  const textColor = isDark ? '#FFFFFF' : '#333333'
  const secondaryColor = isDark ? '#AAAAAA' : '#666666'

  const hours = time.getHours() % 12
  const minutes = time.getMinutes()
  const seconds = time.getSeconds()

  const secondAngle = seconds * 6
  const minuteAngle = minutes * 6 + seconds * 0.1
  const hourAngle = hours * 30 + minutes * 0.5

  const effectiveTarget = useMemo(() => {
    if (targetMode === 'offset') {
      const t = new Date(time.getTime() + targetOffsetMinutes * 60_000)
      return { h: t.getHours() % 12, m: t.getMinutes() }
    }
    return { h: targetHour % 12, m: targetMinute }
  }, [targetMode, targetOffsetMinutes, time, targetHour, targetMinute])

  const targetHourAngle = effectiveTarget.h * 30 + effectiveTarget.m * 0.5
  const targetMinuteAngle = effectiveTarget.m * 6

  const center = size / 2
  const radius = size * 0.45
  const fontSize = Math.max(12, size * 0.06)

  // Date display: midpoint between center and 3 o'clock position
  const dateX = center + radius * 0.325
  const dateY = center
  const dateFontSize = Math.max(9, size * 0.048)
  const dateW = Math.max(18, dateFontSize * 1.8)   // fits "31" + minimal padding
  const dateH = Math.max(12, dateFontSize * 1.35)  // tight line-height
  const today = new Date()
  const dateStr = `${today.getDate()}`

  const hourMarkers = useMemo(() => {
    return Array.from({ length: 12 }, (_, i) => {
      const angle = (i * 30 - 90) * (Math.PI / 180)
      const outerR = radius * 0.92
      const innerR = radius * 0.78
      const numR = radius * 0.65
      const x1 = center + outerR * Math.cos(angle)
      const y1 = center + outerR * Math.sin(angle)
      const x2 = center + innerR * Math.cos(angle)
      const y2 = center + innerR * Math.sin(angle)
      const numX = center + numR * Math.cos(angle)
      const numY = center + numR * Math.sin(angle)
      const num = i === 0 ? 12 : i
      return { x1, y1, x2, y2, numX, numY, num }
    })
  }, [center, radius])

  const minuteMarkers = useMemo(() => {
    return Array.from({ length: 60 }, (_, i) => {
      if (i % 5 === 0) return null
      const angle = (i * 6 - 90) * (Math.PI / 180)
      const outerR = radius * 0.92
      const innerR = radius * 0.86
      const x1 = center + outerR * Math.cos(angle)
      const y1 = center + outerR * Math.sin(angle)
      const x2 = center + innerR * Math.cos(angle)
      const y2 = center + innerR * Math.sin(angle)
      return { x1, y1, x2, y2 }
    }).filter(Boolean)
  }, [center, radius])

  return (
    <svg
      width={size}
      height={size}
      style={{ filter: 'drop-shadow(0 2px 8px rgba(0,0,0,0.35))' }}
    >
      <defs>
        {/* Gradient for clock face */}
        <radialGradient id="faceGradient" cx="30%" cy="30%">
          <stop offset="0%" stopColor={faceColor} />
          <stop offset="100%" stopColor={faceColor} stopOpacity="0.95" />
        </radialGradient>

        {/* Glass reflection effect */}
        <linearGradient id="glassReflection" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor="white" stopOpacity="0.3" />
          <stop offset="50%" stopColor="white" stopOpacity="0.05" />
          <stop offset="100%" stopColor="white" stopOpacity="0" />
        </linearGradient>

        {/* Shadow for hands */}
        <filter id="handShadow" x="-50%" y="-50%" width="200%" height="200%">
          <feDropShadow dx="1" dy="2" stdDeviation="2" floodOpacity="0.3" />
        </filter>
      </defs>

      {/* Clock face */}
      <circle
        cx={center}
        cy={center}
        r={radius}
        fill="url(#faceGradient)"
        stroke={textColor}
        strokeWidth="3"
      />

      {/* Inner decorative ring */}
      <circle
        cx={center}
        cy={center}
        r={radius * 0.95}
        fill="none"
        stroke={secondaryColor}
        strokeWidth="1"
        opacity="0.3"
      />

      {/* Glass reflection overlay */}
      <ellipse
        cx={center}
        cy={center * 0.7}
        rx={radius * 0.7}
        ry={radius * 0.35}
        fill="url(#glassReflection)"
      />

      {/* Minute markers */}
      {minuteMarkers.map((m, i) => m && (
        <line
          key={`min-${i}`}
          x1={m.x1}
          y1={m.y1}
          x2={m.x2}
          y2={m.y2}
          stroke={secondaryColor}
          strokeWidth="1.5"
          strokeLinecap="round"
          opacity="0.5"
        />
      ))}

      {/* Hour markers and numbers */}
      {hourMarkers.map((m, i) => (
        <g key={`hour-${i}`}>
          <line
            x1={m.x1}
            y1={m.y1}
            x2={m.x2}
            y2={m.y2}
            stroke={textColor}
            strokeWidth="3"
            strokeLinecap="round"
          />
          {showNumbers && (
            <text
              x={m.numX}
              y={m.numY}
              fill={textColor}
              fontSize={fontSize}
              fontWeight="700"
              textAnchor="middle"
              dominantBaseline="central"
              fontFamily="system-ui, sans-serif"
            >
              {m.num}
            </text>
          )}
        </g>
      ))}

      {/* Date display window: between center and 3 o'clock (rendered before hands) */}
      {showDate && (
        <g>
          <rect
            x={dateX - dateW / 2}
            y={dateY - dateH / 2}
            width={dateW}
            height={dateH}
            fill={faceColor}
            stroke={secondaryColor}
            strokeWidth="1.2"
            rx="3"
            opacity="0.9"
          />
          <text
            x={dateX}
            y={dateY}
            fill={textColor}
            fontSize={dateFontSize}
            fontWeight="600"
            textAnchor="middle"
            dominantBaseline="central"
            fontFamily="system-ui, sans-serif"
          >{dateStr}</text>
        </g>
      )}

      {/* Hour hand */}
      <line
        x1={center}
        y1={center}
        x2={center + radius * 0.5 * Math.sin(hourAngle * Math.PI / 180)}
        y2={center - radius * 0.5 * Math.cos(hourAngle * Math.PI / 180)}
        stroke={textColor}
        strokeWidth="6"
        strokeLinecap="round"
        filter="url(#handShadow)"
      />

      {/* Minute hand */}
      <line
        x1={center}
        y1={center}
        x2={center + radius * 0.7 * Math.sin(minuteAngle * Math.PI / 180)}
        y2={center - radius * 0.7 * Math.cos(minuteAngle * Math.PI / 180)}
        stroke={secondaryColor}
        strokeWidth="4"
        strokeLinecap="round"
        filter="url(#handShadow)"
      />

      {/* Second hand */}
      {showSeconds && (
        <>
          <line
            x1={center - radius * 0.15 * Math.sin(secondAngle * Math.PI / 180)}
            y1={center + radius * 0.15 * Math.cos(secondAngle * Math.PI / 180)}
            x2={center + radius * 0.85 * Math.sin(secondAngle * Math.PI / 180)}
            y2={center - radius * 0.85 * Math.cos(secondAngle * Math.PI / 180)}
            stroke="#cc0000"
            strokeWidth="2"
            strokeLinecap="round"
          />
        </>
      )}

      {/* Target time hands (rendered after current hands so they appear in front) */}
      {targetEnabled && (
        <g opacity="0.85">
          <line
            x1={center}
            y1={center}
            x2={center + radius * 0.5 * Math.sin(targetHourAngle * Math.PI / 180)}
            y2={center - radius * 0.5 * Math.cos(targetHourAngle * Math.PI / 180)}
            stroke={targetColor}
            strokeWidth="5"
            strokeLinecap="round"
            strokeDasharray="8 4"
          />
          <line
            x1={center}
            y1={center}
            x2={center + radius * 0.7 * Math.sin(targetMinuteAngle * Math.PI / 180)}
            y2={center - radius * 0.7 * Math.cos(targetMinuteAngle * Math.PI / 180)}
            stroke={targetColor}
            strokeWidth="3"
            strokeLinecap="round"
            strokeDasharray="8 4"
          />
        </g>
      )}

      {/* Center cap */}
      <circle
        cx={center}
        cy={center}
        r={size * 0.025}
        fill="url(#centerCapGradient)"
        stroke="#990000"
        strokeWidth="1"
      />
      <defs>
        <radialGradient id="centerCapGradient" cx="30%" cy="30%">
          <stop offset="0%" stopColor="#ff6666" />
          <stop offset="100%" stopColor="#cc0000" />
        </radialGradient>
      </defs>
    </svg>
  )
}
