import { Router, Request, Response, NextFunction } from 'express';
import { v4 as uuidv4 } from 'uuid';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import db from './db.js';
import { getIO, broadcastNewComment } from './socket.js';

const JWT_SECRET = 'poi-social-platform-secret-key-2024';

export interface AuthRequest extends Request {
  userId?: string;
}

export const router = Router();

const generateAvatarColor = (nickname: string): string => {
  const colors = ['#409EFF', '#67C23A', '#E6A23C', '#F56C6C', '#909399', '#8e44ad', '#16a085', '#d35400'];
  let hash = 0;
  for (let i = 0; i < nickname.length; i++) {
    hash = nickname.charCodeAt(i) + ((hash << 5) - hash);
  }
  return colors[Math.abs(hash) % colors.length];
};

const authenticateToken = (req: AuthRequest, res: Response, next: NextFunction) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.startsWith('Bearer ') ? authHeader.slice(7) : null;

  if (!token) {
    return res.status(401).json({ error: '未登录' });
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET) as { userId: string };
    req.userId = decoded.userId;
    next();
  } catch {
    return res.status(403).json({ error: 'Token 无效' });
  }
};

router.post('/register', (req: Request, res: Response) => {
  const { nickname, password } = req.body;

  if (!nickname || !password) {
    return res.status(400).json({ error: '昵称和密码不能为空' });
  }

  const existingUser = db.prepare('SELECT id FROM users WHERE nickname = ?').get(nickname);
  if (existingUser) {
    return res.status(400).json({ error: '昵称已存在' });
  }

  const hashedPassword = bcrypt.hashSync(password, 10);
  const id = uuidv4();
  const now = Date.now();
  const avatarColor = generateAvatarColor(nickname);

  db.prepare('INSERT INTO users (id, nickname, password, avatar_color, created_at) VALUES (?, ?, ?, ?, ?)')
    .run(id, nickname, hashedPassword, avatarColor, now);

  const token = jwt.sign({ userId: id }, JWT_SECRET, { expiresIn: '7d' });

  res.json({
    token,
    user: { id, nickname, avatarColor },
  });
});

router.post('/login', (req: Request, res: Response) => {
  const { nickname, password } = req.body;

  if (!nickname || !password) {
    return res.status(400).json({ error: '昵称和密码不能为空' });
  }

  const user: any = db.prepare('SELECT * FROM users WHERE nickname = ?').get(nickname);
  if (!user) {
    return res.status(400).json({ error: '用户不存在' });
  }

  if (!bcrypt.compareSync(password, user.password)) {
    return res.status(400).json({ error: '密码错误' });
  }

  const token = jwt.sign({ userId: user.id }, JWT_SECRET, { expiresIn: '7d' });

  res.json({
    token,
    user: { id: user.id, nickname: user.nickname, avatarColor: user.avatar_color },
  });
});

router.get('/pois', (req: Request, res: Response) => {
  const { minLat, maxLat, minLng, maxLng } = req.query;

  let pois;
  if (minLat && maxLat && minLng && maxLng) {
    pois = db.prepare(`
      SELECT p.*, u.nickname as creator_name, u.avatar_color as creator_avatar,
        (SELECT COUNT(*) FROM likes WHERE poi_id = p.id) as like_count
      FROM pois p
      JOIN users u ON p.creator_id = u.id
      WHERE p.lat >= ? AND p.lat <= ? AND p.lng >= ? AND p.lng <= ?
    `).all(minLat, maxLat, minLng, maxLng);
  } else {
    pois = db.prepare(`
      SELECT p.*, u.nickname as creator_name, u.avatar_color as creator_avatar,
        (SELECT COUNT(*) FROM likes WHERE poi_id = p.id) as like_count
      FROM pois p
      JOIN users u ON p.creator_id = u.id
    `).all();
  }

  res.json(pois);
});

