import express, { Request, Response } from 'express';
import cors from 'cors';
import { trainerService } from './trainerService';
import { sessionService } from './sessionService';
import { dataStore } from './dataStore';

const app = express();
const PORT = 3001;

app.use(cors());
app.use(express.json());

dataStore.initializeMockData();

app.get('/api/health', (_req: Request, res: Response) => {
  res.json({ status: 'ok', message: '健身房预约平台API运行正常' });
});

app.get('/api/trainers', (_req: Request, res: Response) => {
  const trainers = trainerService.getAllTrainers();
  res.json(trainers);
});

app.get('/api/trainers/:id', (req: Request, res: Response) => {
  const trainer = trainerService.getTrainerById(req.params.id);
  if (!trainer) {
    return res.status(404).json({ error: '教练不存在' });
  }
  res.json(trainer);
});

app.post('/api/trainers', (req: Request, res: Response) => {
  const { name, specialty } = req.body;
  if (!name || !specialty) {
    return res.status(400).json({ error: '缺少必要参数' });
  }
  const trainer = trainerService.createTrainer(name, specialty);
  res.status(201).json(trainer);
});

app.put('/api/trainers/:id', (req: Request, res: Response) => {
  const trainer = trainerService.updateTrainer(req.params.id, req.body);
  if (!trainer) {
    return res.status(404).json({ error: '教练不存在' });
  }
  res.json(trainer);
});

app.delete('/api/trainers/:id', (req: Request, res: Response) => {
  const success = trainerService.deleteTrainer(req.params.id);
  if (!success) {
    return res.status(404).json({ error: '教练不存在' });
  }
  res.json({ message: '删除成功' });
});

app.get('/api/trainers/:id/schedule', (req: Request, res: Response) => {
  const { weekStart } = req.query;
  if (!weekStart || typeof weekStart !== 'string') {
    return res.status(400).json({ error: '缺少weekStart参数' });
  }
  const schedule = trainerService.getTrainerSchedule(req.params.id, weekStart);
  res.json(schedule || { trainerId: req.params.id, weekStart, slots: [] });
});

app.post('/api/trainers/:id/schedule', (req: Request, res: Response) => {
  const { weekStart, slots } = req.body;
  if (!weekStart || !slots) {
    return res.status(400).json({ error: '缺少必要参数' });
  }
  const schedule = trainerService.setTrainerSchedule(req.params.id, weekStart, slots);
  res.status(201).json(schedule);
});

app.post('/api/trainers/:id/schedule/copy', (req: Request, res: Response) => {
  const { currentWeekStart } = req.body;
  if (!currentWeekStart) {
    return res.status(400).json({ error: '缺少currentWeekStart参数' });
  }
  const schedule = trainerService.copyLastWeekSchedule(req.params.id, currentWeekStart);
  if (!schedule) {
    return res.status(404).json({ error: '上周排班不存在' });
  }
  res.json(schedule);
});

app.get('/api/timeslots', (req: Request, res: Response) => {
  const { startDate, endDate, trainerId } = req.query;
  if (!startDate || !endDate || typeof startDate !== 'string' || typeof endDate !== 'string') {
    return res.status(400).json({ error: '缺少startDate或endDate参数' });
  }
  const slots = sessionService.getAvailableTimeSlots(
    startDate,
    endDate,
    typeof trainerId === 'string' ? trainerId : undefined
  );
  res.json(slots);
});

app.get('/api/bookings', (req: Request, res: Response) => {
  const { memberId, trainerId, status } = req.query;
  const bookings = sessionService.getBookings(
    typeof memberId === 'string' ? memberId : undefined,
    typeof trainerId === 'string' ? trainerId : undefined,
    (status as 'pending' | 'completed' | 'cancelled') || undefined
  );
  res.json(bookings);
});

app.post('/api/bookings', async (req: Request, res: Response) => {
  const { timeSlotId, memberId, memberName, courseType, notes } = req.body;
  if (!timeSlotId || !memberId || !memberName || !courseType) {
    return res.status(400).json({ error: '缺少必要参数' });
  }
  const result = await sessionService.createBooking(
    timeSlotId,
    memberId,
    memberName,
    courseType,
    notes
  );
  if (!result.success) {
    return res.status(409).json({ error: result.message });
  }
  res.status(201).json(result.booking);
});

app.put('/api/bookings/:id/cancel', (req: Request, res: Response) => {
  const result = sessionService.cancelBooking(req.params.id);
  if (!result.success) {
    return res.status(404).json({ error: result.message });
  }
  res.json({ message: result.message });
});

app.put('/api/bookings/:id/complete', (req: Request, res: Response) => {
  const result = sessionService.completeBooking(req.params.id);
  if (!result.success) {
    return res.status(400).json({ error: result.message });
  }
  res.json({ message: result.message, record: result.record });
});

app.get('/api/training-records', (req: Request, res: Response) => {
  const { memberId, status } = req.query;
  const records = sessionService.getTrainingRecords(
    typeof memberId === 'string' ? memberId : undefined,
    (status as 'pending_review' | 'completed') || undefined
  );
  res.json(records);
});

app.put('/api/training-records/:id/rate', (req: Request, res: Response) => {
  const { rating, feedback } = req.body;
  if (rating === undefined) {
    return res.status(400).json({ error: '缺少rating参数' });
  }
  const result = sessionService.rateTraining(req.params.id, rating, feedback);
  if (!result.success) {
    return res.status(400).json({ error: result.message });
  }
  res.json({ message: result.message, record: result.record });
});

app.get('/api/stats', (_req: Request, res: Response) => {
  const stats = sessionService.getStats();
  res.json(stats);
});

app.get('/api/users', (_req: Request, res: Response) => {
  const users = dataStore.getUsers();
  res.json(users);
});

app.listen(PORT, () => {
  console.log(`🚀 健身房预约平台API服务器运行在 http://localhost:${PORT}`);
});
