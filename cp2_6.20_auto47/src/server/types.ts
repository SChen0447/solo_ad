export interface ServiceRecord {
  activityId: string;
  activityName: string;
  date: string;
  hours: number;
}

export interface User {
  id: string;
  nickname: string;
  email: string;
  password: string;
  avatar: string;
  skills: string[];
  availableTime: string;
  totalHours: number;
  authLevel: number;
  badges: number[];
  registeredActivities: string[];
  serviceHistory: ServiceRecord[];
  isAdmin: boolean;
}

export interface Activity {
  id: string;
  name: string;
  location: string;
  dateTime: string;
  maxParticipants: number;
  description: string;
  skillRequirements: string[];
  status: 'recruiting' | 'upcoming' | 'ended';
  participants: string[];
  checkedIn: string[];
  createdBy: string;
}

export interface Badge {
  hours: number;
  name: string;
  icon: string;
  color: string;
}

export const BADGES: Badge[] = [
  { hours: 10, name: '新手志愿者', icon: '🌱', color: '#22C55E' },
  { hours: 50, name: '优秀志愿者', icon: '⭐', color: '#F59E0B' },
  { hours: 100, name: '资深志愿者', icon: '🏆', color: '#8B5CF6' },
];

export let users: User[] = [
  {
    id: '1',
    nickname: '管理员',
    email: 'admin@example.com',
    password: 'admin123',
    avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=admin',
    skills: [],
    availableTime: '',
    totalHours: 120,
    authLevel: 5,
    badges: [10, 50, 100],
    registeredActivities: [],
    serviceHistory: [],
    isAdmin: true,
  },
  {
    id: '2',
    nickname: '李志愿者',
    email: 'liziyuan@example.com',
    password: '123456',
    avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=lizy',
    skills: ['陪护', '教学'],
    availableTime: '周末全天',
    totalHours: 65,
    authLevel: 3,
    badges: [10, 50],
    registeredActivities: ['1'],
    serviceHistory: [
      { activityId: '0', activityName: '敬老院慰问', date: '2026-06-01', hours: 3 },
    ],
    isAdmin: false,
  },
  {
    id: '3',
    nickname: '王热心',
    email: 'wangrx@example.com',
    password: '123456',
    avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=wangrx',
    skills: ['搬运', '组织'],
    availableTime: '工作日晚上',
    totalHours: 42,
    authLevel: 2,
    badges: [10],
    registeredActivities: ['1'],
    serviceHistory: [],
    isAdmin: false,
  },
  {
    id: '4',
    nickname: '赵阳光',
    email: 'zhaoyg@example.com',
    password: '123456',
    avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=zhaoyg',
    skills: ['沟通能力', '耐心'],
    availableTime: '周六下午',
    totalHours: 8,
    authLevel: 1,
    badges: [],
    registeredActivities: [],
    serviceHistory: [],
    isAdmin: false,
  },
];

export let activities: Activity[] = [
  {
    id: '1',
    name: '社区图书馆整理',
    location: '阳光社区图书馆',
    dateTime: '2026-06-25 09:00',
    maxParticipants: 10,
    description: '整理社区图书馆书籍，分类上架，为居民创造良好阅读环境。',
    skillRequirements: ['细心', '分类能力'],
    status: 'recruiting',
    participants: ['2', '3'],
    checkedIn: [],
    createdBy: '1',
  },
  {
    id: '2',
    name: '敬老院探望活动',
    location: '幸福敬老院',
    dateTime: '2026-06-22 14:00',
    maxParticipants: 8,
    description: '陪伴老人聊天，表演节目，送去温暖和关怀。',
    skillRequirements: ['沟通能力', '耐心'],
    status: 'upcoming',
    participants: [],
    checkedIn: [],
    createdBy: '1',
  },
  {
    id: '3',
    name: '公园环保清洁',
    location: '中央公园',
    dateTime: '2026-06-20 08:00',
    maxParticipants: 15,
    description: '清理公园垃圾，宣传环保知识，共建美丽家园。',
    skillRequirements: ['体力', '团队协作'],
    status: 'ended',
    participants: ['2', '3', '4'],
    checkedIn: ['2', '3'],
    createdBy: '1',
  },
];

export const generateId = () => Math.random().toString(36).substring(2, 9);

export const updateActivityStatuses = () => {
  const now = new Date();
  activities = activities.map(activity => {
    const activityDate = new Date(activity.dateTime);
    const diffDays = Math.ceil((activityDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
    let status: Activity['status'] = activity.status;
    if (activityDate < now) {
      status = 'ended';
    } else if (diffDays <= 3) {
      status = 'upcoming';
    } else {
      status = 'recruiting';
    }
    return { ...activity, status };
  });
};
