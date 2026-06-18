import express from 'express';
import cors from 'cors';
import { v4 as uuidv4 } from 'uuid';

const app = express();
const PORT = 3050;

app.use(cors());
app.use(express.json());

interface Project {
  id: string;
  name: string;
}

interface Member {
  id: string;
  name: string;
  avatarColor: string;
}

interface TimeRecord {
  id: string;
  projectId: string;
  memberId: string;
  date: string;
  hours: number;
}

interface ProjectMember {
  projectId: string;
  memberId: string;
}

const avatarColors = [
  '#a78bfa', '#f472b6', '#60a5fa', '#34d399', '#fbbf24',
  '#f87171', '#a3e635', '#22d3ee', '#fb923c', '#c084fc'
];

const projects: Project[] = [
  { id: 'p1', name: '电商平台重构' },
  { id: 'p2', name: 'CRM系统开发' },
  { id: 'p3', name: '移动APP迭代' },
  { id: 'p4', name: '数据中台建设' },
  { id: 'p5', name: '运维自动化' }
];

const members: Member[] = [
  { id: 'm1', name: '张三', avatarColor: avatarColors[0] },
  { id: 'm2', name: '李四', avatarColor: avatarColors[1] },
  { id: 'm3', name: '王五', avatarColor: avatarColors[2] },
  { id: 'm4', name: '赵六', avatarColor: avatarColors[3] },
  { id: 'm5', name: '钱七', avatarColor: avatarColors[4] },
  { id: 'm6', name: '孙八', avatarColor: avatarColors[5] },
  { id: 'm7', name: '周九', avatarColor: avatarColors[6] },
  { id: 'm8', name: '吴十', avatarColor: avatarColors[7] }
];

const projectMembers: ProjectMember[] = [
  { projectId: 'p1', memberId: 'm1' },
  { projectId: 'p1', memberId: 'm2' },
  { projectId: 'p1', memberId: 'm3' },
  { projectId: 'p2', memberId: 'm2' },
  { projectId: 'p2', memberId: 'm4' },
  { projectId: 'p2', memberId: 'm5' },
  { projectId: 'p3', memberId: 'm1' },
  { projectId: 'p3', memberId: 'm6' },
  { projectId: 'p3', memberId: 'm7' },
  { projectId: 'p4', memberId: 'm3' },
  { projectId: 'p4', memberId: 'm5' },
  { projectId: 'p4', memberId: 'm8' },
  { projectId: 'p5', memberId: 'm4' },
  { projectId: 'p5', memberId: 'm7' },
  { projectId: 'p5', memberId: 'm8' }
];

