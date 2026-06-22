import express from 'express';
import cors from 'cors';
import http from 'http';
import { WebSocketServer } from 'ws';
import { v4 as uuidv4 } from 'uuid';

const app = express();
app.use(cors());
app.use(express.json());

const cities = [
  { name: 'Tokyo', lat: 35.6762, lng: 139.6503, region: 'asia', country: 'Japan' },
  { name: 'Beijing', lat: 39.9042, lng: 116.4074, region: 'asia', country: 'China' },
  { name: 'Shanghai', lat: 31.2304, lng: 121.4737, region: 'asia', country: 'China' },
  { name: 'Seoul', lat: 37.5665, lng: 126.9780, region: 'asia', country: 'South Korea' },
  { name: 'Singapore', lat: 1.3521, lng: 103.8198, region: 'asia', country: 'Singapore' },
  { name: 'Hong Kong', lat: 22.3193, lng: 114.1694, region: 'asia', country: 'China' },
  { name: 'Mumbai', lat: 19.0760, lng: 72.8777, region: 'asia', country: 'India' },
  { name: 'Delhi', lat: 28.6139, lng: 77.2090, region: 'asia', country: 'India' },
  { name: 'Bangkok', lat: 13.7563, lng: 100.5018, region: 'asia', country: 'Thailand' },
  { name: 'Jakarta', lat: -6.2088, lng: 106.8456, region: 'asia', country: 'Indonesia' },
  { name: 'Manila', lat: 14.5995, lng: 120.9842, region: 'asia', country: 'Philippines' },
  { name: 'Hanoi', lat: 21.0285, lng: 105.8542, region: 'asia', country: 'Vietnam' },
  { name: 'Dubai', lat: 25.2048, lng: 55.2708, region: 'asia', country: 'UAE' },
  { name: 'Tehran', lat: 35.6892, lng: 51.3890, region: 'asia', country: 'Iran' },
  { name: 'Istanbul', lat: 41.0082, lng: 28.9784, region: 'asia', country: 'Turkey' },
  { name: 'Riyadh', lat: 24.7136, lng: 46.6753, region: 'asia', country: 'Saudi Arabia' },
  { name: 'Taipei', lat: 25.0330, lng: 121.5654, region: 'asia', country: 'Taiwan' },
  { name: 'Kuala Lumpur', lat: 3.1390, lng: 101.6869, region: 'asia', country: 'Malaysia' },
  { name: 'Karachi', lat: 24.8607, lng: 67.0011, region: 'asia', country: 'Pakistan' },
  { name: 'Osaka', lat: 34.6937, lng: 135.5023, region: 'asia', country: 'Japan' },
  { name: 'London', lat: 51.5074, lng: -0.1278, region: 'europe', country: 'UK' },
  { name: 'Paris', lat: 48.8566, lng: 2.3522, region: 'europe', country: 'France' },
  { name: 'Berlin', lat: 52.5200, lng: 13.4050, region: 'europe', country: 'Germany' },
  { name: 'Madrid', lat: 40.4168, lng: -3.7038, region: 'europe', country: 'Spain' },
  { name: 'Rome', lat: 41.9028, lng: 12.4964, region: 'europe', country: 'Italy' },
  { name: 'Amsterdam', lat: 52.3676, lng: 4.9041, region: 'europe', country: 'Netherlands' },
  { name: 'Vienna', lat: 48.2082, lng: 16.3738, region: 'europe', country: 'Austria' },
  { name: 'Warsaw', lat: 52.2297, lng: 21.0122, region: 'europe', country: 'Poland' },
  { name: 'Stockholm', lat: 59.3293, lng: 18.0686, region: 'europe', country: 'Sweden' },
  { name: 'Oslo', lat: 59.9139, lng: 10.7522, region: 'europe', country: 'Norway' },
  { name: 'Copenhagen', lat: 55.6761, lng: 12.5683, region: 'europe', country: 'Denmark' },
  { name: 'Moscow', lat: 55.7558, lng: 37.6173, region: 'europe', country: 'Russia' },
  { name: 'Frankfurt', lat: 50.1109, lng: 8.6821, region: 'europe', country: 'Germany' },
  { name: 'Munich', lat: 48.1351, lng: 11.5820, region: 'europe', country: 'Germany' },
  { name: 'Barcelona', lat: 41.3874, lng: 2.1686, region: 'europe', country: 'Spain' },
  { name: 'Milan', lat: 45.4642, lng: 9.1900, region: 'europe', country: 'Italy' },
  { name: 'Brussels', lat: 50.8503, lng: 4.3517, region: 'europe', country: 'Belgium' },
  { name: 'Zurich', lat: 47.3769, lng: 8.5417, region: 'europe', country: 'Switzerland' },
  { name: 'Dublin', lat: 53.3498, lng: -6.2603, region: 'europe', country: 'Ireland' },
  { name: 'Lisbon', lat: 38.7223, lng: -9.1393, region: 'europe', country: 'Portugal' },
  { name: 'New York', lat: 40.7128, lng: -74.0060, region: 'america', country: 'USA' },
  { name: 'Los Angeles', lat: 34.0522, lng: -118.2437, region: 'america', country: 'USA' },
  { name: 'Chicago', lat: 41.8781, lng: -87.6298, region: 'america', country: 'USA' },
  { name: 'Houston', lat: 29.7604, lng: -95.3698, region: 'america', country: 'USA' },
  { name: 'Phoenix', lat: 33.4484, lng: -112.0740, region: 'america', country: 'USA' },
  { name: 'San Francisco', lat: 37.7749, lng: -122.4194, region: 'america', country: 'USA' },
  { name: 'Seattle', lat: 47.6062, lng: -122.3321, region: 'america', country: 'USA' },
  { name: 'Miami', lat: 25.7617, lng: -80.1918, region: 'america', country: 'USA' },
  { name: 'Dallas', lat: 32.7767, lng: -96.7970, region: 'america', country: 'USA' },
  { name: 'Atlanta', lat: 33.7490, lng: -84.3880, region: 'america', country: 'USA' },
  { name: 'Toronto', lat: 43.6532, lng: -79.3832, region: 'america', country: 'Canada' },
  { name: 'Vancouver', lat: 49.2827, lng: -123.1207, region: 'america', country: 'Canada' },
  { name: 'Montreal', lat: 45.5017, lng: -73.5673, region: 'america', country: 'Canada' },
  { name: 'Mexico City', lat: 19.4326, lng: -99.1332, region: 'america', country: 'Mexico' },
  { name: 'Sao Paulo', lat: -23.5505, lng: -46.6333, region: 'america', country: 'Brazil' },
  { name: 'Buenos Aires', lat: -34.6037, lng: -58.3816, region: 'america', country: 'Argentina' },
  { name: 'Rio de Janeiro', lat: -22.9068, lng: -43.1729, region: 'america', country: 'Brazil' },
  { name: 'Santiago', lat: -33.4489, lng: -70.6693, region: 'america', country: 'Chile' },
  { name: 'Lima', lat: -12.0464, lng: -77.0428, region: 'america', country: 'Peru' },
  { name: 'Bogota', lat: 4.7110, lng: -74.0721, region: 'america', country: 'Colombia' },
  { name: 'Sydney', lat: -33.8688, lng: 151.2093, region: 'oceania', country: 'Australia' },
  { name: 'Melbourne', lat: -37.8136, lng: 144.9631, region: 'oceania', country: 'Australia' },
  { name: 'Auckland', lat: -36.8485, lng: 174.7633, region: 'oceania', country: 'New Zealand' },
  { name: 'Perth', lat: -31.9505, lng: 115.8605, region: 'oceania', country: 'Australia' },
  { name: 'Brisbane', lat: -27.4698, lng: 153.0251, region: 'oceania', country: 'Australia' },
  { name: 'Cairo', lat: 30.0444, lng: 31.2357, region: 'africa', country: 'Egypt' },
  { name: 'Lagos', lat: 6.5244, lng: 3.3792, region: 'africa', country: 'Nigeria' },
  { name: 'Johannesburg', lat: -26.2041, lng: 28.0473, region: 'africa', country: 'South Africa' },
  { name: 'Cape Town', lat: -33.9249, lng: 18.4241, region: 'africa', country: 'South Africa' },
  { name: 'Nairobi', lat: -1.2921, lng: 36.8219, region: 'africa', country: 'Kenya' },
  { name: 'Casablanca', lat: 33.5731, lng: -7.5898, region: 'africa', country: 'Morocco' },
  { name: 'Accra', lat: 5.6037, lng: -0.1870, region: 'africa', country: 'Ghana' },
  { name: 'Addis Ababa', lat: 9.0320, lng: 38.7468, region: 'africa', country: 'Ethiopia' },
  { name: 'Khartoum', lat: 15.5007, lng: 32.5599, region: 'africa', country: 'Sudan' },
  { name: 'Algiers', lat: 36.7538, lng: 3.0588, region: 'africa', country: 'Algeria' },
];

