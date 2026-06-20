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

export interface RankingUser {
  id: string;
  nickname: string;
  avatar: string;
  totalHours: number;
  authLevel: number;
  badges: number[];
}

export const BADGE_CONFIGS: Badge[] = [
  { hours: 10, name: '新手志愿者', icon: '🌱', color: '#22C55E' },
  { hours: 50, name: '优秀志愿者', icon: '⭐', color: '#F59E0B' },
  { hours: 100, name: '资深志愿者', icon: '🏆', color: '#8B5CF6' },
];

export const getAuthLevelGradient = (level: number): string => {
  const gradients = [
    '#22C55E',
    '#84CC16',
    '#F59E0B',
    '#D97706',
    '#8B5CF6',
  ];
  return gradients[Math.min(level - 1, gradients.length - 1)];
};

export const getStatusColor = (status: Activity['status']): string => {
  const colors = {
    recruiting: '#22C55E',
    upcoming: '#F59E0B',
    ended: '#EF4444',
  };
  return colors[status];
};

export const getStatusText = (status: Activity['status']): string => {
  const texts = {
    recruiting: '招募中',
    upcoming: '即将开始',
    ended: '已结束',
  };
  return texts[status];
};
