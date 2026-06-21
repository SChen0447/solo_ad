import express from 'express';
import cors from 'cors';
import { v4 as uuidv4 } from 'uuid';
import multer from 'multer';
import path from 'path';
import { fileURLToPath } from 'url';
import { works, orders, reviews } from './data.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = 3002;

app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, path.join(__dirname, 'uploads'));
  },
  filename: (req, file, cb) => {
    cb(null, `${uuidv4()}-${file.originalname}`);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 },
});

app.get('/api/works', (req, res) => {
  setTimeout(() => {
    res.json(works);
  }, 200);
});

app.get('/api/works/:id', (req, res) => {
  const work = works.find((w) => w.id === req.params.id);
  if (!work) {
    return res.status(404).json({ error: '作品不存在' });
  }
  res.json(work);
});

app.get('/api/works/:id/reviews', (req, res) => {
  const workReviews = reviews.filter((r) => r.workId === req.params.id);
  res.json(workReviews);
});

app.post('/api/works/:id/reviews', upload.array('images', 3), (req, res) => {
  const { workId } = req.params;
  const { rating, comment, userName } = req.body;

  const work = works.find((w) => w.id === workId);
  if (!work) {
    return res.status(404).json({ error: '作品不存在' });
  }

  const imageUrls = req.files
    ? req.files.map((file) => `/uploads/${file.filename}`)
    : [];

  const newReview = {
    id: uuidv4(),
    workId,
    userName: userName || '匿名用户',
    rating: parseInt(rating, 10),
    comment,
    images: imageUrls,
    createdAt: new Date().toISOString(),
  };

  reviews.push(newReview);
  res.status(201).json(newReview);
});

app.get('/api/orders', (req, res) => {
  res.json(orders);
});

app.get('/api/orders/:id', (req, res) => {
  const order = orders.find((o) => o.id === req.params.id);
  if (!order) {
    return res.status(404).json({ error: '订单不存在' });
  }
  res.json(order);
});

app.post('/api/orders', (req, res) => {
  const { workId, size, color, engraving, price } = req.body;

  const work = works.find((w) => w.id === workId);
  if (!work) {
    return res.status(404).json({ error: '作品不存在' });
  }

  const newOrder = {
    id: uuidv4(),
    workId,
    workTitle: work.title,
    workImage: work.thumbnail,
    size,
    color,
    engraving,
    price,
    status: 'pending',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  orders.unshift(newOrder);
  res.status(201).json(newOrder);
});

app.put('/api/orders/:id/status', (req, res) => {
  const { status } = req.body;
  const orderIndex = orders.findIndex((o) => o.id === req.params.id);

  if (orderIndex === -1) {
    return res.status(404).json({ error: '订单不存在' });
  }

  const validStatuses = ['pending', 'making', 'shipped', 'completed', 'cancelled'];
  if (!validStatuses.includes(status)) {
    return res.status(400).json({ error: '无效的订单状态' });
  }

  orders[orderIndex] = {
    ...orders[orderIndex],
    status,
    updatedAt: new Date().toISOString(),
  };

  res.json(orders[orderIndex]);
});

app.delete('/api/orders/:id', (req, res) => {
  const orderIndex = orders.findIndex((o) => o.id === req.params.id);
  if (orderIndex === -1) {
    return res.status(404).json({ error: '订单不存在' });
  }

  const deletedOrder = orders.splice(orderIndex, 1)[0];
  res.json(deletedOrder);
});

app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});
