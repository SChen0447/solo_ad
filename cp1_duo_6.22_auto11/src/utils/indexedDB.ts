import { CardRecord } from '@/types';

const DB_NAME = 'MovieCardDB';
const DB_VERSION = 1;
const STORE_NAME = 'cards';

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: 'id' });
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

export async function getAllCards(): Promise<CardRecord[]> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readonly');
    const store = tx.objectStore(STORE_NAME);
    const request = store.getAll();
    request.onsuccess = () => {
      const records: CardRecord[] = request.result;
      records.sort((a, b) => b.createdAt - a.createdAt);
      resolve(records);
    };
    request.onerror = () => reject(request.error);
  });
}

export async function saveCard(record: CardRecord): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite');
    const store = tx.objectStore(STORE_NAME);
    store.put(record);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

export async function deleteCard(id: string): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite');
    const store = tx.objectStore(STORE_NAME);
    store.delete(id);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

export async function ensureMaxRecords(maxCount: number): Promise<void> {
  const all = await getAllCards();
  if (all.length >= maxCount) {
    const toDelete = all.slice(maxCount - 1);
    for (const record of toDelete) {
      await deleteCard(record.id);
    }
  }
}
