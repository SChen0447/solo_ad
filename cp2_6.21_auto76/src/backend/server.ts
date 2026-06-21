import express from 'express';
import cors from 'cors';
import { v4 as uuidv4 } from 'uuid';
import type {
  Order,
  Material,
  WorkOrder,
  Shipment,
  OrderStatus,
  WorkOrderStatus,
  WorkOrderPriority,
  TrendData,
} from '../common/types';

const app = express();
const PORT = 3001;

app.use(cors());
app.use(express.json());

let orders: Order[] = [];
let materials: Material[] = [];
let workOrders: WorkOrder[] = [];
let shipments: Shipment[] = [];

const sampleCustomers = ['张氏工坊', '李记手工', '王家小铺', '陈阿姨手作', '刘师傅', '周大娘', '吴老板', '郑工坊', '孙记', '钱家'];
const sampleProducts = ['手工皮包', '陶瓷杯具', '木质摆件', '编织篮子', '布艺靠枕', '皮革钱包', '木制餐具', '手工皂', '蜡烛套装', '首饰盒'];
const sampleSuppliers = ['华东材料行', '华南建材', '华北原料厂', '西部物资', '中原供应链', '东海材料铺'];
const sampleAddresses = [
  '北京市朝阳区建国路88号',
  '上海市浦东新区陆家嘴环路100号',
  '广州市天河区珠江新城花城大道',
  '深圳市南山区科技园南路',
  '杭州市西湖区文三路',
  '成都市锦江区春熙路',
  '南京市鼓楼区中山路',
  '武汉市江汉区解放大道',
];
const materialNames = [
  { name: '头层牛皮', category: '皮革' },
  { name: '高领土', category: '陶瓷原料' },
  { name: '胡桃木方', category: '木材' },
  { name: '藤条', category: '编织材料' },
  { name: '亚麻布料', category: '布料' },
  { name: '黄铜配件', category: '五金' },
  { name: '食用级橄榄油', category: '手工皂原料' },
  { name: '大豆蜡', category: '蜡烛原料' },
  { name: '纯银线', category: '首饰材料' },
  { name: '水性木蜡油', category: '涂料' },
];

function generateMockData() {
  const now = new Date();

  for (let i = 0; i < 10; i++) {
    const mat = materialNames[i];
    materials.push({
      id: uuidv4(),
      name: mat.name,
      category: mat.category,
      currentStock: Math.floor(Math.random() * 50) + 5,
      safetyStock: 20,
      unit: 'kg',
      supplier: sampleSuppliers[i % sampleSuppliers.length],
      lastRestock: new Date(now.getTime() - Math.random() * 7 * 24 * 60 * 60 * 1000).toISOString(),
    });
  }

  const statuses: OrderStatus[] = ['pending', 'pending', 'processing', 'processing', 'processing', 'shipping', 'shipping', 'completed', 'completed', 'completed'];

  for (let i = 0; i < 10; i++) {
    const status = statuses[i];
    const customer = sampleCustomers[i % sampleCustomers.length];
    const product = sampleProducts[i % sampleProducts.length];
    const quantity = Math.floor(Math.random() * 20) + 1;
    const amount = quantity * (Math.floor(Math.random() * 200) + 50);
    const createdAt = new Date(now.getTime() - (i * 12 + Math.random() * 12) * 60 * 60 * 1000);
    const deadline = new Date(createdAt.getTime() + (7 + Math.random() * 7) * 24 * 60 * 60 * 1000);

    orders.push({
      id: uuidv4(),
      customer,
      product,
      quantity,
      amount,
      deadline: deadline.toISOString(),
      status,
      createdAt: createdAt.toISOString(),
    });
  }

  const processingOrders = orders.filter((o) => o.status === 'processing');
  for (let i = 0; i < Math.min(5, processingOrders.length); i++) {
    const order = processingOrders[i];
    const startTime = new Date(order.createdAt);
    const estimatedHours = order.quantity;
    const endTime = new Date(startTime.getTime() + estimatedHours * 60 * 60 * 1000);
    const priority: WorkOrderPriority = order.amount > 1000 ? 'high' : 'normal';

    workOrders.push({
      id: uuidv4(),
      orderId: order.id,
      startTime: startTime.toISOString(),
      estimatedEndTime: endTime.toISOString(),
      priority,
      status: i === 0 ? 'completed' : 'inProgress',
      logs: [
        `工单创建于 ${startTime.toLocaleString('zh-CN')}`,
        `优先级: ${priority === 'high' ? '高' : '普通'}`,
        `预计耗时: ${estimatedHours} 小时`,
      ],
    });
  }

  const shippingOrders = orders.filter((o) => o.status === 'shipping');
  for (let i = 0; i < Math.min(3, shippingOrders.length); i++) {
    const order = shippingOrders[i];
    const shipDate = new Date(now.getTime() + (i + 1) * 24 * 60 * 60 * 1000);

    shipments.push({
      id: uuidv4(),
      orderId: order.id,
      orderNumber: `WO-${order.id.slice(0, 8).toUpperCase()}`,
      address: sampleAddresses[i % sampleAddresses.length],
      shipDate: shipDate.toISOString(),
      completed: false,
    });
  }
}

