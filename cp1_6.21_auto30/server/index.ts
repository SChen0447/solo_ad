import express from 'express';
import cors from 'cors';
import { v4 as uuidv4 } from 'uuid';
import { createCanvas, loadImage } from 'canvas';
import path from 'path';
import { fileURLToPath } from 'url';
import type { Template, TextElement, ImageElement, BackgroundStyle } from '../src/types';

const __filename = fileURLToPath(import.meta.url);

const app = express();
const PORT = 3001;

app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

const defaultTextStyle = (overrides = {}) => ({
  fontSize: 24,
  fontFamily: 'sans-serif',
  fontWeight: 'bold',
  color: '#333333',
  textAlign: 'center' as const,
  stroke: false,
  strokeColor: '#000000',
  strokeWidth: 2,
  ...overrides,
});

let templates: Template[] = [
  {
    id: 'template-simple-white',
    name: '简约白色',
    thumbnail: 'simple-white',
    canvasWidth: 800,
    canvasHeight: 1200,
    background: {
      type: 'gradient',
      color1: '#FFFFFF',
      color2: '#F5F5F5',
      angle: 180,
    },
    elements: [
      {
        id: 'title-1',
        type: 'text',
        name: '标题',
        x: 100,
        y: 80,
        width: 600,
        height: 80,
        content: '限时特惠 · 新品上市',
        style: defaultTextStyle({
          fontSize: 48,
          fontWeight: 'bold',
          color: '#2C3E50',
          textAlign: 'center',
        }),
      },
      {
        id: 'image-1',
        type: 'image',
        name: '商品图片',
        x: 150,
        y: 200,
        width: 500,
        height: 500,
        src: null,
        rotation: 0,
        scale: 1,
      },
      {
        id: 'price-1',
        type: 'text',
        name: '价格',
        x: 100,
        y: 750,
        width: 600,
        height: 100,
        content: '¥ 99.00',
        style: defaultTextStyle({
          fontSize: 72,
          fontWeight: 'bold',
          color: '#E74C3C',
          textAlign: 'center',
        }),
      },
      {
        id: 'subtitle-1',
        type: 'text',
        name: '副标题',
        x: 100,
        y: 870,
        width: 600,
        height: 50,
        content: '原价 ¥199 · 5折优惠',
        style: defaultTextStyle({
          fontSize: 28,
          fontWeight: 'normal',
          color: '#7F8C8D',
          textAlign: 'center',
          stroke: false,
        }),
      },
      {
        id: 'button-1',
        type: 'text',
        name: '按钮文字',
        x: 200,
        y: 970,
        width: 400,
        height: 70,
        content: '立即抢购',
        style: defaultTextStyle({
          fontSize: 32,
          fontWeight: 'bold',
          color: '#FFFFFF',
          textAlign: 'center',
        }),
      },
    ],
  },
  {
    id: 'template-festival-red',
    name: '节日红色',
    thumbnail: 'festival-red',
    canvasWidth: 800,
    canvasHeight: 1200,
    background: {
      type: 'gradient',
      color1: '#C0392B',
      color2: '#922B21',
      angle: 135,
    },
    elements: [
      {
        id: 'title-2',
        type: 'text',
        name: '标题',
        x: 50,
        y: 60,
        width: 700,
        height: 90,
        content: '新春大促 · 全场5折',
        style: defaultTextStyle({
          fontSize: 52,
          fontWeight: 'bold',
          color: '#FFD700',
          textAlign: 'center',
          stroke: true,
          strokeColor: '#8B0000',
          strokeWidth: 3,
        }),
      },
      {
        id: 'image-2',
        type: 'image',
        name: '商品图片',
        x: 120,
        y: 180,
        width: 560,
        height: 520,
        src: null,
        rotation: 0,
        scale: 1,
      },
      {
        id: 'price-2',
        type: 'text',
        name: '价格',
        x: 80,
        y: 740,
        width: 640,
        height: 110,
        content: '¥ 59.00',
        style: defaultTextStyle({
          fontSize: 80,
          fontWeight: 'bold',
          color: '#FFFFFF',
          textAlign: 'center',
          stroke: true,
          strokeColor: '#FFD700',
          strokeWidth: 4,
        }),
      },
      {
        id: 'subtitle-2',
        type: 'text',
        name: '副标题',
        x: 80,
        y: 870,
        width: 640,
        height: 50,
        content: '满200减50 · 限时抢购',
        style: defaultTextStyle({
          fontSize: 28,
          fontWeight: '500',
          color: '#FFE4B5',
          textAlign: 'center',
        }),
      },
      {
        id: 'button-2',
        type: 'text',
        name: '按钮文字',
        x: 200,
        y: 960,
        width: 400,
        height: 80,
        content: '马上抢',
        style: defaultTextStyle({
          fontSize: 36,
          fontWeight: 'bold',
          color: '#C0392B',
          textAlign: 'center',
        }),
      },
    ],
  },
  {
    id: 'template-ecommerce-yellow',
    name: '电商黄色',
    thumbnail: 'ecommerce-yellow',
    canvasWidth: 800,
    canvasHeight: 1200,
    background: {
      type: 'gradient',
      color1: '#F39C12',
      color2: '#E67E22',
      angle: 160,
    },
    elements: [
      {
        id: 'title-3',
        type: 'text',
        name: '标题',
        x: 60,
        y: 70,
        width: 680,
        height: 85,
        content: '爆款推荐 · 超值必Buy',
        style: defaultTextStyle({
          fontSize: 50,
          fontWeight: 'bold',
          color: '#FFFFFF',
          textAlign: 'center',
          stroke: true,
          strokeColor: '#D35400',
          strokeWidth: 3,
        }),
      },
      {
        id: 'tag-3',
        type: 'text',
        name: '标签',
        x: 60,
        y: 165,
        width: 150,
        height: 45,
        content: 'HOT',
        style: defaultTextStyle({
          fontSize: 24,
          fontWeight: 'bold',
          color: '#FFFFFF',
          textAlign: 'center',
        }),
      },
      {
        id: 'image-3',
        type: 'image',
        name: '商品图片',
        x: 130,
        y: 230,
        width: 540,
        height: 500,
        src: null,
        rotation: 0,
        scale: 1,
      },
      {
        id: 'price-3',
        type: 'text',
        name: '价格',
        x: 80,
        y: 760,
        width: 640,
        height: 100,
        content: '¥ 129.00',
        style: defaultTextStyle({
          fontSize: 72,
          fontWeight: 'bold',
          color: '#C0392B',
          textAlign: 'center',
        }),
      },
      {
        id: 'subtitle-3',
        type: 'text',
        name: '副标题',
        x: 80,
        y: 880,
        width: 640,
        height: 45,
        content: '月销10万+ · 好评如潮',
        style: defaultTextStyle({
          fontSize: 26,
          fontWeight: 'normal',
          color: '#7B241C',
          textAlign: 'center',
        }),
      },
      {
        id: 'button-3',
        type: 'text',
        name: '按钮文字',
        x: 180,
        y: 960,
        width: 440,
        height: 75,
        content: '点击查看详情',
        style: defaultTextStyle({
          fontSize: 32,
          fontWeight: 'bold',
          color: '#FFFFFF',
          textAlign: 'center',
        }),
      },
    ],
  },
];

