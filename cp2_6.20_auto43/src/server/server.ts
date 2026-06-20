import express, { Request, Response } from 'express';
import { dataStore, ServerEvent, ServerEquipment, ServerInventoryItem } from './dataStore';

const app = express();
const PORT = 3001;

app.use(express.json());

app.use((req, res, next) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') {
    return res.sendStatus(200);
  }
  next();
});

app.get('/api/events', (_req: Request, res: Response) => {
  const events = dataStore.getEvents();
  res.json(events);
});

app.post('/api/events', (req: Request, res: Response) => {
  try {
    const { date, city, venue, startTime, expectedAttendance, notes } = req.body;
    
    if (!date || !city || !venue || !startTime) {
      return res.status(400).json({ error: '缺少必要字段' });
    }

    const newEvent: Omit<ServerEvent, 'id' | 'color'> = {
      date,
      city,
      venue,
      startTime,
      expectedAttendance: parseInt(expectedAttendance) || 0,
      notes: notes || ''
    };

    const event = dataStore.addEvent(newEvent);
    res.status(201).json(event);
  } catch (error) {
    res.status(500).json({ error: '创建事件失败' });
  }
});

app.get('/api/equipment', (_req: Request, res: Response) => {
  const equipment = dataStore.getEquipment();
  res.json(equipment);
});

app.post('/api/equipment', (req: Request, res: Response) => {
  try {
    const { name, brand, quantity, purchaseYear, notes, imageUrl, type, usageFrequency } = req.body;
    
    if (!name || !brand || !type) {
      return res.status(400).json({ error: '缺少必要字段' });
    }

    const newEquipment: Omit<ServerEquipment, 'id'> = {
      name,
      brand,
      quantity: parseInt(quantity) || 1,
      purchaseYear: parseInt(purchaseYear) || new Date().getFullYear(),
      notes: notes || '',
      imageUrl: imageUrl || '',
      type,
      usageFrequency: parseInt(usageFrequency) || 0
    };

    const equipment = dataStore.addEquipment(newEquipment);
    res.status(201).json(equipment);
  } catch (error) {
    res.status(500).json({ error: '创建设备失败' });
  }
});

app.put('/api/equipment/:id', (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const data: Partial<ServerEquipment> = req.body;
    
    if (data.quantity !== undefined) data.quantity = parseInt(data.quantity as any) || 0;
    if (data.purchaseYear !== undefined) data.purchaseYear = parseInt(data.purchaseYear as any) || 0;
    if (data.usageFrequency !== undefined) data.usageFrequency = parseInt(data.usageFrequency as any) || 0;

    const updated = dataStore.updateEquipment(id, data);
    if (!updated) {
      return res.status(404).json({ error: '设备不存在' });
    }
    res.json(updated);
  } catch (error) {
    res.status(500).json({ error: '更新设备失败' });
  }
});

app.delete('/api/equipment/:id', (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const success = dataStore.deleteEquipment(id);
    if (!success) {
      return res.status(404).json({ error: '设备不存在' });
    }
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: '删除设备失败' });
  }
});

app.get('/api/inventory', (_req: Request, res: Response) => {
  const inventory = dataStore.getInventory();
  res.json(inventory);
});

app.post('/api/inventory', (req: Request, res: Response) => {
  try {
    const { name, category, price, stock, initialStock, coverUrl } = req.body;
    
    if (!name || !category || price === undefined || stock === undefined) {
      return res.status(400).json({ error: '缺少必要字段' });
    }

    const newItem: Omit<ServerInventoryItem, 'id'> = {
      name,
      category,
      price: parseFloat(price) || 0,
      stock: parseInt(stock) || 0,
      initialStock: initialStock !== undefined ? parseInt(initialStock) : parseInt(stock) || 0,
      coverUrl: coverUrl || ''
    };

    const item = dataStore.addInventory(newItem);
    res.status(201).json(item);
  } catch (error) {
    res.status(500).json({ error: '创建商品失败' });
  }
});

app.put('/api/inventory/:id', (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const data: Partial<ServerInventoryItem> = req.body;
    
    if (data.price !== undefined) data.price = parseFloat(data.price as any) || 0;
    if (data.stock !== undefined) data.stock = parseInt(data.stock as any) || 0;
    if (data.initialStock !== undefined) data.initialStock = parseInt(data.initialStock as any) || 0;

    const updated = dataStore.updateInventory(id, data);
    if (!updated) {
      return res.status(404).json({ error: '商品不存在' });
    }
    res.json(updated);
  } catch (error) {
    res.status(500).json({ error: '更新库存失败' });
  }
});

app.get('/api/stats', (_req: Request, res: Response) => {
  const stats = dataStore.getStats();
  res.json(stats);
});

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
