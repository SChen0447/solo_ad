import express from 'express';
import cors from 'cors';
import { v4 as uuidv4 } from 'uuid';
import multer from 'multer';
import path from 'path';
import { fileURLToPath } from 'url';
import type { CatPoint, Feedback, CatStatus } from '../types.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = 3001;

app.use(cors());
app.use(express.json());
app.use('/uploads', express.static(path.join(__dirname, '../../uploads')));

const upload = multer({
  storage: multer.diskStorage({
    destination: (_req, _file, cb) => {
      cb(null, path.join(__dirname, '../../uploads'));
    },
    filename: (_req, file, cb) => {
      const ext = path.extname(file.originalname);
      cb(null, `${uuidv4()}${ext}`);
    },
  }),
  limits: { fileSize: 5 * 1024 * 1024 },
});

const PLACEHOLDER_IMAGES = [
  'https://trae-api-cn.mchost.guru/api/ide/v1/text_to_image?prompt=cute%20orange%20stray%20cat%20sitting%20on%20street%20corner%20warm%20sunlight%20realistic%20photo&image_size=square',
  'https://trae-api-cn.mchost.guru/api/ide/v1/text_to_image?prompt=fluffy%20calico%20cat%20resting%20near%20a%20cozy%20cardboard%20shelter%20urban%20alley&image_size=square',
  'https://trae-api-cn.mchost.guru/api/ide/v1/text_to_image?prompt=tiny%20kitten%20peeking%20out%20from%20under%20a%20bush%20soft%20morning%20light&image_size=square',
  'https://trae-api-cn.mchost.guru/api/ide/v1/text_to_image?prompt=black%20and%20white%20cat%20eating%20from%20a%20small%20bowl%20sidewalk&image_size=square',
  'https://trae-api-cn.mchost.guru/api/ide/v1/text_to_image?prompt=tabby%20cat%20sleeping%20on%20a%20warm%20blanket%20community%20garden&image_size=square',
  'https://trae-api-cn.mchost.guru/api/ide/v1/text_to_image?prompt=three%20stray%20cats%20gathered%20around%20food%20bowl%20evening%20warm%20tones&image_size=square',
  'https://trae-api-cn.mchost.guru/api/ide/v1/text_to_image?prompt=orange%20kitten%20playing%20with%20a%20leaf%20autumn%20street%20corner&image_size=square',
];

let catPoints: CatPoint[] = [
  {
    id: 'cp-1',
    name: '银杏巷南口',
    x: 0.15,
    y: 0.3,
    catCount: 5,
    lastFedAt: new Date(Date.now() - 2 * 3600000).toISOString(),
    images: [PLACEHOLDER_IMAGES[0], PLACEHOLDER_IMAGES[1], PLACEHOLDER_IMAGES[2]],
    feedbacks: [
      {
        id: 'fb-1',
        catPointId: 'cp-1',
        author: '小明',
        content: '今天给橘猫们带了猫粮，5只都吃得很开心',
        status: 'healthy',
        images: [],
        createdAt: new Date(Date.now() - 2 * 3600000).toISOString(),
      },
    ],
    hasNewUpdate: false,
  },
  {
    id: 'cp-2',
    name: '花园小区东门',
    x: 0.35,
    y: 0.15,
    catCount: 3,
    lastFedAt: new Date(Date.now() - 5 * 3600000).toISOString(),
    images: [PLACEHOLDER_IMAGES[3], PLACEHOLDER_IMAGES[4], PLACEHOLDER_IMAGES[5]],
    feedbacks: [],
    hasNewUpdate: false,
  },
  {
    id: 'cp-3',
    name: '老街便利店旁',
    x: 0.55,
    y: 0.45,
    catCount: 7,
    lastFedAt: new Date(Date.now() - 1 * 3600000).toISOString(),
    images: [PLACEHOLDER_IMAGES[6], PLACEHOLDER_IMAGES[0], PLACEHOLDER_IMAGES[3]],
    feedbacks: [
      {
        id: 'fb-2',
        catPointId: 'cp-3',
        author: '阿花',
        content: '有一只黑白色的小猫右前腿好像受伤了，走路一瘸一拐',
        status: 'injured',
        images: [],
        createdAt: new Date(Date.now() - 30 * 60000).toISOString(),
      },
    ],
    hasNewUpdate: true,
  },
  {
    id: 'cp-4',
    name: '阳光幼儿园后巷',
    x: 0.72,
    y: 0.2,
    catCount: 2,
    lastFedAt: new Date(Date.now() - 8 * 3600000).toISOString(),
    images: [PLACEHOLDER_IMAGES[2], PLACEHOLDER_IMAGES[5], PLACEHOLDER_IMAGES[1]],
    feedbacks: [],
    hasNewUpdate: false,
  },
  {
    id: 'cp-5',
    name: '中央公园长椅区',
    x: 0.45,
    y: 0.7,
    catCount: 4,
    lastFedAt: new Date(Date.now() - 3 * 3600000).toISOString(),
    images: [PLACEHOLDER_IMAGES[4], PLACEHOLDER_IMAGES[6], PLACEHOLDER_IMAGES[2]],
    feedbacks: [
      {
        id: 'fb-3',
        catPointId: 'cp-5',
        author: '王阿姨',
        content: '两只小橘猫已被绝育放归，耳朵有标记',
        status: 'spayed',
        images: [],
        createdAt: new Date(Date.now() - 3 * 3600000).toISOString(),
      },
    ],
    hasNewUpdate: false,
  },
  {
    id: 'cp-6',
    name: '菜市场北侧墙根',
    x: 0.82,
    y: 0.65,
    catCount: 6,
    lastFedAt: new Date(Date.now() - 6 * 3600000).toISOString(),
    images: [PLACEHOLDER_IMAGES[1], PLACEHOLDER_IMAGES[3], PLACEHOLDER_IMAGES[6]],
    feedbacks: [
      {
        id: 'fb-4',
        catPointId: 'cp-6',
        author: '李姐',
        content: '有一只特别亲人的三花猫，适合领养，有人愿意收留吗？',
        status: 'needsAdoption',
        images: [],
        createdAt: new Date(Date.now() - 45 * 60000).toISOString(),
      },
    ],
    hasNewUpdate: true,
  },
  {
    id: 'cp-7',
    name: '河滨步道入口',
    x: 0.25,
    y: 0.8,
    catCount: 3,
    lastFedAt: new Date(Date.now() - 4 * 3600000).toISOString(),
    images: [PLACEHOLDER_IMAGES[5], PLACEHOLDER_IMAGES[0], PLACEHOLDER_IMAGES[4]],
    feedbacks: [],
    hasNewUpdate: false,
  },
];

