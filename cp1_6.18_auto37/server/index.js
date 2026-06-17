import express from 'express';
import cors from 'cors';
import { v4 as uuidv4 } from 'uuid';

const app = express();
const PORT = 3001;

app.use(cors());
app.use(express.json());

let notes = [
  {
    id: uuidv4(),
    content: '周末去公园散步，阳光洒在身上特别舒服，感觉整个人都放松下来了。',
    mood: 'sunny-yellow',
    createdAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString()
  },
  {
    id: uuidv4(),
    content: '完成了一个重要的项目，团队一起庆祝，很有成就感！',
    mood: 'mint-green',
    createdAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString()
  },
  {
    id: uuidv4(),
    content: '今天下雨了，听着雨声看书，别有一番滋味。',
    mood: 'sky-blue',
    createdAt: new Date(Date.now() - 4 * 24 * 60 * 60 * 1000).toISOString()
  },
  {
    id: uuidv4(),
    content: '和好朋友聚餐，聊了很多，笑到肚子疼。',
    mood: 'soft-pink',
    createdAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString()
  },
  {
    id: uuidv4(),
    content: '学了一道新菜，虽然卖相一般但味道还不错~',
    mood: 'peach',
    createdAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000 + 3600000).toISOString()
  },
  {
    id: uuidv4(),
    content: '加班到很晚，有点累，但是进度推进了不少。',
    mood: 'lavender',
    createdAt: new Date(Date.now() - 6 * 24 * 60 * 60 * 1000).toISOString()
  },
  {
    id: uuidv4(),
    content: '早上起来看到窗外的朝霞，太美了，新的一周加油！',
    mood: 'coral',
    createdAt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()
  },
  {
    id: uuidv4(),
    content: '读了一本很棒的书，里面的句子让我思考了很久。',
    mood: 'sage',
    createdAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString()
  },
  {
    id: uuidv4(),
    content: '今天的咖啡特别香，工作效率也高了起来。',
    mood: 'sand',
    createdAt: new Date().toISOString()
  },
  {
    id: uuidv4(),
    content: '晚上练了半小时瑜伽，身体舒展了很多。',
    mood: 'aqua',
    createdAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000 + 7200000).toISOString()
  }
];

function getWeekRange(dateStr) {
  const date = new Date(dateStr);
  const day = date.getDay();
  const diff = date.getDate() - day + (day === 0 ? -6 : 1);
  const monday = new Date(date.setDate(diff));
  monday.setHours(0, 0, 0, 0);
  const sunday = new Date(monday);
  sunday.setDate(sunday.getDate() + 6);
  sunday.setHours(23, 59, 59, 999);
  return { start: monday, end: sunday };
}

app.get('/api/notes', (req, res) => {
  const { week } = req.query;
  if (week) {
    const { start, end } = getWeekRange(week);
    const filteredNotes = notes.filter(note => {
      const noteDate = new Date(note.createdAt);
      return noteDate >= start && noteDate <= end;
    });
    return res.json(filteredNotes.sort((a, b) => 
      new Date(b.createdAt) - new Date(a.createdAt)
    ));
  }
  res.json(notes.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)));
});

app.post('/api/notes', (req, res) => {
  const { content, mood, createdAt } = req.body;
  if (!content || !mood) {
    return res.status(400).json({ error: '内容和心情不能为空' });
  }
  const newNote = {
    id: uuidv4(),
    content: content.substring(0, 140),
    mood,
    createdAt: createdAt || new Date().toISOString()
  };
  notes.unshift(newNote);
  res.status(201).json(newNote);
});

app.delete('/api/notes/:id', (req, res) => {
  const { id } = req.params;
  const index = notes.findIndex(note => note.id === id);
  if (index === -1) {
    return res.status(404).json({ error: '便签不存在' });
  }
  notes.splice(index, 1);
  res.json({ success: true });
});

app.listen(PORT, () => {
  console.log(`时光便签后端服务运行在 http://localhost:${PORT}`);
});
