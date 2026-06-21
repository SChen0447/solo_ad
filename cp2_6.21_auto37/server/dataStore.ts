import type { Course, Assignment, Notification } from './interfaces';

const generateId = () => Math.random().toString(36).substring(2, 11);

export const courses: Course[] = [
  {
    id: 'c1',
    title: '水彩画入门到精通',
    coverImage: 'https://trae-api-cn.mchost.guru/api/ide/v1/text_to_image?prompt=watercolor%20painting%20art%20class%20colorful%20flowers%20landscape&image_size=landscape_16_9',
    description: '从零开始学习水彩画技法，掌握调色、晕染、干湿画法等核心技巧。课程包含静物、风景、人物三大主题练习，帮助您建立扎实的水彩绘画基础。适合零基础或有一定基础的绘画爱好者。',
    startTime: '2026-07-01T09:00:00Z',
    totalLessons: 8,
    instructorName: '李明轩',
    instructorAvatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=teacher1',
    progress: 62,
    lessons: [
      {
        id: 'l1',
        title: '第一课：水彩基础与工具介绍',
        order: 1,
        assignment: {
          id: 'a1',
          description: '请准备好水彩画工具（24色颜料、水彩笔、水彩本），完成一张简单的渐变色练习卡，尝试至少3种不同的颜色渐变组合。',
          attachments: [
            { id: 'att1', name: '水彩工具清单.pdf', url: '#', type: 'application/pdf', size: 245000 },
            { id: 'att2', name: '渐变色示例.png', url: 'https://trae-api-cn.mchost.guru/api/ide/v1/text_to_image?prompt=watercolor%20gradient%20swatches%20colorful%20soft&image_size=square', type: 'image/png', size: 520000 }
          ],
          deadline: '2026-07-05T23:59:59Z'
        }
      },
      {
        id: 'l2',
        title: '第二课：干画法与湿画法',
        order: 2,
        assignment: {
          id: 'a2',
          description: '分别用干画法和湿画法各完成一幅简单的风景画（如天空、水面），并在作业中说明两种技法的区别和个人感受。',
          attachments: [
            { id: 'att3', name: '干湿画法对比.docx', url: '#', type: 'application/docx', size: 180000 }
          ]
        }
      },
      {
        id: 'l3',
        title: '第三课：静物写生入门',
        order: 3,
        assignment: {
          id: 'a3',
          description: '选择3-5件日常静物（如苹果、杯子、书本）进行组合写生，注意光影表现和色彩层次。',
          attachments: [],
          deadline: '2026-07-15T23:59:59Z'
        }
      },
      {
        id: 'l4',
        title: '第四课：风景画构图',
        order: 4
      },
      {
        id: 'l5',
        title: '第五课：花卉绘画技巧',
        order: 5
      }
    ]
  },
  {
    id: 'c2',
    title: '手工皮具制作实战',
    coverImage: 'https://trae-api-cn.mchost.guru/api/ide/v1/text_to_image?prompt=leather%20craft%20workshop%20handmade%20wallet%20tools&image_size=landscape_16_9',
    description: '学习传统手工皮具制作技艺，从裁皮、打孔、缝制到封边的完整流程。学员将亲手制作钱包、卡包等实用作品，掌握皮革工艺精髓。',
    startTime: '2026-07-10T14:00:00Z',
    totalLessons: 6,
    instructorName: '张伟',
    instructorAvatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=teacher2',
    progress: 25,
    lessons: [
      {
        id: 'l6',
        title: '第一课：皮革基础知识与工具',
        order: 1,
        assignment: {
          id: 'a4',
          description: '熟悉各种皮革工具的使用方法，在废皮料上练习直线斩孔和基础缝线（马鞍针法）。',
          attachments: [
            { id: 'att4', name: '工具使用指南.pdf', url: '#', type: 'application/pdf', size: 890000 }
          ]
        }
      },
      {
        id: 'l7',
        title: '第二课：卡包制作（上）',
        order: 2
      },
      {
        id: 'l8',
        title: '第三课：卡包制作（下）',
        order: 3
      }
    ]
  },
  {
    id: 'c3',
    title: '摄影构图与光影艺术',
    coverImage: 'https://trae-api-cn.mchost.guru/api/ide/v1/text_to_image?prompt=photography%20camera%20golden%20hour%20light%20creative&image_size=landscape_16_9',
    description: '系统学习摄影构图法则和光影运用技巧，包括三分法、引导线、黄金螺旋等构图原理，以及自然光、人造光的实战运用，全面提升摄影作品表现力。',
    startTime: '2026-06-25T10:00:00Z',
    totalLessons: 10,
    instructorName: '王雪婷',
    instructorAvatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=teacher3',
    progress: 88,
    lessons: [
      {
        id: 'l9',
        title: '第一课：摄影基础回顾',
        order: 1,
        assignment: {
          id: 'a5',
          description: '提交3张分别运用三分法、对称构图和引导线构图的照片，并附上拍摄思路说明。',
          attachments: []
        }
      },
      {
        id: 'l10',
        title: '第二课：进阶构图技巧',
        order: 2
      }
    ]
  },
  {
    id: 'c4',
    title: '日式插花美学课',
    coverImage: 'https://trae-api-cn.mchost.guru/api/ide/v1/text_to_image?prompt=japanese%20ikebana%20flower%20arrangement%20minimalist%20zen&image_size=landscape_16_9',
    description: '探索日式花道的禅意美学，学习池坊流、小原流等经典流派的插花理念与技法。课程注重天人合一的哲学思想，培养学员对自然之美的敏锐感知。',
    startTime: '2026-08-01T15:00:00Z',
    totalLessons: 5,
    instructorName: '田中美咲',
    instructorAvatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=teacher4',
    progress: 0,
    lessons: [
      {
        id: 'l11',
        title: '第一课：花道历史与精神',
        order: 1
      },
      {
        id: 'l12',
        title: '第二课：基本花型练习',
        order: 2
      }
    ]
  },
  {
    id: 'c5',
    title: '咖啡拉花大师班',
    coverImage: 'https://trae-api-cn.mchost.guru/api/ide/v1/text_to_image?prompt=barista%20latte%20art%20coffee%20heart%20rosetta%20cappuccino&image_size=landscape_16_9',
    description: '从零开始学习意式咖啡萃取与奶泡打发技巧，掌握心形、郁金香、天鹅等经典拉花图案，最终能够独立制作出美观的拉花咖啡作品。',
    startTime: '2026-07-05T09:30:00Z',
    totalLessons: 7,
    instructorName: '陈浩',
    instructorAvatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=teacher5',
    progress: 40,
    lessons: [
      {
        id: 'l13',
        title: '第一课：意式咖啡机操作',
        order: 1,
        assignment: {
          id: 'a6',
          description: '观看教学视频后，尝试在家打发5次奶泡，记录每次的奶泡厚度和绵密程度，并上传文字总结。',
          attachments: [
            { id: 'att5', name: '奶泡打发教程.mp4', url: '#', type: 'video/mp4', size: 15200000 }
          ]
        }
      },
      {
        id: 'l14',
        title: '第二课：基础心形拉花',
        order: 2
      }
    ]
  },
  {
    id: 'c6',
    title: '陶艺制作基础课程',
    coverImage: 'https://trae-api-cn.mchost.guru/api/ide/v1/text_to_image?prompt=pottery%20ceramic%20wheel%20clay%20handmade%20artisan&image_size=landscape_16_9',
    description: '感受泥土的温度与可塑性，学习手捏、泥条盘筑、拉坯等多种陶艺成型技法，上釉烧制，完成属于自己的独特陶艺作品。',
    startTime: '2026-07-20T13:00:00Z',
    totalLessons: 8,
    instructorName: '刘芳',
    instructorAvatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=teacher6',
    progress: 12,
    lessons: [
      {
        id: 'l15',
        title: '第一课：陶艺材料介绍',
        order: 1
      }
    ]
  }
];

