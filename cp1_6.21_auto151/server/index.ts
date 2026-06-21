import express from 'express';
import cors from 'cors';
import { WebSocketServer } from 'ws';
import Database from 'better-sqlite3';
import { v4 as uuidv4 } from 'uuid';
import { setupRoutes } from './routes.js';

const app = express();
const PORT = 3001;

app.use(cors());
app.use(express.json());

const db = new Database('./farm.db');
db.pragma('journal_mode = WAL');

db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,
    username TEXT UNIQUE NOT NULL,
    created_at TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS crops (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    emoji TEXT NOT NULL,
    seed_days INTEGER NOT NULL,
    sprout_days INTEGER NOT NULL,
    bloom_days INTEGER NOT NULL,
    harvest_days INTEGER NOT NULL,
    water_per_day REAL NOT NULL,
    fertilize_per_day REAL NOT NULL,
    weed_per_day REAL NOT NULL
  );

  CREATE TABLE IF NOT EXISTS plots (
    id TEXT PRIMARY KEY,
    row INTEGER NOT NULL,
    col INTEGER NOT NULL,
    status TEXT NOT NULL DEFAULT 'empty',
    user_id TEXT,
    crop_id TEXT,
    planted_at TEXT,
    current_stage TEXT,
    stage_progress REAL DEFAULT 0,
    last_checkin_date TEXT,
    missed_days INTEGER DEFAULT 0,
    FOREIGN KEY (user_id) REFERENCES users(id),
    FOREIGN KEY (crop_id) REFERENCES crops(id)
  );

  CREATE TABLE IF NOT EXISTS tasks (
    id TEXT PRIMARY KEY,
    plot_id TEXT NOT NULL,
    crop_id TEXT NOT NULL,
    type TEXT NOT NULL,
    stage TEXT NOT NULL,
    scheduled_date TEXT NOT NULL,
    completed INTEGER DEFAULT 0,
    completed_at TEXT,
    FOREIGN KEY (plot_id) REFERENCES plots(id),
    FOREIGN KEY (crop_id) REFERENCES crops(id)
  );

  CREATE TABLE IF NOT EXISTS inventory (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    crop_id TEXT NOT NULL,
    quantity INTEGER NOT NULL DEFAULT 0,
    FOREIGN KEY (user_id) REFERENCES users(id),
    FOREIGN KEY (crop_id) REFERENCES crops(id)
  );

  CREATE TABLE IF NOT EXISTS exchanges (
    id TEXT PRIMARY KEY,
    from_user_id TEXT NOT NULL,
    to_user_id TEXT NOT NULL,
    offer_crop_id TEXT NOT NULL,
    offer_quantity INTEGER NOT NULL,
    request_crop_id TEXT NOT NULL,
    request_quantity INTEGER NOT NULL,
    status TEXT NOT NULL DEFAULT 'pending',
    created_at TEXT NOT NULL,
    updated_at TEXT,
    FOREIGN KEY (from_user_id) REFERENCES users(id),
    FOREIGN KEY (to_user_id) REFERENCES users(id)
  );
