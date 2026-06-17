import express from 'express';
import http from 'http';
import { WebSocketServer, WebSocket } from 'ws';
import cors from 'cors';
import { v4 as uuidv4 } from 'uuid';
import { roomManager, Card, Category, LogEntry } from './roomManager.js';

const app = express();
const server = http.createServer(app);
const wss = new WebSocketServer({ server, path: '/ws' });

const PORT = 3001;

app.use(cors());
app.use(express.json());

interface ClientConnection {
  ws: WebSocket;
  roomId: string | null;
  userId: string;
  nickname: string;
}

const clients = new Map<string, ClientConnection>();

type WSMessageType =
  | 'join_room'
  | 'create_room'
  | 'leave_room'
  | 'add_card'
  | 'update_card'
  | 'move_card'
  | 'delete_card'
  | 'add_category'
  | 'update_category'
  | 'delete_category'
  | 'get_state'
  | 'ping';

type WSResponseType =
  | 'room_created'
  | 'room_joined'
  | 'room_state'
  | 'card_added'
  | 'card_updated'
  | 'card_moved'
  | 'card_deleted'
  | 'category_added'
  | 'category_updated'
  | 'category_deleted'
  | 'users_updated'
  | 'log_added'
  | 'error'
  | 'pong';

interface WSMessage {
  type: WSMessageType;
  payload?: any;
  requestId?: string;
}

interface WSResponse {
  type: WSResponseType;
  payload?: any;
  requestId?: string;
  timestamp: number;
}

function sendToClient(ws: WebSocket, type: WSResponseType, payload?: any, requestId?: string) {
  if (ws.readyState === WebSocket.OPEN) {
    const response: WSResponse = {
      type,
      payload,
      requestId,
      timestamp: Date.now(),
    };
    ws.send(JSON.stringify(response));
  }
}

function broadcastToRoom(roomId: string, type: WSResponseType, payload?: any, excludeUserId?: string) {
  const state = roomManager.getRoomState(roomId);
  if (!state) return;

  for (const [clientId, client] of clients) {
    if (client.roomId === roomId && clientId !== excludeUserId) {
      sendToClient(client.ws, type, payload);
    }
  }
}

function sendRoomState(ws: WebSocket, roomId: string, requestId?: string) {
  const state = roomManager.serializeRoomState(roomId);
  if (state) {
    sendToClient(ws, 'room_state', state, requestId);
  }
}

function broadcastRoomState(roomId: string, excludeUserId?: string) {
  const state = roomManager.serializeRoomState(roomId);
  if (!state) return;

  for (const [clientId, client] of clients) {
    if (client.roomId === roomId && clientId !== excludeUserId) {
      sendToClient(client.ws, 'room_state', state);
    }
  }
}

function broadcastUsersUpdate(roomId: string) {
  const users = roomManager.getUsers(roomId).map((u) => ({ id: u.id, nickname: u.nickname }));
  broadcastToRoom(roomId, 'users_updated', { users });
}

function broadcastLatestLog(roomId: string) {
  const logs = roomManager.getLogs(roomId, 1);
  if (logs.length > 0) {
    broadcastToRoom(roomId, 'log_added', { log: logs[0] });
  }
}

wss.on('connection', (ws: WebSocket) => {
  const clientId = uuidv4();
  const connection: ClientConnection = {
    ws,
    roomId: null,
    userId: clientId,
    nickname: '',
  };
  clients.set(clientId, connection);

  ws.on('message', (data) => {
    try {
      const message: WSMessage = JSON.parse(data.toString());
      handleMessage(clientId, message);
    } catch (err) {
      sendToClient(ws, 'error', { message: 'Invalid message format' });
    }
  });

  ws.on('close', () => {
    const client = clients.get(clientId);
    if (client && client.roomId) {
      roomManager.leaveRoom(client.roomId, client.userId);
      broadcastRoomState(client.roomId);
      broadcastUsersUpdate(client.roomId);
      broadcastLatestLog(client.roomId);
    }
    clients.delete(clientId);
  });

  ws.on('error', (err) => {
    console.error(`WebSocket error for client ${clientId}:`, err);
  });
});

