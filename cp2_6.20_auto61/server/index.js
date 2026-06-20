import express from 'express';
import cors from 'cors';

const app = express();
const PORT = 3001;

app.use(cors());
app.use(express.json());

const courseColors = [
  '#D2691E',
  '#6B8E23',
  '#FF69B4',
  '#8B4513',
  '#4169E1',
  '#FFD700',
];

const data = {
  courses: [
    {
      id: '1',
      title: '手工陶艺基础班',
      type: 'pottery',
      dateTime: '2026-07-01 14:00',
      maxCapacity: 12,
      currentEnrollment: 8,
      difficulty: 'beginner',
      materials: ['陶土500g', '陶艺工具套装', '釉料', '海绵'],
      description: '学习陶艺的基本技巧，包括捏塑、盘条和泥板成型，完成一件属于自己的陶艺作品。',
      averageRating: 4.5,
      feedbackCount: 12,
      color: courseColors[0],
      isEnded: true,
    },
    {
      id: '2',
      title: '编织手作入门',
      type: 'weaving',
      dateTime: '2026-07-05 10:00',
      maxCapacity: 8,
      currentEnrollment: 7,
      difficulty: 'beginner',
      materials: ['棉线团', '编织架', '剪刀', '缝针'],
      description: '从基础的平纹编织开始，学习如何制作杯垫、小挂毯等实用小物。',
      averageRating: 4.8,
      feedbackCount: 8,
      color: courseColors[1],
      isEnded: true,
    },
    {
      id: '3',
      title: '法式刺绣进阶',
      type: 'embroidery',
      dateTime: '2026-07-10 15:00',
      maxCapacity: 6,
      currentEnrollment: 6,
      difficulty: 'intermediate',
      materials: ['刺绣布', '绣花线', '刺绣针', '绣绷'],
      description: '学习法式结粒绣、羽毛绣等高级针法，完成一幅精美的花卉刺绣作品。',
      averageRating: 4.9,
      feedbackCount: 15,
      color: courseColors[2],
      isEnded: false,
    },
    {
      id: '4',
      title: '木雕小摆件制作',
      type: 'woodcarving',
      dateTime: '2026-07-15 13:00',
      maxCapacity: 10,
      currentEnrollment: 3,
      difficulty: 'intermediate',
      materials: ['椴木块', '雕刻刀套装', '砂纸', '木蜡油'],
      description: '学习木雕的基本技法，亲手雕刻一个可爱的小动物摆件。',
      averageRating: 4.3,
      feedbackCount: 6,
      color: courseColors[3],
      isEnded: false,
    },
    {
      id: '5',
      title: '水彩花卉写生',
      type: 'painting',
      dateTime: '2026-07-20 09:00',
      maxCapacity: 15,
      currentEnrollment: 10,
      difficulty: 'beginner',
      materials: ['水彩颜料24色', '水彩纸', '水彩笔套装', '调色盘'],
      description: '学习水彩的基本技法，描绘美丽的花卉风景。',
      averageRating: 4.6,
      feedbackCount: 20,
      color: courseColors[4],
      isEnded: false,
    },
    {
      id: '6',
      title: '银饰制作工坊',
      type: 'jewelry',
      dateTime: '2026-07-25 14:00',
      maxCapacity: 5,
      currentEnrollment: 4,
      difficulty: 'advanced',
      materials: ['925银片', '焊药', '锉刀', '抛光布'],
      description: '学习银饰的锻造、焊接和抛光工艺，制作一枚独特的银戒指或吊坠。',
      averageRating: 4.7,
      feedbackCount: 10,
      color: courseColors[5],
      isEnded: false,
    },
  ],
  enrollments: [
    { id: 'e1', courseId: '1', userId: 'user1', enrolledAt: '2026-06-15', feedbackSubmitted: true },
    { id: 'e2', courseId: '2', userId: 'user1', enrolledAt: '2026-06-16', feedbackSubmitted: true },
    { id: 'e3', courseId: '3', userId: 'user1', enrolledAt: '2026-06-18', feedbackSubmitted: false },
  ],
  feedback: [
    { id: 'f1', courseId: '1', userId: 'user1', rating: 5, comment: '老师非常耐心，学到了很多陶艺技巧，作品烧制出来很美！', createdAt: '2026-07-02' },
    { id: 'f2', courseId: '1', userId: 'user2', rating: 4, comment: '很有趣的体验，材料准备得很充分。', createdAt: '2026-07-02' },
    { id: 'f3', courseId: '2', userId: 'user1', rating: 5, comment: '编织很治愈，成品很实用，已经在用了！', createdAt: '2026-07-06' },
    { id: 'f4', courseId: '3', userId: 'user3', rating: 5, comment: '法式刺绣太美了，老师讲解很细致。', createdAt: '2026-07-08' },
  ],
  users: [
    { id: 'user1', name: '手工艺爱好者', avatar: '🧑‍🎨' },
  ],
};

