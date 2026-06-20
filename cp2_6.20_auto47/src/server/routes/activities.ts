import { Router, Request, Response } from 'express';
import { activities, users, generateId, updateActivityStatuses, Activity, User } from '../types';

const router = Router();

router.post('/', (req: Request, res: Response) => {
  const adminId = req.headers['x-user-id'] as string;
  const admin = users.find(u => u.id === adminId && u.isAdmin);
  
  if (!admin) {
    return res.status(403).json({ success: false, message: '无权限发布活动' });
  }

  const { name, location, dateTime, maxParticipants, description, skillRequirements } = req.body;

  if (!name || !location || !dateTime || !maxParticipants) {
    return res.status(400).json({ success: false, message: '请填写必填字段' });
  }

  const activityDate = new Date(dateTime);
  const now = new Date();
  const diffDays = Math.ceil((activityDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
  let status: Activity['status'];
  if (activityDate < now) {
    status = 'ended';
  } else if (diffDays <= 3) {
    status = 'upcoming';
  } else {
    status = 'recruiting';
  }

  const newActivity: Activity = {
    id: generateId(),
    name,
    location,
    dateTime,
    maxParticipants,
    description: description || '',
    skillRequirements: skillRequirements || [],
    status,
    participants: [],
    checkedIn: [],
    createdBy: adminId,
  };

  activities.push(newActivity);
  res.json({ success: true, data: newActivity });
});

router.get('/', (req: Request, res: Response) => {
  updateActivityStatuses();
  res.json({ success: true, data: activities });
});

router.get('/:id', (req: Request, res: Response) => {
  updateActivityStatuses();
  const activity = activities.find(a => a.id === req.params.id);
  
  if (!activity) {
    return res.status(404).json({ success: false, message: '活动不存在' });
  }

  res.json({ success: true, data: activity });
});

router.post('/:id/register', (req: Request, res: Response) => {
  const userId = req.headers['x-user-id'] as string;
  
  if (!userId) {
    return res.status(401).json({ success: false, message: '请先登录' });
  }

  updateActivityStatuses();
  const activity = activities.find(a => a.id === req.params.id);
  
  if (!activity) {
    return res.status(404).json({ success: false, message: '活动不存在' });
  }

  if (activity.status === 'ended') {
    return res.status(400).json({ success: false, message: '活动已结束' });
  }

  if (activity.participants.includes(userId)) {
    return res.status(400).json({ success: false, message: '已报名该活动' });
  }

  if (activity.participants.length >= activity.maxParticipants) {
    return res.status(400).json({ success: false, message: '报名人数已满' });
  }

  const user = users.find(u => u.id === userId);
  if (!user) {
    return res.status(404).json({ success: false, message: '用户不存在' });
  }

  activity.participants.push(userId);
  user.registeredActivities.push(activity.id);

  res.json({ success: true, message: '报名成功' });
});

router.post('/:id/checkin', (req: Request, res: Response) => {
  const userId = req.headers['x-user-id'] as string;
  
  if (!userId) {
    return res.status(401).json({ success: false, message: '请先登录' });
  }

  updateActivityStatuses();
  const activity = activities.find(a => a.id === req.params.id);
  
  if (!activity) {
    return res.status(404).json({ success: false, message: '活动不存在' });
  }

  if (!activity.participants.includes(userId)) {
    return res.status(400).json({ success: false, message: '未报名该活动' });
  }

  if (activity.checkedIn.includes(userId)) {
    return res.status(400).json({ success: false, message: '已签到' });
  }

  const activityDate = new Date(activity.dateTime);
  const now = new Date();
  const activityDay = new Date(activityDate.getFullYear(), activityDate.getMonth(), activityDate.getDate());
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  
  if (activityDay.getTime() !== today.getTime()) {
    return res.status(400).json({ success: false, message: '非活动当天，无法签到' });
  }

  const user = users.find(u => u.id === userId);
  if (!user) {
    return res.status(404).json({ success: false, message: '用户不存在' });
  }

  activity.checkedIn.push(userId);
  
  const hours = 3;
  user.totalHours += hours;
  user.serviceHistory.push({
    activityId: activity.id,
    activityName: activity.name,
    date: activity.dateTime.split(' ')[0],
    hours,
  });

  const newBadges: { hours: number; name: string; icon: string; color: string }[] = [];
  const badgeThresholds = [10, 50, 100];
  badgeThresholds.forEach(threshold => {
    if (user.totalHours >= threshold && !user.badges.includes(threshold)) {
      user.badges.push(threshold);
      const badgeConfig = [
        { hours: 10, name: '新手志愿者', icon: '🌱', color: '#22C55E' },
        { hours: 50, name: '优秀志愿者', icon: '⭐', color: '#F59E0B' },
        { hours: 100, name: '资深志愿者', icon: '🏆', color: '#8B5CF6' },
      ];
      const badge = badgeConfig.find(b => b.hours === threshold);
      if (badge) newBadges.push(badge);
    }
  });

  user.authLevel = Math.min(5, Math.floor(user.totalHours / 20) + 1);

  res.json({ 
    success: true, 
    message: '签到成功', 
    data: { 
      hours, 
      totalHours: user.totalHours, 
      newBadges,
      authLevel: user.authLevel 
    } 
  });
});

export default router;
