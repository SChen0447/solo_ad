import { Artwork, PixelFrame, CANVAS_SIZE } from '../store/pixelStore';

const DB_NAME = 'pixelAnimationDB';
const DB_VERSION = 1;
const STORE_NAME = 'artworks';

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        const store = db.createObjectStore(STORE_NAME, { keyPath: 'id' });
        store.createIndex('title', 'title', { unique: false });
        store.createIndex('createdAt', 'createdAt', { unique: false });
      }
    };
  });
}

export async function saveArtwork(artwork: Artwork): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORE_NAME, 'readwrite');
    const store = transaction.objectStore(STORE_NAME);
    const request = store.put(artwork);

    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);

    transaction.oncomplete = () => db.close();
  });
}

export async function getArtwork(id: string): Promise<Artwork | undefined> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORE_NAME, 'readonly');
    const store = transaction.objectStore(STORE_NAME);
    const request = store.get(id);

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);

    transaction.oncomplete = () => db.close();
  });
}

export async function getAllArtworks(): Promise<Artwork[]> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORE_NAME, 'readonly');
    const store = transaction.objectStore(STORE_NAME);
    const request = store.getAll();

    request.onsuccess = () => {
      const results = request.result || [];
      results.sort((a, b) => b.createdAt - a.createdAt);
      resolve(results);
    };
    request.onerror = () => reject(request.error);

    transaction.oncomplete = () => db.close();
  });
}

export async function deleteArtwork(id: string): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORE_NAME, 'readwrite');
    const store = transaction.objectStore(STORE_NAME);
    const request = store.delete(id);

    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);

    transaction.oncomplete = () => db.close();
  });
}

export async function searchArtworks(query: string): Promise<Artwork[]> {
  const all = await getAllArtworks();
  const lowerQuery = query.toLowerCase().trim();
  
  if (!lowerQuery) return all;

  return all.filter(artwork => {
    const titleMatch = artwork.title.toLowerCase().includes(lowerQuery);
    const tagMatch = artwork.tags.some(tag => 
      tag.toLowerCase().includes(lowerQuery)
    );
    return titleMatch || tagMatch;
  });
}

export function generateThumbnail(frames: PixelFrame[]): string {
  const canvas = document.createElement('canvas');
  const size = 128;
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d')!;
  
  const firstFrame = frames[0];
  if (!firstFrame) {
    return canvas.toDataURL();
  }

  const pixelSize = size / CANVAS_SIZE;
  
  for (let y = 0; y < CANVAS_SIZE; y++) {
    for (let x = 0; x < CANVAS_SIZE; x++) {
      const color = firstFrame.pixels[y * CANVAS_SIZE + x];
      if (color && color !== 'transparent') {
        ctx.fillStyle = color;
        ctx.fillRect(x * pixelSize, y * pixelSize, pixelSize, pixelSize);
      }
    }
  }

  return canvas.toDataURL();
}

export function createArtwork(
  title: string,
  tags: string[],
  frames: PixelFrame[]
): Artwork {
  const id = `artwork-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  return {
    id,
    title,
    tags,
    frames,
    author: '匿名',
    createdAt: Date.now(),
    thumbnail: generateThumbnail(frames),
  };
}
