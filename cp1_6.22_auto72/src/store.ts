export interface CalendarEvent {
  id: string;
  date: string;
  description: string;
  createdAt: number;
}

export interface DayData {
  date: string;
  events: CalendarEvent[];
}

type StoreListener = () => void;

const STORAGE_KEY = 'pixel_river_calendar_events';
const DB_NAME = 'PixelRiverCalendarDB';
const DB_VERSION = 1;
const STORE_NAME = 'events';

export class EventStore {
  private events: Map<string, CalendarEvent[]> = new Map();
  private listeners: StoreListener[] = [];
  private useIndexedDB: boolean = false;
  private db: IDBDatabase | null = null;

  async init(): Promise<void> {
    const loadedFromLocal = this.loadFromLocalStorage();
    if (!loadedFromLocal) {
      try {
        await this.initIndexedDB();
        this.useIndexedDB = true;
        await this.loadFromIndexedDB();
      } catch (e) {
        console.warn('IndexedDB not available, using in-memory only');
      }
    }
  }

  private loadFromLocalStorage(): boolean {
    try {
      const data = localStorage.getItem(STORAGE_KEY);
      if (data) {
        const parsed = JSON.parse(data) as CalendarEvent[];
        this.events.clear();
        for (const event of parsed) {
          const dateKey = event.date;
          if (!this.events.has(dateKey)) {
            this.events.set(dateKey, []);
          }
          this.events.get(dateKey)!.push(event);
        }
        return true;
      }
      return true;
    } catch (e) {
      console.warn('localStorage not available, falling back to IndexedDB');
      return false;
    }
  }

  private initIndexedDB(): Promise<void> {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, DB_VERSION);

      request.onerror = () => reject(request.error);
      request.onsuccess = () => {
        this.db = request.result;
        resolve();
      };
      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;
        if (!db.objectStoreNames.contains(STORE_NAME)) {
          const store = db.createObjectStore(STORE_NAME, { keyPath: 'id' });
          store.createIndex('date', 'date', { unique: false });
        }
      };
    });
  }

  private loadFromIndexedDB(): Promise<void> {
    return new Promise((resolve, reject) => {
      if (!this.db) {
        reject(new Error('DB not initialized'));
        return;
      }

      const transaction = this.db.transaction(STORE_NAME, 'readonly');
      const store = transaction.objectStore(STORE_NAME);
      const request = store.getAll();

      request.onerror = () => reject(request.error);
      request.onsuccess = () => {
        const result = request.result as CalendarEvent[];
        this.events.clear();
        for (const event of result) {
          const dateKey = event.date;
          if (!this.events.has(dateKey)) {
            this.events.set(dateKey, []);
          }
          this.events.get(dateKey)!.push(event);
        }
        resolve();
      };
    });
  }

  private async persist(): Promise<void> {
    const allEvents = this.getAllEvents();

    if (!this.useIndexedDB) {
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(allEvents));
        return;
      } catch (e) {
        console.warn('localStorage full, switching to IndexedDB');
        try {
          await this.initIndexedDB();
          this.useIndexedDB = true;
        } catch (dbErr) {
          console.error('Failed to switch to IndexedDB');
          return;
        }
      }
    }

    if (this.db && this.useIndexedDB) {
      const transaction = this.db.transaction(STORE_NAME, 'readwrite');
      const store = transaction.objectStore(STORE_NAME);
      store.clear();
      for (const event of allEvents) {
        store.put(event);
      }
    }
  }

  private getAllEvents(): CalendarEvent[] {
    const all: CalendarEvent[] = [];
    for (const events of this.events.values()) {
      all.push(...events);
    }
    return all;
  }

  getEventsForDate(date: string): CalendarEvent[] {
    return this.events.get(date) || [];
  }

  getEventCountForDate(date: string): number {
    return this.events.get(date)?.length || 0;
  }

  addEvent(date: string, description: string): CalendarEvent {
    const event: CalendarEvent = {
      id: `${date}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      date,
      description,
      createdAt: Date.now()
    };

    if (!this.events.has(date)) {
      this.events.set(date, []);
    }
    this.events.get(date)!.push(event);

    this.persist().catch(console.error);
    this.notifyListeners();
    return event;
  }

  updateEvent(id: string, description: string): boolean {
    for (const events of this.events.values()) {
      const event = events.find(e => e.id === id);
      if (event) {
        event.description = description;
        this.persist().catch(console.error);
        this.notifyListeners();
        return true;
      }
    }
    return false;
  }

  deleteEvent(id: string): boolean {
    for (const [date, events] of this.events) {
      const index = events.findIndex(e => e.id === id);
      if (index !== -1) {
        events.splice(index, 1);
        if (events.length === 0) {
          this.events.delete(date);
        }
        this.persist().catch(console.error);
        this.notifyListeners();
        return true;
      }
    }
    return false;
  }

  getEventsInRange(startDate: string, endDate: string): DayData[] {
    const result: DayData[] = [];
    const start = new Date(startDate);
    const end = new Date(endDate);

    const current = new Date(start);
    while (current <= end) {
      const dateKey = this.formatDate(current);
      result.push({
        date: dateKey,
        events: this.events.get(dateKey) || []
      });
      current.setDate(current.getDate() + 1);
    }

    return result;
  }

  subscribe(listener: StoreListener): () => void {
    this.listeners.push(listener);
    return () => {
      const idx = this.listeners.indexOf(listener);
      if (idx !== -1) {
        this.listeners.splice(idx, 1);
      }
    };
  }

  private notifyListeners(): void {
    for (const listener of this.listeners) {
      listener();
    }
  }

  private formatDate(date: Date): string {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  static formatDate(date: Date): string {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  static parseDate(dateStr: string): Date {
    const [year, month, day] = dateStr.split('-').map(Number);
    return new Date(year, month - 1, day);
  }
}
