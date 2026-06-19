import { Router, Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import { query, queryOne, execute } from '../shared/db';

const router = Router();
const JWT_SECRET = 'recipe-share-secret-key-2024';

export function authMiddleware(req: Request, res: Response, next: NextFunction): void {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      (req as any).userId = null;
      return next();
    }

    const token = authHeader.slice(7);
    const decoded = jwt.verify(token, JWT_SECRET) as { userId: number };
    (req as any).userId = decoded.userId;
    next();
  } catch (error) {
    (req as any).userId = null;
    next();
  }
}

function generateToken(userId: number): string {
  return jwt.sign({ userId }, JWT_SECRET, { expiresIn: '7d' });
}

function checkBadges(userId: number): void {
  const recipeCount = queryOne(
    'SELECT COUNT(*) as count FROM recipes WHERE user_id = ?',
    [userId]
  ) as { count: number };

  const badges: { key: string; name: string; desc: string; condition: boolean }[] = [
    { key: 'first_recipe', name: '初次下厨', desc: '发布第一份菜谱', condition: recipeCount.count >= 1 },
    { key: 'ten_recipes', name: '厨艺达人', desc: '发布10份菜谱', condition: recipeCount.count >= 10 },
    { key: 'twenty_recipes', name: '美食大师', desc: '发布20份菜谱', condition: recipeCount.count >= 20 },
  ];

  badges.forEach(badge => {
    if (badge.condition) {
      const existing = queryOne(
        'SELECT * FROM badges WHERE user_id = ? AND badge_key = ?',
        [userId, badge.key]
      );
      if (!existing) {
        execute(
          'INSERT INTO badges (user_id, badge_key, badge_name, description) VALUES (?, ?, ?, ?)',
          [userId, badge.key, badge.name, badge.desc]
        );
      }
    }
  });
}

router.post('/register', (req: Request, res: Response) => {
  try {
    const { username, email, password } = req.body;

    if (!username || !email || !password) {
      return res.status(400).json({ success: false, message: '请填写完整信息' });
    }

    const existingUser = queryOne('SELECT * FROM users WHERE username = ? OR email = ?', [
      username,
      email,
    ]);
    if (existingUser) {
      return res.status(400).json({ success: false, message: '用户名或邮箱已存在' });
    }

    const hashedPassword = bcrypt.hashSync(password, 10);

    const result = execute(
      'INSERT INTO users (username, email, password) VALUES (?, ?, ?)',
      [username, email, hashedPassword]
    );

    const userId = result.lastInsertRowid;
    const token = generateToken(userId);

    const user = queryOne(
      'SELECT id, username, email, avatar, bio, created_at FROM users WHERE id = ?',
      [userId]
    );

    res.status(201).json({
      success: true,
      data: { user, token },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: '注册失败' });
  }
});

router.post('/login', (req: Request, res: Response) => {
  try {
    const { username, password } = req.body;

    if (!username || !password) {
      return res.status(400).json({ success: false, message: '请填写账号密码' });
    }

    const user = queryOne(
      'SELECT * FROM users WHERE username = ? OR email = ?',
      [username, username]
    );

    if (!user || !bcrypt.compareSync(password, user.password)) {
      return res.status(401).json({ success: false, message: '账号或密码错误' });
    }

    const token = generateToken(user.id);

    const safeUser = {
      id: user.id,
      username: user.username,
      email: user.email,
      avatar: user.avatar,
      bio: user.bio,
      created_at: user.created_at,
    };

    res.json({
      success: true,
      data: { user: safeUser, token },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: '登录失败' });
  }
});

router.get('/profile/:id', (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const user = queryOne(
      'SELECT id, username, email, avatar, bio, created_at FROM users WHERE id = ?',
      [id]
    );

    if (!user) {
      return res.status(404).json({ success: false, message: '用户不存在' });
    }

    const recipes = query(
      'SELECT * FROM recipes WHERE user_id = ? ORDER BY created_at DESC',
      [id]
    );

    const recipeCount = recipes.length;

    const favoriteCount = queryOne(
      'SELECT COUNT(*) as count FROM favorites WHERE user_id = ?',
      [id]
    ) as { count: number };

    const badges = query('SELECT * FROM badges WHERE user_id = ? ORDER BY unlocked_at DESC', [
      id,
    ]);

    res.json({
      success: true,
      data: {
        user,
        recipes,
        recipeCount,
        favoriteCount: favoriteCount?.count || 0,
        badges,
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: '获取用户信息失败' });
  }
});