export const assignments: Assignment[] = [
  {
    id: 'as1',
    courseId: 'c1',
    lessonId: 'l1',
    studentId: 's1',
    studentName: '周小雨',
    studentAvatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=student1',
    content: '<p>老师好！这是我的第一次作业。我准备了温莎牛顿24色固体水彩，秋宏斋的毛笔和康颂的水彩本。</p><p>渐变色练习我做了三组：蓝紫渐变、橙黄渐变、粉绿渐变，感觉湿画法的过渡更自然一些。</p>',
    attachments: [
      { id: 'sa1', name: '渐变色作业.jpg', url: 'https://trae-api-cn.mchost.guru/api/ide/v1/text_to_image?prompt=watercolor%20gradient%20practice%20sheet%20blue%20purple%20orange&image_size=square', type: 'image/jpeg', size: 1200000 }
    ],
    submittedAt: '2026-07-02T16:30:00Z',
    status: 'graded',
    feedback: '渐变色过渡得非常自然！特别是蓝紫渐变那组，色彩层次很丰富。建议下次可以尝试更多颜色叠加，训练对水分的控制。继续加油！',
    rating: 5,
    gradedAt: '2026-07-03T10:15:00Z',
    courseTitle: '水彩画入门到精通',
    lessonTitle: '第一课：水彩基础与工具介绍'
  },
  {
    id: 'as2',
    courseId: 'c1',
    lessonId: 'l1',
    studentId: 's2',
    studentName: '林浩然',
    studentAvatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=student2',
    content: '<p>工具已准备齐全，做了红黄蓝三组基础渐变色练习。感觉边缘处有些生硬，还需要多加练习。</p>',
    attachments: [
      { id: 'sa2', name: '作业1.jpg', url: 'https://trae-api-cn.mchost.guru/api/ide/v1/text_to_image?prompt=simple%20watercolor%20gradient%20swatches%20red%20yellow%20blue&image_size=square', type: 'image/jpeg', size: 800000 }
    ],
    submittedAt: '2026-07-03T09:20:00Z',
    status: 'graded',
    feedback: '整体不错！色彩选择很干净。边缘生硬可能是纸面湿度不够的原因，建议下次先把纸面打湿再上色试试。',
    rating: 4,
    gradedAt: '2026-07-03T14:00:00Z',
    courseTitle: '水彩画入门到精通',
    lessonTitle: '第一课：水彩基础与工具介绍'
  },
  {
    id: 'as3',
    courseId: 'c1',
    lessonId: 'l2',
    studentId: 's1',
    studentName: '周小雨',
    studentAvatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=student1',
    content: '<p>干画法画了一片秋林，湿画法则是湖面倒影。干画法的边缘清晰适合刻画细节，湿画法的朦胧感表现水天相接真的很美！</p>',
    attachments: [
      { id: 'sa3', name: '秋林干画法.png', url: 'https://trae-api-cn.mchost.guru/api/ide/v1/text_to_image?prompt=watercolor%20autumn%20forest%20dry%20brush%20technique&image_size=landscape_4_3', type: 'image/png', size: 2100000 },
      { id: 'sa4', name: '湖面湿画法.png', url: 'https://trae-api-cn.mchost.guru/api/ide/v1/text_to_image?prompt=watercolor%20lake%20reflection%20wet%20technique%20soft&image_size=landscape_4_3', type: 'image/png', size: 1900000 }
    ],
    submittedAt: '2026-07-08T20:45:00Z',
    status: 'pending',
    courseTitle: '水彩画入门到精通',
    lessonTitle: '第二课：干画法与湿画法'
  },
  {
    id: 'as4',
    courseId: 'c3',
    lessonId: 'l9',
    studentId: 's3',
    studentName: '张诗涵',
    studentAvatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=student3',
    content: '<p>三张照片分别是：1）城市街头三分法构图 2）建筑对称构图 3）楼梯引导线构图。欢迎老师点评！</p>',
    attachments: [
      { id: 'sa5', name: '构图作业.zip', url: '#', type: 'application/zip', size: 8500000 }
    ],
    submittedAt: '2026-06-28T11:30:00Z',
    status: 'pending',
    courseTitle: '摄影构图与光影艺术',
    lessonTitle: '第一课：摄影基础回顾'
  },
  {
    id: 'as5',
    courseId: 'c2',
    lessonId: 'l6',
    studentId: 's4',
    studentName: '吴志强',
    studentAvatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=student4',
    content: '<p>练习了30cm的直线缝线，前10cm针脚有些歪，后面逐渐稳定了。马鞍针法确实比平缝要结实很多！</p>',
    attachments: [
      { id: 'sa6', name: '缝线练习.jpg', url: 'https://trae-api-cn.mchost.guru/api/ide/v1/text_to_image?prompt=leather%20stitching%20practice%20saddle%20stitch%20handmade&image_size=square', type: 'image/jpeg', size: 650000 }
    ],
    submittedAt: '2026-07-12T17:00:00Z',
    status: 'pending',
    courseTitle: '手工皮具制作实战',
    lessonTitle: '第一课：皮革基础知识与工具'
  },
  {
    id: 'as6',
    courseId: 'c1',
    lessonId: 'l2',
    studentId: 's5',
    studentName: '陈思琪',
    studentAvatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=student5',
    content: '<p>第一次尝试湿画法，控制水分真的好难！画了两张都有些翻车，但慢慢找到了一点感觉。</p>',
    attachments: [],
    submittedAt: '2026-07-09T08:15:00Z',
    status: 'pending',
    courseTitle: '水彩画入门到精通',
    lessonTitle: '第二课：干画法与湿画法'
  }
];

