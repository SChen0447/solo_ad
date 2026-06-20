import { WebSocketServer, WebSocket } from 'ws';
import { randomBytes } from 'crypto';

interface Participant {
  id: string;
  name: string;
  avatar: string;
}

interface CardData {
  id: string;
  title: string;
  description: string;
  assignee: string;
  priority: 'high' | 'medium' | 'low';
  columnId: string;
  order: number;
  createdAt: number;
  lockedBy?: string;
}

interface RoomState {
  roomId: string;
  participants: Map<string, Participant>;
  cards: Map<string, CardData>;
  clients: Map<string, WebSocket>;
}

interface WSMessage {
  type: string;
  payload: any;
  clientId?: string;
}

const rooms = new Map<string, RoomState>();

const generateRoomId = (): string => {
  return randomBytes(3).toString('hex').toUpperCase();
};

const generateClientId = (): string => {
  return randomBytes(8).toString('hex');
};

const generateCardId = (): string => {
  return 'card_' + randomBytes(6).toString('hex');
};

const broadcastToRoom = (room: RoomState, message: WSMessage, excludeClientId?: string) => {
  const data = JSON.stringify(message);
  room.clients.forEach((ws, clientId) => {
    if (clientId !== excludeClientId && ws.readyState === WebSocket.OPEN) {
      ws.send(data);
    }
  });
};

const getCardsArray = (room: RoomState): CardData[] => {
  return Array.from(room.cards.values()).sort((a, b) => a.order - b.order);
};

const getParticipantsArray = (room: RoomState): Participant[] => {
  return Array.from(room.participants.values());
};

const wss = new WebSocketServer({ port: 8080 });

console.log('WebSocket server running on ws://localhost:8080');

wss.on('connection', (ws) => {
  const clientId = generateClientId();
  let currentRoomId: string | null = null;

  ws.on('message', (data) => {
    try {
      const message: WSMessage = JSON.parse(data.toString());
      handleMessage(ws, clientId, message);
    } catch (e) {
      console.error('Error parsing message:', e);
    }
  });

  ws.on('close', () => {
    if (currentRoomId) {
      const room = rooms.get(currentRoomId);
      if (room) {
        room.clients.delete(clientId);
        room.participants.delete(clientId);

        room.cards.forEach((card) => {
          if (card.lockedBy === clientId) {
            card.lockedBy = undefined;
          }
        });

        if (room.clients.size === 0) {
          rooms.delete(currentRoomId);
        } else {
          broadcastToRoom(room, {
            type: 'participants_updated',
            payload: getParticipantsArray(room)
          });
          broadcastToRoom(room, {
            type: 'cards_updated',
            payload: getCardsArray(room)
          });
        }
      }
    }
  });
});

function handleMessage(ws: WebSocket, clientId: string, message: WSMessage) {
  const { type, payload } = message;

  switch (type) {
    case 'create_room':
      handleCreateRoom(ws, clientId, payload);
      break;
    case 'join_room':
      handleJoinRoom(ws, clientId, payload);
      break;
    case 'leave_room':
      handleLeaveRoom(ws, clientId);
      break;
    case 'add_card':
      handleAddCard(clientId, payload);
      break;
    case 'update_card':
      handleUpdateCard(clientId, payload);
      break;
    case 'move_card':
      handleMoveCard(clientId, payload);
      break;
    case 'delete_card':
      handleDeleteCard(clientId, payload);
      break;
    case 'lock_card':
      handleLockCard(clientId, payload);
      break;
    case 'unlock_card':
      handleUnlockCard(clientId, payload);
      break;
  }
}

function handleCreateRoom(ws: WebSocket, clientId: string, payload: { name: string; avatar: string }) {
  const roomId = generateRoomId();
  const room: RoomState = {
    roomId,
    participants: new Map(),
    cards: new Map(),
    clients: new Map()
  };

  const participant: Participant = {
    id: clientId,
    name: payload.name,
    avatar: payload.avatar
  };

  room.participants.set(clientId, participant);
  room.clients.set(clientId, ws);
  rooms.set(roomId, room);

  ws.send(JSON.stringify({
    type: 'room_created',
    payload: {
      roomId,
      clientId,
      participant
    }
  }));
}

