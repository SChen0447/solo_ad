export type ActivityCategory = '景点' | '餐厅' | '交通' | '住宿' | '门票' | '其他';
export type BudgetCategory = '住宿' | '餐饮' | '交通' | '门票' | '其他';

export interface Member {
  id: string;
  name: string;
  color: string;
}

export interface Activity {
  id: string;
  dayIndex: number;
  title: string;
  address: string;
  budget: number;
  category: ActivityCategory;
  budgetCategory: BudgetCategory;
  notes: string;
  images: string[];
  payerId: string | null;
  order: number;
}

export interface FileItem {
  id: string;
  planId: string;
  name: string;
  type: 'image' | 'pdf' | 'note';
  url: string;
  uploaderId: string;
  uploaderName: string;
  uploadedAt: string;
  size: number;
}

export interface TravelPlan {
  id: string;
  shareCode: string;
  title: string;
  description: string;
  startDate: string;
  days: number;
  members: Member[];
  activities: Activity[];
  files: FileItem[];
  createdAt: string;
}

export interface BudgetStats {
  byCategory: Record<string, number>;
  byDay: Record<number, number>;
  byPayer: Record<string, { name: string; color: string; total: number }>;
  totalBudget: number;
  perPerson: number;
  settlements: Array<{
    memberId: string;
    name: string;
    color: string;
    paid: number;
    shouldPay: number;
    balance: number;
  }>;
}
