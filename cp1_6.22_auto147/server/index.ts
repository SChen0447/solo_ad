import express, { Request, Response } from 'express';
import cors from 'cors';
import { v4 as uuidv4 } from 'uuid';

interface User {
  id: string;
  name: string;
  avatar: string;
  totalPoints: number;
  continuousDays: number;
  lastCheckInDate: string | null;
  online: boolean;
  groups: string[];
}

interface GroupMember {
  userId: string;
  joinedAt: string;
  isLeader: boolean;
}

interface Group {
  id: string;
  name: string;
  goal: string;
  createdAt: string;
  members: GroupMember[];
}

interface CheckIn {
  id: string;
  userId: string;
  groupId: string;
  text: string;
  imageUrl?: string;
  pointsEarned: number;
  createdAt: string;
}

interface ChallengeParticipant {
  userId: string;
  progress: number;
  joinedAt: string;
  pointsInvested: number;
  rewards: number;
}

interface Challenge {
  id: string;
  groupId: string;
  leaderId: string;
  title: string;
  description: string;
  targetCount: number;
  startDate: string;
  endDate: string;
  status: 'pending' | 'active' | 'completed';
  participants: ChallengeParticipant[];
  poolPoints: number;
}

const app = express();
app.use(cors());
app.use(express.json());

const users: Map<string, User> = new Map();
const groups: Map<string, Group> = new Map();
const checkIns: Map<string, CheckIn> = new Map();
const challenges: Map<string, Challenge> = new Map();

const avatarUrls = [
  'https://api.dicebear.com/7.x/avataaars/svg?seed=Felix',
  'https://api.dicebear.com/7.x/avataaars/svg?seed=Aneka',
  'https://api.dicebear.com/7.x/avataaars/svg?seed=Bailey',
  'https://api.dicebear.com/7.x/avataaars/svg?seed=Coco',
  'https://api.dicebear.com/7.x/avataaars/svg?seed=Dexter',
  'https://api.dicebear.com/7.x/avataaars/svg?seed=Echo',
  'https://api.dicebear.com/7.x/avataaars/svg?seed=Finn',
  'https://api.dicebear.com/7.x/avataaars/svg?seed=Gizmo',
];

function createUser(name: string, online = false): User {
  return {
    id: uuidv4(),
    name,
    avatar: avatarUrls[users.size % avatarUrls.length],
    totalPoints: 0,
    continuousDays: 0,
    lastCheckInDate: null,
    online,
    groups: [],
  };
}

