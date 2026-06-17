import { v4 as uuidv4 } from 'uuid';
const rooms = new Map();
export function createRoom() {
    const id = generateRoomCode();
    const defaultCategoryId = uuidv4();
    const room = {
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
export function joinRoom(roomId, userId, nickname) {
    const room = rooms.get(roomId);
    if (!room)
        return null;
    room.users.set(userId, { id: userId, nickname, joinedAt: Date.now() });
    addLog(room, userId, nickname, '加入了房间');
    return room;
}
export function leaveRoom(roomId, userId) {
    const room = rooms.get(roomId);
    if (!room)
        return false;
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
export function getRoom(roomId) {
    return rooms.get(roomId) || null;
}
export function addCategory(roomId, name) {
    const room = rooms.get(roomId);
    if (!room)
        return null;
    if (room.categories.size >= 20)
        return null;
    const id = uuidv4();
    const category = { id, name, cardIds: [] };
    room.categories.set(id, category);
    return category;
}
export function removeCategory(roomId, categoryId) {
    const room = rooms.get(roomId);
    if (!room)
        return false;
    const category = room.categories.get(categoryId);
    if (!category)
        return false;
    for (const cardId of category.cardIds) {
        room.cards.delete(cardId);
    }
    room.categories.delete(categoryId);
    return true;
}
export function addCard(roomId, categoryId, userId) {
    const room = rooms.get(roomId);
    if (!room)
        return null;
    if (room.cards.size >= 100)
        return null;
    const category = room.categories.get(categoryId);
    if (!category)
        return null;
    const id = uuidv4();
    const card = {
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
export function updateCard(roomId, cardId, updates, userId) {
    const room = rooms.get(roomId);
    if (!room)
        return null;
    const card = room.cards.get(cardId);
    if (!card)
        return null;
    if (updates.title !== undefined)
        card.title = updates.title.slice(0, 50);
    if (updates.tags !== undefined)
        card.tags = updates.tags.slice(0, 3);
    if (updates.note !== undefined)
        card.note = updates.note.slice(0, 200);
    const user = room.users.get(userId);
    const actionParts = [];
    if (updates.title !== undefined)
        actionParts.push('修改了标题');
    if (updates.tags !== undefined)
        actionParts.push('修改了标签');
    if (updates.note !== undefined)
        actionParts.push('修改了备注');
    if (actionParts.length > 0) {
        addLog(room, userId, user?.nickname || '未知', `${actionParts.join('、')}「${card.title}」`);
    }
    return card;
}
export function moveCard(roomId, cardId, targetCategoryId, targetIndex, userId) {
    const room = rooms.get(roomId);
    if (!room)
        return null;
    const card = room.cards.get(cardId);
    if (!card)
        return null;
    const sourceCategory = room.categories.get(card.categoryId);
    const targetCategory = room.categories.get(targetCategoryId);
    if (!sourceCategory || !targetCategory)
        return null;
    sourceCategory.cardIds = sourceCategory.cardIds.filter((id) => id !== cardId);
    const clampedIndex = Math.min(targetIndex, targetCategory.cardIds.length);
    targetCategory.cardIds.splice(clampedIndex, 0, cardId);
    card.categoryId = targetCategoryId;
    const user = room.users.get(userId);
    addLog(room, userId, user?.nickname || '未知', `移动了卡片「${card.title}」到分类「${targetCategory.name}」`);
    return card;
}
export function deleteCard(roomId, cardId, userId) {
    const room = rooms.get(roomId);
    if (!room)
        return false;
    const card = room.cards.get(cardId);
    if (!card)
        return false;
    const category = room.categories.get(card.categoryId);
    if (category) {
        category.cardIds = category.cardIds.filter((id) => id !== cardId);
    }
    room.cards.delete(cardId);
    const user = room.users.get(userId);
    addLog(room, userId, user?.nickname || '未知', `删除了卡片「${card.title}」`);
    return true;
}
export function getRoomState(roomId) {
    const room = rooms.get(roomId);
    if (!room)
        return null;
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
function addLog(room, userId, nickname, action) {
    const entry = {
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
function generateRoomCode() {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    let code = '';
    for (let i = 0; i < 6; i++) {
        code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    if (rooms.has(code))
        return generateRoomCode();
    return code;
}
