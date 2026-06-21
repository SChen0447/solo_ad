import express from 'express';
import cors from 'cors';
import { v4 as uuidv4 } from 'uuid';

const app = express();
app.use(cors());
app.use(express.json());

interface Restaurant {
  id: string;
  name: string;
  gradient: [string, string];
  topDishes: string[];
}

interface Dish {
  id: string;
  restaurantId: string;
  name: string;
  emoji: string;
}

interface Rating {
  id: string;
  dishId: string;
  score: number;
  createdAt: string;
}

const restaurants: Restaurant[] = [
  { id: 'r1', name: '一楼打饭窗口', gradient: ['#ed8936', '#f6ad55'], topDishes: ['红烧肉', '糖醋排骨', '宫保鸡丁', '鱼香肉丝', '梅菜扣肉'] },
  { id: 'r2', name: '二楼粉面窗口', gradient: ['#f687b3', '#fbb6ce'], topDishes: ['牛肉面', '酸辣粉', '炸酱面', '螺蛳粉', '担担面'] },
  { id: 'r3', name: '三楼小炒窗口', gradient: ['#4fd1c5', '#81e6d9'], topDishes: ['回锅肉', '干锅花菜', '铁板豆腐', '辣子鸡', '酸菜鱼'] },
  { id: 'r4', name: '一楼轻食窗口', gradient: ['#68d391', '#9ae6b4'], topDishes: ['鸡胸肉沙拉', '牛油果三明治', '糙米饭团', '水果酸奶杯', '燕麦粥'] },
  { id: 'r5', name: '二楼烧烤窗口', gradient: ['#fc8181', '#feb2b2'], topDishes: ['烤鸡腿', '烤茄子', '烤玉米', '烤五花肉', '烤金针菇'] },
  { id: 'r6', name: '三楼甜品窗口', gradient: ['#d6bcfa', '#e9d8fd'], topDishes: ['芒果班戟', '双皮奶', '红豆沙', '杨枝甘露', '芋圆甜品'] },
];

const dishes: Dish[] = [
  { id: 'd1', restaurantId: 'r1', name: '红烧肉', emoji: '🥩' },
  { id: 'd2', restaurantId: 'r1', name: '糖醋排骨', emoji: '🍖' },
  { id: 'd3', restaurantId: 'r1', name: '宫保鸡丁', emoji: '🍗' },
  { id: 'd4', restaurantId: 'r1', name: '鱼香肉丝', emoji: '🐟' },
  { id: 'd5', restaurantId: 'r1', name: '梅菜扣肉', emoji: '🥩' },
  { id: 'd6', restaurantId: 'r1', name: '番茄炒蛋', emoji: '🍳' },
  { id: 'd7', restaurantId: 'r2', name: '牛肉面', emoji: '🍜' },
  { id: 'd8', restaurantId: 'r2', name: '酸辣粉', emoji: '🌶️' },
  { id: 'd9', restaurantId: 'r2', name: '炸酱面', emoji: '🍝' },
  { id: 'd10', restaurantId: 'r2', name: '螺蛳粉', emoji: '🥜' },
  { id: 'd11', restaurantId: 'r2', name: '担担面', emoji: '🥢' },
  { id: 'd12', restaurantId: 'r2', name: '热干面', emoji: '🍜' },
  { id: 'd13', restaurantId: 'r3', name: '回锅肉', emoji: '🥩' },
  { id: 'd14', restaurantId: 'r3', name: '干锅花菜', emoji: '🥦' },
  { id: 'd15', restaurantId: 'r3', name: '铁板豆腐', emoji: '🧈' },
  { id: 'd16', restaurantId: 'r3', name: '辣子鸡', emoji: '🍗' },
  { id: 'd17', restaurantId: 'r3', name: '酸菜鱼', emoji: '🐟' },
  { id: 'd18', restaurantId: 'r3', name: '水煮牛肉', emoji: '🥩' },
  { id: 'd19', restaurantId: 'r4', name: '鸡胸肉沙拉', emoji: '🥗' },
  { id: 'd20', restaurantId: 'r4', name: '牛油果三明治', emoji: '🥑' },
  { id: 'd21', restaurantId: 'r4', name: '糙米饭团', emoji: '🍚' },
  { id: 'd22', restaurantId: 'r4', name: '水果酸奶杯', emoji: '🥛' },
  { id: 'd23', restaurantId: 'r4', name: '燕麦粥', emoji: '🥣' },
  { id: 'd24', restaurantId: 'r5', name: '烤鸡腿', emoji: '🍗' },
  { id: 'd25', restaurantId: 'r5', name: '烤茄子', emoji: '🍆' },
  { id: 'd26', restaurantId: 'r5', name: '烤玉米', emoji: '🌽' },
  { id: 'd27', restaurantId: 'r5', name: '烤五花肉', emoji: '🥓' },
  { id: 'd28', restaurantId: 'r5', name: '烤金针菇', emoji: '🍄' },
  { id: 'd29', restaurantId: 'r6', name: '芒果班戟', emoji: '🥭' },
  { id: 'd30', restaurantId: 'r6', name: '双皮奶', emoji: '🥛' },
  { id: 'd31', restaurantId: 'r6', name: '红豆沙', emoji: '🫘' },
  { id: 'd32', restaurantId: 'r6', name: '杨枝甘露', emoji: '🍋' },
  { id: 'd33', restaurantId: 'r6', name: '芋圆甜品', emoji: '🟣' },
];