function seedData() {
  const user1 = createUser('小明', true);
  const user2 = createUser('小红', true);
  const user3 = createUser('小刚', false);
  const user4 = createUser('小丽', true);
  const user5 = createUser('小强', false);
  [user1, user2, user3, user4, user5].forEach((u) => users.set(u.id, u));

  const group1: Group = {
    id: uuidv4(),
    name: 'Python基础入门营',
    goal: '21天Python入门',
    createdAt: new Date().toISOString(),
    members: [
      { userId: user1.id, joinedAt: new Date().toISOString(), isLeader: true },
      { userId: user2.id, joinedAt: new Date().toISOString(), isLeader: false },
      { userId: user3.id, joinedAt: new Date().toISOString(), isLeader: false },
    ],
  };
  const group2: Group = {
    id: uuidv4(),
    name: '算法刷题天团',
    goal: '百天刷爆LeetCode',
    createdAt: new Date().toISOString(),
    members: [
      { userId: user2.id, joinedAt: new Date().toISOString(), isLeader: true },
      { userId: user4.id, joinedAt: new Date().toISOString(), isLeader: false },
      { userId: user5.id, joinedAt: new Date().toISOString(), isLeader: false },
    ],
  };
  const group3: Group = {
    id: uuidv4(),
    name: '前端进阶学习社',
    goal: 'React+TypeScript进阶',
    createdAt: new Date().toISOString(),
    members: [
      { userId: user1.id, joinedAt: new Date().toISOString(), isLeader: false },
      { userId: user4.id, joinedAt: new Date().toISOString(), isLeader: true },
    ],
  };
  [group1, group2, group3].forEach((g) => groups.set(g.id, g));

  user1.groups = [group1.id, group3.id];
  user2.groups = [group1.id, group2.id];
  user3.groups = [group1.id];
  user4.groups = [group2.id, group3.id];
  user5.groups = [group2.id];

  user1.totalPoints = 156;
  user1.continuousDays = 12;
  user2.totalPoints = 203;
  user2.continuousDays = 18;
  user3.totalPoints = 89;
  user3.continuousDays = 5;
  user4.totalPoints = 178;
  user4.continuousDays = 9;
  user5.totalPoints = 67;
  user5.continuousDays = 3;

  const now = new Date();
  const sampleCheckIns: CheckIn[] = [];
  const texts = [
    '今天学习了Python变量和数据类型，收获满满！',
    '刷了5道简单题，加油！',
    '完成了React Hooks的学习',
    '复习了数组和链表',
    '学习了CSS Grid布局，很实用',
    '完成了10道中等难度算法题',
  ];
  const imageUrls = [
    'https://picsum.photos/seed/python1/400/300',
    'https://picsum.photos/seed/leet1/400/300',
    'https://picsum.photos/seed/react1/400/300',
    'https://picsum.photos/seed/algo1/400/300',
    undefined,
  ];
  const userIds = [user1.id, user2.id, user3.id, user4.id, user5.id];
  const groupIds = [group1.id, group2.id, group3.id];

  for (let i = 0; i < 35; i++) {
    const d = new Date(now.getTime() - i * 3600 * 1000 * Math.random() * 24);
    sampleCheckIns.push({
      id: uuidv4(),
      userId: userIds[i % userIds.length],
      groupId: groupIds[i % groupIds.length],
      text: texts[i % texts.length],
      imageUrl: imageUrls[i % imageUrls.length],
      pointsEarned: 5 + (i % 7),
      createdAt: d.toISOString(),
    });
  }
  sampleCheckIns.forEach((c) => checkIns.set(c.id, c));

  const challenge1: Challenge = {
    id: uuidv4(),
    groupId: group2.id,
    leaderId: user2.id,
    title: '三天刷100道LeetCode',
    description: '三天内完成100道LeetCode题，投入10分，按完成比例分配！',
    targetCount: 100,
    startDate: new Date(now.getTime() - 86400000).toISOString(),
    endDate: new Date(now.getTime() + 86400000 * 2).toISOString(),
    status: 'active',
    participants: [
      { userId: user2.id, progress: 45, joinedAt: new Date().toISOString(), pointsInvested: 10, rewards: 0 },
      { userId: user4.id, progress: 32, joinedAt: new Date().toISOString(), pointsInvested: 10, rewards: 0 },
      { userId: user5.id, progress: 18, joinedAt: new Date().toISOString(), pointsInvested: 10, rewards: 0 },
    ],
    poolPoints: 30,
  };
  challenges.set(challenge1.id, challenge1);
}

seedData();

const DEFAULT_USER_ID = Array.from(users.keys())[0];

app.get('/api/health', (_req: Request, res: Response) => {
  res.json({ status: 'ok' });
});

app.get('/api/users', (_req: Request, res: Response) => {
  res.json(Array.from(users.values()));
});

app.get('/api/users/me', (_req: Request, res: Response) => {
  const user = users.get(DEFAULT_USER_ID);
  res.json(user);
});

app.get('/api/users/:id', (req: Request, res: Response) => {
  const user = users.get(req.params.id);
  if (!user) return res.status(404).json({ error: 'User not found' });
  res.json(user);
});

app.get('/api/groups', (_req: Request, res: Response) => {
  const result = Array.from(groups.values()).map((g) => {
    const memberUsers = g.members
      .map((m) => users.get(m.userId))
      .filter(Boolean) as User[];
    const leaderboard = memberUsers
      .map((u) => ({ userId: u.id, name: u.name, avatar: u.avatar, points: u.totalPoints, online: u.online }))
      .sort((a, b) => b.points - a.points);
    return { ...g, memberCount: g.members.length, leaderboard, leader: g.members.find((m) => m.isLeader) };
  });
  res.json(result);
});

app.post('/api/groups', (req: Request, res: Response) => {
  const { name, goal, leaderId } = req.body;
  const id = uuidv4();
  const group: Group = {
    id,
    name,
    goal,
    createdAt: new Date().toISOString(),
    members: [{ userId: leaderId, joinedAt: new Date().toISOString(), isLeader: true }],
  };
  groups.set(id, group);
  const user = users.get(leaderId);
  if (user) user.groups.push(id);
  res.status(201).json(group);
});

