import express from 'express';
import cors from 'cors';
import { v4 as uuidv4 } from 'uuid';
import QRCode from 'qrcode';
import { readData, writeData, generateStalls } from './data.js';

const app = express();
const PORT = 3001;

app.use(cors());
app.use(express.json());

app.get('/api/fairs', (_req, res) => {
  try {
    const data = readData();
    const fairs = data.fairs.map(({ stalls, ...rest }) => ({
      ...rest,
      occupiedCount: stalls.filter(s => s.status === 'occupied' || s.status === 'checked-in').length,
      checkedInCount: stalls.filter(s => s.status === 'checked-in').length,
    }));
    fairs.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    res.json(fairs);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch fairs' });
  }
});

app.post('/api/fairs', (req, res) => {
  try {
    const { name, date, totalStalls, price } = req.body;
    if (!name || !date || !totalStalls || price === undefined) {
      res.status(400).json({ error: 'Missing required fields' });
      return;
    }
    if (name.length > 50) {
      res.status(400).json({ error: 'Name exceeds 50 characters' });
      return;
    }
    if (totalStalls < 1 || totalStalls > 200) {
      res.status(400).json({ error: 'Total stalls must be between 1 and 200' });
      return;
    }
    if (!Number.isInteger(price) || price < 0) {
      res.status(400).json({ error: 'Price must be a non-negative integer' });
      return;
    }
    const data = readData();
    const newFair = {
      id: uuidv4(),
      name,
      date,
      totalStalls,
      price,
      stalls: generateStalls(totalStalls),
      createdAt: new Date().toISOString(),
    };
    data.fairs.unshift(newFair);
    writeData(data);
    res.status(201).json(newFair);
  } catch (err) {
    res.status(500).json({ error: 'Failed to create fair' });
  }
});

app.get('/api/fairs/:id', (req, res) => {
  try {
    const data = readData();
    const fair = data.fairs.find(f => f.id === req.params.id);
    if (!fair) {
      res.status(404).json({ error: 'Fair not found' });
      return;
    }
    res.json(fair);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch fair' });
  }
});

app.post('/api/fairs/:id/register', (req, res) => {
  try {
    const { stallId, vendorName, vendorPhone, vendorCategory } = req.body;
    if (!stallId || !vendorName || !vendorPhone || !vendorCategory) {
      res.status(400).json({ error: 'Missing required fields' });
      return;
    }
    const data = readData();
    const fair = data.fairs.find(f => f.id === req.params.id);
    if (!fair) {
      res.status(404).json({ error: 'Fair not found' });
      return;
    }
    const stall = fair.stalls.find(s => s.id === stallId);
    if (!stall) {
      res.status(404).json({ error: 'Stall not found' });
      return;
    }
    if (stall.status !== 'available') {
      res.status(400).json({ error: 'Stall is not available' });
      return;
    }
    stall.status = 'occupied';
    stall.vendorName = vendorName;
    stall.vendorPhone = vendorPhone;
    stall.vendorCategory = vendorCategory;

    const stallIndex = fair.stalls.findIndex(s => s.id === stallId);
    const cols = 6;
    const neighborIndices = [stallIndex - 1, stallIndex + 1, stallIndex - cols, stallIndex + cols];
    const blockedIds: string[] = [];
    for (const ni of neighborIndices) {
      if (ni >= 0 && ni < fair.stalls.length) {
        const neighbor = fair.stalls[ni];
        if (neighbor.status === 'available') {
          const sameRowLeft = stallIndex % cols !== 0 && ni === stallIndex - 1;
          const sameRowRight = stallIndex % cols !== cols - 1 && ni === stallIndex + 1;
          const above = ni === stallIndex - cols;
          const below = ni === stallIndex + cols;
          if (sameRowLeft || sameRowRight || above || below) {
            neighbor.status = 'blocked';
            blockedIds.push(neighbor.id);
          }
        }
      }
    }

    writeData(data);
    res.json({ stall, blockedIds });
  } catch (err) {
    res.status(500).json({ error: 'Failed to register stall' });
  }
});

app.post('/api/fairs/:id/checkin', async (req, res) => {
  try {
    const { stallId } = req.body;
    if (!stallId) {
      res.status(400).json({ error: 'Missing stallId' });
      return;
    }
    const data = readData();
    const fair = data.fairs.find(f => f.id === req.params.id);
    if (!fair) {
      res.status(404).json({ error: 'Fair not found' });
      return;
    }
    const stall = fair.stalls.find(s => s.id === stallId);
    if (!stall) {
      res.status(404).json({ error: 'Stall not found' });
      return;
    }
    if (stall.status !== 'occupied') {
      res.status(400).json({ error: 'Stall is not in occupied status' });
      return;
    }
    stall.status = 'checked-in';
    const now = new Date();
    stall.checkInTime = now.toISOString();

    const qrPayload = JSON.stringify({ fairId: fair.id, stallId: stall.id, timestamp: now.getTime() });
    const qrDataUrl = await QRCode.toDataURL(qrPayload, { width: 200, margin: 1 });

    writeData(data);
    res.json({ stall, qrDataUrl });
  } catch (err) {
    res.status(500).json({ error: 'Failed to check in' });
  }
});

app.get('/api/fairs/:id/qrcode/:stallId', async (req, res) => {
  try {
    const data = readData();
    const fair = data.fairs.find(f => f.id === req.params.id);
    if (!fair) {
      res.status(404).json({ error: 'Fair not found' });
      return;
    }
    const stall = fair.stalls.find(s => s.id === req.params.stallId);
    if (!stall) {
      res.status(404).json({ error: 'Stall not found' });
      return;
    }
    const qrPayload = JSON.stringify({ fairId: fair.id, stallId: stall.id });
    const qrDataUrl = await QRCode.toDataURL(qrPayload, { width: 200, margin: 1 });
    res.json({ qrDataUrl });
  } catch (err) {
    res.status(500).json({ error: 'Failed to generate QR code' });
  }
});

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
