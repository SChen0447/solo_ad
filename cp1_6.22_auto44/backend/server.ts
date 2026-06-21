import express, { Request, Response } from 'express';
import cors from 'cors';
import {
  createTeam,
  getTeam,
  getTeamByInviteCode,
  addMember,
  getMembers,
  updateMemberColor,
  addTimeSlot,
  getTimeSlotsByTeam,
  getTimeSlotsByMember,
  deleteTimeSlot,
  createEvent,
  getEventsByTeam,
  updateEvent,
  deleteEvent,
  checkConflicts
} from './database.js';

const app = express();
const PORT = 3001;

app.use(cors());
app.use(express.json());

app.post('/api/team', (req: Request, res: Response) => {
  try {
    const { name } = req.body;
    if (!name) {
      return res.status(400).json({ error: '团队名称不能为空' });
    }
    const team = createTeam(name);
    res.json(team);
  } catch (err) {
    res.status(500).json({ error: '创建团队失败' });
  }
});

app.get('/api/team/:id', (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const team = getTeam(id);
    if (!team) {
      return res.status(404).json({ error: '团队不存在' });
    }
    res.json(team);
  } catch (err) {
    res.status(500).json({ error: '获取团队信息失败' });
  }
});

app.get('/api/team/invite/:code', (req: Request, res: Response) => {
  try {
    const { code } = req.params;
    const team = getTeamByInviteCode(code);
    if (!team) {
      return res.status(404).json({ error: '邀请码无效' });
    }
    res.json(team);
  } catch (err) {
    res.status(500).json({ error: '获取团队信息失败' });
  }
});

app.post('/api/member', (req: Request, res: Response) => {
  try {
    const { team_id, name, color } = req.body;
    if (!team_id || !name) {
      return res.status(400).json({ error: '团队ID和成员名称不能为空' });
    }
    const member = addMember(team_id, name, color);
    res.json(member);
  } catch (err) {
    res.status(500).json({ error: '添加成员失败' });
  }
});

app.get('/api/member/team/:teamId', (req: Request, res: Response) => {
  try {
    const { teamId } = req.params;
    const members = getMembers(teamId);
    res.json(members);
  } catch (err) {
    res.status(500).json({ error: '获取成员列表失败' });
  }
});

app.patch('/api/member/:id/color', (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { color } = req.body;
    if (!color) {
      return res.status(400).json({ error: '颜色不能为空' });
    }
    updateMemberColor(id, color);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: '更新颜色失败' });
  }
});

app.post('/api/slot', (req: Request, res: Response) => {
  try {
    const { member_id, team_id, start_time, end_time } = req.body;
    if (!member_id || !team_id || !start_time || !end_time) {
      return res.status(400).json({ error: '参数不完整' });
    }
    const slot = addTimeSlot(member_id, team_id, start_time, end_time);
    res.json(slot);
  } catch (err) {
    res.status(500).json({ error: '添加时段失败' });
  }
});

app.get('/api/slot/team/:teamId', (req: Request, res: Response) => {
  try {
    const { teamId } = req.params;
    const slots = getTimeSlotsByTeam(teamId);
    res.json(slots);
  } catch (err) {
    res.status(500).json({ error: '获取时段列表失败' });
  }
});

app.get('/api/slot/member/:memberId', (req: Request, res: Response) => {
  try {
    const { memberId } = req.params;
    const slots = getTimeSlotsByMember(memberId);
    res.json(slots);
  } catch (err) {
    res.status(500).json({ error: '获取时段列表失败' });
  }
});

app.delete('/api/slot/:id', (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    deleteTimeSlot(id);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: '删除时段失败' });
  }
});

app.post('/api/event', (req: Request, res: Response) => {
  try {
    const { team_id, title, start_time, end_time, category } = req.body;
    if (!team_id || !title || !start_time || !end_time) {
      return res.status(400).json({ error: '参数不完整' });
    }
    const event = createEvent(team_id, title, start_time, end_time, category || 'team');
    res.json(event);
  } catch (err) {
    res.status(500).json({ error: '创建活动失败' });
  }
});

app.get('/api/event/team/:teamId', (req: Request, res: Response) => {
  try {
    const { teamId } = req.params;
    const events = getEventsByTeam(teamId);
    res.json(events);
  } catch (err) {
    res.status(500).json({ error: '获取活动列表失败' });
  }
});

app.put('/api/event/:id', (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { title, start_time, end_time, category } = req.body;
    const event = updateEvent(id, title, start_time, end_time, category || 'team');
    if (!event) {
      return res.status(404).json({ error: '活动不存在' });
    }
    res.json(event);
  } catch (err) {
    res.status(500).json({ error: '更新活动失败' });
  }
});

app.delete('/api/event/:id', (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    deleteEvent(id);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: '删除活动失败' });
  }
});

app.post('/api/conflict-check', (req: Request, res: Response) => {
  try {
    const { team_id, range_start, range_end, duration_minutes } = req.body;
    if (!team_id || !range_start || !range_end || !duration_minutes) {
      return res.status(400).json({ error: '参数不完整' });
    }
    const result = checkConflicts(team_id, range_start, range_end, duration_minutes);
    res.json(result);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: '冲突检测失败' });
  }
});

app.listen(PORT, () => {
  console.log(`服务器运行在 http://localhost:${PORT}`);
});
