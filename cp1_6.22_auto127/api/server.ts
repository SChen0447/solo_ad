import { createServer } from 'http';
import app from './app.js';
import { Server as SocketIOServer } from 'socket.io';
import { addToQueue, removeFromQueue, tryMatch, getQueueSize } from './matchMaker.js';
import { createBattleShips, tickBattle, applyCommand, checkBattleEnd } from './shipLogic.js';
import type { BattleRoom, CommandPayload, BattleShip, Projectile } from '../shared/types';
import { BATTLE_DURATION, BROADCAST_HZ } from '../shared/types';

const PORT = process.env.PORT || 3001;
const server = createServer(app);
const io = new SocketIOServer(server, {
  cors: { origin: '*', methods: ['GET', 'POST'] },
});

const battleRooms = new Map<string, BattleRoom>();

io.on('connection', (socket) => {
  const playerId = socket.handshake.query.playerId as string || socket.id;
  console.log(`Player connected: ${playerId} (${socket.id})`);

  socket.on('join-queue', (data: { playerId: string; fleetId: string; power: number; ships: string[] }) => {
    addToQueue({
      playerId: data.playerId,
      fleetId: data.fleetId,
      power: data.power,
      ships: data.ships as any[],
      socketId: socket.id,
      joinedAt: Date.now(),
    });
    console.log(`Player ${data.playerId} joined queue (power: ${data.power}), queue size: ${getQueueSize()}`);

    const match = tryMatch(data.playerId);
    if (match) {
      console.log(`Match found! Room: ${match.roomId}`);
      const opponentSocketId = [...io.sockets.sockets.values()].find(
        (s) => (s.handshake.query.playerId as string) === match.opponent.playerId
      )?.id;

      if (!opponentSocketId) {
        removeFromQueue(data.playerId);
        return;
      }

      const redTeam = data.power >= match.opponent.power ? data.playerId : match.opponent.playerId;
      const blueTeam = redTeam === data.playerId ? match.opponent.playerId : data.playerId;

      const redShips = redTeam === data.playerId ? data.ships : match.opponent.ships;
      const blueShips = redTeam === data.playerId ? match.opponent.ships : data.ships;

      const battleShips = createBattleShips(redShips as any[], blueShips as any[]);

      const room: BattleRoom = {
        roomId: match.roomId,
        players: [
          { playerId: data.playerId, socketId: socket.id, team: redTeam === data.playerId ? 'red' : 'blue', ships: data.ships as any[] },
          { playerId: match.opponent.playerId, socketId: opponentSocketId, team: redTeam === match.opponent.playerId ? 'red' : 'blue', ships: match.opponent.ships as any[] },
        ],
        ships: battleShips,
        projectiles: [],
        startTime: Date.now(),
        duration: BATTLE_DURATION,
        intervalId: null,
        ended: false,
      };

      battleRooms.set(match.roomId, room);

      socket.join(match.roomId);
      io.sockets.sockets.get(opponentSocketId)?.join(match.roomId);

      io.to(socket.id).emit('match-found', {
        roomId: match.roomId,
        opponent: match.opponent,
      });
      io.to(opponentSocketId).emit('match-found', {
        roomId: match.roomId,
        opponent: { playerId: data.playerId, ships: data.ships, power: data.power },
      });

      setTimeout(() => {
        io.to(socket.id).emit('battle-start', {
          ships: battleShips,
          yourTeam: redTeam === data.playerId ? 'red' : 'blue',
        });
        io.to(opponentSocketId).emit('battle-start', {
          ships: battleShips,
          yourTeam: redTeam === match.opponent.playerId ? 'red' : 'blue',
        });
        startBattleLoop(match.roomId);
      }, 2000);
    }
  });

  socket.on('leave-queue', (data: { playerId: string }) => {
    removeFromQueue(data.playerId);
    console.log(`Player ${data.playerId} left queue`);
  });

  socket.on('command', (data: CommandPayload & { roomId: string }) => {
    const room = battleRooms.get(data.roomId);
    if (!room || room.ended) return;
    const player = room.players.find((p) => p.socketId === socket.id);
    if (!player) return;
    applyCommand(room.ships, player.team, data);
  });

  socket.on('disconnect', () => {
    removeFromQueue(playerId);
    for (const [roomId, room] of battleRooms) {
      const player = room.players.find((p) => p.socketId === socket.id);
      if (player && !room.ended) {
        room.ended = true;
        if (room.intervalId) clearInterval(room.intervalId);
        const opponent = room.players.find((p) => p.socketId !== socket.id);
        if (opponent) {
          io.to(opponent.socketId).emit('battle-end', {
            winner: opponent.team,
            rewards: 100,
            yourTeam: opponent.team,
          });
        }
        battleRooms.delete(roomId);
      }
    }
    console.log(`Player disconnected: ${playerId}`);
  });
});

function startBattleLoop(roomId: string): void {
  const room = battleRooms.get(roomId);
  if (!room) return;

  const tickInterval = 1000 / 60;
  let lastBroadcast = 0;
  const broadcastInterval = 1000 / BROADCAST_HZ;

  room.intervalId = setInterval(() => {
    if (room.ended) {
      if (room.intervalId) clearInterval(room.intervalId);
      return;
    }

    const result = tickBattle(room.ships, room.projectiles, 0);
    room.ships = result.ships;
    room.projectiles = result.projectiles;

    const elapsed = (Date.now() - room.startTime) / 1000;
    const endCheck = checkBattleEnd(room.ships, elapsed);

    if (endCheck.ended) {
      room.ended = true;
      if (room.intervalId) clearInterval(room.intervalId);

      const snapshot = {
        ships: room.ships,
        projectiles: room.projectiles,
        events: result.events,
        timeRemaining: 0,
      };
      io.to(roomId).emit('battle-update', snapshot);

      room.players.forEach((player) => {
        const isWinner = endCheck.winner === player.team;
        io.to(player.socketId).emit('battle-end', {
          winner: endCheck.winner,
          rewards: isWinner ? 200 : 50,
          yourTeam: player.team,
        });
      });

      battleRooms.delete(roomId);
      return;
    }

    const now = Date.now();
    if (now - lastBroadcast >= broadcastInterval) {
      lastBroadcast = now;
      const snapshot = {
        ships: room.ships,
        projectiles: room.projectiles,
        events: result.events,
        timeRemaining: Math.max(0, room.duration - elapsed),
      };
      io.to(roomId).emit('battle-update', snapshot);
    }
  }, tickInterval);
}

server.listen(PORT, () => {
  console.log(`Server ready on port ${PORT}`);
});

process.on('SIGTERM', () => {
  console.log('SIGTERM signal received');
  server.close(() => {
    console.log('Server closed');
    process.exit(0);
  });
});

process.on('SIGINT', () => {
  console.log('SIGTERM signal received');
  server.close(() => {
    console.log('Server closed');
    process.exit(0);
  });
});
