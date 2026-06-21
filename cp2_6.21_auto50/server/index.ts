import express, { Request, Response } from 'express';
import { createServer } from 'http';
import { Server, Socket } from 'socket.io';
import { v4 as uuidv4 } from 'uuid';

const app = express();
app.use(express.json());
const server = createServer(app);
const io = new Server(server, {
  cors: {
    origin: '*',
  },
});

const PORT = 3005;

type GameType = 'word-guess' | 'spy' | 'draw-relay';
type GameStatus = 'waiting' | 'playing' | 'finished';

interface Player {
  id: string;
  name: string;
  socketId: string;
  isHost: boolean;
  score: number;
}

interface RoundHistory {
  id: string;
  playerId: string;
  playerName: string;
  word: string;
  isCorrect: boolean;
  isFirst: boolean;
  timestamp: number;
  roundNumber: number;
}

interface Room {
  id: string;
  inviteCode: string;
  gameType: GameType;
  hostId: string;
  players: Player[];
  gameStatus: GameStatus;
  currentRound: number;
  currentWord: string;
  currentHint: { category: string; length: number };
  countdown: number;
  countdownDuration: number;
  roundHistory: RoundHistory[];
  answeredPlayers: Set<string>;
}

const rooms = new Map<string, Room>();
const socketToRoom = new Map<string, string>();

const wordBank = [
  { word: '苹果', category: '水果', length: 2 },
  { word: '电脑', category: '电子产品', length: 2 },
  { word: '篮球', category: '运动', length: 2 },
  { word: '钢琴', category: '乐器', length: 2 },
  { word: '长城', category: '景点', length: 2 },
  { word: '教师', category: '职业', length: 2 },
  { word: '咖啡', category: '饮品', length: 2 },
  { word: '太阳', category: '天文', length: 2 },
  { word: '电影', category: '娱乐', length: 2 },
  { word: '雨伞', category: '生活用品', length: 2 },
  { word: '孙悟空', category: '神话人物', length: 3 },
  { word: '麦当劳', category: '品牌', length: 3 },
  { word: '圣诞节', category: '节日', length: 3 },
  { word: '打印机', category: '办公用品', length: 3 },
  { word: '自行车', category: '交通工具', length: 3 },
];

