import Database from 'better-sqlite3';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export interface Customer {
  id: string;
  nickname: string;
  points: number;
  created_at: number;
}

export interface Drink {
  id: number;
  name: string;
  price: number;
  category: string;
  image_color: string;
}

export interface Order {
  id: number;
  customer_id: string;
  drink_id: number;
  quantity: number;
  total_price: number;
  created_at: number;
}

export interface OrderWithDrink extends Order {
  drink_name: string;
  drink_category: string;
}

export interface CheckIn {
  id: number;
  customer_id: string;
  timestamp: number;
  points_awarded: number;
}

export interface DrinkSalesStat {
  id: number;
  name: string;
  category: string;
  total_quantity: number | null;
  total_revenue: number | null;
}

export interface SalesStats {
  total_orders: number;
  total_revenue: number;
  by_drink: DrinkSalesStat[];
}

const db = new Database(path.join(__dirname, '..', 'cafe.db'));
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

export function initDatabase() {
  db.exec(`
    CREATE TABLE IF NOT EXISTS customers (
      id TEXT PRIMARY KEY,
      nickname TEXT NOT NULL,
      points INTEGER NOT NULL DEFAULT 0,
      created_at INTEGER NOT NULL
    );

    CREATE TABLE IF NOT EXISTS drinks (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      price REAL NOT NULL,
      category TEXT NOT NULL,
      image_color TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS orders (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      customer_id TEXT NOT NULL,
      drink_id INTEGER NOT NULL,
      quantity INTEGER NOT NULL,
      total_price REAL NOT NULL,
      created_at INTEGER NOT NULL,
      FOREIGN KEY (customer_id) REFERENCES customers(id),
      FOREIGN KEY (drink_id) REFERENCES drinks(id)
    );

    CREATE TABLE IF NOT EXISTS checkins (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      customer_id TEXT NOT NULL,
      timestamp INTEGER NOT NULL,
      points_awarded INTEGER NOT NULL,
      FOREIGN KEY (customer_id) REFERENCES customers(id)
    );

    CREATE INDEX IF NOT EXISTS idx_orders_customer ON orders(customer_id);
    CREATE INDEX IF NOT EXISTS idx_orders_created_at ON orders(created_at);
    CREATE INDEX IF NOT EXISTS idx_checkins_customer ON checkins(customer_id);
    CREATE INDEX IF NOT EXISTS idx_checkins_timestamp ON checkins(timestamp);
  `);

  const drinkCount = db.prepare('SELECT COUNT(*) as count FROM drinks').get() as { count: number };
  if (drinkCount.count === 0) {
    const insertDrink = db.prepare(`
      INSERT INTO drinks (name, price, category, image_color)
      VALUES (?, ?, ?, ?)
    `);

    const drinks = [
      { name: '美式咖啡', price: 22.00, category: '咖啡', image_color: 'linear-gradient(135deg, #6F4E37, #8B4513)' },
      { name: '拿铁', price: 28.00, category: '咖啡', image_color: 'linear-gradient(135deg, #D2B48C, #8B7355)' },
      { name: '卡布奇诺', price: 26.00, category: '咖啡', image_color: 'linear-gradient(135deg, #C4A484, #8B6914)' },
      { name: '摩卡', price: 30.00, category: '咖啡', image_color: 'linear-gradient(135deg, #5C4033, #2F1B0C)' },
      { name: '抹茶拿铁', price: 28.00, category: '茶饮', image_color: 'linear-gradient(135deg, #90EE90, #2E8B57)' },
      { name: '伯爵红茶', price: 20.00, category: '茶饮', image_color: 'linear-gradient(135deg, #DAA520, #B8860B)' },
      { name: '柠檬蜂蜜茶', price: 18.00, category: '茶饮', image_color: 'linear-gradient(135deg, #FFD700, #FFA500)' },
      { name: '热巧克力', price: 24.00, category: '特饮', image_color: 'linear-gradient(135deg, #8B4513, #3E2723)' },
      { name: '牛角包', price: 12.00, category: '甜点', image_color: 'linear-gradient(135deg, #F5DEB3, #D2B48C)' },
      { name: '提拉米苏', price: 28.00, category: '甜点', image_color: 'linear-gradient(135deg, #A0522D, #654321)' },
      { name: '芝士蛋糕', price: 26.00, category: '甜点', image_color: 'linear-gradient(135deg, #FFFACD, #F0E68C)' },
      { name: '蓝莓马芬', price: 15.00, category: '甜点', image_color: 'linear-gradient(135deg, #9370DB, #483D8B)' },
    ];

    const insertMany = db.transaction((drinkList: typeof drinks) => {
      for (const drink of drinkList) {
        insertDrink.run(drink.name, drink.price, drink.category, drink.image_color);
      }
    });
    insertMany(drinks);
  }

  const customerCount = db.prepare('SELECT COUNT(*) as count FROM customers').get() as { count: number };
  if (customerCount.count === 0) {
    const insertCustomer = db.prepare(`
      INSERT INTO customers (id, nickname, points, created_at)
      VALUES (?, ?, ?, ?)
    `);
    insertCustomer.run('CUST001', '咖啡爱好者', 120, Date.now() - 86400000 * 30);
    insertCustomer.run('CUST002', '下午茶达人', 85, Date.now() - 86400000 * 20);
    insertCustomer.run('CUST003', '甜品控', 60, Date.now() - 86400000 * 15);
    insertCustomer.run('CUST004', '抹茶粉丝', 45, Date.now() - 86400000 * 10);
    insertCustomer.run('CUST005', '拿铁王子', 30, Date.now() - 86400000 * 5);
  }
}

