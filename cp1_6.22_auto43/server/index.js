import express from 'express';
import cors from 'cors';
import Database from 'better-sqlite3';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const app = express();
const PORT = 3002;

app.use(cors());
app.use(express.json());

const dbPath = join(__dirname, 'bookstore.db');
const db = new Database(dbPath);

db.pragma('journal_mode = WAL');

db.exec(`
  CREATE TABLE IF NOT EXISTS books (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title TEXT NOT NULL,
    author TEXT NOT NULL,
    isbn TEXT NOT NULL UNIQUE,
    category TEXT NOT NULL CHECK(category IN ('文学', '科技', '生活', '童书')),
    total_stock INTEGER NOT NULL DEFAULT 0,
    available_stock INTEGER NOT NULL DEFAULT 0,
    status TEXT NOT NULL DEFAULT '在架' CHECK(status IN ('在架', '借出', '下架')),
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS loans (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    book_id INTEGER NOT NULL,
    borrower_name TEXT NOT NULL,
    borrow_date DATE NOT NULL,
    expected_return_date DATE NOT NULL,
    actual_return_date DATE,
    returned INTEGER NOT NULL DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (book_id) REFERENCES books(id)
  );

  CREATE INDEX IF NOT EXISTS idx_books_title ON books(title);
  CREATE INDEX IF NOT EXISTS idx_books_author ON books(author);
  CREATE INDEX IF NOT EXISTS idx_books_category ON books(category);
  CREATE INDEX IF NOT EXISTS idx_loans_book_id ON loans(book_id);
  CREATE INDEX IF NOT EXISTS idx_loans_returned ON loans(returned);
`);

const insertSampleData = db.transaction(() => {
  const count = db.prepare('SELECT COUNT(*) as cnt FROM books').get().cnt;
  if (count === 0) {
    const insertBook = db.prepare(`
      INSERT INTO books (title, author, isbn, category, total_stock, available_stock, status)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `);
    
    const samples = [
      ['活着', '余华', '9787506365437', '文学', 5, 3, '在架'],
      ['三体', '刘慈欣', '9787536692930', '科技', 4, 2, '在架'],
      ['人类简史', '尤瓦尔·赫拉利', '9787508647357', '科技', 3, 0, '借出'],
      ['家常菜1000道', '美食天下', '9787512712345', '生活', 6, 6, '在架'],
      ['安徒生童话', '安徒生', '9787020042098', '童书', 5, 4, '在架'],
      ['百年孤独', '加西亚·马尔克斯', '9787544291170', '文学', 3, 3, '在架'],
      ['深度学习', 'Ian Goodfellow', '9787115461829', '科技', 2, 0, '借出'],
      ['小王子', '圣埃克苏佩里', '9787020042494', '童书', 8, 7, '在架'],
      ['瑜伽入门', '瑜伽协会', '9787512345678', '生活', 4, 4, '在架'],
      ['红楼梦', '曹雪芹', '9787020002207', '文学', 3, 2, '在架'],
      ['JavaScript高级程序设计', 'Nicholas C.Zakas', '9787115545606', '科技', 5, 5, '在架'],
      ['格林童话', '格林兄弟', '9787020042104', '童书', 4, 3, '在架'],
      ['养花大全', '花卉协会', '9787512367890', '生活', 3, 3, '在架'],
      ['围城', '钱钟书', '9787020024759', '文学', 4, 1, '在架'],
      ['算法导论', 'Thomas H.Cormen', '9787111407010', '科技', 2, 2, '在架'],
    ];
    
    samples.forEach(s => insertBook.run(...s));
  }
});
insertSampleData();

