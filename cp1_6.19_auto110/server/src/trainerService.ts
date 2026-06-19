import { v4 as uuidv4 } from 'uuid';
import { dataStore } from './dataStore';
import { Trainer, TimeSlot, Schedule } from './types';

export const trainerService = {
  getAllTrainers: (): Trainer[] => {
    return dataStore.getTrainers();
  },

  getTrainerById: (id: string): Trainer | undefined => {
    return dataStore.getTrainers().find(t => t.id === id);
  },

  createTrainer: (name: string, specialty: string): Trainer => {
    const trainers = dataStore.getTrainers();
    const newTrainer: Trainer = {
      id: uuidv4(),
      name,
      specialty,
    };
    trainers.push(newTrainer);
    dataStore.setTrainers(trainers);
    return newTrainer;
  },

  updateTrainer: (id: string, updates: Partial<Trainer>): Trainer | undefined => {
    const trainers = dataStore.getTrainers();
    const index = trainers.findIndex(t => t.id === id);
    if (index === -1) return undefined;
    trainers[index] = { ...trainers[index], ...updates };
    dataStore.setTrainers(trainers);
    return trainers[index];
  },

  deleteTrainer: (id: string): boolean => {
    const trainers = dataStore.getTrainers();
    const filtered = trainers.filter(t => t.id !== id);
    if (filtered.length === trainers.length) return false;
    dataStore.setTrainers(filtered);
    return true;
  },

  getTrainerSchedule: (trainerId: string, weekStart: string): Schedule | undefined => {
    const schedules = dataStore.getSchedules();
    return schedules.find(s => s.trainerId === trainerId && s.weekStart === weekStart);
  },

  setTrainerSchedule: (
    trainerId: string,
    weekStart: string,
    slots: { dayOfWeek: number; startTime: string; endTime: string }[]
  ): Schedule => {
    const schedules = dataStore.getSchedules();
    const existingIndex = schedules.findIndex(
      s => s.trainerId === trainerId && s.weekStart === weekStart
    );

    const schedule: Schedule = {
      trainerId,
      weekStart,
      slots,
    };

    if (existingIndex >= 0) {
      schedules[existingIndex] = schedule;
    } else {
      schedules.push(schedule);
    }

    dataStore.setSchedules(schedules);
    generateTimeSlotsFromSchedule(schedule);
    return schedule;
  },

  copyLastWeekSchedule: (trainerId: string, currentWeekStart: string): Schedule | undefined => {
    const currentDate = new Date(currentWeekStart);
    const lastWeekDate = new Date(currentDate);
    lastWeekDate.setDate(lastWeekDate.getDate() - 7);
    const lastWeekStart = lastWeekDate.toISOString().split('T')[0];

    const lastWeekSchedule = this.getTrainerSchedule(trainerId, lastWeekStart);
    if (!lastWeekSchedule) return undefined;

    return this.setTrainerSchedule(trainerId, currentWeekStart, lastWeekSchedule.slots);
  },

  getTrainerTimeSlots: (trainerId: string, startDate: string, endDate: string): TimeSlot[] => {
    const allSlots = dataStore.getTimeSlots();
    return allSlots.filter(
      slot =>
        slot.trainerId === trainerId &&
        slot.date >= startDate &&
        slot.date <= endDate
    );
  },
};

function generateTimeSlotsFromSchedule(schedule: Schedule): void {
  const allSlots = dataStore.getTimeSlots();
  const weekStart = new Date(schedule.weekStart);

  const newSlots: TimeSlot[] = [];

  schedule.slots.forEach(slotConfig => {
    const date = new Date(weekStart);
    date.setDate(date.getDate() + slotConfig.dayOfWeek);
    const dateStr = date.toISOString().split('T')[0];

    const [startHour, startMin] = slotConfig.startTime.split(':').map(Number);
    const [endHour, endMin] = slotConfig.endTime.split(':').map(Number);

    let currentMin = startHour * 60 + startMin;
    const endTotalMin = endHour * 60 + endMin;

    while (currentMin < endTotalMin) {
      const currentHour = Math.floor(currentMin / 60);
      const mins = currentMin % 60;
      const startTime = `${currentHour.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}`;

      currentMin += 30;
      const nextHour = Math.floor(currentMin / 60);
      const nextMins = currentMin % 60;
      const endTime = `${nextHour.toString().padStart(2, '0')}:${nextMins.toString().padStart(2, '0')}`;

      const existingSlot = allSlots.find(
        s =>
          s.trainerId === schedule.trainerId &&
          s.date === dateStr &&
          s.startTime === startTime
      );

      if (!existingSlot) {
        newSlots.push({
          id: uuidv4(),
          trainerId: schedule.trainerId,
          date: dateStr,
          startTime,
          endTime,
          isBooked: false,
        });
      }
    }
  });

  if (newSlots.length > 0) {
    dataStore.setTimeSlots([...allSlots, ...newSlots]);
  }
}