app.get('/api/groups/:id', (req: Request, res: Response) => {
  const group = groups.get(req.params.id);
  if (!group) return res.status(404).json({ error: 'Group not found' });

  const memberUsers = group.members
    .map((m) => {
      const u = users.get(m.userId);
      return u ? { ...u, isLeader: m.isLeader, joinedAt: m.joinedAt } : null;
    })
    .filter(Boolean);

  const leaderboard = memberUsers
    .map((u: any) => ({ userId: u.id, name: u.name, avatar: u.avatar, points: u.totalPoints, online: u.online }))
    .sort((a: any, b: any) => b.points - a.points);

  const groupCheckIns = Array.from(checkIns.values())
    .filter((c) => c.groupId === group.id)
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    .map((c) => {
      const u = users.get(c.userId);
      return { ...c, userName: u?.name, userAvatar: u?.avatar };
    });

  const groupChallenges = Array.from(challenges.values())
    .filter((c) => c.groupId === group.id)
    .map((c) => ({
      ...c,
      participants: c.participants.map((p) => {
        const u = users.get(p.userId);
        return { ...p, name: u?.name, avatar: u?.avatar };
      }),
    }));

  res.json({
    ...group,
    members: memberUsers,
    leaderboard,
    checkIns: groupCheckIns,
    challenges: groupChallenges,
  });
});

app.post('/api/groups/:id/join', (req: Request, res: Response) => {
  const { userId } = req.body;
  const group = groups.get(req.params.id);
  if (!group) return res.status(404).json({ error: 'Group not found' });
  if (group.members.some((m) => m.userId === userId)) {
    return res.status(400).json({ error: 'Already a member' });
  }
  group.members.push({ userId, joinedAt: new Date().toISOString(), isLeader: false });
  const user = users.get(userId);
  if (user) user.groups.push(group.id);
  res.json(group);
});

app.get('/api/checkins/group/:groupId', (req: Request, res: Response) => {
  const result = Array.from(checkIns.values())
    .filter((c) => c.groupId === req.params.groupId)
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    .map((c) => {
      const u = users.get(c.userId);
      return { ...c, userName: u?.name, userAvatar: u?.avatar };
    });
  res.json(result);
});

app.post('/api/checkins', (req: Request, res: Response) => {
  const { userId, groupId, text, imageUrl } = req.body;
  const user = users.get(userId);
  if (!user) return res.status(404).json({ error: 'User not found' });

  const today = new Date().toDateString();
  let pointsEarned = 0;

  if (user.lastCheckInDate !== today) {
    const yesterday = new Date(Date.now() - 86400000).toDateString();
    if (user.lastCheckInDate === yesterday) {
      user.continuousDays += 1;
    } else if (user.lastCheckInDate) {
      user.continuousDays = 1;
    } else {
      user.continuousDays = 1;
    }
    pointsEarned = 5 + Math.max(0, user.continuousDays - 1);
    user.lastCheckInDate = today;
  }

  user.totalPoints += pointsEarned;

  const checkIn: CheckIn = {
    id: uuidv4(),
    userId,
    groupId,
    text,
    imageUrl,
    pointsEarned,
    createdAt: new Date().toISOString(),
  };
  checkIns.set(checkIn.id, checkIn);

  res.status(201).json({
    checkIn: {
      ...checkIn,
      userName: user.name,
      userAvatar: user.avatar,
    },
    user: {
      id: user.id,
      totalPoints: user.totalPoints,
      continuousDays: user.continuousDays,
    },
  });
});

app.get('/api/challenges/group/:groupId', (req: Request, res: Response) => {
  const result = Array.from(challenges.values())
    .filter((c) => c.groupId === req.params.groupId)
    .map((c) => ({
      ...c,
      participants: c.participants.map((p) => {
        const u = users.get(p.userId);
        return { ...p, name: u?.name, avatar: u?.avatar };
      }),
    }));
  res.json(result);
});

