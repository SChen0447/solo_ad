/**
 * types.ts — 全局共享 TypeScript 类型定义
 *
 * 被以下文件引用：
 *   App.tsx, main.tsx
 *   components/ProductList.tsx
 *   components/CartPanel.tsx
 *   components/QtyPickerModal.tsx
 *   components/OrderBoard.tsx
 *   components/MergeView.tsx
 *   server.ts (后端同构类型，运行时通过逻辑保证一致)
 */

/** 商品：后端 GET /api/products 返回 */
export interface Product {
  id: string;
  name: string;
  price: number;       // 单价（元）
  stock: number;       // 库存数量
  category: string;    // 分类：水果 / 零食 / 日用品 / 食品
}

/** 订单项（一条订单中的某个商品） */
export interface OrderItem {
  productId: string;
  productName: string;
  quantity: number;
  unitPrice: number;
  subtotal: number;    // = unitPrice * quantity
}

/** 订单：后端 POST /api/orders 创建并返回 */
export interface Order {
  id: string;
  userId: string;
  userName: string;
  items: OrderItem[];
  totalAmount: number;
  createdAt: string;   // ISO 时间戳
  status: 'active' | 'cancelled';
}

/** 预设用户（张三 / 李四 / 王五） */
export interface User {
  id: string;
  name: string;
}

/** 合并订单中每个用户的取货明细 */
export interface UserBreakdownItem {
  userId: string;
  userName: string;
  quantity: number;
  picked: boolean;     // 是否已取货
  pickedAt?: string;   // 取货时间戳（ISO）
}

/** 按商品聚合后的合并订单条目：后端 GET /api/merged-orders 返回 */
export interface MergedOrderItem {
  productId: string;
  productName: string;
  totalQuantity: number; // 所有用户订购总数
  totalAmount: number;   // 所有用户总金额
  userBreakdown: UserBreakdownItem[]; // 各用户订购明细
}

/** 前端购物车中的条目（未提交状态） */
export interface CartItem {
  productId: string;
  productName: string;
  quantity: number;
  unitPrice: number;
  stock: number;       // 当时的库存上限
}

/** 统计概览：后端 GET /api/stats 返回 */
export interface Stats {
  totalOrders: number;    // 活跃订单数
  totalProducts: number;  // 涉及商品种类数
  totalAmount: number;    // 总金额
  pickedRate: number;     // 取货完成率 0~1（小数）
}

/** 合并视图的取货状态过滤条件 */
export type PickupFilter = 'all' | 'unpicked' | 'picked';
