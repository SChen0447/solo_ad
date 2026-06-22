/**
 * server.ts — Express 后端服务（Node.js + TypeScript）
 *
 * ═══════════════════════════════════════════════════════════════
 * 服务端口：3000
 * 中间件：cors（跨域）+ express.json（解析 JSON body）
 * 数据存储：全部在内存中（Map 对象），进程重启后重置
 *
 * ═══════════════════════════════════════════════════════════════
 * 内存数据结构：
 *   products    : Map<productId, Product>   — 商品目录（初始10种）
 *   orders      : Map<orderId, Order>       — 所有提交的订单
 *   pickups     : Map<`${pid}_${uid}`, bool> — 取货状态标记
 *   pickupTimes : Map<`${pid}_${uid}`, ISO>  — 取货时间戳
 *   users       : User[]                     — 预设3用户（张三/李四/王五）
 *
 * ═══════════════════════════════════════════════════════════════
 * RESTful API 总览（被前端 App.tsx fetch 调用）：
 *
 *   GET    /api/users          → 返回预设用户列表
 *   GET    /api/products       → 返回商品列表
 *   POST   /api/products       → 新增商品（管理员）
 *   PUT    /api/products/:id   → 调整商品库存/价格/名称
 *   GET    /api/orders         → 订单列表，支持 ?userId=xxx 过滤
 *   POST   /api/orders         → 提交订单（购物车 → 订单）
 *   PUT    /api/orders/:id     → 修改订单项数量
 *   DELETE /api/orders/:id     → 取消订单（status=cancelled 软删除）
 *   GET    /api/merged-orders  → 按商品ID合并订单（核心聚合逻辑）
 *   POST   /api/pickup         → 按 (productId, userId) 粒度标记取货
 *   GET    /api/stats          → 统计数据（订单数/种类/金额/取货率）
 *
 * ═══════════════════════════════════════════════════════════════
 * 核心算法：订单合并逻辑
 *   for 每个 active 订单
 *     for 每个 item
 *       map[productId].totalQuantity += item.quantity
 *       map[productId].totalAmount  += item.subtotal
 *       聚合各 userBreakdown 明细（含取货状态）
 *   → 返回 MergedOrderItem[]
 *
 * ═══════════════════════════════════════════════════════════════
 * 被调用关系：
 *   启动方式：tsx watch src/server.ts （package.json dev:server 脚本）
 *   被 Vite 代理：vite.config.js 中 /api → http://localhost:3000
 */

import express from 'express';
import cors from 'cors';
import { v4 as uuidv4 } from 'uuid';

// ───── 类型（与 types.ts 同构，避免运行时循环依赖） ─────
interface Product {
  id: string; name: string; price: number; stock: number; category: string;
}
interface OrderItem {
  productId: string; productName: string; quantity: number;
  unitPrice: number; subtotal: number;
}
interface Order {
  id: string; userId: string; userName: string; items: OrderItem[];
  totalAmount: number; createdAt: string; status: 'active' | 'cancelled';
}
interface User { id: string; name: string; }
interface UserBreakdownItem {
  userId: string; userName: string; quantity: number;
  picked: boolean; pickedAt?: string;
}
interface MergedOrderItem {
  productId: string; productName: string;
  totalQuantity: number; totalAmount: number;
  userBreakdown: UserBreakdownItem[];
}

// ───── Express 实例化与中间件 ─────
const app = express();
app.use(cors());                      // 允许所有来源跨域
app.use(express.json());              // 自动解析 application/json

// ───── 内存数据初始化 ─────
const products: Map<string, Product> = new Map();
const orders: Map<string, Order> = new Map();
const pickups: Map<string, boolean> = new Map();
const pickupTimes: Map<string, string> = new Map();

const users: User[] = [
  { id: 'user-1', name: '张三' },
  { id: 'user-2', name: '李四' },
  { id: 'user-3', name: '王五' },
];

// 预置 10 种商品（水果 / 零食 / 日用品 / 食品）
const initialProducts: Product[] = [
  { id: 'p-1', name: '红富士苹果', price: 6.8, stock: 50, category: '水果' },
  { id: 'p-2', name: '海南香蕉', price: 4.5, stock: 3, category: '水果' },
  { id: 'p-3', name: '进口车厘子', price: 68.0, stock: 10, category: '水果' },
  { id: 'p-4', name: '乐事薯片', price: 8.9, stock: 30, category: '零食' },
  { id: 'p-5', name: '每日坚果', price: 29.9, stock: 4, category: '零食' },
  { id: 'p-6', name: '卷纸(10卷)', price: 25.0, stock: 20, category: '日用品' },
  { id: 'p-7', name: '洗衣液 2L', price: 35.8, stock: 15, category: '日用品' },
  { id: 'p-8', name: '土鸡蛋(30枚)', price: 38.0, stock: 12, category: '食品' },
  { id: 'p-9', name: '鲜牛奶 1L', price: 15.9, stock: 8, category: '食品' },
  { id: 'p-10', name: '全麦面包', price: 12.0, stock: 25, category: '食品' },
];
initialProducts.forEach((p) => products.set(p.id, p));