export const notifications: Notification[] = [
  {
    id: 'n1',
    userId: 'student',
    type: 'graded',
    icon: '✅',
    title: '作业已批改',
    message: '您的「水彩基础与工具介绍」作业已批改，获得5星好评！',
    link: '/course/c1',
    read: false,
    createdAt: '2026-07-03T10:15:00Z'
  },
  {
    id: 'n2',
    userId: 'student',
    type: 'new_assignment',
    icon: '📝',
    title: '新作业发布',
    message: '「水彩画入门到精通」第三课作业已发布，请及时完成。',
    link: '/course/c1',
    read: false,
    createdAt: '2026-07-07T09:00:00Z'
  },
  {
    id: 'n3',
    userId: 'student',
    type: 'schedule_change',
    icon: '🔔',
    title: '课程时间调整',
    message: '「陶艺制作基础课程」开课时间调整为7月20日。',
    link: '/course/c6',
    read: true,
    createdAt: '2026-07-05T14:30:00Z'
  },
  {
    id: 'n4',
    userId: 'student',
    type: 'graded',
    icon: '✅',
    title: '作业已批改',
    message: '您的「摄影基础回顾」作业已批改，获得4星好评！',
    link: '/course/c3',
    read: true,
    createdAt: '2026-06-29T16:00:00Z'
  },
  {
    id: 'n5',
    userId: 'instructor',
    type: 'new_assignment',
    icon: '📝',
    title: '新作业提交',
    message: '周小雨提交了「干画法与湿画法」作业，等待批改。',
    link: '/instructor/assignments/as3',
    read: false,
    createdAt: '2026-07-08T20:45:00Z'
  },
  {
    id: 'n6',
    userId: 'instructor',
    type: 'new_assignment',
    icon: '📝',
    title: '新作业提交',
    message: '张诗涵提交了「摄影基础回顾」作业，等待批改。',
    link: '/instructor/assignments/as4',
    read: false,
    createdAt: '2026-06-28T11:30:00Z'
  },
  {
    id: 'n7',
    userId: 'instructor',
    type: 'new_assignment',
    icon: '📝',
    title: '新作业提交',
    message: '吴志强提交了「皮革基础知识」作业，等待批改。',
    link: '/instructor/assignments/as5',
    read: true,
    createdAt: '2026-07-12T17:00:00Z'
  }
];

