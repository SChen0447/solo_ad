import express from 'express';
import cors from 'cors';
import bodyParser from 'body-parser';
import { v4 as uuidv4 } from 'uuid';

const app = express();
const PORT = 5000;

app.use(cors());
app.use(bodyParser.json());

const TAG_COLORS = ['#ff6b6b', '#4ecdc4', '#ffe66d', '#a29bfe'];

const getRandomColor = () => TAG_COLORS[Math.floor(Math.random() * TAG_COLORS.length)];

let inspirations = [
  {
    id: uuidv4(),
    title: '可编程LED冰箱磁贴',
    content: '把冰箱磁贴做成可编程的LED点阵，可以显示天气、时间、留言等信息，还能通过手机APP自定义图案和动画效果。',
    tags: ['科技', '生活'],
    imageUrl: 'https://images.unsplash.com/photo-1518770660439-4636190af475?w=200&h=200&fit=crop',
    linkUrl: '',
    isFavorite: true,
    createdAt: new Date('2026-06-15T10:30:00Z').toISOString(),
    updatedAt: new Date('2026-06-15T10:30:00Z').toISOString()
  },
  {
    id: uuidv4(),
    title: '声控变色植物灯',
    content: '根据室内声音频率和分贝自动变换灯光颜色，安静时是柔和的绿色，有人说话时变成温暖的橙色，音乐响起时跟随节奏闪烁。',
    tags: ['科技', '艺术'],
    imageUrl: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=200&h=200&fit=crop',
    linkUrl: '',
    isFavorite: false,
    createdAt: new Date('2026-06-14T14:20:00Z').toISOString(),
    updatedAt: new Date('2026-06-14T14:20:00Z').toISOString()
  },
  {
    id: uuidv4(),
    title: '旧杂志拼贴艺术画',
    content: '收集各种旧杂志的彩页，按照色彩渐变排列拼贴成一幅大型抽象画，挂在客厅当装饰。每层颜色过渡要自然，远看是渐变色，近看是各种有趣的杂志内容。',
    tags: ['艺术', '生活'],
    imageUrl: 'https://images.unsplash.com/photo-1513364776144-60967b0f800f?w=200&h=200&fit=crop',
    linkUrl: '',
    isFavorite: true,
    createdAt: new Date('2026-06-13T09:15:00Z').toISOString(),
    updatedAt: new Date('2026-06-13T09:15:00Z').toISOString()
  },
  {
    id: uuidv4(),
    title: '智能花盆自动养护系统',
    content: '花盆内置湿度、光照、温度传感器，连接手机APP实时监测植物状态，缺水缺光时自动提醒，还能通过微型水泵自动浇水。',
    tags: ['科技'],
    imageUrl: 'https://images.unsplash.com/photo-1416879595882-3373a0480b5b?w=200&h=200&fit=crop',
    linkUrl: '',
    isFavorite: false,
    createdAt: new Date('2026-06-12T16:45:00Z').toISOString(),
    updatedAt: new Date('2026-06-12T16:45:00Z').toISOString()
  },
  {
    id: uuidv4(),
    title: '周末晨间手冲咖啡仪式',
    content: '每个周末早上不用赶时间，认真做一杯手冲咖啡：先磨豆子闻香，然后用88度水慢慢冲泡，配一本喜欢的书，享受半小时的慢时光。',
    tags: ['生活'],
    imageUrl: 'https://images.unsplash.com/photo-1495474472287-4d71bcdd2085?w=200&h=200&fit=crop',
    linkUrl: '',
    isFavorite: false,
    createdAt: new Date('2026-06-11T08:00:00Z').toISOString(),
    updatedAt: new Date('2026-06-11T08:00:00Z').toISOString()
  },
  {
    id: uuidv4(),
    title: '城市微旅行摄影计划',
    content: '每个周末选择城市里一个没去过的小角落，带着相机去探索，拍30张照片，记录城市里被忽略的美。一年后做成城市摄影集。',
    tags: ['艺术', '生活'],
    imageUrl: 'https://images.unsplash.com/photo-1467232004584-a241de8bcf5d?w=200&h=200&fit=crop',
    linkUrl: '',
    isFavorite: true,
    createdAt: new Date('2026-06-10T11:30:00Z').toISOString(),
    updatedAt: new Date('2026-06-10T11:30:00Z').toISOString()
  },
  {
    id: uuidv4(),
    title: 'AI辅助服装设计草图',
    content: '用AI生成服装设计草图作为灵感参考，然后手动修改和优化，结合传统剪裁工艺，创造出人机协作的独特设计作品。',
    tags: ['科技', '艺术'],
    imageUrl: 'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=200&h=200&fit=crop',
    linkUrl: '',
    isFavorite: false,
    createdAt: new Date('2026-06-09T15:20:00Z').toISOString(),
    updatedAt: new Date('2026-06-09T15:20:00Z').toISOString()
  },
  {
    id: uuidv4(),
    title: '手写书信慢递计划',
    content: '给一年后的自己写一封信，封存起来明年今天再打开。每个月写一封给不同的朋友，不用电子邮件，找回手写的温度。',
    tags: ['生活'],
    imageUrl: 'https://images.unsplash.com/photo-1455390582262-044cdead277a?w=200&h=200&fit=crop',
    linkUrl: '',
    isFavorite: false,
    createdAt: new Date('2026-06-08T13:10:00Z').toISOString(),
    updatedAt: new Date('2026-06-08T13:10:00Z').toISOString()
  }
];

let tags = [
  { name: '科技', color: '#4ecdc4', count: 3 },
  { name: '艺术', color: '#ff6b6b', count: 4 },
  { name: '生活', color: '#ffe66d', count: 5 },
  { name: '未分类', color: '#a29bfe', count: 0 }
];

