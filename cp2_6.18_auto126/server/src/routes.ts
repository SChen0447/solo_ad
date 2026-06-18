import { Router, Request, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { Course, Booking, User } from './types';

export const courses: Course[] = [];
export const bookings: Booking[] = [];
export const users: User[] = [];

function getWeekDates(): string[] {
  const dates: string[] = [];
  const now = new Date();
  for (let i = 0; i < 7; i++) {
    const date = new Date(now);
    date.setDate(now.getDate() + i);
    dates.push(date.toISOString().split('T')[0]);
  }
  return dates;
}

function initializeData() {
  if (courses.length === 0) {
    const weekDates = getWeekDates();
    const timeSlots = ['09:00', '10:30', '14:00', '15:30', '18:00', '19:30'];
    const courseTypes: Array<'yoga' | 'strength' | 'cardio'> = ['yoga', 'strength', 'cardio'];
    const courseNames = {
      yoga: ['哈他瑜伽', '流瑜伽', '阴瑜伽', '阿斯汤加'],
      strength: ['力量训练', '举重入门', '核心训练', 'HIIT'],
      cardio: ['有氧舞蹈', '动感单车', '跳绳训练', '搏击操']
    };
    const instructors = ['张教练', '李教练', '王教练', '刘教练', '陈教练'];

    let idCounter = 1;
    weekDates.forEach(date => {
      timeSlots.forEach((time, idx) => {
        if (Math.random() > 0.3) {
          const type = courseTypes[idx % 3];
          const nameList = courseNames[type];
          courses.push({
            id: `course-${idCounter++}`,
            name: nameList[Math.floor(Math.random() * nameList.length)],
            instructor: instructors[Math.floor(Math.random() * instructors.length)],
            dateTime: `${date} ${time}`,
            capacity: 15 + Math.floor(Math.random() * 16),
            bookedCount: Math.floor(Math.random() * 10),
            type: type
          });
        }
      });
    });
  }
}

initializeData();

const router = Router();

router.get('/api/courses', (_req: Request, res: Response) => {
  res.json(courses);
});

router.post('/api/courses', (req: Request, res: Response) => {
  const { name, instructor, dateTime, capacity, type } = req.body;

  if (!name || !instructor || !dateTime || !capacity || !type) {
    return res.status(400).json({ error: '缺少必要字段' });
  }

  const newCourse: Course = {
    id: uuidv4(),
    name,
    instructor,
    dateTime,
    capacity: parseInt(capacity, 10),
    bookedCount: 0,
    type
  };

  courses.push(newCourse);
  res.status(201).json(newCourse);
});

router.delete('/api/courses/:id', (req: Request, res: Response) => {
  const { id } = req.params;
  const courseIndex = courses.findIndex(c => c.id === id);

  if (courseIndex === -1) {
    return res.status(404).json({ error: '课程不存在' });
  }

  const relatedBookings = bookings.filter(b => b.courseId === id);
  relatedBookings.forEach(b => {
    const bookingIndex = bookings.findIndex(booking => booking.id === b.id);
    if (bookingIndex !== -1) {
      bookings.splice(bookingIndex, 1);
    }
  });

  courses.splice(courseIndex, 1);
  res.json({ message: '课程删除成功' });
});

router.post('/api/bookings', (req: Request, res: Response) => {
  const { userId, courseId, userName } = req.body;

  if (!userId || !courseId || !userName) {
    return res.status(400).json({ error: '缺少必要字段' });
  }

  const course = courses.find(c => c.id === courseId);
  if (!course) {
    return res.status(404).json({ error: '课程不存在' });
  }

  if (course.bookedCount >= course.capacity) {
    return res.status(400).json({ error: '课程已满' });
  }

  const existingBooking = bookings.find(
    b => b.userId === userId && b.courseId === courseId
  );
  if (existingBooking) {
    return res.status(400).json({ error: '您已预约此课程' });
  }

  const newBooking: Booking = {
    id: uuidv4(),
    userId,
    courseId,
    userName,
    createdAt: new Date().toISOString()
  };

  bookings.push(newBooking);
  course.bookedCount++;

  res.status(201).json(newBooking);
});

router.get('/api/bookings', (req: Request, res: Response) => {
  const { userId } = req.query;

  if (!userId) {
    return res.status(400).json({ error: '缺少userId参数' });
  }

  const userBookings = bookings.filter(b => b.userId === userId);
  const bookingsWithCourse = userBookings.map(booking => {
    const course = courses.find(c => c.id === booking.courseId);
    return {
      ...booking,
      course
    };
  });

  res.json(bookingsWithCourse);
});

router.delete('/api/bookings/:id', (req: Request, res: Response) => {
  const { id } = req.params;
  const bookingIndex = bookings.findIndex(b => b.id === id);

  if (bookingIndex === -1) {
    return res.status(404).json({ error: '预约不存在' });
  }

  const booking = bookings[bookingIndex];
  const course = courses.find(c => c.id === booking.courseId);
  if (course) {
    course.bookedCount = Math.max(0, course.bookedCount - 1);
  }

  bookings.splice(bookingIndex, 1);
  res.json({ message: '预约取消成功' });
});

router.post('/api/users/login', (req: Request, res: Response) => {
  const { name, phone } = req.body;

  if (!name || !phone) {
    return res.status(400).json({ error: '缺少姓名或手机号' });
  }

  let user = users.find(u => u.phone === phone);

  if (!user) {
    user = {
      id: uuidv4(),
      name,
      phone
    };
    users.push(user);
  } else {
    user.name = name;
  }

  res.json(user);
});

router.get('/api/users/:id', (req: Request, res: Response) => {
  const { id } = req.params;
  const user = users.find(u => u.id === id);

  if (!user) {
    return res.status(404).json({ error: '用户不存在' });
  }

  res.json(user);
});

export default router;
