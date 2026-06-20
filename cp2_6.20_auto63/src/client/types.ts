export interface User {
  id: string;
  nickname: string;
  email: string;
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
  registeredCount?: number;
}

export interface Registration {
  id: string;
  userId: string;
  activityId: string;
  registeredAt: string;
  checkedIn: boolean;
  checkedInAt?: string;
  activityName?: string;
  activityLocation?: string;
  activityDateTime?: string;
  activityStatus?: string;
}

export interface ServiceRecord {
  id: string;
  userId: string;
  activityId: string;
  hours: number;
  date: string;
  activityName?: string;
}

export interface RankUser {
  id: string;
  nickname: string;
  avatar: string;
  totalHours: number;
  certificationLevel: number;
  rank: number;
}

export interface CheckInResponse {
  success: boolean;
  hours: number;
  totalHours: number;
  newBadge: string | null;
}
