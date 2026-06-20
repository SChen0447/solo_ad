import express, { Request, Response } from 'express';
import cors from 'cors';
import { dataStore, TourEvent, Equipment, InventoryItem } from './dataStore';

const app = express();
const PORT = 3001;

app.use(cors());
app.use(express.json());

app.get('/api/events', (_req: Request, res: Response<TourEvent[]>) => {
  res.json(dataStore.getAllEvents());
});

app.post('/api/events', (req: Request<Omit<TourEvent, 'id' | 'colorIndex'>>, res: Response<TourEvent>) => {
  try {
    const { date, city, venue, startTime, expectedAudience, notes } = req.body;
    if (!date || !city || !venue) {
      res.status(400).json({ error: '缺少必填字段' } as any);
      return;
    }
    const event = dataStore.addEvent({
      date,
      city,
      venue,
      startTime: startTime || '20:00',
      expectedAudience: Number(expectedAudience) || 100,
      notes: notes || '',
    });
    res.status(201).json(event);
  } catch (err) {
    res.status(500).json({ error: '创建日程失败' } as any);
  }
});

app.get('/api/equipment', (_req: Request, res: Response<Equipment[]>) => {
  res.json(dataStore.getAllEquipment());
});

app.post('/api/equipment', (req: Request<Omit<Equipment, 'id'>>, res: Response<Equipment>) => {
  try {
    const { name, brand, quantity, purchaseYear, notes, imageUrl, category, usageFrequency } = req.body;
    if (!name || !brand) {
      res.status(400).json({ error: '缺少必填字段' } as any);
      return;
    }
    const equipment = dataStore.addEquipment({
      name,
      brand,
      quantity: Number(quantity) || 1,
      purchaseYear: Number(purchaseYear) || new Date().getFullYear(),
      notes: notes || '',
      imageUrl: imageUrl || '',
      category: category || 'other',
      usageFrequency: Number(usageFrequency) || 50,
    });
    res.status(201).json(equipment);
  } catch (err) {
    res.status(500).json({ error: '创建设备失败' } as any);
  }
});

app.put('/api/equipment/:id', (req: Request<{ id: string }>, res: Response<Equipment | { error: string }>) => {
  try {
    const { id } = req.params;
    const updated = dataStore.updateEquipment(id, req.body);
    if (!updated) {
      res.status(404).json({ error: '设备不存在' });
      return;
    }
    res.json(updated);
  } catch (err) {
    res.status(500).json({ error: '更新设备失败' });
  }
});

app.delete('/api/equipment/:id', (req: Request<{ id: string }>, res: Response) => {
  try {
    const { id } = req.params;
    const deleted = dataStore.deleteEquipment(id);
    if (!deleted) {
      res.status(404).json({ error: '设备不存在' });
      return;
    }
    res.status(200).json({ success: true });
  } catch (err) {
    res.status(500).json({ error: '删除设备失败' });
  }
});

app.get('/api/inventory', (_req: Request, res: Response<InventoryItem[]>) => {
  res.json(dataStore.getAllInventory());
});

app.put('/api/inventory/:id', (req: Request<{ id: string }>, res: Response<InventoryItem | { error: string }>) => {
  try {
    const { id } = req.params;
    const updated = dataStore.updateInventory(id, req.body);
    if (!updated) {
      res.status(404).json({ error: '商品不存在' });
      return;
    }
    res.json(updated);
  } catch (err) {
    res.status(500).json({ error: '更新库存失败' });
  }
});

app.post('/api/inventory', (req: Request<Omit<InventoryItem, 'id'>>, res: Response<InventoryItem>) => {
  try {
    const { name, category, unitPrice, stockQuantity, maxStock, coverUrl } = req.body;
    if (!name) {
      res.status(400).json({ error: '缺少必填字段' } as any);
      return;
    }
    const item = dataStore.addInventory({
      name,
      category: category || '其他',
      unitPrice: Number(unitPrice) || 0,
      stockQuantity: Number(stockQuantity) || 0,
      maxStock: Number(maxStock) || 100,
      coverUrl: coverUrl || '',
    });
    res.status(201).json(item);
  } catch (err) {
    res.status(500).json({ error: '创建商品失败' } as any);
  }
});

app.get('/api/stats', (_req: Request, res: Response) => {
  res.json(dataStore.getStats());
});

app.listen(PORT, () => {
  console.log(`后端服务运行在 http://localhost:${PORT}`);
});
