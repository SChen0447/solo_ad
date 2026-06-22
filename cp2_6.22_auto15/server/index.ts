import express from 'express';
import cors from 'cors';
import { v4 as uuidv4 } from 'uuid';

const app = express();
const PORT = 3001;

app.use(cors({ origin: 'http://localhost:3000' }));
app.use(express.json());

interface Exhibit {
  id: string;
  name: string;
  author: string;
  material: string;
  size: string;
  description: string;
  imageUrl: string;
  scanCount: number;
  likeCount: number;
  createdAt: string;
}

interface InteractionRecord {
  id: string;
  exhibitId: string;
  type: 'scan' | 'like';
  timestamp: string;
}

const exhibits: Exhibit[] = [
  {
    id: uuidv4(),
    name: '青花瓷瓶',
    author: '李明轩',
    material: '陶瓷',
    size: '30cm x 15cm',
    description: '采用传统青花工艺，以缠枝莲纹为主题，经1300度高温烧制而成。釉色温润，线条流畅，是当代陶瓷艺术与传统技法的完美结合。',
    imageUrl: 'https://images.unsplash.com/photo-1578749556568-bc2c40e68b61?w=400',
    scanCount: 42,
    likeCount: 28,
    createdAt: new Date().toISOString(),
  },
  {
    id: uuidv4(),
    name: '木雕摆件·鹿',
    author: '王艺涵',
    material: '胡桃木',
    size: '25cm x 20cm x 10cm',
    description: '以整块胡桃木雕刻而成，鹿角采用镂空技法，体态优美自然。表面经手工打磨上蜡，木纹清晰可见。',
    imageUrl: 'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=400',
    scanCount: 35,
    likeCount: 19,
    createdAt: new Date().toISOString(),
  },
  {
    id: uuidv4(),
    name: '水彩画·晨曦',
    author: '张雨桐',
    material: '水彩纸、水彩颜料',
    size: '42cm x 56cm',
    description: '描绘山间清晨的朦胧美景，雾气缭绕，阳光透过云层洒下。色彩层次丰富，意境悠远。',
    imageUrl: 'https://images.unsplash.com/photo-1579783902614-a3fb3927b6a5?w=400',
    scanCount: 56,
    likeCount: 41,
    createdAt: new Date().toISOString(),
  },
  {
    id: uuidv4(),
    name: '银饰耳环·星空',
    author: '陈思琪',
    material: '925纯银、蓝托帕石',
    size: '每只长约4cm',
    description: '以浩瀚星空为设计灵感，镶嵌天然蓝托帕石象征星辰。手工打造，每一件都是独一无二的艺术品。',
    imageUrl: 'https://images.unsplash.com/photo-1535632066927-ab7c9ab60908?w=400',
    scanCount: 68,
    likeCount: 52,
    createdAt: new Date().toISOString(),
  },
  {
    id: uuidv4(),
    name: '手织羊毛毯',
    author: '刘慧敏',
    material: '新西兰羊毛',
    size: '150cm x 200cm',
    description: '采用传统编织工艺，纯手工织造。图案灵感来自大自然的山川河流，触感柔软温暖。',
    imageUrl: 'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?w=400',
    scanCount: 29,
    likeCount: 23,
    createdAt: new Date().toISOString(),
  },
  {
    id: uuidv4(),
    name: '陶艺茶盏套装',
    author: '赵文博',
    material: '紫砂陶',
    size: '茶盏直径8cm x 6只',
    description: '宜兴原矿紫砂制作，采用柴烧工艺，每只茶盏纹理各异。器型古朴典雅，适合品茗收藏。',
    imageUrl: 'https://images.unsplash.com/photo-1594736797933-d0501ba2fe65?w=400',
    scanCount: 47,
    likeCount: 36,
    createdAt: new Date().toISOString(),
  },
];

const interactions: InteractionRecord[] = [];

function generateHourlyStats() {
  const stats: { hour: string; scans: number; likes: number }[] = [];
  const now = new Date();
  for (let i = 23; i >= 0; i--) {
    const hour = new Date(now.getTime() - i * 60 * 60 * 1000);
    const hourStr = `${hour.getHours().toString().padStart(2, '0')}:00`;
    const hourStart = new Date(hour);
    hourStart.setMinutes(0, 0, 0);
    const hourEnd = new Date(hourStart);
    hourEnd.setHours(hourEnd.getHours() + 1);
    const hourInteractions = interactions.filter((r) => {
      const t = new Date(r.timestamp);
      return t >= hourStart && t < hourEnd;
    });
    stats.push({
      hour: hourStr,
      scans: hourInteractions.filter((r) => r.type === 'scan').length,
      likes: hourInteractions.filter((r) => r.type === 'like').length,
    });
  }
  return stats;
}