router.get('/pois/:id', (req: Request, res: Response) => {
  const { id } = req.params;

  const poi: any = db.prepare(`
    SELECT p.*, u.nickname as creator_name, u.avatar_color as creator_avatar,
      (SELECT COUNT(*) FROM likes WHERE poi_id = p.id) as like_count
    FROM pois p
    JOIN users u ON p.creator_id = u.id
    WHERE p.id = ?
  `).get(id);

  if (!poi) {
    return res.status(404).json({ error: 'POI 不存在' });
  }

  const comments = db.prepare(`
    SELECT c.*, u.nickname as user_name, u.avatar_color as user_avatar
    FROM poi_comments c
    JOIN users u ON c.user_id = u.id
    WHERE c.poi_id = ?
    ORDER BY c.created_at DESC
  `).all(id);

  res.json({ ...poi, comments });
});

router.post('/pois', authenticateToken, (req: AuthRequest, res: Response) => {
  const { name, category, description, lat, lng } = req.body;
  const userId = req.userId!;

  if (!name || !category || !lat || !lng) {
    return res.status(400).json({ error: '缺少必要字段' });
  }

  const id = uuidv4();
  const now = Date.now();

  db.prepare(`
    INSERT INTO pois (id, name, category, description, lat, lng, creator_id, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `).run(id, name, category, description || '', lat, lng, userId, now);

  const eventId = uuidv4();
  db.prepare(`
    INSERT INTO feed_events (id, user_id, event_type, poi_id, created_at)
    VALUES (?, ?, 'add_poi', ?, ?)
  `).run(eventId, userId, id, now);

  const poi: any = db.prepare(`
    SELECT p.*, u.nickname as creator_name, u.avatar_color as creator_avatar,
      (SELECT COUNT(*) FROM likes WHERE poi_id = p.id) as like_count
    FROM pois p
    JOIN users u ON p.creator_id = u.id
    WHERE p.id = ?
  `).get(id);

  try {
    const io = getIO();
    const feedEvent: any = db.prepare(`
      SELECT fe.*, p.name as poi_name, p.lat, p.lng, p.category,
        u.nickname as user_name, u.avatar_color as user_avatar
      FROM feed_events fe
      JOIN pois p ON fe.poi_id = p.id
      JOIN users u ON fe.user_id = u.id
      WHERE fe.id = ?
    `).get(eventId);
    if (feedEvent) {
      const followers: any[] = db.prepare(`
        SELECT follower_id FROM friendships WHERE following_id = ?
      `).all(userId);
      followers.forEach(f => {
        io.to(`user_${f.follower_id}`).emit('new_feed_event', feedEvent);
      });
    }
  } catch (e) {
    // Socket 未初始化时忽略
  }

  res.status(201).json(poi);
});

router.post('/pois/:id/comments', authenticateToken, (req: AuthRequest, res: Response) => {
  const { id } = req.params;
  const { content } = req.body;
  const userId = req.userId!;

  if (!content) {
    return res.status(400).json({ error: '评论内容不能为空' });
  }

  const poi = db.prepare('SELECT id FROM pois WHERE id = ?').get(id);
  if (!poi) {
    return res.status(404).json({ error: 'POI 不存在' });
  }

  const commentId = uuidv4();
  const now = Date.now();

  db.prepare(`
    INSERT INTO poi_comments (id, poi_id, user_id, content, created_at)
    VALUES (?, ?, ?, ?, ?)
  `).run(commentId, id, userId, content, now);

  const eventId = uuidv4();
  db.prepare(`
    INSERT INTO feed_events (id, user_id, event_type, poi_id, comment_id, created_at)
    VALUES (?, ?, 'add_comment', ?, ?, ?)
  `).run(eventId, userId, id, commentId, now);

  const comment: any = db.prepare(`
    SELECT c.*, u.nickname as user_name, u.avatar_color as user_avatar
    FROM poi_comments c
    JOIN users u ON c.user_id = u.id
    WHERE c.id = ?
  `).get(commentId);

  try {
    const io = getIO();
    io.to(`poi_${id}`).emit('new_comment', { comment, poiId: id });

    const feedEvent: any = db.prepare(`
      SELECT fe.*, p.name as poi_name, p.lat, p.lng, p.category,
        u.nickname as user_name, u.avatar_color as user_avatar,
        c.content as comment_content
      FROM feed_events fe
      JOIN pois p ON fe.poi_id = p.id
      JOIN users u ON fe.user_id = u.id
      LEFT JOIN poi_comments c ON fe.comment_id = c.id
      WHERE fe.id = ?
    `).get(eventId);
    if (feedEvent) {
      const followers: any[] = db.prepare(`
        SELECT follower_id FROM friendships WHERE following_id = ?
      `).all(userId);
      followers.forEach(f => {
        io.to(`user_${f.follower_id}`).emit('new_feed_event', feedEvent);
      });
    }
  } catch (e) {
    // Socket 未初始化时忽略
  }

  res.status(201).json(comment);
});

