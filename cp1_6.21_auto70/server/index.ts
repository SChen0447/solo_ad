import express from 'express';
import http from 'http';
import { Server, Socket } from 'socket.io';
import cors from 'cors';
import fs from 'fs';
import path from 'path';

const PORT = 3001;

interface LeaderboardEntry {
  id: string;
  playerName: string;
  score: number;
  timestamp: number;
}

interface Achievement {
  type: 'personal_best' | 'top_3' | 'top_1';
  message: string;
  rank?: number;
  previousBest?: number;
}

const app = express();
app.use(cors());
app.use(express.json());

const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST'],
  },
});

const DATA_FILE = path.join(__dirname, '..', 'data', 'leaderboard.json');
const PLAYER_RECORDS_FILE = path.join(__dirname, '..', 'data', 'player_records.json');

function ensureDataDir() {
  const dir = path.join(__dirname, '..', 'data');
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

function loadLeaderboard(): LeaderboardEntry[] {
  ensureDataDir();
  try {
    if (fs.existsSync(DATA_FILE)) {
      const raw = fs.readFileSync(DATA_FILE, 'utf-8');
      return JSON.parse(raw);
    }
  } catch (e) {
    console.error('Failed to load leaderboard:', e);
  }
  return [];
}

function saveLeaderboard(entries: LeaderboardEntry[]) {
  ensureDataDir();
  fs.writeFileSync(DATA_FILE, JSON.stringify(entries, null, 2));
}

function loadPlayerRecords(): Record<string, number> {
  ensureDataDir();
  try {
    if (fs.existsSync(PLAYER_RECORDS_FILE)) {
      const raw = fs.readFileSync(PLAYER_RECORDS_FILE, 'utf-8');
      return JSON.parse(raw);
    }
  } catch (e) {
    console.error('Failed to load player records:', e);
  }
  return {};
}

function savePlayerRecords(records: Record<string, number>) {
  ensureDataDir();
  fs.writeFileSync(PLAYER_RECORDS_FILE, JSON.stringify(records, null, 2));
}

let leaderboard: LeaderboardEntry[] = loadLeaderboard();
let playerRecords: Record<string, number> = loadPlayerRecords();

function getTop10(): LeaderboardEntry[] {
  return [...leaderboard]
    .sort((a, b) => b.score - a.score)
    .slice(0, 10);
}

function checkAchievements(playerName: string, score: number): Achievement[] {
  const achievements: Achievement[] = [];
  const previousBest = playerRecords[playerName] || 0;

  if (score > previousBest) {
    achievements.push({
      type: 'personal_best',
      message: `🎉 个人新纪录！${previousBest > 0 ? `${previousBest} → ${score}` : `${score}`}`,
      previousBest,
    });
    playerRecords[playerName] = score;
    savePlayerRecords(playerRecords);
  }

  const sorted = [...leaderboard].sort((a, b) => b.score - a.score);
  let newRank = sorted.findIndex((e) => score > e.score) + 1;
  if (newRank === 0) newRank = sorted.length + 1;

  if (newRank === 1) {
    achievements.push({
      type: 'top_1',
      message: '👑 恭喜登顶排行榜第1名！',
      rank: 1,
    });
  } else if (newRank <= 3) {
    const medal = newRank === 2 ? '🥈' : '🥉';
    achievements.push({
      type: 'top_3',
      message: `${medal} 进入排行榜第${newRank}名！`,
      rank: newRank,
    });
  }

  return achievements;
}

app.get('/api/leaderboard', (req, res) => {
  const top10 = getTop10();
  res.json(top10);
});

app.post('/api/submit-score', (req, res) => {
  const { playerName, score, clientId } = req.body;

  if (!playerName || typeof score !== 'number') {
    return res.status(400).json({ error: 'Invalid data' });
  }

  const cleanName = String(playerName).slice(0, 8).trim() || 'Anonymous';

  const entry: LeaderboardEntry = {
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    playerName: cleanName,
    score: Math.max(0, Math.floor(score)),
    timestamp: Date.now(),
  };

  const achievements = checkAchievements(cleanName, entry.score);

  leaderboard.push(entry);
  leaderboard = [...leaderboard]
    .sort((a, b) => b.score - a.score)
    .slice(0, 100);
  saveLeaderboard(leaderboard);

  const top10 = getTop10();
  io.emit('leaderboard:update', top10);

  if (achievements.length > 0 && clientId) {
    io.to(clientId).emit('achievements', achievements);
  }

  res.json({
    success: true,
    entry,
    achievements,
    leaderboard: top10,
  });
});

io.on('connection', (socket: Socket) => {
  console.log('Client connected:', socket.id);

  socket.emit('leaderboard:update', getTop10());

  socket.on('disconnect', () => {
    console.log('Client disconnected:', socket.id);
  });
});

server.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
  console.log(`WebSocket ready on ws://localhost:${PORT}`);
});
