import express from 'express';
import cors from 'cors';
import { v4 as uuidv4 } from 'uuid';
import { computeRelations } from './relationEngine.js';

const app = express();
const PORT = 3001;

app.use(cors());
app.use(express.json({ limit: '10mb' }));

let notes = [
  {
    id: 'note-1',
    title: '赛博朋克视觉风格',
    content: '霓虹灯色彩搭配：紫红渐变与青色辉光，雨滴效果，高对比度暗黑背景。建筑风格参考：香港九龙寨城、东京新宿夜景。角色设计：机械义肢、全息投影服饰、发光纹路。',
    tags: ['设计', '赛博朋克', '视觉'],
    imageUrl: 'https://images.unsplash.com/photo-1518709268805-4e9042af2176?w=400',
    createdAt: Date.now() - 86400000 * 3
  },
  {
    id: 'note-2',
    title: '故事开头悬念设计',
    content: '主角醒来发现身处陌生房间，手上握着一张褪色照片，背景音是远处的警报声。第一人称视角展开，通过细节暗示世界观：墙上的通缉令有主角的脸但名字不同。',
    tags: ['写作', '故事', '悬疑'],
    imageUrl: null,
    createdAt: Date.now() - 86400000 * 2
  },
  {
    id: 'note-3',
    title: '水彩画色彩混合技巧',
    content: '湿画法：先刷清水再上色，产生自然晕染。干画法：分层叠加，适合细节。盐粒效果：湿画面撒盐产生雪花纹理。留白技巧：用蜡笔或留白液保护高光区域。',
    tags: ['绘画', '技巧', '水彩'],
    imageUrl: 'https://images.unsplash.com/photo-1579783902614-a3fb3927b6a5?w=400',
    createdAt: Date.now() - 86400000
  },
  {
    id: 'note-4',
    title: '短视频转场灵感',
    content: '1. 匹配剪辑：利用相似形状/颜色衔接不同场景。2. 声音桥接：下一场景声音提前出现。3. 旋转转场：利用镜头旋转或物体旋转完成过渡。4. 遮挡物转场：前景物体划过镜头切换画面。',
    tags: ['视频', '剪辑', '技巧'],
    imageUrl: null,
    createdAt: Date.now() - 3600000 * 5
  },
  {
    id: 'note-5',
    title: 'UI设计趋势 2026',
    content: '玻璃拟态进化：更薄的磨砂层配合动态模糊。微交互动画：按钮按压回弹、卡片3D倾斜。暗色模式优化：分级灰度替代纯黑。AI辅助界面：智能布局建议、自动配色方案。',
    tags: ['设计', 'UI', '趋势'],
    imageUrl: 'https://images.unsplash.com/photo-1561070791-2526d30994b5?w=400',
    createdAt: Date.now() - 3600000 * 2
  },
  {
    id: 'note-6',
    title: '人物角色塑造方法',
    content: '给每个主要角色写一段私人独白（不写入正文）。设计一个只有角色自己知道的秘密。定义核心矛盾：想要的 vs 需要的。MBTI人格作为参考骨架，避免扁平角色。',
    tags: ['写作', '角色', '技巧'],
    imageUrl: null,
    createdAt: Date.now() - 3600000
  }
];

let tags = [
  { id: 'tag-1', name: '设计', color: '#6366f1' },
  { id: 'tag-2', name: '赛博朋克', color: '#a855f7' },
  { id: 'tag-3', name: '视觉', color: '#38bdf8' },
  { id: 'tag-4', name: '写作', color: '#22c55e' },
  { id: 'tag-5', name: '故事', color: '#f97316' },
  { id: 'tag-6', name: '悬疑', color: '#ef4444' },
  { id: 'tag-7', name: '绘画', color: '#eab308' },
  { id: 'tag-8', name: '技巧', color: '#14b8a6' },
  { id: 'tag-9', name: '水彩', color: '#06b6d4' },
  { id: 'tag-10', name: '视频', color: '#f43f5e' },
  { id: 'tag-11', name: '剪辑', color: '#8b5cf6' },
  { id: 'tag-12', name: 'UI', color: '#10b981' },
  { id: 'tag-13', name: '趋势', color: '#84cc16' },
  { id: 'tag-14', name: '角色', color: '#f59e0b' }
];

