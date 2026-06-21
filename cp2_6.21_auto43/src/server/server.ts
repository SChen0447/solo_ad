import express from 'express';
import cors from 'cors';
import path from 'path';
import fs from 'fs';
import router from './routes';

const app = express();
const PORT = Number(process.env.PORT) || 4000;

app.use(cors());
app.use(express.json());
app.use('/api', router);

const distDir = path.resolve(__dirname, '../../dist');
if (fs.existsSync(distDir)) {
  app.use(express.static(distDir));
  app.get('*', (_req, res) => {
    res.sendFile(path.join(distDir, 'index.html'));
  });
} else {
  console.log('ℹ️  开发模式：dist目录不存在，仅提供API服务');
}

app.listen(PORT, () => {
  console.log(`✅ 库存管理系统后端服务器已启动: http://localhost:${PORT}`);
});

export default app;
