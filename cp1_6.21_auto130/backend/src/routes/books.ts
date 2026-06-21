import { Router, Request, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import db from '../db';

const router = Router();

router.get('/', (req: Request, res: Response) => {
  try {
    const books = db.prepare(`
      SELECT id, title, author, description, cover_color, cover_gradient, 
             recommend_reason, likes, avg_rating, review_count
      FROM books
      ORDER BY likes DESC
    `).all();
    
    res.json({ success: true, data: books });
  } catch (error) {
    console.error('Error fetching books:', error);
    res.status(500).json({ success: false, message: '获取图书列表失败' });
  }
});

router.get('/:id', (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    
    const book = db.prepare(`
      SELECT id, title, author, description, cover_color, cover_gradient, 
             recommend_reason, likes, avg_rating, review_count
      FROM books
      WHERE id = ?
    `).get(id);
    
    if (!book) {
      return res.status(404).json({ success: false, message: '图书不存在' });
    }
    
    res.json({ success: true, data: book });
  } catch (error) {
    console.error('Error fetching book:', error);
    res.status(500).json({ success: false, message: '获取图书详情失败' });
  }
});

router.get('/:id/reviews', (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { page = 1, limit = 20 } = req.query;
    
    const offset = (Number(page) - 1) * Number(limit);
    
    const reviews = db.prepare(`
      SELECT id, book_id, user_name, rating, comment, created_at
      FROM reviews
      WHERE book_id = ?
      ORDER BY created_at DESC
      LIMIT ? OFFSET ?
    `).all(id, Number(limit), offset);
    
    const total = db.prepare(`
      SELECT COUNT(*) as count FROM reviews WHERE book_id = ?
    `).get(id) as { count: number };
    
    res.json({ 
      success: true, 
      data: reviews,
      pagination: {
        total: total.count,
        page: Number(page),
        limit: Number(limit),
      }
    });
  } catch (error) {
    console.error('Error fetching reviews:', error);
    res.status(500).json({ success: false, message: '获取评论列表失败' });
  }
});

router.post('/:id/rate', (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { rating, comment, userName = '匿名用户' } = req.body;
    
    if (!rating || rating < 1 || rating > 5) {
      return res.status(400).json({ success: false, message: '评分必须在1-5之间' });
    }
    
    if (!comment || comment.trim().length === 0) {
      return res.status(400).json({ success: false, message: '评论内容不能为空' });
    }
    
    const book = db.prepare('SELECT * FROM books WHERE id = ?').get(id);
    if (!book) {
      return res.status(404).json({ success: false, message: '图书不存在' });
    }
    
    const reviewId = uuidv4();
    
    db.prepare(`
      INSERT INTO reviews (id, book_id, user_name, rating, comment)
      VALUES (?, ?, ?, ?, ?)
    `).run(reviewId, id, userName, rating, comment);
    
    const stats = db.prepare(`
      SELECT AVG(rating) as avg_rating, COUNT(*) as review_count
      FROM reviews
      WHERE book_id = ?
    `).get(id) as { avg_rating: number; review_count: number };
    
    db.prepare(`
      UPDATE books 
      SET avg_rating = ?, review_count = ?
      WHERE id = ?
    `).run(stats.avg_rating || 0, stats.review_count || 0, id);
    
    const updatedBook = db.prepare(`
      SELECT id, title, author, description, cover_color, cover_gradient, 
             recommend_reason, likes, avg_rating, review_count
      FROM books
      WHERE id = ?
    `).get(id);
    
    const newReview = db.prepare(`
      SELECT id, book_id, user_name, rating, comment, created_at
      FROM reviews
      WHERE id = ?
    `).get(reviewId);
    
    res.json({ 
      success: true, 
      message: '评论提交成功',
      data: { book: updatedBook, review: newReview }
    });
  } catch (error) {
    console.error('Error rating book:', error);
    res.status(500).json({ success: false, message: '提交评论失败' });
  }
});

router.post('/:id/like', (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    
    const book = db.prepare('SELECT * FROM books WHERE id = ?').get(id);
    if (!book) {
      return res.status(404).json({ success: false, message: '图书不存在' });
    }
    
    db.prepare('UPDATE books SET likes = likes + 1 WHERE id = ?').run(id);
    
    const updatedBook = db.prepare(`
      SELECT id, title, author, description, cover_color, cover_gradient, 
             recommend_reason, likes, avg_rating, review_count
      FROM books
      WHERE id = ?
    `).get(id);
    
    res.json({ 
      success: true, 
      message: '点赞成功',
      data: updatedBook
    });
  } catch (error) {
    console.error('Error liking book:', error);
    res.status(500).json({ success: false, message: '点赞失败' });
  }
});

router.get('/ranking/list', (req: Request, res: Response) => {
  try {
    const books = db.prepare(`
      SELECT id, title, author, cover_color, cover_gradient, avg_rating, review_count, likes
      FROM books
      ORDER BY avg_rating DESC, review_count DESC
      LIMIT 10
    `).all();
    
    res.json({ success: true, data: books });
  } catch (error) {
    console.error('Error fetching ranking:', error);
    res.status(500).json({ success: false, message: '获取排行榜失败' });
  }
});

export default router;
