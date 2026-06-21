import express, { Request, Response } from 'express';
import cors from 'cors';
import bodyParser from 'body-parser';
import { v4 as uuidv4 } from 'uuid';
import { readFileSync, writeFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { format, subDays } from 'date-fns';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const DATA_PATH = join(__dirname, '../../data/bookclub.json');

interface RegisteredMember {
  memberId: string;
  checkedIn: boolean;
}

interface Activity {
  id: string;
  name: string;
  date: string;
  location: 'offline' | 'online';
  description: string;
  maxParticipants: number;
  inviteCode: string;
  status: 'upcoming' | 'completed';
  registeredMembers: RegisteredMember[];
}

interface PointsHistoryItem {
  date: string;
  activity: string;
  points: number;
}

interface Member {
  id: string;
  name: string;
  avatar: string;
  points: number;
  pointsHistory: PointsHistoryItem[];
}

interface Reward {
  id: string;
  name: string;
  type: 'coupon' | 'physical';
  pointsCost: number;
  stock: number;
  description: string;
}

interface ExchangeRecord {
  id: string;
  memberId: string;
  rewardId: string;
  rewardName: string;
  pointsCost: number;
  date: string;
}

interface DataStore {
  activities: Activity[];
  members: Member[];
  rewards: Reward[];
  exchangeRecords: ExchangeRecord[];
}

const app = express();
app.use(cors());
app.use(bodyParser.json());

const readData = (): DataStore => {
  const raw = readFileSync(DATA_PATH, 'utf-8');
  return JSON.parse(raw);
};

const writeData = (data: DataStore) => {
  writeFileSync(DATA_PATH, JSON.stringify(data, null, 2));
};

app.get('/api/activities', (_req: Request, res: Response) => {
  const data = readData();
  const activitiesWithMembers = data.activities.map((activity) => ({
    ...activity,
    registeredMembers: activity.registeredMembers.map((rm) => {
      const member = data.members.find((m) => m.id === rm.memberId);
      return {
        ...rm,
        member,
      };
    }),
  }));
  res.json(activitiesWithMembers);
});

app.get('/api/activities/:id', (req: Request, res: Response) => {
  const data = readData();
  const activity = data.activities.find((a) => a.id === req.params.id);
  if (!activity) {
    res.status(404).json({ error: '活动不存在' });
    return;
  }
  const activityWithMembers = {
    ...activity,
    registeredMembers: activity.registeredMembers.map((rm) => {
      const member = data.members.find((m) => m.id === rm.memberId);
      return {
        ...rm,
        member,
      };
    }),
  };
  res.json(activityWithMembers);
});

app.post('/api/activities', (req: Request, res: Response) => {
  const data = readData();
  const { name, date, location, description, maxParticipants } = req.body;
  const newActivity: Activity = {
    id: uuidv4(),
    name,
    date,
    location,
    description,
    maxParticipants,
    inviteCode: 'BOOK' + Math.random().toString(36).substring(2, 8).toUpperCase(),
    status: 'upcoming',
    registeredMembers: [],
  };
  data.activities.push(newActivity);
  writeData(data);
  res.status(201).json(newActivity);
});

app.post('/api/activities/:id/checkin', (req: Request, res: Response) => {
  const data = readData();
  const { inviteCode, memberId } = req.body;
  const activity = data.activities.find((a) => a.id === req.params.id);

  if (!activity) {
    res.status(404).json({ error: '活动不存在' });
    return;
  }

  if (activity.inviteCode !== inviteCode) {
    res.status(400).json({ error: '邀请码错误' });
    return;
  }

  const registered = activity.registeredMembers.find((rm) => rm.memberId === memberId);
  if (!registered) {
    res.status(400).json({ error: '您未报名此活动' });
    return;
  }

  if (registered.checkedIn) {
    res.status(400).json({ error: '您已签到' });
    return;
  }

  registered.checkedIn = true;

  const member = data.members.find((m) => m.id === memberId);
  if (member) {
    member.points += 10;
    member.pointsHistory.unshift({
      date: format(new Date(), 'yyyy-MM-dd'),
      activity: activity.name,
      points: 10,
    });
  }

  writeData(data);
  res.json({ success: true, points: member?.points });
});

app.get('/api/members', (_req: Request, res: Response) => {
  const data = readData();
  res.json(data.members);
});

app.get('/api/members/:id', (req: Request, res: Response) => {
  const data = readData();
  const member = data.members.find((m) => m.id === req.params.id);
  if (!member) {
    res.status(404).json({ error: '会员不存在' });
    return;
  }
  const memberExchanges = data.exchangeRecords.filter((er) => er.memberId === req.params.id);
  res.json({ ...member, exchanges: memberExchanges });
});

app.get('/api/members/ranking', (req: Request, res: Response) => {
  const data = readData();
  const sortBy = (req.query.sortBy as string) || 'points';
  const thirtyDaysAgo = format(subDays(new Date(), 30), 'yyyy-MM-dd');

  const rankedMembers = data.members.map((member) => {
    const recentPoints = member.pointsHistory
      .filter((h) => h.date >= thirtyDaysAgo)
      .reduce((sum, h) => sum + h.points, 0);
    const exchangeCount = data.exchangeRecords.filter((er) => er.memberId === member.id).length;
    return {
      ...member,
      recentPoints,
      exchangeCount,
    };
  });

  rankedMembers.sort((a, b) => {
    if (sortBy === 'recentPoints') return b.recentPoints - a.recentPoints;
    if (sortBy === 'exchangeCount') return b.exchangeCount - a.exchangeCount;
    return b.points - a.points;
  });

  res.json(rankedMembers);
});

app.get('/api/rewards', (_req: Request, res: Response) => {
  const data = readData();
  res.json(data.rewards);
});

app.post('/api/exchanges', (req: Request, res: Response) => {
  const data = readData();
  const { memberId, rewardId } = req.body;

  const member = data.members.find((m) => m.id === memberId);
  const reward = data.rewards.find((r) => r.id === rewardId);

  if (!member || !reward) {
    res.status(404).json({ error: '会员或礼品不存在' });
    return;
  }

  if (member.points < reward.pointsCost) {
    res.status(400).json({ error: '积分不足' });
    return;
  }

  if (reward.stock <= 0) {
    res.status(400).json({ error: '库存不足' });
    return;
  }

  member.points -= reward.pointsCost;
  reward.stock -= 1;

  const newExchange: ExchangeRecord = {
    id: uuidv4(),
    memberId,
    rewardId,
    rewardName: reward.name,
    pointsCost: reward.pointsCost,
    date: format(new Date(), 'yyyy-MM-dd'),
  };
  data.exchangeRecords.push(newExchange);

  writeData(data);
  res.status(201).json(newExchange);
});

const PORT = 3001;
app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
