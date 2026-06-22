import express from 'express';
import cors from 'cors';
import recipeRoutes from './routes/recipes.js';

const app = express();
const PORT = 4000;

app.use(cors());
app.use(express.json());

app.use('/api/recipes', recipeRoutes);

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok' });
});

app.listen(PORT, () => {
  console.log(`烘焙食谱后端服务运行于 http://localhost:${PORT}`);
});
