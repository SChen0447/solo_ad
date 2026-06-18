import express from 'express';
import cors from 'cors';
import { createServer } from 'http';
import { WebSocketServer, WebSocket } from 'ws';
import { RoomManager } from './roomManager.js';

const app = express();
const server = createServer(app);
const wss = new WebSocketServer({ server, path: '/ws' });

app.use(cors());
app.use(express.json());

const roomManager = new RoomManager();

const clientRooms = new Map<WebSocket, string>();
const clientUsers = new Map<WebSocket, string>();

app.post('/api/rooms', (req, res) => {
  const { userId, nickname, emoji, avatarColor } = req.body;
  if (!userId || !nickname) {
    res.status(400).json({ error: 'Missing required fields' });
    return;
  }
  const room = roomManager.createRoom(userId, nickname, emoji || '🎭', avatarColor || '#FF6B6B');
  res.json(room);
});

app.post('/api/rooms/:roomId/join', (req, res) => {
  const { roomId } = req.params;
  const { userId, nickname, emoji, avatarColor } = req.body;
  const room = roomManager.joinRoom(roomId, userId, nickname, emoji || '🎭', avatarColor || '#FF6B6B');
  if (!room) {
    res.status(404).json({ error: 'Room not found or full' });
    return;
  }
  res.json(room);
});

app.get('/api/rooms/:roomId', (req, res) => {
  const room = roomManager.getRoom(req.params.roomId);
  if (!room) {
    res.status(404).json({ error: 'Room not found' });
    return;
  }
  res.json(room);
});

function broadcastToRoom(roomId: string, message: Record<string, unknown>) {
  const data = JSON.stringify(message);
  wss.clients.forEach((client) => {
    if (client.readyState === WebSocket.OPEN && clientRooms.get(client) === roomId) {
      client.send(data);
    }
  });
}

wss.on('connection', (ws) => {
  console.log('Client connected');

  ws.on('message', (raw) => {
    try {
      const msg = JSON.parse(raw.toString());

      switch (msg.type) {
        case 'create_room': {
          const { userId, nickname, emoji, avatarColor } = msg.payload;
          const room = roomManager.createRoom(userId, nickname, emoji, avatarColor);
          clientRooms.set(ws, room.id);
          clientUsers.set(ws, userId);
          ws.send(JSON.stringify({ type: 'room_state', payload: room }));
          break;
        }

        case 'join_room': {
          const { roomId, userId, nickname, emoji, avatarColor } = msg.payload;
          const room = roomManager.joinRoom(roomId, userId, nickname, emoji, avatarColor);
          if (!room) {
            ws.send(JSON.stringify({ type: 'error', payload: { message: 'Room not found or full' } }));
            return;
          }
          clientRooms.set(ws, roomId);
          clientUsers.set(ws, userId);
          broadcastToRoom(roomId, { type: 'room_state', payload: room });
          break;
        }

        case 'start_game': {
          const { roomId } = msg.payload;
          const result = roomManager.startGame(roomId);
          if (!result) {
            ws.send(JSON.stringify({ type: 'error', payload: { message: 'Cannot start game' } }));
            return;
          }
          broadcastToRoom(roomId, { type: 'room_state', payload: result.room });
          setTimeout(() => {
            const currentRoom = roomManager.getRoom(roomId);
            if (currentRoom && currentRoom.phase === 'playing') {
              broadcastToRoom(roomId, {
                type: 'new_turn',
                payload: {
                  userId: currentRoom.currentTurnUserId,
                  round: currentRoom.currentRound,
                  turnIndex: currentRoom.turnIndex,
                  countdown: currentRoom.countdown,
                },
              });
            }
          }, 2000);
          startCountdown(roomId);
          break;
        }

        case 'submit_line': {
          const { roomId, userId, content } = msg.payload;
          const line = roomManager.submitLine(roomId, userId, content);
          if (!line) {
            ws.send(JSON.stringify({ type: 'error', payload: { message: 'Cannot submit line' } }));
            return;
          }

          const currentRoom = roomManager.getRoom(roomId)!;
          broadcastToRoom(roomId, { type: 'line_added', payload: line });

          if (currentRoom.phase === 'finished') {
            broadcastToRoom(roomId, { type: 'game_finished', payload: {} });
            broadcastToRoom(roomId, { type: 'room_state', payload: currentRoom });
          } else {
            broadcastToRoom(roomId, {
              type: 'new_turn',
              payload: {
                userId: currentRoom.currentTurnUserId,
                round: currentRoom.currentRound,
                turnIndex: currentRoom.turnIndex,
                countdown: currentRoom.countdown,
              },
            });
            startCountdown(roomId);
          }
          break;
        }

        case 'leave_room': {
          const { roomId, userId } = msg.payload;
          roomManager.leaveRoom(roomId, userId);
          clientRooms.delete(ws);
          clientUsers.delete(ws);
          broadcastToRoom(roomId, {
            type: 'user_left',
            payload: { roomId, userId },
          });
          break;
        }

        case 'ping': {
          break;
        }
      }
    } catch (err) {
      console.error('Failed to handle message:', err);
    }
  });

  ws.on('close', () => {
    const roomId = clientRooms.get(ws);
    const userId = clientUsers.get(ws);
    if (roomId && userId) {
      roomManager.leaveRoom(roomId, userId);
      broadcastToRoom(roomId, {
        type: 'user_left',
        payload: { roomId, userId },
      });
    }
    clientRooms.delete(ws);
    clientUsers.delete(ws);
    console.log('Client disconnected');
  });
});

const countdownTimers = new Map<string, ReturnType<typeof setInterval>>();

function startCountdown(roomId: string) {
  if (countdownTimers.has(roomId)) {
    clearInterval(countdownTimers.get(roomId)!);
  }

  const interval = setInterval(() => {
    const room = roomManager.getRoom(roomId);
    if (!room || room.phase !== 'playing') {
      clearInterval(interval);
      countdownTimers.delete(roomId);
      return;
    }

    const newCountdown = Math.max(0, room.countdown - 0.1);
    roomManager.updateCountdown(roomId, newCountdown);

    broadcastToRoom(roomId, {
      type: 'countdown_tick',
      payload: { value: Math.round(newCountdown * 10) / 10 },
    });

    if (newCountdown <= 0) {
      clearInterval(interval);
      countdownTimers.delete(roomId);

      const autoLine = roomManager.handleTimeout(roomId);
      if (autoLine) {
        const currentRoom = roomManager.getRoom(roomId)!;
        broadcastToRoom(roomId, { type: 'line_added', payload: autoLine });

        if (currentRoom.phase === 'finished') {
          broadcastToRoom(roomId, { type: 'game_finished', payload: {} });
          broadcastToRoom(roomId, { type: 'room_state', payload: currentRoom });
        } else {
          broadcastToRoom(roomId, {
            type: 'new_turn',
            payload: {
              userId: currentRoom.currentTurnUserId,
              round: currentRoom.currentRound,
              turnIndex: currentRoom.turnIndex,
              countdown: currentRoom.countdown,
            },
          });
          startCountdown(roomId);
        }
      }
    }
  }, 100);

  countdownTimers.set(roomId, interval);
}

const PORT = 4000;
server.listen(PORT, () => {
  console.log(`🚀 可觅服务器运行在 http://localhost:${PORT}`);
  console.log(`📡 WebSocket 端点: ws://localhost:${PORT}/ws`);
});
