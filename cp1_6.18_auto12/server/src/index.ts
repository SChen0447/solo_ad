import express from 'express';
import http from 'http';
import { Server as SocketIOServer } from 'socket.io';
import cors from 'cors';
import { v4 as uuidv4 } from 'uuid';
import { RoomManager } from './roomManager';
import { Player, CharacterCustomization, Bullet, GameEndData } from './types';

const app = express();
const server = http.createServer(app);
const io = new SocketIOServer(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST'],
  },
});

app.use(cors());
app.use(express.json());

const roomManager = new RoomManager();

const GAME_TICK_RATE = 60;
const TICK_INTERVAL = 1000 / GAME_TICK_RATE;

const gameLoops: Map<string, NodeJS.Timeout> = new Map();

function startGameLoop(roomId: string) {
  if (gameLoops.has(roomId)) return;

  const interval = setInterval(() => {
    const room = roomManager.getRoom(roomId);
    if (!room || room.gameState !== 'playing') {
      stopGameLoop(roomId);
      return;
    }

    const deltaTime = TICK_INTERVAL / 1000;

    roomManager.updateBullets(roomId, deltaTime);

    const bullets = roomManager.getBullets(roomId);
    const players = roomManager.getPlayersArray(roomId);
    const bulletsToRemove: string[] = [];

    bullets.forEach((bullet) => {
      players.forEach((player) => {
        if (player.id === bullet.ownerId || !player.isAlive) return;

        const dx = bullet.x - player.x;
        const dy = bullet.y - player.y;
        const distance = Math.sqrt(dx * dx + dy * dy);

        if (distance < 20) {
          bulletsToRemove.push(bullet.id);

          const result = roomManager.playerHit(roomId, player.id, bullet.ownerId, bullet.damage);
          if (result) {
            io.to(roomId).emit('playerHit', {
              targetId: player.id,
              shooterId: bullet.ownerId,
              damage: bullet.damage,
              targetHealth: result.target.health,
              shooterKills: result.shooter.kills,
            });

            if (!result.target.isAlive) {
              io.to(roomId).emit('playerEliminated', {
                playerId: result.target.id,
                nickname: result.target.nickname,
                killerId: result.shooter.id,
                killerName: result.shooter.nickname,
              });

              const gameResult = roomManager.checkGameEnd(roomId);
              if (gameResult.ended && gameResult.winner) {
                const endData: GameEndData = {
                  winnerId: gameResult.winner.id,
                  winnerName: gameResult.winner.nickname,
                  stats: roomManager.getPlayersArray(roomId).map((p) => ({
                    playerId: p.id,
                    nickname: p.nickname,
                    kills: p.kills,
                    survived: p.isAlive,
                  })),
                };
                io.to(roomId).emit('gameEnd', endData);
                stopGameLoop(roomId);
              }
            }
          }
        }
      });
    });

    bulletsToRemove.forEach((bid) => roomManager.removeBullet(roomId, bid));

    const playerData = roomManager.getPlayersArray(roomId).map((p) => ({
      id: p.id,
      x: p.x,
      y: p.y,
      angle: p.angle,
      health: p.health,
      isAlive: p.isAlive,
      velocityX: p.velocityX,
      velocityY: p.velocityY,
    }));

    io.to(roomId).emit('gameState', {
      players: playerData,
      bullets: roomManager.getBullets(roomId),
      timestamp: Date.now(),
    });
  }, TICK_INTERVAL);

  gameLoops.set(roomId, interval);
}

function stopGameLoop(roomId: string) {
  const interval = gameLoops.get(roomId);
  if (interval) {
    clearInterval(interval);
    gameLoops.delete(roomId);
  }
}