function drawBackground(ctx: any, background: BackgroundStyle, width: number, height: number) {
  if (background.type === 'solid') {
    ctx.fillStyle = background.color1;
    ctx.fillRect(0, 0, width, height);
  } else {
    const angle = (background.angle || 0) * Math.PI / 180;
    const x1 = width / 2 - Math.cos(angle) * width;
    const y1 = height / 2 - Math.sin(angle) * height;
    const x2 = width / 2 + Math.cos(angle) * width;
    const y2 = height / 2 + Math.sin(angle) * height;
    const gradient = ctx.createLinearGradient(x1, y1, x2, y2);
    gradient.addColorStop(0, background.color1);
    gradient.addColorStop(1, background.color2 || background.color1);
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, width, height);
  }
}

function wrapText(ctx: any, text: string, maxWidth: number): string[] {
  const words = text.split('');
  const lines: string[] = [];
  let currentLine = '';

  for (let i = 0; i < words.length; i++) {
    const testLine = currentLine + words[i];
    const metrics = ctx.measureText(testLine);
    if (metrics.width > maxWidth && currentLine !== '') {
      lines.push(currentLine);
      currentLine = words[i];
    } else {
      currentLine = testLine;
    }
  }
  if (currentLine) {
    lines.push(currentLine);
  }
  return lines.length > 0 ? lines : [''];
}

