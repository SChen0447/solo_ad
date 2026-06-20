import express from 'express';
import { dataStore } from './dataStore';

const app = express();
const PORT = 4000;

app.use(express.json());

app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') {
    return res.sendStatus(200);
  }
  next();
});

app.get('/api/events', (req, res) => {
  const events = dataStore.getEvents();
  res.json(events);
});

app.post('/api/events', (req, res) => {
  const { date, city, venue, startTime, expectedAttendance, notes } = req.body;
  if (!date || !city || !venue) {
    return res.status(400).json({ error: '日期、城市和场馆为必填项' });
  }
  const newEvent = dataStore.addEvent({
    date,
    city,
    venue,
    startTime: startTime || '20:00',
    expectedAttendance: expectedAttendance || 0,
    notes: notes || ''
  });
  res.status(201).json(newEvent);
});

app.get('/api/equipment', (req, res) => {
  const equipment = dataStore.getEquipment();
  res.json(equipment);
});

app.post('/api/equipment', (req, res) => {
  const { name, brand, quantity, purchaseYear, notes, imageUrl, type } = req.body;
  if (!name || !brand || !type) {
    return res.status(400).json({ error: '设备名、品牌和类型为必填项' });
  }
  const newEquipment = dataStore.addEquipment({
    name,
    brand,
    quantity: quantity || 1,
    purchaseYear: purchaseYear || new Date().getFullYear(),
    notes: notes || '',
    imageUrl: imageUrl || '',
    type
  });
  res.status(201).json(newEquipment);
});

app.put('/api/equipment/:id', (req, res) => {
  const { id } = req.params;
  const updated = dataStore.updateEquipment(id, req.body);
  if (!updated) {
    return res.status(404).json({ error: '设备不存在' });
  }
  res.json(updated);
});

app.delete('/api/equipment/:id', (req, res) => {
  const { id } = req.params;
  const deleted = dataStore.deleteEquipment(id);
  if (!deleted) {
    return res.status(404).json({ error: '设备不存在' });
  }
  res.json({ success: true });
});

app.get('/api/inventory', (req, res) => {
  const inventory = dataStore.getInventory();
  res.json(inventory);
});

app.put('/api/inventory/:id', (req, res) => {
  const { id } = req.params;
  const updated = dataStore.updateInventory(id, req.body);
  if (!updated) {
    return res.status(404).json({ error: '商品不存在' });
  }
  res.json(updated);
});

app.get('/api/stats', (req, res) => {
  const stats = dataStore.getStats();
  res.json(stats);
});

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