router.get('/pois/:id/comments', (req: Request, res: Response) => {
  const { id } = req.params;

  const comments = db.prepare(`
    SELECT c.*, u.nickname as user_name, u.avatar_color as user_avatar
    FROM poi_comments c
    JOIN users u ON c.user_id = u.id
    WHERE c.poi_id = ?
    ORDER BY c.created_at DESC
  `).all(id);

  res.json(comments);
});

router.post('/pois/:id/like', authenticateToken, (req: AuthRequest, res: Response) => {
  const { id } = req.params;
  const userId = req.userId!;

  const poi = db.prepare('SELECT id FROM pois WHERE id = ?').get(id);
  if (!poi) {
    return res.status(404).json({ error: 'POI 不存在' });
  }

  const existingLike: any = db.prepare('SELECT id FROM likes WHERE poi_id = ? AND user_id = ?').get(id, userId);
  if (existingLike) {
    return res.status(400).json({ error: '已经点赞过了' });
  }

  const likeId = uuidv4();
  const now = Date.now();

  db.prepare('INSERT INTO likes (id, poi_id, user_id, created_at) VALUES (?, ?, ?, ?)')
    .run(likeId, id, userId, now);

  const likeCount: any = db.prepare('SELECT COUNT(*) as count FROM likes WHERE poi_id = ?').get(id);

  res.json({ liked: true, likeCount: likeCount.count });
});

router.delete('/pois/:id/like', authenticateToken, (req: AuthRequest, res: Response) => {
  const { id } = req.params;
  const userId = req.userId!;

  const existingLike: any = db.prepare('SELECT id FROM likes WHERE poi_id = ? AND user_id = ?').get(id, userId);
  if (!existingLike) {
    return res.status(400).json({ error: '尚未点赞' });
  }

  db.prepare('DELETE FROM likes WHERE poi_id = ? AND user_id = ?').run(id, userId);

  const likeCount: any = db.prepare('SELECT COUNT(*) as count FROM likes WHERE poi_id = ?').get(id);

  res.json({ liked: false, likeCount: likeCount.count });
});

router.get('/pois/:id/liked', authenticateToken, (req: AuthRequest, res: Response) => {
  const { id } = req.params;
  const userId = req.userId!;

  const like = db.prepare('SELECT id FROM likes WHERE poi_id = ? AND user_id = ?').get(id, userId);

  res.json({ liked: !!like });
});

router.get('/users/search', (req: Request, res: Response) => {
  const { q } = req.query;

  if (!q || typeof q !== 'string') {
    return res.json([]);
  }

  const users = db.prepare(`
    SELECT id, nickname, avatar_color
    FROM users
    WHERE nickname LIKE ?
    LIMIT 20
  `).all(`%${q}%`);

  res.json(users.map((u: any) => ({
    id: u.id,
    nickname: u.nickname,
    avatarColor: u.avatar_color,
  })));
});

router.get('/users/:id', (req: Request, res: Response) => {
  const { id } = req.params;

  const user: any = db.prepare('SELECT id, nickname, avatar_color, created_at FROM users WHERE id = ?').get(id);
  if (!user) {
    return res.status(404).json({ error: '用户不存在' });
  }

  const poiCount: any = db.prepare('SELECT COUNT(*) as count FROM pois WHERE creator_id = ?').get(id);
  const friendCount: any = db.prepare('SELECT COUNT(*) as count FROM friendships WHERE follower_id = ?').get(id);

  const recentEvents = db.prepare(`
    SELECT fe.*, p.name as poi_name
    FROM feed_events fe
    JOIN pois p ON fe.poi_id = p.id
    WHERE fe.user_id = ?
    ORDER BY fe.created_at DESC
    LIMIT 10
  `).all(id);

  res.json({
    id: user.id,
    nickname: user.nickname,
    avatarColor: user.avatar_color,
    createdAt: user.created_at,
    poiCount: poiCount.count,
    friendCount: friendCount.count,
    recentEvents,
  });
});

