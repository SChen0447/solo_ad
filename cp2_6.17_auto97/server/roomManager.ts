import { v4 as uuidv4 } from 'uuid';

export interface User {
  id: string;
  nickname: string;
  joinedAt: number;
}

export interface Card {
  id: string;
  title: string;
  tags: string[];
  notes: string;
  categoryId: string;
  position: number;
  createdAt: number;
  updatedAt: number;
  createdBy: string;
}

export interface Category {
  id: string;
  name: string;
  color: string;
  createdAt: number;
  position: number;
}

export interface LogEntry {
  id: string;
  user: string;
  action: string;
  target: string;
  targetName: string;
  categoryName?: string;
  timestamp: number;
}

export interface RoomState {
  roomId: string;
  users: Map<string, User>;
  cards: Card[];
  categories: Category[];
  logs: LogEntry[];
  createdAt: number;
}

const CATEGORY_COLORS = [
  '#fef3c7',
  '#dbeafe',
  '#dcfce7',
  '#fce7f3',
  '#e0e7ff',
  '#fed7aa',
  '#ccfbf1',
  '#fecaca',
  '#e9d5ff',
  '#a7f3d0',
];

function generateRoomCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = '';
  for (let i = 0; i < 6; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}

class RoomManager {
  private rooms: Map<string, RoomState> = new Map();

  createRoom(): string {
    let roomId: string;
    do {
      roomId = generateRoomCode();
    } while (this.rooms.has(roomId));

    const defaultCategory: Category = {
      id: uuidv4(),
      name: '默认分类',
      color: CATEGORY_COLORS[0],
      createdAt: Date.now(),
      position: 0,
    };

    this.rooms.set(roomId, {
      roomId,
      users: new Map(),
      cards: [],
      categories: [defaultCategory],
      logs: [],
      createdAt: Date.now(),
    });

    return roomId;
  }

  roomExists(roomId: string): boolean {
    return this.rooms.has(roomId);
  }

  joinRoom(roomId: string, userId: string, nickname: string): { state: RoomState; currentUser: User } | null {
    const room = this.rooms.get(roomId);
    if (!room) return null;

    const user: User = {
      id: userId,
      nickname,
      joinedAt: Date.now(),
    };
    room.users.set(userId, user);

    this.addLog(roomId, {
      id: uuidv4(),
      user: nickname,
      action: '加入了房间',
      target: 'room',
      targetName: roomId,
      timestamp: Date.now(),
    });

    return { state: room, currentUser: user };
  }

  leaveRoom(roomId: string, userId: string): boolean {
    const room = this.rooms.get(roomId);
    if (!room) return false;

    const user = room.users.get(userId);
    if (user) {
      this.addLog(roomId, {
        id: uuidv4(),
        user: user.nickname,
        action: '离开了房间',
        target: 'room',
        targetName: roomId,
        timestamp: Date.now(),
      });
    }

    room.users.delete(userId);

    if (room.users.size === 0) {
      setTimeout(() => {
        const currentRoom = this.rooms.get(roomId);
        if (currentRoom && currentRoom.users.size === 0) {
          this.rooms.delete(roomId);
        }
      }, 5 * 60 * 1000);
    }

    return true;
  }

  getRoomState(roomId: string): RoomState | null {
    return this.rooms.get(roomId) || null;
  }

  getUsers(roomId: string): User[] {
    const room = this.rooms.get(roomId);
    if (!room) return [];
    return Array.from(room.users.values());
  }

  addCard(roomId: string, categoryId: string, createdBy: string, nickname: string): Card | null {
    const room = this.rooms.get(roomId);
    if (!room) return null;

    const category = room.categories.find((c) => c.id === categoryId);
    if (!category) return null;

    const position = room.cards.filter((c) => c.categoryId === categoryId).length;

    const card: Card = {
      id: uuidv4(),
      title: '未命名卡片',
      tags: [],
      notes: '',
      categoryId,
      position,
      createdAt: Date.now(),
      updatedAt: Date.now(),
      createdBy,
    };

    room.cards.push(card);

    this.addLog(roomId, {
      id: uuidv4(),
      user: nickname,
      action: '创建了卡片',
      target: 'card',
      targetName: card.title,
      categoryName: category.name,
      timestamp: Date.now(),
    });

    return card;
  }

  updateCard(roomId: string, cardId: string, updates: Partial<Omit<Card, 'id' | 'createdAt' | 'createdBy'>>, nickname: string): Card | null {
    const room = this.rooms.get(roomId);
    if (!room) return null;

    const cardIndex = room.cards.findIndex((c) => c.id === cardId);
    if (cardIndex === -1) return null;

    const oldCard = room.cards[cardIndex];
    const updatedCard: Card = {
      ...oldCard,
      ...updates,
      updatedAt: Date.now(),
    };

    room.cards[cardIndex] = updatedCard;

    let action = '更新了卡片';
    let targetName = updatedCard.title;
    if (updates.title !== undefined && updates.title !== oldCard.title) {
      action = '重命名卡片';
      targetName = `${oldCard.title} → ${updates.title}`;
    }

    this.addLog(roomId, {
      id: uuidv4(),
      user: nickname,
      action,
      target: 'card',
      targetName,
      timestamp: Date.now(),
    });

    return updatedCard;
  }

