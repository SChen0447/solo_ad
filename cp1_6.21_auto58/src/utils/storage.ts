const STORAGE_KEY = 'videoflow_data';
const VERSION_KEY = 'videoflow_version';
const CURRENT_VERSION = 1;

export interface StorageData {
  projects: unknown[];
  videos: unknown[];
}

export function loadFromStorage(): StorageData {
  try {
    const version = localStorage.getItem(VERSION_KEY);
    if (!version || Number(version) !== CURRENT_VERSION) {
      localStorage.setItem(VERSION_KEY, String(CURRENT_VERSION));
      return { projects: [], videos: [] };
    }
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return { projects: [], videos: [] };
    const parsed = JSON.parse(raw);
    return {
      projects: Array.isArray(parsed.projects) ? parsed.projects : [],
      videos: Array.isArray(parsed.videos) ? parsed.videos : [],
    };
  } catch {
    return { projects: [], videos: [] };
  }
}

export function saveToStorage(data: StorageData): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    localStorage.setItem(VERSION_KEY, String(CURRENT_VERSION));
  } catch {
    // storage full or unavailable
  }
}

let debounceTimer: ReturnType<typeof setTimeout> | null = null;
const DEBOUNCE_MS = 300;

export function saveToStorageDebounced(data: StorageData): void {
  if (debounceTimer) clearTimeout(debounceTimer);
  debounceTimer = setTimeout(() => {
    saveToStorage(data);
    debounceTimer = null;
  }, DEBOUNCE_MS);
}
