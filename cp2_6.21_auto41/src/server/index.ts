import express from 'express';
import cors from 'cors';
import {
  createCollage,
  getCollageById,
  getAllCollages,
  getCollagesPaginated,
  updateCollage,
  likeCollage,
  deleteCollage,
  Collage,
} from './storage';

const app = express();
const PORT = 3002;

app.use(cors());
app.use(express.json({ limit: '50mb' }));

app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok' });
});

app.get('/api/collages', (req, res) => {
  const page = parseInt(req.query.page as string) || 1;
  const pageSize = parseInt(req.query.pageSize as string) || 10;
  const sortBy = (req.query.sortBy as 'time' | 'likes') || 'time';
  const all = req.query.all === 'true';

  if (all) {
    const collages = getAllCollages(sortBy);
    res.json({ collages, total: collages.length });
  } else {
    const result = getCollagesPaginated(page, pageSize, sortBy);
    res.json(result);
  }
});

app.get('/api/collages/:id', (req, res) => {
  const collage = getCollageById(req.params.id);
  if (!collage) {
    res.status(404).json({ error: '拼贴画不存在' });
    return;
  }
  res.json(collage);
});

app.post('/api/collages', (req, res) => {
  const { name, description, author, layers, canvasWidth, canvasHeight, background } = req.body;

  if (!name || name.trim().length === 0) {
    res.status(400).json({ error: '作品名称不能为空' });
    return;
  }
  if (name.length > 30) {
    res.status(400).json({ error: '作品名称最多30个字符' });
    return;
  }
  if (description && description.length > 200) {
    res.status(400).json({ error: '描述最多200个字符' });
    return;
  }
  if (!layers || !Array.isArray(layers) || layers.length === 0) {
    res.status(400).json({ error: '至少需要一个图层' });
    return;
  }

  try {
    const collage = createCollage({
      name: name.trim(),
      description: description?.trim() || '',
      author: author?.trim() || '匿名',
      layers,
      canvasWidth: canvasWidth || 800,
      canvasHeight: canvasHeight || 600,
      background: background || '#F5F0E8',
    });
    res.status(201).json(collage);
  } catch (err) {
    res.status(500).json({ error: '创建拼贴画失败' });
  }
});

app.put('/api/collages/:id', (req, res) => {
  const { name, description, layers, canvasWidth, canvasHeight, background } = req.body;
  const updates: Partial<Omit<Collage, 'id' | 'createdAt'>> = {};

  if (name !== undefined) {
    if (!name.trim()) {
      res.status(400).json({ error: '作品名称不能为空' });
      return;
    }
    if (name.length > 30) {
      res.status(400).json({ error: '作品名称最多30个字符' });
      return;
    }
    updates.name = name.trim();
  }
  if (description !== undefined) {
    if (description.length > 200) {
      res.status(400).json({ error: '描述最多200个字符' });
      return;
    }
    updates.description = description.trim();
  }
  if (layers !== undefined) {
    if (!Array.isArray(layers) || layers.length === 0) {
      res.status(400).json({ error: '至少需要一个图层' });
      return;
    }
    updates.layers = layers;
  }
  if (canvasWidth !== undefined) updates.canvasWidth = canvasWidth;
  if (canvasHeight !== undefined) updates.canvasHeight = canvasHeight;
  if (background !== undefined) updates.background = background;

  const collage = updateCollage(req.params.id, updates);
  if (!collage) {
    res.status(404).json({ error: '拼贴画不存在' });
    return;
  }
  res.json(collage);
});

app.put('/api/collages/:id/like', (req, res) => {
  const collage = likeCollage(req.params.id);
  if (!collage) {
    res.status(404).json({ error: '拼贴画不存在' });
    return;
  }
  res.json({ id: collage.id, likes: collage.likes });
});

app.delete('/api/collages/:id', (req, res) => {
  const deleted = deleteCollage(req.params.id);
  if (!deleted) {
    res.status(404).json({ error: '拼贴画不存在' });
    return;
  }
  res.json({ success: true });
});

app.listen(PORT, () => {
  console.log(`[Collage Server] API running on http://localhost:${PORT}`);
});