function drawTextElement(ctx: any, element: TextElement) {
  const { x, y, width, height, content, style } = element;
  const fontSize = style.fontSize;
  const fontWeight = style.fontWeight === 'normal' ? '400' : style.fontWeight;
  ctx.font = `${fontWeight} ${fontSize}px ${style.fontFamily}`;
  ctx.textBaseline = 'middle';

  const lineHeight = fontSize * 1.2;
  const maxWidth = width;
  const lines = wrapText(ctx, content, maxWidth);
  const totalHeight = lines.length * lineHeight;
  let startY = y + height / 2 - totalHeight / 2 + lineHeight / 2;

  if (style.stroke) {
    ctx.strokeStyle = style.strokeColor;
    ctx.lineWidth = style.strokeWidth;
    ctx.lineJoin = 'round';
  }

  lines.forEach((line, index) => {
    let textX = x;
    if (style.textAlign === 'center') {
      ctx.textAlign = 'center';
      textX = x + width / 2;
    } else if (style.textAlign === 'right') {
      ctx.textAlign = 'right';
      textX = x + width;
    } else {
      ctx.textAlign = 'left';
    }

    const lineY = startY + index * lineHeight;

    if (style.stroke) {
      ctx.strokeText(line, textX, lineY);
    }
    ctx.fillStyle = style.color;
    ctx.fillText(line, textX, lineY);
  });
}

async function drawImageElement(ctx: any, element: ImageElement) {
  if (!element.src) {
    ctx.fillStyle = 'rgba(200, 200, 200, 0.3)';
    ctx.fillRect(element.x, element.y, element.width, element.height);
    ctx.setLineDash([10, 5]);
    ctx.strokeStyle = '#999';
    ctx.lineWidth = 2;
    ctx.strokeRect(element.x, element.y, element.width, element.height);
    ctx.setLineDash([]);
    ctx.fillStyle = '#666';
    ctx.font = '20px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('点击上传图片', element.x + element.width / 2, element.y + element.height / 2);
    return;
  }

  try {
    const img = await loadImage(element.src);
    ctx.save();
    const cx = element.x + element.width / 2;
    const cy = element.y + element.height / 2;
    ctx.translate(cx, cy);
    ctx.rotate((element.rotation * Math.PI) / 180);
    ctx.scale(element.scale, element.scale);

    const imgRatio = img.width / img.height;
    const targetRatio = element.width / element.height;
    let drawWidth = element.width;
    let drawHeight = element.height;
    let offsetX = -element.width / 2;
    let offsetY = -element.height / 2;

    if (imgRatio > targetRatio) {
      drawHeight = element.height;
      drawWidth = drawHeight * imgRatio;
      offsetX = -drawWidth / 2;
    } else {
      drawWidth = element.width;
      drawHeight = drawWidth / imgRatio;
      offsetY = -drawHeight / 2;
    }

    ctx.beginPath();
    ctx.rect(-element.width / 2, -element.height / 2, element.width, element.height);
    ctx.clip();
    ctx.drawImage(img, offsetX, offsetY, drawWidth, drawHeight);
    ctx.restore();
  } catch (err) {
    console.error('Failed to load image:', err);
    ctx.fillStyle = 'rgba(255, 100, 100, 0.3)';
    ctx.fillRect(element.x, element.y, element.width, element.height);
  }
}

