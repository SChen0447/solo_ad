const LAST_SYNC_KEY = 'plant_care_last_sync'
const SYNC_INTERVAL = 5 * 60 * 1000

export const getLastSyncTime = (): number | null => {
  try {
    const value = localStorage.getItem(LAST_SYNC_KEY)
    return value ? parseInt(value, 10) : null
  } catch {
    return null
  }
}

export const setLastSyncTime = (timestamp: number = Date.now()): void => {
  try {
    localStorage.setItem(LAST_SYNC_KEY, timestamp.toString())
  } catch {
    console.warn('Failed to save last sync time to localStorage')
  }
}

export const shouldRefresh = (): boolean => {
  const lastSync = getLastSyncTime()
  if (!lastSync) return true
  return Date.now() - lastSync > SYNC_INTERVAL
}

export const clearLastSyncTime = (): void => {
  try {
    localStorage.removeItem(LAST_SYNC_KEY)
  } catch {
    console.warn('Failed to clear last sync time from localStorage')
  }
}
