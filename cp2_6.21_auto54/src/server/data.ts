import { v4 as uuidv4 } from 'uuid';

export type OrderStatus = 'pending_payment' | 'paid' | 'delivering' | 'completed';
export type DeliveryZone = 'A' | 'B' | 'C';

export interface OrderItem {
  productName: string;
  quantity: number;
  unitPrice: number;
}

export interface Order {
  id: string;
  items: OrderItem[];
  totalAmount: number;
  contactName: string;
  contactPhone: string;
  address: string;
  zone: DeliveryZone;
  status: OrderStatus;
  createdAt: string;
  remark?: string;
  deliveryOrder?: number;
}

export interface DeliveryTask {
  id: string;
  orderId: string;
  zone: DeliveryZone;
  estimatedTime: number;
  deliveryOrder: number;
  status: 'pending' | 'in_progress' | 'completed';
}

let orders: Order[] = [];
let deliveryTasks: DeliveryTask[] = [];

const zoneColors: Record<DeliveryZone, string> = {
  A: '#DBEAFE',
  B: '#DCFCE7',
  C: '#FEF9C3',
};

function assignZone(address: string): DeliveryZone {
  if (address.includes('阳光') || address.includes('新城') || address.includes('花园')) return 'A';
  if (address.includes('幸福') || address.includes('和平') || address.includes('绿洲')) return 'B';
  return 'C';
}

function initTestData() {
  const now = new Date();
  const testOrders: Order[] = [
    {
      id: uuidv4(),
      items: [{ productName: '有机西红柿', quantity: 5, unitPrice: 6.5 }],
      totalAmount: 32.5,
      contactName: '张阿姨',
      contactPhone: '138****1234',
      address: '阳光花园小区3号楼2单元',
      zone: 'A',
      status: 'completed',
      createdAt: new Date(now.getTime() - 86400000 * 2).toISOString(),
      remark: '请下午3点后送达',
      deliveryOrder: 1,
    },
    {
      id: uuidv4(),
      items: [
        { productName: '新鲜青菜', quantity: 3, unitPrice: 4 },
        { productName: '土鸡蛋', quantity: 10, unitPrice: 2 },
      ],
      totalAmount: 32,
      contactName: '李叔叔',
      contactPhone: '139****5678',
      address: '幸福家园小区1号楼',
      zone: 'B',
      status: 'completed',
      createdAt: new Date(now.getTime() - 86400000).toISOString(),
      deliveryOrder: 1,
    },
    {
      id: uuidv4(),
      items: [{ productName: '农家土豆', quantity: 8, unitPrice: 3.5 }],
      totalAmount: 28,
      contactName: '王大姐',
      contactPhone: '136****9012',
      address: '新城国际5号楼',
      zone: 'A',
      status: 'delivering',
      createdAt: new Date(now.getTime() - 3600000 * 5).toISOString(),
      remark: '放在门卫即可',
      deliveryOrder: 1,
    },
    {
      id: uuidv4(),
      items: [
        { productName: '有机黄瓜', quantity: 4, unitPrice: 5 },
        { productName: '新鲜玉米', quantity: 6, unitPrice: 3 },
      ],
      totalAmount: 38,
      contactName: '陈阿姨',
      contactPhone: '135****3456',
      address: '和平小区2号楼3单元',
      zone: 'B',
      status: 'delivering',
      createdAt: new Date(now.getTime() - 3600000 * 3).toISOString(),
      deliveryOrder: 2,
    },
    {
      id: uuidv4(),
      items: [{ productName: '散养土鸡', quantity: 1, unitPrice: 128 }],
      totalAmount: 128,
      contactName: '刘先生',
      contactPhone: '137****7890',
      address: '绿洲花园别墅区',
      zone: 'B',
      status: 'paid',
      createdAt: new Date(now.getTime() - 3600000 * 2).toISOString(),
      remark: '请务必新鲜',
      deliveryOrder: 3,
    },
    {
      id: uuidv4(),
      items: [{ productName: '新鲜草莓', quantity: 2, unitPrice: 35 }],
      totalAmount: 70,
      contactName: '赵女士',
      contactPhone: '138****2345',
      address: '金桂苑小区8号楼',
      zone: 'C',
      status: 'paid',
      createdAt: new Date(now.getTime() - 3600000).toISOString(),
      deliveryOrder: 1,
    },
    {
      id: uuidv4(),
      items: [
        { productName: '有机胡萝卜', quantity: 3, unitPrice: 4.5 },
        { productName: '农家白菜', quantity: 2, unitPrice: 6 },
      ],
      totalAmount: 25.5,
      contactName: '孙奶奶',
      contactPhone: '136****6789',
      address: '银杏小区5号楼',
      zone: 'C',
      status: 'paid',
      createdAt: new Date(now.getTime() - 1800000).toISOString(),
      remark: '年纪大了麻烦送上门',
      deliveryOrder: 2,
    },
    {
      id: uuidv4(),
      items: [{ productName: '新鲜葡萄', quantity: 3, unitPrice: 18 }],
      totalAmount: 54,
      contactName: '周大哥',
      contactPhone: '139****0123',
      address: '紫薇花园2号楼',
      zone: 'C',
      status: 'pending_payment',
      createdAt: new Date(now.getTime() - 600000).toISOString(),
    },
  ];

  orders = testOrders;

  deliveryTasks = orders
    .filter((o) => o.status === 'paid' || o.status === 'delivering')
    .map((o, idx) => ({
      id: uuidv4(),
      orderId: o.id,
      zone: o.zone,
      estimatedTime: 15 + (o.deliveryOrder || idx + 1) * 10,
      deliveryOrder: o.deliveryOrder || idx + 1,
      status: o.status === 'delivering' ? 'in_progress' : 'pending',
    }));
}