app.get('/api/books', (req, res) => {
  const { search = '', category = '全部', page = 1, limit = 12 } = req.query;
  const pageNum = parseInt(page);
  const limitNum = parseInt(limit);
  const offset = (pageNum - 1) * limitNum;

  let query = 'SELECT * FROM books WHERE 1=1';
  const params = [];

  if (search) {
    query += ' AND (title LIKE ? OR author LIKE ?)';
    params.push(`%${search}%`, `%${search}%`);
  }

  if (category !== '全部') {
    query += ' AND category = ?';
    params.push(category);
  }

  const countQuery = query.replace('SELECT *', 'SELECT COUNT(*) as cnt');
  const total = db.prepare(countQuery).get(...params).cnt;

  query += ' ORDER BY created_at DESC LIMIT ? OFFSET ?';
  params.push(limitNum, offset);

  const books = db.prepare(query).all(...params);

  books.forEach(book => {
    if (book.available_stock === 0 && book.total_stock > 0) {
      book.status = '借出';
    } else if (book.available_stock > 0) {
      book.status = '在架';
    }
  });

  res.json({ books, total, page: pageNum, totalPages: Math.ceil(total / limitNum) });
});

app.get('/api/books/:id', (req, res) => {
  const book = db.prepare('SELECT * FROM books WHERE id = ?').get(req.params.id);
  if (!book) {
    return res.status(404).json({ error: '图书不存在' });
  }
  res.json(book);
});

