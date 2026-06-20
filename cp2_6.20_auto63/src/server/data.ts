export interface User {
  id: string;
  nickname: string;
  email: string;
  password: string;
  skills: string[];
  availableTime: string;
  avatar: string;
  totalHours: number;
  certificationLevel: number;
  isAdmin: boolean;
  registeredAt: string;
}

export interface Activity {
  id: string;
  name: string;
  location: string;
  dateTime: string;
  maxVolunteers: number;
  description: string;
  skillsRequired: string[];
  status: 'recruiting' | 'upcoming' | 'ended';
  createdBy: string;
  createdAt: string;
}

export interface Registration {
  id: string;
  userId: string;
  activityId: string;
  registeredAt: string;
  checkedIn: boolean;
  checkedInAt?: string;
}

export interface ServiceRecord {
  id: string;
  userId: string;
  activityId: string;
  hours: number;
  date: string;
}

let users: User[] = [
  {
    id: 'admin-1',
    nickname: '管理员',
    email: 'admin@example.com',
    password: 'admin123',
    skills: ['管理', '组织'],
    availableTime: '工作日全天',
    avatar: '',
    totalHours: 120,
    certificationLevel: 3,
    isAdmin: true,
    registeredAt: '2024-01-01T00:00:00Z',
  },
  {
    id: 'user-1',
    nickname: '热心小王',
    email: 'xiaowang@example.com',
    password: '123456',
    skills: ['教学', '英语'],
    availableTime: '周末',
    avatar: '',
    totalHours: 65,
    certificationLevel: 2,
    isAdmin: false,
    registeredAt: '2024-02-15T10:00:00Z',
  },
  {
    id: 'user-2',
    nickname: '阳光小李',
    email: 'xiaoli@example.com',
    password: '123456',
    skills: ['医疗', '护理'],
    availableTime: '工作日晚上',
    avatar: '',
    totalHours: 42,
    certificationLevel: 1,
    isAdmin: false,
    registeredAt: '2024-03-20T14:30:00Z',
  },
  {
    id: 'user-3',
    nickname: '快乐小张',
    email: 'xiaozhang@example.com',
    password: '123456',
    skills: ['设计', '摄影'],
    availableTime: '周末全天',
    avatar: '',
    totalHours: 28,
    certificationLevel: 1,
    isAdmin: false,
    registeredAt: '2024-04-10T09:00:00Z',
  },
  {
    id: 'user-4',
    nickname: '爱心小刘',
    email: 'xiaoliu@example.com',
    password: '123456',
    skills: ['法律咨询', '写作'],
    availableTime: '灵活安排',
    avatar: '',
    totalHours: 8,
    certificationLevel: 0,
    isAdmin: false,
    registeredAt: '2024-05-01T16:00:00Z',
  },
];

let activities: Activity[] = [
  {
    id: 'act-1',
    name: '社区图书馆志愿活动',
    location: '阳光社区图书馆',
    dateTime: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
    maxVolunteers: 10,
    description: '协助图书馆整理书籍、引导读者、组织少儿阅读活动。',
    skillsRequired: ['耐心', '沟通能力'],
    status: 'recruiting',
    createdBy: 'admin-1',
    createdAt: '2024-06-01T10:00:00Z',
  },
  {
    id: 'act-2',
    name: '敬老院慰问活动',
    location: '幸福敬老院',
    dateTime: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString(),
    maxVolunteers: 8,
    description: '陪伴老人聊天、表演节目、帮助打扫卫生。',
    skillsRequired: ['耐心', '表演'],
    status: 'recruiting',
    createdBy: 'admin-1',
    createdAt: '2024-06-05T14:00:00Z',
  },
  {
    id: 'act-3',
    name: '社区义诊活动',
    location: '中心广场',
    dateTime: new Date(Date.now() + 1 * 24 * 60 * 60 * 1000).toISOString(),
    maxVolunteers: 15,
    description: '为社区居民提供免费量血压、健康咨询等服务。',
    skillsRequired: ['医疗', '护理'],
    status: 'upcoming',
    createdBy: 'admin-1',
    createdAt: '2024-06-10T09:00:00Z',
  },
  {
    id: 'act-4',
    name: '环境保护宣传活动',
    location: '人民公园',
    dateTime: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
    maxVolunteers: 20,
    description: '发放环保宣传册、清理公园垃圾、倡导绿色生活。',
    skillsRequired: ['沟通能力', '体力'],
    status: 'ended',
    createdBy: 'admin-1',
    createdAt: '2024-05-20T11:00:00Z',
  },
];

let registrations: Registration[] = [
  {
    id: 'reg-1',
    userId: 'user-1',
    activityId: 'act-1',
    registeredAt: '2024-06-02T10:00:00Z',
    checkedIn: false,
  },
  {
    id: 'reg-2',
    userId: 'user-2',
    activityId: 'act-3',
    registeredAt: '2024-06-11T09:00:00Z',
    checkedIn: false,
  },
  {
    id: 'reg-3',
    userId: 'user-1',
    activityId: 'act-4',
    registeredAt: '2024-05-21T10:00:00Z',
    checkedIn: true,
    checkedInAt: '2024-06-18T09:00:00Z',
  },
  {
    id: 'reg-4',
    userId: 'user-3',
    activityId: 'act-4',
    registeredAt: '2024-05-22T14:00:00Z',
    checkedIn: true,
    checkedInAt: '2024-06-18T09:30:00Z',
  },
];

let serviceRecords: ServiceRecord[] = [
  {
    id: 'sr-1',
    userId: 'user-1',
    activityId: 'act-4',
    hours: 4,
    date: '2024-06-18',
  },
  {
    id: 'sr-2',
    userId: 'user-3',
    activityId: 'act-4',
    hours: 4,
    date: '2024-06-18',
  },
];

let nextUserId = 5;
let nextActivityId = 5;
let nextRegistrationId = 5;
let nextServiceRecordId = 3;

export function generateId(prefix: string, num: number): string {
  return `${prefix}-${num}`;
}

export function getNextUserId(): number {
  return nextUserId++;
}

export function getNextActivityId(): number {
  return nextActivityId++;
}

export function getNextRegistrationId(): number {
  return nextRegistrationId++;
}

export function getNextServiceRecordId(): number {
  return nextServiceRecordId++;
}

export { users, activities, registrations, serviceRecords };
