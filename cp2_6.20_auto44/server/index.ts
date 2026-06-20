import express from 'express';
import cors from 'cors';
import { upload } from './middleware/upload';
import { uploadImage } from './controllers/uploadController';
import { applyStyle } from './controllers/styleController';
import { createShareLink, getSharedImage } from './controllers/shareController';

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

app.post('/api/upload', upload.single('image'), uploadImage);
app.post('/api/style', applyStyle);
app.post('/api/share', createShareLink);
app.get('/api/share/:id', getSharedImage);

app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: Date.now() });
});

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
