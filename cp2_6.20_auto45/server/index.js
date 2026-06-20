import express from 'express';
import cors from 'cors';

const app = express();
const PORT = 3001;

app.use(cors());
app.use(express.json());

const COURSE_TYPES = ['陶艺', '编织', '木工', '刺绣', '皮具', '烘焙'];
const DIFFICULTY_LEVELS = ['入门', '初级', '中级', '高级'];

const courses = [
  {
    id: 1,
    title: '手工陶瓷茶杯制作',
    type: '陶艺',
    date: '2026-06-25',
    time: '14:00 - 17:00',
    capacity: 12,
    enrolled: 8,
    difficulty: '入门',
    description: '学习基础的捏陶和拉坯技巧，亲手制作一个属于自己的陶瓷茶杯。课程包含材料费用和烧制服务。',
    materials: ['陶土500g', '修坯工具套装', '釉料（三种颜色可选）', '海绵和湿布'],
    instructor: '李大师',
    location: '工坊A室',
    price: 288,
    endTime: '2026-06-25T17:00:00'
  },
  {
    id: 2,
    title: '北欧风毛线编织围巾',
    type: '编织',
    date: '2026-06-28',
    time: '10:00 - 13:00',
    capacity: 10,
    enrolled: 10,
    difficulty: '初级',
    description: '使用优质美利奴羊毛，学习基础的平针和花样编织技法，完成一条温暖的北欧风格围巾。',
    materials: ['美利奴毛线200g', '环形编织针8mm', '毛线针', '针法说明卡'],
    instructor: '王老师',
    location: '工坊B室',
    price: 198,
    endTime: '2026-06-28T13:00:00'
  },
  {
    id: 3,
    title: '原木首饰盒制作',
    type: '木工',
    date: '2026-07-02',
    time: '09:00 - 16:00',
    capacity: 8,
    enrolled: 3,
    difficulty: '中级',
    description: '从设计到打磨，全程亲手制作一个胡桃木首饰盒。学习榫卯结构和木蜡油涂装技巧。',
    materials: ['胡桃木毛料', '砂纸套装（80-2000目）', '木蜡油', '木工工具使用'],
    instructor: '张工匠',
    location: '木工坊',
    price: 488,
    endTime: '2026-07-02T16:00:00'
  },
  {
    id: 4,
    title: '法式刺绣花卉胸针',
    type: '刺绣',
    date: '2026-07-05',
    time: '14:00 - 18:00',
    capacity: 15,
    enrolled: 6,
    difficulty: '初级',
    description: '学习法式结粒绣、缎面绣等经典针法，绣制一枚精致的花卉图案胸针。',
    materials: ['进口绣线套装', '纯棉绣布', '绣绷（直径15cm）', '胸针底座'],
    instructor: '陈绣娘',
    location: '工坊C室',
    price: 228,
    endTime: '2026-07-05T18:00:00'
  },
  {
    id: 5,
    title: '牛皮手工钱包制作',
    type: '皮具',
    date: '2026-07-08',
    time: '13:00 - 18:00',
    capacity: 6,
    enrolled: 5,
    difficulty: '高级',
    description: '使用意大利进口头层牛皮，学习裁皮、打孔、手缝、封边等完整的皮具制作工艺。',
    materials: ['意大利头层牛皮', '蜡线2卷', '菱斩工具', '边油和打磨棒'],
    instructor: '刘皮匠',
    location: '皮艺工坊',
    price: 588,
    endTime: '2026-07-08T18:00:00'
  },
  {
    id: 6,
    title: '法式马卡龙烘焙课',
    type: '烘焙',
    date: '2026-06-30',
    time: '15:00 - 18:00',
    capacity: 10,
    enrolled: 7,
    difficulty: '中级',
    description: '学习经典法式马卡龙的制作技巧，包括蛋白霜打发、挤花、烘焙和夹馅全过程。',
    materials: ['杏仁粉', '糖粉', '食用色素', '裱花袋和花嘴'],
    instructor: '周主厨',
    location: '烘焙厨房',
    price: 328,
    endTime: '2026-06-30T18:00:00'
  }
];

let enrollments = [
  { id: 1, courseId: 1, userId: 'user_001', enrolledAt: '2026-06-15T10:30:00' },
  { id: 2, courseId: 2, userId: 'user_001', enrolledAt: '2026-06-10T09:20:00' },
  { id: 3, courseId: 3, userId: 'user_001', enrolledAt: '2026-06-12T14:15:00' },
  { id: 4, courseId: 6, userId: 'user_001', enrolledAt: '2026-06-18T16:45:00' }
];

let feedbacks = [
  { id: 1, courseId: 1, userId: 'user_001', rating: 5, comment: '李大师教得非常仔细，第一次做陶艺就成功了！杯子烧出来效果很好，已经在日常使用了。', createdAt: '2026-06-20T18:30:00', userName: '手工爱好者' },
  { id: 2, courseId: 1, userId: 'user_002', rating: 4, comment: '整体体验不错，就是时间稍短，希望能有更多练习时间。', createdAt: '2026-06-19T15:20:00', userName: '文艺青年' },
  { id: 3, courseId: 2, userId: 'user_003', rating: 5, comment: '毛线质量很好，织出来的围巾戴着很舒服！', createdAt: '2026-06-18T20:10:00', userName: '编织新手' }
];

let nextEnrollmentId = 5;
let nextFeedbackId = 4;

const USER_ID = 'user_001';
const USER_NAME = '手工爱好者';

