import express from 'express';
import cors from 'cors';
import bodyParser from 'body-parser';
import { v4 as uuidv4 } from 'uuid';
import recipesRouter from './routes/recipes.js';
import mealPlanRouter from './routes/mealplan.js';

export interface Recipe {
  id: string;
  title: string;
  description: string;
  author: string;
  authorAvatar: string;
  coverImage: string;
  ingredients: string[];
  steps: string[];
  ratings: number[];
  averageRating: number;
  createdAt: string;
}

export const recipes: Recipe[] = [
  {
    id: uuidv4(),
    title: '番茄炒蛋',
    description: '经典家常菜，简单美味，营养丰富。酸甜可口的番茄搭配嫩滑鸡蛋，是每个人的童年回忆。',
    author: '厨房小能手',
    authorAvatar: '厨',
    coverImage: 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=800&h=450&fit=crop',
    ingredients: ['番茄', '鸡蛋', '葱花', '盐', '糖', '生抽'],
    steps: ['番茄切块，鸡蛋打散备用。', '热锅凉油，倒入蛋液炒至凝固盛出。', '锅中再加少许油，放入番茄翻炒出汁。', '加入炒好的鸡蛋，加盐、糖、生抽调味。', '撒上葱花即可出锅。'],
    ratings: [5, 4, 5, 4, 5],
    averageRating: 4.6,
    createdAt: new Date(Date.now() - 86400000 * 2).toISOString()
  },
  {
    id: uuidv4(),
    title: '红烧排骨',
    description: '色泽红亮，肉质酥烂，甜咸适中，是宴客必备的硬菜。',
    author: '美食家老王',
    authorAvatar: '美',
    coverImage: 'https://images.unsplash.com/photo-1544025162-d76694265947?w=800&h=450&fit=crop',
    ingredients: ['排骨', '生姜', '料酒', '生抽', '老抽', '冰糖', '八角', '桂皮'],
    steps: ['排骨冷水下锅焯水，去除血沫后捞出洗净。', '锅中放少许油，加入冰糖小火炒出糖色。', '放入排骨翻炒上色，加入姜片、八角、桂皮。', '倒入料酒、生抽、老抽翻炒均匀。', '加入没过排骨的热水，大火烧开后转小火炖40分钟。', '大火收汁至浓稠即可。'],
    ratings: [5, 5, 4, 5],
    averageRating: 4.75,
    createdAt: new Date(Date.now() - 86400000 * 5).toISOString()
  },
  {
    id: uuidv4(),
    title: '蒜蓉西兰花',
    description: '清爽健康的素菜，蒜香浓郁，西兰花翠绿爽脆。',
    author: '健康饮食达人',
    authorAvatar: '健',
    coverImage: 'https://images.unsplash.com/photo-1459411552884-841db9b3cc2a?w=800&h=450&fit=crop',
    ingredients: ['西兰花', '大蒜', '盐', '蚝油', '食用油'],
    steps: ['西兰花掰成小朵，用盐水浸泡10分钟后洗净。', '大蒜切成蒜末备用。', '锅中水烧开，加少许盐和油，放入西兰花焯水1分钟捞出。', '热锅凉油，放入蒜末爆香。', '倒入西兰花翻炒，加盐和蚝油调味即可。'],
    ratings: [4, 5, 4, 4],
    averageRating: 4.25,
    createdAt: new Date(Date.now() - 86400000 * 3).toISOString()
  },
  {
    id: uuidv4(),
    title: '酸辣土豆丝',
    description: '开胃下饭神器，土豆丝爽脆可口，酸辣开胃。',
    author: '川菜小厨娘',
    authorAvatar: '川',
    coverImage: 'https://images.unsplash.com/photo-1518977676601-b53f82baadc0?w=800&h=450&fit=crop',
    ingredients: ['土豆', '干辣椒', '花椒', '醋', '盐', '葱花', '大蒜'],
    steps: ['土豆去皮切细丝，用清水浸泡去除淀粉。', '干辣椒切段，大蒜切末。', '热锅凉油，放入花椒和干辣椒爆香后捞出。', '放入蒜末爆香，倒入沥干水分的土豆丝大火快炒。', '沿锅边淋入醋，加盐调味，翻炒均匀。', '撒上葱花出锅。'],
    ratings: [5, 4, 5, 5, 4],
    averageRating: 4.6,
    createdAt: new Date(Date.now() - 86400000 * 1).toISOString()
  },
  {
    id: uuidv4(),
    title: '红烧肉',
    description: '肥而不腻，入口即化，色泽红亮诱人，是经典中的经典。',
    author: '老上海味道',
    authorAvatar: '老',
    coverImage: 'https://images.unsplash.com/photo-1625938144755-652e08e359b7?w=800&h=450&fit=crop',
    ingredients: ['五花肉', '冰糖', '生抽', '老抽', '料酒', '生姜', '八角', '桂皮', '香叶'],
    steps: ['五花肉切成2厘米见方的块，冷水下锅焯水。', '锅中放少许油，加入冰糖小火炒至焦糖色。', '放入五花肉翻炒上色。', '加入姜片、八角、桂皮、香叶炒香。', '倒入料酒、生抽、老抽翻炒均匀。', '加入热水没过肉块，大火烧开后转小火炖1小时。', '大火收汁即可。'],
    ratings: [5, 5, 5, 4, 5],
    averageRating: 4.8,
    createdAt: new Date(Date.now() - 86400000 * 7).toISOString()
  },
  {
    id: uuidv4(),
    title: '鸡蛋羹',
    description: '嫩滑如布丁的蒸蛋，简单营养，老少皆宜。',
    author: '早餐小能手',
    authorAvatar: '早',
    coverImage: 'https://images.unsplash.com/photo-1482049016gy-9e011d9bfb02?w=800&h=450&fit=crop',
    ingredients: ['鸡蛋', '温水', '盐', '生抽', '香油', '葱花'],
    steps: ['鸡蛋打入碗中，加少许盐打散。', '加入1.5倍的温水，搅拌均匀。', '蛋液过筛去除泡沫。', '盖上保鲜膜，水开后放入蒸锅，中火蒸10分钟。', '出锅后淋上生抽、香油，撒上葱花即可。'],
    ratings: [4, 5, 4, 5, 4],
    averageRating: 4.4,
    createdAt: new Date(Date.now() - 86400000 * 4).toISOString()
  },
  {
    id: uuidv4(),
    title: '宫保鸡丁',
    description: '川菜经典，鸡肉滑嫩，花生酥脆，酸甜微辣。',
    author: '川菜小厨娘',
    authorAvatar: '川',
    coverImage: 'https://images.unsplash.com/photo-1525755662778-989d0524087e?w=800&h=450&fit=crop',
    ingredients: ['鸡胸肉', '花生米', '干辣椒', '花椒', '大葱', '生姜', '大蒜', '生抽', '醋', '糖', '淀粉'],
    steps: ['鸡胸肉切丁，用盐、料酒、淀粉腌制15分钟。', '调碗汁：生抽、醋、糖、淀粉、水混合。', '花生米炸至金黄酥脆备用。', '热锅凉油，放入鸡丁滑炒至变色盛出。', '锅中留底油，爆香干辣椒、花椒、葱姜蒜。', '倒入鸡丁翻炒，淋入碗汁。', '最后加入花生米翻炒均匀出锅。'],
    ratings: [5, 5, 4, 5],
    averageRating: 4.75,
    createdAt: new Date(Date.now() - 86400000 * 6).toISOString()
  },
  {
    id: uuidv4(),
    title: '麻婆豆腐',
    description: '麻辣鲜香，豆腐嫩滑，是川菜的代表之作。',
    author: '川菜小厨娘',
    authorAvatar: '川',
    coverImage: 'https://images.unsplash.com/photo-1582450871972-ab5ca641643d?w=800&h=450&fit=crop',
    ingredients: ['嫩豆腐', '猪肉末', '豆瓣酱', '花椒粉', '辣椒粉', '葱花', '大蒜', '生抽', '淀粉'],
    steps: ['豆腐切成2厘米见方的块，用淡盐水浸泡。', '热锅凉油，放入肉末炒至变色。', '加入蒜末、豆瓣酱炒出红油。', '加入适量水烧开，放入豆腐块。', '加生抽调味，小火煮3分钟。', '水淀粉勾芡，撒上花椒粉和葱花即可。'],
    ratings: [5, 4, 5, 4, 5],
    averageRating: 4.6,
    createdAt: new Date(Date.now() - 86400000 * 2).toISOString()
  },
  {
    id: uuidv4(),
    title: '清炒时蔬',
    description: '简单清淡，保留蔬菜本身的鲜甜，健康低脂。',
    author: '健康饮食达人',
    authorAvatar: '健',
    coverImage: 'https://images.unsplash.com/photo-1512621776951-a57141f2eefd?w=800&h=450&fit=crop',
    ingredients: ['青菜', '大蒜', '盐', '蚝油'],
    steps: ['青菜洗净沥干水分。', '大蒜切片备用。', '热锅凉油，爆香蒜片。', '倒入青菜大火快炒。', '加盐和少许蚝油调味即可。'],
    ratings: [4, 4, 5, 4],
    averageRating: 4.25,
    createdAt: new Date(Date.now() - 86400000 * 1).toISOString()
  },
  {
    id: uuidv4(),
    title: '糖醋里脊',
    description: '外酥里嫩，酸甜可口，色泽金黄诱人，孩子们的最爱。',
    author: '厨房小能手',
    authorAvatar: '厨',
    coverImage: 'https://images.unsplash.com/photo-1529042410759-befb1204b468?w=800&h=450&fit=crop',
    ingredients: ['猪里脊肉', '番茄酱', '白醋', '白糖', '淀粉', '鸡蛋', '盐', '料酒'],
    steps: ['里脊肉切成条，用盐、料酒腌制10分钟。', '淀粉加鸡蛋和少许水调成糊。', '肉条裹上淀粉糊，油温六成热下锅炸至金黄捞出。', '油温升高后复炸30秒至