function drawButtonBackground(ctx: any, template: Template) {
  const buttonElements = template.elements.filter(
    (el) => el.type === 'text' && el.name === '按钮文字'
  ) as TextElement[];

  buttonElements.forEach((btn) => {
    const gradient = ctx.createLinearGradient(btn.x, btn.y, btn.x, btn.y + btn.height);
    gradient.addColorStop(0, '#667eea');
    gradient.addColorStop(1, '#764ba2');
    ctx.fillStyle = gradient;
    const radius = 12;
    ctx.beginPath();
    ctx.moveTo(btn.x + radius, btn.y);
    ctx.lineTo(btn.x + btn.width - radius, btn.y);
    ctx.quadraticCurveTo(btn.x + btn.width, btn.y, btn.x + btn.width, btn.y + radius);
    ctx.lineTo(btn.x + btn.width, btn.y + btn.height - radius);
    ctx.quadraticCurveTo(btn.x + btn.width, btn.y + btn.height, btn.x + btn.width - radius, btn.y + btn.height);
    ctx.lineTo(btn.x + radius, btn.y + btn.height);
    ctx.quadraticCurveTo(btn.x, btn.y + btn.height, btn.x, btn.y + btn.height - radius);
    ctx.lineTo(btn.x, btn.y + radius);
    ctx.quadraticCurveTo(btn.x, btn.y, btn.x + radius, btn.y);
    ctx.closePath();
    ctx.fill();
  });

  const tagElements = template.elements.filter(
    (el) => el.type === 'text' && el.name === '标签'
  ) as TextElement[];

  tagElements.forEach((tag) => {
    ctx.fillStyle = '#E74C3C';
    const radius = 8;
    ctx.beginPath();
    ctx.moveTo(tag.x + radius, tag.y);
    ctx.lineTo(tag.x + tag.width - radius, tag.y);
    ctx.quadraticCurveTo(tag.x + tag.width, tag.y, tag.x + tag.width, tag.y + radius);
    ctx.lineTo(tag.x + tag.width, tag.y + tag.height - radius);
    ctx.quadraticCurveTo(tag.x + tag.width, tag.y + tag.height, tag.x + tag.width - radius, tag.y + tag.height);
    ctx.lineTo(tag.x + radius, tag.y + tag.height);
    ctx.quadraticCurveTo(tag.x, tag.y + tag.height, tag.x, tag.y + tag.height - radius);
    ctx.lineTo(tag.x, tag.y + radius);
    ctx.quadraticCurveTo(tag.x, tag.y, tag.x + radius, tag.y);
    ctx.closePath();
    ctx.fill();
  });
}

app.get('/api/templates', (_req, res) => {
  res.json(templates);
});

app.get('/api/templates/:id', (req, res) => {
  const template = templates.find((t) => t.id === req.params.id);
  if (!template) {
    res.status(404).json({ error: 'Template not found' });
    return;
  }
  res.json(template);
});

app.post('/api/templates', (req, res) => {
  const newTemplate: Template = {
    ...req.body,
    id: uuidv4(),
  };
  templates.push(newTemplate);
  res.status(201).json(newTemplate);
});

app.put('/api/templates/:id', (req, res) => {
  const idx = templates.findIndex((t) => t.id === req.params.id);
  if (idx === -1) {
    res.status(404).json({ error: 'Template not found' });
    return;
  }
  templates[idx] = { ...templates[idx], ...req.body };
  res.json(templates[idx]);
});

app.delete('/api/templates/:id', (req, res) => {
  const idx = templates.findIndex((t) => t.id === req.params.id);
  if (idx === -1) {
    res.status(404).json({ error: 'Template not found' });
    return;
  }
  templates.splice(idx, 1);
  res.status(204).send();
});

app.post('/api/export', async (req, res) => {
  try {
    const { template, size } = req.body;
    const scaleX = size.width / template.canvasWidth;
    const scaleY = size.height / template.canvasHeight;

    const canvas = createCanvas(size.width, size.height);
    const ctx = canvas.getContext('2d');

    ctx.scale(scaleX, scaleY);

    drawBackground(ctx, template.background, template.canvasWidth, template.canvasHeight);

    drawButtonBackground(ctx, template);

    for (const element of template.elements) {
      if (element.type === 'image') {
        await drawImageElement(ctx, element as ImageElement);
      } else {
        drawTextElement(ctx, element as TextElement);
      }
    }

    const buffer = canvas.toBuffer('image/png');
    res.setHeader('Content-Type', 'image/png');
    res.setHeader('Content-Disposition', `attachment; filename="poster-${Date.now()}.png"`);
    res.setHeader('Content-Length', buffer.length);
    res.send(buffer);
  } catch (err) {
    console.error('Export error:', err);
    res.status(500).json({ error: 'Export failed' });
  }
});

app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});
