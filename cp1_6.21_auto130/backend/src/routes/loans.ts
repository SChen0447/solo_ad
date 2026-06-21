import { Router, Request, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import db from '../db';

const router = Router();

const DEFAULT_USER_ID = 'user-001';
const DEFAULT_USER_NAME = '张小明';
const BORROW_DAYS = 30;

function formatDate(d: Date): string {
  return d.toISOString().split('T')[0];
}

function addDays(d: Date, days: number): Date {
  const result = new Date(d);
  result.setDate(result.getDate() + days);
  return result;
}

function isOverdue(dueDate: string): boolean {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const due = new Date(dueDate);
  due.setHours(0, 0, 0, 0);
  return due < today;
}

router.get('/', (req: Request, res: Response) => {
  try {
    const userId = req.query.userId as string || DEFAULT_USER_ID;
    
    const loans = db.prepare(`
      SELECT l.id, l.book_id, l.user_id, l.user_name, l.borrow_date, 
             l.due_date, l.return_date, l.status,
             b.title, b.author, b.cover_color, b.cover_gradient
      FROM loans l
      JOIN books b ON l.book_id = b.id
      WHERE l.user_id = ?
      ORDER BY l.borrow_date DESC
    `).all(userId);
    
    const processedLoans = loans.map((loan: any) => {
      let status = loan.status;
      if (status === 'borrowed' && isOverdue(loan.due_date)) {
        status = 'overdue';
      }
      return { ...loan, status };
    });
    
    res.json({ success: true, data: processedLoans });
  } catch (error) {
    console.error('Error fetching loans:', error);
    res.status(500).json({ success: false, message: '获取借阅记录失败' });
  }
});

router.post('/borrow', (req: Request, res: Response) => {
  try {
    const { bookId, userId = DEFAULT_USER_ID, userName = DEFAULT_USER_NAME } = req.body;
    
    if (!bookId) {
      return res.status(400).json({ success: false, message: '图书ID不能为空' });
    }
    
    const book = db.prepare('SELECT * FROM books WHERE id = ?').get(bookId);
    if (!book) {
      return res.status(404).json({ success: false, message: '图书不存在' });
    }
    
    const existingLoan = db.prepare(`
      SELECT * FROM loans 
      WHERE book_id = ? AND user_id = ? AND status IN ('borrowed', 'overdue')
    `).get(bookId, userId);
    
    if (existingLoan) {
      return res.status(400).json({ success: false, message: '您已借阅过此书，尚未归还' });
    }
    
    const loanId = uuidv4();
    const today = new Date();
    const borrowDate = formatDate(today);
    const dueDate = formatDate(addDays(today, BORROW_DAYS));
    
    db.prepare(`
      INSERT INTO loans (id, book_id, user_id, user_name, borrow_date, due_date, status)
      VALUES (?, ?, ?, ?, ?, ?, 'borrowed')
    `).run(loanId, bookId, userId, userName, borrowDate, dueDate);
    
    const newLoan = db.prepare(`
      SELECT l.id, l.book_id, l.user_id, l.user_name, l.borrow_date, 
             l.due_date, l.return_date, l.status,
             b.title, b.author, b.cover_color, b.cover_gradient
      FROM loans l
      JOIN books b ON l.book_id = b.id
      WHERE l.id = ?
    `).get(loanId);
    
    res.json({ 
      success: true, 
      message: '借阅成功',
      data: newLoan
    });
  } catch (error) {
    console.error('Error borrowing book:', error);
    res.status(500).json({ success: false, message: '借阅失败' });
  }
});

router.post('/return', (req: Request, res: Response) => {
  try {
    const { loanId } = req.body;
    
    if (!loanId) {
      return res.status(400).json({ success: false, message: '借阅记录ID不能为空' });
    }
    
    const loan = db.prepare('SELECT * FROM loans WHERE id = ?').get(loanId);
    if (!loan) {
      return res.status(404).json({ success: false, message: '借阅记录不存在' });
    }
    
    if (loan.status === 'returned') {
      return res.status(400).json({ success: false, message: '此书已归还' });
    }
    
    const returnDate = formatDate(new Date());
    
    db.prepare(`
      UPDATE loans 
      SET return_date = ?, status = 'returned'
      WHERE id = ?
    `).run(returnDate, loanId);
    
    const updatedLoan = db.prepare(`
      SELECT l.id, l.book_id, l.user_id, l.user_name, l.borrow_date, 
             l.due_date, l.return_date, l.status,
             b.title, b.author, b.cover_color, b.cover_gradient
      FROM loans l
      JOIN books b ON l.book_id = b.id
      WHERE l.id = ?
    `).get(loanId);
    
    res.json({ 
      success: true, 
      message: '归还成功',
      data: updatedLoan
    });
  } catch (error) {
    console.error('Error returning book:', error);
    res.status(500).json({ success: false, message: '归还失败' });
  }
});

router.get('/check/:bookId', (req: Request, res: Response) => {
  try {
    const { bookId } = req.params;
    const userId = req.query.userId as string || DEFAULT_USER_ID;
    
    const existingLoan = db.prepare(`
      SELECT l.id, l.book_id, l.user_id, l.user_name, l.borrow_date, 
             l.due_date, l.return_date, l.status,
             b.title, b.author, b.cover_color, b.cover_gradient
      FROM loans l
      JOIN books b ON l.book_id = b.id
      WHERE l.book_id = ? AND l.user_id = ? AND l.status IN ('borrowed', 'overdue')
    `).get(bookId, userId);
    
    if (existingLoan) {
      let status = existingLoan.status;
      if (status === 'borrowed' && isOverdue(existingLoan.due_date)) {
        status = 'overdue';
      }
      res.json({ success: true, data: { ...existingLoan, status } });
    } else {
      res.json({ success: true, data: null });
    }
  } catch (error) {
    console.error('Error checking loan status:', error);
    res.status(500).json({ success: false, message: '检查借阅状态失败' });
  }
});

export default router;
