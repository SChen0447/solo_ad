import express from 'express';
import cors from 'cors';
import { v4 as uuidv4 } from 'uuid';

const app = express();
app.use(cors());
app.use(express.json());

const shelves = [
  { id: 'A1', x: 50, y: 60, label: 'A1 - 文学小说' },
  { id: 'A2', x: 280, y: 60, label: 'A2 - 历史传记' },
  { id: 'A3', x: 510, y: 60, label: 'A3 - 哲学思想' },
  { id: 'A4', x: 50, y: 200, label: 'A4 - 自然科学' },
  { id: 'A5', x: 280, y: 200, label: 'A5 - 计算机技术' },
  { id: 'A6', x: 510, y: 200, label: 'A6 - 经济管理' },
  { id: 'B1', x: 50, y: 380, label: 'B1 - 艺术设计' },
  { id: 'B2', x: 280, y: 380, label: 'B2 - 教育学习' },
  { id: 'B3', x: 510, y: 380, label: 'B3 - 社会科学' },
  { id: 'B4', x: 50, y: 520, label: 'B4 - 医学健康' },
  { id: 'B5', x: 280, y: 520, label: 'B5 - 法律法规' },
  { id: 'B6', x: 510, y: 520, label: 'B6 - 综合图书' },
];

const categories = ['A1','A2','A3','A4','A5','A6','B1','B2','B3','B4','B5','B6'];
const categoryNames = {
  A1:'文学小说', A2:'历史传记', A3:'哲学思想', A4:'自然科学',
  A5:'计算机技术', A6:'经济管理', B1:'艺术设计', B2:'教育学习',
  B3:'社会科学', B4:'医学健康', B5:'法律法规', B6:'综合图书',
};
const publishers = [
  '人民文学出版社','商务印书馆','中华书局','三联书店','北京大学出版社',
  '清华大学出版社','机械工业出版社','电子工业出版社','中信出版社','上海译文出版社',
];
const authors = [
  '鲁迅','老舍','巴金','沈从文','钱钟书','张爱玲','余华','莫言','路遥','陈忠实',
  '王小波','金庸','海明威','马尔克斯','卡夫卡','托尔斯泰','陀思妥耶夫斯基',
  '斯蒂芬·霍金','理查德·费曼','林达','黄仁宇','费孝通',
];
const titleParts = [
  ['春','夏','秋','冬','风','雨','雷','电','山','河','云','月'],
  ['之歌','之旅','物语','手记','笔记','传奇','往事','岁月','年华','密码','法则','简史'],
];

function generateBooks(count) {
  const books = [];
  for (let i = 0; i < count; i++) {
    const cat = categories[i % 12];
    const num = String(Math.floor(i / 12) + 1).padStart(3, '0');
    const callNumber = `${cat}/${num}`;
    const t1 = titleParts[0][i % titleParts[0].length];
    const t2 = titleParts[1][(i * 3) % titleParts[1].length];
    books.push({
      id: uuidv4(),
      title: `${t1}${t2}·${String.fromCharCode(65 + (i % 26))}系列`,
      author: authors[i % authors.length],
      isbn: `978-${String(7 + (i % 3))}-${String(1000 + i).slice(1)}-${String(10000 + i * 7).slice(1)}-${i % 10}`,
      publisher: publishers[i % publishers.length],
      callNumber,
      shelf: cat,
      status: Math.random() > 0.35 ? 'available' : 'borrowed',
      cover: `https://trae-api-cn.mchost.guru/api/ide/v1/text_to_image?prompt=book%20cover%20${encodeURIComponent(t1 + t2)}%20minimalist%20design&image_size=square`,
      description: `这是一本关于${categoryNames[cat]}的优秀作品，作者以独特的视角深入探讨了相关主题，内容丰富，值得一读。`,
    });
  }
  return books;
}

const books = generateBooks(10000);

let bookings = [];
let borrowRecords = [];

