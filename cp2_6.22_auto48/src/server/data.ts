import { Member, Course, Coach, Booking, DashboardStats, ScheduleSlot } from '../types.js';
import { v4 as uuidv4 } from 'uuid';

let members: Member[] = [
  { id: 'm1', name: '张伟', level: '金卡', remainingCount: 28, checkIns: 12, lastCheckIn: new Date().toISOString().split('T')[0] },
  { id: 'm2', name: '李娜', level: '银卡', remainingCount: 15, checkIns: 8, lastCheckIn: new Date().toISOString().split('T')[0] },
  { id: 'm3', name: '王芳', level: '普通', remainingCount: 5, checkIns: 3, lastCheckIn: undefined },
  { id: 'm4', name: '刘强', level: '金卡', remainingCount: 32, checkIns: 15, lastCheckIn: new Date().toISOString().split('T')[0] },
  { id: 'm5', name: '陈静', level: '银卡', remainingCount: 10, checkIns: 6, lastCheckIn: undefined },
];

let coaches: Coach[] = [
  { id: 'c1', name: '赵教练', specialty: '瑜伽', schedule: [
    { day: 1, startSlot: 0, endSlot: 2, courseId: 'cs1', courseName: '晨间瑜伽', room: 'A01' },
    { day: 3, startSlot: 0, endSlot: 2, courseId: 'cs2', courseName: '冥想瑜伽', room: 'A01' },
    { day: 5, startSlot: 4, endSlot: 6, courseId: 'cs3', courseName: '流瑜伽', room: 'A02' },
  ]},
  { id: 'c2', name: '钱教练', specialty: '力量训练', schedule: [
    { day: 1, startSlot: 4, endSlot: 6, courseId: 'cs4', courseName: '核心力量', room: 'B01' },
    { day: 2, startSlot: 6, endSlot: 8, courseId: 'cs5', courseName: '杠铃训练', room: 'B02' },
    { day: 4, startSlot: 4, endSlot: 6, courseId: 'cs6', courseName: 'HIIT训练', room: 'B01' },
  ]},
  { id: 'c3', name: '孙教练', specialty: '有氧运动', schedule: [
    { day: 2, startSlot: 0, endSlot: 2, courseId: 'cs7', courseName: '动感单车', room: 'C01' },
    { day: 4, startSlot: 0, endSlot: 2, courseId: 'cs8', courseName: '有氧操', room: 'C01' },
    { day: 6, startSlot: 4, endSlot: 6, courseId: 'cs9', courseName: '搏击操', room: 'C02' },
  ]},
  { id: 'c4', name: '周教练', specialty: '普拉提', schedule: [
    { day: 3, startSlot: 4, endSlot: 6, courseId: 'cs10', courseName: '垫上普拉提', room: 'A02' },
    { day: 5, startSlot: 0, endSlot: 2, courseId: 'cs11', courseName: '器械普拉提', room: 'A03' },
  ]},
];

let courses: Course[] = [
  { id: 'cs1', name: '晨间瑜伽', coachId: 'c1', coachName: '赵教练', day: 1, timeSlot: 0, maxCapacity: 15, currentBookings: 8, room: 'A01', isMorning: true },
  { id: 'cs2', name: '冥想瑜伽', coachId: 'c1', coachName: '赵教练', day: 3, timeSlot: 0, maxCapacity: 12, currentBookings: 5, room: 'A01', isMorning: true },
  { id: 'cs3', name: '流瑜伽', coachId: 'c1', coachName: '赵教练', day: 5, timeSlot: 4, maxCapacity: 15, currentBookings: 12, room: 'A02', isMorning: false },
  { id: 'cs4', name: '核心力量', coachId: 'c2', coachName: '钱教练', day: 1, timeSlot: 4, maxCapacity: 20, currentBookings: 18, room: 'B01', isMorning: false },
  { id: 'cs5', name: '杠铃训练', coachId: 'c2', coachName: '钱教练', day: 2, timeSlot: 6, maxCapacity: 10, currentBookings: 10, room: 'B02', isMorning: false },
  { id: 'cs6', name: 'HIIT训练', coachId: 'c2', coachName: '钱教练', day: 4, timeSlot: 4, maxCapacity: 20, currentBookings: 14, room: 'B01', isMorning: false },
  { id: 'cs7', name: '动感单车', coachId: 'c3', coachName: '孙教练', day: 2, timeSlot: 0, maxCapacity: 25, currentBookings: 20, room: 'C01', isMorning: true },
  { id: 'cs8', name: '有氧操', coachId: 'c3', coachName: '孙教练', day: 4, timeSlot: 0, maxCapacity: 30, currentBookings: 22, room: 'C01', isMorning: true },
  { id: 'cs9', name: '搏击操', coachId: 'c3', coachName: '孙教练', day: 6, timeSlot: 4, maxCapacity: 20, currentBookings: 16, room: 'C02', isMorning: false },
  { id: 'cs10', name: '垫上普拉提', coachId: 'c4', coachName: '周教练', day: 3, timeSlot: 4, maxCapacity: 12, currentBookings: 8, room: 'A02', isMorning: false },
  { id: 'cs11', name: '器械普拉提', coachId: 'c4', coachName: '周教练', day: 5, timeSlot: 0, maxCapacity: 8, currentBookings: 6, room: 'A03', isMorning: true },
];

