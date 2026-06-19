import { v4 as uuidv4 } from 'uuid';
import { dataStore } from './dataStore';
import { trainerService } from './trainerService';
import { Booking, TrainingRecord, TimeSlot, Stats } from './types';

const bookingLocks = new Map<string, Promise<boolean>>();

export const sessionService = {
  getAvailableTimeSlots: (
    startDate: string,
    endDate: string,
    trainerId?: string
  ): (TimeSlot & { trainerName: string; specialty: string })[] => {
    const allSlots = dataStore.getTimeSlots();
    const trainers = dataStore.getTrainers();
    const trainerMap = new Map(trainers.map(t => [t.id, t]));

    return allSlots
      .filter(slot => {
        if (trainerId && slot.trainerId !== trainerId) return false;
        return slot.date >= startDate && slot.date <= endDate;
      })
      .map(slot => {
        const trainer = trainerMap.get(slot.trainerId);
        return {
          ...slot,
          trainerName: trainer?.name || '未知教练',
          specialty: trainer?.specialty || '未知',
        };
      });
  },

  getBookings: (
    memberId?: string,
    trainerId?: string,
    status?: Booking['status']
  ): (Booking & { trainerName: string })[] => {
    let bookings = dataStore.getBookings();
    const trainers = dataStore.getTrainers();
    const trainerMap = new Map(trainers.map(t => [t.id, t]));

    if (memberId) {
      bookings = bookings.filter(b => b.memberId === memberId);
    }
    if (trainerId) {
      bookings = bookings.filter(b => b.trainerId === trainerId);
    }
    if (status) {
      bookings = bookings.filter(b => b.status === status);
    }

    return bookings.map(b => ({
      ...b,
      trainerName: trainerMap.get(b.trainerId)?.name || '未知教练',
    }));
  },

  createBooking: async (
    timeSlotId: string,
    memberId: string,
    memberName: string,
    courseType: string,
    notes?: string
  ): Promise<{ success: boolean; message: string; booking?: Booking }> => {
    if (bookingLocks.has(timeSlotId)) {
      const result = await bookingLocks.get(timeSlotId);
      if (!result) {
        return { success: false, message: '该时段已被预约' };
      }
    }

    const lockPromise = this.acquireLock(timeSlotId);
    bookingLocks.set(timeSlotId, lockPromise);

    try {
      const lockAcquired = await lockPromise;
      if (!lockAcquired) {
        return { success: false, message: '该时段已被预约' };
      }

      const timeSlots = dataStore.getTimeSlots();
      const slotIndex = timeSlots.findIndex(s => s.id === timeSlotId);

      if (slotIndex === -1) {
        return { success: false, message: '时段不存在' };
      }

      const slot = timeSlots[slotIndex];
      if (slot.isBooked) {
        return { success: false, message: '该时段已被预约' };
      }

      const trainer = trainerService.getTrainerById(slot.trainerId);
      if (!trainer) {
        return { success: false, message: '教练不存在' };
      }

      timeSlots[slotIndex] = { ...slot, isBooked: true, bookedBy: memberId };
      dataStore.setTimeSlots(timeSlots);

      const booking: Booking = {
        id: uuidv4(),
        trainerId: slot.trainerId,
        memberId,
        memberName,
        timeSlotId,
        date: slot.date,
        startTime: slot.startTime,
        endTime: slot.endTime,
        courseType,
        notes,
        status: 'pending',
        createdAt: new Date().toISOString(),
      };

      const bookings = dataStore.getBookings();
      bookings.push(booking);
      dataStore.setBookings(bookings);

      return { success: true, message: '预约成功', booking };
    } finally {
      bookingLocks.delete(timeSlotId);
    }
  },

  async acquireLock(timeSlotId: string): Promise<boolean> {
    await new Promise(resolve => setTimeout(resolve, 50));
    const timeSlots = dataStore.getTimeSlots();
    const slot = timeSlots.find(s => s.id === timeSlotId);
    return !slot?.isBooked;
  },

  cancelBooking: (bookingId: string): { success: boolean; message: string } => {
    const bookings = dataStore.getBookings();
    const bookingIndex = bookings.findIndex(b => b.id === bookingId);

    if (bookingIndex === -1) {
      return { success: false, message: '预约不存在' };
    }

    const booking = bookings[bookingIndex];
    bookings[bookingIndex] = { ...booking, status: 'cancelled' };
    dataStore.setBookings(bookings);

    const timeSlots = dataStore.getTimeSlots();
    const slotIndex = timeSlots.findIndex(s => s.id === booking.timeSlotId);
    if (slotIndex !== -1) {
      timeSlots[slotIndex] = { ...timeSlots[slotIndex], isBooked: false, bookedBy: undefined };
      dataStore.setTimeSlots(timeSlots);
    }

    return { success: true, message: '取消成功' };
  },

  completeBooking: (bookingId: string): { success: boolean; message: string; record?: TrainingRecord } => {
    const bookings = dataStore.getBookings();
    const bookingIndex = bookings.findIndex(b => b.id === bookingId);

    if (bookingIndex === -1) {
      return { success: false, message: '预约不存在' };
    }

    const booking = bookings[bookingIndex];
    if (booking.status !== 'pending') {
      return { success: false, message: '预约状态不正确' };
    }

    bookings[bookingIndex] = { ...booking, status: 'completed' };
    dataStore.setBookings(bookings);

    const trainer = trainerService.getTrainerById(booking.trainerId);
    const record: TrainingRecord = {
      id: uuidv4(),
      bookingId: booking.id,
      trainerId: booking.trainerId,
      trainerName: trainer?.name || '未知教练',
      memberId: booking.memberId,
      courseType: booking.courseType,
      date: booking.date,
      startTime: booking.startTime,
      endTime: booking.endTime,
      status: 'pending_review',
    };

    const records = dataStore.getTrainingRecords();
    records.push(record);
    dataStore.setTrainingRecords(records);

    return { success: true, message: '课程已完成，训练记录已生成', record };
  },

  getTrainingRecords: (
    memberId?: string,
    status?: TrainingRecord['status']
  ): TrainingRecord[] => {
    let records = dataStore.getTrainingRecords();

    if (memberId) {
      records = records.filter(r => r.memberId === memberId);
    }
    if (status) {
      records = records.filter(r => r.status === status);
    }

    return records.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  },

  rateTraining: (
    recordId: string,
    rating: number,
    feedback?: string
  ): { success: boolean; message: string; record?: TrainingRecord } => {
    if (rating < 1 || rating > 5) {
      return { success: false, message: '评分必须在1-5星之间' };
    }

    const records = dataStore.getTrainingRecords();
    const recordIndex = records.findIndex(r => r.id === recordId);

    if (recordIndex === -1) {
      return { success: false, message: '训练记录不存在' };
    }

    const record = records[recordIndex];

    const recordDate = new Date(`${record.date}T${record.endTime}`);
    const now = new Date();
    const hoursDiff = (now.getTime() - recordDate.getTime()) / (1000 * 60 * 60);

    if (hoursDiff > 24) {
      return { success: false, message: '已超过24小时评价期限' };
    }

    records[recordIndex] = {
      ...record,
      rating,
      feedback,
      status: 'completed',
      ratedAt: new Date().toISOString(),
    };
    dataStore.setTrainingRecords(records);

    return { success: true, message: '评价成功', record: records[recordIndex] };
  },

  getStats: (): Stats => {
    const bookings = dataStore.getBookings();
    const records = dataStore.getTrainingRecords();
    const trainers = dataStore.getTrainers();

    const now = new Date();
    const weekStart = new Date(now);
    weekStart.setDate(now.getDate() - now.getDay());
    weekStart.setHours(0, 0, 0, 0);

    const weeklyBookings = bookings.filter(b => {
      const bookingDate = new Date(b.createdAt);
      return bookingDate >= weekStart && b.status !== 'cancelled';
    }).length;

    const trainerCounts = new Map<string, number>();
    bookings.forEach(b => {
      if (b.status !== 'cancelled') {
        trainerCounts.set(b.trainerId, (trainerCounts.get(b.trainerId) || 0) + 1);
      }
    });

    const popularTrainers = Array.from(trainerCounts.entries())
      .map(([trainerId, count]) => ({
        trainerId,
        trainerName: trainers.find(t => t.id === trainerId)?.name || '未知',
        count,
      }))
      .sort((a, b) => b.count - a.count);

    const courseCounts = new Map<string, number>();
    [...bookings, ...records].forEach(item => {
      if ('status' in item && item.status === 'cancelled') return;
      courseCounts.set(item.courseType, (courseCounts.get(item.courseType) || 0) + 1);
    });

    const totalCourses = Array.from(courseCounts.values()).reduce((a, b) => a + b, 0);
    const courseTypeMap: Record<string, string> = {
      strength: '力量训练',
      yoga: '瑜伽',
      cardio: '有氧操',
      hiit: 'HIIT',
      flexibility: '拉伸',
    };

    const courseDistribution = Array.from(courseCounts.entries()).map(([type, count]) => ({
      type: courseTypeMap[type] || type,
      count,
      percentage: totalCourses > 0 ? Math.round((count / totalCourses) * 100) : 0,
    }));

    return {
      weeklyBookings,
      popularTrainers,
      courseDistribution,
    };
  },
};
