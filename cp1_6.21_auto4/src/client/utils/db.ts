import { CardData, Participant } from '../types';

const DB_NAME = 'kanban-db';
const DB_VERSION = 1;
const STORE_CARDS = 'cards';
const STORE_PARTICIPANTS = 'participants';
const STORE_ROOM = 'room';

let db: IDBDatabase | null = null;

export const initDB = (): Promise<void> => {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onerror = () => reject(request.error);
    request.onsuccess = () => {
      db = request.result;
      resolve();
    };

    request.onupgradeneeded = (event) => {
      const database = (event.target as IDBOpenDBRequest).result;

      if (!database.objectStoreNames.contains(STORE_CARDS)) {
        database.createObjectStore(STORE_CARDS, { keyPath: 'id' });
      }

      if (!database.objectStoreNames.contains(STORE_PARTICIPANTS)) {
        database.createObjectStore(STORE_PARTICIPANTS, { keyPath: 'id' });
      }

      if (!database.objectStoreNames.contains(STORE_ROOM)) {
        database.createObjectStore(STORE_ROOM, { keyPath: 'key' });
      }
    };
  });
};

export const saveCards = (cards: CardData[]): Promise<void> => {
  return new Promise((resolve, reject) => {
    if (!db) {
      reject(new Error('DB not initialized'));
      return;
    }

    const transaction = db.transaction(STORE_CARDS, 'readwrite');
    const store = transaction.objectStore(STORE_CARDS);

    store.clear();

    cards.forEach(card => {
      store.add(card);
    });

    transaction.oncomplete = () => resolve();
    transaction.onerror = () => reject(transaction.error);
  });
};

export const getCards = (): Promise<CardData[]> => {
  return new Promise((resolve, reject) => {
    if (!db) {
      reject(new Error('DB not initialized'));
      return;
    }

    const transaction = db.transaction(STORE_CARDS, 'readonly');
    const store = transaction.objectStore(STORE_CARDS);
    const request = store.getAll();

    request.onsuccess = () => resolve(request.result as CardData[]);
    request.onerror = () => reject(request.error);
  });
};

export const saveParticipants = (participants: Participant[]): Promise<void> => {
  return new Promise((resolve, reject) => {
    if (!db) {
      reject(new Error('DB not initialized'));
      return;
    }

    const transaction = db.transaction(STORE_PARTICIPANTS, 'readwrite');
    const store = transaction.objectStore(STORE_PARTICIPANTS);

    store.clear();

    participants.forEach(p => {
      store.add(p);
    });

    transaction.oncomplete = () => resolve();
    transaction.onerror = () => reject(transaction.error);
  });
};

export const getParticipants = (): Promise<Participant[]> => {
  return new Promise((resolve, reject) => {
    if (!db) {
      reject(new Error('DB not initialized'));
      return;
    }

    const transaction = db.transaction(STORE_PARTICIPANTS, 'readonly');
    const store = transaction.objectStore(STORE_PARTICIPANTS);
    const request = store.getAll();

    request.onsuccess = () => resolve(request.result as Participant[]);
    request.onerror = () => reject(request.error);
  });
};

export const saveRoomInfo = (roomId: string, clientId: string, name: string, avatar: string): Promise<void> => {
  return new Promise((resolve, reject) => {
    if (!db) {
      reject(new Error('DB not initialized'));
      return;
    }

    const transaction = db.transaction(STORE_ROOM, 'readwrite');
    const store = transaction.objectStore(STORE_ROOM);

    store.put({ key: 'roomId', value: roomId });
    store.put({ key: 'clientId', value: clientId });
    store.put({ key: 'name', value: name });
    store.put({ key: 'avatar', value: avatar });

    transaction.oncomplete = () => resolve();
    transaction.onerror = () => reject(transaction.error);
  });
};

export const getRoomInfo = (): Promise<{ roomId?: string; clientId?: string; name?: string; avatar?: string }> => {
  return new Promise((resolve, reject) => {
    if (!db) {
      reject(new Error('DB not initialized'));
      return;
    }

    const transaction = db.transaction(STORE_ROOM, 'readonly');
    const store = transaction.objectStore(STORE_ROOM);
    const request = store.getAll();

    request.onsuccess = () => {
      const result: { roomId?: string; clientId?: string; name?: string; avatar?: string } = {};
      (request.result as Array<{ key: string; value: string }>).forEach(item => {
        if (item.key === 'roomId') result.roomId = item.value;
        if (item.key === 'clientId') result.clientId = item.value;
        if (item.key === 'name') result.name = item.value;
        if (item.key === 'avatar') result.avatar = item.value;
      });
      resolve(result);
    };
    request.onerror = () => reject(request.error);
  });
};

export const clearRoomData = (): Promise<void> => {
  return new Promise((resolve, reject) => {
    if (!db) {
      reject(new Error('DB not initialized'));
      return;
    }

    const transaction = db.transaction([STORE_CARDS, STORE_PARTICIPANTS, STORE_ROOM], 'readwrite');
    
    transaction.objectStore(STORE_CARDS).clear();
    transaction.objectStore(STORE_PARTICIPANTS).clear();
    transaction.objectStore(STORE_ROOM).clear();

    transaction.oncomplete = () => resolve();
    transaction.onerror = () => reject(transaction.error);
  });
};
