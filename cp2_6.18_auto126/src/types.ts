export interface Course {
  id: string;
  name: string;
  instructor: string;
  dateTime: string;
  capacity: number;
  bookedCount: number;
  type: 'yoga' | 'strength' | 'cardio';
}

export interface Booking {
  id: string;
  userId: string;
  courseId: string;
  userName: string;
  createdAt: string;
  course?: Course;
}

export interface User {
  id: string;
  name: string;
  phone: string;
}
