export interface Trainer {
  id: string;
  name: string;
  specialty: string;
  avatar?: string;
}

export interface TimeSlot {
  id: string;
  trainerId: string;
  date: string;
  startTime: string;
  endTime: string;
  isBooked: boolean;
  bookedBy?: string;
}

export interface Booking {
  id: string;
  trainerId: string;
  memberId: string;
  memberName: string;
  timeSlotId: string;
  date: string;
  startTime: string;
  endTime: string;
  courseType: string;
  notes?: string;
  status: 'pending' | 'completed' | 'cancelled';
  createdAt: string;
}

export interface TrainingRecord {
  id: string;
  bookingId: string;
  trainerId: string;
  trainerName: string;
  memberId: string;
  courseType: string;
  date: string;
  startTime: string;
  endTime: string;
  status: 'pending_review' | 'completed';
  rating?: number;
  feedback?: string;
  ratedAt?: string;
}

export interface Schedule {
  trainerId: string;
  weekStart: string;
  slots: {
    dayOfWeek: number;
    startTime: string;
    endTime: string;
  }[];
}

export type CourseType = 'strength' | 'yoga' | 'cardio' | 'hiit' | 'flexibility';

export interface User {
  id: string;
  name: string;
  role: 'trainer' | 'member' | 'admin';
}

export interface Stats {
  weeklyBookings: number;
  popularTrainers: {
    trainerId: string;
    trainerName: string;
    count: number;
  }[];
  courseDistribution: {
    type: string;
    count: number;
    percentage: number;
  }[];
}
