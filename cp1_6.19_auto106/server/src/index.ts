import express from 'express';
import { createServer } from 'http';
import { WebSocketServer } from 'ws';
import { handleWebSocketConnection } from './websocketHandler';

const app = express();
const server = createServer(app);
const wss = new WebSocketServer({ server, path: '/ws' });

app.use(express.json());

app.get('/health', (_req, res) => {
  res.json({ status: 'ok' });
});

wss.on('connection', (ws) => {
  handleWebSocketConnection(ws);
});

const PORT = 8080;
server.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
  console.log(`WebSocket ready on ws://localhost:${PORT}/ws`);
});
