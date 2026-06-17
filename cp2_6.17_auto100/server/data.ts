import { v4 as uuidv4 } from 'uuid';

export interface Ingredient {
  name: string;
  amount: string;
}

export interface Step {
  order: number;
  description: string;
  image?: string;
}

export interface Recipe {
  id: string;
  title: string;
  author: string;
  image?: string;
  ingredients: Ingredient[];
  steps: Step[];
  createdAt: number;
  averageRating: number;
  ratingCount: number;
  heat: number;
}

export interface Comment {
  id: string;
  recipeId: string;
  nickname: string;
  content: string;
  createdAt: number;
}

export interface Rating {
  id: string;
  recipeId: string;
  score: number;
  createdAt: number;
}

const recipes: Recipe[] = [
  {
    id: uuidv4(),
    title: '番茄炒蛋',
    author: '美食家小王',
    image: undefined,
    ingredients: [
      { name: '番茄', amount: '3个' },
      { name: '鸡蛋', amount: '4个' },
      { name: '葱花', amount: '适量' },
      { name: '盐', amount: '少许' },
      { name: '糖', amount: '1勺' },
    ],
    steps: [
      { order: 1, description: '番茄洗净切块，鸡蛋打散加少许盐搅匀备用。' },
      { order: 2, description: '热锅冷油，倒入蛋液翻炒至凝固后盛出。' },
      { order: 3, description: '锅中再加少许油，放入番茄块翻炒出汁。' },
      { order: 4, description: '加入炒好的鸡蛋，加盐、糖调味，撒上葱花即可出锅。' },
    ],
    createdAt: Date.now() - 86400000 * 2,
    averageRating: 4.5,
    ratingCount: 12,
    heat: 156,
  },
  {
    id: uuidv4(),
    title: '红烧排骨',
    author: '厨房达人老李',
    image: undefined,
    ingredients: [
      { name: '猪排骨', amount: '500g' },
      { name: '生抽', amount: '2勺' },
      { name: '老抽', amount: '1勺' },
      { name: '冰糖', amount: '30g' },
      { name: '姜片', amount: '适量' },
      { name: '八角', amount: '2个' },
    ],
    steps: [
      { order: 1, description: '排骨冷水下锅焯水，捞出冲洗干净沥干。' },
      { order: 2, description: '锅中放少许油，加冰糖小火炒出糖色。' },
      { order: 3, description: '放入排骨翻炒上色，加姜片、八角爆香。' },
      { order: 4, description: '倒入生抽、老抽翻炒，加开水没过排骨，大火烧开转小火炖40分钟。' },
      { order: 5, description: '大火收汁，汤汁浓稠即可出锅。' },
    ],
    createdAt: Date.now() - 86400000,
    averageRating: 4.8,
    ratingCount: 25,
    heat: 289,
  },
  {
    id: uuidv4(),
    title: '凉拌黄瓜',
    author: '清爽夏日',
    image: undefined,
    ingredients: [
      { name: '黄瓜', amount: '2根' },
      { name: '大蒜', amount: '4瓣' },
      { name: '香醋', amount: '2勺' },
      { name: '生抽', amount: '1勺' },
      { name: '辣椒油', amount: '1勺' },
      { name: '香油', amount: '少许' },
    ],
    steps: [
      { order: 1, description: '黄瓜拍碎切段，撒盐腌10分钟挤出水分。' },
      { order: 2, description: '大蒜切末备用。' },
      { order: 3, description: '碗中调入香醋、生抽、辣椒油、香油、蒜末拌匀。' },
      { order: 4, description: '将料汁倒入黄瓜中拌匀即可。' },
    ],
    createdAt: Date.now() - 3600000 * 5,
    averageRating: 4.2,
    ratingCount: 8,
    heat: 92,
  },
  {
    id: uuidv4(),
    title: '可乐鸡翅',
    author: '甜品控小美',
    image: undefined,
    ingredients: [
      { name: '鸡翅中', amount: '8个' },
      { name: '可乐', amount: '1罐' },
      { name: '生抽', amount: '2勺' },
      { name: '老抽', amount: '半勺' },
      { name: '葱段', amount: '适量' },
      { name: '姜片', amount: '适量' },
    ],
    steps: [
      { order: 1, description: '鸡翅两面划几刀便于入味，冷水下锅焯水捞出。' },
      { order: 2, description: '锅中放少许油，将鸡翅煎至两面金黄。' },
      { order: 3, description: '加入葱段、姜片爆香，倒入生抽、老抽翻炒上色。' },
      { order: 4, description: '倒入可乐没过鸡翅，大火烧开转中火炖15分钟。' },
      { order: 5, description: '大火收汁至浓稠即可。' },
    ],
    createdAt: Date.now() - 3600000 * 12,
    averageRating: 4.7,
    ratingCount: 31,
    heat: 342,
  },
  {
    id: uuidv4(),
    title: '蒜蓉西兰花',
    author: '健康生活家',
    image: undefined,
    ingredients: [
      { name: '西兰花', amount: '1颗' },
      { name: '大蒜', amount: '5瓣' },
      { name: '盐', amount: '适量' },
      { name: '蚝油', amount: '1勺' },
    ],
    steps: [
      { order: 1, description: '西兰花掰成小朵，盐水浸泡10分钟后洗净。' },
      { order: 2, description: '锅中水烧开加少许盐和油，放入西兰花焯水1分钟捞出过凉水。' },
      { order: 3, description: '大蒜切末，热锅冷油爆香蒜末。' },
      { order: 4, description: '倒入西兰花翻炒，加盐、蚝油调味即可。' },
    ],
    createdAt: Date.now() - 3600000 * 2,
    averageRating: 4.3,
    ratingCount: 10,
    heat: 78,
  },
  {
    id: uuidv4(),
    title: '麻婆豆腐',
    author: '川菜爱好者',
    image: undefined,
    ingredients: [
      { name: '嫩豆腐', amount: '1盒' },
      { name: '猪肉末', amount: '100g' },
      { name: '豆瓣酱', amount: '2勺' },
      { name: '花椒粉', amount: '适量' },
      { name: '蒜末', amount: '适量' },
      { name: '葱花', amount: '适量' },
    ],
    steps: [
      { order: 1, description: '豆腐切块，淡盐水浸泡10分钟。' },
      { order: 2, description: '热锅冷油，放入肉末炒散变色。' },
      { order: 3, description: '加豆瓣酱、蒜末炒出红油。' },
      { order: 4, description: '加适量清水烧开，放入豆腐块小火煮5分钟。' },
      { order: 5, description: '水淀粉勾芡，撒上花椒粉和葱花即可。' },
    ],
    createdAt: Date.now() - 3600000 * 20,
    averageRating: 4.6,
    ratingCount: 18,
    heat: 210,
  },
];

