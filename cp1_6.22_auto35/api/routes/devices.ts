import { Router, type Request, type Response } from 'express';
import { getAllDevices, getRecentBookingsByDevice, getBookingsByDevice } from '../db.js';

const router = Router();

router.get('/', (_req: Request, res: Response): void => {
  const devices = getAllDevices();
  const devicesWithBookings = devices.map(device => {
    const recentBookings = getRecentBookingsByDevice(device.id, 3);
    return { ...device, recentBookings };
  });
  res.json(devicesWithBookings);
});

router.get('/:id/bookings', (req: Request, res: Response): void => {
  const deviceId = parseInt(req.params.id);
  const date = req.query.date as string | undefined;
  const bookings = getBookingsByDevice(deviceId, date);
  res.json(bookings);
});

export default router;
