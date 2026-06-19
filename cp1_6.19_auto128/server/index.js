import express from 'express';
import cors from 'cors';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import multer from 'multer';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const DATA_FILE = path.join(__dirname, 'data.json');
const UPLOADS_DIR = path.join(__dirname, 'uploads');

if (!fs.existsSync(UPLOADS_DIR)) {
  fs.mkdirSync(UPLOADS_DIR, { recursive: true });
}

const app = express();
const PORT = 3002;

app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use('/uploads', express.static(UPLOADS_DIR));

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, UPLOADS_DIR);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    cb(null, uniqueSuffix + '-' + file.originalname);
  }
});

const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    if (file.mimetype === 'image/jpeg' || file.mimetype === 'image/png') {
      cb(null, true);
    } else {
      cb(new Error('只支持 JPG 和 PNG 格式'));
    }
  }
});

const readData = () => {
  const raw = fs.readFileSync(DATA_FILE, 'utf-8');
  return JSON.parse(raw);
};

const writeData = (data) => {
  fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2), 'utf-8');
};

const generateId = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 8);

app.post('/api/auth/login', (req, res) => {
  const { username, password } = req.body;
  const data = readData();
  const user = data.users.find(
    (u) => u.username === username && u.password === password
  );
  if (!user) {
    return res.status(401).json({ error: '用户名或密码错误' });
  }
  res.json({ id: user.id, username: user.username });
});

app.post('/api/auth/register', (req, res) => {
  const { username, password } = req.body;
  if (!username || !password) {
    return res.status(400).json({ error: '用户名和密码不能为空' });
  }
  const data = readData();
  if (data.users.find((u) => u.username === username)) {
    return res.status(409).json({ error: '用户名已存在' });
  }
  const newUser = { id: generateId(), username, password };
  data.users.push(newUser);
  writeData(data);
  res.json({ id: newUser.id, username: newUser.username });
});

app.get('/api/locations', (req, res) => {
  const userId = req.query.userId;
  const data = readData();
  const locations = data.locations
    .filter((l) => l.userId === userId)
    .sort((a, b) => new Date(a.arrivalDate) - new Date(b.arrivalDate));
  res.json(locations);
});

app.post('/api/locations', (req, res) => {
  const { userId, city, country, lat, lng, arrivalDate, daysStayed, flagColor } = req.body;
  if (!userId || !city || !country || lat == null || lng == null || !arrivalDate) {
    return res.status(400).json({ error: '缺少必要字段' });
  }
  const data = readData();
  const newLocation = {
    id: generateId(),
    userId,
    city,
    country,
    lat,
    lng,
    arrivalDate,
    daysStayed: daysStayed || 1,
    flagColor: flagColor || '#e74c3c'
  };
  data.locations.push(newLocation);
  writeData(data);
  res.status(201).json(newLocation);
});

app.put('/api/locations/:id', (req, res) => {
  const { id } = req.params;
  const data = readData();
  const index = data.locations.findIndex((l) => l.id === id);
  if (index === -1) {
    return res.status(404).json({ error: '地点不存在' });
  }
  data.locations[index] = { ...data.locations[index], ...req.body };
  writeData(data);
  res.json(data.locations[index]);
});

app.delete('/api/locations/:id', (req, res) => {
  const { id } = req.params;
  const data = readData();
  data.locations = data.locations.filter((l) => l.id !== id);
  data.journals = data.journals.filter((j) => j.locationId !== id);
  writeData(data);
  res.json({ success: true });
});

app.get('/api/journals', (req, res) => {
  const { userId, locationId } = req.query;
  const data = readData();
  let journals = data.journals.filter((j) => j.userId === userId);
  if (locationId) {
    journals = journals.filter((j) => j.locationId === locationId);
  }
  journals.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  res.json(journals);
});

app.get('/api/journals/:id', (req, res) => {
  const { id } = req.params;
  const data = readData();
  const journal = data.journals.find((j) => j.id === id);
  if (!journal) {
    return res.status(404).json({ error: '游记不存在' });
  }
  res.json(journal);
});

app.post('/api/journals', (req, res) => {
  const { locationId, userId, title, content, weather, mood, photos } = req.body;
  if (!locationId || !userId || !title) {
    return res.status(400).json({ error: '缺少必要字段' });
  }
  const data = readData();
  const newJournal = {
    id: generateId(),
    locationId,
    userId,
    title,
    content: content || '',
    weather: weather || '',
    mood: mood || '',
    photos: photos || [],
    createdAt: new Date().toISOString()
  };
  data.journals.push(newJournal);
  writeData(data);
  res.status(201).json(newJournal);
});

app.put('/api/journals/:id', (req, res) => {
  const { id } = req.params;
  const data = readData();
  const index = data.journals.findIndex((j) => j.id === id);
  if (index === -1) {
    return res.status(404).json({ error: '游记不存在' });
  }
  data.journals[index] = { ...data.journals[index], ...req.body };
  writeData(data);
  res.json(data.journals[index]);
});

app.delete('/api/journals/:id', (req, res) => {
  const { id } = req.params;
  const data = readData();
  data.journals = data.journals.filter((j) => j.id !== id);
  writeData(data);
  res.json({ success: true });
});

app.post('/api/upload', upload.array('photos', 6), (req, res) => {
  if (!req.files || req.files.length === 0) {
    return res.status(400).json({ error: '没有上传文件' });
  }
  const uploaded = req.files.map((file) => ({
    url: `/uploads/${file.filename}`,
    title: file.originalname,
    filename: file.filename
  }));
  res.json(uploaded);
});

app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).json({ error: err.message || '服务器错误' });
});

app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});
