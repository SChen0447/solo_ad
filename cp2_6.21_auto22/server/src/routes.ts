import type { Express, Request, Response } from 'express';

interface GreenEvent {
  id: string;
  name: string;
  date: string;
  location: string;
  maxParticipants: number;
  description: string;
  participantIds: string[];
}

interface GrowthRecord {
  id: string;
  date: string;
  height: number;
  description: string;
  photoUrl: string;
}

interface Tree {
  id: string;
  name: string;
  species: string;
  speciesColor: string;
  claimerId: string | null;
  claimerName: string | null;
  claimDate: string | null;
  x: number;
  y: number;
  growthRecords: GrowthRecord[];
}

interface Volunteer {
  id: string;
  name: string;
  avatar: string;
  serviceHours: number;
  eventIds: string[];
  treeIds: string[];
}

interface AppNotification {
  id: string;
  type: 'event' | 'tree' | 'achievement';
  title: string;
  message: string;
  timestamp: string;
  read: boolean;
}

interface Stats {
  totalEvents: number;
  totalTrees: number;
  totalVolunteers: number;
  monthlyEvents: { month: string; count: number }[];
  speciesDistribution: { species: string; color: string; count: number }[];
}

const SPECIES_LIST = [
  { name: '银杏', color: '#F4D03F' },
  { name: '樟树', color: '#27AE60' },
  { name: '枫树', color: '#E74C3C' },
  { name: '柳树', color: '#2ECC71' },
  { name: '松树', color: '#1ABC9C' },
  { name: '桂花树', color: '#F39C12' },
  { name: '樱花树', color: '#E91E63' },
  { name: '梧桐', color: '#8D6E63' },
  { name: '柏树', color: '#00897B' },
  { name: '榆树', color: '#7CB342' },
];

const events = new Map<string, GreenEvent>();
const trees = new Map<string, Tree>();
const volunteers = new Map<string, Volunteer>();
const notifications = new Map<string, AppNotification>();

let seeded = false;

