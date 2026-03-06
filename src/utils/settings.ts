export interface Settings {
  size: number
  opacity: number
  faceColor: string
  targetEnabled: boolean
  targetHour: number
  targetMinute: number
  targetColor: string
  targetAlarmEnabled: boolean
  alwaysOnTop: boolean
  showSeconds: boolean
  showDate: boolean
  showNumbers: boolean
  clickThrough: boolean
  snapMargin: number
}

export const defaultSettings: Settings = {
  size: 300,
  opacity: 1.0,
  faceColor: '#FFFFFF',
  targetEnabled: false,
  targetHour: 12,
  targetMinute: 0,
  targetColor: '#00aa00',
  targetAlarmEnabled: false,
  alwaysOnTop: true,
  showSeconds: true,
  showDate: false,
  showNumbers: true,
  clickThrough: false,
  snapMargin: 0,
}

export const PRESET_COLORS = [
  { color: '#FFFFFF', name: 'White' },
  { color: '#F0F0F0', name: 'Light Gray' },
  { color: '#E8E8E8', name: 'Silver' },
  { color: '#FFFACD', name: 'Lemon' },
  { color: '#E6F3FF', name: 'Light Blue' },
  { color: '#E8FFE8', name: 'Light Green' },
  { color: '#FFE8E8', name: 'Light Pink' },
  { color: '#FFF0E0', name: 'Peach' },
  { color: '#2C2C2C', name: 'Dark Gray' },
  { color: '#1A1A2E', name: 'Dark Blue' },
]

const STORAGE_KEY = 'analog-clock-settings'

export async function loadSettings(): Promise<Settings> {
  try {
    const saved = localStorage.getItem(STORAGE_KEY)
    if (saved) {
      const merged = { ...defaultSettings, ...JSON.parse(saved) }
      // Migrate: targetHour must be 1-12
      if (merged.targetHour < 1 || merged.targetHour > 12) {
        merged.targetHour = ((merged.targetHour - 1 + 12) % 12) + 1
      }
      return merged
    }
  } catch (e) {
    console.error('Failed to load settings:', e)
  }
  return defaultSettings
}

export async function saveSettings(settings: Settings): Promise<void> {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(settings))
  } catch (e) {
    console.error('Failed to save settings:', e)
  }
}
