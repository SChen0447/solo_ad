import express from 'express';
import cors from 'cors';
import { v4 as uuidv4 } from 'uuid';

const app = express();
const PORT = 3001;

app.use(cors());
app.use(express.json({ limit: '10mb' }));

interface WordItem {
  text: string;
  count: number;
  x: number;
  y: number;
  fontSize: number;
  color: string;
  width: number;
  height: number;
}

interface WordCloudData {
  words: WordItem[];
  width: number;
  height: number;
  imageDataUrl: string;
}

interface Capsule {
  id: string;
  text: string;
  tags: string[];
  imageDataUrl: string;
  timestamp: string;
}

interface CapsuleCreate {
  text: string;
  tags: string[];
  imageDataUrl: string;
  timestamp: string;
}

const capsules: Capsule[] = [];

const STOP_WORDS = new Set([
  '的', '了', '和', '是', '就', '都', '而', '及', '与', '着', '或', '一个', '没有', '我们', '你们', '他们',
  '她们', '它们', '自己', '这', '那', '这个', '那个', '这些', '那些', '什么', '怎么', '为什么', '哪',
  '哪里', '谁', '多少', '几', '啊', '呀', '哦', '嗯', '哈', '呢', '吧', '吗', '啦', '呐',
  'the', 'a', 'an', 'and', 'or', 'but', 'is', 'are', 'was', 'were', 'be', 'been', 'being',
  'have', 'has', 'had', 'do', 'does', 'did', 'will', 'would', 'could', 'should', 'may', 'might',
  'can', 'shall', 'to', 'of', 'in', 'for', 'on', 'with', 'at', 'by', 'from', 'as', 'into',
  'through', 'during', 'before', 'after', 'above', 'below', 'between', 'out', 'off', 'over',
  'under', 'again', 'further', 'then', 'once', 'here', 'there', 'when', 'where', 'why', 'how',
  'all', 'each', 'every', 'both', 'few', 'more', 'most', 'other', 'some', 'such', 'no', 'nor',
  'not', 'only', 'own', 'same', 'so', 'than', 'too', 'very', 'just', 'because', 'if', 'while',
  'i', 'me', 'my', 'myself', 'we', 'our', 'ours', 'ourselves', 'you', 'your', 'yours',
  'yourself', 'yourselves', 'he', 'him', 'his', 'himself', 'she', 'her', 'hers', 'herself',
  'it', 'its', 'itself', 'they', 'them', 'their', 'theirs', 'themselves', 'what', 'which',
  'who', 'whom', 'this', 'that', 'these', 'those', 'about', 'up', 'down',
  '我', '你', '他', '她', '它', '们', '也', '还', '要', '会', '能', '可以', '应该',
  '在', '有', '不', '人', '说', '去', '来', '看', '听', '想', '做', '给', '让',
]);

const COLOR_PALETTE = [
  '#EF4444', '#F97316', '#EAB308', '#22C55E', '#3B82F6', '#8B5CF6', '#EC4899',
];

const CANVAS_WIDTH = 640;
const CANVAS_HEIGHT = 480;
const MIN_FONT_SIZE = 12;
const MAX_FONT_SIZE = 48;
const WORD_GAP = 2;

function tokenize(text: string): string[] {
  const tokens: string[] = [];
  const chineseRegex = /[\u4e00-\u9fa5]+/g;
  const englishRegex = /[a-zA-Z]+/g;
  const numberRegex = /\d+/g;

  const chineseMatches = text.match(chineseRegex) || [];
  chineseMatches.forEach(segment => {
    for (let len = 4; len >= 2; len--) {
      for (let i = 0; i + len <= segment.length; i++) {
        tokens.push(segment.slice(i, i + len));
      }
    }
    for (const char of segment) {
      tokens.push(char);
    }
  });

  const englishMatches = text.match(englishRegex) || [];
  englishMatches.forEach(word => {
    if (word.length > 1) {
      tokens.push(word.toLowerCase());
    }
  });

  const numberMatches = text.match(numberRegex) || [];
  numberMatches.forEach(num => {
    if (num.length >= 2) {
      tokens.push(num);
    }
  });

  return tokens;
}

