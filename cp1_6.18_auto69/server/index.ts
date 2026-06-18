import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import { v4 as uuidv4 } from 'uuid';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

interface User {
  id: string;
  username: string;
  password: string;
  avatar: string;
  createdAt: number;
}

interface Item {
  id: string;
  title: string;
  description: string;
  startingPrice: number;
  currentPrice: number;
  image: string;
  artistId: string;
  artistName: string;
  createdAt: number;
  duration: number;
  ended: boolean;
  winnerId: string | null;
  winnerName: string | null;
}

interface Bid {
  id: string;
  itemId: string;
  userId: string;
  username: string;
  amount: number;
  createdAt: number;
}

interface DB {
  users: User[];
  items: Item[];
  bids: Bid[];
}

const DB_PATH = path.join(__dirname, 'data', 'items.json');

const readDB = (): DB => {
  try {
    const data = fs.readFileSync(DB_PATH, 'utf-8');
    return JSON.parse(data);
  } catch {
    return { users: [], items: [], bids: [] };
  }
};

const writeDB = (db: DB) => {
  fs.writeFileSync(DB_PATH, JSON.stringify(db, null, 2));
};

const app = express();
const httpServer = createServer(app);

app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

const io = new Server(httpServer, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST'],
  },
});

const AUCTION_DURATION = 30 * 60 * 1000;

const checkAuctionEnd = (item: Item): Item => {
  if (item.ended) return item;
  const now = Date.now();
  if (now - item.createdAt >= item.duration) {
    item.ended = true;
    const db = readDB();
    const itemBids = db.bids.filter((b) => b.itemId === item.id);
    if (itemBids.length > 0) {
      const highestBid = itemBids.reduce((max, bid) => (bid.amount > max.amount ? bid : max), itemBids[0]);
      item.winnerId = highestBid.userId;
      item.winnerName = highestBid.username;
    }
    const idx = db.items.findIndex((i) => i.id === item.id);
    if (idx !== -1) {
      db.items[idx] = item;
      writeDB(db);
    }
    io.to(`auction:${item.id}`).emit('auction:ended', { itemId: item.id, winner: item.winnerName, winningBid: item.currentPrice });
    io.emit('item:updated', item);
  }
  return item;
};

setInterval(() => {
  const db = readDB();
  let updated = false;
  db.items.forEach((item) => {
    if (!item.ended) {
      const before = item.ended;
      checkAuctionEnd(item);
      if (before !== item.ended) updated = true;
    }
  });
  if (updated) writeDB(db);
}, 1000);

app.post('/api/auth/register', (req, res) => {
  const { username, password } = req.body;
  if (!username || !password) {
    return res.status(400).json({ error: '用户名和密码不能为空' });
  }
  if (username.length > 20) {
    return res.status(400).json({ error: '用户名不能超过20字' });
  }
  const db = readDB();
  if (db.users.find((u) => u.username === username)) {
    return res.status(400).json({ error: '用户名已存在' });
  }
  const user: User = {
    id: uuidv4(),
    username,
    password,
    avatar: username[0].toUpperCase(),
    createdAt: Date.now(),
  };
  db.users.push(user);
  writeDB(db);
  const { password: _, ...userWithoutPwd } = user;
  res.json(userWithoutPwd);
});

app.post('/api/auth/login', (req, res) => {
  const { username, password } = req.body;
  if (!username || !password) {
    return res.status(400).json({ error: '用户名和密码不能为空' });
  }
  const db = readDB();
  const user = db.users.find((u) => u.username === username && u.password === password);
  if (!user) {
    return res.status(401).json({ error: '用户名或密码错误' });
  }
  const { password: _, ...userWithoutPwd } = user;
  res.json(userWithoutPwd);
});

app.get('/api/items', (req, res) => {
  const page = parseInt(req.query.page as string) || 1;
  const limit = parseInt(req.query.limit as string) || 20;
  const db = readDB();
  const items = db.items
    .map(checkAuctionEnd)
    .sort((a, b) => b.createdAt - a.createdAt);
  const start = (page - 1) * limit;
  const paginatedItems = items.slice(start, start + limit);
  res.json({
    items: paginatedItems,
    total: items.length,
    page,
    limit,
  });
});

app.get('/api/items/:id', (req, res) => {
  const db = readDB();
  const item = db.items.find((i) => i.id === req.params.id);
  if (!item) {
    return res.status(404).json({ error: '拍品不存在' });
  }
  res.json(checkAuctionEnd(item));
});

app.post('/api/items', (req, res) => {
  const { title, description, startingPrice, image, artistId, artistName } = req.body;
  if (!title || !description || !startingPrice || !image || !artistId) {
    return res.status(400).json({ error: '缺少必填字段' });
  }
  if (title.length > 20) {
    return res.status(400).json({ error: '标题不能超过20字' });
  }
  if (description.length > 300) {
    return res.status(400).json({ error: '描述不能超过300字' });
  }
  if (!Number.isInteger(startingPrice) || startingPrice <= 0) {
    return res.status(400).json({ error: '起拍价必须是正整数' });
  }
  const db = readDB();
  const item: Item = {
    id: uuidv4(),
    title,
    description,
    startingPrice,
    currentPrice: startingPrice,
    image,
    artistId,
    artistName,
    createdAt: Date.now(),
    duration: AUCTION_DURATION,
    ended: false,
    winnerId: null,
    winnerName: null,
  };
  db.items.unshift(item);
  writeDB(db);
  io.emit('item:created', item);
  res.status(201).json(item);
});

app.get('/api/items/:id/bids', (req, res) => {
  const db = readDB();
  const bids = db.bids
    .filter((b) => b.itemId === req.params.id)
    .sort((a, b) => b.createdAt - a.createdAt);
  res.json(bids);
});

app.post('/api/items/:id/bids', (req, res) => {
  const { userId, username, amount } = req.body;
  const itemId = req.params.id;
  if (!userId || !username || !amount) {
    return res.status(400).json({ error: '缺少必填字段' });
  }
  if (!Number.isInteger(amount) || amount <= 0) {
    return res.status(400).json({ error: '出价必须是正整数' });
  }
  const db = readDB();
  const itemIdx = db.items.findIndex((i) => i.id === itemId);
  if (itemIdx === -1) {
    return res.status(404).json({ error: '拍品不存在' });
  }
  const item = checkAuctionEnd(db.items[itemIdx]);
  if (item.ended) {
    return res.status(400).json({ error: '拍卖已结束' });
  }
  const minBid = item.currentPrice + 10;
  if (amount < minBid) {
    return res.status(400).json({ error: `出价必须至少为￥${minBid}` });
  }
  const bid: Bid = {
    id: uuidv4(),
    itemId,
    userId,
    username,
    amount,
    createdAt: Date.now(),
  };
  db.bids.push(bid);
  db.items[itemIdx].currentPrice = amount;
  writeDB(db);
  io.to(`auction:${itemId}`).emit('bid:new', bid);
  io.emit('item:updated', db.items[itemIdx]);
  res.status(201).json(bid);
});

io.on('connection', (socket) => {
  socket.on('auction:join', (itemId: string) => {
    socket.join(`auction:${itemId}`);
  });
  socket.on('auction:leave', (itemId: string) => {
    socket.leave(`auction:${itemId}`);
  });
});

const PORT = 3001;
httpServer.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
