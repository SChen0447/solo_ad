import sharp from 'sharp';

export type StyleType = 'watercolor' | 'oil' | 'sketch' | 'pixel' | 'impressionism';

export interface StyleParams {
  style: StyleType;
  intensity: number;
  contrast: number;
  detail: number;
}

function clamp(v: number, min: number, max: number): number {
  return v < min ? min : v > max ? max : v;
}

function clampByte(v: number): number {
  return v < 0 ? 0 : v > 255 ? 255 : (v | 0);
}

function applyContrast(img: sharp.Sharp, level: number): sharp.Sharp {
  const m = level;
  const b = -(128 * (m - 1));
  return img.linear(m, b);
}

async function toRgba(buf: Buffer, maxDim = 1400): Promise<{ data: Uint8ClampedArray; width: number; height: number }> {
  const meta = await sharp(buf).metadata();
  let w = meta.width || 1;
  let h = meta.height || 1;
  const scale = Math.min(1, maxDim / Math.max(w, h));
  if (scale < 1) {
    w = Math.round(w * scale);
    h = Math.round(h * scale);
  }
  const raw = await sharp(buf).resize(w, h).ensureAlpha().raw().toBuffer();
  return { data: new Uint8ClampedArray(raw.buffer, raw.byteOffset, raw.byteLength), width: w, height: h };
}

async function fromRgba(data: Uint8ClampedArray, w: number, h: number): Promise<Buffer> {
  return await sharp(Buffer.from(data.buffer, data.byteOffset, data.byteLength), {
    raw: { width: w, height: h, channels: 4 }
  })
    .png()
    .toBuffer();
}

// ============ 水彩：自适应颜色扩散（边缘保持滤波） ============
function watercolorDiffuse(
  src: Uint8ClampedArray,
  w: number,
  h: number,
  intensity: number,
  detail: number
): Uint8ClampedArray {
  const dst = new Uint8ClampedArray(src.length);
  dst.set(src);
  const radius = 2 + Math.round((intensity / 100) * 5);
  const colorSigma = 20 + (150 - detail) * 0.5;
  const colorSigma2 = colorSigma * colorSigma;
  const spaceSigma2 = (radius * radius) / 2;
  const iterations = 1 + Math.round((intensity / 100) * 2);

  let curr = new Uint8ClampedArray(src);
  let next = new Uint8ClampedArray(src.length);

  for (let it = 0; it < iterations; it++) {
    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        const idx = (y * w + x) * 4;
        const cr = curr[idx];
        const cg = curr[idx + 1];
        const cb = curr[idx + 2];

        let sr = 0, sg = 0, sb = 0, sa = 0, wsum = 0;

        for (let dy = -radius; dy <= radius; dy++) {
          const yy = y + dy;
          if (yy < 0 || yy >= h) continue;
          for (let dx = -radius; dx <= radius; dx++) {
            const xx = x + dx;
            if (xx < 0 || xx >= w) continue;
            const nIdx = (yy * w + xx) * 4;
            const dr = curr[nIdx] - cr;
            const dg = curr[nIdx + 1] - cg;
            const db = curr[nIdx + 2] - cb;
            const colorDist2 = dr * dr + dg * dg + db * db;
            const spaceDist2 = dx * dx + dy * dy;
            const ww =
              Math.exp(-spaceDist2 / spaceSigma2) *
              Math.exp(-colorDist2 / (colorSigma2 + 1));
            sr += curr[nIdx] * ww;
            sg += curr[nIdx + 1] * ww;
            sb += curr[nIdx + 2] * ww;
            sa += curr[nIdx + 3] * ww;
            wsum += ww;
          }
        }
        if (wsum > 0) {
          next[idx] = clampByte(sr / wsum);
          next[idx + 1] = clampByte(sg / wsum);
          next[idx + 2] = clampByte(sb / wsum);
          next[idx + 3] = clampByte(sa / wsum);
        } else {
          next[idx] = cr; next[idx + 1] = cg; next[idx + 2] = cb; next[idx + 3] = curr[idx + 3];
        }
      }
    }
    const tmp = curr; curr = next; next = tmp;
  }
  return curr;
}