const generateId = () => Math.random().toString(36).substr(2, 9);

app.get('/api/courses', (req, res) => {
  res.json({ courses: data.courses });
});

app.get('/api/courses/:id', (req, res) => {
  const course = data.courses.find(c => c.id === req.params.id);
  if (!course) {
    return res.status(404).json({ error: '课程不存在' });
  }
  res.json({ course });
});

app.post('/api/signup', (req, res) => {
  const { courseId, userId } = req.body;
  
  const course = data.courses.find(c => c.id === courseId);
  if (!course) {
    return res.status(404).json({ success: false, error: '课程不存在' });
  }
  
  const existingEnrollment = data.enrollments.find(
    e => e.courseId === courseId && e.userId === userId
  );
  if (existingEnrollment) {
    return res.status(400).json({ success: false, error: '已报名该课程' });
  }
  
  if (course.currentEnrollment >= course.maxCapacity) {
    return res.status(400).json({ success: false, error: '名额已满' });
  }
  
  const enrollment = {
    id: generateId(),
    courseId,
    userId,
    enrolledAt: new Date().toISOString().split('T')[0],
    feedbackSubmitted: false,
  };
  
  data.enrollments.push(enrollment);
  course.currentEnrollment += 1;
  
  res.json({ success: true, enrollment });
});

app.post('/api/cancel', (req, res) => {
  const { courseId, userId } = req.body;
  
  const enrollmentIndex = data.enrollments.findIndex(
    e => e.courseId === courseId && e.userId === userId
  );
  
  if (enrollmentIndex === -1) {
    return res.status(404).json({ success: false, error: '未找到报名记录' });
  }
  
  data.enrollments.splice(enrollmentIndex, 1);
  
  const course = data.courses.find(c => c.id === courseId);
  if (course) {
    course.currentEnrollment = Math.max(0, course.currentEnrollment - 1);
  }
  
  res.json({ success: true });
});

app.get('/api/enrollments', (req, res) => {
  const { userId } = req.query;
  const enrollments = data.enrollments.filter(e => e.userId === userId);
  
  const enrollmentsWithCourse = enrollments.map(e => {
    const course = data.courses.find(c => c.id === e.courseId);
    return { ...e, course };
  });
  
  res.json({ enrollments: enrollmentsWithCourse });
});

app.post('/api/feedback', (req, res) => {
  const { courseId, userId, rating, comment } = req.body;
  
  if (!rating || rating < 1 || rating > 5) {
    return res.status(400).json({ success: false, error: '评分必须在1-5之间' });
  }
  
  if (comment.length > 150) {
    return res.status(400).json({ success: false, error: '评论不能超过150字' });
  }
  
  const enrollment = data.enrollments.find(
    e => e.courseId === courseId && e.userId === userId
  );
  
  if (!enrollment) {
    return res.status(400).json({ success: false, error: '未报名该课程' });
  }
  
  const existingFeedback = data.feedback.find(
    f => f.courseId === courseId && f.userId === userId
  );
  
  if (existingFeedback) {
    return res.status(400).json({ success: false, error: '已提交过反馈' });
  }
  
  const feedback = {
    id: generateId(),
    courseId,
    userId,
    rating,
    comment,
    createdAt: new Date().toISOString().split('T')[0],
  };
  
  data.feedback.push(feedback);
  enrollment.feedbackSubmitted = true;
  
  const course = data.courses.find(c => c.id === courseId);
  if (course) {
    const courseFeedback = data.feedback.filter(f => f.courseId === courseId);
    const totalRating = courseFeedback.reduce((sum, f) => sum + f.rating, 0);
    course.averageRating = Math.round((totalRating / courseFeedback.length) * 10) / 10;
    course.feedbackCount = courseFeedback.length;
  }
  
  res.json({ success: true, feedback });
});

app.get('/api/feedback/:courseId', (req, res) => {
  const courseId = req.params.courseId;
  const feedback = data.feedback
    .filter(f => f.courseId === courseId)
    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  
  res.json({ feedback });
});

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
