import express from 'express';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
import {
  handleUpload,
  handleGetAssets,
  handleSearch,
  handleDownload,
  handleGetCategories,
} from './assetController.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = 3001;

app.use(cors());
app.use(express.json());

const uploadsDir = path.resolve(__dirname, '../../uploads');
app.use('/uploads', express.static(uploadsDir));

app.post('/api/upload', handleUpload);
app.get('/api/assets', handleGetAssets);
app.get('/api/search', handleSearch);
app.get('/api/download/:id', handleDownload);
app.get('/api/categories', handleGetCategories);

app.listen(PORT, () => {
  console.log(`🚀 后端服务运行于 http://localhost:${PORT}`);
});
