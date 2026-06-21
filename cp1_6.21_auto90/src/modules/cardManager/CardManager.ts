import localforage from 'localforage';
import { v4 as uuidv4 } from 'uuid';

export type CardType = 'image' | 'link' | 'note';

export interface Tag {
  id: string;
  name: string;
  color: string;
}

export interface Card {
  id: string;
  type: CardType;
  content: {
    imageUrl?: string;
    linkTitle?: string;
    linkUrl?: string;
    noteText?: string;
  };
  tags: string[];
  order: number;
  createdAt: number;
}

const TAG_COLORS = [
  '#ff6b6b', '#4ecdc4', '#45b7d1', '#96ceb4',
  '#ffeaa7', '#dfe6e9', '#fd79a8', '#a29bfe',
  '#6c5ce7', '#00b894', '#e17055', '#74b9ff'
];

class CardManager {
  private cards: Card[] = [];
  private tags: Tag[] = [];
  private boardId: string = '';

  async init(boardId: string): Promise<void> {
    this.boardId = boardId;
    const storedCards = await localforage.getItem<Card[]>(`cards_${boardId}`);
    const storedTags = await localforage.getItem<Tag[]>(`tags_${boardId}`);
    this.cards = storedCards || [];
    this.tags = storedTags || [];
  }

  getCards(): Card[] {
    return [...this.cards].sort((a, b) => a.order - b.order);
  }

  getTags(): Tag[] {
    return [...this.tags];
  }

  async addCard(type: CardType, content: Card['content']): Promise<Card> {
    const card: Card = {
      id: uuidv4(),
      type,
      content,
      tags: [],
      order: this.cards.length,
      createdAt: Date.now()
    };
    this.cards.push(card);
    await this.saveCards();
    return card;
  }

  async updateCard(cardId: string, content: Card['content']): Promise<void> {
    const card = this.cards.find(c => c.id === cardId);
    if (card) {
      card.content = { ...card.content, ...content };
      await this.saveCards();
    }
  }

  async deleteCard(cardId: string): Promise<void> {
    this.cards = this.cards.filter(c => c.id !== cardId);
    await this.saveCards();
  }

  async reorderCards(sourceIndex: number, destinationIndex: number): Promise<void> {
    const sorted = [...this.cards].sort((a, b) => a.order - b.order);
    const [removed] = sorted.splice(sourceIndex, 1);
    sorted.splice(destinationIndex, 0, removed);
    sorted.forEach((card, index) => {
      card.order = index;
    });
    this.cards = sorted;
    await this.saveCards();
  }

  async addTagToCard(cardId: string, tagName: string): Promise<void> {
    const trimmedName = tagName.trim().slice(0, 10);
    if (!trimmedName) return;

    let tag = this.tags.find(t => t.name === trimmedName);
    if (!tag) {
      tag = {
        id: uuidv4(),
        name: trimmedName,
        color: TAG_COLORS[this.tags.length % TAG_COLORS.length]
      };
      this.tags.push(tag);
      await this.saveTags();
    }

    const card = this.cards.find(c => c.id === cardId);
    if (card && !card.tags.includes(tag.id) && card.tags.length < 3) {
      card.tags.push(tag.id);
      await this.saveCards();
    }
  }

  async removeTagFromCard(cardId: string, tagId: string): Promise<void> {
    const card = this.cards.find(c => c.id === cardId);
    if (card) {
      card.tags = card.tags.filter(t => t !== tagId);
      await this.saveCards();
    }
  }

  getTagById(tagId: string): Tag | undefined {
    return this.tags.find(t => t.id === tagId);
  }

  private async saveCards(): Promise<void> {
    await localforage.setItem(`cards_${this.boardId}`, this.cards);
    try {
      sessionStorage.setItem(`card_count_${this.boardId}`, String(this.cards.length));
    } catch {
    }
  }

  private async saveTags(): Promise<void> {
    await localforage.setItem(`tags_${this.boardId}`, this.tags);
  }
}

export const cardManager = new CardManager();