function formatDate(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function generateMockRecords(): TimeRecord[] {
  const records: TimeRecord[] = [];
  const today = new Date();
  
  for (let i = 29; i >= 0; i--) {
    const date = new Date(today);
    date.setDate(date.getDate() - i);
    const dateStr = formatDate(date);
    const dayOfWeek = date.getDay();
    const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;
    
    projectMembers.forEach(pm => {
      const hasRecord = Math.random() > (isWeekend ? 0.7 : 0.15);
      if (hasRecord) {
        let hours = Math.floor(Math.random() * 10) + 2;
        if (isWeekend) {
          hours = Math.floor(Math.random() * 6) + 2;
        }
        if (hours > 12) {
          hours = Math.random() > 0.8 ? hours : 8;
        }
        records.push({
          id: uuidv4(),
          projectId: pm.projectId,
          memberId: pm.memberId,
          date: dateStr,
          hours: hours
        });
      }
    });
  }
  
  return records;
}

let timeRecords: TimeRecord[] = generateMockRecords();

app.get('/api/projects', (req, res) => {
  res.json(projects);
});

app.get('/api/members', (req, res) => {
  const projectId = req.query.projectId as string;
  if (projectId) {
    const memberIds = projectMembers
      .filter(pm => pm.projectId === projectId)
      .map(pm => pm.memberId);
    const filteredMembers = members.filter(m => memberIds.includes(m.id));
    res.json(filteredMembers);
  } else {
    res.json(members);
  }
});

app.get('/api/records', (req, res) => {
  const memberId = req.query.memberId as string;
  const projectId = req.query.projectId as string;
  const startDate = req.query.startDate as string;
  const endDate = req.query.endDate as string;
  
  let filtered = [...timeRecords];
  
  if (memberId) {
    filtered = filtered.filter(r => r.memberId === memberId);
  }
  if (projectId) {
    filtered = filtered.filter(r => r.projectId === projectId);
  }
  if (startDate) {
    filtered = filtered.filter(r => r.date >= startDate);
  }
  if (endDate) {
    filtered = filtered.filter(r => r.date <= endDate);
  }
  
  res.json(filtered);
});

app.post('/api/records', (req, res) => {
  const { projectId, memberId, date, hours } = req.body;
  
  if (!projectId || !memberId || !date || hours === undefined) {
    return res.status(400).json({ error: '缺少必要参数' });
  }
  
  const hoursNum = Number(hours);
  if (isNaN(hoursNum) || hoursNum < 0 || hoursNum > 24) {
    return res.status(400).json({ error: '工时必须在0-24小时之间' });
  }
  
  const existingIndex = timeRecords.findIndex(
    r => r.projectId === projectId && r.memberId === memberId && r.date === date
  );
  
  if (existingIndex >= 0) {
    timeRecords[existingIndex].hours = hoursNum;
    return res.json(timeRecords[existingIndex]);
  }
  
  const newRecord: TimeRecord = {
    id: uuidv4(),
    projectId,
    memberId,
    date,
    hours: hoursNum
  };
  
  timeRecords.push(newRecord);
  res.status(201).json(newRecord);
});

app.get('/api/members/:id/detail', (req, res) => {
  const memberId = req.params.id;
  const member = members.find(m => m.id === memberId);
  
  if (!member) {
    return res.status(404).json({ error: '成员不存在' });
  }
  
  const memberRecords = timeRecords.filter(r => r.memberId === memberId);
  
  const projectInfo = projects.map(p => {
    const projectRecords = memberRecords.filter(r => r.projectId === p.id);
    const totalHours = projectRecords.reduce((sum, r) => sum + r.hours, 0);
    return {
      id: p.id,
      name: p.name,
      totalHours: Math.round(totalHours * 10) / 10
    };
  }).filter(p => p.totalHours > 0);
  
  const today = new Date();
  const last30Days: string[] = [];
  for (let i = 29; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(d.getDate() - i);
    last30Days.push(formatDate(d));
  }
  
  const dailyRecords = last30Days.map(date => {
    const dayRecords = memberRecords.filter(r => r.date === date);
    const totalHours = dayRecords.reduce((sum, r) => sum + r.hours, 0);
    return {
      date,
      hours: Math.round(totalHours * 10) / 10
    };
  });
  
  const abnormalRecords = dailyRecords.filter(dr => {
    const d = new Date(dr.date);
    const dayOfWeek = d.getDay();
    const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;
    return dr.hours > 12 || (isWeekend && dr.hours > 0);
  }).map(dr => {
    const d = new Date(dr.date);
    const dayOfWeek = d.getDay();
    const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;
    let reason = '';
    if (dr.hours > 12) {
      reason = '单日工时超过12小时';
    }
    if (isWeekend && dr.hours > 0) {
      reason = reason ? reason + '，周末加班' : '周末加班';
    }
    return {
      date: dr.date,
      hours: dr.hours,
      reason
    };
  });
  
  const totalHours = memberRecords.reduce((sum, r) => sum + r.hours, 0);
  
  res.json({
    member,
    totalHours: Math.round(totalHours * 10) / 10,
    projects: projectInfo,
    dailyRecords,
    abnormalRecords
  });
});

app.get('/api/dashboard/summary', (req, res) => {
  const today = new Date();
  const last7Days: string[] = [];
  const prev7Days: string[] = [];
  
  for (let i = 6; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(d.getDate() - i);
    last7Days.push(formatDate(d));
  }
  
  for (let i = 13; i >= 7; i--) {
    const d = new Date(today);
    d.setDate(d.getDate() - i);
    prev7Days.push(formatDate(d));
  }
  
  const last7Records = timeRecords.filter(r => last7Days.includes(r.date));
  const prev7Records = timeRecords.filter(r => prev7Days.includes(r.date));
  
  const last7Hours = last7Records.reduce((sum, r) => sum + r.hours, 0);
  const prev7Hours = prev7Records.reduce((sum, r) => sum + r.hours, 0);
  
  let hoursChange = 0;
  if (prev7Hours > 0) {
    hoursChange = Math.round(((last7Hours - prev7Hours) / prev7Hours) * 100);
  }
  
  const activeMembersLast7 = new Set(last7Records.map(r => r.memberId)).size;
  const activeMembersPrev7 = new Set(prev7Records.map(r => r.memberId)).size;
  
  let membersChange = 0;
  if (activeMembersPrev7 > 0) {
    membersChange = Math.round(((activeMembersLast7 - activeMembersPrev7) / activeMembersPrev7) * 100);
  }
  
  const last30Days: string[] = [];
  for (let i = 29; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(d.getDate() - i);
    last30Days.push(formatDate(d));
  }
  
  const trendData = last30Days.map(date => {
    const dayRecords = timeRecords.filter(r => r.date === date);
    const totalHours = dayRecords.reduce((sum, r) => sum + r.hours, 0);
    return {
      date,
      hours: Math.round(totalHours * 10) / 10
    };
  });
  
  const memberWeeklyHours = members.map(m => {
    const memberRecords = last7Records.filter(r => r.memberId === m.id);
    const totalHours = memberRecords.reduce((sum, r) => sum + r.hours, 0);
    return {
      member: m,
      hours: Math.round(totalHours * 10) / 10
    };
  }).sort((a, b) => b.hours - a.hours);
  
  res.json({
    totalProjects: projects.length,
    totalMembers: members.length,
    projectsChange: 0,
    membersChange,
    last7Hours: Math.round(last7Hours * 10) / 10,
    hoursChange,
    trendData,
    memberRanking: memberWeeklyHours
  });
});

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