// ============ 素描：Sobel梯度幅值合并 + 向量化纸纹 ============
function sobelMagnitude(gray: Uint8ClampedArray, w: number, h: number): Uint8ClampedArray {
  const out = new Uint8ClampedArray(w * h);
  for (let y = 1; y < h - 1; y++) {
    for (let x = 1; x < w - 1; x++) {
      const i = y * w + x;
      const tl = gray[i - w - 1], tc = gray[i - w], tr = gray[i - w + 1];
      const ml = gray[i - 1],                       mr = gray[i + 1];
      const bl = gray[i + w - 1], bc = gray[i + w], br = gray[i + w + 1];
      const gx = -tl - 2 * ml - bl + tr + 2 * mr + br;
      const gy = -tl - 2 * tc - tr + bl + 2 * bc + br;
      const mag = Math.sqrt(gx * gx + gy * gy);
      out[i] = clampByte(mag);
    }
  }
  return out;
}

function dodgeBlend(base: Uint8ClampedArray, blend: Uint8ClampedArray, w: number, h: number): Uint8ClampedArray {
  const out = new Uint8ClampedArray(w * h);
  for (let i = 0; i < w * h; i++) {
    const b = base[i];
    const s = 255 - blend[i];
    out[i] = s === 0 ? 255 : clampByte((b * 255) / s);
  }
  return out;
}

function vectorizedPaperNoise(w: number, h: number, strength: number): Uint8ClampedArray {
  const len = w * h * 3;
  const out = new Uint8ClampedArray(len);
  // 向量化填充：用 Float32Array 批量计算
  const random = new Float32Array(len);
  for (let i = 0; i < len; i++) random[i] = (Math.random() - 0.5) * 2 * strength;
  const baseR = 245, baseG = 242, baseB = 235;
  for (let i = 0; i < len; i += 3) {
    out[i] = clampByte(baseR + random[i]);
    out[i + 1] = clampByte(baseG + random[i + 1]);
    out[i + 2] = clampByte(baseB + random[i + 2]);
  }
  return out;
}

function boxBlurGray(src: Uint8ClampedArray, w: number, h: number, r: number): Uint8ClampedArray {
  const out = new Uint8ClampedArray(w * h);
  const tmp = new Uint8ClampedArray(w * h);
  // horizontal
  for (let y = 0; y < h; y++) {
    let sum = 0;
    for (let x = -r; x <= r; x++) sum += src[y * w + clamp(x, 0, w - 1)];
    for (let x = 0; x < w; x++) {
      tmp[y * w + x] = sum / (2 * r + 1);
      sum -= src[y * w + clamp(x - r, 0, w - 1)];
      sum += src[y * w + clamp(x + r + 1, 0, w - 1)];
    }
  }
  // vertical
  for (let x = 0; x < w; x++) {
    let sum = 0;
    for (let y = -r; y <= r; y++) sum += tmp[clamp(y, 0, h - 1) * w + x];
    for (let y = 0; y < h; y++) {
      out[y * w + x] = sum / (2 * r + 1);
      sum -= tmp[clamp(y - r, 0, h - 1) * w + x];
      sum += tmp[clamp(y + r + 1, 0, h - 1) * w + x];
    }
  }
  return out;
}

// ============ 像素：自适应调色板量化 ============
function adaptivePaletteQuantize(
  src: Uint8ClampedArray,
  w: number,
  h: number,
  paletteSize: number
): Uint32Array {
  // 采样图像得到候选颜色
  const sample = new Uint32Array(paletteSize);
  const sampleCount = Math.min(w * h, 20000);
  const step = Math.max(1, Math.floor((w * h) / sampleCount));

  // 简单中位切分的近似：把颜色空间按重要性分箱
  const bins: number[][] = [];
  const binCount = 64;
  for (let i = 0; i < binCount; i++) bins.push([]);

  for (let i = 0; i < w * h; i += step) {
    const idx = i * 4;
    const r = src[idx] >> 5;
    const g = src[idx + 1] >> 5;
    const b = src[idx + 2] >> 5;
    const key = (r << 6) | (g << 3) | b;
    bins[key].push(idx);
  }

  // 选出出现频率最高的 paletteSize 个箱的平均色
  const populated = bins.filter(b => b.length > 0).sort((a, b) => b.length - a.length);
  const palette = new Uint32Array(paletteSize);
  const used = Math.min(paletteSize, populated.length);

  for (let k = 0; k < used; k++) {
    const bin = populated[k];
    let sr = 0, sg = 0, sb = 0;
    for (const idx of bin) {
      sr += src[idx];
      sg += src[idx + 1];
      sb += src[idx + 2];
    }
    const n = bin.length;
    palette[k] = (clampByte(sr / n) << 16) | (clampByte(sg / n) << 8) | clampByte(sb / n);
  }

  // 填充剩余调色板（如果采样不够）
  for (let k = used; k < paletteSize; k++) {
    palette[k] = palette[k % Math.max(1, used)];
  }
  return palette;
}