function checkMaterialsAvailable(orderQuantity: number): boolean {
  const lowStockCount = materials.filter((m) => m.currentStock < m.safetyStock).length;
  const totalStock = materials.reduce((sum, m) => sum + m.currentStock, 0);
  return lowStockCount === 0 && totalStock >= orderQuantity * 3;
}

function scheduleWorkOrders() {
  workOrders.forEach((wo) => {
    if (wo.status === 'completed') return;

    const order = orders.find((o) => o.id === wo.orderId);
    if (!order) return;

    const materialsAvailable = checkMaterialsAvailable(order.quantity);
    const newStatus: WorkOrderStatus = materialsAvailable ? 'inProgress' : 'waiting';

    if (wo.status !== newStatus) {
      wo.status = newStatus;
      if (newStatus === 'waiting') {
        const lowMats = materials.filter((m) => m.currentStock < m.safetyStock).map((m) => m.name);
        wo.logs.push(`排程更新: 物料不足，等待补货 - ${new Date().toLocaleString('zh-CN')}`);
        if (lowMats.length > 0) {
          wo.logs.push(`库存不足物料: ${lowMats.join(', ')}`);
        }
      } else {
        wo.logs.push(`排程更新: 物料充足，开始生产 - ${new Date().toLocaleString('zh-CN')}`);
      }
    }
  });
}

generateMockData();
scheduleWorkOrders();

function createWorkOrderForOrder(order: Order): WorkOrder {
  const startTime = new Date();
  const estimatedHours = order.quantity;
  const endTime = new Date(startTime.getTime() + estimatedHours * 60 * 60 * 1000);
  const priority: WorkOrderPriority = order.amount > 1000 ? 'high' : 'normal';
  const materialsAvailable = checkMaterialsAvailable(order.quantity);
  const status: WorkOrderStatus = materialsAvailable ? 'inProgress' : 'waiting';

  const logs = [
    `工单创建于 ${startTime.toLocaleString('zh-CN')}`,
    `优先级: ${priority === 'high' ? '高' : '普通'}`,
    `预计耗时: ${estimatedHours} 小时`,
    `物料可用性检查: ${materialsAvailable ? '通过' : '未通过'}`,
  ];

  if (!materialsAvailable) {
    const lowMats = materials.filter((m) => m.currentStock < m.safetyStock).map((m) => m.name);
    if (lowMats.length > 0) {
      logs.push(`库存不足物料: ${lowMats.join(', ')}`);
    }
    logs.push('工单状态: 等待物料补货');
  } else {
    logs.push('工单状态: 物料充足，已开始生产');
  }

  return {
    id: uuidv4(),
    orderId: order.id,
    startTime: startTime.toISOString(),
    estimatedEndTime: endTime.toISOString(),
    priority,
    status,
    logs,
  };
}

function createShipmentForOrder(order: Order): Shipment {
  const shipDate = new Date();
  shipDate.setDate(shipDate.getDate() + 2);

  return {
    id: uuidv4(),
    orderId: order.id,
    orderNumber: `WO-${order.id.slice(0, 8).toUpperCase()}`,
    address: sampleAddresses[Math.floor(Math.random() * sampleAddresses.length)],
    shipDate: shipDate.toISOString(),
    completed: false,
  };
}

