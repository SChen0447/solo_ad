import express from 'express';
import cors from 'cors';
import multer from 'multer';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';
import {
  getRecipes,
  getRecipeById,
  createRecipe,
  updateRecipe,
  deleteRecipe,
  likeRecipe,
  toggleFavorite,
  getFavorites
} from './db.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = 3001;

const uploadsDir = path.resolve(__dirname, '../../uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, uploadsDir),
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname) || '.jpg';
    const name = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}${ext}`;
    cb(null, name);
  }
});

const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('只允许上传图片文件'));
    }
  }
});

app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use('/uploads', express.static(uploadsDir));

app.get('/api/recipes', (req, res) => {
  const page = parseInt(req.query.page as string) || 1;
  const limit = parseInt(req.query.limit as string) || 8;
  res.json(getRecipes(page, limit));
});

app.post('/api/recipes', upload.single('coverImage'), (req, res) => {
  const { title, ingredients, steps } = req.body;
  if (!title || !ingredients || !steps) {
    return res.status(400).json({ error: '缺少必填字段' });
  }

  let coverImage = '';
  if (req.file) {
    coverImage = `/uploads/${req.file.filename}`;
  } else if (req.body.coverImage) {
    coverImage = req.body.coverImage;
  }

  if (!coverImage) {
    return res.status(400).json({ error: '请上传封面图片' });
  }

  const parsedIngredients = typeof ingredients === 'string'
    ? ingredients.split('\n').filter((s: string) => s.trim())
    : ingredients;
  const parsedSteps = typeof steps === 'string'
    ? steps.split('\n').filter((s: string) => s.trim())
    : steps;

  const recipe = createRecipe({
    title,
    ingredients: parsedIngredients,
    steps: parsedSteps,
    coverImage
  });
  res.status(201).json(recipe);
});

app.get('/api/recipes/:id', (req, res) => {
  const id = parseInt(req.params.id);
  const recipe = getRecipeById(id);
  if (!recipe) {
    return res.status(404).json({ error: '食谱不存在' });
  }
  res.json(recipe);
});

app.put('/api/recipes/:id', (req, res) => {
  const id = parseInt(req.params.id);
  const data = { ...req.body };
  if (data.ingredients && typeof data.ingredients === 'string') {
    data.ingredients = data.ingredients.split('\n').filter((s: string) => s.trim());
  }
  if (data.steps && typeof data.steps === 'string') {
    data.steps = data.steps.split('\n').filter((s: string) => s.trim());
  }
  const recipe = updateRecipe(id, data);
  if (!recipe) {
    return res.status(404).json({ error: '食谱不存在' });
  }
  res.json(recipe);
});

app.delete('/api/recipes/:id', (req, res) => {
  const id = parseInt(req.params.id);
  deleteRecipe(id);
  res.json({ success: true });
});

app.post('/api/recipes/:id/like', (req, res) => {
  const id = parseInt(req.params.id);
  const result = likeRecipe(id);
  if (!result) {
    return res.status(404).json({ error: '食谱不存在' });
  }
  res.json(result);
});

app.post('/api/recipes/:id/favorite', (req, res) => {
  const id = parseInt(req.params.id);
  const { favorite } = req.body;
  const result = toggleFavorite(id, Boolean(favorite));
  res.json(result);
});

app.get('/api/favorites', (_req, res) => {
  res.json(getFavorites());
});

app.use((err: Error, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  if (err instanceof multer.MulterError) {
    return res.status(400).json({ error: `上传错误: ${err.message}` });
  }
  if (err.message === '只允许上传图片文件') {
    return res.status(400).json({ error: err.message });
  }
  console.error(err);
  res.status(500).json({ error: '服务器错误' });
});

app.listen(PORT, () => {
  console.log(`食谱社区后端服务已启动: http://localhost:${PORT}`);
});