router.get('/friends', authenticateToken, (req: AuthRequest, res: Response) => {
  const userId = req.userId!;

  const friends = db.prepare(`
    SELECT u.id, u.nickname, u.avatar_color
    FROM friendships f
    JOIN users u ON f.following_id = u.id
    WHERE f.follower_id = ?
    ORDER BY u.nickname
  `).all(userId);

  res.json(friends.map((f: any) => ({
    id: f.id,
    nickname: f.nickname,
    avatarColor: f.avatar_color,
  })));
});

router.post('/friends/:userId', authenticateToken, (req: AuthRequest, res: Response) => {
  const followerId = req.userId!;
  const followingId = req.params.userId;

  if (followerId === followingId) {
    return res.status(400).json({ error: '不能关注自己' });
  }

  const user = db.prepare('SELECT id FROM users WHERE id = ?').get(followingId);
  if (!user) {
    return res.status(404).json({ error: '用户不存在' });
  }

  const existing: any = db.prepare('SELECT id FROM friendships WHERE follower_id = ? AND following_id = ?')
    .get(followerId, followingId);
  if (existing) {
    return res.status(400).json({ error: '已经关注了' });
  }

  const id = uuidv4();
  const now = Date.now();

  db.prepare('INSERT INTO friendships (id, follower_id, following_id, created_at) VALUES (?, ?, ?, ?)')
    .run(id, followerId, followingId, now);

  res.json({ success: true });
});

router.delete('/friends/:userId', authenticateToken, (req: AuthRequest, res: Response) => {
  const followerId = req.userId!;
  const followingId = req.params.userId;

  db.prepare('DELETE FROM friendships WHERE follower_id = ? AND following_id = ?')
    .run(followerId, followingId);

  res.json({ success: true });
});

router.get('/feed', authenticateToken, (req: AuthRequest, res: Response) => {
  const userId = req.userId!;
  const { hours = '24' } = req.query;
  const hoursNum = parseInt(hours as string, 10);
  const since = Date.now() - hoursNum * 60 * 60 * 1000;

  const events = db.prepare(`
    SELECT fe.*, p.name as poi_name, p.lat, p.lng, p.category,
      u.nickname as user_name, u.avatar_color as user_avatar,
      c.content as comment_content
    FROM feed_events fe
    JOIN friendships f ON fe.user_id = f.following_id
    JOIN pois p ON fe.poi_id = p.id
    JOIN users u ON fe.user_id = u.id
    LEFT JOIN poi_comments c ON fe.comment_id = c.id
    WHERE f.follower_id = ? AND fe.created_at >= ?
    ORDER BY fe.created_at DESC
    LIMIT 50
  `).all(userId, since);

  res.json(events);
});

router.get('/feed/friend/:friendId', authenticateToken, (req: AuthRequest, res: Response) => {
  const { friendId } = req.params;
  const userId = req.userId!;

  const friendship = db.prepare('SELECT id FROM friendships WHERE follower_id = ? AND following_id = ?')
    .get(userId, friendId);
  if (!friendship) {
    return res.status(403).json({ error: '不是好友关系' });
  }

  const since = Date.now() - 7 * 24 * 60 * 60 * 1000;

  const events = db.prepare(`
    SELECT fe.*, p.name as poi_name, p.lat, p.lng, p.category,
      u.nickname as user_name, u.avatar_color as user_avatar,
      c.content as comment_content
    FROM feed_events fe
    JOIN pois p ON fe.poi_id = p.id
    JOIN users u ON fe.user_id = u.id
    LEFT JOIN poi_comments c ON fe.comment_id = c.id
    WHERE fe.user_id = ? AND fe.created_at >= ?
    ORDER BY fe.created_at DESC
  `).all(friendId, since);

  res.json(events);
});

router.get('/me', authenticateToken, (req: AuthRequest, res: Response) => {
  const userId = req.userId!;

  const user: any = db.prepare('SELECT id, nickname, avatar_color FROM users WHERE id = ?').get(userId);
  if (!user) {
    return res.status(404).json({ error: '用户不存在' });
  }

  res.json({
    id: user.id,
    nickname: user.nickname,
    avatarColor: user.avatar_color,
  });
});

export default router;
