import { Router, Request, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import {
  Ingredient,
  Supplier,
  Order,
  HistoryEntry,
  HistoryEntryType,
  OrderItem,
  IngredientCategory,
} from '../shared/types';

const router = Router();

const ingredients = new Map<string, Ingredient>();
const suppliers = new Map<string, Supplier>();
const orders = new Map<string, Order>();
const history = new Map<string, HistoryEntry>();

function addDays(dateStr: string, days: number): string {
  const d = new Date(dateStr);
  d.setDate(d.getDate() + days);
  return d.toISOString();
}

function daysBetween(date1: string, date2: string): number {
  const d1 = new Date(date1);
  const d2 = new Date(date2);
  const diffTime = d2.getTime() - d1.getTime();
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
}

(function initMockData() {
  const now = new Date();
  const categories: IngredientCategory[] = ['coffee', 'milk', 'flour', 'sugar', 'syrup', 'other'];
  const units = ['kg', 'L', 'g', 'ml', '袋', '箱'];
  const coffeeNames = ['阿拉比卡咖啡豆', '罗布斯塔咖啡豆', '埃塞俄比亚耶加雪菲', '哥伦比亚慧兰', '曼特宁咖啡豆'];
  const milkNames = ['全脂牛奶', '脱脂牛奶', '燕麦奶', '杏仁奶'];
  const flourNames = ['高筋面粉', '低筋面粉', '全麦面粉', '玉米淀粉'];
  const sugarNames = ['白砂糖', '红糖', '糖粉', '蜂蜜'];
  const syrupNames = ['香草糖浆', '焦糖糖浆', '榛果糖浆', '摩卡糖浆'];
  const supplierNames = ['晨光食品', '绿野农场', '海韵贸易', '星源供应', '优鲜配送'];
  const contactNames = ['张三', '李四', '王五', '赵六', '钱七'];

  const allNames: Record<IngredientCategory, string[]> = {
    coffee: coffeeNames,
    milk: milkNames,
    flour: flourNames,
    sugar: sugarNames,
    syrup: syrupNames,
    other: ['可可粉', '抹茶粉', '奶油', '巧克力酱', '肉桂粉'],
  };

  for (let i = 0; i < 25; i++) {
    const cat = categories[i % categories.length];
    const nameList = allNames[cat];
    const name = nameList[i % nameList.length] + (i >= 6 ? ` #${Math.floor(i / 6) + 1}` : '');
    const unit = units[Math.floor(Math.random() * units.length)];
    const threshold = Math.floor(Math.random() * 20) + 5;
    const currentStock = i % 4 === 0 ? threshold - 2 : Math.floor(Math.random() * 80) + threshold;
    const expiryDays = i % 3 === 0 ? Math.floor(Math.random() * 7) + 1 : Math.floor(Math.random() * 60) + 10;
    const ingredientId = uuidv4();

    const ingredient: Ingredient = {
      id: ingredientId,
      name,
      category: cat,
      unit,
      currentStock,
      threshold,
      expiryDate: addDays(now.toISOString(), expiryDays),
      createdAt: addDays(now.toISOString(), -30 - Math.floor(Math.random() * 60)),
      lastInboundDate: addDays(now.toISOString(), -Math.floor(Math.random() * 10) - 1),
      lastOutboundDate: addDays(now.toISOString(), -Math.floor(Math.random() * 3)),
      dailyConsumptionRate: +(Math.random() * 3 + 0.5).toFixed(2),
    };
    ingredients.set(ingredientId, ingredient);

    const numSuppliers = 2 + Math.floor(Math.random() * 3);
    for (let j = 0; j < numSuppliers; j++) {
      const supplierId = uuidv4();
      const basePrice = cat === 'coffee' ? 80 + Math.random() * 120 : 10 + Math.random() * 50;
      const priceHistory = [];
      for (let k = 0; k < 5; k++) {
        const variation = 0.85 + Math.random() * 0.3;
        priceHistory.push({
          id: uuidv4(),
          date: addDays(now.toISOString(), -k * 7 - Math.floor(Math.random() * 3)),
          price: +(basePrice * variation).toFixed(2),
          notes: k === 0 ? '最新报价' : '',
        });
      }

      const supplier: Supplier = {
        id: supplierId,
        name: supplierNames[(i + j) % supplierNames.length],
        contactPerson: contactNames[(i + j) % contactNames.length],
        contactInfo: `138${String(Math.floor(Math.random() * 100000000)).padStart(8, '0')}`,
        ingredientId,
        priceHistory,
        isPreferred: j === 0,
        distance: `${2 + Math.floor(Math.random() * 18)}公里`,
      };
      suppliers.set(supplierId, supplier);
    }

    const numHistory = 8 + Math.floor(Math.random() * 12);
    for (let j = 0; j < numHistory; j++) {
      const types: HistoryEntryType[] = ['in', 'out', 'waste'];
      const typeWeights = [0.35, 0.55, 0.1];
      const rand = Math.random();
      let type: HistoryEntryType = 'out';
      let acc = 0;
      for (let t = 0; t < types.length; t++) {
        acc += typeWeights[t];
        if (rand < acc) {
          type = types[t];
          break;
        }
      }
      const historyEntry: HistoryEntry = {
        id: uuidv4(),
        ingredientId,
        type,
        quantity: +(type === 'in' ? Math.random() * 20 + 5 : type === 'out' ? Math.random() * 5 + 0.5 : Math.random() * 2 + 0.1).toFixed(2),
        timestamp: addDays(now.toISOString(), -j - Math.floor(Math.random() * 2)),
        operator: '店主',
        notes: type === 'waste' ? '过期报废' : '',
        supplierId: type === 'in' ? Array.from(suppliers.values()).find(s => s.ingredientId === ingredientId)?.id : undefined,
      };
      history.set(historyEntry.id, historyEntry);
    }
  }
})();

router.get('/inventory', (_req: Request, res: Response) => {
  res.json(Array.from(ingredients.values()));
});

router.get('/inventory/:id', (req: Request, res: Response) => {
  const item = ingredients.get(req.params.id);
  if (!item) {
    res.status(404).json({ error: 'Not found' });
    return;
  }
  res.json(item);
});

router.post('/inventory', (req: Request, res: Response) => {
  const body = req.body as Omit<Ingredient, 'id' | 'createdAt'>;
  const id = uuidv4();
  const newItem: Ingredient = {
    ...body,
    id,
    createdAt: new Date().toISOString(),
  };
  ingredients.set(id, newItem);
  res.status(201).json(newItem);
});

router.put('/inventory/:id', (req: Request, res: Response) => {
  const item = ingredients.get(req.params.id);
  if (!item) {
    res.status(404).json({ error: 'Not found' });
    return;
  }
  const updated = { ...item, ...req.body };
  ingredients.set(req.params.id, updated);
  res.json(updated);
});

router.delete('/inventory/:id', (req: Request, res: Response) => {
  const deleted = ingredients.delete(req.params.id);
  if (!deleted) {
    res.status(404).json({ error: 'Not found' });
    return;
  }
  res.json({ success: true });
});

router.post('/inventory/:id/stock-in', (req: Request, res: Response) => {
  const item = ingredients.get(req.params.id);
  if (!item) {
    res.status(404).json({ error: 'Not found' });
    return;
  }
  const { quantity, expiryDate, supplierId } = req.body;
  const oldStock = item.currentStock;
  item.currentStock = oldStock + Number(quantity);
  if (expiryDate) {
    item.expiryDate = expiryDate;
  }
  item.lastInboundDate = new Date().toISOString();
  ingredients.set(req.params.id, item);

  const historyEntry: HistoryEntry = {
    id: uuidv4(),
    ingredientId: req.params.id,
    type: 'in',
    quantity: Number(quantity),
    timestamp: new Date().toISOString(),
    operator: '店主',
    supplierId,
  };
  history.set(historyEntry.id, historyEntry);

  res.json(item);
});

router.post('/inventory/:id/stock-out', (req: Request, res: Response) => {
  const item = ingredients.get(req.params.id);
  if (!item) {
    res.status(404).json({ error: 'Not found' });
    return;
  }
  const { quantity } = req.body;
  item.currentStock = Math.max(0, item.currentStock - Number(quantity));
  item.lastOutboundDate = new Date().toISOString();
  ingredients.set(req.params.id, item);

  const historyEntry: HistoryEntry = {
    id: uuidv4(),
    ingredientId: req.params.id,
    type: 'out',
    quantity: Number(quantity),
    timestamp: new Date().toISOString(),
    operator: '店主',
  };
  history.set(historyEntry.id, historyEntry);

  res.json(item);
});

router.post('/inventory/:id/waste', (req: Request, res: Response) => {
  const item = ingredients.get(req.params.id);
  if (!item) {
    res.status(404).json({ error: 'Not found' });
    return;
  }
  const { quantity } = req.body;
  item.currentStock = Math.max(0, item.currentStock - Number(quantity));
  ingredients.set(req.params.id, item);

  const historyEntry: HistoryEntry = {
    id: uuidv4(),
    ingredientId: req.params.id,
    type: 'waste',
    quantity: Number(quantity),
    timestamp: new Date().toISOString(),
    operator: '店主',
    notes: '报废',
  };
  history.set(historyEntry.id, historyEntry);

  res.json(item);
});

router.get('/suppliers', (_req: Request, res: Response) => {
  res.json(Array.from(suppliers.values()));
});

router.get('/suppliers/ingredient/:ingredientId', (req: Request, res: Response) => {
  const list = Array.from(suppliers.values()).filter(
    (s) => s.ingredientId === req.params.ingredientId
  );
  res.json(list);
});

router.get('/suppliers/:id', (req: Request, res: Response) => {
  const s = suppliers.get(req.params.id);
  if (!s) {
    res.status(404).json({ error: 'Not found' });
    return;
  }
  res.json(s);
});

router.post('/suppliers', (req: Request, res: Response) => {
  const body = req.body as Omit<Supplier, 'id'>;
  const id = uuidv4();
  const newSupplier: Supplier = { ...body, id };
  suppliers.set(id, newSupplier);
  res.status(201).json(newSupplier);
});

router.put('/suppliers/:id', (req: Request, res: Response) => {
  const s = suppliers.get(req.params.id);
  if (!s) {
    res.status(404).json({ error: 'Not found' });
    return;
  }
  const updated = { ...s, ...req.body };
  suppliers.set(req.params.id, updated);
  res.json(updated);
});

router.put('/suppliers/:id/preferred', (req: Request, res: Response) => {
  const s = suppliers.get(req.params.id);
  if (!s) {
    res.status(404).json({ error: 'Not found' });
    return;
  }
  Array.from(suppliers.values())
    .filter((sp) => sp.ingredientId === s.ingredientId)
    .forEach((sp) => {
      sp.isPreferred = sp.id === req.params.id;
      suppliers.set(sp.id, sp);
    });
  res.json({ success: true });
});

router.delete('/suppliers/:id', (req: Request, res: Response) => {
  const deleted = suppliers.delete(req.params.id);
  if (!deleted) {
    res.status(404).json({ error: 'Not found' });
    return;
  }
  res.json({ success: true });
});

router.post('/suppliers/:id/quote', (req: Request, res: Response) => {
  const s = suppliers.get(req.params.id);
  if (!s) {
    res.status(404).json({ error: 'Not found' });
    return;
  }
  const { price, notes } = req.body;
  const newQuote = {
    id: uuidv4(),
    date: new Date().toISOString(),
    price: Number(price),
    notes: notes || '',
  };
  s.priceHistory.unshift(newQuote);
  suppliers.set(req.params.id, s);
  res.json(s);
});

router.get('/orders', (_req: Request, res: Response) => {
  res.json(Array.from(orders.values()));
});

router.get('/orders/:id', (req: Request, res: Response) => {
  const o = orders.get(req.params.id);
  if (!o) {
    res.status(404).json({ error: 'Not found' });
    return;
  }
  res.json(o);
});

router.post('/orders', (req: Request, res: Response) => {
  const { items } = req.body as { items: OrderItem[] };
  const totalAmount = items.reduce((sum, it) => sum + it.quantity * it.unitPrice, 0);
  const order: Order = {
    id: uuidv4(),
    items,
    createdAt: new Date().toISOString(),
    status: 'pending',
    totalAmount: +totalAmount.toFixed(2),
  };
  orders.set(order.id, order);
  res.status(201).json(order);
});

router.put('/orders/:id', (req: Request, res: Response) => {
  const o = orders.get(req.params.id);
  if (!o) {
    res.status(404).json({ error: 'Not found' });
    return;
  }
  const updated = { ...o, ...req.body };
  orders.set(req.params.id, updated);
  res.json(updated);
});

router.get('/history/:ingredientId', (req: Request, res: Response) => {
  const list = Array.from(history.values())
    .filter((h) => h.ingredientId === req.params.ingredientId)
    .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
  res.json(list);
});

router.get('/warnings', (_req: Request, res: Response) => {
  const now = new Date().toISOString();
  const warnings = Array.from(ingredients.values())
    .map((ing) => {
      const daysLeft = daysBetween(now, ing.expiryDate);
      const belowThreshold = ing.currentStock < ing.threshold;
      const expiringSoon = daysLeft <= 7;
      if (!belowThreshold && !expiringSoon) return null;

      const rate = ing.dailyConsumptionRate || 1;
      const neededDays = Math.max(7, 30 - daysLeft);
      const recommended = Math.ceil(neededDays * rate + ing.threshold - ing.currentStock);

      return {
        ingredientId: ing.id,
        ingredientName: ing.name,
        daysLeft,
        belowThreshold,
        expiringSoon,
        recommendedQuantity: Math.max(ing.threshold, recommended),
        unit: ing.unit,
      };
    })
    .filter(Boolean);
  res.json(warnings);
});

router.get('/export', (_req: Request, res: Response) => {
  const rows = Array.from(ingredients.values()).map((ing) => {
    const ingSuppliers = Array.from(suppliers.values()).filter(
      (s) => s.ingredientId === ing.id
    );
    const bestPrice = ingSuppliers.length
      ? Math.min(...ingSuppliers.map((s) => s.priceHistory[0]?.price || Infinity))
      : '-';
    const statusLabel = (() => {
      const days = daysBetween(new Date().toISOString(), ing.expiryDate);
      if (days < 0) return '已过期';
      if (days <= 7) return `${days}天后过期`;
      return '正常';
    })();

    return {
      name: ing.name,
      category: ing.category,
      stock: `${ing.currentStock}${ing.unit}`,
      bestPrice: bestPrice === '-' ? '-' : `¥${bestPrice}`,
      lastInbound: ing.lastInboundDate?.split('T')[0] || '-',
      lastOutbound: ing.lastOutboundDate?.split('T')[0] || '-',
      status: statusLabel,
    };
  });

  const headers = ['原材料名称', '类别', '当前库存', '供应商最优价', '最近入库', '最近出库', '保质期状态'];
  const csv = [
    headers.join(','),
    ...rows.map((r) =>
      Object.values(r)
        .map((v) => `"${String(v).replace(/"/g, '""')}"`)
        .join(',')
    ),
  ].join('\n');

  res.setHeader('Content-Type', 'text/csv; charset=utf-8');
  res.setHeader('Content-Disposition', 'attachment; filename="inventory_export.csv"');
  res.send('\uFEFF' + csv);
});

export default router;
