import express from 'express';
import cors from 'cors';
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

const app = express();
const PORT = 3001;

app.use(cors());
app.use(express.json({ limit: '10mb' }));

app.get('/api/recipes', (req, res) => {
  const page = parseInt(req.query.page as string) || 1;
  const limit = parseInt(req.query.limit as string) || 8;
  res.json(getRecipes(page, limit));
});

app.post('/api/recipes', (req, res) => {
  const { title, ingredients, steps, coverImage } = req.body;
  if (!title || !ingredients || !steps || !coverImage) {
    return res.status(400).json({ error: '缺少必填字段' });
  }
  const recipe = createRecipe({ title, ingredients, steps, coverImage });
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
  const recipe = updateRecipe(id, req.body);
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

app.listen(PORT, () => {
  console.log(`食谱社区后端服务已启动: http://localhost:${PORT}`);
});
