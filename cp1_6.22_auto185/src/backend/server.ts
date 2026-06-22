import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import { v4 as uuidv4 } from 'uuid';
import { db } from './database';
import { getRecommendations, getPopularBooks } from './recommendation';
import type { User, Book, ExchangeRecord, Message, LoginRequest, RegisterRequest, CreateBookRequest, SearchBooksQuery, ApiResponse } from '../shared/types';

const JWT_SECRET = 'book-exchange-secret-key-2024';
const app = express();
const PORT = 3001;

app.use(cors());
app.use(express.json({ limit: '2mb' }));

interface AuthRequest extends Request {
  user?: User;
}

const authenticateToken = (req: AuthRequest, res: Response, next: NextFunction) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.startsWith('Bearer ') ? authHeader.slice(7) : null;

  if (!token) {
    return res.status(401).json({ success: false, message: '未提供认证令牌' });
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET) as { userId: string };
    const user = db.getUserById(decoded.userId);
    if (!user) {
      return res.status(401).json({ success: false, message: '用户不存在' });
    }
    req.user = user;
    next();
  } catch {
    return res.status(403).json({ success: false, message: '无效的认证令牌' });
  }
};

const sanitizeUser = (user: User): Omit<User, 'password'> => {
  const { password, ...safeUser } = user;
  return safeUser;
};

app.post('/api/auth/register', (req: Request<unknown, unknown, RegisterRequest>, res: Response<ApiResponse<{ user: Omit<User, 'password'>; token: string }>>) => {
  try {
    const { username, password } = req.body;

    if (!username || !password) {
      return res.status(400).json({ success: false, message: '用户名和密码不能为空' });
    }

    if (db.getUserByUsername(username)) {
      return res.status(400).json({ success: false, message: '用户名已存在' });
    }

    const user = db.createUser(username, password);
    const token = jwt.sign({ userId: user.id }, JWT_SECRET, { expiresIn: '7d' });

    res.json({ success: true, data: { user: sanitizeUser(user), token } });
  } catch {
    res.status(500).json({ success: false, message: '注册失败' });
  }
});

app.post('/api/auth/login', (req: Request<unknown, unknown, LoginRequest>, res: Response<ApiResponse<{ user: Omit<User, 'password'>; token: string }>>) => {
  try {
    const { username, password } = req.body;

    const user = db.getUserByUsername(username);
    if (!user || !bcrypt.compareSync(password, user.password)) {
      return res.status(401).json({ success: false, message: '用户名或密码错误' });
    }

    const token = jwt.sign({ userId: user.id }, JWT_SECRET, { expiresIn: '7d' });

    res.json({ success: true, data: { user: sanitizeUser(user), token } });
  } catch {
    res.status(500).json({ success: false, message: '登录失败' });
  }
});

app.get('/api/users/me', authenticateToken, (req: AuthRequest, res: Response<ApiResponse<Omit<User, 'password'>>>) => {
  if (!req.user) return;
  res.json({ success: true, data: sanitizeUser(req.user) });
});

app.get('/api/users/books', authenticateToken, (req: AuthRequest, res: Response<ApiResponse<Book[]>>) => {
  if (!req.user) return;
  const books = db.getBooksByOwner(req.user.id);
  res.json({ success: true, data: books });
});

app.get('/api/users/exchanges', authenticateToken, (req: AuthRequest, res: Response<ApiResponse<ExchangeRecord[]>>) => {
  if (!req.user) return;
  res.json({ success: true, data: req.user.exchangeHistory.slice(0, 5) });
});

app.get('/api/books', (req: Request<unknown, unknown, unknown, SearchBooksQuery>, res: Response<ApiResponse<Book[]>>) => {
  try {
    const { keyword, category, condition } = req.query;
    const books = db.searchBooks(keyword, category, condition);
    res.json({ success: true, data: books });
  } catch {
    res.status(500).json({ success: false, message: '搜索失败' });
  }
});

app.get('/api/books/popular', (_req, res: Response<ApiResponse<Book[]>>) => {
  try {
    const books = getPopularBooks(10);
    res.json({ success: true, data: books });
  } catch {
    res.status(500).json({ success: false, message: '获取热门书籍失败' });
  }
});

app.get('/api/books/:id', (req: Request<{ id: string }>, res: Response<ApiResponse<Book>>) => {
  try {
    const { id } = req.params;
    const book = db.getBookById(id);
    
    if (!book) {
      return res.status(404).json({ success: false, message: '书籍不存在' });
    }

    if (req.headers.authorization) {
      const token = req.headers.authorization.startsWith('Bearer ') 
        ? req.headers.authorization.slice(7) 
        : null;
      if (token) {
        try {
          const decoded = jwt.verify(token, JWT_SECRET) as { userId: string };
          db.addBrowseHistory(decoded.userId, id);
        } catch {
          // Token invalid, skip adding history
        }
      }
    }

    res.json({ success: true, data: book });
  } catch {
    res.status(500).json({ success: false, message: '获取书籍详情失败' });
  }
});

