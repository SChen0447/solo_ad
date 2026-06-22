import express from 'express';
import cors from 'cors';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
app.use(cors());
app.use(express.json());

const PORT = 3001;

const regions = ['华东', '华南', '华北', '华中', '西南', '西北', '东北'];
const products = ['笔记本', '手机', '平板', '耳机', '显示器', '键盘', '鼠标', '音箱', '摄像头', '路由器'];
const categories = ['电子产品', '办公用品', '生活用品', '娱乐设备'];
const channels = ['线上', '线下', '经销商', '直销'];
const statuses = ['已完成', '进行中', '已取消'];

function randomDate(start, end) {
  return new Date(start.getTime() + Math.random() * (end.getTime() - start.getTime()));
}

function generateData() {
  const data = [];
  for (let i = 0; i < 1000; i++) {
    const date = randomDate(new Date(2023, 0, 1), new Date(2025, 11, 31));
    const quantity = Math.floor(Math.random() * 500) + 1;
    const unitPrice = Math.round((Math.random() * 9000 + 100) * 100) / 100;
    data.push({
      id: i + 1,
      date: date.toISOString().split('T')[0],
      region: regions[Math.floor(Math.random() * regions.length)],
      product: products[Math.floor(Math.random() * products.length)],
      category: categories[Math.floor(Math.random() * categories.length)],
      channel: channels[Math.floor(Math.random() * channels.length)],
      status: statuses[Math.floor(Math.random() * statuses.length)],
      sales: Math.round(quantity * unitPrice * 100) / 100,
      quantity,
      unitPrice,
      profit: Math.round(quantity * unitPrice * (Math.random() * 0.4 + 0.05) * 100) / 100,
      discount: Math.round(Math.random() * 30) / 100,
      cost: Math.round(quantity * unitPrice * (Math.random() * 0.6 + 0.4) * 100) / 100,
      customerAge: Math.floor(Math.random() * 50) + 18,
      customerGender: Math.random() > 0.5 ? '男' : '女',
      orderCount: Math.floor(Math.random() * 10) + 1,
      returnRate: Math.round(Math.random() * 15) / 100,
      satisfaction: Math.floor(Math.random() * 5) + 1,
      deliveryDays: Math.floor(Math.random() * 10) + 1,
      isRepeat: Math.random() > 0.6,
    });
  }
  return data;
}

const snapshotsFile = path.join(__dirname, 'snapshots.json');

function readSnapshots() {
  try {
    if (fs.existsSync(snapshotsFile)) {
      const content = fs.readFileSync(snapshotsFile, 'utf-8');
      return JSON.parse(content);
    }
  } catch (e) {}
  return [];
}

function writeSnapshots(snapshots) {
  fs.writeFileSync(snapshotsFile, JSON.stringify(snapshots, null, 2), 'utf-8');
}

app.get('/api/data', (req, res) => {
  const data = generateData();
  res.json(data);
});

app.get('/api/snapshots', (req, res) => {
  const snapshots = readSnapshots();
  res.json(snapshots);
});

app.post('/api/snapshots', (req, res) => {
  const snapshots = readSnapshots();
  const snapshot = {
    id: Date.now().toString(36) + Math.random().toString(36).substr(2, 9),
    ...req.body,
    createdAt: new Date().toISOString(),
  };
  snapshots.push(snapshot);
  writeSnapshots(snapshots);
  res.json(snapshot);
});

app.delete('/api/snapshots/:id', (req, res) => {
  let snapshots = readSnapshots();
  snapshots = snapshots.filter((s) => s.id !== req.params.id);
  writeSnapshots(snapshots);
  res.json({ success: true });
});

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
