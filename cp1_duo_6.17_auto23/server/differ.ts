import { PNG } from 'pngjs';
import pixelmatch from 'pixelmatch';

interface DiffResult {
  heatmapImage: string;
  diffPercent: number;
}

function base64ToPng(base64: string): PNG {
  const dataUrl = base64;
  const matches = dataUrl.match(/^data:image\/(png|svg\+xml);base64,(.+)$/);
  if (!matches) {
    const buf = Buffer.from(base64, 'base64');
    return PNG.sync.read(buf);
  }
  const mimeType = matches[1];
  const b64 = matches[2];

  if (mimeType === 'svg+xml') {
    return svgPlaceholderToPng();
  }

  const buf = Buffer.from(b64, 'base64');
  return PNG.sync.read(buf);
}

function svgPlaceholderToPng(): PNG {
  const width = 200;
  const height = 150;
  const png = new PNG({ width, height });
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const idx = (png.width * y + x) << 2;
      png.data[idx] = 0x2d;
      png.data[idx + 1] = 0x2d;
      png.data[idx + 2] = 0x44;
      png.data[idx + 3] = 255;
    }
  }
  return png;
}

async function computeDiff(imageABase64: string, imageBBase64: string, threshold: number): Promise<DiffResult> {
  let imgA: PNG;
  let imgB: PNG;

  try {
    imgA = base64ToPng(imageABase64);
    imgB = base64ToPng(imageBBase64);
  } catch {
    imgA = svgPlaceholderToPng();
    imgB = svgPlaceholderToPng();
  }

  const width = Math.max(imgA.width, imgB.width);
  const height = Math.max(imgA.height, imgB.height);

  const resizedA = new PNG({ width, height });
  const resizedB = new PNG({ width, height });
  PNG.bitblt(imgA, resizedA, 0, 0, imgA.width, imgA.height, 0, 0);
  PNG.bitblt(imgB, resizedB, 0, 0, imgB.width, imgB.height, 0, 0);

  const diffPng = new PNG({ width, height });
  const numDiffPixels = pixelmatch(
    resizedA.data,
    resizedB.data,
    diffPng.data,
    width,
    height,
    { threshold, includeAA: true }
  );

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const idx = (width * y + x) << 2;
      const r = diffPng.data[idx];
      const g = diffPng.data[idx + 1];
      const b = diffPng.data[idx + 2];

      if (r > 0 || g > 0 || b > 0) {
        const intensity = Math.max(r, g, b);
        if (intensity > 128) {
          diffPng.data[idx] = 243;
          diffPng.data[idx + 1] = 139;
          diffPng.data[idx + 2] = 168;
        } else {
          diffPng.data[idx] = 137;
          diffPng.data[idx + 1] = 180;
          diffPng.data[idx + 2] = 250;
        }
        diffPng.data[idx + 3] = 255;
      } else {
        diffPng.data[idx] = 166;
        diffPng.data[idx + 1] = 227;
        diffPng.data[idx + 2] = 161;
        diffPng.data[idx + 3] = 255;
      }
    }
  }

  const buf = PNG.sync.write(diffPng);
  const heatmapImage = `data:image/png;base64,${buf.toString('base64')}`;
  const diffPercent = (numDiffPixels / (width * height)) * 100;

  return { heatmapImage, diffPercent };
}

export { computeDiff };