function nearestNeighborQuantize(
  src: Uint8ClampedArray,
  w: number,
  h: number,
  palette: Uint32Array
): Uint8ClampedArray {
  const dst = new Uint8ClampedArray(src.length);
  for (let i = 0; i < w * h; i++) {
    const idx = i * 4;
    const r = src[idx], g = src[idx + 1], b = src[idx + 2];
    let bestD = 1e9;
    let bestColor = palette[0];
    for (let k = 0; k < palette.length; k++) {
      const c = palette[k];
      const dr = r - ((c >> 16) & 0xff);
      const dg = g - ((c >> 8) & 0xff);
      const db = b - (c & 0xff);
      const d = dr * dr + dg * dg + db * db;
      if (d < bestD) { bestD = d; bestColor = c; }
    }
    dst[idx] = (bestColor >> 16) & 0xff;
    dst[idx + 1] = (bestColor >> 8) & 0xff;
    dst[idx + 2] = bestColor & 0xff;
    dst[idx + 3] = src[idx + 3];
  }
  return dst;
}

function pixelDownscaleUpscale(
  src: Uint8ClampedArray,
  w: number,
  h: number,
  blockSize: number
): { data: Uint8ClampedArray; smallW: number; smallH: number } {
  const smallW = Math.max(16, Math.floor(w / blockSize));
  const smallH = Math.max(16, Math.floor(h / blockSize));
  const small = new Uint8ClampedArray(smallW * smallH * 4);
  // 平均降采样
  for (let sy = 0; sy < smallH; sy++) {
    for (let sx = 0; sx < smallW; sx++) {
      let sr = 0, sg = 0, sb = 0, sa = 0, c = 0;
      const y0 = sy * blockSize;
      const x0 = sx * blockSize;
      const y1 = Math.min(h, y0 + blockSize);
      const x1 = Math.min(w, x0 + blockSize);
      for (let y = y0; y < y1; y++) {
        for (let x = x0; x < x1; x++) {
          const idx = (y * w + x) * 4;
          sr += src[idx]; sg += src[idx + 1]; sb += src[idx + 2]; sa += src[idx + 3]; c++;
        }
      }
      const sidx = (sy * smallW + sx) * 4;
      small[sidx] = clampByte(sr / c);
      small[sidx + 1] = clampByte(sg / c);
      small[sidx + 2] = clampByte(sb / c);
      small[sidx + 3] = clampByte(sa / c);
    }
  }
  // 最近邻放大回原尺寸
  const big = new Uint8ClampedArray(w * h * 4);
  for (let y = 0; y < h; y++) {
    const sy = Math.min(smallH - 1, Math.floor(y / blockSize));
    for (let x = 0; x < w; x++) {
      const sx = Math.min(smallW - 1, Math.floor(x / blockSize));
      const sidx = (sy * smallW + sx) * 4;
      const didx = (y * w + x) * 4;
      big[didx] = small[sidx];
      big[didx + 1] = small[sidx + 1];
      big[didx + 2] = small[sidx + 2];
      big[didx + 3] = small[sidx + 3];
    }
  }
  return { data: big, smallW, smallH };
}

// ============ 印象派：随机位置绘制短笔触 ============
function impressionistBrushStrokes(
  src: Uint8ClampedArray,
  w: number,
  h: number,
  intensity: number
): Uint8ClampedArray {
  const dst = new Uint8ClampedArray(src.length);
  dst.set(src);

  const strokeCount = 300 + Math.round((intensity / 100) * 1200);
  const maxLen = 4 + Math.round((intensity / 100) * 8);
  const maxThick = 1 + Math.round((intensity / 100) * 2);

  for (let s = 0; s < strokeCount; s++) {
    const cx = Math.floor(Math.random() * w);
    const cy = Math.floor(Math.random() * h);
    const angle = Math.random() * Math.PI * 2;
    const len = 2 + Math.floor(Math.random() * maxLen);
    const thickness = 1 + Math.floor(Math.random() * maxThick);
    const idx = (cy * w + cx) * 4;
    const cr = clampByte(src[idx] + (Math.random() - 0.5) * 30);
    const cg = clampByte(src[idx + 1] + (Math.random() - 0.5) * 30);
    const cb = clampByte(src[idx + 2] + (Math.random() - 0.5) * 30);
    const alpha = 0.4 + Math.random() * 0.4;
    const ialpha = 1 - alpha;

    const dx = Math.cos(angle);
    const dy = Math.sin(angle);
    const halfLen = len / 2;

    for (let t = -halfLen; t <= halfLen; t += 0.5) {
      const x0 = Math.floor(cx + dx * t);
      const y0 = Math.floor(cy + dy * t);
      for (let oy = -thickness; oy <= thickness; oy++) {
        for (let ox = -thickness; ox <= thickness; ox++) {
          const px = x0 + ox;
          const py = y0 + oy;
          if (px < 0 || py < 0 || px >= w || py >= h) continue;
          const pidx = (py * w + px) * 4;
          dst[pidx] = clampByte(dst[pidx] * ialpha + cr * alpha);
          dst[pidx + 1] = clampByte(dst[pidx + 1] * ialpha + cg * alpha);
          dst[pidx + 2] = clampByte(dst[pidx + 2] * ialpha + cb * alpha);
        }
      }
    }
  }
  return dst;
}

