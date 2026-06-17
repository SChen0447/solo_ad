import type { InspirationCard, Connection } from './CardModel';

type ChangeListener = () => void;

const CARDS_KEY = 'mindflow_cards';
const CONNECTIONS_KEY = 'mindflow_connections';

class StorageEngine {
  private listeners: ChangeListener[] = [];

  subscribe(listener: ChangeListener): () => void {
    this.listeners.push(listener);
    return () => {
      this.listeners = this.listeners.filter(l => l !== listener);
    };
  }

  private notify() {
    this.listeners.forEach(l => l());
  }

  getCards(): InspirationCard[] {
    try {
      const raw = localStorage.getItem(CARDS_KEY);
      return raw ? JSON.parse(raw) : [];
    } catch {
      return [];
    }
  }

  setCards(cards: InspirationCard[]) {
    localStorage.setItem(CARDS_KEY, JSON.stringify(cards));
    this.notify();
  }

  getConnections(): Connection[] {
    try {
      const raw = localStorage.getItem(CONNECTIONS_KEY);
      return raw ? JSON.parse(raw) : [];
    } catch {
      return [];
    }
  }

  setConnections(connections: Connection[]) {
    localStorage.setItem(CONNECTIONS_KEY, JSON.stringify(connections));
    this.notify();
  }

  addCard(card: InspirationCard) {
    const cards = this.getCards();
    cards.push(card);
    this.setCards(cards);
  }

  updateCard(id: string, updates: Partial<InspirationCard>) {
    const cards = this.getCards();
    const index = cards.findIndex(c => c.id === id);
    if (index !== -1) {
      cards[index] = { ...cards[index], ...updates, updatedAt: Date.now() };
      this.setCards(cards);
    }
  }

  deleteCard(id: string) {
    const cards = this.getCards().filter(c => c.id !== id);
    this.setCards(cards);
    const connections = this.getConnections().filter(
      c => c.sourceId !== id && c.targetId !== id
    );
    this.setConnections(connections);
  }

  addConnection(connection: Connection) {
    const connections = this.getConnections();
    connections.push(connection);
    this.setConnections(connections);
  }

  updateConnection(id: string, updates: Partial<Connection>) {
    const connections = this.getConnections();
    const index = connections.findIndex(c => c.id === id);
    if (index !== -1) {
      connections[index] = { ...connections[index], ...updates };
      this.setConnections(connections);
    }
  }

  deleteConnection(id: string) {
    const connections = this.getConnections().filter(c => c.id !== id);
    this.setConnections(connections);
  }

  clearAll() {
    localStorage.removeItem(CARDS_KEY);
    localStorage.removeItem(CONNECTIONS_KEY);
    this.notify();
  }
}

export const storageEngine = new StorageEngine();
