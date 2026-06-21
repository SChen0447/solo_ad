import express from 'express';
import cors from 'cors';
import Database from 'better-sqlite3';
import { v4 as uuidv4 } from 'uuid';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const port = 5000;

app.use(cors());
app.use(express.json());

const db = new Database(path.join(__dirname, 'music.db'));

db.pragma('journal_mode = WAL');

db.exec(`
  CREATE TABLE IF NOT EXISTS rooms (
    id TEXT PRIMARY KEY,
    code TEXT UNIQUE NOT NULL,
    theme TEXT NOT NULL,
    created_at INTEGER NOT NULL,
    user_id TEXT NOT NULL,
    user_name TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS room_songs (
    id TEXT PRIMARY KEY,
    room_id TEXT NOT NULL,
    user_id TEXT NOT NULL,
    user_name TEXT NOT NULL,
    song_id TEXT NOT NULL,
    song_title TEXT NOT NULL,
    song_artist TEXT NOT NULL,
    song_cover TEXT NOT NULL,
    song_duration INTEGER NOT NULL,
    song_tags TEXT NOT NULL,
    added_at INTEGER NOT NULL,
    FOREIGN KEY (room_id) REFERENCES rooms(id)
  );

  CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    created_at INTEGER NOT NULL
  );

  CREATE INDEX IF NOT EXISTS idx_rooms_code ON rooms(code);
  CREATE INDEX IF NOT EXISTS idx_room_songs_room_id ON room_songs(room_id);
  CREATE INDEX IF NOT EXISTS idx_room_songs_user_id ON room_songs(user_id);
`);

interface Song {
  id: string;
  title: string;
  artist: string;
  cover: string;
  duration: number;
  tags: string[];
}

function toCamelCase(obj: any): any {
  if (Array.isArray(obj)) {
    return obj.map(toCamelCase);
  }
  if (obj !== null && typeof obj === 'object') {
    const result: any = {};
    for (const key of Object.keys(obj)) {
      const camelKey = key.replace(/_([a-z])/g, (_, letter) => letter.toUpperCase());
      result[camelKey] = toCamelCase(obj[key]);
    }
    return result;
  }
  return obj;
}

function transformRoomSong(song: any): any {
  const transformed = toCamelCase(song);
  transformed.songTags = JSON.parse(song.song_tags);
  return transformed;
}

