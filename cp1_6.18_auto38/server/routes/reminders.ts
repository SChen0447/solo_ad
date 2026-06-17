import { Router, Request, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { medicines, reminders } from '../database';
import { Reminder, ReminderStatus } from '../types';

const router = Router();

function checkAndGenerateExpiryReminders() {
  const now = new Date();
  const sevenDaysLater = new Date(now);
  sevenDaysLater.setDate(now.getDate() + 7);

  medicines.forEach(medicine => {
    const expiryDate = new Date(medicine.expiryDate);
    const timeDiff = expiryDate.getTime() - now.getTime();
    const daysDiff = Math.ceil(timeDiff / (1000 * 60 * 60 * 24));

    const existingNear = reminders.find(
      r => r.medicineId === medicine.id && r.severity === 'near' && r.type === 'expiry'
    );
    const existingExpired = reminders.find(
      r => r.medicineId === medicine.id && r.severity === 'expired' && r.type === 'expiry'
    );

    if (daysDiff < 0 && !existingExpired) {
      reminders.push({
        id: uuidv4(),
        type: 'expiry',
        medicineId: medicine.id,
        medicineName: medicine.name,
        severity: 'expired',
        scheduledTime: new Date().toISOString(),
        status: 'pending',
        message: `${medicine.name}已过期${Math.abs(daysDiff)}天，请立即丢弃并更换新药`,
        createdAt: new Date().toISOString()
      });
    } else if (daysDiff >= 0 && daysDiff <= 7 && !existingNear && daysDiff > 0) {
      reminders.push({
        id: uuidv4(),
        type: 'expiry',
        medicineId: medicine.id,
        medicineName: medicine.name,
        severity: 'near',
        scheduledTime: new Date().toISOString(),
        status: 'pending',
        message: `${medicine.name}将在${daysDiff}天后过期，请及时使用或更换`,
        createdAt: new Date().toISOString()
      });
    }
  });
}

checkAndGenerateExpiryReminders();

setInterval(checkAndGenerateExpiryReminders, 5 * 60 * 1000);

router.get('/', (req: Request, res: Response) => {
  checkAndGenerateExpiryReminders();
  res.json(reminders.sort((a, b) =>
    new Date(b.scheduledTime).getTime() - new Date(a.scheduledTime).getTime()
  ));
});

router.post('/', (req: Request, res: Response) => {
  const {
    type,
    medicineId,
    medicineName,
    dosageAmount,
    scheduledTime,
    message
  } = req.body as Partial<Reminder>;

  if (!type || !medicineId || !scheduledTime) {
    return res.status(400).json({ error: '缺少必填字段' });
  }

  const newReminder: Reminder = {
    id: uuidv4(),
    type: type as 'expiry' | 'medication',
    medicineId,
    medicineName: medicineName || '',
    dosageAmount,
    scheduledTime,
    status: 'pending',
    message: message || '',
    createdAt: new Date().toISOString()
  };

  reminders.unshift(newReminder);
  res.status(201).json(newReminder);
});

router.put('/:id/status', (req: Request, res: Response) => {
  const index = reminders.findIndex(r => r.id === req.params.id);
  if (index === -1) {
    return res.status(404).json({ error: '提醒未找到' });
  }

  const { status } = req.body as { status: ReminderStatus };
  reminders[index].status = status;
  res.json(reminders[index]);
});

router.delete('/:id', (req: Request, res: Response) => {
  const index = reminders.findIndex(r => r.id === req.params.id);
  if (index === -1) {
    return res.status(404).json({ error: '提醒未找到' });
  }

  reminders.splice(index, 1);
  res.json({ message: '删除成功' });
});

router.post('/check-expiry', (req: Request, res: Response) => {
  checkAndGenerateExpiryReminders();
  const pendingReminders = reminders.filter(r => r.status === 'pending');
  res.json({
    totalPending: pendingReminders.length,
    expiredCount: pendingReminders.filter(r => r.severity === 'expired').length,
    nearExpiryCount: pendingReminders.filter(r => r.severity === 'near').length,
    reminders: pendingReminders
  });
});

export default router;
