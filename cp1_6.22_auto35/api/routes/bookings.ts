import { Router, type Request, type Response } from 'express';
import { createBooking, getUserBookings } from '../db.js';

const router = Router();

router.post('/', (req: Request, res: Response): void => {
  const { deviceId, userId, date, startTime, endTime } = req.body;
  if (!deviceId || !userId || !date || !startTime || !endTime) {
    res.status(400).json({ success: false, error: '所有字段均为必填' });
    return;
  }
  const result = createBooking(deviceId, userId, date, startTime, endTime);
  if (!result.success) {
    res.status(409).json({ success: false, error: result.error });
    return;
  }
  res.status(201).json({ success: true, booking: result.booking });
});

router.get('/users/:id', (req: Request, res: Response): void => {
  const userId = parseInt(req.params.id);
  const bookings = getUserBookings(userId);
  res.json(bookings);
});

export default router;
