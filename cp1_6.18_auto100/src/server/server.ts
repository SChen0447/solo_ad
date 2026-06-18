import express, { Request, Response } from 'express';
import http from 'http';
import { WebSocketServer, WebSocket } from 'ws';
import cors from 'cors';
import { roomManager, ScoreState, User } from './roomManager.js';

const app = express();
app.use(cors());
app.use(express.json());

app.get('/api/health', (_req: Request, res: Response) => {
  res.json({ status: 'ok', timestamp: Date.now() });
});

app.post('/api/rooms', (_req: Request, res: Response) => {
  const room = roomManager.createRoom();
  res.json({ roomId: room.id });
});

const server = http.createServer(app);
const wss = new WebSocketServer({ server, path: '/ws' });

interface WSMessage {
  type: string;
  payload: any;
  userId?: string;
}

interface ExtendedWS extends WebSocket {
  userId?: string;
  roomId?: string;
}

function broadcastToRoom(roomId: string, message: WSMessage, excludeId?: string) {
  wss.clients.forEach((client) => {
    const ext = client as ExtendedWS;
    if (
      client.readyState === WebSocket.OPEN &&
      ext.roomId === roomId &&
      ext.userId !== excludeId
    ) {
      client.send(JSON.stringify(message));
    }
  });
}

function serializeUsers(room: ReturnType<typeof roomManager.getRoom>) {
  if (!room) return [];
  const users: User[] = [];
  room.users.forEach((u) => users.push(u));
  return users;
}

wss.on('connection', (ws: ExtendedWS) => {
  ws.on('message', (raw) => {
    try {
      const msg: WSMessage = JSON.parse(raw.toString());

      if (msg.type === 'join') {
        const { roomId, userName } = msg.payload;
        const result = roomManager.join(roomId, userName);
        if (!result) {
          ws.send(JSON.stringify({ type: 'error', payload: { message: '加入房间失败' } }));
          return;
        }
        ws.userId = result.user.id;
        ws.roomId = roomId;
        ws.send(
          JSON.stringify({
            type: 'joined',
            payload: {
              user: result.user,
              roomId,
              score: result.room.score,
              users: serializeUsers(result.room),
            },
          })
        );
        broadcastToRoom(
          roomId,
          {
            type: 'userJoined',
            payload: { user: result.user, users: serializeUsers(result.room) },
          },
          result.user.id
        );
        return;
      }

      if (!ws.userId || !ws.roomId) return;

      switch (msg.type) {
        case 'cursor': {
          const room = roomManager.updateCursor(ws.userId, msg.payload.cursor);
          if (room) {
            const user = room.users.get(ws.userId);
            broadcastToRoom(
              ws.roomId,
              {
                type: 'cursorUpdate',
                payload: { userId: ws.userId, cursor: msg.payload.cursor, user },
              },
              ws.userId
            );
          }
          break;
        }
        case 'scoreUpdate': {
          const score: ScoreState = msg.payload.score;
          const room = roomManager.updateScore(ws.userId, score);
          if (room) {
            broadcastToRoom(
              ws.roomId,
              {
                type: 'scoreUpdate',
                payload: { score, fromUserId: ws.userId },
              },
              ws.userId
            );
          }
          break;
        }
      }
    } catch (e) {
      console.error('WS parse error:', e);
    }
  });

  ws.on('close', () => {
    if (!ws.userId) return;
    const result = roomManager.leave(ws.userId);
    if (result) {
      broadcastToRoom(result.roomId, {
        type: 'userLeft',
        payload: { userId: result.user.id, users: serializeUsers(result.room), leftUser: result.user },
      });
    }
  });
});

const PORT = process.env.PORT || 3001;
server.listen(PORT, () => {
  console.log(`CollabScore server listening on port ${PORT}`);
  console.log(`WebSocket path: ws://localhost:${PORT}/ws`);
  console.log(`Health check: http://localhost:${PORT}/api/health`);
});