initTestData();

export function getZoneColor(zone: DeliveryZone): string {
  return zoneColors[zone];
}

export function getAllOrders(): Order[] {
  return [...orders];
}

export function getOrderById(id: string): Order | undefined {
  return orders.find((o) => o.id === id);
}

export function getOrdersByStatus(status: OrderStatus): Order[] {
  return orders.filter((o) => o.status === status);
}

export function createOrder(data: Omit<Order, 'id' | 'createdAt' | 'status' | 'zone'>): Order {
  const totalAmount = data.items.reduce((sum, item) => sum + item.quantity * item.unitPrice, 0);
  const newOrder: Order = {
    ...data,
    id: uuidv4(),
    zone: assignZone(data.address),
    status: 'pending_payment',
    createdAt: new Date().toISOString(),
    totalAmount,
  };
  orders.push(newOrder);
  return newOrder;
}

export function updateOrderStatus(id: string, status: OrderStatus): Order | undefined {
  const order = orders.find((o) => o.id === id);
  if (!order) return undefined;

  const statusFlow: OrderStatus[] = ['pending_payment', 'paid', 'delivering', 'completed'];
  const currentIdx = statusFlow.indexOf(order.status);
  const newIdx = statusFlow.indexOf(status);

  if (newIdx !== currentIdx + 1) {
    return undefined;
  }

  order.status = status;

  if (status === 'paid') {
    const zoneOrders = orders.filter((o) => o.zone === order.zone && (o.status === 'paid' || o.status === 'delivering'));
    order.deliveryOrder = zoneOrders.length;
    deliveryTasks.push({
      id: uuidv4(),
      orderId: order.id,
      zone: order.zone,
      estimatedTime: 15 + zoneOrders.length * 10,
      deliveryOrder: zoneOrders.length,
      status: 'pending',
    });
  }

  if (status === 'delivering') {
    const task = deliveryTasks.find((t) => t.orderId === id);
    if (task) task.status = 'in_progress';
  }

  if (status === 'completed') {
    const task = deliveryTasks.find((t) => t.orderId === id);
    if (task) task.status = 'completed';
  }

  return order;
}

export function getAllDeliveryTasks(): DeliveryTask[] {
  return [...deliveryTasks];
}

export function getDeliveryTasksByZone(zone: DeliveryZone): DeliveryTask[] {
  return deliveryTasks.filter((t) => t.zone === zone);
}

export function reorderDelivery(zone: DeliveryZone, orderId: string, newPosition: number): DeliveryTask[] {
  const zoneTasks = deliveryTasks
    .filter((t) => t.zone === zone && t.status !== 'completed')
    .sort((a, b) => a.deliveryOrder - b.deliveryOrder);

  const currentIdx = zoneTasks.findIndex((t) => t.orderId === orderId);
  if (currentIdx === -1) return zoneTasks;

  const [moved] = zoneTasks.splice(currentIdx, 1);
  zoneTasks.splice(newPosition, 0, moved);

  zoneTasks.forEach((task, idx) => {
    task.deliveryOrder = idx + 1;
    task.estimatedTime = 15 + (idx + 1) * 10;
    const order = orders.find((o) => o.id === task.orderId);
    if (order) order.deliveryOrder = idx + 1;
  });

  return deliveryTasks.filter((t) => t.zone === zone);
}

export function getStats() {
  const totalOrders = orders.length;
  const totalAmount = orders.reduce((sum, o) => sum + o.totalAmount, 0);
  const completedOrders = orders.filter((o) => o.status === 'completed').length;
  const deliveryRate = totalOrders > 0 ? Math.round((completedOrders / totalOrders) * 100) : 0;

  return {
    totalOrders,
    totalAmount,
    deliveryRate,
  };
}