export function addCourse(course: Omit<Course, 'id' | 'lessons' | 'progress'>): Course {
  const newCourse: Course = {
    ...course,
    id: generateId(),
    progress: 0,
    lessons: []
  };
  courses.push(newCourse);
  return newCourse;
}

export function addAssignment(assignment: Omit<Assignment, 'id' | 'submittedAt' | 'status'>): Assignment {
  const newAssignment: Assignment = {
    ...assignment,
    id: generateId(),
    submittedAt: new Date().toISOString(),
    status: 'pending'
  };
  assignments.push(newAssignment);
  return newAssignment;
}

export function addNotification(notification: Omit<Notification, 'id' | 'createdAt' | 'read'>): Notification {
  const newNotification: Notification = {
    ...notification,
    id: generateId(),
    createdAt: new Date().toISOString(),
    read: false
  };
  notifications.unshift(newNotification);
  return newNotification;
}

export function gradeAssignment(id: string, feedback: string, rating: number): Assignment | null {
  const assignment = assignments.find(a => a.id === id);
  if (assignment) {
    assignment.status = 'graded';
    assignment.feedback = feedback;
    assignment.rating = rating;
    assignment.gradedAt = new Date().toISOString();
    return assignment;
  }
  return null;
}

export function markNotificationsRead(userId: string): void {
  notifications.forEach(n => {
    if (n.userId === userId) {
      n.read = true;
    }
  });
}

export function markNotificationReadById(id: string): void {
  const notification = notifications.find(n => n.id === id);
  if (notification) {
    notification.read = true;
  }
}
