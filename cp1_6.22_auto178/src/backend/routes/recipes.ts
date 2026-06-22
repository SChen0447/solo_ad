import { Router, Request, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import {
  recipes,
  getAllPublicRecipes,
  getUserRecipes,
  findRecipeById,
  findUserByEmail,
  findUserByUsername,
  findUserById,
  createUser,
  JWT_SECRET,
} from '../store';
import { Recipe, RecipeStep, Ingredient } from '../models/Recipe';

const router = Router();

function authMiddleware(req: Request, res: Response, next: Function) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: '未登录' });
  }
  const token = authHeader.split(' ')[1];
  try {
    const decoded = jwt.verify(token, JWT_SECRET) as { userId: string };
    (req as any).userId = decoded.userId;
    next();
  } catch (e) {
    return res.status(401).json({ error: '登录已过期' });
  }
}

router.get('/', (req: Request, res: Response) => {
  const search = (req.query.search as string)?.toLowerCase() || '';
  const category = (req.query.category as string) || '';
  const tag = (req.query.tag as string) || '';

  let result = getAllPublicRecipes();

  if (search) {
    result = result.filter(r =>
      r.name.toLowerCase().includes(search) ||
      r.ingredients.some(i => i.name.toLowerCase().includes(search))
    );
  }
  if (category) {
    result = result.filter(r => r.category === category);
  }
  if (tag) {
    result = result.filter(r => r.tags.includes(tag));
  }

  res.json(result);
});

router.get('/my', authMiddleware, (req: Request, res: Response) => {
  const userId = (req as any).userId;
  const user = findUserById(userId);
  if (!user) return res.status(404).json({ error: '用户不存在' });

  const myRecipes = getUserRecipes(userId);
  const savedRecipes = user.savedRecipes
    .map(id => findRecipeById(id))
    .filter(Boolean) as Recipe[];

  res.json({ myRecipes, savedRecipes });
});

router.get('/:id', (req: Request, res: Response) => {
  const recipe = findRecipeById(req.params.id);
  if (!recipe) {
    return res.status(404).json({ error: '食谱不存在' });
  }
  res.json(recipe);
});

router.post('/', authMiddleware, (req: Request, res: Response) => {
  const userId = (req as any).userId;
  const user = findUserById(userId);
  if (!user) return res.status(404).json({ error: '用户不存在' });

  const { name, coverImage, description, ingredients, steps, tags, category, isPublic } = req.body;

  if (!name || !ingredients || !steps) {
    return res.status(400).json({ error: '菜名、食材和步骤不能为空' });
  }

  const recipeIngredients: Ingredient[] = ingredients.map((ing: any) => ({
    id: uuidv4(),
    name: ing.name,
    quantity: parseFloat(ing.quantity) || 0,
    unit: ing.unit,
    category: ing.category || '其他',
  }));

  const recipeSteps: RecipeStep[] = steps
    .sort((a: RecipeStep, b: RecipeStep) => a.order - b.order)
    .map((step: any) => ({
      id: uuidv4(),
      order: step.order,
      description: step.description,
      imageUrl: step.imageUrl,
    }));

  const recipe: Recipe = {
    id: uuidv4(),
    name,
    coverImage: coverImage || 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=400',
    description,
    ingredients: recipeIngredients,
    steps: recipeSteps,
    tags: tags || [],
    category: category || '家常菜',
    isPublic: isPublic !== undefined ? isPublic : true,
    authorId: userId,
    authorName: user.username,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  recipes.set(recipe.id, recipe);
  res.status(201).json(recipe);
});

router.put('/:id', authMiddleware, (req: Request, res: Response) => {
  const userId = (req as any).userId;
  const recipe = findRecipeById(req.params.id);

  if (!recipe) {
    return res.status(404).json({ error: '食谱不存在' });
  }
  if (recipe.authorId !== userId) {
    return res.status(403).json({ error: '只能编辑自己的食谱' });
  }

  const { name, coverImage, description, ingredients, steps, tags, category, isPublic } = req.body;

  if (name) recipe.name = name;
  if (coverImage !== undefined) recipe.coverImage = coverImage;
  if (description !== undefined) recipe.description = description;
  if (tags) recipe.tags = tags;
  if (category) recipe.category = category;
  if (isPublic !== undefined) recipe.isPublic = isPublic;

  if (ingredients) {
    recipe.ingredients = ingredients.map((ing: any) => ({
      id: ing.id || uuidv4(),
      name: ing.name,
      quantity: parseFloat(ing.quantity) || 0,
      unit: ing.unit,
      category: ing.category || '其他',
    }));
  }

  if (steps) {
    recipe.steps = steps
      .sort((a: RecipeStep, b: RecipeStep) => a.order - b.order)
      .map((step: any) => ({
        id: step.id || uuidv4(),
        order: step.order,
        description: step.description,
        imageUrl: step.imageUrl,
      }));
  }

  recipe.updatedAt = new Date();
  res.json(recipe);
});

router.delete('/:id', authMiddleware, (req: Request, res: Response) => {
  const userId = (req as any).userId;
  const recipe = findRecipeById(req.params.id);

  if (!recipe) {
    return res.status(404).json({ error: '食谱不存在' });
  }
  if (recipe.authorId !== userId) {
    return res.status(403).json({ error: '只能删除自己的食谱' });
  }

  recipes.delete(req.params.id);
  res.json({ message: '删除成功' });
});

router.post('/:id/save', authMiddleware, (req: Request, res: Response) => {
  const userId = (req as any).userId;
  const user = findUserById(userId);
  const recipe = findRecipeById(req.params.id);

  if (!user || !recipe) {
    return res.status(404).json({ error: '用户或食谱不存在' });
  }

  if (!user.savedRecipes.includes(recipe.id)) {
    user.savedRecipes.push(recipe.id);
  }

  res.json({ message: '收藏成功', savedRecipes: user.savedRecipes });
});

router.post('/:id/unsave', authMiddleware, (req: Request, res: Response) => {
  const userId = (req as any).userId;
  const user = findUserById(userId);

  if (!user) {
    return res.status(404).json({ error: '用户不存在' });
  }

  user.savedRecipes = user.savedRecipes.filter(id => id !== req.params.id);
  res.json({ message: '取消收藏成功', savedRecipes: user.savedRecipes });
});

export default router;
