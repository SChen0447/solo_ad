import express, { Request, Response } from 'express';
import cors from 'cors';
import { v4 as uuidv4 } from 'uuid';

const app = express();
const PORT = 3001;

app.use(cors());
app.use(express.json());

interface Project {
  id: string;
  name: string;
  description?: string;
}

interface Member {
  id: string;
  name: string;
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

interface MemberDetail {
  member: Member;
  dailyRecords: { date: string; hours: number }[];
  anomalies: { date: string; hours: number; reason: string }[];
}

const projects: Project[] = [
  { id: 'p1', name: '智能电商平台', description: '核心业务系统重构' },
  { id: 'p2', name: '数据分析中台', description: 'BI报表与数据可视化' },
  { id: 'p3', name: '移动客户端', description: 'iOS/Android双端开发' },
];

const members: Member[] = [
  { id: 'm1', name: '张伟', projectIds: ['p1', 'p2'] },
  { id: 'm2', name: '李娜', projectIds: ['p1', 'p3'] },
  { id: 'm3', name: '王强', projectIds: ['p2', 'p3'] },
  { id: 'm4', name: '刘洋', projectIds: ['p1'] },
  { id: 'm5', name: '陈静', projectIds: ['p2', 'p3'] },
  { id: 'm6', name: '赵磊', projectIds: ['p1', 'p2', 'p3'] },
];

const records: TimeRecord[] = [];

function formatDate(d: Date): string {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function addDays(d: Date, days: number): Date {
  const result = new Date(d);
  result.setDate(result.getDate() + days);
  return result;
}

function isWeekend(dateStr: string): boolean {
  const d = new Date(dateStr);
  const day = d.getDay();
  return day === 0 || day === 6;
}

function generateMockData(): void {
  const today = new Date();
  for (let i = 29; i >= 0; i--) {
    const date = formatDate(addDays(today, -i));
    members.forEach((member) => {
      const assignedProjects = projects.filter((p) =>
        member.projectIds.includes(p.id)
      );
      if (assignedProjects.length === 0) return;

      const numRecords = Math.floor(Math.random() * 2) + 1;
      let totalHoursForDay = 0;

      for (let r = 0; r < numRecords; r++) {
        const project =
          assignedProjects[Math.floor(Math.random() * assignedProjects.length)];
        let hours: number;

        if (i <= 5 && Math.random() < 0.1) {
          hours = 12.5 + Math.random() * 2;
        } else if (isWeekend(date) && Math.random() < 0.3) {
          hours = 2 + Math.random() * 4;
        } else {
          hours = 2 + Math.random() * 6;
        }

        if (totalHoursForDay + hours > 18) {
          hours = Math.max(0, 18 - totalHoursForDay);
        }
        if (hours <= 0) continue;

        hours = Math.round(hours * 2) / 2;
        totalHoursForDay += hours;

        records.push({
          id: uuidv4(),
          projectId: project.id,
          memberId: member.id,
          date,
          hours,
          createdAt: new Date().toISOString(),
        });
      }
    });
  }
}

generateMockData();

app.get('/api/projects', (_req: Request, res: Response) => {
  res.json(projects);
});

app.get('/api/members', (req: Request, res: Response) => {
  const { projectId } = req.query;
  if (projectId) {
    const filtered = members.filter((m) =>
      m.projectIds.includes(projectId as string)
    );
    return res.json(filtered);
  }
  res.json(members);
});

app.get('/api/records', (req: Request, res: Response) => {
  const { memberId, startDate, endDate, projectId } = req.query;
  let result = [...records];

  if (memberId) {
    result = result.filter((r) => r.memberId === (memberId as string));
  }
  if (projectId) {
    result = result.filter((r) => r.projectId === (projectId as string));
  }
  if (startDate) {
    result = result.filter((r) => r.date >= (startDate as string));
  }
  if (endDate) {
    result = result.filter((r) => r.date <= (endDate as string));
  }

  res.json(result);
});

app.post('/api/records', (req: Request, res: Response) => {
  const { projectId, memberId, date, hours } = req.body;

  if (!projectId || !memberId || !date || hours === undefined) {
    return res.status(400).json({ error: '缺少必填字段' });
  }

  const hoursNum = Number(hours);
  if (isNaN(hoursNum) || hoursNum < 0 || hoursNum > 24) {
    return res.status(400).json({ error: '工时必须在 0-24 小时之间' });
  }

  const newRecord: TimeRecord = {
    id: uuidv4(),
    projectId: String(projectId),
    memberId: String(memberId),
    date: String(date),
    hours: hoursNum,
    createdAt: new Date().toISOString(),
  };

  records.push(newRecord);
  res.status(201).json(newRecord);
});

app.get('/api/dashboard/stats', (_req: Request, res: Response) => {
  const today = new Date();
  const last7Start = formatDate(addDays(today, -6));
  const prev7Start = formatDate(addDays(today, -13));
  const prev7End = formatDate(addDays(today, -7));

  const last7Hours = records
    .filter((r) => r.date >= last7Start)
    .reduce((sum, r) => sum + r.hours, 0);

  const prev7Hours = records
    .filter((r) => r.date >= prev7Start && r.date <= prev7End)
    .reduce((sum, r) => sum + r.hours, 0);

  let changePercent = 0;
  if (prev7Hours > 0) {
    changePercent = Math.round(((last7Hours - prev7Hours) / prev7Hours) * 100);
  } else if (last7Hours > 0) {
    changePercent = 100;
  }

  res.json({
    totalProjects: projects.length,
    totalMembers: members.length,
    last7DaysHours: Math.round(last7Hours * 10) / 10,
    changePercent,
  });
});

app.get('/api/dashboard/ranking', (_req: Request, res: Response) => {
  const today = new Date();
  const weekStart = addDays(today, -today.getDay() + 1);
  const weekStartStr = formatDate(weekStart);

  const weeklyMap: Record<string, number> = {};
  records
    .filter((r) => r.date >= weekStartStr)
    .forEach((r) => {
      weeklyMap[r.memberId] = (weeklyMap[r.memberId] || 0) + r.hours;
    });

  const ranking = members
    .map((m) => ({
      memberId: m.id,
      name: m.name,
      weeklyHours: Math.round((weeklyMap[m.id] || 0) * 10) / 10,
    }))
    .sort((a, b) => b.weeklyHours - a.weeklyHours)
    .slice(0, 5);

  res.json(ranking);
});

app.get('/api/dashboard/trend', (_req: Request, res: Response) => {
  const today = new Date();
  const result = [];
  for (let i = 29; i >= 0; i--) {
    const dateStr = formatDate(addDays(today, -i));
    const totalHours = records
      .filter((r) => r.date === dateStr)
      .reduce((sum, r) => sum + r.hours, 0);
    result.push({
      date: dateStr,
      totalHours: Math.round(totalHours * 10) / 10,
    });
  }
  res.json(result);
});

app.get('/api/members/:id/detail', (req: Request, res: Response) => {
  const { id } = req.params;
  const member = members.find((m) => m.id === id);

  if (!member) {
    return res.status(404).json({ error: '成员不存在' });
  }

  const today = new Date();
  const dailyMap: Record<string, number> = {};
  const anomalies: { date: string; hours: number; reason: string }[] = [];

  for (let i = 29; i >= 0; i--) {
    const dateStr = formatDate(addDays(today, -i));
    const dayRecords = records.filter(
      (r) => r.memberId === id && r.date === dateStr
    );
    const dayTotal = dayRecords.reduce((sum, r) => sum + r.hours, 0);
    dailyMap[dateStr] = Math.round(dayTotal * 10) / 10;

    if (dayTotal > 12) {
      anomalies.push({
        date: dateStr,
        hours: Math.round(dayTotal * 10) / 10,
        reason: `单日工时超过12小时（${Math.round(dayTotal * 10) / 10}小时）`,
      });
    } else if (isWeekend(dateStr) && dayTotal > 0) {
      anomalies.push({
        date: dateStr,
        hours: Math.round(dayTotal * 10) / 10,
        reason: `周末加班（${Math.round(dayTotal * 10) / 10}小时）`,
      });
    }
  }

  const dailyRecords = Object.keys(dailyMap)
    .sort()
    .map((date) => ({
      date,
      hours: dailyMap[date],
    }));

  const result: MemberDetail = {
    member,
    dailyRecords,
    anomalies: anomalies.sort((a, b) => (a.date < b.date ? 1 : -1)),
  };

  res.json(result);
});

app.get('/api/members/:id/daily-total', (req: Request, res: Response) => {
  const { id } = req.params;
  const { date } = req.query;

  if (!date) {
    return res.status(400).json({ error: '缺少日期参数' });
  }

  const dayTotal = records
    .filter((r) => r.memberId === id && r.date === (date as string))
    .reduce((sum, r) => sum + r.hours, 0);

  res.json({ memberId: id, date, total: Math.round(dayTotal * 10) / 10 });
});

app.listen(PORT, () => {
  console.log(`后端服务运行在 http://localhost:${PORT}`);
});
