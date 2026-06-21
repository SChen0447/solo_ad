import { openDB, IDBPDatabase } from 'idb';
import { Story, HistorySnapshot } from '@/types';

export const MAX_HISTORY_SNAPSHOTS = 5;

const DB_NAME = 'timeline-story-db';
const DB_VERSION = 1;
const STORY_STORE = 'stories';
const SNAPSHOT_STORE = 'snapshots';

let dbPromise: Promise<IDBPDatabase> | null = null;

async function getDB(): Promise<IDBPDatabase> {
  if (!dbPromise) {
    dbPromise = openDB(DB_NAME, DB_VERSION, {
      upgrade(db) {
        if (!db.objectStoreNames.contains(STORY_STORE)) {
          db.createObjectStore(STORY_STORE, { keyPath: 'id' });
        }
        if (!db.objectStoreNames.contains(SNAPSHOT_STORE)) {
          const store = db.createObjectStore(SNAPSHOT_STORE, { keyPath: 'id' });
          store.createIndex('timestamp', 'timestamp');
        }
      },
    });
  }
  return dbPromise;
}

export async function saveStory(story: Story): Promise<void> {
  try {
    const db = await getDB();
    await db.put(STORY_STORE, story);
  } catch (error) {
    console.error('Failed to save story:', error);
  }
}

export async function loadStory(): Promise<Story | null> {
  try {
    const db = await getDB();
    const stories = await db.getAll(STORY_STORE);
    if (stories.length === 0) return null;
    return stories.sort((a: Story, b: Story) => b.updatedAt - a.updatedAt)[0] as Story;
  } catch (error) {
    console.error('Failed to load story:', error);
    return null;
  }
}

export async function saveSnapshot(snapshot: HistorySnapshot): Promise<void> {
  try {
    const db = await getDB();
    const tx = db.transaction(SNAPSHOT_STORE, 'readwrite');
    const store = tx.store;
    await store.add(snapshot);
    const allSnapshots = await store.getAll();
    const sorted = allSnapshots.sort(
      (a: HistorySnapshot, b: HistorySnapshot) => b.timestamp - a.timestamp
    );
    if (sorted.length > MAX_HISTORY_SNAPSHOTS) {
      const toDelete = sorted.slice(MAX_HISTORY_SNAPSHOTS);
      for (const snap of toDelete) {
        await store.delete(snap.id);
      }
    }
    await tx.done;
  } catch (error) {
    console.error('Failed to save snapshot:', error);
  }
}

export async function loadSnapshots(): Promise<HistorySnapshot[]> {
  try {
    const db = await getDB();
    const snapshots = await db.getAllFromIndex(
      SNAPSHOT_STORE,
      'timestamp',
      undefined,
      'prev'
    );
    return snapshots as HistorySnapshot[];
  } catch (error) {
    console.error('Failed to load snapshots:', error);
    return [];
  }
}

export async function deleteSnapshot(id: string): Promise<void> {
  try {
    const db = await getDB();
    await db.delete(SNAPSHOT_STORE, id);
  } catch (error) {
    console.error('Failed to delete snapshot:', error);
  }
}

export function encodeStoryToBase64(story: Story): string {
  const json = JSON.stringify(story);
  return btoa(unescape(encodeURIComponent(json)));
}

export function decodeBase64ToStory(encoded: string): Story | null {
  try {
    const json = decodeURIComponent(escape(atob(encoded)));
    return JSON.parse(json) as Story;
  } catch (error) {
    console.error('Failed to decode story:', error);
    return null;
  }
}

export function parseShareUrl(): Story | null {
  const hash = window.location.hash;
  const match = hash.match(/#\/s\/(.+)/);
  if (match && match[1]) {
    return decodeBase64ToStory(match[1]);
  }
  return null;
}