  moveCard(roomId: string, cardId: string, newCategoryId: string, newPosition: number, nickname: string): Card | null {
    const room = this.rooms.get(roomId);
    if (!room) return null;

    const card = room.cards.find((c) => c.id === cardId);
    if (!card) return null;

    const oldCategory = room.categories.find((c) => c.id === card.categoryId);
    const newCategory = room.categories.find((c) => c.id === newCategoryId);
    if (!newCategory) return null;

    const oldCategoryId = card.categoryId;

    const cardsInOld = room.cards.filter((c) => c.categoryId === oldCategoryId && c.id !== cardId);
    cardsInOld.sort((a, b) => a.position - b.position);
    cardsInOld.forEach((c, idx) => {
      const idx2 = room.cards.findIndex((cc) => cc.id === c.id);
      room.cards[idx2].position = idx;
    });

    let cardsInNew = room.cards.filter((c) => c.categoryId === newCategoryId && c.id !== cardId);
    cardsInNew.sort((a, b) => a.position - b.position);

    const insertPos = Math.max(0, Math.min(newPosition, cardsInNew.length));
    cardsInNew.splice(insertPos, 0, card);
    cardsInNew.forEach((c, idx) => {
      const idx2 = room.cards.findIndex((cc) => cc.id === c.id);
      room.cards[idx2].position = idx;
    });

    const finalCardIdx = room.cards.findIndex((c) => c.id === cardId);
    room.cards[finalCardIdx].categoryId = newCategoryId;
    room.cards[finalCardIdx].position = insertPos;
    room.cards[finalCardIdx].updatedAt = Date.now();

    this.addLog(roomId, {
      id: uuidv4(),
      user: nickname,
      action: '移动了卡片',
      target: 'card',
      targetName: card.title,
      categoryName: `${oldCategory?.name || '未知'} → ${newCategory.name}`,
      timestamp: Date.now(),
    });

    return room.cards[finalCardIdx];
  }

  deleteCard(roomId: string, cardId: string, nickname: string): boolean {
    const room = this.rooms.get(roomId);
    if (!room) return false;

    const cardIndex = room.cards.findIndex((c) => c.id === cardId);
    if (cardIndex === -1) return false;

    const card = room.cards[cardIndex];
    room.cards.splice(cardIndex, 1);

    const cardsInCategory = room.cards.filter((c) => c.categoryId === card.categoryId);
    cardsInCategory.sort((a, b) => a.position - b.position);
    cardsInCategory.forEach((c, idx) => {
      const idx2 = room.cards.findIndex((cc) => cc.id === c.id);
      room.cards[idx2].position = idx;
    });

    this.addLog(roomId, {
      id: uuidv4(),
      user: nickname,
      action: '删除了卡片',
      target: 'card',
      targetName: card.title,
      timestamp: Date.now(),
    });

    return true;
  }

  addCategory(roomId: string, name: string, nickname: string): Category | null {
    const room = this.rooms.get(roomId);
    if (!room) return null;
    if (room.categories.length >= 20) return null;

    const colorIndex = room.categories.length % CATEGORY_COLORS.length;
    const category: Category = {
      id: uuidv4(),
      name: name.substring(0, 10),
      color: CATEGORY_COLORS[colorIndex],
      createdAt: Date.now(),
      position: room.categories.length,
    };

    room.categories.push(category);

    this.addLog(roomId, {
      id: uuidv4(),
      user: nickname,
      action: '创建了分类',
      target: 'category',
      targetName: category.name,
      timestamp: Date.now(),
    });

    return category;
  }

  updateCategory(roomId: string, categoryId: string, name: string, nickname: string): Category | null {
    const room = this.rooms.get(roomId);
    if (!room) return null;

    const category = room.categories.find((c) => c.id === categoryId);
    if (!category) return null;

    const oldName = category.name;
    category.name = name.substring(0, 10);

    this.addLog(roomId, {
      id: uuidv4(),
      user: nickname,
      action: '重命名分类',
      target: 'category',
      targetName: `${oldName} → ${category.name}`,
      timestamp: Date.now(),
    });

    return category;
  }

  deleteCategory(roomId: string, categoryId: string, nickname: string): boolean {
    const room = this.rooms.get(roomId);
    if (!room) return false;
    if (room.categories.length <= 1) return false;

    const categoryIndex = room.categories.findIndex((c) => c.id === categoryId);
    if (categoryIndex === -1) return false;

    const category = room.categories[categoryIndex];

    const remainingCategories = room.categories.filter((c) => c.id !== categoryId);
    const targetCategoryId = remainingCategories[0]?.id;

    if (targetCategoryId) {
      room.cards.forEach((card) => {
        if (card.categoryId === categoryId) {
          card.categoryId = targetCategoryId;
          const targetCards = room.cards.filter((c) => c.categoryId === targetCategoryId);
          card.position = targetCards.length;
        }
      });
    }

    room.categories.splice(categoryIndex, 1);
    room.categories.forEach((c, idx) => {
      c.position = idx;
    });

    this.addLog(roomId, {
      id: uuidv4(),
      user: nickname,
      action: '删除了分类',
      target: 'category',
      targetName: category.name,
      timestamp: Date.now(),
    });

    return true;
  }

  private addLog(roomId: string, log: LogEntry): void {
    const room = this.rooms.get(roomId);
    if (!room) return;
    room.logs.push(log);
    if (room.logs.length > 100) {
      room.logs = room.logs.slice(-100);
    }
  }

  getLogs(roomId: string, limit: number = 20): LogEntry[] {
    const room = this.rooms.get(roomId);
    if (!room) return [];
    return room.logs.slice(-limit);
  }

  serializeRoomState(roomId: string): {
    roomId: string;
    cards: Card[];
    categories: Category[];
    users: { id: string; nickname: string }[];
    logs: LogEntry[];
  } | null {
    const room = this.rooms.get(roomId);
    if (!room) return null;

    return {
      roomId,
      cards: [...room.cards],
      categories: [...room.categories],
      users: Array.from(room.users.values()).map((u) => ({ id: u.id, nickname: u.nickname })),
      logs: this.getLogs(roomId, 20),
    };
  }
}

export const roomManager = new RoomManager();