app.get('/api/books/search', (req, res) => {
  const { keyword = '', page = '1', pageSize = '20' } = req.query;
  const p = parseInt(page, 10);
  const ps = parseInt(pageSize, 10);
  const kw = String(keyword).toLowerCase();
  const start = Date.now();

  let filtered = books;
  if (kw) {
    filtered = books.filter(
      (b) => b.title.toLowerCase().includes(kw) || b.author.toLowerCase().includes(kw)
    );
  }

  const total = filtered.length;
  const data = filtered.slice((p - 1) * ps, p * ps);
  const elapsed = Date.now() - start;

  res.json({ data, total, page: p, pageSize: ps, elapsed });
});

app.get('/api/books/:id', (req, res) => {
  const book = books.find((b) => b.id === req.params.id);
  if (!book) return res.status(404).json({ error: '图书未找到' });
  const shelfInfo = shelves.find((s) => s.id === book.shelf);
  res.json({ ...book, shelfInfo });
});

app.post('/api/bookings', (req, res) => {
  const { bookId, date, timeSlot } = req.body;
  const book = books.find((b) => b.id === bookId);
  if (!book) return res.status(404).json({ error: '图书未找到' });
  if (book.status !== 'available') return res.status(400).json({ error: '图书已被借出' });

  const today = new Date().toISOString().slice(0, 10);
  if (date <= today) return res.status(400).json({ error: '预约日期必须为明天及以后' });

  const booking = {
    id: uuidv4(),
    bookId,
    bookTitle: book.title,
    date,
    timeSlot,
    status: 'pending',
    createdAt: new Date().toISOString(),
  };
  bookings.push(booking);
  res.json(booking);
});

app.post('/api/borrow/scan', (req, res) => {
  const { bookingId } = req.body;
  const booking = bookings.find((b) => b.id === bookingId);
  if (!booking) return res.status(404).json({ error: '预约记录未找到' });
  if (booking.status !== 'pending') return res.status(400).json({ error: '预约已失效' });

  const book = books.find((b) => b.id === booking.bookId);
  if (!book) return res.status(404).json({ error: '图书未找到' });
  if (book.status !== 'available') return res.status(400).json({ error: '图书已被借出' });

  booking.status = 'fulfilled';
  book.status = 'borrowed';

  const borrowDate = new Date();
  const dueDate = new Date(borrowDate);
  dueDate.setDate(dueDate.getDate() + 30);

  const record = {
    id: uuidv4(),
    bookId: book.id,
    bookTitle: book.title,
    borrowDate: borrowDate.toISOString(),
    dueDate: dueDate.toISOString(),
    returnDate: null,
    status: 'borrowed',
  };
  borrowRecords.push(record);

  res.json({ success: true, record, book: { id: book.id, title: book.title, dueDate: dueDate.toISOString() } });
});

app.post('/api/return/:bookId', (req, res) => {
  const book = books.find((b) => b.id === req.params.bookId);
  if (!book) return res.status(404).json({ error: '图书未找到' });
  if (book.status !== 'borrowed') return res.status(400).json({ error: '图书未被借出' });

  book.status = 'available';
  const record = borrowRecords.find((r) => r.bookId === book.id && r.status === 'borrowed');
  if (record) {
    record.status = 'returned';
    record.returnDate = new Date().toISOString();
  }

  res.json({ success: true });
});

app.get('/api/reminders', (req, res) => {
  const now = new Date();
  const threeDaysLater = new Date(now);
  threeDaysLater.setDate(threeDaysLater.getDate() + 3);

  const reminders = borrowRecords.filter((r) => {
    if (r.status !== 'borrowed') return false;
    const due = new Date(r.dueDate);
    const diffDays = (due - now) / (1000 * 60 * 60 * 24);
    return diffDays <= 3 || diffDays <= -1;
  });

  res.json(reminders);
});

app.get('/api/shelves', (req, res) => {
  res.json(shelves);
});

app.get('/api/book-location/:bookId', (req, res) => {
  const book = books.find((b) => b.id === req.params.bookId);
  if (!book) return res.status(404).json({ error: '图书未找到' });
  const shelfInfo = shelves.find((s) => s.id === book.shelf);
  res.json({ shelf: shelfInfo, book });
});

app.get('/api/borrow-records', (req, res) => {
  const activeRecords = borrowRecords.filter((r) => r.status === 'borrowed');
  res.json(activeRecords);
});

const PORT = 4000;
app.listen(PORT, () => {
  console.log(`图书馆后端服务运行于 http://localhost:${PORT}`);
});