function seedInteractions() {
  exhibits.forEach((exhibit) => {
    for (let i = 0; i < exhibit.scanCount; i++) {
      const randomHours = Math.floor(Math.random() * 24);
      const randomMinutes = Math.floor(Math.random() * 60);
      const ts = new Date(Date.now() - randomHours * 3600000 - randomMinutes * 60000);
      interactions.push({
        id: uuidv4(),
        exhibitId: exhibit.id,
        type: 'scan',
        timestamp: ts.toISOString(),
      });
    }
    for (let i = 0; i < exhibit.likeCount; i++) {
      const randomHours = Math.floor(Math.random() * 24);
      const randomMinutes = Math.floor(Math.random() * 60);
      const ts = new Date(Date.now() - randomHours * 3600000 - randomMinutes * 60000);
      interactions.push({
        id: uuidv4(),
        exhibitId: exhibit.id,
        type: 'like',
        timestamp: ts.toISOString(),
      });
    }
  });
}

seedInteractions();

app.get('/api/exhibits', (req, res) => {
  res.json(exhibits);
});

app.post('/api/exhibits', (req, res) => {
  const { name, author, material, size, description, imageUrl } = req.body;
  if (!name || !author) {
    return res.status(400).json({ error: '名称和作者为必填项' });
  }
  const newExhibit: Exhibit = {
    id: uuidv4(),
    name,
    author,
    material: material || '',
    size: size || '',
    description: description || '',
    imageUrl: imageUrl || '',
    scanCount: 0,
    likeCount: 0,
    createdAt: new Date().toISOString(),
  };
  exhibits.push(newExhibit);
  res.status(201).json(newExhibit);
});

app.put('/api/exhibits/:id', (req, res) => {
  const id = req.params.id;
  const index = exhibits.findIndex((e) => e.id === id);
  if (index === -1) {
    return res.status(404).json({ error: '展品不存在' });
  }
  const { name, author, material, size, description, imageUrl } = req.body;
  exhibits[index] = {
    ...exhibits[index],
    name: name ?? exhibits[index].name,
    author: author ?? exhibits[index].author,
    material: material ?? exhibits[index].material,
    size: size ?? exhibits[index].size,
    description: description ?? exhibits[index].description,
    imageUrl: imageUrl ?? exhibits[index].imageUrl,
  };
  res.json(exhibits[index]);
});

app.delete('/api/exhibits/:id', (req, res) => {
  const id = req.params.id;
  const index = exhibits.findIndex((e) => e.id === id);
  if (index === -1) {
    return res.status(404).json({ error: '展品不存在' });
  }
  exhibits.splice(index, 1);
  res.json({ message: '删除成功' });
});

app.put('/api/interact', (req, res) => {
  const { exhibitId, type } = req.body;
  const exhibit = exhibits.find((e) => e.id === exhibitId);
  if (!exhibit) {
    return res.status(404).json({ error: '展品不存在' });
  }
  if (type === 'scan') {
    exhibit.scanCount += 1;
    interactions.push({
      id: uuidv4(),
      exhibitId,
      type: 'scan',
      timestamp: new Date().toISOString(),
    });
  } else if (type === 'like') {
    exhibit.likeCount += 1;
    interactions.push({
      id: uuidv4(),
      exhibitId,
      type: 'like',
      timestamp: new Date().toISOString(),
    });
  } else if (type === 'unlike') {
    exhibit.likeCount = Math.max(0, exhibit.likeCount - 1);
  } else {
    return res.status(400).json({ error: '无效的互动类型' });
  }
  res.json({
    scanCount: exhibit.scanCount,
    likeCount: exhibit.likeCount,
  });
});

app.get('/api/stats', (req, res) => {
  const exhibitId = req.query.exhibitId as string | undefined;
  const stats = generateHourlyStats();
  if (exhibitId) {
    const exhibitInteractions = interactions.filter((r) => r.exhibitId === exhibitId);
    const exhibitStats: { hour: string; total: number }[] = [];
    const now = new Date();
    for (let i = 23; i >= 0; i--) {
      const hour = new Date(now.getTime() - i * 60 * 60 * 1000);
      const hourStr = `${hour.getHours().toString().padStart(2, '0')}:00`;
      const hourStart = new Date(hour);
      hourStart.setMinutes(0, 0, 0);
      const hourEnd = new Date(hourStart);
      hourEnd.setHours(hourEnd.getHours() + 1);
      const count = exhibitInteractions.filter((r) => {
        const t = new Date(r.timestamp);
        return t >= hourStart && t < hourEnd;
      }).length;
      exhibitStats.push({ hour: hourStr, total: count });
    }
    return res.json(exhibitStats);
  }
  res.json(stats);
});

app.listen(PORT, () => {
  console.log(`后端服务器运行在 http://localhost:${PORT}`);
});