app.post('/api/books', authenticateToken, (req: AuthRequest<unknown, unknown, CreateBookRequest>, res: Response<ApiResponse<Book>>) => {
  try {
    if (!req.user) return;

    const { title, author, isbn, category, condition, coverImage, exchangePreference, tags } = req.body;

    if (!title || !author || !category || !condition || !coverImage) {
      return res.status(400).json({ success: false, message: '必填字段不能为空' });
    }

    const base64Pattern = /^data:image\/(png|jpeg|jpg|svg\+xml);base64,/;
    if (!base64Pattern.test(coverImage)) {
      return res.status(400).json({ success: false, message: '封面图片格式不正确' });
    }

    const base64Data = coverImage.replace(/^data:image\/[^;]+;base64,/, '');
    const sizeInBytes = Math.ceil((base64Data.length * 3) / 4);
    if (sizeInBytes > 2 * 1024 * 1024) {
      return res.status(400).json({ success: false, message: '封面图片不能超过2MB' });
    }

    const book = db.createBook({
      title,
      author,
      isbn,
      category,
      condition,
      coverImage,
      exchangePreference: exchangePreference || [],
      tags: tags || [],
      ownerId: req.user.id,
      ownerName: req.user.username,
    });

    res.status(201).json({ success: true, data: book });
  } catch {
    res.status(500).json({ success: false, message: '发布书籍失败' });
  }
});

app.put('/api/books/:id/exchange', authenticateToken, (req: AuthRequest<{ id: string }, unknown, { targetUserId: string }>, res: Response<ApiResponse<{ success: boolean }>>) => {
  try {
    if (!req.user) return;

    const { id } = req.params;
    const { targetUserId } = req.body;
    const book = db.getBookById(id);

    if (!book) {
      return res.status(404).json({ success: false, message: '书籍不存在' });
    }

    if (book.status === 'exchanged') {
      return res.status(400).json({ success: false, message: '这本书已经被交换了' });
    }

    if (book.ownerId === req.user.id) {
      return res.status(400).json({ success: false, message: '不能交换自己发布的书籍' });
    }

    const targetUser = db.getUserById(targetUserId);
    if (!targetUser) {
      return res.status(404).json({ success: false, message: '目标用户不存在' });
    }

    db.updateBookStatus(id, { status: 'exchanged', exchangeCount: book.exchangeCount + 1 });

    const record1: Omit<ExchangeRecord, 'id'> = {
      bookId: book.id,
      bookTitle: book.title,
      partnerId: targetUserId,
      partnerName: targetUser.username,
      createdAt: new Date().toISOString(),
    };
    db.addExchangeRecord(req.user.id, record1);

    const record2: Omit<ExchangeRecord, 'id'> = {
      bookId: book.id,
      bookTitle: book.title,
      partnerId: req.user.id,
      partnerName: req.user.username,
      createdAt: new Date().toISOString(),
    };
    db.addExchangeRecord(targetUserId, record2);

    res.json({ success: true, data: { success: true } });
  } catch {
    res.status(500).json({ success: false, message: '交换失败' });
  }
});

app.get('/api/recommendations', authenticateToken, (req: AuthRequest, res: Response<ApiResponse<Book[]>>) => {
  try {
    if (!req.user) return;
    const recommendations = getRecommendations(req.user.id, 10);
    res.json({ success: true, data: recommendations });
  } catch {
    res.status(500).json({ success: false, message: '获取推荐失败' });
  }
});

app.get('/api/messages/:userId', authenticateToken, (req: AuthRequest<{ userId: string }>, res: Response<ApiResponse<Message[]>>) => {
  try {
    if (!req.user) return;
    const { userId } = req.params;
    const messages = db.getMessages(req.user.id, userId);
    res.json({ success: true, data: messages });
  } catch {
    res.status(500).json({ success: false, message: '获取消息失败' });
  }
});

app.post('/api/messages', authenticateToken, (req: AuthRequest<unknown, unknown, { receiverId: string; content: string }>, res: Response<ApiResponse<Message>>) => {
  try {
    if (!req.user) return;

    const { receiverId, content } = req.body;

    if (!receiverId || !content) {
      return res.status(400).json({ success: false, message: '接收者和内容不能为空' });
    }

    const receiver = db.getUserById(receiverId);
    if (!receiver) {
      return res.status(404).json({ success: false, message: '接收者不存在' });
    }

    const message = db.createMessage({
      senderId: req.user.id,
      senderName: req.user.username,
      receiverId,
      content,
    });

    res.status(201).json({ success: true, data: message });
  } catch {
    res.status(500).json({ success: false, message: '发送消息失败' });
  }
});

app.listen(PORT, () => {
  console.log(`服务器运行在 http://localhost:${PORT}`);
  console.log('测试账号: booklover / 123456');
});

export default app;