// ============ 油画（保留，做增强） ============
function oilPaintTexture(
  src: Uint8ClampedArray,
  w: number,
  h: number,
  intensity: number
): Uint8ClampedArray {
  const radius = 1 + Math.round((intensity / 100) * 3);
  const levels = 16;
  const dst = new Uint8ClampedArray(src.length);

  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const counts = new Int32Array(levels);
      const sumR = new Float32Array(levels);
      const sumG = new Float32Array(levels);
      const sumB = new Float32Array(levels);

      for (let dy = -radius; dy <= radius; dy++) {
        const yy = clamp(y + dy, 0, h - 1);
        for (let dx = -radius; dx <= radius; dx++) {
          const xx = clamp(x + dx, 0, w - 1);
          const idx = (yy * w + xx) * 4;
          const r = src[idx], g = src[idx + 1], b = src[idx + 2];
          const lum = Math.floor(((r + g + b) / 3) * levels / 256);
          const l = clamp(lum, 0, levels - 1);
          counts[l]++;
          sumR[l] += r; sumG[l] += g; sumB[l] += b;
        }
      }

      let maxI = 0;
      for (let l = 1; l < levels; l++) if (counts[l] > counts[maxI]) maxI = l;
      const n = Math.max(1, counts[maxI]);
      const idx = (y * w + x) * 4;
      dst[idx] = clampByte(sumR[maxI] / n);
      dst[idx + 1] = clampByte(sumG[maxI] / n);
      dst[idx + 2] = clampByte(sumB[maxI] / n);
      dst[idx + 3] = src[idx + 3];
    }
  }
  return dst;
}

// ============ 主入口 ============
export async function applyWatercolor(
  buffer: Buffer,
  intensity: number,
  contrast: number,
  detail: number
): Promise<Buffer> {
  const { data, width, height } = await toRgba(buffer);
  const diffused = watercolorDiffuse(data, width, height, intensity, detail);

  // 叠加轻微细节层
  const contrastLevel = 1 + (contrast / 100) * 0.5;
  const sat = 1 - (intensity / 100) * 0.45;

  const result = await fromRgba(diffused, width, height);
  return await applyContrast(
    sharp(result).modulate({ saturation: sat, brightness: 1.05 }),
    contrastLevel
  ).toBuffer();
}

export async function applyOil(
  buffer: Buffer,
  intensity: number,
  contrast: number,
  detail: number
): Promise<Buffer> {
  const { data, width, height } = await toRgba(buffer);
  const painted = oilPaintTexture(data, width, height, intensity);

  const contrastLevel = 1 + (contrast / 100) * 0.6 + (intensity / 200) * 0.5;
  const sat = 1 + (intensity / 100) * 0.35;

  const result = await fromRgba(painted, width, height);
  return await applyContrast(
    sharp(result).modulate({ saturation: sat, brightness: 1.03 }),
    contrastLevel
  ).toBuffer();
}