const mockSongs: Song[] = [
  { id: 's1', title: '夜空中最亮的星', artist: '逃跑计划', cover: 'https://picsum.photos/seed/song1/300/300', duration: 252, tags: ['摇滚', '民谣', '治愈'] },
  { id: 's2', title: '海阔天空', artist: 'Beyond', cover: 'https://picsum.photos/seed/song2/300/300', duration: 326, tags: ['摇滚', '经典', '粤语'] },
  { id: 's3', title: '晴天', artist: '周杰伦', cover: 'https://picsum.photos/seed/song3/300/300', duration: 269, tags: ['流行', '青春', '回忆'] },
  { id: 's4', title: '起风了', artist: '买辣椒也用券', cover: 'https://picsum.photos/seed/song4/300/300', duration: 325, tags: ['民谣', '治愈', '流行'] },
  { id: 's5', title: 'Faded', artist: 'Alan Walker', cover: 'https://picsum.photos/seed/song5/300/300', duration: 212, tags: ['电子', 'EDM', '经典'] },
  { id: 's6', title: 'Shape of You', artist: 'Ed Sheeran', cover: 'https://picsum.photos/seed/song6/300/300', duration: 234, tags: ['流行', '英文', '节奏'] },
  { id: 's7', title: 'Bohemian Rhapsody', artist: 'Queen', cover: 'https://picsum.photos/seed/song7/300/300', duration: 354, tags: ['摇滚', '经典', '英文'] },
  { id: 's8', title: '成都', artist: '赵雷', cover: 'https://picsum.photos/seed/song8/300/300', duration: 328, tags: ['民谣', '治愈', '城市'] },
  { id: 's9', title: 'Titanium', artist: 'David Guetta', cover: 'https://picsum.photos/seed/song9/300/300', duration: 245, tags: ['电子', 'EDM', '励志'] },
  { id: 's10', title: '稻香', artist: '周杰伦', cover: 'https://picsum.photos/seed/song10/300/300', duration: 223, tags: ['流行', '治愈', '青春'] },
  { id: 's11', title: '光辉岁月', artist: 'Beyond', cover: 'https://picsum.photos/seed/song11/300/300', duration: 295, tags: ['摇滚', '经典', '粤语'] },
  { id: 's12', title: '南山南', artist: '马頔', cover: 'https://picsum.photos/seed/song12/300/300', duration: 332, tags: ['民谣', '治愈', '忧伤'] },
  { id: 's13', title: 'Wake Me Up', artist: 'Avicii', cover: 'https://picsum.photos/seed/song13/300/300', duration: 251, tags: ['电子', 'EDM', '励志'] },
  { id: 's14', title: '七里香', artist: '周杰伦', cover: 'https://picsum.photos/seed/song14/300/300', duration: 299, tags: ['流行', '青春', '回忆'] },
  { id: 's15', title: 'Hotel California', artist: 'Eagles', cover: 'https://picsum.photos/seed/song15/300/300', duration: 391, tags: ['摇滚', '经典', '英文'] },
  { id: 's16', title: '安和桥', artist: '宋冬野', cover: 'https://picsum.photos/seed/song16/300/300', duration: 356, tags: ['民谣', '治愈', '城市'] },
  { id: 's17', title: 'Closer', artist: 'The Chainsmokers', cover: 'https://picsum.photos/seed/song17/300/300', duration: 244, tags: ['电子', '流行', '英文'] },
  { id: 's18', title: '告白气球', artist: '周杰伦', cover: 'https://picsum.photos/seed/song18/300/300', duration: 215, tags: ['流行', '甜蜜', '青春'] },
  { id: 's19', title: '真的爱你', artist: 'Beyond', cover: 'https://picsum.photos/seed/song19/300/300', duration: 289, tags: ['摇滚', '经典', '粤语'] },
  { id: 's20', title: 'Levitating', artist: 'Dua Lipa', cover: 'https://picsum.photos/seed/song20/300/300', duration: 203, tags: ['流行', '电子', '英文'] },
  { id: 's21', title: '理想三旬', artist: '陈鸿宇', cover: 'https://picsum.photos/seed/song21/300/300', duration: 297, tags: ['民谣', '治愈', '理想'] },
  { id: 's22', title: "Sweet Child O' Mine", artist: "Guns N' Roses", cover: 'https://picsum.photos/seed/song22/300/300', duration: 356, tags: ['摇滚', '经典', '英文'] },
  { id: 's23', title: 'Alone', artist: 'Marshmello', cover: 'https://picsum.photos/seed/song23/300/300', duration: 253, tags: ['电子', 'EDM', '治愈'] },
  { id: 's24', title: '年少有为', artist: '李荣浩', cover: 'https://picsum.photos/seed/song24/300/300', duration: 268, tags: ['流行', '青春', '励志'] },
  { id: 's25', title: '蓝莲花', artist: '许巍', cover: 'https://picsum.photos/seed/song25/300/300', duration: 276, tags: ['摇滚', '民谣', '励志'] },
  { id: 's26', title: 'Happier', artist: 'Marshmello', cover: 'https://picsum.photos/seed/song26/300/300', duration: 238, tags: ['电子', '流行', '英文'] },
  { id: 's27', title: '匆匆那年', artist: '王菲', cover: 'https://picsum.photos/seed/song27/300/300', duration: 287, tags: ['流行', '回忆', '治愈'] },
  { id: 's28', title: "Don't Stop Believin'", artist: 'Journey', cover: 'https://picsum.photos/seed/song28/300/300', duration: 249, tags: ['摇滚', '经典', '励志'] },
  { id: 's29', title: 'The Nights', artist: 'Avicii', cover: 'https://picsum.photos/seed/song29/300/300', duration: 238, tags: ['电子', 'EDM', '励志'] },
  { id: 's30', title: '小幸运', artist: '田馥甄', cover: 'https://picsum.photos/seed/song30/300/300', duration: 293, tags: ['流行', '青春', '治愈'] },
];

function generateRoomCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = '';
  for (let i = 0; i < 6; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}

app.get('/api/songs/search', (req, res) => {
  const { q } = req.query;
  const query = (q as string || '').toLowerCase().trim();
  
  if (!query) {
    return res.json(mockSongs.slice(0, 10));
  }

  const results = mockSongs.filter(song =>
    song.title.toLowerCase().includes(query) ||
    song.artist.toLowerCase().includes(query) ||
    song.tags.some(tag => tag.toLowerCase().includes(query))
  );

  res.json(results.slice(0, 20));
});

app.post('/api/rooms', (req, res) => {
  const { theme, userId, userName } = req.body;
  
  if (!theme || !userId || !userName) {
    return res.status(400).json({ error: '缺少必要参数' });
  }

  const roomId = uuidv4();
  let code = generateRoomCode();
  
  const existingRoom = db.prepare('SELECT id FROM rooms WHERE code = ?').get(code);
  if (existingRoom) {
    code = generateRoomCode();
  }

  const createdAt = Date.now();

  db.prepare(`
    INSERT INTO rooms (id, code, theme, created_at, user_id, user_name)
    VALUES (?, ?, ?, ?, ?, ?)
  `).run(roomId, code, theme, createdAt, userId, userName);

  const userExists = db.prepare('SELECT id FROM users WHERE id = ?').get(userId);
  if (!userExists) {
    db.prepare('INSERT INTO users (id, name, created_at) VALUES (?, ?, ?)').run(userId, userName, createdAt);
  }

  res.json({ id: roomId, code, theme, createdAt, userId, userName });
});

app.get('/api/rooms/:code', (req, res) => {
  const { code } = req.params;
  
  const room = db.prepare('SELECT * FROM rooms WHERE code = ?').get(code);
  
  if (!room) {
    return res.status(404).json({ error: '房间不存在' });
  }

  const songs = db.prepare(`
    SELECT * FROM room_songs WHERE room_id = ? ORDER BY added_at DESC
  `).all(room.id);

  const songsWithTags = songs.map(transformRoomSong);

  res.json({ ...toCamelCase(room), songs: songsWithTags });
});