app.post('/api/challenges', (req: Request, res: Response) => {
  const { groupId, leaderId, title, description, targetCount, durationDays } = req.body;
  const id = uuidv4();
  const challenge: Challenge = {
    id,
    groupId,
    leaderId,
    title,
    description,
    targetCount,
    startDate: new Date().toISOString(),
    endDate: new Date(Date.now() + durationDays * 86400000).toISOString(),
    status: 'active',
    participants: [],
    poolPoints: 0,
  };
  challenges.set(id, challenge);
  res.status(201).json(challenge);
});

app.post('/api/challenges/:id/join', (req: Request, res: Response) => {
  const { userId } = req.body;
  const challenge = challenges.get(req.params.id);
  if (!challenge) return res.status(404).json({ error: 'Challenge not found' });
  if (challenge.participants.some((p) => p.userId === userId)) {
    return res.status(400).json({ error: 'Already joined' });
  }
  const user = users.get(userId);
  if (!user) return res.status(404).json({ error: 'User not found' });
  const invest = 10;
  if (user.totalPoints < invest) {
    return res.status(400).json({ error: 'Insufficient points' });
  }
  user.totalPoints -= invest;
  challenge.poolPoints += invest;
  challenge.participants.push({
    userId,
    progress: 0,
    joinedAt: new Date().toISOString(),
    pointsInvested: invest,
    rewards: 0,
  });
  res.json({ challenge, user });
});

app.post('/api/challenges/:id/progress', (req: Request, res: Response) => {
  const { userId, delta } = req.body;
  const challenge = challenges.get(req.params.id);
  if (!challenge) return res.status(404).json({ error: 'Challenge not found' });
  const p = challenge.participants.find((x) => x.userId === userId);
  if (!p) return res.status(404).json({ error: 'Not a participant' });
  p.progress = Math.min(challenge.targetCount, Math.max(0, p.progress + delta));
  res.json(challenge);
});

app.post('/api/challenges/:id/complete', (req: Request, res: Response) => {
  const challenge = challenges.get(req.params.id);
  if (!challenge) return res.status(404).json({ error: 'Challenge not found' });

  const sorted = [...challenge.participants].sort(
    (a, b) => b.progress - a.progress
  );
  const totalProgress = sorted.reduce((acc, p) => acc + p.progress, 0);
  const pool = challenge.poolPoints;

  sorted.forEach((p, index) => {
    let reward = 0;
    if (totalProgress > 0) {
      const rankBonus = index === 0 ? 0.5 : index === 1 ? 0.3 : index === 2 ? 0.2 : 0;
      reward = Math.floor(
        (p.progress / totalProgress) * pool * (1 - rankBonus) +
          (index < 3 ? pool * rankBonus / (index + 1) : 0)
      );
    }
    p.rewards = reward;
    const user = users.get(p.userId);
    if (user) user.totalPoints += reward;
  });

  challenge.status = 'completed';
  res.json({
    challenge: {
      ...challenge,
      participants: sorted.map((p) => {
        const u = users.get(p.userId);
        return { ...p, name: u?.name, avatar: u?.avatar };
      }),
    },
  });
});

app.get('/api/users/:id/challenges', (req: Request, res: Response) => {
  const userId = req.params.id;
  const userChallenges = Array.from(challenges.values())
    .filter((c) => c.participants.some((p) => p.userId === userId))
    .map((c) => {
      const participant = c.participants.find((p) => p.userId === userId)!;
      const sorted = [...c.participants].sort((a, b) => b.progress - a.progress);
      const rank = sorted.findIndex((p) => p.userId === userId) + 1;
      const won = c.status === 'completed' && rank <= 3;
      return {
        id: c.id,
        title: c.title,
        status: c.status,
        progress: participant.progress,
        targetCount: c.targetCount,
        rank,
        rewards: participant.rewards,
        pointsInvested: participant.pointsInvested,
        won,
        endDate: c.endDate,
      };
    });
  const wins = userChallenges.filter((c) => c.won).length;
  const losses = userChallenges.filter((c) => c.status === 'completed' && !c.won).length;
  res.json({ challenges: userChallenges, stats: { wins, losses, total: userChallenges.length } });
});

app.get('/api/users/:id/checkins', (req: Request, res: Response) => {
  const result = Array.from(checkIns.values())
    .filter((c) => c.userId === req.params.id)
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    .map((c) => {
      const g = groups.get(c.groupId);
      return { ...c, groupName: g?.name };
    });
  res.json(result);
});

const PORT = 3001;
app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