function countWordFrequency(tokens: string[]): Map<string, number> {
  const freqMap = new Map<string, number>();
  for (const token of tokens) {
    if (STOP_WORDS.has(token) || STOP_WORDS.has(token.toLowerCase())) {
      continue;
    }
    if (token.length === 1) {
      continue;
    }
    freqMap.set(token, (freqMap.get(token) || 0) + 1);
  }
  return freqMap;
}

function measureTextWidth(text: string, fontSize: number): number {
  const isChinese = /[\u4e00-\u9fa5]/.test(text);
  if (isChinese) {
    return text.length * fontSize * 0.9;
  }
  return text.length * fontSize * 0.55;
}

function measureTextHeight(fontSize: number): number {
  return fontSize * 1.1;
}

function checkCollision(
  x: number,
  y: number,
  w: number,
  h: number,
  placedWords: WordItem[]
): boolean {
  if (x - w / 2 < WORD_GAP || x + w / 2 > CANVAS_WIDTH - WORD_GAP) return true;
  if (y - h / 2 < WORD_GAP || y + h / 2 > CANVAS_HEIGHT - WORD_GAP) return true;

  for (const pw of placedWords) {
    const gapX = WORD_GAP + Math.abs(x - pw.x);
    const gapY = WORD_GAP + Math.abs(y - pw.y);
    if (gapX < (w + pw.width) / 2 && gapY < (h + pw.height) / 2) {
      return true;
    }
  }
  return false;
}

function spiralLayout(words: { text: string; count: number }[]): WordItem[] {
  const placed: WordItem[] = [];
  const centerX = CANVAS_WIDTH / 2;
  const centerY = CANVAS_HEIGHT / 2;

  if (words.length === 0) return placed;

  const maxCount = Math.max(...words.map(w => w.count));
  const minCount = Math.min(...words.map(w => w.count));
  const countRange = maxCount - minCount || 1;

  const sortedWords = [...words].sort((a, b) => b.count - a.count);
  const topWords = sortedWords.slice(0, 80);

  for (const word of topWords) {
    const normalizedCount = (word.count - minCount) / countRange;
    const fontSize = Math.round(
      MIN_FONT_SIZE + normalizedCount * (MAX_FONT_SIZE - MIN_FONT_SIZE)
    );

    const textWidth = measureTextWidth(word.text, fontSize);
    const textHeight = measureTextHeight(fontSize);

    let placedSuccessfully = false;
    let angle = 0;
    let radius = 0;
    const angleStep = 0.15;
    const radiusStep = 0.5;
    let attempts = 0;
    const maxAttempts = 3000;

    while (attempts < maxAttempts) {
      const x = centerX + radius * Math.cos(angle);
      const y = centerY + radius * Math.sin(angle);

      if (!checkCollision(x, y, textWidth, textHeight, placed)) {
        const color = COLOR_PALETTE[Math.floor(Math.random() * COLOR_PALETTE.length)];
        placed.push({
          text: word.text,
          count: word.count,
          x,
          y,
          fontSize,
          color,
          width: textWidth,
          height: textHeight,
        });
        placedSuccessfully = true;
        break;
      }

      angle += angleStep;
      if (angle >= 2 * Math.PI) {
        angle = 0;
        radius += radiusStep;
      }
      attempts++;
    }

    if (!placedSuccessfully) {
      continue;
    }
  }

  return placed;
}

