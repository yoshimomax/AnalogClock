export interface Settings {
  size: number
  opacity: number
  faceColor: string
  targetEnabled: boolean
  targetHour: number
  targetMinute: number
  alwaysOnTop: boolean
  showSeconds: boolean
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
  alwaysOnTop: true,
  showSeconds: true,
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
      return { ...defaultSettings, ...JSON.parse(saved) }
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
