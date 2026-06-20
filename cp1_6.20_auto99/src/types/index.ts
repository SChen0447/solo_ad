export interface User {
  id: number;
  email: string;
  name: string;
  avatar: string;
  online: boolean;
}

export interface Plan {
  id: number;
  name: string;
  description: string;
  start_date: string;
  end_date: string;
  total_budget: number;
  total_spent: number;
  cover_image: string;
  created_by: number;
  created_at: string;
  members: User[];
  items?: Item[];
  expenses?: Expense[];
  settlements?: Settlement[];
}

export interface Item {
  id: number;
  plan_id: number;
  type: 'accommodation' | 'transport' | 'attraction' | 'food';
  title: string;
  description: string;
  date: string;
  time: string | null;
  location: string;
  cost: number;
  responsible_id: number | null;
  responsible?: User | null;
  order: number;
  created_at: string;
  updated_at: string;
}

export interface Expense {
  id: number;
  plan_id: number;
  title: string;
  amount: number;
  currency: string;
  paid_by: number;
  payer?: User | null;
  split_type: 'equal' | 'custom';
  splits: Record<string, number>;
  created_at: string;
  settled: boolean;
}

export interface Settlement {
  id: number;
  plan_id: number;
  from_user_id: number;
  to_user_id: number;
  from_user?: User | null;
  to_user?: User | null;
  amount: number;
  completed: boolean;
  created_at: string;
  completed_at: string | null;
}

export interface MemberBalance {
  user: User;
  paid: number;
  should_pay: number;
  balance: number;
}

export interface SettlementPair {
  from: User;
  to: User;
  amount: number;
}
