import express from 'express';
import cors from 'cors';
import {
  getMembers, addMember, checkInMember,
  getCourses, bookCourse, addCourse,
  getCoaches, addCoachSchedule,
  getDashboardStats,
} from './data.js';

const app = express();
app.use(cors());
app.use(express.json());

app.get('/api/dashboard', (_req, res) => {
  res.json(getDashboardStats());
});

app.get('/api/members', (_req, res) => {
  res.json(getMembers());
});

app.post('/api/members', (req, res) => {
  const { name, level, remainingCount } = req.body;
  if (!name || !level || remainingCount === undefined) {
    res.status(400).json({ error: '缺少必要字段' });
    return;
  }
  const member = addMember(name, level, remainingCount);
  res.json(member);
});

app.post('/api/members/:id/checkin', (req, res) => {
  const result = checkInMember(req.params.id);
  if (!result) {
    res.status(400).json({ error: '签到失败，剩余次数不足或会员不存在' });
    return;
  }
  res.json(result);
});

app.get('/api/courses', (_req, res) => {
  res.json(getCourses());
});

app.post('/api/courses', (req, res) => {
  const { name, coachId, coachName, day, timeSlot, maxCapacity, room, isMorning } = req.body;
  if (!name || !coachId || day === undefined || timeSlot === undefined) {
    res.status(400).json({ error: '缺少必要字段' });
    return;
  }
  const course = addCourse({ name, coachId, coachName, day, timeSlot, maxCapacity, room, isMorning });
  res.json(course);
});

app.post('/api/courses/:id/book', (req, res) => {
  const { memberId } = req.body;
  if (!memberId) {
    res.status(400).json({ error: '缺少会员ID' });
    return;
  }
  const result = bookCourse(memberId, req.params.id);
  if (!result) {
    res.status(400).json({ error: '预约失败，课程已满或已预约' });
    return;
  }
  res.json(result);
});

app.get('/api/coaches', (_req, res) => {
  res.json(getCoaches());
});

app.post('/api/coaches/:id/schedule', (req, res) => {
  const { day, startSlot, endSlot, courseName, room } = req.body;
  if (day === undefined || startSlot === undefined || endSlot === undefined || !courseName || !room) {
    res.status(400).json({ error: '缺少必要字段' });
    return;
  }
  const result = addCoachSchedule(req.params.id, { day, startSlot, endSlot, courseName, room });
  if (!result) {
    res.status(400).json({ error: '添加排班失败' });
    return;
  }
  res.json(result);
});

app.listen(4000, () => {
  console.log('Server running on http://localhost:4000');
});
