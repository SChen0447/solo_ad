import Database from 'better-sqlite3';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const dbPath = path.join(__dirname, '..', 'data', 'app.db');

const db = new Database(dbPath);

db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT UNIQUE NOT NULL,
    password TEXT NOT NULL,
    createdAt TEXT DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS devices (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    icon TEXT NOT NULL,
    status TEXT DEFAULT 'available'
  );

  CREATE TABLE IF NOT EXISTS bookings (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    deviceId INTEGER NOT NULL,
    userId INTEGER NOT NULL,
    date TEXT NOT NULL,
    startTime TEXT NOT NULL,
    endTime TEXT NOT NULL,
    createdAt TEXT DEFAULT (datetime('now')),
    FOREIGN KEY (deviceId) REFERENCES devices(id),
    FOREIGN KEY (userId) REFERENCES users(id)
  );

  CREATE INDEX IF NOT EXISTS idx_bookings_device_date ON bookings(deviceId, date);
  CREATE INDEX IF NOT EXISTS idx_bookings_user ON bookings(userId);
`);

const deviceCount = db.prepare('SELECT COUNT(*) as count FROM devices').get() as { count: number };

if (deviceCount.count === 0) {
  const insertDevice = db.prepare('INSERT INTO devices (name, icon, status) VALUES (?, ?, ?)');
  const devices = [
    ['打印机', '🖨️', 'available'],
    ['投影仪', '📽️', 'available'],
    ['空调', '❄️', 'available'],
    ['咖啡机', '☕', 'available'],
    ['音响', '🔊', 'available'],
  ];
  const insertMany = db.transaction((items: string[][]) => {
    for (const item of items) {
      insertDevice.run(item[0], item[1], item[2]);
    }
  });
  insertMany(devices);
}

export function getAllDevices() {
  return db.prepare('SELECT * FROM devices').all() as Array<{
    id: number;
    name: string;
    icon: string;
    status: string;
  }>;
}

export function getDeviceById(id: number) {
  return db.prepare('SELECT * FROM devices WHERE id = ?').get(id) as {
    id: number;
    name: string;
    icon: string;
    status: string;
  } | undefined;
}

export function getBookingsByDevice(deviceId: number, date?: string) {
  if (date) {
    return db.prepare('SELECT * FROM bookings WHERE deviceId = ? AND date = ? ORDER BY startTime').all(deviceId, date) as Array<{
      id: number;
      deviceId: number;
      userId: number;
      date: string;
      startTime: string;
      endTime: string;
      createdAt: string;
    }>;
  }
  return db.prepare('SELECT * FROM bookings WHERE deviceId = ? ORDER BY date, startTime').all(deviceId) as Array<{
    id: number;
    deviceId: number;
    userId: number;
    date: string;
    startTime: string;
    endTime: string;
    createdAt: string;
  }>;
}

export function getRecentBookingsByDevice(deviceId: number, limit: number = 3) {
  const now = new Date().toISOString().slice(0, 10);
  return db.prepare(
    'SELECT * FROM bookings WHERE deviceId = ? AND date >= ? ORDER BY date, startTime LIMIT ?'
  ).all(deviceId, now, limit) as Array<{
    id: number;
    deviceId: number;
    userId: number;
    date: string;
    startTime: string;
    endTime: string;
    createdAt: string;
  }>;
}

export function createBooking(deviceId: number, userId: number, date: string, startTime: string, endTime: string) {
  const conflicts = db.prepare(
    `SELECT * FROM bookings WHERE deviceId = ? AND date = ? 
     AND NOT (endTime <= ? OR startTime >= ?)`
  ).all(deviceId, date, startTime, endTime) as Array<{ id: number }>;

  if (conflicts.length > 0) {
    return { success: false, error: '该时段与已有预约冲突' };
  }

  const now = new Date().toISOString();
  const result = db.prepare(
    'INSERT INTO bookings (deviceId, userId, date, startTime, endTime, createdAt) VALUES (?, ?, ?, ?, ?, ?)'
  ).run(deviceId, userId, date, startTime, endTime, now);

  const booking = db.prepare('SELECT * FROM bookings WHERE id = ?').get(result.lastInsertRowid) as {
    id: number;
    deviceId: number;
    userId: number;
    date: string;
    startTime: string;
    endTime: string;
    createdAt: string;
  };

  const device = getDeviceById(deviceId);

  return {
    success: true,
    booking: {
      ...booking,
      deviceName: device?.name || '',
      deviceIcon: device?.icon || '',
    },
  };
}

export function getUserBookings(userId: number) {
  const bookings = db.prepare(
    `SELECT b.*, d.name as deviceName, d.icon as deviceIcon 
     FROM bookings b JOIN devices d ON b.deviceId = d.id 
     WHERE b.userId = ? ORDER BY b.date DESC, b.startTime DESC`
  ).all(userId) as Array<{
    id: number;
    deviceId: number;
    userId: number;
    date: string;
    startTime: string;
    endTime: string;
    createdAt: string;
    deviceName: string;
    deviceIcon: string;
  }>;
  return bookings;
}

export function findUserByUsername(username: string) {
  return db.prepare('SELECT * FROM users WHERE username = ?').get(username) as {
    id: number;
    username: string;
    password: string;
    createdAt: string;
  } | undefined;
}

export function createUser(username: string, password: string) {
  const existing = findUserByUsername(username);
  if (existing) {
    return { success: false, error: '用户名已存在' };
  }
  const result = db.prepare('INSERT INTO users (username, password) VALUES (?, ?)').run(username, password);
  const user = db.prepare('SELECT * FROM users WHERE id = ?').get(result.lastInsertRowid) as {
    id: number;
    username: string;
    password: string;
    createdAt: string;
  };
  return { success: true, user };
}

export function updateDeviceStatus(deviceId: number, status: string) {
  db.prepare('UPDATE devices SET status = ? WHERE id = ?').run(status, deviceId);
}

export default db;