// =====================================================
//  路由：商品相关
// =====================================================

/** GET /api/products → 返回商品目录数组 */
app.get('/api/products', (_req, res) => {
  res.json(Array.from(products.values()));
});

/** POST /api/products → 管理员新增商品 */
app.post('/api/products', (req, res) => {
  const { name, price, stock, category } = req.body;
  if (!name || price == null || stock == null || !category) {
    res.status(400).json({ error: '缺少必填字段 name/price/stock/category' });
    return;
  }
  const id = uuidv4();
  const product: Product = {
    id, name, price: Number(price), stock: Number(stock), category,
  };
  products.set(id, product);
  res.status(201).json(product);
});

/** PUT /api/products/:id → 修改商品库存/价格/名称 */
app.put('/api/products/:id', (req, res) => {
  const { id } = req.params;
  const product = products.get(id);
  if (!product) {
    res.status(404).json({ error: '商品不存在' });
    return;
  }
  if (req.body.stock != null) product.stock = Number(req.body.stock);
  if (req.body.name) product.name = req.body.name;
  if (req.body.price != null) product.price = Number(req.body.price);
  products.set(id, product);
  res.json(product);
});

// =====================================================
//  路由：用户相关
// =====================================================

/** GET /api/users → 返回预设用户列表 */
app.get('/api/users', (_req, res) => {
  res.json(users);
});

// =====================================================
//  路由：订单相关
// =====================================================

/** GET /api/orders?userId=xxx → 订单列表，支持按用户过滤 */
app.get('/api/orders', (req, res) => {
  const { userId } = req.query;
  const arr = Array.from(orders.values()).filter((o) => o.status === 'active');
  if (userId) res.json(arr.filter((o) => o.userId === userId));
  else res.json(arr);
});

/** POST /api/orders → 提交订单（购物车 → 订单记录） */
app.post('/api/orders', (req, res) => {
  const { userId, userName, items: rawItems } = req.body;
  if (!userId || !userName || !rawItems || !Array.isArray(rawItems)) {
    res.status(400).json({ error: '缺少必填字段 userId/userName/items' });
    return;
  }
  const orderItems: OrderItem[] = [];
  let total = 0;
  for (const ri of rawItems) {
    const product = products.get(ri.productId);
    if (!product) continue;
    const qty = Number(ri.quantity);
    if (qty <= 0) continue;
    const subtotal = product.price * qty;
    orderItems.push({
      productId: product.id, productName: product.name,
      quantity: qty, unitPrice: product.price, subtotal,
    });
    total += subtotal;
  }
  if (orderItems.length === 0) {
    res.status(400).json({ error: '订单条目为空或无效' });
    return;
  }
  const order: Order = {
    id: uuidv4(), userId, userName, items: orderItems,
    totalAmount: Math.round(total * 100) / 100,
    createdAt: new Date().toISOString(), status: 'active',
  };
  orders.set(order.id, order);
  res.status(201).json(order);
});

/** PUT /api/orders/:id → 修改订单项数量 */
app.put('/api/orders/:id', (req, res) => {
  const { id } = req.params;
  const order = orders.get(id);
  if (!order) {
    res.status(404).json({ error: '订单不存在' });
    return;
  }
  const { items: rawItems } = req.body;
  if (!rawItems || !Array.isArray(rawItems)) {
    res.status(400).json({ error: '缺少 items 数组' });
    return;
  }
  const orderItems: OrderItem[] = [];
  let total = 0;
  for (const ri of rawItems) {
    const product = products.get(ri.productId);
    if (!product) continue;
    const qty = Math.max(1, Number(ri.quantity));
    const subtotal = product.price * qty;
    orderItems.push({
      productId: product.id, productName: product.name,
      quantity: qty, unitPrice: product.price, subtotal,
    });
    total += subtotal;
  }
  order.items = orderItems;
  order.totalAmount = Math.round(total * 100) / 100;
  orders.set(id, order);
  res.json(order);
});

