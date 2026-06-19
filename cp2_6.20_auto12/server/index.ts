import express from 'express';
import { createServer } from 'http';
import { WebSocketServer, WebSocket } from 'ws';
import { v4 as uuidv4 } from 'uuid';
import cors from 'cors';

const app = express();
app.use(cors());
app.use(express.json());

const server = createServer(app);
const wss = new WebSocketServer({ server });

interface Player {
  ws: WebSocket;
  id: string;
  name: string;
}

interface Room {
  id: string;
  name: string;
  code: string;
  players: Player[];
  status: 'waiting' | 'playing';
}

const rooms: Map<string, Room> = new Map();

function generateRoomCode(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let code = '';
  for (let i = 0; i < 6; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}

function broadcastToRoom(room: Room, message: object, excludeWs?: WebSocket) {
  const data = JSON.stringify(message);
  room.players.forEach((player) => {
    if (player.ws !== excludeWs && player.ws.readyState === WebSocket.OPEN) {
      player.ws.send(data);
    }
  });
}

function broadcastRoomList() {
  const roomList = Array.from(rooms.values())
    .slice(0, 4)
    .map((room) => ({
      id: room.id,
      name: room.name,
      code: room.code,
      playerCount: room.players.length,
      status: room.status,
    }));

  const message = JSON.stringify({ type: 'room_list', rooms: roomList });
  wss.clients.forEach((client) => {
    if (client.readyState === WebSocket.OPEN) {
      client.send(message);
    }
  });
}

function removePlayerFromRooms(ws: WebSocket) {
  rooms.forEach((room, roomId) => {
    const playerIndex = room.players.findIndex((p) => p.ws === ws);
    if (playerIndex !== -1) {
      room.players.splice(playerIndex, 1);
      if (room.players.length === 0) {
        rooms.delete(roomId);
      } else {
        room.status = 'waiting';
        broadcastToRoom(room, {
          type: 'player_left',
          roomId,
          playerCount: room.players.length,
        });
      }
      broadcastRoomList();
    }
  });
}

wss.on('connection', (ws: WebSocket) => {
  broadcastRoomList();

  ws.on('message', (data: Buffer) => {
    try {
      const msg = JSON.parse(data.toString());

      switch (msg.type) {
        case 'create_room': {
          const roomId = uuidv4();
          const code = generateRoomCode();
          const room: Room = {
            id: roomId,
            name: msg.roomName || '未命名房间',
            code,
            players: [{ ws, id: msg.playerId || uuidv4(), name: msg.playerName || '玩家1' }],
            status: 'waiting',
          };
          rooms.set(roomId, room);
          ws.send(
            JSON.stringify({
              type: 'room_created',
              room: { id: roomId, name: room.name, code, playerCount: 1, status: 'waiting' },
              playerId: room.players[0].id,
            })
          );
          broadcastRoomList();
          break;
        }

        case 'join_room': {
          let targetRoom: Room | null = null;
          rooms.forEach((room) => {
            if (room.code === msg.roomCode && room.players.length < 2) {
              targetRoom = room;
            }
          });

          if (targetRoom) {
            const playerId = msg.playerId || uuidv4();
            const playerName = msg.playerName || '玩家2';
            targetRoom.players.push({ ws, id: playerId, name: playerName });
            targetRoom.status = 'playing';

            ws.send(
              JSON.stringify({
                type: 'room_joined',
                room: {
                  id: targetRoom.id,
                  name: targetRoom.name,
                  code: targetRoom.code,
                  playerCount: targetRoom.players.length,
                  status: targetRoom.status,
                },
                playerId,
              })
            );

            broadcastToRoom(targetRoom, {
              type: 'game_start',
              roomId: targetRoom.id,
              players: targetRoom.players.map((p) => ({ id: p.id, name: p.name })),
            });

            broadcastRoomList();
          } else {
            ws.send(JSON.stringify({ type: 'join_error', message: '房间不存在或已满' }));
          }
          break;
        }

        case 'play_card':
        case 'turn_end':
        case 'game_action': {
          const { roomId } = msg;
          const room = rooms.get(roomId);
          if (room) {
            broadcastToRoom(room, msg, ws);
          }
          break;
        }

        case 'get_rooms': {
          const roomList = Array.from(rooms.values())
            .slice(0, 4)
            .map((room) => ({
              id: room.id,
              name: room.name,
              code: room.code,
              playerCount: room.players.length,
              status: room.status,
            }));
          ws.send(JSON.stringify({ type: 'room_list', rooms: roomList }));
          break;
        }

        default:
          break;
      }
    } catch (e) {
      console.error('Message parse error:', e);
    }
  });

  ws.on('close', () => {
    removePlayerFromRooms(ws);
  });
});

const PORT = 3001;
server.listen(PORT, () => {
  console.log(`WebSocket server running on port ${PORT}`);
});
