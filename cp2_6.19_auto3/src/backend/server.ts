import express from 'express';
import cors from 'cors';
import multer, { MulterError } from 'multer';
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

const ALLOWED_MIME_TYPES = ['image/jpeg', 'image/jpg', 'image/png'];
const ALLOWED_EXTENSIONS = ['.jpg', '.jpeg', '.png'];
const MAX_FILE_SIZE = 5 * 1024 * 1024;

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, uploadsDir),
  filename: (_req, file, cb) => {
    let ext = path.extname(file.originalname).toLowerCase();
    if (!ext || !ALLOWED_EXTENSIONS.includes(ext)) {
      ext = '.jpg';
    }
    const name = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}${ext}`;
    cb(null, name);
  }
});

const upload = multer({
  storage,
  limits: {
    fileSize: MAX_FILE_SIZE,
    files: 1
  },
  fileFilter: (_req, file, cb) => {
    const mimeType = file.mimetype.toLowerCase();
    const ext = path.extname(file.originalname).toLowerCase();

    if (!ALLOWED_MIME_TYPES.includes(mimeType)) {
      cb(new MulterError('LIMIT_UNEXPECTED_FILE', '只支持 JPG 和 PNG 格式的图片'));
      return;
    }
    if (!ALLOWED_EXTENSIONS.includes(ext)) {
      cb(new MulterError('LIMIT_UNEXPECTED_FILE', '文件扩展名不合法，只允许 .jpg 和 .png'));
      return;
    }
    cb(null, true);
  }
});

app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use('/uploads', express.static(uploadsDir, {
  maxAge: '1d',
  setHeaders: (res) => {
    res.setHeader('X-Content-Type-Options', 'nosniff');
  }
}));

app.get('/api/recipes', (req, res) => {
  const page = parseInt(req.query.page as string) || 1;
  const limit = parseInt(req.query.limit as string) || 8;
  res.json(getRecipes(page, limit));
});

const uploadMiddleware = upload.single('coverImage');

app.post('/api/recipes', (req, res) => {
  uploadMiddleware(req, res, (err) => {
    if (err) {
      if (err instanceof MulterError) {
        if (err.code === 'LIMIT_FILE_SIZE') {
          return res.status(400).json({ error: '图片大小不能超过 5MB' });
        }
        if (err.code === 'LIMIT_UNEXPECTED_FILE') {
          return res.status(400).json({ error: err.message || '文件类型不支持' });
        }
        return res.status(400).json({ error: `上传失败: ${err.message}` });
      }
      console.error('上传错误:', err);
      return res.status(500).json({ error: '上传失败，请稍后重试' });
    }

    const { title, ingredients, steps } = req.body;
    if (!title || !ingredients || !steps) {
      return res.status(400).json({ error: '缺少必填字段' });
    }

    let coverImage = '';
    if (req.file) {
      coverImage = `/uploads/${req.file.filename}`;
    } else if (typeof req.body.coverImage === 'string' && req.body.coverImage) {
      coverImage = req.body.coverImage;
    }

    if (!coverImage) {
      return res.status(400).json({ error: '请上传封面图片' });
    }

    const parsedIngredients = typeof ingredients === 'string'
      ? ingredients.split('\n').filter((s: string) => s.trim())
      : Array.isArray(ingredients)
        ? ingredients
        : [];
    const parsedSteps = typeof steps === 'string'
      ? steps.split('\n').filter((s: string) => s.trim())
      : Array.isArray(steps)
        ? steps
        : [];

    if (parsedIngredients.length === 0) {
      return res.status(400).json({ error: '食材清单不能为空' });
    }
    if (parsedSteps.length === 0) {
      return res.status(400).json({ error: '烹饪步骤不能为空' });
    }

    const recipe = createRecipe({
      title,
      ingredients: parsedIngredients,
      steps: parsedSteps,
      coverImage
    });
    res.status(201).json(recipe);
  });
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
  const recipe = getRecipeById(id);
  if (!recipe) {
    return res.status(404).json({ error: '食谱不存在' });
  }
  if (recipe.coverImage.startsWith('/uploads/')) {
    const imgPath = path.resolve(uploadsDir, recipe.coverImage.replace('/uploads/', ''));
    fs.unlink(imgPath, (err) => {
      if (err && err.code !== 'ENOENT') {
        console.error('删除图片失败:', err);
      }
    });
  }
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
  console.error('服务器错误:', err);
  res.status(500).json({ error: '服务器内部错误' });
});

app.listen(PORT, () => {
  console.log(`食谱社区后端服务已启动: http://localhost:${PORT}`);
});
