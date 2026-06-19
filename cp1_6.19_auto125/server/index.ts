import express from 'express';
import { createServer } from 'http';
import { Server, Socket } from 'socket.io';
import { GameEngine } from './gameEngine';

const app = express();
const server = createServer(app);
const io = new Server(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST'],
  },
});

const rooms: Record<string, GameEngine> = {};
const playerRooms: Record<string, string> = {};

app.get('/health', (_req, res) => {
  res.json({ status: 'ok' });
});

function broadcastState(roomId: string): void {
  const engine = rooms[roomId];
  if (engine) {
    io.to(roomId).emit('gameState', engine.getState());
  }
}

function getOrCreateRoom(roomId: string): GameEngine {
  if (!rooms[roomId]) {
    rooms[roomId] = new GameEngine(roomId);
    rooms[roomId].subscribe(() => {
      broadcastState(roomId);
    });
  }
  return rooms[roomId];
}

io.on('connection', (socket: Socket) => {
  console.log(`Player connected: ${socket.id}`);

  socket.on('joinRoom', ({ roomId, playerName }: { roomId: string; playerName: string }) => {
    const engine = getOrCreateRoom(roomId);
    
    if (engine.addPlayer(socket.id, playerName)) {
      socket.join(roomId);
      playerRooms[socket.id] = roomId;
      socket.emit('joined', { playerId: socket.id, roomId });
      broadcastState(roomId);

      const state = engine.getState();
      if (state.status === 'playing') {
        startGameLoop(roomId);
      }
    } else {
      socket.emit('error', { message: '房间已满或玩家已存在' });
    }
  });

  socket.on('buildMiner', () => {
    const roomId = playerRooms[socket.id];
    const engine = rooms[roomId];
    if (engine) {
      engine.buildMiner(socket.id);
    }
  });

  socket.on('buildTower', () => {
    const roomId = playerRooms[socket.id];
    const engine = rooms[roomId];
    if (engine) {
      engine.buildTower(socket.id);
    }
  });

  socket.on('upgradeBase', () => {
    const roomId = playerRooms[socket.id];
    const engine = rooms[roomId];
    if (engine) {
      engine.upgradeBase(socket.id);
    }
  });

  socket.on('disconnect', () => {
    console.log(`Player disconnected: ${socket.id}`);
    const roomId = playerRooms[socket.id];
    if (roomId) {
      const engine = rooms[roomId];
      if (engine) {
        engine.removePlayer(socket.id);
        broadcastState(roomId);
      }
      delete playerRooms[socket.id];
    }
  });
});

const gameLoops: Record<string, NodeJS.Timeout> = {};

function startGameLoop(roomId: string): void {
  if (gameLoops[roomId]) return;

  gameLoops[roomId] = setInterval(() => {
    const engine = rooms[roomId];
    if (engine) {
      engine.update();
      const state = engine.getState();
      if (state.status === 'finished') {
        clearInterval(gameLoops[roomId]);
        delete gameLoops[roomId];
      }
    }
  }, 1000 / 30);
}

const PORT = process.env.PORT || 3001;
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
