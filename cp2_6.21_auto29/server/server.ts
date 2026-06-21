import express from 'express';
import cors from 'cors';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { dataStore } from './dataStore.js';
import type { AssignmentSubmitInput, GradeInput, Attachment } from './interfaces.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = 3001;

const uploadDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    cb(null, uniqueSuffix + path.extname(file.originalname));
  }
});

const fileFilter = (req: express.Request, file: Express.Multer.File, cb: multer.FileFilterCallback) => {
  const allowedTypes = ['.pdf', '.docx', '.png', '.jpg', '.jpeg'];
  const ext = path.extname(file.originalname).toLowerCase();
  if (allowedTypes.includes(ext) && file.size <= 10 * 1024 * 1024) {
    cb(null, true);
  } else {
    cb(new Error('文件类型不支持或大小超过10MB限制'));
  }
};

const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: 10 * 1024 * 1024
  }
});

app.use(cors());
app.use(express.json());

app.use('/uploads', express.static(uploadDir));

app.get('/api/courses', (req, res) => {
  const courses = dataStore.getCourses();
  res.json(courses);
});

app.get('/api/courses/:id', (req, res) => {
  const course = dataStore.getCourseById(req.params.id);
  if (!course) {
    return res.status(404).json({ error: '课程不存在' });
  }
  res.json(course);
});

app.post('/api/courses', (req, res) => {
  const body = req.body;
  if (!body.title || !body.instructor) {
    return res.status(400).json({ error: '缺少必要字段' });
  }
  const course = dataStore.createCourse({
    title: body.title,
    coverImage: body.coverImage || 'https://images.unsplash.com/photo-1516321318423-f06f85e504b3?w=400&h=300&fit=crop',
    description: body.description || '',
    instructor: body.instructor,
    instructorAvatar: body.instructorAvatar || 'https://i.pravatar.cc/100?img=12',
    startDate: body.startDate || new Date().toISOString(),
    totalLessons: body.totalLessons || 0,
    completedLessons: body.completedLessons || 0,
    progress: body.progress || 0,
    lessons: body.lessons || []
  });
  res.status(201).json(course);
});

app.get('/api/assignments', (req, res) => {
  const assignments = dataStore.getAssignments();
  res.json(assignments);
});

app.get('/api/assignments/:id', (req, res) => {
  const assignment = dataStore.getAssignmentById(req.params.id);
  if (!assignment) {
    return res.status(404).json({ error: '作业不存在' });
  }
  res.json(assignment);
});

app.post('/api/assignments', (req, res) => {
  const body = req.body as AssignmentSubmitInput;
  if (!body.courseId || !body.lessonId || !body.content) {
    return res.status(400).json({ error: '缺少必要字段' });
  }
  const assignment = dataStore.submitAssignment(body);
  
  dataStore.addNotification({
    type: 'new_assignment',
    title: '新作业提交',
    content: `${assignment.studentName} 提交了「${assignment.lessonTitle}」作业`,
    link: `/assignments/${assignment.id}`
  });
  
  res.status(201).json(assignment);
});

app.post('/api/assignments/:courseId/upload', upload.single('file'), (req, res) => {
  try {
    if (req.file) {
      return res.status(200).json({
        id: Math.random().toString(36).substr(2, 9),
        name: req.file.originalname,
        url: `/uploads/${req.file.filename}`,
        size: req.file.size,
        type: req.file.mimetype
      });
    }
    res.status(400).json({ error: '未上传文件' });
  } catch (error) {
    console.error('File upload error:', error);
    if (error instanceof multer.MulterError) {
      if (error.code === 'LIMIT_FILE_SIZE') {
        return res.status(400).json({ error: '文件大小超过10MB限制' });
      }
      return res.status(400).json({ error: '文件上传失败：' + error.message });
    }
    res.status(500).json({ error: '文件上传失败' });
  }
});

app.post('/api/assignments/:courseId/submit', upload.array('files', 10), (req, res) => {
  try {
    const { courseId } = req.params;
    const { lessonId, lessonTitle, content } = req.body;
    
    if (!courseId || !lessonId || !content) {
      return res.status(400).json({ error: '缺少必要字段' });
    }

    const attachments: Attachment[] = (req.files as Express.Multer.File[])?.map(file => ({
      id: Math.random().toString(36).substr(2, 9),
      name: file.originalname,
      url: `/uploads/${file.filename}`,
      size: file.size,
      type: file.mimetype
    })) || [];

    const assignment = dataStore.submitAssignment({
      courseId,
      lessonId: parseInt(lessonId),
      lessonTitle: lessonTitle || '作业',
      content,
      attachments
    });

    dataStore.addNotification({
      type: 'new_assignment',
      title: '新作业提交',
      content: `${assignment.studentName} 提交了「${assignment.lessonTitle}」作业`,
      link: `/assignments/${assignment.id}`
    });

    res.status(201).json(assignment);
  } catch (error) {
    console.error('Upload error:', error);
    if (error instanceof multer.MulterError) {
      return res.status(400).json({ error: '文件上传失败：' + error.message });
    }
    res.status(500).json({ error: '文件上传失败' });
  }
});

app.use((err: Error, req: express.Request, res: express.Response, next: express.NextFunction) => {
  if (err instanceof multer.MulterError) {
    if (err.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({ error: '文件大小超过10MB限制' });
    }
    return res.status(400).json({ error: '文件上传错误：' + err.message });
  }
  res.status(400).json({ error: err.message || '上传失败' });
});

app.put('/api/assignments/:id/grade', (req, res) => {
  const body = req.body as GradeInput;
  if (body.feedback === undefined || body.score === undefined) {
    return res.status(400).json({ error: '缺少反馈或评分' });
  }
  if (body.feedback.length > 500) {
    return res.status(400).json({ error: '反馈文字不能超过500字' });
  }
  if (body.score < 1 || body.score > 5) {
    return res.status(400).json({ error: '评分必须在1-5之间' });
  }
  const assignment = dataStore.gradeAssignment(req.params.id, body.feedback, body.score);
  if (!assignment) {
    return res.status(404).json({ error: '作业不存在' });
  }
  res.json(assignment);
});

app.get('/api/notifications', (req, res) => {
  const notifications = dataStore.getNotifications();
  res.json(notifications);
});

app.put('/api/notifications/:id/read', (req, res) => {
  const notification = dataStore.markNotificationRead(req.params.id);
  if (!notification) {
    return res.status(404).json({ error: '通知不存在' });
  }
  res.json(notification);
});

app.put('/api/notifications/read-all', (req, res) => {
  dataStore.markAllNotificationsRead();
  res.json({ success: true });
});

app.get('/api/notifications/unread-count', (req, res) => {
  const count = dataStore.getUnreadCount();
  res.json({ count });
});

app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});
