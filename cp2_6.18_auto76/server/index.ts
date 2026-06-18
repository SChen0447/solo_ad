import express, { Request, Response } from 'express';
import cors from 'cors';
import { v4 as uuidv4 } from 'uuid';

interface Project {
  id: string;
  name: string;
  color: string;
}

interface Member {
  id: string;
  name: string;
  avatarColor: string;
  projectIds: string[];
}

interface TimeRecord {
  id: string;
  projectId: string;
  memberId: string;
  date: string;
  hours: number;
  createdAt: string;
}

interface DailyStats {
  date: string;
  hours: number;
}

interface AnomalyRecord {
  date: string;
  hours: number;
  reason: string;
}

interface MemberDetail {
  member: Member;
  last30Days: DailyStats[];
  anomalies: AnomalyRecord[];
}

interface DashboardStats {
  totalProjects: number;
  totalMembers: number;
  last7DaysHours: number;
  totalProjectsChange: number;
  totalMembersChange: number;
  last7DaysHoursChange: number;
}

interface MemberRanking {
  member: Member;
  weeklyHours: number;
}

const app = express();
const PORT = 3001;

app.use(cors());
app.use(express.json());

const projects: Project[] = [
  { id: 'p1', name: '电商平台重构', color: '#3b82f6' },
  { id: 'p2', name: '移动端APP开发', color: '#8b5cf6' },
  { id: 'p3', name: '数据分析系统', color: '#10b981' },
];

const members: Member[] = [
  { id: 'm1', name: '张明', avatarColor: '#fca5a5', projectIds: ['p1', 'p2'] },
  { id: 'm2', name: '李华', avatarColor: '#93c5fd', projectIds: ['p1'] },
  { id: 'm3', name: '王芳', avatarColor: '#6ee7b7', projectIds: ['p2', 'p3'] },
  { id: 'm4', name: '赵强', avatarColor: '#fcd34d', projectIds: ['p1', 'p3'] },
  { id: 'm5', name: '陈静', avatarColor: '#c4b5fd', projectIds: ['p2'] },
  { id: 'm6', name: '刘伟', avatarColor: '#f9a8d4', projectIds: ['p3'] },
  { id: 'm7', name: '孙丽', avatarColor: '#99f6e4', projectIds: ['p1', 'p2', 'p3'] },
  { id: 'm8', name: '周杰', avatarColor: '#fde047', projectIds: ['p3'] },
];

const records: TimeRecord[] = [];

function formatDate(date: Date): string {
  return date.toISOString().split('T')[0];
}

function getDateDaysAgo(days: number): Date {
  const date = new Date();
  date.setDate(date.getDate() - days);
  return date;
}

function generateMockRecords() {
  const now = new Date();
  for (let i = 0; i < 30; i++) {
    const date = formatDate(getDateDaysAgo(i));
    const dayOfWeek = getDateDaysAgo(i).getDay();
    const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;

    members.forEach((member) => {
      const workChance = isWeekend ? 0.15 : 0.85;
      if (Math.random() < workChance) {
        const projectId = member.projectIds[Math.floor(Math.random() * member.projectIds.length)];
        let hours: number;
        const rand = Math.random();
        if (rand < 0.05) {
          hours = Math.round((12 + Math.random() * 4) * 2) / 2;
        } else if (rand < 0.2) {
          hours = Math.round((8 + Math.random() * 4) * 2) / 2;
        } else if (rand < 0.7) {
          hours = Math.round((4 + Math.random() * 4) * 2) / 2;
        } else {
          hours = Math.round((0.5 + Math.random() * 3.5) * 2) / 2;
        }
        if (isWeekend) {
          hours = Math.max(hours, 2);
        }
        records.push({
          id: uuidv4(),
          projectId,
          memberId: member.id,
          date,
          hours,
          createdAt: now.toISOString(),
        });
      }
    });
  }
}

generateMockRecords();

app.get('/api/projects', (_req: Request, res: Response) => {
  res.json({ success: true, data: projects });
});

app.get('/api/members', (req: Request, res: Response) => {
  const { projectId } = req.query;
  let filteredMembers = members;
  if (projectId && typeof projectId === 'string') {
    filteredMembers = members.filter((m) => m.projectIds.includes(projectId));
  }
  res.json({ success: true, data: filteredMembers });
});

app.get('/api/records', (req: Request, res: Response) => {
  const { memberId, dateRange } = req.query;
  let filteredRecords = records;

  if (memberId && typeof memberId === 'string') {
    filteredRecords = filteredRecords.filter((r) => r.memberId === memberId);
  }

  if (dateRange && typeof dateRange === 'string') {
    const [startDate, endDate] = dateRange.split(',');
    if (startDate) {
      filteredRecords = filteredRecords.filter((r) => r.date >= startDate);
    }
    if (endDate) {
      filteredRecords = filteredRecords.filter((r) => r.date <= endDate);
    }
  }

  res.json({ success: true, data: filteredRecords });
});

