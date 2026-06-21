import express from 'express';
import { createServer } from 'http';
import cors from 'cors';
import { fileURLToPath } from 'url';
import path from 'path';

import songRoutes from './routes/songRoutes.js';
import rehearsalRoutes from './routes/rehearsalRoutes.js';
import { setupSocketIO } from './services/syncService.js';
import { dataStore } from './services/dataStore.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const httpServer = createServer(app);
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());

app.use('/api/songs', songRoutes);
app.use('/api/rehearsals', rehearsalRoutes);

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: Date.now() });
});

setupSocketIO(httpServer);

async function startServer() {
  try {
    await dataStore.initMockData();
    console.log('初始化数据完成');

    httpServer.listen(PORT, () => {
      console.log(`服务器运行在 http://localhost:${PORT}`);
    });
  } catch (error) {
    console.error('启动服务器失败:', error);
    process.exit(1);
  }
}

startServer();
