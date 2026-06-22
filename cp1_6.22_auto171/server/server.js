const express = require('express');
const cors = require('cors');
const { v4: uuidv4 } = require('uuid');

const app = express();
const PORT = 3001;

app.use(cors({ origin: 'http://localhost:5173' }));
app.use(express.json());

let records = [
  {
    id: uuidv4(),
    text: '今天阳光很好，心情不错，散步时想到一个很棒的项目创意。',
    timestamp: new Date(Date.now() - 6 * 86400000).toISOString(),
    emotion: 'happy',
    isStarred: false,
  },
  {
    id: uuidv4(),
    text: '工作压力有点大，总感觉时间不够用，需要学会更好地安排优先级。',
    timestamp: new Date(Date.now() - 5 * 86400000).toISOString(),
    emotion: 'anxious',
    isStarred: true,
  },
  {
    id: uuidv4(),
    text: '读了一本好书，关于正念冥想的，让我感到内心平静了许多。',
    timestamp: new Date(Date.now() - 4 * 86400000).toISOString(),
    emotion: 'calm',
    isStarred: false,
  },
  {
    id: uuidv4(),
    text: '和朋友聚餐很开心，聊了很多有趣的话题，笑了一晚上。',
    timestamp: new Date(Date.now() - 3 * 86400000).toISOString(),
    emotion: 'happy',
    isStarred: false,
  },
  {
    id: uuidv4(),
    text: '听到一首老歌，突然想起了很多往事，有些伤感。',
    timestamp: new Date(Date.now() - 2 * 86400000).toISOString(),
    emotion: 'sad',
    isStarred: false,
  },
  {
    id: uuidv4(),
    text: '收到了期待已久的offer，激动得说不出话来！',
    timestamp: new Date(Date.now() - 86400000).toISOString(),
    emotion: 'excited',
    isStarred: true,
  },
  {
    id: uuidv4(),
    text: '一个人在公园坐了很久，看着树叶发呆，感觉世界安静了下来。',
    timestamp: new Date(Date.now() - 86400000).toISOString(),
    emotion: 'calm',
    isStarred: false,
  },
  {
    id: uuidv4(),
    text: '今天尝试了新的咖啡店，拿铁很好喝，灵感来了写了一首小诗。',
    timestamp: new Date().toISOString(),
    emotion: 'excited',
    isStarred: false,
  },
  {
    id: uuidv4(),
    text: '面对选择感到焦虑，不知道该走哪条路，但也许答案就在路上。',
    timestamp: new Date().toISOString(),
    emotion: 'anxious',
    isStarred: false,
  },
  {
    id: uuidv4(),
    text: '晚风很温柔，适合散步思考人生。',
    timestamp: new Date().toISOString(),
    emotion: 'calm',
    isStarred: true,
  },
];

const EMOTIONS = ['happy', 'sad', 'anxious', 'calm', 'excited'];

function getWeekRange() {
  const now = new Date();
  const dayOfWeek = now.getDay();
  const monday = new Date(now);
  monday.setDate(now.getDate() - ((dayOfWeek + 6) % 7));
  monday.setHours(0, 0, 0, 0);
  const sunday = new Date(monday);
  sunday.setDate(monday.getDate() + 6);
  sunday.setHours(23, 59, 59, 999);
  return { start: monday, end: sunday };
}