const generateNodes = () => {
  return cities.map((city, index) => ({
    id: `node_${index}`,
    name: city.name,
    country: city.country,
    region: city.region,
    lat: city.lat,
    lng: city.lng,
    traffic: Math.random() * 100,
    latency: 20 + Math.random() * 180,
  }));
};

const nodes = generateNodes();

const packetTypes = ['TCP', 'UDP', 'HTTP'];
const regions = ['asia', 'europe', 'america', 'oceania', 'africa'];

const getRandomInt = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min;
const getRandomFloat = (min, max) => Math.random() * (max - min) + min;

const getDifferentRegion = (region) => {
  const others = regions.filter((r) => r !== region);
  return others[getRandomInt(0, others.length - 1)];
};

const historySnapshots = new Map();
const SNAPSHOT_INTERVAL = 5;
const MAX_HISTORY = 60 * 60;

const currentTraffic = [];

const saveSnapshot = () => {
  const now = Math.floor(Date.now() / 1000);
  const snapshot = {
    timestamp: now,
    nodes: nodes.map((n) => ({ ...n })),
    traffic: currentTraffic.map((t) => ({ ...t })),
  };
  historySnapshots.set(now, snapshot);
  const cutoff = now - MAX_HISTORY;
  for (const key of historySnapshots.keys()) {
    if (key < cutoff) {
      historySnapshots.delete(key);
    }
  }
};

