import express from 'express';
import cors from 'cors';
import {
  initDatabase,
  getCustomer,
  createCustomer,
  updateCustomerPoints,
  addCheckIn,
  hasRecentCheckIn,
  getAllDrinks,
  getDrink,
  createOrder,
  getCustomerOrders,
  getAllCustomers,
  getSalesStats,
} from './database';
import { calculateRecommendations } from './recommendation';

const app = express();
const PORT = 3001;

app.use(cors());
app.use(express.json());

initDatabase();

app.get('/api/customers/:id', (req, res) => {
  const { id } = req.params;
  const customer = getCustomer(id);

  if (!customer) {
    return res.status(404).json({ error: '顾客不存在' });
  }

  res.json(customer);
});

app.post('/api/checkin', (req, res) => {
  try {
    const { qrData } = req.body;

    if (!qrData) {
      return res.status(400).json({ error: '缺少二维码数据' });
    }

    const decoded = Buffer.from(qrData, 'base64').toString('utf-8');
    const [customerId, timestampStr] = decoded.split('|');
    const timestamp = parseInt(timestampStr, 10);

    if (!customerId || isNaN(timestamp)) {
      return res.status(400).json({ error: '二维码数据格式错误' });
    }

    const now = Date.now();
    const fiveMinutes = 5 * 60 * 1000;

    if (Math.abs(now - timestamp) > fiveMinutes) {
      return res.status(400).json({ error: '二维码已过期，请刷新后重试' });
    }

    let customer = getCustomer(customerId);
    if (!customer) {
      customer = createCustomer(customerId, `顾客${customerId.slice(-4)}`);
    }

    if (hasRecentCheckIn(customerId, timestamp)) {
      return res.status(400).json({ error: '5分钟内已签到过，请勿重复签到' });
    }

    const pointsAwarded = 5;
    addCheckIn(customerId, pointsAwarded);
    const updatedCustomer = updateCustomerPoints(customerId, pointsAwarded);

    res.json({
      success: true,
      customer: updatedCustomer,
      pointsAwarded,
      message: `签到成功！获得 ${pointsAwarded} 积分`,
    });
  } catch (error) {
    console.error('签到错误:', error);
    res.status(500).json({ error: '签到失败，请稍后重试' });
  }
});

app.get('/api/drinks', (req, res) => {
  const drinks = getAllDrinks();
  res.json(drinks);
});

app.get('/api/drinks/:id', (req, res) => {
  const { id } = req.params;
  const drink = getDrink(parseInt(id, 10));

  if (!drink) {
    return res.status(404).json({ error: '饮品不存在' });
  }

  res.json(drink);
});

app.post('/api/orders', (req, res) => {
  try {
    const { customerId, drinkId, quantity } = req.body;

    if (!customerId || !drinkId || !quantity) {
      return res.status(400).json({ error: '缺少必要参数' });
    }

    if (quantity < 1 || quantity > 5) {
      return res.status(400).json({ error: '数量必须在1-5之间' });
    }

    const drink = getDrink(drinkId);
    if (!drink) {
      return res.status(404).json({ error: '饮品不存在' });
    }

    const totalPrice = Number((drink.price * quantity).toFixed(2));
    const order = createOrder(customerId, drinkId, quantity, totalPrice);

    const pointsEarned = Math.floor(totalPrice / 10);
    if (pointsEarned > 0) {
      updateCustomerPoints(customerId, pointsEarned);
    }

    const customer = getCustomer(customerId);

    res.json({
      success: true,
      order,
      customer,
      pointsEarned,
      message: '点单成功！',
    });
  } catch (error) {
    console.error('点单错误:', error);
    res.status(500).json({ error: '点单失败，请稍后重试' });
  }
});

app.get('/api/orders/:customerId', (req, res) => {
  const { customerId } = req.params;
  const { days } = req.query;
  const daysNum = days ? parseInt(days as string, 10) : 30;

  const orders = getCustomerOrders(customerId, daysNum);
  res.json(orders);
});

app.get('/api/recommendations/:customerId', (req, res) => {
  const { customerId } = req.params;

  const startTime = Date.now();
  const recommendations = calculateRecommendations(customerId);
  const endTime = Date.now();

  res.json({
    recommendations,
    calculationTime: endTime - startTime,
  });
});

app.get('/api/ranking', (req, res) => {
  const customers = getAllCustomers();
  res.json(customers);
});

app.get('/api/stats/sales', (req, res) => {
  const stats = getSalesStats();
  res.json(stats);
});

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: Date.now() });
});

app.listen(PORT, () => {
  console.log(`咖啡馆后端服务运行在 http://localhost:${PORT}`);
});
