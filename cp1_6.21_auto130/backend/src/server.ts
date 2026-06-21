import express from 'express';
import cors from 'cors';
import booksRouter from './routes/books';
import loansRouter from './routes/loans';
import './db';

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());

app.use('/api/books', booksRouter);
app.use('/api/loans', loansRouter);

app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', message: '图书推荐与借阅管理服务运行正常' });
});

app.listen(PORT, () => {
  console.log(`🚀 服务器运行在 http://localhost:${PORT}`);
  console.log(`📚 图书推荐与借阅管理系统启动成功`);
});

export default app;
