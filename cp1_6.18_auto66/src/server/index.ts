import express from 'express';
import cors from 'cors';
import authRoutes from './routes/auth.js';
import productRoutes from './routes/products.js';
import reviewRoutes from './routes/reviews.js';

const app = express();
const PORT = 3001;

app.use(cors());
app.use(express.json());

app.use('/api/user', authRoutes);
app.use('/api/product', productRoutes);
app.use('/api/review', reviewRoutes);

app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok' });
});

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