function generateSvgDataUrl(words: WordItem[]): string {
  let svgContent = `<svg xmlns="http://www.w3.org/2000/svg" width="${CANVAS_WIDTH}" height="${CANVAS_HEIGHT}">`;
  svgContent += `<defs><linearGradient id="bg" x1="0%" y1="0%" x2="100%" y2="100%">`;
  svgContent += `<stop offset="0%" style="stop-color:#1E1B4B"/>`;
  svgContent += `<stop offset="100%" style="stop-color:#312E81"/>`;
  svgContent += `</linearGradient></defs>`;
  svgContent += `<rect width="100%" height="100%" fill="url(#bg)"/>`;

  const noiseRects: string[] = [];
  for (let i = 0; i < 200; i++) {
    const nx = Math.floor(Math.random() * CANVAS_WIDTH);
    const ny = Math.floor(Math.random() * CANVAS_HEIGHT);
    const opacity = Math.random() * 0.04;
    noiseRects.push(`<rect x="${nx}" y="${ny}" width="1" height="1" fill="rgba(255,255,255,${opacity})"/>`);
  }
  svgContent += noiseRects.join('');

  for (const word of words) {
    const fontFamily = "-apple-system, BlinkMacSystemFont, 'PingFang SC', 'Microsoft YaHei', sans-serif";
    svgContent += `<text x="${word.x}" y="${word.y}" fill="${word.color}" font-size="${word.fontSize}" font-weight="bold" text-anchor="middle" dominant-baseline="middle" font-family="${fontFamily}" style="filter: drop-shadow(0 2px 4px rgba(0,0,0,0.3));">${word.text}</text>`;
  }

  svgContent += '</svg>';

  const encoded = encodeURIComponent(svgContent)
    .replace(/'/g, '%27')
    .replace(/"/g, '%22');
  return `data:image/svg+xml;charset=utf-8,${encoded}`;
}

app.post('/api/wordcloud', (req, res) => {
  const startTime = Date.now();
  const { text } = req.body as { text?: string };

  if (!text || typeof text !== 'string') {
    return res.status(400).json({ error: '缺少文本内容' });
  }

  if (text.length > 20000) {
    return res.status(400).json({ error: '文本超过最大长度限制' });
  }

  try {
    const tokens = tokenize(text);
    const freqMap = countWordFrequency(tokens);

    const wordList: { text: string; count: number }[] = [];
    freqMap.forEach((count, text) => {
      wordList.push({ text, count });
    });

    const placedWords = spiralLayout(wordList);
    const imageDataUrl = generateSvgDataUrl(placedWords);

    const result: WordCloudData = {
      words: placedWords,
      width: CANVAS_WIDTH,
      height: CANVAS_HEIGHT,
      imageDataUrl,
    };

    const elapsed = Date.now() - startTime;
    if (elapsed < 300) {
      setTimeout(() => res.json(result), 300 - elapsed);
    } else {
      res.json(result);
    }
  } catch (err) {
    console.error('词云生成错误:', err);
    res.status(500).json({ error: '词云生成失败' });
  }
});

app.get('/api/capsules', (_req, res) => {
  const sorted = [...capsules].sort((a, b) =>
    new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
  );
  res.json(sorted);
});

app.get('/api/capsules/:id', (req, res) => {
  const { id } = req.params;
  const capsule = capsules.find(c => c.id === id);

  if (!capsule) {
    return res.status(404).json({ error: '胶囊不存在' });
  }

  res.json(capsule);
});

app.post('/api/capsules', (req, res) => {
  const body = req.body as CapsuleCreate;

  if (!body.text || !body.imageDataUrl || !body.timestamp) {
    return res.status(400).json({ error: '缺少必要字段' });
  }

  const newCapsule: Capsule = {
    id: uuidv4(),
    text: body.text,
    tags: body.tags || [],
    imageDataUrl: body.imageDataUrl,
    timestamp: body.timestamp,
  };

  capsules.unshift(newCapsule);
  res.status(201).json(newCapsule);
});

app.delete('/api/capsules/:id', (req, res) => {
  const { id } = req.params;
  const index = capsules.findIndex(c => c.id === id);

  if (index === -1) {
    return res.status(404).json({ error: '胶囊不存在' });
  }

  capsules.splice(index, 1);
  res.status(204).send();
});

app.listen(PORT, () => {
  console.log(`词云时间胶囊后端服务运行在 http://localhost:${PORT}`);
});