app.get('/api/notes', (req, res) => {
  const sortedNotes = [...notes].sort((a, b) => b.createdAt - a.createdAt);
  res.json(sortedNotes);
});

app.post('/api/notes', (req, res) => {
  const { title, content, tags: noteTags, imageUrl } = req.body;

  if (!title || !content) {
    return res.status(400).json({ error: '标题和内容不能为空' });
  }

  (noteTags || []).forEach(tagName => {
    const exists = tags.some(t => t.name === tagName);
    if (!exists && tags.length < 20) {
      const colors = ['#6366f1', '#38bdf8', '#a855f7', '#ec4899', '#f97316',
        '#22c55e', '#eab308', '#ef4444', '#14b8a6', '#f43f5e',
        '#8b5cf6', '#06b6d4', '#10b981', '#f59e0b', '#84cc16'];
      tags.push({
        id: `tag-${uuidv4()}`,
        name: tagName,
        color: colors[Math.floor(Math.random() * colors.length)]
      });
    }
  });

  const newNote = {
    id: `note-${uuidv4()}`,
    title: title.trim(),
    content: content.trim(),
    tags: noteTags || [],
    imageUrl: imageUrl || null,
    createdAt: Date.now()
  };

  notes.push(newNote);
  res.status(201).json(newNote);
});

app.delete('/api/notes/:id', (req, res) => {
  const { id } = req.params;
  const index = notes.findIndex(n => n.id === id);
  if (index === -1) {
    return res.status(404).json({ error: '笔记不存在' });
  }
  const deleted = notes.splice(index, 1)[0];
  res.json(deleted);
});

app.get('/api/tags', (req, res) => {
  const tagCounts = {};
  notes.forEach(note => {
    (note.tags || []).forEach(tag => {
      tagCounts[tag] = (tagCounts[tag] || 0) + 1;
    });
  });

  const tagsWithCount = tags.map(tag => ({
    ...tag,
    count: tagCounts[tag.name] || 0
  })).sort((a, b) => b.count - a.count);

  res.json(tagsWithCount);
});

app.post('/api/tags', (req, res) => {
  const { name, color } = req.body;
  if (!name) {
    return res.status(400).json({ error: '标签名不能为空' });
  }
  if (tags.length >= 20) {
    return res.status(400).json({ error: '最多允许20个自定义标签' });
  }
  if (tags.some(t => t.name === name.trim())) {
    return res.status(400).json({ error: '标签已存在' });
  }

  const newTag = {
    id: `tag-${uuidv4()}`,
    name: name.trim(),
    color: color || '#6366f1'
  };
  tags.push(newTag);
  res.status(201).json(newTag);
});

app.put('/api/tags/:id', (req, res) => {
  const { id } = req.params;
  const { name, color } = req.body;
  const tag = tags.find(t => t.id === id);

  if (!tag) {
    return res.status(404).json({ error: '标签不存在' });
  }
  if (name && tags.some(t => t.name === name.trim() && t.id !== id)) {
    return res.status(400).json({ error: '标签名已存在' });
  }

  const oldName = tag.name;
  if (name) tag.name = name.trim();
  if (color) tag.color = color;

  notes.forEach(note => {
    note.tags = (note.tags || []).map(t => t === oldName ? tag.name : t);
  });

  res.json(tag);
});

app.delete('/api/tags/:id', (req, res) => {
  const { id } = req.params;
  const tagIndex = tags.findIndex(t => t.id === id);
  if (tagIndex === -1) {
    return res.status(404).json({ error: '标签不存在' });
  }

  const deletedTag = tags[tagIndex];
  tags.splice(tagIndex, 1);

  notes.forEach(note => {
    note.tags = (note.tags || []).filter(t => t !== deletedTag.name);
  });

  res.json(deletedTag);
});

app.get('/api/graph', (req, res) => {
  const sortedNotes = [...notes].sort((a, b) => b.createdAt - a.createdAt);
  const limitedNotes = sortedNotes.slice(0, 80);
  const graphData = computeRelations(limitedNotes);
  res.json(graphData);
});

app.listen(PORT, () => {
  console.log(`灵感收集板后端服务已启动: http://localhost:${PORT}`);
});
