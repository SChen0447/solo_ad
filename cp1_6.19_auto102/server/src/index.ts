import express from 'express';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';

import { initDB } from './shared/db.js';
import recipesRouter from './routes/recipes.js';
import usersRouter, { authMiddleware } from './routes/users.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = 3001;

const dataDir = path.resolve(__dirname, '../../data');
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

initDB();

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use('/uploads', express.static(path.join(__dirname, '../../uploads')));

app.use(authMiddleware);

app.use('/api/recipes', recipesRouter);
app.use('/api/users', usersRouter);

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', message: 'Recipe Share API is running' });
});

app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});
