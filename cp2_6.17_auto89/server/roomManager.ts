import { v4 as uuidv4 } from 'uuid';

export interface Card {
  id: string;
  title: string;
  tags: string[];
  note: string;
  categoryId: string;
  createdAt: number;
}

export interface Category {
  id: string;
  name: string;
  cardIds: string[];
}

export interface User {
  id: string;
  nickname: string;
  joinedAt: number;
}

export interface Room {
  id: string;
  categories: Map<string, Category>;
  cards: Map<string, Card>;
  users: Map<string, User>;
  logs: LogEntry[];
}

export interface LogEntry {
  id: string;
  userId: string;
  nickname: string;
  action: string;
  timestamp: number;
}

const rooms = new Map<string, Room>();

export function createRoom(): string {
  const id = generateRoomCode();
  const defaultCategoryId = uuidv4();
  const room: Room = {
    id,
    categories: new Map([
      [defaultCategoryId, { id: defaultCategoryId, name: '默认分类', cardIds: [] }],
    ]),
    cards: new Map(),
    users: new Map(),
    logs: [],
  };
  rooms.set(id, room);
  return id;
}

export function joinRoom(roomId: string, userId: string, nickname: string): Room | null {
  const room = rooms.get(roomId);
  if (!room) return null;
  room.users.set(userId, { id: userId, nickname, joinedAt: Date.now() });
  addLog(room, userId, nickname, '加入了房间');
  return room;
}

export function leaveRoom(roomId: string, userId: string): boolean {
  const room = rooms.get(roomId);
  if (!room) return false;
  const user = room.users.get(userId);
  if (user) {
    addLog(room, userId, user.nickname, '离开了房间');
    room.users.delete(userId);
  }
  if (room.users.size === 0) {
    rooms.delete(roomId);
  }
  return true;
}

export function getRoom(roomId: string): Room | null {
  return rooms.get(roomId) || null;
}

export function addCategory(roomId: string, name: string): Category | null {
  const room = rooms.get(roomId);
  if (!room) return null;
  if (room.categories.size >= 20) return null;
  const id = uuidv4();
  const category: Category = { id, name, cardIds: [] };
  room.categories.set(id, category);
  return category;
}

export function removeCategory(roomId: string, categoryId: string): boolean {
  const room = rooms.get(roomId);
  if (!room) return false;
  const category = room.categories.get(categoryId);
  if (!category) return false;
  for (const cardId of category.cardIds) {
    room.cards.delete(cardId);
  }
  room.categories.delete(categoryId);
  return true;
}

export function addCard(roomId: string, categoryId: string, userId: string): Card | null {
  const room = rooms.get(roomId);
  if (!room) return null;
  if (room.cards.size >= 100) return null;
  const category = room.categories.get(categoryId);
  if (!category) return null;
  const id = uuidv4();
  const card: Card = {
    id,
    title: '未命名卡片',
    tags: [],
    note: '',
    categoryId,
    createdAt: Date.now(),
  };
  room.cards.set(id, card);
  category.cardIds.push(id);
  const user = room.users.get(userId);
  addLog(room, userId, user?.nickname || '未知', `创建了卡片「${card.title}」`);
  return card;
}

export function updateCard(
  roomId: string,
  cardId: string,
  updates: Partial<Pick<Card, 'title' | 'tags' | 'note'>>,
  userId: string
): Card | null {
  const room = rooms.get(roomId);
  if (!room) return null;
  const card = room.cards.get(cardId);
  if (!card) return null;
  if (updates.title !== undefined) card.title = updates.title.slice(0, 50);
  if (updates.tags !== undefined) card.tags = updates.tags.slice(0, 3);
  if (updates.note !== undefined) card.note = updates.note.slice(0, 200);
  const user = room.users.get(userId);
  const actionParts: string[] = [];
  if (updates.title !== undefined) actionParts.push('修改了标题');
  if (updates.tags !== undefined) actionParts.push('修改了标签');
  if (updates.note !== undefined) actionParts.push('修改了备注');
  if (actionParts.length > 0) {
    addLog(room, userId, user?.nickname || '未知', `${actionParts.join('、')}「${card.title}」`);
  }
  return card;
}

export function moveCard(
  roomId: string,
  cardId: string,
  targetCategoryId: string,
  targetIndex: number,
  userId: string
): Card | null {
  const room = rooms.get(roomId);
  if (!room) return null;
  const card = room.cards.get(cardId);
  if (!card) return null;
  const sourceCategory = room.categories.get(card.categoryId);
  const targetCategory = room.categories.get(targetCategoryId);
  if (!sourceCategory || !targetCategory) return null;
  sourceCategory.cardIds = sourceCategory.cardIds.filter((id) => id !== cardId);
  const clampedIndex = Math.min(targetIndex, targetCategory.cardIds.length);
  targetCategory.cardIds.splice(clampedIndex, 0, cardId);
  card.categoryId = targetCategoryId;
  const user = room.users.get(userId);
  addLog(
    room,
    userId,
    user?.nickname || '未知',
    `移动了卡片「${card.title}」到分类「${targetCategory.name}」`
  );
  return card;
}

export function deleteCard(roomId: string, cardId: string, userId: string): boolean {
  const room = rooms.get(roomId);
  if (!room) return false;
  const card = room.cards.get(cardId);
  if (!card) return false;
  const category = room.categories.get(card.categoryId);
  if (category) {
    category.cardIds = category.cardIds.filter((id) => id !== cardId);
  }
  room.cards.delete(cardId);
  const user = room.users.get(userId);
  addLog(room, userId, user?.nickname || '未知', `删除了卡片「${card.title}」`);
  return true;
}

export function getRoomState(roomId: string) {
  const room = rooms.get(roomId);
  if (!room) return null;
  return {
    id: room.id,
    categories: Array.from(room.categories.values()).map((c) => ({
      id: c.id,
      name: c.name,
      cardIds: c.cardIds,
    })),
    cards: Array.from(room.cards.values()),
    users: Array.from(room.users.values()),
    logs: room.logs.slice(-20),
  };
}

function addLog(room: Room, userId: string, nickname: string, action: string): void {
  const entry: LogEntry = {
    id: uuidv4(),
    userId,
    nickname,
    action,
    timestamp: Date.now(),
  };
  room.logs.push(entry);
  if (room.logs.length > 100) {
    room.logs = room.logs.slice(-50);
  }
}

function generateRoomCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = '';
  for (let i = 0; i < 6; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  if (rooms.has(code)) return generateRoomCode();
  return code;
}