export function seedData(): void {
  if (seeded) return;
  seeded = true;

  const seedEvents: GreenEvent[] = [
    {
      id: 'e1',
      name: '春季植树节',
      date: '2025-03-12',
      location: '翠湖公园',
      maxParticipants: 50,
      description: '一年一度的春季植树活动，欢迎社区志愿者参加',
      participantIds: ['v1', 'v2', 'v3'],
    },
    {
      id: 'e2',
      name: '社区花园维护日',
      date: '2025-04-20',
      location: '阳光社区花园',
      maxParticipants: 30,
      description: '花园日常维护，包括浇水、修剪和除草',
      participantIds: ['v2', 'v4'],
    },
    {
      id: 'e3',
      name: '绿化知识讲座',
      date: '2025-05-15',
      location: '社区活动中心',
      maxParticipants: 100,
      description: '邀请园林专家分享城市绿化知识与技巧',
      participantIds: ['v1', 'v3', 'v5'],
    },
    {
      id: 'e4',
      name: '夏季护树行动',
      date: '2025-07-08',
      location: '滨江大道',
      maxParticipants: 40,
      description: '高温季节树木养护，确保树木安全度夏',
      participantIds: ['v1', 'v4'],
    },
    {
      id: 'e5',
      name: '秋季赏叶徒步',
      date: '2024-11-10',
      location: '红枫林景区',
      maxParticipants: 60,
      description: '秋季红叶观赏与树木认知徒步活动',
      participantIds: ['v1', 'v2', 'v3', 'v5'],
    },
    {
      id: 'e6',
      name: '冬季树木修剪培训',
      date: '2024-12-05',
      location: '社区培训室',
      maxParticipants: 25,
      description: '学习冬季树木修剪技巧，为来年生长做准备',
      participantIds: ['v3', 'v4'],
    },
  ];

  const seedTrees: Tree[] = [
    {
      id: 't1', name: '银杏一号', species: '银杏', speciesColor: '#F4D03F',
      claimerId: 'v1', claimerName: '李明', claimDate: '2025-03-12',
      x: 150, y: 220,
      growthRecords: [
        { id: 'gr1', date: '2025-03-12', height: 120, description: '刚种下的银杏树苗', photoUrl: '' },
        { id: 'gr2', date: '2025-06-15', height: 135, description: '生长良好，新叶茂盛', photoUrl: '' },
      ],
    },
    {
      id: 't2', name: '樟树一号', species: '樟树', speciesColor: '#27AE60',
      claimerId: 'v2', claimerName: '王芳', claimDate: '2025-03-12',
      x: -200, y: 120,
      growthRecords: [
        { id: 'gr3', date: '2025-03-12', height: 150, description: '健康樟树苗', photoUrl: '' },
      ],
    },
    {
      id: 't3', name: '枫树一号', species: '枫树', speciesColor: '#E74C3C',
      claimerId: 'v3', claimerName: '张伟', claimDate: '2024-11-10',
      x: 320, y: -80,
      growthRecords: [
        { id: 'gr4', date: '2024-11-10', height: 180, description: '秋季红叶满枝', photoUrl: '' },
        { id: 'gr5', date: '2025-03-01', height: 185, description: '新芽萌发', photoUrl: '' },
      ],
    },
    {
      id: 't4', name: '柳树一号', species: '柳树', speciesColor: '#2ECC71',
      claimerId: 'v4', claimerName: '刘洋', claimDate: '2025-04-20',
      x: -400, y: -150,
      growthRecords: [
        { id: 'gr6', date: '2025-04-20', height: 200, description: '湖边柳树，枝条飘逸', photoUrl: '' },
      ],
    },
    {
      id: 't5', name: '松树一号', species: '松树', speciesColor: '#1ABC9C',
      claimerId: 'v5', claimerName: '陈静', claimDate: '2024-12-05',
      x: 80, y: -320,
      growthRecords: [
        { id: 'gr7', date: '2024-12-05', height: 90, description: '松树幼苗，四季常青', photoUrl: '' },
      ],
    },
    {
      id: 't6', name: '桂花树一号', species: '桂花树', speciesColor: '#F39C12',
      claimerId: 'v1', claimerName: '李明', claimDate: '2025-03-12',
      x: -280, y: 380,
      growthRecords: [
        { id: 'gr8', date: '2025-03-12', height: 110, description: '桂花树苗，期待秋天飘香', photoUrl: '' },
      ],
    },
    {
      id: 't7', name: '樱花树一号', species: '樱花树', speciesColor: '#E91E63',
      claimerId: null, claimerName: null, claimDate: null,
      x: 450, y: 280,
      growthRecords: [],
    },
    {
      id: 't8', name: '梧桐一号', species: '梧桐', speciesColor: '#8D6E63',
      claimerId: null, claimerName: null, claimDate: null,
      x: -480, y: 300,
      growthRecords: [],
    },
    {
      id: 't9', name: '柏树一号', species: '柏树', speciesColor: '#00897B',
      claimerId: null, claimerName: null, claimDate: null,
      x: 220, y: -450,
      growthRecords: [],
    },
    {
      id: 't10', name: '榆树一号', species: '榆树', speciesColor: '#7CB342',
      claimerId: null, claimerName: null, claimDate: null,
      x: -120, y: 480,
      growthRecords: [],
    },
    {
      id: 't11', name: '银杏二号', species: '银杏', speciesColor: '#F4D03F',
      claimerId: 'v2', claimerName: '王芳', claimDate: '2025-04-20',
      x: -350, y: -380,
      growthRecords: [
        { id: 'gr9', date: '2025-04-20', height: 95, description: '第二棵银杏，长势喜人', photoUrl: '' },
      ],
    },
    {
      id: 't12', name: '樟树二号', species: '樟树', speciesColor: '#27AE60',
      claimerId: 'v3', claimerName: '张伟', claimDate: '2025-05-15',
      x: 420, y: -280,
      growthRecords: [
        { id: 'gr10', date: '2025-05-15', height: 130, description: '樟树二号，枝叶繁茂', photoUrl: '' },
      ],
    },
    {
      id: 't13', name: '枫树二号', species: '枫树', speciesColor: '#E74C3C',
      claimerId: null, claimerName: null, claimDate: null,
      x: 50, y: -130,
      growthRecords: [],
    },
    {
      id: 't14', name: '松树二号', species: '松树', speciesColor: '#1ABC9C',
      claimerId: null, claimerName: null, claimDate: null,
      x: -500, y: -30,
      growthRecords: [],
    },
    {
      id: 't15', name: '樱花树二号', species: '樱花树', speciesColor: '#E91E63',
      claimerId: 'v4', claimerName: '刘洋', claimDate: '2025-07-08',
      x: 380, y: 450,
      growthRecords: [
        { id: 'gr11', date: '2025-07-08', height: 105, description: '樱花树二号，来年春天可赏花', photoUrl: '' },
      ],
    },
  ];

  const seedVolunteers: Volunteer[] = [
    { id: 'v1', name: '李明', avatar: '', serviceHours: 10, eventIds: ['e1', 'e3', 'e4', 'e5'], treeIds: ['t1', 't6'] },
    { id: 'v2', name: '王芳', avatar: '', serviceHours: 25, eventIds: ['e1', 'e2', 'e5'], treeIds: ['t2', 't11'] },
    { id: 'v3', name: '张伟', avatar: '', serviceHours: 18, eventIds: ['e1', 'e3', 'e5', 'e6'], treeIds: ['t3', 't12'] },
    { id: 'v4', name: '刘洋', avatar: '', serviceHours: 30, eventIds: ['e2', 'e4', 'e6'], treeIds: ['t4', 't15'] },
    { id: 'v5', name: '陈静', avatar: '', serviceHours: 15, eventIds: ['e3', 'e5'], treeIds: ['t5'] },
  ];

  const seedNotifications: AppNotification[] = [
    { id: 'n1', type: 'event', title: '活动提醒', message: '春季植树节将于明天举行，请准时参加', timestamp: '2025-03-11T08:00:00Z', read: true },
    { id: 'n2', type: 'tree', title: '树木更新', message: '您认养的银杏一号新增了一条生长记录', timestamp: '2025-06-15T10:30:00Z', read: false },
    { id: 'n3', type: 'achievement', title: '成就解锁', message: '恭喜您完成"绿色先锋"成就，累计服务10小时', timestamp: '2025-04-01T09:00:00Z', read: true },
    { id: 'n4', type: 'event', title: '新活动发布', message: '夏季护树行动已发布，快来报名参加', timestamp: '2025-06-20T14:00:00Z', read: false },
    { id: 'n5', type: 'tree', title: '树木认养', message: '您已成功认养桂花树一号，请悉心照料', timestamp: '2025-03-12T11:00:00Z', read: true },
    { id: 'n6', type: 'achievement', title: '成就解锁', message: '恭喜您完成"植树达人"成就，认养2棵树木', timestamp: '2025-03-12T11:05:00Z', read: false },
    { id: 'n7', type: 'event', title: '活动回顾', message: '秋季赏叶徒步活动圆满结束，感谢您的参与', timestamp: '2024-11-11T18:00:00Z', read: true },
    { id: 'n8', type: 'tree', title: '生长提醒', message: '枫树一号春季新芽已萌发，快去看看吧', timestamp: '2025-03-01T07:30:00Z', read: false },
  ];

  for (const e of seedEvents) events.set(e.id, e);
  for (const t of seedTrees) trees.set(t.id, t);
  for (const v of seedVolunteers) volunteers.set(v.id, v);
  for (const n of seedNotifications) notifications.set(n.id, n);
}

