export type ActivityType = 'talk' | 'workshop' | 'social';
export type DifficultyLevel = 'beginner' | 'intermediate' | 'advanced';

export interface Activity {
  id: string;
  title: string;
  description: string;
  type: ActivityType;
  difficulty: DifficultyLevel;
  date: string;
  startTime: string;
  endTime: string;
  speaker: string;
  location: string;
  capacity: number;
  registered: number;
  tags: string[];
}

export interface ConflictInfo {
  hasConflict: boolean;
  overlappingMinutes: number;
  conflictingActivityId: string;
  conflictingActivityTitle: string;
}

export interface Recommendation {
  activity: Activity;
  matchScore: number;
  matchedTags: string[];
}

export interface UserPreference {
  userId: string;
  bookedActivityIds: string[];
  favoriteTags: string[];
}

export interface NotificationItem {
  id: string;
  title: string;
  message: string;
  activityId: string;
  timestamp: Date;
  read: boolean;
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  pageSize: number;
}