setInterval(saveSnapshot, SNAPSHOT_INTERVAL * 1000);
saveSnapshot();

const generatePacket = () => {
  const fromIdx = getRandomInt(0, nodes.length - 1);
  const fromNode = nodes[fromIdx];
  const targetRegion = getDifferentRegion(fromNode.region);
  const regionNodes = nodes.filter((n) => n.region === targetRegion);
  if (regionNodes.length === 0) return null;
  const toNode = regionNodes[getRandomInt(0, regionNodes.length - 1)];

  const size = getRandomInt(1, 100);
  const type = packetTypes[getRandomInt(0, packetTypes.length - 1)];
  const duration = getRandomInt(3000, 8000);

  fromNode.traffic = Math.min(100, fromNode.traffic + getRandomFloat(0.1, 2));
  toNode.traffic = Math.min(100, toNode.traffic + getRandomFloat(0.1, 2));

  const packet = {
    id: uuidv4(),
    from: fromNode.id,
    to: toNode.id,
    size,
    type,
    timestamp: Date.now(),
    duration,
  };

  currentTraffic.push(packet);
  setTimeout(() => {
    const idx = currentTraffic.indexOf(packet);
    if (idx > -1) currentTraffic.splice(idx, 1);
  }, duration);

  return packet;
};

const generateTrafficBatch = () => {
  const count = getRandomInt(10, 50);
  const packets = [];
  for (let i = 0; i < count; i++) {
    const p = generatePacket();
    if (p) packets.push(p);
  }
  nodes.forEach((n) => {
    n.traffic = Math.max(0, n.traffic - getRandomFloat(0.05, 0.5));
  });
  return packets;
};

app.get('/data/endpoints', (req, res) => {
  res.json(nodes);
});

app.get('/data/traffic', (req, res) => {
  res.json({
    nodes: nodes.map((n) => ({ ...n })),
    traffic: currentTraffic.map((t) => ({ ...t })),
  });
});

app.get('/data/snapshots', (req, res) => {
  const { from, to } = req.query;
  const fromTime = from ? parseInt(from, 10) : Math.floor(Date.now() / 1000) - 3600;
  const toTime = to ? parseInt(to, 10) : Math.floor(Date.now() / 1000);

  const result = [];
  for (const [key, snapshot] of historySnapshots) {
    if (key >= fromTime && key <= toTime) {
      result.push(snapshot);
    }
  }
  result.sort((a, b) => a.timestamp - b.timestamp);
  res.json(result);
});

const server = http.createServer(app);
const wss = new WebSocketServer({ server, path: '/ws' });

wss.on('connection', (ws) => {
  ws.send(JSON.stringify({ type: 'init', nodes: nodes.map((n) => ({ ...n })) }));

  const sendInterval = setInterval(() => {
    const packets = generateTrafficBatch();
    if (ws.readyState === 1) {
      ws.send(
        JSON.stringify({
          type: 'traffic',
          timestamp: Date.now(),
          nodes: nodes.map((n) => ({ ...n })),
          packets,
        })
      );
    }
  }, 1000);

  ws.on('close', () => {
    clearInterval(sendInterval);
  });
});

const PORT = process.env.PORT || 3001;
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