router.put('/profile', authMiddleware, (req: Request, res: Response) => {
  try {
    const userId = (req as any).userId;
    if (!userId) {
      return res.status(401).json({ success: false, message: '请先登录' });
    }

    const { bio, avatar } = req.body;

    execute(
      'UPDATE users SET bio = COALESCE(?, bio), avatar = COALESCE(?, avatar) WHERE id = ?',
      [bio, avatar, userId]
    );

    const user = queryOne(
      'SELECT id, username, email, avatar, bio, created_at FROM users WHERE id = ?',
      [userId]
    );

    res.json({ success: true, data: { user } });
  } catch (error) {
    res.status(500).json({ success: false, message: '更新个人信息失败' });
  }
});

router.get('/favorites/list', authMiddleware, (req: Request, res: Response) => {
  try {
    const userId = (req as any).userId;
    if (!userId) {
      return res.status(401).json({ success: false, message: '请先登录' });
    }

    const favorites = query(
      `SELECT f.*, r.title, r.thumbnail, r.likes, r.views,
              (SELECT COUNT(*) FROM comments c WHERE c.recipe_id = r.id) as comment_count
       FROM favorites f
       LEFT JOIN recipes r ON f.recipe_id = r.id
       WHERE f.user_id = ?
       ORDER BY f.created_at DESC`,
      [userId]
    );

    res.json({ success: true, data: favorites });
  } catch (error) {
    res.status(500).json({ success: false, message: '获取收藏列表失败' });
  }
});

router.post('/favorites/:recipeId', authMiddleware, (req: Request, res: Response) => {
  try {
    const userId = (req as any).userId;
    if (!userId) {
      return res.status(401).json({ success: false, message: '请先登录' });
    }

    const { recipeId } = req.params;
    const { rating = 0 } = req.body;

    const existing = queryOne(
      'SELECT * FROM favorites WHERE user_id = ? AND recipe_id = ?',
      [userId, recipeId]
    );

    if (existing) {
      execute(
        'UPDATE favorites SET rating = ? WHERE user_id = ? AND recipe_id = ?',
        [rating, userId, recipeId]
      );
    } else {
      execute(
        'INSERT INTO favorites (user_id, recipe_id, rating) VALUES (?, ?, ?)',
        [userId, recipeId, rating]
      );
    }

    res.json({ success: true, message: existing ? '评分更新成功' : '收藏成功' });
  } catch (error) {
    res.status(500).json({ success: false, message: '操作失败' });
  }
});

router.delete('/favorites/:recipeId', authMiddleware, (req: Request, res: Response) => {
  try {
    const userId = (req as any).userId;
    if (!userId) {
      return res.status(401).json({ success: false, message: '请先登录' });
    }

    const { recipeId } = req.params;

    execute('DELETE FROM favorites WHERE user_id = ? AND recipe_id = ?', [userId, recipeId]);

    res.json({ success: true, message: '取消收藏成功' });
  } catch (error) {
    res.status(500).json({ success: false, message: '操作失败' });
  }
});

router.get('/badges/list', authMiddleware, (req: Request, res: Response) => {
  try {
    const userId = (req as any).userId;
    if (!userId) {
      return res.status(401).json({ success: false, message: '请先登录' });
    }

    checkBadges(userId);

    const badges = query('SELECT * FROM badges WHERE user_id = ? ORDER BY unlocked_at DESC', [
      userId,
    ]);

    res.json({ success: true, data: badges });
  } catch (error) {
    res.status(500).json({ success: false, message: '获取徽章失败' });
  }
});

router.post('/badges/check', authMiddleware, (req: Request, res: Response) => {
  try {
    const userId = (req as any).userId;
    if (!userId) {
      return res.status(401).json({ success: false, message: '请先登录' });
    }

    checkBadges(userId);

    const badges = query('SELECT * FROM badges WHERE user_id = ? ORDER BY unlocked_at DESC', [
      userId,
    ]);

    res.json({ success: true, data: badges });
  } catch (error) {
    res.status(500).json({ success: false, message: '检查徽章失败' });
  }
});

export default router;
