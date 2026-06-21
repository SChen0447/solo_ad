import express from 'express';
import cors from 'cors';
import { v4 as uuidv4 } from 'uuid';

const app = express();
const PORT = 3001;

app.use(cors({ origin: 'http://localhost:3000', credentials: true }));
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

interface HourlyStat {
  hour: number;
  scans: number;
  likes: number;
}

interface InteractionRecord {
  exhibitId: string;
  hour: number;
  date: string;
  scans: number;
  likes: number;
}

let exhibits: Exhibit[] = [
  {
    id: uuidv4(),
    name: '晨曦微光',
    author: '李明',
    material: '陶瓷、釉彩',
    size: '30cm × 20cm × 15cm',
    description: '这件作品灵感来源于清晨第一缕阳光穿透薄雾的瞬间，通过渐变的釉彩表现光线在空气中的漫射效果，表达对新一天开始的美好期许。',
    imageUrl: 'https://images.unsplash.com/photo-1578662996442-48f60103fc96?w=600',
    scanCount: 42,
    likeCount: 18,
    createdAt: new Date().toISOString(),
  },
  {
    id: uuidv4(),
    name: '枯山水韵',
    author: '张伟',
    material: '石材、细沙',
    size: '60cm × 40cm × 5cm',
    description: '以极简的构图呈现日式禅意美学，白色细沙耙出的波纹象征流水，几块精心布置的石头寓意山峦，让人在方寸之间感受自然的广阔。',
    imageUrl: 'https://images.unsplash.com/photo-1544967082-d9d25d867d66?w=600',
    scanCount: 67,
    likeCount: 35,
    createdAt: new Date().toISOString(),
  },
  {
    id: uuidv4(),
    name: '织梦系列·三',
    author: '王芳',
    material: '羊毛、丝线、天然染料',
    size: '80cm × 60cm',
    description: '使用传统手工编织技艺，将收集自各地的彩色羊毛线交织在一起。每一种颜色代表一段记忆，织就的纹理如同梦境中交错的时光。',
    imageUrl: 'https://images.unsplash.com/photo-1558171813-4c088753af8f?w=600',
    scanCount: 89,
    likeCount: 52,
    createdAt: new Date().toISOString(),
  },
  {
    id: uuidv4(),
    name: '森林私语',
    author: '陈晨',
    material: '原木、树脂、LED灯',
    size: '45cm × 30cm × 25cm',
    description: '采集自深山的原木保留了自然的纹理和形态，嵌入的树脂中封存着真实的苔藓和花瓣，内置柔和的LED光源在夜晚营造出梦幻氛围。',
    imageUrl: 'https://images.unsplash.com/photo-1513519245088-0e12902e5a38?w=600',
    scanCount: 124,
    likeCount: 78,
    createdAt: new Date().toISOString(),
  },
  {
    id: uuidv4(),
    name: '几何遐想',
    author: '刘洋',
    material: '不锈钢、烤漆',
    size: '50cm × 50cm × 50cm',
    description: '以基础几何形体为元素，通过切割、焊接和重组，创造出错综复杂的空间结构。金属表面的烤漆在不同角度的光线下呈现丰富的色彩变化。',
    imageUrl: 'https://images.unsplash.com/photo-1549490349-8643362247b5?w=600',
    scanCount: 56,
    likeCount: 29,
    createdAt: new Date().toISOString(),
  },
  {
    id: uuidv4(),
    name: '墨韵·山水',
    author: '赵雪',
    material: '宣纸、墨汁、矿物颜料',
    size: '138cm × 69cm',
    description: '采用传统水墨技法，结合当代艺术视角重新诠释山水画。画面留白处引人遐思，浓淡干湿的墨色变化展现出山川的雄浑与灵秀。',
    imageUrl: 'https://images.unsplash.com/photo-1579783902614-a3fb3927b6a5?w=600',
    scanCount: 98,
    likeCount: 61,
    createdAt: new Date().toISOString(),
  },
];

let interactionRecords: InteractionRecord[] = [];

