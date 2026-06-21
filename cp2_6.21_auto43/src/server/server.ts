import express from 'express';
import cors from 'cors';
import path from 'path';
import router from './routes';

const app = express();
const PORT = 3001;

app.use(cors());
app.use(express.json());
app.use('/api', router);

try {
  const distDir = path.resolve(__dirname, '../../dist');
  app.use(express.static(distDir));
  app.get('*', (_req, res) => {
    res.sendFile(path.join(distDir, 'index.html'));
  });
} catch {
  // In dev mode, dist may not exist
}

app.listen(PORT, () => {
  console.log(`✅ 库存管理系统后端服务器已启动: http://localhost:${PORT}`);
});

export default app;
