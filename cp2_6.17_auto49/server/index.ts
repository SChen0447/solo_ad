import express from 'express';
import cors from 'cors';
import multer from 'multer';

const app = express();
app.use(cors());
app.use(express.json({ limit: '15mb' }));

const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 10 * 1024 * 1024 } });

interface Pixel {
  r: number;
  g: number;
  b: number;
}

interface Centroid {
  r: number;
  g: number;
  b: number;
  count: number;
}

function rgbToHex(r: number, g: number, b: number): string {
  return '#' + [r, g, b].map(v => Math.round(v).toString(16).padStart(2, '0')).join('');
}

function distance(a: Pixel, b: Centroid): number {
  const dr = a.r - b.r;
  const dg = a.g - b.g;
  const db = a.b - b.b;
  return dr * dr + dg * dg + db * db;
}

function kMeans(pixels: Pixel[], k: number, maxIter: number = 20): Centroid[] {
  const step = Math.max(1, Math.floor(pixels.length / k));
  let centroids: Centroid[] = [];
  for (let i = 0; i < k; i++) {
    const p = pixels[i * step];
    centroids.push({ r: p.r, g: p.g, b: p.b, count: 0 });
  }

  const assignments = new Uint8Array(pixels.length);

  for (let iter = 0; iter < maxIter; iter++) {
    for (let i = 0; i < pixels.length; i++) {
      let minDist = Infinity;
      let minIdx = 0;
      for (let j = 0; j < k; j++) {
        const d = distance(pixels[i], centroids[j]);
        if (d < minDist) {
          minDist = d;
          minIdx = j;
        }
      }
      assignments[i] = minIdx;
    }

    const newCentroids: Centroid[] = centroids.map(() => ({ r: 0, g: 0, b: 0, count: 0 }));

    for (let i = 0; i < pixels.length; i++) {
      const idx = assignments[i];
      newCentroids[idx].r += pixels[i].r;
      newCentroids[idx].g += pixels[i].g;
      newCentroids[idx].b += pixels[i].b;
      newCentroids[idx].count++;
    }

    let converged = true;
    for (let j = 0; j < k; j++) {
      if (newCentroids[j].count === 0) {
        newCentroids[j] = centroids[j];
        continue;
      }
      const nr = newCentroids[j].r / newCentroids[j].count;
      const ng = newCentroids[j].g / newCentroids[j].count;
      const nb = newCentroids[j].b / newCentroids[j].count;
      if (Math.abs(nr - centroids[j].r) > 1 || Math.abs(ng - centroids[j].g) > 1 || Math.abs(nb - centroids[j].b) > 1) {
        converged = false;
      }
      newCentroids[j].r = nr;
      newCentroids[j].g = ng;
      newCentroids[j].b = nb;
    }

    centroids = newCentroids;
    if (converged) break;
  }

  return centroids;
}

function extractPixelsFromBuffer(buffer: Buffer): Pixel[] {
  const width = buffer.readUInt32BE(16);
  const height = buffer.readUInt32BE(20);
  const bpp = buffer.readUInt8(25);
  const pixelData = buffer.slice(buffer.readUInt32BE(28));

  const pixels: Pixel[] = [];
  const stride = Math.ceil((width * bpp) / 8);
  const maxPixels = 10000;
  const step = Math.max(1, Math.floor((width * height) / maxPixels));

  let idx = 0;
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      if (idx % step === 0) {
        const offset = y * stride + x * (bpp / 8);
        if (offset + 2 < pixelData.length) {
          pixels.push({
            r: pixelData[offset],
            g: pixelData[offset + 1],
            b: pixelData[offset + 2],
          });
        }
      }
      idx++;
    }
  }

  return pixels;
}

app.post('/api/extract-colors', upload.single('image'), (req: express.Request, res: express.Response) => {
  try {
    const file = req.file;
    if (!file || !file.buffer) {
      res.status(400).json({ error: 'No image provided' });
      return;
    }

    const buffer = file.buffer;
    const mime = file.mimetype;

    let pixels: Pixel[];

    if (mime === 'image/png') {
      pixels = extractPixelsFromPng(buffer);
    } else {
      pixels = extractPixelsFallback(buffer);
    }

    if (pixels.length < 5) {
      res.status(400).json({ error: 'Image too small or invalid' });
      return;
    }

    const centroids = kMeans(pixels, 5);

    const total = centroids.reduce((s, c) => s + c.count, 0);
    const colors = centroids
      .map(c => ({
        hex: rgbToHex(c.r, c.g, c.b),
        percentage: (c.count / total) * 100,
      }))
      .sort((a, b) => b.percentage - a.percentage);

    res.json({ colors });
  } catch (err) {
    console.error('Extraction error:', err);
    res.status(500).json({ error: 'Color extraction failed' });
  }
});

function extractPixelsFromPng(buffer: Buffer): Pixel[] {
  try {
    const zlib = require('zlib');
    const signature = buffer.slice(0, 8).toString('hex');
    if (signature !== '89504e470d0a1a0a') {
      return extractPixelsFallback(buffer);
    }

    let offset = 8;
    let width = 0, height = 0, bpp = 8, colorType = 2;
    let idatData: Buffer[] = [];

    while (offset < buffer.length) {
      const length = buffer.readUInt32BE(offset);
      const type = buffer.slice(offset + 4, offset + 8).toString('ascii');

      if (type === 'IHDR') {
        width = buffer.readUInt32BE(offset + 8);
        height = buffer.readUInt32BE(offset + 12);
        bpp = buffer[offset + 16];
        colorType = buffer[offset + 17];
      } else if (type === 'IDAT') {
        idatData.push(buffer.slice(offset + 8, offset + 8 + length));
      } else if (type === 'IEND') {
        break;
      }

      offset += 12 + length;
    }

    const compressed = Buffer.concat(idatData);
    const raw = zlib.unzipSync(compressed);

    const channels = colorType === 2 ? 3 : colorType === 6 ? 4 : 3;
    const stride = 1 + width * channels;
    const pixels: Pixel[] = [];
    const maxPixels = 10000;
    const step = Math.max(1, Math.floor((width * height) / maxPixels));

    let idx = 0;
    for (let y = 0; y < height; y++) {
      const rowStart = y * stride;
      for (let x = 0; x < width; x++) {
        if (idx % step === 0) {
          const px = rowStart + 1 + x * channels;
          if (px + 2 < raw.length) {
            pixels.push({ r: raw[px], g: raw[px + 1], b: raw[px + 2] });
          }
        }
        idx++;
      }
    }

    return pixels.length > 0 ? pixels : extractPixelsFallback(buffer);
  } catch {
    return extractPixelsFallback(buffer);
  }
}

function extractPixelsFallback(buffer: Buffer): Pixel[] {
  const pixels: Pixel[] = [];
  const step = Math.max(3, Math.floor(buffer.length / 10000));
  for (let i = 0; i < buffer.length - 2; i += step) {
    pixels.push({ r: buffer[i], g: buffer[i + 1], b: buffer[i + 2] });
    if (pixels.length >= 10000) break;
  }
  return pixels;
}

const sessionStore: Map<string, object> = new Map();

app.get('/api/session/:id', (req: express.Request, res: express.Response) => {
  const data = sessionStore.get(req.params.id);
  if (data) {
    res.json(data);
  } else {
    res.status(404).json({ error: 'Session not found' });
  }
});

const PORT = 3001;
app.listen(PORT, () => {
  console.log(`Color extraction server running on port ${PORT}`);
});

export { sessionStore };
