export interface Checkin {
  id: string;
  timestamp: string;
  comment: string;
  progressDelta: number;
  progressValue: number;
}

export interface Kr {
  id: string;
  description: string;
  owner: string;
  dueDate: string;
  progress: number;
  createdAt: string;
  checkins: Checkin[];
}

export interface Okr {
  id: string;
  title: string;
  owner: string;
  period: string;
  createdAt: string;
  krs: Kr[];
}

export const TEAM_MEMBERS = [
  '张伟', '李娜', '王强', '赵敏', '陈军',
  '刘涛', '孙丽', '周杰', '吴昊', '郑琳', '黄磊',
];

export const QUARTERS = ['Q1', 'Q2', 'Q3', 'Q4'];
export const YEARS = ['2024', '2025', '2026'];