let bookings: Booking[] = [
  { id: 'b1', memberId: 'm1', courseId: 'cs1', bookedAt: new Date().toISOString() },
  { id: 'b2', memberId: 'm2', courseId: 'cs4', bookedAt: new Date().toISOString() },
  { id: 'b3', memberId: 'm4', courseId: 'cs7', bookedAt: new Date().toISOString() },
];

export function getMembers(): Member[] {
  return members;
}

export function getMember(id: string): Member | undefined {
  return members.find(m => m.id === id);
}

export function addMember(name: string, level: '普通' | '银卡' | '金卡', remainingCount: number): Member {
  const member: Member = { id: uuidv4(), name, level, remainingCount, checkIns: 0 };
  members.push(member);
  return member;
}

export function checkInMember(id: string): Member | null {
  const member = members.find(m => m.id === id);
  if (!member || member.remainingCount <= 0) return null;
  member.remainingCount--;
  member.checkIns++;
  member.lastCheckIn = new Date().toISOString().split('T')[0];
  return member;
}

export function getCourses(): Course[] {
  return courses;
}

export function getCourse(id: string): Course | undefined {
  return courses.find(c => c.id === id);
}

export function addCourse(data: Omit<Course, 'id' | 'currentBookings'>): Course {
  const course: Course = { ...data, id: uuidv4(), currentBookings: 0 };
  courses.push(course);
  return course;
}

export function bookCourse(memberId: string, courseId: string): { booking: Booking; course: Course } | null {
  const course = courses.find(c => c.id === courseId);
  if (!course || course.currentBookings >= course.maxCapacity) return null;
  const existing = bookings.find(b => b.memberId === memberId && b.courseId === courseId);
  if (existing) return null;
  const booking: Booking = { id: uuidv4(), memberId, courseId, bookedAt: new Date().toISOString() };
  bookings.push(booking);
  course.currentBookings++;
  return { booking, course };
}

export function getCoaches(): Coach[] {
  return coaches;
}

export function getCoach(id: string): Coach | undefined {
  return coaches.find(c => c.id === id);
}

export function addCoachSchedule(coachId: string, slot: Omit<ScheduleSlot, 'courseId'> & { courseName: string; room: string }): Coach | null {
  const coach = coaches.find(c => c.id === coachId);
  if (!coach) return null;
  const newSlot: ScheduleSlot = { ...slot, courseId: uuidv4() };
  coach.schedule.push(newSlot);
  const newCourse: Course = {
    id: newSlot.courseId,
    name: slot.courseName,
    coachId: coach.id,
    coachName: coach.name,
    day: slot.day,
    timeSlot: slot.startSlot,
    maxCapacity: 15,
    currentBookings: 0,
    room: slot.room,
    isMorning: slot.startSlot < 3,
  };
  courses.push(newCourse);
  return coach;
}

export function getBookings(): Booking[] {
  return bookings;
}

export function getDashboardStats(): DashboardStats {
  const today = new Date().toISOString().split('T')[0];
  const todayCheckIns = members.filter(m => m.lastCheckIn === today).length;
  const sortedCourses = [...courses].sort((a, b) => b.currentBookings - a.currentBookings);
  const popularCourse = sortedCourses.length > 0 ? sortedCourses[0].name : '暂无';
  const totalMembers = members.length;
  const currentDay = new Date().getDay() === 0 ? 7 : new Date().getDay();
  const busyCoachIds = new Set(courses.filter(c => c.day === currentDay).map(c => c.coachId));
  const availableCoaches = coaches.length - busyCoachIds.size;
  return { todayCheckIns, popularCourse, totalMembers, availableCoaches };
}
