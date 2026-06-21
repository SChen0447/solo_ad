import express from 'express';
import cors from 'cors';
import multer from 'multer';
import type { Request } from 'express';
import type { Material, Annotation, MaterialType } from './types';

const app = express();
const PORT = 3005;

const storage = multer.memoryStorage();
const upload = multer({ storage });

app.use(cors());
app.use(express.json({ limit: '50mb' }));

const materials = new Map<string, Material>();
const annotations = new Map<string, Annotation[]>();

function generateId(): string {
  return Date.now().toString(36) + Math.random().toString(36).substr(2, 9);
}

function getMimeType(file: Express.Multer.File): MaterialType {
  if (file.mimetype === 'image/png') return 'PNG';
  if (file.mimetype === 'image/gif') return 'GIF';
  return 'PNG';
}

function materialWithCount(material: Material): Material {
  const count = annotations.get(material.id)?.length || 0;
  return { ...material, annotationCount: count };
}

app.get('/api/materials', (_req, res) => {
  const list = Array.from(materials.values()).map(materialWithCount);
  res.json(list);
});

app.get('/api/materials/:id', (req, res) => {
  const material = materials.get(req.params.id);
  if (!material) {
    res.status(404).json({ error: 'Material not found' });
    return;
  }
  res.json(materialWithCount(material));
});

app.post('/api/materials', upload.single('file'), (req: Request & { file?: Express.Multer.File }, res) => {
  const file = req.file;
  if (!file) {
    res.status(400).json({ error: 'No file uploaded' });
    return;
  }
  if (file.mimetype !== 'image/png' && file.mimetype !== 'image/gif') {
    res.status(400).json({ error: 'Only PNG and GIF files are supported' });
    return;
  }

  const name = req.body.name || file.originalname;
  const type = getMimeType(file);
  const data = file.buffer.toString('base64');

  const material: Material = {
    id: generateId(),
    name,
    type,
    mimeType: file.mimetype,
    data: `data:${file.mimetype};base64,${data}`,
    uploadedAt: Date.now(),
    annotationCount: 0,
  };

  materials.set(material.id, material);
  annotations.set(material.id, []);
  res.status(201).json(materialWithCount(material));
});

app.get('/api/materials/:id/annotations', (req, res) => {
  const materialId = req.params.id;
  if (!materials.has(materialId)) {
    res.status(404).json({ error: 'Material not found' });
    return;
  }
  const list = annotations.get(materialId) || [];
  res.json(list);
});

app.post('/api/materials/:id/annotations', (req, res) => {
  const materialId = req.params.id;
  if (!materials.has(materialId)) {
    res.status(404).json({ error: 'Material not found' });
    return;
  }

  const { x, y, color, text, author } = req.body;
  if (typeof x !== 'number' || typeof y !== 'number') {
    res.status(400).json({ error: 'Invalid coordinates' });
    return;
  }

  const annotation: Annotation = {
    id: generateId(),
    materialId,
    x,
    y,
    color: color || '#FF00FF',
    text: text || '',
    author: author || '匿名',
    createdAt: Date.now(),
  };

  const list = annotations.get(materialId) || [];
  list.push(annotation);
  annotations.set(materialId, list);

  const material = materials.get(materialId)!;
  material.annotationCount = list.length;

  res.status(201).json(annotation);
});

app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});

export default app;
