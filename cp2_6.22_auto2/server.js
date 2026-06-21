import express from 'express';
import cors from 'cors';
import { v4 as uuidv4 } from 'uuid';

const app = express();
app.use(cors());
app.use(express.json());

const gifts = new Map();
const exchanges = new Map();
const logistics = new Map();

function formatTime(date) {
  const d = new Date(date);
  const pad = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
}

app.get('/api/gifts', (req, res) => {
  const list = Array.from(gifts.values()).sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  res.json(list);
});

app.get('/api/gifts/:id', (req, res) => {
  const gift = gifts.get(req.params.id);
  if (!gift) return res.status(404).json({ error: 'Gift not found' });
  const giftLogistics = Array.from(logistics.values())
    .filter((l) => l.giftId === req.params.id)
    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  const giftExchanges = Array.from(exchanges.values())
    .filter((e) => e.giftAId === req.params.id || e.giftBId === req.params.id)
    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  res.json({ ...gift, logistics: giftLogistics, exchangeHistory: giftExchanges });
});

app.post('/api/gifts', (req, res) => {
  const { name, photoUrl, value, city, category, owner } = req.body;
  if (!name || !photoUrl || !value || !city || !category) {
    return res.status(400).json({ error: 'All fields are required' });
  }
  const urlPattern = /^https?:\/\/.+/;
  if (!urlPattern.test(photoUrl)) {
    return res.status(400).json({ error: 'Invalid URL format' });
  }
  const id = uuidv4();
  const now = new Date();
  const gift = {
    id,
    name,
    photoUrl,
    value: Number(value),
    city,
    category,
    owner: owner || '匿名用户',
    status: 'available',
    createdAt: now.toISOString(),
    createdAtFormatted: formatTime(now),
  };
  gifts.set(id, gift);
  res.status(201).json(gift);
});

app.get('/api/exchanges/matches', (req, res) => {
  const available = Array.from(gifts.values()).filter((g) => g.status === 'available');
  const matches = [];
  const used = new Set();

  for (let i = 0; i < available.length && matches.length < 5; i++) {
    for (let j = i + 1; j < available.length && matches.length < 5; j++) {
      const a = available[i];
      const b = available[j];
      if (used.has(a.id) || used.has(b.id)) continue;
      if (a.category !== b.category) continue;
      if (a.city === b.city) continue;
      const ratio = Math.min(a.value, b.value) / Math.max(a.value, b.value);
      if (ratio < 0.8) continue;
      matches.push({ giftA: a, giftB: b, score: ratio });
      used.add(a.id);
      used.add(b.id);
    }
  }

  res.json(matches);
});

app.post('/api/exchanges/confirm', (req, res) => {
  const { giftAId, giftBId } = req.body;
  const giftA = gifts.get(giftAId);
  const giftB = gifts.get(giftBId);
  if (!giftA || !giftB) return res.status(404).json({ error: 'Gift not found' });
  if (giftA.status !== 'available' || giftB.status !== 'available') {
    return res.status(400).json({ error: 'Gift already exchanged' });
  }
  const id = uuidv4();
  const now = new Date();
  giftA.status = 'exchanged';
  giftB.status = 'exchanged';
  gifts.set(giftAId, giftA);
  gifts.set(giftBId, giftB);
  const exchange = {
    id,
    giftAId,
    giftBId,
    giftAName: giftA.name,
    giftBName: giftB.name,
    giftACity: giftA.city,
    giftBCity: giftB.city,
    createdAt: now.toISOString(),
    createdAtFormatted: formatTime(now),
  };
  exchanges.set(id, exchange);
  res.status(201).json(exchange);
});

app.get('/api/exchanges', (req, res) => {
  const list = Array.from(exchanges.values()).sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  res.json(list);
});

app.post('/api/logistics', (req, res) => {
  const { giftId, company, trackingNumber, statusText } = req.body;
  if (!giftId || !company || !trackingNumber || !statusText) {
    return res.status(400).json({ error: 'All fields are required' });
  }
  const gift = gifts.get(giftId);
  if (!gift) return res.status(404).json({ error: 'Gift not found' });
  const id = uuidv4();
  const now = new Date();
  const entry = {
    id,
    giftId,
    company,
    trackingNumber,
    statusText,
    createdAt: now.toISOString(),
    createdAtFormatted: formatTime(now),
  };
  logistics.set(id, entry);
  res.status(201).json(entry);
});

app.get('/api/logistics/:giftId', (req, res) => {
  const list = Array.from(logistics.values())
    .filter((l) => l.giftId === req.params.giftId)
    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  res.json(list);
});

app.get('/api/stats', (req, res) => {
  const all = Array.from(gifts.values());
  const total = all.length;
  const exchanged = all.filter((g) => g.status === 'exchanged').length;
  const inTransit = Array.from(logistics.values()).length;
  res.json({ total, exchanged, inTransit });
});

const PORT = 3001;
app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
