import express, { Request, Response } from 'express';
import cors from 'cors';
import {
  courses,
  assignments,
  notifications,
  addCourse,
  addAssignment,
  addNotification,
  gradeAssignment,
  markNotificationsRead,
  markNotificationReadById
} from './dataStore';
import type { ApiResponse, Course, Assignment as AssignmentType, Notification } from './interfaces';

const app = express();
const PORT = 3001;

app.use(cors());
app.use(express.json({ limit: '50mb' }));

app.use((req, res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.url}`);
  next();
});

app.get('/api/health', (_req: Request, res: Response) => {
  res.json({ success: true, message: 'Skill Workshop API is running' });
});

app.get('/api/courses', (_req: Request, res: Response<ApiResponse<Omit<Course, 'lessons'>[]>>) => {
  const courseList = courses.map(({ lessons, ...rest }) => rest);
  res.json({ success: true, data: courseList });
});

app.get('/api/courses/:id', (req: Request, res: Response<ApiResponse<Course>>) => {
  const { id } = req.params;
  const course = courses.find(c => c.id === id);
  if (!course) {
    res.status(404).json({ success: false, message: '课程不存在' });
    return;
  }
  res.json({ success: true, data: course });
});

app.post('/api/courses', (req: Request, res: Response<ApiResponse<Course>>) => {
  const { title, coverImage, description, startTime, totalLessons, instructorName, instructorAvatar } = req.body;

  if (!title || !description) {
    res.status(400).json({ success: false, message: '标题和描述不能为空' });
    return;
  }
  if (description.length > 500) {
    res.status(400).json({ success: false, message: '课程简介不能超过500字' });
    return;
  }

  const newCourse = addCourse({
    title,
    coverImage: coverImage || '',
    description,
    startTime: startTime || new Date().toISOString(),
    totalLessons: totalLessons || 0,
    instructorName: instructorName || '未知讲师',
    instructorAvatar: instructorAvatar || ''
  });

  addNotification({
    userId: 'student',
    type: 'schedule_change',
    icon: '🔔',
    title: '新课程上线',
    message: `「${newCourse.title}」已正式发布！`,
    link: `/course/${newCourse.id}`
  });

  res.json({ success: true, data: newCourse });
});

app.get('/api/courses/:id/assignments', (req: Request, res: Response<ApiResponse<AssignmentType[]>>) => {
  const { id } = req.params;
  const courseAssignments = assignments.filter(a => a.courseId === id);
  res.json({ success: true, data: courseAssignments });
});

app.get('/api/assignments', (req: Request, res: Response<ApiResponse<AssignmentType[]>>) => {
  const { status, courseId, sort } = req.query;
  let filtered = [...assignments];

  if (status) {
    filtered = filtered.filter(a => a.status === status);
  }
  if (courseId) {
    filtered = filtered.filter(a => a.courseId === courseId);
  }
  if (sort === 'time' || !sort) {
    filtered.sort((a, b) => new Date(b.submittedAt).getTime() - new Date(a.submittedAt).getTime());
  }

  res.json({ success: true, data: filtered });
});

app.get('/api/assignments/:id', (req: Request, res: Response<ApiResponse<AssignmentType>>) => {
  const { id } = req.params;
  const assignment = assignments.find(a => a.id === id);
  if (!assignment) {
    res.status(404).json({ success: false, message: '作业不存在' });
    return;
  }
  res.json({ success: true, data: assignment });
});

app.post('/api/assignments', (req: Request, res: Response<ApiResponse<AssignmentType>>) => {
  const { courseId, lessonId, studentId, studentName, studentAvatar, content, attachments } = req.body;

  if (!courseId || !lessonId || !content) {
    res.status(400).json({ success: false, message: '缺少必要参数' });
    return;
  }

  const course = courses.find(c => c.id === courseId);
  const lesson = course?.lessons.find(l => l.id === lessonId);

  const newAssignment = addAssignment({
    courseId,
    lessonId,
    studentId: studentId || 's1',
    studentName: studentName || '周小雨',
    studentAvatar: studentAvatar || 'https://api.dicebear.com/7.x/avataaars/svg?seed=student1',
    content,
    attachments: attachments || [],
    courseTitle: course?.title,
    lessonTitle: lesson?.title
  });

  addNotification({
    userId: 'instructor',
    type: 'new_assignment',
    icon: '📝',
    title: '新作业提交',
    message: `${newAssignment.studentName}提交了「${lesson?.title || '作业'}」，等待批改。`,
    link: `/instructor/assignments/${newAssignment.id}`
  });

  res.json({ success: true, data: newAssignment });
});

app.put('/api/assignments/:id/grade', (req: Request, res: Response<ApiResponse<AssignmentType>>) => {
  const { id } = req.params;
  const { feedback, rating } = req.body;

  if (!feedback || feedback.length > 500) {
    res.status(400).json({ success: false, message: '反馈内容不能为空且不能超过500字' });
    return;
  }
  if (!rating || rating < 1 || rating > 5 || !Number.isInteger(rating)) {
    res.status(400).json({ success: false, message: '评分必须为1-5的整数' });
    return;
  }

  const graded = gradeAssignment(id, feedback, rating);
  if (!graded) {
    res.status(404).json({ success: false, message: '作业不存在' });
    return;
  }

  addNotification({
    userId: 'student',
    type: 'graded',
    icon: '✅',
    title: '作业已批改',
    message: `您的「${graded.lessonTitle || '作业'}」已批改，获得${rating}星！`,
    link: `/course/${graded.courseId}`
  });

  res.json({ success: true, data: graded });
});

app.get('/api/notifications', (req: Request, res: Response<ApiResponse<Notification[]>>) => {
  const { userId } = req.query;
  let userNotifications = [...notifications];

  if (userId) {
    userNotifications = userNotifications.filter(n => n.userId === userId);
  }

  userNotifications.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

  res.json({ success: true, data: userNotifications });
});

app.post('/api/notifications/read', (req: Request, res: Response<ApiResponse<null>>) => {
  const { userId, notificationId } = req.body;

  if (notificationId) {
    markNotificationReadById(notificationId);
  } else if (userId) {
    markNotificationsRead(userId);
  }

  res.json({ success: true, data: null });
});

app.listen(PORT, () => {
  console.log(`🚀 Skill Workshop API Server running at http://localhost:${PORT}`);
});