export function getCustomer(customerId: string): Customer | undefined {
  return db.prepare('SELECT * FROM customers WHERE id = ?').get(customerId) as Customer | undefined;
}

export function getAllCustomers(): Customer[] {
  return db.prepare('SELECT * FROM customers ORDER BY points DESC').all() as Customer[];
}

export function createCustomer(customerId: string, nickname: string): Customer | undefined {
  const now = Date.now();
  db.prepare('INSERT INTO customers (id, nickname, points, created_at) VALUES (?, ?, 0, ?)')
    .run(customerId, nickname, now);
  return getCustomer(customerId);
}

export function updateCustomerPoints(customerId: string, points: number): Customer | undefined {
  db.prepare('UPDATE customers SET points = points + ? WHERE id = ?').run(points, customerId);
  return getCustomer(customerId);
}

export function addCheckIn(customerId: string, pointsAwarded: number) {
  const now = Date.now();
  const info = db.prepare('INSERT INTO checkins (customer_id, timestamp, points_awarded) VALUES (?, ?, ?)')
    .run(customerId, now, pointsAwarded);
  return { id: info.lastInsertRowid, customer_id: customerId, timestamp: now, points_awarded: pointsAwarded };
}

export function hasRecentCheckIn(customerId: string, timestamp: number): boolean {
  const fiveMinutesAgo = timestamp - 5 * 60 * 1000;
  const result = db.prepare(`
    SELECT COUNT(*) as count FROM checkins
    WHERE customer_id = ? AND timestamp >= ? AND timestamp <= ?
  `).get(customerId, fiveMinutesAgo, timestamp + 1) as { count: number };
  return result.count > 0;
}

export function getAllDrinks(): Drink[] {
  return db.prepare('SELECT * FROM drinks ORDER BY category, id').all() as Drink[];
}

export function getDrink(drinkId: number): Drink | undefined {
  return db.prepare('SELECT * FROM drinks WHERE id = ?').get(drinkId) as Drink | undefined;
}

export function createOrder(customerId: string, drinkId: number, quantity: number, totalPrice: number) {
  const now = Date.now();
  const info = db.prepare(`
    INSERT INTO orders (customer_id, drink_id, quantity, total_price, created_at)
    VALUES (?, ?, ?, ?, ?)
  `).run(customerId, drinkId, quantity, totalPrice, now);
  return {
    id: info.lastInsertRowid,
    customer_id: customerId,
    drink_id: drinkId,
    quantity,
    total_price: totalPrice,
    created_at: now,
  };
}

export function getCustomerOrders(customerId: string, days: number = 30): OrderWithDrink[] {
  const since = Date.now() - days * 24 * 60 * 60 * 1000;
  return db.prepare(`
    SELECT o.*, d.name as drink_name, d.category as drink_category
    FROM orders o
    JOIN drinks d ON o.drink_id = d.id
    WHERE o.customer_id = ? AND o.created_at >= ?
    ORDER BY o.created_at DESC
  `).all(customerId, since) as OrderWithDrink[];
}

export function getSalesStats(): SalesStats {
  const totalSales = db.prepare(`
    SELECT COUNT(*) as total_orders, SUM(total_price) as total_revenue
    FROM orders
  `).get() as { total_orders: number; total_revenue: number | null };

  const byDrink = db.prepare(`
    SELECT d.id, d.name, d.category,
           SUM(o.quantity) as total_quantity,
           SUM(o.total_price) as total_revenue
    FROM drinks d
    LEFT JOIN orders o ON d.id = o.drink_id
    GROUP BY d.id
    ORDER BY total_quantity DESC
  `).all() as DrinkSalesStat[];

  return {
    total_orders: totalSales.total_orders || 0,
    total_revenue: totalSales.total_revenue || 0,
    by_drink: byDrink,
  };
}

export function getCheckInStats() {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const todayStart = today.getTime();

  return db.prepare(`
    SELECT customer_id, COUNT(*) as checkin_count
    FROM checkins
    WHERE timestamp >= ?
    GROUP BY customer_id
    ORDER BY checkin_count DESC
  `).all(todayStart);
}

export { db };