/** DELETE /api/orders/:id → 取消订单（软删除，status=cancelled） */
app.delete('/api/orders/:id', (req, res) => {
  const { id } = req.params;
  const order = orders.get(id);
  if (!order) {
    res.status(404).json({ error: '订单不存在' });
    return;
  }
  order.status = 'cancelled';
  orders.set(id, order);
  res.json({ success: true });
});

// =====================================================
//  路由：合并订单（核心聚合）
// =====================================================

/** GET /api/merged-orders → 按商品聚合所有订单 + 取货状态 */
app.get('/api/merged-orders', (_req, res) => {
  const merged = new Map<string, MergedOrderItem>();
  for (const order of orders.values()) {
    if (order.status !== 'active') continue;
    for (const item of order.items) {
      // 首次出现该商品 → 初始化聚合条目
      if (!merged.has(item.productId)) {
        merged.set(item.productId, {
          productId: item.productId,
          productName: item.productName,
          totalQuantity: 0,
          totalAmount: 0,
          userBreakdown: [],
        });
      }
      const m = merged.get(item.productId)!;
      m.totalQuantity += item.quantity;
      m.totalAmount += item.subtotal;
      // 拼接用户维度明细（同一用户多次下单会合并数量）
      const pk = `${item.productId}_${order.userId}`;
      const existing = m.userBreakdown.find((ub) => ub.userId === order.userId);
      if (existing) {
        existing.quantity += item.quantity;
      } else {
        m.userBreakdown.push({
          userId: order.userId,
          userName: order.userName,
          quantity: item.quantity,
          picked: pickups.get(pk) ?? false,
          pickedAt: pickupTimes.get(pk),
        });
      }
    }
  }
  // 保留两位小数
  const result: MergedOrderItem[] = Array.from(merged.values()).map((m) => ({
    ...m,
    totalAmount: Math.round(m.totalAmount * 100) / 100,
  }));
  res.json(result);
});

// =====================================================
//  路由：取货标记
// =====================================================

/** POST /api/pickup → 按 (商品, 用户) 粒度标记取货状态 */
app.post('/api/pickup', (req, res) => {
  const { productId, userId, picked } = req.body;
  if (!productId || !userId || picked == null) {
    res.status(400).json({ error: '缺少必填字段 productId/userId/picked' });
    return;
  }
  const key = `${productId}_${userId}`;
  pickups.set(key, picked);
  if (picked) {
    pickupTimes.set(key, new Date().toISOString());
  } else {
    pickupTimes.delete(key);
  }
  res.json({ success: true, pickedAt: pickupTimes.get(key) || null });
});

// =====================================================
//  路由：统计概览
// =====================================================

/** GET /api/stats → 返回统计数据（订单数/种类/金额/取货率） */
app.get('/api/stats', (_req, res) => {
  const activeOrders = Array.from(orders.values()).filter((o) => o.status === 'active');
  const uniqueProducts = new Set<string>();
  let totalAmount = 0;
  let totalPicked = 0;
  let totalBreakdown = 0;

  // 计算合并明细用于统计取货率
  const merged = new Map<string, MergedOrderItem>();
  for (const order of activeOrders) {
    totalAmount += order.totalAmount;
    for (const item of order.items) {
      uniqueProducts.add(item.productId);
      if (!merged.has(item.productId)) {
        merged.set(item.productId, {
          productId: item.productId, productName: item.productName,
          totalQuantity: 0, totalAmount: 0, userBreakdown: [],
        });
      }
      const m = merged.get(item.productId)!;
      m.totalQuantity += item.quantity;
      m.totalAmount += item.subtotal;
      const pk = `${item.productId}_${order.userId}`;
      const existing = m.userBreakdown.find((ub) => ub.userId === order.userId);
      if (existing) {
        existing.quantity += item.quantity;
      } else {
        m.userBreakdown.push({
          userId: order.userId, userName: order.userName, quantity: item.quantity,
          picked: pickups.get(pk) ?? false, pickedAt: pickupTimes.get(pk),
        });
      }
    }
  }
  for (const m of merged.values()) {
    for (const ub of m.userBreakdown) {
      totalBreakdown++;
      if (ub.picked) totalPicked++;
    }
  }
  res.json({
    totalOrders: activeOrders.length,
    totalProducts: uniqueProducts.size,
    totalAmount: Math.round(totalAmount * 100) / 100,
    pickedRate: totalBreakdown > 0 ? Math.round((totalPicked / totalBreakdown) * 100) / 100 : 0,
  });
});

// =====================================================
//  启动监听
// =====================================================
const PORT = 3000;
app.listen(PORT, () => {
  console.log(`✅ [社区团购后端] 已启动 http://localhost:${PORT}`);
  console.log(`   预置商品: ${products.size} 种  |  预设用户: ${users.length} 人`);
});
