import express from 'express';
import { createServer } from 'http';
import cors from 'cors';
import { router as apiRouter } from './api.js';
import { setupSocket } from './socket.js';
import './db.js';

const app = express();
const httpServer = createServer(app);
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());

app.use('/api', apiRouter);

setupSocket(httpServer);

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok' });
});

httpServer.listen(PORT, () => {
  console.log(`服务器运行在 http://localhost:${PORT}`);
});

export default app;