function updateWaitingWorkOrders() {
  workOrders.forEach((wo) => {
    if (wo.status === 'waiting') {
      const order = orders.find((o) => o.id === wo.orderId);
      if (order && checkMaterialsAvailable(order.quantity)) {
        wo.status = 'inProgress';
        wo.logs.push(`物料已补充，开始生产 - ${new Date().toLocaleString('zh-CN')}`);
      }
    }
  });
}

function getTrendData(): TrendData[] {
  const result: TrendData[] = [];
  const now = new Date();

  for (let i = 6; i >= 0; i--) {
    const date = new Date(now);
    date.setDate(date.getDate() - i);
    const dateStr = date.toISOString().split('T')[0];

    const dayStart = new Date(date);
    dayStart.setHours(0, 0, 0, 0);
    const dayEnd = new Date(date);
    dayEnd.setHours(23, 59, 59, 999);

    const dayOrders = orders.filter(
      (o) => new Date(o.createdAt) >= dayStart && new Date(o.createdAt) <= dayEnd
    ).length;

    const completedOrders = orders.filter((o) => {
      if (o.status !== 'completed') return false;
      const createdDate = new Date(o.createdAt);
      return createdDate >= dayStart && createdDate <= dayEnd;
    }).length;

    result.push({
      date: `${date.getMonth() + 1}/${date.getDate()}`,
      orders: dayOrders + Math.floor(Math.random() * 3),
      completed: completedOrders + Math.floor(Math.random() * 2),
    });
  }

  return result;
}

app.get('/api/orders', (_req, res) => {
  res.json(orders);
});

app.post('/api/orders', (req, res) => {
  const { customer, product, quantity, amount, deadline } = req.body;

  const newOrder: Order = {
    id: uuidv4(),
    customer,
    product,
    quantity: Number(quantity),
    amount: Number(amount),
    deadline,
    status: 'pending',
    createdAt: new Date().toISOString(),
  };

  orders.unshift(newOrder);
  res.status(201).json(newOrder);
});

app.put('/api/orders/:id', (req, res) => {
  const { id } = req.params;
  const { status } = req.body as { status: OrderStatus };

  const orderIndex = orders.findIndex((o) => o.id === id);
  if (orderIndex === -1) {
    return res.status(404).json({ error: '订单不存在' });
  }

  const oldStatus = orders[orderIndex].status;
  orders[orderIndex].status = status;

  if (oldStatus !== 'processing' && status === 'processing') {
    const existingWO = workOrders.find((wo) => wo.orderId === id);
    if (!existingWO) {
      const newWO = createWorkOrderForOrder(orders[orderIndex]);
      workOrders.unshift(newWO);
    }
  }

  if (oldStatus !== 'shipping' && status === 'shipping') {
    const existingShip = shipments.find((s) => s.orderId === id);
    if (!existingShip) {
      const newShip = createShipmentForOrder(orders[orderIndex]);
      shipments.unshift(newShip);
    }
  }

  res.json(orders[orderIndex]);
});

app.get('/api/materials', (_req, res) => {
  res.json(materials);
});

app.put('/api/materials/:id/purchase', (req, res) => {
  const { id } = req.params;
  const { quantity = 1 } = req.body;

  const material = materials.find((m) => m.id === id);
  if (!material) {
    return res.status(404).json({ error: '物料不存在' });
  }

  material.currentStock += Number(quantity);
  material.lastRestock = new Date().toISOString();

  updateWaitingWorkOrders();

  res.json(material);
});

app.get('/api/workorders', (_req, res) => {
  res.json(workOrders);
});

app.get('/api/shipments', (_req, res) => {
  res.json(shipments);
});

app.put('/api/shipments/:id/complete', (req, res) => {
  const { id } = req.params;

  const shipment = shipments.find((s) => s.id === id);
  if (!shipment) {
    return res.status(404).json({ error: '发货记录不存在' });
  }

  shipment.completed = true;

  const order = orders.find((o) => o.id === shipment.orderId);
  if (order) {
    order.status = 'completed';
  }

  res.json(shipment);
});

app.get('/api/trends', (_req, res) => {
  res.json(getTrendData());
});

app.listen(PORT, () => {
  console.log(`后端服务器运行在 http://localhost:${PORT}`);
});
