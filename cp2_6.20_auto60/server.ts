import express, { Request, Response } from 'express';
import multer from 'multer';
import cors from 'cors';
import crypto from 'crypto';
import { processStyle, StyleParams, StyleType } from './src/services/styleProcessor';

const app = express();
const PORT = 3001;

const storage = multer.memoryStorage();
const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 }
});

app.use(cors());
app.use(express.json({ limit: '50mb' }));

interface TemporaryImage {
  data: Buffer;
  createdAt: number;
  mimetype: string;
}

const temporaryImages = new Map<string, TemporaryImage>();

setInterval(() => {
  const now = Date.now();
  for (const [key, value] of temporaryImages.entries()) {
    if (now - value.createdAt > 5 * 60 * 1000) {
      temporaryImages.delete(key);
    }
  }
}, 60 * 1000);

app.get('/api/health', (_req: Request, res: Response) => {
  res.json({ status: 'ok' });
});

app.post('/api/process', upload.single('image'), async (req: Request, res: Response) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No image file provided' });
    }

    const style = req.body.style as StyleType;
    const intensity = parseInt(req.body.intensity || '50', 10);
    const contrast = parseInt(req.body.contrast || '0', 10);
    const detail = parseInt(req.body.detail || '100', 10);

    if (!style) {
      return res.status(400).json({ error: 'Style parameter is required' });
    }

    const params: StyleParams = { style, intensity, contrast, detail };
    const processedBuffer = await processStyle(req.file.buffer, params);
    const base64 = processedBuffer.toString('base64');
    const mimetype = req.file.mimetype || 'image/png';

    res.json({
      success: true,
      image: `data:${mimetype};base64,${base64}`,
      mimetype
    });
  } catch (error) {
    console.error('Processing error:', error);
    res.status(500).json({ error: 'Failed to process image' });
  }
});

app.post('/api/share', upload.single('image'), (req: Request, res: Response) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No image file provided' });
    }

    const token = crypto.randomBytes(16).toString('hex');
    temporaryImages.set(token, {
      data: req.file.buffer,
      createdAt: Date.now(),
      mimetype: req.file.mimetype || 'image/png'
    });

    const shareUrl = `/api/share/${token}`;
    res.json({ success: true, url: shareUrl, token });
  } catch (error) {
    console.error('Share error:', error);
    res.status(500).json({ error: 'Failed to create share link' });
  }
});

app.get('/api/share/:token', (req: Request, res: Response) => {
  const { token } = req.params;
  const temp = temporaryImages.get(token);

  if (!temp) {
    return res.status(404).send('Image not found or expired');
  }

  if (Date.now() - temp.createdAt > 5 * 60 * 1000) {
    temporaryImages.delete(token);
    return res.status(404).send('Image link has expired');
  }

  res.setHeader('Content-Type', temp.mimetype);
  res.setHeader('Cache-Control', 'public, max-age=300');
  res.send(temp.data);
});

app.listen(PORT, () => {
  console.log(`Style transfer server running on port ${PORT}`);
});
