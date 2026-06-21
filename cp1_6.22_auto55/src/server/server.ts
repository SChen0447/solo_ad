import express, { Request, Response } from 'express';
import cors from 'cors';
import { Parser } from 'json2csv';

const app = express();
const PORT = 3002;

app.use(cors());
app.use(express.json());

interface User {
  phone: string;
  nickname: string;
  points: number;
  badges: string[];
  createdAt: string;
}

interface SignInRecord {
  eventId: string;
  phone: string;
  nickname: string;
  signInTime: string;
}

interface Event {
  id: string;
  name: string;
  time: string;
  location: string;
  validUntil: string;
  createdAt: string;
  signInRecords: SignInRecord[];
}

const events: Map<string, Event> = new Map();
const users: Map<string, User> = new Map();

const BADGES = [
  { id: 'badge1', name: '新星奖章', pointsCost: 30, icon: 'star' },
  { id: 'badge2', name: '活跃奖章', pointsCost: 50, icon: 'fire' },
  { id: 'badge3', name: '贡献奖章', pointsCost: 80, icon: 'heart' },
  { id: 'badge4', name: '领袖奖章', pointsCost: 120, icon: 'crown' },
  { id: 'badge5', name: '传奇奖章', pointsCost: 200, icon: 'diamond' }
];

const generateId = () => Math.random().toString(36).substring(2, 10);

app.post('/api/events', (req: Request, res: Response) => {
  const { name, time, location, validUntil } = req.body;
  const id = generateId();
  const event: Event = {
    id,
    name,
    time,
    location,
    validUntil,
    createdAt: new Date().toISOString(),
    signInRecords: []
  };
  events.set(id, event);
  res.json({ success: true, event });
});

app.get('/api/events/:id', (req: Request, res: Response) => {
  const event = events.get(req.params.id);
  if (!event) {
    return res.status(404).json({ success: false, message: '活动不存在' });
  }
  res.json({ success: true, event });
});

app.get('/api/events', (req: Request, res: Response) => {
  const eventList = Array.from(events.values()).sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );
  res.json({ success: true, events: eventList });
});

app.post('/api/events/:id/signin', (req: Request, res: Response) => {
  const event = events.get(req.params.id);
  if (!event) {
    return res.status(404).json({ success: false, message: '活动不存在' });
  }

  const now = new Date();
  const validUntil = new Date(event.validUntil);
  if (now > validUntil) {
    return res.status(400).json({ success: false, message: '签到已过期' });
  }

  const { phone, nickname } = req.body;
  if (!phone || !nickname) {
    return res.status(400).json({ success: false, message: '请填写昵称和手机号' });
  }

  const existingRecord = event.signInRecords.find(r => r.phone === phone);
  if (existingRecord) {
    return res.status(400).json({ success: false, message: '您已签到过此活动' });
  }

  const record: SignInRecord = {
    eventId: event.id,
    phone,
    nickname,
    signInTime: new Date().toISOString()
  };
  event.signInRecords.push(record);

  if (!users.has(phone)) {
    users.set(phone, {
      phone,
      nickname,
      points: 0,
      badges: [],
      createdAt: new Date().toISOString()
    });
  } else {
    const user = users.get(phone)!;
    user.nickname = nickname;
  }

  const user = users.get(phone)!;
  user.points += 10;

  res.json({
    success: true,
    message: '签到成功！获得 10 积分',
    points: user.points,
    record
  });
});

app.get('/api/user/:phone', (req: Request, res: Response) => {
  const user = users.get(req.params.phone);
  if (!user) {
    return res.status(404).json({ success: false, message: '用户不存在' });
  }

  const userEvents = Array.from(events.values())
    .filter(e => e.signInRecords.some(r => r.phone === req.params.phone))
    .map(e => {
      const record = e.signInRecords.find(r => r.phone === req.params.phone)!;
      return {
        ...e,
        signInTime: record.signInTime
      };
    })
    .sort((a, b) => new Date(b.signInTime).getTime() - new Date(a.signInTime).getTime());

  res.json({
    success: true,
    user,
    events: userEvents
  });
});

app.post('/api/user/:phone/redeem/:badgeId', (req: Request, res: Response) => {
  const user = users.get(req.params.phone);
  if (!user) {
    return res.status(404).json({ success: false, message: '用户不存在' });
  }

  const badge = BADGES.find(b => b.id === req.params.badgeId);
  if (!badge) {
    return res.status(404).json({ success: false, message: '奖章不存在' });
  }

  if (user.badges.includes(badge.id)) {
    return res.status(400).json({ success: false, message: '您已兑换过此奖章' });
  }

  if (user.points < badge.pointsCost) {
    return res.status(400).json({ success: false, message: '积分不足' });
  }

  user.points -= badge.pointsCost;
  user.badges.push(badge.id);

  res.json({
    success: true,
    message: `兑换成功！获得「${badge.name}」`,
    points: user.points,
    badge
  });
});

app.get('/api/badges', (req: Request, res: Response) => {
  res.json({ success: true, badges: BADGES });
});

app.get('/api/admin/leaderboard', (req: Request, res: Response) => {
  const leaderboard = Array.from(users.values())
    .map(u => ({
      nickname: u.nickname,
      phone: u.phone,
      points: u.points,
      badgeCount: u.badges.length
    }))
    .sort((a, b) => b.points - a.points);

  res.json({ success: true, leaderboard });
});

app.get('/api/admin/events/:id', (req: Request, res: Response) => {
  const event = events.get(req.params.id);
  if (!event) {
    return res.status(404).json({ success: false, message: '活动不存在' });
  }

  const participants = event.signInRecords
    .map(r => ({
      nickname: r.nickname,
      phone: r.phone,
      signInTime: r.signInTime
    }))
    .sort((a, b) => new Date(a.signInTime).getTime() - new Date(b.signInTime).getTime());

  res.json({
    success: true,
    event,
    participants
  });
});

app.get('/api/admin/events/:id/export', (req: Request, res: Response) => {
  const event = events.get(req.params.id);
  if (!event) {
    return res.status(404).json({ success: false, message: '活动不存在' });
  }

  const data = event.signInRecords
    .sort((a, b) => new Date(a.signInTime).getTime() - new Date(b.signInTime).getTime())
    .map((r, i) => ({
      序号: i + 1,
      昵称: r.nickname,
      手机号: r.phone,
      签到时间: new Date(r.signInTime).toLocaleString('zh-CN')
    }));

  const parser = new Parser();
  const csv = parser.parse(data);

  res.setHeader('Content-Type', 'text/csv; charset=utf-8');
  res.setHeader(
    'Content-Disposition',
    `attachment; filename="${encodeURIComponent(event.name + '_签到名单')}.csv"`
  );
  res.send('\uFEFF' + csv);
});

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