function handleJoinRoom(ws: WebSocket, clientId: string, payload: { roomId: string; name: string; avatar: string }) {
  const room = rooms.get(payload.roomId.toUpperCase());
  if (!room) {
    ws.send(JSON.stringify({
      type: 'error',
      payload: { message: '会议室不存在' }
    }));
    return;
  }

  const participant: Participant = {
    id: clientId,
    name: payload.name,
    avatar: payload.avatar
  };

  room.participants.set(clientId, participant);
  room.clients.set(clientId, ws);

  ws.send(JSON.stringify({
    type: 'room_joined',
    payload: {
      roomId: room.roomId,
      clientId,
      participant,
      participants: getParticipantsArray(room),
      cards: getCardsArray(room)
    }
  }));

  broadcastToRoom(room, {
    type: 'participants_updated',
    payload: getParticipantsArray(room)
  }, clientId);
}

function handleLeaveRoom(ws: WebSocket, clientId: string) {
  // handled by close event
}

function handleAddCard(clientId: string, payload: { roomId: string; columnId: string; title: string }) {
  const room = rooms.get(payload.roomId.toUpperCase());
  if (!room) return;

  const columnCards = Array.from(room.cards.values())
    .filter(c => c.columnId === payload.columnId)
    .sort((a, b) => a.order - b.order);

  const maxOrder = columnCards.length > 0 ? columnCards[columnCards.length - 1].order : 0;

  const card: CardData = {
    id: generateCardId(),
    title: payload.title,
    description: '',
    assignee: '',
    priority: 'medium',
    columnId: payload.columnId,
    order: maxOrder + 1,
    createdAt: Date.now()
  };

  room.cards.set(card.id, card);

  const message = {
    type: 'cards_updated',
    payload: getCardsArray(room)
  };

  broadcastToRoom(room, message);
}

function handleUpdateCard(clientId: string, payload: { roomId: string; cardId: string; updates: Partial<CardData> }) {
  const room = rooms.get(payload.roomId.toUpperCase());
  if (!room) return;

  const card = room.cards.get(payload.cardId);
  if (!card) return;

  if (card.lockedBy && card.lockedBy !== clientId) {
    const clientWs = room.clients.get(clientId);
    if (clientWs) {
      clientWs.send(JSON.stringify({
        type: 'error',
        payload: { message: '卡片正在被其他用户编辑' }
      }));
    }
    return;
  }

  Object.assign(card, payload.updates);
  card.lockedBy = undefined;

  const message = {
    type: 'cards_updated',
    payload: getCardsArray(room)
  };

  broadcastToRoom(room, message);
}

function handleMoveCard(clientId: string, payload: {
  roomId: string;
  cardId: string;
  toColumnId: string;
  toIndex: number;
}) {
  const room = rooms.get(payload.roomId.toUpperCase());
  if (!room) return;

  const card = room.cards.get(payload.cardId);
  if (!card) return;

  card.columnId = payload.toColumnId;

  const targetColumnCards = Array.from(room.cards.values())
    .filter(c => c.columnId === payload.toColumnId && c.id !== payload.cardId)
    .sort((a, b) => a.order - b.order);

  targetColumnCards.splice(payload.toIndex, 0, card);

  targetColumnCards.forEach((c, index) => {
    c.order = index + 1;
  });

  const message = {
    type: 'cards_updated',
    payload: getCardsArray(room)
  };

  broadcastToRoom(room, message);
}

function handleDeleteCard(clientId: string, payload: { roomId: string; cardId: string }) {
  const room = rooms.get(payload.roomId.toUpperCase());
  if (!room) return;

  room.cards.delete(payload.cardId);

  const message = {
    type: 'cards_updated',
    payload: getCardsArray(room)
  };

  broadcastToRoom(room, message);
}

function handleLockCard(clientId: string, payload: { roomId: string; cardId: string }) {
  const room = rooms.get(payload.roomId.toUpperCase());
  if (!room) return;

  const card = room.cards.get(payload.cardId);
  if (!card) return;

  if (card.lockedBy && card.lockedBy !== clientId) {
    const clientWs = room.clients.get(clientId);
    if (clientWs) {
      clientWs.send(JSON.stringify({
        type: 'card_locked',
        payload: { cardId: card.id, lockedBy: card.lockedBy }
      }));
    }
    return;
  }

  card.lockedBy = clientId;

  const message = {
    type: 'card_lock_changed',
    payload: { cardId: card.id, lockedBy: clientId }
  };

  broadcastToRoom(room, message);
}

function handleUnlockCard(clientId: string, payload: { roomId: string; cardId: string }) {
  const room = rooms.get(payload.roomId.toUpperCase());
  if (!room) return;

  const card = room.cards.get(payload.cardId);
  if (!card) return;

  if (card.lockedBy === clientId) {
    card.lockedBy = undefined;

    const message = {
      type: 'card_lock_changed',
      payload: { cardId: card.id, lockedBy: undefined }
    };

    broadcastToRoom(room, message);
  }
}