app.post('/api/books', (req, res) => {
  const { title, author, isbn, category, total_stock } = req.body;

  if (!/^\d{13}$/.test(isbn)) {
    return res.status(400).json({ error: 'ISBN必须是13位数字' });
  }

  const stock = parseInt(total_stock);
  if (isNaN(stock) || stock < 0 || stock > 99) {
    return res.status(400).json({ error: '库存数量必须是0-99的整数' });
  }

  try {
    const result = db.prepare(`
      INSERT INTO books (title, author, isbn, category, total_stock, available_stock, status)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run(title, author, isbn, category, stock, stock, stock > 0 ? '在架' : '下架');

    const book = db.prepare('SELECT * FROM books WHERE id = ?').get(result.lastInsertRowid);
    res.status(201).json(book);
  } catch (err) {
    if (err.message.includes('UNIQUE')) {
      return res.status(400).json({ error: '该ISBN已存在' });
    }
    res.status(500).json({ error: err.message });
  }
});

app.put('/api/books/:id', (req, res) => {
  const { title, author, isbn, category, total_stock, status } = req.body;
  const currentBook = db.prepare('SELECT * FROM books WHERE id = ?').get(req.params.id);

  if (!currentBook) {
    return res.status(404).json({ error: '图书不存在' });
  }

  if (isbn && !/^\d{13}$/.test(isbn)) {
    return res.status(400).json({ error: 'ISBN必须是13位数字' });
  }

  const newTitle = title || currentBook.title;
  const newAuthor = author || currentBook.author;
  const newIsbn = isbn || currentBook.isbn;
  const newCategory = category || currentBook.category;
  const newTotal = total_stock !== undefined ? parseInt(total_stock) : currentBook.total_stock;
  const newStatus = status || currentBook.status;

  if (newTotal < 0 || newTotal > 99) {
    return res.status(400).json({ error: '库存数量必须是0-99的整数' });
  }

  const borrowedCount = currentBook.total_stock - currentBook.available_stock;
  let newAvailable = newTotal - borrowedCount;
  if (newAvailable < 0) newAvailable = 0;

  try {
    db.prepare(`
      UPDATE books 
      SET title = ?, author = ?, isbn = ?, category = ?, 
          total_stock = ?, available_stock = ?, status = ?, updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `).run(newTitle, newAuthor, newIsbn, newCategory, newTotal, newAvailable, newStatus, req.params.id);

    const book = db.prepare('SELECT * FROM books WHERE id = ?').get(req.params.id);
    res.json(book);
  } catch (err) {
    if (err.message.includes('UNIQUE')) {
      return res.status(400).json({ error: '该ISBN已存在' });
    }
    res.status(500).json({ error: err.message });
  }
});

app.delete('/api/books/:id', (req, res) => {
  const book = db.prepare('SELECT * FROM books WHERE id = ?').get(req.params.id);
  if (!book) {
    return res.status(404).json({ error: '图书不存在' });
  }

  const activeLoans = db.prepare('SELECT COUNT(*) as cnt FROM loans WHERE book_id = ? AND returned = 0').get(req.params.id).cnt;
  if (activeLoans > 0) {
    return res.status(400).json({ error: '该图书还有未归还的借阅记录' });
  }

  db.prepare('DELETE FROM books WHERE id = ?').run(req.params.id);
  res.json({ message: '删除成功' });
});

app.get('/api/loans', (req, res) => {
  const loans = db.prepare(`
    SELECT loans.*, books.title as book_title 
    FROM loans 
    JOIN books ON loans.book_id = books.id 
    ORDER BY loans.created_at DESC
  `).all();
  res.json(loans);
});

app.post('/api/loans', (req, res) => {
  const { book_id, borrower_name, expected_return_date } = req.body;

  if (!borrower_name || !expected_return_date) {
    return res.status(400).json({ error: '借阅者姓名和预计归还日期为必填项' });
  }

  const book = db.prepare('SELECT * FROM books WHERE id = ?').get(book_id);
  if (!book) {
    return res.status(404).json({ error: '图书不存在' });
  }

  if (book.available_stock <= 0) {
    return res.status(400).json({ error: '该图书已无库存' });
  }

  const borrow_date = new Date().toISOString().split('T')[0];

  const tx = db.transaction(() => {
    const result = db.prepare(`
      INSERT INTO loans (book_id, borrower_name, borrow_date, expected_return_date)
      VALUES (?, ?, ?, ?)
    `).run(book_id, borrower_name, borrow_date, expected_return_date);

    db.prepare(`
      UPDATE books 
      SET available_stock = available_stock - 1,
          status = CASE WHEN available_stock - 1 = 0 THEN '借出' ELSE status END,
          updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `).run(book_id);

    return result.lastInsertRowid;
  });

  try {
    const loanId = tx();
    const loan = db.prepare(`
      SELECT loans.*, books.title as book_title 
      FROM loans JOIN books ON loans.book_id = books.id 
      WHERE loans.id = ?
    `).get(loanId);
    res.status(201).json(loan);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.put('/api/loans/:id', (req, res) => {
  const { actual_return_date, returned } = req.body;
  const loan = db.prepare('SELECT * FROM loans WHERE id = ?').get(req.params.id);

  if (!loan) {
    return res.status(404).json({ error: '借阅记录不存在' });
  }

  const tx = db.transaction(() => {
    let shouldUpdateStock = false;

    if (returned === true && loan.returned === 0) {
      shouldUpdateStock = true;
    }

    if (actual_return_date !== undefined) {
      db.prepare('UPDATE loans SET actual_return_date = ? WHERE id = ?').run(actual_return_date, req.params.id);
    }

    if (returned !== undefined) {
      const retVal = returned ? 1 : 0;
      db.prepare('UPDATE loans SET returned = ? WHERE id = ?').run(retVal, req.params.id);

      if (shouldUpdateStock) {
        db.prepare(`
          UPDATE books 
          SET available_stock = available_stock + 1,
              status = CASE WHEN available_stock + 1 > 0 THEN '在架' ELSE status END,
              updated_at = CURRENT_TIMESTAMP
          WHERE id = ?
        `).run(loan.book_id);
      }
    }
  });

  try {
    tx();
    const updatedLoan = db.prepare(`
      SELECT loans.*, books.title as book_title 
      FROM loans JOIN books ON loans.book_id = books.id 
      WHERE loans.id = ?
    `).get(req.params.id);
    res.json(updatedLoan);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/stats', (req, res) => {
  const totalBooks = db.prepare('SELECT COUNT(*) as cnt FROM books').get().cnt;

  const borrowedCount = db.prepare(`
    SELECT COUNT(*) as cnt FROM loans WHERE returned = 0
  `).get().cnt;

  const today = new Date().toISOString().split('T')[0];
  const overdueCount = db.prepare(`
    SELECT COUNT(*) as cnt FROM loans 
    WHERE returned = 0 AND expected_return_date < ?
  `).get(today).cnt;

  res.json({ totalBooks, borrowedCount, overdueCount });
});

app.listen(PORT, () => {
  console.log(`服务器运行在 http://localhost:${PORT}`);
});