function generateInviteCode(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

function getRandomWord() {
  return wordBank[Math.floor(Math.random() * wordBank.length)];
}

function broadcastRoomState(roomId: string) {
  const room = rooms.get(roomId);
  if (!room) return;
  io.to(roomId).emit('room:state', {
    id: room.id,
    inviteCode: room.inviteCode,
    gameType: room.gameType,
    hostId: room.hostId,
    players: room.players,
    gameStatus: room.gameStatus,
    currentRound: room.currentRound,
    currentHint: room.currentHint,
    countdown: room.countdown,
    countdownDuration: room.countdownDuration,
    roundHistory: room.roundHistory,
  });
}

app.get('/api/rooms', (req: Request, res: Response) => {
  const publicRooms = Array.from(rooms.values()).map((r) => ({
    id: r.id,
    inviteCode: r.inviteCode,
    gameType: r.gameType,
    playerCount: r.players.length,
    gameStatus: r.gameStatus,
  }));
  res.json(publicRooms);
});

io.on('connection', (socket: Socket) => {
  console.log('Client connected:', socket.id);

  socket.on('room:create', ({ name, gameType }: { name: string; gameType: GameType }) => {
    const roomId = uuidv4();
    const inviteCode = generateInviteCode();
    const playerId = uuidv4();

    const player: Player = {
      id: playerId,
      name,
      socketId: socket.id,
      isHost: true,
      score: 0,
    };

    const room: Room = {
      id: roomId,
      inviteCode,
      gameType,
      hostId: playerId,
      players: [player],
      gameStatus: 'waiting',
      currentRound: 0,
      currentWord: '',
      currentHint: { category: '', length: 0 },
      countdown: 60,
      countdownDuration: 60,
      roundHistory: [],
      answeredPlayers: new Set(),
    };

    rooms.set(roomId, room);
    socketToRoom.set(socket.id, roomId);
    socket.join(roomId);

    socket.emit('room:joined', {
      roomId,
      playerId,
      inviteCode,
    });

    broadcastRoomState(roomId);
  });

  socket.on('room:join', ({ name, inviteCode }: { name: string; inviteCode: string }) => {
    const room = Array.from(rooms.values()).find((r) => r.inviteCode === inviteCode);
    if (!room) {
      socket.emit('error', { message: '房间不存在' });
      return;
    }
    if (room.players.length >= 8) {
      socket.emit('error', { message: '房间已满（最多8人）' });
      return;
    }
    if (room.gameStatus !== 'waiting') {
      socket.emit('error', { message: '游戏已开始，无法加入' });
      return;
    }

    const playerId = uuidv4();
    const player: Player = {
      id: playerId,
      name,
      socketId: socket.id,
      isHost: false,
      score: 0,
    };

    room.players.push(player);
    socketToRoom.set(socket.id, room.id);
    socket.join(room.id);

    socket.emit('room:joined', {
      roomId: room.id,
      playerId,
      inviteCode: room.inviteCode,
    });

    broadcastRoomState(room.id);
  });

  socket.on('room:kick', ({ playerId }: { playerId: string }) => {
    const roomId = socketToRoom.get(socket.id);
    if (!roomId) return;
    const room = rooms.get(roomId);
    if (!room) return;

    const currentPlayer = room.players.find((p) => p.socketId === socket.id);
    if (!currentPlayer?.isHost) return;

    const targetPlayer = room.players.find((p) => p.id === playerId);
    if (!targetPlayer) return;

    const targetSocket = io.sockets.sockets.get(targetPlayer.socketId);
    if (targetSocket) {
      targetSocket.leave(roomId);
      targetSocket.emit('room:kicked');
      socketToRoom.delete(targetPlayer.socketId);
    }

    room.players = room.players.filter((p) => p.id !== playerId);
    broadcastRoomState(roomId);
  });

  socket.on('room:transfer-host', ({ playerId }: { playerId: string }) => {
    const roomId = socketToRoom.get(socket.id);
    if (!roomId) return;
    const room = rooms.get(roomId);
    if (!room) return;

    const currentPlayer = room.players.find((p) => p.socketId === socket.id);
    if (!currentPlayer?.isHost) return;

    const newHost = room.players.find((p) => p.id === playerId);
    if (!newHost) return;

    currentPlayer.isHost = false;
    newHost.isHost = true;
    room.hostId = playerId;

    broadcastRoomState(roomId);
  });

  socket.on('game:start', ({ duration }: { duration: number }) => {
    const roomId = socketToRoom.get(socket.id);
    if (!roomId) return;
    const room = rooms.get(roomId);
    if (!room) return;

    const currentPlayer = room.players.find((p) => p.socketId === socket.id);
    if (!currentPlayer?.isHost) return;
    if (room.players.length < 2) {
      socket.emit('error', { message: '至少需要2名玩家才能开始游戏' });
      return;
    }

    room.gameStatus = 'playing';
    room.currentRound = 1;
    room.countdownDuration = Math.max(30, Math.min(120, duration));
    room.countdown = room.countdownDuration;
    room.answeredPlayers.clear();
    room.roundHistory = [];
    room.players.forEach((p) => (p.score = 0));

    const wordData = getRandomWord();
    room.currentWord = wordData.word;
    room.currentHint = { category: wordData.category, length: wordData.length };

    broadcastRoomState(roomId);
    startCountdown(roomId);
  });

  socket.on('game:answer', ({ answer }: { answer: string }) => {
    const roomId = socketToRoom.get(socket.id);
    if (!roomId) return;
    const room = rooms.get(roomId);
    if (!room || room.gameStatus !== 'playing') return;

    const player = room.players.find((p) => p.socketId === socket.id);
    if (!player || room.answeredPlayers.has(player.id)) return;

    const isCorrect = answer.trim().toLowerCase() === room.currentWord.toLowerCase();
    const isFirst = room.answeredPlayers.size === 0;

    room.answeredPlayers.add(player.id);

    if (isCorrect) {
      let points = 100;
      if (isFirst) points += 50;
      player.score += points;
    }

    const history: RoundHistory = {
      id: uuidv4(),
      playerId: player.id,
      playerName: player.name,
      word: answer,
      isCorrect,
      isFirst,
      timestamp: Date.now(),
      roundNumber: room.currentRound,
    };

    room.roundHistory.push(history);

    io.to(roomId).emit('game:answer-result', {
      playerId: player.id,
      playerName: player.name,
      isCorrect,
      isFirst,
      answer,
    });

    if (room.answeredPlayers.size >= room.players.length) {
      endRound(roomId);
    }

    broadcastRoomState(roomId);
  });

  socket.on('game:next-round', () => {
    const roomId = socketToRoom.get(socket.id);
    if (!roomId) return;
    const room = rooms.get(roomId);
    if (!room) return;

    const currentPlayer = room.players.find((p) => p.socketId === socket.id);
    if (!currentPlayer?.isHost) return;

    room.currentRound += 1;
    room.countdown = room.countdownDuration;
    room.answeredPlayers.clear();

    const wordData = getRandomWord();
    room.currentWord = wordData.word;
    room.currentHint = { category: wordData.category, length: wordData.length };

    room.gameStatus = 'playing';
    broadcastRoomState(roomId);
    startCountdown(roomId);
  });

  socket.on('game:end', () => {
    const roomId = socketToRoom.get(socket.id);
    if (!roomId) return;
    const room = rooms.get(roomId);
    if (!room) return;

    const currentPlayer = room.players.find((p) => p.socketId === socket.id);
    if (!currentPlayer?.isHost) return;

    room.gameStatus = 'finished';
    broadcastRoomState(roomId);
  });

  socket.on('room:leave', () => {
    handlePlayerLeave(socket);
  });

  socket.on('disconnect', () => {
    handlePlayerLeave(socket);
  });
});

function handlePlayerLeave(socket: Socket) {
  const roomId = socketToRoom.get(socket.id);
  if (!roomId) return;
  const room = rooms.get(roomId);
  if (!room) return;

  const leavingPlayer = room.players.find((p) => p.socketId === socket.id);
  room.players = room.players.filter((p) => p.socketId !== socket.id);
  socketToRoom.delete(socket.id);

  if (room.players.length === 0) {
    rooms.delete(roomId);
    return;
  }

  if (leavingPlayer?.isHost) {
    const newHost = room.players[0];
    newHost.isHost = true;
    room.hostId = newHost.id;
  }

  broadcastRoomState(roomId);
}

let countdownIntervals = new Map<string, NodeJS.Timeout>();

function startCountdown(roomId: string) {
  const existingInterval = countdownIntervals.get(roomId);
  if (existingInterval) clearInterval(existingInterval);

  const interval = setInterval(() => {
    const room = rooms.get(roomId);
    if (!room) {
      clearInterval(interval);
      countdownIntervals.delete(roomId);
      return;
    }

    room.countdown -= 1;

    if (room.countdown <= 0) {
      clearInterval(interval);
      countdownIntervals.delete(roomId);
      endRound(roomId);
      return;
    }

    io.to(roomId).emit('game:countdown', room.countdown);
  }, 1000);

  countdownIntervals.set(roomId, interval);
}

function endRound(roomId: string) {
  const room = rooms.get(roomId);
  if (!room) return;

  const interval = countdownIntervals.get(roomId);
  if (interval) {
    clearInterval(interval);
    countdownIntervals.delete(roomId);
  }

  room.countdown = 0;
  room.gameStatus = 'finished';

  io.to(roomId).emit('game:round-end', {
    correctWord: room.currentWord,
    roundNumber: room.currentRound,
  });

  broadcastRoomState(roomId);
}

server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
