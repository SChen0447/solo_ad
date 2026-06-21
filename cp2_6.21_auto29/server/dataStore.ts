import type { Course, Assignment, Notification, Attachment, Lesson } from './interfaces';

let courses: Course[] = [];
let assignments: Assignment[] = [];
let notifications: Notification[] = [];

const generateId = (): string => {
  return Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
};

const initMockData = () => {
  const coverImages = [
    'https://images.unsplash.com/photo-1516321318423-f06f85e504b3?w=400&h=300&fit=crop',
    'https://images.unsplash.com/photo-1551288049-bebda4e38f71?w=400&h=300&fit=crop',
    'https://images.unsplash.com/photo-1513258496099-48168024aec0?w=400&h=300&fit=crop',
    'https://images.unsplash.com/photo-1555066931-4365d14bab8c?w=400&h=300&fit=crop',
    'https://images.unsplash.com/photo-1519389950473-47ba0277781c?w=400&h=300&fit=crop',
    'https://images.unsplash.com/photo-1558655146-9f40138edfeb?w=400&h=300&fit=crop'
  ];

  const instructors = [
    { name: '张明远', avatar: 'https://i.pravatar.cc/100?img=12' },
    { name: '李思琪', avatar: 'https://i.pravatar.cc/100?img=5' },
    { name: '王浩然', avatar: 'https://i.pravatar.cc/100?img=33' },
    { name: '陈雨萱', avatar: 'https://i.pravatar.cc/100?img=47' }
  ];

  const courseData = [
    { title: 'React 高级开发实战', instructorIndex: 0, progress: 75, total: 8, completed: 6, desc: '深入学习 React Hooks、状态管理、性能优化等高级概念，通过实战项目掌握企业级 React 开发技能。适合有一定基础的前端开发者。' },
    { title: 'UI/UX 设计入门', instructorIndex: 1, progress: 40, total: 6, completed: 2, desc: '从零开始学习用户界面和用户体验设计，掌握设计思维、原型制作和用户研究方法。' },
    { title: 'Python 数据分析', instructorIndex: 2, progress: 100, total: 10, completed: 10, desc: '使用 Python 进行数据处理、可视化和机器学习入门，涵盖 Pandas、NumPy、Matplotlib 等工具。' },
    { title: '短视频制作与剪辑', instructorIndex: 3, progress: 20, total: 5, completed: 1, desc: '学习专业短视频制作流程，包括脚本策划、拍摄技巧、剪辑调色和特效制作全流程。' },
    { title: '水彩画基础教程', instructorIndex: 1, progress: 60, total: 8, completed: 5, desc: '从零基础开始学习水彩画技法，掌握色彩理论、干湿画法和风景画创作。' },
    { title: '商业摄影实战', instructorIndex: 0, progress: 33, total: 6, completed: 2, desc: '学习专业商业摄影技巧，包括布光、构图、产品拍摄和人像摄影等核心技能。' }
  ];

  courses = courseData.map((data, index) => {
    const lessons: Lesson[] = [];
    for (let i = 1; i <= data.total; i++) {
      const hasAssignment = i <= data.completed + 1;
      lessons.push({
        id: i,
        title: `第${i}课：${['环境搭建与基础', '核心概念详解', '实战项目入门', '进阶技巧', '性能优化', '最佳实践', '综合项目', '结业答辩'][i - 1] || '课程内容'}`,
        description: `本节课将深入探讨相关主题，帮助你掌握核心知识点并通过实践巩固所学内容。`,
        assignment: hasAssignment ? {
          id: `assign-${index}-${i}`,
          description: `完成课后练习，提交你的作业成果。要求：独立完成，代码规范，附带说明文档。`,
          attachments: i === 1 ? [{
            id: `attach-${index}-${i}`,
            name: '课程资料.pdf',
            url: '#',
            size: 1024 * 1024 * 2.5,
            type: 'application/pdf'
          }] : undefined,
          dueDate: '2024-12-31'
        } : undefined
      });
    }

    return {
      id: `course-${index + 1}`,
      title: data.title,
      coverImage: coverImages[index],
      description: data.desc,
      instructor: instructors[data.instructorIndex].name,
      instructorAvatar: instructors[data.instructorIndex].avatar,
      startDate: `2024-10-${(index + 1) * 3 + 10}`,
      totalLessons: data.total,
      completedLessons: data.completed,
      progress: data.progress,
      lessons
    };
  });

  const studentNames = ['刘小明', '赵晓红', '孙大伟', '周小芳', '吴志强', '郑美玲'];
  const studentAvatars = [
    'https://i.pravatar.cc/100?img=1',
    'https://i.pravatar.cc/100?img=9',
    'https://i.pravatar.cc/100?img=15',
    'https://i.pravatar.cc/100?img=20',
    'https://i.pravatar.cc/100?img=25',
    'https://i.pravatar.cc/100?img=30'
  ];

  const assignmentStatuses: Array<'pending' | 'graded'> = ['pending', 'graded', 'graded', 'pending', 'graded', 'pending'];

  assignments = studentNames.map((name, index) => ({
    id: `submission-${index + 1}`,
    courseId: 'course-1',
    lessonId: Math.ceil((index + 1) / 2),
    lessonTitle: `第${Math.ceil((index + 1) / 2)}课作业`,
    studentId: `student-${index + 1}`,
    studentName: name,
    studentAvatar: studentAvatars[index],
    description: 'React Hooks 实战练习',
    content: `<p>这是我的作业内容，包含了以下实现：</p>
<ul>
<li>useState 基础用法</li>
<li>useEffect 副作用处理</li>
<li>自定义 Hook 封装</li>
</ul>
<p>请老师批改，谢谢！</p>`,
    attachments: index % 2 === 0 ? [{
      id: `file-${index}`,
      name: '作业源代码.zip',
      url: '#',
      size: 1024 * 500,
      type: 'application/zip'
    }] : [],
    submittedAt: new Date(Date.now() - (index * 86400000) - 3600000 * index).toISOString(),
    status: assignmentStatuses[index],
    feedback: assignmentStatuses[index] === 'graded' 
      ? '完成度很高，代码规范，逻辑清晰。建议进一步探索 useMemo 和 useCallback 的性能优化场景。继续保持！' 
      : undefined,
    score: assignmentStatuses[index] === 'graded' ? [5, 4, 5, undefined, 4, undefined][index] : undefined,
    gradedAt: assignmentStatuses[index] === 'graded' 
      ? new Date(Date.now() - (index * 86400000) + 86400000).toISOString() 
      : undefined
  }));

  notifications = [
    {
      id: 'notif-1',
      type: 'graded' as const,
      title: '作业已批改',
      content: '你的「React Hooks 实战」作业已被批改，获得 5 星好评！',
      link: '/assignments/submission-1',
      isRead: false,
      createdAt: new Date(Date.now() - 3600000).toISOString()
    },
    {
      id: 'notif-2',
      type: 'new_assignment' as const,
      title: '新作业发布',
      content: '「React 高级开发实战」第7课作业已发布，请及时完成。',
      link: '/course/course-1',
      isRead: false,
      createdAt: new Date(Date.now() - 7200000).toISOString()
    },
    {
      id: 'notif-3',
      type: 'course_change' as const,
      title: '课程时间变更',
      content: '「UI/UX 设计入门」本周课程时间调整为周六下午 2 点。',
      link: '/course/course-2',
      isRead: true,
      createdAt: new Date(Date.now() - 86400000).toISOString()
    },
    {
      id: 'notif-4',
      type: 'graded' as const,
      title: '作业已批改',
      content: '你的「色彩理论基础」作业已被批改，查看详细反馈。',
      link: '/assignments/submission-3',
      isRead: true,
      createdAt: new Date(Date.now() - 172800000).toISOString()
    }
  ];
};