io.on('connection', (socket) => {
  console.log('Client connected:', socket.id);

  let playerId: string | null = null;
  let currentRoomId: string | null = null;

  socket.on('getRoomList', (callback) => {
    const rooms = roomManager.getRoomList();
    callback(rooms);
  });

  socket.on('createRoom', (data: { name: string; nickname: string; customization: CharacterCustomization }, callback) => {
    if (playerId || currentRoomId) {
      callback({ success: false, error: '已经在房间中' });
      return;
    }

    playerId = uuidv4();
    const player: Player = {
      id: playerId,
      socketId: socket.id,
      nickname: data.nickname,
      customization: data.customization,
      x: 400,
      y: 300,
      angle: 0,
      health: 3,
      maxHealth: 3,
      kills: 0,
      isAlive: true,
      isHost: true,
      velocityX: 0,
      velocityY: 0,
    };

    const room = roomManager.createRoom(data.name, player);
    currentRoomId = room.id;
    socket.join(room.id);

    callback({
      success: true,
      roomId: room.id,
      playerId: playerId,
      players: roomManager.getPlayersArray(room.id).map((p) => ({
        id: p.id,
        nickname: p.nickname,
        customization: p.customization,
        isHost: p.isHost,
        isAlive: p.isAlive,
        health: p.health,
        kills: p.kills,
      })),
    });

    socket.to(room.id).emit('playerJoined', {
      id: player.id,
      nickname: player.nickname,
      customization: player.customization,
      isHost: player.isHost,
    });
  });

  socket.on('joinRoom', (data: { roomId: string; nickname: string; customization: CharacterCustomization }, callback) => {
    if (playerId || currentRoomId) {
      callback({ success: false, error: '已经在房间中' });
      return;
    }

    playerId = uuidv4();
    const player: Player = {
      id: playerId,
      socketId: socket.id,
      nickname: data.nickname,
      customization: data.customization,
      x: 400,
      y: 300,
      angle: 0,
      health: 3,
      maxHealth: 3,
      kills: 0,
      isAlive: true,
      isHost: false,
      velocityX: 0,
      velocityY: 0,
    };

    const room = roomManager.joinRoom(data.roomId, player);
    if (!room) {
      callback({ success: false, error: '房间不存在或已满' });
      playerId = null;
      return;
    }

    currentRoomId = room.id;
    socket.join(room.id);

    callback({
      success: true,
      roomId: room.id,
      playerId: playerId,
      players: roomManager.getPlayersArray(room.id).map((p) => ({
        id: p.id,
        nickname: p.nickname,
        customization: p.customization,
        isHost: p.isHost,
        isAlive: p.isAlive,
        health: p.health,
        kills: p.kills,
      })),
    });

    socket.to(room.id).emit('playerJoined', {
      id: player.id,
      nickname: player.nickname,
      customization: player.customization,
      isHost: player.isHost,
    });
  });

  socket.on('leaveRoom', (callback) => {
    if (!currentRoomId || !playerId) {
      callback({ success: false });
      return;
    }

    const room = roomManager.leaveRoom(currentRoomId, playerId);
    socket.leave(currentRoomId);

    if (room) {
      io.to(currentRoomId).emit('playerLeft', { playerId });

      const newHost = Array.from(room.players.values()).find((p) => p.isHost);
      if (newHost) {
        io.to(currentRoomId).emit('hostChanged', { hostId: newHost.id });
      }
    }

    callback({ success: true });
    currentRoomId = null;
    playerId = null;
  });

  socket.on('startGame', (callback) => {
    if (!currentRoomId || !playerId) {
      callback({ success: false, error: '不在房间中' });
      return;
    }

    const room = roomManager.getRoom(currentRoomId);
    if (!room) {
      callback({ success: false, error: '房间不存在' });
      return;
    }

    if (room.hostId !== playerId) {
      callback({ success: false, error: '只有房主可以开始游戏' });
      return;
    }

    if (room.players.size < 2) {
      callback({ success: false, error: '至少需要2名玩家' });
      return;
    }

    const started = roomManager.startGame(currentRoomId);
    if (started) {
      const players = roomManager.getPlayersArray(currentRoomId).map((p) => ({
        id: p.id,
        x: p.x,
        y: p.y,
        angle: p.angle,
        health: p.health,
        maxHealth: p.maxHealth,
        isAlive: p.isAlive,
        kills: p.kills,
      }));

      io.to(currentRoomId).emit('gameStarted', {
        players,
        bullets: [],
      });

      startGameLoop(currentRoomId);
      callback({ success: true });
    } else {
      callback({ success: false, error: '无法开始游戏' });
    }
  });

  socket.on('playerMove', (data: { x: number; y: number; angle: number; velocityX: number; velocityY: number }) => {
    if (!currentRoomId || !playerId) return;

    roomManager.updatePlayerPosition(
      currentRoomId,
      playerId,
      data.x,
      data.y,
      data.angle,
      data.velocityX,
      data.velocityY
    );
  });

  socket.on('shoot', (data: { x: number; y: number; angle: number }) => {
    if (!currentRoomId || !playerId) return;

    const room = roomManager.getRoom(currentRoomId);
    if (!room || room.gameState !== 'playing') return;

    const player = roomManager.getPlayer(currentRoomId, playerId);
    if (!player || !player.isAlive) return;

    const bulletSpeed = 400;
    const bullet: Bullet = {
      id: uuidv4(),
      ownerId: playerId,
      x: data.x + Math.cos(data.angle) * 25,
      y: data.y + Math.sin(data.angle) * 25,
      vx: Math.cos(data.angle) * bulletSpeed,
      vy: Math.sin(data.angle) * bulletSpeed,
      damage: 1,
    };

    roomManager.addBullet(currentRoomId, bullet);
  });

  socket.on('updateCustomization', (customization: CharacterCustomization) => {
    if (!currentRoomId || !playerId) return;

    const player = roomManager.getPlayer(currentRoomId, playerId);
    if (player) {
      player.customization = customization;
      socket.to(currentRoomId).emit('playerCustomizationChanged', {
        playerId,
        customization,
      });
    }
  });

  socket.on('returnToLobby', () => {
    if (!currentRoomId) return;
    roomManager.resetRoom(currentRoomId);
    io.to(currentRoomId).emit('returnedToLobby');
  });

  socket.on('disconnect', () => {
    console.log('Client disconnected:', socket.id);

    if (currentRoomId && playerId) {
      const room = roomManager.leaveRoom(currentRoomId, playerId);

      if (room) {
        io.to(currentRoomId).emit('playerLeft', { playerId });

        const newHost = Array.from(room.players.values()).find((p) => p.isHost);
        if (newHost) {
          io.to(currentRoomId).emit('hostChanged', { hostId: newHost.id });
        }

        if (room.gameState === 'playing') {
          const gameResult = roomManager.checkGameEnd(currentRoomId);
          if (gameResult.ended && gameResult.winner) {
            const endData: GameEndData = {
              winnerId: gameResult.winner.id,
              winnerName: gameResult.winner.nickname,
              stats: roomManager.getPlayersArray(currentRoomId).map((p) => ({
                playerId: p.id,
                nickname: p.nickname,
                kills: p.kills,
                survived: p.isAlive,
              })),
            };
            io.to(currentRoomId).emit('gameEnd', endData);
            stopGameLoop(currentRoomId);
          }
        }
      } else {
        stopGameLoop(currentRoomId);
      }
    }
  });
});

const PORT = 3001;
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
