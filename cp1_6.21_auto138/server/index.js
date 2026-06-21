import express from 'express';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';
import ordersRouter from './routes/orders.js';
import materialsRouter from './routes/materials.js';
import './db.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = 3001;

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

const uploadsDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}
app.use('/uploads', express.static(uploadsDir));

app.use('/api/orders', ordersRouter);
app.use('/api/materials', materialsRouter);

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', message: '手工艺工作室管理系统后端服务运行中' });
});

app.listen(PORT, () => {
  console.log(`\n========================================`);
  console.log(`  手工艺工作室管理系统后端已启动`);
  console.log(`  端口: ${PORT}`);
  console.log(`  健康检查: http://localhost:${PORT}/api/health`);
  console.log(`========================================\n`);
});