function getWordFrequency(texts) {
  const stopWords = new Set([
    '的', '了', '是', '在', '我', '有', '和', '就', '不', '人',
    '都', '一', '一个', '上', '也', '很', '到', '说', '要', '去',
    '你', '会', '着', '没有', '看', '好', '自己', '这', '他', '她',
    '它', '们', '那', '些', '什么', '吗', '吧', '啊', '呢', '哦',
    '嗯', '但', '但是', '而', '而且', '所以', '因为', '如果', '还',
    '还是', '又', '只', '只是', '已经', '可以', '能', '这个', '那个',
    'the', 'a', 'an', 'is', 'are', 'was', 'were', 'be', 'been',
    'being', 'have', 'has', 'had', 'do', 'does', 'did', 'will',
    'would', 'could', 'should', 'may', 'might', 'can', 'shall',
    'i', 'you', 'he', 'she', 'it', 'we', 'they', 'me', 'him',
    'her', 'us', 'them', 'my', 'your', 'his', 'its', 'our', 'their',
    'and', 'or', 'but', 'not', 'no', 'so', 'if', 'then', 'than',
    'too', 'very', 'just', 'about', 'also', 'of', 'to', 'in', 'for',
    'on', 'with', 'at', 'by', 'from', 'up', 'out', 'into', 'over',
  ]);

  const freq = {};
  texts.forEach((text) => {
    const words = text.split(/[\s,.\-!?;:，。！？；：、""''（）()【】\[\]{}<>\/\\]+/);
    words.forEach((word) => {
      const w = word.trim().toLowerCase();
      if (w.length >= 2 && !stopWords.has(w)) {
        freq[w] = (freq[w] || 0) + 1;
      }
    });
  });

  return Object.entries(freq)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 50)
    .map(([word, count]) => ({ word, count }));
}

app.get('/api/records', (req, res) => {
  const sorted = [...records].sort(
    (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
  );
  res.json(sorted);
});

app.post('/api/records', (req, res) => {
  const { text, emotion } = req.body;
  if (!text || text.trim().length === 0) {
    return res.status(400).json({ error: 'Text is required' });
  }
  if (text.length > 500) {
    return res.status(400).json({ error: 'Text must be under 500 characters' });
  }
  const record = {
    id: uuidv4(),
    text: text.trim(),
    timestamp: new Date().toISOString(),
    emotion: emotion || EMOTIONS[Math.floor(Math.random() * EMOTIONS.length)],
    isStarred: false,
  };
  records.push(record);
  res.status(201).json(record);
});

app.put('/api/records/:id', (req, res) => {
  const { id } = req.params;
  const index = records.findIndex((r) => r.id === id);
  if (index === -1) {
    return res.status(404).json({ error: 'Record not found' });
  }
  const { text, emotion } = req.body;
  if (text !== undefined) records[index].text = text.trim();
  if (emotion !== undefined) records[index].emotion = emotion;
  res.json(records[index]);
});

app.delete('/api/records/:id', (req, res) => {
  const { id } = req.params;
  const index = records.findIndex((r) => r.id === id);
  if (index === -1) {
    return res.status(404).json({ error: 'Record not found' });
  }
  records.splice(index, 1);
  res.status(204).end();
});

app.patch('/api/records/:id/star', (req, res) => {
  const { id } = req.params;
  const index = records.findIndex((r) => r.id === id);
  if (index === -1) {
    return res.status(404).json({ error: 'Record not found' });
  }
  records[index].isStarred = !records[index].isStarred;
  res.json(records[index]);
});

app.get('/api/report/weekly', (req, res) => {
  const { start, end } = getWeekRange();
  const weekRecords = records.filter((r) => {
    const d = new Date(r.timestamp);
    return d >= start && d <= end;
  });

  const dailyData = [];
  for (let i = 0; i < 7; i++) {
    const day = new Date(start);
    day.setDate(start.getDate() + i);
    const dayStr = day.toISOString().split('T')[0];
    const dayRecords = weekRecords.filter(
      (r) => new Date(r.timestamp).toISOString().split('T')[0] === dayStr
    );
    const emotionCounts = {};
    EMOTIONS.forEach((e) => {
      emotionCounts[e] = dayRecords.filter((r) => r.emotion === e).length;
    });
    dailyData.push({
      date: dayStr,
      ...emotionCounts,
    });
  }

  const texts = weekRecords.map((r) => r.text);
  const wordFrequency = getWordFrequency(texts);

  res.json({ dailyData, wordFrequency });
});

app.listen(PORT, () => {
  console.log(`MindTrace server running on http://localhost:${PORT}`);
});