app.get('/api/cat-points', (_req, res) => {
  const result = catPoints.map(({ feedbacks, ...rest }) => ({
    ...rest,
    feedbackCount: feedbacks.length,
  }));
  res.json(result);
});

app.get('/api/cat-points/:id', (req, res) => {
  const point = catPoints.find((p) => p.id === req.params.id);
  if (!point) {
    res.status(404).json({ error: 'Cat point not found' });
    return;
  }
  res.json(point);
});

app.post('/api/cat-points', (req, res) => {
  const { name, x, y, catCount } = req.body;
  if (!name || typeof x !== 'number' || typeof y !== 'number') {
    res.status(400).json({ error: 'Missing required fields' });
    return;
  }
  const newPoint: CatPoint = {
    id: uuidv4(),
    name,
    x,
    y,
    catCount: catCount || 1,
    lastFedAt: new Date().toISOString(),
    images: [],
    feedbacks: [],
    hasNewUpdate: false,
  };
  catPoints.push(newPoint);
  res.status(201).json(newPoint);
});

app.get('/api/cat-points/:id/feedbacks', (req, res) => {
  const point = catPoints.find((p) => p.id === req.params.id);
  if (!point) {
    res.status(404).json({ error: 'Cat point not found' });
    return;
  }
  const sorted = [...point.feedbacks].sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );
  res.json(sorted);
});

app.post('/api/cat-points/:id/feedbacks', upload.array('images', 3), (req, res) => {
  const point = catPoints.find((p) => p.id === req.params.id);
  if (!point) {
    res.status(404).json({ error: 'Cat point not found' });
    return;
  }
  const { author, content, status } = req.body;
  if (!content || !status) {
    res.status(400).json({ error: 'Missing required fields' });
    return;
  }
  const validStatuses: CatStatus[] = ['healthy', 'injured', 'needsAdoption', 'spayed'];
  if (!validStatuses.includes(status as CatStatus)) {
    res.status(400).json({ error: 'Invalid status value' });
    return;
  }
  const files = req.files as Express.Multer.File[];
  const imagePaths = files ? files.map((f) => `/uploads/${f.filename}`) : [];
  const feedback: Feedback = {
    id: uuidv4(),
    catPointId: req.params.id,
    author: author || '匿名好心人',
    content,
    status: status as CatStatus,
    images: imagePaths,
    createdAt: new Date().toISOString(),
  };
  point.feedbacks.push(feedback);
  point.hasNewUpdate = true;
  res.status(201).json(feedback);
});

app.put('/api/cat-points/:id/read', (req, res) => {
  const point = catPoints.find((p) => p.id === req.params.id);
  if (!point) {
    res.status(404).json({ error: 'Cat point not found' });
    return;
  }
  point.hasNewUpdate = false;
  res.json({ success: true });
});

app.listen(PORT, () => {
  console.log(`🐱 街角喵声后端服务已启动 http://localhost:${PORT}`);
});
