export interface Room {
  id: string;
  name: string;
  address: string;
  created_at: string;
}

export interface Resident {
  id: string;
  name: string;
  room_id: string;
  area: number;
  is_permanent: boolean;
  color_label: string;
  created_at: string;
}

export interface Reading {
  id: string;
  room_id: string;
  resident_id: string;
  electricity: number;
  gas: number;
  water: number;
  heating: number;
  recorded_at: string;
  delta_electricity: number;
  delta_gas: number;
  delta_water: number;
  delta_heating: number;
}

export type SplitRule = 'per_capita' | 'by_area' | 'by_usage';

export interface Bill {
  id: string;
  room_id: string;
  month: string;
  total_electricity: number;
  total_gas: number;
  total_water: number;
  total_heating: number;
  total_cost: number;
  rule: SplitRule;
  created_at: string;
  splits?: BillSplitWithResident[];
}

export interface BillSplit {
  id: string;
  bill_id: string;
  resident_id: string;
  amount: number;
  is_paid: boolean;
  paid_at: string | null;
}

export interface BillSplitWithResident extends BillSplit {
  resident_name: string;
  resident_color: string;
  resident_area: number;
}

export interface TrendData {
  months: string[];
  costs: number[];
  usages: number[];
}
