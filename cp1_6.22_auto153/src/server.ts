import express from 'express';
import http from 'http';
import cors from 'cors';
import { Server, Socket } from 'socket.io';
import { v4 as uuidv4 } from 'uuid';
import type {
  BattleState,
  MatchRecord,
  MatchStartPayload,
  PlayCardPayload,
  BattleEvent,
  SocketClientEvents,
  SocketServerEvents,
} from './shared/types';
import { SERVER_PORT, MAX_RECORDS, RECONNECT_TIMEOUT } from './shared/constants';
import { createInitialPlayer, createBattleState, playCard, endTurn } from './shared/battleEngine';

const app = express();
app.use(cors());
app.use(express.json());

const server = http.createServer(app);
const io = new Server<SocketClientEvents, SocketServerEvents>(server, {
  cors: { origin: '*' },
});

interface QueuedPlayer {
  socketId: string;
  playerId: string;
  nickname: string;
}

const matchQueue: QueuedPlayer[] = [];
const battles: Map<string, BattleState> = new Map();
const playerRoomMap: Map<string, string> = new Map();
const socketPlayerMap: Map<string, string> = new Map();
const matchRecords: MatchRecord[] = [];

const saveMatchRecord = (state: BattleState) => {
  if (!state.winnerId) return;
  const [p1, p2] = state.playerIds.map((id) => state.players[id]);
  const record: MatchRecord = {
    id: uuidv4(),
    player1Name: p1.nickname,
    player2Name: p2.nickname,
    winnerName: state.players[state.winnerId].nickname,
    durationMs: Date.now() - state.startedAt,
    turnCount: state.turnNumber,
    endedAt: Date.now(),
  };
  matchRecords.unshift(record);
  if (matchRecords.length > MAX_RECORDS) matchRecords.pop();
};

const broadcastState = (roomId: string, events: BattleEvent[] = []) => {
  const state = battles.get(roomId);
  if (!state) return;
  io.to(roomId).emit('state-update', JSON.parse(JSON.stringify(state)), events);
};

const buildMatchStartPayload = (state: BattleState, playerId: string): MatchStartPayload => {
  const player = state.players[playerId];
  const opponentId = state.playerIds.find((id) => id !== playerId)!;
  const opponent = state.players[opponentId];
  return {
    roomId: state.roomId,
    playerId,
    opponent: { id: opponentId, nickname: opponent.nickname },
    initialHand: JSON.parse(JSON.stringify(player.hand)),
    deck: JSON.parse(JSON.stringify(player.deck)),
    state: JSON.parse(JSON.stringify(state)),
  };
};

const tryMatch = () => {
  while (matchQueue.length >= 2) {
    const p1 = matchQueue.shift()!;
    const p2 = matchQueue.shift()!;
    const roomId = uuidv4();

    const player1 = createInitialPlayer(p1.playerId, p1.nickname, p1.socketId);
    const player2 = createInitialPlayer(p2.playerId, p2.nickname, p2.socketId);

    const state = createBattleState(roomId, [player1, player2]);
    battles.set(roomId, state);
    playerRoomMap.set(p1.playerId, roomId);
    playerRoomMap.set(p2.playerId, roomId);
    socketPlayerMap.set(p1.socketId, p1.playerId);
    socketPlayerMap.set(p2.socketId, p2.playerId);

    const s1 = io.sockets.sockets.get(p1.socketId);
    const s2 = io.sockets.sockets.get(p2.socketId);
    if (s1) s1.join(roomId);
    if (s2) s2.join(roomId);

    if (s1) s1.emit('match-start', buildMatchStartPayload(state, p1.playerId));
    if (s2) s2.emit('match-start', buildMatchStartPayload(state, p2.playerId));
  }
};

