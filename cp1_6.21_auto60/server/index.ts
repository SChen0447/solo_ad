import express from 'express';
import http from 'http';
import cors from 'cors';
import { Server as SocketIOServer } from 'socket.io';
import ideasRouter, { setSocketServer } from './api/ideasRouter';
import { initSocketHandler } from './socket/socketHandler';
import { initializeSampleData } from './services/scoringService';

const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 3001;
const app = express();
const server = http.createServer(app);

const io = new SocketIOServer(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST']
  }
});

app.use(cors());
app.use(express.json());

setSocketServer(io);
initSocketHandler(io);

app.use('/api/ideas', ideasRouter);

app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: Date.now() });
});

initializeSampleData();

server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  console.log(`Health check: http://localhost:${PORT}/api/health`);
});