const comments: Comment[] = [
  {
    id: uuidv4(),
    recipeId: recipes[0].id,
    nickname: '吃货小明',
    content: '做出来超好吃！番茄酸甜可口，鸡蛋嫩滑，全家都爱吃！',
    createdAt: Date.now() - 3600000 * 24,
  },
  {
    id: uuidv4(),
    recipeId: recipes[0].id,
    nickname: '厨房新手',
    content: '步骤很详细，第一次做就成功了，感谢分享！',
    createdAt: Date.now() - 3600000 * 10,
  },
  {
    id: uuidv4(),
    recipeId: recipes[1].id,
    nickname: '肉食动物',
    content: '排骨软烂入味，糖色炒得刚刚好，收藏了！',
    createdAt: Date.now() - 3600000 * 8,
  },
];

const ratings: Rating[] = [];

export function getAllRecipes(): Recipe[] {
  return [...recipes].sort((a, b) => b.createdAt - a.createdAt);
}

export function getRecipeById(id: string): Recipe | undefined {
  return recipes.find((r) => r.id === id);
}

export function createRecipe(data: {
  title: string;
  author: string;
  image?: string;
  ingredients: Ingredient[];
  steps: Step[];
}): Recipe {
  const newRecipe: Recipe = {
    id: uuidv4(),
    title: data.title,
    author: data.author,
    image: data.image,
    ingredients: data.ingredients,
    steps: data.steps,
    createdAt: Date.now(),
    averageRating: 0,
    ratingCount: 0,
    heat: 0,
  };
  recipes.unshift(newRecipe);
  return newRecipe;
}

export function getCommentsByRecipeId(recipeId: string): Comment[] {
  return comments
    .filter((c) => c.recipeId === recipeId)
    .sort((a, b) => b.createdAt - a.createdAt);
}

export function addComment(data: {
  recipeId: string;
  nickname: string;
  content: string;
}): Comment {
  const newComment: Comment = {
    id: uuidv4(),
    recipeId: data.recipeId,
    nickname: data.nickname,
    content: data.content,
    createdAt: Date.now(),
  };
  comments.unshift(newComment);
  const recipe = recipes.find((r) => r.id === data.recipeId);
  if (recipe) {
    recipe.heat += 1;
  }
  return newComment;
}

export function addRating(data: {
  recipeId: string;
  score: number;
}): { averageRating: number; ratingCount: number } {
  const newRating: Rating = {
    id: uuidv4(),
    recipeId: data.recipeId,
    score: data.score,
    createdAt: Date.now(),
  };
  ratings.push(newRating);

  const recipe = recipes.find((r) => r.id === data.recipeId);
  if (recipe) {
    const recipeRatings = ratings.filter((r) => r.recipeId === data.recipeId);
    const sum = recipeRatings.reduce((acc, r) => acc + r.score, 0);
    recipe.ratingCount = recipeRatings.length;
    recipe.averageRating = Number((sum / recipeRatings.length).toFixed(1));
    recipe.heat += 2;
  }

  return {
    averageRating: recipe!.averageRating,
    ratingCount: recipe!.ratingCount,
  };
}