function generateHistoricalRatings(): Rating[] {
  const ratings: Rating[] = [];
  const now = new Date();
  for (const dish of dishes) {
    for (let i = 6; i >= 0; i--) {
      const date = new Date(now);
      date.setDate(date.getDate() - i);
      const count = 3 + Math.floor(Math.random() * 5);
      for (let j = 0; j < count; j++) {
        const baseScore = 2.5 + Math.random() * 2.5;
        ratings.push({
          id: uuidv4(),
          dishId: dish.id,
          score: Math.round(baseScore * 2) / 2,
          createdAt: date.toISOString(),
        });
      }
    }
  }
  return ratings;
}

let ratings: Rating[] = generateHistoricalRatings();

app.get('/restaurants', (_req, res) => {
  res.json(restaurants);
});

app.get('/restaurants/:id/dishes', (req, res) => {
  const { id } = req.params;
  const restaurantDishes = dishes.filter((d) => d.restaurantId === id);
  res.json(restaurantDishes);
});

app.get('/dishes/:id/ratings', (req, res) => {
  const { id } = req.params;
  const dishRatings = ratings.filter((r) => r.dishId === id);
  res.json(dishRatings);
});

app.post('/ratings', (req, res) => {
  const { dishId, score } = req.body;
  if (!dishId || !score || score < 1 || score > 5) {
    res.status(400).json({ error: 'Invalid rating data' });
    return;
  }
  const newRating: Rating = {
    id: uuidv4(),
    dishId,
    score,
    createdAt: new Date().toISOString(),
  };
  ratings.push(newRating);
  res.json(newRating);
});

app.get('/recommendations/:restaurantId', (req, res) => {
  const { restaurantId } = req.params;
  const restaurantDishes = dishes.filter((d) => d.restaurantId === restaurantId);
  const now = new Date();

  const recommendations = restaurantDishes.map((dish) => {
    const dishRatings = ratings.filter((r) => r.dishId === dish.id);
    let weightedSum = 0;
    let weightTotal = 0;

    for (const rating of dishRatings) {
      const daysDiff = (now.getTime() - new Date(rating.createdAt).getTime()) / (1000 * 60 * 60 * 24);
      let weight: number;
      if (daysDiff <= 3) {
        weight = 1;
      } else if (daysDiff <= 7) {
        weight = 0.6;
      } else {
        weight = 0.3;
      }
      weightedSum += rating.score * weight;
      weightTotal += weight;
    }

    const score = weightTotal > 0 ? weightedSum / weightTotal : 0;
    return {
      dishId: dish.id,
      dishName: dish.name,
      emoji: dish.emoji,
      score: Math.round(score * 100) / 100,
    };
  });

  recommendations.sort((a, b) => b.score - a.score);
  res.json(recommendations);
});

const PORT = 3009;
app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
