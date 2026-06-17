import express from 'express';
import cors from 'cors';
import { v4 as uuidv4 } from 'uuid';
import medicinesRouter from './routes/medicines';
import remindersRouter from './routes/reminders';
import { members } from './database';
import { Member } from './types';

const app = express();
const PORT = 3001;

app.use(cors());
app.use(express.json());

app.use('/api/medicines', medicinesRouter);
app.use('/api/reminders', remindersRouter);

app.get('/api/members', (req, res) => {
  res.json(members);
});

app.post('/api/members', (req, res) => {
  const { name } = req.body as { name: string };
  if (!name) {
    return res.status(400).json({ error: '成员名称不能为空' });
  }

  const colors = ['#4A90D9', '#E67E9B', '#52C41A', '#FAAD14', '#722ED1', '#13C2C2'];
  const usedColors = members.map(m => m.color);
  const availableColor = colors.find(c => !usedColors.includes(c)) || colors[Math.floor(Math.random() * colors.length)];

  const newMember: Member = {
    id: uuidv4(),
    name,
    color: availableColor,
    isOwner: false,
    createdAt: new Date().toISOString()
  };

  members.push(newMember);
  res.status(201).json(newMember);
});

app.delete('/api/members/:id', (req, res) => {
  const index = members.findIndex(m => m.id === req.params.id);
  if (index === -1) {
    return res.status(404).json({ error: '成员未找到' });
  }
  if (members[index].isOwner) {
    return res.status(403).json({ error: '不能删除药箱创建者' });
  }
  const deleted = members.splice(index, 1)[0];
  res.json({ message: '删除成功', member: deleted });
});

app.get('/api/stats', (req, res) => {
  res.json({
    medicinesCount: 5,
    pendingRemindersCount: 2,
    expiredCount: 1
  });
});

app.listen(PORT, () => {
  console.log(`家庭药箱服务器已启动: http://localhost:${PORT}`);
});