function handleMessage(clientId: string, message: WSMessage) {
  const client = clients.get(clientId);
  if (!client) return;

  const { ws } = client;
  const { type, payload, requestId } = message;

  switch (type) {
    case 'ping':
      sendToClient(ws, 'pong', undefined, requestId);
      break;

    case 'create_room': {
      const nickname = (payload?.nickname || '匿名用户').toString().substring(0, 20);
      const roomId = roomManager.createRoom();
      client.nickname = nickname;
      client.roomId = roomId;

      const result = roomManager.joinRoom(roomId, client.userId, nickname);
      if (result) {
        sendToClient(ws, 'room_created', { roomId, userId: client.userId, nickname }, requestId);
        sendRoomState(ws, roomId);
      }
      break;
    }

    case 'join_room': {
      const roomId = (payload?.roomId || '').toString().toUpperCase();
      const nickname = (payload?.nickname || '匿名用户').toString().substring(0, 20);

      if (!roomManager.roomExists(roomId)) {
        sendToClient(ws, 'error', { message: '房间不存在' }, requestId);
        return;
      }

      if (client.roomId && client.roomId !== roomId) {
        roomManager.leaveRoom(client.roomId, client.userId);
        broadcastUsersUpdate(client.roomId);
        broadcastLatestLog(client.roomId);
      }

      client.nickname = nickname;
      client.roomId = roomId;

      const result = roomManager.joinRoom(roomId, client.userId, nickname);
      if (result) {
        sendToClient(ws, 'room_joined', { roomId, userId: client.userId, nickname }, requestId);
        sendRoomState(ws, roomId);
        broadcastRoomState(roomId, clientId);
        broadcastUsersUpdate(roomId);
        broadcastLatestLog(roomId);
      }
      break;
    }

    case 'leave_room': {
      if (client.roomId) {
        const roomId = client.roomId;
        roomManager.leaveRoom(roomId, client.userId);
        client.roomId = null;
        broadcastRoomState(roomId);
        broadcastUsersUpdate(roomId);
        broadcastLatestLog(roomId);
      }
      break;
    }

    case 'get_state': {
      if (client.roomId) {
        sendRoomState(ws, client.roomId, requestId);
      }
      break;
    }

    case 'add_card': {
      if (!client.roomId) {
        sendToClient(ws, 'error', { message: '未加入房间' }, requestId);
        return;
      }
      const categoryId = (payload?.categoryId || '').toString();
      const card = roomManager.addCard(client.roomId, categoryId, client.userId, client.nickname);
      if (card) {
        broadcastRoomState(client.roomId);
        broadcastLatestLog(client.roomId);
      } else {
        sendToClient(ws, 'error', { message: '创建卡片失败' }, requestId);
      }
      break;
    }

    case 'update_card': {
      if (!client.roomId) {
        sendToClient(ws, 'error', { message: '未加入房间' }, requestId);
        return;
      }
      const cardId = (payload?.cardId || '').toString();
      const updates = payload?.updates || {};
      const card = roomManager.updateCard(client.roomId, cardId, updates, client.nickname);
      if (card) {
        broadcastRoomState(client.roomId);
        broadcastLatestLog(client.roomId);
      } else {
        sendToClient(ws, 'error', { message: '更新卡片失败' }, requestId);
      }
      break;
    }

    case 'move_card': {
      if (!client.roomId) {
        sendToClient(ws, 'error', { message: '未加入房间' }, requestId);
        return;
      }
      const cardId = (payload?.cardId || '').toString();
      const newCategoryId = (payload?.newCategoryId || '').toString();
      const newPosition = typeof payload?.newPosition === 'number' ? payload.newPosition : 0;
      const card = roomManager.moveCard(client.roomId, cardId, newCategoryId, newPosition, client.nickname);
      if (card) {
        broadcastRoomState(client.roomId);
        broadcastLatestLog(client.roomId);
      } else {
        sendToClient(ws, 'error', { message: '移动卡片失败' }, requestId);
      }
      break;
    }

    case 'delete_card': {
      if (!client.roomId) {
        sendToClient(ws, 'error', { message: '未加入房间' }, requestId);
        return;
      }
      const cardId = (payload?.cardId || '').toString();
      const success = roomManager.deleteCard(client.roomId, cardId, client.nickname);
      if (success) {
        broadcastRoomState(client.roomId);
        broadcastLatestLog(client.roomId);
      } else {
        sendToClient(ws, 'error', { message: '删除卡片失败' }, requestId);
      }
      break;
    }

    case 'add_category': {
      if (!client.roomId) {
        sendToClient(ws, 'error', { message: '未加入房间' }, requestId);
        return;
      }
      const name = (payload?.name || '新分类').toString();
      const category = roomManager.addCategory(client.roomId, name, client.nickname);
      if (category) {
        broadcastRoomState(client.roomId);
        broadcastLatestLog(client.roomId);
      } else {
        sendToClient(ws, 'error', { message: '创建分类失败（最多20个）' }, requestId);
      }
      break;
    }

    case 'update_category': {
      if (!client.roomId) {
        sendToClient(ws, 'error', { message: '未加入房间' }, requestId);
        return;
      }
      const categoryId = (payload?.categoryId || '').toString();
      const name = (payload?.name || '').toString();
      const category = roomManager.updateCategory(client.roomId, categoryId, name, client.nickname);
      if (category) {
        broadcastRoomState(client.roomId);
        broadcastLatestLog(client.roomId);
      } else {
        sendToClient(ws, 'error', { message: '更新分类失败' }, requestId);
      }
      break;
    }

    case 'delete_category': {
      if (!client.roomId) {
        sendToClient(ws, 'error', { message: '未加入房间' }, requestId);
        return;
      }
      const categoryId = (payload?.categoryId || '').toString();
      const success = roomManager.deleteCategory(client.roomId, categoryId, client.nickname);
      if (success) {
        broadcastRoomState(client.roomId);
        broadcastLatestLog(client.roomId);
      } else {
        sendToClient(ws, 'error', { message: '删除分类失败（至少保留1个）' }, requestId);
      }
      break;
    }

    default:
      sendToClient(ws, 'error', { message: `Unknown message type: ${type}` }, requestId);
  }
}

app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: Date.now() });
});

app.get('/api/room/:roomId', (req, res) => {
  const roomId = req.params.roomId.toUpperCase();
  const state = roomManager.serializeRoomState(roomId);
  if (state) {
    res.json(state);
  } else {
    res.status(404).json({ error: 'Room not found' });
  }
});

app.get('/api/rooms', (_req, res) => {
  const rooms: any[] = [];
  wss.clients.forEach((client) => {
    const conn = Array.from(clients.values()).find((c) => c.ws === client);
    if (conn?.roomId) {
      const existing = rooms.find((r) => r.roomId === conn.roomId);
      if (existing) {
        existing.userCount++;
      } else {
        rooms.push({ roomId: conn.roomId, userCount: 1 });
      }
    }
  });
  res.json(rooms);
});

server.listen(PORT, () => {
  console.log(`Co-Brainstorm server is running on http://localhost:${PORT}`);
  console.log(`WebSocket path: ws://localhost:${PORT}/ws`);
});

process.on('SIGINT', () => {
  console.log('Shutting down server...');
  wss.close();
  server.close(() => {
    process.exit(0);
  });
});
