import express from 'express';
import cors from 'cors';
import { WebSocketServer, WebSocket } from 'ws';
import { createServer } from 'http';
import { WindDataGenerator, SceneType } from './dataGenerator.js';

const app = express();
const PORT = 3001;

app.use(
  cors({
    origin: 'http://localhost:5173',
    credentials: true,
  })
);
app.use(express.json());

const dataGenerator = new WindDataGenerator();
const clients: Set<WebSocket> = new Set();

app.get('/api/wind/init', (req, res) => {
  const scene = (req.query.scene as SceneType) || 'typhoon';
  const validScenes: SceneType[] = ['typhoon', 'monsoon', 'valley'];

  if (!validScenes.includes(scene)) {
    return res.status(400).json({ error: 'Invalid scene type' });
  }

  const data = dataGenerator.generateWindField(scene);
  res.json(data);
});

app.post('/api/wind/init', (req, res) => {
  const scene = (req.body.scene as SceneType) || 'typhoon';
  const validScenes: SceneType[] = ['typhoon', 'monsoon', 'valley'];

  if (!validScenes.includes(scene)) {
    return res.status(400).json({ error: 'Invalid scene type' });
  }

  const data = dataGenerator.generateWindField(scene);
  res.json(data);
});

app.get('/api/wind/scenes', (_req, res) => {
  res.json([
    { id: 'typhoon', ...dataGenerator.getSceneInfo('typhoon') },
    { id: 'monsoon', ...dataGenerator.getSceneInfo('monsoon') },
    { id: 'valley', ...dataGenerator.getSceneInfo('valley') },
  ]);
});

const server = createServer(app);
const wss = new WebSocketServer({ server, path: '/wind/stream' });

wss.on('connection', (ws) => {
  console.log('WebSocket client connected');
  clients.add(ws);

  ws.on('message', (message) => {
    try {
      const data = JSON.parse(message.toString());
      if (data.scene) {
        dataGenerator.setScene(data.scene);
        const initData = dataGenerator.generateWindField();
        ws.send(JSON.stringify({ type: 'full', ...initData }));
      }
    } catch (e) {
      console.error('Error parsing WebSocket message:', e);
    }
  });

  ws.on('close', () => {
    console.log('WebSocket client disconnected');
    clients.delete(ws);
  });

  ws.onerror = (err) => {
    console.error('WebSocket error:', err);
    clients.delete(ws);
  };
});

setInterval(() => {
  if (clients.size === 0) return;

  const update = dataGenerator.generateIncrementalUpdate();
  const message = JSON.stringify(update);

  clients.forEach((client) => {
    if (client.readyState === WebSocket.OPEN) {
      client.send(message);
    }
  });
}, 200);

server.listen(PORT, () => {
  console.log(`Wind field server running on http://localhost:${PORT}`);
  console.log(`WebSocket endpoint: ws://localhost:${PORT}/wind/stream`);
});
