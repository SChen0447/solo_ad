import express from 'express';
import cors from 'cors';
import { v4 as uuidv4 } from 'uuid';
import { DateTime } from 'luxon';
import {
  initDatabase,
  getAllIngredients,
  getUserIngredients,
  addUserIngredient,
  removeUserIngredient,
  resetUserIngredients,
  getRecommendedRecipes,
  addMealLog,
  getDailyNutritionSummary,
  getMealLogs,
} from './database.js';

const app = express();
const PORT = 3001;

app.use(cors());
app.use(express.json());

initDatabase();

const DEFAULT_USER_ID = 'default-user';

app.get('/api/ingredients', (req, res) => {
  try {
    const ingredients = getAllIngredients();
    res.json({ ingredients });
  } catch (error) {
    res.status(500).json({ error: '获取食材列表失败' });
  }
});

app.get('/api/user/ingredients', (req, res) => {
  try {
    const ingredients = getUserIngredients(DEFAULT_USER_ID);
    res.json({ ingredients });
  } catch (error) {
    res.status(500).json({ error: '获取用户食材失败' });
  }
});

app.post('/api/user/ingredients', (req, res) => {
  try {
    const { ingredientId } = req.body;
    if (!ingredientId) {
      return res.status(400).json({ error: '缺少食材ID' });
    }
    addUserIngredient(DEFAULT_USER_ID, ingredientId);
    const ingredients = getUserIngredients(DEFAULT_USER_ID);
    res.json({ ingredients });
  } catch (error) {
    res.status(500).json({ error: '添加食材失败' });
  }
});

app.delete('/api/user/ingredients/:ingredientId', (req, res) => {
  try {
    const ingredientId = parseInt(req.params.ingredientId);
    removeUserIngredient(DEFAULT_USER_ID, ingredientId);
    const ingredients = getUserIngredients(DEFAULT_USER_ID);
    res.json({ ingredients });
  } catch (error) {
    res.status(500).json({ error: '删除食材失败' });
  }
});

app.delete('/api/user/ingredients', (req, res) => {
  try {
    resetUserIngredients(DEFAULT_USER_ID);
    res.json({ ingredients: [] });
  } catch (error) {
    res.status(500).json({ error: '重置食材失败' });
  }
});

app.post('/api/recipes/recommend', (req, res) => {
  try {
    const { ingredientIds } = req.body;
    if (!ingredientIds || !Array.isArray(ingredientIds)) {
      return res.status(400).json({ error: '缺少食材ID列表' });
    }
    const recipes = getRecommendedRecipes(ingredientIds, 3);
    res.json({ recipes });
  } catch (error) {
    res.status(500).json({ error: '推荐菜谱失败' });
  }
});

app.post('/api/meals', (req, res) => {
  try {
    const { recipeId, mealType, servings, calories, protein, carbs, fat, date } = req.body;
    
    if (!mealType || !servings) {
      return res.status(400).json({ error: '缺少必要参数' });
    }

    const id = uuidv4();
    const mealDate = date || DateTime.now().toFormat('yyyy-MM-dd');

    addMealLog(
      id,
      DEFAULT_USER_ID,
      recipeId || null,
      mealType,
      mealDate,
      servings,
      calories,
      protein,
      carbs,
      fat
    );

    res.json({ id, success: true });
  } catch (error) {
    res.status(500).json({ error: '记录餐食失败' });
  }
});

app.get('/api/nutrition/summary', (req, res) => {
  try {
    const days = parseInt(req.query.days as string) || 7;
    const endDate = DateTime.now().toFormat('yyyy-MM-dd');
    const startDate = DateTime.now().minus({ days: days - 1 }).toFormat('yyyy-MM-dd');
    
    const summary = getDailyNutritionSummary(DEFAULT_USER_ID, startDate, endDate);
    res.json({ summary, startDate, endDate });
  } catch (error) {
    res.status(500).json({ error: '获取营养报告失败' });
  }
});

app.get('/api/meals', (req, res) => {
  try {
    const days = parseInt(req.query.days as string) || 7;
    const endDate = DateTime.now().toFormat('yyyy-MM-dd');
    const startDate = DateTime.now().minus({ days: days - 1 }).toFormat('yyyy-MM-dd');
    
    const meals = getMealLogs(DEFAULT_USER_ID, startDate, endDate);
    res.json({ meals });
  } catch (error) {
    res.status(500).json({ error: '获取餐食记录失败' });
  }
});

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok' });
});

app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});
