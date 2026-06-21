import express from 'express';
import cors from 'cors';
import multer from 'multer';
import path from 'path';

const app = express();
const PORT = 3001;

app.use(cors());
app.use(express.json());

interface Annotation {
  id: string;
  x: number;
  y: number;
  text: string;
  createdAt: string;
}

interface Material {
  id: string;
  name: string;
  type: 'PNG' | 'GIF';
  dataUrl: string;
  size: number;
  uploadedAt: string;
  annotations: Annotation[];
}

const materials: Map<string, Material> = new Map();

const storage = multer.memoryStorage();
const upload = multer({
  storage,
  limits: { fileSize: 50 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    const allowedTypes = ['image/png', 'image/gif'];
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('仅支持 PNG 和 GIF 格式'));
    }
  }
});

function generateId(): string {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
}

app.get('/api/materials', (_req, res) => {
  const list = Array.from(materials.values()).map(({ dataUrl, annotations, ...rest }) => ({
    ...rest,
    annotationCount: annotations.length
  }));
  res.json(list);
});

app.get('/api/materials/:id', (req, res) => {
  const material = materials.get(req.params.id);
  if (!material) {
    res.status(404).json({ error: '素材不存在' });
    return;
  }
  res.json(material);
});

app.post('/api/materials/upload', upload.single('file'), (req, res) => {
  if (!req.file) {
    res.status(400).json({ error: '未上传文件' });
    return;
  }

  const mimetype = req.file.mimetype;
  const type: 'PNG' | 'GIF' = mimetype === 'image/gif' ? 'GIF' : 'PNG';
  const originalName = req.body.name || req.file.originalname;
  const ext = path.extname(originalName);
  const baseName = ext ? originalName.slice(0, -ext.length) : originalName;

  const id = generateId();
  const dataUrl = `data:${mimetype};base64,${req.file.buffer.toString('base64')}`;

  const material: Material = {
    id,
    name: baseName,
    type,
    dataUrl,
    size: req.file.size,
    uploadedAt: new Date().toISOString(),
    annotations: []
  };

  materials.set(id, material);

  const { dataUrl: _, annotations: __, ...responseMaterial } = material;
  res.status(201).json({ ...responseMaterial, annotationCount: 0 });
});

app.get('/api/materials/:id/annotations', (req, res) => {
  const material = materials.get(req.params.id);
  if (!material) {
    res.status(404).json({ error: '素材不存在' });
    return;
  }
  res.json(material.annotations);
});

app.post('/api/materials/:id/annotations', (req, res) => {
  const material = materials.get(req.params.id);
  if (!material) {
    res.status(404).json({ error: '素材不存在' });
    return;
  }

  const { x, y, text } = req.body;
  if (typeof x !== 'number' || typeof y !== 'number' || typeof text !== 'string') {
    res.status(400).json({ error: '标注数据格式错误' });
    return;
  }

  const annotation: Annotation = {
    id: generateId(),
    x: Math.round(x),
    y: Math.round(y),
    text,
    createdAt: new Date().toISOString()
  };

  material.annotations.push(annotation);
  res.status(201).json(annotation);
});

app.delete('/api/materials/:id/annotations/:aid', (req, res) => {
  const material = materials.get(req.params.id);
  if (!material) {
    res.status(404).json({ error: '素材不存在' });
    return;
  }
  const idx = material.annotations.findIndex(a => a.id === req.params.aid);
  if (idx === -1) {
    res.status(404).json({ error: '标注不存在' });
    return;
  }
  material.annotations.splice(idx, 1);
  res.status(204).send();
});

app.listen(PORT, () => {
  console.log(`Pixel Vault 服务器运行在 http://localhost:${PORT}`);
});
