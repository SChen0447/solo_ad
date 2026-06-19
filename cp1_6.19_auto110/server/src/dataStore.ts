import * as fs from 'fs';
import * as path from 'path';
import { Trainer, TimeSlot, Booking, TrainingRecord, Schedule, User } from './types';
import { v4 as uuidv4 } from 'uuid';

const DATA_DIR = path.join(__dirname, '..', 'data');
const FILES = {
  trainers: path.join(DATA_DIR, 'trainers.json'),
  timeSlots: path.join(DATA_DIR, 'timeSlots.json'),
  bookings: path.join(DATA_DIR, 'bookings.json'),
  trainingRecords: path.join(DATA_DIR, 'trainingRecords.json'),
  schedules: path.join(DATA_DIR, 'schedules.json'),
  users: path.join(DATA_DIR, 'users.json'),
};

function ensureDataDir(): void {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
}

function readFile<T>(filePath: string, defaultValue: T): T {
  ensureDataDir();
  if (!fs.existsSync(filePath)) {
    writeFile(filePath, defaultValue);
    return defaultValue;
  }
  try {
    const content = fs.readFileSync(filePath, 'utf-8');
    return JSON.parse(content);
  } catch {
    return defaultValue;
  }
}

function writeFile<T>(filePath: string, data: T): void {
  ensureDataDir();
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf-8');
}

function initializeMockData(): void {
  const trainers: Trainer[] = readFile(FILES.trainers, []);
  if (trainers.length === 0) {
    const mockTrainers: Trainer[] = [
      { id: uuidv4(), name: '张教练', specialty: '力量训练' },
      { id: uuidv4(), name: '李教练', specialty: '瑜伽' },
      { id: uuidv4(), name: '王教练', specialty: '有氧操' },
      { id: uuidv4(), name: '陈教练', specialty: 'HIIT' },
    ];
    writeFile(FILES.trainers, mockTrainers);

    const users: User[] = [
      { id: uuidv4(), name: '会员小明', role: 'member' },
      { id: uuidv4(), name: '会员小红', role: 'member' },
      ...mockTrainers.map(t => ({ id: t.id, name: t.name, role: 'trainer' as const })),
    ];
    writeFile(FILES.users, users);

    const today = new Date();
    const timeSlots: TimeSlot[] = [];
    for (let i = 0; i < 14; i++) {
      const date = new Date(today);
      date.setDate(date.getDate() + i);
      const dateStr = date.toISOString().split('T')[0];
      
      mockTrainers.forEach(trainer => {
        const slots = generateDailySlots(trainer.id, dateStr);
        timeSlots.push(...slots);
      });
    }
    writeFile(FILES.timeSlots, timeSlots);
    writeFile(FILES.bookings, []);
    writeFile(FILES.trainingRecords, []);
    writeFile(FILES.schedules, []);
  }
}

function generateDailySlots(trainerId: string, dateStr: string): TimeSlot[] {
  const slots: TimeSlot[] = [];
  for (let hour = 9; hour < 21; hour++) {
    for (let min = 0; min < 60; min += 30) {
      const startTime = `${hour.toString().padStart(2, '0')}:${min.toString().padStart(2, '0')}`;
      const endHour = min === 30 ? hour + 1 : hour;
      const endMin = min === 30 ? 0 : 30;
      const endTime = `${endHour.toString().padStart(2, '0')}:${endMin.toString().padStart(2, '0')}`;
      
      slots.push({
        id: uuidv4(),
        trainerId,
        date: dateStr,
        startTime,
        endTime,
        isBooked: false,
      });
    }
  }
  return slots;
}

export const dataStore = {
  getTrainers: (): Trainer[] => readFile(FILES.trainers, []),
  setTrainers: (data: Trainer[]) => writeFile(FILES.trainers, data),
  
  getTimeSlots: (): TimeSlot[] => readFile(FILES.timeSlots, []),
  setTimeSlots: (data: TimeSlot[]) => writeFile(FILES.timeSlots, data),
  
  getBookings: (): Booking[] => readFile(FILES.bookings, []),
  setBookings: (data: Booking[]) => writeFile(FILES.bookings, data),
  
  getTrainingRecords: (): TrainingRecord[] => readFile(FILES.trainingRecords, []),
  setTrainingRecords: (data: TrainingRecord[]) => writeFile(FILES.trainingRecords, data),
  
  getSchedules: (): Schedule[] => readFile(FILES.schedules, []),
  setSchedules: (data: Schedule[]) => writeFile(FILES.schedules, data),
  
  getUsers: (): User[] => readFile(FILES.users, []),
  setUsers: (data: User[]) => writeFile(FILES.users, data),
  
  initializeMockData,
};