initMockData();

export const dataStore = {
  getCourses: (): Course[] => courses,
  
  getCourseById: (id: string): Course | undefined => {
    return courses.find(c => c.id === id);
  },

  createCourse: (course: Omit<Course, 'id'>): Course => {
    const newCourse: Course = {
      ...course,
      id: generateId()
    };
    courses.push(newCourse);
    return newCourse;
  },

  getAssignments: (): Assignment[] => {
    return [...assignments].sort((a, b) => 
      new Date(b.submittedAt).getTime() - new Date(a.submittedAt).getTime()
    );
  },

  getAssignmentById: (id: string): Assignment | undefined => {
    return assignments.find(a => a.id === id);
  },

  getAssignmentsByCourse: (courseId: string): Assignment[] => {
    return assignments.filter(a => a.courseId === courseId);
  },

  submitAssignment: (input: {
    courseId: string;
    lessonId: number;
    lessonTitle: string;
    content: string;
    attachments: Attachment[];
  }): Assignment => {
    const newAssignment: Assignment = {
      id: generateId(),
      courseId: input.courseId,
      lessonId: input.lessonId,
      lessonTitle: input.lessonTitle,
      studentId: 'student-current',
      studentName: '当前学员',
      studentAvatar: 'https://i.pravatar.cc/100?img=65',
      description: input.lessonTitle + '作业',
      content: input.content,
      attachments: input.attachments,
      submittedAt: new Date().toISOString(),
      status: 'pending'
    };
    assignments.unshift(newAssignment);
    return newAssignment;
  },

  gradeAssignment: (id: string, feedback: string, score: number): Assignment | undefined => {
    const assignment = assignments.find(a => a.id === id);
    if (assignment) {
      assignment.status = 'graded';
      assignment.feedback = feedback;
      assignment.score = score;
      assignment.gradedAt = new Date().toISOString();
      
      const notification: Notification = {
        id: generateId(),
        type: 'graded',
        title: '作业已批改',
        content: `你的「${assignment.lessonTitle}」作业已被批改，获得 ${score} 星！`,
        link: `/assignments/${assignment.id}`,
        isRead: false,
        createdAt: new Date().toISOString()
      };
      notifications.unshift(notification);
    }
    return assignment;
  },

  getNotifications: (): Notification[] => {
    return [...notifications].sort((a, b) => 
      new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
  },

  markNotificationRead: (id: string): Notification | undefined => {
    const notification = notifications.find(n => n.id === id);
    if (notification) {
      notification.isRead = true;
    }
    return notification;
  },

  markAllNotificationsRead: (): void => {
    notifications.forEach(n => {
      n.isRead = true;
    });
  },

  getUnreadCount: (): number => {
    return notifications.filter(n => !n.isRead).length;
  },

  addNotification: (notification: Omit<Notification, 'id' | 'createdAt' | 'isRead'>): Notification => {
    const newNotification: Notification = {
      ...notification,
      id: generateId(),
      isRead: false,
      createdAt: new Date().toISOString()
    };
    notifications.unshift(newNotification);
    return newNotification;
  }
};
