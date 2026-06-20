import { Router, Request, Response } from 'express';
import {
  activities,
  registrations,
  users,
  serviceRecords,
  getNextActivityId,
  getNextRegistrationId,
  getNextServiceRecordId,
  generateId,
  Activity,
  Registration,
} from '../data';

const router = Router();

function updateActivityStatus(activity: Activity): Activity {
  const now = new Date();
  const activityDate = new Date(activity.dateTime);

  if (activityDate < now) {
    activity.status = 'ended';
  } else if (activityDate.getTime() - now.getTime() < 24 * 60 * 60 * 1000) {
    activity.status = 'upcoming';
  } else {
    activity.status = 'recruiting';
  }

  return activity;
}

router.get('/', (_req: Request, res: Response) => {
  const updatedActivities = activities.map(updateActivityStatus);
  res.json(updatedActivities);
});

router.get('/:id', (req: Request, res: Response) => {
  const activity = activities.find((a) => a.id === req.params.id);
  if (!activity) {
    return res.status(404).json({ error: '活动不存在' });
  }

  const updatedActivity = updateActivityStatus(activity);
  const registeredCount = registrations.filter(
    (r) => r.activityId === activity.id
  ).length;

  res.json({
    ...updatedActivity,
    registeredCount,
  });
});

router.post('/', (req: Request, res: Response) => {
  const {
    name,
    location,
    dateTime,
    maxVolunteers,
    description,
    skillsRequired,
    createdBy,
  } = req.body;

  if (!name || !location || !dateTime || !maxVolunteers) {
    return res.status(400).json({ error: '请填写必填项' });
  }

  const newActivity: Activity = {
    id: generateId('act', getNextActivityId()),
    name,
    location,
    dateTime,
    maxVolunteers,
    description: description || '',
    skillsRequired: skillsRequired || [],
    status: 'recruiting',
    createdBy: createdBy || 'admin-1',
    createdAt: new Date().toISOString(),
  };

  activities.push(newActivity);
  res.status(201).json(newActivity);
});

router.get('/:id/registrations', (req: Request, res: Response) => {
  const activityId = req.params.id;
  const activityRegs = registrations.filter((r) => r.activityId === activityId);

  const result = activityRegs.map((reg) => {
    const user = users.find((u) => u.id === reg.userId);
    return {
      ...reg,
      nickname: user?.nickname || '',
      avatar: user?.avatar || '',
    };
  });

  res.json(result);
});

router.post('/:id/register', (req: Request, res: Response) => {
  const activityId = req.params.id;
  const { userId } = req.body;

  const activity = activities.find((a) => a.id === activityId);
  if (!activity) {
    return res.status(404).json({ error: '活动不存在' });
  }

  updateActivityStatus(activity);
  if (activity.status === 'ended') {
    return res.status(400).json({ error: '活动已结束，无法报名' });
  }

  const existingReg = registrations.find(
    (r) => r.userId === userId && r.activityId === activityId
  );
  if (existingReg) {
    return res.status(400).json({ error: '您已报名该活动' });
  }

  const currentRegCount = registrations.filter(
    (r) => r.activityId === activityId
  ).length;
  if (currentRegCount >= activity.maxVolunteers) {
    return res.status(400).json({ error: '活动报名人数已满' });
  }

  const newReg: Registration = {
    id: generateId('reg', getNextRegistrationId()),
    userId,
    activityId,
    registeredAt: new Date().toISOString(),
    checkedIn: false,
  };

  registrations.push(newReg);
  res.status(201).json(newReg);
});

router.post('/:id/checkin', (req: Request, res: Response) => {
  const activityId = req.params.id;
  const { userId } = req.body;

  const activity = activities.find((a) => a.id === activityId);
  if (!activity) {
    return res.status(404).json({ error: '活动不存在' });
  }

  const registration = registrations.find(
    (r) => r.userId === userId && r.activityId === activityId
  );
  if (!registration) {
    return res.status(400).json({ error: '您未报名该活动' });
  }

  if (registration.checkedIn) {
    return res.status(400).json({ error: '您已签到' });
  }

  registration.checkedIn = true;
  registration.checkedInAt = new Date().toISOString();

  const serviceHours = 4;
  const serviceRecord = {
    id: generateId('sr', getNextServiceRecordId()),
    userId,
    activityId,
    hours: serviceHours,
    date: new Date().toISOString().split('T')[0],
  };
  serviceRecords.push(serviceRecord);

  const user = users.find((u) => u.id === userId);
  if (user) {
    user.totalHours += serviceHours;
    if (user.totalHours >= 100) {
      user.certificationLevel = 3;
    } else if (user.totalHours >= 50) {
      user.certificationLevel = 2;
    } else if (user.totalHours >= 10) {
      user.certificationLevel = 1;
    }
  }

  res.json({
    success: true,
    hours: serviceHours,
    totalHours: user?.totalHours || 0,
    newBadge: getNewBadge(user?.totalHours || 0, serviceHours),
  });
});

function getNewBadge(totalHours: number, addedHours: number): string | null {
  const previousHours = totalHours - addedHours;
  const badgeThresholds = [
    { hours: 10, badge: 'bronze' },
    { hours: 50, badge: 'silver' },
    { hours: 100, badge: 'gold' },
  ];

  for (const threshold of badgeThresholds) {
    if (previousHours < threshold.hours && totalHours >= threshold.hours) {
      return threshold.badge;
    }
  }
  return null;
}

router.put('/:id', (req: Request, res: Response) => {
  const activityId = req.params.id;
  const activityIndex = activities.findIndex((a) => a.id === activityId);

  if (activityIndex === -1) {
    return res.status(404).json({ error: '活动不存在' });
  }

  const { name, location, dateTime, maxVolunteers, description, skillsRequired } = req.body;
  if (name !== undefined) activities[activityIndex].name = name;
  if (location !== undefined) activities[activityIndex].location = location;
  if (dateTime !== undefined) activities[activityIndex].dateTime = dateTime;
  if (maxVolunteers !== undefined) activities[activityIndex].maxVolunteers = maxVolunteers;
  if (description !== undefined) activities[activityIndex].description = description;
  if (skillsRequired !== undefined) activities[activityIndex].skillsRequired = skillsRequired;

  res.json(activities[activityIndex]);
});

router.delete('/:id', (req: Request, res: Response) => {
  const activityId = req.params.id;
  const activityIndex = activities.findIndex((a) => a.id === activityId);

  if (activityIndex === -1) {
    return res.status(404).json({ error: '活动不存在' });
  }

  activities.splice(activityIndex, 1);
  res.json({ success: true });
});

export default router;