`);

const cropCount = db.prepare('SELECT COUNT(*) as count FROM crops').get() as { count: number };
if (cropCount.count === 0) {
  const crops = [
    { name: '西红柿', emoji: '🍅', seed: 3, sprout: 7, bloom: 10, harvest: 14, water: 2, fertilize: 0.3, weed: 0.5 },
    { name: '黄瓜', emoji: '🥒', seed: 3, sprout: 6, bloom: 8, harvest: 12, water: 2, fertilize: 0.4, weed: 0.3 },
    { name: '胡萝卜', emoji: '🥕', seed: 7, sprout: 10, bloom: 15, harvest: 20, water: 1, fertilize: 0.2, weed: 0.6 },
    { name: '生菜', emoji: '🥬', seed: 2, sprout: 5, bloom: 0, harvest: 15, water: 2, fertilize: 0.3, weed: 0.4 },
    { name: '辣椒', emoji: '🌶️', seed: 5, sprout: 8, bloom: 12, harvest: 18, water: 1, fertilize: 0.3, weed: 0.3 },
    { name: '茄子', emoji: '🍆', seed: 5, sprout: 8, bloom: 10, harvest: 16, water: 1, fertilize: 0.4, weed: 0.3 },
    { name: '土豆', emoji: '🥔', seed: 3, sprout: 10, bloom: 15, harvest: 25, water: 1, fertilize: 0.3, weed: 0.5 },
    { name: '玉米', emoji: '🌽', seed: 4, sprout: 7, bloom: 12, harvest: 20, water: 1, fertilize: 0.4, weed: 0.3 },
    { name: '南瓜', emoji: '🎃', seed: 5, sprout: 8, bloom: 12, harvest: 25, water: 1, fertilize: 0.3, weed: 0.4 },
    { name: '豌豆', emoji: '🫛', seed: 3, sprout: 6, bloom: 8, harvest: 12, water: 1.5, fertilize: 0.2, weed: 0.4 },
    { name: '菠菜', emoji: '🥬', seed: 2, sprout: 5, bloom: 0, harvest: 12, water: 2, fertilize: 0.3, weed: 0.5 },
    { name: '白菜', emoji: '🥬', seed: 2, sprout: 6, bloom: 0, harvest: 18, water: 1.5, fertilize: 0.3, weed: 0.4 },
    { name: '芹菜', emoji: '🥬', seed: 5, sprout: 10, bloom: 0, harvest: 20, water: 2, fertilize: 0.3, weed: 0.3 },
    { name: '洋葱', emoji: '🧅', seed: 4, sprout: 8, bloom: 10, harvest: 20, water: 1, fertilize: 0.2, weed: 0.5 },
    { name: '大蒜', emoji: '🧄', seed: 3, sprout: 7, bloom: 10, harvest: 25, water: 0.5, fertilize: 0.2, weed: 0.4 },
    { name: '西瓜', emoji: '🍉', seed: 5, sprout: 7, bloom: 12, harvest: 25, water: 2, fertilize: 0.4, weed: 0.3 },
    { name: '草莓', emoji: '🍓', seed: 7, sprout: 14, bloom: 10, harvest: 15, water: 1.5, fertilize: 0.3, weed: 0.4 },
    { name: '葡萄', emoji: '🍇', seed: 7, sprout: 14, bloom: 20, harvest: 30, water: 1, fertilize: 0.3, weed: 0.3 },
    { name: '苹果', emoji: '🍎', seed: 10, sprout: 20, bloom: 30, harvest: 45, water: 1, fertilize: 0.4, weed: 0.2 },
    { name: '橘子', emoji: '🍊', seed: 10, sprout: 18, bloom: 25, harvest: 40, water: 1, fertilize: 0.3, weed: 0.2 },
  ];

  const insertCrop = db.prepare(`
    INSERT INTO crops (id, name, emoji, seed_days, sprout_days, bloom_days, harvest_days, water_per_day, fertilize_per_day, weed_per_day)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  const transaction = db.transaction(() => {
    for (const crop of crops) {
      insertCrop.run(
        uuidv4(),
        crop.name,
        crop.emoji,
        crop.seed,
        crop.sprout,
        crop.bloom,
        crop.harvest,
        crop.water,
        crop.fertilize,
        crop.weed
      );
    }
  });
  transaction();
}

const plotCount = db.prepare('SELECT COUNT(*) as count FROM plots').get() as { count: number };
if (plotCount.count === 0) {
  const insertPlot = db.prepare('INSERT INTO plots (id, row, col, status) VALUES (?, ?, ?, ?)');
  const transaction = db.transaction(() => {
    for (let row = 0; row < 5; row++) {
      for (let col = 0; col < 5; col++) {
        insertPlot.run(uuidv4(), row, col, 'empty');
      }
    }
  });
  transaction();
}

const userCount = db.prepare('SELECT COUNT(*) as count FROM users').get() as { count: number };
if (userCount.count === 0) {
  const insertUser = db.prepare('INSERT INTO users (id, username, created_at) VALUES (?, ?, ?)');
  const now = new Date().toISOString();
  insertUser.run('demo-user-1', '小明', now);
  insertUser.run('demo-user-2', '小红', now);
  insertUser.run('demo-user-3', '小刚', now);
}

const server = app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});

const wss = new WebSocketServer({ server });

const userSockets = new Map<string, any>();

wss.on('connection', (ws) => {
  let currentUserId: string | null = null;

  ws.on('message', (message) => {
    try {
      const data = JSON.parse(message.toString());
      if (data.type === 'auth' && data.userId) {
        currentUserId = data.userId;
        userSockets.set(data.userId, ws);
        console.log(`User ${data.userId} connected via WebSocket`);
      }
    } catch (e) {
      console.error('WebSocket message error:', e);
    }
  });

  ws.on('close', () => {
    if (currentUserId) {
      userSockets.delete(currentUserId);
      console.log(`User ${currentUserId} disconnected`);
    }
  });
});

function sendToUser(userId: string, message: any) {
  const ws = userSockets.get(userId);
  if (ws && ws.readyState === 1) {
    ws.send(JSON.stringify(message));
  }
}

setupRoutes(app, db, sendToUser);

export { db, sendToUser };
