import express from 'express';
import http from 'http';
import { Server as SocketIOServer } from 'socket.io';
import cors from 'cors';
import Database from 'better-sqlite3';
import { v4 as uuidv4 } from 'uuid';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const server = http.createServer(app);
const io = new SocketIOServer(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST', 'PUT', 'DELETE']
  }
});

app.use(cors());
app.use(express.json());

const db = new Database(path.join(__dirname, '..', 'brainstorm.db'));

db.exec(`
  CREATE TABLE IF NOT EXISTS boards (
    id TEXT PRIMARY KEY,
    name TEXT DEFAULT 'My Board',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS stickies (
    id TEXT PRIMARY KEY,
    board_id TEXT NOT NULL,
    content TEXT DEFAULT '',
    color TEXT DEFAULT '#FFD1DC',
    x INTEGER DEFAULT 100,
    y INTEGER DEFAULT 100,
    width INTEGER DEFAULT 160,
    height INTEGER DEFAULT 120,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (board_id) REFERENCES boards(id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS votes (
    id TEXT PRIMARY KEY,
    sticky_id TEXT NOT NULL,
    user_id TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (sticky_id) REFERENCES stickies(id) ON DELETE CASCADE,
    UNIQUE(sticky_id, user_id)
  );

  CREATE TABLE IF NOT EXISTS connections (
    id TEXT PRIMARY KEY,
    board_id TEXT NOT NULL,
    from_sticky_id TEXT NOT NULL,
    to_sticky_id TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (board_id) REFERENCES boards(id) ON DELETE CASCADE,
    FOREIGN KEY (from_sticky_id) REFERENCES stickies(id) ON DELETE CASCADE,
    FOREIGN KEY (to_sticky_id) REFERENCES stickies(id) ON DELETE CASCADE
  );
`);

const getDefaultBoardId = (): string => {
  const row = db.prepare('SELECT id FROM boards LIMIT 1').get() as { id: string } | undefined;
  if (row) return row.id;
  
  const boardId = uuidv4();
  db.prepare('INSERT INTO boards (id, name) VALUES (?, ?)').run(boardId, 'My Board');
  return boardId;
};

const getVoteCount = (stickyId: string): number => {
  const row = db.prepare('SELECT COUNT(*) as count FROM votes WHERE sticky_id = ?').get(stickyId) as { count: number };
  return row.count;
};

interface StickyWithVotes {
  id: string;
  board_id: string;
  content: string;
  color: string;
  x: number;
  y: number;
  width: number;
  height: number;
  votes: number;
}

const getStickyWithVotes = (stickyId: string): StickyWithVotes | undefined => {
  const row = db.prepare(`
    SELECT s.*, COUNT(v.id) as votes 
    FROM stickies s 
    LEFT JOIN votes v ON s.id = v.sticky_id 
    WHERE s.id = ?
    GROUP BY s.id
  `).get(stickyId) as StickyWithVotes | undefined;
  return row;
};

const getAllStickiesWithVotes = (boardId: string): StickyWithVotes[] => {
  const rows = db.prepare(`
    SELECT s.*, COUNT(v.id) as votes 
    FROM stickies s 
    LEFT JOIN votes v ON s.id = v.sticky_id 
    WHERE s.board_id = ?
    GROUP BY s.id
    ORDER BY s.created_at ASC
  `).all(boardId) as StickyWithVotes[];
  return rows;
};

interface OnlineUser {
  id: string;
  name: string;
  socketId: string;
}

const onlineUsers = new Map<string, OnlineUser>();

app.get('/api/board', (req, res) => {
  const boardId = getDefaultBoardId();
  const board = db.prepare('SELECT * FROM boards WHERE id = ?').get(boardId);
  const stickies = getAllStickiesWithVotes(boardId);
  const connections = db.prepare('SELECT * FROM connections WHERE board_id = ?').all(boardId);
  
  res.json({
    board,
    stickies,
    connections
  });
});

app.post('/api/board/:id/sticky', (req, res) => {
  const { id: boardId } = req.params;
  const { content, color, x, y } = req.body;
  
  const stickyId = uuidv4();
  const finalColor = color || '#FFD1DC';
  
  db.prepare(`
    INSERT INTO stickies (id, board_id, content, color, x, y, width, height)
    VALUES (?, ?, ?, ?, ?, ?, 160, 120)
  `).run(stickyId, boardId, content || '', finalColor, x || 100, y || 100);
  
  const sticky = getStickyWithVotes(stickyId);
  
  io.to(boardId).emit('stickyCreated', sticky);
  
  res.json(sticky);
});

app.put('/api/sticky/:id/position', (req, res) => {
  const { id } = req.params;
  const { x, y } = req.body;
  
  db.prepare('UPDATE stickies SET x = ?, y = ? WHERE id = ?').run(x, y, id);
  
  const sticky = getStickyWithVotes(id);
  const boardId = (db.prepare('SELECT board_id FROM stickies WHERE id = ?').get(id) as { board_id: string })?.board_id;
  
  if (boardId) {
    io.to(boardId).emit('stickyMoved', { id, x, y });
  }
  
  res.json(sticky);
});

