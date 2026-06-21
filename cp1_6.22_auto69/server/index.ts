import express, { type Request, type Response } from 'express';
import cors from 'cors';
import sharp from 'sharp';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { templates, type Template } from './templates.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use('/exports', express.static(path.join(__dirname, 'data', 'exports')));

const exportsDir = path.join(__dirname, 'data', 'exports');
const designsDir = path.join(__dirname, 'data', 'designs');

if (!fs.existsSync(exportsDir)) {
  fs.mkdirSync(exportsDir, { recursive: true });
}
if (!fs.existsSync(designsDir)) {
  fs.mkdirSync(designsDir, { recursive: true });
}

app.get('/api/health', (req: Request, res: Response) => {
  res.json({ success: true, message: 'ok' });
});

app.get('/api/templates', (req: Request, res: Response) => {
  res.json({
    success: true,
    templates: templates.map((t: Template) => ({
      id: t.id,
      name: t.name,
      category: t.category,
      thumbnail: t.thumbnail,
      data: t.data,
    })),
  });
});

app.post('/api/designs', (req: Request, res: Response) => {
  try {
    const { name, data } = req.body;
    const id = `design_${Date.now()}`;
    const design = {
      id,
      name,
      data,
      createdAt: new Date().toISOString(),
    };

    const filePath = path.join(designsDir, `${id}.json`);
    fs.writeFileSync(filePath, JSON.stringify(design, null, 2));

    res.json({
      success: true,
      id,
      name,
      createdAt: design.createdAt,
    });
  } catch (error) {
    console.error('Save design error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to save design',
    });
  }
});

app.get('/api/designs', (req: Request, res: Response) => {
  try {
    const files = fs.readdirSync(designsDir).filter(f => f.endsWith('.json'));
    const designs = files.map(file => {
      const content = fs.readFileSync(path.join(designsDir, file), 'utf-8');
      return JSON.parse(content);
    });

    res.json({
      success: true,
      designs,
    });
  } catch (error) {
    console.error('Get designs error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get designs',
    });
  }
});

app.post('/api/export', async (req: Request, res: Response) => {
  try {
    const { dataUrl, dpi = 300 } = req.body;

    if (!dataUrl) {
      return res.status(400).json({
        success: false,
        error: 'No data provided',
      });
    }

    const base64Data = dataUrl.replace(/^data:image\/png;base64,/, '');
    const imageBuffer = Buffer.from(base64Data, 'base64');

    const filename = `poster_${Date.now()}.png`;
    const outputPath = path.join(exportsDir, filename);

    const scale = dpi / 96;

    await sharp(imageBuffer)
      .metadata()
      .then(metadata => {
        const width = metadata.width || 800;
        const height = metadata.height || 1131;

        return sharp(imageBuffer)
          .resize(Math.round(width * scale), Math.round(height * scale), {
            kernel: sharp.kernel.lanczos3,
          })
          .png({
            quality: 100,
            dpi: [dpi, dpi],
          })
          .toFile(outputPath);
      });

    const downloadUrl = `/exports/${filename}`;

    res.json({
      success: true,
      downloadUrl,
      filename,
    });
  } catch (error) {
    console.error('Export error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to export image',
    });
  }
});

app.listen(PORT, () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);
});

export default app;