const handlePlayerDisconnect = (socketId: string) => {
  const playerId = socketPlayerMap.get(socketId);
  if (!playerId) return;
  const roomId = playerRoomMap.get(playerId);
  if (!roomId) return;
  const state = battles.get(roomId);
  if (!state) return;
  const player = state.players[playerId];
  if (!player) return;

  player.isConnected = false;
  player.disconnectedAt = Date.now();

  const opponentId = state.playerIds.find((id) => id !== playerId)!;
  const opponent = state.players[opponentId];

  if (opponent.socketId) {
    const oppSocket = io.sockets.sockets.get(opponent.socketId);
    if (oppSocket) oppSocket.emit('opponent-disconnected');
  }

  socketPlayerMap.delete(socketId);

  setTimeout(() => {
    const curState = battles.get(roomId);
    if (!curState) return;
    const pl = curState.players[playerId];
    if (!pl || pl.isConnected) return;
    if (curState.phase === 'ended') return;

    if (pl.disconnectedAt && Date.now() - pl.disconnectedAt >= RECONNECT_TIMEOUT) {
      curState.phase = 'ended';
      curState.winnerId = opponentId;
      const events: BattleEvent[] = [
        {
          type: 'battle_ended',
          message: `${opponent.nickname} 因对方弃权获胜！`,
          playerId: opponentId,
          bannerColor: 'success',
        },
      ];
      saveMatchRecord(curState);
      broadcastState(roomId, events);
    }
  }, RECONNECT_TIMEOUT + 100);
};

io.on('connection', (socket: Socket) => {
  socket.on('start-match', (nickname: string) => {
    const cleanName = nickname.trim() || '匿名玩家';
    const playerId = uuidv4();
    matchQueue.push({ socketId: socket.id, playerId, nickname: cleanName });
    socketPlayerMap.set(socket.id, playerId);
    socket.emit('match-queued');
    tryMatch();
  });

  socket.on('cancel-match', () => {
    const idx = matchQueue.findIndex((q) => q.socketId === socket.id);
    if (idx !== -1) {
      matchQueue.splice(idx, 1);
      socket.emit('match-cancelled');
    }
    const pid = socketPlayerMap.get(socket.id);
    if (pid) socketPlayerMap.delete(socket.id);
  });

  socket.on('play-card', (payload: PlayCardPayload) => {
    const playerId = socketPlayerMap.get(socket.id);
    if (!playerId) return;
    const roomId = playerRoomMap.get(playerId);
    if (!roomId) return;
    const state = battles.get(roomId);
    if (!state || state.phase !== 'playing') return;
    if (state.currentTurnPlayerId !== playerId) return;

    const result = playCard(state, playerId, payload);
    broadcastState(roomId, result.events);
  });

  socket.on('end-turn', () => {
    const playerId = socketPlayerMap.get(socket.id);
    if (!playerId) return;
    const roomId = playerRoomMap.get(playerId);
    if (!roomId) return;
    const state = battles.get(roomId);
    if (!state || state.phase !== 'playing') return;
    if (state.currentTurnPlayerId !== playerId) return;

    const result = endTurn(state);
    const curPhase = state.phase as unknown as string;
    if (curPhase === 'ended') {
      saveMatchRecord(state);
    }
    broadcastState(roomId, result.events);

    if (curPhase === 'ended') {
      setTimeout(() => {
        state.playerIds.forEach((pid) => {
          playerRoomMap.delete(pid);
        });
        battles.delete(roomId);
      }, 5000);
    }
  });

  socket.on('get-records', () => {
    socket.emit('records-update', [...matchRecords]);
  });

  socket.on('reconnect', (roomId: string, playerId: string) => {
    const state = battles.get(roomId);
    if (!state) {
      socket.emit('reconnect-failed');
      return;
    }
    const player = state.players[playerId];
    if (!player) {
      socket.emit('reconnect-failed');
      return;
    }
    if (player.disconnectedAt && Date.now() - player.disconnectedAt > RECONNECT_TIMEOUT) {
      socket.emit('reconnect-failed');
      return;
    }

    player.isConnected = true;
    player.socketId = socket.id;
    player.disconnectedAt = undefined;
    socketPlayerMap.set(socket.id, playerId);
    socket.join(roomId);

    socket.emit('reconnect-success', buildMatchStartPayload(state, playerId));

    const opponentId = state.playerIds.find((id) => id !== playerId)!;
    const opponentSocket = io.sockets.sockets.get(state.players[opponentId].socketId);
    if (opponentSocket) opponentSocket.emit('opponent-reconnected');
  });

  socket.on('disconnect', () => {
    handlePlayerDisconnect(socket.id);
    const qIdx = matchQueue.findIndex((q) => q.socketId === socket.id);
    if (qIdx !== -1) matchQueue.splice(qIdx, 1);
  });
});

server.listen(SERVER_PORT, () => {
  console.log(`[server] running on http://localhost:${SERVER_PORT}`);
});