export function registerRoutes(app: Express): void {
  app.get('/api/events', (_req: Request, res: Response) => {
    res.json(Array.from(events.values()));
  });

  app.post('/api/events', (req: Request, res: Response) => {
    const { name, date, location, maxParticipants, description } = req.body;
    const id = `e${events.size + 1}`;
    const newEvent: GreenEvent = {
      id,
      name,
      date,
      location,
      maxParticipants: Number(maxParticipants),
      description,
      participantIds: [],
    };
    events.set(id, newEvent);
    res.status(201).json(newEvent);
  });

  app.post('/api/events/:id/register', (req: Request, res: Response) => {
    const event = events.get(req.params.id);
    if (!event) {
      res.status(404).json({ error: 'Event not found' });
      return;
    }
    const { volunteerId } = req.body;
    if (event.participantIds.length >= event.maxParticipants) {
      res.status(400).json({ error: 'Event is full' });
      return;
    }
    if (event.participantIds.includes(volunteerId)) {
      res.status(400).json({ error: 'Already registered' });
      return;
    }
    event.participantIds.push(volunteerId);
    const volunteer = volunteers.get(volunteerId);
    if (volunteer && !volunteer.eventIds.includes(event.id)) {
      volunteer.eventIds.push(event.id);
    }
    res.json(event);
  });

  app.get('/api/trees', (_req: Request, res: Response) => {
    res.json(Array.from(trees.values()));
  });

  app.post('/api/trees/:id/claim', (req: Request, res: Response) => {
    const tree = trees.get(req.params.id);
    if (!tree) {
      res.status(404).json({ error: 'Tree not found' });
      return;
    }
    if (tree.claimerId) {
      res.status(400).json({ error: 'Tree already claimed' });
      return;
    }
    const { volunteerId, volunteerName } = req.body;
    const speciesIndex = Math.floor(Math.random() * SPECIES_LIST.length);
    const species = SPECIES_LIST[speciesIndex];
    tree.species = species.name;
    tree.speciesColor = species.color;
    tree.claimerId = volunteerId;
    tree.claimerName = volunteerName;
    tree.claimDate = new Date().toISOString().split('T')[0];
    const volunteer = volunteers.get(volunteerId);
    if (volunteer && !volunteer.treeIds.includes(tree.id)) {
      volunteer.treeIds.push(tree.id);
    }
    res.json(tree);
  });

  app.post('/api/trees/:id/records', (req: Request, res: Response) => {
    const tree = trees.get(req.params.id);
    if (!tree) {
      res.status(404).json({ error: 'Tree not found' });
      return;
    }
    const { date, height, description, photoUrl } = req.body;
    const recordId = `gr${Date.now()}`;
    const record: GrowthRecord = {
      id: recordId,
      date,
      height: Number(height),
      description,
      photoUrl: photoUrl || '',
    };
    tree.growthRecords.push(record);
    res.status(201).json(record);
  });

  app.get('/api/volunteers', (_req: Request, res: Response) => {
    res.json(Array.from(volunteers.values()));
  });

  app.get('/api/volunteers/:id', (req: Request, res: Response) => {
    const volunteer = volunteers.get(req.params.id);
    if (!volunteer) {
      res.status(404).json({ error: 'Volunteer not found' });
      return;
    }
    res.json(volunteer);
  });

  app.get('/api/notifications', (_req: Request, res: Response) => {
    res.json(Array.from(notifications.values()));
  });

  app.post('/api/notifications/:id/read', (req: Request, res: Response) => {
    const notification = notifications.get(req.params.id);
    if (!notification) {
      res.status(404).json({ error: 'Notification not found' });
      return;
    }
    notification.read = true;
    res.json(notification);
  });

  app.get('/api/stats', (_req: Request, res: Response) => {
    const allEvents = Array.from(events.values());
    const allTrees = Array.from(trees.values());
    const allVolunteers = Array.from(volunteers.values());

    const now = new Date();
    const monthlyEvents: { month: string; count: number }[] = [];
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const monthStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      const count = allEvents.filter(e => e.date.startsWith(monthStr)).length;
      monthlyEvents.push({ month: monthStr, count });
    }

    const speciesMap = new Map<string, { species: string; color: string; count: number }>();
    for (const tree of allTrees) {
      if (speciesMap.has(tree.species)) {
        speciesMap.get(tree.species)!.count++;
      } else {
        speciesMap.set(tree.species, { species: tree.species, color: tree.speciesColor, count: 1 });
      }
    }
    const speciesDistribution = Array.from(speciesMap.values());

    const stats: Stats = {
      totalEvents: allEvents.length,
      totalTrees: allTrees.length,
      totalVolunteers: allVolunteers.length,
      monthlyEvents,
      speciesDistribution,
    };
    res.json(stats);
  });
}
