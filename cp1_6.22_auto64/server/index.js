import express from 'express';
import cors from 'cors';
import { WebSocketServer } from 'ws';
import { createServer } from 'http';

const app = express();
app.use(cors());
app.use(express.json());

const PORT = 8080;
const DATA_INTERVAL = 500;
const MAX_DATA_POINTS = 1800;

let sensorData = [];
let lastValues = {
  temperature: 25,
  humidity: 60,
  light: 500,
  windSpeed: 5,
};

function generateDataPoint() {
  const now = Date.now();
  
  lastValues.temperature = Math.max(15, Math.min(35, lastValues.temperature + (Math.random() - 0.5) * 1));
  lastValues.humidity = Math.max(20, Math.min(90, lastValues.humidity + (Math.random() - 0.5) * 3));
  lastValues.light = Math.max(0, Math.min(1000, lastValues.light + (Math.random() - 0.5) * 50));
  lastValues.windSpeed = Math.max(0, Math.min(30, lastValues.windSpeed + (Math.random() - 0.5) * 1.5));

  return {
    timestamp: now,
    temperature: parseFloat(lastValues.temperature.toFixed(1)),
    humidity: parseFloat(lastValues.humidity.toFixed(1)),
    light: parseFloat(lastValues.light.toFixed(1)),
    windSpeed: parseFloat(lastValues.windSpeed.toFixed(1)),
  };
}

function initializeHistoryData() {
  const now = Date.now();
  for (let i = MAX_DATA_POINTS; i > 0; i--) {
    const dataPoint = generateDataPoint();
    dataPoint.timestamp = now - i * DATA_INTERVAL;
    sensorData.push(dataPoint);
  }
}

initializeHistoryData();

setInterval(() => {
  const dataPoint = generateDataPoint();
  sensorData.push(dataPoint);
  if (sensorData.length > MAX_DATA_POINTS) {
    sensorData.shift();
  }
  
  wss.clients.forEach((client) => {
    if (client.readyState === 1) {
      client.send(JSON.stringify({ type: 'data', data: dataPoint }));
    }
  });
}, DATA_INTERVAL);

app.get('/api/history', (req, res) => {
  const { range = '1m' } = req.query;
  let points;
  
  switch (range) {
    case '1m':
      points = 120;
      break;
    case '5m':
      points = 600;
      break;
    case '15m':
      points = 1800;
      break;
    default:
      points = 60;
  }
  
  const history = sensorData.slice(-Math.min(points, sensorData.length));
  res.json(history);
});

const server = createServer(app);
const wss = new WebSocketServer({ server, path: '/ws' });

wss.on('connection', (ws) => {
  console.log('Client connected');
  
  ws.on('message', (message) => {
    try {
      const data = JSON.parse(message.toString());
      if (data.type === 'rangeChange') {
        const { range } = data;
        let points;
        switch (range) {
          case '1m': points = 120; break;
          case '5m': points = 600; break;
          case '15m': points = 1800; break;
          default: points = 60;
        }
        const history = sensorData.slice(-Math.min(points, sensorData.length));
        ws.send(JSON.stringify({ type: 'history', data: history, range }));
      }
    } catch (e) {
      console.error('Parse error:', e);
    }
  });

  const initialHistory = sensorData.slice(-60);
  ws.send(JSON.stringify({ type: 'history', data: initialHistory, range: '30s' }));

  ws.on('close', () => {
    console.log('Client disconnected');
  });
});

server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
