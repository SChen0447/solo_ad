import express from 'express';
import cors from 'cors';
import { v4 as uuidv4 } from 'uuid';

const app = express();
const PORT = 3001;

app.use(cors());
app.use(express.json());

const promotions = new Map();

app.post('/api/promotions', (req, res) => {
  const { products, templateId, activityConfig } = req.body;
  
  const promotionId = uuidv4();
  const promotion = {
    id: promotionId,
    products,
    templateId,
    activityConfig,
    createdAt: new Date().toISOString(),
    shareUrl: `http://localhost:5173/promotion/${promotionId}`,
  };
  
  promotions.set(promotionId, promotion);
  
  setTimeout(() => {
    res.json({
      success: true,
      promotionId,
      shareUrl: promotion.shareUrl,
    });
  }, 300);
});

app.get('/api/promotions/:id', (req, res) => {
  const promotion = promotions.get(req.params.id);
  if (!promotion) {
    return res.status(404).json({ success: false, message: '活动不存在' });
  }
  res.json({ success: true, data: promotion });
});

app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});
