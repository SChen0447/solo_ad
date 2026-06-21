import { v4 as uuidv4 } from 'uuid';
import type {
  User,
  Recipe,
  Rating,
  Favorite,
  CookingSession,
  CookingHistory,
} from './types';

export const users: Map<string, User> = new Map();
export const recipes: Map<string, Recipe> = new Map();
export const ratings: Map<string, Rating> = new Map();
export const favorites: Map<string, Favorite> = new Map();
export const cookingSessions: Map<string, CookingSession> = new Map();
export const cookingHistories: Map<string, CookingHistory> = new Map();
export const tokens: Map<string, string> = new Map();

function initMockData() {
  const demoUser: User = {
    id: uuidv4(),
    username: '美食达人',
    password: '123456',
    avatar: '',
    createdAt: Date.now(),
  };
  users.set(demoUser.id, demoUser);
  tokens.set('demo-token', demoUser.id);

  const sampleRecipes: Recipe[] = [
    {
      id: uuidv4(),
      title: '番茄炒蛋',
      coverImage: 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=600',
      description: '经典家常菜，酸甜可口',
      cuisine: 'chinese',
      ingredients: ['番茄 2个', '鸡蛋 3个', '葱花 适量', '盐 少许', '糖 1勺'],
      steps: [
        { id: uuidv4(), title: '准备食材', description: '番茄切块，鸡蛋打散', duration: 120, order: 1 },
        { id: uuidv4(), title: '炒蛋', description: '热油下锅炒鸡蛋，盛出备用', duration: 180, order: 2 },
        { id: uuidv4(), title: '炒番茄', description: '炒番茄出汁，加入糖和盐', duration: 240, order: 3 },
        { id: uuidv4(), title: '混合', description: '加入鸡蛋翻炒均匀，撒葱花出锅', duration: 60, order: 4 },
      ],
      totalTime: 600,
      authorId: demoUser.id,
      authorName: demoUser.username,
      isPublic: true,
      createdAt: Date.now() - 86400000,
      updatedAt: Date.now() - 86400000,
    },
    {
      id: uuidv4(),
      title: '日式拉面',
      coverImage: 'https://images.unsplash.com/photo-1569718212165-3a8278d5f624?w=600',
      description: '浓郁汤底，劲道面条',
      cuisine: 'japanese',
      ingredients: ['拉面 200g', '叉烧 3片', '溏心蛋 1个', '海苔 2片', '葱花 适量', '豚骨高汤 500ml'],
      steps: [
        { id: uuidv4(), title: '煮面', description: '水开后下面，煮3分钟', duration: 180, order: 1 },
        { id: uuidv4(), title: '热汤', description: '高汤加热至沸腾', duration: 300, order: 2 },
        { id: uuidv4(), title: '装盘', description: '面捞入碗中，加汤，摆入配料', duration: 120, order: 3 },
      ],
      totalTime: 600,
      authorId: demoUser.id,
      authorName: demoUser.username,
      isPublic: true,
      createdAt: Date.now() - 172800000,
      updatedAt: Date.now() - 172800000,
    },
    {
      id: uuidv4(),
      title: '意大利肉酱面',
      coverImage: 'https://images.unsplash.com/photo-1621996346565-e3dbc646d9a9?w=600',
      description: '经典意式风味，肉酱浓郁',
      cuisine: 'western',
      ingredients: ['意大利面 200g', '牛肉末 150g', '番茄罐头 1罐', '洋葱 半个', '大蒜 3瓣', '罗勒 适量', '帕玛森芝士 适量'],
      steps: [
        { id: uuidv4(), title: '煮面', description: '盐水煮面至al dente', duration: 600, order: 1 },
        { id: uuidv4(), title: '炒香配料', description: '洋葱大蒜切碎，炒香', duration: 180, order: 2 },
        { id: uuidv4(), title: '做肉酱', description: '加入牛肉末炒散，加番茄罐头慢炖', duration: 1200, order: 3 },
        { id: uuidv4(), title: '混合', description: '面与肉酱混合，撒芝士和罗勒', duration: 60, order: 4 },
      ],
      totalTime: 2040,
      authorId: demoUser.id,
      authorName: demoUser.username,
      isPublic: true,
      createdAt: Date.now() - 259200000,
      updatedAt: Date.now() - 259200000,
    },
    {
      id: uuidv4(),
      title: '宫保鸡丁',
      coverImage: 'https://images.unsplash.com/photo-1525755662778-989d0524087e?w=600',
      description: '川菜经典，麻辣鲜香',
      cuisine: 'chinese',
      ingredients: ['鸡胸肉 300g', '花生米 50g', '干辣椒 10个', '花椒 1勺', '葱姜蒜 适量', '生抽 2勺', '醋 1勺', '糖 1勺'],
      steps: [
        { id: uuidv4(), title: '腌肉', description: '鸡肉切丁，用生抽淀粉腌制', duration: 600, order: 1 },
        { id: uuidv4(), title: '炸花生', description: '花生米冷油下锅炸至金黄', duration: 180, order: 2 },
        { id: uuidv4(), title: '炒料', description: '热油爆香花椒干辣椒', duration: 60, order: 3 },
        { id: uuidv4(), title: '炒鸡丁', description: '下鸡丁滑炒，加调味汁', duration: 240, order: 4 },
        { id: uuidv4(), title: '出锅', description: '加入花生米翻炒均匀', duration: 30, order: 5 },
      ],
      totalTime: 1110,
      authorId: demoUser.id,
      authorName: demoUser.username,
      isPublic: true,
      createdAt: Date.now() - 345600000,
      updatedAt: Date.now() - 345600000,
    },
    {
      id: uuidv4(),
      title: '寿司拼盘',
      coverImage: 'https://images.unsplash.com/photo-1579871494447-9811cf80d66c?w=600',
      description: '新鲜刺身配上醋饭，美味难挡',
      cuisine: 'japanese',
      ingredients: ['寿司米 200g', '三文鱼 100g', '金枪鱼 100g', '海苔 3张', '寿司醋 3勺', '芥末 适量', '酱油 适量'],
      steps: [
        { id: uuidv4(), title: '煮饭', description: '寿司米洗净，加水蒸熟', duration: 1200, order: 1 },
        { id: uuidv4(), title: '拌醋饭', description: '米饭趁热拌入寿司醋，冷却', duration: 600, order: 2 },
        { id: uuidv4(), title: '切刺身', description: '鱼肉切成合适大小', duration: 300, order: 3 },
        { id: uuidv4(), title: '捏寿司', description: '手沾水，捏饭团铺上鱼片', duration: 600, order: 4 },
      ],
      totalTime: 2700,
      authorId: demoUser.id,
      authorName: demoUser.username,
      isPublic: true,
      createdAt: Date.now() - 432000000,
      updatedAt: Date.now() - 432000000,
    },
    {
      id: uuidv4(),
      title: '凯撒沙拉',
      coverImage: 'https://images.unsplash.com/photo-1550304943-4f24f54ddde9?w=600',
      description: '清爽健康的经典沙拉',
      cuisine: 'western',
      ingredients: ['生菜 1颗', '面包丁 50g', '帕玛森芝士 30g', '凯撒酱 3勺', '橄榄油 1勺', '盐 少许'],
      steps: [
        { id: uuidv4(), title: '准备生菜', description: '生菜洗净撕成小片', duration: 180, order: 1 },
        { id: uuidv4(), title: '烤面包丁', description: '面包切丁，加橄榄油烤至金黄', duration: 300, order: 2 },
        { id: uuidv4(), title: '拌沙拉', description: '生菜加凯撒酱拌匀，撒面包丁和芝士', duration: 120, order: 3 },
      ],
      totalTime: 600,
      authorId: demoUser.id,
      authorName: demoUser.username,
      isPublic: true,
      createdAt: Date.now() - 518400000,
      updatedAt: Date.now() - 518400000,
    },
  ];

  sampleRecipes.forEach((recipe) => {
    recipes.set(recipe.id, recipe);
  });

  const rating1: Rating = {
    id: uuidv4(),
    recipeId: sampleRecipes[0].id,
    userId: uuidv4(),
    score: 5,
    createdAt: Date.now(),
  };
  ratings.set(rating1.id, rating1);

  const rating2: Rating = {
    id: uuidv4(),
    recipeId: sampleRecipes[0].id,
    userId: uuidv4(),
    score: 4,
    createdAt: Date.now(),
  };
  ratings.set(rating2.id, rating2);
}

initMockData();

export function getUserByToken(token: string): User | undefined {
  const userId = tokens.get(token);
  if (!userId) return undefined;
  return users.get(userId);
}

export function generateToken(userId: string): string {
  const token = uuidv4();
  tokens.set(token, userId);
  return token;
}