app.get('/api/courses', (req, res) => {
  const coursesWithStats = courses.map(course => {
    const courseFeedbacks = feedbacks.filter(f => f.courseId === course.id);
    const avgRating = courseFeedbacks.length > 0
      ? courseFeedbacks.reduce((sum, f) => sum + f.rating, 0) / courseFeedbacks.length
      : 0;
    return {
      ...course,
      avgRating: parseFloat(avgRating.toFixed(1)),
      feedbackCount: courseFeedbacks.length,
      remaining: course.capacity - course.enrolled
    };
  });
  res.json(coursesWithStats);
});

app.get('/api/courses/:id', (req, res) => {
  const id = parseInt(req.params.id);
  const course = courses.find(c => c.id === id);
  if (!course) {
    return res.status(404).json({ error: '课程不存在' });
  }
  const courseFeedbacks = feedbacks.filter(f => f.courseId === id);
  const avgRating = courseFeedbacks.length > 0
    ? courseFeedbacks.reduce((sum, f) => sum + f.rating, 0) / courseFeedbacks.length
    : 0;
  const isEnrolled = enrollments.some(e => e.courseId === id && e.userId === USER_ID);
  res.json({
    ...course,
    avgRating: parseFloat(avgRating.toFixed(1)),
    feedbackCount: courseFeedbacks.length,
    remaining: course.capacity - course.enrolled,
    isEnrolled
  });
});

app.get('/api/courses/:id/feedbacks', (req, res) => {
  const id = parseInt(req.params.id);
  const courseFeedbacks = feedbacks
    .filter(f => f.courseId === id)
    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  res.json(courseFeedbacks);
});

app.post('/api/courses/:id/signup', (req, res) => {
  const id = parseInt(req.params.id);
  const course = courses.find(c => c.id === id);
  if (!course) {
    return res.status(404).json({ error: '课程不存在' });
  }
  if (enrollments.some(e => e.courseId === id && e.userId === USER_ID)) {
    return res.status(400).json({ error: '您已报名该课程' });
  }
  if (course.enrolled >= course.capacity) {
    return res.status(400).json({ error: '该课程名额已满' });
  }
  course.enrolled += 1;
  enrollments.push({
    id: nextEnrollmentId++,
    courseId: id,
    userId: USER_ID,
    enrolledAt: new Date().toISOString()
  });
  res.json({ success: true, enrolled: course.enrolled, remaining: course.capacity - course.enrolled });
});

app.post('/api/courses/:id/cancel', (req, res) => {
  const id = parseInt(req.params.id);
  const course = courses.find(c => c.id === id);
  if (!course) {
    return res.status(404).json({ error: '课程不存在' });
  }
  const enrollmentIndex = enrollments.findIndex(e => e.courseId === id && e.userId === USER_ID);
  if (enrollmentIndex === -1) {
    return res.status(400).json({ error: '您未报名该课程' });
  }
  course.enrolled -= 1;
  enrollments.splice(enrollmentIndex, 1);
  res.json({ success: true, enrolled: course.enrolled, remaining: course.capacity - course.enrolled });
});

app.post('/api/courses/:id/feedback', (req, res) => {
  const id = parseInt(req.params.id);
  const { rating, comment } = req.body;
  const course = courses.find(c => c.id === id);
  if (!course) {
    return res.status(404).json({ error: '课程不存在' });
  }
  if (!enrollments.some(e => e.courseId === id && e.userId === USER_ID)) {
    return res.status(400).json({ error: '只有报名该课程的学员才能提交反馈' });
  }
  if (feedbacks.some(f => f.courseId === id && f.userId === USER_ID)) {
    return res.status(400).json({ error: '您已提交过该课程的反馈' });
  }
  if (!rating || rating < 1 || rating > 5) {
    return res.status(400).json({ error: '评分必须在1-5之间' });
  }
  if (comment && comment.length > 150) {
    return res.status(400).json({ error: '评论不能超过150字' });
  }
  const newFeedback = {
    id: nextFeedbackId++,
    courseId: id,
    userId: USER_ID,
    rating,
    comment: comment || '',
    createdAt: new Date().toISOString(),
    userName: USER_NAME
  };
  feedbacks.push(newFeedback);
  res.json({ success: true, feedback: newFeedback });
});

app.get('/api/user/enrollments', (req, res) => {
  const userEnrollments = enrollments
    .filter(e => e.userId === USER_ID)
    .map(e => {
      const course = courses.find(c => c.id === e.courseId);
      const hasFeedback = feedbacks.some(f => f.courseId === e.courseId && f.userId === USER_ID);
      const courseEnded = new Date(course?.endTime || '') < new Date();
      return {
        ...e,
        course,
        hasFeedback,
        courseEnded
      };
    })
    .sort((a, b) => {
      const dateA = new Date(a.course?.date || '');
      const dateB = new Date(b.course?.date || '');
      return dateB - dateA;
    });
  const completedCount = userEnrollments.filter(e => e.courseEnded).length;
  const badges = [];
  if (completedCount >= 3) {
    badges.push({ id: 'novice', name: '新手手工艺人', description: '已完成3门课程，手工艺之旅正式启程！', color: '#D2691E' });
  }
  if (completedCount >= 5) {
    badges.push({ id: 'skilled', name: '熟手工匠', description: '已完成5门课程，技艺精进的熟练工匠！', color: '#6B8E23' });
  }
  res.json({ enrollments: userEnrollments, badges, completedCount, totalEnrolled: userEnrollments.length });
});

app.listen(PORT, () => {
  console.log(`手工艺工坊 API 服务器运行在 http://localhost:${PORT}`);
});
