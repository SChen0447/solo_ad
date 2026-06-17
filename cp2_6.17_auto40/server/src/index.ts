import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import { v4 as uuidv4 } from 'uuid';
import { GameEngine, HorseConfig } from './gameEngine';

const app = express();
const httpServer = createServer(app);
const io = new Server(httpServer, {
  cors: { origin: '*' },
});

const engine = new GameEngine();
const playerSockets = new Map<string, string>();
let readyCount = 0;

engine.onBroadcast((state) => {
  io.emit('race:state', state);
});

io.on('connection', (socket) => {
  const playerId = uuidv4();
  playerSockets.set(socket.id, playerId);

  socket.emit('player:id', playerId);
  socket.emit('race:state', engine.state);

  socket.on('player:ready', (config: Omit<HorseConfig, 'id' | 'isAI'>) => {
    if (engine.state.phase !== 'waiting') return;
    if (engine.isFull()) return;

    const fullConfig: HorseConfig = {
      ...config,
      id: playerId,
      isAI: false,
    };

    engine.addPlayer(fullConfig);
    readyCount++;

    io.emit('player:joined', {
      count: engine.state.horses.length,
      readyCount,
      total: 8,
    });

    if (engine.state.horses.length >= 8 || readyCount >= 2) {
      setTimeout(() => {
        if (engine.state.phase === 'waiting') {
          engine.fillWithAI();
          io.emit('player:joined', {
            count: engine.state.horses.length,
            readyCount,
            total: 8,
          });
          setTimeout(() => {
            engine.startCountdown();
          }, 500);
        }
      }, 2000);
    }
  });

  socket.on('race:restart', () => {
    engine.reset();
    readyCount = 0;
    io.emit('race:reset');
  });

  socket.on('disconnect', () => {
    playerSockets.delete(socket.id);
  });
});

const PORT = 3001;
httpServer.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
