export interface Member {
  id: string;
  name: string;
  level: '普通' | '银卡' | '金卡';
  remainingCount: number;
  checkIns: number;
  lastCheckIn?: string;
}

export interface Course {
  id: string;
  name: string;
  coachId: string;
  coachName: string;
  day: number;
  timeSlot: number;
  maxCapacity: number;
  currentBookings: number;
  room: string;
  isMorning: boolean;
}

export interface Coach {
  id: string;
  name: string;
  specialty: string;
  schedule: ScheduleSlot[];
}

export interface ScheduleSlot {
  day: number;
  startSlot: number;
  endSlot: number;
  courseId: string;
  courseName: string;
  room: string;
}

export interface Booking {
  id: string;
  memberId: string;
  courseId: string;
  bookedAt: string;
}

export interface DashboardStats {
  todayCheckIns: number;
  popularCourse: string;
  totalMembers: number;
  availableCoaches: number;
}
