import express from 'express';
import cors from 'cors';
import { v4 as uuidv4 } from 'uuid';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = 3001;
const DATA_FILE = path.join(__dirname, 'diaries.json');

app.use(cors());
app.use(express.json({ limit: '10mb' }));

export type EmotionTag = {
  type: string;
  intensity: number;
};

export type Diary = {
  id: string;
  content: string;
  emotions: EmotionTag[];
  createdAt: number;
  date: string;
};

function ensureDataFile(): void {
  if (!fs.existsSync(DATA_FILE)) {
    fs.writeFileSync(DATA_FILE, JSON.stringify([]), 'utf-8');
  }
}

function readDiaries(): Diary[] {
  ensureDataFile();
  const raw = fs.readFileSync(DATA_FILE, 'utf-8');
  try {
    return JSON.parse(raw) as Diary[];
  } catch {
    return [];
  }
}

function writeDiaries(diaries: Diary[]): void {
  ensureDataFile();
  fs.writeFileSync(DATA_FILE, JSON.stringify(diaries, null, 2), 'utf-8');
}

function formatDate(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

app.get('/api/diaries', (req, res) => {
  const { startDate, endDate, emotions } = req.query;
  let diaries = readDiaries();

  if (startDate) {
    const s = String(startDate);
    diaries = diaries.filter((d) => d.date >= s);
  }
  if (endDate) {
    const e = String(endDate);
    diaries = diaries.filter((d) => d.date <= e);
  }
  if (emotions) {
    const filterEmotions = String(emotions).split(',').filter(Boolean);
    if (filterEmotions.length > 0) {
      diaries = diaries.filter((d) =>
        d.emotions.some((em) => filterEmotions.includes(em.type))
      );
    }
  }

  diaries.sort((a, b) => b.createdAt - a.createdAt);
  res.json(diaries);
});

app.get('/api/diaries/:id', (req, res) => {
  const { id } = req.params;
  const diaries = readDiaries();
  const diary = diaries.find((d) => d.id === id);
  if (!diary) {
    return res.status(404).json({ error: '日记不存在' });
  }
  res.json(diary);
});

app.post('/api/diaries', (req, res) => {
  const { content, emotions } = req.body as {
    content?: string;
    emotions?: EmotionTag[];
  };

  if (!content || content.trim().length === 0) {
    return res.status(400).json({ error: '日记内容不能为空' });
  }
  if (content.length > 2000) {
    return res.status(400).json({ error: '日记内容最多2000字' });
  }
  if (!emotions || emotions.length < 1 || emotions.length > 2) {
    return res.status(400).json({ error: '请选择1-2个情绪标签' });
  }
  for (const e of emotions) {
    if (typeof e.intensity !== 'number' || e.intensity < 0 || e.intensity > 5) {
      return res.status(400).json({ error: '情绪强度必须在0-5之间' });
    }
  }

  const now = Date.now();
  const diary: Diary = {
    id: uuidv4(),
    content: content.trim(),
    emotions,
    createdAt: now,
    date: formatDate(new Date(now)),
  };

  const diaries = readDiaries();
  diaries.push(diary);
  writeDiaries(diaries);

  res.status(201).json(diary);
});

app.put('/api/diaries/:id', (req, res) => {
  const { id } = req.params;
  const { content, emotions } = req.body as {
    content?: string;
    emotions?: EmotionTag[];
  };

  if (!content || content.trim().length === 0) {
    return res.status(400).json({ error: '日记内容不能为空' });
  }
  if (content.length > 2000) {
    return res.status(400).json({ error: '日记内容最多2000字' });
  }
  if (!emotions || emotions.length < 1 || emotions.length > 2) {
    return res.status(400).json({ error: '请选择1-2个情绪标签' });
  }
  for (const e of emotions) {
    if (typeof e.intensity !== 'number' || e.intensity < 0 || e.intensity > 5) {
      return res.status(400).json({ error: '情绪强度必须在0-5之间' });
    }
  }

  const diaries = readDiaries();
  const idx = diaries.findIndex((d) => d.id === id);
  if (idx === -1) {
    return res.status(404).json({ error: '日记不存在' });
  }

  diaries[idx] = {
    ...diaries[idx],
    content: content.trim(),
    emotions,
  };
  writeDiaries(diaries);

  res.json(diaries[idx]);
});

app.delete('/api/diaries/:id', (req, res) => {
  const { id } = req.params;
  const diaries = readDiaries();
  const filtered = diaries.filter((d) => d.id !== id);
  if (filtered.length === diaries.length) {
    return res.status(404).json({ error: '日记不存在' });
  }
  writeDiaries(filtered);
  res.json({ success: true });
});

app.get('/api/stats', (req, res) => {
  const { range = '7' } = req.query;
  const days = parseInt(String(range), 10);
  const diaries = readDiaries();

  const result: {
    date: string;
    快乐: number;
    悲伤: number;
    愤怒: number;
    平静: number;
    焦虑: number;
    惊喜: number;
    primary: string;
  }[] = [];

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(d.getDate() - i);
    const dateStr = formatDate(d);
    const dayDiaries = diaries.filter((x) => x.date === dateStr);

    const sums: Record<string, number> = {
      快乐: 0, 悲伤: 0, 愤怒: 0, 平静: 0, 焦虑: 0, 惊喜: 0,
    };

    for (const diary of dayDiaries) {
      for (const e of diary.emotions) {
        if (sums[e.type] !== undefined) {
          sums[e.type] += e.intensity;
        }
      }
    }

    let primary = '平静';
    let maxVal = -1;
    for (const k of Object.keys(sums)) {
      if (sums[k] > maxVal) {
        maxVal = sums[k];
        primary = k;
      }
    }
    if (maxVal === 0) primary = '-';

    result.push({
      date: dateStr,
      快乐: sums['快乐'],
      悲伤: sums['悲伤'],
      愤怒: sums['愤怒'],
      平静: sums['平静'],
      焦虑: sums['焦虑'],
      惊喜: sums['惊喜'],
      primary,
    });
  }

  res.json(result);
});

app.post('/api/import', (req, res) => {
  const { data } = req.body as { data?: Diary[] };
  if (!Array.isArray(data)) {
    return res.status(400).json({ error: '数据格式错误' });
  }
  const valid = data.filter(
    (d) =>
      d.id &&
      typeof d.content === 'string' &&
      Array.isArray(d.emotions) &&
      typeof d.createdAt === 'number' &&
      typeof d.date === 'string'
  );
  writeDiaries(valid);
  res.json({ imported: valid.length });
});

app.listen(PORT, () => {
  console.log(`后端服务运行在 http://localhost:${PORT}`);
});