export async function applySketch(
  buffer: Buffer,
  intensity: number,
  contrast: number,
  detail: number
): Promise<Buffer> {
  const { data, width, height } = await toRgba(buffer);

  // 向量化灰度化
  const gray = new Uint8ClampedArray(width * height);
  for (let i = 0; i < width * height; i++) {
    const idx = i * 4;
    gray[i] = clampByte(0.299 * data[idx] + 0.587 * data[idx + 1] + 0.114 * data[idx + 2]);
  }

  const blurR = 1 + Math.round((intensity / 100) * 5);
  const blurred = boxBlurGray(gray, width, height, blurR);

  // Dodge 混合（灰度 + 反相模糊）
  const inverted = new Uint8ClampedArray(width * height);
  for (let i = 0; i < width * height; i++) inverted[i] = 255 - blurred[i];
  const dodge = dodgeBlend(gray, inverted, width, height);

  // Sobel 梯度幅值（合并 X+Y）
  const edges = sobelMagnitude(gray, width, height);
  const edgeWeight = 0.4 + (detail / 100) * 0.5;

  // 合并：线条 * (1 - edge * weight)
  const lineArt = new Uint8ClampedArray(width * height);
  for (let i = 0; i < width * height; i++) {
    const eMul = 1 - (edges[i] / 255) * edgeWeight;
    lineArt[i] = clampByte(dodge[i] * eMul);
  }

  // 向量化纸纹噪点（无嵌套 for 性能差问题）
  const noiseStrength = 3 + (intensity / 100) * 8;
  const paperRGB = vectorizedPaperNoise(width, height, noiseStrength);

  // Multiply 纸纹 + 线条
  const out = new Uint8ClampedArray(width * height * 4);
  const finalContrast = 1 + (contrast / 100) * 0.6;
  for (let i = 0; i < width * height; i++) {
    const srcIdx = i * 3;
    const dstIdx = i * 4;
    let r = clampByte((paperRGB[srcIdx] * lineArt[i]) / 255);
    let g = clampByte((paperRGB[srcIdx + 1] * lineArt[i]) / 255);
    let b = clampByte((paperRGB[srcIdx + 2] * lineArt[i]) / 255);
    // 对比度
    r = clampByte((r - 128) * finalContrast + 128);
    g = clampByte((g - 128) * finalContrast + 128);
    b = clampByte((b - 128) * finalContrast + 128);
    out[dstIdx] = r; out[dstIdx + 1] = g; out[dstIdx + 2] = b; out[dstIdx + 3] = 255;
  }

  return await fromRgba(out, width, height);
}

export async function applyPixelArt(
  buffer: Buffer,
  intensity: number,
  contrast: number,
  detail: number
): Promise<Buffer> {
  const { data, width, height } = await toRgba(buffer);

  const blockSize = Math.max(2, Math.round(10 - (detail / 100) * 8 + (intensity / 100) * 5));
  const { data: pixelatedRaw } = pixelDownscaleUpscale(data, width, height, blockSize);

  // 自适应调色板（从降采样结果分析主色调）
  const paletteSize = 8 + Math.round((intensity / 100) * 24);
  const palette = adaptivePaletteQuantize(pixelatedRaw, width, height, paletteSize);

  // 最近邻颜色匹配
  const quantized = nearestNeighborQuantize(pixelatedRaw, width, height, palette);

  // 高对比度 + 饱和
  const contrastLevel = 1 + (contrast / 100) * 0.7;
  const sat = 1 + (intensity / 100) * 0.5;

  const result = await fromRgba(quantized, width, height);
  return await applyContrast(
    sharp(result).modulate({ saturation: sat, brightness: 1.03 }),
    contrastLevel
  ).toBuffer();
}

export async function applyImpressionism(
  buffer: Buffer,
  intensity: number,
  contrast: number,
  detail: number
): Promise<Buffer> {
  const { data, width, height } = await toRgba(buffer);

  // 轻微软化基底
  const blurredBase = watercolorDiffuse(data, width, height, intensity * 0.4, 150 - detail);

  // 叠加真实的短笔触（随机位置/颜色/方向的线段）
  const withStrokes = impressionistBrushStrokes(blurredBase, width, height, intensity);

  const contrastLevel = 1 + (contrast / 100) * 0.5;
  const sat = 1 + (intensity / 100) * 0.45;

  const result = await fromRgba(withStrokes, width, height);
  return await applyContrast(
    sharp(result).modulate({ saturation: sat, brightness: 1.04 }),
    contrastLevel
  ).toBuffer();
}

export async function processStyle(
  buffer: Buffer,
  params: StyleParams
): Promise<Buffer> {
  const intensity = clamp(params.intensity, 0, 100);
  const contrast = clamp(params.contrast, -50, 50);
  const detail = clamp(params.detail, 50, 150);

  switch (params.style) {
    case 'watercolor':    return applyWatercolor(buffer, intensity, contrast, detail);
    case 'oil':           return applyOil(buffer, intensity, contrast, detail);
    case 'sketch':        return applySketch(buffer, intensity, contrast, detail);
    case 'pixel':         return applyPixelArt(buffer, intensity, contrast, detail);
    case 'impressionism': return applyImpressionism(buffer, intensity, contrast, detail);
    default:              return buffer;
  }
}
