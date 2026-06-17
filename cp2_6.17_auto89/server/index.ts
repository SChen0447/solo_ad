import express from 'express';
import { createServer } from 'http';
import { WebSocketServer, WebSocket } from 'ws';
import { v4 as uuidv4 } from 'uuid';
import cors from 'cors';
import {
  createRoom,
  joinRoom,
  leaveRoom,
  getRoom,
  addCategory,
  removeCategory,
  addCard,
  updateCard,
  moveCard,
  deleteCard,
  getRoomState,
} from './roomManager.js';

const app = express();
app.use(cors());
app.use(express.json());

const server = createServer(app);

const wss = new WebSocketServer({ server, path: '/ws' });

const clientRooms = new Map<WebSocket, { roomId: string; userId: string }>();

app.post('/api/rooms', (_req, res) => {
  const roomId = createRoom();
  res.json({ roomId });
});

app.get('/api/rooms/:roomId', (req, res) => {
  const room = getRoomState(req.params.roomId);
  if (!room) {
    res.status(404).json({ error: '房间不存在' });
    return;
  }
  res.json(room);
});

wss.on('connection', (ws) => {
  ws.on('message', (raw) => {
    try {
      const msg = JSON.parse(raw.toString());
      handleMessage(ws, msg);
    } catch {
      ws.send(JSON.stringify({ type: 'error', message: '无效消息格式' }));
    }
  });

  ws.on('close', () => {
    const info = clientRooms.get(ws);
    if (info) {
      leaveRoom(info.roomId, info.userId);
      broadcastToRoom(info.roomId, {
        type: 'user_left',
        userId: info.userId,
        roomState: getRoomState(info.roomId),
      });
      clientRooms.delete(ws);
    }
  });
});

function handleMessage(ws: WebSocket, msg: any): void {
  const { type } = msg;

  switch (type) {
    case 'join': {
      const { roomId, nickname } = msg;
      const userId = uuidv4();
      const room = joinRoom(roomId, userId, nickname);
      if (!room) {
        ws.send(JSON.stringify({ type: 'error', message: '房间不存在' }));
        return;
      }
      clientRooms.set(ws, { roomId, userId });
      ws.send(
        JSON.stringify({
          type: 'joined',
          userId,
          roomState: getRoomState(roomId),
        })
      );
      broadcastToRoom(roomId, {
        type: 'user_joined',
        userId,
        nickname,
        roomState: getRoomState(roomId),
      }, ws);
      break;
    }

    case 'add_category': {
      const info = clientRooms.get(ws);
      if (!info) return;
      const { name } = msg;
      if (!name || name.length > 10) return;
      const category = addCategory(info.roomId, name);
      if (category) {
        broadcastToRoom(info.roomId, {
          type: 'category_added',
          category,
          roomState: getRoomState(info.roomId),
        });
      }
      break;
    }

    case 'remove_category': {
      const info = clientRooms.get(ws);
      if (!info) return;
      const { categoryId } = msg;
      if (removeCategory(info.roomId, categoryId)) {
        broadcastToRoom(info.roomId, {
          type: 'category_removed',
          categoryId,
          roomState: getRoomState(info.roomId),
        });
      }
      break;
    }

    case 'add_card': {
      const info = clientRooms.get(ws);
      if (!info) return;
      const { categoryId } = msg;
      const card = addCard(info.roomId, categoryId, info.userId);
      if (card) {
        broadcastToRoom(info.roomId, {
          type: 'card_added',
          card,
          roomState: getRoomState(info.roomId),
        });
      }
      break;
    }

    case 'update_card': {
      const info = clientRooms.get(ws);
      if (!info) return;
      const { cardId, updates } = msg;
      const card = updateCard(info.roomId, cardId, updates, info.userId);
      if (card) {
        broadcastToRoom(info.roomId, {
          type: 'card_updated',
          card,
          roomState: getRoomState(info.roomId),
        });
      }
      break;
    }

    case 'move_card': {
      const info = clientRooms.get(ws);
      if (!info) return;
      const { cardId, targetCategoryId, targetIndex } = msg;
      const card = moveCard(info.roomId, cardId, targetCategoryId, targetIndex, info.userId);
      if (card) {
        broadcastToRoom(info.roomId, {
          type: 'card_moved',
          card,
          roomState: getRoomState(info.roomId),
        });
      }
      break;
    }

    case 'delete_card': {
      const info = clientRooms.get(ws);
      if (!info) return;
      const { cardId } = msg;
      if (deleteCard(info.roomId, cardId, info.userId)) {
        broadcastToRoom(info.roomId, {
          type: 'card_deleted',
          cardId,
          roomState: getRoomState(info.roomId),
        });
      }
      break;
    }
  }
}

function broadcastToRoom(roomId: string, message: any, exclude?: WebSocket): void {
  const data = JSON.stringify(message);
  wss.clients.forEach((client) => {
    if (client.readyState !== WebSocket.OPEN) return;
    const info = clientRooms.get(client);
    if (!info || info.roomId !== roomId) return;
    if (client === exclude) return;
    client.send(data);
  });
}

const PORT = 3001;
server.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