function getTodayKey(): string {
  return new Date().toISOString().split('T')[0];
}

function generateMockHourlyStats(exhibitId: string): HourlyStat[] {
  const stats: HourlyStat[] = [];
  for (let h = 9; h <= 21; h++) {
    stats.push({
      hour: h,
      scans: Math.floor(Math.random() * 20) + (h >= 14 && h <= 18 ? 15 : 5),
      likes: Math.floor(Math.random() * 10) + (h >= 14 && h <= 18 ? 8 : 2),
    });
  }
  return stats;
}

exhibits.forEach((ex) => {
  const today = getTodayKey();
  generateMockHourlyStats(ex.id).forEach((stat) => {
    interactionRecords.push({
      exhibitId: ex.id,
      hour: stat.hour,
      date: today,
      scans: stat.scans,
      likes: stat.likes,
    });
  });
});

app.get('/api/exhibits', (req, res) => {
  res.json(exhibits);
});

app.get('/api/exhibits/:id', (req, res) => {
  const exhibit = exhibits.find((e) => e.id === req.params.id);
  if (!exhibit) {
    return res.status(404).json({ error: 'Exhibit not found' });
  }
  res.json(exhibit);
});

app.post('/api/exhibits', (req, res) => {
  const { name, author, material, size, description, imageUrl } = req.body;
  const newExhibit: Exhibit = {
    id: uuidv4(),
    name: name || '',
    author: author || '',
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
  const index = exhibits.findIndex((e) => e.id === req.params.id);
  if (index === -1) {
    return res.status(404).json({ error: 'Exhibit not found' });
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
  const index = exhibits.findIndex((e) => e.id === req.params.id);
  if (index === -1) {
    return res.status(404).json({ error: 'Exhibit not found' });
  }
  const deleted = exhibits.splice(index, 1);
  interactionRecords = interactionRecords.filter((r) => r.exhibitId !== req.params.id);
  res.json(deleted[0]);
});

app.put('/api/interact', (req, res) => {
  const { exhibitId, type } = req.body;
  const exhibit = exhibits.find((e) => e.id === exhibitId);
  if (!exhibit) {
    return res.status(404).json({ error: 'Exhibit not found' });
  }
  const currentHour = new Date().getHours();
  const today = getTodayKey();

  if (type === 'scan') {
    exhibit.scanCount += 1;
    let record = interactionRecords.find(
      (r) => r.exhibitId === exhibitId && r.hour === currentHour && r.date === today
    );
    if (!record) {
      record = { exhibitId, hour: currentHour, date: today, scans: 0, likes: 0 };
      interactionRecords.push(record);
    }
    record.scans += 1;
  } else if (type === 'like') {
    exhibit.likeCount += 1;
    let record = interactionRecords.find(
      (r) => r.exhibitId === exhibitId && r.hour === currentHour && r.date === today
    );
    if (!record) {
      record = { exhibitId, hour: currentHour, date: today, scans: 0, likes: 0 };
      interactionRecords.push(record);
    }
    record.likes += 1;
  } else if (type === 'unlike') {
    exhibit.likeCount = Math.max(0, exhibit.likeCount - 1);
    let record = interactionRecords.find(
      (r) => r.exhibitId === exhibitId && r.hour === currentHour && r.date === today
    );
    if (record) {
      record.likes = Math.max(0, record.likes - 1);
    }
  }

  res.json({ scanCount: exhibit.scanCount, likeCount: exhibit.likeCount });
});

app.get('/api/stats', (req, res) => {
  const exhibitId = req.query.exhibitId as string;
  const today = getTodayKey();
  const records = interactionRecords.filter(
    (r) => r.exhibitId === exhibitId && r.date === today
  );

  const stats: HourlyStat[] = [];
  for (let h = 9; h <= 21; h++) {
    const rec = records.find((r) => r.hour === h);
    stats.push({
      hour: h,
      scans: rec?.scans ?? 0,
      likes: rec?.likes ?? 0,
    });
  }
  res.json(stats);
});

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