app.put('/api/sticky/:id/content', (req, res) => {
  const { id } = req.params;
  const { content, color } = req.body;
  
  if (content !== undefined) {
    db.prepare('UPDATE stickies SET content = ? WHERE id = ?').run(content.substring(0, 200), id);
  }
  if (color !== undefined) {
    db.prepare('UPDATE stickies SET color = ? WHERE id = ?').run(color, id);
  }
  
  const sticky = getStickyWithVotes(id);
  const boardId = (db.prepare('SELECT board_id FROM stickies WHERE id = ?').get(id) as { board_id: string })?.board_id;
  
  if (boardId) {
    io.to(boardId).emit('stickyUpdated', sticky);
  }
  
  res.json(sticky);
});

app.delete('/api/sticky/:id', (req, res) => {
  const { id } = req.params;
  
  const boardId = (db.prepare('SELECT board_id FROM stickies WHERE id = ?').get(id) as { board_id: string })?.board_id;
  
  db.prepare('DELETE FROM stickies WHERE id = ?').run(id);
  
  if (boardId) {
    io.to(boardId).emit('stickyDeleted', { id });
  }
  
  res.json({ success: true });
});

app.post('/api/sticky/:id/vote', (req, res) => {
  const { id: stickyId } = req.params;
  const { userId } = req.body;
  
  const existingVote = db.prepare('SELECT * FROM votes WHERE sticky_id = ? AND user_id = ?').get(stickyId, userId);
  
  if (existingVote) {
    db.prepare('DELETE FROM votes WHERE sticky_id = ? AND user_id = ?').run(stickyId, userId);
  } else {
    const voteId = uuidv4();
    db.prepare('INSERT INTO votes (id, sticky_id, user_id) VALUES (?, ?, ?)').run(voteId, stickyId, userId);
  }
  
  const votes = getVoteCount(stickyId);
  const boardId = (db.prepare('SELECT board_id FROM stickies WHERE id = ?').get(stickyId) as { board_id: string })?.board_id;
  
  if (boardId) {
    io.to(boardId).emit('voteUpdated', { stickyId, votes, userId, voted: !existingVote });
  }
  
  res.json({ stickyId, votes, voted: !existingVote });
});

app.get('/api/board/:id/report', (req, res) => {
  const { id: boardId } = req.params;
  
  const stickies = db.prepare(`
    SELECT s.*, COUNT(v.id) as votes 
    FROM stickies s 
    LEFT JOIN votes v ON s.id = v.sticky_id 
    WHERE s.board_id = ?
    GROUP BY s.id
    ORDER BY votes DESC, s.created_at ASC
  `).all(boardId);
  
  const totalVotes = (db.prepare(`
    SELECT COUNT(*) as total FROM votes v 
    JOIN stickies s ON v.sticky_id = s.id 
    WHERE s.board_id = ?
  `).get(boardId) as { total: number })?.total || 0;
  
  res.json({
    stickies,
    totalVotes,
    totalStickies: stickies.length
  });
});

app.post('/api/board/:id/connection', (req, res) => {
  const { id: boardId } = req.params;
  const { fromStickyId, toStickyId } = req.body;
  
  if (fromStickyId === toStickyId) {
    return res.status(400).json({ error: 'Cannot connect sticky to itself' });
  }
  
  const existing = db.prepare(`
    SELECT * FROM connections 
    WHERE board_id = ? AND ((from_sticky_id = ? AND to_sticky_id = ?) OR (from_sticky_id = ? AND to_sticky_id = ?))
  `).get(boardId, fromStickyId, toStickyId, toStickyId, fromStickyId);
  
  if (existing) {
    return res.json(existing);
  }
  
  const connectionId = uuidv4();
  db.prepare(`
    INSERT INTO connections (id, board_id, from_sticky_id, to_sticky_id)
    VALUES (?, ?, ?, ?)
  `).run(connectionId, boardId, fromStickyId, toStickyId);
  
  const connection = db.prepare('SELECT * FROM connections WHERE id = ?').get(connectionId);
  
  io.to(boardId).emit('connectionCreated', connection);
  
  res.json(connection);
});

app.delete('/api/connection/:id', (req, res) => {
  const { id } = req.params;
  
  const boardId = (db.prepare('SELECT board_id FROM connections WHERE id = ?').get(id) as { board_id: string })?.board_id;
  
  db.prepare('DELETE FROM connections WHERE id = ?').run(id);
  
  if (boardId) {
    io.to(boardId).emit('connectionDeleted', { id });
  }
  
  res.json({ success: true });
});

io.on('connection', (socket) => {
  const userId = socket.handshake.query.userId as string;
  const userName = socket.handshake.query.userName as string || '匿名用户';
  const boardId = getDefaultBoardId();
  
  socket.join(boardId);
  
  onlineUsers.set(userId, {
    id: userId,
    name: userName,
    socketId: socket.id
  });
  
  io.to(boardId).emit('usersUpdate', Array.from(onlineUsers.values()));
  
  socket.on('updateUserName', ({ userId, name }: { userId: string; name: string }) => {
    const user = onlineUsers.get(userId);
    if (user) {
      user.name = name.substring(0, 8);
      onlineUsers.set(userId, user);
      io.to(boardId).emit('usersUpdate', Array.from(onlineUsers.values()));
    }
  });
  
  socket.on('disconnect', () => {
    onlineUsers.delete(userId);
    io.to(boardId).emit('usersUpdate', Array.from(onlineUsers.values()));
  });
});

const PORT = 3001;
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  console.log(`Board ID: ${getDefaultBoardId()}`);
});