app.post('/api/records', (req: Request, res: Response) => {
  const { projectId, memberId, date, hours } = req.body;

  if (!projectId || !memberId || !date || hours === undefined) {
    return res.status(400).json({ success: false, error: '缺少必要字段' });
  }

  if (hours < 0 || hours > 24) {
    return res.status(400).json({ success: false, error: '工时必须在0-24小时之间' });
  }

  const newRecord: TimeRecord = {
    id: uuidv4(),
    projectId,
    memberId,
    date,
    hours,
    createdAt: new Date().toISOString(),
  };

  records.push(newRecord);
  res.status(201).json({ success: true, data: newRecord });
});

app.get('/api/members/:id/detail', (req: Request, res: Response) => {
  const { id } = req.params;
  const member = members.find((m) => m.id === id);

  if (!member) {
    return res.status(404).json({ success: false, error: '成员不存在' });
  }

  const memberRecords = records.filter((r) => r.memberId === id);
  const last30Days: DailyStats[] = [];
  const anomalies: AnomalyRecord[] = [];

  for (let i = 29; i >= 0; i--) {
    const date = formatDate(getDateDaysAgo(i));
    const dayRecords = memberRecords.filter((r) => r.date === date);
    const totalHours = dayRecords.reduce((sum, r) => sum + r.hours, 0);
    last30Days.push({ date, hours: totalHours });

    const dateObj = getDateDaysAgo(i);
    const dayOfWeek = dateObj.getDay();
    const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;

    if (totalHours > 12) {
      anomalies.push({ date, hours: totalHours, reason: '单日工时超过12小时' });
    } else if (isWeekend && totalHours > 0) {
      anomalies.push({ date, hours: totalHours, reason: '周末加班' });
    }
  }

  const detail: MemberDetail = { member, last30Days, anomalies };
  res.json({ success: true, data: detail });
});

app.get('/api/dashboard/stats', (_req: Request, res: Response) => {
  const now = new Date();
  const sevenDaysAgo = formatDate(getDateDaysAgo(7));
  const fourteenDaysAgo = formatDate(getDateDaysAgo(14));
  const today = formatDate(now);

  const last7DaysRecords = records.filter(
    (r) => r.date >= sevenDaysAgo && r.date <= today
  );
  const previous7DaysRecords = records.filter(
    (r) => r.date >= fourteenDaysAgo && r.date < sevenDaysAgo
  );

  const last7DaysHours = last7DaysRecords.reduce((sum, r) => sum + r.hours, 0);
  const previous7DaysHours = previous7DaysRecords.reduce((sum, r) => sum + r.hours, 0);

  const last7DaysHoursChange =
    previous7DaysHours > 0
      ? Math.round(((last7DaysHours - previous7DaysHours) / previous7DaysHours) * 100)
      : last7DaysHours > 0
      ? 100
      : 0;

  const stats: DashboardStats = {
    totalProjects: projects.length,
    totalMembers: members.length,
    last7DaysHours: Math.round(last7DaysHours * 10) / 10,
    totalProjectsChange: 0,
    totalMembersChange: 0,
    last7DaysHoursChange,
  };

  res.json({ success: true, data: stats });
});

app.get('/api/dashboard/ranking', (_req: Request, res: Response) => {
  const sevenDaysAgo = formatDate(getDateDaysAgo(7));
  const today = formatDate(new Date());

  const ranking: MemberRanking[] = members.map((member) => {
    const memberRecords = records.filter(
      (r) => r.memberId === member.id && r.date >= sevenDaysAgo && r.date <= today
    );
    const weeklyHours = memberRecords.reduce((sum, r) => sum + r.hours, 0);
    return { member, weeklyHours: Math.round(weeklyHours * 10) / 10 };
  });

  ranking.sort((a, b) => b.weeklyHours - a.weeklyHours);
  res.json({ success: true, data: ranking.slice(0, 5) });
});

app.get('/api/dashboard/trend', (_req: Request, res: Response) => {
  const trend: DailyStats[] = [];
  for (let i = 29; i >= 0; i--) {
    const date = formatDate(getDateDaysAgo(i));
    const dayRecords = records.filter((r) => r.date === date);
    const totalHours = dayRecords.reduce((sum, r) => sum + r.hours, 0);
    trend.push({ date, hours: Math.round(totalHours * 10) / 10 });
  }
  res.json({ success: true, data: trend });
});

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