const updateTagCounts = () => {
  const countMap = {};
  inspirations.forEach(ins => {
    ins.tags.forEach(tag => {
      countMap[tag] = (countMap[tag] || 0) + 1;
    });
  });
  
  tags.forEach(tag => {
    tag.count = countMap[tag.name] || 0;
  });
  
  Object.keys(countMap).forEach(tagName => {
    if (!tags.find(t => t.name === tagName)) {
      tags.push({ name: tagName, color: getRandomColor(), count: countMap[tagName] });
    }
  });
  
  tags = tags.filter(t => t.count > 0 || t.name === '未分类');
};

updateTagCounts();

app.get('/api/inspirations', (req, res) => {
  res.json(inspirations);
});

app.get('/api/inspirations/:id', (req, res) => {
  const inspiration = inspirations.find(ins => ins.id === req.params.id);
  if (!inspiration) {
    return res.status(404).json({ error: '灵感不存在' });
  }
  res.json(inspiration);
});

app.post('/api/inspirations', (req, res) => {
  const { title, content, tags: tagNames = [], imageUrl = '', linkUrl = '' } = req.body;
  
  if (!title || !content) {
    return res.status(400).json({ error: '标题和内容不能为空' });
  }
  
  const newInspiration = {
    id: uuidv4(),
    title,
    content,
    tags: tagNames.length > 0 ? tagNames : ['未分类'],
    imageUrl,
    linkUrl,
    isFavorite: false,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };
  
  inspirations.unshift(newInspiration);
  updateTagCounts();
  res.status(201).json(newInspiration);
});

app.put('/api/inspirations/:id', (req, res) => {
  const index = inspirations.findIndex(ins => ins.id === req.params.id);
  if (index === -1) {
    return res.status(404).json({ error: '灵感不存在' });
  }
  
  const updated = {
    ...inspirations[index],
    ...req.body,
    id: req.params.id,
    updatedAt: new Date().toISOString()
  };
  
  inspirations[index] = updated;
  updateTagCounts();
  res.json(updated);
});

app.delete('/api/inspirations/:id', (req, res) => {
  const index = inspirations.findIndex(ins => ins.id === req.params.id);
  if (index === -1) {
    return res.status(404).json({ error: '灵感不存在' });
  }
  
  inspirations.splice(index, 1);
  updateTagCounts();
  res.json({ success: true });
});

app.get('/api/tags', (req, res) => {
  updateTagCounts();
  res.json(tags);
});

app.put('/api/tags/:name', (req, res) => {
  const oldName = decodeURIComponent(req.params.name);
  const { name: newName, color } = req.body;
  
  const tagIndex = tags.findIndex(t => t.name === oldName);
  if (tagIndex === -1) {
    return res.status(404).json({ error: '标签不存在' });
  }
  
  if (oldName === '未分类' && newName && newName !== '未分类') {
    return res.status(400).json({ error: '不能修改"未分类"标签名称' });
  }
  
  if (newName && newName !== oldName) {
    if (tags.find(t => t.name === newName)) {
      return res.status(400).json({ error: '标签名称已存在' });
    }
    
    inspirations.forEach(ins => {
      ins.tags = ins.tags.map(t => t === oldName ? newName : t);
    });
    
    tags[tagIndex].name = newName;
  }
  
  if (color) {
    tags[tagIndex].color = color;
  }
  
  updateTagCounts();
  res.json(tags[tagIndex]);
});

app.delete('/api/tags/:name', (req, res) => {
  const tagName = decodeURIComponent(req.params.name);
  
  if (tagName === '未分类') {
    return res.status(400).json({ error: '不能删除"未分类"标签' });
  }
  
  const tagIndex = tags.findIndex(t => t.name === tagName);
  if (tagIndex === -1) {
    return res.status(404).json({ error: '标签不存在' });
  }
  
  inspirations.forEach(ins => {
    ins.tags = ins.tags.map(t => t === tagName ? '未分类' : t);
  });
  
  tags.splice(tagIndex, 1);
  updateTagCounts();
  res.json({ success: true });
});

app.get('/api/star-chart', (req, res) => {
  updateTagCounts();
  
  const now = new Date();
  const monthStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  
  const validTags = tags.filter(t => t.count > 0 && t.name !== '未分类');
  const maxCount = Math.max(...validTags.map(t => t.count), 1);
  
  const canvasWidth = 600;
  const canvasHeight = 600;
  const centerX = canvasWidth / 2;
  const centerY = canvasHeight / 2;
  const maxRadius = Math.min(centerX, centerY) - 80;
  
  const bubbles = validTags.map((tag, index) => {
    const angle = (index / validTags.length) * Math.PI * 2;
    const distance = 60 + (tag.count / maxCount) * maxRadius * 0.6;
    const radius = 30 + (tag.count / maxCount) * 90;
    
    return {
      name: tag.name,
      color: tag.color,
      count: tag.count,
      x: centerX + Math.cos(angle) * distance,
      y: centerY + Math.sin(angle) * distance,
      radius: Math.min(Math.max(radius, 30), 120)
    };
  });
  
  const connections = [];
  for (let i = 0; i < bubbles.length; i++) {
    for (let j = i + 1; j < bubbles.length; j++) {
      const dx = bubbles[i].x - bubbles[j].x;
      const dy = bubbles[i].y - bubbles[j].y;
      const distance = Math.sqrt(dx * dx + dy * dy);
      if (distance < 300) {
        connections.push({
          from: bubbles[i].name,
          to: bubbles[j].name
        });
      }
    }
  }
  
  res.json({
    month: monthStr,
    tags: bubbles,
    connections
  });
});

app.listen(PORT, () => {
  console.log(`灵感收纳盒后端服务运行在 http://localhost:${PORT}`);
});