app.post('/api/rooms/:code/songs', (req, res) => {
  const { code } = req.params;
  const { songId, userId, userName } = req.body;

  if (!songId || !userId || !userName) {
    return res.status(400).json({ error: '缺少必要参数' });
  }

  const room = db.prepare('SELECT * FROM rooms WHERE code = ?').get(code);
  
  if (!room) {
    return res.status(404).json({ error: '房间不存在' });
  }

  const userSongCount = db.prepare(`
    SELECT COUNT(*) as count FROM room_songs WHERE room_id = ? AND user_id = ?
  `).get(room.id, userId);

  if (userSongCount.count >= 3) {
    return res.status(400).json({ error: '每人最多添加3首歌曲' });
  }

  const existingSong = db.prepare(`
    SELECT id FROM room_songs WHERE room_id = ? AND song_id = ?
  `).get(room.id, songId);

  if (existingSong) {
    return res.status(400).json({ error: '该歌曲已在房间中' });
  }

  const song = mockSongs.find(s => s.id === songId);
  
  if (!song) {
    return res.status(404).json({ error: '歌曲不存在' });
  }

  const id = uuidv4();
  const addedAt = Date.now();

  db.prepare(`
    INSERT INTO room_songs (id, room_id, user_id, user_name, song_id, song_title, song_artist, song_cover, song_duration, song_tags, added_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    id,
    room.id,
    userId,
    userName,
    song.id,
    song.title,
    song.artist,
    song.cover,
    song.duration,
    JSON.stringify(song.tags),
    addedAt
  );

  const userExists = db.prepare('SELECT id FROM users WHERE id = ?').get(userId);
  if (!userExists) {
    db.prepare('INSERT INTO users (id, name, created_at) VALUES (?, ?, ?)').run(userId, userName, addedAt);
  }

  res.json({
    id,
    roomId: room.id,
    userId,
    userName,
    songId: song.id,
    songTitle: song.title,
    songArtist: song.artist,
    songCover: song.cover,
    songDuration: song.duration,
    songTags: song.tags,
    addedAt,
  });
});

app.get('/api/rooms/:code/analytics', (req, res) => {
  const { code } = req.params;

  const room = db.prepare('SELECT * FROM rooms WHERE code = ?').get(code);
  
  if (!room) {
    return res.status(404).json({ error: '房间不存在' });
  }

  const songs = db.prepare(`
    SELECT * FROM room_songs WHERE room_id = ? ORDER BY added_at DESC
  `).all(room.id);

  const songsWithTags = songs.map(transformRoomSong);

  const tagFrequency: Record<string, number> = {};
  songsWithTags.forEach((song: any) => {
    song.songTags.forEach((tag: string) => {
      tagFrequency[tag] = (tagFrequency[tag] || 0) + 1;
    });
  });

  const tags = Object.entries(tagFrequency).map(([name, count]) => ({
    name,
    count,
    weight: count / Math.max(...Object.values(tagFrequency), 1),
  }));

  const allSongTags = new Set(songsWithTags.flatMap((s: any) => s.songTags));
  
  const recommendedSongs = mockSongs
    .filter(song => !songsWithTags.some((s: any) => s.songId === song.id))
    .map(song => {
      const overlap = song.tags.filter(tag => allSongTags.has(tag)).length;
      const score = overlap / Math.max(song.tags.length, 1);
      return { ...song, score };
    })
    .sort((a, b) => b.score - a.score)
    .slice(0, 5);

  res.json({
    room: toCamelCase(room),
    songs: songsWithTags,
    tags,
    recommendedSongs,
    totalSongs: songsWithTags.length,
    uniqueUsers: new Set(songsWithTags.map((s: any) => s.userId)).size,
  });
});

app.get('/api/users/:userId/history', (req, res) => {
  const { userId } = req.params;

  const user = db.prepare('SELECT * FROM users WHERE id = ?').get(userId);
  
  if (!user) {
    return res.status(404).json({ error: '用户不存在' });
  }

  const songs = db.prepare(`
    SELECT rs.*, r.code as room_code, r.theme as room_theme
    FROM room_songs rs
    JOIN rooms r ON rs.room_id = r.id
    WHERE rs.user_id = ?
    ORDER BY rs.added_at DESC
  `).all(userId);

  const historyWithTags = songs.map(s => {
    const transformed = transformRoomSong(s);
    transformed.roomCode = s.room_code;
    transformed.roomTheme = s.room_theme;
    return transformed;
  });

  const rooms = db.prepare(`
    SELECT r.*, 
           (SELECT COUNT(*) FROM room_songs WHERE room_id = r.id) as song_count
    FROM rooms r
    WHERE r.user_id = ?
    OR r.id IN (SELECT DISTINCT room_id FROM room_songs WHERE user_id = ?)
    ORDER BY r.created_at DESC
  `).all(userId, userId);

  const transformedRooms = rooms.map(r => {
    const transformed = toCamelCase(r);
    transformed.songCount = r.song_count;
    return transformed;
  });

  res.json({
    user: toCamelCase(user),
    history: historyWithTags,
    rooms: transformedRooms,
  });
});

app.listen(port, () => {
  console.log(`Server running on port ${port}`);
});
